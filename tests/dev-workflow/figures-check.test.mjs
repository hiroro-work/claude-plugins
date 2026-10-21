// scripts/plan-review/figures-check.mjs: the token list from plan-view.css and each mechanical figure rule.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { TEMPLATE, checkFigures, figureTokens } from "../../skills/dev-workflow/scripts/plan-review/figures-check.mjs";

const CSS = readFileSync(fileURLToPath(new URL("../../skills/dev-workflow/scripts/plan-review/public/plan-view.css", import.meta.url)), "utf8");

const PLAN = `## Plan

### Overview

- **Now**: x

### Build order

1. **Do** — y

### Test plan

z
`;

const SVG = (inner, attrs = "") => `## Overview
<figure>
<svg viewBox="0 0 10 10" ${attrs}>
${inner}
</svg>
<figcaption>One claim.</figcaption>
</figure>
`;

const check = (figures, plan = PLAN) => checkFigures({ plan, figures, css: CSS });

test("the token list comes from the Figure-safe tokens comment", () => {
  const tokens = figureTokens(CSS);
  for (const t of ["--fg", "--muted", "--bg", "--bg-soft", "--accent", "--accent-soft", "--accent-ink", "--on-accent", "--approve", "--approve-bg", "--changed-bg", "--border"]) {
    assert.ok(tokens.has(t), `${t} is listed`);
  }
  assert.ok(!tokens.has("--rec"), "aliases named in the prose are not tokens");
  assert.ok(!tokens.has("--page-bg"), "chrome is not a token");
});

test("a clean SVG figure and a captioned mermaid figure pass", () => {
  const figures = SVG('<rect fill="currentColor" fill-opacity="0.12" stroke="currentColor"/>\n<text fill="var(--on-accent)">a</text>') +
    "\n## Build order\n```mermaid\nflowchart LR\n  A --> B\n```\nOne claim.\n";
  assert.deepEqual(check(figures), []);
});

test("a block must name a plan heading or Hero", () => {
  const figures = SVG("<rect/>").replace("## Overview", "## Scope") + SVG("<rect/>").replace("## Overview", "## Hero");
  assert.deepEqual(check(figures), ['Scope: no plan heading "### Scope"']);
});

test("one figure per block, at most three besides Hero", () => {
  const two = SVG("<rect/>") + "```mermaid\nflowchart LR\n  A --> B\n```\nCaption.\n";
  assert.deepEqual(check(two), ["Overview: more than one figure"]);
  const four = SVG("<rect/>") + SVG("<rect/>").replace("## Overview", "## Build order") + SVG("<rect/>").replace("## Overview", "## Test plan") + SVG("<rect/>").replace("## Overview", "## Hero");
  assert.deepEqual(check(four), []);
  const dup = four + SVG("<rect/>");
  assert.deepEqual(check(dup), ["Overview: block repeated", "figures: 4 section figures; at most 3 besides Hero"]);
});

test("an SVG figure needs a viewBox, a caption, no blank line, and no <style>", () => {
  const figures = `## Overview
<figure>
<svg>
<style>.a{fill:red}</style>

<rect/>
</svg>
</figure>
`;
  assert.deepEqual(check(figures), [
    "Overview: blank line inside <figure>",
    "Overview: <svg> needs a viewBox",
    "Overview: <figcaption> is missing",
    "Overview: <style> is not allowed; use presentation attributes",
  ]);
});

test("colours are currentColor, none, or a figure-safe token", () => {
  const figures = SVG('<rect fill="#ff0000" stroke="var(--rec)" style="color: red; stroke: none"/>');
  assert.deepEqual(check(figures), [
    'Overview: fill="#ff0000" is not currentColor, none, or a figure-safe token',
    'Overview: stroke="var(--rec)" is not currentColor, none, or a figure-safe token',
    'Overview: color="red" is not currentColor, none, or a figure-safe token',
  ]);
});

test("fill-opacity stays in range and a group holding text carries no fill", () => {
  const figures = SVG('<rect fill="currentColor" fill-opacity="0.5"/>\n<g fill="currentColor"><text>a</text></g>');
  assert.deepEqual(check(figures), [
    "Overview: fill-opacity 0.5 is outside 0.08–0.2",
    "Overview: a <g> holding <text> carries a fill",
  ]);
});

test("a mermaid figure needs a caption paragraph directly under the fence", () => {
  const figures = "## Overview\n```mermaid\nflowchart LR\n  A --> B\n```\n\n## Build order\n```mermaid\nflowchart LR\n  A --> B\n```\n- a list\n";
  assert.deepEqual(check(figures), [
    "Overview: a mermaid figure needs a one-sentence caption paragraph directly under the fence",
    "Build order: a mermaid figure needs a one-sentence caption paragraph directly under the fence",
  ]);
});

test("the template passes the check once its placeholders name plan headings", () => {
  const figures = TEMPLATE.replace("## <section name>", "## Overview").replace("## <section name>", "## Build order").replace(/## Hero[\s\S]*$/, "");
  assert.deepEqual(check(figures), []);
});
