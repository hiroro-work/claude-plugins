// stop-app.mjs: a real server stops through its group or its port; on win32 and on a Linux without lsof,
// fake netstat / taskkill / ss placed alone on PATH show which commands the script runs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile, execFileSync, spawn } from "node:child_process";
import { promisify } from "node:util";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, connect } from "node:net";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scripts = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "skills", "demo", "scripts");
const script = join(scripts, "stop-app.mjs");
const posix = process.platform !== "win32";

const freePort = () => new Promise((resolve) => {
  const s = createServer().listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const listening = (port) => new Promise((resolve) => {
  const c = connect(port, "127.0.0.1").on("connect", () => { c.destroy(); resolve(true); }).on("error", () => resolve(false));
});
async function until(check) {
  for (let i = 0; i < 100; i++) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("timed out");
}
const serverCode = (port) => `require("http").createServer(()=>{}).listen(${port})`;

// Async, so this process reaps a child the script kills instead of leaving a zombie a fake would see alive.
async function stop(args, env = {}) {
  const { stdout } = await promisify(execFile)(process.execPath, [script, ...args], { encoding: "utf8", env: { ...process.env, DEMO_STOP_WAIT_MS: "200", ...env } });
  return JSON.parse(stdout.trim());
}

async function startServer(port) {
  const child = spawn(process.execPath, ["-e", serverCode(port)], { stdio: "ignore" });
  const exited = new Promise((resolve) => child.on("exit", resolve));
  await until(() => listening(port));
  return { pid: child.pid, exited };
}

function fakes(dir, files) {
  const bin = join(dir, "bin");
  mkdirSync(bin, { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(bin, name), `#!${process.execPath}\n${body}`);
    chmodSync(join(bin, name), 0o755);
  }
  return bin;
}

test("the group in the pgid file stops, and nothing is left listening", { skip: !posix }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "stop-"));
  try {
    const port = await freePort();
    const file = join(dir, "start-command");
    writeFileSync(file, `"${process.execPath}" -e '${serverCode(port)}'`);
    const wrapper = spawn(process.execPath, [join(scripts, "run-open-stdin.mjs"), file], { stdio: "ignore" });
    const exited = new Promise((resolve) => wrapper.on("exit", resolve));
    await until(() => existsSync(`${file}.pgid`) && listening(port));
    assert.deepEqual(await stop(["--port", String(port), "--pgid-file", `${file}.pgid`]), { listening: [], note: null });
    await exited;
    assert.equal(await listening(port), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("without a pgid file, the process listening on the port stops", { skip: !posix }, async () => {
  const port = await freePort();
  const { exited } = await startServer(port);
  assert.deepEqual(await stop(["--port", String(port)]), { listening: [], note: null });
  await exited;
});

test("a pgid file that names no usable process is skipped with a note", async () => {
  const dir = mkdtempSync(join(tmpdir(), "stop-"));
  try {
    const port = await freePort();
    for (const content of ["1", "0", "abc"]) {
      writeFileSync(join(dir, "pgid"), content);
      const r = await stop(["--port", String(port), "--pgid-file", join(dir, "pgid")]);
      assert.deepEqual(r.listening, []);
      assert.match(r.note, /pgid file holds no usable process id/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a usage error exits 2", () => {
  for (const args of [[], ["--port", "x"], ["--port", "70000"]]) {
    assert.throws(() => execFileSync(process.execPath, [script, ...args], { stdio: "pipe" }), (e) => e.status === 2);
  }
});

test("win32: one forced taskkill stops the tree, then each listener netstat names", { skip: !posix }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "stop-"));
  try {
    const log = join(dir, "calls.log");
    const killed = join(dir, "killed");
    writeFileSync(log, "");
    const bin = fakes(dir, {
      netstat: `const fs = require("fs");
if (fs.existsSync(${JSON.stringify(killed)})) process.exit(0);
console.log("  TCP    0.0.0.0:4321    0.0.0.0:0    ABHÖREN    4242\\r\\n  TCP    127.0.0.1:4321    127.0.0.1:50000    HERGESTELLT    999\\r\\n  TCP    0.0.0.0:43210    0.0.0.0:0    ABHÖREN    777\\r\\n  TCP    [::]:4321    [::]:0    ABHÖREN    4242\\r\\n  UDP    0.0.0.0:4321    *:*    888");`,
      taskkill: `const fs = require("fs");
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, args.join(" ") + "\\n");
if (args.includes("/F") && args.includes("4242")) fs.writeFileSync(${JSON.stringify(killed)}, "");`,
    });
    writeFileSync(join(dir, "pgid"), "5555\n");
    const r = await stop(["--port", "4321", "--pgid-file", join(dir, "pgid")], { DEMO_PLATFORM: "win32", PATH: bin });
    assert.deepEqual(r, { listening: [], note: null });
    assert.deepEqual(readFileSync(log, "utf8").trim().split("\n"), [
      "/PID 5555 /T /F",
      "/PID 4242 /T /F",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("linux without lsof: ss names the listener, and it stops", { skip: !posix }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "stop-"));
  try {
    const port = await freePort();
    const { pid, exited } = await startServer(port);
    const bin = fakes(dir, {
      ss: `try { process.kill(${pid}, 0); } catch { process.exit(0); }
console.log("LISTEN 0 511 *:${port} *:* users:((\\"node\\",pid=${pid},fd=19))");`,
    });
    assert.deepEqual(await stop(["--port", String(port)], { DEMO_PLATFORM: "linux", PATH: bin }), { listening: [], note: null });
    await exited;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("no tool to find listeners leaves one note", async () => {
  const dir = mkdtempSync(join(tmpdir(), "stop-"));
  try {
    mkdirSync(join(dir, "empty"));
    for (const [platform, tools] of [["linux", "lsof or ss"], ["win32", "netstat"], ["darwin", "lsof"]]) {
      const r = await stop(["--port", "4321"], { DEMO_PLATFORM: platform, PATH: join(dir, "empty") });
      assert.deepEqual(r, { listening: [], note: `no ${tools} to find what listens on 4321` }, platform);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
