#!/usr/bin/env node
// Print the main-thread conversation text of the newest Claude Code session log for a
// working directory, bounded in size, so a run whose context was compacted can recover
// the user's corrections and the assistant's turns for the self-retrospective.
//
// Usage: node session-text.mjs [--cwd <path>] [--file <jsonl>] [--since <ISO>] [--max-chars <n>]
// Output: one line per text message, `[HH:MM:SS] user|assistant: <text>`; assistant text is
// cut to 300 characters, user text to 1000. When the total exceeds --max-chars (default
// 40000) assistant lines are dropped first, then the oldest lines.
// Log location and shape are Claude Code internals observed, not documented: the project
// directory under ~/.claude/projects/ is the cwd with every character outside [A-Za-z0-9]
// replaced by "-"; records are line-delimited JSON with `type`, `timestamp`, `isSidechain`,
// and `message.content` blocks. A missing directory or file is reported on stderr, exit 2.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const args = parseArgs(process.argv.slice(2));
const cwd = args.cwd ?? process.cwd();
const maxChars = Number(args["max-chars"] ?? 40000);
const since = args.since ? Date.parse(args.since) : NaN;

const file = args.file ?? newestLog(cwd);
if (!file) process.exit(2);

const lines = [];
for (const raw of readFileSync(file, "utf8").split("\n")) {
  if (!raw.trim()) continue;
  let rec;
  try { rec = JSON.parse(raw); } catch { continue; }
  if (rec.type !== "user" && rec.type !== "assistant") continue;
  if (rec.isSidechain) continue;
  if (!Number.isNaN(since) && Date.parse(rec.timestamp ?? "") < since) continue;
  const blocks = Array.isArray(rec.message?.content) ? rec.message.content : typeof rec.message?.content === "string" ? [{ type: "text", text: rec.message.content }] : [];
  const text = blocks.filter((b) => b && b.type === "text" && typeof b.text === "string").map((b) => b.text.trim()).filter(Boolean).join(" ");
  if (!text) continue;
  const limit = rec.type === "user" ? 1000 : 300;
  const clipped = text.length > limit ? text.slice(0, limit) + "…" : text;
  const stamp = rec.timestamp ? new Date(rec.timestamp).toISOString().slice(11, 19) : "--:--:--";
  lines.push({ role: rec.type, line: `[${stamp}] ${rec.type}: ${clipped.replace(/\s*\n\s*/g, " ")}` });
}

let out = lines;
const size = (arr) => arr.reduce((n, l) => n + l.line.length + 1, 0);
if (size(out) > maxChars) out = out.filter((l) => l.role === "user");
while (out.length && size(out) > maxChars) out.shift();
process.stdout.write(out.map((l) => l.line).join("\n") + (out.length ? "\n" : ""));

function newestLog(dir) {
  const encoded = dir.replace(/[^A-Za-z0-9]/g, "-");
  const projectDir = join(homedir(), ".claude", "projects", encoded);
  let names;
  try { names = readdirSync(projectDir).filter((n) => n.endsWith(".jsonl")); } catch { names = []; }
  if (!names.length) {
    process.stderr.write(`no session log under ${projectDir}\n`);
    return null;
  }
  return names.map((n) => join(projectDir, n)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) out[a.slice(2)] = argv[i + 1] != null && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return out;
}
