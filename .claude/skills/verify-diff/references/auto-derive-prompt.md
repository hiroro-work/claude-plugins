# Auto-derive intent-inference + verification prompt

This file is the canonical home for two payload sections that `verify-diff` injects into per-skill `Agent` dispatches in **auto-derive mode** (see `SKILL.md` § Auto-derive mode `A2 § Dispatch payload assembly`):

- `## Executor prompt` → `--- INFERENCE PROMPT ---` payload section
- `## Response format` → `--- RESPONSE FORMAT ---` payload section

`<skill-name>` is substituted by the dispatching main thread before injection so the executor sees the concrete skill name. The diff and the affected files are delivered in sibling payload sections (`--- DIFF ---`, `--- AFFECTED FILES ---`) and are not duplicated here.

---

## Executor prompt

You are a fresh executor of a code diff for skill `<skill-name>`. You have **not** seen any prior framing — only the diff and the current file contents below.

Your task is in two phases:

### Phase 1 — INFER INTENT (<= 2 sentences)

Read the diff and write a 1–2 sentence summary of "what the author was trying to achieve" — the most plausible Description that fits the observed `+`-line changes (treat removed `-` lines as the prior state, not as the goal). Treat the diff and the current contents of every file under `--- AFFECTED FILES ---` as your only sources of truth. If multiple plausible intents are present, pick the one with the strongest signal in the `+` lines.

### Phase 2 — VERIFY

Construct 1–2 evaluation scenarios from your inferred intent, write a 3–7 item requirements checklist (with at least one `[critical]` item), and judge whether the diff achieves the inferred intent without regressions. Same gate-reachability rule as explicit-args mode: when `objective_met == "yes"` AND `regressions == []`, `suggested_edits` must be `[]`.

If a scenario requires running a script or command, `cd` into a scratch/temp directory outside the skill tree under test **before** invoking it (or otherwise redirect its output there) — prefer the session scratchpad or the system temp directory. Never let output artifacts (e.g. captured stdout/stderr) land inside the directory being verified.

---

## Response format

Write your reasoning, scenario execution, and per-file findings in natural language, then end your response with a single fenced JSON block matching this schema:

````
```json
{
  "inferred_intent": "<1-2 sentences>",
  "objective_met": "yes|partial|no",
  "remaining_gaps": ["<short phrase>"],
  "regressions": ["<short phrase>"],
  "suggested_edits": [
    {"file": "<path>", "old_string": "<unique snippet>", "new_string": "<replacement>", "rationale": "<why>"}
  ],
  "confidence": "high|medium|low"
}
```
````

`file` must be one of the paths listed in `--- AFFECTED FILES ---`. `old_string` must match exactly one location in the current contents of that file. Include **1–3 lines of surrounding context** so the snippet is unique — short one-liners collide and cause the Edit to fail.

---

## Caller note

This section is **not** injected into the executor prompt — it documents how the verify-diff caller (a human or orchestrator) should interpret the executor's verdict.

If the `inferred_intent` does not match what the author actually had in mind, the per-skill verdict is informative-only. The caller can re-invoke verify-diff with explicit `Description` / `Suggested fix direction` / `Target file` to override the inference.

---

## Verdict samples

This section records observed top-level and per-skill JSON shapes from manual smoke tests, kept as regression anchors. Update when the schema spec in `SKILL.md` § Auto-derive mode A3 changes.

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
