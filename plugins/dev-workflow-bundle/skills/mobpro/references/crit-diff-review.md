# mobpro M6 Diff Review — crit surface

The `crit` half of M6's diff review. [`diff-review.md`](diff-review.md) § crit path delegates here once both its probes clear.

## Reused parts of `crit-commit-review.md`

Read `../dev-workflow/references/crit-commit-review.md` and reuse the parts below, substituting M6's own range endpoints for its own; those endpoints are defined by [`diff-review.md`](diff-review.md) § Per-unit review range. Read `crit-commit-review.md`'s "Step 10 run" scope as **the M6 loop**. `Keep the pointers below in sync with ../dev-workflow/references/crit-commit-review.md § Procedure and § Story prologue — they name that file's steps and sections and describe their content, so a renumbering or a change of what a step does lands here too. This file's own § Decision mapping below names that file's § Round re-verification weight as well; keep that name resolvable.`

- **§ crit CLI contract** — the CLI facts, the `--range` mode rationale, the read-both-streams `approved:` rule, and the no-`--no-open` / no-`--quiet` finding.
- **§ Story prologue** — run over the same `<m6_review_base>..<unit_obj>` endpoints, immediately before the launch below. One substitution: M6 lands no commit, so the prose comes from this unit's point — the sentence [`learning-gates.md`](learning-gates.md) § A's "Opening the review" paragraph has the AI state — in place of a commit subject and body.
- **§ Procedure step 3's per-round launch** — launching `crit --range <m6_review_base>..<unit_obj>` as **background Bash**, never the `Agent` tool (`SKILL.md` § Direct Agent dispatch sites). Substitute both endpoints that step otherwise takes from `interactive-commits.md`'s per-commit candidate — a sub-step M6 never runs: `<pre_round_head>` = `m6_review_base`, and `<round_commit>` = `<unit_obj>` from [`diff-review.md`](diff-review.md) § Per-unit review range.
- **§ Procedure step 4's "Read the decision" step** — read the decision from both captured streams. M6's staged paths are cleared once at M6 exit per [`diff-review.md`](diff-review.md) § Per-unit review range.
- **§ Procedure step 6's "No machine iteration cap" note** — each round blocks on a real browser submit, so the loop is human-paced.

## Decision mapping

M6 substitutes this for that file's **§ Procedure step 5's per-commit decision mapping**, whose `accept` / `adjust` / `cancel` dispositions have nothing to act on where no commit lands. The substitution also drops that step's per-round re-verification (that file's § Round re-verification weight, which only that step enters) — M8 and M9 both run *after* the whole M6 loop, so there is nothing to re-run mid-loop. Evaluate in order, first match wins:

- **Non-zero exit, or no parseable `approved:` line** → this unit alone renders on the chat surface ([`diff-review.md`](diff-review.md) § Display surface's `diff` bullet). The cached availability answer is **not** cleared, so crit is used again for the next unit.
- **`approved: true`** → the review is done; advance and move to the next unit. Accompanying comments are advisory.
- **`approved: false` with comments** (either `scope`, or both in one round) → handle **every** comment the round carries, regardless of `scope`: `scope` says where the comment is anchored, not whether it asks for code to change. Apply the requested code edit for each comment that asks for one, and answer each that only asks a question — explaining every fix and every answer within [`learning-gates.md`](learning-gates.md) § D (explanation length discipline), the same split § A's "Change requests raised during the review" paragraph draws. Then rebuild `<unit_obj>` from the files as they now stand and start a new round.
- **`approved: false` with no comments** → start a new round from the unchanged files, communicating that the submit had no effect.
