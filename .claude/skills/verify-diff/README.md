# verify-diff — maintenance notes

Notes for editing this skill and for reading its verdicts. `SKILL.md` is read on every invocation and `references/auto-derive-prompt.md` is loaded whenever auto-derive mode runs, so anything an executing agent does not act on lives here instead.

## Reading an auto-derive verdict

`inferred_intent` is the executor's own reading of the diff. When it does not match what the author actually had in mind, the per-skill verdict is informative-only — re-invoke verify-diff with explicit `Description` / `Suggested fix direction` / `Target file` to override the inference.

`remaining_gaps` is the executor's **pre-apply** judgment, so `unresolved` alongside `applied_edits_count > 0` is the ordinary outcome of a productive pass at the default `Max iterations` of `1`, not an anomaly. Raise `Max iterations` to make `converged` reachable after a fix.

## Verdict samples

Observed top-level and per-skill JSON shapes from manual smoke tests, kept as regression anchors. Update when the schema spec in `SKILL.md` § Auto-derive mode A3 changes.

### Sample: A3 aggregate verdict (mixed converged + skipped → top-level `partial`)

```json
{
  "mode": "auto-derive",
  "status": "partial",
  "iterations_used_total": 4,
  "applied_edits_count_total": 2,
  "non_skill_files": [".claude/rules/project.rules.md"],
  "per_skill": {
    "verify-diff": {
      "primary_file": ".claude/skills/verify-diff/SKILL.md",
      "files": [".claude/skills/verify-diff/SKILL.md", ".claude/skills/verify-diff/references/auto-derive-prompt.md"],
      "inferred_intent": "Add an auto-derive mode that infers intent from diff alone and verifies on a per-skill basis, falling back when explicit args are absent.",
      "status": "converged",
      "iterations_used": 2,
      "objective_met": "yes",
      "applied_edits_count": 2,
      "unresolved_gaps": [],
      "reverted_paths": [],
      "reason": null
    },
    "skill-review": {
      "primary_file": ".claude/skills/skill-review/SKILL.md",
      "files": [".claude/skills/skill-review/SKILL.md"],
      "inferred_intent": "Tighten the reviewer prompt's gate-reachability wording so a no-op iteration cannot flag speculative edits.",
      "status": "skipped",
      "iterations_used": 2,
      "objective_met": "unknown",
      "applied_edits_count": 0,
      "unresolved_gaps": [],
      "reverted_paths": [],
      "reason": "verdict parse failure"
    }
  },
  "reason": null
}
```

### Sample: A1 early-return on empty diff

```json
{"mode": "auto-derive", "status": "skipped", "reason": "empty diff", "iterations_used_total": 0, "applied_edits_count_total": 0, "non_skill_files": [], "per_skill": {}}
```

### Sample: A1 early-return on non-skill files only

```json
{"mode": "auto-derive", "status": "skipped", "reason": "no skill files in diff", "iterations_used_total": 0, "applied_edits_count_total": 0, "non_skill_files": [".claude/rules/project.rules.md", "CHANGELOG.md"], "per_skill": {}}
```

### Sample: incomplete-args early-return (NOT auto-derive shape — explicit-args Step 1 schema)

```json
{"status": "skipped", "reason": "incomplete args", "iterations_used": 0, "applied_edits_count": 0, "unresolved_gaps": [], "reverted_paths": [], "objective_met": "unknown"}
```
