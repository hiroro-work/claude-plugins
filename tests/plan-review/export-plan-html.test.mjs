// Static checks on export-plan-html.mjs' output: every constraint here fails silently in the artifact
// host (its CSP drops a blocked resource with no error, and forbidden skeleton tags are stripped).

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const exporter = join(repoRoot, "skills", "dev-workflow", "scripts", "plan-review", "export-plan-html.mjs");

// A plan that mentions the very tokens the assertions look for, so a grep over the whole file would
// match the plan's prose instead of the page.
const PLAN = `# Plan

Some preamble.

### Overview

- **Goal**: 書き出した HTML がアーティファクトの制約を満たすこと
- **Difficulty**: Simple
- **Scope**: 1 file
- **Approach**: 骨組みなしの断片として書き出す

### Decisions

- **Question**: 骨組み（\`<!doctype>\` / \`<html>\` / \`<head>\` / \`<body>\`）を持たない断片にするか
- **Recommendation**: 断片にする。\`fetch(\` も \`esm.sh\` も出力に含めない
- **Alternative**: 完全な文書にする

### Build order

1. **書き出す** — 断片を書く
2. **確かめる** — 制約を検査する

### Test plan

\`\`\`js
const n = 1; // a fenced block, so the syntax colours are exercised
\`\`\`

### Risks / Unknowns

- 制約違反はブラウザ上で無言に失敗する
`;

// One subprocess per distinct argument set; the default output is shared.
const cache = new Map();
function exportPlan(args = [], dialogue = null) {
  const key = JSON.stringify([args, dialogue]);
  if (!cache.has(key)) {
    const dir = mkdtempSync(join(tmpdir(), "plan-export-"));
    const planPath = join(dir, "sample-plan.plan-review.md");
    const outPath = join(dir, "out.html");
    writeFileSync(planPath, PLAN);
    if (dialogue !== null) {
      const dialoguePath = join(dir, "sample-plan.dialogue.md");
      writeFileSync(dialoguePath, dialogue);
      args = [...args, "--dialogue", dialoguePath];
    }
    execFileSync(process.execPath, [exporter, "--plan", planPath, "--out", outPath, ...args], { stdio: "pipe" });
    cache.set(key, readFileSync(outPath, "utf8"));
    rmSync(dir, { recursive: true, force: true });
  }
  return cache.get(key);
}

// Strip the embedded plan before asserting on the page.
const PLAN_SOURCE_RE = /<script type="application\/json" id="plan-source">([\s\S]*?)<\/script>/;
const shells = new Map();
const pageShell = (html) => {
  if (!shells.has(html)) shells.set(html, html.replace(PLAN_SOURCE_RE, ""));
  return shells.get(html);
};
const embedded = (html) => JSON.parse(PLAN_SOURCE_RE.exec(html)[1]).markdown;

const SKELETON_TAG_RE = /<\/?(?:!doctype|html|head|body)[\s>]/i;

test("the default output is a fragment, with no skeleton tag of its own", () => {
  const shell = pageShell(exportPlan());
  assert.equal(SKELETON_TAG_RE.test(shell), false, "fragment carries a skeleton tag");
});

test("the title sits within the first 8KB, which is all the host scans", () => {
  const html = exportPlan();
  const at = html.indexOf("<title>");
  assert.ok(at >= 0 && at < 8192, `<title> at ${at}`);
});

test("the title names the plan rather than summarising it", () => {
  assert.match(exportPlan(), /<title>sample-plan<\/title>/);
  assert.match(exportPlan(["--title", "Export Constraints"]), /<title>Export Constraints<\/title>/);
});

test("the only external stylesheet is the font host the CSP admits", () => {
  const shell = pageShell(exportPlan());
  const hosts = [...shell.matchAll(/rel="stylesheet"[^>]*href="https:\/\/([^/"]+)/g)].map((m) => m[1]);
  assert.deepEqual(hosts, ["fonts.googleapis.com"]);
});

test("scripts come only from the CDN the CSP admits, each pinned and integrity-checked", () => {
  const shell = pageShell(exportPlan());
  const srcs = [...shell.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map((m) => m[0]);
  assert.ok(srcs.length > 0, "no external script at all");
  for (const tag of srcs) {
    assert.match(tag, /src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/[^"]*\/\d+\.\d+\.\d+\//, `unpinned or off-CDN: ${tag}`);
    assert.match(tag, /integrity="sha\d+-/, `no integrity: ${tag}`);
  }
});

test("the page issues no request of its own and loads no blocked module host", () => {
  const shell = pageShell(exportPlan());
  assert.equal(shell.includes("fetch("), false, "the page fetches something");
  assert.equal(shell.includes("esm.sh"), false, "the page loads a module from a blocked host");
  assert.equal(/^\s*import\s/m.test(shell), false, "an inlined module kept a bare import");
});

test("the plan text travels inside the page", () => {
  const html = exportPlan();
  assert.ok(html.includes("書き出した HTML がアーティファクトの制約を満たすこと"), "plan text absent");
  assert.ok(html.includes('id="plan-source"'), "no embedded plan block");
});

test("both theme states are styled, neither only behind a media query", () => {
  const shell = pageShell(exportPlan());
  assert.ok(shell.includes("prefers-color-scheme: dark"), "no OS-preference dark block");
  assert.ok(shell.includes('[data-theme="dark"]'), "no explicit dark-stamp block");
  assert.ok(shell.includes('[data-theme="light"]'), "the OS-preference block is not guarded against an explicit light choice");
});

// Both literals asserted whole: a wildcard hash would stay green through a bump that forgot the hash,
// and a refused script is silent.
const MERMAID_SRC = "https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.15.0/mermaid.min.js";
const MERMAID_SRI = "sha512-HH52omhHpZF6RfVnGiQwYgYm4H/ya2xsZYLl5xJ4+tLfX+rN4+8zF7V/H/KLeicPrKZYi1g6iBmVkk2AhXTGlg==";

test("the page draws its own diagrams, from a pinned cdnjs mermaid", () => {
  const shell = pageShell(exportPlan());
  assert.ok(shell.includes("renderDiagrams:"), "no diagram hook, so the host renders the fence");
  assert.ok(shell.includes(MERMAID_SRC), "the pinned cdnjs mermaid is not loaded");
  assert.ok(shell.includes(MERMAID_SRI), "the pinned mermaid SRI is absent");
});

// plan-render.mjs is inlined whole, so a bare grep would match its own comments; assert on the bootstrap's createRenderer line.
const rendererCall = (source) => source.match(/const renderer = createRenderer\(\{[\s\S]*?\n\s*\}\);/)[0];
const bootstrapCall = (html) => rendererCall(pageShell(html));

// Comments and nested groups come out first, so only the top level's own keys are left.
const optionKeys = (source) => {
  let body = rendererCall(source)
    .replace(/^[\s\S]*?createRenderer\(\{/, "").replace(/\}\);$/, "").replace(/\/\/[^\n]*/g, "");
  for (let prev; body !== prev; ) { prev = body; body = body.replace(/\{[^{}]*\}/g, ""); }
  return body.split(",").map((s) => s.split(":")[0].trim()).filter(Boolean).sort();
};

test("no open/close override, so the reference sections arrive closed", () => {
  assert.deepEqual(optionKeys(pageShell(exportPlan())), ["atAGlance", "hooks", "labels"]);
});

test("the at-a-glance digest is on, so the page opens on the Decisions", () => {
  assert.ok(bootstrapCall(exportPlan()).includes("atAGlance: true"));
});

test("the digest's slot travels with the page", () => {
  assert.match(pageShell(exportPlan()), /id="at-a-glance"/);
});

test("--standalone adds the skeleton, with the page content in the body", () => {
  const html = exportPlan(["--standalone"]);
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<html lang="en">/);
  const body = html.slice(html.indexOf("<body>"));
  assert.match(body, /<div id="app"[^>]*><\/div>/, "the app root is not in the body");
  const head = html.slice(0, html.indexOf("</head>"));
  assert.ok(head.includes("<title>"), "the title is not in the head");
});

// LABELS is inlined whole, so both strings appear in every export; assert on the bootstrap line.
test("--lang picks the language of the page's own generated text", () => {
  assert.match(pageShell(exportPlan(["--lang", "ja"])), /labels: LABELS\["ja"\]/);
  assert.match(pageShell(exportPlan(["--lang", "en"])), /labels: LABELS\["en"\]/);
});

test("--lang reaches the app root, which is where the stylesheet reads it", () => {
  assert.match(exportPlan(["--lang", "ja"]), /<div id="app" lang="ja"><\/div>/);
  assert.match(exportPlan(["--lang", "en"]), /<div id="app" lang="en"><\/div>/);
});

test("the gate takes no surface flag, so its DOM is unchanged", () => {
  const indexHtml = readFileSync(
    join(repoRoot, "skills", "dev-workflow", "scripts", "plan-review", "public", "index.html"), "utf8");
  assert.deepEqual(optionKeys(indexHtml), ["diff", "hooks", "labels"]);
});

// The gate is served from localhost under no CSP, so this set is a convention, not an enforced limit.
test("the gate page's external references stay within the hosts it is allowed", () => {
  const indexHtml = readFileSync(
    join(repoRoot, "skills", "dev-workflow", "scripts", "plan-review", "public", "index.html"), "utf8");
  const allowed = new Set(["cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"]);
  const hosts = [...indexHtml.matchAll(/(?:src|href)="https:\/\/([^/"]+)/g)].map((m) => m[1]);
  const unexpected = [...new Set(hosts)].filter((h) => !allowed.has(h));
  assert.deepEqual(unexpected, [], `unexpected external host(s): ${unexpected.join(", ")}`);
});

// index.html's <script>/<link> tags are static markup the exporter cannot read, so both carry the same
// pinned URLs by hand. Mermaid is loaded at runtime from plan-render.mjs and is outside this pair.
test("the gate page and the export pin the same CDN and font resources", () => {
  const indexHtml = readFileSync(
    join(repoRoot, "skills", "dev-workflow", "scripts", "plan-review", "public", "index.html"), "utf8");
  const exporterSrc = readFileSync(exporter, "utf8");
  const resources = (src) => [...src.matchAll(/https:\/\/(?:cdnjs\.cloudflare\.com|fonts\.googleapis\.com)\/[^"\s]+/g)]
    .map((m) => m[0]).sort();
  const hashes = (src) => [...src.matchAll(/sha512-[A-Za-z0-9+/=]+/g)].map((m) => m[0]).sort();
  assert.deepEqual(resources(exporterSrc), resources(indexHtml), "pinned resource URLs differ");
  assert.deepEqual(hashes(exporterSrc), hashes(indexHtml), "integrity hashes differ");
});

test("the plan's YAML frontmatter is not embedded in the exported page", () => {
  const dir = mkdtempSync(join(tmpdir(), "plan-export-fm-"));
  const planPath = join(dir, "sample-plan.plan-review.md");
  const outPath = join(dir, "out.html");
  writeFileSync(planPath, `---\nartifact_url: https://claude.ai/code/artifact/abc\n---\n${PLAN}`);
  execFileSync(process.execPath, [exporter, "--plan", planPath, "--out", outPath], { stdio: "pipe" });
  const html = readFileSync(outPath, "utf8");
  assert.ok(!html.includes("artifact_url"), "the frontmatter reached the exported page");
  assert.match(html, /### Overview/, "the plan body did not survive the strip");
  rmSync(dir, { recursive: true, force: true });
});

// The history lives in the embedded Markdown, so assert on the JSON block.
const DIALOGUE = `- **折りたたみの既定**: 履歴が長いと読みにくいので、既定は閉じておく。

## この見出しは節を割ってしまう

\`\`\`bash
# このコメントは見出しではない
echo hi
\`\`\`
`;

test("--dialogue appends the history at the plan's own heading level", () => {
  const markdown = embedded(exportPlan([], DIALOGUE));
  assert.match(markdown, /^### Conversation history$/m, "no history section at the plan's level");
  assert.ok(markdown.includes("履歴が長いと読みにくい"), "the history text is absent");
  assert.ok(markdown.indexOf("### Conversation history") > markdown.indexOf("### Risks"), "the history is not last");
});

test("a heading inside the history is demoted, and a fenced hash is left alone", () => {
  const markdown = embedded(exportPlan([], DIALOGUE));
  assert.ok(markdown.includes("**この見出しは節を割ってしまう**"), "the heading was not demoted");
  assert.ok(markdown.includes("# このコメントは見出しではない"), "a fenced comment was demoted");
});

test("the default output carries no history section", () => {
  assert.equal(embedded(exportPlan()).includes("Conversation history"), false);
});

function exportWithoutHistory(dialogue) {
  const dir = mkdtempSync(join(tmpdir(), "plan-export-nodlg-"));
  const planPath = join(dir, "sample-plan.plan-review.md");
  const outPath = join(dir, "out.html");
  const dialoguePath = join(dir, "sample-plan.dialogue.md");
  writeFileSync(planPath, PLAN);
  if (dialogue !== null) writeFileSync(dialoguePath, dialogue);
  const res = spawnSync(
    process.execPath,
    [exporter, "--plan", planPath, "--out", outPath, "--dialogue", dialoguePath],
    { encoding: "utf8" });
  const html = readFileSync(outPath, "utf8");
  rmSync(dir, { recursive: true, force: true });
  return { status: res.status, stderr: res.stderr, html };
}

for (const [name, dialogue] of [["missing", null], ["empty", "\n \n"]]) {
  test(`a ${name} history file warns on stderr and still exports`, () => {
    const res = exportWithoutHistory(dialogue);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stderr, /warning: no conversation history/);
    assert.equal(embedded(res.html).includes("Conversation history"), false);
  });
}
