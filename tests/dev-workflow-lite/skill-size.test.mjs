// dev-workflow-lite exists to stay small. dev-workflow grew from the same shape to 98k
// characters one added sentence at a time, so the budget is enforced here rather than by
// review. Mob-mode content lives in references/mob-mode.md; SKILL.md may point at it from
// a phase with at most one sentence, and never describe the mode's behavior itself.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const skill = readFileSync(join(repoRoot, "skills", "dev-workflow-lite", "SKILL.md"), "utf8");

test("SKILL.md stays under the character budget", () => {
  const chars = [...skill].length;
  assert.ok(chars <= 26000, `SKILL.md is ${chars} chars; budget is 26000 — cut, do not move to references`);
});

test("each phase mentions mob mode at most once", () => {
  const phases = skill.split(/^## Phase /m).slice(1);
  for (const body of phases) {
    const title = body.split("\n")[0];
    const mentions = body.match(/mob mode/gi) ?? [];
    assert.ok(mentions.length <= 1, `Phase ${title} mentions mob mode ${mentions.length} times`);
  }
});
