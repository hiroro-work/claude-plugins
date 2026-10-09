// render.mjs: validation, escaping, --lang labels, summary, error-case folding, chapter links, optional video.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "demo", "scripts", "render.mjs");

const good = {
  title: "Sign-up flow",
  dek: "A visitor creates an account.",
  url: "http://localhost:3000",
  features: [
    { name: "Sign up", description: "A visitor creates an account.", at: 3, error_at: 40 },
    { name: "Edit the profile", at: 20 },
  ],
  steps: [
    { n: 1, feature: 1, kind: "normal", path: "/signup", action: "Open the sign-up form <b>now</b>", expected: "The form shows", result: "The form showed", status: "ok", screenshot: "step-01.png", at: 5 },
    { n: 2, feature: 2, kind: "normal", path: "/profile", action: "Change the name", expected: "The new name shows", result: "The new name showed", status: "ok", screenshot: "step-02.png", at: 22 },
    { n: 3, feature: 1, kind: "error", path: "/signup", action: "Submit it empty", expected: "Email can't be blank", result: "stayed on the form without a message", data: "seeded user", script: "INSERT INTO users VALUES (1)", status: "failed", note: "no message", screenshot: "step-03.png", at: 42 },
  ],
};

function render(doc, args = []) {
  const dir = mkdtempSync(join(tmpdir(), "demo-"));
  try {
    writeFileSync(join(dir, "s.json"), JSON.stringify(doc));
    execFileSync("node", [script, "--steps", join(dir, "s.json"), "--out", join(dir, "p.html"), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return readFileSync(join(dir, "p.html"), "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function renderFails(doc) {
  try { render(doc); } catch (err) { return { status: err.status, stderr: String(err.stderr) }; }
  throw new Error("expected a failure");
}

const count = (html, re) => (html.match(re) ?? []).length;
const goodJa = render(good);

test("one section per step, escaped, with the screenshot, the result and the badge", () => {
  const html = goodJa;
  assert.equal(count(html, /<section class="step"/g), 3);
  assert.ok(html.includes("Open the sign-up form &lt;b&gt;now&lt;/b&gt;"));
  assert.ok(!html.includes("<b>now</b>"));
  assert.ok(html.includes('<img src="step-03.png"'));
  assert.ok(html.includes('class="badge ng"'));
  assert.ok(html.includes("stayed on the form without a message"));
  assert.ok(html.includes("no message"));
  assert.ok(html.includes("INSERT INTO users"));
  assert.ok(html.includes("<title>Sign-up flow</title>"));
});

test("steps are grouped by feature, normal cases before error cases", () => {
  const html = goodJa;
  assert.equal(count(html, /<section class="feature"/g), 2);
  const a = html.indexOf('id="feature-1"'), b = html.indexOf('id="feature-2"');
  assert.ok(a < html.indexOf('id="step-1"') && html.indexOf('id="step-1"') < html.indexOf('id="step-3"') && html.indexOf('id="step-3"') < b);
  assert.ok(b < html.indexOf('id="step-2"'));
  assert.ok(html.includes('<span class="letter">B.</span>'));
});

test("the summary has one row per feature with its counts", () => {
  const html = goodJa;
  const table = html.slice(html.indexOf('<table class="summary"'), html.indexOf("</table>"));
  assert.equal(count(table, /<tr><td>/g), 2);
  assert.ok(table.includes('<a href="#feature-1">A. Sign up</a></td><td>1 手順</td><td>1 手順</td><td>1 / 1</td>'));
  assert.ok(table.includes('<a href="#feature-2">B. Edit the profile</a></td><td>1 手順</td><td>なし</td><td>1 / 0</td>'));
});

test("error cases fold into details, open when one is not confirmed", () => {
  const html = goodJa;
  assert.equal(count(html, /<details class="errors"/g), 1);
  assert.ok(html.includes('<details class="errors" open><summary><span>異常系 1 件 — 確認済み 0 / 未確認 1</span>'));
  const allOk = render({ ...good, steps: good.steps.map((s) => ({ ...s, status: "ok" })) });
  assert.ok(allOk.includes('<details class="errors"><summary>'));
  assert.ok(html.includes('data-all="1"'));
  const noErrors = render({ ...good, steps: good.steps.filter((s) => s.kind === "normal") });
  assert.ok(!noErrors.includes("<details"));
  assert.ok(!noErrors.includes('data-all="1"'));
});

test("chapter links appear only with a video, one per element that has a position", () => {
  const plain = goodJa;
  assert.ok(!plain.includes("<video"));
  assert.equal(count(plain, /🎬/g), 0);
  const html = render({ ...good, video: "demo.webm" });
  assert.ok(html.includes('<video id="video" controls src="demo.webm">'));
  // features 1 and 2 at (body + summary), feature 1 error_at, steps 1-3 at
  assert.equal(count(html, /data-at="/g), 2 * 2 + 1 + 3);
  assert.ok(html.includes('data-at="42">🎬 0:42</a>'));
  const late = render({ ...good, video: "demo.webm", features: [{ name: "Sign up", at: 125 }, good.features[1]] });
  assert.ok(late.includes("🎬 2:05"));
  const noAt = render({ ...good, video: "demo.webm", features: good.features.map(({ name }) => ({ name })), steps: good.steps.map(({ at, ...s }) => s) });
  assert.equal(count(noAt, /data-at="/g), 0);
});

test("labels follow --lang", () => {
  assert.ok(goodJa.includes("期待する結果"));
  const en = render(good, ["--lang", "en"]);
  assert.ok(en.includes("Expected"));
  assert.ok(en.includes("Result"));
  assert.ok(en.includes('lang="en"'));
  assert.ok(en.includes("1 failed"));
  assert.ok(en.includes("Error cases 1 — confirmed 0 / not confirmed 1"));
  assert.ok(en.includes("Open all"));
  assert.ok(en.includes("<td>none</td>"));
});

test("invalid input exits 3 with one violation per line and writes nothing", () => {
  const empty = renderFails({ ...good, steps: [] });
  assert.equal(empty.status, 3);
  assert.ok(empty.stderr.includes("steps must be a non-empty array"));
  const bad = renderFails({ ...good, steps: [{ n: 1, feature: 1, kind: "normal", action: "a", expected: "", result: "r", status: "bad", screenshot: "x.png" }] });
  assert.equal(bad.status, 3);
  assert.ok(bad.stderr.includes("steps[0].expected must be a non-empty string"));
  assert.ok(bad.stderr.includes('steps[0].status must be "ok" or "failed"'));
});

test("feature, kind, result and positions are checked", () => {
  const bad = renderFails({ ...good, steps: [{ ...good.steps[0], feature: 3, kind: "edge", result: "", at: -1 }] });
  assert.equal(bad.status, 3);
  assert.ok(bad.stderr.includes("steps[0].feature must be an integer from 1 to 2"));
  assert.ok(bad.stderr.includes('steps[0].kind must be "normal" or "error"'));
  assert.ok(bad.stderr.includes("steps[0].result must be a non-empty string"));
  assert.ok(bad.stderr.includes("steps[0].at must be a non-negative integer when present"));
  const noFeatures = renderFails({ ...good, features: [] });
  assert.ok(noFeatures.stderr.includes("features must be a non-empty array"));
  const badFeature = renderFails({ ...good, features: [{ name: "", error_at: 1.5 }, good.features[1]] });
  assert.ok(badFeature.stderr.includes("features[0].name must be a non-empty string"));
  assert.ok(badFeature.stderr.includes("features[0].error_at must be a non-negative integer when present"));
  const empty = renderFails({ ...good, features: [...good.features, { name: "Unused" }] });
  assert.ok(empty.stderr.includes("features[2] has no step"));
  const errorOnly = render({ ...good, steps: [{ ...good.steps[1] }, { ...good.steps[2] }] });
  assert.ok(!errorOnly.slice(errorOnly.indexOf('id="feature-1"'), errorOnly.indexOf('id="feature-2"')).includes("<h3>"));
  assert.ok(render({ ...good, features: [{ ...good.features[0], at: null }, good.features[1]], steps: [{ ...good.steps[0], at: null }, ...good.steps.slice(1)] }).includes("<section"));
});

test("unreadable JSON and non-string optional fields exit 3", () => {
  const dir = mkdtempSync(join(tmpdir(), "demo-"));
  try {
    writeFileSync(join(dir, "s.json"), "{not json");
    try { execFileSync("node", [script, "--steps", join(dir, "s.json"), "--out", join(dir, "p.html")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); throw new Error("expected a failure"); }
    catch (err) { assert.equal(err.status, 3); assert.ok(String(err.stderr).includes("steps.json cannot be read")); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const bad = renderFails({ ...good, video: 1, steps: [{ ...good.steps[0], note: {} }] });
  assert.equal(bad.status, 3);
  assert.ok(bad.stderr.includes("video must be a string when present"));
  assert.ok(bad.stderr.includes("steps[0].note must be a string when present"));
});

test("missing arguments exit 1", () => {
  try { execFileSync("node", [script], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); throw new Error("expected a failure"); }
  catch (err) { assert.equal(err.status, 1); }
});
