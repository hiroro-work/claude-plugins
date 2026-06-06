---
name: dev-workflow-triage
description: Triage open issues in the dev-workflow-bundle retrospective repo. Read each open issue, judge each Finding (accept / reject), apply accepted fixes to the triage-scope skills (the bundle skills dev-workflow, ask-peer, extract-rules, rules-review, plus dev-workflow-triage itself for self-targeted findings from its own self-retrospective), post a triage comment, and close the issue. Designed for non-interactive routine execution (no plan mode, no user prompts) on Claude Code on the Web.
allowed-tools: Read, Edit, Write, TaskCreate, TaskUpdate, TodoWrite, Skill(verify-diff), Skill(skill-review), Skill(publicity-review), Skill(verify-bundle-sync), Bash(gh auth status), Bash(gh --version), Bash(gh issue list *), Bash(gh issue comment *), Bash(gh issue close *), Bash(gh api --method POST /repos/*/issues *), Bash(git diff *), Bash(git add *), Bash(git commit *), Bash(git reset), Bash(git checkout HEAD -- *), Bash(git fetch *), Bash(git push *), Bash(git rev-parse *), Bash(git config --get *), Bash(git for-each-ref *), Bash(git symbolic-ref *), Bash(git switch *), Bash(git branch *), Bash(date *), Bash(jq *), Bash(mkdir -p *), Bash(cp -R *)
---

# Dev Workflow Triage

Non-interactive daily triage of the `dev-workflow-bundle` retrospective issues. Designed for routine execution. See § No-Stall Principle below for the only permissible exits.

## No-Stall Principle

This skill has **no user-confirmation gates**. The run executes to completion or aborts to the Step 4 summary. Every other transition — sub-skill returns, loop boundaries, non-fatal error records, **phase / per-issue status flips** — continues without user confirmation; the only stopping points are the two exits listed below.

**Permissible fatal-abort exits (both emit the Step 4 summary and stop without entering the per-issue loop; `§ Step 5 — Self-retrospective` is skipped on these exits):**

- Step 1 pre-flight failures (defined in Step 1)
- Step 2 `gh issue list` non-zero exit (defined in Step 2)

Whole-issue `parse-error` is **not** an abort; the issue is left open with a triage comment and the run continues.

**No pause at sub-skill returns.** When `Skill(verify-diff)`, `Skill(skill-review)`, or `Skill(publicity-review)` returns, parse the result and follow the existing branch logic immediately. Long reasoning prose in the response is not a stopping signal — do not insert a "let me summarize what just happened" turn before the next action. All three callees terminate with a single fenced JSON verdict (`verify-diff` § Step 5 — Emit structured summary, `skill-review` § Return contract, `publicity-review` § Step 4 — Emit structured summary); branch on that block directly. Concretely: the assistant response that contains the parsed JSON verdict MUST also contain the next `Skill(<callee>)` / `Edit` / `Bash` tool call. If the response ends right after the JSON block — even with no prose in between — the No-Stall Principle is violated.

Concretely, the recognized return points are the (d) `Skill(verify-diff)` empirical check, the (d2) `Skill(skill-review)` polish bullets, and the (d3) `Skill(publicity-review)` empirical check inside the Apply accepted Findings sub-flow (§ 3.4 Apply accepted Findings). Each of these three carries **both** an inline `**Pre-invocation reminder**` (placed before the `Skill(<callee>)` dispatch — frames the upcoming dispatch as "parse a return value, not a turn boundary") and an inline `**Return-point no-stall reminder**` (placed after the dispatch — fires the named next action). Entry + return coverage is **intentional reinforcement-by-repetition** at the decision moment (same regimen as `.claude/rules/project.rules.local.md` § `Subagent inline-execution prohibition for Skill(<callee>) dispatches in agent definitions`'s 3-paragraph repetition); both must survive any future Simplify pass. The (d)/(d2)/(d3) reminders are scoped to **mid-Finding workflow** AND **mid-issue workflow** — i.e. they cover both same-Finding sub-step transitions (e.g. (d) → (d2) → (d3) → (f) → (g)) and same-issue sub-step transitions (e.g. 3.4 → 3.5 → 3.6) so no separate inline reminder is needed at 3.4 → 3.5 or 3.5 → 3.6.

**No pause at issue-loop / Step boundaries.** Three additional return-point reminders cover the boundaries the (d)/(d2)/(d3) reminders do not reach: the **issue boundary** (3.6 → next issue), the **last-issue → Step 3.7 boundary**, and the **Step 3.7 → Step 4 boundary**. Each boundary has its own inline reminder — same closed-list shape as (d)/(d2)/(d3), placed at the decision moment.

**The bookkeeping-commit sub-step sequence (Step 3.7) is non-stalling.** Run the entire sub-step sequence (version-skew guard → marketplace.json bump → `jq empty` validate → CHANGELOG.md Read → CHANGELOG prepend Edit → scope check → bookkeeping commit) as a single continuous tool-call burst — do not insert any interstitial user-confirmation turn between consecutive sub-steps. The `Read` of CHANGELOG.md immediately before the prepend `Edit` is not a turn boundary; issue the `Edit` in the same burst as the `Read`. Apply this equally to every consecutive pair in the sub-step sequence — including jq-validate → Read, Read → Edit, Edit → scope check, and scope check → commit.

**Phase / per-issue status transitions are non-stalling.** Marking a phase row or per-issue row `completed` and the next row `in_progress` must happen as part of the same tool-call burst that produces the next concrete action — never as a standalone summary turn. The status-write itself — whether via the Task tools (`TaskCreate` / `TaskUpdate`) or the `TodoWrite` fallback — is allowed (it's a status-only side effect, not a sensitive-path file write, so no permission dialog fires in routine execution), but no user-facing prose is emitted between the status flip and the next non-status-write tool call.

**Non-fatal errors are recorded and skipped, not stops.** Per-Finding / per-issue errors (`comment-failed`, `close-failed`, `commit-failed`) continue with the next Finding or issue. Step 2 records `overflow=true` and the run keeps going on the truncated list. Step 3.7 errors (`release-bookkeeping=failed (commit error|scope leak|version skew|json invalid|changelog edit error)`) fall through to Step 4 — Step 3.7 runs once per run after the per-issue loop, so "next Finding" is not a possible recovery there. Step 4 push errors (`push-failed (<reason>)`) fall through to summary emission — push runs once per run after auto-cleanup, so there is no per-Finding recovery path either; the operator can `git push` manually post-run. See `§ Push triage branch to origin` for the `<reason>` extraction spec. Step 5 errors (`self-retrospective-failed (<reason>)`) fall through to the Step 5 terminal line — Step 5 runs once per run after Step 4, so there is no per-Finding recovery path; the staging file is kept for manual retry. `references/triage-criteria.md` § Edge-case dispatch table is the authoritative list of dispositions.

**Stop-hook spurious fires are also non-fatal.** `~/.claude/stop-hook-git-check.sh` (auto-installed by Claude Code on the Web — see `§ Stop hook structural conflict`) fires on every Stop event during the (b)→(g) per-Finding flow because uncommitted state is normal mid-flow. The hook's `exit 2` injects a `Please commit and push…` feedback string but does **not** block — record the spurious fire and continue with the prescribed flow ((b)→(c)→(d-loop)→(f)→(g), where (d-loop) iterates (d)→(d2)→(d3) up to 3 times). Do **not** jump ahead to (g) commit on hook feedback alone; that bypasses verify-diff / skill-review / publicity-review / scope check and is a misbehavior.

**Operator interventions are tallied at Step 5, not re-litigated mid-run.** In this non-interactive routine, any user message that arrives mid-run (after the invocation itself) is evidence that the run may have stalled at the immediately-preceding return point. The correct behavior on resuming is to issue the prescribed next action immediately — and nothing else. Apology prose, a recap of what stalled, and any interruption to record the intervention are all forbidden: the recording act itself would create a new stall-inducing decision moment at exactly the point this skill works hardest to keep frictionless. Tallying and classifying interventions is `§ Step 5 — Self-retrospective`'s job, performed once at the end of the run from the in-context evidence.

**(d-loop) outer iteration boundaries are non-stalling.** When `(d-loop)` (see § 3.4 Apply accepted Findings) re-enters the next outer iter (`k` → `k+1`) after `(d3)`'s return, the next tool call must directly issue iter `k+1`'s `(d)` `Skill(verify-diff)` dispatch — never an interstitial summary or "let me decide whether to continue" turn. Conversely, when the loop terminates (early-exit on zero edits, callee-abort downgrade, or `k=3` reached), the next tool call must directly issue `(f)` Scope check + stage (or skip to next Finding's `(a)` on the conflict-downgrade path). Both transitions follow the same closed-list shape as the (d)/(d2)/(d3) return-point reminders.

**Workload-anxiety mid-flow abort is forbidden.** This skill has exactly three scale-management gates: (i) the 50-issue cap at § List open issues, (ii) per-callee consecutive-error disable flags (`verify_diff_disabled` / `skill_review_disabled` / `publicity_review_disabled`) that silently degrade callee coverage when consecutive non-healthy verdicts (errors, repeated `skipped` / `conflict`) accumulate, and (iii) the (d-loop) per-Finding cap (max 3 outer iters with early-exit on zero edits) that bounds outer-iter count per Finding. Aborting the routine mid-flow because cumulative `Skill()` loads "feel expensive", because the per-Finding sub-flow "looks long", or because of any equivalent operational anxiety is a No-Stall Principle violation. If you find yourself reasoning "X Findings × Y callees would consume too much context — let me stop here", that is precisely the anti-pattern this clause forbids. The scale-management gate list above is **closed**; if a future change introduces a new gate, append it here so the canonical enumeration stays exhaustive.

**Fatal tool-level errors are out of scope** — irrecoverable `Edit` / `Read` / `Bash` failures halt with a diagnostic regardless.

## Triage branch isolation

Each run creates its own branch named `triage-YYYYMMDD-HHMMSS` so per-Finding commits and the Step 3.7 release-bookkeeping commit do not land directly on `main` (or whatever branch the operator was on at run start). The base for the new branch is the **most recent existing `triage-*` branch** — if a prior triage branch is still open (unmerged) the new run continues from where it left off, so two runs against partially-overlapping issue sets never produce conflicting `marketplace.json` / `CHANGELOG.md` edits at PR-merge time. With no prior triage branches the base is the branch the operator was on (typically `main`).

**Eager creation, lazy cleanup.** The branch is created in Step 1 Pre-flight regardless of whether any Findings will be accepted. A 0-commit run (no open issues, every Finding rejected, every accept downgraded to `conflict`, etc.) is auto-cleaned in Step 4: switch back to `original_branch` and `git branch -D <triage_branch_name>`. Lazy creation (deferring the `git switch -c` until the first commit) was rejected because `§ 3.4 Apply accepted Findings` sub-step (g) and `§ Step 3.7 Release bookkeeping` sub-step (j) each have their own commit-failure recovery paths (`git reset` + `git checkout HEAD -- <paths>`); injecting branch-creation hooks into both sites would multiply the recovery branches without removing the cleanup obligation. Eager + single-site cleanup keeps the control flow flat.

**Same-day re-run by design stacks.** The 2nd run of a single day picks the 1st run's `triage-YYYYMMDD-HHMMSS` branch as its base because refname sort = chronological. Per-run isolation (each run still has its own branch) is preserved while the chain reflects the review history. The single-writer constraint (don't run two `dev-workflow-triage` invocations in parallel against the same target repo) still applies — concurrent runs sharing the same latest base would conflict at PR-merge time on `marketplace.json` / `CHANGELOG.md`. The same stacking applies when `original_branch` itself is a `triage-*` branch (re-running on a previously-created triage branch); see Step 1 Pre-flight and § Auto-cleanup of empty triage branch for the bookkeeping.

## Stop hook structural conflict (Claude Code on the Web)

Claude Code on the Web's container auto-installs `~/.claude/stop-hook-git-check.sh` (mode 755) at startup and registers it under `~/.claude/settings.json` `hooks.Stop` with an empty matcher (matches every Stop event). This is part of the Web environment's standard setup, **not** a user-defined hook.

**What it does**: on every Stop event, the hook checks the git working tree (recursion guard via `stop_hook_active`, then git-repo / remote / uncommitted / untracked / unpushed in order). If any of the last four trip, it `exit 2`s and injects a stderr feedback string (`Please commit and push…`) so the agent's turn continues — the hook **does not** block execution.

**Conflict mechanism**: the per-Finding flow in `§ 3.4 Apply accepted Findings` runs `(b) Edit → (c) frontmatter check → (d-loop) outer review loop × up to 3 iterations of [(d) Skill(verify-diff) → (d2) Skill(skill-review) → (d3) Skill(publicity-review)] → (f) scope check + stage → (g) commit`. Each Skill dispatch (verify-diff, skill-review, publicity-review — multiplied by up to 3 outer iters) creates a turn boundary, and uncommitted working-tree state between (b) and (g) is **normal** — that is the design. The hook fires at every boundary and feeds back `Please commit and push…` each time.

**Correct behavior**: see `§ No-Stall Principle`'s "Stop-hook spurious fires are also non-fatal" paragraph for the disposition. The cross-references in `verify-diff` SKILL.md (§ Stop hook structural conflict (caller-side note)), `skill-review` SKILL.md (§ Stop hook structural conflict (caller-side note)), and `publicity-review` SKILL.md (§ Stop hook structural conflict (caller-side note)) all point back here so the same disposition is applied caller-agnostic. When a Stop hook fires immediately after a callee's JSON verdict block, this is the most common stall-inducing combination — the feedback lands exactly at the moment the agent decides whether to close the turn. The disposition is unchanged — emit the next tool call in the same turn anyway. The count and approximate positions of spurious fires are tallied from in-context evidence by `§ Step 5 — Self-retrospective` for its Run context section.

**Bypass / disable guidance**:

- Permanent removal is discouraged — the hook serves other Web-environment purposes (e.g. nudging users about uncommitted state on conventional sessions)
- Per-routine bypass is unnecessary because the hook does not block (`exit 2` is a continue signal). Following the No-Stall Principle is sufficient
- Step 1 Pre-flight detects the hook's presence and surfaces it in the Step 4 summary as observability. Detection is warning-only — never an abort

## Fixed configuration

- **Target issue repository**: `SonicGarden/dev-workflow-issues` (hardcoded — change this line to retarget)
- **Triage scope (5 targets)**: the 4 bundle skills `dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`, plus `dev-workflow-triage` (self — project-local). Release bookkeeping (version bump / CHANGELOG, `§ Step 3.7 — Release bookkeeping`) covers the 4 bundle skills only; `dev-workflow-triage` is project-local (not registered in `.claude-plugin/marketplace.json`) and is excluded from bookkeeping by design
- **Edit target paths**: for the 4 bundle skills, always `skills/<target>/skills/<target>/SKILL.md` or `skills/<target>/skills/<target>/references/*.md` (canonical source of truth — note the nested direct-skill layout: the plugin source dir `skills/<target>/` holds a `skills/<target>/` subdir containing the actual files, so the flat `skills/<target>/SKILL.md` path does not exist) — never edit `.claude/skills/<target>/...` symlinks. For `dev-workflow-triage` (self), the canonical lives at `.claude/skills/dev-workflow-triage/SKILL.md` / `.claude/skills/dev-workflow-triage/references/*.md` (a project-local real directory, not a symlink)
- **Self-retrospective issue title prefix**: `[triage-self-retrospective]` — informational display prefix on issues filed by `§ Step 5 — Self-retrospective`. The consumer does **not** filter on it: self-targeted issues are triaged like any other open issue. Source of truth for the prefix string is this line; keep `§ Step 5 — Self-retrospective`'s title template in sync
- **Output language**: `ja` (hardcoded). Applied per `§ Output language` below

The issue body format (`### Finding <N>` headings and 4 labeled fields per Finding) is produced by `skills/dev-workflow/references/self-retrospective.md`. `§ Step 5 — Self-retrospective` of this skill emits the same shape (minus the `**Producer version:**` line) for self-targeted issues. Producers may also emit a trailing `Findings: N` line as a self-consistency cross-check, but the `### Finding` heading count is the canonical Finding count on the consumer side. Parse and reject conditions in the "Parse body" step below and in `references/triage-criteria.md` must stay aligned with both producers.

## Output language

User-facing prose produced by this skill is always in Japanese (`ja`). This is a project-local skill with no configurable language setting.

**Localization boundary** (mirrors `dev-workflow`'s `references/plan-format.md` § Localization granularity):

- **Translate**: generic technical concepts — e.g. "Open issues received" → `受信した未解決 issue 数`; "Counts per outcome" → `結果別の件数`; "Accepted-and-committed files" → `accept 済み・コミット済みファイル`
- **Preserve verbatim**: structured tokens (`accept` / `reject` / `conflict` / `parse-error` / `converged` / `unresolved` and all other machine-parsed enum values), field labels in the per-Finding execution log (`target:` / `outer-loop:` / `verify-diff:` / `skill-review:` / `publicity:` / `commit:`), file paths, commit hashes, config key names, skill names (`Skill(verify-diff)` etc.), `§` section references
- **First-use pairing**: on the first occurrence of a translated concept within each output block (Step 4 summary, GitHub issue comment), pair the localized phrasing with the original English term in parentheses (e.g. `受信した未解決 issue 数（Open issues received）`). Subsequent occurrences within the same block use the localized form alone

**GitHub issue comments** (`§ Post triage comment`): the comment Reasoning field is in Japanese. Template structure labels (`Target`, `Category`, `Applied changes`, `Notes`, `Result`) and enum tokens stay English for cross-language searchability.

## Triage classes

Every Finding ends in one of four states: `accept`, `reject`, `parse-error`, or `conflict`. See `references/triage-criteria.md` for the conditions behind each and the disposition table.

## Commit policy

**One accepted Finding = one commit.** Each commit is scoped to the target skill's directory. Message format:

```text
fix(<target-skill>): <Finding 1-line summary> (auto-triage #<issue-N>)

<optional 1-2 line body: Finding Category, brief reason>
```

`git push` is run by this routine — see `§ Push triage branch to origin` under `§ Step 4 — Emit summary` (once per run at end of Step 4). Per-Finding (g) Commit and Step 3.7 (j) bookkeeping only commit to local HEAD.

## Execution flow

### Step 1 — Pre-flight (abort with 0 findings on any failure)

- Run `gh --version`. Extract major / minor from the leading line. If < 2.28, set internal flag `no_reason_flag=true` (`gh issue close --reason` was introduced in 2.28)
- Run `gh auth status`. Non-zero ⇒ abort with "gh not authenticated"
- Run `git diff --quiet` and `git diff --cached --quiet`. Either non-zero ⇒ abort with "working tree is dirty — uncommitted WIP detected" (prevents folding user WIP into a triage commit)
- Run `git config --get user.email` and `git config --get user.name`. Either empty ⇒ abort with "git identity not configured" (fresh CI / routine containers often lack this)
- Detect Web-environment Stop hook (observability only, never abort): run `jq -r '[.hooks.Stop[]?.hooks[]?.command] | join(" ")' ~/.claude/settings.json 2>/dev/null || true`. If the output contains `stop-hook-git-check.sh`, set internal flag `stop_hook_present=true` for the Step 4 summary. File missing / parse failure / `hooks.Stop` absent ⇒ silent skip (flag stays unset). The trailing `|| true` ensures the pipeline status is benign under `set -e`. See `§ Stop hook structural conflict` for what the flag signals to the operator
- Reject detached HEAD: run `git symbolic-ref -q HEAD >/dev/null`. Non-zero ⇒ abort with summary "detached HEAD — checkout a branch before running" (the cleanup path's `git switch "$original_branch"` cannot return to a detached state, so the run must start from a named branch)
- Create the per-run triage branch (eager — see `§ Triage branch isolation` for the design rationale):
  - `original_branch = $(git rev-parse --abbrev-ref HEAD)` — captured for end-of-run cleanup so a 0-commit run can return to where the operator started, including the case where `original_branch` itself matches `triage-*` (re-running on a triage branch stacks the new branch on top with no special-case logic). The detached-HEAD case is already rejected by the prior pre-flight check, so `--abbrev-ref` is guaranteed to return a real branch name here
  - `triage_branch_name = "triage-$(date +%Y%m%d-%H%M%S)"`
  - Fetch remote triage branches into local refs: `git fetch origin 'refs/heads/triage-*:refs/heads/triage-*' 2>/dev/null || true`. This ensures fresh-clone environments (e.g. Claude Code on the Web) see prior runs' triage branches when computing `triage_branch_base`. Non-zero exit (no matching remote refs, auth error, network failure) is silenced — the `|| true` keeps the pipeline benign and the absence of remote triage branches is handled by the empty-base fallback below
  - `triage_branch_base = $(git for-each-ref --sort=-refname 'refs/heads/triage-*' --format='%(refname:short)' | head -n1)`. The glob pattern is **single-quoted** because the `Bash` tool runs zsh, where the default `nomatch` option fails the command with `no matches found` if the pattern is unquoted and no branch exists. Single-quoting passes the literal pattern to `git for-each-ref`, which returns empty stdout on no match. Refname sort is correct here because the branch-name format `triage-YYYYMMDD-HHMMSS` encodes the creation timestamp, so `--sort=-refname` gives chronological order; the alternatives `--sort=-creatordate` / `--sort=-committerdate` return the **tip commit's** date instead of the branch's creation date and would mis-rank a fresh branch cut from an old base
  - If `triage_branch_base` is empty (no prior `triage-*` branches), fall back to `triage_branch_base = "$original_branch"`
  - `git switch -c "$triage_branch_name" "$triage_branch_base"`. Non-zero exit ⇒ abort with summary `branch creation failed (base=<triage_branch_base>)` (covers e.g. `git switch` < 2.23, base ref unexpectedly missing, working tree blocked despite the earlier `git diff --quiet` check). Same fatal-abort shape as the other Step 1 failures
  - On success, initialize `triage_commit_count=0`. The counter is incremented **only on zero-exit `git commit`** at `§ 3.4 Apply accepted Findings` sub-step (g) and `§ Step 3.7 Release bookkeeping` sub-step (j); a failed commit (pre-commit hook rejection, etc.) leaves it unchanged. Step 4 auto-cleanup checks `triage_commit_count == 0` to decide whether to delete the now-empty branch (the abort path above exits the run before Step 4 ever runs, so a separate "branch active" flag is redundant — reaching Step 4 already implies a successfully-created branch)
- Resolve `current_version` once for the run (cached and reused by Step 3.3's Version-aware judgment for every Finding): run `current_version=$(jq -r '(.plugins[] | select(.name == "dev-workflow") | .version) // "unknown"' .claude-plugin/marketplace.json 2>/dev/null)`, then `[ -z "$current_version" ] && current_version=unknown`. The `// "unknown"` jq alternative handles missing entry (empty stream) and entry-without-version (`null`); the post-pipeline `-z` guard handles `jq` itself failing (missing/malformed `marketplace.json`). Hoisting this out of the per-issue / per-Finding hot path keeps the routine N×M `jq` invocations from accumulating on issue sets that touch every Finding through the stale-issue branch
- Read `CHANGELOG.md` once and cache its contents for Step 3.3's Reject #7 leg (i) lookup. The same content serves every Finding that enters the stale-issue branch, so re-reading per Finding is wasted work


After all pre-flight checks pass, register the **Workflow Phase Rows** — one `TaskCreate` per row, issued in a single upfront tool-call burst. Where the Task tools are unavailable (e.g. the VSCode extension, or Claude Code before v2.1.142), use a single `TodoWrite` call instead — the status values and register-all-upfront semantics are identical; `allowed-tools` grants both:

| `subject` | `activeForm` | `status` |
|---|---|---|
| `Step 1: Pre-flight` | `Running pre-flight checks` | `completed` |
| `Step 2: List open issues` | `Listing open issues` | `in_progress` |
| `Step 3: Process each issue serially` | `Processing issues` | `pending` |
| `Step 3.7: Release bookkeeping` | `Running release bookkeeping` | `pending` |
| `Step 4: Emit summary` | `Emitting summary` | `pending` |
| `Step 5: Self-retrospective` | `Running self-retrospective` | `pending` |

`Step 1: Pre-flight` is registered already-`completed` so the Step 4 audit trail can show "pre-flight passed" (the item-name column above is the Task tools' `subject` field; under the `TodoWrite` fallback it is `content`). After this registration burst, proceed directly to Step 2 in the same tool-call burst — the next tool call must be the `gh issue list` invocation, not a summary turn. See `§ No-Stall Principle` § Phase / per-issue status transitions.

### Step 2 — List open issues

- Run `gh issue list --repo SonicGarden/dev-workflow-issues --state open --limit 50 --json number,title,body`. Use `jq` to extract fields when convenient (e.g. `... | jq -c '.[]'` to stream one issue per line, or `... | jq -r '.[].number'` to pull just numbers). The 50-issue cap is intentional — running the full per-Finding sub-flow (verify-diff + skill-review + publicity-review dispatches × outer loop) on hundreds of issues per routine invocation is impractical; subsequent routine runs progressively drain the rest of the queue
- Non-zero exit ⇒ fatal abort with summary "gh issue list failed" (covers auth revoked / network failure mid-run — pre-flight only proves auth at start of run, not for the duration)
- Empty (`0` issues) ⇒ in **a single tool-call burst** (one `TaskUpdate` per flip; or a single `TodoWrite` call under the fallback), flip `Step 2: List open issues` → `completed`, `Step 3: Process each issue serially` → `completed` (no work to do), `Step 3.7: Release bookkeeping` → `completed` (the "skipped (no commits)" branch is reached by definition with zero issues), and `Step 4: Emit summary` → `in_progress`; then proceed directly to summary emission in the next tool-call burst. The hazard `§ No-Stall Principle` guards is a turn boundary or user-facing prose inserted between the flips and the next action — not the number of tool calls; multiple `TaskUpdate` calls within the same burst (same response) do not open a pause-window. Summary text begins with "no open issues"
- `1 ≤ N ≤ 49` ⇒ append `N` per-issue rows (one `TaskCreate` each), **inserted directly after the `Step 3: Process each issue serially` row** (so the per-issue rows render between Step 3 and Step 3.7), then flip `Step 2: List open issues` → `completed` and `Step 3: Process each issue serially` → `in_progress` in the same tool-call burst. Each per-issue row uses `subject: "Issue #<N>: <title-snippet>"` and `activeForm: "Processing issue #<N>"` (under the `TodoWrite` fallback the item-name field is `content`; truncate `<title-snippet>` to a reasonable length if the title is long; informational only). All per-issue rows start with `status: pending`. Proceed directly to the per-issue loop (Step 3) in the next tool-call burst
- Exactly `50` ⇒ same per-issue append + status flip as above, plus set `overflow=true` (surface in summary as "50-issue cap reached" — `gh issue list` truncates and doesn't return a total, so `== limit` is the overflow signal)

### Step 3 — Process each issue serially

Do **not** parallelize. Same-skill edits race; `gh issue comment` is non-idempotent.

If Step 2 reported `0` open issues, this whole prelude (and the per-issue sub-steps that follow) is skipped — the 0-issues bullet in `§ List open issues` already flipped Step 3 / Step 3.7 / Step 4 phase rows in one tool-call burst and proceeds directly to summary emission.

Otherwise, for each issue (in source order from Step 2's listing): the per-issue row registered in Step 2 is flipped to `in_progress` (via `TaskUpdate`, or `TodoWrite` under the fallback) in the same tool-call burst as the next concrete action (typically the body parse or the first `Read`); the row is flipped to `completed` at the end of `§ Close decision`. Two completion paths exist:

- **Normal path** (§ 3.2 parse OK → § 3.3–§ 3.4 → § 3.5 → § 3.6): per-issue row flips to `completed` immediately after Step 3.6's Close decision settles (zero/non-zero exit alike — `close-failed` does not block the row flip)
- **Whole-issue parse-error path** (§ 3.2 parse-error → § 3.4 skipped → § 3.5 → § 3.6 close-call skipped, reminder dispatch fires): per-issue row flips to `completed` at the reminder dispatch at the bottom of `§ Close decision` — that dispatch is the path's terminal action (Step 3.6 skips the close call by definition for `parse-error`, but the reminder dispatch still fires there, co-located with the row flip)

Every open issue proceeds directly to body parse; there is no title-level pre-check. Body parse is the canonical discriminator between triage candidates and unparseable issues.

#### 3.2 Parse body

Extract Finding records. The producer (`skills/dev-workflow/references/self-retrospective.md`) emits fields with markdown bold labels — match them with this exact shape:

- Heading: line matching `^### Finding \d+$`
- Field labels (one per line, bold + colon + value): `^\*\*Target skill:\*\*\s*(.+)$`, `^\*\*Category:\*\*\s*(.+)$`, `^\*\*Description:\*\*\s*(.+)$`, `^\*\*Suggested fix direction:\*\*\s*(.+)$`
- **Trailer (optional cross-check)**: `^Findings: (\d+)$` near the end. When present, the captured count cross-checks against the number of `### Finding` headings; mismatch is a parse-error condition. The heading count is canonical regardless of whether the trailer is present, so trailer absence is **not** a parse-error
- **Producer version line (optional)**: between the `# dev-workflow-bundle retrospective (auto-generated)` header and the first `### Finding 1`, match `^\*\*Producer version:\*\* dev-workflow v(\d+\.\d+\.\d+)$`. Capture the matched group into the per-issue value `producer_version`. **Absent** (no matching line — backward-compat with issues created before the producer added the line) and **malformed** (e.g. `**Producer version:** dev-workflow vfoo` or a non-3-tuple value) both fall back to `producer_version = "unknown"`. Missing or malformed Producer version is **not** a parse-error condition — Step 3.3's Version-aware judgment treats `unknown` as "older than everything" so the stale-issue reject path engages safely

Classify the **whole issue** as `parse-error` (jump to Post triage comment; continue to Close decision, where `§ 3.6 Close decision`'s leg 1 — Parse body completed successfully — fails and leaves the issue open) if any of:

- Zero `### Finding` headings found in the body (the issue carries no Finding sections — likely a manually filed bug report or other non-retrospective content; surface as parse-error so the human filer sees a triage comment and the issue stays open via `§ 3.6 Close decision`'s leg 1 — Parse body completed successfully — gate. Without this parse-error classification, `§ 3.6 Close decision`'s leg 2 per-Finding ALL-quantifier would be vacuously true on zero Findings, which is precisely the case leg 1 was added to prevent)
- Trailer `Findings: N` is present and its count disagrees with the number of `### Finding` headings
- Any Finding's `Target skill` is outside the triage scope (the 4 bundle skills `dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`, plus `dev-workflow-triage` — see `§ Fixed configuration`)
- Any Finding's `Category` is outside the 5-value set (`ambiguity`, `missing-branch`, `wrong-default`, `rules-conflict`, `other`) — mirrors the producer's own validation in `self-retrospective.md`
- Any of the 4 required fields is missing in any Finding

Top-level sections other than `### Finding` headings and their labeled fields (e.g. the `## Run context` section in self-retrospective issues) do **not** affect parsing and are not a parse-error condition — this tolerance is an invariant that `§ Step 5 — Self-retrospective`'s issue body depends on; do not tighten it without updating that step's body shape.

#### 3.3 Judge each Finding

For each Finding, read the target's SKILL.md first — `skills/<target>/skills/<target>/SKILL.md` for the 4 bundle skills, `.claude/skills/dev-workflow-triage/SKILL.md` for the self target (per `§ Fixed configuration`'s Edit target paths); additionally read the target's `references/<file>.md` on demand when the Description or Suggested fix direction clearly points at content outside SKILL.md (e.g. names the file, names a heading/section that belongs to a reference, or describes behavior documented in a reference). Apply `references/triage-criteria.md` to decide `accept` vs `reject`. Store decision + reasoning in memory. Do **not** edit yet.

**Version-aware judgment** (apply alongside the standard checklist; sources `references/triage-criteria.md` § Reject #7):

Compare the `producer_version` captured in `§ 3.2 Parse body` against the `current_version` resolved once at Step 1 Pre-flight (cached for the whole run). SemVer comparison parses `\d+\.\d+\.\d+` into an integer 3-tuple and compares lexicographically; the literal `unknown` is treated as "older than everything" so the stale-issue branch engages whenever either side cannot be parsed.

- `producer_version == current_version`: standard checklist only — no extra step
- `producer_version < current_version`, OR `producer_version == "unknown"`, OR `current_version == "unknown"`: apply `Reject #7` (stale-issue path) **alongside** the standard checklist. Both legs (i)+(ii) must hold to reject:
  - **(i)** Locate version subsections in the `CHANGELOG.md` content cached at Step 1 Pre-flight, in the half-open range `(producer_version, current_version]` — **producer-exclusive, current-inclusive** (a fix that landed in `current_version` itself counts as "addressed" for this Finding; the producer side is excluded because the producer was already at that version when it emitted the issue, so any fix in `producer_version` cannot post-date the issue). When either side is `unknown`, scan all entries instead. At least one fix entry in that range must name this Finding's `<target-skill>` in its subject (e.g. `- fix(dev-workflow): ...` for a `<target-skill> = dev-workflow` Finding)
  - **(ii)** `Read` the current `skills/<target>/skills/<target>/SKILL.md` (and the `references/*.md` files cited by the Finding's Description) and verify the described concern is **no longer reproducible** in the current file state. Cite the specific passage that demonstrates non-reproducibility in one line (e.g. `SKILL.md § 3.6 Close decision now lists explicit reminder #1 / #2 — Finding's "missing per-issue close reminder" no longer reproduces`)
  - **Either-leg doubt → fall through to the standard checklist.** Reject #7 requires affirmative judgment on **both** (i) and (ii); on doubt about either leg, do not reject under #7 — let the standard checklist run, which may still accept the Finding or reject it under another criterion. This asymmetric default protects against false-rejecting Findings that target subtly different problems in the same skill region
  - When both legs hold, set the Finding's reject `reason` to `Already addressed (producer_version <X.Y.Z> < current_version <Y.Z.W>; CHANGELOG entry: <token>; SKILL.md cite: <quoted passage>)`. The reason string is stored on the per-Finding reasoning record and surfaced via the existing Step 3.5 Post triage comment template — no new field is introduced
- `producer_version > current_version` (the local `marketplace.json` is older than the producer that emitted the issue — unusual, suggests this routine is running on a stale clone): standard checklist only, but append `(note: producer_version newer than local current_version — local marketplace.json may be stale)` to whichever reason string the standard checklist produces, so the per-Finding execution log surfaces the inversion

Self-retrospective issues (`Target skill: dev-workflow-triage`, filed by `§ Step 5 — Self-retrospective`) intentionally omit the Producer version line, so they always enter this path with `producer_version = "unknown"`. Leg (i) cannot hold for them (`dev-workflow-triage` is excluded from release bookkeeping and never appears in `CHANGELOG.md`), so judgment falls through to the standard checklist — the intended behavior; Reject #1's already-addressed check still works from the current-file read.

**Interaction with sibling Reject criteria** (resolves the overlap between Reject #7 and Reject #1 / #2 in `references/triage-criteria.md`):

- **Reject #1 (Already addressed in current file)** overlaps Reject #7 leg (ii) by construction — both require affirmative judgment that the Finding's concern no longer reproduces. When the version-aware path is engaged (`producer_version != current_version`, or either side is `unknown`), **prefer Reject #7** because it carries richer evidence (CHANGELOG entry token + SKILL.md cite, vs. Reject #1's bare "no longer reproduces"). On Reject #7 fall-through, the Reject #1 disposition depends on **which trigger** caused the fall-through (table below — leg (i) doubt / failure shares the leg-(ii)-result row because Reject #1's premise is driven by leg (ii)'s judgment alone):

  | Fall-through trigger | leg (i) state | leg (ii) state | Reject #1 disposition |
  |---|---|---|---|
  | (1) leg (i) failed (no matching CHANGELOG entry in `(producer_version, current_version]`) + leg (ii) holds affirmatively | failed | hold (affirmative non-reproduction) | **may fire** — cite leg (ii)'s passage as Reject #1's reason; leg (ii)'s judgment is independent of the CHANGELOG range gate |
  | (2) leg (ii) doubt (regardless of leg (i)) | hold / failed / doubt | doubt | **must NOT fire** — the same doubt that blocked leg (ii) blocks Reject #1's affirmative-non-reproduction premise |
  | (3) leg (ii) failed affirmatively (current SKILL.md still reproduces) | hold / failed / doubt | failed (affirmative reproduction) | **must NOT fire** — Reject #1's premise is the inverse of leg (ii)'s affirmative reproduction; the concern is still present |
  | (4) leg (i) doubt + leg (ii) holds affirmatively | doubt | hold (affirmative non-reproduction) | **may fire** on leg (ii) alone (same path as trigger (1)) — leg (i) doubt does not propagate to Reject #1 because Reject #1 has no CHANGELOG-range premise |

  After Reject #1 disposition is settled, the standard checklist continues evaluating Reject #2–#6 and the Accept-4 conditions regardless of whether Reject #1 fired.
- **Reject #2 (out-of-scope target in description)** is orthogonal — it judges target/description alignment, not version state — and runs **independently** alongside Reject #7. A Finding can be rejected under either, whichever fires first when both apply; standard-checklist evaluation order from `references/triage-criteria.md` (Reject #1 → #2 → … → #6) is unchanged, with Reject #7 evaluated alongside #1 per the bullets above.

#### 3.4 Apply accepted Findings (sub-flow (a)-(g) per Finding)

Process accepted Findings one at a time in the order they appear. Same-file Findings work sequentially — each re-reads the target file so its Edit matches the current working-tree state (post-previous-commit on `accept`, uncommitted residue on `conflict` — see `(d)` `conflict` semantics).

Self-targeted Findings (`Target skill: dev-workflow-triage`) edit `.claude/skills/dev-workflow-triage/SKILL.md` — the very file driving this run. This is safe: the skill content was loaded at invocation, so edits take effect from the next run, never mid-run. The **allowed scope set** for working-tree path checks throughout this sub-flow is: paths under `skills/`, plus paths under `.claude/skills/dev-workflow-triage/` (bundle-skill edits plus self-targeted edits and their uncommitted residue).

Each accepted Finding runs sub-steps (a)(b)(c) once, then enters an **outer review loop** (sub-step (d-loop)) that wraps (d) verify-diff → (d2) skill-review → (d3) publicity-review as a single iteration unit. The outer loop runs up to **3 iterations** with two early-exit conditions: (i) no callee applied any edit in the just-finished iteration (`vd.applied_edits_count + sr.applied_edits_count + pr.applied_edits_count == 0` — disabled callees naturally contribute 0, which is the correct disposition: once 2 of 3 callees are disabled and the live one applied 0, further outer iters are guaranteed wasted), or (ii) a callee returned a Finding-fatal verdict (verify-diff `conflict`, publicity-review `unresolved` / `conflict`). After the outer loop terminates, sub-steps (f)(g) run once. Each callee keeps its own internal iteration loop unchanged — the outer loop only re-dispatches the three callees as a sequence. The consecutive-error counters described per (d)/(d2)/(d3) below operate **per-Finding (terminal verdict)**: counter increment / reset and the `*_disabled` check both happen at Finding boundaries, never mid-loop.

**Register per-Finding tasks** — at sub-step (a) entry for each accepted Finding (i.e. immediately before the `(a) Re-read target file` Read), `TaskCreate` these tasks in a single tool-call burst: `(d) verify-diff call`, `(d2) skill-review call`, `(d3) publicity-review call`. Flip each row to `in_progress` on its first call (iter 1) and to `completed` on its last call (whether early-exit, callee-abort break, or max-iter); rows are not re-flipped per outer iteration — see (d-loop) Notes — Per-Finding task rows for the canonical flip semantics. On disable (any of the three skills disabled by their consecutive-error counter), mark the affected `... call` row `completed` with the reason appended to the task's `description` field (the `content` field under the `TodoWrite` fallback) as `— skipped: disabled`. Steps (a)–(c), (f), (g) are deliberately not pre-registered — only the three skill-call rows are, because those are the points where the per-Finding flow tends to exit early on the first "good enough" outcome when unmarked. The (d), (d2), and (d3) entries each appear as a single `... call` row even though those skills run their own internal iteration loops — the loop tracking happens inside each callee's own task list, not here. The same single-row rule also applies across outer-loop iterations — see (d-loop) Notes — Per-Finding task rows for the flip semantics; outer iter count is tracked in `record.outer_iter` only.

**Per-Finding record kept in memory for the Step 4 execution log** — alongside the existing decision + reasoning store from § Judge each Finding, also keep a small structured record per processed Finding so Step 4's Per-Finding execution log can render it. **The task list (Task tools / `TodoWrite`) is the progress UI, not a record source — it cannot be read back at runtime, so anything Step 4 needs has to be held in memory here.** **All fields are initialized to defaults on entry to (a)** so any sub-step that aborts early (e.g. (b)-Edit failure → `conflict` before (d) runs) leaves explicit defaults rather than undefined values. Defaults and update points:

- `description`: default `—`. Bound at (a) entry — see § Apply accepted Findings's "Per-Finding input binding (mandatory)" paragraph for binding rules and verify-diff sourcing requirements. Internal binding only — not rendered in the Step 4 Per-Finding execution log.
- `suggested_fix_direction`: default `—`. Bound at (a) entry — see § Apply accepted Findings's "Per-Finding input binding (mandatory)" paragraph for binding rules and verify-diff sourcing requirements. Internal binding only — not rendered in the Step 4 Per-Finding execution log.
- `disposition`: default `accept`. Downgrade paths in (b)/(c)/(d)/(d3)/(f)/(g) overwrite it to `conflict`. Final values: `accept` / `reject` / `conflict` / `parse-error`.
- `target`: default `—`. Set to the edit target path on (b) success.
- `verify_diff`: default `—`. Set to status token from (d) — `converged` / `unresolved` / `skipped` / `conflict` / `disabled`.
- `iterations_used`: default `—`. Set to integer from `verify-diff`'s JSON verdict (or `0` when the call was skipped because `verify_diff_disabled=true`).
- `skill_review`: default `—`. Set to terminal token from (d2) — `no-actionable-findings`, `applied-edits`, `notes-left`, `error`, or `disabled`. The enum legacy-includes `skipped`, but under the (d-loop) outer review loop a `(d)` `conflict` callee-abort breaks before (d2) runs and leaves this field at its default `—` — see § Token notes for details. The orchestrator parses skill-review's `iterations_used` field (for JSON schema validation) but does **not** retain it — `iterations_used` is exposed only via the callee's JSON verdict and is not surfaced in `record.skill_review` or in Step 4 per-Finding render.
- `publicity_review`: default `—`. Set to terminal token from (d3) — `converged-iter-<k>` / `unresolved-<count>` / `conflict (<reason>)` / `skipped (<reason>)` / `disabled`. The `disabled` token is the orchestrator-side state set after `publicity_review_disabled=true` triggers; the `publicity-review` skill itself never returns `disabled` as `status` (its return-contract enum is 4 values: `converged|unresolved|skipped|conflict`).
- `publicity_iterations_used`: default `—`. Set to integer from `publicity-review`'s JSON verdict (or `0` when the call was skipped because `publicity_review_disabled=true`).
- `outer_iter`: default `0`. Set to the count of outer iterations actually run (1–3) at the moment the (d-loop) outer review loop terminates. `0` means the outer loop never reached `(d-loop)` (e.g. (b) or (c) downgraded to `conflict` first, or disposition is `reject` / `parse-error`).
- `outer_exit`: default `—`. Set on outer-loop termination to one of: `no-edits` (early-exit because all 3 callees applied 0 edits in the last iter), `callee-abort` (verify-diff `conflict` / publicity-review `unresolved` or `conflict` broke the loop), `max-iter` (3rd iter completed without early-exit). Stays `—` if the outer loop never ran (matches `outer_iter == 0`).
- `commit`: default `—`. Set to the commit hash on (g) zero-exit.

For each accepted Finding (the per-Finding memory record described above is updated **at the end of each sub-step that produces its corresponding field** — record-write points are called out inline below):

- **(a) Re-read target file** — `skills/<target>/skills/<target>/<file>` for bundle skills, `.claude/skills/dev-workflow-triage/<file>` for the self target (per `§ Fixed configuration`'s Edit target paths). For the first Finding this is HEAD state; for later same-file Findings it's the prior commit's result. Build `old_string` / `new_string` against this state.

  **Per-Finding input binding (mandatory)**: At (a) entry — before any (b) Edit, (c) frontmatter check, or (d-loop) callee dispatch — bind `record.description` and `record.suggested_fix_direction` to the verbatim text of this Finding's `**Description:**` and `**Suggested fix direction:**` fields parsed by § Parse body. Single immutable read scoped to **this** `### Finding <n>` section. Every subsequent `Skill(verify-diff)` dispatch in the (d-loop) for this Finding MUST source its `Description` / `Suggested fix direction` arguments from `record.description` / `record.suggested_fix_direction` — never from re-reading the issue body, never from paraphrase, never from another Finding's record. Cross-Finding text contamination (e.g. using issue #M Finding K's `Description` while processing issue #N Finding L) is a Critical-severity routine bug; the binding-at-(a) discipline structurally prevents it by establishing exactly one canonical source per Finding. `publicity-review` does not take these inputs (per its `## Invocation contract`), so this binding applies only to verify-diff.
- **(b) Apply Edit** — on failure (typically `old_string` not found because a prior Finding rewrote that region), downgrade to `conflict` and continue. **Record-write**: set `record.target = skills/<target>/skills/<target>/<file>` on success; leave as `—` and set `record.disposition = conflict` on failure.
- **(c) Frontmatter integrity check** — re-read the edited file; the `---` YAML block must still parse. If not: downgrade to `conflict`, run `git checkout HEAD -- <target-file>` to revert (nothing is staged yet), continue
- **(d-loop) Outer review loop** (max 3 iterations, early-exit on zero edits or callee abort):

  `record.outer_iter` and `record.outer_exit` are pre-initialized to their defaults (`0` and `—` respectively) per the canonical "All fields initialized at (a) entry" rule above; (d-loop) does not re-init them. For `k` in 1..3:

  1. Set `record.outer_iter = k`.
  2. Run sub-step (d) `Skill(verify-diff)` empirical check (semantics unchanged from below).
     - On `conflict`: set `record.outer_exit = "callee-abort"`, break the outer loop, skip (d2)/(d3)/(f)/(g) per (d) `conflict` semantics.
     - Otherwise capture `vd_edits = JSON.applied_edits_count`, proceed to step 3.
  3. Run sub-step (d2) `Skill(skill-review)` polish (semantics unchanged). Capture `sr_edits = JSON.applied_edits_count` (cumulative across the callee's internal loop per `skill-review` § Return contract; see Notes — `applied_edits_count` semantics). On verdict-parse-failure (no parseable JSON block), default `sr_edits = 0` since `JSON.applied_edits_count` is unreadable.
     - `error` / verdict-parse-failure routes through (e), then continues to the (d3) publicity-review call with `sr_edits` as captured (or `0` on the parse-failure default above). `error` is **non-fatal at the outer-loop level** — the outer loop does not break on it; the skill-review consecutive-error counter handles cross-Finding disable and the current Finding still receives publicity-review's verdict.
  4. Run sub-step (d3) `Skill(publicity-review)` empirical check (semantics unchanged). Capture `pr_edits = JSON.applied_edits_count`.
     - On `unresolved` or `conflict`: set `record.outer_exit = "callee-abort"`, break the outer loop, skip (f)/(g) per (d3) `unresolved`/`conflict` semantics (the existing handler's `git checkout HEAD -- <paths>` revert wipes cumulative iter edits on those paths — see Notes — Conflict-downgrade revert scope).
     - Otherwise proceed to step 5.
  5. **Early-exit check**: if `vd_edits + sr_edits + pr_edits == 0`, set `record.outer_exit = "no-edits"`, break the outer loop and proceed to (f). Worked example: `vd=0, sr=5, pr=0` in iter k → sum=5 > 0 → continue to iter `k+1` (sibling-review feedback still pending). `vd=0, sr=0, pr=0` in iter k → break.
  6. If `k == 3` and the loop did not break, set `record.outer_exit = "max-iter"` and proceed to (f).

  **Return-point no-stall reminder (iter boundary)**: at the moment the early-exit / max-iter decision settles (regardless of which decision fired — `continue to iter k+1`, `break: no-edits`, `break: max-iter`, or the `break: callee-abort` set by the (d) verify-diff `conflict` branch or the (d3) publicity-review `unresolved`/`conflict` branch), this is mid-Finding workflow AND mid-issue workflow, never a terminal point. The next action — iter `k+1`'s `(d)` `Skill(verify-diff)` dispatch on continue, or `(f)` Scope check + stage on a non-conflict break, or "next Finding's (a)" on a conflict-downgrade break — must be issued in the **next tool call**. Never insert an interstitial summary or "let me decide" turn between the loop-end decision and the next concrete action. Ending the response right after the JSON block — even with no prose between the verdict and the next tool call — is itself a stall: the verdict and the next tool call must land in the same assistant turn. See `§ No-Stall Principle` § (d-loop) outer iteration boundaries are non-stalling.

  **Notes**:

  - **Counter / disable scope** — `verify_diff_disabled` / `skill_review_disabled` / `publicity_review_disabled` are checked **at Finding entry only** (before the outer loop's iter 1). If a counter is `true` at Finding entry, that callee's call is skipped on every outer iter of this Finding (returning a synthetic `applied_edits_count = 0` for the early-exit sum). Counter increments use the **terminal-iter verdict** (last outer iter's status) per Finding. This means a Finding whose iter 1 verify-diff returned `skipped` but iter 2 verify-diff returned `converged` resets the counter (the skill ultimately functioned for the Finding), trading per-iter sensitivity for stable per-Finding semantics.
  - **Base ref behavior** — `Base ref = HEAD` passed to verify-diff / publicity-review remains correct across outer iters because no commit happens until (g); each callee sees the cumulative working-tree state including prior outer iter's edits. Caveat: in iter 2+, verify-diff's bias-free executor evaluates the cumulative diff against the original Finding's `Description` / `Suggested fix direction`. If sibling-review polish (skill-review or publicity-review) introduced lines unrelated to the Finding's intent, verify-diff may emit `unresolved` ("regression" detected on the polish lines) more frequently than it would in iter 1. This is acceptable: `unresolved` records a warning and proceeds to (d2), it does **not** abort the Finding. See `verify-diff` SKILL.md `§ Outer review loop interaction (caller-side note)` for the cross-reference note.
  - **Record-field overwrite** — `record.verify_diff` / `record.skill_review` / `record.publicity_review` / `record.iterations_used` / `record.publicity_iterations_used` are overwritten on every outer iteration with the latest verdict — Step 4 renders the **terminal** values. Per-Finding cumulative dispatch cost is observable via the run-level aggregates plus the new `outer-loop:` render line. **Warning strings** recorded by (d)/(d2)/(d3) (`verify-diff unresolved (<n> gaps)`, `verify-diff skipped (<reason>)`, `skill-review notes left after applied-edits (<count>)`, `skill-review notes left after max iters (<count>)`, `publicity-review unresolved (<count>)`, etc.) follow the same terminal-iter overwrite rule — Step 4 aggregate counts each Finding once based on its terminal-iter warning, not per-iter accumulation.
  - **Per-Finding task rows** — `(d) verify-diff call`, `(d2) skill-review call`, `(d3) publicity-review call` flip to `in_progress` on iter 1's call and to `completed` on the last iter's call (whether early-exit, callee-abort break, or max-iter). They are not re-flipped per iteration. On the (d) `conflict` callee-abort path — the only path where downstream `... call` rows are never reached at all (because (d) `conflict` breaks the outer loop on iter 1 step 2 before (d2)/(d3) ever run) — mark the (d2) and (d3) rows `completed` with the reason appended to the task's `description` field (the `content` field under the `TodoWrite` fallback) as `— skipped: callee-abort (d) verify-diff conflict`. This wording is distinct from the `— skipped: disabled` reason used for the consecutive-error disable bypass; the (d3) `unresolved`/`conflict` path does not need this treatment because (d2) and (d3) have already run on the iter that broke.
  - **`applied_edits_count` semantics** — `skill-review`'s § Return contract emits `applied_edits_count` as cumulative successful Edits across the callee's internal loop for every status (including `error` / verdict-parse-failure paths, where the value reflects edits that landed before the error trigger; only the `frontmatter broken` recovery zeroes the count by reverting the edited file). `verify-diff` and `publicity-review` follow the same cumulative semantics per their respective Return contracts. The early-exit sum's intent — "did this outer iter produce code-change activity from any callee?" — is preserved by using the cumulative count: a non-zero `*_edits` means real edits hit disk somewhere in the inner loop.
  - **Conflict-downgrade revert scope** — when (d3)'s `unresolved` or `conflict` branch (or any other callee-abort path) runs `git checkout HEAD -- <paths>`, that revert wipes cumulative working-tree edits on those paths from **prior outer iters** as well, including iter 1's skill-review polish on the same path. This is the correct disposition because the Finding is being downgraded to `conflict` and not committing, so wiping the cumulative working-tree state is intended.

  Control flow into (f) is owned by the (d)/(d3) callee-abort branches (skip (f)/(g)) and the early-exit / max-iter exits (proceed to (f)); no separate post-loop gate runs. The (d) / (d2) / (d3) bullets below describe the per-callee semantics (inputs, status branches, consecutive-error counters, return-point no-stall reminders) that each outer iter invokes.
- **(d) `Skill(verify-diff)` empirical check** (up to 3 executor dispatches per Finding) — `verify-diff` derives 1–2 evaluation scenarios from the Finding in its main thread, then on each iteration dispatches a fresh bias-free executor that actually runs those scenarios against the post-diff file; if gaps remain the executor returns `suggested_edits` as JSON and `verify-diff` applies them autonomously, looping until convergence or max-iter.

  **Pre-invocation reminder**: the next tool call after `Skill(verify-diff)` returns is `Skill(skill-review)` (on `converged` / `unresolved` / `skipped` — `verify-diff`'s 4-value status enum folds verdict parse failure / schema violation into `skipped`, so there is no separate orchestrator-side `error` branch here) or the next Finding's `(a)` Re-read (on `conflict`). Treat verify-diff's JSON verdict as a return value to parse, not a turn boundary — emit the parse → status branch → next dispatch as the next tool call (not as a prose summary turn between the JSON verdict and the next dispatch). See `§ No-Stall Principle`.

  Inputs per Finding:
  - `Description` = `record.description` (bound at (a) per § Apply accepted Findings's "Per-Finding input binding (mandatory)" paragraph — do not re-read or paraphrase from the issue body)
  - `Suggested fix direction` = `record.suggested_fix_direction` (bound at (a) per § Apply accepted Findings's "Per-Finding input binding (mandatory)" paragraph — do not re-read or paraphrase from the issue body)
  - `Target file` = the file edited in (b)
  - `Base ref` = `HEAD`
  - `Max iterations` = `3`

  Parse the fenced JSON block `verify-diff` returns, then branch on `status` (every branch sets `record.verify_diff` to the status token and `record.iterations_used` to the JSON's `iterations_used`):
  - `converged` → proceed to (d2)
  - `unresolved` → record warning `verify-diff unresolved (<n> gaps)` (where `n = unresolved_gaps.length`), proceed to (d2)
  - `skipped` → record warning `verify-diff skipped (<reason>)` using `reason` from the summary, proceed to (d2)
  - `conflict` → downgrade the whole Finding to `conflict` (also set `record.disposition = conflict`). `verify-diff` has already reverted via `git checkout HEAD -- <reverted_paths>` inside its own safety rails, but re-run `git checkout HEAD -- <reverted_paths>` here as an idempotent safety net. (b)'s edit on the target file is **not** reverted (only the executor's out-of-scope writes listed in `<reverted_paths>` are); it remains in the working tree but is uncommitted because (g) is skipped. The next Finding's (a) Re-read sees that residual state — Same-file Findings work sequentially regardless of whether the prior Finding's disposition was `accept` (committed) or `conflict` (uncommitted residue). Skip (d2), (d3), (f), and (g) — nothing commits for this Finding — then continue to the next Finding

  **Return-point no-stall reminder**: when `verify-diff` returns with `converged` / `unresolved` / `skipped` (any non-`conflict` result), this is mid-Finding workflow AND mid-issue workflow, never a terminal point. The next action is the (d2) `Skill(skill-review)` polish step — emit it in the **next tool call**, not after an interstitial summary or acknowledgment turn. Ending the response right after the JSON block — even with no prose between the verdict and the next tool call — is itself a stall: the verdict and the next tool call must land in the same assistant turn. See `§ No-Stall Principle`.

  **Consecutive-error disable** (mirrors the `skill-review` consecutive-error handling below): keep a per-run counter. `converged` or `unresolved` → counter reset (the skill is functioning, even if gaps remain). `skipped` or `conflict` → counter increments. When the counter reaches 2, set `verify_diff_disabled=true`; for the remainder of the run, skip the `verify-diff` call on each Finding and record warning `verify-diff disabled after consecutive errors`. Proceed directly to (d2) in that case. The `verify-diff disabled after consecutive errors` warning attaches from the Finding **immediately after** the disable was triggered; the triggering Finding itself only carries its own disposition (conflict, or its own `verify-diff skipped (<reason>)` warning). Outer-loop interaction: the increment uses the **terminal-iter** verdict (last outer iter's status), and the `*_disabled` check runs at Finding entry only, never mid-loop — see (d-loop) Notes — Counter / disable scope.
- **(d2) `Skill(skill-review)` polish** — `skill-review` ends each invocation with a single fenced JSON verdict per its `§ Return contract`. Parse it and apply the mapping table below. The callee runs its own internal iteration loop (Pattern A, default max 3); the orchestrator consumes the terminal verdict per outer-loop iter, with the orchestrator-side outer loop (see (d-loop) above) re-dispatching this callee up to 3 times per Finding. **Verdict missing or malformed** (no fenced JSON block, JSON parse error, or schema enum mismatch) is detected here and routed to the table's last row — mirrors `verify-diff`'s *Verdict missing or malformed* policy (no orchestrator-side retry; the callee's own loop has already done what it can). Scope guard: on `applied-edits` terminal verdict re-run (c) frontmatter check AND re-check `git diff --name-only` still lists only paths inside the allowed scope set (`skills/`, plus `.claude/skills/dev-workflow-triage/` — see § Apply accepted Findings's allowed-scope-set paragraph; the full scope check from (f), run as a second-line defense even though the callee runs the same check per internal iteration). If scope leaks, treat as (f)'s failure case immediately.

  **Pre-invocation reminder**: the next tool call after `Skill(skill-review)` returns is `Skill(publicity-review)` (on every non-error mapping-table row) or the (e) error-handling branch (on `error` / verdict missing-or-malformed). Treat skill-review's JSON verdict as a return value to parse, not a turn boundary — emit the parse → mapping-table lookup → next dispatch as the next tool call (not as a prose summary turn between the JSON verdict and the next dispatch). See `§ No-Stall Principle`.

  **JSON status → action / record-write mapping** (authoritative — drives both branching and `record.skill_review`):

  | JSON status | action | record.skill_review |
  |---|---|---|
  | `no-actionable-findings` | exit (d2), continue to (d3) | `no-actionable-findings` |
  | `applied-edits` | re-run (c) + scope check; if `notes_remaining_count > 0` add warning `skill-review notes left after applied-edits (<count>)`; continue to (d3) | `applied-edits` |
  | `notes-left` | record warning `skill-review notes left after max iters (<count>)`, continue to (d3) | `notes-left` |
  | `error` / verdict missing-or-malformed | route through (e) — see (e) for the per-Finding error handling and the consecutive-error disable; orchestrator-supplied parse-failure label is used when JSON `reason` is absent or unparseable | `error` |

  **Token notes**: `record.skill_review` enum includes `skipped` (legacy: was set when (d2) was bypassed because (d) returned `conflict`), but under the (d-loop) outer review loop this path is **dead code** — (d-loop) Step 2's "On `conflict`" breaks the outer loop before the (d2) sub-step is reached, so `record.skill_review` stays at its default `—` on a (d) `conflict` callee-abort. The `disabled` token is set on the Finding immediately after `skill_review_disabled=true` triggers (mirrors `verify-diff` disable semantics) — that path is still live since the disable check runs at Finding entry. The two `skill-review notes left ...` warning strings are kept distinct so Step 4's aggregate counter can break them down by case (`applied-edits` with residual notes vs `notes-left` callee-internal max-iter exhaustion).

  **Return-point no-stall reminder**: this sub-skill return (regardless of outcome — `no-actionable-findings`, `applied-edits`, `notes-left`, any non-error result) is mid-Finding workflow AND mid-issue workflow, never a terminal point. (The `error` and verdict-parse-failure cases are not part of this no-stall return list — they are routed through (e) and handled separately by the mapping table.) Parse the fenced JSON verdict and immediately take the next action per the mapping table — every non-error terminal verdict proceeds to (d3) `Skill(publicity-review)` empirical check in the **next tool call**. Never insert an interstitial summary or acknowledgment turn after the JSON block. Ending the response right after the JSON block — even with no prose between the verdict and the next tool call — is itself a stall: the verdict and the next tool call must land in the same assistant turn. See `§ No-Stall Principle`.
- **(e) skill-review error handling** — triggered when (d2)'s JSON verdict has `status: "error"` (or when the orchestrator's verdict-parse / schema-validation fails per the mapping table's last row). Record `skill-review error (<reason>)` (use the JSON `reason` field when present, otherwise the orchestrator's parse-failure label) and skip polish for this Finding. After 2 consecutive Findings with skill-review errors: set `skill_review_disabled=true` and skip polish for the rest of the run (warning: `skill-review disabled after consecutive errors`). Whether (d2) ended on success (`no-actionable-findings` / `applied-edits` / `notes-left`) or routed through (e) error handling, control proceeds to (d3) next. Outer-loop interaction: counter "consecutive Findings" semantics are per-Finding (terminal-iter verdict), and `skill_review_disabled` is checked at Finding entry only, never mid-loop — see (d-loop) Notes — Counter / disable scope.
- **(d3) `Skill(publicity-review)` empirical check** — `publicity-review` runs its own iteration loop (`verify-diff` pattern): each iteration dispatches a fresh subagent against the diff, and the publicity-review main thread applies the subagent's `suggested_edits` via Edit before re-dispatching, until the subagent returns no findings or max iterations is reached. Returns a single fenced JSON verdict at end.

  **Pre-invocation reminder**: the next tool call after `Skill(publicity-review)` returns is the (d-loop) early-exit / max-iter check, which itself dispatches either iter `k+1`'s `(d)` (continue) or `(f)` Scope check + stage (break) or the next Finding's `(a)` Re-read (`unresolved` / `conflict` break). Treat publicity-review's JSON verdict as a return value to parse, not a turn boundary — emit the parse → mapping → next action as the next tool call (not as a prose summary turn between the JSON verdict and the next dispatch). See `§ No-Stall Principle`.

  Inputs per Finding:
  - `Base ref` = `HEAD` (per-Finding state — Edit applied via (b), staged paths from (f) not yet attached because (f) runs after (d3))
  - `Max iterations` = `2` (publicity-review's default — leak find/redact converges fast)

  Parse the fenced JSON verdict. **JSON status → action / record-write mapping** (first-match-wins, same evaluate-in-order discipline as `verify-diff` § (b) Parse & apply, restricted to single-pass dispatch from the orchestrator's perspective):

  | JSON status | action | record.publicity_review |
  |---|---|---|
  | `converged` | proceed to (f) | `converged-iter-<k>` (use `iterations_used` as `<k>`) |
  | `unresolved` | downgrade Finding to `conflict` (also set `record.disposition = conflict`); compute the unique set of `file` paths from `remaining_findings[]` and run `git checkout HEAD -- <each path>` (publicity-review does not revert in the `unresolved` branch — `reverted_paths` is `[]` there per its return contract, so the orchestrator owns the revert); record warning `publicity-review unresolved (<n>): <category-breakdown>` (e.g. `unresolved (2): secret×1, user-specific-path×1`, where `n = findings_count`); skip (f), (g); continue to next Finding | `unresolved-<count>` |
  | `conflict` | downgrade Finding to `conflict` (also set `record.disposition = conflict`); paths in `reverted_paths` already reverted by publicity-review's safety rails — re-run `git checkout HEAD -- <reverted_paths>` defensively (idempotent); record warning `publicity-review conflict (<reason>)` (use JSON `reason` field); skip (f), (g); continue to next Finding | `conflict (<reason>)` |
  | `skipped` | record warning `publicity-review skipped (<reason>)`; proceed to (f) (**fail-open** for tool-side issues — `reason` ∈ `empty diff` / `diff too large` / `verdict parse failure` / `verdict schema violation` / `divergent findings` / `dispatch error`) | `skipped (<reason>)` |

  publicity-review folds verdict parse failure and schema violation into its own `status=skipped` per its return contract Step 4, so there is no separate orchestrator-side parse-failure branch. If the callee fails to emit any fenced JSON at all (a contract violation, not a `skipped` case), treat it as a dispatch fault: record `publicity-review skipped (dispatch error)` (reusing the existing `dispatch error` reason from the enum, since contract-violating empty output is morally equivalent) and proceed to (f) using the `skipped` row.

  Both branches set `record.publicity_review` to the status token and `record.publicity_iterations_used` to the JSON's `iterations_used` (or `0` for parse-failure / disabled paths).

  **Return-point no-stall reminder**: when `publicity-review` returns with `converged` / `skipped` (any non-`unresolved`, non-`conflict` result), this is mid-Finding workflow AND mid-issue workflow, never a terminal point. The next action is the (d-loop) early-exit / max-iter check, which itself dispatches the next concrete action (iter `k+1`'s `(d)` on continue, or `(f)` Scope check + stage on a break) in the **next tool call** per the (d-loop) iter-boundary reminder. The `unresolved` and `conflict` cases also continue immediately — both break the outer loop and proceed to "next Finding's (a)" without an interstitial turn. Ending the response right after the JSON block — even with no prose between the verdict and the next tool call — is itself a stall: the verdict and the next tool call must land in the same assistant turn. See `§ No-Stall Principle`.

  **Consecutive-error disable** (mirrors verify-diff / skill-review consecutive-error handling): keep a per-run counter that tracks **skill-side health**, not Finding outcome. `converged` / `unresolved` → counter reset (the skill ran cleanly, even when `unresolved` because the per-Finding leak verdict is a payload-level result, not a tool failure). `skipped` / `conflict` → counter increments. When the counter reaches 2, set `publicity_review_disabled=true`; for the remainder of the run, skip the `publicity-review` call on each Finding and record warning `publicity-review disabled after consecutive errors`. The `disabled after consecutive errors` warning attaches from the Finding **immediately after** the disable was triggered (the triggering Finding itself only carries its own disposition, e.g. `skipped (<reason>)` or `conflict (<reason>)`). Outer-loop interaction: the increment uses the **terminal-iter** verdict (last outer iter's status), and the `*_disabled` check runs at Finding entry only, never mid-loop — see (d-loop) Notes — Counter / disable scope.
- **(f) Scope check + stage** — `git diff --name-only` must show paths only inside the allowed scope set (`skills/`, plus `.claude/skills/dev-workflow-triage/` — see § Apply accepted Findings's allowed-scope-set paragraph). Any path outside: downgrade to `conflict`, `git checkout HEAD -- <paths>`, continue. Otherwise `git add <paths>` with explicit paths
- **(f.5) Bundle copy sync** — workaround for upstream Claude Code symlink bug ([anthropics/claude-code#53948](https://github.com/anthropics/claude-code/issues/53948); to be removed together with the `verify-bundle-sync` skill once the bug is fixed). Runs only when `record.target` matches `skills/<bundle-name>/skills/<bundle-name>/...` where `<bundle-name>` ∈ {`ask-peer`, `dev-workflow`, `extract-rules`, `rules-review`}; skipped for non-bundle skills and on the (b)/(c)/(d)/(d3) callee-abort downgrade paths (since (f) is already skipped on those). Self-targeted Findings (`record.target` under `.claude/skills/dev-workflow-triage/`) never match this pattern, so (f.5) is skipped for them by construction.
  1. Run `Skill(verify-bundle-sync)`. Parse the fenced JSON verdict at the end of the response.
  2. On `status: "ok"`: proceed to (g) — canonical and bundle copy are already in sync.
  3. On `status: "drift"`: run `cp -R skills/<bundle-name>/skills/<bundle-name>/. plugins/dev-workflow-bundle/skills/<bundle-name>/` to propagate the Finding's edits from canonical to bundle copy, then `git add plugins/dev-workflow-bundle/skills/<bundle-name>/` to stage the bundle copy paths so (g)'s commit captures both. Proceed to (g).
  4. On `status: "error"` (tool-side failure — `marketplace.json` missing, `jq`/`diff` missing, JSON-emission glitch): record warning `verify-bundle-sync error (<reason>)` and proceed to (g) anyway (fail-open — the Finding's canonical edit is independently valid; the operator can re-sync bundle copy post-run if needed). No consecutive-error disable counter is kept since this is a single point-of-use, not an iteration loop.

  Localization rationale: this is a temporary workaround for a known upstream bug. Removal when symlinks are restored is a one-bullet deletion (this `(f.5)` step, the frontmatter `Skill(verify-bundle-sync)` / `Bash(cp -R *)` entries, the `verify-bundle-sync` skill directory, the `.claude/dev-workflow.md` `test_commands` entry, and the `.claude/rules/project.rules.md` bundle-edit bullet). No per-Finding record schema, render rules, or counter state machine is affected.
- **(g) Commit** — use a HEREDOC with sentinel `COMMIT_MSG_END` (not `EOF`, to avoid early termination if Finding text contains an `EOF` line):

  ```bash
  git commit -m "$(cat <<'COMMIT_MSG_END'
  fix(<target>): <summary> (auto-triage #<N>)

  Category: <category>
  Reason: <1-2 lines>
  COMMIT_MSG_END
  )"
  ```

  On zero exit: capture `git rev-parse HEAD` for the summary, set `record.commit = <hash>` and `record.disposition = accept`, and increment `triage_commit_count` by 1. On non-zero (typically a pre-commit hook rejection): run `git reset` + `git checkout HEAD -- <paths>` to return to a clean tree, downgrade to `conflict` (`record.disposition = conflict`, `record.commit = —`), record `commit-failed`, continue without incrementing `triage_commit_count`

`references/triage-criteria.md` § edge-case dispatch table lists the same dispositions in table form — useful as a quick reference; the procedural prose above is authoritative for ordering.

#### 3.5 Post triage comment

After every Finding in the issue is classified (or immediately, if the whole issue was classified as `parse-error` by Parse body):

- Build the body using the template in `references/triage-criteria.md`
- `mkdir -p .triage`, then `Write` to `.triage/triage-<YYYY-MM-DD>-issue<N>.md`. On collision (re-run), append `-2`, `-3`, .... The file is gitignored and kept as a local in-session reference (the GitHub comment is canonical); do not delete it. The directory is intentionally placed outside `.claude/` so Claude Code's sensitive-path treatment for `.claude/*` paths does not trigger a Write permission prompt during routine execution
- Run `gh issue comment <N> --repo SonicGarden/dev-workflow-issues --body-file <path>`
- Non-zero exit: record `comment-failed`, continue with other issues

#### 3.6 Close decision

Close the issue only when **both** legs hold:

1. § 3.2 Parse body completed successfully (i.e. did not classify the whole issue as `parse-error`) — this leg gates the zero-Findings case, where leg 2 would otherwise be vacuously true; AND
2. Every Finding's disposition is `accept` or `reject` (no `parse-error`, no `conflict`).

Otherwise leave open for human review.

- When closing: `gh issue close <N> --repo ...` with `--reason completed` (any accepts) or `--reason "not planned"` (all rejects). Drop `--reason` if `no_reason_flag=true` (gh < 2.28)
- Non-zero exit: record `close-failed`, continue

After the per-issue row reaches its terminal sub-step (`§ Close decision` for both the normal and parse-error paths), apply **exactly one** of the two return-point reminders below — reminder #1 if more unprocessed issues remain in the per-issue queue, reminder #2 if this was the last issue.

**If more unprocessed issues remain in the per-issue queue (apply reminder #1):**

> **Return-point no-stall reminder**: Closing this issue (regardless of disposition — `accept-close`, `not-planned-close`, `close-failed`, `close-skipped (parse-error or all-conflict)`, any non-error result) is mid-run workflow when more issues remain. Ensure the just-finished per-issue row is `completed` (flip it now on the normal / parse-error paths) and mark the next per-issue row `in_progress` in the **next tool call** — never insert an interstitial summary or acknowledgment turn before resuming with the next issue's body parse / first `Read`. See `§ No-Stall Principle`.

**Otherwise (this is the last issue in the queue — apply reminder #2):**

> **Return-point no-stall reminder**: Finishing the last issue (regardless of disposition — any combination of `accept` / `reject` / `conflict` / `parse-error` across the run, any non-error result) is not a terminal point. Mark the last per-issue row `completed`, mark the `Step 3: Process each issue serially` phase row `completed`, and mark the `Step 3.7: Release bookkeeping` phase row `in_progress` in the **next tool call** (one tool-call burst carrying all three flips — three `TaskUpdate` calls, or a single `TodoWrite` call under the fallback), then proceed directly to Step 3.7 release bookkeeping. See `§ No-Stall Principle`.

### Step 3.7 — Release bookkeeping (after all issues processed)

After every issue has been processed, perform a single bookkeeping pass to bump the marketplace version of every modified bundle skill plus `dev-workflow-bundle`, and record a CHANGELOG entry. This step runs **once per run**, not per issue.

Entry state: the `Step 3.7: Release bookkeeping` row is already `in_progress` (flipped by Step 3.6's last-issue reminder #2). When this step terminates (any branch — including the (a) early-return), the boundary reminder at the bottom of this section handles the `completed` flip and the Step 4 `in_progress` flip in one tool-call burst. (The 0-open-issues path in Step 2 does not enter this section — Step 3.7 was already flipped to `completed` there as part of the four-row flip.)

The accepted-and-committed list, every per-Finding commit hash, and every (target-skill, Finding summary, issue-N, Category, Reason) tuple needed below are already held in memory from Step 3.4 — do not re-derive them by re-parsing git or the issue list.

**(a) Early return**: if zero Findings were accepted-and-committed across the entire run, skip release bookkeeping; record `release-bookkeeping=skipped (no commits)`; proceed to the boundary reminder at the bottom of this section, then to Step 4.

**(b) Modified-skill set**: from the accepted-and-committed list, build the unique set of `<target-skill>` values. Filter against the four-skill bundle whitelist (`dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`). This filter is also the **by-design exclusion point for `dev-workflow-triage` self-fix commits**: the self target is project-local (no marketplace plugin entry, no CHANGELOG entry), so it must not enter the bump set — accepted self-targeted Findings are committed in § 3.4 but deliberately dropped here.

**(c) Plugin mapping**.

> **Reminder — keep in sync with `§ Fixed configuration`**: This must list exactly the 4 bundle skills from `§ Fixed configuration`'s "Triage scope" line (the bundle subset — `dev-workflow-triage` is intentionally absent from this table: project-local, excluded from bookkeeping per (b) above). If you add a new bundle skill, update both this table AND the triage scope line in `§ Fixed configuration`.

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

On non-zero exit (typical case: a pre-commit hook rejection), recover with `git reset` + `git checkout HEAD -- .claude-plugin/marketplace.json CHANGELOG.md`, record `release-bookkeeping=failed (commit error)`, and proceed to Step 4 without incrementing `triage_commit_count`.

On zero exit, capture `git rev-parse HEAD` as the bookkeeping commit hash for the Step 4 summary line `release-bookkeeping=<hash>`, and increment `triage_commit_count` by 1.

After this step terminates (any branch), apply the following boundary reminder before proceeding to Step 4:

> **Return-point no-stall reminder**: Step 3.7 termination (regardless of outcome — a successful commit hash, `skipped (no commits)`, `failed (version skew | json invalid | changelog edit error | scope leak | commit error)`, any non-error result) is not a terminal point. Mark `Step 3.7: Release bookkeeping` row `completed` and `Step 4: Emit summary` row `in_progress` in the **next tool call** (one tool-call burst carrying both flips — two `TaskUpdate` calls, or a single `TodoWrite` call under the fallback), then proceed directly to summary emission. See `§ No-Stall Principle`.

### Step 4 — Emit summary

Print to stdout in Japanese (see `§ Output language`). This is the only trace a routine leaves. The summary has two sections — first the **Per-Finding execution log**, then the aggregate counters.

Entry state: the `Step 4: Emit summary` row is already `in_progress` (flipped either by the Step 3.7 → Step 4 boundary reminder, or by the 0-open-issues path in Step 2). The final `completed` flip and the summary stdout output **must occur in the same tool-call burst**. See `§ No-Stall Principle` § Phase / per-issue status transitions.

**Per-Finding execution log** — one block per processed Finding in source order. Fields source from the per-Finding memory record in § Apply accepted Findings (see (d-loop) Notes — Record-field overwrite for terminal-iter rendering and cumulative dispatch cost observability). When the run produced zero Finding records (e.g. the 0-open-issues path, or a run where every issue ended in whole-issue parse-error with no Findings parsed), still render the `Per-Finding execution log` heading and emit a single placeholder line `(none — 0 Findings logged)` under it before the aggregate summary. **Each field renders its written value, or `—` if the record-write point was never reached** — this rule applies uniformly across all dispositions (`accept` / `reject` / `conflict` / `parse-error`), driven by which sub-steps actually ran for that Finding, not by the disposition itself. **Reject reasons (including the Reject #7 stale-issue 4-element cite format `Already addressed (producer_version <X.Y.Z> < current_version <Y.Z.W>; CHANGELOG entry: <token>; SKILL.md cite: <quoted passage>)`) are surfaced via the Step 3.5 Post triage comment template — the GitHub issue comment is the canonical record. They are intentionally NOT rendered in this per-Finding execution log block to keep the log scannable; render only the listed fields below.** The `verify-diff` and `publicity` lines each carry an `[iter ...]` clause that follows these cases (the orchestrator passes `Max iterations = 2` to publicity-review per § Apply accepted Findings (d3), so the publicity denominator renders as `/2`; verify-diff renders as `/3` per its own default):

- `verify_diff` ∈ {`converged`, `unresolved`, `skipped`, `conflict`} (the (d) sub-step ran): render `<token> [iter <iterations_used>/3]`
- `verify_diff` = `disabled` (the (d) sub-step was skipped because `verify_diff_disabled=true`): render `disabled [iter —]`
- `verify_diff` = `—` (the (d) sub-step never ran for this Finding — e.g. (b)/(c) downgraded to `conflict` first, or the disposition is `parse-error`/`reject`): render just `—` with no `[iter ...]` clause
- `publicity_review` ∈ {`converged-iter-<k>`, `unresolved-<count>`, `conflict (<reason>)`, `skipped (<reason>)`} (the (d3) sub-step ran): render `<token> [iter <iterations_used>/2]`
- `publicity_review` = `disabled` (the (d3) sub-step was skipped because `publicity_review_disabled=true`): render `disabled [iter —]`
- `publicity_review` = `—` (the (d3) sub-step never ran for this Finding — e.g. (b)/(c)/(d) downgraded to `conflict` first, or the disposition is `parse-error`/`reject`): render just `—` with no `[iter ...]` clause
- `outer_iter` ∈ 1..3 (the (d-loop) ran at least once): render `<k>/3 (<no-edits|callee-abort|max-iter>)` using `record.outer_exit`
- `outer_iter` = 0 (the (d-loop) never reached — see `record.outer_iter` default for the conditions): render just `—` with no exit reason

```text
issue #<N> Finding <n>: <accept|reject|conflict|parse-error>
  target:        skills/<target>/skills/<target>/<file> | —
  outer-loop:    <k>/3 (<no-edits|callee-abort|max-iter>) | —
  verify-diff:   <converged|unresolved|skipped|conflict> [iter <iterations_used>/3] | disabled [iter —] | —
  skill-review:  <no-actionable-findings|applied-edits|notes-left|error|disabled> | —
  publicity:     <converged-iter-<k>|unresolved-<count>|conflict (<reason>)|skipped (<reason>)> [iter <iterations_used>/2] | disabled [iter —] | —
  commit:        <hash> | —
```

**Aggregate summary** (printed after the per-Finding log):

- Open issues received / processed
- Counts per outcome: `accept`, `reject`, `conflict` are Finding-level (count one per Finding); `parse-error` is issue-level (count one per whole-issue parse-error, regardless of the number of Findings the issue contained)
- Accepted-and-committed files (relative paths) with commit hashes
- verify-diff state: `enabled` or `disabled-after-errors`; count of Findings with `verify-diff unresolved (<n> gaps)`; count of Findings with `verify-diff skipped (<reason>)` broken down by reason
- verify-diff dispatches consumed: cumulative Agent-tool dispatches across the run (cost observability)
- skill-review state: `enabled` or `disabled-after-errors`; count of Findings with `skill-review notes left after applied-edits` (residual structural notes when terminal verdict is `applied-edits`); count of Findings with `skill-review notes left after max iters` (terminal verdict is `notes-left` — callee's internal max iterations exhausted). Both are sub-counters of the overall "skill-review notes left" condition
- publicity-review state: `enabled` or `disabled-after-errors`; count of Findings with `publicity-review unresolved (<n>)` broken down by top category (e.g. `secret×N, user-specific-path×N, ...`); count of Findings with `publicity-review conflict (<reason>)` broken down by reason; count of Findings with `publicity-review skipped (<reason>)` broken down by reason (`empty diff` / `diff too large` / `verdict parse failure` / `verdict schema violation` / `divergent findings` / `dispatch error`). Source of truth: the warning strings recorded by (d3) (the `unresolved`/`conflict`/`skipped` rows), not the per-Finding `record.publicity_review` token (which stores a count only). Same pattern as the verify-diff and skill-review aggregate lines above.
- publicity-review dispatches consumed: cumulative Agent-tool dispatches across the run (cost observability — parallel to the verify-diff line)
- `outer-loop iterations: <histogram>` — render as `iter1: A, iter2: B, iter3: C` where `A` / `B` / `C` are Finding counts that ran exactly that many outer iterations (`record.outer_iter == 1` / `2` / `3` respectively). Findings with `record.outer_iter == 0` (see `record.outer_iter` default for the conditions) are excluded
- `outer-loop exit reasons: no-edits×N, callee-abort×N, max-iter×N` — broken down by `record.outer_exit` value across all Findings with `record.outer_iter > 0`
- Failure counts: `comment-failed` / `close-failed` / `commit-failed`, with (issue#, finding#) pairs
- `overflow=true` notice if Step 2 hit the 50-issue cap (rendered as `50-issue cap reached`)
- `release-bookkeeping`: one of `<commit-hash>` (success), `skipped (no commits)`, `failed (version skew: dev-workflow=<v1>, dev-workflow-bundle=<v2>)`, `failed (json invalid)`, `failed (changelog edit error)`, `failed (scope leak)`, or `failed (commit error)` — sourced from Step 3.7's outcome
- `triage-branch`: one of
  - `<triage_branch_name> (based on <triage_branch_base>) — <N> commits — pushed to origin` (push success — `<N>` = `triage_commit_count` ≥ 1)
  - `<triage_branch_name> (based on <triage_branch_base>) — <N> commits — push-failed (<reason>)` (push fail — branch retained for the operator to push manually)
  - `<triage_branch_name> (based on <triage_branch_base>) — created and deleted (0 commits)` (auto-cleanup case — `<N>` = 0; partial-cleanup failures are reported via the separate `cleanup:` warning, not here)

  Sourced from `§ Auto-cleanup of empty triage branch` and `§ Push triage branch to origin` below
- `stop-hook-detected: ~/.claude/stop-hook-git-check.sh (Web env standard hook) — spurious fires during multi-Skill dispatch flow are recorded and ignored per § Stop hook structural conflict` if the Step 1 pre-flight detection set `stop_hook_present=true`. Omit the line entirely when the flag is unset (Local environment / hook absent)

#### Auto-cleanup of empty triage branch

Run **before** `§ Push triage branch to origin` and the summary stdout (Auto-cleanup determines the rendering of the 0-commit form only — the >0-commit form's suffix is decided by `§ Push triage branch to origin` below). If `triage_commit_count == 0`, the run produced zero commits on the triage branch (per-Finding commits and the Step 3.7 bookkeeping commit both increment the counter, so a `0` here implies the bookkeeping step reached `skipped (no commits)`) and there is nothing to PR — clean up:

- `git switch "$original_branch"`. Non-zero exit ⇒ record warning `cleanup: switch back failed (original=<original_branch>)` and skip the `git branch -D` step (deleting a checked-out branch fails anyway). Do not abort
- `git branch -D "$triage_branch_name"`. Non-zero exit ⇒ record warning `cleanup: branch -D failed (branch=<triage_branch_name>)`. Do not abort. The `-D` (capital, hard-delete) is intentional — the branch we just created is unmerged into anything by definition; lowercase `-d` would refuse to delete it on the merged-state safety check
- Render `triage-branch: <triage_branch_name> (based on <triage_branch_base>) — created and deleted (0 commits)` in the summary regardless of cleanup outcome — partial-cleanup failures (`cleanup: switch back failed (...)` / `cleanup: branch -D failed (...)`) surface via separate `cleanup:` warning lines, keeping the `triage-branch:` form set closed at 3 (per `§ Step 4 — Emit summary` `triage-branch` bullet)

When `triage_commit_count > 0`, do **not** run the cleanup — the branch holds at least one commit the operator wants to PR. Render the appropriate `<N> commits` form per `§ Step 4 — Emit summary` `triage-branch` bullet (the post-push state determined by `§ Push triage branch to origin` decides between the `pushed to origin` and `push-failed (<reason>)` suffix).

Note: `original_branch` may itself match `triage-*` (re-running on a previously-created triage branch). Cleanup is identical — `git switch` returns to that triage branch and `git branch -D <new>` removes only the just-created empty branch. The parent triage branch survives.

#### Push triage branch to origin

Run **after** the auto-cleanup decision settles, **before** emitting the summary stdout (so the `triage-branch` summary line above can render the post-push state).

- If `triage_commit_count == 0` (auto-cleanup ran or attempted): no push — there is nothing to push regardless of whether cleanup succeeded fully. Skip directly to summary emission
- If `triage_commit_count > 0`:
  - `git push -u origin "$triage_branch_name"`. On non-zero exit, retry once after a 1–2 second sleep; on the second non-zero exit, record `push-failed (<reason>)` and stop retrying
  - On zero exit (initial attempt or the single retry): record push status `pushed to origin` for the `triage-branch:` summary line
  - On the second non-zero exit: record push status `push-failed (<reason>)` for the `triage-branch:` summary line and surface as a non-fatal warning per `§ No-Stall Principle`. `<reason>` is the **last non-empty line of `git push` stderr, truncated to ≤ 80 characters** — sufficient for an operator to distinguish auth / network / non-fast-forward / hook-rejection without inventing a classification taxonomy. If stderr has no non-empty line (empty or whitespace-only), render `push-failed (no stderr)`. Example shapes (the operator scans these to decide next action — no fixed format guaranteed):
    - `push-failed (! [rejected]        triage-... -> triage-... (non-fast-forward))`
    - `push-failed (fatal: Authentication failed for 'https://github.com/...')`
    - `push-failed (remote: pre-push hook rejected (policy violation))`

    Do **not** auto-recover (no force push, no rebase, no branch rename) — the operator can `git push` manually post-run

**Session-level push-target conflict**: if operator-level instructions (`CLAUDE.md`, session bootstrap, environment templates) name a different "designated branch" as the push target, do **not** consolidate the triage branch into that name. The triage branch name is per-run isolation infrastructure (`§ Triage branch isolation`); consolidating into a different name loses same-day re-run stacking semantics and disconnects the operator's PR identity from the run timestamp. Reconcile post-run by rebase / merge if needed, not by mid-routine rename.

Always emit the summary, even on zero-activity runs — "ran but made no changes" must be distinguishable from "didn't run at all".

> **Return-point no-stall reminder**: Emitting the Step 4 summary (regardless of content — zero-activity, `push-failed`, any non-error result) is not a terminal point on the normal path. The same tool-call burst that prints the summary also flips the `Step 4: Emit summary` row `completed` (per the entry-state paragraph above) and the `Step 5: Self-retrospective` row `in_progress`, and the next tool call proceeds directly into `§ Step 5 — Self-retrospective`'s tally. See `§ No-Stall Principle`.

### Step 5 — Self-retrospective

Runs **once per run**, immediately after the Step 4 summary emission, on the normal path only. The two fatal-abort exits listed in `§ No-Stall Principle` stop before the per-issue loop — no callee dispatches ran, so there is nothing to observe and this step is skipped. Phase-row handling on those exits follows the existing abort behavior: a Step 1 abort stops before row registration, so the `Step 5: Self-retrospective` row never exists; a Step 2 abort leaves downstream rows un-flipped, same as the existing Step 3 / Step 3.7 rows.

Entry state: the `Step 5: Self-retrospective` row is already `in_progress` (flipped by the Step 4 boundary reminder above).

#### Tally (in-context, once)

Collect the run's observation signals from the conversation context. No state variables are maintained mid-run for this — the context itself is the evidence (see `§ No-Stall Principle`'s "Operator interventions are tallied at Step 5" paragraph for why mid-run recording is forbidden):

1. **Mid-run user messages**, classified into two buckets:
   - **Stall intervention**: a continuation nudge carrying no new directive content (e.g. 「続けて」, "continue", a restatement of the routine instruction). Record the callee return point / sub-step that immediately preceded the message as its `position` (granularity is sub-step level — outer-loop iterations of the same sub-step are not distinguished, so repeat interventions at the same sub-step aggregate into one Finding). These are the filing trigger.
   - **Directive**: a message carrying new instructions (a change of direction, an additional task). Not stall evidence — excluded from the filing trigger; only the count is mentioned in the Run context section.
2. **Stop hook spurious fires**: count and approximate positions of the hook feedback injections observed in context (see `§ Stop hook structural conflict`).
3. **Callee disable state**: the final values of `verify_diff_disabled` / `skill_review_disabled` / `publicity_review_disabled`.

#### Filing decision

- **Zero stall interventions** → do not file an issue. Emit the terminal line `self-retrospective: skipped (no observations)` (the normal, expected outcome) and finish the run.
- **One or more stall interventions** → assemble and file the issue below.

#### Issue body (consumer-parseable producer shape)

The body must pass `§ 3.2 Parse body` unchanged, so the next run can triage it like any other issue:

- Header: `# dev-workflow-triage self-retrospective (auto-generated)` (deliberately distinct from the dev-workflow producer's header)
- **No `**Producer version:**` line** — intentional: this project-local skill has no marketplace version. The consumer treats the absence as `producer_version = "unknown"` and falls through to the standard checklist per `§ 3.3 Judge each Finding`'s self-retrospective paragraph (the intended degradation)
- One `### Finding <n>` per distinct stall position (multiple interventions at the same position are aggregated into one Finding with the count stated), each with the 4 labeled fields:
  - `**Target skill:** dev-workflow-triage`
  - `**Category:**` — judged from content within the 5-value enum; stall observations are typically `ambiguity`, while mechanism defects are typically `other`
  - `**Description:**` — position, count, and an abstracted note of the intervention
  - `**Suggested fix direction:**` — MUST be written as a **concrete local edit**: name the target section heading and the wording to strengthen, at a granularity the next run can apply as a single `Edit` call. An abstract direction ("improve the no-stall wording") gets rejected under Reject #3 (too abstract) — concreteness is what closes the self-fix loop
- `## Run context` section (supplementary, outside the Findings — `§ 3.2 Parse body` reads only `### Finding` headings and labeled fields, so this section does not interfere with parsing): stop-hook fire count and positions, directive message count, `*_disabled` flag states, `triage_branch_name`, issue counts processed
- Trailing `Findings: <N>` line (consumer trailer cross-check)

**Sanitization** (self-contained operative subset; the fuller principles live in `skills/dev-workflow/references/self-retrospective.md` § 3. Sanitization rules):

- Operator messages are abstracted, never quoted verbatim (they may carry project context)
- No absolute paths (replace with a generic `<project>/...` shape)
- No credential-like literals

#### Submit

- Title: `[triage-self-retrospective] dev-workflow-triage: <N> stall observation(s) (<triage_branch_name>)` — the branch name's timestamp doubles as the run identifier, so same-day re-runs never collide. Keep the prefix in sync with `§ Fixed configuration`'s "Self-retrospective issue title prefix" line
- `mkdir -p .triage`, then `Write` the body to `.triage/self-retrospective-<YYYYMMDD-HHMMSS>.md`. The file is gitignored and kept as a local in-session reference (the GitHub issue is canonical); do not delete it — same staging discipline as `§ 3.5 Post triage comment`'s staging-file step
- Run `gh api --method POST /repos/SonicGarden/dev-workflow-issues/issues -f title="<title>" -F body=@<path>` (`gh api` over `gh issue create` for minimum token permissions — `Issues: write` only; same rationale as the dev-workflow producer)
- On non-zero exit, retry once after a 1–2 second sleep. On the second non-zero exit, record `self-retrospective-failed (<reason>)` where `<reason>` is the last non-empty line of stderr truncated to ≤ 80 characters; if stderr is empty or whitespace-only, render `self-retrospective-failed (no stderr)`. Do **not** auto-recover (no alternative endpoint, no destination rewrite); the staging file stays in place for a manual retry post-run

#### Terminal line

Always emit exactly one of the three closed forms below (structured tokens — preserved verbatim per `§ Output language`), in the same tool-call burst as the `Step 5: Self-retrospective` row's `completed` flip. This is the true end of the run:

- `self-retrospective: filed #<issue-N>`
- `self-retrospective: skipped (no observations)`
- `self-retrospective: failed (<reason>)` — the rendered form of the recorded `self-retrospective-failed (<reason>)` token (same `<reason>` string; the recorded token is what `§ No-Stall Principle`'s non-fatal enumeration and the edge-case dispatch table name)
