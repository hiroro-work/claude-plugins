// scripts/state/page.mjs: the state artifact's page keeps the state text recoverable from
// <pre id="dev-workflow-state"> and shows each subtask in readable form above it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPage } from "../../skills/dev-workflow/scripts/state/page.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "dev-workflow", "scripts", "state", "page.mjs");
const NOW = new Date("2026-01-02T03:04:05Z");

const STATE = `---
parent_task: "Upgrade <all> & verify"
slug: "sample-upgrades"
created_at: "2026-01-01T00:00:00Z"
subtasks:
  - id: 1
    title: "[security] lib-a 1.0.0 → 2.0.0"
    description: "Bump <lib-a> & run tests"
    verification_hint: "Tests pass"
    depends_on: []
    status: completed
    pr: "https://example.com/pr/1?a=1&b=2"
    branch: "sample-upgrades-1-lib-a"
  - id: 2
    title: "pkg/web: lib-b 3 → 4"
    description: "Bump lib-b"
    verification_hint: "Build passes"
    depends_on: [1]
    status: in_progress
    pr: null
    branch: null
  - id: 3
    title: "Remove the shim"
    description: ""
    verification_hint: ""
    depends_on: [1, 2]
    status: pending
    pr: null
    branch: null
---

Parent task in a sentence.
`;

const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const preOf = (page) => /<pre id="dev-workflow-state">\n([\s\S]*?)\n<\/pre>/.exec(page)[1];
const itemOf = (page, id) => new RegExp(`<li class="[a-z_]*">\\n<div class="h"><span class="n">#${id}</span>[\\s\\S]*?</li>`).exec(page)[0];

test("the pre holds the state text, recoverable by decoding three entities", () => {
  const page = buildPage(STATE, NOW);
  assert.equal(decode(preOf(page)), STATE.replace(/\n+$/, ""));
  assert.ok(!/<all>|<lib-a>/.test(page), "raw angle brackets from the state must not reach the page");
});

test("the title carries the slug and the heading the parent task", () => {
  const page = buildPage(STATE, NOW);
  assert.match(page, /^<title>dev-workflow\.sample-upgrades<\/title>/);
  assert.match(page, /<h1>Upgrade &lt;all&gt; &amp; verify<\/h1>/);
});

test("the summary counts the subtasks and carries the build time", () => {
  const page = buildPage(STATE, NOW);
  assert.match(page, /1 of 3 completed · 1 in progress · updated 2026-01-02 03:04 UTC/);
  assert.match(page, /<i style="width:33%"><\/i>/);
  assert.match(page, /<details><summary>/);
});

test("each subtask shows what it does, how it is verified, and where it stands", () => {
  const page = buildPage(STATE, NOW);
  const one = itemOf(page, 1);
  assert.match(one, /^<li class="completed">/);
  assert.ok(one.includes("[security] lib-a 1.0.0 → 2.0.0"));
  assert.ok(one.includes('<span class="b">completed</span>'));
  assert.ok(one.includes("<p>Bump &lt;lib-a&gt; &amp; run tests</p>"));
  assert.ok(one.includes("<b>Done when</b> Tests pass"));
  assert.ok(one.includes("<code>sample-upgrades-1-lib-a</code>"));
  assert.ok(one.includes('<a href="https://example.com/pr/1?a=1&amp;b=2">'));
  assert.ok(!one.includes("Depends on"));

  const two = itemOf(page, 2);
  assert.match(two, /^<li class="in_progress">/);
  assert.ok(two.includes("<span>Depends on #1</span>"));
  assert.ok(!two.includes("<code>") && !two.includes("<a "));
});

test("empty fields leave no element behind", () => {
  const three = itemOf(buildPage(STATE, NOW), 3);
  assert.ok(three.includes("<span>Depends on #1, #2</span>"));
  assert.ok(!three.includes("<p>") && !three.includes("Done when"));
});

test("an unknown status and a hostile value change only what is shown", () => {
  const state = `---
slug: "s"
subtasks:
  - id: 1
    title: "<script>x</script>"
    status: m
    pr: "https://example.com/\\" onmouseover=\\"x"
    branch: "<b>"
---
`;
  const one = itemOf(buildPage(state, NOW), 1);
  assert.match(one, /^<li class="">/);
  assert.ok(one.includes('<span class="b">m</span>'));
  assert.ok(one.includes("&lt;script&gt;x&lt;/script&gt;") && one.includes("<code>&lt;b&gt;</code>"));
  assert.ok(one.includes('href="https://example.com/&quot; onmouseover=&quot;x"'));
});

test("a line inside a multi-line value is not taken for a field", () => {
  const state = `---
slug: "s"
subtasks:
  - id: 1
    title: "t"
    description: |
      status: completed
      pr: https://example.com/x
    status: pending
    pr: null
---
`;
  const one = itemOf(buildPage(state, NOW), 1);
  assert.match(one, /^<li class="pending">/);
  assert.ok(!one.includes("<p>") && !one.includes("<a "));
});

test("inline comments, a zero-indent list and CRLF still give the list", () => {
  const state = [
    "---",
    'slug: "s"',
    "subtasks:",
    "- id: 1",
    '  title: "t" # note',
    "  status: pending        # pending | in_progress | completed",
    "  pr: null               # URL string once known",
    "---",
    "",
  ].join("\r\n");
  const one = itemOf(buildPage(state, NOW), 1);
  assert.match(one, /^<li class="pending">/);
  assert.ok(one.includes('<span class="t">t</span><span class="b">pending</span>'));
  assert.ok(!one.includes('class="m"'));
});

test("a closing pre tag inside the state stays text", () => {
  const page = buildPage(`---\nslug: "s"\n---\n\n</pre><b>x</b>\n`, NOW);
  assert.equal(page.split("</pre>").length, 2);
  assert.equal(decode(preOf(page)), `---\nslug: "s"\n---\n\n</pre><b>x</b>`);
});

test("a state with no readable subtasks shows the state text alone, opened", () => {
  const page = buildPage(`---\nslug: "bare"\n---\n\nbody\n`, NOW);
  assert.ok(!page.includes("<ol>"));
  assert.match(page, /<details open>/);
});

test("the page around the state stays small", () => {
  const state = `---\nslug: "s"\nsubtasks:\n  - id: 1\n    title: "t"\n    status: pending\n---\n`;
  const chars = buildPage(state, NOW).length - state.length;
  assert.ok(chars <= 3500, `the page adds ${chars} chars around a one-subtask state; every read of the artifact carries them`);
});

test("a state without a slug line fails", () => {
  assert.throws(() => buildPage("no frontmatter here\n", NOW), /no slug/);
});

test("the CLI writes the page, also through a symlinked path, and exits non-zero on a bad state", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "state-page-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const statePath = join(dir, "state.md");
  const outPath = join(dir, "page.html");
  const sansTime = (page) => page.replace(/updated [0-9: -]+ UTC/, "updated");
  writeFileSync(statePath, STATE);
  const ok = spawnSync(process.execPath, [script, "--state", statePath, "--out", outPath], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(sansTime(readFileSync(outPath, "utf8")), sansTime(buildPage(STATE, NOW)));

  const link = join(dir, "link");
  symlinkSync(dirname(script), link, "junction");
  const linkedOut = join(dir, "linked.html");
  const linked = spawnSync(process.execPath, [join(link, "page.mjs"), "--state", statePath, "--out", linkedOut], { encoding: "utf8" });
  assert.equal(linked.status, 0, linked.stderr);
  assert.equal(sansTime(readFileSync(linkedOut, "utf8")), sansTime(buildPage(STATE, NOW)));

  writeFileSync(statePath, "nothing\n");
  const bad = spawnSync(process.execPath, [script, "--state", statePath, "--out", outPath], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /no slug/);

  const noArgs = spawnSync(process.execPath, [script, "--state", statePath], { encoding: "utf8" });
  assert.equal(noArgs.status, 1);
  assert.match(noArgs.stderr, /usage/);
});
