#!/usr/bin/env node
// Turn a Claude Code session log (jsonl) into a digest the analysis and the page are built from.
//
// Usage: node digest.mjs (--file <jsonl> | --cwd <path>) --out-dir <dir> [--gap-cap <minutes>] [--max-chars <n>]
// Writes <out-dir>/digest.json and <out-dir>/transcript.md, prints the two paths and the turn count.
// Exit 2 when no log is found.
//
// Log location and shape are Claude Code internals observed, not documented: the project directory under
// ~/.claude/projects/ is the cwd with every character outside [A-Za-z0-9] replaced by "-".
// AI time runs from the person's send to the last assistant record before the next human turn; the rest
// of the span is the person's. A span longer than --gap-cap is a break and left out of every total.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";

const args = parseArgs(process.argv.slice(2));
const outDir = args["out-dir"];
if (!outDir) { process.stderr.write("--out-dir is required\n"); process.exit(1); }
const gapCapMs = Number(args["gap-cap"] ?? 60) * 60_000;
const maxChars = Number(args["max-chars"] ?? 120_000);

const file = args.file ?? newestLog(args.cwd ?? process.cwd());
if (!file) process.exit(2);

const INJECTED_USER_TEXT = [
  /^<(command-message|command-name|command-args|system-reminder|task-notification|local-command-stdout|ide_selection|user-prompt-submit-hook)\b/,
  /^Base directory for this skill:/,
  /^\[Subagent hand-back\]/,
  /^\[harness:/,
  /^\(Re-invocation of \//,
];
const looksInjected = (t) => t.length > 400 && /^#{1,3} /m.test(t);
const IDE_TAG = /<(ide_opened_file|ide_selection)>[\s\S]*?<\/\1>\s*/g;
// A slash command a person typed is filed as its expansion; the command line is rebuilt from it.
const COMMAND = /<command-name>\s*(\/\S+)\s*<\/command-name>(?:[\s\S]*?<command-args>([\s\S]*?)<\/command-args>)?/;
// Wording observed on a tool_result after the person declined the call in the permission prompt.
const DECLINE = /user doesn't want to proceed with this tool use/i;

const records = [];
for (const raw of readFileSync(file, "utf8").split("\n")) {
  if (!raw.trim()) continue;
  let rec;
  try { rec = JSON.parse(raw); } catch { continue; }
  if (rec.type !== "user" && rec.type !== "assistant") continue;
  if (rec.isSidechain) continue;
  const ts = Date.parse(rec.timestamp ?? "");
  if (Number.isNaN(ts)) continue;
  records.push({ ...rec, ts });
}
records.sort((a, b) => a.ts - b.ts);

const askIds = new Set();
for (const rec of records) {
  if (rec.type !== "assistant") continue;
  for (const b of blocksOf(rec)) if (b.type === "tool_use" && b.name === "AskUserQuestion") askIds.add(b.id);
}

// A record marked `origin.kind: "human"` is trusted; an older record without `origin` goes through the shape heuristic.
function humanTurn(rec) {
  if (rec.isMeta) return null;
  const blocks = blocksOf(rec);
  const trusted = rec.origin?.kind === "human";
  if (rec.origin && !trusted) return null;
  const texts = blocks.filter((b) => b.type === "text" && typeof b.text === "string").map((b) => {
    const cmd = b.text.match(COMMAND);
    if (cmd) return `${cmd[1]} ${(cmd[2] ?? "").trim()}`.trim();
    return b.text.replace(IDE_TAG, "").trim();
  }).filter(Boolean);
  const kept = texts.filter((t) => !INJECTED_USER_TEXT.some((re) => re.test(t)) && (trusted || !looksInjected(t)));
  const text = kept.join("\n\n");
  if (text) return { kind: "prompt", text };
  for (const b of blocks) {
    if (b.type !== "tool_result") continue;
    const content = flattenResult(b.content);
    if (askIds.has(b.tool_use_id)) return { kind: "answer", text: answerText(content) };
    if (b.is_error && DECLINE.test(content)) return { kind: "decline", text: content.replace(/<[^>]+>/g, "").trim().slice(0, 300) };
  }
  return null;
}

const turns = [];
let current = null;
for (const rec of records) {
  if (rec.type === "user") {
    const h = humanTurn(rec);
    if (h) {
      current = { i: turns.length + 1, t: rec.ts, kind: h.kind, text: h.text, messages: [], tools: {}, lastAssistant: null };
      turns.push(current);
    }
    continue;
  }
  if (!current) continue;
  current.lastAssistant = rec.ts;
  for (const b of blocksOf(rec)) {
    if (b.type === "text" && typeof b.text === "string" && b.text.trim()) {
      current.messages.push({ role: "assistant", t: rec.ts, text: b.text.trim() });
    } else if (b.type === "tool_use") {
      const label = toolLabel(b);
      current.tools[label] = (current.tools[label] ?? 0) + 1;
      const last = current.messages.at(-1);
      if (last && last.role === "tools") last.items[label] = (last.items[label] ?? 0) + 1;
      else current.messages.push({ role: "tools", t: rec.ts, items: { [label]: 1 } });
    }
  }
}

const sessionEnd = records.at(-1)?.ts ?? 0;
for (let i = 0; i < turns.length; i++) {
  const turn = turns[i];
  const next = turns[i + 1];
  const end = next ? next.t : (turn.lastAssistant ?? turn.t);
  const aiEnd = turn.lastAssistant != null && turn.lastAssistant >= turn.t ? Math.min(turn.lastAssistant, end) : turn.t;
  turn.ai_ms = aiEnd - turn.t;
  const span = end - turn.t;
  turn.break = span > gapCapMs;
  turn.human_ms = turn.break ? 0 : span - turn.ai_ms;
  turn.span_ms = turn.break ? turn.ai_ms : span;
  delete turn.lastAssistant;
}

const totals = turns.reduce((acc, t) => ({ ai_ms: acc.ai_ms + t.ai_ms, human_ms: acc.human_ms + t.human_ms, wall_ms: acc.wall_ms + t.span_ms }), { ai_ms: 0, human_ms: 0, wall_ms: 0 });
const first = records[0];
const model = records.find((r) => r.type === "assistant" && r.message?.model)?.message?.model ?? null;
const digest = {
  session: {
    id: first?.sessionId ?? basename(file, ".jsonl"),
    file,
    lines: readFileSync(file, "utf8").split("\n").filter(Boolean).length,
    cwd: first?.cwd ?? null,
    git_branch: first?.gitBranch ?? null,
    model,
    version: first?.version ?? null,
    start: turns[0]?.t ?? first?.ts ?? null,
    end: sessionEnd || null,
  },
  gap_cap_ms: gapCapMs,
  totals,
  turns,
};

mkdirSync(outDir, { recursive: true });
const digestPath = join(outDir, "digest.json");
const transcriptPath = join(outDir, "transcript.md");
writeFileSync(digestPath, JSON.stringify(digest, null, 1));
writeFileSync(transcriptPath, transcript(digest, maxChars));
process.stdout.write(`${digestPath}\n${transcriptPath}\nturns: ${turns.length}\n`);

function transcript(d, cap) {
  const lines = [];
  lines.push(`# Session ${d.session.id}`, `turns: ${d.turns.length}; wall ${fmt(d.totals.wall_ms)}; AI ${fmt(d.totals.ai_ms)}; human ${fmt(d.totals.human_ms)}`, "");
  const perTurn = d.turns.map((t) => {
    const head = `## #${t.i} ${stamp(t.t)} [${t.kind}] span ${fmt(t.span_ms)} (AI ${fmt(t.ai_ms)} / human ${fmt(t.human_ms)})${t.break ? " — break after this turn" : ""}`;
    const body = [`U: ${t.text}`];
    for (const m of t.messages) {
      if (m.role === "tools") body.push(`[tools: ${Object.entries(m.items).map(([k, v]) => (v > 1 ? `${k}×${v}` : k)).join(", ")}]`);
      else body.push(`A (${stamp(m.t)}): ${m.text}`);
    }
    return { head, body };
  });
  let limit = 1500;
  const build = () => perTurn.map(({ head, body }) => [head, ...body.map((l) => (l.startsWith("A ") && l.length > limit ? l.slice(0, limit) + "…" : l))].join("\n")).join("\n\n");
  let out = build();
  while (out.length > cap && limit > 200) { limit = Math.floor(limit / 2); out = build(); }
  return lines.join("\n") + out + "\n";
}

function blocksOf(rec) {
  const c = rec.message?.content;
  if (Array.isArray(c)) return c.filter(Boolean);
  if (typeof c === "string") return [{ type: "text", text: c }];
  return [];
}
function flattenResult(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((b) => (typeof b === "string" ? b : b?.text ?? "")).join("\n");
  return "";
}
function answerText(content) {
  // Shape observed: `User has answered your questions: "<q>"="<a>", "<q2>"="<a2>". You can now continue ...`
  const body = content.replace(/^User has answered your questions:\s*/, "").replace(/\.?\s*You can now continue[\s\S]*$/, "");
  const answers = [...body.matchAll(/"((?:[^"\\]|\\.)*)"="((?:[^"\\]|\\.)*)"/g)].map((m) => m[2]);
  return (answers.length ? answers.join(" / ") : body).slice(0, 500);
}
function toolLabel(b) {
  const inp = b.input ?? {};
  if (b.name === "Skill" && inp.skill) return `Skill(${inp.skill})`;
  if (b.name === "Agent" && inp.subagent_type) return `Agent(${inp.subagent_type})`;
  return b.name;
}
function fmt(ms) {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : m ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
}
function stamp(ms) { return new Date(ms).toISOString().slice(5, 16).replace("T", " "); }

function newestLog(dir) {
  const encoded = dir.replace(/[^A-Za-z0-9]/g, "-");
  const projectDir = join(homedir(), ".claude", "projects", encoded);
  let names;
  try { names = readdirSync(projectDir).filter((n) => n.endsWith(".jsonl")); } catch { names = []; }
  if (!names.length) { process.stderr.write(`no session log under ${projectDir}\n`); return null; }
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
