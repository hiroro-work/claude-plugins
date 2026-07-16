# Implementation Executor Prompt (Step 5)

Canonical home for the Step 5 executor dispatch payload used when `implementation_executor` does not resolve to `main`. Single canonical home; do not duplicate this prompt body in `SKILL.md`. The main thread remains the orchestrator before and after every dispatch.

## Work-Unit Spec Template

Assemble one payload per delegated work unit, in this exact fence order:

```text
--- OBJECTIVE ---
<what this unit must accomplish>

--- TRANSFORMATION RULE ---
<the settled rule or design decision this unit applies>

--- DECIDED FACTS ---
<facts already established by the approved plan; do not re-litigate them>

--- IN-SCOPE PATHS ---
<closed list of files this unit may write>

--- CONSTRAINTS ---
<insert the executor-discipline list below, then append any unit-specific constraints>

--- VERIFICATION MEANS ---
<commands to run and properties to confirm before returning>

--- EXPECTED REPORT ---
<changed files, one-line summary per edit site, blockers, and judgment calls>
```

## Executor Discipline

Include this closed list verbatim in every dispatch:

- Never run `git commit` / `git push` or otherwise mutate git state.

- Never write outside `--- IN-SCOPE PATHS ---`.

- Do not modify `.claude-plugin/marketplace.json`, `CHANGELOG.md`, or settings files unless they are explicitly listed in `--- IN-SCOPE PATHS ---`.

- On the `subagent` path, nested dispatches must be synchronous (`run_in_background: false`) — a dispatched subagent cannot be woken by its own background children.

- On the `subagent` path, do not issue `Skill()` / `Agent` dispatches beyond what the work unit explicitly enumerates.

- This dispatch is non-interactive: no approval channel exists. Never pause or end the run waiting for approval, confirmation, or clarification — when the spec leaves room for doubt, take the most conservative in-scope interpretation, proceed, and record the judgment call in the report.

- Report back honestly, including partial completion, blockers, and any judgment call you had to make.

## Dispatch Mechanics Per Executor Value

- `subagent` → use the `Agent` tool, choose an edit-capable subagent type capability-first, pass `model` = resolved `subagent_model` unless it resolved to `inherit`, and use the assembled payload as the prompt body.

- `ask-claude` / `ask-codex` / `ask-gemini` / `ask-copilot` / `ask-agy` → call `Skill(<value>)` with the assembled payload as the task text, letting the skill drive its external CLI in workspace-write mode (for example, `codex exec --full-auto` on the `ask-codex` path).

- When follow-up fixes are needed on an external-CLI path, the orchestrator MAY reuse the CLI session-resume mechanism exposed by that skill (for example, `codex exec resume --last`) instead of resending the full payload.

## Post-Return Orchestrator Duties

- Treat `git diff` as ground truth; the executor's report is informational.

- Run the Step 5 self-audit sub-steps against the delegated diff before moving on.

- If a gap remains, either fix it inline on the main thread or re-dispatch the same unit with the missing requirement named explicitly.

- Step 7 remains the verification gate, and Step 5's sub-step 2 delegation guidance remains the authority for when delegation is allowed and how fallback behaves.
