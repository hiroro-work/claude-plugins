// Static checks on the plan viewer's folded-prose layout.
//
// Why static: plan-render.mjs needs a DOM, so no test here renders it. And the failure this
// guards against is invisible outside a browser — a browser wraps a <details>' non-summary
// children in one ::details-content box, so `display: grid` on the <details> itself silently
// collapses every block into a single cell instead of erroring. Eyeballing the markup proves
// nothing; this file is the only place it is caught.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const viewerDir = join(repoRoot, "skills", "dev-workflow", "scripts", "plan-review", "public");
const css = readFileSync(join(viewerDir, "plan-view.css"), "utf8");
const render = readFileSync(join(viewerDir, "plan-render.mjs"), "utf8");

// Style rules as (prelude, declarations) pairs. At-rules are descended into rather than
// captured, so a rule inside a media query is checked like any other.
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
      // ::details-content is the box itself, so styling that one is the way to do it.
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
