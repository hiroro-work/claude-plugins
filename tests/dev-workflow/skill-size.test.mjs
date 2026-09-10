// dev-workflow exists to stay small. dev-workflow grew from the same shape to 98k
// characters one added sentence at a time, so the budget is enforced here rather than by
// review. Test names matter: dev-workflow-triage (§ 3.4 (a.5)) recognizes a size assertion
// by the words "budget" or "thin entry point" in the failing test name — rename in both places. Mob-mode content lives in references/mob-mode.md; SKILL.md may point at it from
// a phase with at most one sentence, and never describe the mode's behavior itself.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const skill = readFileSync(join(repoRoot, "skills", "dev-workflow", "SKILL.md"), "utf8");

test("SKILL.md stays under the character budget", () => {
  const chars = [...skill].length;
  // 26k → 27k → 28k: each raise paid for features the maintainers chose (mob mode, retrospective, timing,
  // background reviews, tier re-check, subagent_model) and the bundle's Dispatch authorization section (28k → 29k),
  // never for prose; the ratchet still stops drift. 29k → 29.2k: paid for the gate-reply rule (v2.1.5).
  assert.ok(chars <= 29200, `SKILL.md is ${chars} chars; budget is 29200 — cut, do not move to references`);
});

// Budgets are ratchets, not derived values: each was set at "current size plus a margin" when
// introduced, so that growth needs a deliberate commit that changes the number here.
test("SKILL.md plus the reference tree stays under the tree budget", () => {
  const dir = join(repoRoot, "skills", "dev-workflow", "references");
  // mob-mode.md has its own budget below. crit-gate.md, plan-artifact.md, and
  // decomposition-state.md were split out of the default read path and are opened only by
  // commit_review_gate: crit, plan_artifact: share/review, and a decomposed run — excluding
  // them is what keeps this number tracking what a default run reads. Some counted files are
  // conditional too (init-mode, self-retrospective, workability, decomposition), so the total
  // is an upper bound on any one run.
  const excluded = new Set(["mob-mode.md", "crit-gate.md", "plan-artifact.md", "decomposition-state.md"]);
  const refs = readdirSync(dir).filter((f) => f.endsWith(".md") && !excluded.has(f));
  const total = [...skill].length + refs.reduce((n, f) => n + [...readFileSync(join(dir, f), "utf8")].length, 0);
  assert.ok(total <= 72700, `SKILL.md + counted references total ${total} chars; budget is 72700`);
});

// The files split out of the default read path keep a ratchet of their own, so text moved
// there is still bounded rather than free.
test("the conditionally-read references stay under their own budget", () => {
  const dir = join(repoRoot, "skills", "dev-workflow", "references");
  const total = ["crit-gate.md", "plan-artifact.md", "decomposition-state.md"]
    .reduce((n, f) => n + [...readFileSync(join(dir, f), "utf8")].length, 0);
  assert.ok(total <= 9500, `the conditionally-read references total ${total} chars; budget is 9500`);
});

test("mob-mode.md stays under its own budget", () => {
  const chars = [...readFileSync(join(repoRoot, "skills", "dev-workflow", "references", "mob-mode.md"), "utf8")].length;
  // 12k → 13k: paid for the content-based checkpoint segmentation rule (v2.1.3).
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
