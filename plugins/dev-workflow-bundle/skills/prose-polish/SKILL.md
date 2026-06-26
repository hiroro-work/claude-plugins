---
name: prose-polish
description: Refactor verbose or unnatural natural-language prose — code comments, test descriptions, docstrings, user-facing text — into concise, native-sounding prose in a configured target language, using a sonnet subagent by default. Two modes: file mode rewrites a file's target-language prose in place; text mode returns the refactored text. Preserves code, identifiers, and proper-noun terms while translating ordinary technical vocabulary into the target language. Non-interactive — no user prompts. Use after generating prose with a model prone to verbosity, or to polish text before presenting it.
allowed-tools: Read, Edit, Agent
---

# Prose Polish

Refactor natural-language prose into concise, native-sounding text in a target language, using a sonnet subagent by default (the model id is overridable). The refactoring runs in a fresh `Agent` dispatch so the executor judges the prose without the main thread's context; the main thread applies the result. This is a **single-pass** skill.

**Two modes** (mutually exclusive, selected by which inputs the caller supplies — see `## Invocation contract` § Mode determination):

- **File mode** — given one or more file paths, rewrite the target-language natural-language prose **in place** (comments, test descriptions, docstrings, user-facing strings). Code, identifiers, proper-noun product / API / library / tool names, and logic-bearing string literals are left untouched; ordinary technical vocabulary sitting inside the target-language prose is translated, not preserved.
- **Text mode** — given a block of text, return the refactored text (for polishing prose before it is presented).

Designed to be called from non-interactive routines; it never prompts the user — it either returns a structured summary or terminates early with a machine-readable reason code.

## Invocation contract

The caller passes these fields in natural language (the skill extracts them from the invocation text). A field counts as **provided** iff the caller supplied a non-empty, non-whitespace value; empty string and whitespace-only count as **absent**.

- `File:` / `Files:` *(file mode — one or more relative paths)* — the files whose target-language prose is rewritten in place. Multiple paths may be listed (one per line or comma-separated).
- `Text:` *(text mode — the prose to refactor)* — the block of text to polish and return.
- `Language:` *(optional, default `ja`, e.g. `ja` / `en`)* — the target language whose prose is refactored. In file mode, only prose written in this language is rewritten; prose in other languages is left untouched.
- `Model:` *(optional, default `sonnet`)* — the model id applied as the `model` parameter on the refactor `Agent` dispatch (Step 3 (a)). **Validity predicate**: a value is valid only if it is exactly one of the closed set `{sonnet, opus, haiku}` (the ids the `Agent` `model` parameter accepts); an absent field or any value outside that set (including a full `claude-*` id) falls back to the default `sonnet` — sonnet produces more concise, natural prose than the larger models this skill is meant to clean up after.

### Mode determination

Evaluate against the two mode selectors — the `File:` / `Files:` group and `Text:` — using the provided/absent rule above:

- **`File:` / `Files:` provided AND `Text:` absent** → **file mode** (run `## Process` Steps 1–4 in the file-mode branch).
- **`Text:` provided AND `File:` / `Files:` absent** → **text mode** (run `## Process` Steps 1–4 in the text-mode branch).
- **Both provided** → return early with `{"status": "error", "mode": null, "language": "<resolved>", "applied_edits_count": 0, "files_modified": [], "refactored_text": null, "reason": "ambiguous args"}` — two modes were requested at once; surfaced loudly rather than silently picking one.
- **Both absent** → return early with `{"status": "error", "mode": null, "language": "<resolved>", "applied_edits_count": 0, "files_modified": [], "refactored_text": null, "reason": "incomplete args"}` — no mode could be selected.

This fixed mode gate (one selector group present → that mode; both → ambiguous; neither → incomplete) surfaces a conflicting or empty argument set as a loud error rather than silently picking a mode. On both early-return errors `mode` is `null` (no mode was selected); callers branch on `status == "error"` + `reason`.

## Process

### Step 1 — Determine mode and parse inputs (main thread)

1. Resolve `Language:` to `<resolved-language>` — the provided value, else the default `ja`. This resolved value is echoed in the return contract's `language` field (so a caller that passed nothing can tell the skill defaulted to `ja`).
2. Parse the optional `Model:` value per `§ Invocation contract`'s `Model` field — hold a valid `{sonnet, opus, haiku}` value for the Step 3 (a) dispatch; absent or out-of-set → default `sonnet`.
3. Determine the mode per `§ Invocation contract` § Mode determination. On `ambiguous args` / `incomplete args`, emit the corresponding early-return verdict and stop.
4. **File mode**: collect the listed paths into `target_files` (the scope-check baseline for Step 3 (b)). **Text mode**: hold the input text as `input_text`.

### Step 2 — Load the style guide (main thread)

`Read` [`references/prose-style-guide.md`](references/prose-style-guide.md) — the concise-and-natural prose rules injected into the dispatch payload (Step 3 (a)). In file mode, also `Read` each entry in `target_files` for injection into that payload.

### Step 3 — Dispatch the refactor subagent

#### (a) Dispatch

Dispatch a fresh subagent via the `Agent` tool (`subagent_type: general-purpose`), passing the parsed `Model` value as the `Agent` `model` parameter (the default `sonnet` when none was provided). Assemble the dispatch prompt from the sections below, each framed with a clear `--- LABEL ---` fence so the subagent can parse each payload unambiguously:

- `--- PROSE STYLE GUIDE ---`: the full content of `references/prose-style-guide.md`
- `--- TARGET LANGUAGE ---`: the `<resolved-language>` code
- **File mode** — `--- TARGET FILES ---`: each entry in `target_files` as a `### <path>` sub-heading followed by the file's full current contents
- **Text mode** — `--- INPUT TEXT ---`: the `input_text` verbatim
- `--- REFACTOR PROMPT ---`: the mode-appropriate prompt below (verbatim)
- `--- RESPONSE FORMAT ---`: the mode-appropriate response format below (verbatim)

**Refactor prompt — file mode (include verbatim in the dispatch):**

> You are a fresh prose editor. You have **not** seen prior conversation context — only the PROSE STYLE GUIDE, TARGET LANGUAGE, and TARGET FILES below. For each TARGET FILE, find natural-language prose written **in the target language** — code comments, test / example descriptions, docstrings, and user-facing string literals — and rewrite each one to be concise and natural for a native reader of that language, following the PROSE STYLE GUIDE.
>
> **Preserve everything that is not target-language prose (hard constraint)**: never change code, identifiers, function / variable / type names, proper-noun product / API / library / tool names and code symbols, import paths, or any string literal that carries program logic (keys, enum values, format specifiers, paths, commands). An **ordinary** source-language word sitting inside the target-language prose — a common verb, noun, or adjective with a natural target-language equivalent, not a proper noun or code symbol — is itself translatable prose, not a preserved token: render it in the target language per the PROSE STYLE GUIDE's `Preserve-vs-translate litmus test` rather than leaving it code-mixed. Leave a **whole** passage written entirely in another language untouched. If a candidate change could alter program behavior or touch a non-prose token, do not emit it.
>
> Return each rewrite as a `{file, old_string, new_string, rationale}` Edit. `old_string` must match exactly one location in the current file — include **1–3 lines of surrounding context** so the snippet is unique (short one-liners collide and cause the Edit to fail). A rewrite may reduce the number of prose lines: merge adjacent comment lines that state the same thing, or **delete** a comment whose only content is *what*-narration of the code beneath it (per the style guide's "say what the code does not" rule) by emitting an edit whose `new_string` omits that line — this is a prose change, not a structural code edit. Delete a comment only when it is fully redundant with the adjacent code; otherwise shorten it. When `old_string` carries a non-target line purely for uniqueness (an adjacent line in another language, or a code line), reproduce that line **byte-identically** in `new_string` so the preserve constraint is not breached. If a file needs no prose changes, emit no edits for it. If nothing needs changing across all files, return `edits: []`.

**Response format — file mode (include verbatim in the dispatch):**

> Write your reasoning briefly, then end your response with a single fenced JSON block matching this schema:
>
> ````
> ```json
> {
>   "edits": [
>     {"file": "<path>", "old_string": "<unique 1-3 line snippet>", "new_string": "<replacement>", "rationale": "<short reason>"}
>   ]
> }
> ```
> ````

**Refactor prompt — text mode (include verbatim in the dispatch):**

> You are a fresh prose editor. You have **not** seen prior conversation context — only the PROSE STYLE GUIDE, TARGET LANGUAGE, and INPUT TEXT below. Rewrite the INPUT TEXT to be concise and natural for a native reader of the target language, following the PROSE STYLE GUIDE.
>
> **Preserve non-prose tokens (hard constraint)**: keep identifiers, code fragments, proper-noun product / API / library / tool names and code symbols, file paths, and command / config strings verbatim — refactor the natural-language wording around them. An **ordinary** source-language word inside the target-language prose — a common verb / noun / adjective with a natural target-language equivalent, not a proper noun or code symbol — is translatable prose: render it in the target language per the PROSE STYLE GUIDE's `Preserve-vs-translate litmus test`, not left code-mixed. Do not add, drop, or reorder factual content; only improve concision and naturalness. If the text is already concise and natural, return it unchanged.

**Response format — text mode (include verbatim in the dispatch):**

> End your response with a single fenced JSON block matching this schema, and write no other prose:
>
> ````
> ```json
> {
>   "refactored_text": "<the rewritten text>"
> }
> ```
> ````

**`Agent`-unavailable fallback**: detect availability by inspecting the current tool surface — do not attempt a speculative call to probe it. When the `Agent` tool is absent (e.g. this skill runs inside a nested subagent context where nested `Agent` is not surfaced), perform the refactor inline in the main thread once, constructing the same fenced JSON block defined above so Step 3 (b)'s parser handles both paths identically. The inline pass runs on the executing agent's own model (the `Model` value is moot with no `Agent` to spawn). Being invoked as a sub-skill via `Skill()` does **not** by itself trigger this path — decide by whether `Agent` is exposed and callable, not by invocation lineage.

**Dispatch failure**: if the `Agent` dispatch itself errors, times out, or returns an empty response, emit `{"status": "error", ..., "reason": "dispatch error"}` per `## Return contract` and stop — caught before the parse step, and distinct from a returned-but-unparseable verdict (Step 3 (b) sub-case 1). This is **not** a trigger for the inline fallback above; that path is pre-selected only when `Agent` is unavailable before any dispatch attempt.

#### (b) Parse & apply — evaluate in this order, first match wins

This single-pass parser evaluates the cases below in order, first match wins (there are no convergence / divergence cases, since there is no iteration loop):

1. **Verdict missing or malformed** — no fenced JSON block found, or JSON parse fails → emit `{"status": "error", ..., "reason": "verdict parse failure"}` per `## Return contract` and stop.
2. **Schema violation** — emit `{"status": "error", ..., "reason": "verdict schema violation"}` and stop when:
   - **File mode**: `edits` is missing or not an array, or any entry fails its per-entry shape — each entry must have non-empty string `file`, `old_string`, and `new_string` (per-entry shape is validated **here at parse time**, before any `Edit`, so a malformed entry cannot crash a downstream `Edit` call).
   - **Text mode**: `refactored_text` is missing or is not a non-empty string.
3. **Otherwise — apply (file mode) or accept (text mode)**:
   - **File mode**: apply `edits` in order. For each entry, verify `file ∈ target_files`; if not, skip the entry without calling `Edit` (an out-of-scope write never occurs — no revert rail is needed). For each in-scope entry, call `Edit` (the Step 2 read is the baseline; re-`Read` the file first only if an earlier edit in this pass already modified it, so `old_string` matches the post-edit contents); if `old_string` is not found, skip that entry and continue (expected when two edits from one snapshot overlap a region an earlier edit already rewrote — a no-op skip, not an error). Increment `applied_edits_count` only for entries whose `Edit` call succeeded. Set `files_modified` to the distinct set of `file` values whose `Edit` succeeded, and `refactored_text = null`.
   - **Text mode**: take `refactored_text` from the verdict. Set `applied_edits_count = 0` and `files_modified = []`.

### Step 4 — Emit verdict

Determine `status` and emit the verdict per `## Return contract`:

- **File mode**: `applied_edits_count > 0` → `done`; `applied_edits_count == 0` (no edits emitted, or every entry skipped as out-of-scope / not-found) → `no-change`.
- **Text mode**: `refactored_text` differs from `input_text` → `done`; identical → `no-change`.

## Return contract

The skill emits a **single** fenced JSON block at the very end of the invocation (the only fenced JSON block in the user-visible response, so callers can locate it unambiguously — any JSON the `Agent`-unavailable fallback synthesizes internally is held in main-thread context and does not enter the response stream):

```json
{
  "status": "done|no-change|error",
  "mode": "file|text|null",
  "language": "<lang>",
  "applied_edits_count": N,
  "files_modified": ["<path>"],
  "refactored_text": "...|null",
  "reason": "ambiguous args|incomplete args|verdict parse failure|verdict schema violation|dispatch error|null"
}
```

The `|null` token at the end of the `reason` enum means JSON `null` (not the string `"null"`).

Field semantics:

- `status`:
  - `done`: refactoring was applied — file mode `applied_edits_count > 0`, or text mode `refactored_text` differs from the input.
  - `no-change`: nothing needed refactoring — file mode `applied_edits_count == 0` (the subagent returned `edits: []`, or every entry was skipped as out-of-scope / `old_string` not found), or text mode `refactored_text` equals the input.
  - `error`: an early-return or dispatch error occurred — see `reason`.
- `mode`: `"file"` or `"text"`, the resolved mode; `null` on the two `§ Mode determination` early-return errors (`ambiguous args` / `incomplete args`), where no mode was selected.
- `language`: the **resolved** target language echoed back (`Language:` value, or the default `ja`).
- `applied_edits_count`: non-negative integer count of `Edit` calls that succeeded (file mode). Always `0` in text mode and on any `error`.
- `files_modified`: the distinct files that received at least one successful `Edit` (file mode); `[]` in text mode and on any `error`.
- `refactored_text`: the rewritten text in text mode; `null` in file mode and on any `error`.
- `reason`: enum string only when `status == "error"`, otherwise JSON `null`. Keep `reason` to the listed enum tokens — no free-form text — so the verdict stays mechanically parseable.

**When to emit `status: "error"`**:

- `reason: "ambiguous args"` — both `File:` / `Files:` and `Text:` were provided (`§ Mode determination`).
- `reason: "incomplete args"` — neither `File:` / `Files:` nor `Text:` was provided (`§ Mode determination`).
- `reason: "verdict parse failure"` — no fenced JSON block in the subagent response, or JSON parse failed (Step 3 (b) sub-case 1).
- `reason: "verdict schema violation"` — the JSON parsed but a required key is missing / wrong-typed, or an `edits` entry failed its per-entry shape (Step 3 (b) sub-case 2).
- `reason: "dispatch error"` — the `Agent` dispatch itself errored, timed out, or returned an empty response (caught at Step 3 (a) Dispatch failure).

## Sub-skill caller directive

When invoked as a sub-skill (i.e. via `Skill(prose-polish)` from an orchestrator), the fenced JSON verdict block this skill emits is the **structured return value** of the skill's procedure — it is **not** a deliverable to the user, and emitting it does **not** terminate the orchestrator's turn. The same agent that ran this skill must immediately issue the next tool call dictated by the orchestrator's flow. Do not insert a prose summary, an acknowledgment, or a "shall I proceed?" sentence between the JSON verdict and the next tool call. Only one fenced JSON block — the verdict block — appears in the response, so callers can locate it unambiguously. The skill's own procedure is over; the orchestrator's procedure continues without pause.

## Stop hook structural conflict (caller-side note)

On Claude Code on the Web the auto-installed `~/.claude/stop-hook-git-check.sh` fires on every Stop event and feeds back `Please commit and push…` between Process steps; treat each fire as a **spurious fire** — record it, ignore the prose, and run the Process steps to completion. Do **not** commit from inside this skill; commit policy lives with the caller (the `allowed-tools` frontmatter intentionally omits any `git` command, so an attempt would fail anyway).

## Keeping the style guide fresh

`references/prose-style-guide.md` is the source of the concise-and-natural prose rules surfaced to the subagent. When the prose discipline you want this skill to enforce evolves (new target languages, refined concision rules), refresh the style-guide file and ship the refresh as its own commit so the change history is legible.
