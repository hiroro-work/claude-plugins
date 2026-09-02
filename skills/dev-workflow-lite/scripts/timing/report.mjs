#!/usr/bin/env node
// Render a timing log as a Markdown table: per phase, wall time, time spent waiting on the
// user (or a background gate), and active time = wall − waiting. Phases are listed in the
// order they started; an unterminated phase is closed at the last event's time and marked.
//
// Usage: node report.mjs --file <timing.jsonl> [--out <dir>] [--title <text>]
// --out writes `<dir>/<YYYY-MM-DD>-<basename>.md` with the same table and prints its path;
// without it the table goes to stdout.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const args = parseArgs(process.argv.slice(2));
if (typeof args.file !== "string") {
  process.stderr.write("missing --file\n");
  process.exit(2);
}
const events = readFileSync(args.file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const phases = new Map();
let lastT = 0;
for (const e of events) {
  const t = Date.parse(e.t);
  lastT = Math.max(lastT, t);
  if (!phases.has(e.phase)) phases.set(e.phase, { start: null, end: null, waiting: 0, openWait: null, unterminated: false });
  const p = phases.get(e.phase);
  if (e.event === "start" && p.start == null) p.start = t;
  if (e.event === "end") p.end = t;
  if (e.event === "wait") p.openWait = t;
  if (e.event === "resume" && p.openWait != null) { p.waiting += t - p.openWait; p.openWait = null; }
}
const rows = [];
let totalWall = 0, totalWait = 0;
for (const [name, p] of phases) {
  if (p.start == null) continue;
  let end = p.end;
  if (end == null) { end = lastT; p.unterminated = true; }
  if (p.openWait != null) { p.waiting += end - p.openWait; }
  const wall = Math.max(0, end - p.start);
  const active = Math.max(0, wall - p.waiting);
  totalWall += wall; totalWait += p.waiting;
  rows.push(`| ${name}${p.unterminated ? " (not ended)" : ""} | ${fmt(wall)} | ${fmt(p.waiting)} | ${fmt(active)} |`);
}
const title = args.title ?? `Timing — ${basename(args.file, ".jsonl")}`;
const table = [`## ${title}`, "", "| Phase | Wall | Waiting | Active |", "|---|---:|---:|---:|", ...rows, `| **Total** | ${fmt(totalWall)} | ${fmt(totalWait)} | ${fmt(totalWall - totalWait)} |`, ""].join("\n");
if (typeof args.out === "string") {
  mkdirSync(args.out, { recursive: true });
  const first = events[0]?.t ? events[0].t.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const out = join(args.out, `${first}-${basename(args.file, ".jsonl")}.md`);
  writeFileSync(out, table);
  process.stdout.write(out + "\n");
} else {
  process.stdout.write(table);
}

function fmt(ms) {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : m ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) out[a.slice(2)] = argv[i + 1] != null && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return out;
}
