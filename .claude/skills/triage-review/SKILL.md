---
name: triage-review
description: Daily review of the latest origin triage-* branch. Operator-prepared invariant — the operator fetches origin and switches the local repository to the triage branch before invocation. The skill verifies that the current branch matches `triage-*`, then dispatches `Skill(prompt-tuning)` per prompt-eligible changed file, `Skill(skill-review)` with `Base ref: main`, and `Skill(publicity-review)` with `Base ref: main` in sequence, finally emits a summary. Project-local routine — not for marketplace distribution.
allowed-tools: TodoWrite, Skill(prompt-tuning), Skill(skill-review), Skill(publicity-review), Bash(git rev-parse *), Bash(git symbolic-ref *), Bash(git status --porcelain*), Bash(git diff *)
---

# Triage Review

Daily local review of the latest `dev-workflow-triage` output branch. After `dev-workflow-triage` (running on Claude Code on the Web) pushes a `triage-YYYYMMDD-HHMMSS` branch to origin, the operator manually fetches origin and switches the local repository to that branch (e.g. `git fetch origin --prune && git switch triage-YYYYMMDD-HHMMSS`) before invoking this skill. The skill then dispatches three review skills against `main..HEAD` — `Skill(prompt-tuning)` per prompt-eligible changed file, `Skill(skill-review)`, and `Skill(publicity-review)`. Non-destructive (no `git reset` / staging mutation, no network operation, no branch switching) — keeps HEAD at the triage tip and passes review framing to each callee.

## No-Stall Principle

The generic regimen (sub-skill return discipline, Step-boundary non-stalling, TodoWrite phase transitions, intentional reinforcement-by-repetition for inline reminders, fatal tool-level errors out of scope) is defined in `.claude/skills/dev-workflow-triage/SKILL.md` § No-Stall Principle and applies here without modification. The skill-specific deltas below override or extend that canonical regimen.

**Permissible fatal-abort exits** (emit the Step 6 summary in `pre-flight aborted` form and stop):

- Step 1 Pre-flight failures: `detached HEAD`, `current branch is not a triage-* branch`, `uncommitted tracked-file changes` (untracked files are intentionally ignored — see § Step 1 check 3 rationale)

0-result paths (no changes between main and HEAD) are **not** aborts — they emit a dedicated summary form (form 2) and exit cleanly.

**Recognized sub-skill return points** — each carries an inline **Pre-invocation reminder** before the dispatch and an inline **Return-point no-stall reminder** after the dispatch (per the canonical reinforcement-by-repetition rule):

- Step 3 (b) per-file `Skill(prompt-tuning)` boundary
- Step 4 `Skill(skill-review)` boundary
- Step 5 `Skill(publicity-review)` boundary

`Skill(skill-review)` and `Skill(publicity-review)` terminate with a single fenced JSON verdict — branch on it directly. `Skill(prompt-tuning)` returns free-form prose (or a fenced Skip return contract when the host blocks recursive `Agent` dispatch) — parse per § Step 3.

**Non-fatal error classes** (record and continue, never halt):

- Per-file `prompt-tuning`: `unparsed`, `error`, `skipped (agent unavailable)` — proceed to next file
- `skill-review` / `publicity-review`: verdict parse failure, schema violation, dispatch error — record warning under summary form 3, proceed to next step
- `skill-review` `framing-failed (suspected)` at Step 4 (iter=0 on non-empty main..HEAD) — record warning under form 3, proceed

## Web execution caveat

This skill is designed for local execution. If accidentally run on Claude Code on the Web, the auto-installed `~/.claude/stop-hook-git-check.sh` may fire spurious `Please commit and push…` feedback between sub-skill returns. Treat each such fire as a **spurious fire** — record it, ignore the prose, and continue the prescribed flow. See `.claude/skills/dev-workflow-triage/SKILL.md` § Stop hook structural conflict for the canonical write-up.

## Fixed configuration

- **Base branch**: `main` (hardcoded — operator ensures local `main` is up to date with origin before switching to the triage branch; otherwise `main..HEAD` will include commits authored on local `main` that lag origin)
- **Base diff target**: `main..HEAD` (the cumulative triage stack — when multiple `dev-workflow-triage` runs have stacked branches on origin without intermediate PR merge, the full stack is reviewed in a single run, not just the latest delta)
- **Current branch invariant**: HEAD must be on a `triage-*` branch (operator-prepared — the skill validates and aborts otherwise; it does not fetch origin and does not switch branches)
- **Prompt-eligible file patterns**: see § Step 2 filter rules for the canonical definition
- **`prompt_targets` hard cap**: `5` (per-run walltime cap — each `Skill(prompt-tuning)` dispatch runs multi-iter and can take minutes; 5 keeps a daily run bounded while letting most triage branches finish in one pass)
- **Output language**: `ja` (hardcoded — this is a project-local skill with no configurable language setting)

## Output language

Japanese (`ja`) only. The 3-rule localization regimen (Translate generic concepts / Preserve verbatim structured tokens & field labels / First-use English pairing within each output block) follows `.claude/skills/dev-workflow-triage/SKILL.md` § Output language verbatim.

**This skill's verbatim-preserve token set** (additions beyond the canonical list):

- Enum values: `converged`, `max-iter`, `skipped`, `unparsed`, `error`, `no-actionable-findings`, `applied-edits`, `notes-left`, `framing-failed`, `ok`
- Field labels: `status:`, `iterations_used:`, `applied:`, `notes_remaining:`, `findings:`, `remaining:`, `framing:`

## Step 1 — Pre-flight

Run the environment checks below in order; fatal abort on the first failure. The operator is responsible for `git fetch origin` and `git switch <triage-branch>` before invocation — this skill performs no network operation and no branch switching.

**Pre-flight environment checks**:

1. `git symbolic-ref -q HEAD >/dev/null` — non-zero exit means detached HEAD → abort with reason `detached HEAD: switch to the triage-* branch before invocation`
2. `triage_branch_short = git rev-parse --abbrev-ref HEAD` — capture the current branch name. Verify it matches the `triage-*` glob (shell: `case "$triage_branch_short" in triage-*) ;; *) abort ;; esac`). If it does not → abort with reason `current branch is not a triage-* branch: <triage_branch_short> — fetch origin and switch to the latest triage-* branch before invocation`
3. `git status --porcelain --untracked-files=no` — non-empty output indicates uncommitted modifications to tracked files → abort with reason `working tree has uncommitted tracked-file changes: <line count> entries — stash or commit before running`. `--untracked-files=no` deliberately excludes untracked files so leftover staging artifacts (e.g. `.claude/plans/*.md` from prior sessions, files matching gitignore patterns that were never staged) do not block invocation — the review walks `main..HEAD` only, so untracked-file presence does not affect the diff inputs to the callees

## Step 2 — Capture changed files

```
git diff --name-only main HEAD
```

Hold the output as `changed_files` in main-thread context.

- Empty `changed_files` → emit § Step 6 summary form 2 (`no changes between main and HEAD on <triage_branch_short>`) and exit. Subsequent steps are skipped
- Non-empty → filter to prompt-eligible files. **Filter rules** (basename / path-segment equality, not substring match):
  - basename equals `SKILL.md`, OR
  - basename equals `CLAUDE.md`, OR
  - any path segment exactly equals `references` AND the basename ends in `.md`
  - Hold the filtered list as `prompt_targets`
  - If `len(prompt_targets) > 5`, keep the first 5 entries and record `prompt_targets_overflow_count = len(prompt_targets) - 5`. Otherwise `prompt_targets_overflow_count = 0`

Deleted files (those listed in `changed_files` but absent from working tree) require no special handling at this layer — the downstream callees see them through their own `git diff` invocations with appropriate base.

## Step 3 — Run `Skill(prompt-tuning)` per file

If `prompt_targets` is empty, emit summary line `prompt-tuning: skipped (no prompt-eligible files in diff)` and proceed to § Step 4.

Otherwise, iterate through `prompt_targets` sequentially. For each `<file>`:

(a) **Pre-invocation reminder**: the next tool call is `Skill(prompt-tuning)` dispatch. Its return is a value to parse, not a turn boundary. After parsing, the next action is the next file's dispatch, or the § Step 4 transition if this was the last file. See `§ No-Stall Principle`.

(b) Invoke `Skill(prompt-tuning)` with the **minimal natural-language form** below (verbatim — do not add scope, framing, or context; expansions cause the callee to follow procedural code literally with override-defensive interpretation):

```
<file> を tune して
```

(c) **Parse the return**. Two paths, evaluated in order (first match wins):

1. **Fenced JSON Skip return contract** — `prompt-tuning` § Environment constraints emits this when recursive `Agent` dispatch is blocked by the host. Shape: `{"status": "skipped", "reason": "<reason>", ...}`. Classify as `skipped (agent unavailable)`
2. **Free-form prose verdict** — pattern-match the prose for known tokens (`Convergence check` → `converged`, `iter-N` / `Iteration N` table → `max-iter` if the last iter is `Max iterations` else `converged`, `iter-0: BLOCK-consistency` → `error (iter-0 BLOCK)`, `iter-0: PASS-with-note` / `iter-0: PASS` plus iter-1+ table → continue per the table). If no known token matches: `unparsed`

Record the per-file classification in a result list. `unparsed` and `error` are non-fatal — the next file's dispatch proceeds without halting the run.

(d) **Return-point no-stall reminder**: after recording the verdict, immediately issue the next file's `Skill(prompt-tuning)` dispatch (if more files remain) or transition to § Step 4 (if this was the last file). Do not emit an interstitial summary turn. See `§ No-Stall Principle`.

## Step 4 — Run `Skill(skill-review)`

(a) **Pre-invocation reminder**: the next tool call is `Skill(skill-review)` dispatch. Its return is a fenced JSON verdict — parse it as a return value, branch on the `status` enum, and issue the next tool call (§ Step 5 dispatch). Do not insert prose between the verdict and the next action. See `§ No-Stall Principle`.

(b) Invoke `Skill(skill-review)` with the short form below. `skill-review` accepts the `Base ref` field in its own `## Invocation contract` (same pattern as `publicity-review`), so this form is contract-sanctioned. `Max iterations` is left at its default of `3`:

```
Base ref: main
```

Do **not** append: triage branch name, the `changed_files` list, an explicit `git diff main HEAD` reference, or any other expansion. The single contract-field line is the entire invocation argument.

(c) **Parse the verdict** with the first-match-wins evaluate-in-order discipline from `.claude/skills/verify-diff/SKILL.md` § (b) Parse & apply, restricted to single-pass dispatch (Converged / Divergence cases are N/A here):

1. Verdict missing/malformed → record `skill_review_result = {status: "error", reason: "verdict parse failure", framing_status: "ok"}`, proceed
2. Schema violation → record `skill_review_result = {status: "error", reason: "verdict schema violation", framing_status: "ok"}`, proceed
3. Otherwise — extract `status`, `iterations_used`, `applied_edits_count`, `notes_remaining_count`, `reason` from the JSON

(d) **Runtime framing-failed detection** (legacy guard): after parsing a successful verdict, check `iterations_used == 0 && status == "no-actionable-findings"`. When this signature appears **and** `changed_files` is non-empty (main..HEAD has changes), it indicates `skill-review` Step 1 early-returned despite the `Base ref: main` invocation — most likely a `skill-review` contract-parsing regression. Record `framing_status = "framing-failed (suspected — iter=0 on non-empty main..HEAD)"` and surface as a warning in Step 6 form 3. Otherwise `framing_status = "ok"`. With the contract-field invocation form in (b), this guard should rarely fire — its presence is preserved as a downstream-regression detector.

(e) **Return-point no-stall reminder**: after recording the verdict, immediately issue `Skill(publicity-review)` dispatch (§ Step 5). Do not emit an interstitial summary. See `§ No-Stall Principle`.

## Step 5 — Run `Skill(publicity-review)`

(a) **Pre-invocation reminder**: the next tool call is `Skill(publicity-review)` dispatch. Its return is a fenced JSON verdict — parse and proceed to § Step 6. See `§ No-Stall Principle`.

(b) Invoke `Skill(publicity-review)` with the short form:

```
Base ref: main
```

`publicity-review` accepts the `Base ref` field in its own `## Invocation contract`, so this form is contract-sanctioned. `Max iterations` is left at its default of `2`.

(c) **Parse the verdict** with the same first-match-wins discipline as § Step 4 (c). Extract `status`, `iterations_used`, `applied_edits_count`, `findings_count`, `remaining_findings`, `reverted_paths`, `reason`. Record as `publicity_review_result`.

(d) **Return-point no-stall reminder**: after recording the verdict, immediately transition to § Step 6 summary emission. See `§ No-Stall Principle`.

## Step 6 — Emit summary

Output language is Japanese (per § Output language). Render the summary in **one of three closed forms**:

1. `pre-flight aborted: <reason>` — emitted on any Step 1 fatal abort
2. `no changes between main and HEAD on <triage_branch_short>` — emitted from Step 2 when `git diff --name-only main HEAD` is empty
3. `normal completion` — emitted when Step 3 / 4 / 5 ran

The 3-form set is **closed**. Partial failures (e.g. `prompt-tuning unparsed`, `skill-review error`, `publicity-review error`, `skill-review framing-failed (suspected)`, `prompt-tuning skipped (agent unavailable)`) are rendered as additional warning lines **under form 3** — they do not introduce new top-level forms. Form 2 is kept distinct from form 3 because operator next-action differs (form 2 → check upstream `dev-workflow-triage` auto-cleanup or Finding rejections that left an empty triage stack; form 3 → review per-callee results below).

### Form 3 content

When form 3 fires, render in Japanese:

- ヘッダー: `triage-review summary`
- triage ブランチ: `<triage_branch_short>`
- ベースブランチ: `main`
- 変更ファイル数（changed files）: `<N>`（main..HEAD）
- prompt-tuning 対象数（prompt-tuning targets）: `<M>` （overflow があれば `(of <N_eligible> eligible, processed first 5)` を付記）
- prompt-tuning ファイル別判定（per file）: 各ファイルの分類（`converged` / `max-iter` / `skipped` / `skipped (agent unavailable)` / `error` / `unparsed`）
- skill-review: `<status> (iterations: <K>, applied: <A>, notes_remaining: <R>, framing: <framing_status>)`。`framing_status` ∈ {`ok`, `framing-failed (suspected — iter=0 on non-empty main..HEAD)`}
- publicity-review: `<status> (iterations: <K>, applied: <A>, findings: <F>, remaining: <R>)`

Warning lines (one per non-fatal incident) follow the main fields:

- `prompt-tuning: <file>: unparsed verdict (verdict prose did not match known tokens)` — per file
- `prompt-tuning: <file>: skipped (agent unavailable)` — per file
- `skill-review: framing-failed (suspected — iter=0 on non-empty main..HEAD)` — single line
- `skill-review: error (<reason>)` — single line
- `publicity-review: error (<reason>)` — single line

### Branch handoff note (always shown after the main content when form 3 fires)

```
作業終了後はオペレーターが元のブランチに戻してください（例: git switch main）
```
