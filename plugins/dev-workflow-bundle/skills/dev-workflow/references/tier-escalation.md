# Tier escalation

The one-way correction that raises a misjudged difficulty tier. Split out of [`tier-assessment.md`](tier-assessment.md) — which Step 1.5 reads on **every** run — because this procedure only matters once an escalation checkpoint actually fires, which is rare. Read this file at that moment, not before.

Unqualified `§ Tier criteria` / `§ Resolution procedure` / `§ Lanes` / `§ Difficulty-skip matrix` / `§ Row marking` references resolve to [`tier-assessment.md`](tier-assessment.md); unqualified `§ Configuration` / `§ Step N` references resolve to `SKILL.md`. The two invariants this procedure upholds — the tier never falls, and the decomposition decision is never reopened — are stated in `tier-assessment.md` § Escalation, which every run reads before any escalation can fire.

## Tier-change sites (closed list of 3)

Two are **escalation checkpoints** this file owns end to end — re-assess against § Tier criteria and act only when the new assessment is strictly higher than the current tier:

- **Step 2's Confirm difficulty sub-step**, once the plan body is drafted — before any code is written.
- **[`step5-implement.md`](step5-implement.md)'s "Tier escalation checkpoint" sub-step**, once every planned edit has landed — the point where an implementation that outgrew its plan surfaces.

The third is a **re-derivation site owned elsewhere**: [`step4-finalize-plan.md`](step4-finalize-plan.md) § Sub-step 3's express-lane re-activation, when a `rewrite-approach` material change lands on an express-lane plan. It re-runs § Resolution procedure in full rather than taking the incremental path below (the ledgers are rebuilt from scratch, not amended), **clamps the result upward to `max(pre-rewrite tier, new assessment)`** so this site cannot lower the tier either, and then applies this file's **Read what the express lane deferred** step when the clamped tier leaves the express lane. It is named here so this list stays the complete set of places the tier can change.

## What an escalation does

In order:

1. Set the tier to the new assessment, reset `difficulty_skipped_steps = []` and `fast_mode_skipped_steps = []`, and re-run § Resolution procedure **steps 2–5 in full** — the same in-full re-run the third site above takes, and for the same reason: step 4 owns both `--fast` row-marking bullets, so skipping it would reverse a row `--fast` still wants skipped and leave its ledger entry unwritten. `plan_review_enabled` / `code_review_enabled` come out **re-derived from config and the new tier** rather than raised in place (one of the two exceptions to their monotonic-lowering invariant — [`step1-load-settings.md`](step1-load-settings.md) § Sub-step 4 — review-phase resolution), `subagent_model` is re-resolved, and both ledgers are rebuilt from scratch so no record keeps the old tier's token. This is the sole revision of § Configuration's "resolved once" reading: the value is resolved once per tier, and a tier change is what re-resolves it.
2. **Reverse the row marking, forward of the checkpoint only**: for every row that was `completed` as a skip before this escalation and that **step 1's re-run left unmarked** — the clean test, since the re-run has already re-marked everything the new tier and `--fast` still skip, ledger entries included — set it back to `pending`, provided **its step has not yet been passed**. That last qualifier is load-bearing at the Step 5 checkpoint: `Step 3: Plan Review` sits behind the run there, so it stays `completed` — reopening it would strand a `pending` row for the rest of the run, and the plan is instead brought up to shape by step 3 below, which is what Step 8's reviewer reads. `Step 8: Code Review` and its `Step 8-1` row are forward of both checkpoints and do return to `pending`, which is the Step 5 checkpoint's whole purpose.
3. **Read what the express lane deferred**: when leaving the express lane, read [`simplicity-self-audit.md`](simplicity-self-audit.md) and re-run the full audit against the plan, and read [`plan-authoring.md`](plan-authoring.md) and bring the plan up to its § Template shape (an escalation at the Step 5 checkpoint does this too — the plan is the record Step 8's reviewer reads). Its § Step 2 self-check re-runs **only at the Step 2 checkpoint**, where the plan is still the thing under review; at the Step 5 checkpoint the implementation has landed, so re-checking the plan's authoring shape would change nothing the run can still act on.
4. Emit a one-line note in the resolved `language` naming the old tier, the new tier, and the checkpoint that raised it, so the change is never silent. Paired bilingual samples (runtime rendering demonstration):
   - `language: ja`: `難易度を Simple から Moderate へ引き上げました（Step 2 の Confirm difficulty） — Step 6（Tidy）/ Step 6.5（Polish Prose）/ Step 7.5（Rules Compliance Review）/ Step 11（Update Rules）を実施対象に戻します`
   - `language: en`: `Difficulty raised from Simple to Moderate (Step 2's Confirm difficulty) — Step 6 (Tidy) / Step 6.5 (Polish Prose) / Step 7.5 (Rules Compliance Review) / Step 11 (Update Rules) return to the run`
   Name whatever step 2 actually reopened: out of Trivial the list also carries Step 3 (Plan Review) and Step 8 (Code Review), and under `--fast` it carries neither Step 3 nor Step 6.5.
5. Resume from the point the checkpoint sits at. An escalation at Step 2 continues into Step 3 (Plan Review) if the re-derived `plan_review_enabled` is now `true`; one at Step 5 continues into Step 6 (Tidy), whose row step 2 has just returned to `pending`.

**A row already `completed` because its step ran is never reopened** — escalation returns skipped rows to the run, not finished ones. This bounds step 2 above; the two run-wide invariants stay in `tier-assessment.md` § Escalation.
