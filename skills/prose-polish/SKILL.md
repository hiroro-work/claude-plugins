---
name: prose-polish
description: Refactor verbose or unnatural natural-language prose — code comments, test descriptions, docstrings, user-facing text — into concise, native-sounding prose in a configured target language, using a sonnet subagent by default. Two modes: file mode rewrites a file's target-language prose in place; text mode returns the refactored text. Preserves code, identifiers, and proper-noun terms while translating ordinary technical vocabulary into the target language. Non-interactive — no user prompts. Use after generating prose with a model prone to verbosity, or to polish text before presenting it.
effort: low
allowed-tools: Read, Edit, Agent
---

# Prose Polish

The refactoring runs in a fresh `Agent` dispatch; the main thread applies the result. This is a **single-pass** skill.

**Two modes**, mutually exclusive: **file mode** rewrites a file's target-language prose in place, **text mode** returns the refactored text. The inputs the caller supplies select between them, per `## Invocation contract` § Mode determination.

## Invocation contract

The caller passes these fields in natural language (the skill extracts them from the invocation text). A field counts as **provided** iff the caller supplied a non-empty, non-whitespace value.

- `File:` / `Files:` *(file mode — one or more paths, repo-relative or absolute)* — the files whose target-language prose is rewritten in place. Multiple paths may be listed (one per line or comma-separated), and the two forms may be mixed in one invocation; each entry is carried verbatim into `target_files`.
- `Text:` *(text mode — the prose to refactor)* — the block of text to polish and return.
- `Language:` *(optional, default `ja`, e.g. `ja` / `en`)* — the target language whose prose is refactored. In file mode, only prose in this language is rewritten.
- `Model:` *(optional, default `sonnet`)* — the model id applied as the `model` parameter on the refactor `Agent` dispatch (Step 3 (a)). **Validity predicate**: valid only if it is one of the model ids the current `Agent` tool's `model` parameter accepts. Check the tool's live schema in this session. A full `claude-*` id (e.g. `claude-sonnet-5`) is not among its accepted aliases, so it is invalid. An absent or invalid value falls back to `sonnet`.

**Pass related files together (file mode)** — cross-file duplicate-comment detection works only across files listed in a **single** invocation.

### Mode determination

Evaluate against the two mode selectors — the `File:` / `Files:` group and `Text:` — using the provided/absent rule above:

- **`File:` / `Files:` provided AND `Text:` absent** → **file mode**.
- **`Text:` provided AND `File:` / `Files:` absent** → **text mode**.
- **Both provided** → return early with `reason: "ambiguous args"`.
- **Both absent** → return early with `reason: "incomplete args"`.

Either early return emits the full `## Return contract` verdict with `status: "error"`, `mode: null`, `language` resolved, and every other field at its error value.

## Dispatch authorization

This skill's procedure dispatches subagents, so invoking the skill **is** the request to use that mechanism: an ambient instruction allowing subagent dispatch only when the user asked for it — a **permission-shaped restriction** — is already satisfied by this invocation. Do not ask the user to re-confirm the dispatch, and do not silently substitute inline execution for a dispatch this procedure specifies. Only two things justify that substitution: **technical availability** (the dispatch tool is not present and callable on the current tool surface), and an **explicit contract term from the caller** bounding this skill to its own thread. A permission-shaped restriction is neither.

## Process

### Step 1 — Determine mode and parse inputs (main thread)

1. Resolve `Language:` to `<resolved-language>` — the provided value, else the default `ja`.
2. Parse the optional `Model:` value per `§ Invocation contract`'s `Model` field and hold the result for the Step 3 (a) dispatch.
3. Determine the mode per `§ Invocation contract` § Mode determination. On `ambiguous args` / `incomplete args`, emit the corresponding early-return verdict and stop.
4. **File mode**: collect the listed paths into `target_files`. **Text mode**: hold the input text as `input_text`.

### Step 2 — Load the style guide (main thread)

`Read` [`references/prose-style-guide.md`](references/prose-style-guide.md). In file mode, also `Read` each entry in `target_files`.

### Step 3 — Dispatch the refactor subagent

#### (a) Dispatch

Dispatch a fresh subagent via the `Agent` tool (`subagent_type: general-purpose`), passing the resolved `Model` value as the `Agent` `model` parameter. Assemble the dispatch prompt from the sections below, each framed with a clear `--- LABEL ---` fence:

- `--- PROSE STYLE GUIDE ---`: the full content of `references/prose-style-guide.md`
- `--- TARGET LANGUAGE ---`: the `<resolved-language>` code
- **File mode** — `--- TARGET FILES ---`: each entry in `target_files` as a `### <path>` sub-heading followed by the file's full current contents
- **Text mode** — `--- INPUT TEXT ---`: the `input_text` verbatim
- `--- REFACTOR PROMPT ---`: the mode-appropriate prompt below (verbatim)
- `--- RESPONSE FORMAT ---`: the mode-appropriate response format below (verbatim)

**Refactor prompt — file mode:**

> You are a fresh prose editor. You have **not** seen prior conversation context — only the PROSE STYLE GUIDE, TARGET LANGUAGE, and TARGET FILES below. For each TARGET FILE, find natural-language prose written **in the target language** — code comments, test / example descriptions, docstrings, and user-facing string literals — and rewrite each one to be concise and natural for a native reader of that language, following the PROSE STYLE GUIDE.
>
> **Preserve everything that is not target-language prose (hard constraint)**: keep unchanged every token preserved by the PROSE STYLE GUIDE's `Preserve` section and its `Preserve-vs-translate litmus test`. Leave a **whole** passage written entirely in another language untouched.
>
> Return each rewrite as a `{file, old_string, new_string, rationale}` Edit. `old_string` must match exactly one location in the current file — include **1–3 lines of surrounding context** so the snippet is unique. A rewrite may change the number of prose lines in either direction — merge, split, or delete a line by omitting it from `new_string`. When `old_string` carries a non-target line purely for uniqueness (an adjacent line in another language, or a code line), reproduce that line **byte-identically** in `new_string`. If a file needs no prose changes, emit no edits for it. If nothing needs changing across all files, return `edits: []`.
>
> **Cross-file duplicate comments → a `recommendations` entry, not per-copy edits**: when a comment qualifies as a cross-file duplicate under the PROSE STYLE GUIDE's `Cross-file duplicate comments` rule, do **not** emit a per-copy polish edit for those copies — instead emit a single `recommendations` entry (see RESPONSE FORMAT) flagging the duplication.

**Response format — file mode:**

> Write your reasoning briefly, then end your response with a single fenced JSON block matching this schema:
>
> ````
> ```json
> {
>   "edits": [
>     {"file": "<path>", "old_string": "<unique 1-3 line snippet>", "new_string": "<replacement>", "rationale": "<short reason>"}
>   ],
>   "recommendations": [
>     {"summary": "<one-line description of the duplicated knowledge>", "files": ["<path>", "<path>"], "suggestion": "<consolidate-into-one-place-and-remove-inline-copies advice>"}
>   ]
> }
> ```
> ````
>
> `recommendations` holds cross-file duplicate-comment consolidation candidates (return `[]` when none qualify): `summary` identifies the duplicated knowledge in one line, `files` lists the **two or more** TARGET FILES the comment recurs in, and `suggestion` is the concrete consolidate-and-remove-copies advice — name a destination only as an illustrative example, never as an asserted path.

**Refactor prompt — text mode:**

> You are a fresh prose editor. You have **not** seen prior conversation context — only the PROSE STYLE GUIDE, TARGET LANGUAGE, and INPUT TEXT below. Rewrite the INPUT TEXT to be concise and natural for a native reader of the target language, following the PROSE STYLE GUIDE.
>
> **Preserve non-prose tokens (hard constraint)**: refactor the natural-language wording around every token preserved by the PROSE STYLE GUIDE's `Preserve` section and its `Preserve-vs-translate litmus test`. If the text is already concise and natural, return it unchanged.

**Response format — text mode:**

> End your response with a single fenced JSON block matching this schema, and write no other prose:
>
> ````
> ```json
> {
>   "refactored_text": "<the rewritten text>"
> }
> ```
> ````

**`Agent`-unavailable fallback**: take this path only under the two conditions `§ Dispatch authorization` names. Decide by inspecting the tool surface, never a probe call, and not by invocation lineage: being invoked as a sub-skill does not trigger this path. Under it, perform the refactor inline in the main thread once, on the executing agent's own model, constructing the same fenced JSON block defined above so Step 3 (b)'s parser handles both paths identically.

**Dispatch failure**: if the `Agent` dispatch itself errors, times out, or returns an empty response, emit `{"status": "error", ..., "reason": "dispatch error"}` per `## Return contract` and stop, before the parse step runs. A failed dispatch is not the fallback path above.

#### (b) Parse & apply — evaluate in this order, first match wins

1. **Verdict missing or malformed** — no fenced JSON block found, or JSON parse fails → emit `{"status": "error", ..., "reason": "verdict parse failure"}` per `## Return contract` and stop.
2. **Schema violation** — emit `{"status": "error", ..., "reason": "verdict schema violation"}` and stop when:
   - **File mode**: `edits` is missing or not an array, or any entry fails its per-entry shape — each entry must have non-empty string `file`, `old_string`, and `new_string` (validated here at parse time, before any `Edit`). The optional `recommendations` field, **when present**, must be an array in which every entry has a non-empty string `summary`, a non-empty string `suggestion`, and a `files` array whose **distinct** non-empty string entries number two or more; an **absent** `recommendations` is treated as `[]` (lenient). Do not scope-check `recommendations[].files` against `target_files`.
   - **Text mode**: `refactored_text` is missing or is not a non-empty string.
3. **Otherwise — apply (file mode) or accept (text mode)**:
   - **File mode** — apply `edits` in order:
     - Verify `file ∈ target_files`; if not, skip the entry without calling `Edit`.
     - Call `Edit` for each in-scope entry; re-`Read` the file first only if an earlier edit in this pass already modified it.
     - If `old_string` is not found, skip that entry and continue — a no-op skip, not an error.
     - Increment `applied_edits_count` only for entries whose `Edit` call succeeded.
     - Set `files_modified` to the distinct `file` values whose `Edit` succeeded.
     - Set `refactored_text = null`.
     - Carry `recommendations` through unchanged (absent → `[]`).
   - **Text mode**: take `refactored_text` from the verdict. Set `applied_edits_count = 0`, `files_modified = []`, and `recommendations = []`.

### Step 4 — Emit verdict

Determine `status` and emit the verdict per `## Return contract`:

- **File mode**: `applied_edits_count > 0` → `done`; `applied_edits_count == 0` → `no-change`.
- **Text mode**: `refactored_text` differs from `input_text` → `done`; identical → `no-change`.

## Return contract

The skill emits a **single** fenced JSON block at the very end of the invocation (any JSON the `Agent`-unavailable fallback synthesizes internally is held in main-thread context and does not enter the response stream):

```json
{
  "status": "done|no-change|error",
  "mode": "file|text|null",
  "language": "<lang>",
  "applied_edits_count": N,
  "files_modified": ["<path>"],
  "recommendations": [{"summary": "...", "files": ["<path>"], "suggestion": "..."}],
  "refactored_text": "...|null",
  "reason": "ambiguous args|incomplete args|verdict parse failure|verdict schema violation|dispatch error|null"
}
```

The `|null` token at the end of the `reason` enum means JSON `null` (not the string `"null"`).

Field semantics:

- `status`: `done` when refactoring was applied, `no-change` when none was, `error` otherwise — see `reason`.
- `mode`: the resolved mode; `null` only on the two `§ Mode determination` early returns.
- `language`: the resolved target language echoed back.
- `applied_edits_count`: count of `Edit` calls that succeeded (file mode); `0` in text mode and on any `error`.
- `files_modified`: the distinct files that received at least one successful `Edit`; `[]` in text mode and on any `error`.
- `recommendations`: file-mode advisory array of cross-file duplicate-comment consolidation candidates. **Orthogonal to `status`** — it may be non-empty on `no-change`; `[]` in text mode and on any `error`.
- `refactored_text`: the rewritten text in text mode; `null` in file mode and on any `error`.
- `reason`: one of the listed enum tokens when `status == "error"`. No free-form text.

## Sub-skill caller directive

When invoked as a sub-skill (i.e. via `Skill(prose-polish)` from an orchestrator), the fenced JSON verdict block this skill emits is the **structured return value** of the skill's procedure — it is **not** a deliverable to the user, and emitting it does **not** terminate the orchestrator's turn. The same agent that ran this skill must immediately issue the next tool call dictated by the orchestrator's flow. Do not insert a prose summary, an acknowledgment, or a "shall I proceed?" sentence between the JSON verdict and the next tool call. Only one fenced JSON block — the verdict block — appears in the response, so callers can locate it unambiguously. The skill's own procedure is over; the orchestrator's procedure continues without pause.

## Stop hook structural conflict (caller-side note)

On Claude Code on the Web the auto-installed `~/.claude/stop-hook-git-check.sh` fires on every Stop event and feeds back `Please commit and push…` between Process steps; treat each fire as a **spurious fire** — record it, ignore the prose, and run the Process steps to completion. Do **not** commit from inside this skill; commit policy lives with the caller.
