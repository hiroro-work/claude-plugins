# Plan approval surfaces

Read from `SKILL.md` Phase 5 (Plan Approval) and from `plan-artifact.md` § Team-review gate. Unqualified `§` references point into this file.

When the resolved `plan_artifact` is not `off`, either gate states in one line, before it waits: approving publishes the plan as a shared page, together with the exchange that shaped it, quoting the person's own words.

## Files

All under `.claude/plans/`, all workflow artifacts: `<slug>.plan-review.md` (served copy = the plan plus figures), `<slug>.plan-review.prev.md` (previous served copy), `<slug>.figures.md`, and, written by the viewer, `<slug>.plan-review.comments.json`, `<slug>.plan-review.thread.json` (the workflow fills only `reply` and `disposition` in it), `<slug>.plan-review.url`. The canonical plan is never written from the served copy.

## Browser gate

Read `browser-gate.md` and follow its § Browser gate; it returns `approve`, `rewrite-approach`, `wrong-branch`, or `fallback`.

## Chat gate

Add one line saying that approving runs the chosen branch command. Naming a Branch choice is not approval; a reply that also approves chooses it, swapping it with the Recommendation, and an unoffered choice is asked about again.

Render the plan per `plan-format.md`'s "Presentation at Plan Approval" paragraph. The review-status sentence is one of: `reviewed in Plan Review (full scope)`; `Plan Review ran in rules-only scope — only .claude/rules/ compliance was reviewed, so the design and completeness of this plan reach you unreviewed.`; `Plan Review found no project rules to check and did not run — this approval is the sole review.`; `not reviewed (Trivial tier)`; `not reviewed (fast mode)`. If a served copy exists when a chat-path revision is applied, `rm -f` it.

## Branch action

Runs the Branch section's Recommendation, the approved choice, just before Implement. A plan without a parseable Branch section counts as `stay` off the default branch and as `new` on it, with the `new` command `plan-format.md`'s Branch item defines; say so in one line.

- `stay`, or a `new` / `stack` whose branch is already checked out: nothing.
- `new` / `stack`: run the command the Branch section gives. With a decomposition state file and no `pr_stack`, `stack` continues with `decomposition-state.md` § Stacked PRs's "Start" paragraph. Both branch from HEAD, so `<base-commit>` stays.

A failing command here or in the "Wrong branch" paragraph is retried once after 1–2 seconds; `<reason>` is its last non-empty stderr line cut to 80 chars, or `(no stderr)`. When the retry fails too, stop with its `<reason>`. Do not auto-recover (no force push, no rebase, no branch rename).

**Wrong branch**: the user asks to work on another existing branch. When `git status --porcelain=v1 --untracked-files=all -z` lists anything outside `SKILL.md` § Workflow artifacts, wait for them to commit or stash it. Otherwise `git switch <branch>`, re-record `<base-commit>` and `<start-tree>` per `SKILL.md` Phase 1 (Load Settings) step 3, and return to Create Plan; Plan Review re-runs once unless skipped this run.
