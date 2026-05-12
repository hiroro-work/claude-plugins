---
name: dev-workflow-triage
description: Triage open issues in the dev-workflow-bundle retrospective repo. Read each open issue, judge each Finding (accept / reject), apply accepted fixes to the bundle skills (dev-workflow, ask-peer, extract-rules, rules-review), post a triage comment, and close the issue. Designed for non-interactive routine execution (no plan mode, no user prompts) on Claude Code on the Web.
allowed-tools: Read, Edit, Write, TodoWrite, Agent, Skill(verify-diff), Skill(skill-review), Skill(publicity-review), Bash(gh auth status), Bash(gh --version), Bash(gh issue list *), Bash(gh issue comment *), Bash(gh issue close *), Bash(git diff *), Bash(git add *), Bash(git commit *), Bash(git reset), Bash(git checkout HEAD -- *), Bash(git push *), Bash(git rev-parse *), Bash(git config --get *), Bash(git for-each-ref *), Bash(git symbolic-ref *), Bash(git switch *), Bash(git branch *), Bash(date *), Bash(jq *), Bash(mkdir -p *)
---

# Dev Workflow Triage

Non-interactive daily triage of the `dev-workflow-bundle` retrospective issues. Designed for routine execution. See § No-Stall Principle below for the only permissible exits.

## No-Stall Principle

This skill has **no user-confirmation gates**. The run executes to completion or aborts to the Step 4 summary. Every other transition — sub-skill returns, loop boundaries, non-fatal error records, **TodoWrite phase / per-issue status flips** — continues without user confirmation; the only stopping points are the two exits listed below.

**Permissible fatal-abort exits (both emit the Step 4 summary and stop without entering the per-issue loop):**

- Step 1 pre-flight failures (defined in Step 1)
- Step 2 `gh issue list` non-zero exit (defined in Step 2)

Whole-issue `parse-error` is **not** an abort; the issue is left open with a triage comment and the run continues.

**No pause at the (D) subagent dispatch return.** When the per-Finding `(D)` Agent dispatch returns its single fenced aggregate JSON verdict, parse the JSON and follow the existing branch logic immediately. Long reasoning prose in the dispatch result is not a stopping signal — do not insert a "let me summarize what just happened" turn before the next action. The aggregate JSON is the only contract surface for branching; verify-diff / skill-review / publicity-review themselves run inside the dispatched subagent and never produce orchestrator-visible Skill returns under this design.

Concretely, the recognized orchestrator-side return point is the **single (D) `Agent` dispatch return** inside the Apply accepted Findings sub-flow (§ 3.4 Apply accepted Findings). The (D) bullet carries a return-point no-stall reminder inline; the duplication with this section is intentional so the rule appears at the decision moment. The (D) reminder is scoped to **mid-Finding workflow** AND **mid-issue workflow** — i.e. it covers both same-Finding sub-step transitions (e.g. `(D) → (f) → (g)` on `aggregate.status == "ok"`, or `(D) → next Finding's (a)` on `callee-abort`) and same-issue sub-step transitions (e.g. 3.4 → 3.5 → 3.6) so no separate inline reminder is needed at 3.4 → 3.5 or 3.5 → 3.6. Subagent-internal outer-loop iteration boundaries are governed separately — see the next paragraph for details.

**No pause at issue-loop / Step boundaries.** Three additional return-point reminders cover the boundaries the (D) reminder does not reach: the **issue boundary** (3.6 → next issue), the **last-issue → Step 3.7 boundary**, and the **Step 3.7 → Step 4 boundary**. Each boundary has its own inline reminder — same closed-list shape as (D), placed at the decision moment.

**Phase / per-issue TodoWrite transitions are non-stalling.** Marking a phase row or per-issue row `completed` and the next row `in_progress` must happen as part of the same tool-call burst that produces the next concrete action — never as a standalone summary turn. The `TodoWrite` write itself is allowed (it's a status-only side effect, not a sensitive-path file write, so no permission dialog fires in routine execution), but no user-facing prose is emitted between the status flip and the next non-`TodoWrite` tool call.

**Non-fatal errors are recorded and skipped, not stops.** Per-Finding / per-issue errors (`comment-failed`, `close-failed`, `commit-failed`) continue with the next Finding or issue. Step 2 records `overflow=true` and the run keeps going on the truncated list. Step 3.7 errors (`release-bookkeeping=failed (commit error|scope leak|version skew|json invalid|changelog edit error)`) fall through to Step 4 — Step 3.7 runs once per run after the per-issue loop, so "next Finding" is not a possible recovery there. Step 4 push errors (`push-failed (<reason>)`) fall through to summary emission — push runs once per run after auto-cleanup, so there is no per-Finding recovery path either; the operator can `git push` manually post-run. See `§ Push triage branch to origin` for the `<reason>` extraction spec. `references/triage-criteria.md` § Edge-case dispatch table is the authoritative list of dispositions.

**Stop-hook spurious fires are also non-fatal.** `~/.claude/stop-hook-git-check.sh` (auto-installed by Claude Code on the Web — see `§ Stop hook structural conflict`) fires on every Stop event during the (b)→(g) per-Finding flow because uncommitted state is normal mid-flow. The orchestrator main thread sees only one such Stop event per Finding (at the (D) subagent dispatch boundary — entry and return), but additional Stop events fire **inside the (D) subagent** at every internal `Skill(verify-diff)` / `Skill(skill-review)` / `Skill(publicity-review)` boundary; the subagent must treat each as spurious per the `--- STOP HOOK NOTE ---` paragraph in its prompt. The hook's `exit 2` injects a `Please commit and push…` feedback string but does **not** block — record the spurious fire and continue with the prescribed flow ((b)→(c)→(D)→(f)→(g) on the orchestrator side; the subagent runs its outer review loop iterating verify-diff → skill-review → publicity-review up to 3 times internally). Do **not** jump ahead to (g) commit on hook feedback alone; that bypasses (D) entirely and is a misbehavior.

**Outer-loop iteration boundaries are subagent-internal, not orchestrator-visible.** Under the (D) subagent design, the outer review loop (max 3 iterations of verify-diff → skill-review → publicity-review) runs inside the dispatched subagent; the orchestrator main thread sees only the single aggregate JSON return at (D)'s end. The subagent's `--- FLOW ---` discipline + "After emitting the JSON, do not produce any additional turn" return contract govern the iter boundaries inside the subagent. The orchestrator does not need a separate iter-boundary reminder because no orchestrator-visible iter boundary exists.

**Fatal tool-level errors are out of scope** — irrecoverable `Edit` / `Read` / `Bash` failures halt with a diagnostic regardless.

## Triage branch isolation

Each run creates its own branch named `triage-YYYYMMDD-HHMMSS` so per-Finding commits and the Step 3.7 release-bookkeeping commit do not land directly on `main` (or whatever branch the operator was on at run start). The base for the new branch is the **most recent existing `triage-*` branch** — if a prior triage branch is still open (unmerged) the new run continues from where it left off, so two runs against partially-overlapping issue sets never produce conflicting `marketplace.json` / `CHANGELOG.md` edits at PR-merge time. With no prior triage branches the base is the branch the operator was on (typically `main`).

**Eager creation, lazy cleanup.** The branch is created in Step 1 Pre-flight regardless of whether any Findings will be accepted. A 0-commit run (no open issues, every Finding rejected, every accept downgraded to `conflict`, etc.) is auto-cleaned in Step 4: switch back to `original_branch` and `git branch -D <triage_branch_name>`. Lazy creation (deferring the `git switch -c` until the first commit) was rejected because `§ 3.4 Apply accepted Findings` sub-step (g) and `§ Step 3.7 Release bookkeeping` sub-step (j) each have their own commit-failure recovery paths (`git reset` + `git checkout HEAD -- <paths>`); injecting branch-creation hooks into both sites would multiply the recovery branches without removing the cleanup obligation. Eager + single-site cleanup keeps the control flow flat.

**Same-day re-run by design stacks.** The 2nd run of a single day picks the 1st run's `triage-YYYYMMDD-HHMMSS` branch as its base because refname sort = chronological. Per-run isolation (each run still has its own branch) is preserved while the chain reflects the review history. The single-writer constraint (don't run two `dev-workflow-triage` invocations in parallel against the same target repo) still applies — concurrent runs sharing the same latest base would conflict at PR-merge time on `marketplace.json` / `CHANGELOG.md`. The same stacking applies when `original_branch` itself is a `triage-*` branch (re-running on a previously-created triage branch); see Step 1 Pre-flight and § Auto-cleanup of empty triage branch for the bookkeeping.

## Stop hook structural conflict (Claude Code on the Web)

Claude Code on the Web's container auto-installs `~/.claude/stop-hook-git-check.sh` (mode 755) at startup and registers it under `~/.claude/settings.json` `hooks.Stop` with an empty matcher (matches every Stop event). This is part of the Web environment's standard setup, **not** a user-defined hook.

**What it does**: on every Stop event, the hook checks the git working tree (recursion guard via `stop_hook_active`, then git-repo / remote / uncommitted / untracked / unpushed in order). If any of the last four trip, it `exit 2`s and injects a stderr feedback string (`Please commit and push…`) so the agent's turn continues — the hook **does not** block execution.

**Conflict mechanism**: the per-Finding flow in `§ 3.4 Apply accepted Findings` runs `(b) Edit → (c) frontmatter check → (D) Agent dispatch → (f) scope check + stage → (g) commit` on the orchestrator main thread. Inside the (D) subagent, an outer review loop runs up to 3 iterations of `Skill(verify-diff) → Skill(skill-review) → Skill(publicity-review)`. Each Skill dispatch (verify-diff, skill-review, publicity-review — multiplied by up to 3 outer iters inside the subagent) creates a turn boundary, and uncommitted working-tree state between (b) and (g) is **normal** — that is the design. The hook fires at every boundary (orchestrator-side: (b)→(c), (c)→(D) entry, (D) return→(f), (f)→(g); subagent-side: every internal Skill boundary) and feeds back `Please commit and push…` each time.

**Correct behavior**: see `§ No-Stall Principle`'s "Stop-hook spurious fires are also non-fatal" paragraph for the disposition. The cross-references in `verify-diff` SKILL.md (§ Stop hook structural conflict (caller-side note)), `skill-review` SKILL.md (§ Scope), and `publicity-review` SKILL.md (§ Stop hook structural conflict (caller-side note)) all point back here so the same disposition is applied caller-agnostic.

**Bypass / disable guidance**:

- Permanent removal is discouraged — the hook serves other Web-environment purposes (e.g. nudging users about uncommitted state on conventional sessions)
- Per-routine bypass is unnecessary because the hook does not block (`exit 2` is a continue signal). Following the No-Stall Principle is sufficient
- Step 1 Pre-flight detects the hook's presence and surfaces it in the Step 4 summary as observability. Detection is warning-only — never an abort

## Fixed configuration

- **Target issue repository**: `SonicGarden/dev-workflow-issues` (hardcoded — change this line to retarget)
- **Bundle skills under triage scope**: `dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`
- **Edit target paths**: always `skills/<target>/SKILL.md` or `skills/<target>/references/*.md` (canonical source of truth). Never edit `.claude/skills/<target>/...` symlinks
- **Output language**: `ja` (hardcoded). Applied per `§ Output language` below

The issue body format (`### Finding <N>` headings and 4 labeled fields per Finding) is produced by `skills/dev-workflow/references/self-retrospective.md`. The producer may also emit a trailing `Findings: N` line as a self-consistency cross-check, but the `### Finding` heading count is the canonical Finding count on the consumer side. Parse and reject conditions in the "Parse body" step below and in `references/triage-criteria.md` must stay aligned with that producer.

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
  - `triage_branch_base = $(git for-each-ref --sort=-refname 'refs/heads/triage-*' --format='%(refname:short)' | head -n1)`. The glob pattern is **single-quoted** because the `Bash` tool runs zsh, where the default `nomatch` option fails the command with `no matches found` if the pattern is unquoted and no branch exists. Single-quoting passes the literal pattern to `git for-each-ref`, which returns empty stdout on no match. Refname sort is correct here because the branch-name format `triage-YYYYMMDD-HHMMSS` encodes the creation timestamp, so `--sort=-refname` gives chronological order; the alternatives `--sort=-creatordate` / `--sort=-committerdate` return the **tip commit's** date instead of the branch's creation date and would mis-rank a fresh branch cut from an old base
  - If `triage_branch_base` is empty (no prior `triage-*` branches), fall back to `triage_branch_base = "$original_branch"`
  - `git switch -c "$triage_branch_name" "$triage_branch_base"`. Non-zero exit ⇒ abort with summary `branch creation failed (base=<triage_branch_base>)` (covers e.g. `git switch` < 2.23, base ref unexpectedly missing, working tree blocked despite the earlier `git diff --quiet` check). Same fatal-abort shape as the other Step 1 failures
  - On success, initialize `triage_commit_count=0`. The counter is incremented **only on zero-exit `git commit`** at `§ 3.4 Apply accepted Findings` sub-step (g) and `§ Step 3.7 Release bookkeeping` sub-step (j); a failed commit (pre-commit hook rejection, etc.) leaves it unchanged. Step 4 auto-cleanup checks `triage_commit_count == 0` to decide whether to delete the now-empty branch (the abort path above exits the run before Step 4 ever runs, so a separate "branch active" flag is redundant — reaching Step 4 already implies a successfully-created branch)
- Resolve `current_version` once for the run (cached and reused by Step 3.3's Version-aware judgment for every Finding): run `current_version=$(jq -r '(.plugins[] | select(.name == "dev-workflow") | .version) // "unknown"' .claude-plugin/marketplace.json 2>/dev/null)`, then `[ -z "$current_version" ] && current_version=unknown`. The `// "unknown"` jq alternative handles missing entry (empty stream) and entry-without-version (`null`); the post-pipeline `-z` guard handles `jq` itself failing (missing/malformed `marketplace.json`). Hoisting this out of the per-issue / per-Finding hot path keeps the routine N×M `jq` invocations from accumulating on issue sets that touch every Finding through the stale-issue branch
- Read `CHANGELOG.md` once and cache its contents for Step 3.3's Reject #7 leg (i) lookup. The same content serves every Finding that enters the stale-issue branch, so re-reading per Finding is wasted work


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

Otherwise, for each issue (in source order from Step 2's listing): the per-issue `TodoWrite` row registered in Step 2 is flipped to `in_progress` in the same tool-call burst as the next concrete action (typically the body parse or the first `Read`); the row is flipped to `completed` at the end of `§ Close decision`. Two completion paths exist:

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
- Any Finding's `Target skill` is outside the 4-skill bundle (`dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`)
- Any Finding's `Category` is outside the 5-value set (`ambiguity`, `missing-branch`, `wrong-default`, `rules-conflict`, `other`) — mirrors the producer's own validation in `self-retrospective.md`
- Any of the 4 required fields is missing in any Finding

#### 3.3 Judge each Finding

For each Finding, read `skills/<target>/SKILL.md` first; additionally read `skills/<target>/references/<file>.md` on demand when the Description or Suggested fix direction clearly points at content outside SKILL.md (e.g. names the file, names a heading/section that belongs to a reference, or describes behavior documented in a reference). Apply `references/triage-criteria.md` to decide `accept` vs `reject`. Store decision + reasoning in memory. Do **not** edit yet.

**Version-aware judgment** (apply alongside the standard checklist; sources `references/triage-criteria.md` § Reject #7):

Compare the `producer_version` captured in `§ 3.2 Parse body` against the `current_version` resolved once at Step 1 Pre-flight (cached for the whole run). SemVer comparison parses `\d+\.\d+\.\d+` into an integer 3-tuple and compares lexicographically; the literal `unknown` is treated as "older than everything" so the stale-issue branch engages whenever either side cannot be parsed.

- `producer_version == current_version`: standard checklist only — no extra step
- `producer_version < current_version`, OR `producer_version == "unknown"`, OR `current_version == "unknown"`: apply `Reject #7` (stale-issue path) **alongside** the standard checklist. Both legs (i)+(ii) must hold to reject:
  - **(i)** Locate version subsections in the `CHANGELOG.md` content cached at Step 1 Pre-flight, in the half-open range `(producer_version, current_version]` — **producer-exclusive, current-inclusive** (a fix that landed in `current_version` itself counts as "addressed" for this Finding; the producer side is excluded because the producer was already at that version when it emitted the issue, so any fix in `producer_version` cannot post-date the issue). When either side is `unknown`, scan all entries instead. At least one fix entry in that range must name this Finding's `<target-skill>` in its subject (e.g. `- fix(dev-workflow): ...` for a `<target-skill> = dev-workflow` Finding)
  - **(ii)** `Read` the current `skills/<target>/SKILL.md` (and the `references/*.md` files cited by the Finding's Description) and verify the described concern is **no longer reproducible** in the current file state. Cite the specific passage that demonstrates non-reproducibility in one line (e.g. `SKILL.md § 3.6 Close decision now lists explicit reminder #1 / #2 — Finding's "missing per-issue close reminder" no longer reproduces`)
  - **Either-leg doubt → fall through to the standard checklist.** Reject #7 requires affirmative judgment on **both** (i) and (ii); on doubt about either leg, do not reject under #7 — let the standard checklist run, which may still accept the Finding or reject it under another criterion. This asymmetric default protects against false-rejecting Findings that target subtly different problems in the same skill region
  - When both legs hold, set the Finding's reject `reason` to `Already addressed (producer_version <X.Y.Z> < current_version <Y.Z.W>; CHANGELOG entry: <token>; SKILL.md cite: <quoted passage>)`. The reason string is stored on the per-Finding reasoning record and surfaced via the existing Step 3.5 Post triage comment template — no new field is introduced
- `producer_version > current_version` (the local `marketplace.json` is older than the producer that emitted the issue — unusual, suggests this routine is running on a stale clone): standard checklist only, but append `(note: producer_version newer than local current_version — local marketplace.json may be stale)` to whichever reason string the standard checklist produces, so the per-Finding execution log surfaces the inversion

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

Process accepted Findings one at a time in the order they appear. Same-file Findings work sequentially — each re-reads the target file so its Edit matches the current working-tree state (post-previous-commit on `accept`, uncommitted residue on `conflict` — see (D)'s `callee-abort` branch in Aggregate JSON parse and record-write).

Each accepted Finding runs sub-steps (a)(b)(c) once, then sub-step (D) — a **single `Agent` dispatch** that runs the per-Finding review chain (verify-diff → skill-review → publicity-review) wrapped in an **outer review loop (max 3 iterations) inside the dispatched subagent** — and (E) error handling for the (D) dispatch itself. After (D) (and possibly (E)) terminate, sub-steps (f)(g) run once. The orchestrator main thread sees only **one Skill-return-style decision point per Finding** (the (D) aggregate JSON return). Each callee keeps its own internal iteration loop unchanged. The per-callee consecutive-error counters described in (D) below operate **per-Finding (terminal-iter verdict)**: counter increment / reset and the `*_disabled` check both happen at Finding boundaries based on the subagent-emitted terminal-iter status.

**Register per-Finding TodoWrite items** — at sub-step (a) entry for each accepted Finding (i.e. immediately before the `(a) Re-read target file` Read), create a **single item**: `(D) Per-Finding review chain dispatch`. Mark `in_progress` immediately before the `Agent` dispatch in (D), `completed` after the dispatch returns (whether the aggregate JSON parses successfully or routes through (E) error handling). Steps (a)–(c), (E), (f), (g) are deliberately not pre-registered — only the (D) row is, because that is the single point where the per-Finding flow tends to exit early on the first "good enough" outcome when unmarked. Disabled-callee state (`verify_diff_disabled` / `skill_review_disabled` / `publicity_review_disabled` / `D_dispatch_disabled`) is communicated via warning strings recorded in the per-Finding record and surfaced in Step 4, not via TodoWrite.

**Per-Finding record kept in memory for the Step 4 execution log** — alongside the existing decision + reasoning store from § Judge each Finding, also keep a small structured record per processed Finding so Step 4's Per-Finding execution log can render it. **TodoWrite is the progress UI, not a record source — it cannot be read back at runtime, so anything Step 4 needs has to be held in memory here.** **All fields are initialized to defaults on entry to (a)** so any sub-step that aborts early (e.g. (b)-Edit failure → `conflict` before (d) runs) leaves explicit defaults rather than undefined values. Defaults and update points:

- `disposition`: default `accept`. Downgrade paths in (b)/(c)/(D)/(E)/(f)/(g) overwrite it to `conflict`. Final values: `accept` / `reject` / `conflict` / `parse-error`.
- `target`: default `—`. Set to the edit target path on (b) success.
- `verify_diff`: default `—`. Set to terminal-iter status token from (D)'s aggregate JSON `verify_diff.status` — `converged` / `unresolved` / `skipped` / `conflict` / `disabled` / `error` / `—` (last when subagent did not dispatch verify-diff in a callee-abort path; `error` is the orchestrator-side value set on (E) routing).
- `iterations_used`: default `—`. Set to integer from (D)'s `aggregate.verify_diff.iterations_used` (or `0` when `verify_diff_disabled=true` was passed to the subagent and the callee was skipped).
- `skill_review`: default `—`. Set to terminal-iter token from (D)'s `aggregate.skill_review.status` — `no-actionable-findings`, `applied-edits`, `notes-left`, `error`, `disabled`, or `—` (last when subagent did not dispatch skill-review in a callee-abort path). The enum legacy-includes `skipped` but it is dead code under the new design — see § Apply accepted Findings's "Token notes" paragraph for details. The orchestrator parses skill-review's `iterations_used` field (for JSON schema validation in (E)) but does **not** retain it — `iterations_used` is exposed only via the callee's JSON verdict and is not surfaced in `record.skill_review` or in Step 4 per-Finding render.
- `publicity_review`: default `—`. Set to terminal-iter token from (D)'s `aggregate.publicity_review.status` — `converged-iter-<k>` / `unresolved-<count>` / `conflict (<reason>)` / `skipped (<reason>)` / `disabled` / `error` / `—`. The `disabled` and `—` tokens are synthetic values the subagent writes (the callee skill itself never emits them); `error` is the orchestrator-side value set on (E) routing.
- `publicity_iterations_used`: default `—`. Set to integer from (D)'s `aggregate.publicity_review.iterations_used` (or `0` when `publicity_review_disabled=true` and the callee was skipped).
- `outer_iter`: default `0`. Set to (D)'s `aggregate.outer_iter` (1–3) on (D) success or (D) callee-abort. Stays `0` when (D) never ran (e.g. (b) / (c) downgraded to `conflict` first, or disposition is `reject` / `parse-error`) or when (D) routed through (E) (verdict parse failure / schema violation / tool error — see (E) for details).
- `outer_exit`: default `—`. Set to (D)'s `aggregate.outer_exit` (`no-edits` / `callee-abort` / `max-iter`) on (D) success or callee-abort. Stays `—` when (D) never ran or routed through (E).
- `commit`: default `—`. Set to the commit hash on (g) zero-exit.

For each accepted Finding (the per-Finding memory record described above is updated **at the end of each sub-step that produces its corresponding field** — record-write points are called out inline below):

- **(a) Re-read target file** — `skills/<target>/<file>`. For the first Finding this is HEAD state; for later same-file Findings it's the prior commit's result. Build `old_string` / `new_string` against this state
- **(b) Apply Edit** — on failure (typically `old_string` not found because a prior Finding rewrote that region), downgrade to `conflict` and continue. **Record-write**: set `record.target = skills/<target>/<file>` on success; leave as `—` and set `record.disposition = conflict` on failure.
- **(c) Frontmatter integrity check** — re-read the edited file; the `---` YAML block must still parse. If not: downgrade to `conflict`, run `git checkout HEAD -- <target-file>` to revert (nothing is staged yet), continue
- **(D) Per-Finding review subagent dispatch** — dispatch a single `Agent` with `subagent_type: triage-per-finding-reviewer` to run the per-Finding review chain (verify-diff → skill-review → publicity-review wrapped in an outer review loop, max 3 iterations). The agent emits a single fenced aggregate JSON verdict at the end, which the orchestrator parses to update the per-Finding record.

  The agent's static prompt — ROLE / FLOW / STOP HOOK NOTE / AGGREGATE JSON SCHEMA — lives in `.claude/agents/triage-per-finding-reviewer.md`. The orchestrator's job at (D) is to provide per-Finding inputs in the dispatch prompt; everything else (the iteration loop, the callee-abort rules, the schema) is encapsulated in the agent definition. `triage-per-finding-reviewer` is a project-local agent (not registered in `.claude-plugin/marketplace.json`); its `subagent_type` resolves directly via the agent file's `name` frontmatter.

  **Dispatch prompt — per-Finding inputs only**. Pass the eight values below as the `Agent` tool's `prompt` parameter. The agent file's `## Inputs` section enumerates these values and defines the malformed-input fallback:

  ```text
  finding_id: <issue-N>.<finding-n>
  target_file: skills/<target>/<file>
  description: <verbatim from Finding's Description field>
  suggested_fix_direction: <verbatim from Finding's Suggested fix direction field>
  base_ref: HEAD
  verify_diff_disabled: <true|false>
  skill_review_disabled: <true|false>
  publicity_review_disabled: <true|false>
  ```

  **Prompt boundary rule**: the dispatch prompt must contain **only** the eight key-value lines above — no additional sections (`--- FLOW ---` / `--- INSTRUCTIONS ---` / `--- STEPS ---` blocks etc.), no custom workflow descriptions. The agent definition file (`.claude/agents/triage-per-finding-reviewer.md`) already contains the complete `## Flow`, `## Dispatch discipline`, and `## Aggregate JSON schema` — duplicating or overriding any of these in the dispatch prompt creates a competing instruction set that the subagent may prefer over its own definition.

  **Allowed sets for (E) schema validation** — see `.claude/agents/triage-per-finding-reviewer.md` § Aggregate JSON schema for the canonical enum values and field shapes; (E.2) schema validation references that section directly. Synthetic notes: `"—"` is the agent-emitted value when a callee was not dispatched on a `callee-abort` path; `"disabled"` is what the agent emits when the orchestrator passed `*_disabled = true` for that callee. Top-level `outer_iter` is integer `1..3` (the agent pins it to the current `k` at termination per the FLOW's "On verify-diff status=conflict" and "On publicity-review status ∈ {unresolved,conflict}" callee-abort branches — neither increments `k` before emit); top-level `outer_exit` ∈ `{"no-edits", "callee-abort", "max-iter"}` (the synthetic `"—"` from FLOW init must be replaced before emit; observing `"—"` at the top level is a schema violation).

  **Aggregate JSON parse and record-write** (orchestrator). Both `aggregate.status == "ok"` and `aggregate.status == "callee-abort"` perform the **full record-write set below** by completion. The only differences are the disposition flip on `callee-abort` and what happens after (proceed to (f) vs. revert + skip to next Finding's (a)).

  **Full record-write set (applies to both `ok` and `callee-abort`)**:

  - `record.outer_iter = aggregate.outer_iter`
  - `record.outer_exit = aggregate.outer_exit`
  - `record.verify_diff = aggregate.verify_diff.status` (terminal-iter token; for the aborter callee on a `callee-abort` path this is the concrete abort status, e.g. `"conflict"`; for an untouched callee the subagent-emitted `"—"` is copied verbatim)
  - `record.iterations_used = aggregate.verify_diff.iterations_used` (the aborter's value reflects the iter at abort; untouched callees emit `0` per FLOW)
  - `record.skill_review = aggregate.skill_review.status` (same aborter / untouched semantics)
  - `record.publicity_review = aggregate.publicity_review.status` (same; for publicity-review aborter the concrete status is `"unresolved-<count>"` / `"conflict (<reason>)"`)
  - `record.publicity_iterations_used = aggregate.publicity_review.iterations_used`
  - Concatenate each callee's `warnings[]` into the run-level warning aggregate on both `ok` and `callee-abort` paths (Step 4 surfaces them). Render warnings using the same strings as the legacy per-callee bullets — `verify-diff unresolved (<n> gaps)` / `verify-diff skipped (<reason>)` / `skill-review notes left after applied-edits (<count>)` / `skill-review notes left after max iters (<count>)` / `publicity-review unresolved (<count>): <category-breakdown>` / `publicity-review conflict (<reason>)` / `publicity-review skipped (<reason>)` etc.

  **Branch-specific actions**:

  - On `aggregate.status == "ok"`: proceed to (f).
  - On `aggregate.status == "callee-abort"`: set `record.disposition = conflict`. Build the revert path union — `aggregate.verify_diff.reverted_paths` ∪ `aggregate.publicity_review.reverted_paths` ∪ (when `aggregate.publicity_review.status == "unresolved"`: unique `file` values from `aggregate.publicity_review.remaining_findings[]`; publicity-review's return contract emits empty `reverted_paths` in the `unresolved` branch, so the orchestrator owns the revert there). Run `git checkout HEAD -- <each path>` (idempotent — paths already reverted by callee safety rails are no-ops). Skip (f) and (g); proceed to next Finding's (a). The (b) edit on the target file is **not** reverted (only out-of-scope writes listed in `<reverted_paths>` are); it remains uncommitted in the working tree, and the next same-file Finding's (a) Re-read sees the residual state.

  **Counter / disable handling** (terminal-iter verdict semantics, mirrors current behavior):

  After each (D) returns with `aggregate.status == "ok"` or `aggregate.status == "callee-abort"`, increment / reset the per-callee disable counters using each callee's terminal-iter status:

  - `verify_diff`: `{converged, unresolved}` → reset; `{skipped, conflict}` → +1
  - `skill_review`: `{no-actionable-findings, applied-edits, notes-left}` → reset; `error` → +1
  - `publicity_review`: `{converged, unresolved}` → reset; `{skipped, conflict}` → +1

  Statuses that did not reach a callee in this Finding (subagent emits `"—"` for callees skipped in a callee-abort path, or `"disabled"` for callees the orchestrator disabled before this Finding) **do not increment or reset** the corresponding counter — those values are state markers, not health signals.

  When a counter hits 2, set the corresponding `*_disabled = true`. The next Finding's (D) dispatch passes the updated disable booleans as inputs; the subagent skips that callee on every outer iter and writes `status="disabled", applied_edits_count=0, iterations_used=0` to the aggregate. The first Finding *after* a disable was triggered carries warning `<callee> disabled after consecutive errors`; the triggering Finding itself only carries its own disposition.

  **Terminal-iter flattening** — the subagent emits **only the terminal-iter verdict** per callee. Mid-iter status (e.g. iter 1 returns skill-review `error`, iter 2 returns `applied-edits`) is silently flattened to the terminal value (`applied-edits` here) and never reaches the orchestrator. The counter sees only the last completed iter, applying the "skill ultimately functioned for the Finding" rule.

  **Token notes**: `record.skill_review` enum still includes the legacy `skipped` token, but it is dead code under the new design — when verify-diff returns `conflict` at iter k step 2, the subagent terminates the entire chain and skill-review / publicity-review are not dispatched in that or any subsequent iter; the subagent emits `skill_review.status = "—"` in that case, so `record.skill_review = "—"`, never `"skipped"`. The two `skill-review notes left ...` warning strings are kept distinct so Step 4's aggregate counter can break them down by case (`applied-edits` with residual notes vs `notes-left` callee-internal max-iter exhaustion).

  **Scope guard on `applied-edits` terminal verdict**: when `aggregate.skill_review.status == "applied-edits"`, the orchestrator additionally re-runs the (c) frontmatter check against the working tree AND verifies `git diff --name-only` lists only paths under `skills/` (the same scope check (f) runs, applied here as a second-line defense even though skill-review's internal loop runs the same check per iteration). On scope leak, treat as (f)'s failure case immediately (downgrade Finding to `conflict`, run `git checkout HEAD -- <leaked-paths>`, skip remaining sub-steps).

  **Return-point no-stall reminder**: when `(D)`'s aggregate JSON returns (regardless of `aggregate.status` — `ok`, `callee-abort`, any non-error result), this is mid-Finding workflow AND mid-issue workflow, never a terminal point. Parse the JSON and immediately take the next action — either `(f)` Scope check + stage on `ok`, or revert path computation + "next Finding's `(a)`" on `callee-abort` (with no `(f)` / `(g)`). Both must be issued in the **next tool call**, never after an interstitial summary or "let me decide" turn. See `§ No-Stall Principle`.

- **(E) Per-Finding subagent error handling** — triggered when (D)'s dispatch fails to produce a valid aggregate JSON.

  **Shared record updates** (apply on any of E.1 / E.2 / E.3 and on the `D_dispatch_disabled` skip path). Specified by completion — every per-Finding record field gets an explicit value, mirroring (D)'s by-completion record-write convention so no field silently leaks through:

  - `record.disposition = conflict`
  - `record.target`: preserved as set by (b) (or default `—` if (b) did not run) — informational, indicates which file (b) wrote to
  - `record.verify_diff = "error"`
  - `record.iterations_used = 0`
  - `record.skill_review = "error"`
  - `record.publicity_review = "error"`
  - `record.publicity_iterations_used = 0`
  - `record.outer_iter = 0`
  - `record.outer_exit = "—"`
  - `record.commit = "—"` (preserved at default — (g) is skipped)

  Then skip (f)/(g) and increment `D_dispatch_error_count` by 1 — but only on E.1 / E.2 / E.3, not on the `D_dispatch_disabled` skip path (the count already reached threshold there).

  **Per-callee disable counters (`verify_diff` / `skill_review` / `publicity_review`) are NOT incremented or reset on the (E) path** — only `D_dispatch_error_count` advances. (E) signals dispatch-layer health, separate from per-callee health, and applying the per-callee `error → +1` rule on (E) would conflate the two layers.

  Classify the (E) failure using first-match-wins evaluation in the order below (same discipline as `verify-diff` § (b) Parse & apply):

  1. **(E.1) Verdict parse failure** — no fenced JSON block in the dispatch result, or JSON parse itself fails. Record warning `agent dispatch: verdict parse failure`. Apply shared record updates.
  2. **(E.2) Schema violation** — JSON parses but does not match the aggregate JSON schema in `.claude/agents/triage-per-finding-reviewer.md` § Aggregate JSON schema (top-level keys missing, status outside the schema enum, per-entry shape broken e.g. missing `applied_edits_count`, non-integer `iterations_used`, or `remaining_findings[]` entries that are not objects with non-empty string `file` when `publicity_review.status == "unresolved"` — the latter is required because the `callee-abort` branch dereferences `<entry>.file` to compute the revert-path union, so a malformed entry would crash the orchestrator after parse). Record warning `agent dispatch: verdict schema violation` (distinct from E.1 so postmortem can tell the two apart). Apply shared record updates.
  3. **(E.3) Tool error** — Agent dispatch itself fails with a tool-side error (timeout, capacity exceeded, permission denied) and no aggregate JSON ever reaches the orchestrator. Record warning `agent dispatch: tool error (<reason>)`. Apply shared record updates.
  4. **callee-abort (status="callee-abort")** is *not* (E). The aggregate JSON parsed successfully and per-callee verdicts are present; route through the `callee-abort` branch in (D) above. `D_dispatch_error_count` does **not** increment (the dispatch succeeded as a contract); per-callee disable counters increment via the standard path.

  **`D_dispatch_disabled` mechanism** (per-run state, dispatch-layer health observable separately from per-callee disables):

  - When `D_dispatch_error_count` reaches 2, set `D_dispatch_disabled = true`. For the remainder of the run, skip the (D) dispatch entirely on each subsequent Finding; apply the **shared record updates** above (without re-incrementing `D_dispatch_error_count`) and record warning `(D) dispatch disabled after consecutive errors`. Continue to the next Finding.
  - Without this mechanism, transient infrastructure issues (Anthropic-side capacity, network) would silently fail every (D) parse without ever incrementing per-callee counters — the run would conflict-out every Finding without any disable signal.
  - **Reset rule**: `D_dispatch_error_count` resets on a successful (D) dispatch (`aggregate.status ∈ {"ok", "callee-abort"}` with parseable schema-valid JSON). `D_dispatch_disabled` itself stays `true` for the rest of the run once set (sticky to Step 4; no recovery within a run).
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

On non-zero exit (typical case: a pre-commit hook rejection), recover with `git reset` + `git checkout HEAD -- .claude-plugin/marketplace.json CHANGELOG.md`, record `release-bookkeeping=failed (commit error)`, and proceed to Step 4 without incrementing `triage_commit_count`.

On zero exit, capture `git rev-parse HEAD` as the bookkeeping commit hash for the Step 4 summary line `release-bookkeeping=<hash>`, and increment `triage_commit_count` by 1.

After this step terminates (any branch), apply the following boundary reminder before proceeding to Step 4:

> **Return-point no-stall reminder**: Step 3.7 termination (regardless of outcome — a successful commit hash, `skipped (no commits)`, `failed (version skew | json invalid | changelog edit error | scope leak | commit error)`, any non-error result) is not a terminal point. Mark `Step 3.7: Release bookkeeping` row `completed` and `Step 4: Emit summary` row `in_progress` in the **next tool call** (a single `TodoWrite` carrying both flips), then proceed directly to summary emission. See `§ No-Stall Principle`.

### Step 4 — Emit summary

Print to stdout in Japanese (see `§ Output language`). This is the only trace a routine leaves. The summary has two sections — first the **Per-Finding execution log**, then the aggregate counters.

Entry state: the `Step 4: Emit summary` row is already `in_progress` (flipped either by the Step 3.7 → Step 4 boundary reminder, or by the 0-open-issues path in Step 2). The final `completed` flip and the summary stdout output **must occur in the same tool-call burst**. See `§ No-Stall Principle` § Phase / per-issue TodoWrite transitions.

**Per-Finding execution log** — one block per processed Finding in source order. Fields source from the per-Finding memory record in § Apply accepted Findings (terminal-iter rendering follows § Apply accepted Findings (D) Terminal-iter flattening paragraph). When the run produced zero Finding records (e.g. the 0-open-issues path, or a run where every issue ended in whole-issue parse-error with no Findings parsed), still render the `Per-Finding execution log` heading and emit a single placeholder line `(none — 0 Findings logged)` under it before the aggregate summary. **Each field renders its written value, or `—` if the record-write point was never reached** — this rule applies uniformly across all dispositions (`accept` / `reject` / `conflict` / `parse-error`), driven by which sub-steps actually ran for that Finding, not by the disposition itself. **Reject reasons (including the Reject #7 stale-issue 4-element cite format `Already addressed (producer_version <X.Y.Z> < current_version <Y.Z.W>; CHANGELOG entry: <token>; SKILL.md cite: <quoted passage>)`) are surfaced via the Step 3.5 Post triage comment template — the GitHub issue comment is the canonical record. They are intentionally NOT rendered in this per-Finding execution log block to keep the log scannable; render only the listed fields below.** The `verify-diff` and `publicity` lines each carry an `[iter ...]` clause that follows these cases (the orchestrator passes `Max iterations = 2` to publicity-review via the (D) subagent prompt template's FLOW publicity-review dispatch branch, so the publicity denominator renders as `/2`; verify-diff renders as `/3` per its own default):

- `verify_diff` ∈ {`converged`, `unresolved`, `skipped`, `conflict`} (verify-diff was dispatched in (D)): render `<token> [iter <iterations_used>/3]`
- `verify_diff` = `disabled` (verify-diff was skipped in (D) because `verify_diff_disabled=true`): render `disabled [iter —]`
- `verify_diff` = `error` ((D) routed through (E) — verdict parse failure / schema violation / tool error / `D_dispatch_disabled` skip): render `error [iter —]`
- `verify_diff` = `—` (verify-diff was not dispatched for this Finding — e.g. (b)/(c) downgraded to `conflict` first, or the disposition is `parse-error`/`reject`. There is no `callee-abort`-before-verify-diff path: per the FLOW, verify-diff runs first and a `callee-abort` triggered by it sets `record.verify_diff = "conflict"`, not `—`): render just `—` with no `[iter ...]` clause
- `publicity_review` ∈ {`converged-iter-<k>`, `unresolved-<count>`, `conflict (<reason>)`, `skipped (<reason>)`} (publicity-review was dispatched in (D)): render `<token> [iter <iterations_used>/2]`
- `publicity_review` = `disabled` (publicity-review was skipped in (D) because `publicity_review_disabled=true`): render `disabled [iter —]`
- `publicity_review` = `error` ((D) routed through (E)): render `error [iter —]`
- `publicity_review` = `—` (publicity-review was not dispatched — e.g. (b)/(c) downgraded first, the disposition is `parse-error`/`reject`, or the (D) subagent terminated via `callee-abort` at verify-diff): render just `—` with no `[iter ...]` clause
- `outer_iter` ∈ 1..3 (the (D) outer loop ran at least one iter): render `<k>/3 (<no-edits|callee-abort|max-iter>)` using `record.outer_exit`
- `outer_iter` = 0 (the (D) outer loop never ran — see `record.outer_iter` default in § Apply accepted Findings's "Per-Finding record kept in memory" paragraph): render just `—` with no exit reason

```text
issue #<N> Finding <n>: <accept|reject|conflict|parse-error>
  target:        skills/<target>/<file> | —
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
- publicity-review state: `enabled` or `disabled-after-errors`; count of Findings with `publicity-review unresolved (<n>)` broken down by top category (e.g. `secret×N, user-specific-path×N, ...`); count of Findings with `publicity-review conflict (<reason>)` broken down by reason; count of Findings with `publicity-review skipped (<reason>)` broken down by reason (`empty diff` / `diff too large` / `verdict parse failure` / `verdict schema violation` / `divergent findings` / `dispatch error`). Source of truth: the warning strings concatenated from `aggregate.publicity_review.warnings[]` by (D)'s parse-and-record-write block, not the per-Finding `record.publicity_review` token (which stores a count only). Same pattern as the verify-diff and skill-review aggregate lines above.
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
- `stop-hook-detected: ~/.claude/stop-hook-git-check.sh (Web env standard hook) — spurious fires during multi-subagent dispatch flow are recorded and ignored per § Stop hook structural conflict` if the Step 1 pre-flight detection set `stop_hook_present=true`. Omit the line entirely when the flag is unset (Local environment / hook absent)

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
