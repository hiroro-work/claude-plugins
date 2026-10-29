# Workability retrospective

Read from `SKILL.md` Phase 18 (Workability Retrospective). Unqualified `§` references point into this file. The phase turns this run's friction with the **project's own tooling** into candidates the team can act on. It is the third of three retrospective axes, and the split is fixed: a prose convention goes to Update Rules (`extract-rules`); a defect in this workflow or its callees goes to Self-Retrospective; a lint candidate or a missing check command comes here.

## Settings

`workability_retrospective.backlog_dir` (default `.claude/improvements`) holds the backlog files; it is committed, not a workflow artifact.

## Signals

Two kinds of candidate:

- **lint-rule**: one per bullet of `lint-candidates.md` in `.claude/rules-staging/` (or the dir `.claude/extract-rules.local.md` sets). Evidence: the rule the bullet names. Proposal: its configuration edit. No file means none; never derive one from the conversation.
- **check-command**: a failure class that showed up late (at review or at commit) and that a command in `check_commands` or `test_commands` would have caught at Check / Test. Judge it from what is in context (the phase records, review findings, gate replies), rendering the timing table so far with `node "<base dir>/scripts/timing/report.mjs" --file <log>` only when a candidate needs a row to cite; do not read session logs and do not dispatch an agent. Evidence: the failure and the command.

At most **3** candidates per run, lint-rule bullets first in file order. Before writing one, `Grep` the project for what it proposes: the linter configuration files at the repository root for the rule, the settings files for the command, and the backlog directory for an earlier candidate with the same subject. A duplicate is dropped; for a lint-rule, `Edit` its bullet out of the file now. Zero candidates is a normal outcome.

Each candidate: `kind`, `title`, `evidence` (what happened, with the timing row when relevant), `proposal` (for a lint-rule, the rule and its configuration; for a check-command, the command line), `effort` (`small`: one config edit; `medium`: a new file).

## Gate

Present the candidates (USER GATE), each with a per-candidate disposition, and say that a disposition removes a lint-rule candidate's bullet from `lint-candidates.md`; one reply may name several:

- `apply` — only for candidates whose proposal is a single configuration edit. Make the edit, run that check once over the current tree, and report the result; a failing run is reported and the edit is kept for the user to judge.
- `backlog` — `mkdir -p <backlog_dir>` when missing, then write `<backlog_dir>/<kind>-<slug>.md` with the candidate's fields, or append a dated section when the file exists.
- `skip` — record nothing.

No reply, or a reply that names no disposition, is asked about once; a second unclear reply is treated as `skip` for every candidate.

Then remove, in one `Edit` of `lint-candidates.md`, the bullet of every lint-rule candidate a reply gave a disposition.

## Commit

Commit through the rule commit gate of `commits.md` (§ Rule commit gate there) with the path set = the edited configuration files, the backlog directory, and `lint-candidates.md`, without the rule-class labels, under a subject such as `chore: record workability candidates`. Nothing else in the tree is included. When the gate is cancelled the files stay in the working tree and Completion names them as uncommitted.

Emit one line for the Completion summary: `Workability: <N> candidates (<applied> applied, <backlogged> backlogged, <skipped> skipped)`, adding `, <M> lint candidates left` when bullets remain in the file.
