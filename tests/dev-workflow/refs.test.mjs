// Cross-reference integrity for the dev-workflow tree, replacing the retired cross-reference
// lint skill. Every `§ <Heading>` must name a heading that exists in SKILL.md or a references file,
// every `references/<file>.md` and `scripts/<path>.mjs` named in prose must exist, and the v1
// `Step N` vocabulary must not reappear (v2 phases are `Phase N`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const root = join(repoRoot, "skills", "dev-workflow");
const files = [join(root, "SKILL.md"), ...readdirSync(join(root, "references")).filter((f) => f.endsWith(".md")).map((f) => join(root, "references", f))];
const texts = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));

const headings = new Set();
for (const t of texts.values()) for (const m of t.matchAll(/^#{2,3} (.+?)\s*$/gm)) headings.add(m[1].replace(/\s*\(.*\)$/, "").trim());
const headingList = [...headings].sort((a, b) => b.length - a.length);

test("every § reference names an existing heading", () => {
  const bad = [];
  for (const [f, t] of texts) {
    for (const m of t.matchAll(/§ ([^\n`]+)/g)) {
      const tail = m[1];
      const hit = headingList.find((h) => tail.startsWith(h) || tail.startsWith(h.replace(/:.*$/, "")));
      if (!hit) bad.push(`${f.replace(repoRoot + "/", "")}: § ${tail.slice(0, 60)}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("every referenced reference file and script exists", () => {
  const bad = [];
  for (const [f, t] of texts) {
    for (const m of t.matchAll(/`(?:references\/)?([a-z0-9-]+\.md)`/g)) {
      const name = m[1];
      if (!["SKILL.md", "README.md", "CHANGELOG.md", "CLAUDE.md"].includes(name) && !/^project\.|^settings|^dev-workflow|^marketplace|^plugin/.test(name) && !existsSync(join(root, "references", name)) && !/^\.?claude|\.local\.md$|^[a-z-]+\.(jsonl|json)$/.test(name)) {
        if (!/^(rubocop|eslint|tsconfig|lefthook|package)/.test(name) && !name.includes("<")) bad.push(`${f.replace(repoRoot + "/", "")}: ${name}`);
      }
    }
    for (const m of t.matchAll(/scripts\/([a-z0-9/-]+\.mjs)/g)) {
      if (!existsSync(join(root, "scripts", m[1]))) bad.push(`${f.replace(repoRoot + "/", "")}: scripts/${m[1]}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("no v1 Step numbering remains", () => {
  const bad = [];
  for (const [f, t] of texts) for (const m of t.matchAll(/\bStep \d+(\.\d+)?\b/g)) bad.push(`${f.replace(repoRoot + "/", "")}: ${m[0]}`);
  assert.deepEqual(bad, []);
});
