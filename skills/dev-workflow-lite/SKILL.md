---
name: dev-workflow-lite
description: Guided development workflow with the same phases as dev-workflow — task decomposition, planning, peer plan review, approval, implementation, tidy, prose polish, check/test, rules compliance review, code review, completion hooks, interactive commits, rule updates — with a fixed difficulty-skip table, browser plan review, plan artifacts, an optional mob mode for a junior navigator, and a growth-controlled self-retrospective; no executors. Runs the same way every time so a junior engineer can follow along. Use when the user wants a feature built, a bug fixed, or code refactored.
allowed-tools: Agent, Read, Write, Edit, Glob, Grep, TaskCreate, TaskUpdate, TaskList, AskUserQuestion, Artifact, Skill(artifact-design), Skill(ask-peer), Skill(ask-claude), Skill(ask-codex), Skill(ask-gemini), Skill(ask-copilot), Skill(ask-agy), Skill(simplify), Skill(tidy), Skill(prose-polish), Skill(rules-review), Skill(extract-rules), Skill(run-tests), Bash(pwd), Bash(mkdir -p .claude/plans), Bash(cp .claude/plans/*), Bash(rm -f .claude/plans/*), Bash(node *), Bash(printenv CLAUDE_CODE_REMOTE), Bash(crit *), Bash(test -f *), Bash(pnpm run *), Bash(pnpm exec *), Bash(npm run *), Bash(yarn run *), Bash(bun run *), Bash(bundle exec *), Bash(make lint *), Bash(make format *), Bash(make test *), Bash(make typecheck *), Bash(make check *), Bash(python -m pytest *), Bash(poetry run *), Bash(uv run *), Bash(cargo test *), Bash(cargo clippy *), Bash(cargo fmt *), Bash(go test *), Bash(go vet *), Bash(git status *), Bash(git symbolic-ref -q *), Bash(git rev-parse *), Bash(git merge-base *), Bash(git remote show *), Bash(git switch *), Bash(git diff *), Bash(git add *), Bash(git reset -- *), Bash(git commit *), Bash(LEFTHOOK=0 git commit *), Bash(git write-tree), Bash(git commit-tree *), Bash(git read-tree *), Bash(git update-ref *), Bash(git rev-list *), Bash(git worktree *), Bash(git branch -D *), Bash(GIT_INDEX_FILE=* git read-tree *), Bash(GIT_INDEX_FILE=* git add *), Bash(GIT_INDEX_FILE=* git write-tree), Bash(git -C .git/dev-workflow-lite-wt *), Bash(GIT_SEQUENCE_EDITOR=true GIT_EDITOR=true git -c commit.gpgsign=false -C .git/dev-workflow-lite-wt rebase *), Bash(rm -rf .claude/plans/*.absorb), Bash(rm -f .claude/plans/*.retrospective.md), Bash(test -d .git), Bash(gh auth status), Bash(gh api --method POST /repos/*/issues *), Bash(jq *), Bash(git log *), Bash(git ls-files *)
---

# Dev Workflow Lite

```text
/dev-workflow-lite --init                 # Detect check/test commands, write settings, generate run-tests
/dev-workflow-lite [--fast|--deep] [--artifact off|share|review] [--mob] <task>                 # Run the workflow
/dev-workflow-lite --resume <state-file> [--fast|--deep] [--artifact off|share|review] [--mob]  # Run the next subtask of a decomposed task
```

Eighteen phases, always in this order, always all registered. Which phases are skipped, and how Plan Review runs, is decided by one table (§ Difficulty and the skip table) plus the run mode and four settings, and changes at most once, at the tier re-check after Create Plan. User gates are listed in § User gates; nothing else asks the user a question.

## Settings

Three files, YAML frontmatter only, merged lowest to highest: `~/.claude/dev-workflow.local.md`, `.claude/dev-workflow.md`, `.claude/dev-workflow.local.md`. If none exists, tell the user to run `--init` and stop. A file with malformed frontmatter is skipped with a one-line warning.

Merge rules per key, in order: `null` or an empty value in a higher layer clears the key; an absent key inherits; scalars replace; `check_commands` appends (lower first, duplicates removed); `test_commands` replaces as a whole list; `hooks.on_complete` appends.

| Key | Default | Meaning |
|---|---|---|
| `reviewer` | `ask-peer` | Reviewer skill for Plan Review and Code Review. One of ask-peer / ask-claude / ask-codex / ask-gemini / ask-copilot / ask-agy; anything else falls back to `ask-peer` |
| `code_review` | `true` | Whether Code Review runs |
| `polish_prose` | `true` | Whether Polish Prose runs |
| `language` | see below | Language of everything the user reads |
| `check_commands` | none | Shell commands (lint / format / typecheck), run in order |
| `test_commands` | `["Skill(run-tests)"]` | `Skill(<name>)` entries, run in order |
| `hooks.on_complete` | none | `Skill(<name>)` or shell command strings, run as Completion Hooks |
| `plan_artifact` | `off` | `off` / `share` / `review`: publish the approved plan as a claude.ai artifact, and with `review` wait for the team's comments. `--artifact` overrides per run |
| `commit_review_gate` | `diff` | `diff` / `crit`: how each commit's diff is shown at Interactive Commits. `crit` opens the crit browser reviewer |
| `mode` | `solo` | `solo` / `mob`. `mob` is the learning-oriented run for a junior navigator: same phases and gates, plus the stops and narration `references/mob-mode.md` defines. `--mob` sets it for one run |
| `self_retrospective.feedback` | none | Where Self-Retrospective posts its Findings: GitHub `owner/repo`, or a local directory path. Unset skips the phase |
| `timing.report_dir` | none | Directory that receives each run's per-phase timing report (wall / waiting / active). The table is always shown at Completion; this only persists it |
| `custom_instructions` | none | Free-form development guidance (for example "Always use TDD") followed at Create Plan, Implement, and Tidy and handed to both reviewers. `.claude/rules/` and the user's explicit requests win on conflict |

`language` resolves as: merged settings → `language` in `~/.claude/settings.json` → `ja`. Headings, phase names, commit messages, diffs, and paths stay as written; prose follows it. Keys this skill does not read are named once at Load Settings and ignored.

## Callee failure rule

When a `Skill(...)` call fails, retry once. If it fails again: for the `reviewer` skill, ask the user to pick switch reviewer / self-review inline / stop (a user gate); for any other skill, say so in one line, do that phase's work yourself, and continue. Record skipped callees for Completion.

## Difficulty and the skip table

The tier is assessed once, at Task Decomposition, from the effective task and cheap probes, per `references/tiers.md` § Tier criteria, and re-checked once at the end of Create Plan per its § Re-check after planning, where it can only rise. After that it never changes. Trivial and Simple are the **express lane**; Moderate and Complex are the **full lane**.

| Phase | Trivial | Simple | Moderate / Complex |
|---|---|---|---|
| Task Decomposition proposal | no | no | yes |
| Plan Review | skip | per run mode | per run mode |
| Tidy | skip | skip | run |
| Polish Prose | skip | skip | run (unless `polish_prose: false` or `--fast`) |
| Rules Compliance Review | skip | skip | run |
| Code Review | skip | run (unless `code_review: false`) | run (unless `code_review: false`) |
| Update Rules | skip | skip | run |

**Run mode** comes from the flags: `--fast`, `--deep`, or neither (`normal`). Both flags together is a fatal error. `normal`: Plan Review runs in **rules-only** scope. `deep`: Plan Review runs in **full** scope. `fast`: Plan Review is skipped, and so is Polish Prose. Nothing else reads the run mode.

Every other phase runs on every tier. Completion Hooks is skipped only when `hooks.on_complete` is unset, Self-Retrospective only when `self_retrospective.feedback` is unset. A skipped phase is marked `completed` with the description `skipped: <tier> tier`, `skipped: <key>: false`, or `skipped: fast mode` — settings- and run-mode-derived skips at Load Settings, tier-derived skips at Task Decomposition.

## User gates

The only places the workflow waits for the user:

- Task Decomposition: the split proposal (`yes` / `adjust` / `no`) and, on resume, the subtask picker when more than one is runnable.
- Plan Approval: the browser review (`approve` / `revise` with comments) on every tier but Trivial when a local browser is reachable; otherwise chat approval `approve` / `swap` (swap a Decision's Recommendation and Alternative) / `rewrite` / `withdraw`, plus the one-line read-back confirmation before a swap or rewrite is applied. With `plan_artifact: review`, the wait for the team's review of the published plan.
- Check / Test: after 3 failed fix rounds the workflow stops and reports (an error stop); a check command that rewrote files outside the task beyond trivial formatting, or a test skill's EXECUTION_ERROR, stops for the user.
- Code Review: findings still unresolved after the passes, asked once.
- Verify Fixes: rule violations still present after the second scoped pass, asked once.
- Interactive Commits: the stashing-hook question when a pre-commit hook exists and the plan has two or more commits; the commit plan; then each commit (`accept` / `adjust` / `cancel`, or the crit browser's approve / comments); `fold` / `defer` when a pre-commit hook modified files; `continue` / `stop` when the user made a behavioral edit during a gate.
- Update Rules: the confirm-remaining-steps question, then the rule commit.
- PR Rule Extraction: which PR to read (an empty answer declines), then the rule commit.
- Self-Retrospective: the preview of the Findings before posting (`approve` / `edit` / `skip`).
- Completion (decomposed runs only): the disposition of each work item left in prose, then an optional PR URL for the finished subtask.

In mob mode, `references/mob-mode.md` § Learning stops adds the per-unit diff review, the plan-building checkpoints, and the post-commit-note question to this list. The collect wait of `references/review-launch.md` § Collect is a harness-tracked boundary, not a gate. Everywhere else, judge callee results yourself and issue the next tool call immediately. A question or non-committal reply is never approval.

## Timing

Phase starts, ends, and waits are marked per `references/timing.md`; Completion renders the table.

## Workflow artifacts

Files this workflow writes as its own state are excluded from every diff, review payload, and commit: `.claude/plans/<slug>.md` (the plan), `.claude/plans/dev-workflow.<slug>.md` (decomposition state), `.claude/plans/rules-candidates-<date>.md`, `.claude/plans/timing-*.jsonl`, every other `.claude/plans/<slug>.*` staging file or directory (`.plan-review.*`, `.figures.md`, `.artifact.html`, `.absorb/`, `.retrospective.md`), and the git-side state `refs/dev-workflow-lite/<slug>`, `.git/dev-workflow-lite.index`, `.git/dev-workflow-lite-wt`. Everything else under the working tree is the task's.

## Mode detection

`--init` → read `references/init-mode.md` and follow it; the session ends there (generated skills are recognized from the next session). `--resume <state-file>` → Resume sub-mode. Otherwise Normal sub-mode. `--fast` / `--deep` set the run mode, `--artifact <value>` overrides `plan_artifact`, and `--mob` sets `mode: mob`; all combine with either sub-mode and are ignored under `--init`.

## Phase 1: Load Settings

1. Run `pwd`; confirm the repository root. Abort if `git symbolic-ref -q HEAD` exits non-zero (detached HEAD). Start the timing log (`references/timing.md` § Events, `--event start --new` for this phase).
2. Record `<base-commit>` = `git rev-parse HEAD`. Every later diff is against it. Note whether `test -d .git` succeeds; when it does not (a linked worktree), the snapshot chain of `references/snapshots.md` is not built this run.
3. Load and merge the settings; resolve the run mode, the `--artifact` override, and `mode`; emit `Output language: <value>`, `Run mode: <value>`, and `Mode: <value>`. In mob mode, read `references/mob-mode.md` now; in solo mode never open it.
4. Register the eighteen phases with `TaskCreate`, subjects exactly as the `## Phase N:` headings below minus the `Phase N:` prefix. Mark each `in_progress` on entry and `completed` on exit in the same tool-call burst as the phase's first or last action. Mark the phases skipped by settings or run mode `completed` here; tier-derived skips are marked at Task Decomposition.

## Phase 2: Task Decomposition

Read `references/decomposition.md`.

- **Resume sub-mode**: follow its § Resume. The selected subtask becomes the effective task.
- **Normal sub-mode**: assess the tier (`references/tiers.md`). On the full lane, follow § Propose a split; on `yes`, write the state file and take the first subtask as the effective task. On the express lane, or on `no`, the effective task is the request itself.

Emit one line: the tier and the phases it skips. Mark the skipped rows. In mob mode, apply `references/mob-mode.md` § Other differences to the split proposal.

## Phase 3: Create Plan

No code changes until Plan Approval passes.

1. Read the files the task touches. Use Glob / Grep / Read directly.
2. Draft the plan per `references/plan-format.md`: Review guide, Overview, Decisions, Build order, Test plan, Risks. Express-lane plans use the compact shape defined there.
3. Follow `custom_instructions` when set. Simplicity self-audit: every element traces to an explicit requirement, a known bug or constraint, a rule under `.claude/rules/`, or `custom_instructions`. Drop what does not, or add a one-line rationale. Verify every "already exists / reuses X" premise from the source. If the work splits into independently verifiable units and was not decomposed, say so in Risks.
4. Re-check the tier against the drafted plan (`references/tiers.md` § Re-check after planning): if it rises, say so in one line and reopen the rows the new tier runs.
5. Do not show the plan yet. Proceed to Plan Review. In mob mode, this phase runs as `references/mob-mode.md` § Design dialogue and writes its § Plan shape.

## Phase 4: Plan Review

Skipped on Trivial and in `fast` mode. One pass, no loop.

1. **Full scope** (`deep`): call `Skill(<reviewer>)` with the full plan body, `custom_instructions` when set, the Decisions field shape (Question / Recommendation / optional Alternative), and three review units: scope, feasibility, dependencies, `.claude/rules/` compliance (the reviewer lists and reads `.claude/rules/**/*.md`); the simplicity self-audit's conclusions; approach and alternatives, completeness, cross-section consistency. Ask for actionable findings only, or the words "No actionable findings".
   **Rules-only scope** (`normal`): resolve the reading list yourself — every `*.md` directly under `.claude/rules/` plus subdirectory files whose domain the plan touches — and call `Skill(<reviewer>)` with the plan body, that numbered list, and one unit: `.claude/rules/` compliance only, reading exactly the listed files and no other tool; anything it cannot confirm goes under an "unverified items" heading. If the glob finds no rule files, do not dispatch: say the review found no project rules to check and continue.
2. Apply findings you agree with; reject the rest with one line each. Do not ask the user about individual findings. Do not re-dispatch, with one exception: when Critical ≥ 3 or Critical + Major ≥ 10 and a finding proposes an approach-level alternative, rewrite the plan around it and dispatch one more pass.
3. Unresolved points are carried to Plan Approval as a short list. In mob mode, review through `references/mob-mode.md` § Plan shape's lenses and explain applied findings.

## Phase 5: Plan Approval

USER GATE. Read `references/plan-approval.md`.

1. Write the plan to `.claude/plans/<slug>.md` (`mkdir -p .claude/plans`). Slug: kebab-case of the effective task, ASCII only; on collision with a prior run's file append `-2`, `-3`. Resolve once per run.
2. **Browser gate** on every tier but Trivial when `printenv CLAUDE_CODE_REMOTE` is not `true`: follow § Browser gate. Its `approve` → step 4; `rewrite-approach` → rewrite the plan, re-run Plan Review once unless it is skipped this run, re-enter this phase; `fallback` → step 3.
3. **Chat gate** (Trivial, remote sessions, or fallback): present the plan per § Chat gate. Classify the reply: **approve** → step 4. **swap** (named Decisions items) → read back the interpretation in one line, wait for confirmation, swap Recommendation and Alternative on exactly those items, re-present. **rewrite** (Approach, Build order, or Scope changed) → read back, wait, rewrite the plan, re-run Plan Review once unless it is skipped this run, re-present. **withdraw** → stop; leave the plan file. **Anything else** (a question, a comment) → ask what was meant; never advance.
4. **Plan artifact**: when the resolved `plan_artifact` is `share` or `review`, follow § Plan artifact. `review` holds at its team-review gate (USER GATE) until the user says the team is done. Then Implement.

In mob mode, `references/mob-mode.md` § Plan Approval keeps the browser gate on every tier and adds the plan narration.

## Phase 6: Implement

1. Before the first edit, list any user-side manual actions the plan contains (external config, keys, probes) in one block.
2. Follow Build order in sequence, and `custom_instructions` when set. Read each file immediately before editing it. Content the user deleted earlier in the session never comes back.
3. A write to a path not in `git ls-files` must resolve inside the repository and under the directory the plan names for that kind of file; otherwise skip that edit with a one-line note and continue.
4. If a file outside the plan must change, add it to Build order first, then edit, and say so in one line.
5. After the last edit of each Build order step, take that step's snapshot per `references/snapshots.md` § Snapshot at a Build order step boundary (before step 1's snapshot, delete a leftover `refs/dev-workflow-lite/<slug>` from an earlier run). The chain is what Interactive Commits turns into one commit per step.
6. After the last edit, `git add -N -- <path>` for each new file outside § Workflow artifacts, so diff-based reviews and the snapshot residue see them.

In mob mode, each Build order step runs as a unit per `references/mob-mode.md` § Per-unit review, with its diff review after the snapshot.

## Phase 7: Tidy

Express lane skips. Call `Skill(simplify)`; if unavailable, `Skill(tidy)` with no base ref; pass `custom_instructions` as context when set. Either edits the tree itself. From here on, **no review layer grows a comment**: a finding whose fix adds, lengthens, or restores a comment is rejected with that reason. Correcting a false comment means replacing it with the shorter true statement. In mob mode, explain any cleanup per `references/mob-mode.md` § Tidy.

## Phase 8: Polish Prose

Express lane skips; `polish_prose: false` and `fast` mode skip. Collect changed files (`git diff <base-commit> --name-only` plus untracked, minus § Workflow artifacts). Drop files over 100 lines where the change is under 10% of the file. If none remain, skip. Otherwise call `Skill(prose-polish)` in file mode with `File:` the list and `Language:` the resolved language. `done` / `no-change` / `error` all continue.

## Phase 9: Check / Test

0. Launch the reviews this run will perform in the background per `references/review-launch.md` § Launch, then continue without waiting.
1. Run `check_commands` in order, then `test_commands` in order. A `Skill(<name>)` entry is called with `--base-commit <base-commit>`; it returns SUCCESS / TEST_FAILED / EXECUTION_ERROR. The first failure stops the pass. EXECUTION_ERROR consumes no fix round: report the callee's reason and wait (USER GATE) for `retry`, or `stop`, which ends the run as step 3 does.
2. Classify each failure. A failure whose failing test and failing code both lie outside the files changed since `<base-commit>` is pre-existing: record it, do not fix it, do not count it. If the workflow's own fix (Tidy, a review fix) broke a test that passed before, correct that fix rather than the implementation.
3. Fix and rerun. At most 3 fix rounds per entry into this phase. After the third, stop: report the command, its last output, and that nothing was committed.
4. When a check command rewrites files outside the task's changed set beyond trivial formatting (≤ 5 whitespace or comment lines), warn and stop for the user; never revert its output silently.

In mob mode, narrate every failure per `references/mob-mode.md` § Check / Test before fixing it.

## Phase 10: Rules Compliance Review

Express lane skips. Take the background result per `references/review-launch.md` § Collect when it is fresh; otherwise call `Skill(rules-review)` with `--base-commit <base-commit>`. Fix every reported violation; when a violation is a pattern rather than a one-off, grep the file for the defining token and fix every match. A `rule-doc-drift` classification gets no code fix; note it for Update Rules. Record edited files in `review_fix_files`. Do not rerun Check / Test here.

## Phase 11: Code Review

Skipped on Trivial and when `code_review: false`. Take the background result per `references/review-launch.md` § Collect when it is fresh; otherwise run step 1.

1. Call `Skill(<reviewer>)` with `git diff <base-commit>`, the content of untracked new files labeled as such, `custom_instructions` when set, Phase 7's no-comment rule as a standing rejection criterion, the three categories (correctness and edge cases; conventions and consistency including a light `.claude/rules/` check; simplicity and maintainability), the current subtask and its siblings when a decomposition state file is active, and "report only actionable findings, else say No actionable findings".
2. Fix genuine findings; reject the rest with one line each. If the user would plausibly raise the point themselves, fix it. Duplicates of Rules Compliance findings are skipped. After a Critical fix, sweep the diff for the same defect class. Record edited files in `review_fix_files`.
3. Escalation: exactly one more pass when this pass had at least one Critical finding and at least one fix was applied. The escalation pass scopes to the changes since the first pass. It never triggers a third.
4. Findings still unresolved after the passes go to the user once (USER GATE). Fixes made there also enter `review_fix_files`.

In mob mode, predict and cross-check per `references/mob-mode.md` § Code Review, and skip step 3's escalation pass.

## Phase 12: Verify Fixes

If `review_fix_files` is empty, mark completed and continue. Otherwise run Check / Test once (3 fix rounds apply). Then, if Rules Compliance Review ran, call `Skill(rules-review)` with `--base-commit <base-commit>` and `Files: <review_fix_files>`. Fix violations once; a second scoped pass over the newly fixed files is the last; violations still present go to the user (USER GATE).

## Phase 13: Completion Hooks

Skipped when `hooks.on_complete` is unset. If the tree has no task-derived changes, skip with a one-line note. Run entries in list order: `Skill(<name>)` as a skill, anything else in Bash. When a decomposition state file is active, do not run an entry that would move or delete it; say so. A failing entry is reported and the rest still run. If any entry wrote to the tree, run `check_commands` once.

## Phase 14: Interactive Commits

USER GATE. When the snapshot chain exists, first absorb the review layers' edits into it per `references/snapshots.md` § Absorb review fixes. Then read `references/commits.md` and follow § Procedure: one commit per Build order step from the chain (cohesion grouping of the final diff when there is no chain), each landed through the accept gate, in the crit browser when `commit_review_gate` is `crit`. Initialize `landed_count = 0` on entry; the reference increments it. Never `git push`.

In mob mode, add the per-commit note and the already-reviewed accept variant per `references/mob-mode.md` § Commits.

Post-commit verification is part of this phase: when adjustments during the gates edited any file, run Check / Test once after the last commit and offer those edits as one extra commit (pathspec = the edited paths minus § Workflow artifacts). If the user cancelled mid-loop, skip the extra commit.

## Phase 15: Update Rules

Express lane skips this whole phase, including the question below; PR Rule Extraction then asks for its PR on its own.

1. USER GATE. Ask whether to run the remaining rule steps: `proceed` (Update Rules and PR Rule Extraction) / `pr-only` / `skip`. `skip` also marks PR Rule Extraction completed without asking for a PR.
2. Call `Skill(extract-rules)` with `--from-conversation`, unless a `hooks.on_complete` entry contains `extract-rules` (that hook already extracted this session). If the diff introduced a new framework, library, architectural pattern, or API convention and no conversation extraction ran, call `Skill(extract-rules)` with `--update` instead. If extract-rules is unavailable, write the session's reusable patterns to `.claude/plans/rules-candidates-<YYYY-MM-DD>.md` and tell the user.
3. Rule commit (USER GATE): run the § Rule commit gate procedure of `references/commits.md` over uncommitted paths under `.claude/rules/`, `.claude/rules-extras/`, `.claude/rules-staging/` (or the dirs `.claude/extract-rules.local.md` sets). Skip when there are none.

## Phase 16: PR Rule Extraction

USER GATE. Ask which reviewed PR to extract rules from, naming the accepted forms: a number, `owner/repo#N`, a `100..110` range, a URL, or several separated by spaces; an empty answer declines. On an answer, call `Skill(extract-rules)` with `--from-pr <answer verbatim>`. "Nothing qualified" and "no human comments" are success; a pre-flight error (missing `gh`, no such PR) is noted and skipped. Then run the § Rule commit gate procedure again over what it wrote.

## Phase 17: Self-Retrospective

Skipped when `self_retrospective.feedback` is unset. Read `references/self-retrospective.md` and follow it: judge this run's friction from what is in context, write at most three Findings that each name a behavior change and its character cost, preview them (USER GATE), and post to the configured destination. Nothing here edits a skill.

## Phase 18: Completion

1. Summary in the resolved language: what was done, files changed, check/test result, review outcomes, rules updated, commits landed, the Self-Retrospective line, the timing table per `references/timing.md` § Report, and one line per phase skipped or stopped early. List skipped callees and any uncommitted rule files.
2. Decomposed runs: follow `references/decomposition.md` § Finish a subtask. It marks the subtask done, asks for an optional PR URL (USER GATE), and prints the `--resume` command or deletes the state file when all subtasks are done.
3. In mob mode, add the learning summary and the paired resume commands per `references/mob-mode.md` § Completion.
4. Delete this run's staging state: `rm -f` each existing staging file listed in § Workflow artifacts (named paths, no globs), `rm -rf .claude/plans/<slug>.absorb`, and `git update-ref -d refs/dev-workflow-lite/<slug>`. Never delete the plan file itself; `hooks.on_complete` owns archiving.
