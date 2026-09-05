# dev-workflow

A guided development workflow with fixed phases in a fixed order. What changes between runs is decided once, by one table, before any work starts, so a junior engineer can say what happens next at any point. Version 2 is a rewrite of v1 with the same phases and gates and a fraction of the text; what it dropped is listed under "What is not here".

## Phases

| # | Phase | v1 step | Tool | Skipped when |
|---|---|---|---|---|
| 1 | Load Settings | 1 | Read | never |
| 2 | Task Decomposition | 1.5 | Write | proposal only on Moderate / Complex |
| 3 | Create Plan | 2 | Read, Write | never |
| 4 | Plan Review | 3 | `Skill(<reviewer>)`; rules-only in `normal`, full in `--deep` | Trivial, `--fast` |
| 5 | Plan Approval | 4 | **user gate**: browser viewer (`serve.mjs`), chat fallback; plan artifact | never |
| 6 | Implement | 5 | Edit; a snapshot per Build order step | never |
| 7 | Tidy | 6 | `Skill(simplify)`, fallback `Skill(tidy)` | Trivial, Simple |
| 8 | Polish Prose | 6.5 | `Skill(prose-polish)` | Trivial, Simple, `polish_prose: false`, `--fast` |
| 9 | Check / Test | 7 | Bash, `Skill(run-tests)`; launches the two reviews in the background | never |
| 10 | Rules Compliance Review | 7.5 | `Skill(rules-review)` | Trivial, Simple |
| 11 | Code Review | 8 | `Skill(<reviewer>)` | Trivial, `code_review: false` |
| 12 | Verify Fixes | 8.5 | Bash, `Skill(rules-review)` | no review fixes |
| 13 | Completion Hooks | 9 | `hooks.on_complete` | key unset |
| 14 | Interactive Commits | 10, 10.5 | **user gates**, git; one commit per Build order step with review fixes absorbed; crit browser with `commit_review_gate: crit` | never |
| 15 | Update Rules | 11 | **user gate** (covers phases 15–18), `Skill(extract-rules)` | extraction: Trivial, Simple |
| 16 | PR Rule Extraction | 11.7 | **user gate**, `Skill(extract-rules)` | empty answer |
| 17 | Self-Retrospective | 11.5 | **user gate**, `gh api` | `self_retrospective.feedback` unset, or skipped at the phase 15 gate |
| 18 | Workability Retrospective | 11.6 | **user gate**, project tooling candidates | `workability_retrospective.enabled` not `true`, or skipped at the phase 15 gate |
| 19 | Completion | Completion | summary | never |

All nineteen phases are registered on every run. A skipped phase is marked completed with its reason. The difficulty tier (Trivial / Simple / Moderate / Complex) is assessed at Task Decomposition and re-checked once against the drafted plan at the end of Create Plan, where it can only rise (a plan that turns out to carry a real design decision lifts Simple to Moderate and reopens the skipped rows). After that it never changes.

## What is not here

Compared with v1: difficulty escalation after Implement (only the post-plan re-check is kept), `implementation_executor`, `boundary_check_commands`. Settings files and keys are unchanged; keys v2 does not read are named once at start and ignored. Decomposition state files, `--resume`, and the browser plan viewer are the same. Post-Commit Verification is folded into Interactive Commits as one rule. Run modes, the browser plan review, plan artifacts, the crit commit gate, and the background review launch during Check / Test are kept. Everything else keeps its behavior; the internal mechanics are shorter.

## Self-retrospective without skill growth

With `self_retrospective.feedback` set, the run ends by turning its own friction (corrections, stalls, rejected callee output, wrong defaults) into at most three Findings and posting them as a GitHub issue or a local file, after you approve the preview. The producer is built so that the fixes it asks for do not make the skills grow: each Finding must name a behavior change or a same-size-or-smaller wording change, carry its estimated character delta and what prose could be dropped to pay for it, and is checked against the target's current text so it never asks for a reminder that already exists. The repository's tests hold `SKILL.md` to 28,000 characters, `SKILL.md` plus the always-read references to 80,000, and `mob-mode.md` to 12,000; a Finding that would cross either must name what to delete. Signals come from the run in context; the session log is read only when context compaction has summarized away earlier phases (`scripts/retro/session-text.mjs`, bounded output), and no agent is dispatched.

## Workability retrospective

With `workability_retrospective.enabled: true`, the run ends by turning friction with the project's own tooling into at most three candidates: a project skill for a manual procedure that recurred, a linter rule for a convention review had to catch by hand, or a check command for a failure that surfaced late. Each cites what happened (with the timing table row) and proposes something concrete; duplicates of what the project already has are dropped. You choose per candidate: `apply` (single configuration edits only, checked once), `backlog` (a file under `.claude/improvements/`), or `skip`. Prose conventions still go to Update Rules and workflow defects to Self-Retrospective; this phase covers tooling only.

## Commits per Build order step

Implement records a snapshot after every Build order step (a commit object on `refs/dev-workflow/<slug>`, built in a private index so your staging area is untouched). Before Interactive Commits, the edits made afterwards by Tidy, Polish Prose, the reviews, and Verify Fixes are attributed by `git blame` to the step that last wrote each changed line and folded into that step's commit (`scripts/absorb/attribute.mjs` plus a non-interactive `rebase --autosquash` in a throwaway worktree). Each commit you approve is therefore one step's work in its reviewed form. Edits no step owns, such as a new test file added by a review, land in one trailing `review fixes` commit. `dev-workflow` instead refreshes whole snapshots from the first touched one onward, which lets later steps' content leak into earlier commits.

Because absorption also handles formatter output, `boundary_check_commands` is not needed: put `lefthook run pre-commit` in `check_commands` so formatting lands before review. A multi-step task always yields several commits, so on a project with a pre-commit hook the stashing-hook question (suppress with `LEFTHOOK=0`, or proceed) appears on most runs.

## Mob mode

`mode: mob` in the settings, or `--mob` on the command line, runs the same nineteen phases for a junior navigator: the AI drives and narrates, the junior reads each implementation unit's diff and approves commits. It adds two learning stops (a diff review after every Build order step, and the junior's question after each commit's note), one gate (plan-building checkpoints before the plan is written), narration at check/test failures and before reviews, a junior-oriented plan shape, and the browser plan review on every tier. Everything else — tiers, gates, settings, commits, rule updates — is the solo run. The whole mode lives in `references/mob-mode.md`, read only when the mode is on; solo runs never load it.

`/mobpro <task>` is a thin entry point for the same thing (the `mobpro` plugin). Fix the mode in the project's shared settings rather than switching per run, so the team sees one behavior.

## Timing

Every run writes a per-phase timing log (`.claude/plans/timing-<stamp>.jsonl`, a workflow artifact) by marking each phase's start and end and each user or background wait. Completion prints a table of wall, waiting, and active time per phase, so a supervisor can see where a junior's task spent its time without reading session logs. Set `timing.report_dir` to also persist the table as a dated Markdown file. This runs in both solo and mob mode.

## Requirements

- Install through the `dev-workflow-bundle` plugin, which carries the callees `peer` (ask-peer), `rules-review`, `extract-rules`, `tidy`, `prose-polish`, `mobpro`, and `kabeuchi`. `simplify` is a Claude Code built-in. A missing skill is reported once and its phase is done inline, except the reviewer, which asks you to choose a replacement.
- A project `run-tests` skill, generated by `--init`.
- Node.js for the browser plan review (`scripts/plan-review/serve.mjs`, bundled) and the artifact export. `crit` installed locally if `commit_review_gate: crit` is set.
- Add `.claude/plans/` to `.gitignore`. The workflow keeps its plan, decomposition state, and absorb patches there.
- A regular `.git` directory. In a linked worktree the snapshot chain is not built and commits are grouped from the final diff instead.

## Settings

The same files as `dev-workflow`: `~/.claude/dev-workflow.local.md`, `.claude/dev-workflow.md`, `.claude/dev-workflow.local.md`, YAML frontmatter, merged in that order. Only these keys are read; others are named once at start and ignored.

```yaml
---
reviewer: "ask-peer"          # ask-peer | ask-claude | ask-codex | ask-gemini | ask-copilot | ask-agy
code_review: true
polish_prose: true
language: "ja"                # default: ~/.claude/settings.json language, then ja
check_commands:
  - "pnpm run lint"
  - "pnpm run typecheck"
test_commands:
  - "Skill(run-tests)"        # Skill(<name>) entries only
plan_artifact: "off"          # off | share | review; --artifact overrides
commit_review_gate: "diff"    # diff | crit
custom_instructions: "Always use TDD."   # optional; rules and explicit requests win
subagent_model:              # default {trivial: sonnet, simple: sonnet}; other tiers inherit
  trivial: sonnet
  simple: sonnet
mode: "solo"                 # solo | mob; --mob overrides for one run
self_retrospective:
  feedback: "owner/repo"     # or a local directory; unset skips the phase
timing:
  report_dir: "docs/timing"  # optional; the table is always shown at Completion
workability_retrospective:
  enabled: false             # opt-in; backlog_dir defaults to .claude/improvements
hooks:
  on_complete:
    - "Skill(work-complete)"
---
```

Flags: `--fast` skips Plan Review and Polish Prose; `--deep` runs Plan Review in full scope (default `normal` runs it in rules-only scope); `--artifact off|share|review` overrides `plan_artifact` for one run.

Commands in `check_commands` must match the Bash patterns the skill allows (pnpm / npm / yarn / bun / bundle exec / make lint|format|test|typecheck|check / pytest / poetry / uv / cargo / go). Others, and shell strings in `hooks.on_complete`, trigger a permission prompt.

`/dev-workflow --init` detects the commands, writes `.claude/dev-workflow.md`, and generates the `run-tests` skill. Start a new session before the first run.

## Decomposed tasks

Moderate and Complex tasks may be split into subtasks, each shipped as its own PR. The state file is `.claude/plans/dev-workflow.<slug>.md`, in the format `dev-workflow` uses, so a split started by either skill resumes in the other with `--resume <slug>`.
