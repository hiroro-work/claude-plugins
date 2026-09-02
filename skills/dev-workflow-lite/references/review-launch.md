# Review launch during Check / Test

Read from `SKILL.md` Phase 9 (Check / Test), Phase 10 (Rules Compliance Review), and Phase 11 (Code Review). Unqualified `§` references point into this file. The two reviews read the same diff the tests run against, so they start in the background when Check / Test starts and their results are collected afterwards.

## Launch (Phase 9 entry)

For each review that this run will perform (Rules Compliance Review unless its row is skipped; Code Review unless its row is skipped), dispatch one `Agent` with `run_in_background: true` and the same model as the session (no `model` parameter). Its prompt: for Rules Compliance, "run `Skill(rules-review) --base-commit <base-commit>` and return its full output verbatim, including the fenced JSON verdict"; for Code Review, "run `Skill(<reviewer>)` with the payload below and return its full output verbatim", followed by the Phase 11 payload. Both end with "Do not edit any file. Do not run further `Skill()` dispatches beyond the one named." Invoking this skill is the request to dispatch; do not ask the user to confirm the launch. Then continue into Check / Test without waiting; a running background agent is never a reason for a separate turn.

If `Agent` is not available on this tool surface, skip the launch and run Phases 10 and 11 inline as written; say so in one line. Mob mode launches them too; its pre-review prediction (`mob-mode.md` § Code Review) is narrated before the launch.

## Collect (Phases 10 and 11)

On reaching the phase, wait for its agent's completion notification if it has not arrived (a harness-tracked boundary, not a user gate; mark it `wait` / `resume` for timing). Then decide once per review:

- **Fresh**: nothing changed the tree during Check / Test — the workflow applied no fix and no check command rewrote a file (Phase 9 step 4's comparison). Use the returned output as the phase's review result and continue with the phase's fix steps.
- **Stale**: the workflow edited any file during Check / Test, or a check command rewrote one. Discard the output unread, say in one line that the review re-runs because the tree changed, and run the phase inline. Stale and fresh results are never merged.
- **Failed**: the agent returned no usable output (error, empty, no verdict). Run the phase inline; the callee failure rule applies to that inline call.

Verify Fixes (Phase 12) always runs inline; its scoped rules-review is never launched in the background.
