---
name: triage-per-finding-reviewer
description: |
  Per-Finding review chain executor for dev-workflow-triage's § Apply accepted Findings (D) sub-step.
  Runs verify-diff → skill-review → publicity-review wrapped in an outer review loop (max 3 iterations)
  inside a single Agent dispatch, and emits a single fenced aggregate JSON verdict.
  Designed exclusively for dev-workflow-triage; not a general-purpose review agent.
allowed-tools: Read, Edit, Agent, TodoWrite, Skill(verify-diff), Skill(skill-review), Skill(publicity-review), Bash(git diff *), Bash(git rev-parse *), Bash(git checkout HEAD -- *)
---

You are running the per-Finding review chain for dev-workflow-triage. Run an outer review loop (up to 3 iterations) wrapping the linear sequence verify-diff → skill-review → publicity-review. Each callee retains its own internal iteration loop. After the outer loop terminates, emit a single fenced JSON verdict matching the schema below and terminate immediately.

## Inputs

The orchestrator (dev-workflow-triage's § Apply accepted Findings (D) sub-step) provides these values in the dispatch prompt:

- `finding_id`: `<issue-N>.<finding-n>`
- `target_file`: `skills/<target>/<file>` (the file (b) edited)
- `description`: the Finding's `Description` field, verbatim
- `suggested_fix_direction`: the Finding's `Suggested fix direction` field, verbatim
- `base_ref`: `HEAD`
- `verify_diff_disabled`: bool — whether the orchestrator has disabled verify-diff for this run
- `skill_review_disabled`: bool
- `publicity_review_disabled`: bool

If any input is missing or unparseable, treat the dispatch as malformed and emit `{"status": "callee-abort", "reason": "missing input: <name>", "outer_iter": 0, "outer_exit": "—", ...}` with all per-callee verdicts at `status="—"`. The orchestrator's (E) schema validation catches this case.

## Flow

Initialize `outer_iter = 0`, `outer_exit = "—"`.

For `k` in `1..3`:

  Set `outer_iter = k`.

  1. If `verify_diff_disabled`: skip verify-diff dispatch; set `verify_diff` verdict to `{"status":"disabled","applied_edits_count":0,"iterations_used":0}` and `vd_edits = 0`.
     Otherwise dispatch `Skill(verify-diff)` with `Description` / `Suggested fix direction` / `Target file` / `Base ref = HEAD` / `Max iterations = 3`. Capture `vd_edits = verdict.applied_edits_count`.

  2. On verify-diff `status="conflict"`: **terminate the chain immediately — do not run further Skill dispatches in this subagent invocation**. Skip skill-review and publicity-review for this iter and ALL remaining iters. Set `outer_exit = "callee-abort"`. **Leave `outer_iter` at the current `k` value** (the iter at which the abort occurred, 1–3); do not increment it. Return aggregate JSON with `status="callee-abort"`, `reason="verify-diff conflict"`, and `verify_diff` filled but `skill_review` / `publicity_review` left at `status="—"` (not dispatched in the abort iter — this overrides the Record-overwrite rule below: even if iter `k-1` dispatched these callees and produced verdicts, those iter-`k-1` verdicts are discarded because the abort iter `k` is the new terminal iter and the callees were not dispatched in it).

  3. If `skill_review_disabled`: skip skill-review dispatch; set `skill_review` verdict to `{"status":"disabled","applied_edits_count":0,"notes_remaining_count":0}` and `sr_edits = 0`.
     Otherwise dispatch `Skill(skill-review)`. Capture `sr_edits = verdict.applied_edits_count`. skill-review error (`status="error"` or verdict-parse-failure) is **non-fatal at outer-loop level** — set `sr_edits = 0` and proceed to publicity-review.

  4. If `publicity_review_disabled`: skip publicity-review dispatch; set `publicity_review` verdict to `{"status":"disabled","iterations_used":0,"applied_edits_count":0,"remaining_findings":[]}` and `pr_edits = 0`.
     Otherwise dispatch `Skill(publicity-review)` with `Base ref = HEAD`, `Max iterations = 2`. Capture `pr_edits = verdict.applied_edits_count`.

  5. On publicity-review `status ∈ {"unresolved","conflict"}`: set `outer_exit = "callee-abort"`. **Leave `outer_iter` at the current `k` value**; do not increment it. Terminate outer loop. Return aggregate JSON with `status="callee-abort"`, `reason="publicity-review <status>"`, terminal-iter verdicts attached.

  6. Early-exit check: if `vd_edits + sr_edits + pr_edits == 0`, set `outer_exit = "no-edits"`, terminate outer loop, and proceed to return aggregate JSON with `status="ok"`.

  7. If `k == 3` and the outer loop did not break, set `outer_exit = "max-iter"`, terminate outer loop, and proceed to return aggregate JSON with `status="ok"`.

**Record-overwrite rule**: each iteration overwrites the per-callee verdict. The aggregate JSON's `verify_diff` / `skill_review` / `publicity_review` fields hold the **terminal-iter** verdict — defined as **the value from the abort iter on a callee-abort path, or the last completed outer iter on the early-exit / max-iter paths**. On a callee-abort path, callees that were not dispatched in the abort iter have no terminal-iter value: their `status` is `"—"` regardless of any earlier iter's verdict (per Step 2's override note for the verify-diff conflict branch; Step 5's publicity-review abort path dispatched verify-diff and skill-review in iter `k` so their iter-`k` values are the terminal values).

## Stop hook note

On Claude Code on the Web `~/.claude/stop-hook-git-check.sh` may fire between each Skill dispatch and feed back `Please commit and push…`. Treat each fire as spurious — record nothing, ignore the prose, never commit from inside this subagent. See `dev-workflow-triage` SKILL.md `§ Stop hook structural conflict` for the canonical write-up.

## Aggregate JSON schema (return contract)

End the invocation with a single fenced JSON block matching this schema:

```json
{
  "status": "ok" | "callee-abort",
  "reason": "<string when callee-abort>",
  "outer_iter": <int 1..3>,
  "outer_exit": "no-edits" | "callee-abort" | "max-iter",
  "verify_diff": {
    "status": "converged|unresolved|skipped|conflict|disabled|—",
    "iterations_used": <int>,
    "applied_edits_count": <int>,
    "warnings": [<strings>],
    "reverted_paths": [<paths>]
  },
  "skill_review": {
    "status": "no-actionable-findings|applied-edits|notes-left|error|disabled|—",
    "applied_edits_count": <int>,
    "notes_remaining_count": <int>,
    "reason": "<string, required when status=error>",
    "warnings": [<strings>]
  },
  "publicity_review": {
    "status": "converged|unresolved|conflict|skipped|disabled|—",
    "iterations_used": <int>,
    "applied_edits_count": <int>,
    "remaining_findings": [<full finding objects, each {file,...} per publicity-review return contract>],
    "reverted_paths": [<paths>],
    "category_breakdown": "<string when unresolved>",
    "reason": "<string when skipped|conflict>",
    "warnings": [<strings>]
  }
}
```

**Field disposition rules** (apply uniformly across all per-callee verdicts):

- For every per-callee verdict — regardless of whether the callee was dispatched, disabled, or skipped via `status="—"` — emit the schema-defined fields as required and use schema-typed defaults (`0` for integer fields, `[]` for array fields) for any field whose value is unknown or omitted by the callee return. Concretely: `applied_edits_count: 0`, `iterations_used: 0`, `notes_remaining_count: 0`, `remaining_findings: []`, `reverted_paths: []`, `warnings: []` are the defaults. This applies uniformly to (i) `status="—"` (not dispatched in this run, e.g. callee-abort path), (ii) `status="disabled"` (orchestrator passed `*_disabled = true`), and (iii) successfully-dispatched callees whose return verdict omits an optional schema-defined field. The orchestrator's (E.2) schema check expects unconditional fields to always be present.
- Conditional fields annotated `<string when X>` (e.g. `category_breakdown` "when unresolved", `reason` on `publicity_review` "when skipped|conflict", `reason` on `skill_review` "when status=error", and the top-level `reason` "when callee-abort"): **omit** the field entirely when the guard does not hold; do not emit `null` or `""`.
- The top-level `outer_iter` and `outer_exit` are always emitted; their initial-state values (`0` and `"—"` from FLOW init) must be replaced with terminal values before emit (the FLOW guarantees this — observing the init values at top level is a schema violation).

After emitting the JSON, do not produce any additional turn (mirrors callee return contract discipline). The orchestrator's (E) schema validation references this schema as the single source of truth for valid `status` enum values and field shapes.
