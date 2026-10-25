---
name: skill-shrink
description: Collapse pass over a distributed skill's read path (SKILL.md plus references/*.md) — delete rationale clauses, restated directives, and phase summaries that repeat the reference they point to; keep every directive; check each borderline sentence's origin with git log -S; then ratchet the size budgets down, sync the bundle copy, and run the tests. Use when triage-review reports a size drift, or on request ("dev-workflow を小さくして"). Project-local routine — not for marketplace distribution.
allowed-tools: Read, Edit, Grep, Glob, Bash(wc -m *), Bash(git log *), Bash(git diff *), Bash(git grep *), Bash(git show *), Bash(cp -R *), Bash(diff -rq *), Bash(node --test *), Bash(jq *)
---

# Skill shrink

Input: a skill directory under `skills/` (default `skills/dev-workflow`). Output: edits in the working tree, the size budgets ratcheted down, the bundle copy synced, the test suite green. Commits, the version bump, and the CHANGELOG entry are left to the caller (a `dev-workflow` run or the operator).

## What to delete

Decide sentence by sentence. Delete only:

- a rationale tail on an unconditional directive (`because …`, `so that …`, `which would …`), and a parenthetical that explains a mechanism rather than giving an instruction;
- a second phrasing of a directive already stated in the same file;
- a phase summary in SKILL.md that repeats what the reference it points to says; keep the pointer and the user-gate marker;
- a sentence that describes what a sibling file does internally.

Keep every sentence that changes what the agent does at runtime, even when it reads as emphasis. Before deleting a borderline sentence, run `git log -S"<distinctive phrase>" --format='%h %s' -- <skill dir>`: when the introducing commit is a `fix(...)` or a triage commit, the sentence encodes an observed failure — compress its wording and keep its directive.

## What never changes

- the `## Dispatch authorization` section (byte-identical across the bundle; `run-tests` Check 7 compares it);
- every `## ` / `### ` heading, and every bold label referenced as `§ <Heading>'s "<label>" paragraph` or by its sentence content (grep `'s "` and `§ ` across the skill first);
- in `dev-workflow/SKILL.md`, at most one `mob mode` mention per phase;
- the directives `project.rules.md` § 非対話ルーチンの停止防止 asks for (pre-invocation and return-point reminders).

## Procedure

1. Measure with `wc -m` (never `wc -c`): SKILL.md, each reference, and the groups `tests/dev-workflow/skill-size.test.mjs` counts.
2. Read SKILL.md and every reference. List the candidates with the file, the sentence, and the rule above that admits it.
3. Check the origin of each borderline candidate as described, then apply the edits with `Edit`.
4. A section that only some runs use (a gate on a setting, a path taken on one tier) is a structural candidate: move its body to its own `references/<name>.md`, read at the branch that needs it, leave the section label and a one-line pointer behind, and add the file to the conditionally-read set in the size test. Say so in the report; it is a separate decision from the deletions.
5. Re-measure; set each budget in the size test to the measured size rounded up to the next 100. Never raise a budget.
6. `cp -R skills/<name>/. plugins/dev-workflow-bundle/skills/<name>/` for a bundle member, then `diff -rq` the two trees.
7. `node --test $(find tests -name '*.test.mjs')` — fix an anchor the reference test reports, never the test.
8. Report: a before/after table of the measured sizes, the deletions grouped by rule, the sentences kept after an origin check, and the structural candidates found.
