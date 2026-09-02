# Workability retrospective

Read from `SKILL.md` Phase 18 (Workability Retrospective). Unqualified `§` references point into this file. The phase turns this run's friction with the **project's own tooling** into candidates the team can act on. It is the third of three retrospective axes, and the split is fixed: a prose convention goes to Update Rules (`extract-rules`); a defect in this workflow or its callees goes to Self-Retrospective; a missing project skill, linter rule, or check command comes here.

## Settings

`workability_retrospective.enabled` (default `false`) turns the phase on. `workability_retrospective.backlog_dir` (default `.claude/improvements`) holds the backlog files; it is committed, not a workflow artifact.

## Signals

First render the timing table so far: `node "<base dir>/scripts/timing/report.mjs" --file <log>` (Completion renders it again). Then judge this run from what is in context (the phase records, that table, review findings, gate replies). Do not read session logs and do not dispatch an agent. Three kinds of candidate, each tied to something that happened in this run:

- **skill**: a multi-step procedure the workflow or the user performed by hand this run and that will recur in this project (regenerating a fixture, a release step sequence, a data migration check). Evidence: the steps taken and where the time went (cite the timing table row).
- **lint-rule**: a finding from Rules Compliance Review, Code Review, or a user correction that a linter the project already has (or `check_commands`) could catch mechanically, so it never reaches review again. Evidence: the finding and the rule id or config that would enforce it. A convention that needs judgment is not a lint-rule candidate; it belongs to Update Rules.
- **check-command**: a failure class that surfaced late (at review or at commit) and that a command in `check_commands` or `test_commands` would have caught at Check / Test. Evidence: the failure and the command.

At most **3** candidates per run. Before writing one, `Grep` the project for what it proposes: `.claude/skills/` for a skill of that shape, the linter configuration files at the repository root for the rule, the settings files for the command, and the backlog directory for an earlier candidate with the same subject. A duplicate is dropped. Zero candidates is a normal outcome.

Each candidate: `kind`, `title`, `evidence` (what happened, with the timing row when relevant), `proposal` (for a skill, an outline of inputs, steps, and outputs; for a lint-rule, the rule and its configuration; for a check-command, the command line), `effort` (`small`: one config edit; `medium`: a new file; `large`: a new skill).

## Gate

Present the candidates (USER GATE), each with a per-candidate disposition; one reply may name several:

- `apply` — only for `lint-rule` and `check-command` candidates whose proposal is a single configuration edit. Make the edit, run that check once over the current tree, and report the result; a failing run is reported and the edit is kept for the user to judge. A `skill` candidate is never applied here: creating a skill is a task of its own, so `apply` on it means "record it as the next task" in the backlog file's first line.
- `backlog` — `mkdir -p <backlog_dir>` when missing, then write `<backlog_dir>/<kind>-<slug>.md` with the candidate's fields, or append a dated section when the file exists.
- `skip` — record nothing.

No reply, or a reply that names no disposition, is asked about once; a second unclear reply is treated as `skip` for every candidate.

## Commit

Applied edits and backlog files are committed through the rule commit gate of `commits.md` (§ Rule commit gate there), with the path set = the edited configuration files plus the backlog directory, without the rule-class labels, under a subject such as `chore: record workability candidates`. Nothing else in the tree is included. When the gate is cancelled the files stay in the working tree and Completion names them as uncommitted.

Emit one line for the Completion summary: `Workability: <N> candidates (<applied> applied, <backlogged> backlogged, <skipped> skipped)`.
