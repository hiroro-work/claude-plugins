# mobpro

A learning-oriented development workflow for pairing with a junior engineer. `mobpro` runs the **same quality gates** as `dev-workflow` — plan review, static checks, tests, rules-compliance review, code review, interactive commits, and rule maintenance — but re-shapes the flow so a junior can follow *what* is being built and *why*.

The model is mob-programming with a fixed driver: **the AI always drives** (it writes every edit), and the junior **navigates** — thinking about the approach, explaining the plan back, reading diffs, predicting review findings, and approving commits. The junior does not write code; the learning is in reading, explaining, predicting, and judging.

> **Install**: use the `dev-workflow-bundle` plugin. `mobpro` reads `dev-workflow`'s reference files as install-time siblings, so a standalone `mobpro`-only install will not work.

## When to use mobpro vs dev-workflow

| Use `mobpro` | Use `dev-workflow` |
| --- | --- |
| A junior is learning from this change | Shipping efficiently is the only goal |
| You want to pause and confirm understanding | You want the workflow to run to completion without learning pauses |
| A teaching session (feature or fix as the vehicle) | Routine / non-interactive execution |

Both use the same reviewer, checks, tests, and rules — so the quality bar is identical. `mobpro` only adds learning pauses on top.

## Typical sessions

- **Onboarding.** A new team member needs to learn the project's routing, test conventions, and review standards. Run a real feature request through `mobpro`: they explain the plan back, read each diff, predict where the reviewer will find things, and approve each commit — the feature ships and the codebase gets explained in the same pass.
- **Splitting a parent task between a junior and a senior.** Decompose at kickoff, run the first subtask or two under `mobpro` while the junior learns the shape of the change, then hand the rest to a senior with `/dev-workflow --resume <slug>`. The state file carries the subtask boundaries across the handoff — see § Interop with dev-workflow.
- **Teaching review literacy on a bug fix.** A small fix is often the better vehicle: the junior reads the failing output before the AI touches it, predicts the review findings, then sees which predictions the reviewer actually raised.

## Usage

```text
/mobpro [-i N] <task>              # Start a learning session
/mobpro --resume <state-file>      # Resume a decomposed subtask
```

`-i N` caps the plan-review and code-review iteration counts (same meaning as `dev-workflow`). There is no `--init`, `--fast`, or `--executor`.

## Interop with dev-workflow

`mobpro` and `dev-workflow` share the same decomposition **state-file** schema and path (`.claude/plans/dev-workflow.<slug>.md`). So a parent task can be started under `mobpro` (learning through the first subtasks) and the rest handed off to a senior with `/dev-workflow --resume <slug>` — or the reverse.

**Single-writer rule**: never run two sessions (mobpro or dev-workflow) against the same state file at once — parallel writers race on both the file and the shared `git HEAD` base-commit and silently corrupt subtask boundaries. Hand off sequentially: finish (and commit) one subtask, then resume in the other tool.

## Configuration

`mobpro` reads two config layers of its own, then falls back to your `dev-workflow` configuration for everything that describes the project. It runs on sensible defaults even when no config file exists anywhere, and it never writes to `dev-workflow`'s files.

**Its own keys** — read from `.claude/mobpro.md` (team-shared, git-tracked), then `.claude/mobpro.local.md` (personal, gitignored); the later layer wins:

| Key | Values | Default | Effect |
| --- | --- | --- | --- |
| `checkpoint` | `unit` / `subtask` / `off` | `unit` | Where the learning checkpoint fires: after each implementation unit, once after all of them, or never (`off` also turns the plan-approval teach-back into a plain approval) |
| `quiz` | boolean | `true` | Whether the lightweight-quiz checkpoint form and the pre-review prediction quiz are used |
| `error_reading_practice` | boolean | `true` | Whether the junior reads the error first on the run's first check/test failure |

**Inherited from dev-workflow** — the project-characteristic keys (`reviewer`, `check_commands`, `test_commands`, `language`, `interactive_commits`, `commit_review_gate`, `hooks`, and the rest of the closed list) are read from `~/.claude/dev-workflow.local.md` → `.claude/dev-workflow.md` → `.claude/dev-workflow.local.md` using dev-workflow's own merge rules. Setting `commit_review_gate: "crit"` there makes `mobpro` show each commit's diff in crit's browser view instead of chat — usually easier for a junior to read. `crit` is a separately-installed local CLI, so the gate falls back to the chat diff when it is not installed or no local browser is reachable (as on Claude Code on the Web).

**Deliberately ignored** — `plan_review_gate` (and its deprecated predecessor `visual_plan_review`), `implementation_executor`, and `subagent_model` are dev-workflow keys `mobpro` does not honor. They are ignored silently, since they remain valid settings for `dev-workflow` itself. `implementation_executor` stays `main` for the same reason the AI always drives: the junior has to watch each edit land. `subagent_model` has nothing to resolve against, since `mobpro` runs no difficulty assessment.

`plan_review_gate` is ignored even though `commit_review_gate` above is honored, because the two swap different surfaces. `crit` at the commit gate changes only how the diff is *viewed*, leaving the approval dialogue in chat. `plan_review_gate`'s browser values (`visual` / `crit`) would move the *approval itself* into the browser — and plan approval is where the teach-back happens, which only works as a conversation.

See [`references/configuration.md`](references/configuration.md) for the full schema, the complete fallback list, and the canonical list of ignored keys (§ Not-adopted keys).
