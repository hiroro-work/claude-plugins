// run-open-stdin.mjs: the command's stdin stays open while the wrapper's own stdin is at EOF, and its exit code passes through.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const script = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "skills", "demo", "scripts", "run-open-stdin.mjs");

function run(command) {
  const dir = mkdtempSync(join(tmpdir(), "demo-"));
  try {
    writeFileSync(join(dir, "start-command"), command);
    return spawnSync(process.execPath, [script, join(dir, "start-command")], { input: "", encoding: "utf8", timeout: 10000 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a command that quits on stdin EOF keeps running", () => {
  const child = `process.stdin.on('end',()=>{console.log('eof');process.exit(3)});process.stdin.resume();setTimeout(()=>{console.log('alive');process.exit(0)},500)`;
  const r = run(`"${process.execPath}" -e "${child}"`);
  assert.equal(r.stdout.trim(), "alive");
  assert.equal(r.status, 0);
});

test("the command's exit code is the wrapper's", () => {
  assert.equal(run("exit 7").status, 7);
});

test("a command ended by a signal exits with 128 plus the signal number", () => {
  assert.equal(run("kill -TERM $$").status, 143);
});

test("the .pgid file names a group whose kill stops what the command started, and goes away on exit", async () => {
  const dir = mkdtempSync(join(tmpdir(), "demo-"));
  try {
    const file = join(dir, "start-command");
    writeFileSync(file, "cd . && sleep 30");
    const wrapper = spawn(process.execPath, [script, file], { stdio: "ignore" });
    const exited = new Promise((resolve) => wrapper.on("exit", resolve));
    let pgid;
    for (let i = 0; i < 50 && !pgid; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (existsSync(`${file}.pgid`)) pgid = Number(readFileSync(`${file}.pgid`, "utf8"));
    }
    assert.ok(pgid > 0, "the .pgid file appears while the command runs");
    process.kill(-pgid, "SIGTERM");
    assert.equal(await exited, 143);
    assert.ok(!existsSync(`${file}.pgid`));
    assert.throws(() => process.kill(-pgid, 0), { code: "ESRCH" }, "nothing in the group is left");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
