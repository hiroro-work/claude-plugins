#!/usr/bin/env node
// Attribute the working tree's residue over a snapshot chain to the chain commits that last
// touched the affected lines, and write one patch per target.
//
// Usage: node attribute.mjs --base <sha> --tip <sha> --out <dir> [--repo <path>] [--start-tree <tree>]
// Output (stdout, one JSON object):
//   { "targets": [{ "commit": "<sha>", "subject": "...", "patch": "<path>", "hunks": n }],
//     "trailing": { "patch": "<path>", "hunks": n } | null,
//     "excluded": ["<path>"],
//     "residue_files": n }
// Hunks nobody in the chain can own go to the trailing patch. With --start-tree, a file no chain
// commit wrote whose content still matches that tree is skipped whole into "excluded".
// Patches are zero-context: apply them with `git apply --unidiff-zero`.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = parseArgs(process.argv.slice(2));
const repo = args.repo ?? process.cwd();
const base = required("base");
const tip = required("tip");
const outDir = required("out");
const startTree = "start-tree" in args ? required("start-tree") : null;

const chain = git(["rev-list", "--reverse", `${base}..${tip}`]).split("\n").filter(Boolean);
const rank = new Map(chain.map((sha, i) => [sha, i]));
const subjects = new Map(chain.map((sha) => [sha, git(["log", "-1", "--format=%s", sha])]));

const diff = gitRaw(["-c", "core.quotePath=false", "diff", "--no-color", "--no-ext-diff", "-U0", "--no-renames", tip]); // keep the final newline: hunks need it
const files = splitFiles(diff);

const byTarget = new Map(); // sha -> { header, hunks: [] }
const trailing = { hunks: [] }; // entries: { header, body }
const excluded = startTree ? unchangedSince(startTree, files) : [];
const excludedSet = new Set(excluded);

for (const file of files) {
  if (excludedSet.has(file.path)) continue;
  if (file.binary) {
    trailing.hunks.push({ header: file.header, body: file.raw });
    continue;
  }
  const fileFallback = lastChainCommitTouching(file.path);
  const owners = file.hunks.map((h) => ownerOf(file, h) ?? fileFallback);
  const distinct = new Set(owners.filter(Boolean));
  const fileTarget = distinct.size === 1 ? [...distinct][0] : null;
  file.hunks.forEach((h, i) => {
    const target = fileTarget ?? owners[i];
    if (!target) {
      trailing.hunks.push({ header: file.header, body: h.text });
      return;
    }
    if (!byTarget.has(target)) byTarget.set(target, new Map());
    const perFile = byTarget.get(target);
    if (!perFile.has(file.path)) perFile.set(file.path, { header: file.header, hunks: [] });
    perFile.get(file.path).hunks.push(h.text);
  });
}

mkdirSync(outDir, { recursive: true });
const targets = [...byTarget.entries()]
  .sort((a, b) => rank.get(a[0]) - rank.get(b[0]))
  .map(([sha, perFile]) => {
    let text = "";
    let count = 0;
    for (const { header, hunks } of perFile.values()) {
      text += header + hunks.join("");
      count += hunks.length;
    }
    const patch = join(outDir, `${sha.slice(0, 12)}.patch`);
    writeFileSync(patch, text);
    return { commit: sha, subject: subjects.get(sha), patch, hunks: count };
  });

let trailingOut = null;
if (trailing.hunks.length) {
  const grouped = new Map();
  for (const { header, body } of trailing.hunks) {
    if (!grouped.has(header)) grouped.set(header, []);
    grouped.get(header).push(body);
  }
  let text = "";
  for (const [header, bodies] of grouped) text += header + bodies.join("");
  const patch = join(outDir, "trailing.patch");
  writeFileSync(patch, text);
  trailingOut = { patch, hunks: trailing.hunks.length };
}

process.stdout.write(JSON.stringify({ targets, trailing: trailingOut, excluded, residue_files: files.length - excluded.length }) + "\n");


function ownerOf(file, hunk) {
  if (file.isNew) return null; // no old lines to blame; file-level fallback decides
  // A pure insertion has no old lines: blame the line before it, else the line after.
  let start = hunk.oldStart;
  let end = hunk.oldStart + hunk.oldLen - 1;
  if (hunk.oldLen === 0) {
    start = end = hunk.oldStart >= 1 ? hunk.oldStart : 1;
  }
  const porcelain = git(["blame", "-l", "--porcelain", "-L", `${start},${end}`, tip, "--", file.path], true);
  if (porcelain == null) return null;
  let best = null;
  for (const line of porcelain.split("\n")) {
    const m = /^([0-9a-f]{40}) \d+ \d+/.exec(line);
    if (!m) continue;
    const sha = m[1];
    if (!rank.has(sha)) continue;
    if (best == null || rank.get(sha) > rank.get(best)) best = sha;
  }
  return best;
}

function lastChainCommitTouching(path) {
  const out = git(["log", "-1", "--format=%H", `${base}..${tip}`, "--", path], true);
  const sha = (out ?? "").trim();
  return rank.has(sha) ? sha : null;
}

function splitFiles(text) {
  const out = [];
  const parts = text.split(/^(?=diff --git )/m).filter((p) => p.trim());
  for (const raw of parts) {
    const headerEnd = raw.search(/^@@ /m);
    const header = headerEnd === -1 ? raw : raw.slice(0, headerEnd);
    const pathMatch = /^\+\+\+ (?:b\/(.*)|\/dev\/null)$/m.exec(header);
    const minusMatch = /^--- (?:a\/(.*)|\/dev\/null)$/m.exec(header);
    const isDeleted = pathMatch && pathMatch[1] == null;
    const path = (isDeleted ? minusMatch?.[1] : pathMatch?.[1])?.replace(/\t$/, "") ?? pathFromGitLine(header);
    const binary = /^Binary files /m.test(raw) || /^GIT binary patch/m.test(raw) || headerEnd === -1;
    const isNew = /^new file mode/m.test(header) || (minusMatch && minusMatch[1] == null);
    const hunks = [];
    if (!binary) {
      const body = raw.slice(headerEnd);
      const pieces = body.split(/^(?=@@ )/m).filter((p) => p.length);
      for (const text of pieces) {
        const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(text);
        if (!m) continue;
        hunks.push({ text, oldStart: +m[1], oldLen: m[2] == null ? 1 : +m[2] });
      }
    }
    out.push({ path: path ?? "", header, hunks, binary, isNew: !!isNew, raw });
  }
  return out;
}

// A binary or mode-only diff has no ---/+++ line; under --no-renames both halves of `diff --git` are the same path.
function pathFromGitLine(header) {
  const m = /^diff --git (.*)$/m.exec(header);
  if (!m || m[1].startsWith('"') || m[1].length % 2 === 0) return "";
  const half = (m[1].length - 1) / 2;
  const a = m[1].slice(0, half).slice(2);
  return a === m[1].slice(half + 1).slice(2) ? a : "";
}

function gitRaw(argv) {
  try {
    return execFileSync("git", ["-C", repo, ...argv], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    process.stderr.write(`git ${argv.join(" ")} failed: ${err.stderr ?? err.message}\n`);
    process.exit(1);
  }
}

// Residue paths no chain commit wrote that still hold their content from when the run began.
function unchangedSince(tree, files) {
  const paths = [...new Set(files.map((f) => f.path).filter(Boolean))];
  if (!paths.length) return [];
  const names = (argv) => new Set(git(argv).split("\0").filter(Boolean));
  const changed = names(["-c", "core.quotePath=false", "diff", "--name-only", "-z", "--no-renames", tree, "--", ...paths]);
  const touched = names(["-c", "core.quotePath=false", "diff", "--name-only", "-z", "--no-renames", base, tip, "--", ...paths]);
  return paths.filter((path) => !changed.has(path) && !touched.has(path));
}

function git(argv, tolerate = false) {
  try {
    return execFileSync("git", ["-C", repo, ...argv], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).replace(/\n$/, "");
  } catch (err) {
    if (tolerate) return null;
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
