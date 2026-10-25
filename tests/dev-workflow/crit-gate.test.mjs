// scripts/crit/gate.mjs against a fake `crit` on PATH: the probe, the story ingest, and the verdict reading.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GATE = fileURLToPath(new URL("../../skills/dev-workflow/scripts/crit/gate.mjs", import.meta.url));

// Behaviour is steered by FAKE_CRIT_* env vars; every call appends its argv to FAKE_CRIT_LOG.
const FAKE_CRIT = `#!/bin/sh
printf '%s\\n' "$*" >> "$FAKE_CRIT_LOG"
case "$1" in
  --version) echo "crit 0.18.1"; exit 0 ;;
  story)
    case "$*" in
      *--guide*) echo "GUIDE"; exit 0 ;;
      *--prep*) echo "--- (a.js, 1) [modified]"; exit 0 ;;
      *)
        [ -n "$FAKE_CRIT_DAEMON" ] && echo "Started crit daemon at http://127.0.0.1:4321" >&2
        if [ -n "$FAKE_CRIT_STORY_FAIL" ]; then
          echo "story places fewer than half of the diff's hunks: (a.js, 1)" >&2; exit 1
        fi
        [ "$FAKE_CRIT_STORY_FILE" = "-" ] && cat > /dev/null
        echo '{"ok":true,"indexed":3,"placed":3}'; exit 0 ;;
    esac ;;
  --range)
    case "$FAKE_CRIT_VERDICT" in
      true) echo "approved: true" >&2; exit 0 ;;
      false) printf 'approved: false\\n2 unresolved comments\\n[{"scope":"line","path":"a.js","start_line":1,"end_line":2,"body":"x"},{"scope":"review","body":"y"}]\\n' >&2; exit 0 ;;
      garbage) printf 'approved: false\\nnot json at all\\n' >&2; exit 0 ;;
      split) echo "approved: false" >&2; printf '[{"scope":"review","body":"z"}]\\n'; exit 0 ;;
      *) echo "boom" >&2; exit 2 ;;
    esac ;;
esac
exit 1
`;

function makeBin(t, { missing = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "fake-crit-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  if (!missing) {
    writeFileSync(join(dir, "crit"), FAKE_CRIT);
    chmodSync(join(dir, "crit"), 0o755);
  }
  return dir;
}

function gate(args, bin, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [GATE, ...args], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_CRIT_LOG: join(bin, "log"), CLAUDE_CODE_REMOTE: "", ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolve({ code, stdout, stderr, log: readLog(bin) }));
  });
}

const readLog = (bin) => { try { return readFileSync(join(bin, "log"), "utf8"); } catch { return ""; } };
const result = (r) => {
  const lines = r.stdout.split("\n").filter(Boolean);
  assert.equal(lines.length, 1, `stdout carries one JSON line: ${JSON.stringify(r.stdout)}`);
  return JSON.parse(lines[0]);
};

test("a usage error exits 1 without a result", async (t) => {
  const r = await gate(["review"], makeBin(t));
  assert.equal(r.code, 1);
  assert.equal(r.stdout, "");
});

test("a missing crit reports unavailable", async (t) => {
  const r = await gate(["review", "--range", "a..b"], makeBin(t, { missing: true }), { PATH: "/nonexistent" });
  assert.equal(r.code, 0);
  assert.equal(result(r).status, "unavailable");
});

test("a remote session reports unavailable without calling crit", async (t) => {
  const bin = makeBin(t);
  const r = await gate(["review", "--range", "a..b"], bin, { CLAUDE_CODE_REMOTE: "true" });
  assert.equal(result(r).status, "unavailable");
  assert.equal(r.log, "");
});

test("prep prints the guide, a marker, and the hunk listing", async (t) => {
  const r = await gate(["prep", "--range", "a..b"], makeBin(t));
  assert.equal(r.code, 0);
  assert.equal(r.stdout, "GUIDE\n--- hunks ---\n--- (a.js, 1) [modified]\n");
});

test("story ingests with --no-open and reports the daemon it started", async (t) => {
  const bin = makeBin(t);
  const story = join(bin, "story.json");
  writeFileSync(story, "{}");
  const r = await gate(["story", "--range", "a..b", "--story-file", story], bin, { FAKE_CRIT_DAEMON: "1" });
  const out = result(r);
  assert.equal(out.status, "ingested");
  assert.equal(out.placed, 3);
  assert.equal(out.daemon_url, "http://127.0.0.1:4321");
  assert.match(r.log, /^story --range a\.\.b --story-file .*story\.json --refresh --no-open$/m);
});

test("story reports a rejected ingest with crit's last stderr line", async (t) => {
  const bin = makeBin(t);
  const story = join(bin, "story.json");
  writeFileSync(story, "{}");
  const r = await gate(["story", "--range", "a..b", "--story-file", story], bin, { FAKE_CRIT_STORY_FAIL: "1" });
  const out = result(r);
  assert.equal(out.status, "rejected");
  assert.match(out.error, /\(a\.js, 1\)/);
  assert.equal(out.daemon_url, null);
});

test("review reads approved: true", async (t) => {
  const r = await gate(["review", "--range", "a..b"], makeBin(t), { FAKE_CRIT_VERDICT: "true" });
  const out = result(r);
  assert.equal(out.status, "approved");
  assert.deepEqual(out.comments, []);
  assert.match(r.log, /^--range a\.\.b$/m);
});

test("review passes --no-open through and parses the comments after approved: false", async (t) => {
  const r = await gate(["review", "--range", "a..b", "--no-open"], makeBin(t), { FAKE_CRIT_VERDICT: "false" });
  const out = result(r);
  assert.equal(out.status, "changes");
  assert.equal(out.comments.length, 2);
  assert.equal(out.comments[0].scope, "line");
  assert.equal(out.comments[1].body, "y");
  assert.match(r.log, /^--range a\.\.b --no-open$/m);
  assert.match(r.stderr, /approved: false/, "crit's stderr is echoed");
});

test("review finds the comments on the other stream", async (t) => {
  const r = await gate(["review", "--range", "a..b"], makeBin(t), { FAKE_CRIT_VERDICT: "split" });
  const out = result(r);
  assert.equal(out.status, "changes");
  assert.deepEqual(out.comments, [{ scope: "review", body: "z" }]);
});

test("review keeps the raw tail when the comments do not parse", async (t) => {
  const r = await gate(["review", "--range", "a..b"], makeBin(t), { FAKE_CRIT_VERDICT: "garbage" });
  const out = result(r);
  assert.equal(out.status, "changes");
  assert.deepEqual(out.comments, []);
  assert.match(out.comments_raw, /not json/);
});

test("review reports a crashed crit as broken", async (t) => {
  const r = await gate(["review", "--range", "a..b"], makeBin(t), { FAKE_CRIT_VERDICT: "crash" });
  const out = result(r);
  assert.equal(out.status, "broken");
  assert.equal(out.exit, 2);
  assert.equal(out.reason, "boom");
});
