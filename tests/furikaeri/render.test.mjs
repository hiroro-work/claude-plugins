// render.mjs: analysis validation, escaping, markdown subset, --lang labels.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "furikaeri", "scripts", "render.mjs");

const T0 = Date.parse("2026-09-03T05:00:00.000Z");
const turn = (i, offsetS, text, ai, human, messages = [], extra = {}) => ({ i, t: T0 + offsetS * 1000, kind: "prompt", text, messages, tools: {}, ai_ms: ai * 1000, human_ms: human * 1000, span_ms: (ai + human) * 1000, break: false, ...extra });
const digest = {
  session: { id: "sess-1234-abcd", file: "/x.jsonl", lines: 10, cwd: "/w", git_branch: "main", model: "m", version: "1", start: T0, end: T0 + 900_000 },
  gap_cap_ms: 3_600_000,
  totals: { ai_ms: 90_000, human_ms: 390_000, wall_ms: 480_000 },
  turns: [
    turn(1, 0, "start <b>here</b>", 30, 270, [{ role: "assistant", t: T0 + 5000, text: "# Plan\n\n- one `x`\n- two\n\n```rb\nputs 1 < 2\n```" }, { role: "tools", t: T0 + 6000, items: { Bash: 3 } }]),
    turn(2, 300, "why?", 30, 0, [{ role: "assistant", t: T0 + 305_000, text: "Because **it** is." }], { break: true }),
    turn(3, 7500, "ok go", 30, 120),
  ],
};
const good = {
  title: "Title", dek: "Dek", eyebrow: "Eyebrow",
  phases: [{ name: "Setup", from: 1, to: 1, group: "Design", severity: "warn", note: "slow" }, { name: "Question", from: 2, to: 2, group: "Design" }, { name: "Go", from: 3, to: 3 }],
  findings: [{ title: "Asked again", severity: "crit", from: 1, to: 2, tags: ["2 asks"], body: ["The person asked **again**."], quote: "why?" }],
  aside: { heading: "Note", paragraphs: ["One `thing`."] },
};

function render(analysis, args = []) {
  const dir = mkdtempSync(join(tmpdir(), "fkr-"));
  try {
    writeFileSync(join(dir, "d.json"), JSON.stringify(digest));
    writeFileSync(join(dir, "a.json"), JSON.stringify(analysis));
    execFileSync("node", [script, "--digest", join(dir, "d.json"), "--analysis", join(dir, "a.json"), "--out", join(dir, "p.html"), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return readFileSync(join(dir, "p.html"), "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function reject(analysis) {
  try { render(analysis); assert.fail("expected exit 3"); } catch (err) { assert.equal(err.status, 3); return err.stderr; }
}

test("renders computed numbers, groups, breaks, escaped text and the markdown subset", () => {
  const html = render(good);
  assert.match(html, /<title>Title<\/title>/);
  assert.match(html, /:root\{/);
  assert.match(html, /prefers-color-scheme:dark/);
  assert.match(html, /8m 00s/, "wall time from the digest");
  assert.match(html, /全体の 19%/, "AI share computed");
  assert.match(html, /class="gname">Design</);
  assert.match(html, /class="row child sev-warn"/);
  assert.match(html, /<em>slow<\/em>/);
  assert.match(html, /class="brk">中断 1h 59m/);
  assert.match(html, /start &lt;b&gt;here&lt;\/b&gt;/, "message text is escaped");
  assert.match(html, /<h3 class="mh">Plan<\/h3>/);
  assert.match(html, /<ul><li>one <code>x<\/code><\/li><li>two<\/li><\/ul>/);
  assert.match(html, /<pre><code>puts 1 &lt; 2<\/code><\/pre>/);
  assert.match(html, /<span class="tool">Bash<b>×3<\/b><\/span>/);
  assert.match(html, /class="find crit"/);
  assert.match(html, /<blockquote><p>why\?<\/p><\/blockquote>/);
  assert.match(html, /<span>2 asks<\/span>/);
  assert.match(html, /<span>2 ターン<\/span>/, "finding turn count computed");
  assert.equal((html.match(/<details class="ph"/g) ?? []).length, 3);
  assert.match(html, /3 ターン ／ 2 AI メッセージ ／ セッション sess-1234-abcd/);
});

test("--lang en switches the fixed labels", () => {
  const html = render(good, ["--lang", "en"]);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /Time per phase/);
  assert.match(html, /3 turns \/ 2 AI messages/);
  assert.ok(!html.includes("フェーズ別の時間"));
});

test("rejects phases that do not cover every turn", () => {
  const err = reject({ ...good, phases: [{ name: "A", from: 1, to: 2 }] });
  assert.match(err, /phases end at turn 2; the log has 3 turns/);
});

test("rejects a gap or overlap between phases", () => {
  const err = reject({ ...good, phases: [{ name: "A", from: 1, to: 1 }, { name: "B", from: 3, to: 3 }] });
  assert.match(err, /phases\[1\]\.from is 3; expected 2/);
});

test("rejects a quote that is not verbatim and accepts one that differs only in whitespace", () => {
  const err = reject({ ...good, findings: [{ ...good.findings[0], quote: "why not?" }] });
  assert.match(err, /findings\[0\]\.quote is not a verbatim passage/);
  const html = render({ ...good, findings: [{ ...good.findings[0], quote: " why ? " }] });
  assert.match(html, /<blockquote>/);
});

test("rejects bad enums and shapes", () => {
  const err = reject({ ...good, phases: [{ name: "A", from: 1, to: 3, severity: "bad" }], findings: [{ title: "", from: 0, to: 9, body: [] }] });
  assert.match(err, /phases\[0\]\.severity/);
  assert.match(err, /findings\[0\]\.title/);
  assert.match(err, /findings\[0\]: from\/to/);
  assert.match(err, /findings\[0\]\.body/);
});
