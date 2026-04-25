---
name: dev-workflow-triage
description: Triage open issues in the dev-workflow-bundle retrospective repo. Read each open issue, judge each Finding (accept / reject), apply accepted fixes to the bundle skills (dev-workflow, ask-peer, extract-rules, rules-review), post a triage comment, and close the issue. Designed for non-interactive routine execution (no plan mode, no user prompts) on Claude Code on the Web.
allowed-tools: Read, Edit, Write, TodoWrite, Skill(verify-diff), Skill(skill-review), Bash(gh auth status), Bash(gh --version), Bash(gh issue list *), Bash(gh issue comment *), Bash(gh issue close *), Bash(git diff *), Bash(git add *), Bash(git commit *), Bash(git reset), Bash(git checkout HEAD -- *), Bash(git rev-parse *), Bash(git config --get *), Bash(jq *), Bash(mkdir -p *)
---

# Dev Workflow Triage

Non-interactive daily triage of the `dev-workflow-bundle` retrospective issues. Designed for routine execution. See § No-Stall Principle below for the only permissible exits.

## No-Stall Principle

This skill has **no user-confirmation gates**. The run executes to completion or aborts to the Step 4 summary. Every other transition — sub-skill returns, loop boundaries, non-fatal error records — continues without user confirmation; the only stopping points are the two exits listed below.

**Permissible fatal-abort exits (both emit the Step 4 summary and stop without entering the per-issue loop):**

- Step 1 pre-flight failures (defined in Step 1)
- Step 2 `gh issue list` non-zero exit (defined in Step 2)

Whole-issue `parse-error` is **not** an abort; the issue is left open with a triage comment and the run continues.

**No pause at sub-skill returns.** When `Skill(verify-diff)` or `Skill(skill-review)` returns, parse the result and follow the existing branch logic immediately. Long reasoning prose in the response is not a stopping signal — do not insert a "let me summarize what just happened" turn before the next action.

Concretely, the recognized return points are the (d) `Skill(verify-diff)` empirical check and the (d2) `Skill(skill-review)` polish bullets inside the Apply accepted Findings sub-flow. Both carry a return-point no-stall reminder inline; the duplication with this section is intentional so the rule appears at the decision moment.

**Non-fatal errors are recorded and skipped, not stops.** `comment-failed`, `close-failed`, `commit-failed`, `overflow=true`, and `release-bookkeeping-failed` (any non-zero exit from Step 3.7's release commit, or its scope-leak / version-skew guards) all continue with the next Finding or issue, or fall through to Step 4 — `references/triage-criteria.md` § Edge-case dispatch table is the authoritative list of dispositions.

**Fatal tool-level errors are out of scope** — irrecoverable `Edit` / `Read` / `Bash` failures halt with a diagnostic regardless.

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

### Step 2 — List open issues

- Run `gh issue list --repo SonicGarden/dev-workflow-issues --state open --limit 200 --json number,title,body`. Use `jq` to extract fields when convenient (e.g. `... | jq -c '.[]'` to stream one issue per line, or `... | jq -r '.[].number'` to pull just numbers)
- Non-zero exit ⇒ fatal abort with summary "gh issue list failed" (covers auth revoked / network failure mid-run — pre-flight only proves auth at start of run, not for the duration)
- Empty ⇒ emit summary "no open issues" and exit
- Exactly 200 ⇒ set `overflow=true` (surface in summary as "200-issue cap reached" — `gh issue list` truncates and doesn't return a total, so `== limit` is the overflow signal)

### Step 3 — Process each issue serially

Do **not** parallelize. Same-skill edits race; `gh issue comment` is non-idempotent.

#### 3.1 Title match

If the title doesn't match `^\[auto-retrospective\] dev-workflow-bundle: \d+ findings`, skip the issue (no comment, no close).

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

**Register per-Finding iteration TodoWrite items** — before processing each accepted Finding, create these items: `(d) verify-diff call`, `(d2) skill-review iter 1`, `(d2) skill-review iter 2`, `(d2) skill-review iter 3`. Mark `in_progress` before each iteration, `completed` after. On early convergence (skill-review returns no findings) or disable, mark remaining iteration items `completed` and append the reason directly to the item's `content` field as `— skipped: converged` or `— skipped: disabled` (TodoWrite has no dedicated note field). Steps (a)–(c), (f), (g) are deliberately not pre-registered — only the iteration loop is, because it is the loop that tends to exit early on the first "good enough" iteration when unmarked.

**Per-Finding record kept in memory for the Step 4 execution log** — alongside the existing decision + reasoning store from § 3.3, also keep a small structured record per processed Finding so Step 4's Per-Finding execution log can render it. **TodoWrite is the progress UI, not a record source — it cannot be read back at runtime, so anything Step 4 needs has to be held in memory here.** The record fields:

- `disposition`: `accept` / `reject` / `conflict` / `parse-error`
- `target`: the edit target path from (b), or `—` when no edit was attempted
- `verify_diff`: status token from (d) — `converged` / `unresolved` / `skipped` / `conflict` / `disabled` — paired with `iterations_used` from the JSON verdict (set to `0` when the call was skipped because `verify_diff_disabled=true`)
- `skill_review`: terminal token from (d2) — `converged-iter-<k>` (where `<k>` is the iteration that returned "No actionable findings", 1–3), `notes-left-after-3`, `error`, `skipped` (when (d2) was bypassed because verify-diff returned `conflict`), or `disabled`
- `commit`: the commit hash from (g), or `—` when no commit happened

For each accepted Finding:

- **(a) Re-read target file** — `skills/<target>/<file>`. For the first Finding this is HEAD state; for later same-file Findings it's the prior commit's result. Build `old_string` / `new_string` against this state
- **(b) Apply Edit** — on failure (typically `old_string` not found because a prior Finding rewrote that region), downgrade to `conflict` and continue
- **(c) Frontmatter integrity check** — re-read the edited file; the `---` YAML block must still parse. If not: downgrade to `conflict`, run `git checkout HEAD -- <target-file>` to revert (nothing is staged yet), continue
- **(d) `Skill(verify-diff)` empirical check** (up to 3 executor dispatches per Finding) — `verify-diff` derives 1–2 evaluation scenarios from the Finding in its main thread, then on each iteration dispatches a fresh bias-free executor that actually runs those scenarios against the post-diff file; if gaps remain the executor returns `suggested_edits` as JSON and `verify-diff` applies them autonomously, looping until convergence or max-iter. Inputs per Finding:
  - `Description` = Finding's `Description` field (verbatim)
  - `Suggested fix direction` = Finding's `Suggested fix direction` field (verbatim)
  - `Target file` = the file edited in (b)
  - `Base ref` = `HEAD`
  - `Max iterations` = `3`

  Parse the fenced JSON block `verify-diff` returns, then branch on `status`:
  - `converged` → proceed to (d2)
  - `unresolved` → record warning `verify-diff unresolved (<n> gaps)` (where `n = unresolved_gaps.length`), proceed to (d2)
  - `skipped` → record warning `verify-diff skipped (<reason>)` using `reason` from the summary, proceed to (d2)
  - `conflict` → downgrade the whole Finding to `conflict`. `verify-diff` has already reverted via `git checkout HEAD -- <reverted_paths>` inside its own safety rails, but re-run `git checkout HEAD -- <reverted_paths>` here as an idempotent safety net. Skip (d2), (f), and (g) — nothing commits for this Finding — then continue to the next Finding

  **Return-point no-stall reminder**: when `verify-diff` returns with `converged` / `unresolved` / `skipped` (any non-`conflict` result), this is mid-Finding workflow, never a terminal point. The next action is the (d2) `Skill(skill-review)` polish step — emit it in the **next tool call**, not after an interstitial summary or acknowledgment turn. See `§ No-Stall Principle`.

  **Consecutive-error disable** (mirrors the `skill-review` consecutive-error handling below): keep a per-run counter. `converged` or `unresolved` → counter reset (the skill is functioning, even if gaps remain). `skipped` or `conflict` → counter increments. When the counter reaches 2, set `verify_diff_disabled=true`; for the remainder of the run, skip the `verify-diff` call on each Finding and record warning `verify-diff disabled after consecutive errors`. Proceed directly to (d2) in that case. The `verify-diff disabled after consecutive errors` warning attaches from the Finding **immediately after** the disable was triggered; the triggering Finding itself only carries its own disposition (conflict, or its own `verify-diff skipped (<reason>)` warning).
- **(d2) `Skill(skill-review)` polish** (up to 3 iterations) — stop at the first iteration that returns no actionable findings. If any iteration applies edits, re-run (c) frontmatter check, AND re-check that `git diff --name-only` still lists only paths under `skills/` (the full scope check from (f) — run per iteration, not just at the end, so skill-review's sibling-file edits can't silently leak to the next Finding). If scope leaks, treat as (f)'s failure case immediately. After 3 iterations with findings remaining: record `skill-review notes left (<count>)` warning and continue to (f).

  **Return-point no-stall reminder**: this sub-skill return (regardless of outcome — "No actionable findings", an applied-edits result, or any non-error outcome) is mid-Finding workflow, never a terminal point. The next action is (f) Scope check + stage in the **next tool call**, not after an interstitial summary or acknowledgment turn. See `§ No-Stall Principle`.
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

  On zero exit: capture `git rev-parse HEAD` for the summary. On non-zero (typically a pre-commit hook rejection): run `git reset` + `git checkout HEAD -- <paths>` to return to a clean tree, downgrade to `conflict`, record `commit-failed`, continue

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

### Step 3.7 — Release bookkeeping (after all issues processed)

After every issue has been processed, perform a single bookkeeping pass to bump the marketplace version of every modified bundle skill plus `dev-workflow-bundle`, and record a CHANGELOG entry. This step runs **once per run**, not per issue.

The accepted-and-committed list, every per-Finding commit hash, and every (target-skill, Finding summary, issue-N, Category, Reason) tuple needed below are already held in memory from Step 3.4 — do not re-derive them by re-parsing git or the issue list.

**(a) Early return**: if zero Findings were accepted-and-committed across the entire run, skip release bookkeeping; record `release-bookkeeping=skipped (no commits)`; proceed to Step 4.

**(b) Modified-skill set**: from the accepted-and-committed list, build the unique set of `<target-skill>` values. Filter against the four-skill bundle whitelist (`dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`) — values outside the bundle are not expected here, but filter defensively.

**(c) Plugin mapping**.

> **Reminder — keep in sync with `§ Fixed configuration`**: This must list exactly the same skills as `§ Fixed configuration`'s "Bundle skills under triage scope" line. If you add a new bundle skill, update both this table AND the bundle skills line in `§ Fixed configuration`.

| bundle skill (target name in the issue) | marketplace plugin name |
|---|---|
| `dev-workflow` | `dev-workflow` |
| `ask-peer` | `peer` |
| `extract-rules` | `extract-rules` |
| `rules-review` | `rules-review` |

**(d) Bump set**: take the plugin names from (c) and always add `dev-workflow-bundle` to the set. **Skill bump and bundle bump are always paired.** The CHANGELOG subsection header is always rendered as `### <skill> v<new> / dev-workflow-bundle v<new>` — bundle-only subsections are never written, because a `dev-workflow-bundle` bump without an underlying skill bump is impossible by construction.

**(e) Version-skew guard** (read-only): before any edit, run

```bash
jq -r '.plugins[] | select(.name == "dev-workflow") | .version' .claude-plugin/marketplace.json
jq -r '.plugins[] | select(.name == "dev-workflow-bundle") | .version' .claude-plugin/marketplace.json
```

If the two values disagree, abort release bookkeeping with no marketplace / CHANGELOG edits; record `release-bookkeeping=failed (version skew: dev-workflow=<v1>, dev-workflow-bundle=<v2>)` and proceed to Step 4. Per-Finding commits remain in HEAD untouched. Bumping both from a skewed base would only carry the mismatch forward by `+1`.

**(f) Patch bump computation**: for each plugin in the bump set, read its current version with `jq -r '.plugins[] | select(.name == "<plugin>") | .version' .claude-plugin/marketplace.json` and increment the third semver component by 1 (e.g. `1.34.2` → `1.34.3`). `major.minor` are never changed here.

**(g) Edit `marketplace.json`** for each bump-set plugin, one at a time:

- Use the `Edit` tool. Build `old_string` to span the **plugin name AND the version line** as one contiguous block — typically `"name": "<plugin>",\n      "description": "...",\n      ...,\n      "version": "<old>",`. The block must contain the closing double-quote and trailing `,` of the `name` field.
- **Name prefix-match warning**: `"name": "dev-workflow"` is a substring of `"name": "dev-workflow-bundle"`. The `Edit` tool requires `old_string` to be unique; if `old_string` ends at the `"` after `dev-workflow` (Bad: `"name": "dev-workflow"`), it matches both lines and Edit halts with a not-unique error. Always include the closing `"` and trailing `,` (Good: `"name": "dev-workflow",`).
- Do **not** use `replace_all` — multiple plugins may share the same version string.
- Do **not** introduce `jq | ... > .tmp; mv .tmp ...` here. The project's allowed-tools policy forbids `Bash(mv *)` without a strong reason; the `Edit` path keeps allowed-tools minimal.
- After each Edit, run `jq empty .claude-plugin/marketplace.json` to confirm the JSON still parses. A failure here means the Edit broke structure — jump to the failure handler in (j).

**(h) Update `CHANGELOG.md`**:

- Keep the existing first line `# Changelog` intact.
- Find today's `## YYYY-MM-DD` heading directly under `# Changelog`. If absent, insert a new today's heading immediately after `# Changelog`. If present (a same-day prior triage run wrote it), keep it and prepend new content under it — do not duplicate the heading.
- Under today's heading, **prepend** one `### <skill> v<new> / dev-workflow-bundle v<new>` subsection per modified bundle skill, ordering newer-version subsections above any older same-day subsections (matches the existing CHANGELOG style: newer versions on top).
- Under each `### <skill> v...` subsection, write one bullet per accepted Finding that targeted that skill (in original Finding order):
  - `- fix(<skill>): <Finding 1-line summary> (auto-triage #<issue-N>)`
  - Optionally followed by a nested `  - Category: <category>; <1-line Reason>` line for parity with the existing CHANGELOG body style.

**(i) Scope check**: run `git diff --name-only`. The result must list exactly `.claude-plugin/marketplace.json` and `CHANGELOG.md` and nothing else. If anything else appears (e.g. an editor or pre-edit hook touched another file), revert via `git checkout HEAD -- .claude-plugin/marketplace.json CHANGELOG.md`, record `release-bookkeeping=failed (scope leak)`, and proceed to Step 4. **Per-Finding commits are preserved** — they live in HEAD already and are not affected by this `git checkout`.

**(j) Stage and commit**: `git add .claude-plugin/marketplace.json CHANGELOG.md`, then commit using the same HEREDOC-with-`COMMIT_MSG_END` pattern as Step 3.4 (g):

```bash
git commit -m "$(cat <<'COMMIT_MSG_END'
chore(release): bump <skill1> v<new1>[, <skill2> v<new2> ...] + dev-workflow-bundle v<newB> (auto-triage YYYY-MM-DD)

Auto-bumped by dev-workflow-triage following <K> accepted Finding(s) across <issue-list>.
COMMIT_MSG_END
)"
```

The trailing `(auto-triage YYYY-MM-DD)` in the subject distinguishes same-day re-runs in `git log`.

On non-zero exit (typical case: a pre-commit hook rejection or unexpected staged content), recover with `git reset` + `git checkout HEAD -- .claude-plugin/marketplace.json CHANGELOG.md`, record `release-bookkeeping=failed (commit error)`, and proceed to Step 4. **Per-Finding commits are preserved.**

On zero exit, capture `git rev-parse HEAD` as the bookkeeping commit hash for the Step 4 summary line `release-bookkeeping=<hash>`.

### Step 4 — Emit summary

Print to stdout (the only trace a routine leaves). The summary has two sections — first the **Per-Finding execution log** (one block per processed Finding so the actual iteration counts are visible at a glance), then the existing aggregate counters.

**Per-Finding execution log** — render one block per Finding in the order issues were processed and Findings appeared inside each issue. Source the data from the per-Finding memory record described in § 3.4 ("Per-Finding record kept in memory for the Step 4 execution log"). Use this exact shape so a human can scan iteration counts in one pass:

```text
issue #<N> Finding <n>: <accept|reject|conflict|parse-error>
  target:        skills/<target>/<file> | —
  verify-diff:   <converged|unresolved|skipped|conflict|disabled> [iter <iterations_used>/3]
  skill-review:  <converged-iter-<k>|notes-left-after-3|error|skipped|disabled>
  commit:        <hash> | —
```

Notes:

- `[iter <iterations_used>/3]` is always emitted, including for `disabled` (where `<iterations_used>=0`) — the fixed-width form keeps the column machine-parseable.
- For `parse-error` Findings (whole-issue parse failure), set `target`, `verify-diff`, `skill-review`, and `commit` all to `—` — none of those steps run.
- For `reject` Findings, set `target`, `verify-diff`, `skill-review`, and `commit` all to `—` for the same reason.

**Aggregate summary** (printed after the per-Finding log):

- Open issues received / processed / skipped for title mismatch
- Counts per outcome: `accept`, `reject`, `conflict` are Finding-level (count one per Finding); `parse-error` is issue-level (count one per whole-issue parse-error, regardless of the number of Findings the issue contained)
- Accepted-and-committed files (relative paths) with commit hashes
- verify-diff state: `enabled` or `disabled-after-errors`; count of Findings with `verify-diff unresolved (<n> gaps)`; count of Findings with `verify-diff skipped (<reason>)` broken down by reason
- verify-diff dispatches consumed: cumulative Agent-tool dispatches across the run (cost observability)
- skill-review state: `enabled` or `disabled-after-errors`; count of Findings with `skill-review notes left`
- Failure counts: `comment-failed` / `close-failed` / `commit-failed`, with (issue#, finding#) pairs
- `overflow=true` notice if Step 2 hit the 200-issue cap
- `release-bookkeeping`: one of `<commit-hash>` (success), `skipped (no commits)`, `failed (version skew: dev-workflow=<v1>, dev-workflow-bundle=<v2>)`, `failed (scope leak)`, or `failed (commit error)` — sourced from Step 3.7's outcome

Always emit the summary, even on zero-activity runs — "ran but made no changes" must be distinguishable from "didn't run at all".
