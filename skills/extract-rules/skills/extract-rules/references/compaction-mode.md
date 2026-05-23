# Compaction Mode — Subagent Instructions

These instructions are dispatched to the subagent spawned in SKILL.md Step CP2 (a). The subagent reads one target rules file and returns a fenced JSON verdict containing `mechanical_edits` (safe to apply via `Edit`) and `structural_notes` (caller-judgment notes that are surfaced to the user, not applied automatically).

## Contract

- **Input**: one target file (path + full current content), the four compaction heuristics, the `target_chars` threshold, the current iter number, and the response-format schema. All inputs are passed via `--- LABEL ---` fence sections in the dispatch prompt
- **Output**: a single fenced JSON block matching the per-iter schema (see § Per-iter response schema below). No prose narrative around the JSON
- **Apply phase**: the main thread (Skill wrapper) applies `mechanical_edits` via `Edit`. The subagent does **not** call `Edit` directly — this preserves the bias-free executor property (the analysis subagent is fresh per dispatch, while the apply phase stays in the main thread's working-tree context)
- **`structural_notes` disposition**: the main thread surfaces these as user-facing notes (e.g. `dev-workflow` Step 11 user-gate). They are never auto-applied. Reserve `structural_notes` for proposals that cannot be safely expressed as mechanical edits

## Forbidden tool calls

You are an **analysis-only** subagent. Your sole output is the fenced JSON verdict block defined in § Per-iter response schema below. The main thread (the Skill wrapper that dispatched you) owns every file-writing action.

**Do not call any of these tools from this subagent dispatch**:

- `Edit` — propose edits as `mechanical_edits` entries in the JSON verdict; do not call `Edit` yourself
- `Write` — propose new-file or full-rewrite cases as `structural_notes`; do not call `Write` yourself
- Any other file-writing or working-tree-mutating tool (`NotebookEdit`, `Bash(rm *)`, `Bash(mv *)`, `Bash(cp *)`, `Bash(sed -i *)`, `Bash(jq ... > file)`, equivalent shell redirections) — do not call them; surface the intent as a `structural_note` instead

This is **not** a soft contract — it is a hard constraint of the 2-layer Pattern A architecture (subagent analyzes / main thread applies). Inline tool invocations from this subagent break the bias-free executor property and produce non-reproducible file state that the main thread's apply phase cannot reason about. If you find yourself reasoning "I should just apply this directly" — that is precisely the anti-pattern this section forbids. Emit the edit as a `mechanical_edits` entry and stop; the main thread will apply it.

The same rule applies class-wide to Pattern A sibling skills whose dispatched subagents are likewise analysis-only. Sibling Pattern A subagent prompts may cross-reference this section rather than re-stating it inline.

## Heuristics

Apply these four heuristics during analysis. Each is a closed criterion — only emit an edit / note when the criterion is met. Do not invent new merge / drop patterns beyond these four.

### 1. Class-level extension merge

When two existing entries share the same structural pattern and one is a class-level extension (specialization audit, extension audit, "applies also to sibling X") of the other, merge them into one entry that preserves the main rule from the original and compresses the specialization into parenthetical application examples or category enumerations.

**Closed criteria** — all three must hold:

- (i) The two entries address the same structural pattern (same general rule, same defect class, or same recurring scenario)
- (ii) One entry is a class-level audit / extension audit / specialization of the other (it generalizes or extends the original to a wider scope)
- (iii) After merging, the original entry's rationale (incident origin, the "why") remains readable in the merged form

If any of the three criteria is doubtful, do not merge — emit a `structural_note` instead so the caller can judge.

### 2. Similar-entry merge

When multiple entries describe the same pattern (same prescription, same anti-pattern, same fix direction) without one being a class-level extension of the other, merge them into a single entry. If the entries conflict on the prescription (one says X, the other says Y), do not merge — emit a `structural_note` describing the conflict and let the caller resolve.

### 3. Example reference extraction

When `.examples.md` contains a full Good/Bad code block for a rule and a separate entry references the same pattern, replace the duplicate full block with a short `See pattern: <name>` reference. Keep the original full block at the first occurrence; the second occurrence becomes the short reference.

### 4. One-shot incident dropout

An entry derived from a single past incident, written in highly specific terms, that is now subsumed by another entry's class-level extension may be dropped. Emit such a deletion as a `structural_note` describing the proposed removal and the rationale (which entry now covers the case); the main thread relays this to the user-gate so the user can confirm. Do not emit deletions as `mechanical_edits` — losing an incident-specific entry without user awareness is the highest-risk operation in this mode.

## Preservation rules

Even when an edit is otherwise safe, hold these rules:

- (i) Do not remove top-level section headings (`## Principles`, `## Project-specific patterns`, `## Examples`, language / framework / integration headings). Section structure is part of the file's contract with `extract-rules` and `apply-rules`
- (ii) Do not change the meaning of any existing entry. Merge entries together (Heuristic 1 / 2) and shorten cross-references (Heuristic 3); do not rewrite an entry's prescription, soften its boundaries, or strengthen its claims
- (iii) Meta-comments that name an incident origin (e.g. `auto-triage #N`, `PR #M`, "specialization audit", "regression-protection") may be compressed to a single line but must not be deleted — the incident pointer is what allows future readers to trace why a rule exists
- (iv) Preserve all `auto-triage #N` references and other commit / issue / PR pointers verbatim. These are stable identifiers, not prose

## `mechanical_edits` schema

Each entry in `mechanical_edits`:

```json
{
  "file": "<absolute path to the target file>",
  "old_string": "<verbatim string to replace, including 1–3 lines of surrounding context for uniqueness>",
  "new_string": "<replacement string>"
}
```

- `old_string` must match exactly one location in the target file. Include **1–3 lines of surrounding context** so the snippet is unique within the file (short one-liners collide and cause the `Edit` to fail)
- **Verbatim character-class preservation (load-bearing)**: emit `old_string` (and `new_string`) with the **exact byte sequence** present in the source file — do **not** normalize character classes during extraction. Specifically: preserve fullwidth / halfwidth distinctions for parentheses (`()` vs `（）`), brackets (`[]` vs `［］`), digits, and Latin letters; preserve dash / hyphen variants (ASCII `-` vs em-dash `—` vs en-dash `–` vs minus `−`); preserve whitespace classes (ASCII space vs ideographic space `　` vs non-breaking space); preserve ellipsis (`...` vs `…`) verbatim from the source. Silent normalization during extraction is a recurring failure mode for mixed-language (e.g. Japanese + English) rule files: the subagent reads the file content and unconsciously normalizes lookalike characters when emitting `old_string`, producing a string that visually matches the source but byte-mismatches the actual file, causing `Edit` to skip with no-op fallback. The result is a low `applied_edits_count` for what would otherwise be a clean apply — debug-wise often misread as "no-op fallback for overlapping edits" when the actual cause is character-class mismatch. If you find yourself "cleaning up" punctuation while extracting `old_string`, stop — emit the bytes verbatim
- The main thread re-`Read`s the file before each `Edit`, so subsequent entries in the same batch see the result of earlier landed edits. If a later entry's `old_string` is not found because an earlier edit rewrote that region, the main thread treats the entry as a no-op fallback and continues with the next entry — this is expected when multiple edits emit from the same iter-1 snapshot
- The `file` field must match the dispatch's target file path. The main thread enforces a scope rail: any entry whose `file` does not match is skipped without writing (no `Edit` call is issued), and the rejected path is recorded but no working-tree side effect occurs

## `structural_notes` schema

Each entry in `structural_notes`:

```json
{
  "file": "<absolute path to the target file>",
  "description": "<what change is being proposed, in 1-2 sentences>",
  "rationale": "<why mechanical_edits cannot safely express it, in 1-2 sentences>"
}
```

Use `structural_notes` for proposals that are either too risky to mechanize (e.g. merging entries whose prescriptions conflict on a boundary) or too coarse to express as a single `Edit` (e.g. removing a one-shot-incident entry that the caller should consciously accept).

> **Per-iter vs aggregated shape asymmetry**: the per-iter response above includes a `file` field on every `structural_notes` entry so the main thread's scope-rail validation can confirm the entry targets the dispatched file. The aggregated form surfaced through SKILL.md Step CP2 (f) and the Step CP4 top-level schema drops `file` (entries become `{description, rationale}`) because each aggregated note already belongs to a per-file record whose `path` field carries the location. The asymmetry is intentional: per-iter needs `file` for validation, per-file rolls up to a single file context already named at the record level.

## Per-iter response schema

Emit a single fenced JSON block at the end of the response, matching the per-iter schema:

```json
{
  "mechanical_edits": [
    {"file": "<path>", "old_string": "<str>", "new_string": "<str>"}
  ],
  "structural_notes": [
    {"file": "<path>", "description": "<str>", "rationale": "<str>"}
  ],
  "remaining_edits_count": <int>,
  "structural_notes_count": <int>
}
```

- `remaining_edits_count` = `len(mechanical_edits)` — used by the main thread to detect divergence between iters (if iter 2 returns the same `(remaining_edits_count, structural_notes_count)` multiset as iter 1, the loop terminates with per-file `status: "unresolved"`)
- `structural_notes_count` = `len(structural_notes)`

If no actionable edits remain (the file is already at or below `target_chars`, or the heuristics found no further compactions), return `mechanical_edits: []` and `structural_notes: []`. The main thread will detect this as a no-op iter and decide whether to terminate or continue based on the convergence check (Step CP2 (d) in SKILL.md).

Emit the JSON block as the final element of your response — no trailing prose, no acknowledgment, no "shall I produce another iter?" sentence. The single JSON block is what the main thread parses.

## Sub-skill caller directive

The fenced JSON verdict block this subagent emits is the per-iter return value — see `SKILL.md` § Sub-skill caller directive for the canonical wording (this is the per-iter / per-subagent equivalent of the same return-value-not-turn-boundary discipline; do not insert prose between the JSON and the parent flow's next action).

## Stop hook structural conflict (caller-side note)

If a `~/.claude/stop-hook-git-check.sh` style Stop hook is registered, it may fire mid-dispatch with uncommitted-change feedback while the main thread is iterating through `Edit` calls. This is a known structural conflict between non-interactive Pattern A flows and per-turn hooks — see `§ Stop hook structural conflict` in `dev-workflow` SKILL.md (the canonical orchestrator for `--compact` invocations). Ignore such feedback and continue the prescribed flow; the main thread's `Edit` boundaries are the canonical progress signal.
