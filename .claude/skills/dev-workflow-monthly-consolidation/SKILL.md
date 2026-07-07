---
name: dev-workflow-monthly-consolidation
description: Monthly maintenance routine for dev-workflow's char-budget health (G2b — "reduce what already exists", the counterpart to G2a's "stop growing" cap and A1's "reduce via structure"). Consolidates duplicate reminders in `skills/dev-workflow/SKILL.md` / `references/*.md`, re-audits intentional reinforcement-by-repetition, converts synonymous prose to cross-references, re-opens `dev-workflow-triage` issues that were deferred by the char-budget gate, dispatches `Skill(verify-skill-refs)` for governed-site enumeration drift, and checks G4 history-note sunset eligibility. Project-local routine — not for marketplace distribution. Trigger manually (`/dev-workflow-monthly-consolidation`) on a monthly cadence, or sooner when `dev-workflow-triage`'s summary reports a growing `budget-deferred (skipped, awaiting headroom)` count.
allowed-tools: Read, Grep, Glob, Edit, Skill(verify-skill-refs), Bash(wc -m *), Bash(git diff *), Bash(git add *), Bash(git commit *), Bash(git checkout HEAD -- *), Bash(git reset *), Bash(git rev-parse *), Bash(cp -R *), Bash(jq *), mcp__github__list_issues, mcp__github__issue_read, mcp__github__issue_write
---

# dev-workflow Monthly Consolidation

It is a **project-local** skill (lives under `.claude/skills/dev-workflow-monthly-consolidation/`, not registered in `.claude-plugin/marketplace.json`).

## Purpose

`skills/dev-workflow/SKILL.md` and its `references/*.md` grow continuously (+53% over 3 weeks, observed 2026-07-02). Three countermeasures work together: **G2a** (the `dev-workflow-triage` char-budget gate) stops runaway growth, **A1** reduces the total through structural extraction/compression, and **G2b** — this skill — periodically reduces what already exists (duplicate reminders, stale cross-references, prose that repeats the same point in multiple places). Reference: `.claude/plans/dev-workflow-improvement-ideas.md` § G2b / § G4.

## Trigger

- Monthly, as a rough cadence (30 days — a discretionary starting point, adjust from operational experience), **or**
- Sooner, when `dev-workflow-triage`'s run summary shows the `budget-deferred (skipped, awaiting headroom)` count reaching 3 or more (also discretionary)

## Owner

Manual invocation (`/dev-workflow-monthly-consolidation`). Scheduling this via `/schedule` (a cron-based routine) is left to the repo operator's discretion — this skill does not register a schedule itself.

## No-Stall Principle

The generic regimen (sub-skill return discipline, non-fatal error handling, no standalone waiting turns) is defined in `dev-workflow-triage`'s SKILL.md § No-Stall Principle and applies here without modification. This skill's own delta:

**Zero designed user-gate points** (same shape as `triage-review`): there is no interactive user-gate between checklist item 1 and item 7's write-back — each item records its outcome and moves to the next in the same turn; a single summary is emitted at the end.

**Fatal-abort exits**: none. Every failure mode this skill can hit is non-fatal — see below.

**Non-fatal error classes** (record and continue through to item 7's write-back): the § Step 3.7 — Release bookkeeping procedure's own failure branches (version-skew guard, invalid JSON, CHANGELOG edit error, scope leak, commit error) all `record release-bookkeeping=failed (<reason>)` and proceed rather than aborting the routine — the same disposition `dev-workflow-triage` gives them, since Step 3.7 is a once-per-run sub-procedure with no "next Finding" to retry into; item 4's `mcp__github__*` calls failing for a given issue (`label-failed`, per `dev-workflow-triage`'s own disposition for the same operation); item 5's `Skill(verify-skill-refs)` dispatch failing to return a parseable verdict (record `verify-skill-refs-failed` and continue to item 6 — do not abort the run for a detect-only sub-skill's dispatch failure).

This skill does not use `TodoWrite` — its 7 checklist items run sequentially within a single turn with no sub-agent progress to track, unlike `dev-workflow-triage`'s per-issue loop.

## GitHub access path

Every `SonicGarden/dev-workflow-issues` operation in this skill uses the `mcp__github__*` tools listed in frontmatter — never `gh` CLI. See `dev-workflow-triage`'s SKILL.md § Step 1 — Pre-flight's "GitHub access path" note for why (a documented Claude Code on the Web breakage). This skill supports the same non-interactive / cron-triggered execution mode, so it follows the same tool path.

## Checklist

1. **Pre-flight**: `Read` `skills/dev-workflow/SKILL.md` and each `skills/dev-workflow/references/*.md` file once, and record their current char counts (`wc -m`) for the summary's before/after delta. Items 2, 3, and 6 below all judge this same read, so do not re-read/re-grep the file set per item.
2. **Build the intentional-duplication list, then consolidate everything else**: from the Pre-flight read, first list every site explicitly marked as intentional reinforcement-by-repetition (e.g. "the abstract enumeration in § No-Stall Principle is intentionally duplicated here so the rule fires at the decision moment") and re-judge each — if the decision-moment justification has weakened (e.g. the callee's own return contract now makes the reminder redundant), mark it for consolidation too; otherwise keep it and record why. Then find reminder text repeated verbatim or near-verbatim elsewhere (not on that list) and consolidate each to one canonical location, replacing the others with a stable-phrase-anchor cross-reference. Building the intentional-duplication list first avoids consolidating a site that the next check would have told you to keep.
3. **Convert synonymous prose to cross-references**: find passages in different sections that explain the same concept in different words, and reduce to one canonical explanation plus cross-references from the others (see `.claude/rules/project.rules.local.md`'s "Token defined-once + cross-reference" pattern).
4. **Re-open budget-deferred issues** (independent of items 2/3 — this is a GitHub lookup with no dependency on the local-file consolidation, so it may run before or concurrently with them): call `mcp__github__list_issues` (`owner=SonicGarden`, `repo=dev-workflow-issues`, label filter `budget-deferred`) to fetch issues deferred by the char-budget gate. For each issue this pass created headroom for, call `mcp__github__issue_read` then `mcp__github__issue_write` (read-then-write, so the label update never silently replaces the issue's other labels) to remove the `budget-deferred` label — this returns the issue to `dev-workflow-triage`'s processable set on its next run. Zero matching issues is a normal outcome (no-op), not a failure.
5. **Governed-site enumeration check**: dispatch `Skill(verify-skill-refs)` against `skills/dev-workflow/` and consume its Class (d) findings (governed-site enumeration gaps — the manifest already includes a `subagent-model-read-sites` row) rather than hand-auditing `subagent_model` or other governed-key enumerations here. Record any reported gap. **Return-point reminder**: regardless of outcome (findings reported, no gaps, or a dispatch failure per § No-Stall Principle), proceed directly to item 6 in the same turn — do not pause on the verdict.
6. **G4 history-note sunset check**: for each Configuration bullet carrying a version-tagged history note (`Behavior change from vX.Y.Z`, `(History: v... )`), find that flag's actual **default-flip** version in `CHANGELOG.md` — search for a `flip the <flag> default` entry; do **not** anchor on an earlier version mentioned only inside the `(History: ...)` parenthetical (introduction / gating changes that happened before the default actually flipped). The flip version's release date is the `## YYYY-MM-DD` heading under which that CHANGELOG entry sits. Compute days elapsed since that date. A note is sunset-eligible only when both hold: (a) ≥ 4 weeks (28 days) have elapsed, and (b) the Configuration bullet's current-behavior description still reads coherently with the version references removed. Eligible notes: strip the version-tagged history clause, keeping the current-behavior description intact.
7. **Write back results**: record what changed (or that nothing changed) — checklist items applied, char-count delta, re-opened issue count, verify-skill-refs findings, any G4 sunset applied — in `.claude/plans/dev-workflow-improvement-ideas.md` § G2b.

## Editing `skills/dev-workflow/` (checklist items 2 / 3 / 6 — item 5 is detect-only and only records verify-skill-refs findings, it never edits)

Any edit to `skills/dev-workflow/SKILL.md` or `references/*.md` is a distributed-skill change. Follow `dev-workflow-triage`'s SKILL.md § Step 3.7 — Release bookkeeping procedure (version-skew guard, `Edit`-based `marketplace.json` bump, `jq empty`, CHANGELOG prepend, bundle-copy sync via `cp -R`) verbatim, with two substitutions specific to this skill: the commit subject is `chore(release): bump dev-workflow / dev-workflow-bundle (monthly-consolidation YYYY-MM-DD)` (per `.claude/rules/project.rules.local.md`'s bookkeeping-commit convention), and this skill has no per-Finding commit loop to separate the bookkeeping commit from — it is simply the one commit for this run's edits. `git add` is scoped to the exact paths this run touched (`.claude-plugin/marketplace.json`, `CHANGELOG.md`, the edited `skills/dev-workflow/` files, and their bundle copies) — never `git add -A` / `git add .`, per this repo's pathspec-scoping convention for bookkeeping commits. "Verbatim" includes § Step 3.7's failure-recovery branches (`git checkout HEAD -- <paths>` on invalid JSON / CHANGELOG edit error / scope leak, `git reset` + `git checkout HEAD -- <paths>` on a non-zero-exit commit) — this is why `Bash(git checkout HEAD -- *)` / `Bash(git reset *)` are granted above even though this section's prose does not restate those branches' commands inline.

When no `skills/dev-workflow/` edit landed this run (items 2/3/6 all found nothing to change), skip this sub-procedure entirely.
