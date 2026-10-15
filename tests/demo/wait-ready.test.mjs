// wait-ready.mjs: a URL that answers, a URL command that succeeds on a later try, a command that never
// succeeds, a URL nobody serves, and the usage errors.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "demo", "scripts", "wait-ready.mjs");

// The script is run asynchronously so the test's own HTTP server can answer it.
const run = (args) => new Promise((resolve) => {
  const child = spawn("node", [script, ...args], { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.on("data", (d) => { stdout += d; });
  child.stderr.on("data", (d) => { stderr += d; });
  child.on("close", (status) => resolve({ status, stdout, stderr }));
});

const withServer = async (fn) => {
  const server = createServer((_req, res) => { res.statusCode = 204; res.end(); });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/app/`;
  try { return await fn(url); } finally { await new Promise((r) => server.close(r)); }
};

describe("wait-ready", { concurrency: true }, () => {

test("a URL that answers is ready", async () => {
  await withServer(async (url) => {
    const r = await run(["--timeout", "10", "--url", url]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, `ready ${url}\n`);
  });
});

test("a URL command that fails twice is retried until it prints the URL", async () => {
  const dir = mkdtempSync(join(tmpdir(), "wait-ready-"));
  try {
    await withServer(async (url) => {
      const counter = join(dir, "tries");
      const cmd = `n=$(cat "${counter}" 2>/dev/null || echo 0); n=$((n+1)); echo $n > "${counter}"; [ "$n" -ge 3 ] || exit 1; echo; echo "${url}"`;
      const r = await run(["--timeout", "20", "--url-command", cmd]);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout, `ready ${url}\n`);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a URL command that never succeeds times out with its output on stderr", async () => {
  const r = await run(["--timeout", "1", "--url-command", "echo not yet >&2; exit 1"]);
  assert.equal(r.status, 1);
  assert.equal(r.stdout, "timeout\n");
  assert.match(r.stderr, /not yet/);
});

test("a URL command that hangs is cut off at the deadline", async () => {
  const r = await run(["--timeout", "1", "--url-command", "sleep 30"]);
  assert.equal(r.status, 1);
  assert.equal(r.stdout, "timeout\n");
});

test("a line that is not a URL is retried, not fetched", async () => {
  const r = await run(["--timeout", "1", "--url-command", "echo starting"]);
  assert.equal(r.status, 1);
  assert.equal(r.stdout, "timeout\n");
  assert.match(r.stderr, /starting/);
});

test("a URL nobody serves times out with the fetch error on stderr", async () => {
  const url = await withServer(async (u) => u);
  const r = await run(["--timeout", "1", "--url", url]);
  assert.equal(r.status, 1);
  assert.equal(r.stdout, "timeout\n");
  assert.match(r.stderr, /ECONNREFUSED|fetch failed/);
});

test("usage errors exit 2", async () => {
  for (const args of [["--timeout", "1", "--url", "http://x/", "--url-command", "echo"], ["--timeout", "1"], ["--url", "http://x/"], ["--timeout", "x", "--url", "http://x/"], ["--timeout", "1", "--url", "not a url"]]) {
    const r = await run(args);
    assert.equal(r.status, 2, args.join(" "));
    assert.match(r.stderr, /usage/);
  }
});

});
