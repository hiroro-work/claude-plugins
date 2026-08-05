# Tier assessment

Deep reference for the difficulty tier: the criteria, the lane the tier selects, the skip matrix it drives, and the one-way escalation that corrects a misjudgement. `SKILL.md` **Step 1.5: Task Decomposition** reads this file and runs § Resolution procedure; § Escalation states the two invariants every run relies on and points at `references/tier-escalation.md`, which `SKILL.md` Step 2's **Confirm difficulty** sub-step and `references/step5-implement.md`'s "Tier escalation checkpoint" sub-step read only when an escalation actually fires. Unqualified `§ Configuration` / `§ Step N` / `§ No-Stall Principle` references and `sub-step N` references resolve to `SKILL.md`.

The tier is resolved **before the plan exists**, from the effective task text plus cheap primary-source probes (reading a file the task names, grepping an identifier it names). Judging on thinner evidence is bounded by § Escalation's one-way invariant, which only ever raises the tier.

## Lanes

The tier selects one of two lanes. **express** = Trivial or Simple; **full** = Moderate or Complex. **Source of truth: this section; keep in sync.** Membership = every site that branches on the lane **or restates its difference set**, including this skill's `README.md` § Express lane and the tier table its § Configuration section carries. A branch site says only which lane it is on and points here — the set of differences lives in this table, not at the branch sites.

| | express | full |
| --- | --- | --- |
| Step 1.5 decomposition proposal (Normal sub-mode) | skipped, and neither `references/task-decomposition.md` nor `references/task-decomposition-normal.md` is read — the tier **overrides** § B's judgment rather than predicting its outcome | § B runs |
| Step 2 plan authoring | `references/step2-create-plan.md` § Compact plan template — `references/plan-authoring.md` is not read | `references/plan-authoring.md` § Template |
| Step 2 Simplicity self-audit | `references/simplicity-self-audit-express.md` alone | that file plus `references/simplicity-self-audit.md` |
| Steps skipped outright | the four in § Difficulty-skip matrix | none |
| Step 3 (Plan Review) / Step 8 (Code Review) | skipped on Trivial only | run |
| Step 4 (Finalize Plan) approval surface | chat approval on Trivial only — `references/visual-plan-review.md` is not read | the visual gate |

Resume sub-mode always reads `references/task-decomposition-resume.md` § A. Resume sub-mode — the effective task is a subtask the state file holds, so the tier cannot be judged before that file is read. On the **full lane in Normal sub-mode** the ordering runs the other way: the tier was assessed against the whole request, and when § B then decomposes and hands subtask 1 to this same invocation, that subtask keeps the parent request's tier. Deliberately conservative — a subtask of a Complex request gets Complex apparatus — and § Escalation's one-way invariant forbids lowering it.

## Tier criteria

**Trivial** — a self-evident, low-risk change with one obviously correct fix: a typo fix, a one-line edit, a config value change, or a mechanical multi-site edit that applies the same clearly-correct replacement everywhere (a version bump, a rename with one unambiguous target). Sets `plan_review_enabled = false` and `code_review_enabled = false`, so Step 3 (Plan Review) and Step 8 (Code Review) are skipped entirely; the Step 4 plan-approval gate and Step 7's `check_commands` / `test_commands` remain the safety net. **Tie-break**: escalate to Simple or above only when the change requires an actual judgment call — more than one plausible approach, behavior-affecting logic where a subtle mistake could slip through unnoticed, or genuine ambiguity about the correct fix. Do not escalate merely because the change spans several lines, files, or modules when the fix itself is mechanical and identical across every site (a version bump touching manifests in several modules stays Trivial). The external-library major-bump exception described under Simple applies here too — such a change is never Trivial.

**Simple** — a straightforward bug fix or small feature addition with an obvious, pattern-following solution and no new design decisions, spanning one or several files or call sites within a single module. It is more than the mechanical, uniform edit that qualifies as Trivial, so a lone typo or one clearly-correct multi-site replacement belongs in Trivial, not here. Leaves `plan_review_enabled` / `code_review_enabled` as they stand — both review phases run their single pass — **unless** the change touches an external library's config file or type-level API AND that library had a recent major-version bump (primary check: `git diff HEAD` of the package manifest — Step 2 has not yet recorded `<base-commit>`, and nothing commits between here and there, so `HEAD` is the same commit; if the manifest is unchanged in the working tree, judge from other context, since the bump may predate this run); then classify as at least Moderate. Similar qualitative risks (external config-DSL rewrites, etc.) follow the same rule. Purely cosmetic edits (comments, whitespace, auto-formatting) do not trigger the exception — use judgment.

**Moderate** — a change that requires at least one genuine design decision, even if it otherwise follows existing patterns, or spans multiple modules. A multi-file change that applies one uniform, pattern-following edit with no new design decisions stays in **Simple** regardless of file count — the exception is scoped to file count within a single module; the same edit applied across multiple modules still escalates via the "or spans multiple modules" clause **when it would otherwise have qualified as Simple**. That clause governs the Simple↔Moderate boundary only and does not reach back to narrow Trivial's mechanical-uniform-edit tie-break above, which already tolerates multi-module spread. Nothing is lowered.

**Complex** — cross-module, new patterns, API changes, significant refactoring. Nothing is lowered.

File count is a hint, not the sole criterion. **Only Trivial changes either review flag**; the other tiers leave both as configured (§ Configuration's `plan_review` / `code_review` bullets), and the two are lowered independently.

## Resolution procedure

Run this once, at Step 1.5, on the effective task. It writes every piece of cross-step state the tier governs.

1. **Assess the tier** against § Tier criteria.
2. **Lower the review phases**: on Trivial set both `plan_review_enabled` and `code_review_enabled` to `false`; on any other tier leave both as Step 1 sub-step 4's review-phase resolution left them. A phase already turned off by config leaves nothing to mark at any tier — its rows were registered `completed` at Step 1 (`references/step1-load-settings.md` § Sub-step 7's registration-mechanics case (ii)).
3. **Apply `--fast` plan-phase forcing**: when `fast_mode_active` and the assessed tier is **not** Trivial, set `plan_review_enabled = false`. `code_review_enabled` is untouched — fast mode skips the plan phase only. When the tier **is** Trivial, fast mode changes nothing (Trivial already turned both off). Fast mode never touches `subagent_model` or § Difficulty-skip matrix, both of which keep reading the assessed tier unmodified.
4. **Mark the rows** per § Row marking.
5. **Resolve `subagent_model`**: set it to the merged-config `subagent_model` map entry for the lowercased assessed tier name (`trivial` / `simple` / `moderate` / `complex`) when that key is present and valid, else the built-in default for that tier (`sonnet` for Trivial / Simple, `inherit` for Moderate / Complex), else `inherit`. A resolved value of `inherit` means downstream dispatches omit the `model`.
6. **Log it** per § Difficulty log line.

## Difficulty-skip matrix

Keyed on the assessed tier alone, with no config flag: the **express** lane skips **Step 6 (Tidy)**, **Step 6.5 (Polish Prose)**, **Step 7.5 (Rules Compliance Review)**, and **Step 11 (Update Rules)**; the full lane skips none of them. At the express tiers the cleanup pass, the prose-polish pass, the rules-compliance walk, and the rule-extraction pass are all low-yield, and on Simple, Step 8's review pass takes over as the run's primary rules-compliance defense in Step 7.5's place (see Step 7.5's "Responsibility scope" paragraph). Step 4's plan-approval gate and Step 7's `check_commands` / `test_commands` remain the safety net at both tiers.

**Step 9 (Completion Hooks), Step 11.5 (Self-Retrospective), and Step 11.6 (Workability Retrospective) are never matrix-skipped at any tier.** Each is governed by per-project configuration — `hooks.on_complete`'s open callee list, `self_retrospective.feedback`'s destination, `workability_retrospective.enabled` — so tier-gating them would make the same tier produce different outcomes across projects. This is `references/simplicity-self-audit.md`'s **Conditional-skip set external-config exclusion** applied to this matrix. Step 11 (Update Rules) is in the set because its action is skill-internal: only the directories it writes to are configurable, not whether it extracts.

## Row marking

Mark every row the tier skips `completed` here. Entry-side handling is not this section's — each such row is recognized at its own step by `SKILL.md` § Step 1 registration mechanics' **Pre-completed row guard**.

- **Trivial turns both review phases off**: mark the top-level `Step 3: Plan Review` and `Step 8: Code Review` rows AND the `Step 8-1` row `completed`.
- **`--fast` forced `plan_review_enabled = false` on a non-Trivial tier**: mark the top-level `Step 3: Plan Review` row `completed` and leave `Step 8: Code Review` / `Step 8-1` untouched. **Only when `plan_review_enabled` was `true` before the forcing**, append `Step 3 Plan Review skipped (fast mode)` to `fast_mode_skipped_steps` — a plan phase already configured `false` was not skipped by fast mode, and a configured `false` raises no reminder at all (§ Configuration's `plan_review` bullet).
- **Express lane**: mark the top-level `Step 6: Tidy`, `Step 6.5: Polish Prose`, `Step 7.5: Rules Compliance Review`, and `Step 11: Update Rules` rows `completed`, and append one record per row to `difficulty_skipped_steps` — e.g. for a Simple-tier run, `Step 6 Tidy skipped (Simple tier)` / `Step 6.5 Polish Prose skipped (Simple tier)` / `Step 7.5 Rules Compliance Review skipped (Simple tier)` / `Step 11 Update Rules skipped (Simple tier)`, substituting the actual assessed tier — so § Completion's difficulty-skip reminder can render it and the skip is never silent.
- **`--fast` Step 6.5-only skip**: when `fast_mode_active` and Step 6.5's row is not already `completed` by the matrix above (a Moderate or Complex assessment), mark the top-level `Step 6.5: Polish Prose` row `completed` and append `Step 6.5 Polish Prose skipped (fast mode)` to `fast_mode_skipped_steps`. When the matrix already completed it, do nothing further — avoid a double record.

The `Step 11.5: Self-Retrospective` and `Step 11.6: Workability Retrospective` rows are never marked here (see § Difficulty-skip matrix's second paragraph), and neither is `Step 9: Completion Hooks`.

## Difficulty log line

Log the assessed difficulty and the resolved review phases in the resolved `language` (§ Configuration; default `ja`) — naming each phase from **its own cause**, composing the two clauses independently, so a standing project setting is never announced as a fast-mode skip (the same precedence `references/plan-format.md` § Step 4 guidance lines' "Disabled-plan-phase conditional" paragraph applies). Naming the assessed tier on every form keeps a major-version-bump escalation to Moderate / Complex visible even when fast mode overrides the plan phase, since the escalation still governs `subagent_model` and § Difficulty-skip matrix, which fast mode does not touch. Paired bilingual samples (runtime rendering demonstration):

- Both phases run — `language: ja`: `難易度: Moderate — Step 3（Plan Review）と Step 8（Code Review）を実施します`; `language: en`: `Difficulty: Moderate — Step 3 (Plan Review) and Step 8 (Code Review) will run`
- Trivial turned both off — `language: ja`: `難易度: Trivial — Step 3（Plan Review）と Step 8（Code Review）を skip します`; `language: en`: `Difficulty: Trivial — Step 3 (Plan Review) and Step 8 (Code Review) are skipped`
- `--fast` forced the plan phase off — `language: ja`: `難易度: Moderate — fast モードにより Step 3（Plan Review）を skip し、Step 8（Code Review）を実施します`; `language: en`: `Difficulty: Moderate — fast mode skips Step 3 (Plan Review); Step 8 (Code Review) will run`
- The plan phase was already configured off — `language: ja`: `難易度: Moderate — Step 3（Plan Review）は設定により無効です。Step 8（Code Review）を実施します`; `language: en`: `Difficulty: Moderate — Step 3 (Plan Review) is turned off by configuration; Step 8 (Code Review) will run`

## Escalation

Two invariants hold on every run, whether or not an escalation ever fires — the rest of this file's readers rely on them, so they stay here:

- **The tier only ever rises**; there is no de-escalation path. (Why that costs nothing is in this skill's `README.md` § Express lane.)
- **The decomposition decision is not reopened** — § Lanes' first row is the one deferral escalation never recovers. A task that escalates far enough to have wanted a split records that as a Risks entry instead. (Rationale: this skill's `README.md` § Express lane.)

The procedure itself — the closed list of three tier-change sites, and what an escalation does in order — is in [`tier-escalation.md`](tier-escalation.md). **Read that file only when an escalation is actually being performed**: `SKILL.md` Step 2's **Confirm difficulty** sub-step or [`step5-implement.md`](step5-implement.md)'s "Tier escalation checkpoint" sub-step has re-assessed the tier as strictly higher, or [`step4-finalize-plan.md`](step4-finalize-plan.md) § Sub-step 3's express-lane re-activation has fired.
