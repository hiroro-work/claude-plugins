#!/usr/bin/env node
/**
 * Write a plan document out as a single self-contained, viewer-only HTML page.
 *
 * Renders through the same three files the local plan-review gate uses
 * (public/plan-view.css, public/plan-parse.mjs, public/plan-render.mjs), inlined here,
 * so the shared view and the gate cannot drift apart. It leaves out the gate's
 * interactive layer entirely, and issues no request of any kind — the plan's Markdown
 * is embedded in the page.
 *
 * Output shape (default): a **fragment** with no `<!doctype>` / `<html>` / `<head>` /
 * `<body>`, because the artifact host that publishes this supplies the skeleton itself
 * and forbids the file writing its own. `--standalone` adds it, for local viewing.
 *
 * Everything the page loads comes from a version-pinned CDN the artifact CSP admits:
 * the marked and highlight.js scripts from cdnjs, the fonts from Google Fonts. Nothing
 * else — that CSP blocks an external stylesheet silently. Mermaid fences go out as
 * `<pre class="mermaid">` for the host to render, so no diagram library is loaded.
 *
 * Node built-ins only (no node_modules).
 *
 * Usage:
 *   node export-plan-html.mjs --plan <path.md> --out <path.html>
 *                             [--lang <ja|en>] [--title <text>] [--standalone]
 *
 * --plan   the Markdown to render. Figures are merged into it beforehand by whoever
 *          composes the served copy (references/visual-plan-review.md § Figures layer
 *          owns the insertion positions), never re-derived here.
 * --out    where to write the HTML.
 * --lang   language of the page's own generated text. UI chrome stays English. Default en.
 * --title  the page's <title>. Defaults to the plan's slug — a name, never a summary.
 *
 * stdout is left empty; progress and errors go to stderr.
 * Exit codes: 0 written, 1 usage or I/O error.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

// plan-parse.mjs touches neither `window` nor `document` at module scope, so it imports
// here rather than this file keeping a second escaping table.
import { escapeHtml, stripFrontmatter } from "./public/plan-parse.mjs";

const log = (...args) => console.error(...args);
const die = (msg) => { log(`error: ${msg}`); process.exit(1); };

let opts;
try {
  ({ values: opts } = parseArgs({
    options: {
      plan: { type: "string" },
      out: { type: "string" },
      lang: { type: "string" },
      title: { type: "string" },
      standalone: { type: "boolean", default: false },
    },
  }));
} catch (err) {
  die(err.message);
}

if (!opts.plan) die("--plan <path> is required");
if (!opts.out) die("--out <path> is required");

const planPath = resolve(opts.plan);
let planMarkdown;
try {
  // The page embeds this verbatim, so the plan document's YAML frontmatter has to come off
  // here rather than at render time.
  planMarkdown = stripFrontmatter(readFileSync(planPath, "utf8"));
} catch (err) {
  die(`cannot read plan file ${planPath}: ${err.message}`);
}

const lang = opts.lang === "ja" ? "ja" : "en";
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "public");
const readPublic = (name) => {
  try {
    return readFileSync(join(publicDir, name), "utf8");
  } catch (err) {
    die(`cannot read ${name}: ${err.message}`);
  }
};

const css = readPublic("plan-view.css");
const parseSrc = readPublic("plan-parse.mjs");
const renderSrc = readPublic("plan-render.mjs");

// Concatenating two modules into one inline module means the second one's import of
// the first has to go. It sits in a single leading block by convention, so dropping
// the one statement that names ./plan-parse.mjs is the whole of it — and an import
// left behind would throw at parse time, taking the page's whole script with it.
const stripParseImport = (src, name) => {
  const out = src.replace(/^import\s+\{[\s\S]*?\}\s+from\s+["']\.\/plan-parse\.mjs["'];?\s*$/m, "");
  if (/^\s*import\s/m.test(out)) {
    die(`${name} carries an import this exporter does not know how to inline`);
  }
  return out;
};

// A script type no browser executes, so nothing in the plan text is parsed as markup or
// code. `</script` is the one sequence that would still end the block early.
const jsonBlock = (id, value) =>
  `<script type="application/json" id="${id}">${JSON.stringify(value).replace(/<\/script/gi, "<\\/script")}</script>`;

// The served copy's suffix comes off here rather than at the title, so the eyebrow and
// the <title> name the plan the same way.
const planId = basename(planPath).replace(/\.md$/i, "").replace(/\.plan-review$/i, "");
// A title names the page rather than summarising it, so the fallback is the slug and
// never the plan's Goal, which is a whole sentence.
const pageTitle = opts.title || planId;

const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600&family=Noto+Sans+JP:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Zen+Old+Mincho:wght@600&display=swap";
const MARKED_SRC = "https://cdnjs.cloudflare.com/ajax/libs/marked/16.3.0/lib/marked.umd.min.js";
const MARKED_SRI = "sha512-V6rGY7jjOEUc7q5Ews8mMlretz1Vn2wLdMW/qgABLWunzsLfluM0FwHuGjGQ1lc8jO5vGpGIGFE+rTzB+63HdA==";
const HLJS_SRC = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js";
const HLJS_SRI = "sha512-EBLzUL8XLl+va/zAsmXwS7Z2B1F9HUHkZwyS/VKwh3S7T/U0nF4BaU29EP/ZSf6zgiIxYAnKLu6bJ8dqpmX5uw==";

const bootstrap = `
    const PLAN = JSON.parse(document.getElementById("plan-source").textContent);
    document.getElementById("app").insertAdjacentHTML("afterbegin", PLAN_SHELL_HTML);

    // Every disclosure opens. This page carries no diff, so nothing here can say which
    // section changed — and a reader who cannot be told that must not have anything
    // folded away from them.
    // No renderDiagrams hook: this page loads no mermaid library, so the renderer leaves each
    // diagram as the <pre class="mermaid"> an artifact host renders itself.
    const renderer = createRenderer({
      labels: LABELS[${JSON.stringify(lang)}],
      forceOpen: true,
    });

    // Nothing here can show the reader an error, so at least keep the failure attributable
    // instead of leaving an empty page and a silent unhandled rejection.
    renderer.renderPlan(preparePlan(PLAN.markdown, PLAN.id)).catch((err) => console.error(err));
`;

// The shared stylesheet reserves room at the foot of the page for the gate's submit bar.
// There is no bar here, so zero the token rather than restating the rule.
const NO_BAR = ":root { --bar-h: 0px; }";

const headParts = [
  `<title>${escapeHtml(pageTitle)}</title>`,
  `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
  `<link rel="stylesheet" href="${FONTS_HREF}">`,
  `<style>\n${css}\n${NO_BAR}\n</style>`,
];

const bodyParts = [
  // `lang` here, not on `<html>`: the fragment has none, and plan-view.css picks the line
  // length off it (--measure).
  `<div id="app" lang="${lang}"></div>`,
  jsonBlock("plan-source", { id: planId, markdown: planMarkdown }),
  `<script src="${MARKED_SRC}" integrity="${MARKED_SRI}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>`,
  `<script src="${HLJS_SRC}" integrity="${HLJS_SRI}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>`,
  `<script type="module">`,
  stripParseImport(parseSrc, "plan-parse.mjs").trim(),
  stripParseImport(renderSrc, "plan-render.mjs").trim(),
  bootstrap.trim(),
  `</script>`,
];

// Head-shaped tags stay at the very top: the publishing host scans the first 8KB for the
// <title>, and a <style> or font <link> applies from wherever it sits.
let html = opts.standalone
  ? `<!doctype html>\n<html lang="${lang}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${headParts.join("\n")}\n</head>\n<body>\n${bodyParts.join("\n")}\n</body>\n</html>\n`
  : `${headParts.concat(bodyParts).join("\n")}\n`;

const outPath = resolve(opts.out);
try {
  writeFileSync(outPath, html);
} catch (err) {
  die(`cannot write ${outPath}: ${err.message}`);
}
log(`wrote ${outPath} (${html.length} chars${opts.standalone ? ", standalone" : ", artifact fragment"})`);
