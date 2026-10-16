#!/usr/bin/env node
// Run the command line stored in a file under `sh -c`, with its stdin held open as a pipe that is never written.
// Some launchers (electron-forge start) exit before starting the app once stdin reaches EOF, as it does in the background.
//
// Usage: node run-open-stdin.mjs <command-file>
// Exits with the command's exit code, or 128 plus the signal number when a signal ended it.

import { spawn } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { constants } from "node:os";

const file = process.argv[2];
if (!file) {
  process.stderr.write("usage: node run-open-stdin.mjs <command-file>\n");
  process.exit(2);
}
const pgidFile = `${file}.pgid`;
rmSync(pgidFile, { force: true });
let command;
try { command = readFileSync(file, "utf8"); } catch (err) { process.stderr.write(`command file cannot be read: ${err.message}\n`); process.exit(2); }

const child = spawn("sh", ["-c", command], { stdio: ["pipe", "inherit", "inherit"], detached: true });
child.stdin.on("error", () => {});
child.on("error", (err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(127);
});
if (child.pid) writeFileSync(pgidFile, `${child.pid}\n`);
for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) {
  process.on(signal, () => {
    try { process.kill(-child.pid, signal); } catch {}
  });
}
// The open stdin pipe keeps the event loop alive, so leave explicitly.
child.on("exit", (code, signal) => {
  rmSync(pgidFile, { force: true });
  process.exit(code ?? 128 + constants.signals[signal]);
});
