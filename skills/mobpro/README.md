# mobpro

A learning-oriented development workflow for pairing with a junior engineer. `mobpro` runs the **same quality gates** as `dev-workflow` — plan review, static checks, tests, rules-compliance review, code review, interactive commits, and rule maintenance — but re-shapes the flow so a junior can follow *what* is being built and *why*.

The model is mob-programming with a fixed driver: **the AI always drives** (it writes every edit) and narrates as it goes — what it is about to do, what it just did, and why. The junior **navigates**: after each implementation unit they review that unit's diff and ask whatever the narration left open, and they approve each commit. The junior does not write code, and `mobpro` never asks them to answer a comprehension question — nor does it ask up front what they want to learn, since what they take away comes out of the work rather than from goals declared before any code exists. The learning is in reading each diff, hearing the reasoning, and judging.

> **Install**: use the `dev-workflow-bundle` plugin. `mobpro` reads `dev-workflow`'s reference files as install-time siblings, so a standalone `mobpro`-only install will not work.

## When to use mobpro vs dev-workflow

| Use `mobpro` | Use `dev-workflow` |
| --- | --- |
| A junior is learning from this change | Shipping efficiently is the only goal |
| You want to pause after each unit and read the diff together | You want the workflow to run to completion without learning pauses |
| A teaching session (feature or fix as the vehicle) | Routine / non-interactive execution |

Both use the same reviewer, checks, tests, and rules — so the quality bar is identical. `mobpro` only adds learning pauses on top.

## Typical sessions

- **Onboarding.** A new team member needs to learn the project's routing, test conventions, and review standards. Run a real feature request through `mobpro`: they hear the reasoning behind each unit, review its diff, and approve each commit — the feature ships and the codebase gets explained in the same pass.
- **Splitting a parent task between a junior and a senior.** Decompose at kickoff, run the first subtask or two under `mobpro` while the junior learns the shape of the change, then hand the rest to a senior with `/dev-workflow --resume <slug>`. The state file carries the subtask boundaries across the handoff — see § Interop with dev-workflow.
- **Teaching review literacy on a bug fix.** A small fix is often the better vehicle: the junior hears how the AI reads the failing output, hears where it expects the reviewer to object, then sees which of those the reviewer actually raised.

## Usage

```text
/mobpro [-i N] <task>              # Start a learning session
/mobpro --resume <state-file>      # Resume a decomposed subtask
```

`-i N` caps the plan-review and code-review iteration counts (same meaning as `dev-workflow`; a positive integer only — `-i 0` falls through to `review_iterations`, see § Configuration). There is no `--init`, `--fast`, or `--executor`.

**The plan is written for the junior to read** — plain wording, a numbered build order up front, and the reasoning for that order stated rather than assumed, with each fork in the road shown as a recommendation next to the option it beat, so the junior can weigh the call rather than be handed an undecided choice. Each step of that build order becomes one implementation unit, so the plan doubles as the list of diffs the junior will review (source of truth: [`references/plan-format.md`](references/plan-format.md)).

**The git index during the implementation loop**: so that each unit's diff review shows just that unit's delta rather than everything since the run started, `mobpro` stages the unit's changed paths with `git add` and leaves them staged until the loop ends, then unstages that set in one pass — nothing is committed until the commit gate. A path you had staged yourself is left alone unless a unit's review touched it — and then it loses only its staging, never its content (source of truth: [`references/diff-review.md`](references/diff-review.md) § Per-unit review range's **M6-exit unstage** paragraph).

Those per-unit snapshots are also what the commit gate proposes from: the commit plan comes out as **one commit per unit the junior reviewed, in the order they reviewed them** — plus a last commit for whatever the cleanup and review gates changed afterwards — rather than regrouped from the finished tree. So the diffs they approved during the loop and the commits they approve at the end are the same slices — and a unit that revisited a file already touched by an earlier unit still gets its own commit, instead of the two being flattened together.

## Interop with dev-workflow

`mobpro` and `dev-workflow` share the same decomposition **state-file** schema and path (`.claude/plans/dev-workflow.<slug>.md`). So a parent task can be started under `mobpro` (learning through the first subtasks) and the rest handed off to a senior with `/dev-workflow --resume <slug>` — or the reverse.

**Single-writer rule**: never run two sessions (mobpro or dev-workflow) against the same state file at once — parallel writers race on both the file and the shared `git HEAD` base-commit and silently corrupt subtask boundaries. Hand off sequentially: finish (and commit) one subtask, then resume in the other tool.

## Configuration

`mobpro` has **no configuration of its own**. It reads your `dev-workflow` configuration for everything that describes the project, runs on sensible defaults even when no config file exists anywhere, and never writes to `dev-workflow`'s files.

The teaching behavior is deliberately not configurable: the per-unit diff review always fires, and there is no comprehension-check gate to turn on or off. The **review** gates are a different matter — they are project characteristics, so `review_iterations` governs them here exactly as it does in `dev-workflow`, `0` included: `{plan: 0, code: 3}` runs the session without the plan-review pass (the plan still goes to the junior at the approval gate), and `{plan: 3, code: 0}` narrows the rules-and-code-review phase to its rules-compliance half rather than skipping it — name both map keys, since an absent key warns before falling back to `3`. `mobpro` honors a configured `0` rather than raising it to `1`. Earlier versions exposed `checkpoint`, `quiz`, and `error_reading_practice` in `.claude/mobpro.md` / `.claude/mobpro.local.md`; those keys are gone, and `mobpro` warns once if either file is still present so the change is not silent.

**Inherited from dev-workflow** — the project-characteristic keys (`reviewer`, `check_commands`, `test_commands`, `language`, `interactive_commits`, `plan_review_gate`, `commit_review_gate`, `hooks`, and the rest of the closed list) are read from `~/.claude/dev-workflow.local.md` → `.claude/dev-workflow.md` → `.claude/dev-workflow.local.md` using dev-workflow's own merge rules. Setting `commit_review_gate: "crit"` there makes `mobpro` show diffs in crit's browser view instead of chat — both the per-unit diff review during implementation and each commit's diff at the commit gate — which is usually easier for a junior to read. Each of those views opens on a story: a prologue saying what the change does and what to watch for, plus chapters grouping the diff's hunks. At the commit gate it is built from the commit message; during implementation, from the point of that unit. `crit` is a separately-installed local CLI, so both gates fall back to the chat diff when it is not installed or no local browser is reachable (as on Claude Code on the Web).

`plan_review_gate` picks where the plan approval happens: `visual` — the default — opens the bundled browser review gate, `crit` opens crit instead (falling back to `visual` when crit is missing), and `plan-mode` keeps the approval in chat, since `mobpro` never enters Claude Code's Plan Mode. Whichever browser gate you pick, it falls back to the chat approval on its own when no local browser is reachable, and the AI's short walkthrough of the plan is spoken in chat before the browser opens — so moving the approval surface never costs the junior the explanation.

**About `test_commands`' default** — it defaults to `["Skill(run-tests)"]` (source of truth: [`references/configuration.md`](references/configuration.md) § Fallback keys' Default column), and `run-tests` is not bundled: `dev-workflow --init` generates it into the consuming project, and `mobpro` has no `--init`. On a project that never ran `--init`, `mobpro` skips that entry with a note rather than reporting a test failure (`SKILL.md` § M8 — Check / test is the source of truth for that disposition) — point `test_commands` at a `Skill(<name>)` that runs your tests (entries are skill invocations, not shell commands), or run `dev-workflow --init` to generate `run-tests`.

**Deliberately ignored** — `implementation_executor` and `subagent_model` are dev-workflow keys `mobpro` does not honor. They are ignored silently, since they remain valid settings for `dev-workflow` itself. `implementation_executor` stays `main` for the same reason the AI always drives: the junior has to watch each edit land. `subagent_model` has nothing to resolve against, since `mobpro` runs no difficulty assessment.

See [`references/configuration.md`](references/configuration.md) for the full schema, the complete fallback list, and the canonical list of ignored keys (§ Not-adopted keys).
