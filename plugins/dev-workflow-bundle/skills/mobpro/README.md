# mobpro

A learning-oriented development workflow for pairing with a junior engineer. `mobpro` runs the **same quality gates** as `dev-workflow` — plan review, static checks, tests, rules-compliance review, code review, interactive commits, and rule maintenance — but re-shapes the flow so a junior can follow *what* is being built and *why*.

The model is mob-programming with a fixed driver: **the AI always drives** (it writes every edit), and the junior **navigates** — thinking about the approach, explaining the plan back, reading diffs, predicting review findings, and approving commits. The junior does not write code; the learning is in reading, explaining, predicting, and judging.

> **Install**: use the `dev-workflow-bundle` plugin. `mobpro` reads `dev-workflow`'s reference files as install-time siblings, so a standalone `mobpro`-only install will not work.

> **Status**: this is the walking-skeleton release (M1–M13 one pass). It runs with built-in defaults, a single "any questions?" checkpoint, and the standard quality gates. The richer learning gates (teach-back, prediction quiz, error-reading practice, the configurable checkpoint tempo), config-file reading, the crit commit-review branch, and session resume arrive in follow-up releases.

## When to use mobpro vs dev-workflow

| Use `mobpro` | Use `dev-workflow` |
| --- | --- |
| A junior is learning from this change | Shipping efficiently is the only goal |
| You want to pause and confirm understanding | You want the workflow to run to completion without learning pauses |
| A teaching session (feature or fix as the vehicle) | Routine / non-interactive execution |

Both use the same reviewer, checks, tests, and rules — so the quality bar is identical. `mobpro` only adds learning pauses on top.

## Usage

```text
/mobpro [-i N] <task>              # Start a learning session
/mobpro --resume <state-file>      # Resume a decomposed subtask (follow-up release)
```

`-i N` caps the plan-review and code-review iteration counts (same meaning as `dev-workflow`). There is no `--init`, `--fast`, or `--executor`.

## Interop with dev-workflow

`mobpro` and `dev-workflow` share the same decomposition **state-file** schema and path (`.claude/plans/dev-workflow.<slug>.md`). So a parent task can be started under `mobpro` (learning through the first subtasks) and the rest handed off to a senior with `/dev-workflow --resume <slug>` — or the reverse. 

**Single-writer rule**: never run two sessions (mobpro or dev-workflow) against the same state file at once — parallel writers race on both the file and the shared `git HEAD` base-commit and silently corrupt subtask boundaries. Hand off sequentially: finish (and commit) one subtask, then resume in the other tool.

## Configuration

`mobpro` reads three of its own keys (`checkpoint`, `quiz`, `error_reading_practice`) and inherits the rest (reviewer, checks, tests, language, …) from your `dev-workflow` configuration. See [`references/configuration.md`](references/configuration.md) for the full schema. It runs with sensible defaults even when no config file exists.
