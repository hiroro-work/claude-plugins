# dev-workflow-lite

The same development workflow as `dev-workflow`, with the same phases in the same order, and without the features that are not the workflow itself. It is meant to replace `dev-workflow`; a team that knows one knows the other. What changes between runs is decided once, by one table, before any work starts, so a junior engineer can say what happens next at any point.

## Phases

| # | Phase | dev-workflow step | Tool | Skipped when |
|---|---|---|---|---|
| 1 | Load Settings | 1 | Read | never |
| 2 | Task Decomposition | 1.5 | Write | proposal only on Moderate / Complex |
| 3 | Create Plan | 2 | Read, Write | never |
| 4 | Plan Review | 3 | `Skill(<reviewer>)`; rules-only in `normal`, full in `--deep` | Trivial, `--fast` |
| 5 | Plan Approval | 4 | **user gate**: browser viewer (`serve.mjs`), chat fallback; plan artifact | never |
| 6 | Implement | 5 | Edit; a snapshot per Build order step | never |
| 7 | Tidy | 6 | `Skill(simplify)`, fallback `Skill(tidy)` | Trivial, Simple |
| 8 | Polish Prose | 6.5 | `Skill(prose-polish)` | Trivial, Simple, `polish_prose: false`, `--fast` |
| 9 | Check / Test | 7 | Bash, `Skill(run-tests)` | never |
| 10 | Rules Compliance Review | 7.5 | `Skill(rules-review)` | Trivial, Simple |
| 11 | Code Review | 8 | `Skill(<reviewer>)` | Trivial, `code_review: false` |
| 12 | Verify Fixes | 8.5 | Bash, `Skill(rules-review)` | no review fixes |
| 13 | Completion Hooks | 9 | `hooks.on_complete` | key unset |
| 14 | Interactive Commits | 10, 10.5 | **user gates**, git; one commit per Build order step with review fixes absorbed; crit browser with `commit_review_gate: crit` | never |
| 15 | Update Rules | 11 | **user gate**, `Skill(extract-rules)` | Trivial, Simple |
| 16 | PR Rule Extraction | 11.7 | **user gate**, `Skill(extract-rules)` | empty answer |
| 17 | Self-Retrospective | 11.5 | **user gate**, `gh api` | `self_retrospective.feedback` unset |
| 18 | Completion | Completion | summary | never |

All eighteen phases are registered on every run. A skipped phase is marked completed with its reason. The difficulty tier (Trivial / Simple / Moderate / Complex) is assessed once at Task Decomposition and never changes during the run.

## What is not here

Compared with `dev-workflow`: difficulty escalation mid-run, `implementation_executor`, `subagent_model`, `boundary_check_commands`, Workability Retrospective. Post-Commit Verification is folded into Interactive Commits as one rule. Run modes, the browser plan review, plan artifacts, and the crit commit gate are kept. Everything else keeps its behavior; the internal mechanics are shorter.

## Self-retrospective without skill growth

With `self_retrospective.feedback` set, the run ends by turning its own friction (corrections, stalls, rejected callee output, wrong defaults) into at most three Findings and posting them as a GitHub issue or a local file, after you approve the preview. The producer is built so that the fixes it asks for do not make the skills grow: each Finding must name a behavior change or a same-size-or-smaller wording change, carry its estimated character delta and what prose could be dropped to pay for it, and is checked against the target's current text so it never asks for a reminder that already exists. The repository's tests hold `SKILL.md` to 27,000 characters and `SKILL.md` plus references to 80,000; a Finding that would cross either must name what to delete. Signals come from the run in context; no session log is scanned and no agent is dispatched.

## Commits per Build order step

Implement records a snapshot after every Build order step (a commit object on `refs/dev-workflow-lite/<slug>`, built in a private index so your staging area is untouched). Before Interactive Commits, the edits made afterwards by Tidy, Polish Prose, the reviews, and Verify Fixes are attributed by `git blame` to the step that last wrote each changed line and folded into that step's commit (`scripts/absorb/attribute.mjs` plus a non-interactive `rebase --autosquash` in a throwaway worktree). Each commit you approve is therefore one step's work in its reviewed form. Edits no step owns, such as a new test file added by a review, land in one trailing `review fixes` commit. `dev-workflow` instead refreshes whole snapshots from the first touched one onward, which lets later steps' content leak into earlier commits.

Because absorption also handles formatter output, `boundary_check_commands` is not needed: put `lefthook run pre-commit` in `check_commands` so formatting lands before review. A multi-step task always yields several commits, so on a project with a pre-commit hook the stashing-hook question (suppress with `LEFTHOOK=0`, or proceed) appears on most runs.

## Mob mode

`mode: mob` in the settings, or `--mob` on the command line, runs the same seventeen phases for a junior navigator: the AI drives and narrates, the junior reads each implementation unit's diff and approves commits. It adds two learning stops (a diff review after every Build order step, and the junior's question after each commit's note), one gate (plan-building checkpoints before the plan is written), narration at check/test failures and before reviews, a junior-oriented plan shape, and the browser plan review on every tier. Everything else — tiers, gates, settings, commits, rule updates — is the solo run. The whole mode lives in `references/mob-mode.md`, read only when the mode is on; solo runs never load it.

`/mobpro-lite <task>` is a thin entry point for the same thing (the `mobpro-lite` plugin). Fix the mode in the project's shared settings rather than switching per run, so the team sees one behavior.

## Requirements

- Plugins from this marketplace: `peer` (ask-peer), `rules-review`, `extract-rules`, `tidy`, `prose-polish`. `simplify` is a Claude Code built-in. A missing skill is reported once and its phase is done inline, except the reviewer, which asks you to choose a replacement.
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
mode: "solo"                 # solo | mob; --mob overrides for one run
self_retrospective:
  feedback: "owner/repo"     # or a local directory; unset skips the phase
hooks:
  on_complete:
    - "Skill(work-complete)"
---
```

Flags: `--fast` skips Plan Review and Polish Prose; `--deep` runs Plan Review in full scope (default `normal` runs it in rules-only scope); `--artifact off|share|review` overrides `plan_artifact` for one run.

Commands in `check_commands` must match the Bash patterns the skill allows (pnpm / npm / yarn / bun / bundle exec / make lint|format|test|typecheck|check / pytest / poetry / uv / cargo / go). Others, and shell strings in `hooks.on_complete`, trigger a permission prompt.

`/dev-workflow-lite --init` detects the commands, writes `.claude/dev-workflow.md`, and generates the `run-tests` skill. Start a new session before the first run.

## Decomposed tasks

Moderate and Complex tasks may be split into subtasks, each shipped as its own PR. The state file is `.claude/plans/dev-workflow.<slug>.md`, in the format `dev-workflow` uses, so a split started by either skill resumes in the other with `--resume <slug>`.
