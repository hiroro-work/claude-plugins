// digest.mjs turns a session log into turns with a time split. It must recognize a person's
// prompt, an AskUserQuestion answer and a declined tool call as human turns, drop injected text,
// sidechains and meta records, split each turn into AI and human time, and mark long gaps as breaks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "furikaeri", "scripts", "digest.mjs");

const T0 = Date.parse("2026-09-03T05:00:00.000Z");
const at = (s) => new Date(T0 + s * 1000).toISOString();
const rec = (type, content, sec, extra = {}) => JSON.stringify({ type, timestamp: at(sec), isSidechain: false, sessionId: "sess-1", cwd: "/w", gitBranch: "main", message: { role: type, content, ...(type === "assistant" ? { model: "claude-opus-5" } : {}) }, ...extra });

function run(rows, extraArgs = []) {
  const dir = mkdtempSync(join(tmpdir(), "fk-"));
  const file = join(dir, "s.jsonl");
  writeFileSync(file, rows.join("\n"));
  const out = execFileSync("node", [script, "--file", file, "--out-dir", join(dir, "o"), ...extraArgs], { encoding: "utf8" });
  const digest = JSON.parse(readFileSync(join(dir, "o", "digest.json"), "utf8"));
  const transcript = readFileSync(join(dir, "o", "transcript.md"), "utf8");
  rmSync(dir, { recursive: true, force: true });
  return { out, digest, transcript };
}

test("classifies human turns and splits time between AI and person", () => {
  const { digest, transcript } = run([
    JSON.stringify({ type: "bridge-session", sessionId: "sess-1" }),
    rec("user", [{ type: "text", text: "<ide_opened_file>x</ide_opened_file> please build it" }], 0, { origin: { kind: "human" } }),
    rec("user", [{ type: "text", text: "<system-reminder>ignored</system-reminder>" }], 1),
    rec("user", [{ type: "text", text: "Base directory for this skill: /x" }], 1, { isMeta: true }),
    rec("assistant", [{ type: "thinking", thinking: "hidden" }, { type: "tool_use", id: "t1", name: "Skill", input: { skill: "dev-workflow" } }], 5),
    rec("user", [{ type: "tool_result", tool_use_id: "t1", content: "loaded" }], 6),
    rec("assistant", [{ type: "text", text: "Done.\n\n| a | b |\n|---|---|\n| 1 | 2 |" }], 60),
    rec("assistant", [{ type: "text", text: "side" }], 61, { isSidechain: true }),
    rec("assistant", [{ type: "tool_use", id: "q1", name: "AskUserQuestion", input: { questions: [] } }], 62),
    rec("user", [{ type: "tool_result", tool_use_id: "q1", content: 'User has answered your questions: "Which?"="B". You can now continue' }], 300),
    rec("assistant", [{ type: "tool_use", id: "b1", name: "Bash", input: { command: "rm x" } }], 310),
    rec("user", [{ type: "tool_result", tool_use_id: "b1", content: "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file).", is_error: true }], 320),
    rec("assistant", [{ type: "text", text: "Understood." }], 330),
  ]);
  assert.equal(digest.turns.length, 3);
  const [p, a, d] = digest.turns;
  assert.equal(p.kind, "prompt");
  assert.equal(p.text, "please build it");
  assert.equal(p.ai_ms, 62_000);
  assert.equal(p.human_ms, 238_000);
  assert.equal(p.span_ms, 300_000);
  assert.deepEqual(p.tools, { "Skill(dev-workflow)": 1, AskUserQuestion: 1 });
  assert.equal(p.messages.filter((m) => m.role === "assistant").length, 1);
  assert.equal(a.kind, "answer");
  assert.equal(a.text, "B");
  assert.equal(d.kind, "decline");
  assert.equal(d.ai_ms, 10_000);
  assert.equal(digest.totals.wall_ms, 330_000);
  assert.equal(digest.totals.ai_ms + digest.totals.human_ms, digest.totals.wall_ms);
  assert.equal(digest.session.id, "sess-1");
  assert.equal(digest.session.model, "claude-opus-5");
  assert.match(transcript, /^## #1 09-03 05:00 \[prompt\]/m);
  assert.match(transcript, /\[tools: Skill\(dev-workflow\)\]\nA \(09-03 05:01\): Done\./);
  assert.match(transcript, /\[tools: AskUserQuestion\]/);
  assert.ok(!transcript.includes("hidden"));
  assert.ok(!transcript.includes("loaded"), "tool results must not reach the transcript");
});

test("a gap over --gap-cap is a break and leaves the totals", () => {
  const { digest } = run([
    rec("user", [{ type: "text", text: "one" }], 0, { origin: { kind: "human" } }),
    rec("assistant", [{ type: "text", text: "r1" }], 30),
    rec("user", [{ type: "text", text: "two" }], 30 * 60 + 30, { origin: { kind: "human" } }),
    rec("assistant", [{ type: "text", text: "r2" }], 30 * 60 + 40),
  ], ["--gap-cap", "10"]);
  assert.equal(digest.turns[0].break, true);
  assert.equal(digest.turns[0].human_ms, 0);
  assert.equal(digest.turns[0].span_ms, 30_000);
  assert.equal(digest.totals.wall_ms, 40_000);
  assert.equal(digest.gap_cap_ms, 600_000);
});

test("a typed slash command is a turn, and a long trusted prompt is kept", () => {
  const { digest } = run([
    rec("user", [{ type: "text", text: "<command-message>mobpro</command-message>\n<command-name>/mobpro</command-name>\n<command-args>build the mailer\nplease</command-args>" }], 0, { origin: { kind: "human" } }),
    rec("assistant", [{ type: "text", text: "ok" }], 5),
    rec("user", [{ type: "text", text: "# Spec\n\n" + "x".repeat(500) }], 10, { origin: { kind: "human" } }),
    rec("assistant", [{ type: "text", text: "ok" }], 15),
    rec("user", [{ type: "text", text: "# Injected skill body\n\n" + "y".repeat(500) }], 20),
    rec("user", [{ type: "text", text: "<command-name>/x</command-name>" }], 21, { origin: { kind: "task-notification" } }),
    rec("assistant", [{ type: "text", text: "ok" }], 25),
  ]);
  assert.deepEqual(digest.turns.map((t) => t.text.slice(0, 20)), ["/mobpro build the ma", "# Spec\n\nxxxxxxxxxxxx"]);
  assert.equal(digest.turns[0].text, "/mobpro build the mailer\nplease");
});

test("a user text without origin counts as a person when nothing marks it injected", () => {
  const { digest } = run([
    rec("user", [{ type: "text", text: "old-format prompt" }], 0),
    rec("assistant", [{ type: "text", text: "ok" }], 5),
  ]);
  assert.equal(digest.turns.length, 1);
  assert.equal(digest.turns[0].text, "old-format prompt");
});

test("assistant text over the budget is clipped in the transcript, not the digest", () => {
  const { digest, transcript } = run([
    rec("user", [{ type: "text", text: "go" }], 0, { origin: { kind: "human" } }),
    rec("assistant", [{ type: "text", text: "y".repeat(5000) }], 5),
  ], ["--max-chars", "1000"]);
  assert.equal(digest.turns[0].messages[0].text.length, 5000);
  assert.ok(transcript.length < 1500);
  assert.match(transcript, /y+…/);
});

test("missing log exits 2", () => {
  try {
    execFileSync("node", [script, "--cwd", "/nonexistent/path/for/test", "--out-dir", join(tmpdir(), "fk-none")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    assert.fail("expected exit 2");
  } catch (err) {
    assert.equal(err.status, 2);
    assert.match(err.stderr, /no session log/);
  }
});
