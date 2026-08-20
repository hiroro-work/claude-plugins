# Step 1 — Load Settings (extracted sub-steps 1 / 3 / 4 / 5 / 7 / 8 / 9)

Deep reference for `SKILL.md` **Step 1: Load Settings**. Unqualified `§ Configuration` / `§ Step N` / `§ No-Stall Principle` references and `sub-step N` references resolve to `SKILL.md`.

## Sub-step 1 — Overlay / merge procedure

1. Read settings from up to three layers and merge (type-aware):
   ```
   merged = {}
   if ~/.claude/dev-workflow.local.md exists:  overlay its frontmatter onto merged
   if .claude/dev-workflow.md exists:          overlay its frontmatter onto merged
   if .claude/dev-workflow.local.md exists:    overlay its frontmatter onto merged
   ```
   "Overlay" = for each key, evaluate the rules below in order and stop at the first match.
   - `null` or empty (`[]`, `{}`) explicitly clears the key — lower-layer value is discarded, not inherited, whatever type class the key falls under below
   - Key absent from the file: left untouched (inherit from lower layers)
   - Scalar keys: `merged[key] = file[key]` (replace) — this includes `subagent_model`, whose value is a map (`{<tier>: <model>}`): the whole map replaces the lower layer's value with no per-key cross-layer merge (a map key absent from the higher layer is not back-filled from the lower layer)
   - List keys (`check_commands`): append `file[key]` items after `merged[key]`, then deduplicate (keep first occurrence)
   - List-replace keys (`test_commands`): `merged[key] = file[key]` — the higher layer's whole list replaces the lower layer's (no item-level merge or dedup)
   - `hooks`: deep-merge — for each sub-key (e.g. `on_complete`), append and deduplicate the list
   If a file's YAML frontmatter is malformed (parse error), warn the user naming the file, skip that layer, and continue with remaining layers.

## Sub-step 5 — Parse remaining config keys

5. Parse `hooks` from config. Warn and ignore if `hooks.on_complete` has invalid format. For `plan_review` / `code_review`, emit the present-but-non-boolean warning as sub-step 4's review-phase resolution defines (sub-step 4 owns the fall-back-to-`true` per phase). Parse `custom_instructions` from config (optional, string). Warn and ignore if not a string. Parse `interactive_commits`, `commit_review_gate`, `implementation_executor`, `polish_prose`, and `subagent_model` from config — each key's default value and its warn-and-fall-back-on-invalid-value behavior is exactly as documented in its own § Configuration bullet; `implementation_executor` must resolve to one of the supported executor values listed in § Configuration's `implementation_executor` bullet or it warns and falls back to `main`, and when `--executor <value>` was passed on this invocation with a supported value it overrides that resolved executor while an invalid flag value warns and is ignored, and `subagent_model`'s validated merged map is consumed by Step 1.5's tier resolution. Parse `language` from config per the Configuration bullet above. For `~/.claude/settings.json`, silently accept missing file / absent key / `null` value; warn once per Step 1 settings-load pass on malformed JSON, non-string, or empty string. The resolved language is available to Step 11.5. **Language checkpoint**: immediately after resolving `language` here, emit a one-line informational note surfacing the resolved value (e.g. `Output language: ja`). Parse `self_retrospective.feedback` from config (optional, string). Warn and ignore if not a string or if empty string `""`. When `feedback` matches the `owner/repo` pattern (`^[\w.-]+/[\w.-]+$`), additionally run `gh auth status` as an early warning only — if auth fails, warn but do not block the run. Parse `workability_retrospective` from config (optional, nested map): `workability_retrospective.enabled` (optional, boolean, default `false`; warn and fall back to `false` if present but not a boolean) and `workability_retrospective.backlog_dir` (optional, string, default `.claude/improvements`; warn and fall back to the default if present but not a non-empty string). When `enabled` is not `true`, Step 11.6 is not registered (sub-step 7) and never executes. **Removed keys (tombstone)**: `diff_verbatim_line_threshold` / `diff_verbatim_threshold` / `diff_condensed_threshold` are no longer read (the diff-rendering thresholds are fixed constants in `references/diff-presentation.md` § Rendering ladder). If any of the three is still present in a merged layer, warn once naming them; presence is never an error

## Sub-step 4 — review-phase resolution

This section holds the full lifecycle both variables share.

| Variable | Init | Write sites | Read sites |
| --- | --- | --- | --- |
| `plan_review_enabled` | Step 1 sub-step 4, from config `plan_review` (default `true`) | Step 1.5's tier resolution (Trivial → `false`); `--fast` (→ `false`, see `references/tier-assessment.md` § Resolution procedure step 3); Step 4's `rewrite-approach` tier re-derivation and a tier escalation (both re-initializations — see the exception below) | Step 3's entry condition; the difficulty log line and the `fast_mode_skipped_steps` append condition (both in `references/tier-assessment.md`); Step 4 sub-step 1's completion verification; `references/plan-format.md` § Step 4 guidance lines' disabled-plan-phase conditional; `references/step4-finalize-plan.md` § Sub-step 3 — rewrite-approach bucket runtime (its "Exception — the plan phase held off by a standing choice" clause, which the visual gate's `rewrite-approach` return routes into, and its express-lane re-activation's row-clearing condition — the source of truth for that condition); [`tier-escalation.md`](tier-escalation.md) § What an escalation does step 2's review-phase row-reversal condition (mirrors it) |
| `code_review_enabled` | Step 1 sub-step 4, from config `code_review` (default `true`) | Step 1.5's tier resolution (Trivial → `false`); Step 4's `rewrite-approach` tier re-derivation and a tier escalation (both re-initializations) | Step 8's entry condition; Step 7's concurrent code-review launch condition; the Step 7.5 GATE's already-`completed`-row handling; `references/step4-finalize-plan.md` § Sub-step 3 — rewrite-approach bucket runtime's express-lane re-activation row-clearing condition (the source of truth for that condition); [`tier-escalation.md`](tier-escalation.md) § What an escalation does step 2's review-phase row-reversal condition (mirrors it) |

**Invariant — monotonic lowering within a run**: both variables only ever go `true → false`. Two exceptions **re-initialize** them from config and a newly assessed tier rather than raising an already-lowered value: Step 4's `rewrite-approach` bucket, which re-assesses the rewritten plan, and a tier escalation (`references/tier-escalation.md`), which re-assesses at either of its two checkpoints.

## Sub-step 8 — Context-compaction recovery

8. **Context-compaction recovery**: if the session context was compacted (prior turns summarized) before reaching this step in the current turn, re-read the configuration files from disk rather than relying on the summary — verify each step's skip conditions (e.g. whether `self_retrospective.feedback` is set, whether `workability_retrospective.enabled` is `true`, whether `hooks.on_complete` is configured, whether `interactive_commits` is `true`, whether `polish_prose` is `true`) from the actual merged config, not from compacted context. `fast_mode_active` cannot be recovered from disk this way — but it is inferable after the fact from the pre-completed Step 3 / Step 6.5 rows, the `fast_mode_skipped_steps` ledger, and the difficulty log line's fast-mode annotation.

## Sub-step 9 — Interruption re-anchoring

9. **Interruption re-anchoring**: if this invocation is a user-prompted continuation of a prior session that was interrupted (connection error, browser refresh, or similar — distinguished from compaction by the user explicitly asking to resume or continue rather than context being summarized in the same session), **and `--resume <state-file>` was not provided** (that path is handled by Step 1.5 Resume sub-mode), re-establish the run's current position before proceeding: (i) read the task list (`TaskList` / `TodoWrite` read) to identify the step currently marked `in_progress`, (ii) re-read the configuration files from disk (same as the "Context-compaction recovery" sub-step's procedure), and (iii) announce the resumption point to the user ("Resuming from Step N — <step description>") and proceed immediately from the `in_progress` step — do not wait for user confirmation. Do not re-execute already-`completed` steps.

## Sub-step 3 — reviewer availability probe

**Probe the resolved reviewer's availability immediately, regardless of whether it is the default `ask-peer` or a configured alternative**: attempt `Skill(<reviewer>)` with a one-word probe request (e.g., `ping`); if the call fails, retry once. If still failing, and **the resolved reviewer is `ask-peer` specifically**, append `ask-peer unavailable (reviewer, plan / code review)` to `bundle_skills_unavailable`. Either way, emit the three-option prompt defined in § Prerequisites' "Reviewer skill" bullet — do not block the run, present the options and let the user decide before the first review step begins.

## Sub-step 7 — registration mechanics

**Tool availability (Task tools vs `TodoWrite`)**: these steps name the Task tools (`TaskCreate` / `TaskUpdate` / `TaskList`). Where the Task tools are unavailable (e.g. the VSCode extension, or Claude Code before v2.1.142), use the equivalent `TodoWrite` operations instead — the status values (`pending` / `in_progress` / `completed`) and the register-all-upfront semantics are identical, and a `TaskList`-by-subject status read becomes a read of the `TodoWrite` list.

**Registration mechanics (Task tools)**: issue every `TaskCreate` in a single upfront burst (one tool-call batch). Two conditional cases: (i) **conditionally-omitted phases** (the list items carrying a condition) are omitted by **not issuing their `TaskCreate`**; (ii) **a review phase disabled by configuration** (`plan_review: false` / `code_review: false` — § Configuration's `plan_review` / `code_review` bullets) has its rows `TaskCreate`d directly with `status: "completed"` — the top-level `Step 3: Plan Review` / `Step 8: Code Review` row and, for the code phase, `Step 8-1`. Mark each task `in_progress` (via `TaskUpdate {taskId, status}`) when starting and `completed` when done.
