#!/usr/bin/env node
// Stop what the demo started: the process tree of start_command and whatever still listens on the port.
//
// Usage: node stop-app.mjs --port <port> [--pgid-file <path>]
// TERM to the tree the pgid file names and to the port's listeners, a wait, then KILL to both.
// stdout: {"listening":[<pid>,...],"note":null|"<why>"} (exit 0); a usage error exits 2.
// On win32 the pgid file holds the command's process id, and one forced taskkill /T stops its tree.
// DEMO_STOP_WAIT_MS overrides the wait; DEMO_PLATFORM overrides process.platform (both for tests).

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const PLATFORM = process.env.DEMO_PLATFORM || process.platform;
const WAIT_MS = Number.isFinite(Number(process.env.DEMO_STOP_WAIT_MS)) ? Number(process.env.DEMO_STOP_WAIT_MS) : 2000;
const TIMEOUT = 10000;
const notes = [];

const { port, pgidFile } = parse();
const root = pgidFile ? readRoot(pgidFile) : null;
const tools = { win32: [["netstat", fromNetstat]], linux: [["lsof", fromLsof], ["ss", fromSs]] }[PLATFORM] ?? [["lsof", fromLsof]];
const lookup = tools.find(([bin]) => runs(bin))?.[1];
if (!lookup) notes.push(`no ${tools.map(([bin]) => bin).join(" or ")} to find what listens on ${port}`);

const pass = (force) => {
  const pids = listeners();
  if (root) signal(root, force, true);
  for (const pid of pids) signal(pid, force, false);
  return Boolean(root) || pids.length > 0;
};
if (PLATFORM === "win32") pass(true);
else if (pass(false)) {
  sleep(WAIT_MS);
  pass(true);
}

// A killed process can hold the port for a moment, so look again a few times before reporting it.
let left = listeners();
for (let i = 0; i < 5 && left.length; i++) {
  sleep(100);
  left = listeners();
}
process.stdout.write(JSON.stringify({ listening: left, note: notes.length ? notes.join("; ") : null }) + "\n");

function readRoot(file) {
  let text;
  try { text = readFileSync(file, "utf8").trim(); } catch { return null; }
  const id = Number(text);
  if (usable(id)) return id;
  notes.push(`pgid file holds no usable process id: ${JSON.stringify(text.slice(0, 20))}`);
  return null;
}

// 0 and 1 would reach the caller's own group or every process the user owns.
function usable(id) {
  return Number.isInteger(id) && id > 1 && id !== process.pid;
}

function signal(id, force, tree) {
  if (PLATFORM === "win32") {
    spawnSync("taskkill", ["/PID", String(id), "/T", ...(force ? ["/F"] : [])], { stdio: "ignore", windowsHide: true, timeout: TIMEOUT });
    return;
  }
  try { process.kill(tree ? -id : id, force ? "SIGKILL" : "SIGTERM"); } catch {}
}

function listeners() {
  return lookup ? [...new Set(lookup())].filter(usable) : [];
}

function runs(bin) {
  return !spawnSync(bin, ["-h"], { stdio: "ignore", windowsHide: true, timeout: TIMEOUT }).error;
}

function output(bin, args) {
  return spawnSync(bin, args, { encoding: "utf8", windowsHide: true, timeout: TIMEOUT }).stdout ?? "";
}

function fromLsof() {
  return output("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"]).split("\n").map(Number);
}

function fromSs() {
  return [...output("ss", ["-ltnp", `sport = :${port}`]).matchAll(/pid=(\d+)/g)].map((m) => Number(m[1]));
}

// The state column is localized, so a listener is told by its foreign address instead.
function fromNetstat() {
  const pids = [];
  for (const line of output("netstat", ["-ano"]).split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5 || !/^TCP/i.test(cols[0])) continue;
    if (cols[1].endsWith(`:${port}`) && ["0.0.0.0:0", "[::]:0"].includes(cols[2])) pids.push(Number(cols[cols.length - 1]));
  }
  return pids;
}

function sleep(ms) {
  if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function parse() {
  const string = { type: "string" };
  let values;
  try {
    ({ values } = parseArgs({ options: { port: string, "pgid-file": string }, strict: true }));
  } catch (e) {
    usage(e.message);
  }
  const n = Number(values.port);
  if (!/^\d+$/.test(values.port ?? "") || n < 1 || n > 65535) usage("--port <1-65535> is required");
  return { port: n, pgidFile: values["pgid-file"] ?? null };
}

function usage(message) {
  process.stderr.write(`${message}\nusage: node stop-app.mjs --port <port> [--pgid-file <path>]\n`);
  process.exit(2);
}
