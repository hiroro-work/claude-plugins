# Code Review Payload (shared)

The reviewer-report payload a code review is composed from.

## Sub-step 1 — reviewer report payload

This list is the **single parametric source** both the sub-step 1 fresh-dispatch request and the Step 7 background code-review launch bake.

- Include `git diff <base-commit>` (base-commit recorded in Step 2) to capture all changes since workflow start; before composing this payload, also run `git status --porcelain=v1 --untracked-files=all` and `Read` the contents of any untracked new files (lines with `??` prefix), then include those file contents in the review payload labeled as untracked new files — these are task-generated artifacts absent from `git diff <base-commit>` that would otherwise be invisible to the reviewer
- Instruct the reviewer to flag any obvious `.claude/rules/` violations as a safety net. On Moderate / Complex, Step 7.5 already walked the full base-commit diff for rule compliance, so this is a lightweight check — **with one standing exception**: Step 7.5's own fixes have **not** been re-verified at this point. When `review_fix_files` is non-empty, instruct the reviewer to weight the rules check on those locations accordingly. On **Simple**, Step 7.5 is skipped under the difficulty-skip matrix (see Step 7.5's "Responsibility scope" paragraph), so this is the run's only rules-compliance check — instruct the reviewer to weight it accordingly
- Request feedback organized into three categories (labels only — the full per-category rubric lives in [`references/review-categories.md`](review-categories.md) § Code review categories; instruct the reviewer to read that section, resolving the link to a concrete readable path when composing the request — the reviewer lacks the skill-directory context):
  a. **Correctness & edge cases**
  b. **Conventions & consistency**
  c. **Simplicity & maintainability**
- If `custom_instructions` is configured, include the instructions text in the review request and have the reviewer verify compliance and report conflicts
- **If a state file is active** (executing a subtask from a decomposition), include the current subtask's scope in the reviewer request: list the subtask's `title` and `description`, then list what the other subtasks cover (to define out-of-scope). Instruct the reviewer that missing functionality belonging to other subtasks is **not** an actionable finding for this code review — only findings scoped to the current subtask qualify. Omit this when no state file is active.
- Include the running skill's cross-layer review handoff ledger as a short context item — `dev-workflow` `SKILL.md` § Step 6's **Cross-layer review handoff ledger** paragraph defines it, and `mobpro` keeps no such ledger, so it omits the item. Omit it too when the ledger has no recorded dispositions.
- **On the escalation pass only**: include the continuation item — the summary of fixes made and rejections with reasons from the review pass, including any class-level sweep record. Omit this item on the review pass.
- **On the escalation pass only, also include a scope instruction**: the reviewer's primary verification scope is the changes applied since the review pass (identified via the continuation item's summary of fixes, located within the latest `git diff <base-commit>`) plus landing confirmation of that pass's findings — the full-coverage pass (verifying every target file in the full `git diff <base-commit>` from scratch) belongs to the review pass. The reviewer must still escalate back to full re-verification when content outside that primary scope raises a new concern. Omit this item on the review pass.
- Reviewer should only report actionable findings. If none, explicitly state "No actionable findings"
