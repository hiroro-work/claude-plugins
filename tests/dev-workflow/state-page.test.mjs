// scripts/state/page.mjs: the state artifact's page keeps the state text recoverable from
// <pre id="dev-workflow-state"> and shows a readable table above it.

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
    branch: null
  - id: 2
    title: "pkg/web: lib-b 3 → 4"
    description: "Bump lib-b"
    verification_hint: "Build passes"
    depends_on: []
    status: pending
    pr: null
    branch: null
---

Parent task in a sentence.
`;

const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const preOf = (page) => /<pre id="dev-workflow-state">\n([\s\S]*?)\n<\/pre>/.exec(page)[1];

test("the pre holds the state text, recoverable by decoding three entities", () => {
  const page = buildPage(STATE);
  assert.equal(decode(preOf(page)), STATE.replace(/\n+$/, ""));
  assert.ok(!/<all>|<lib-a>/.test(page), "raw angle brackets from the state must not reach the page");
});

test("the title carries the slug", () => {
  assert.match(buildPage(STATE), /^<title>dev-workflow\.sample-upgrades<\/title>/);
});

test("the table lists each subtask with its status and PR link", () => {
  const page = buildPage(STATE);
  assert.match(page, /<h1>Upgrade &lt;all&gt; &amp; verify<\/h1>/);
  assert.match(page, /<td>1<\/td><td>\[security\] lib-a 1\.0\.0 → 2\.0\.0<\/td><td class="s completed">completed<\/td>/);
  assert.match(page, /<a href="https:\/\/example\.com\/pr\/1\?a=1&amp;b=2">/);
  assert.match(page, /<td>2<\/td><td>pkg\/web: lib-b 3 → 4<\/td><td class="s pending">pending<\/td><td><\/td>/);
  assert.match(page, /<details><summary>/);
});

test("a state with no readable subtasks shows the state text alone, opened", () => {
  const page = buildPage(`---\nslug: "bare"\n---\n\nbody\n`);
  assert.ok(!page.includes("<table>"));
  assert.match(page, /<details open>/);
});

test("inline comments, a zero-indent list and CRLF still give the table", () => {
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
  assert.match(buildPage(state), /<td>1<\/td><td>t<\/td><td class="s pending">pending<\/td><td><\/td>/);
});

test("a closing pre tag inside the state stays text", () => {
  const page = buildPage(`---\nslug: "s"\n---\n\n</pre><b>x</b>\n`);
  assert.equal(page.split("</pre>").length, 2);
  assert.equal(decode(preOf(page)), `---\nslug: "s"\n---\n\n</pre><b>x</b>`);
});

test("a state without a slug line fails", () => {
  assert.throws(() => buildPage("no frontmatter here\n"), /no slug/);
});

test("the CLI writes the page, also through a symlinked path, and exits non-zero on a bad state", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "state-page-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const statePath = join(dir, "state.md");
  const outPath = join(dir, "page.html");
  writeFileSync(statePath, STATE);
  const ok = spawnSync(process.execPath, [script, "--state", statePath, "--out", outPath], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(readFileSync(outPath, "utf8"), buildPage(STATE));

  const link = join(dir, "link");
  symlinkSync(dirname(script), link, "junction");
  const linkedOut = join(dir, "linked.html");
  const linked = spawnSync(process.execPath, [join(link, "page.mjs"), "--state", statePath, "--out", linkedOut], { encoding: "utf8" });
  assert.equal(linked.status, 0, linked.stderr);
  assert.equal(readFileSync(linkedOut, "utf8"), buildPage(STATE));

  writeFileSync(statePath, "nothing\n");
  const bad = spawnSync(process.execPath, [script, "--state", statePath, "--out", outPath], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /no slug/);

  const noArgs = spawnSync(process.execPath, [script, "--state", statePath], { encoding: "utf8" });
  assert.equal(noArgs.status, 1);
  assert.match(noArgs.stderr, /usage/);
});
