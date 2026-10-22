#!/usr/bin/env node
// Print the files this run changed, with excerpts of the changed lines, as prose-polish's
// `File:` and `Changed lines:` inputs.
//
// Usage: node changed-lines.mjs --base <sha> [--repo <path>]
// Output (stdout; nothing when no file qualifies):
//   File:
//   <path>
//   Changed lines:
//   @@ <path> <a>-<b> @@
//   <lines a..b verbatim>
// A file whose changed lines cover the whole file gets no excerpt. Binary files, deletions, and
// paths under .claude/plans/ are left out.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const args = parseArgs(process.argv.slice(2));
const repo = args.repo ?? process.cwd();
const base = required("base");

const files = []; // { path, lines, ranges: [[a, b]] }

const numstat = git(["-c", "core.quotePath=false", "diff", "--numstat", "-z", "--no-renames", "--diff-filter=d", base]);
for (const entry of numstat.split("\0").filter(Boolean)) {
  const [added, , path] = entry.split("\t");
  if (added === "-" || skipped(path)) continue;
  const ranges = hunkRanges(git(["diff", "-U0", "--no-color", "--no-ext-diff", base, "--", path]));
  const lines = ranges.length ? readLines(path) : null;
  if (lines) files.push({ path, lines, ranges });
}

const untracked = git(["-c", "core.quotePath=false", "ls-files", "--others", "--exclude-standard", "-z"]);
for (const path of untracked.split("\0").filter(Boolean)) {
  if (skipped(path)) continue;
  const lines = readLines(path);
  if (lines?.length) files.push({ path, lines, ranges: [[1, lines.length]] });
}

if (files.length) {
  const out = ["File:", ...files.map((f) => f.path)];
  const partial = files.filter((f) => f.ranges.reduce((n, [a, b]) => n + b - a + 1, 0) < f.lines.length);
  if (partial.length) {
    out.push("Changed lines:");
    for (const f of partial) {
      for (const [a, b] of f.ranges) out.push(`@@ ${f.path} ${a}-${b} @@`, ...f.lines.slice(a - 1, b));
    }
  }
  process.stdout.write(out.join("\n") + "\n");
}

function skipped(path) {
  return path.startsWith(".claude/plans/");
}

// New-side line ranges of a zero-context diff; a pure deletion (`+c,0`) has none.
function hunkRanges(diff) {
  const out = [];
  for (const m of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const start = Number(m[1]);
    const count = m[2] == null ? 1 : Number(m[2]);
    if (count > 0) out.push([start, start + count - 1]);
  }
  return out;
}

function readLines(path) {
  let buf;
  try {
    buf = readFileSync(join(repo, path));
  } catch {
    return null;
  }
  return buf.includes(0) ? null : toLines(buf.toString("utf8"));
}

function toLines(text) {
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

function git(argv) {
  try {
    return execFileSync("git", ["-C", repo, "--literal-pathspecs", ...argv], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    process.stderr.write(`git ${argv.join(" ")} failed: ${err.stderr ?? err.message}\n`);
    process.exit(1);
  }
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
