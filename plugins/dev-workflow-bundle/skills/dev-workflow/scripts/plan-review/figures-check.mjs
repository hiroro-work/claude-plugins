#!/usr/bin/env node
// Check a plan's figures file against the rules the plan viewer can render.
//
// Usage: node figures-check.mjs --plan <plan.md> --figures <figures.md> [--css <plan-view.css>]
//        node figures-check.mjs --template
// Prints one `<block>: <problem>` line per violation and exits 1; prints nothing and exits 0 when clean.
// `--template` prints the shape of an inline-SVG block and a mermaid block. The palette a figure may use is
// read from the "Figure-safe tokens" comment at the top of plan-view.css (default: public/plan-view.css next
// to this script), so adding a token there is the only edit needed.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FENCE_RE = /^\s*(```|~~~)/;
const MAX_FIGURES = 3;
const OPACITY_RANGE = [0.08, 0.2];

export function figureTokens(css) {
  const m = /\/\*\s*Figure-safe tokens[\s\S]*?\*\//.exec(css);
  if (!m) return new Set();
  const tokens = new Set();
  for (const line of m[0].split("\n")) {
    if (!/^\s*--/.test(line)) continue;
    for (const t of line.matchAll(/--[a-z0-9-]+/g)) tokens.add(t[0]);
  }
  return tokens;
}

export function planHeadings(plan) {
  const names = new Set();
  let inFence = false;
  for (const line of plan.split("\n")) {
    if (FENCE_RE.test(line)) { inFence = !inFence; continue; }
    const h = !inFence && /^###\s+(.+?)\s*$/.exec(line);
    if (h) names.add(h[1]);
  }
  return names;
}

// Split the figures file into `## <name>` blocks, fences respected.
export function figureBlocks(text) {
  const blocks = [];
  let current = null;
  let inFence = false;
  for (const line of text.split("\n")) {
    if (FENCE_RE.test(line)) inFence = !inFence;
    const h = !inFence && /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      current = { name: h[1], lines: [] };
      blocks.push(current);
      continue;
    }
    if (current) current.lines.push(line);
  }
  return blocks.map((b) => ({ name: b.name, body: b.lines.join("\n") }));
}

function colourValues(svg) {
  const values = [];
  for (const m of svg.matchAll(/\b(fill|stroke|stop-color|color)\s*=\s*"([^"]*)"/g)) values.push({ attr: m[1], value: m[2].trim() });
  for (const s of svg.matchAll(/\bstyle\s*=\s*"([^"]*)"/g)) {
    for (const d of s[1].matchAll(/(fill|stroke|stop-color|color)\s*:\s*([^;]+)/g)) values.push({ attr: d[1], value: d[2].trim() });
  }
  return values;
}

function checkSvgFigure(name, body, tokens, problems) {
  const fig = /<figure[\s>][\s\S]*?<\/figure>/.exec(body);
  if (!fig) { problems.push(`${name}: <figure> is not closed`); return; }
  const block = fig[0];
  if (/\n[ \t]*\n/.test(block)) problems.push(`${name}: blank line inside <figure>`);
  if (!/<svg[^>]*\bviewBox\s*=/.test(block)) problems.push(`${name}: <svg> needs a viewBox`);
  if (!/<figcaption[\s>]/.test(block)) problems.push(`${name}: <figcaption> is missing`);
  if (/<style[\s>]/.test(block)) problems.push(`${name}: <style> is not allowed; use presentation attributes`);
  for (const { attr, value } of colourValues(block)) {
    const ok = value === "currentColor" || value === "none" || value === "inherit"
      || (/^var\((--[a-z0-9-]+)\)$/.test(value) && tokens.has(/^var\((--[a-z0-9-]+)\)$/.exec(value)[1]));
    if (!ok) problems.push(`${name}: ${attr}="${value}" is not currentColor, none, or a figure-safe token`);
  }
  for (const m of block.matchAll(/\bfill-opacity\s*=\s*"([^"]*)"/g)) {
    const n = Number(m[1]);
    if (!(n >= OPACITY_RANGE[0] && n <= OPACITY_RANGE[1])) problems.push(`${name}: fill-opacity ${m[1]} is outside ${OPACITY_RANGE[0]}–${OPACITY_RANGE[1]}`);
  }
  for (const g of block.matchAll(/<g\b[^>]*\bfill\s*=[^>]*>([\s\S]*?)<\/g>/g)) {
    if (/<text[\s>]/.test(g[1])) problems.push(`${name}: a <g> holding <text> carries a fill`);
  }
}

function checkMermaidFigure(name, body, problems) {
  const lines = body.split("\n");
  let i = lines.findIndex((l) => /^\s*```\s*mermaid\b/.test(l));
  let close = -1;
  for (let j = i + 1; j < lines.length; j++) if (/^\s*```\s*$/.test(lines[j])) { close = j; break; }
  if (close === -1) { problems.push(`${name}: mermaid fence is not closed`); return; }
  const next = lines.slice(close + 1).find((l) => l.trim() !== "");
  if (!next || /^(#|<|```|[-*] |\d+\. )/.test(next.trim())) problems.push(`${name}: a mermaid figure needs a one-sentence caption paragraph directly under the fence`);
}

export function checkFigures({ plan, figures, css }) {
  const problems = [];
  const headings = planHeadings(plan);
  const tokens = figureTokens(css);
  const blocks = figureBlocks(figures);
  const seen = new Set();
  let count = 0;
  for (const { name, body } of blocks) {
    if (seen.has(name)) problems.push(`${name}: block repeated`);
    seen.add(name);
    const isHero = name === "Hero";
    if (!isHero && !headings.has(name)) problems.push(`${name}: no plan heading "### ${name}"`);
    if (!isHero) count++;
    const svgCount = (body.match(/<figure[\s>]/g) ?? []).length;
    const mermaidCount = (body.match(/^\s*```\s*mermaid\b/gm) ?? []).length;
    const figures = svgCount + mermaidCount;
    if (figures === 0) problems.push(`${name}: no figure (a mermaid fence or a <figure> with inline SVG)`);
    else if (figures > 1) problems.push(`${name}: more than one figure`);
    else if (svgCount) checkSvgFigure(name, body, tokens, problems);
    else checkMermaidFigure(name, body, problems);
  }
  if (count > MAX_FIGURES) problems.push(`figures: ${count} section figures; at most ${MAX_FIGURES} besides Hero`);
  return problems;
}

export const TEMPLATE = `## <section name>
<figure>
<svg viewBox="0 0 320 110" width="100%" role="img" aria-label="<what the figure shows>">
<rect x="12" y="24" width="136" height="44" fill="currentColor" fill-opacity="0.12" stroke="currentColor"/>
<text x="80" y="50" text-anchor="middle" font-size="12"><label from the plan></text>
<rect x="172" y="24" width="136" height="44" fill="var(--accent)" stroke="currentColor"/>
<text x="240" y="50" text-anchor="middle" font-size="12" fill="var(--on-accent)"><label from the plan></text>
</svg>
<figcaption>One sentence stating what the figure claims.</figcaption>
</figure>

## <section name>
\`\`\`mermaid
flowchart LR
  A[from the plan] --> B[from the plan]
\`\`\`
One sentence stating what the figure claims.

## Hero
<optional; same shapes, rendered above the plan>
`;

function main(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--template") opts.template = true;
    else if (a === "--plan") opts.plan = argv[++i];
    else if (a === "--figures") opts.figures = argv[++i];
    else if (a === "--css") opts.css = argv[++i];
    else { process.stderr.write(`unknown argument: ${a}\n`); return 1; }
  }
  if (opts.template) { process.stdout.write(TEMPLATE); return 0; }
  if (!opts.plan || !opts.figures) {
    process.stderr.write("usage: figures-check.mjs --plan <plan.md> --figures <figures.md> [--css <plan-view.css>] | --template\n");
    return 1;
  }
  const cssPath = opts.css ?? join(dirname(fileURLToPath(import.meta.url)), "public", "plan-view.css");
  const problems = checkFigures({
    plan: readFileSync(opts.plan, "utf8"),
    figures: readFileSync(opts.figures, "utf8"),
    css: readFileSync(cssPath, "utf8"),
  });
  for (const p of problems) process.stdout.write(p + "\n");
  return problems.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main(process.argv.slice(2)));
