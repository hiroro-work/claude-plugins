#!/usr/bin/env node
// Append one timing event to the run's timing log.
//
// Usage: node mark.mjs --phase "<phase name>" --event start|end|wait|resume [--at <ISO 8601>] [--file <path>] [--dir <dir>]
// With `--event start --new` and no --file, a new log `<dir>/timing-<YYYYMMDD-HHMMSS>.jsonl` is
// created (dir defaults to the repository root's .claude/plans) and its path is printed; every other call without
// --file appends to the newest timing-*.jsonl in that dir (a later phase's `start` included). Each line: {"phase","event","t"} with t in ISO 8601 UTC.
// `wait` marks the moment a user gate (or a background wait) is presented; `resume` the moment
// the run continues. report.mjs subtracts those spans from the phase's wall time.
// `--at` changes only the event's timestamp, never which log is written to.

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = parseArgs(process.argv.slice(2));
const phase = required("phase");
const event = required("event");
if (!["start", "end", "wait", "resume"].includes(event)) {
  process.stderr.write("--event must be start|end|wait|resume\n");
  process.exit(2);
}
// Not the caller's directory: a `cd` in some earlier command would put the log elsewhere, and
// `newest()` would then send the rest of the run to a different file — a wrong table, not a gap.
const dir = args.dir ?? join(repoRoot() ?? ".", ".claude", "plans");
const now = new Date();
const at = args.at === undefined ? now : new Date(typeof args.at === "string" ? args.at : NaN);
if (Number.isNaN(at.getTime())) {
  process.stderr.write("--at must be an ISO 8601 timestamp\n");
  process.exit(2);
}
let file = args.file;
if (!file) {
  const existing = newest(dir);
  if (event === "start" && (!existing || args.new)) {
    mkdirSync(dir, { recursive: true });
    file = join(dir, `timing-${now.toISOString().replace(/[-:]/g, "").slice(0, 15).replace("T", "-")}.jsonl`);
    writeFileSync(file, "");
  } else {
    file = existing;
  }
}
if (!file) {
  process.stderr.write(`no timing log under ${dir}; start one with --event start --new\n`);
  process.exit(2);
}
appendFileSync(file, JSON.stringify({ phase, event, t: at.toISOString() }) + "\n");
process.stdout.write(file + "\n");

function repoRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch { return null; }
}

function newest(d) {
  let names;
  try { names = readdirSync(d).filter((n) => /^timing-.*\.jsonl$/.test(n)); } catch { return null; }
  if (!names.length) return null;
  return names.map((n) => join(d, n)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) out[a.slice(2)] = argv[i + 1] != null && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return out;
}

function required(name) {
  if (typeof args[name] !== "string" || !args[name]) {
    process.stderr.write(`missing --${name}\n`);
    process.exit(2);
  }
  return args[name];
}
