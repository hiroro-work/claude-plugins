// Cross-reference integrity for the demo skill: every `§` reference resolves, the capture prompt body
// handed to the subagent carries no references, and its placeholders match what SKILL.md fills in.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "skills", "demo");
const files = ["SKILL.md", "README.md", "references/capture-prompt.md", "references/setup-mode.md"];
const texts = new Map(files.map((f) => [f, readFileSync(join(root, f), "utf8")]));
const headings = (f) => [...texts.get(f).matchAll(/^#{1,3} (.+?)\s*$/gm)].map((m) => m[1]).sort((a, b) => b.length - a.length);

const prompt = texts.get("references/capture-prompt.md");
const rule = prompt.indexOf("\n---\n");
const preamble = prompt.slice(0, rule);
const body = prompt.slice(rule + 5);
const placeholders = (s) => new Set([...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]));

test("every § reference names an existing heading in the file it points into", () => {
  const bad = [];
  for (const [f, t] of texts) {
    for (const m of t.matchAll(/§ ([^\n`]+)/g)) {
      const named = /`([\w/.-]+\.md)` $/.exec(t.slice(Math.max(0, m.index - 80), m.index));
      const target = named ? named[1] : f;
      if (!texts.has(target)) { bad.push(`${f}: § ${m[1].slice(0, 50)} points into ${target}, which is not checked`); continue; }
      const tail = m[1];
      if (!headings(target).some((h) => tail.startsWith(h))) bad.push(`${f}: § ${tail.slice(0, 50)} (in ${target})`);
      const step = /^Procedure step (\d+) \(([^)]+)\)/.exec(tail);
      if (step && !new RegExp(`^${step[1]}\\. \\*\\*${step[2]}\\.\\*\\*`, "m").test(texts.get(target))) bad.push(`${f}: § ${step[0]} does not match a Procedure step in ${target}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("the capture prompt body carries no § reference", () => {
  assert.ok(rule > 0, "capture-prompt.md has no --- rule");
  assert.ok(!body.includes("§"), "the text after the --- rule goes to a subagent that sees nothing else");
});

test("the capture prompt placeholders match the preamble and SKILL.md step 6", () => {
  const capture = /^6\. \*\*Capture\.\*\*.*$/m.exec(texts.get("SKILL.md"));
  assert.ok(capture, "SKILL.md has no step 6 (Capture)");
  const used = [...placeholders(body)].sort();
  assert.deepEqual([...placeholders(preamble)].sort(), used);
  assert.deepEqual([...placeholders(capture[0])].sort(), used);
});
