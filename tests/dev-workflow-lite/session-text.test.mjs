// session-text.mjs feeds the self-retrospective when context was compacted. It must keep
// main-thread user and assistant text, drop subagent turns, tool blocks and thinking, clip
// long turns, and shed assistant lines first when the output would exceed the cap.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "dev-workflow-lite", "scripts", "retro", "session-text.mjs");

const rec = (type, content, extra = {}) => JSON.stringify({ type, timestamp: "2026-09-02T01:02:03.000Z", isSidechain: false, message: { role: type, content }, ...extra });

test("keeps main-thread text, drops tool blocks, sidechains, and thinking", () => {
  const dir = mkdtempSync(join(tmpdir(), "stx-"));
  try {
    const file = join(dir, "s.jsonl");
    writeFileSync(file, [
      JSON.stringify({ type: "bridge-session", sessionId: "x" }),
      rec("user", [{ type: "text", text: "please fix the\n  gate" }]),
      rec("assistant", [{ type: "thinking", thinking: "hidden" }, { type: "tool_use", id: "t", name: "Bash", input: {} }]),
      rec("assistant", [{ type: "text", text: "a".repeat(400) }]),
      rec("user", [{ type: "tool_result", tool_use_id: "t", content: "ok" }]),
      rec("assistant", [{ type: "text", text: "side" }], { isSidechain: true }),
      "not json",
    ].join("\n"));
    const out = execFileSync("node", [script, "--file", file], { encoding: "utf8" }).trimEnd().split("\n");
    assert.equal(out.length, 2);
    assert.equal(out[0], "[01:02:03] user: please fix the gate");
    assert.match(out[1], /^\[01:02:03\] assistant: a{300}…$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sheds assistant lines first when over the cap", () => {
  const dir = mkdtempSync(join(tmpdir(), "stx-"));
  try {
    const file = join(dir, "s.jsonl");
    const rows = [];
    for (let i = 0; i < 20; i++) rows.push(rec("user", [{ type: "text", text: `u${i} ` + "x".repeat(50) }]), rec("assistant", [{ type: "text", text: `a${i} ` + "y".repeat(200) }]));
    writeFileSync(file, rows.join("\n"));
    const out = execFileSync("node", [script, "--file", file, "--max-chars", "2000"], { encoding: "utf8" });
    assert.ok(!/assistant:/.test(out), "assistant lines should be dropped first");
    assert.ok(out.length <= 2000);
    assert.match(out.trimEnd().split("\n").at(-1), /user: u19 /);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("missing log exits 2 with a message", () => {
  try {
    execFileSync("node", [script, "--cwd", "/nonexistent/path/for/test"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    assert.fail("expected exit 2");
  } catch (err) {
    assert.equal(err.status, 2);
    assert.match(String(err.stderr), /no session log under/);
  }
});
