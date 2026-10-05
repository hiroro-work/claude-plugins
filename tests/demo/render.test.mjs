// render.mjs: validation, escaping, --lang labels, optional video.

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
  steps: [
    { n: 1, path: "/signup", action: "Open the sign-up form <b>now</b>", expected: "The form shows", status: "ok", screenshot: "step-01.png" },
    { n: 2, path: "/signup", action: "Submit it", expected: "A welcome page shows", data: "seeded user", script: "INSERT INTO users VALUES (1)", status: "failed", note: "stayed on the form", screenshot: "step-02.png" },
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

test("one section per step, escaped, with the screenshot and the badge", () => {
  const html = render(good);
  assert.equal((html.match(/<section class="step"/g) ?? []).length, 2);
  assert.ok(html.includes("Open the sign-up form &lt;b&gt;now&lt;/b&gt;"));
  assert.ok(!html.includes("<b>now</b>"));
  assert.ok(html.includes('<img src="step-02.png"'));
  assert.ok(html.includes('class="badge ng"'));
  assert.ok(html.includes("stayed on the form"));
  assert.ok(html.includes("INSERT INTO users"));
  assert.ok(html.includes("<title>Sign-up flow</title>"));
});

test("labels follow --lang", () => {
  assert.ok(render(good).includes("期待する結果"));
  const en = render(good, ["--lang", "en"]);
  assert.ok(en.includes("Expected"));
  assert.ok(en.includes('lang="en"'));
  assert.ok(en.includes("1 failed"));
});

test("the video block appears only when video is set", () => {
  assert.ok(!render(good).includes("<video"));
  assert.ok(render({ ...good, video: "demo.webm" }).includes('<video controls src="demo.webm">'));
});

test("invalid input exits 3 with one violation per line and writes nothing", () => {
  const empty = renderFails({ ...good, steps: [] });
  assert.equal(empty.status, 3);
  assert.ok(empty.stderr.includes("steps must be a non-empty array"));
  const bad = renderFails({ ...good, steps: [{ n: 1, action: "a", expected: "", status: "bad", screenshot: "x.png" }] });
  assert.equal(bad.status, 3);
  assert.ok(bad.stderr.includes("steps[0].expected must be a non-empty string"));
  assert.ok(bad.stderr.includes('steps[0].status must be "ok" or "failed"'));
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
