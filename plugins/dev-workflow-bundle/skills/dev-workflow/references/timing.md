# Timing

Read from `SKILL.md` § Timing. The run keeps its own clock so a supervisor can see where a task spent its time, per phase, without reading session logs. Two scripts under `<base dir>/scripts/timing/` do the work; the workflow only calls them at fixed moments.

## Events

`node "<base dir>/scripts/timing/mark.mjs" --phase "<phase name>" --event <event> [--at <ISO 8601>]` appends `{"phase","event","t"}` to the run's log `.claude/plans/timing-<YYYYMMDD-HHMMSS>.jsonl`. The first call of the run passes `--event start --new` (at Load Settings) and prints the file's path; every later call omits `--file` and appends to the newest log in `.claude/plans/`.

| Event | When |
|---|---|
| `start` | the phase's task row turns `in_progress` |
| `end` | the phase's task row turns `completed`; skipped phases take no marks |
| `wait` | immediately before any wait on the user or on a background gate: every USER GATE question, the browser plan review launch, a crit launch, the team-review hold, and every mob-mode learning stop (each per-unit diff review, each plan-building checkpoint, the post-commit-note question) |
| `resume` | the first tool call after that wait ends |

Issue each mark in the same tool-call burst as the transition it records; a mark is never a reason for a separate turn. `--at` records a moment other than now, to fill in a pair missed at the time (§ Report); it never changes which log the mark lands in. Phase names are the `## Phase N:` headings minus the prefix, exactly as the task rows use them. In mob mode, mark each Implement unit as its own phase `Implement: <unit heading>` (start / wait / resume / end), so the report shows where a unit's review took its time.

## Report

At Completion run `node "<base dir>/scripts/timing/report.mjs" --file <log>` and include its table in the summary: per phase, wall time, waiting time (the sum of wait→resume spans), and active time (wall minus waiting), plus a total row. When `timing.report_dir` is set, run it again with `--out <dir>`; it writes `<dir>/<YYYY-MM-DD>-timing-<stamp>.md` and prints the path, which the summary names. The log itself is a workflow artifact and stays out of commits.

A phase with no `wait` / `resume` pair at all that stayed active for over 30 minutes is named in a note under the table. One named there that held no gate this run needs nothing. For one that did, work out when the gate was presented and answered, record the pair with `--at <ISO 8601>`, and take the report again; when those moments cannot be worked out, say in one line that the phase's figures are not to be trusted.

A missing or failing script never stops the run: say so in one line and continue without the table.
