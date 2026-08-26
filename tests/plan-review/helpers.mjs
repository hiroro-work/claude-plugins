// Shared fixtures for the plan-review viewer's process-level tests.
//
// serve.mjs is a top-level script with no exports, so every test drives it as a
// child process and observes it through HTTP, the files it writes, and its exit
// code.

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const SERVE = fileURLToPath(
  new URL("../../skills/dev-workflow/scripts/plan-review/serve.mjs", import.meta.url),
);

const URL_DEADLINE_MS = 10_000;
const URL_POLL_MS = 25;

// The one shape the sidecar is allowed to hold: a loopback URL on a random port,
// one line. Anchored so a torn read of a half-written file keeps polling instead
// of yielding a truncated port.
export const URL_FILE_SHAPE = /^http:\/\/127\.0\.0\.1:\d+\/\n$/;

const PLAN_FILE = "plan.md";
export const PLAN_ID = PLAN_FILE.replace(/\.md$/, "");

export const SAMPLE_PLAN = `## Plan

### Overview

- **Goal**: sample

### Decisions

- **Question**: sample question
- **Recommendation**: sample recommendation

### Build order

1. **Do the thing** — detail

### Test plan

sample
`;

// The server writes its sidecars next to the plan, so every run gets its own
// directory rather than a shared one.
export async function makeWorkspace(t, extra = {}) {
  const dir = await mkdtemp(join(tmpdir(), "plan-review-test-"));
  const ws = {
    dir,
    children: [],
    path: (name) => join(dir, name),
    read: (name) => readFile(join(dir, name), "utf8"),
    readJson: async (name) => JSON.parse(await readFile(join(dir, name), "utf8")),
  };

  // Every server started against this workspace dies before the directory goes,
  // so a still-listening process never writes into a path that has been removed.
  t.after(async () => {
    await Promise.all(ws.children.map((h) => (h.child.kill("SIGKILL"), h.closed)));
    await rm(dir, { recursive: true, force: true });
  });

  for (const [name, content] of Object.entries({ [PLAN_FILE]: SAMPLE_PLAN, ...extra })) {
    await writeFile(join(dir, name), content);
  }
  return ws;
}

// `process.execPath` rather than a bare "node" so the child runs on the same
// Node as the test runner.
export function spawnServe(ws, args) {
  const child = spawn(process.execPath, [SERVE, ...args], { stdio: ["ignore", "pipe", "pipe"] });
  const handle = { child, stdout: "", stderr: "" };

  // Decode per stream rather than per chunk: a multi-byte character split across
  // two chunks would otherwise be concatenated as two broken Buffers.
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => (handle.stdout += chunk));
  child.stderr.on("data", (chunk) => (handle.stderr += chunk));
  // "close" rather than "exit": the captured output is only complete once the
  // stdio streams have ended.
  handle.closed = new Promise((resolve) => child.on("close", (code, signal) => resolve({ code, signal })));

  ws.children.push(handle);
  return handle;
}

// Never pass --port: a busy explicit port makes serve.mjs open a browser even
// under --no-open.
export function serveArgs(ws, extra = []) {
  return ["--plan", ws.path(PLAN_FILE), "--no-open", ...extra];
}

// The URL file is written at listen time, so polling it is the documented way to
// learn the random port. The "listening on" stderr line is not part of the
// contract, so it is deliberately not used as the readiness signal.
async function waitForBaseUrl(ws) {
  const deadline = Date.now() + URL_DEADLINE_MS;
  while (Date.now() < deadline) {
    try {
      const raw = await ws.read(`${PLAN_ID}.url`);
      if (URL_FILE_SHAPE.test(raw)) return raw.trim().replace(/\/$/, "");
    } catch {
      // not written yet
    }
    await sleep(URL_POLL_MS);
  }
  throw new Error(`${PLAN_ID}.url was not written within ${URL_DEADLINE_MS}ms`);
}

export async function startViewer(t, ws, extra = ["--wait"]) {
  // A previous run in the same workspace leaves its URL behind, and polling would
  // otherwise return that dead port.
  await rm(ws.path(`${PLAN_ID}.url`), { force: true });
  const handle = spawnServe(ws, serveArgs(ws, extra));
  handle.base = await waitForBaseUrl(ws);
  return handle;
}

export const getPlan = async (base) => (await fetch(`${base}/api/plan`)).json();

// The submit response is sent before the stdout line is written, so a caller that
// is not waiting for the process to exit has to wait for the line itself.
export async function waitForStdoutJson(handle, deadlineMs = 5_000) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const raw = handle.stdout.trim();
    if (raw !== "") return JSON.parse(raw);
    await sleep(URL_POLL_MS);
  }
  throw new Error(`no stdout line within ${deadlineMs}ms`);
}

export function submit(base, body) {
  return fetch(`${base}/api/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
