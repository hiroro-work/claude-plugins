// render.mjs: validation, escaping, --lang labels, the contents list, test-case sections and their videos.

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
    { letter: "A", name: "Sign up", description: "A visitor creates an account." },
    { letter: "B", name: "Edit the profile" },
  ],
  cases: [
    { id: "A-1", feature: 1, kind: "normal", title: "A visitor signs up", precondition: "Signed out", video: "A-1.webm" },
    { id: "A-2", feature: 1, kind: "error", title: "An empty email is rejected", precondition: "Signed out" },
    { id: "B-1", feature: 2, kind: "normal", title: "The name can be changed", precondition: "Signed in as hanako" },
    { id: "A-3", feature: 1, kind: "error", title: "A taken email is rejected" },
  ],
  steps: [
    { n: 1, case: "A-1", path: "/signup", action: "Open the sign-up form <b>now</b>", expected: "The form shows", result: "The form showed", status: "ok", screenshot: "step-01.png" },
    { n: 2, case: "A-1", path: "/signup", action: "Submit it", expected: "A welcome page shows", result: "The welcome page showed", status: "ok", screenshot: "step-02.png" },
    { n: 3, case: "B-1", path: "/profile", action: "Change the name", expected: "The new name shows", result: "The new name showed", status: "ok", screenshot: "step-03.png" },
    { n: 4, case: "A-2", path: "/signup", action: "Submit it empty", expected: "Email can't be blank", result: "Email can't be blank showed", status: "ok", screenshot: "step-04.png" },
    { n: 5, case: "A-3", path: "/signup", action: "Submit a taken email", expected: "Email has already been taken", result: "stayed on the form", data: "seeded user", script: "INSERT INTO users VALUES (1)", status: "failed", note: "no message", screenshot: "step-05.png" },
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
function between(html, from, to) {
  const start = html.indexOf(from), end = html.indexOf(to, start);
  if (start < 0 || end < 0) throw new Error(`markers not found: ${from} … ${to}`);
  return html.slice(start, end);
}

test("the contents list has one row per test case with its id and status", () => {
  const toc = between(goodJa, '<nav class="toc">', "</nav>");
  assert.equal(count(toc, /<li>/g), 4);
  assert.ok(toc.includes('<a href="#case-A-1"><span class="case-id">A-1</span><span class="kind">正常系</span><span>A visitor signs up</span><span class="badge ok">確認済み</span></a>'));
  assert.ok(toc.includes('<a href="#case-A-2"><span class="case-id">A-2</span><span class="kind">異常系</span><span>An empty email is rejected</span>'));
  assert.ok(toc.includes('<a href="#case-A-3"><span class="case-id">A-3</span><span class="kind">異常系</span><span>A taken email is rejected</span><span class="badge ng">'));
  assert.ok(toc.includes('<a href="#case-B-1">'));
  assert.ok(toc.includes('<h3><a href="#feature-B"><span class="letter">B.</span> <span>Edit the profile</span></a></h3>'));
  assert.ok(goodJa.includes('<section class="feature" id="feature-B">'));
});

test("only the first feature's first normal case starts open", () => {
  assert.equal(count(goodJa, /<details class="case"/g), 4);
  assert.equal(count(goodJa, /<details class="case" id="case-[^"]+" open>/g), 1);
  assert.ok(goodJa.includes('<details class="case" id="case-A-1" open>'));
  assert.ok(goodJa.includes('<details class="case" id="case-A-3">'));
  const noNormal = render({ ...good, cases: good.cases.map((c, i) => (i === 0 ? { ...c, kind: "error" } : c)) });
  assert.equal(count(noNormal, / open>/g), 0);
});

test("each case lists its steps in order, numbered within the case", () => {
  const a1 = between(goodJa, 'id="case-A-1"', 'id="case-A-2"');
  assert.equal(count(a1, /<li class="step"/g), 2);
  assert.ok(a1.indexOf('id="step-1"') < a1.indexOf('id="step-2"'));
  assert.ok(a1.includes('<span class="n">2</span><span>Submit it</span>'));
  assert.ok(a1.includes("前提: Signed out"));
  const a3 = between(goodJa, 'id="case-A-3"', 'id="case-B-1"');
  assert.ok(a3.includes('<span class="n">1</span><span>Submit a taken email</span>'));
  assert.ok(a3.includes("no message"));
  assert.ok(a3.includes("INSERT INTO users"));
});

test("a case's video appears only when the case has one", () => {
  assert.equal(count(goodJa, /<video /g), 1);
  assert.ok(between(goodJa, 'id="case-A-1"', 'id="case-A-2"').includes('<video controls preload="metadata" src="A-1.webm">'));
});

test("escaping, title and the meta line", () => {
  assert.ok(goodJa.includes("Open the sign-up form &lt;b&gt;now&lt;/b&gt;"));
  assert.ok(!goodJa.includes("<b>now</b>"));
  assert.ok(goodJa.includes("<title>Sign-up flow</title>"));
  assert.ok(goodJa.includes("<span>4 テスト項目</span><span>未確認 1</span>"));
});

test("labels follow --lang", () => {
  const en = render(good, ["--lang", "en"]);
  assert.ok(en.includes('lang="en"'));
  assert.ok(en.includes("4 test cases"));
  assert.ok(en.includes("1 not confirmed"));
  assert.ok(en.includes("Contents"));
  assert.ok(en.includes("Precondition: Signed out"));
  assert.ok(en.includes("Error case"));
});

test("invalid input exits 3 with one violation per line and writes nothing", () => {
  const empty = renderFails({ ...good, steps: [] });
  assert.equal(empty.status, 3);
  assert.ok(empty.stderr.includes("steps must be a non-empty array"));
  const bad = renderFails({ ...good, steps: [{ ...good.steps[0], case: "Z-9", expected: "", status: "bad" }, ...good.steps.slice(1)] });
  assert.equal(bad.status, 3);
  assert.ok(bad.stderr.includes("steps[0].case must be the id of a case"));
  assert.ok(bad.stderr.includes("steps[0].expected must be a non-empty string"));
  assert.ok(bad.stderr.includes('steps[0].status must be "ok" or "failed"'));
});

test("cases, features and their links are checked", () => {
  const badCase = renderFails({ ...good, cases: [{ id: "", feature: 3, kind: "edge", title: "", video: 1 }, ...good.cases.slice(1)] });
  assert.ok(badCase.stderr.includes("cases[0].id must be a non-empty string"));
  assert.ok(badCase.stderr.includes("cases[0].feature must be an integer from 1 to 2"));
  assert.ok(badCase.stderr.includes('cases[0].kind must be "normal" or "error"'));
  assert.ok(badCase.stderr.includes("cases[0].title must be a non-empty string"));
  assert.ok(badCase.stderr.includes("cases[0].video must be a string when present"));
  assert.ok(renderFails({ ...good, features: [] }).stderr.includes("features must be a non-empty array"));
  assert.ok(renderFails({ ...good, cases: [] }).stderr.includes("cases must be a non-empty array"));
  assert.ok(renderFails({ ...good, features: [...good.features, { letter: "C", name: "Unused" }] }).stderr.includes("features[2] has no case"));
  const badLetter = renderFails({ ...good, features: [{ ...good.features[0], letter: "" }, good.features[1]], cases: [good.cases[0], good.cases[1], { ...good.cases[2], id: "A-9" }, good.cases[3]] });
  assert.ok(badLetter.stderr.includes("features[0].letter must be a non-empty string"));
  assert.ok(badLetter.stderr.includes('cases[2].id must start with "B-"'));
  assert.ok(renderFails({ ...good, cases: [...good.cases, { id: "B-2", feature: 2, kind: "error", title: "Empty" }] }).stderr.includes("cases[4] has no step"));
  assert.ok(renderFails({ ...good, cases: [...good.cases, { id: "A-1", feature: 1, kind: "error", title: "Twice" }] }).stderr.includes('cases[4].id "A-1" is used twice'));
  assert.ok(renderFails({ ...good, steps: good.steps.map((s) => ({ ...s, result: s.n === 1 ? "" : s.result })) }).stderr.includes("steps[0].result must be a non-empty string"));
});

test("unreadable JSON and non-string optional fields exit 3", () => {
  const dir = mkdtempSync(join(tmpdir(), "demo-"));
  try {
    writeFileSync(join(dir, "s.json"), "{not json");
    try { execFileSync("node", [script, "--steps", join(dir, "s.json"), "--out", join(dir, "p.html")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); throw new Error("expected a failure"); }
    catch (err) { assert.equal(err.status, 3); assert.ok(String(err.stderr).includes("steps.json cannot be read")); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const bad = renderFails({ ...good, url: 1, target: 1, steps: [{ ...good.steps[0], note: {} }, ...good.steps.slice(1)] });
  assert.equal(bad.status, 3);
  assert.ok(bad.stderr.includes("url must be a string when present"));
  assert.ok(bad.stderr.includes("target must be a string when present"));
  assert.ok(bad.stderr.includes("steps[0].note must be a string when present"));
});

test("ios and android lay out each step's text beside its screenshot", () => {
  for (const target of ["ios", "android"]) {
    const html = render({ ...good, target });
    const step = between(html, 'id="step-1"', "</li>");
    assert.ok(step.startsWith('id="step-1">\n<div class="step-text">\n<h4>'));
    assert.ok(step.indexOf("</div>\n<figure>") > step.indexOf('<div class="row">'));
    assert.equal(count(html, /max-height: 70vh/g), 2);
    assert.ok(html.includes("@media (min-width: 601px) { li.step { display: grid;"));
  }
});

test("web, cdp and no target render the same page, without the portrait layout", () => {
  assert.ok(!goodJa.includes("step-text"));
  assert.ok(!goodJa.includes("70vh"));
  assert.equal(render({ ...good, target: "web" }), goodJa);
  assert.equal(render({ ...good, target: "cdp" }), goodJa);
});

test("missing arguments exit 1", () => {
  try { execFileSync("node", [script], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); throw new Error("expected a failure"); }
  catch (err) { assert.equal(err.status, 1); }
});
