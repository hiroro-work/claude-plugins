#!/usr/bin/env node
/**
 * Write a plan as a single self-contained, viewer-only HTML page, rendered through the gate's own
 * public/plan-{view.css,parse.mjs,render.mjs} inlined so the two cannot drift.
 * Default output is a fragment (the artifact host supplies the skeleton); --standalone adds it.
 * Only cdnjs scripts + Google Fonts: the artifact CSP blocks anything else silently.
 *
 * Usage:
 *   node export-plan-html.mjs --plan <path.md> --out <path.html>
 *                             [--lang <ja|en>] [--title <text>] [--standalone] [--dialogue <path.md>]
 *
 * Exit codes: 0 written, 1 usage or I/O error. stdout stays empty.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { DIALOGUE_TITLE, FENCE_RE, escapeHtml, inferSectionLevel, stripFrontmatter } from "./public/plan-parse.mjs";

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
      dialogue: { type: "string" },
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
  // The page embeds this verbatim, so frontmatter must come off here, not at render time.
  planMarkdown = stripFrontmatter(readFileSync(planPath, "utf8"));
} catch (err) {
  die(`cannot read plan file ${planPath}: ${err.message}`);
}

if (opts.dialogue) {
  let dialogue = "";
  try {
    dialogue = stripFrontmatter(readFileSync(resolve(opts.dialogue), "utf8")).trim();
    if (!dialogue) log(`warning: no conversation history: ${opts.dialogue} is empty`);
  } catch (err) {
    log(`warning: no conversation history at ${opts.dialogue}: ${err.message}`);
  }
  if (dialogue) {
    // A heading at the plan's own level would split the plan into another section.
    let inFence = false;
    const body = dialogue.split(/\r?\n/).map((line) => {
      if (FENCE_RE.test(line)) { inFence = !inFence; return line; }
      return inFence ? line : line.replace(/^#{1,6}\s+(.*)$/, "**$1**");
    }).join("\n");
    const hashes = "#".repeat(inferSectionLevel(planMarkdown.split(/\r?\n/)));
    planMarkdown = `${planMarkdown.trimEnd()}\n\n${hashes} ${DIALOGUE_TITLE}\n\n${body}\n`;
  }
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

// plan-render.mjs' single leading import of plan-parse.mjs must go; any import left behind kills the page at parse time.
const stripParseImport = (src, name) => {
  const out = src.replace(/^import\s+\{[\s\S]*?\}\s+from\s+["']\.\/plan-parse\.mjs["'];?\s*$/m, "");
  if (/^\s*import\s/m.test(out)) {
    die(`${name} carries an import this exporter does not know how to inline`);
  }
  return out;
};

// A script type no browser executes; `</script` is the one sequence that would still end the block.
const jsonBlock = (id, value) =>
  `<script type="application/json" id="${id}">${JSON.stringify(value).replace(/<\/script/gi, "<\\/script")}</script>`;

const planId = basename(planPath).replace(/\.md$/i, "").replace(/\.plan-review$/i, "");
const pageTitle = opts.title || planId;

const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600&family=Noto+Sans+JP:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Zen+Old+Mincho:wght@600&display=swap";
const MARKED_SRC = "https://cdnjs.cloudflare.com/ajax/libs/marked/16.3.0/lib/marked.umd.min.js";
const MARKED_SRI = "sha512-V6rGY7jjOEUc7q5Ews8mMlretz1Vn2wLdMW/qgABLWunzsLfluM0FwHuGjGQ1lc8jO5vGpGIGFE+rTzB+63HdA==";
const HLJS_SRC = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js";
const HLJS_SRI = "sha512-EBLzUL8XLl+va/zAsmXwS7Z2B1F9HUHkZwyS/VKwh3S7T/U0nF4BaU29EP/ZSf6zgiIxYAnKLu6bJ8dqpmX5uw==";

const bootstrap = `
    const PLAN = JSON.parse(document.getElementById("plan-source").textContent);
    document.getElementById("app").insertAdjacentHTML("afterbegin", PLAN_SHELL_HTML);

    const renderer = createRenderer({
      labels: LABELS[${JSON.stringify(lang)}],
      atAGlance: true,
      hooks: { renderDiagrams: renderMermaidDiagrams },
    });

    renderer.renderPlan(preparePlan(PLAN.markdown, PLAN.id)).catch((err) => console.error(err));
`;

// No submit bar on this surface, so zero the stylesheet's reserved bar height.
const NO_BAR = ":root { --bar-h: 0px; }";

const headParts = [
  `<title>${escapeHtml(pageTitle)}</title>`,
  `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
  `<link rel="stylesheet" href="${FONTS_HREF}">`,
  `<style>\n${css}\n${NO_BAR}\n</style>`,
];

const bodyParts = [
  // `lang` here, not on <html>: the fragment has none, and plan-view.css reads --measure off it.
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

// Head tags first: the publishing host scans only the first 8KB for <title>.
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
