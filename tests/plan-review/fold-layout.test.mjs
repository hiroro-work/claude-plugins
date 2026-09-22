// Static checks on the folded-prose layout: a browser wraps a <details>' non-summary children in one
// ::details-content box, so `display: grid` on the <details> silently collapses every block into one cell.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const viewerDir = join(repoRoot, "skills", "dev-workflow", "scripts", "plan-review", "public");
const css = readFileSync(join(viewerDir, "plan-view.css"), "utf8");
const render = readFileSync(join(viewerDir, "plan-render.mjs"), "utf8");

// (prelude, declarations) pairs; at-rules are descended into.
function styleRules(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  let prelude = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "}") { prelude = ""; continue; }
    if (ch !== "{") { prelude += ch; continue; }
    const selector = prelude.trim();
    prelude = "";
    if (selector.startsWith("@")) continue;
    let depth = 1;
    let body = "";
    let j = i + 1;
    for (; j < text.length && depth > 0; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}" && --depth === 0) break;
      body += text[j];
    }
    out.push({ selector, body });
    i = j;
  }
  return out;
}

// The element the declarations actually lay out: the rightmost compound of one selector.
function subject(selector) {
  return selector.trim().split(/[\s>+~]+/).pop();
}

test("no grid or flex container is a <details> element", () => {
  const offenders = [];
  for (const { selector, body } of styleRules(css)) {
    if (!/display\s*:\s*(inline-)?(grid|flex)\b/.test(body)) continue;
    for (const one of selector.split(",")) {
      const s = subject(one);
      if (/^details\b/.test(s) && !s.includes("::details-content")) offenders.push(one.trim());
    }
  }
  assert.deepEqual(offenders, []);
});

test("the overview grid lands on the fold's inner element, which the renderer creates", () => {
  assert.match(render, /className = "fold-body"/);
  const grids = styleRules(css)
    .filter((r) => /grid-template-columns/.test(r.body))
    .map((r) => r.selector);
  assert.ok(
    grids.some((s) => s.includes('[data-section-type="overview"]') && s.includes(".fold-body")),
    "expected an overview grid rule targeting .fold-body",
  );
});

test("every token named in the figure-safe comment is defined in :root", () => {
  const comment = css.match(/\/\*\s*Figure-safe tokens[\s\S]*?\*\//);
  assert.ok(comment, "the Figure-safe tokens comment is missing from plan-view.css");

  const named = new Set(
    comment[0]
      .split("\n")
      .filter((line) => /\bover\b|\bfor rules\b/.test(line))
      .flatMap((line) => line.match(/--[a-z-]+/g) ?? []),
  );
  assert.ok(named.size > 0, "the figure-safe comment names no tokens");

  const defined = new Set(css.match(/^\s*(--[a-z-]+):/gm)?.map((d) => d.trim().slice(0, -1)));
  const dangling = [...named].filter((t) => !defined.has(t));
  assert.deepEqual(dangling, [], `figure-safe tokens not defined in plan-view.css: ${dangling}`);
});

// A figure's <text> with no fill falls to SVG's black and disappears on the dark ground; the floor is
// checked by where it reaches, since the wrapper varies.
test("the figure colour floor reaches every SVG but mermaid's", () => {
  const floors = styleRules(css)
    .filter((r) => /\bfill\s*:\s*currentColor\b/.test(r.body))
    .flatMap((r) => r.selector.split(",").map((s) => s.trim().replace(/\s+/g, " ")));
  assert.ok(floors.length > 0, "no fill: currentColor rule found in plan-view.css");

  for (const leaf of ["text", "tspan"]) {
    for (const host of [".sec-body", "#hero"]) {
      const required = `${host} svg:not(.mermaid *) ${leaf}`;
      assert.ok(floors.includes(required), `the colour floor is missing ${required}`);
    }
  }
  assert.deepEqual(floors.filter((s) => /figure/.test(s)), []);
});
