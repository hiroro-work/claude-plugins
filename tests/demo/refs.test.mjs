// Cross-reference integrity for the demo skill: every `§` reference resolves, each capture prompt body
// handed to the subagent carries no references, and its placeholders match what SKILL.md fills in.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "skills", "demo");
const prompts = ["references/capture-prompt.md", "references/capture-prompt-cdp.md"];
const files = ["SKILL.md", "README.md", ...prompts, "references/setup-mode.md"];
const texts = new Map(files.map((f) => [f, readFileSync(join(root, f), "utf8")]));
const headings = (f) => [...texts.get(f).matchAll(/^#{1,3} (.+?)\s*$/gm)].map((m) => m[1]).sort((a, b) => b.length - a.length);

const split = (f) => {
  const prompt = texts.get(f);
  const rule = prompt.indexOf("\n---\n");
  return { rule, preamble: prompt.slice(0, rule), body: prompt.slice(rule + 5) };
};
const placeholders = (s) => new Set([...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]));
const capture = /^6\. \*\*Capture\.\*\*.*$/m.exec(texts.get("SKILL.md"));

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

for (const f of prompts) {
  test(`${f}: the capture prompt body carries no § reference`, () => {
    const { rule, body } = split(f);
    assert.ok(rule > 0, `${f} has no --- rule`);
    assert.ok(!body.includes("§"), "the text after the --- rule goes to a subagent that sees nothing else");
  });

  test(`${f}: the capture prompt placeholders match the preamble and SKILL.md step 6`, () => {
    assert.ok(capture, "SKILL.md has no step 6 (Capture)");
    const { preamble, body } = split(f);
    const used = [...placeholders(body)].sort();
    assert.deepEqual([...placeholders(preamble)].sort(), used);
    assert.deepEqual([...placeholders(capture[0])].sort(), used);
  });
}

test("the CDP capture prompt drives the app through attach and tab-select, never open or goto", () => {
  const { body } = split("references/capture-prompt-cdp.md");
  assert.ok(body.includes("`attach --cdp={{url}}`"), "the flow attaches to the DevTools endpoint");
  assert.ok(body.includes("`tab-select"), "the flow selects windows with tab-select");
  assert.equal(body.match(/`(open|goto)[` ]/g), null, "open and goto belong to the web prompt only");
});

// SKILL.md step 6 picks one of these labeled paragraphs for {{case_reset}}; the web prompt has no "none" because a
// fresh browser has nothing to skip.
test("each capture prompt's Case reset section holds the paragraphs SKILL.md picks from", () => {
  const expected = { "references/capture-prompt.md": ["default", "command"], "references/capture-prompt-cdp.md": ["default", "none", "command"] };
  for (const [f, labels] of Object.entries(expected)) {
    const { preamble } = split(f);
    const section = preamble.split("## Case reset\n")[1];
    assert.ok(section, `${f} has no ## Case reset section before the --- rule`);
    assert.deepEqual([...section.matchAll(/^\*\*(\w+)\*\*: /gm)].map((m) => m[1]), labels);
    assert.equal(placeholders(section).size, 0, "a Case reset paragraph goes into the prompt verbatim, so it carries no placeholder");
    assert.ok(!section.includes("§"), "a Case reset paragraph goes to the subagent, so it carries no § reference");
    assert.ok(/^\*\*command\*\*: .*`<reset line>`/m.test(section), "the command paragraph names the <reset line> SKILL.md substitutes");
  }
  assert.ok(capture[0].includes("`<reset line>`"), "SKILL.md step 6 defines <reset line>");
});

// The lines the two prompt bodies share by design: a line whose start matches one of these prefixes must be
// identical in both files, so an edit to the shared capture logic cannot land in only one of them.
test("the shared lines of the two capture prompts stay identical", () => {
  const prefixes = ["- Chapter cards:", "- Recording scope:", "- Signed-in state file:", "- Language:", "   2. Find the element", "   4. Run `screenshot", "   5. From the snapshot", "- `data`:", "- `app`:", "`result` and `note`", "{ \"steps\":", "`screenshot` is the bare file name"];
  const lines = (f) => split(f).body.split("\n");
  const [web, cdp] = prompts.map(lines);
  for (const p of prefixes) {
    const find = (ls) => ls.find((l) => l.startsWith(p));
    assert.ok(find(web), `no line starts with ${JSON.stringify(p)} in the web prompt`);
    assert.equal(find(cdp), find(web), `the line starting with ${JSON.stringify(p)} differs between the prompts`);
  }
});
