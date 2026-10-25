// Startup and shutdown contract: URL sidecar, stdout purity, exit codes.

import test from "node:test";
import assert from "node:assert/strict";
import { utimes } from "node:fs/promises";
import { request } from "node:http";

import {
  PLAN_ID,
  URL_FILE_SHAPE,
  getPlan,
  makeWorkspace,
  waitForStdoutJson,
  serveArgs,
  spawnServe,
  startViewer,
  submit,
} from "./helpers.mjs";

test("writes the viewer URL to the sidecar file at listen time", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);

  assert.match(await ws.read(`${PLAN_ID}.url`), URL_FILE_SHAPE);

  const res = await fetch(`${server.base}/api/plan`);
  assert.equal(res.status, 200);
});

test("stdout carries the submit JSON and nothing else", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);

  await submit(server.base, { decision: "approve", comments: [] });
  const { code } = await server.closed;

  assert.equal(code, 0);
  const lines = server.stdout.split("\n").filter((l) => l !== "");
  assert.equal(lines.length, 1);
  const payload = JSON.parse(lines[0]);
  assert.equal(payload.decision, "approve");
  assert.equal(payload.plan, PLAN_ID);
  assert.match(payload.submitted_at, /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
});

test("a warning about a malformed thread file does not reach stdout", async (t) => {
  const ws = await makeWorkspace(t, {
    [`${PLAN_ID}.thread.json`]: JSON.stringify({ rounds: [{ round: 1 }] }),
  });
  const server = await startViewer(t, ws);

  await submit(server.base, { decision: "approve", comments: [] });
  await server.closed;

  assert.match(server.stderr, /malformed round/);
  assert.doesNotThrow(() => JSON.parse(server.stdout.trim()));
});

test("without --wait the server keeps serving after a submit", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws, []);

  const res = await submit(server.base, { decision: "approve", comments: [] });
  assert.equal(res.status, 200);
  assert.equal((await waitForStdoutJson(server)).decision, "approve");

  assert.equal(server.child.exitCode, null, "the process is still running");
  assert.equal((await getPlan(server.base)).id, PLAN_ID, "and still answering requests");
});

test("exits 124 when the timeout elapses with no submit", async (t) => {
  const ws = await makeWorkspace(t);
  const server = spawnServe(ws, serveArgs(ws, ["--wait", "--timeout", "1"]));

  const { code } = await server.closed;
  assert.equal(code, 124);
  assert.equal(server.stdout, "");
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  test(`exits 130 on ${signal}`, async (t) => {
    const ws = await makeWorkspace(t);
    const server = await startViewer(t, ws);

    server.child.kill(signal);
    const { code } = await server.closed;

    assert.equal(code, 130);
    assert.equal(server.stdout, "");
  });
}

test("--stop ends a waiting viewer with exit 130 and nothing on stdout", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);

  const stopper = spawnServe(ws, serveArgs(ws, ["--stop"]));
  assert.equal((await stopper.closed).code, 0);
  assert.equal(stopper.stdout, "");
  assert.equal((await server.closed).code, 130);
  assert.equal(server.stdout, "");
});

test("--stop after a submit prints that submit's JSON instead of failing", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);

  await submit(server.base, { decision: "revise", branch: "new", comments: [] });
  assert.equal((await server.closed).code, 0);

  const stopper = spawnServe(ws, serveArgs(ws, ["--stop"]));
  assert.equal((await stopper.closed).code, 0);
  assert.deepEqual(JSON.parse(stopper.stdout), JSON.parse(server.stdout));
});

for (const [state, alive, code] of [["a waiting", true, 0], ["an exited", false, 1]]) {
  test(`--stop on ${state} viewer ignores a comments file older than its URL file`, async (t) => {
    const ws = await makeWorkspace(t, { [`${PLAN_ID}.comments.json`]: JSON.stringify({ decision: "approve" }) });
    await utimes(ws.path(`${PLAN_ID}.comments.json`), new Date(0), new Date(0));
    const server = await startViewer(t, ws);
    if (!alive) {
      server.child.kill("SIGTERM");
      await server.closed;
    }

    const stopper = spawnServe(ws, serveArgs(ws, ["--stop"]));
    assert.equal((await stopper.closed).code, code);
    assert.equal(stopper.stdout, "");
  });
}

test("a submit whose body arrives after a stop is refused and recorded nowhere", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);
  const body = JSON.stringify({ decision: "approve", comments: [] });

  const pending = new Promise((resolve, reject) => {
    const req = request(`${server.base}/api/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) },
    }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
    req.flushHeaders();
    t.after(() => req.destroy());
    setImmediate(async () => {
      await fetch(`${server.base}/api/stop`, { method: "POST" });
      req.end(body);
    });
  });

  assert.equal(await pending, 409);
  assert.equal((await server.closed).code, 130);
  assert.equal(server.stdout, "");
  await assert.rejects(ws.read(`${PLAN_ID}.comments.json`));
});

test("--stop exits 1 when no viewer URL is recorded", async (t) => {
  const ws = await makeWorkspace(t);
  const stopper = spawnServe(ws, serveArgs(ws, ["--stop"]));
  const { code } = await stopper.closed;

  assert.equal(code, 1);
  assert.match(stopper.stderr, /cannot stop the viewer/);
});

test("exits 1 when --plan is missing", async (t) => {
  const ws = await makeWorkspace(t);
  const server = spawnServe(ws, ["--no-open"]);
  const { code } = await server.closed;

  assert.equal(code, 1);
  assert.match(server.stderr, /--plan <path> is required/);
});

test("exits 1 when the plan file cannot be read", async (t) => {
  const ws = await makeWorkspace(t);
  const server = spawnServe(ws, ["--plan", ws.path("absent.md"), "--no-open"]);
  const { code } = await server.closed;

  assert.equal(code, 1);
  assert.match(server.stderr, /cannot read plan file/);
});

test("an unreadable --prev disables the diff instead of failing startup", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws, ["--wait", "--prev", ws.path("absent-prev.md")]);

  const payload = await getPlan(server.base);

  assert.equal(payload.prevMarkdown, null);
  assert.match(server.stderr, /diff disabled/);
});
