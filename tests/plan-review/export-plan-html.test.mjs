// Static checks on export-plan-html.mjs' output.
//
// Why static: every constraint here fails *silently* in the browser that matters. The
// artifact host's CSP drops a blocked stylesheet or request with no console error and no
// visible sign, and a skeleton tag the host forbids is stripped rather than reported. So
// eyeballing the exported page proves nothing about these, and this file is the only place
// they are caught.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const exporter = join(repoRoot, "skills", "dev-workflow", "scripts", "plan-review", "export-plan-html.mjs");

// A plan that mentions the very tokens the assertions look for — `<!doctype>`, `<body>`,
// `fetch(`, `esm.sh`. A grep over the whole file would match those and pass or fail on the
// plan's prose rather than on the page, which is exactly the mistake `pageShell` below
// exists to prevent.
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

// One subprocess per distinct argument set. Most assertions read the default output, and
// spawning the exporter again for each of them was most of this file's runtime.
const cache = new Map();
function exportPlan(args = []) {
  const key = JSON.stringify(args);
  if (!cache.has(key)) {
    const dir = mkdtempSync(join(tmpdir(), "plan-export-"));
    const planPath = join(dir, "sample-plan.plan-review.md");
    const outPath = join(dir, "out.html");
    writeFileSync(planPath, PLAN);
    execFileSync(process.execPath, [exporter, "--plan", planPath, "--out", outPath, ...args], { stdio: "pipe" });
    cache.set(key, readFileSync(outPath, "utf8"));
    rmSync(dir, { recursive: true, force: true });
  }
  return cache.get(key);
}

// The embedded plan is data, not page markup. Strip it before asserting anything about the
// page, or the plan's own prose answers the question instead of the page.
const shells = new Map();
const pageShell = (html) => {
  if (!shells.has(html)) {
    shells.set(html, html.replace(/<script type="application\/json" id="plan-source">[\s\S]*?<\/script>/, ""));
  }
  return shells.get(html);
};

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
  // Default: the plan's slug, with the served-copy suffix off — not its Goal sentence.
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

// The renderer holds a mermaid fence in whichever tag follows from the caller's own
// diagram hook, so the absence of that hook here is what makes the host render the fence.
test("mermaid renders through the host, so no diagram library is loaded", () => {
  const shell = pageShell(exportPlan());
  assert.equal(/mermaid[^"]*\.js/i.test(shell), false, "a mermaid library is loaded");
  assert.equal(shell.includes("renderDiagrams:"), false,
    "the export claims a diagram renderer it has no library for");
});

// The bootstrap's own createRenderer call. plan-render.mjs is inlined whole, so a bare grep
// over the page would read that file's jsdoc and comments as if they were the call — the same
// reason the --lang test below asserts on this line rather than on the label text.
const bootstrapCall = (html) => pageShell(html).match(/const renderer = createRenderer\(\{[\s\S]*?\n\s*\}\);/)[0];

// The section is the unit that must not hide: with no diff, nothing on this page can tell the
// reader which section moved. A step and a fold keep a visible heading either way, so holding
// those open too would only hand a skimming reader the plan at full length.
test("every section opens, while steps and prose folds stay closed at their headings", () => {
  const call = bootstrapCall(exportPlan());
  assert.ok(call.includes('forceOpen: "sections"'));
  assert.equal(call.includes("forceOpen: true"), false, "the page still forces every disclosure open");
});

test("the at-a-glance digest is on, so the page opens on the Decisions", () => {
  assert.ok(bootstrapCall(exportPlan()).includes("atAGlance: true"));
});

// The renderer returns silently when the slot is absent, and this page can show the reader no
// error — so the flag assertion above would keep passing over a digest that renders nowhere.
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

// Assert on the bootstrap's own line, not on the label text: plan-render.mjs' LABELS table
// is inlined whole, so BOTH strings appear in every export and a build that ignored --lang
// entirely would still satisfy a raw-string check.
test("--lang picks the language of the page's own generated text", () => {
  assert.match(pageShell(exportPlan(["--lang", "ja"])), /labels: LABELS\["ja"\]/);
  assert.match(pageShell(exportPlan(["--lang", "en"])), /labels: LABELS\["en"\]/);
});

// The fragment carries no <html> of its own, so plan-view.css reads the language — and with it
// the line length it sets — off the app root instead.
test("--lang reaches the app root, which is where the stylesheet reads it", () => {
  assert.match(exportPlan(["--lang", "ja"]), /<div id="app" lang="ja"><\/div>/);
  assert.match(exportPlan(["--lang", "en"]), /<div id="app" lang="en"><\/div>/);
});

// Both surface flags are opt-in so the gate's DOM stays exactly as its comment-anchoring
// contract expects. Nothing else pins that: turning either on at the gate would ship the
// export's chrome into the review surface with the rest of this suite still green.
test("the gate takes neither surface flag, so its DOM is unchanged", () => {
  const indexHtml = readFileSync(
    join(repoRoot, "skills", "dev-workflow", "scripts", "plan-review", "public", "index.html"), "utf8");
  const call = indexHtml.match(/const renderer = createRenderer\(\{[\s\S]*?\n\s*\}\);/)[0];
  assert.equal(/\bforceOpen\b/.test(call), false, "the gate forces disclosures open");
  assert.equal(/\batAGlance\b/.test(call), false, "the gate renders the at-a-glance digest");
});

// The CSP-shaped assertions above all read the exporter's output, so nothing in this file
// constrains the gate page's own external references. esm.sh is gate-only and deliberate.
test("the gate page's external references stay within the hosts it is allowed", () => {
  const indexHtml = readFileSync(
    join(repoRoot, "skills", "dev-workflow", "scripts", "plan-review", "public", "index.html"), "utf8");
  const allowed = new Set(["cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com", "esm.sh"]);
  const hosts = [...indexHtml.matchAll(/(?:src|href)="https:\/\/([^/"]+)/g)].map((m) => m[1]);
  const unexpected = [...new Set(hosts)].filter((h) => !allowed.has(h));
  assert.deepEqual(unexpected, [], `unexpected external host(s): ${unexpected.join(", ")}`);
});

// The exporter cannot read index.html's <script>/<link> tags — they are static markup, not
// data — so the two carry the same pinned URLs and hashes by hand. Only the exporter's copy
// is checked above; without this, index.html could go stale or unpinned with the suite green.
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

// The page carries the plan's Markdown verbatim in a JSON block, so a frontmatter left on it
// would ship inside the published page even though nothing renders it.
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
