---
name: dev-workflow-triage
description: Triage open issues in the dev-workflow-bundle retrospective repo. Read each open issue, judge each Finding (accept / reject), apply accepted fixes to the bundle skills (dev-workflow, ask-peer, extract-rules, rules-review), post a triage comment, and close the issue. Designed for non-interactive routine execution (no plan mode, no user prompts) on Claude Code on the Web.
allowed-tools: Read, Edit, Write, TodoWrite, Skill(verify-diff), Skill(skill-review), Bash(gh auth status), Bash(gh --version), Bash(gh issue list *), Bash(gh issue comment *), Bash(gh issue close *), Bash(git diff *), Bash(git add *), Bash(git commit *), Bash(git reset), Bash(git checkout HEAD -- *), Bash(git rev-parse *), Bash(git config --get *), Bash(jq *), Bash(mkdir -p *)
---

# Dev Workflow Triage

Non-interactive daily triage of the `dev-workflow-bundle` retrospective issues. Designed for routine execution. See § No-Stall Principle below for the only permissible exits.

## No-Stall Principle

This skill has **no user-confirmation gates**. The run executes to completion or aborts to the Step 4 summary. Every other transition — sub-skill returns, loop boundaries, non-fatal error records, **TodoWrite phase / per-issue status flips** — continues without user confirmation; the only stopping points are the two exits listed below.

**Permissible fatal-abort exits (both emit the Step 4 summary and stop without entering the per-issue loop):**

- Step 1 pre-flight failures (defined in Step 1)
- Step 2 `gh issue list` non-zero exit (defined in Step 2)

Whole-issue `parse-error` is **not** an abort; the issue is left open with a triage comment and the run continues.

**No pause at sub-skill returns.** When `Skill(verify-diff)` or `Skill(skill-review)` returns, parse the result and follow the existing branch logic immediately. Long reasoning prose in the response is not a stopping signal — do not insert a "let me summarize what just happened" turn before the next action.

Concretely, the recognized return points are the (d) `Skill(verify-diff)` empirical check and the (d2) `Skill(skill-review)` polish bullets inside the Apply accepted Findings sub-flow. Both carry a return-point no-stall reminder inline; the duplication with this section is intentional so the rule appears at the decision moment. The (d)/(d2) reminders are scoped to **mid-Finding workflow** AND **mid-issue workflow** — i.e. they cover both same-Finding sub-step transitions (e.g. (d) → (d2) → (f) → (g)) and same-issue sub-step transitions (e.g. 3.4 → 3.5 → 3.6) so no separate inline reminder is needed at 3.4 → 3.5 or 3.5 → 3.6.

**No pause at issue-loop / Step boundaries.** Three additional return-point reminders cover the boundaries the (d)/(d2) reminders do not reach: the **issue boundary** (3.6 → next issue), the **last-issue → Step 3.7 boundary**, and the **Step 3.7 → Step 4 boundary**. Each boundary has its own inline reminder — same closed-list shape as (d)/(d2), placed at the decision moment.

**Phase / per-issue TodoWrite transitions are non-stalling.** Marking a phase row or per-issue row `completed` and the next row `in_progress` must happen as part of the same tool-call burst that produces the next concrete action — never as a standalone summary turn. The `TodoWrite` write itself is allowed (it's a status-only side effect, not a sensitive-path file write, so no permission dialog fires in routine execution), but no user-facing prose is emitted between the status flip and the next non-`TodoWrite` tool call.

**Non-fatal errors are recorded and skipped, not stops.** Per-Finding / per-issue errors (`comment-failed`, `close-failed`, `commit-failed`) continue with the next Finding or issue. Step 2 records `overflow=true` and the run keeps going on the truncated list. Step 3.7 errors (`release-bookkeeping=failed (commit error|scope leak|version skew|json invalid|changelog edit error)`) fall through to Step 4 — Step 3.7 runs once per run after the per-issue loop, so "next Finding" is not a possible recovery there. `references/triage-criteria.md` § Edge-case dispatch table is the authoritative list of dispositions.

**Stop-hook spurious fires are also non-fatal.** `~/.claude/stop-hook-git-check.sh` (auto-installed by Claude Code on the Web — see `§ Stop hook structural conflict`) fires on every Stop event during the (b)→(g) per-Finding flow because uncommitted state is normal mid-flow. The hook's `exit 2` injects a `Please commit and push…` feedback string but does **not** block — record the spurious fire and continue with the prescribed flow ((b)→(c)→(d)→(d2)→(f)→(g)). Do **not** jump ahead to (g) commit on hook feedback alone; that bypasses verify-diff / skill-review / scope check and is a misbehavior.

**Fatal tool-level errors are out of scope** — irrecoverable `Edit` / `Read` / `Bash` failures halt with a diagnostic regardless.

## Stop hook structural conflict (Claude Code on the Web)

Claude Code on the Web's container auto-installs `~/.claude/stop-hook-git-check.sh` (mode 755) at startup and registers it under `~/.claude/settings.json` `hooks.Stop` with an empty matcher (matches every Stop event). This is part of the Web environment's standard setup, **not** a user-defined hook.

**What it does**: on every Stop event, the hook checks the git working tree (recursion guard via `stop_hook_active`, then git-repo / remote / uncommitted / untracked / unpushed in order). If any of the last four trip, it `exit 2`s and injects a stderr feedback string (`Please commit and push…`) so the agent's turn continues — the hook **does not** block execution.

**Conflict mechanism**: the per-Finding flow in `§ 3.4 Apply accepted Findings` runs `(b) Edit → (c) frontmatter check → (d) Skill(verify-diff) → (d2) Skill(skill-review) (×3) → (f) scope check + stage → (g) commit`. Each subagent dispatch (verify-diff, the three skill-review iterations) creates a turn boundary, and uncommitted working-tree state between (b) and (g) is **normal** — that is the design. The hook fires at every boundary and feeds back `Please commit and push…` each time.

**Correct behavior**: see `§ No-Stall Principle`'s "Stop-hook spurious fires are also non-fatal" paragraph for the disposition. The cross-references in `verify-diff` SKILL.md (§ Stop hook structural conflict (caller-side note)) and `skill-review` SKILL.md (§ Scope) point back here so the same disposition is applied caller-agnostic.

**Bypass / disable guidance**:

- Permanent removal is discouraged — the hook serves other Web-environment purposes (e.g. nudging users about uncommitted state on conventional sessions)
- Per-routine bypass is unnecessary because the hook does not block (`exit 2` is a continue signal). Following the No-Stall Principle is sufficient
- Step 1 Pre-flight detects the hook's presence and surfaces it in the Step 4 summary as observability. Detection is warning-only — never an abort

## Fixed configuration

- **Target issue repository**: `SonicGarden/dev-workflow-issues` (hardcoded — change this line to retarget)
- **Bundle skills under triage scope**: `dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`
- **Edit target paths**: always `skills/<target>/SKILL.md` or `skills/<target>/references/*.md` (canonical source of truth). Never edit `.claude/skills/<target>/...` symlinks

The issue body format (`### Finding <N>`, 4 labeled fields, `Findings: N` trailer) is produced by `skills/dev-workflow/references/self-retrospective.md`. Parse and reject conditions in the "Parse body" step below and in `references/triage-criteria.md` must stay aligned with that producer.

## Triage classes

Every Finding ends in one of four states: `accept`, `reject`, `parse-error`, or `conflict`. See `references/triage-criteria.md` for the conditions behind each and the disposition table.

## Commit policy

**One accepted Finding = one commit.** Each commit is scoped to the target skill's directory. Message format:

```text
fix(<target-skill>): <Finding 1-line summary> (auto-triage #<issue-N>)

<optional 1-2 line body: Finding Category, brief reason>
```

`git push` is not performed here — Claude Code on the Web's session finalization handles pushes. Cross-run note: a prior run may have left committed-but-unpushed changes on HEAD (e.g. push happens only at session end, or a session died before push). That is expected and benign — Step 1's clean-working-tree check passes as long as no uncommitted diff is present, and the next triage run simply stacks fresh commits on top.

## Execution flow

### Step 1 — Pre-flight (abort with 0 findings on any failure)

- Run `gh --version`. Extract major / minor from the leading line. If < 2.28, set internal flag `no_reason_flag=true` (`gh issue close --reason` was introduced in 2.28)
- Run `gh auth status`. Non-zero ⇒ abort with "gh not authenticated"
- Run `git diff --quiet` and `git diff --cached --quiet`. Either non-zero ⇒ abort with "working tree is dirty — uncommitted WIP detected" (prevents folding user WIP into a triage commit)
- Run `git config --get user.email` and `git config --get user.name`. Either empty ⇒ abort with "git identity not configured" (fresh CI / routine containers often lack this)
- Detect Web-environment Stop hook (observability only, never abort): run `jq -r '[.hooks.Stop[]?.hooks[]?.command] | join(" ")' ~/.claude/settings.json 2>/dev/null || true`. If the output contains `stop-hook-git-check.sh`, set internal flag `stop_hook_present=true` for the Step 4 summary. File missing / parse failure / `hooks.Stop` absent ⇒ silent skip (flag stays unset). The trailing `|| true` ensures the pipeline status is benign under `set -e`. See `§ Stop hook structural conflict` for what the flag signals to the operator

After all pre-flight checks pass, register the **Workflow Phase Rows** in `TodoWrite` as a single call:

| `content` | `activeForm` | `status` |
|---|---|---|
| `Step 1: Pre-flight` | `Running pre-flight checks` | `completed` |
| `Step 2: List open issues` | `Listing open issues` | `in_progress` |
| `Step 3: Process each issue serially` | `Processing issues` | `pending` |
| `Step 3.7: Release bookkeeping` | `Running release bookkeeping` | `pending` |
| `Step 4: Emit summary` | `Emitting summary` | `pending` |

`Step 1: Pre-flight` is registered already-`completed` so the Step 4 audit trail can show "pre-flight passed". After this `TodoWrite` call, proceed directly to Step 2 in the same tool-call burst — the next tool call must be the `gh issue list` invocation, not a summary turn. See `§ No-Stall Principle` § Phase / per-issue TodoWrite transitions.

### Step 2 — List open issues

- Run `gh issue list --repo SonicGarden/dev-workflow-issues --state open --limit 50 --json number,title,body`. Use `jq` to extract fields when convenient (e.g. `... | jq -c '.[]'` to stream one issue per line, or `... | jq -r '.[].number'` to pull just numbers). The 50-issue cap is intentional — running the full per-Finding sub-flow (verify-diff + skill-review subagent dispatches) on hundreds of issues per routine invocation is impractical; subsequent routine runs progressively drain the rest of the queue
- Non-zero exit ⇒ fatal abort with summary "gh issue list failed" (covers auth revoked / network failure mid-run — pre-flight only proves auth at start of run, not for the duration)
- Empty (`0` issues) ⇒ in **a single `TodoWrite` call**, flip `Step 2: List open issues` → `completed`, `Step 3: Process each issue serially` → `completed` (no work to do), `Step 3.7: Release bookkeeping` → `completed` (the "skipped (no commits)" branch is reached by definition with zero issues), and `Step 4: Emit summary` → `in_progress`; then proceed directly to summary emission in the next tool-call burst (issuing three separate `TodoWrite` calls would create pause-window between them, which violates `§ No-Stall Principle`). Summary text begins with "no open issues"
- `1 ≤ N ≤ 49` ⇒ append `N` per-issue rows to `TodoWrite`, **inserted directly after the `Step 3: Process each issue serially` row** (so the per-issue rows render between Step 3 and Step 3.7), then flip `Step 2: List open issues` → `completed` and `Step 3: Process each issue serially` → `in_progress` in the same `TodoWrite` call. Each per-issue row uses `content: "Issue #<N>: <title-snippet>"` and `activeForm: "Processing issue #<N>"` (truncate `<title-snippet>` to a reasonable length if the title is long; informational only). All per-issue rows start with `status: pending`. Proceed directly to the per-issue loop (Step 3) in the next tool-call burst
- Exactly `50` ⇒ same per-issue append + status flip as above, plus set `overflow=true` (surface in summary as "50-issue cap reached" — `gh issue list` truncates and doesn't return a total, so `== limit` is the overflow signal)

### Step 3 — Process each issue serially

Do **not** parallelize. Same-skill edits race; `gh issue comment` is non-idempotent.

If Step 2 reported `0` open issues, this whole prelude (and the per-issue sub-steps that follow) is skipped — the 0-issues bullet in `§ List open issues` already flipped Step 3 / Step 3.7 / Step 4 phase rows in one `TodoWrite` call and proceeds directly to summary emission.

Otherwise, for each issue (in source order from Step 2's listing): the per-issue `TodoWrite` row registered in Step 2 is flipped to `in_progress` in the same tool-call burst as the next concrete action (typically the body parse or the first `Read`); the row is flipped to `completed` at the end of `§ Close decision` (or earlier — see `§ Title match` for the title-mismatch skip path). Three completion paths exist:

- **Normal path** (3.1 title match → 3.2 parse OK → 3.3–3.4 → 3.5 → 3.6): per-issue row flips to `completed` immediately after Step 3.6's Close decision settles (zero/non-zero exit alike — `close-failed` does not block the row flip)
- **Whole-issue parse-error path** (3.1 → 3.2 parse-error → 3.4 skipped → 3.5 → 3.6 close-call skipped, reminder dispatch fires): per-issue row flips to `completed` immediately after Step 3.5 finishes posting the triage comment. Step 3.6 skips the close call by definition for `parse-error`, but the reminder dispatch at the bottom of `§ Close decision` still applies — that dispatch is the path's terminal action, not 3.5
- **Title-mismatch skip path** (3.1 mismatch → no comment, no close): per-issue row flips to `completed` at the moment of the mismatch decision (skipped → still "processed" in terms of the audit log). The flip is idempotent — when this is a non-first issue, the prior issue's `§ Close decision` reminder #1 has already moved this row from `pending` to `in_progress`, so the §3.1 flip simply settles it to `completed`. When this is the very first issue (so reminder #1 has never fired), the row goes `pending → completed` directly

#### 3.1 Title match

If the title doesn't match `^\[auto-retrospective\] dev-workflow-bundle: \d+ findings`, skip the issue (no comment, no close). The per-issue row is flipped to `completed` here per `§ Process each issue serially` § Title-mismatch skip path (the flip is idempotent — current status is `in_progress` for non-first issues because the prior issue's reminder #1 already moved this row, and `pending` only for the very first issue). Skipping does not bypass the reminder dispatch — apply the dispatch at the end of `§ Close decision` (reminder #1 if more issues remain, reminder #2 if this was the last one) before advancing.

#### 3.2 Parse body

Extract Finding records. The producer (`skills/dev-workflow/references/self-retrospective.md`) emits fields with markdown bold labels — match them with this exact shape:

- Heading: line matching `^### Finding \d+$`
- Field labels (one per line, bold + colon + value): `^\*\*Target skill:\*\*\s*(.+)$`, `^\*\*Category:\*\*\s*(.+)$`, `^\*\*Description:\*\*\s*(.+)$`, `^\*\*Suggested fix direction:\*\*\s*(.+)$`
- Trailer: `^Findings: (\d+)$` near the end

Classify the **whole issue** as `parse-error` (jump to Post triage comment; continue to Close decision, where the close rule "close only if every Finding is accept/reject" leaves the issue open) if any of:

- Trailer `Findings: N` count disagrees with the number of `### Finding` headings
- Any Finding's `Target skill` is outside the 4-skill bundle (`dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`)
- Any Finding's `Category` is outside the 5-value set (`ambiguity`, `missing-branch`, `wrong-default`, `rules-conflict`, `other`) — mirrors the producer's own validation in `self-retrospective.md`
- Any of the 4 required fields is missing in any Finding

#### 3.3 Judge each Finding

For each Finding, read `skills/<target>/SKILL.md` first; additionally read `skills/<target>/references/<file>.md` on demand when the Description or Suggested fix direction clearly points at content outside SKILL.md (e.g. names the file, names a heading/section that belongs to a reference, or describes behavior documented in a reference). Apply `references/triage-criteria.md` to decide `accept` vs `reject`. Store decision + reasoning in memory. Do **not** edit yet.

#### 3.4 Apply accepted Findings (sub-flow (a)-(g) per Finding)

Process accepted Findings one at a time in the order they appear. Same-file Findings work sequentially — each re-reads the target file so its Edit matches the current (post-previous-commit) state.

**Register per-Finding iteration TodoWrite items** — at sub-step (a) entry for each accepted Finding (i.e. immediately before the `(a) Re-read target file` Read), create these items: `(d) verify-diff call`, `(d2) skill-review iter 1`, `(d2) skill-review iter 2`, `(d2) skill-review iter 3`. Mark `in_progress` before each iteration, `completed` after. On early convergence (skill-review returns no findings) or disable, mark remaining iteration items `completed` and append the reason directly to the item's `content` field as `— skipped: converged` or `— skipped: disabled` (TodoWrite has no dedicated note field). Steps (a)–(c), (f), (g) are deliberately not pre-registered — only the iteration loop is, because it is the loop that tends to exit early on the first "good enough" iteration when unmarked.

**Per-Finding record kept in memory for the Step 4 execution log** — alongside the existing decision + reasoning store from § Judge each Finding, also keep a small structured record per processed Finding so Step 4's Per-Finding execution log can render it. **TodoWrite is the progress UI, not a record source — it cannot be read back at runtime, so anything Step 4 needs has to be held in memory here.** **All fields are initialized to defaults on entry to (a)** so any sub-step that aborts early (e.g. (b)-Edit failure → `conflict` before (d) runs) leaves explicit defaults rather than undefined values. Defaults and update points:

- `disposition`: default `accept`. Downgrade paths in (b)/(c)/(d)/(f)/(g) overwrite it to `conflict`. Final values: `accept` / `reject` / `conflict` / `parse-error`.
- `target`: default `—`. Set to the edit target path on (b) success.
- `verify_diff`: default `—`. Set to status token from (d) — `converged` / `unresolved` / `skipped` / `conflict` / `disabled`.
- `iterations_used`: default `—`. Set to integer from `verify-diff`'s JSON verdict (or `0` when the call was skipped because `verify_diff_disabled=true`).
- `skill_review`: default `—`. Set to terminal token from (d2) — `converged-iter-<k>` (where `<k>` is the iteration that returned "No actionable findings", 1–3), `notes-left-after-3`, `error`, `skipped` (when (d2) was bypassed because verify-diff returned `conflict`), or `disabled`.
- `commit`: default `—`. Set to the commit hash on (g) zero-exit.

For each accepted Finding (the per-Finding memory record described above is updated **at the end of each sub-step that produces its corresponding field** — record-write points are called out inline below):

- **(a) Re-read target file** — `skills/<target>/<file>`. For the first Finding this is HEAD state; for later same-file Findings it's the prior commit's result. Build `old_string` / `new_string` against this state
- **(b) Apply Edit** — on failure (typically `old_string` not found because a prior Finding rewrote that region), downgrade to `conflict` and continue. **Record-write**: set `record.target = skills/<target>/<file>` on success; leave as `—` and set `record.disposition = conflict` on failure.
- **(c) Frontmatter integrity check** — re-read the edited file; the `---` YAML block must still parse. If not: downgrade to `conflict`, run `git checkout HEAD -- <target-file>` to revert (nothing is staged yet), continue
- **(d) `Skill(verify-diff)` empirical check** (up to 3 executor dispatches per Finding) — `verify-diff` derives 1–2 evaluation scenarios from the Finding in its main thread, then on each iteration dispatches a fresh bias-free executor that actually runs those scenarios against the post-diff file; if gaps remain the executor returns `suggested_edits` as JSON and `verify-diff` applies them autonomously, looping until convergence or max-iter. Inputs per Finding:
  - `Description` = Finding's `Description` field (verbatim)
  - `Suggested fix direction` = Finding's `Suggested fix direction` field (verbatim)
  - `Target file` = the file edited in (b)
  - `Base ref` = `HEAD`
  - `Max iterations` = `3`

  Parse the fenced JSON block `verify-diff` returns, then branch on `status` (every branch sets `record.verify_diff` to the status token and `record.iterations_used` to the JSON's `iterations_used`):
  - `converged` → proceed to (d2)
  - `unresolved` → record warning `verify-diff unresolved (<n> gaps)` (where `n = unresolved_gaps.length`), proceed to (d2)
  - `skipped` → record warning `verify-diff skipped (<reason>)` using `reason` from the summary, proceed to (d2)
  - `conflict` → downgrade the whole Finding to `conflict` (also set `record.disposition = conflict`). `verify-diff` has already reverted via `git checkout HEAD -- <reverted_paths>` inside its own safety rails, but re-run `git checkout HEAD -- <reverted_paths>` here as an idempotent safety net. Skip (d2), (f), and (g) — nothing commits for this Finding — then continue to the next Finding

  **Return-point no-stall reminder**: when `verify-diff` returns with `converged` / `unresolved` / `skipped` (any non-`conflict` result), this is mid-Finding workflow AND mid-issue workflow, never a terminal point. The next action is the (d2) `Skill(skill-review)` polish step — emit it in the **next tool call**, not after an interstitial summary or acknowledgment turn. See `§ No-Stall Principle`.

  **Consecutive-error disable** (mirrors the `skill-review` consecutive-error handling below): keep a per-run counter. `converged` or `unresolved` → counter reset (the skill is functioning, even if gaps remain). `skipped` or `conflict` → counter increments. When the counter reaches 2, set `verify_diff_disabled=true`; for the remainder of the run, skip the `verify-diff` call on each Finding and record warning `verify-diff disabled after consecutive errors`. Proceed directly to (d2) in that case. The `verify-diff disabled after consecutive errors` warning attaches from the Finding **immediately after** the disable was triggered; the triggering Finding itself only carries its own disposition (conflict, or its own `verify-diff skipped (<reason>)` warning).
- **(d2) `Skill(skill-review)` polish** (up to 3 iterations) — stop at the first iteration that returns no actionable findings. If any iteration applies edits, re-run (c) frontmatter check, AND re-check that `git diff --name-only` still lists only paths under `skills/` (the full scope check from (f) — run per iteration, not just at the end, so skill-review's sibling-file edits can't silently leak to the next Finding). If scope leaks, treat as (f)'s failure case immediately. After 3 iterations with findings remaining: record `skill-review notes left (<count>)` warning and continue to (f). **Record-write**: set `record.skill_review` per outcome — `converged-iter-<k>` (where `<k>` is the iteration that returned "No actionable findings"), `notes-left-after-3`, or `skipped` if (d2) was bypassed because (d) returned `conflict`.

  **Return-point no-stall reminder**: this sub-skill return (regardless of outcome — "No actionable findings", an applied-edits result, or any non-error outcome) is mid-Finding workflow AND mid-issue workflow, never a terminal point. The next action is (f) Scope check + stage in the **next tool call**, not after an interstitial summary or acknowledgment turn. See `§ No-Stall Principle`.
- **(e) skill-review error handling** — error response: record `skill-review error (<reason>)` and skip polish for this Finding. After 2 consecutive Findings with skill-review errors: set `skill_review_disabled=true` and skip polish for the rest of the run (warning: `skill-review disabled after consecutive errors`)
- **(f) Scope check + stage** — `git diff --name-only` must show paths only under `skills/`. Any path outside: downgrade to `conflict`, `git checkout HEAD -- <paths>`, continue. Otherwise `git add <paths>` with explicit paths
- **(g) Commit** — use a HEREDOC with sentinel `COMMIT_MSG_END` (not `EOF`, to avoid early termination if Finding text contains an `EOF` line):

  ```bash
  git commit -m "$(cat <<'COMMIT_MSG_END'
  fix(<target>): <summary> (auto-triage #<N>)

  Category: <category>
  Reason: <1-2 lines>
  COMMIT_MSG_END
  )"
  ```

  On zero exit: capture `git rev-parse HEAD` for the summary, and set `record.commit = <hash>` and `record.disposition = accept`. On non-zero (typically a pre-commit hook rejection): run `git reset` + `git checkout HEAD -- <paths>` to return to a clean tree, downgrade to `conflict` (`record.disposition = conflict`, `record.commit = —`), record `commit-failed`, continue

`references/triage-criteria.md` § edge-case dispatch table lists the same dispositions in table form — useful as a quick reference; the procedural prose above is authoritative for ordering.

#### 3.5 Post triage comment

After every Finding in the issue is classified (or immediately, if the whole issue was classified as `parse-error` by Parse body):

- Build the body using the template in `references/triage-criteria.md`
- `mkdir -p .triage`, then `Write` to `.triage/triage-<YYYY-MM-DD>-issue<N>.md`. On collision (re-run), append `-2`, `-3`, .... The file is gitignored and kept as a local in-session reference (the GitHub comment is canonical); do not delete it. The directory is intentionally placed outside `.claude/` so Claude Code's sensitive-path treatment for `.claude/*` paths does not trigger a Write permission prompt during routine execution
- Run `gh issue comment <N> --repo SonicGarden/dev-workflow-issues --body-file <path>`
- Non-zero exit: record `comment-failed`, continue with other issues

#### 3.6 Close decision

Close the issue only if every Finding is `accept` or `reject` (no `parse-error`, no `conflict`). Otherwise leave open for human review.

- When closing: `gh issue close <N> --repo ...` with `--reason completed` (any accepts) or `--reason "not planned"` (all rejects). Drop `--reason` if `no_reason_flag=true` (gh < 2.28)
- Non-zero exit: record `close-failed`, continue

After the per-issue row reaches its terminal sub-step (`§ Close decision` for the normal and parse-error paths; the title-mismatch decision in `§ Title match` for the skip path), apply **exactly one** of the two return-point reminders below — reminder #1 if more unprocessed issues remain in the per-issue queue, reminder #2 if this was the last issue.

**If more unprocessed issues remain in the per-issue queue (apply reminder #1):**

> **Return-point no-stall reminder**: Closing this issue (regardless of disposition — `accept-close`, `not-planned-close`, `close-failed`, `close-skipped (parse-error or all-conflict)`, `title-mismatch-skip`, any non-error result) is mid-run workflow when more issues remain. Ensure the just-finished per-issue row is `completed` (already flipped on the title-mismatch path; flip it now on the normal / parse-error paths) and mark the next per-issue row `in_progress` in the **next tool call** — never insert an interstitial summary or acknowledgment turn before resuming with the next issue's body parse / first `Read`. See `§ No-Stall Principle`.

**Otherwise (this is the last issue in the queue — apply reminder #2):**

> **Return-point no-stall reminder**: Finishing the last issue (regardless of disposition — any combination of `accept` / `reject` / `conflict` / `parse-error` across the run, any non-error result) is not a terminal point. Mark the last per-issue row `completed`, mark the `Step 3: Process each issue serially` phase row `completed`, and mark the `Step 3.7: Release bookkeeping` phase row `in_progress` in the **next tool call** (one `TodoWrite` call carrying all three flips), then proceed directly to Step 3.7 release bookkeeping. See `§ No-Stall Principle`.

### Step 3.7 — Release bookkeeping (after all issues processed)

After every issue has been processed, perform a single bookkeeping pass to bump the marketplace version of every modified bundle skill plus `dev-workflow-bundle`, and record a CHANGELOG entry. This step runs **once per run**, not per issue.

Entry state: the `Step 3.7: Release bookkeeping` row is already `in_progress` (flipped by Step 3.6's last-issue reminder #2). When this step terminates (any branch — including the (a) early-return), the boundary reminder at the bottom of this section handles the `completed` flip and the Step 4 `in_progress` flip in one `TodoWrite` call. (The 0-open-issues path in Step 2 does not enter this section — Step 3.7 was already flipped to `completed` there as part of the four-row flip.)

The accepted-and-committed list, every per-Finding commit hash, and every (target-skill, Finding summary, issue-N, Category, Reason) tuple needed below are already held in memory from Step 3.4 — do not re-derive them by re-parsing git or the issue list.

**(a) Early return**: if zero Findings were accepted-and-committed across the entire run, skip release bookkeeping; record `release-bookkeeping=skipped (no commits)`; proceed to the boundary reminder at the bottom of this section, then to Step 4.

**(b) Modified-skill set**: from the accepted-and-committed list, build the unique set of `<target-skill>` values. Filter against the four-skill bundle whitelist (`dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`) — values outside the bundle are not expected here, but filter defensively.

**(c) Plugin mapping**.

> **Reminder — keep in sync with `§ Fixed configuration`**: This must list exactly the same skills as `§ Fixed configuration`'s "Bundle skills under triage scope" line. If you add a new bundle skill, update both this table AND the bundle skills line in `§ Fixed configuration`.

| bundle skill (target name in the issue) | marketplace plugin name |
|---|---|
| `dev-workflow` | `dev-workflow` |
| `ask-peer` | `peer` |
| `extract-rules` | `extract-rules` |
| `rules-review` | `rules-review` |

**(d) Bump set**: take the plugin names from (c) and always add `dev-workflow-bundle` to the set. **Skill bump and bundle bump are always paired.** The CHANGELOG subsection header is always rendered as `### <skill> v<new> / dev-workflow-bundle v<new>` — bundle-only subsections are never written.

**(e) Read versions and check skew**: in a single `jq` invocation, read the `version` of every plugin in the bump set plus the always-included pair `dev-workflow` and `dev-workflow-bundle` (always included so the skew check can run even when `dev-workflow` itself wasn't modified this run — e.g. an `ask-peer`-only run still needs to compare `dev-workflow` against `dev-workflow-bundle`):

```bash
jq -r '.plugins[] | select(.name | IN("dev-workflow","peer","extract-rules","rules-review","dev-workflow-bundle")) | "\(.name)=\(.version)"' .claude-plugin/marketplace.json
```

(Filter the `IN(...)` list to just the plugin names in the bump set plus the always-included pair `dev-workflow` and `dev-workflow-bundle` — no need to read versions you won't bump or use for skew check.) If the parsed `dev-workflow` and `dev-workflow-bundle` versions disagree, abort: record `release-bookkeeping=failed (version skew: dev-workflow=<v1>, dev-workflow-bundle=<v2>)` and proceed to Step 4 (per-Finding commits stay in HEAD).

**(f) Patch bump computation**: from the parsed versions, increment the third semver component of each bump-set plugin by 1 (e.g. `1.34.2` → `1.34.3`). `major.minor` are never changed.

**(g) Edit `marketplace.json`** for each bump-set plugin, one at a time:

- Use the `Edit` tool. `old_string` must span the plugin name line and the version line as one contiguous block. **The `...` placeholder shown below is shorthand — `Edit` requires a verbatim substring match, so fill the gap with the actual intermediate fields (`description`, `source`, `skills`, `author`, … as they appear in the file)** — read `marketplace.json` first and copy the exact lines. Schematic shape:

  ```text
  "name": "<plugin>",
        ... (intermediate fields verbatim from the file) ...
        "version": "<old>",
  ```

- **Name prefix-match warning**: `"name": "dev-workflow"` is a substring of `"name": "dev-workflow-bundle"`, so always include the closing `"` and trailing `,` of the `name` field — otherwise Edit halts with a not-unique error.
- Do **not** use `replace_all` — multiple plugins may share the same version string.

After all Edits land, run `jq empty .claude-plugin/marketplace.json` once. On failure, revert via `git checkout HEAD -- .claude-plugin/marketplace.json`, record `release-bookkeeping=failed (json invalid)`, and proceed to Step 4.

**(h) Update `CHANGELOG.md`**:

- Keep the existing first line `# Changelog` intact.
- Find today's `## YYYY-MM-DD` heading directly under `# Changelog`. If absent, insert a new today's heading immediately after `# Changelog`. If present (a same-day prior triage run wrote it), keep it and prepend new content under it — do not duplicate the heading.
- Under today's heading, **prepend** one `### <skill> v<new> / dev-workflow-bundle v<new>` subsection per modified bundle skill, ordering newer-version subsections above any older same-day subsections (matches the existing CHANGELOG style: newer versions on top). When this run bumps multiple skills, write the per-skill subsections in **alphabetical skill name** order so re-runs are deterministic.
- Under each `### <skill> v...` subsection, write one bullet per accepted Finding that targeted that skill (in original Finding order):
  - `- fix(<skill>): <Finding 1-line summary> (auto-triage #<issue-N>)`
  - Optionally followed by a nested `  - Category: <category>; <1-line Reason>` line for parity with the existing CHANGELOG body style.

If any Edit in (h) fails partway (e.g. the heading insert succeeded but a subsequent subsection write failed), revert via `git checkout HEAD -- .claude-plugin/marketplace.json CHANGELOG.md`, record `release-bookkeeping=failed (changelog edit error)`, and proceed to Step 4.

**(i) Scope check**: run `git diff --name-only`. The result must list exactly `.claude-plugin/marketplace.json` and `CHANGELOG.md` and nothing else. If anything else appears, revert via `git checkout HEAD -- .claude-plugin/marketplace.json CHANGELOG.md`, record `release-bookkeeping=failed (scope leak)`, and proceed to Step 4. **Per-Finding commits stay in HEAD** through every Step 3.7 failure branch — `git checkout HEAD -- ...` only affects working-tree paths, not committed history.

**(j) Stage and commit**: `git add .claude-plugin/marketplace.json CHANGELOG.md`, then commit using the same HEREDOC-with-`COMMIT_MSG_END` pattern that the per-Finding commit step in `§ 3.4 Apply accepted Findings` uses:

```bash
git commit -m "$(cat <<'COMMIT_MSG_END'
chore(release): bump <skill1> v<new1>[, <skill2> v<new2> ...] + dev-workflow-bundle v<newB> (auto-triage YYYY-MM-DD)

Auto-bumped by dev-workflow-triage following <K> accepted Finding(s) across <issue-list>.
COMMIT_MSG_END
)"
```

The trailing `(auto-triage YYYY-MM-DD)` in the subject distinguishes same-day re-runs in `git log`.

On non-zero exit (typical case: a pre-commit hook rejection), recover with `git reset` + `git checkout HEAD -- .claude-plugin/marketplace.json CHANGELOG.md`, record `release-bookkeeping=failed (commit error)`, and proceed to Step 4.

On zero exit, capture `git rev-parse HEAD` as the bookkeeping commit hash for the Step 4 summary line `release-bookkeeping=<hash>`.

After this step terminates (any branch), apply the following boundary reminder before proceeding to Step 4:

> **Return-point no-stall reminder**: Step 3.7 termination (regardless of outcome — a successful commit hash, `skipped (no commits)`, `failed (version skew | json invalid | changelog edit error | scope leak | commit error)`, any non-error result) is not a terminal point. Mark `Step 3.7: Release bookkeeping` row `completed` and `Step 4: Emit summary` row `in_progress` in the **next tool call** (a single `TodoWrite` carrying both flips), then proceed directly to summary emission. See `§ No-Stall Principle`.

### Step 4 — Emit summary

Print to stdout (the only trace a routine leaves). The summary has two sections — first the **Per-Finding execution log**, then the aggregate counters.

Entry state: the `Step 4: Emit summary` row is already `in_progress` (flipped either by the Step 3.7 → Step 4 boundary reminder, or by the 0-open-issues path in Step 2). The final `completed` flip and the summary stdout output **must occur in the same tool-call burst**. See `§ No-Stall Principle` § Phase / per-issue TodoWrite transitions.

**Per-Finding execution log** — one block per processed Finding in source order. Fields source from the per-Finding memory record in § Apply accepted Findings. When the run produced zero Finding records (e.g. the 0-open-issues path, or a run where every issue ended in title-mismatch with no Findings parsed), still render the `Per-Finding execution log` heading and emit a single placeholder line `(none — 0 Findings logged)` under it before the aggregate summary. **Each field renders its written value, or `—` if the record-write point was never reached** — this rule applies uniformly across all dispositions (`accept` / `reject` / `conflict` / `parse-error`), driven by which sub-steps actually ran for that Finding, not by the disposition itself. The `verify-diff` line carries an `[iter ...]` clause that follows these cases:

- `verify_diff` ∈ {`converged`, `unresolved`, `skipped`, `conflict`} (the (d) sub-step ran): render `<token> [iter <iterations_used>/3]`
- `verify_diff` = `disabled` (the (d) sub-step was skipped because `verify_diff_disabled=true`): render `disabled [iter —]`
- `verify_diff` = `—` (the (d) sub-step never ran for this Finding — e.g. (b)/(c) downgraded to `conflict` first, or the disposition is `parse-error`/`reject`): render just `—` with no `[iter ...]` clause

```text
issue #<N> Finding <n>: <accept|reject|conflict|parse-error>
  target:        skills/<target>/<file> | —
  verify-diff:   <converged|unresolved|skipped|conflict> [iter <iterations_used>/3] | disabled [iter —] | —
  skill-review:  <converged-iter-<k>|notes-left-after-3|error|skipped|disabled> | —
  commit:        <hash> | —
```

**Aggregate summary** (printed after the per-Finding log):

- Open issues received / processed / skipped for title mismatch
- Counts per outcome: `accept`, `reject`, `conflict` are Finding-level (count one per Finding); `parse-error` is issue-level (count one per whole-issue parse-error, regardless of the number of Findings the issue contained)
- Accepted-and-committed files (relative paths) with commit hashes
- verify-diff state: `enabled` or `disabled-after-errors`; count of Findings with `verify-diff unresolved (<n> gaps)`; count of Findings with `verify-diff skipped (<reason>)` broken down by reason
- verify-diff dispatches consumed: cumulative Agent-tool dispatches across the run (cost observability)
- skill-review state: `enabled` or `disabled-after-errors`; count of Findings with `skill-review notes left`
- Failure counts: `comment-failed` / `close-failed` / `commit-failed`, with (issue#, finding#) pairs
- `overflow=true` notice if Step 2 hit the 50-issue cap (rendered as `50-issue cap reached`)
- `release-bookkeeping`: one of `<commit-hash>` (success), `skipped (no commits)`, `failed (version skew: dev-workflow=<v1>, dev-workflow-bundle=<v2>)`, `failed (json invalid)`, `failed (changelog edit error)`, `failed (scope leak)`, or `failed (commit error)` — sourced from Step 3.7's outcome
- `stop-hook-detected: ~/.claude/stop-hook-git-check.sh (Web env standard hook) — spurious fires during multi-subagent dispatch flow are recorded and ignored per § Stop hook structural conflict` if the Step 1 pre-flight detection set `stop_hook_present=true`. Omit the line entirely when the flag is unset (Local environment / hook absent)

Always emit the summary, even on zero-activity runs — "ran but made no changes" must be distinguishable from "didn't run at all".
