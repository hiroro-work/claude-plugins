---
name: triage-review
description: Daily review of the latest origin triage-* branch. Operator-prepared invariant — the operator fetches origin and switches the local repository to the triage branch before invocation. The skill verifies that the current branch matches `triage-*`, then dispatches `Skill(prompt-tuning)` per prompt-eligible changed file, `Skill(skill-review)` with `Base ref: main`, `Skill(publicity-review)` with `Base ref: main`, and `Skill(rules-review)` with `--base-commit main` (rules-compliance detection layer) in sequence, finally emits a summary. Project-local routine — not for marketplace distribution.
allowed-tools: TaskCreate, TaskUpdate, TodoWrite, Skill(prompt-tuning), Skill(skill-review), Skill(publicity-review), Skill(rules-review), Bash(git rev-parse *), Bash(git symbolic-ref *), Bash(git status --porcelain*), Bash(git diff *), Bash(git show *), Bash(git stash *), Bash(jq *)
---

# Triage Review

Daily local review of the latest `dev-workflow-triage` output branch. After `dev-workflow-triage` (running on Claude Code on the Web) pushes a `triage-YYYYMMDD-HHMMSS` branch to origin, the operator manually fetches origin and switches the local repository to that branch (e.g. `git fetch origin --prune && git switch triage-YYYYMMDD-HHMMSS`) before invoking this skill. The skill then dispatches four review skills against `main..HEAD` — `Skill(prompt-tuning)` per prompt-eligible changed file, `Skill(skill-review)`, `Skill(publicity-review)`, and `Skill(rules-review)` (rules-compliance detection layer). Non-destructive aside from a transient auto-stash that is restored before the skill exits — or, if the pop conflicts, preserved in `git stash list` and reported (no `git reset`, no network operation, no branch switching) — keeps HEAD at the triage tip and passes review framing to each callee. When the working tree has uncommitted tracked changes, the skill stashes them for the duration of the review and restores them just before emitting the summary (see § Auto-stash restore), so the callees' diff scope stays at `main..HEAD`.

## No-Stall Principle

The generic regimen (sub-skill return discipline, Step-boundary non-stalling, phase / per-issue status transitions, intentional reinforcement-by-repetition for inline reminders, fatal tool-level errors out of scope) is defined in `.claude/skills/dev-workflow-triage/SKILL.md` § No-Stall Principle and applies here without modification. The skill-specific deltas below override or extend that canonical regimen.

**Zero designed user-gate points.** This routine has **no** user-judgment gates between Step 1 Pre-flight and Step 6 summary emission. Every sub-skill return — per-file `Skill(prompt-tuning)`, `Skill(skill-review)`, `Skill(publicity-review)` — is a return value to parse-and-proceed-past, never a checkpoint to confirm with the user. The only user-facing output is the Step 6 summary at the end. Specifically forbidden between any two sub-skill dispatches and between the final sub-skill return and Step 6 summary emission: user-facing pause phrases (`なにか判断が必要ですか？` / `判断を求めていますか？` / `X ファイル目完了。続けますか？` / `次は <step> です` framing without immediately issuing the next tool call / English equivalents such as `shall I proceed?` / `does this need your judgment?`), prose that ends a response without a subsequent tool call when more dispatches remain, and any framing that surfaces a sub-skill's return as a deliverable mid-loop. If you find yourself drafting such prose, that is precisely the anti-pattern this routine forbids — emit the next tool call in the same response instead. See § No-Stall Principle in `.claude/skills/dev-workflow-triage/SKILL.md` for the canonical Stall mitigation pattern (callee-side fenced JSON + orchestrator-side pre/return-point reminders).

**Permissible fatal-abort exits** (emit the Step 6 summary in `pre-flight aborted` form and stop):

- Step 1 Pre-flight failures: `detached HEAD`, `current branch is not a triage-* branch`, `failed to stash uncommitted changes` (uncommitted tracked changes are auto-stashed rather than aborted — see § Step 1 check 3; the abort fires only when the stash itself fails. Untracked files are intentionally ignored)

0-result paths (no changes between main and HEAD) are **not** aborts — they emit a dedicated summary form (form 2) and exit cleanly.

**Recognized sub-skill return points** — each carries an inline **Pre-invocation reminder** before the dispatch and an inline **Return-point no-stall reminder** after the dispatch (per the canonical reinforcement-by-repetition rule):

- Step 3 (b) per-file `Skill(prompt-tuning)` boundary
- Step 4 `Skill(skill-review)` boundary
- Step 5 `Skill(publicity-review)` boundary
- § Run `Skill(rules-review)` (rules-compliance detection layer) boundary

**Skill(prompt-tuning) return shape.** `Skill(skill-review)` and `Skill(publicity-review)` terminate with a single fenced JSON verdict — branch on it directly. `Skill(prompt-tuning)` returns a verbose markdown response (Mode declaration / iter-0 verdict / iteration block / Alt 3 static-review findings / scenario design) followed by a structured return value at the end — either a fenced Skip return contract `{"status": "skipped", ...}` (Alt 3 / Alt 2 paths and when the host blocks recursive `Agent` dispatch) or, in empirical mode, an `Iteration N` table with a `Convergence check` line. The structured return value (fenced JSON or iteration table) is what § Step 3 (c) parses for the per-file classification token. **The preceding markdown prose is the subagent's internal reasoning and is not a deliverable** — do not re-render, summarize, or surface it to the user mid-loop. The orchestrator's response between two per-file dispatches should contain only (i) the per-file classification log line and (ii) the next tool call (the next file's `Skill(prompt-tuning)` dispatch, or `Skill(skill-review)` if the last file).

**Non-fatal error classes** (record and continue, never halt):

- Per-file `prompt-tuning`: `unparsed`, `error`, `skipped (agent unavailable)` — proceed to next file
- `skill-review` / `publicity-review`: verdict parse failure, schema violation, dispatch error — record warning under summary form 3, proceed to next step
- `skill-review` `framing-failed (suspected)` at Step 4 (iter=0 on non-empty main..HEAD) — record warning under form 3, proceed
- `rules-review`: verdict parse failure, schema violation, `skipped (unavailable)` (skill unresolvable in this environment) — record warning under summary form 3, proceed to § Step 6 summary

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

- Enum values: `converged`, `max-iter`, `skipped`, `unparsed`, `error`, `no-actionable-findings`, `applied-edits`, `notes-left`, `framing-failed`, `ok`, `restored`, `not needed (clean tree)`, `restore failed`, `VIOLATION`, `no-issues`, `violations`, `unavailable`, and the rules-review `<reason>` tokens `diff collection failed` / `rule loading failed` / `verdict parse failure` / `coverage gap only` (rules-review's own closed enum) plus the orchestrator-synthesized `verdict schema violation`
- Field labels: `status:`, `iterations_used:`, `applied:`, `notes_remaining:`, `findings:`, `remaining:`, `framing:`, `auto-stash:`, `release-integrity:`, `rules-review:`

## Step 1 — Pre-flight

Run the environment checks below in order; fatal abort on the first failure. The operator is responsible for `git fetch origin` and `git switch <triage-branch>` before invocation — this skill performs no network operation and no branch switching.

Initialize `auto_stashed = false` and `orphan_stash_detected = false` at Step 1 entry (before check 1). The first makes the restore guard in § Auto-stash restore well-defined on every exit path, including form-1 aborts from checks 1–2 that run before the stash; the second is set by check 3's orphan scan and read by the Step 6 summary.

**Pre-flight environment checks**:

1. `git symbolic-ref -q HEAD >/dev/null` — non-zero exit means detached HEAD → abort with reason `detached HEAD: switch to the triage-* branch before invocation`
2. `triage_branch_short = git rev-parse --abbrev-ref HEAD` — capture the current branch name. Verify it matches the `triage-*` glob (shell: `case "$triage_branch_short" in triage-*) ;; *) abort ;; esac`). If it does not → abort with reason `current branch is not a triage-* branch: <triage_branch_short> — fetch origin and switch to the latest triage-* branch before invocation`
3. `git status --porcelain --untracked-files=no` — non-empty output indicates uncommitted modifications to tracked files. **Do not abort**: auto-stash them so the working tree matches HEAD for the duration of the review. (Rationale: the callees `skill-review` (`Base ref: main`) and `publicity-review` scope their diff with `git diff <Base ref>` = base-vs-**working-tree**, so uncommitted tracked changes would otherwise leak into their review scope beyond the intended `main..HEAD` stack. Stashing reduces this dirty-tree case to the already-supported clean-tree case, where `git diff main` == `git diff main HEAD` == `main..HEAD`.)

   First, read `git stash list` once — its output feeds both the orphan scan and, if the tree is dirty, the stash-depth baseline.

   **Orphan scan (runs regardless of whether the tree is dirty)**: if any existing entry's message contains `triage-review auto-stash`, it is an orphan from a prior run that terminated abnormally between stashing and restoring (see § Auto-stash restore's "Crash window" paragraph). Set `orphan_stash_detected = true` and surface it as a Step 6 warning line; do **not** auto-recover it — the operator resolves it manually. This is the re-run safety net for the only silent-data-loss window the auto-stash introduces.

   Then branch on the `git status` output:
   - **Non-empty (dirty tree)** — stash procedure:
     - `stash_depth_before` = the line count of the `git stash list` output just read (count the lines directly — do not pipe to `wc`, which is not granted)
     - Run `git stash push -m "triage-review auto-stash <triage_branch_short>"`. If it exits non-zero, retry once after a 1–2 second sleep
     - Verify a stash entry was created: run `git stash list` again and confirm the line count is exactly `stash_depth_before + 1`. If the push still exited non-zero after the retry **or** the depth did not increase by exactly 1, the stash did not take → fatal abort with reason `failed to stash uncommitted changes: <reason>` (`<reason>` = the last non-empty stderr line truncated to ≤ 80 chars, or `(no stderr)`). Leave the working tree untouched; `auto_stashed` stays `false`. (Depth-delta, not a non-empty check: a prior unrelated stash may already exist, so "stash list is non-empty" cannot confirm this push took. Assumes single-operator local execution.)
     - On success, set `auto_stashed = true` and hold it as run-level state in main-thread context. (The push goes on top of the stack, so a later `git stash pop` restores this run's stash, not any deeper orphan.)
   - **Empty (clean tree)** — `auto_stashed` stays `false` (the pre-existing clean-tree path).

   `--untracked-files=no` deliberately excludes untracked files: only tracked changes are stashed, and untracked files are never stashed and never block invocation (leftover staging artifacts such as `.claude/plans/*.md` from prior sessions, or files matching gitignore patterns that were never staged) — they do not appear in `git diff <Base ref>`, so their presence never affects the callees' diff inputs.

## Auto-stash restore

Run-level operation that restores any changes auto-stashed by § Step 1 check 3. **Invariant: every exit path after a successful auto-stash must pass through this operation before the summary is emitted.** Today there are exactly two such exit paths — Step 2 form 2 (empty `changed_files`) and Step 6 form 3 (normal completion). If a future change adds any fatal-abort path between check 3 and Step 6, it must wire this restore too.

- If `auto_stashed == false`: no-op (clean-tree path, or a form-1 abort from checks 1–2 that ran before the stash).
- If `auto_stashed == true`: run `git stash pop`. On zero exit, record `auto-stash: restored`. On non-zero exit (e.g. a merge conflict), retry once after a 1–2 second sleep. If it still fails, **do not auto-recover** (no `git reset`, no `git checkout`, no force) — record a restore-failed warning per § Step 6 and leave the conflict for the operator. The stashed changes remain safe in `git stash list` (look for the `triage-review auto-stash` message in the entry list).

Run this **immediately before** the summary is rendered so its outcome can be included as a summary line.

**Crash window**: if the run terminates abnormally (a fatal tool-level error, session death) between the successful stash in § Step 1 check 3 and this restore, the stash is left in `git stash list` with the `triage-review auto-stash` message while the working tree looks clean — the only silent-data-loss window the auto-stash introduces. It is not lost: the next run's § Step 1 check 3 orphan scan detects the leftover entry and surfaces it as a Step 6 warning. Recover it manually (`git stash pop`, or `git stash apply` if you want to keep the entry) once the tree is in a known state.

**Callee scope rails do not collide with the stash.** `skill-review` and `publicity-review` each carry a `git checkout HEAD -- <path>` scope rail. Because the pop runs only after every callee has finished (just before the summary), the working tree equals HEAD throughout callee execution and the rails operate on already-clean files — there is no window in which a rail and live stashed content coexist. No defensive coupling between the rails and the stash is needed.

## Step 2 — Capture changed files

```
git diff --name-only main HEAD
```

Hold the output as `changed_files` in main-thread context.

- Empty `changed_files` → run § Auto-stash restore (it is a no-op when `auto_stashed == false`), then emit § Step 6 summary form 2 (`no changes between main and HEAD on <triage_branch_short>`) and exit. Subsequent steps are skipped. (No callee ran on this path, so the pop is a clean restore — see the form-2 note in § Form 3 content for why it cannot conflict.)
- Non-empty → filter to prompt-eligible files. **Filter rules** (basename / path-segment equality, not substring match):
  - basename equals `SKILL.md`, OR
  - basename equals `CLAUDE.md`, OR
  - any path segment exactly equals `references` AND the basename ends in `.md`
  - Hold the filtered list as `prompt_targets`
  - If `len(prompt_targets) > 5`, keep the first 5 entries and record `prompt_targets_overflow_count = len(prompt_targets) - 5`. Otherwise `prompt_targets_overflow_count = 0`

Deleted files (those listed in `changed_files` but absent from working tree) require no special handling at this layer — the downstream callees see them through their own `git diff` invocations with appropriate base.

On the non-empty path, proceed next to § Release-integrity check (deterministic bump-presence), then § Step 3.

## Release-integrity check (deterministic bump-presence)

Runs after § Step 2 — Capture changed files (non-empty `changed_files` path only) and before § Step 3. Read-only git/jq check — no subagent dispatch, so no `§ No-Stall Principle` return-point reminder; proceed to § Step 3 when done. Computes `release_integrity_result`, rendered by § Step 6 (see § Form 3 content).

**Scope — backstop, not a full validator.** It checks **bump-presence** (the marketplace version-number delta across the diff endpoints) **and whether `CHANGELOG.md` was touched**. It does **not** validate CHANGELOG subsection format (e.g. the paired `### <skill> v… / dev-workflow-bundle v…` invariant) — a diff that bumps versions but omits the CHANGELOG subsection is out of scope.

A version read uses the canonical `// "unknown"` + post-pipeline `-z` guard (same two-stage pattern as Step 1's `current_version`): `v=$(git show <ref>:.claude-plugin/marketplace.json | jq -r '(.plugins[] | select(.name == "<plugin>") | .version) // "unknown"' 2>/dev/null); [ -z "$v" ] && v=unknown`. A read of `unknown` means the version could not be determined — a git/jq error, or an absent `marketplace.json` entry. A value is **bumped** only when **both** its `main:` and `HEAD:` reads are concrete (≠ `unknown`) **and** they differ; if either read is `unknown` the value is **not bumped** (it routes to the conservative `could not verify` violation in step 5 rather than silently passing). **Net-of-stack**: `main..HEAD` may be a cumulative stack of `triage-*` branches (§ Fixed configuration), so this compares the two endpoints' net state ("was it bumped at all"), not per-commit.

**Procedure**:

1. **Load the authoritative bundle membership** from `marketplace.json`'s `dev-workflow-bundle.skills` array — `jq -r '(.plugins[] | select(.name == "dev-workflow-bundle") | .skills[]) // empty' .claude-plugin/marketplace.json` (same source as `verify-bundle-sync`) — giving the `./skills/<name>` member list. Reading the list rather than hard-coding member names keeps this check in lock-step with bundle membership and avoids a blind spot when a member is added. **Detect changed bundle skills** from `changed_files` (Step 2's `git diff --name-only main HEAD` output) using **path-segment equality** (not substring match — same discipline as § Step 2's filter rules): a path marks member `<name>` changed when a path segment exactly equals `<name>` with a preceding `skills` segment, or under `plugins/dev-workflow-bundle/skills/<name>/` (the flat canonical `skills/<name>/…` matches by its leading `skills`/`<name>` segment pair). Map each changed member to its plugin name via `.claude/skills/dev-workflow-triage/SKILL.md` § Step 3.7 (c) Plugin mapping — only `ask-peer` → `peer` differs from the skill name; every other member (including any absent from that table) maps to its own name.
   - If no bundle skill changed, set `release_integrity_result = ok` and proceed to § Step 3.
2. **Run-level facts — compute once, not per skill**: **bundle bumped** = the `dev-workflow-bundle` version is bumped; **CHANGELOG touched** = `CHANGELOG.md` ∈ `changed_files`.
3. **Per changed bundle skill**: **member bumped** = that skill's `<plugin>` version is bumped. The skill is a **violation** when any of {member bumped, bundle bumped, CHANGELOG touched} is false.
4. **Record** `release_integrity_result`: `ok` when no changed bundle skill is a violation; otherwise the list of violating skills with their per-skill {member bumped / bundle bumped / CHANGELOG touched} flags.
5. **Non-fatal**: a violation is recorded and the run continues — never a fatal abort. When a violation's cause is an **unverifiable** read (a `main:`/`HEAD:` version that resolved to `unknown` — git/jq error or an absent `marketplace.json` entry) rather than a confirmed missing bump, record reason `could not verify` and emit the could-not-verify warning variant — so an unverifiable read surfaces rather than silently passing as `ok`. The section adds no new exit path, so the § Auto-stash restore invariant is unaffected. `release_integrity_result` is computed and rendered **only on the form-3 path** — the § Step 2 form-2 exit (empty `changed_files`) returns before this section, so it is never referenced there.

## Step 3 — Run `Skill(prompt-tuning)` per file

If `prompt_targets` is empty, emit summary line `prompt-tuning: skipped (no prompt-eligible files in diff)` and proceed to § Step 4.

Otherwise, iterate through `prompt_targets` sequentially. For each `<file>`:

(a) **Pre-invocation reminder**: the next tool call is `Skill(prompt-tuning)` dispatch. Its return — verbose markdown ending with a fenced JSON or `Iteration N` table — is the **structured return value** to parse, not a turn boundary and not a deliverable for the user. After the skill body emits its return value, the **same response must continue** with either the next file's `Skill(prompt-tuning)` dispatch (if more files remain) or the § Step 4 `Skill(skill-review)` dispatch (if this was the last file). Specifically forbidden between the JSON-parse and the next tool call: `なにか判断が必要ですか？` / `判断を求めていますか？` / `X ファイル目完了。続けますか？` / English `shall I proceed?` / any prose that ends without a subsequent tool call. See `§ No-Stall Principle` "Zero designed user-gate points" and "Skill(prompt-tuning) return shape" paragraphs.

(b) Invoke `Skill(prompt-tuning)` with the **minimal natural-language form** below (verbatim — do not add scope, framing, or context; expansions cause the callee to follow procedural code literally with override-defensive interpretation):

```
<file> を tune して
```

(c) **Parse the return**. Two paths, evaluated in order (first match wins):

1. **Fenced JSON Skip return contract** — `prompt-tuning` § Environment constraints emits this when recursive `Agent` dispatch is blocked by the host. Shape: `{"status": "skipped", "reason": "<reason>", ...}`. Classify as `skipped (agent unavailable)`
2. **Free-form prose verdict** — pattern-match the prose for known tokens (`Convergence check` → `converged`, `iter-N` / `Iteration N` table → `max-iter` if the last iter is `Max iterations` else `converged`, `iter-0: BLOCK-consistency` → `error (iter-0 BLOCK)`, `iter-0: PASS-with-note` / `iter-0: PASS` plus iter-1+ table → continue per the table). If no known token matches: `unparsed`

Record the per-file classification in a result list. `unparsed` and `error` are non-fatal — the next file's dispatch proceeds without halting the run.

(d) **Return-point no-stall reminder**: after parsing the fenced JSON / `Iteration N` table at the end of the prompt-tuning response, the **next turn must begin with the next tool call** — either the next file's `Skill(prompt-tuning)` dispatch (if more files remain in `prompt_targets`) or the § Step 4 `Skill(skill-review)` dispatch (if this was the last file). Specifically forbidden between this point and the next tool call: user-facing pause phrases per § No-Stall Principle, prose summary turns that end without a tool call, re-rendering or paraphrasing the prompt-tuning response markdown (it is internal subagent reasoning per § No-Stall Principle "Skill(prompt-tuning) return shape" paragraph), and any "interstitial confirmation" framing. The per-file classification token (`converged` / `max-iter` / `skipped (agent unavailable)` / `error` / `unparsed`) is logged inline as part of the next tool call's preceding sentence, not as a standalone summary turn. See `§ No-Stall Principle`.

## Step 4 — Run `Skill(skill-review)`

(a) **Pre-invocation reminder**: the next tool call is `Skill(skill-review)` dispatch. Its return is a single fenced JSON verdict — parse it as a structured return value, branch on the `status` enum per § Step 4 (c), and **issue the next tool call (§ Step 5 `Skill(publicity-review)` dispatch) in the same response**. Specifically forbidden between the verdict-parse and the next tool call: user-facing pause phrases per § No-Stall Principle ("Zero designed user-gate points" paragraph), prose summaries of the skill-review verdict that end without a tool call, re-rendering the JSON block as a standalone deliverable. The verdict's per-field log line (`status` / `iterations_used` / `applied_edits_count` / `notes_remaining_count` / `framing`) is recorded inline as part of the next tool call's preceding sentence, not as a standalone turn. See `§ No-Stall Principle`.

(b) **Diff-size assessment (before dispatch)**: filter `changed_files` (§ Step 2's uncapped list — not `prompt_targets`, whose 5-file cap and narrower basename filter exist for `prompt-tuning`'s unrelated walltime concern and would under- or over-count `skill-review`'s actual scope) using `skill-review`'s own **Step 1 — Detect changed skill files** "Filter to files matching" sub-step's scope patterns (`skills/**/SKILL.md`, `skills/**/README.md`, `skills/**/references/**`, `.claude/skills/**/SKILL.md`, `.claude/skills/**/references/**`) — this naturally excludes bundle-copy mirrors under any `plugins/**` tree, since none of those patterns match that prefix. If the filtered set is empty, `skill_review_diff_lines = 0` — do **not** run `git diff --shortstat` with an empty pathspec list; git treats `--` followed by no paths as "no restriction" and silently returns the shortstat for the entire `main..HEAD` diff instead of zero. Otherwise run `git diff --shortstat main -- "<path-1>" "<path-2>" ...` (each path individually quoted) and sum the reported insertions and deletions — either clause is omitted from the output entirely when its count is `0` (e.g. a pure-addition diff renders with no `deletions(-)` substring at all), so treat an absent clause as `0` rather than assuming both always appear.

When `skill_review_diff_lines ≤ 30` (a heuristic threshold, not externally derived — chosen as headroom above the single 21-line diff observed in practice to still consume the full default iteration budget; revisit if further data suggests otherwise), append `Max iterations: 1` to the invocation below. Otherwise append nothing extra — `skill-review`'s own default of `3` applies.

Invoke `Skill(skill-review)` with the form below. `skill-review` accepts both the `Base ref` field (same pattern as `publicity-review`) and the optional `Max iterations` field in its own `## Invocation contract`, so this form — including the conditional second line — is contract-sanctioned:

```
Base ref: main
```

or, when the diff-size assessment above triggers the override:

```
Base ref: main
Max iterations: 1
```

Do **not** append: triage branch name, the `changed_files` list, an explicit `git diff main HEAD` reference, or any other expansion beyond the two contract fields above. `Max iterations` is a documented invocation-contract field, not ad hoc framing/context, so it is exempt from this prohibition when the diff-size assessment triggers it.

(c) **Parse the verdict** with the first-match-wins evaluate-in-order discipline from `.claude/skills/verify-diff/SKILL.md` § (b) Parse & apply, restricted to single-pass dispatch (Converged / Divergence cases are N/A here):

1. Verdict missing/malformed → record `skill_review_result = {status: "error", reason: "verdict parse failure", framing_status: "ok"}`, proceed
2. Schema violation → record `skill_review_result = {status: "error", reason: "verdict schema violation", framing_status: "ok"}`, proceed
3. Otherwise — extract `status`, `iterations_used`, `applied_edits_count`, `notes_remaining_count`, `reason` from the JSON

(d) **Runtime framing-failed detection** (legacy guard): after parsing a successful verdict, check `iterations_used == 0 && status == "no-actionable-findings"`. When this signature appears **and** `changed_files` is non-empty (main..HEAD has changes), it indicates `skill-review` Step 1 early-returned despite the `Base ref: main` invocation — most likely a `skill-review` contract-parsing regression. Record `framing_status = "framing-failed (suspected — iter=0 on non-empty main..HEAD)"` and surface as a warning in Step 6 form 3. Otherwise `framing_status = "ok"`. With the contract-field invocation form in (b), this guard should rarely fire — its presence is preserved as a downstream-regression detector.

(e) **Return-point no-stall reminder**: after parsing the verdict and (d) `framing_status` derivation, the **next turn must begin with `Skill(publicity-review)` dispatch** (§ Step 5). Specifically forbidden between the framing-status assignment and the next tool call: user-facing pause phrases per § No-Stall Principle, prose summary turns that end without a tool call, "shall I proceed to publicity-review?" framing. See `§ No-Stall Principle`.

## Step 5 — Run `Skill(publicity-review)`

(a) **Pre-invocation reminder**: the next tool call is `Skill(publicity-review)` dispatch. Its return is a single fenced JSON verdict — parse it as a structured return value per § Step 5 (c), and **proceed to the § Run `Skill(rules-review)` (rules-compliance detection layer) dispatch in the same response**. Specifically forbidden between the verdict-parse and that dispatch: user-facing pause phrases per § No-Stall Principle, prose summaries of the publicity-review verdict that end without proceeding, re-rendering the JSON block as a standalone deliverable. See `§ No-Stall Principle`.

(b) Invoke `Skill(publicity-review)` with the short form:

```
Base ref: main
```

`publicity-review` accepts the `Base ref` field in its own `## Invocation contract`, so this form is contract-sanctioned. `Max iterations` is left at its default of `2`.

(c) **Parse the verdict** with the same first-match-wins discipline as § Step 4 (c). Extract `status`, `iterations_used`, `applied_edits_count`, `findings_count`, `remaining_findings`, `reverted_paths`, `reason`. Record as `publicity_review_result`.

(d) **Return-point no-stall reminder**: after parsing the verdict, the **same response must continue** with the § Run `Skill(rules-review)` (rules-compliance detection layer) dispatch. Specifically forbidden between this point and that dispatch: user-facing pause phrases per § No-Stall Principle, "shall I run rules-review?" framing, prose turns that end without proceeding. See `§ No-Stall Principle`.

## Run `Skill(rules-review)` (rules-compliance detection layer)

Runs after § Step 5 (`Skill(publicity-review)`) and before § Step 6 summary emission — the final review-skill dispatch of the run. `rules-review` checks the `main..HEAD` diff against `.claude/rules/` and reports rule violations (e.g. a triage branch that changed a bundle skill without the paired version bump). It is **detect-only** (its `allowed-tools` has no `Edit`), so it never writes to the working tree and never collides with the auto-stash or the other callees' `git checkout HEAD` scope rails.

**Ordering invariant — runs before § Auto-stash restore.** This section executes after Step 5 but **before § Auto-stash restore** (which runs at the top of § Step 6). Because the restore has not yet fired, the working tree still equals HEAD here, so `rules-review`'s `git diff main` (base-vs-working-tree) equals `main..HEAD` — the same scope the other callees see. If the restore ran first, the operator's stashed changes would leak into `rules-review`'s diff scope. This section introduces **no new exit path** (every outcome is non-fatal — recorded and proceeded past), so the § Auto-stash restore "exactly two exit paths" invariant is unchanged.

(a) **Pre-invocation reminder**: the next tool call is `Skill(rules-review)` dispatch. Its return is a single fenced JSON verdict (`rules-review` § Return contract) — parse it as a structured return value per (c) below, and **proceed to § Step 6 summary emission in the same response**. Specifically forbidden between the verdict-parse and the § Step 6 summary: user-facing pause phrases per § No-Stall Principle, prose summaries of the rules-review verdict that end without proceeding to Step 6, re-rendering the JSON block as a standalone deliverable. See `§ No-Stall Principle`.

(b) Invoke `Skill(rules-review)` with the short form below. **`rules-review` takes its base ref via the `--base-commit <sha>` flag (its own `## Usage`), a different form from the `Base ref: main` field that `skill-review` / `publicity-review` accept — pass the flag form, not the field form:**

```
--base-commit main
```

Do **not** append the triage branch name, the `changed_files` list, or any other expansion (same minimal-form discipline as § Step 4 / § Step 5).

(c) **Parse the verdict** with the first-match-wins evaluate-in-order discipline from `.claude/skills/verify-diff/SKILL.md` § (b) Parse & apply (restricted to single-pass dispatch — Converged / Divergence are N/A here):

1. `Skill(rules-review)` could not be resolved / dispatched in this environment (skill-not-found, or the call returned no usable response at all) → record `rules_review_result = {status: "skipped", reason: "unavailable"}` (distinguishes "skill absent from this environment" from "contract broken", mirroring `prompt-tuning`'s `skipped (agent unavailable)`)
2. The skill ran but the response carries no parseable fenced JSON verdict block → record `rules_review_result = {status: "error", reason: "verdict parse failure"}`
3. Schema violation (`status` outside `no-issues` / `violations` / `error`, or `violations_count` not a non-negative integer) → record `rules_review_result = {status: "error", reason: "verdict schema violation"}`
4. Otherwise — extract `status`, `violations_count`, `reason` from the JSON. A JSON `status: "error"` carries `rules-review`'s own closed-enum `reason` (`diff collection failed` / `rule loading failed` / `verdict parse failure` / `coverage gap only`); render it as `error (<reason>)`

Record as `rules_review_result`. All outcomes are non-fatal — proceed to § Step 6.

(d) **Return-point no-stall reminder**: after parsing the verdict, the **same response must continue** with § Step 6 summary emission (the routine's terminal user-facing output). Specifically forbidden between this point and the Step 6 summary render: user-facing pause phrases per § No-Stall Principle, "shall I emit the summary?" framing, prose turns that end without proceeding to Step 6. See `§ No-Stall Principle`.

## Step 6 — Emit summary

**Run § Auto-stash restore before rendering any summary form** (it is a no-op when `auto_stashed == false`), so the restore outcome can be surfaced as a summary line. Then append the `auto-stash:` field / warning line(s) defined in § Form 3 content:

- the **restore-outcome field** (`auto_stashed == true`) and the conflict-variant restore-failed warning attach to **form 2 or form 3** — the restore runs only on those successful-stash exit paths. These field/warning specs are shared by form 2 and form 3 (form 2 renders them identically), with the single exception of the conflict-variant restore-failed wording, which is form-3-only as noted there.
- the **orphan warning** (`orphan_stash_detected == true`) attaches to **whatever form is emitted, including form 1** — a check-3 stash-push failure routes to form 1 yet may have already detected an orphan in the same run, so form 1 must still carry the orphan warning. (Form-1 aborts from checks 1–2 run before the orphan scan, so `orphan_stash_detected` is still `false` there and no orphan line is appended.)

Output language is Japanese (per § Output language). Render the summary in **one of three closed forms**:

1. `pre-flight aborted: <reason>` — emitted on any Step 1 fatal abort (also carries the orphan warning when `orphan_stash_detected` is true — see the Step 6 intro above)
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
- skill-review: `<status> (iterations: <K>, applied: <A>, notes_remaining: <R>, framing: <framing_status>)`。`framing_status` ∈ {`ok`, `framing-failed (suspected — iter=0 on non-empty main..HEAD)`}。Step 4 (b) の diff-size assessment が `Max iterations: 1` override を発火させた場合、行末に `, max_iterations_override: 1 (diff ≤30 lines)` を追記する
- publicity-review: `<status> (iterations: <K>, applied: <A>, findings: <F>, remaining: <R>)`
- rules-review: § Run `Skill(rules-review)` (rules-compliance detection layer) で算出した `rules_review_result` を描画。`no-issues`（違反なし）/ `violations (<N>)`（`<N>` 件検出）/ `error (<reason>)` / `skipped (unavailable)`。`error` / `skipped` の詳細は下の warning 行
- release-integrity: `<ok | VIOLATION (<N> skills)>` — § Release-integrity check (deterministic bump-presence) で算出した `release_integrity_result` を描画。bundle skill 変更が無いか全て bump/CHANGELOG 揃いなら `ok`、欠落があれば `VIOLATION (<N> skills)`（`<N>` = 違反 skill 数、詳細は下の warning 行）
- auto-stash: `restored` / `not needed (clean tree)` / `restore failed` — `auto_stashed` が true で pop 成功なら `restored`、`auto_stashed` が false なら `not needed (clean tree)`、pop 失敗なら `restore failed`（詳細は下の warning 行）

Warning lines (one per non-fatal incident) follow the main fields:

- `prompt-tuning: <file>: unparsed verdict (verdict prose did not match known tokens)` — per file
- `prompt-tuning: <file>: skipped (agent unavailable)` — per file
- `skill-review: framing-failed (suspected — iter=0 on non-empty main..HEAD)` — single line
- `skill-review: error (<reason>)` — single line
- `publicity-review: error (<reason>)` — single line
- `rules-review: error (<reason>)` — single line (`<reason>` ∈ `verdict parse failure` / `verdict schema violation` / `diff collection failed` / `rule loading failed` / `coverage gap only`)
- `rules-review: skipped (unavailable)` — single line (the `rules-review` skill could not be resolved / dispatched in this environment)
- `release-integrity: <skill> changed without paired bump / CHANGELOG (member bump: <yes/no>, bundle bump: <yes/no>, changelog: <yes/no>)` — per violating skill (set by § Release-integrity check (deterministic bump-presence)); a skill whose `main:`/`HEAD:` version read resolved to `unknown` renders the variant `release-integrity: <skill> could not be verified (version read returned unknown — git/jq error or absent marketplace entry)`
- `auto-stash restore failed: <reason> — changes preserved in \`git stash list\`; resolve the conflict before the handoff \`git switch main\` step` — single line, **form 3 only** (a pop conflict can occur here because callees may have edited files in `main..HEAD`). On the form 2 path the working tree is still == HEAD so the pop cannot conflict; if it nonetheless fails for some other reason, emit the generic variant `auto-stash restore failed: <reason> — changes preserved in \`git stash list\`` (form 2 has no `git switch main` handoff note, so the conflict-resolution clause is omitted)
- `auto-stash: orphaned entry from a prior run detected in \`git stash list\` — recover it manually` — single line, emitted under **form 1, form 2, or form 3** whenever `orphan_stash_detected` is true (set by § Step 1 check 3's orphan scan). Independent of which form fires and of this run's own stash outcome

### Branch handoff note (always shown after the main content when form 3 fires)

```
作業終了後はオペレーターが元のブランチに戻してください（例: git switch main）
```
