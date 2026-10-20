// Cross-reference integrity for the demo skill: every `§` reference resolves, each capture prompt body
// handed to the subagent carries no references, and its placeholders match what SKILL.md fills in.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "skills", "demo");
// One descriptor per capture prompt: the Case reset labels SKILL.md picks from, and whether a browser drives it.
const promptSpecs = {
  "references/capture-prompt.md": { resets: ["default", "command"], browser: true },
  "references/capture-prompt-cdp.md": { resets: ["default", "none", "command"], browser: true },
  "references/capture-prompt-mobile.md": { resets: ["default", "none", "command"], browser: false },
};
const prompts = Object.keys(promptSpecs);
const web = prompts[0];
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

  test(`${f}: the capture prompt placeholders match the preamble`, () => {
    const { preamble, body } = split(f);
    assert.deepEqual([...placeholders(preamble)].sort(), [...placeholders(body)].sort());
  });
}

test("SKILL.md step 6 fills exactly the placeholders the capture prompts use", () => {
  assert.ok(capture, "SKILL.md has no step 6 (Capture)");
  const union = new Set(prompts.flatMap((f) => [...placeholders(split(f).body)]));
  assert.deepEqual([...placeholders(capture[0])].sort(), [...union].sort());
});

test("the CDP capture prompt drives the app through attach and tab-select, never open or goto", () => {
  const { body } = split("references/capture-prompt-cdp.md");
  assert.ok(body.includes("`attach --cdp={{url}}`"), "the flow attaches to the DevTools endpoint");
  assert.ok(body.includes("`tab-select"), "the flow selects windows with tab-select");
  assert.equal(body.match(/`(open|goto)[` ]/g), null, "open and goto belong to the web prompt only");
});

// SKILL.md step 6 picks one of these labeled paragraphs for {{case_reset}}; the web prompt has no "none" because a
// fresh browser has nothing to skip.
test("each capture prompt's Case reset section holds the paragraphs SKILL.md picks from", () => {
  const command = (f) => /^\*\*command\*\*: ([^.]*\.)/m.exec(split(f).preamble.split("## Case reset\n")[1] ?? "")?.[1];
  for (const [f, { resets: labels }] of Object.entries(promptSpecs)) {
    const { preamble } = split(f);
    const section = preamble.split("## Case reset\n")[1];
    assert.ok(section, `${f} has no ## Case reset section before the --- rule`);
    assert.deepEqual([...section.matchAll(/^\*\*(\w+)\*\*: /gm)].map((m) => m[1]), labels);
    assert.equal(placeholders(section).size, 0, "a Case reset paragraph goes into the prompt verbatim, so it carries no placeholder");
    assert.ok(!section.includes("§"), "a Case reset paragraph goes to the subagent, so it carries no § reference");
    assert.ok(/^\*\*command\*\*: .*`<reset line>`/m.test(section), "the command paragraph names the <reset line> SKILL.md substitutes");
    assert.equal(command(f), command(web), `${f}: the command paragraph's first sentence differs from the web prompt's`);
  }
  assert.ok(capture[0].includes("`<reset line>`"), "SKILL.md step 6 defines <reset line>");
});

// The lines the prompt bodies share by design: a line whose start matches one of these prefixes must be
// identical across the files, so an edit to the shared capture logic cannot land in only one of them. The
// browser-shared lines are compared among the browser-driven prompts only.
test("the shared lines of the capture prompts stay identical", () => {
  const browserShared = ["- Chapter cards:", "- Signed-in state file:", "   2. Find the element", "   4. Run `screenshot", "   5. From the snapshot"];
  const everywhere = ["- Recording scope:", "- Language:", "- `data`:", "- `app`:", "`result` and `note`", "{ \"steps\":", "`screenshot` is the bare file name"];
  const find = (f, p) => split(f).body.split("\n").find((l) => l.startsWith(p));
  for (const p of [...browserShared, ...everywhere]) assert.ok(find(web, p), `no line starts with ${JSON.stringify(p)} in the web prompt`);
  for (const [f, { browser }] of Object.entries(promptSpecs)) {
    if (f === web) continue;
    for (const p of browser ? [...browserShared, ...everywhere] : everywhere) assert.equal(find(f, p), find(web, p), `${f}: the line starting with ${JSON.stringify(p)} differs from the web prompt`);
  }
});

test("the mobile capture prompt drives the app through agent-device, never playwright-cli", () => {
  const { body } = split("references/capture-prompt-mobile.md");
  assert.ok(body.includes("`agent-device --session {{session}} <command>`"), "every command goes through agent-device with the session");
  assert.ok(body.includes("`record start {{out_dir}}/<id>.mp4 --scope app`"), "the case is recorded with record start");
  assert.ok(body.includes("`open {{app}} --platform {{target}} {{device}}`"), "the open line names the app, the platform and the device");
  assert.equal(body.match(/playwright-cli|`goto|video-start|`close`\./g), null, "playwright-cli, goto, video-start and a close of its own belong to the browser prompts");
});

// `attach: cdp` became the `target: cdp` alias; the old key survives only where the alias is explained.
test("the old attach key appears only beside its target: cdp alias", () => {
  for (const f of files) {
    const hits = texts.get(f).split("\n").filter((l) => l.includes("attach: cdp"));
    if (f.startsWith("references/")) assert.deepEqual(hits, [], `${f} still names attach: cdp`);
    else for (const l of hits) assert.ok(l.includes("target: cdp"), `${f}: a line names attach: cdp without target: cdp: ${l.slice(0, 80)}`);
  }
});
