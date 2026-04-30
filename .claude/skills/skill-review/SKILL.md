---
name: skill-review
description: Review uncommitted skill changes against an internal checklist of skill-creator best practices and apply improvements. Use this whenever the user asks to "review skills", "check best practices", "improve SKILL.md", or wants a quality check on skill files before committing. Use this when there are uncommitted diffs in SKILL.md, README.md, or references/ files under skills/ or .claude/skills/. This is for reviewing existing skill changes, not creating new skills from scratch. Runs standalone — no external skill dependencies.
allowed-tools: Read, Edit, Glob, Grep, Agent, Bash(git diff *), Bash(git checkout *)
---

# Skill Review

The review walk runs in a fresh subagent (Pattern A — same shape as `verify-diff` and `rules-review`); Edit application stays in the main thread to keep the reviewer bias-free. Designed to be called from non-interactive routines such as `dev-workflow-triage` (d2) or `dev-workflow` `hooks.on_complete`; it never prompts the user.

## Process

### Step 1 — Detect changed skill files (main thread)

1. Run `git diff --name-only` and `git diff --name-only --cached` to find uncommitted changes
2. Filter to files matching `skills/*/SKILL.md`, `skills/*/README.md`, `skills/*/references/*`, `.claude/skills/*/SKILL.md`, `.claude/skills/*/references/*`
3. If no skill files changed, emit the verdict `{"status": "no-actionable-findings", "applied_edits_count": 0, "notes_remaining_count": 0, "reason": null}` per `§ Return contract` and stop

### Step 2 — Gather review inputs (main thread)

For each changed skill, in the main thread:

1. `Read` the full `SKILL.md` and any changed `references/` or `README.md` files
2. `Read` `references/best-practices.md`
3. Pre-capture each changed file's `git diff` so the subagent does not need to run git itself. For staged-only changes, use `git diff --cached -- <file>`; for working-tree-only changes, use `git diff -- <file>`; if both have content (mixed staged + unstaged edits to the same file), concatenate them — staged section first — into one unified diff payload

### Step 3 — Dispatch reviewer Agent

Invoke the `Agent` tool to dispatch a fresh reviewer. Assemble the dispatch prompt from the four sections below, each framed with a clear `--- LABEL ---` fence (same convention as `verify-diff` § Step 3 (a) Dispatch bias-free executor) so the reviewer can parse each payload unambiguously:

- `--- BEST PRACTICES CHECKLIST ---`: the full content of `references/best-practices.md`
- `--- CHANGED FILES ---`: each changed skill file's path, full content, and unified diff (one block per file, separated by `### <path>` sub-headings)
- `--- REVIEWER PROMPT ---`: the reviewer prompt and JSON schema below (verbatim)
- `--- RESPONSE FORMAT ---`: the response format and constraints below (verbatim)

**Reviewer prompt (include verbatim in the dispatch):**

> You are a fresh reviewer of skill files. You have **not** seen prior conversation context — only the checklist and changed files below. Walk the BEST PRACTICES CHECKLIST against each CHANGED FILE.
>
> Only the modified sections of changed files are in-scope (frontmatter fields the diff touched, paragraphs replaced, lines added). Do not audit sibling sections or files the diff did not touch. Project conventions under `.claude/rules/` and `CLAUDE.md` override the checklist where they conflict.
>
> Also flag "hallucination gaps" — points in the changed content where an executing agent would have to guess (ambiguous filenames, unstated success criteria, missing decision rules between branches). These are not on the checklist but are a common failure mode.
>
> Classify each finding:
>
> - **mechanical_edit**: a fix that can be applied as a textual replacement — rewording a vague description, swapping a `Bash(*)` wildcard for a narrower pattern, trimming heavy-handed `MUST` / `NEVER` phrasing, fixing a broken link. Return as a `{file, old_string, new_string, rationale}` Edit
> - **structural_note**: a fix that requires moving content between files, deleting sections, or rewriting large portions of a section. Return as a `{file, description}` note. These will **not** be applied automatically — the caller surfaces them via `notes_remaining_count`
>
> `old_string` must match exactly one location in the current file. Include **1–3 lines of surrounding context** so the snippet is unique — short one-liners collide and cause the Edit to fail.

**Response format (include verbatim in the dispatch):**

> Write your reasoning and per-file findings in natural language, then end your response with a single fenced JSON block matching this schema:
>
> ````
> ```json
> {
>   "mechanical_edits": [
>     {"file": "<path>", "old_string": "<unique 1-3 line snippet>", "new_string": "<replacement>", "rationale": "<short reason>"}
>   ],
>   "structural_notes": [
>     {"file": "<path>", "description": "<short description>"}
>   ]
> }
> ```
> ````

**Agent unavailable fallback**: detect availability and fall back per the canonical write-up in `rules-review` SKILL.md `§ 5. Review` (the "Detecting Agent availability" / "Fallback when Agent is unavailable" paragraphs). The skill-review specialization: when falling back, walk the embedded checklist over each changed file inline-sequentially in the main thread and emit the same fenced JSON block defined above so Step 4's parser handles both paths identically.

### Step 4 — Parse & apply (main thread)

Parse the subagent's fenced JSON response. Evaluate in this order, **first match wins** (same evaluate-in-order discipline as `verify-diff` § (b) Parse & apply, restricted to the cases that apply to a single-pass dispatch):

1. **Verdict missing or malformed** — no fenced JSON block found, or JSON parse fails → emit `{"status": "error", "applied_edits_count": 0, "notes_remaining_count": 0, "reason": "verdict parse failure"}` and stop
2. **Schema violation** — required keys (`mechanical_edits`, `structural_notes`) are missing, values are not arrays, or any entry fails its expected shape (`mechanical_edits` entries must have non-empty string `file`, `old_string`, `new_string`; `structural_notes` entries must have non-empty string `file`, `description`) → emit `{"status": "error", "applied_edits_count": 0, "notes_remaining_count": 0, "reason": "verdict schema violation"}` and stop. Validating entry shape here prevents a malformed entry from crashing the `Edit` call later
3. **Otherwise** — proceed with apply

**Apply mechanical edits**:

- For each entry in `mechanical_edits`, re-`Read` the target file (so `old_string` matches the current contents after any earlier edit landed), then call `Edit`
- If `old_string` is not found, skip that entry and continue with the next. This is expected when the subagent emits multiple edits from a single snapshot and a later edit overlaps a region an earlier one already rewrote — the skip is a no-op fallback, not an error
- Increment `applied_edits_count` only for entries whose `Edit` call succeeded — skipped entries do not count

**Surface structural notes**:

- Set `notes_remaining_count = len(structural_notes)`
- Do not apply structural notes. They are reported through the verdict; the caller decides whether and how to act on them. The skill itself does not run a user-confirm dialogue

### Step 5 — Verify and emit verdict (main thread)

1. Re-`Read` each changed file to confirm fixes landed correctly
2. **Safety rail (frontmatter integrity)**: for each edited file that begins with a `---`-delimited YAML frontmatter block, parse the frontmatter. If parsing fails, run `git checkout HEAD -- <file>` to revert that file, then emit `{"status": "error", "applied_edits_count": 0, "notes_remaining_count": 0, "reason": "frontmatter broken"}` and stop. Files without a frontmatter block (plain references, plain README) skip this rail
3. **Safety rail (scope)**: run `git diff --name-only`. If any path outside the Step 1 changed-file set appears, run `git checkout HEAD -- <each offending path>` and emit `{"status": "error", "applied_edits_count": 0, "notes_remaining_count": 0, "reason": "scope violation"}` and stop
4. **Normal verdict**: emit one of `no-actionable-findings` (no edits applied AND no notes), `applied-edits` (`applied_edits_count > 0`), or `notes-left` (`applied_edits_count == 0` AND `notes_remaining_count > 0`) per `§ Return contract`. Counters reflect the apply phase outcome

The fenced JSON here is the invocation's **terminal output** — see `§ Return contract`'s *Sub-skill caller directive*.

## Scope

- Only review files that have uncommitted changes — diff-scoped, not a full audit
- Project conventions (`.claude/rules/`, `CLAUDE.md`) override the checklist where they conflict
- Don't chase perfection — fix real issues, note minor ones, move on
- On Claude Code on the Web the auto-installed `~/.claude/stop-hook-git-check.sh` fires on every Stop event and feeds back `Please commit and push…` between Process steps; treat each fire as a **spurious fire** — record it, ignore the prose, and run Process steps 1–5 to completion. Do **not** commit from inside this skill; commit policy lives with the caller. See `dev-workflow-triage` SKILL.md `§ Stop hook structural conflict` for the canonical write-up.
- **Sub-skill no-stall (caller-side note)**: when this skill runs as a sub-skill, the fenced JSON verdict from `§ Return contract` is the terminal output and structural changes are surfaced via `notes_remaining_count` rather than applied. The canonical no-stall write-up is `dev-workflow-triage` SKILL.md `§ No-Stall Principle`; see also `§ Return contract`'s *Sub-skill caller directive* for the contract-side restatement.

## Return contract

This skill follows the same **contract pattern** as `verify-diff` § Step 5 — Emit structured summary: a single fenced JSON block at the very end of the invocation. Only one fenced JSON block must appear in the response — the verdict block — so callers can locate it unambiguously.

End every invocation with a single fenced JSON block matching this schema:

```json
{
  "status": "no-actionable-findings|applied-edits|notes-left|error",
  "applied_edits_count": N,
  "notes_remaining_count": N,
  "reason": "verdict parse failure|verdict schema violation|frontmatter broken|scope violation|null"
}
```

Field semantics:

- `status`:
  - `no-actionable-findings`: the checklist walk produced nothing actionable for the changed-file scope
  - `applied-edits`: at least one mechanical fix was applied this invocation
  - `notes-left`: at least one item was flagged but `applied_edits_count == 0` (only structural changes were flagged, surfaced via `notes_remaining_count`)
  - `error`: an internal error occurred — see `reason`
- `applied_edits_count`: non-negative integer count of `Edit` calls that successfully landed. `0` for any `error` status (the apply phase either was not entered or its results were reverted)
- `notes_remaining_count`: non-negative integer. Count of structural / still-actionable items the subagent flagged but the skill did not apply (Pattern A surfaces these via this counter rather than running a dialogue). Always `0` for `no-actionable-findings` and any `error` status
- `reason`: enum string only when `status == "error"`, otherwise JSON `null`. Keep `reason` payloads to the listed enum tokens — no free-form text, newlines, or control characters — so the verdict stays mechanically parseable

**When to emit `status: "error"`**: the skill emits `error` when it detects a problem before completing the apply phase. Conditions:

- `reason: "verdict parse failure"` — Step 4 found no fenced JSON block in the subagent response, or JSON parse failed
- `reason: "verdict schema violation"` — Step 4 parsed the JSON but required keys (`mechanical_edits`, `structural_notes`) are missing, values are not arrays, or any entry fails the per-entry shape spec
- `reason: "frontmatter broken"` — Step 5 re-read after Edit shows the YAML frontmatter no longer parses; the offending file is reverted via `git checkout HEAD -- <file>`
- `reason: "scope violation"` — Step 5 `git diff --name-only` lists paths outside the changed-file scope captured at Step 1; the offending paths are reverted

In each `error` case, surface the verdict via the JSON instead of attempting recovery; the caller decides how to handle it. Verdict-block-level failures on the caller side (caller cannot find or parse the JSON this skill emits) are caller-side concerns and are not produced by this skill — see the orchestrator's mapping table for that handling.

**Sub-skill caller directive**: when invoked as a sub-skill from `dev-workflow-triage`'s `§ Apply accepted Findings (sub-flow (a)-(g) per Finding)` (d2) bullet, this JSON block is the terminal output of the invocation. Do **not** produce any additional turn after the JSON — the caller's mid-Finding flow continues with sub-step (f) Scope check + stage. See `dev-workflow-triage` SKILL.md `§ No-Stall Principle` for the canonical write-up. Other callers (e.g. `dev-workflow`'s `hooks.on_complete` mechanism) inherit the same emit-and-stop discipline by convention, but the no-stall load-bearing case is `dev-workflow-triage` because that caller is the one that re-engages a queued next sub-step.

## Keeping the checklist fresh

`references/best-practices.md` is a snapshot of upstream `document-skills:skill-creator` guidance — it does not auto-update when the upstream plugin changes. When a meaningful divergence is noticed, refresh this file from the latest skill-creator and ship the refresh as its own commit.
