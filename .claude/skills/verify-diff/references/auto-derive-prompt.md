# Auto-derive intent-inference + verification prompt

This file is the canonical home for two payload sections that `verify-diff` injects into per-skill `Agent` dispatches in **auto-derive mode** (see `SKILL.md` § Auto-derive mode `A2 § Dispatch payload assembly`):

- `## Executor prompt` → `--- INFERENCE PROMPT ---` payload section
- `## Response format` → `--- RESPONSE FORMAT ---` payload section

`<skill-name>` is substituted by the dispatching main thread before injection so the executor sees the concrete skill name.

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
