// Size budgets for dev-workflow. dev-workflow-triage (§ 3.4 (a.5)) recognizes a size assertion by the
// words "budget" or "thin entry point" in the failing test name — rename in both places.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const skill = readFileSync(join(repoRoot, "skills", "dev-workflow", "SKILL.md"), "utf8");

test("SKILL.md stays under the character budget", () => {
  const chars = [...skill].length;
  assert.ok(chars <= 29800, `SKILL.md is ${chars} chars; budget is 29800 — cut, do not move to references`);
});

// Budgets are ratchets: raise deliberately, in a commit that changes the number here.
test("SKILL.md plus the reference tree stays under the tree budget", () => {
  const dir = join(repoRoot, "skills", "dev-workflow", "references");
  // mob-mode.md has its own budget below; crit-gate.md, plan-artifact.md and decomposition-state.md are
  // outside the default read path and counted separately.
  const excluded = new Set(["mob-mode.md", "crit-gate.md", "plan-artifact.md", "decomposition-state.md"]);
  const refs = readdirSync(dir).filter((f) => f.endsWith(".md") && !excluded.has(f));
  const total = [...skill].length + refs.reduce((n, f) => n + [...readFileSync(join(dir, f), "utf8")].length, 0);
  assert.ok(total <= 73000, `SKILL.md + counted references total ${total} chars; budget is 73000`);
});

test("the conditionally-read references stay under their own budget", () => {
  const dir = join(repoRoot, "skills", "dev-workflow", "references");
  const total = ["crit-gate.md", "plan-artifact.md", "decomposition-state.md"]
    .reduce((n, f) => n + [...readFileSync(join(dir, f), "utf8")].length, 0);
  assert.ok(total <= 11100, `the conditionally-read references total ${total} chars; budget is 11100`);
});

test("mob-mode.md stays under its own budget", () => {
  const chars = [...readFileSync(join(repoRoot, "skills", "dev-workflow", "references", "mob-mode.md"), "utf8")].length;
  assert.ok(chars <= 13200, `mob-mode.md is ${chars} chars; budget is 13200 (read only in mob mode)`);
});

test("mobpro stays a thin entry point", () => {
  const wrapper = readFileSync(join(repoRoot, "skills", "mobpro", "SKILL.md"), "utf8");
  const chars = [...wrapper].length;
  assert.ok(chars <= 3000, `mobpro/SKILL.md is ${chars} chars; budget is 3000 — mob behavior belongs in dev-workflow/references/mob-mode.md`);
});

test("each phase mentions mob mode at most once", () => {
  const phases = skill.split(/^## Phase /m).slice(1);
  for (const body of phases) {
    const title = body.split("\n")[0];
    const mentions = body.match(/mob mode/gi) ?? [];
    assert.ok(mentions.length <= 1, `Phase ${title} mentions mob mode ${mentions.length} times`);
  }
});
