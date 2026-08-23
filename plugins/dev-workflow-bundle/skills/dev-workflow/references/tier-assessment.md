# Tier assessment

Deep reference for the difficulty tier: the criteria, the lane the tier selects, the skip matrix it drives, and the one-way escalation that corrects a misjudgement. Unqualified `§ Configuration` / `§ Step N` / `§ No-Stall Principle` references and `sub-step N` references resolve to `SKILL.md`.

The tier is resolved **before the plan exists**, from the effective task text plus cheap primary-source probes (reading a file the task names, grepping an identifier it names).

## Lanes

The tier selects one of two lanes. **express** = Trivial or Simple; **full** = Moderate or Complex.

| | express | full |
| --- | --- | --- |
| Step 1.5 decomposition proposal (Normal sub-mode) | skipped, and neither `references/task-decomposition.md` nor `references/task-decomposition-normal.md` is read — the tier **overrides** § B's judgment rather than predicting its outcome | § B runs |
| Step 2 plan authoring | `references/step2-create-plan.md` § Compact plan template — `references/plan-authoring.md` is not read | `references/plan-authoring.md` § Template |
| Step 2 Simplicity self-audit | `references/simplicity-self-audit-express.md` alone | that file plus `references/simplicity-self-audit.md` |
| Steps skipped outright | the four in § Difficulty-skip matrix | none |
| Step 3 (Plan Review) / Step 8 (Code Review) | skipped on Trivial only | run, subject to the run mode for the plan phase (§ Resolution procedure step 2) |
| Step 4 (Finalize Plan) approval surface | chat approval on Trivial only — `references/visual-plan-review.md` is not read | the visual gate |

Resume sub-mode always reads `references/task-decomposition-resume.md` § A. Resume sub-mode. On the **full lane in Normal sub-mode** the ordering runs the other way: the tier was assessed against the whole request, and when § B then decomposes and hands subtask 1 to this same invocation, that subtask keeps the parent request's tier.

## Tier criteria

**Trivial** — a self-evident, low-risk change with one obviously correct fix: a typo fix, a one-line edit, a config value change, or a mechanical multi-site edit that applies the same clearly-correct replacement everywhere (a version bump, a rename with one unambiguous target). Sets `plan_review_enabled = false` and `code_review_enabled = false` regardless of the run mode, so Step 3 (Plan Review) and Step 8 (Code Review) are skipped entirely. **Tie-break**: escalate to Simple or above only when the change requires an actual judgment call — more than one plausible approach, behavior-affecting logic where a subtle mistake could slip through unnoticed, or genuine ambiguity about the correct fix. Do not escalate merely because the change spans several lines, files, or modules when the fix itself is mechanical and identical across every site (a version bump touching manifests in several modules stays Trivial). The external-library major-bump exception described under Simple applies here too — such a change is never Trivial.

**Simple** — a straightforward bug fix or small feature addition with an obvious, pattern-following solution and no new design decisions, spanning one or several files or call sites within a single module. It is more than the mechanical, uniform edit that qualifies as Trivial, so a lone typo or one clearly-correct multi-site replacement belongs in Trivial, not here. Leaves `plan_review_enabled` / `code_review_enabled` as they stand — both review phases run their single pass — **unless** the change touches an external library's config file or type-level API AND that library had a recent major-version bump (primary check: `git diff HEAD` of the package manifest; if the manifest is unchanged in the working tree, judge from other context — the bump may predate this run); then classify as at least Moderate. Similar qualitative risks (external config-DSL rewrites, etc.) follow the same rule. Purely cosmetic edits (comments, whitespace, auto-formatting) do not trigger the exception — use judgment.

**Moderate** — a change that requires at least one genuine design decision, even if it otherwise follows existing patterns, or spans multiple modules. A multi-file change that applies one uniform, pattern-following edit with no new design decisions stays in **Simple** regardless of file count — the exception is scoped to file count within a single module; the same edit applied across multiple modules still escalates via the "or spans multiple modules" clause **when it would otherwise have qualified as Simple**. That clause governs the Simple↔Moderate boundary only and does not reach back to narrow Trivial's mechanical-uniform-edit tie-break above. Nothing is lowered.

**Complex** — cross-module, new patterns, API changes, significant refactoring. Nothing is lowered.

File count is a hint, not the sole criterion. **Only Trivial changes either review flag**; the other tiers leave both as Step 1 sub-step 4 resolved them — the plan phase from the run mode, the code phase from § Configuration's `code_review` bullet — and the two are lowered independently.

## Resolution procedure

Run this once, at Step 1.5, on the effective task. It writes every piece of cross-step state the tier governs.

1. **Assess the tier** against § Tier criteria.
2. **Lower the review phases**: on Trivial set both `plan_review_enabled` and `code_review_enabled` to `false`; on any other tier leave both as Step 1 sub-step 4's review-phase resolution left them. The tier is the **only** thing that lowers a phase here — the run mode already settled the plan phase at Step 1 sub-step 4. A phase already turned off at Step 1 leaves nothing to mark at any tier — its rows were registered `completed` there (`references/step1-load-settings.md` § Sub-step 7's registration-mechanics case (ii)). The run mode never touches `subagent_model` or § Difficulty-skip matrix, both of which read the assessed tier alone.
3. **Mark the rows** per § Row marking.
4. **Resolve `subagent_model`**: set it to the merged-config `subagent_model` map entry for the lowercased assessed tier name (`trivial` / `simple` / `moderate` / `complex`) when that key is present and valid, else the built-in default for that tier (`sonnet` for Trivial / Simple, `inherit` for Moderate / Complex), else `inherit`. A resolved value of `inherit` means downstream dispatches omit the `model`.
5. **Log it** per § Difficulty log line.

## Difficulty-skip matrix

Keyed on the assessed tier alone, with no config flag: the **express** lane skips **Step 6 (Tidy)**, **Step 6.5 (Polish Prose)**, **Step 7.5 (Rules Compliance Review)**, and **Step 11 (Update Rules)**; the full lane skips none of them. Step 4's plan-approval gate and Step 7's `check_commands` / `test_commands` remain the safety net at both tiers.

**Step 9 (Completion Hooks), Step 11.5 (Self-Retrospective), and Step 11.6 (Workability Retrospective) are never matrix-skipped at any tier.** Each is governed by per-project configuration — `hooks.on_complete`'s open callee list, `self_retrospective.feedback`'s destination, `workability_retrospective.enabled`. Step 11 (Update Rules) is in the matrix set instead: only the directories it writes to are configurable, not whether it extracts.

## Row marking

Mark every row the tier skips `completed` here. Entry-side handling is not this section's — each such row is recognized at its own step by `SKILL.md` § Step 1 registration mechanics' **Pre-completed row guard**.

- **Trivial turns both review phases off**: mark the top-level `Step 3: Plan Review` and `Step 8: Code Review` rows AND the `Step 8-1` row `completed`.
- **`run_mode == "fast"` on a non-Trivial tier**: the `Step 3: Plan Review` row was already registered `completed` at Step 1 (`SKILL.md` § Step 1 registration mechanics' disabled-phase clause), so nothing is marked here — append `Step 3 Plan Review skipped (fast mode)` to `fast_mode_skipped_steps` and leave `Step 8: Code Review` / `Step 8-1` untouched. **On the Trivial tier append nothing**: the tier would have turned the phase off anyway, and the Trivial bullet above already accounts for that row (§ Difficulty log line's "naming each phase from **its own cause**" rule).
- **Express lane**: mark the top-level `Step 6: Tidy`, `Step 6.5: Polish Prose`, `Step 7.5: Rules Compliance Review`, and `Step 11: Update Rules` rows `completed`, and append one record per row to `difficulty_skipped_steps` — e.g. for a Simple-tier run, `Step 6 Tidy skipped (Simple tier)` / `Step 6.5 Polish Prose skipped (Simple tier)` / `Step 7.5 Rules Compliance Review skipped (Simple tier)` / `Step 11 Update Rules skipped (Simple tier)`, substituting the actual assessed tier.
- **`fast` run mode's Step 6.5-only skip**: when `run_mode == "fast"` and **this run of § Row marking** did not itself mark Step 6.5's row `completed` via the express-lane bullet above — i.e. the tier being marked here is Moderate or Complex — mark the top-level `Step 6.5: Polish Prose` row `completed` and append `Step 6.5 Polish Prose skipped (fast mode)` to `fast_mode_skipped_steps`. Evaluate that against **this** run's marking, never against the row's pre-existing state: on an escalation re-run out of the express lane the row is still `completed` from the pre-escalation marking, and reading that as "the matrix already handled it" would skip both the re-mark and the ledger append — after which [`tier-escalation.md`](tier-escalation.md) § What an escalation does step 2 finds the row unmarked by this re-run and reopens it, running Step 6.5 under the `fast` run mode. When this run's express-lane bullet did mark it, do nothing further — avoid a double record.

The `Step 11.5: Self-Retrospective` and `Step 11.6: Workability Retrospective` rows are never marked here (see § Difficulty-skip matrix's second paragraph), and neither is `Step 9: Completion Hooks` or `Step 8.5: Deferred Verification` — the latter is gated on `review_fix_files`, not on the tier. Only that step's gate-2 rules-review stands down at the express tiers, by its own condition.

## Difficulty log line

Log the assessed difficulty and the resolved review phases in the resolved `language` (§ Configuration; default `ja`) — naming each phase from **its own cause**, composing the two clauses independently, so the tier's own cutoff is never announced as a run-mode skip (the same precedence `references/plan-format.md` § Step 4 guidance lines' "Disabled-plan-phase conditional" paragraph applies). Name the assessed tier on every form, and name the plan phase's **scope** whenever that phase runs. Paired bilingual samples (runtime rendering demonstration):

- Both phases run, `normal` run mode — `language: ja`: `難易度: Moderate — Step 3（Plan Review）を rules-only スコープで実施し、Step 8（Code Review）も実施します`; `language: en`: `Difficulty: Moderate — Step 3 (Plan Review) will run at rules-only scope, and Step 8 (Code Review) will run`
- Both phases run, `deep` run mode — `language: ja`: `難易度: Moderate — deep モードにより Step 3（Plan Review）を full スコープで実施し、Step 8（Code Review）も実施します`; `language: en`: `Difficulty: Moderate — deep mode runs Step 3 (Plan Review) at full scope, and Step 8 (Code Review) will run`
- Trivial turned both off — `language: ja`: `難易度: Trivial — Step 3（Plan Review）と Step 8（Code Review）を skip します`; `language: en`: `Difficulty: Trivial — Step 3 (Plan Review) and Step 8 (Code Review) are skipped`
- `fast` run mode turned the plan phase off — `language: ja`: `難易度: Moderate — fast モードにより Step 3（Plan Review）を skip し、Step 8（Code Review）を実施します`; `language: en`: `Difficulty: Moderate — fast mode skips Step 3 (Plan Review); Step 8 (Code Review) will run`

## Escalation

Two invariants hold on every run, whether or not an escalation ever fires:

- **The tier only ever rises**; there is no de-escalation path.
- **The decomposition decision is not reopened** — § Lanes' first row is the one deferral escalation never recovers. A task that escalates far enough to have wanted a split records that as a Risks entry instead.

The procedure itself — the closed list of three tier-change sites, and what an escalation does in order — is in [`tier-escalation.md`](tier-escalation.md). **Read that file only when an escalation is actually being performed**: `SKILL.md` Step 2's **Confirm difficulty** sub-step or [`step5-implement.md`](step5-implement.md)'s "Tier escalation checkpoint" sub-step has re-assessed the tier as strictly higher, or [`step4-finalize-plan.md`](step4-finalize-plan.md) § Sub-step 3's express-lane re-activation has fired.
