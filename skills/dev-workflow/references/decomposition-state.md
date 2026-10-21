# Decomposition state file

Read from `SKILL.md` Phase 2 (Task Decomposition) and Phase 19 (Completion), from `decomposition.md` § Propose a split, and from `plan-approval.md` § Branch action. Unqualified `§` references point into this file.

## State file

Path `.claude/plans/dev-workflow.<slug>.md`. YAML frontmatter plus a short human-readable body.

```yaml
---
parent_task: "<the user's request>"
slug: "<kebab-case>"
created_at: "<ISO 8601>"
pr_stack:                  # only when the user chose stacked PRs
  trunk: "<branch>"
  top: "<branch>"
subtasks:
  - id: 1
    title: "..."
    description: "..."
    verification_hint: "How completion is observed"
    depends_on: []
    status: pending        # pending | in_progress | completed
    pr: null               # URL string once known
    branch: null           # stacked PRs only: the subtask's branch once created
---
```

Validate on every read: the four top-level keys present, ids unique integers, `depends_on` only earlier existing ids with no cycles, every string non-empty except `pr` and `branch`, which may be null (a missing `branch` reads as null). With `pr_stack`, `trunk` and `top` are non-empty strings. Stop and report the first violation; the user repairs the file. Once resolved, hold the absolute path and use it for every later read, write, and delete. Never run two sessions against one state file.

## Resume

1. Resolve the argument, first hit wins: an existing path; `.claude/plans/<arg>`; `.claude/plans/dev-workflow.<arg>.md`. Not found → list `.claude/plans/dev-workflow.*.md` and stop.
2. A file with no frontmatter, or without `parent_task` / `subtasks`, is not a state file: say so, treat it as an inherited spec, set the effective task to its first heading or paragraph, and continue in Normal sub-mode without a state file.
3. Validate (§ State file).
4. Pick the subtask. All `completed` → go to § Finish a subtask's final step. No leftover `in_progress` → take the runnable frontier (`pending` with all dependencies `completed`); empty frontier → stop and report; one candidate, or none whose description carries a readiness condition ("resume only when X") → take the smallest id; otherwise ask the user to pick (USER GATE). Leftover `in_progress` entries → keep the runnable ones as candidates alongside the runnable `pending` ones, reset unrunnable leftovers to `pending`, and ask the user to pick when more than one remains. Mark the choice `in_progress`, write back. With `pr_stack`, run § Stacked PRs's "Resume" paragraph next.
5. Summarize which parent task resumes, which subtask is current, and its `verification_hint`. The subtask is the effective task; the parent text and sibling statuses are background context.

## Finish a subtask (Completion, decomposed runs only)

1. If work items were excluded or deferred during this run and live only in prose, ask the user per item: add as a new `pending` subtask (with `depends_on` when order matters), merge into an existing pending subtask, or accept as out of scope. Items left in prose are invisible to `--resume`.
2. Mark the subtask `completed`; write back.
3. Ask for an optional PR URL (USER GATE); set `pr` when given. With `pr_stack`, § Stacked PRs's "Finish" paragraph replaces this step and adds to steps 4–5.
4. Find the next runnable subtask. If one exists and `landed_count > 0`: tell the user to open a PR for this run's commits, then start a new session with `--resume <slug>`. If one exists and `landed_count` is 0: tell the user to commit and open a PR first, because the next run takes a fresh `<base-commit>` and uncommitted changes would end up in the next subtask's diff. Add, when rule files remain uncommitted, that those need committing too. Never push outside `submit` in § Stacked PRs's "Finish" paragraph.
5. If no subtask remains: `rm -f <state-file path>` and list every subtask's title and `pr` in the summary.

## Stacked PRs

Used when a decomposed run's Branch choice is `stack` (`plan-approval.md` § Branch action). A `git switch` or `gh stack` command that fails is retried once after 1–2 seconds; `<reason>` is its last non-empty stderr line cut to 80 chars, or `(no stderr)`. Do not auto-recover (no force push, no rebase, no branch rename). When the retry fails too: at **Start**, say `stack-record-failed (<reason>)` in one line and leave `pr_stack` unwritten; at **Resume**, stop with `<reason>`, leaving the state file as last written; at **Finish**, say `submit-failed (<reason>)` in one line and continue. A subtask's branch is `<slug>-<id>`, with `-2`, `-3` appended while `git rev-parse --verify -q refs/heads/<name>` finds one.

**Start** (after the Branch action's `gh stack` command created this run's branch): run `gh stack view --json`, write `pr_stack` with `trunk` = its `trunk` and `top` = the current branch, and set the current subtask's `branch` to the current branch.

**Resume**:

1. Before the first `git switch` below (none when already on the subtask's `branch`), run `git status --porcelain=v1 --untracked-files=all -z` once. When anything outside `SKILL.md` § Workflow artifacts is listed, stop: switching branches would carry those changes into this subtask. Ask the user to commit or stash them and resume again.
2. The subtask has a `branch` (an earlier run of it stopped): `git switch <branch>` unless already on it, then go to step 4.
3. No `branch`, in this order:
   1. Note whether the current branch is `<trunk>`.
   2. `<top>` exists locally → `git switch <top>` unless already on it, then `gh stack view --json`.
   3. `<top>` missing locally, or `isMerged` on it → when the noted branch was `<trunk>`, `git switch <trunk>` and `gh stack init --base <trunk> <branch>`, then go to step 6; otherwise stop and tell the user to switch to `<trunk>`, pull it, and resume again.
   4. Any branch has `needsRebase` → stop. Tell the user to run `gh stack sync` (it rebases the stack and pushes it) and resume again. Never run sync or rebase here.
   5. Otherwise `gh stack add <branch>`.
   6. Set the subtask's `branch` and `pr_stack.top` to the new branch and write back.
4. When `git rev-parse HEAD` now differs from `<base-commit>`, re-record `<base-commit>` and `<start-tree>` per `SKILL.md` Phase 1 (Load Settings) step 3.

**Finish**: when `landed_count` is 0, skip the gate. Otherwise ask `submit` / `later` (USER GATE). Say that `submit` runs `gh stack submit --auto`, which pushes every branch of the stack and opens a draft PR for each branch without one.

- `submit`: run it. Set `pr` on each subtask whose `branch` has a PR URL in the output.
- `later`: show `gh stack submit`.
- In § Finish a subtask step 4 (next runnable subtask), when `landed_count > 0`, say instead that `--resume <slug>` can start right away on top of this branch, pushed or not.
- In § Finish a subtask step 5 (no subtask remains), add that `gh stack view` shows the stack and its PRs.
