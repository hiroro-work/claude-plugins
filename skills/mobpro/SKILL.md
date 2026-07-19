---
name: mobpro
description: Learning-oriented development workflow (mob-programming style) that runs the SAME quality gates as dev-workflow — plan review, checks/tests, rules-compliance review, code review, interactive commits, rule maintenance — while pausing at deliberate learning checkpoints so a junior engineer can follow WHAT is being built and WHY. The AI is always the driver (it writes all code); the junior navigates, reads diffs, predicts review findings, and approves commits. Use this instead of dev-workflow when the goal is to develop a feature WHILE a junior learns from it, not merely to ship efficiently.
allowed-tools: Agent, Read, Write, Edit, Glob, Grep, TaskCreate, TaskUpdate, TaskList, TodoWrite, AskUserQuestion, Skill(ask-peer), Skill(ask-claude), Skill(ask-codex), Skill(ask-gemini), Skill(ask-copilot), Skill(ask-agy), Skill(extract-rules), Skill(tidy), Skill(simplify), Skill(run-tests), Skill(rules-review), Skill(prose-polish), Bash(pwd), Bash(mkdir -p .claude/plans), Bash(rm -f .claude/plans/*), Bash(pnpm run *), Bash(pnpm exec *), Bash(npm run *), Bash(yarn run *), Bash(bun run *), Bash(bundle exec *), Bash(make lint *), Bash(make format *), Bash(make test *), Bash(make typecheck *), Bash(make check *), Bash(python -m pytest *), Bash(poetry run *), Bash(uv run *), Bash(cargo test *), Bash(cargo clippy *), Bash(cargo fmt *), Bash(go test *), Bash(go vet *), Bash(git diff *), Bash(git status *), Bash(git rev-parse *), Bash(git add *), Bash(git commit *), Bash(git log *), Bash(git checkout HEAD -- *), Bash(git reset -- *), Bash(git write-tree), Bash(git commit-tree *), Bash(git ls-files *), Bash(grep -q *), Bash(test -f *), Bash(gh api --method POST /repos/*/issues *), Bash(gh auth status), Bash(jq *), Bash(node *), Bash(printenv CLAUDE_CODE_REMOTE), Bash(crit *)
---

# mobpro

A learning-oriented development workflow. It runs the same quality gates as `dev-workflow` by calling the same `dev-workflow-bundle` sibling skills under the same conventions, but it re-shapes the flow around a junior engineer's understanding: the AI is always the driver and writes every edit, while the junior navigates — thinking about the approach, explaining the plan in their own words, reading diffs, predicting review findings, and judging commits. Quality is never traded for pedagogy: `mobpro` runs M4 and M7–M12 gates in full, with no difficulty-based skipping.

> **Walking-skeleton status**: this is the M1–M13 skeleton. It runs one full pass with built-in defaults (no config-file reading), the checkpoint reduced to form (c) "any questions?", and the deeper learning gates (M5 teach-back, M9 quiz, M8 error-reading practice, the 3-form checkpoint dispatch) not yet implemented. Config-file reading, the M11 `commit_review_gate: crit` branch, M2 Resume sub-mode, and the full M13 state-file lifecycle arrive in later subtasks.

## Usage

```text
/mobpro [-i N | --iterations N] <task>          # Execute a learning session (Normal sub-mode)
/mobpro --resume <state-file> [-i N]            # Resume a subtask from a decomposition state file (arrives in a later subtask)
```

There is no `--init`, no `--fast`, no `--executor`, and no difficulty assessment — `mobpro` deliberately keeps the invocation surface minimal (see [`references/configuration.md`](references/configuration.md)).

## Relationship to dev-workflow

`mobpro` shares dev-workflow's quality machinery rather than re-implementing it:

- **Same sibling callees**: the reviewer (`ask-peer` etc.), `simplify` / `tidy`, `prose-polish`, `rules-review`, `run-tests`, `extract-rules` — invoked with the same conventions.
- **Same project-characteristic settings**: `reviewer` / `check_commands` / `test_commands` / `language` and the other fallback keys are read from dev-workflow's config layers (see [`references/configuration.md`](references/configuration.md)). `mobpro` never writes to those files.
- **Same state-file schema and path** (`.claude/plans/dev-workflow.<slug>.md`): a parent task started under `mobpro` can be resumed with `/dev-workflow --resume <slug>`, and vice versa. The schema's single source of truth is dev-workflow's `references/task-decomposition.md`.
- **Install requirement**: `mobpro` MUST be installed via the `dev-workflow-bundle` plugin — it reads `dev-workflow`'s reference files as install-time siblings (see § Runtime reads). A standalone `mobpro`-only install has no `dev-workflow` sibling and its runtime reads fail.

## Runtime reads (closed list)

`mobpro` is an orchestrator: it holds the flow discipline and delegates each procedure body to a `dev-workflow` reference file read at runtime. It reads **only** the files in the table below, via the sibling-relative path `../dev-workflow/references/<name>.md` (the bundle install co-locates `mobpro` and `dev-workflow` under one `skills/` directory — verified for the installed-cache layout by subtask 2's Step 0 smoke test). It never reads any other `dev-workflow` file at runtime — in particular, never `dev-workflow/SKILL.md`.

| File | Read at | Purpose |
| --- | --- | --- |
| `task-decomposition.md` | M2 | Decompose (§ B) / resume (§ A) / state-file schema |
| `prerequisites.md` | M1 / M7 (+ M4 / M9 callee failure) | Callee retry / fallback protocol (reviewer 3-option fallback, `simplify`→`tidy` resolution, etc.) |
| `plan-format.md` | M3 | Plan document § Template + § Localization granularity |
| `step3-plan-review.md` | M4 | The six-category review payload definition (sub-step 1 payload only; iteration / stop discipline follows M4 below) |
| `step7.5-rules-compliance.md` | M9 | Persistent-violations gate + 2nd-cycle procedure |
| `step8-code-review.md` | M9 | § Sub-step 1 code-review payload definition (payload only; the payload carries a pointer to `review-categories.md § Code review categories` that the **reviewer** reads — out of orchestrator scope, as at M4) |
| `step9-completion-hooks.md` | M10 | Hook execution / review-class classification / failure-continue / post-hook re-check |
| `interactive-commits.md` | M11 | § Propose commit plan / § Per-commit loop procedure body |
| `crit-commit-review.md` | M11 (only when `commit_review_gate` resolves to `crit`) | Per-commit diff review via crit (arrives in a later subtask) |
| `update-rules.md` | M12 | Step 11 procedure body (compaction gate included) |
| `session-scan.md` | M12 | Shared session-scan dispatch-once contract |
| `self-retrospective.md` | M12 (only when `self_retrospective.feedback` is set) | Step 11.5-equivalent procedure |
| `workability-retrospective.md` | M12 (only when `workability_retrospective.enabled`) | Step 11.6-equivalent procedure |
| `completion.md` | M13 | § Completion reminders render bodies + staging-artifact cleanup |

**Constraint scope**: this "read only the table" rule binds the orchestrator (this SKILL.md) and covers **dev-workflow** files only — `mobpro` freely reads its **own** `references/` (`configuration.md`, `inline-defs.md`) as normal skill-internal reads. It does **not** bind reviewer subagents dispatched at M4 / M9 — a reviewer following `step3-plan-review.md`'s instructions to read `review-categories.md` / `simplicity-self-audit.md` is normal and out of scope.

**NEEDS-FALLBACK path**: if the sibling-relative read cannot resolve in a given install (the Step 0 smoke test returned NEEDS-FALLBACK), resolve `dev-workflow`'s source directory absolutely via `jq -r '(.plugins[] | select(.name == "dev-workflow") | .source)' <marketplace.json>` and read from there instead. (Skeleton records this path; the smoke test found the installed-cache layout READY, so the sibling-relative form is the primary path.)

## M ↔ Step remap directive

`mobpro`'s M1–M13 map onto `dev-workflow`'s Step 1–11 / Completion one-to-one. Every reference file read at runtime is written in `dev-workflow` vocabulary, so **remap as you read it**: a `Step N` reference maps to the corresponding M below; a task-row instruction (e.g. "mark `Step 1.5` as `completed`") targets the corresponding M row; a resume-command hint (`/dev-workflow --resume <slug>`) maps to M13's two-command presentation. Without this remap the reference's `dev-workflow` row names and command hints would leak into `mobpro`'s output verbatim.

| mobpro | dev-workflow Step | mobpro | dev-workflow Step |
| --- | --- | --- | --- |
| M1 Load settings | Step 1 | M8 Check / test | Step 7 |
| M2 Kickoff | Step 1.5 | M9 Rules + code review | Step 7.5 / Step 8 |
| M3 Design dialogue | Step 2 | M10 Completion hooks | Step 9 |
| M4 Plan review | Step 3 | M11 Commit | Step 10 |
| M5 Plan approval | Step 4 | M12 Rule update / retrospective | Step 11 / 11.5 / 11.6 |
| M6 Implementation loop | Step 5 | M13 Wrap-up | Completion |
| M7 Tidy + prose polish | Step 6 / 6.5 | | |

## Checkpoint Principle

`mobpro`'s core discipline, the pedagogical counterpart to dev-workflow's `§ No-Stall Principle`. It is a two-sided rule: `mobpro` stops **only** at the two closed lists below, and nowhere else. It takes effect once M2 has settled the effective task (mirroring dev-workflow's No-Stall scoping "after Step 1.5 resolves the effective task") — so M1's reviewer-fallback prompt and M2's learning-goal / decomposition / leftover-picker dialogues precede the principle and are not listed here.

**(1) Learning stops (closed list).** In this skeleton, the only deliberate learning-stop points are:

- The M6 checkpoint in form (c) — an open "any questions?" opportunity after a unit's walkthrough.
- A junior's question raised after an M6 / M11 walkthrough (respond, then continue; if no question comes, do not stop).

(The M5 teach-back, the M8 error-reading practice, the M9 prediction quiz, and the 3-form checkpoint dispatch — teach-back / lightweight quiz / open question — arrive in a later subtask and will extend this list.)

**(2) User gates (closed list — approval / judgment).** M5 plan approval; M8 check/test fail-stop (error-stop after 3 retries) and the two scope stops; M9 persistent-violations gate and unresolved-findings gate; M11 commit gates (commit-plan approval / per-commit accept / fold-or-defer / ambiguous-adjust); M12 gates (compaction approval / confirm-remaining-steps / rule-update commit / workability disposition); M13 deferral-exclusion gate and PR-URL prompt.

**(3) Nowhere else.** Outside lists (1) and (2) — sibling-skill return points, no-op results, TaskUpdate / TodoWrite transitions — do not stop; issue the next action in the same turn. The M11 `commit_review_gate: crit` browser-submit wait is a **harness-tracked background boundary**, not a stop (proceed on the crit process's exit notification; never prompt "type continue"). Any new stop point added to M1–M13 must be added to list (1) or (2) in the same change (synchronization audit). `mobpro` inherits dev-workflow's accumulated stall defenses (return-point reminders, no-summary-turn rule) — re-expressed here with `mobpro`'s closed lists as the subject.

## Cross-step state variables (initialized at M1)

`base_commit` (recorded at M3) / `N_plan` / `N_code` / `bundle_skills_unavailable = []` / `landed_count = 0` (incremented by M11 on a landed commit; initialized at M1 — not at M11 entry as dev-workflow does — so M13's branch is well-defined even when M11 is unregistered or skipped) / `implementation_diff_paths` (recorded at M6 step 4) / `m9_fix_files = []` (files edited during M9 review iterations; read by M9's loop-exit aggregate re-verification) / `session_scan_dispatched = false` / `session_scan_result = null` (M12 dispatch-once contract) / `compaction_applied_count = 0` / `below_threshold_failed_files = []` (M12 compaction gate; read by M13's compaction reminder; initialized at M1 — like `landed_count` — so M13 is well-defined even when M12's confirm-remaining-steps gate skips or the `compact_rules` gate leaves the compaction sub-step unentered) / the learning goal (settled at M2). `mobpro` does **not** carry dev-workflow's `difficulty_skipped_steps` / `fast_mode_skipped_steps` / `step8_fix_files` (no difficulty assessment, no fast mode; the M9 fix aggregate uses `m9_fix_files`).

## Configuration

Skeleton behavior reads **no** config files — every key resolves to its built-in default. The full schema (mobpro-specific `checkpoint` / `quiz` / `error_reading_practice`, the dev-workflow fallback keys, and the not-adopted keys) is documented in [`references/configuration.md`](references/configuration.md); config-file reading is wired in a later subtask.

**Settings merge strategy**: when config-file reading is wired (a later subtask), `mobpro` merges the fallback keys across the dev-workflow layers with dev-workflow's per-class semantics — read [`references/inline-defs.md`](references/inline-defs.md) § (a) (`Keep in sync with dev-workflow SKILL.md § Configuration`).

## Workflow artifacts (cross-step fixed exclusion)

The full definition — the in-session-state files this workflow owns (plan documents under `.claude/plans/`, decomposition state files, backlog files, the rule-extraction candidate file, and other staging artifacts under `.claude/`) and excludes structurally from every changed-file enumeration — is transcribed in [`references/inline-defs.md`](references/inline-defs.md) § (b) Workflow artifacts (`Keep in sync with dev-workflow SKILL.md § Workflow artifacts`). M6 / M7 / M9 / M11 apply that single shared exclusion when building any changed-file set. This heading is the stable anchor other M-steps reference as "§ Workflow artifacts".

## M1 — Load settings

1. **Skeleton** (no config-file reading — see § Configuration): resolve every key to its built-in default: `reviewer` → `ask-peer`; `review_iterations` → `3` per phase unless `-i` overrides; `interactive_commits` → `true`; `hooks.on_complete` → none (unset) — these two mirror dev-workflow's own defaults (`dev-workflow/SKILL.md` § Configuration) and are fixed here as built-in values rather than read from that file, per § Runtime reads' constraint scope, so sub-step 4's conditional omissions below are resolvable without reading it; `checkpoint` → treated as "form (c) only"; `quiz` / `error_reading_practice` → off in this skeleton; `language` → merged config → `~/.claude/settings.json` `language` → default `ja`.
2. Read `../dev-workflow/references/prerequisites.md`. Probe the resolved reviewer with a one-word `ping`; on failure retry once; on persistent failure present that file's three-option fallback prompt (switch reviewer / self-review / pause at the gate). Initialize `bundle_skills_unavailable = []` (append discipline per that file).
3. Resolve `N_plan` / `N_code`: `-i N` (positive integer) > `review_iterations` (scalar or `{plan, code}` map, same validation as dev-workflow) > default `3`. **No difficulty-based reduction** — every gate is a teaching surface.
4. Register all phases with the Task tools (`TodoWrite` fallback where Task tools are unavailable) in one upfront burst: the M1–M13 rows + `M4-1 … M4-N_plan` + `M9-1 … M9-N_code`. Conditional omissions (exactly three): omit `M2` in Resume sub-mode; omit `M10` when `hooks.on_complete` is unset; omit `M11` when `interactive_commits` is false. `M12` is always one row (it branches internally on the 11.5 / 11.6 conditions).
5. Initialize the § Cross-step state variables.
6. Emit the Language checkpoint (`Output language: <lang>`).

## M2 — Kickoff

1. **Learning-goal confirmation** (Normal sub-mode): ask what the junior wants to understand this session (1–2 goals); if they defer, propose 1–2 from the task and confirm. Paired sample:
   - `language: ja`: `今日のセッションで理解したいことを 1〜2 個教えてください（例: このプロジェクトのルーティングの仕組み / テストの書き方）。特になければこちらで提案します。`
   - `language: en`: `What would you like to understand from today's session (1–2 goals, e.g. how this project's routing works / how tests are written)? If nothing specific, I'll suggest a couple.`
2. **Normal sub-mode**: read `../dev-workflow/references/task-decomposition.md` § B and follow it. Consider the walking-skeleton decomposition axis as the default candidate and shape the first proposed subtask as "get the minimal happy path working" (proposal-priority only — the § B.1 one-line rationale label still follows that axis's discriminator). The yes / adjust / no gate, state-file creation, and progress row are used verbatim from that reference.
3. **Resume sub-mode** (`--resume <state-file>`): read § A of the same reference and follow it, plus re-surface the state-file body's learning-goal line. (Skeleton: Resume sub-mode arrives in a later subtask; Normal sub-mode is the skeleton path.)
4. On decompose-accept, add a `Created by: mobpro` line and the learning-goal line to the state-file body (frontmatter schema unchanged).
5. Settle the effective task and proceed to M3.

## M3 — Design dialogue

1. Record `base_commit`: `git rev-parse HEAD`.
2. **Socratic prompt (one question only)**: ask the junior how they'd approach it before presenting the AI plan, then explain the delta (what was taken / not taken and why) in 2–3 lines. "I don't know" proceeds without pressing.
   - `language: ja`: `この機能、どう作るとよさそう？ 思いつくところだけでいいよ。`
   - `language: en`: `How do you think we should build this? Just share whatever comes to mind.`
3. Author the plan document and `Write` it to `.claude/plans/<slug>.md`, following `../dev-workflow/references/plan-format.md` § Template and § Localization granularity. Apply `custom_instructions` to plan priorities.
4. **Deliberately not adopted**: `EnterPlanMode` (M3/M5 are always chat), the Step 2 research-delegation, the difficulty assessment (Adjust N), the Simplicity self-audit, and the Plan self-check — learning-session plans are small, and simplicity is checked by M4's category (a).
5. Do not show the plan to the user or ask for approval here — go straight to M4 (same prohibition as dev-workflow Step 2's "no unreviewed-plan presentation").

## M4 — Plan review (quality gate)

For each iteration M4-1 … M4-N_plan, in order:

1. Reuse `../dev-workflow/references/step3-plan-review.md` sub-step 1's six-category review payload definition and pass the full plan + `custom_instructions` + the state-file subtask scope (when decomposed) to `Skill(<reviewer>)`.
2. Judge the response semantically: no actionable findings → mark this and remaining iterations `completed` and go to M5.
3. Findings → apply to the plan (reject unreasonable ones with a stated reason), then **teach**: explain each applied finding as "what review lens this is" in 1–2 lines. Continue to the next iteration.
4. After N_plan iterations, carry any unresolved points into M5's presentation as "open points".

## M5 — Plan approval (teach-back gate — USER GATE)

1. Present the full plan in chat (always chat; `plan_review_gate` is not adopted — see [`references/configuration.md`](references/configuration.md)).
2. **Skeleton**: normal approval confirmation (the teach-back prompt arrives in a later subtask).
3. Classify the reply semantically into three buckets: **accept** (→ implementation) / **adjust** (revise the plan → add one M4 iteration → re-review → re-enter M5) / **withdraw** (end the workflow). Interrogative / non-committal replies re-classify via a confirming question.
4. Run a one-line read-back before applying any revise instruction (same discipline as dev-workflow Step 4's read-back).

## M6 — Implementation loop

1. **Unit segmentation**: if the plan's Design is a numbered step list, each step is a unit; otherwise segment into 3–7 units and register them as implementation sub-rows (additions, not a replacement of the M6 row).
2. Per unit: (a) **preview** ≤ 6 lines (what / why / which files) → (b) **AI edits** (main-thread; never delegate to a subagent — the junior must see the edit as it happens) → (c) **walkthrough**: 1–2 lines per changed file + one line for any design decision → (d) **checkpoint** in form (c) (skeleton).
3. Apply `custom_instructions` throughout. Per the § Workflow artifacts exclusion, treat `.claude/`-internal state files as excluded from every downstream changed-file enumeration.
4. After all units land, record `implementation_diff_paths = git diff <base_commit> --name-only` (read by M11's Post-hook attribution check).

## M7 — Tidy + prose polish (quality gate)

1. Call `Skill(simplify)`; if unavailable, `Skill(tidy)` (pass `Base ref: <base_commit>`). Resolution / both-unavailable skip / ledger append follow `../dev-workflow/references/prerequisites.md`'s Cleanup skill bullet.
2. If cleanup changed anything, explain why in 1–2 lines (e.g. "this duplication was a future maintenance hazard, so it was pulled into one function").
3. If `polish_prose` is true, call `Skill(prose-polish)` in file mode (`Language:` = resolved language, no `Model:`). On failure retry once, then skip and append to `bundle_skills_unavailable`.
4. **No difficulty skip** — M7 always runs.

## M8 — Check / test (quality gate, max 3 retries)

1. Run `check_commands` in order; on all-pass, run `test_commands` in order (`Skill(run-tests)` etc.).
2. **Skeleton**: `error_reading_practice` is off, so a failure is fixed immediately (the first-failure error-reading practice arrives in a later subtask). Fix → re-run, up to 3 retries; exceeding that reports and stops (error-stop).
3. **Scope stops**: two step-internal USER GATES apply during `check_commands` (the only non-completing exits here) — the pre-execution scope-narrowing stop and the scope-drift stop. Read [`references/inline-defs.md`](references/inline-defs.md) § (c) and apply both.

## M9 — Rules + code review (quality gate)

1. **Skeleton**: `quiz` is off, so no prediction quiz (it arrives in a later subtask).
2. **Rules compliance**: call `Skill(rules-review) --base-commit <base_commit>`. Violations → fix → explain each fix in 1–2 lines. The 2nd-cycle procedure and the persistent-violations user gate follow `../dev-workflow/references/step7.5-rules-compliance.md`.
3. **Code review** (M9-1 … M9-N_code): build the payload from `../dev-workflow/references/step8-code-review.md` § Sub-step 1 (the three review categories a/b/c — full rubric in `review-categories.md`, which the reviewer reads, as at M4 — untracked-file inclusion, `.claude/rules/` safety-net, continuation item) — payload definition only; iteration / stop discipline follows this procedure — and pass it to `Skill(<reviewer>)`. Judge → apply or reject-with-reason (files edited by an applied fix append to `m9_fix_files`) → explain each in 1–2 lines → no actionable findings marks the rest `completed`.
4. **Unresolved-findings gate**: if actionable findings remain after N_code iterations, present them for a user decision (correspond / accept-and-continue / stop) — same shape as dev-workflow Step 8 sub-step 4.
5. **Loop-exit aggregate re-verification (2 gates)**: once the review iterations settle, if `m9_fix_files` is non-empty, (1) re-run check/test once (reuse M8, no practice), and (2) run one `Skill(rules-review)` scoped to `m9_fix_files` — the same 2-gate structure as dev-workflow Step 8's Deferred verification (no per-iteration re-runs).
6. **Deliberately not adopted**: dev-workflow Step 7's concurrent background launches (`run_in_background` `Agent` dispatch of rules-review / code review) — a learning session runs these synchronously so the walkthrough can interleave. M9 issues no direct `Agent` dispatch (M12's session scan is `mobpro`'s only direct `Agent` use).

## M10 — Completion hooks

Skip (and do not register) when `hooks.on_complete` is unset. Otherwise, before executing any entry, apply the **task-derived-change gate** transcribed in [`references/inline-defs.md`](references/inline-defs.md) § (d) — skip the whole `hooks.on_complete` list (marking M10 `completed` with a skip-reason line) when there are no task-derived changes since `<base_commit>`. When the gate passes, read `../dev-workflow/references/step9-completion-hooks.md` and run each entry in order (review-class classification, failure-record-and-continue, post-hook re-check).

## M11 — Commit (USER GATES)

Runs only when `interactive_commits` is true (else unregistered). Read `../dev-workflow/references/interactive-commits.md` and follow § Propose commit plan → § Per-commit loop verbatim. **Skeleton**: the diff surface is chat only (the `commit_review_gate: crit` branch — read `crit-commit-review.md`, availability check, fallback — arrives in a later subtask). The one learning extension is a 1–2 line "point of this diff" note added to each per-commit presentation; the approval tokens, procedure, and presented elements are otherwise unchanged. `git push` is never performed by any step.

**Step 10 inline definitions**: `interactive-commits.md` depends on definitions that live inline in dev-workflow's SKILL.md — the Approval token closed list, Localized summary tokens, the `landed_count` lifecycle, the Post-hook attribution check, and the branch-ancestry guard. Read [`references/inline-defs.md`](references/inline-defs.md) § (e) and apply them.

## M12 — Rule update / retrospective

1. **confirm-remaining-steps entry gate** (when `confirm_remaining_steps` is true): ask whether to run the remaining rule-maintenance / retrospective work (list only the registered ones) or skip to M13. On skip, mark those `completed` without running and note the skip.
2. Read `../dev-workflow/references/update-rules.md` and run the Step 11 procedure body (`Skill(extract-rules)`, the `compact_rules` gate, and — when `interactive_commits` is true — the rule-update commit gate).
3. When `self_retrospective.feedback` is set, read `self-retrospective.md`; when `workability_retrospective.enabled`, read `workability-retrospective.md`; run each in kind. The shared session scan follows `session-scan.md` § Dispatch-once contract — dev-workflow's participants are Step 11 / 11.5 / 11.6; in `mobpro` the **three sub-phases of M12** are the participants (`session_scan_dispatched` / `session_scan_result` are the M1-declared cross-step variables, and the first sub-phase that needs the scan dispatches it once). This scan dispatch is `mobpro`'s only direct `Agent` use.
4. `mobpro` is itself a bundle member, so it is one of self-retrospective's improvement-signal targets (registered via that file's Purpose line).

**Step 11 skeleton**: the `rule-extraction-active` gate (double-count defense), session-scan wiring, the extract-rules-unavailable candidates fallback, and the rule-update commit gate firing condition are transcribed in [`references/inline-defs.md`](references/inline-defs.md) § (f) — apply them.

## M13 — Wrap-up (Completion)

1. Read `../dev-workflow/references/completion.md` and run the staging-artifact cleanup. Render only the § Completion reminders whose state exists in `mobpro` — the **6** applicable of dev-workflow's 8: Difficulty-skip and Fast-mode-skip never fire (`mobpro` has neither ledger); Bundle-skill availability (`bundle_skills_unavailable`), M11 partial-state, rule-update / examples-dir / staging-dir, and the compaction reminder fire on their conditions. The reminders' `uncommitted_*` partition scan follows [`references/inline-defs.md`](references/inline-defs.md) § (g).
2. **Learning summary**: against M2's learning goals, summarize "what was understood today" in ≤ 3 one-line points, plus one line each for the quality-gate outcomes (tests / review / rules).
3. When a state file is active, run the state-file lifecycle in order (transcribed in [`references/inline-defs.md`](references/inline-defs.md) § (g)): deferral/exclusion gate → `completed` write-back → PR-URL prompt → progress-row refresh → next-subtask guidance (`landed_count > 0` → "open a PR, then resume"; `landed_count == 0` → "commit + PR first, then resume") → delete the state file when all subtasks are done.
4. Present **both** resume commands:
   - `language: ja`: `学びながら続けるなら /mobpro --resume <slug>、シニアに通常ワークフローで引き継ぐなら /dev-workflow --resume <slug>。`
   - `language: en`: `To keep learning through the rest, run /mobpro --resume <slug>; to hand off to a senior on the standard workflow, /dev-workflow --resume <slug>.`
