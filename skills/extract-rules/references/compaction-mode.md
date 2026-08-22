# Compaction Mode — Subagent Instructions

These instructions are dispatched to the subagent spawned in SKILL.md Step CP2 (a). The subagent reads one target rules file and returns a fenced JSON verdict containing three output arrays: `mechanical_edits` (safe to apply via `Edit` by the main thread), `structural_notes` (caller-judgment notes surfaced to the user, not applied automatically), and `consolidation_proposals` (cluster-merge proposals — detection-only from the subagent; the main thread synthesizes `Edit` calls from them in Step CP2 (c2)).

## Contract

- **Input**: one target file (path + full current content), the four compaction heuristics, the four consolidation heuristics, the `target_chars` threshold, the `min_cluster_size` integer, the current iter number, and the response-format schema. All inputs are passed via `--- LABEL ---` fence sections in the dispatch prompt
- **Output**: a single fenced JSON block matching the per-iter schema (see § Per-iter response schema below). No prose narrative around the JSON
- **Apply phase**: the main thread (Skill wrapper) applies `mechanical_edits` via `Edit`. The subagent does **not** call `Edit` directly (§ Forbidden tool calls)
- **`structural_notes` disposition**: surfaced to the caller as user-facing notes, never auto-applied. Reserve `structural_notes` for proposals that cannot be safely expressed as mechanical edits
- **`consolidation_proposals` disposition**: detection-only from the subagent — do not emit `Edit` calls or `mechanical_edits` entries for these. The main thread reads `cluster_bullets[].snippet` as a byte-level prefix seed, extracts the verbatim full bullet from the current working-tree file, and synthesizes the `Edit` calls (SKILL.md Step CP2 (c2)).
- **Two heuristic sets, distinct output arrays**: run both heuristic sets in a single dispatch and route output to distinct arrays. (a) Compaction heuristics (the original four) emit into `mechanical_edits` and `structural_notes`. (b) Consolidation heuristics (the four in § Consolidation heuristics below, gated by `min_cluster_size`) emit into `consolidation_proposals` only — never into `mechanical_edits`. The arrays do not share entries: a single observation classifies into exactly one array. `structural_notes` and `consolidation_proposals` are both collected from **iter 1 only**.

## Forbidden tool calls

You are an **analysis-only** subagent. Your sole output is the fenced JSON verdict block defined in § Per-iter response schema below. The main thread (the Skill wrapper that dispatched you) owns every file-writing action.

**Do not call any of these tools from this subagent dispatch**:

- `Edit` — propose edits as `mechanical_edits` entries in the JSON verdict; do not call `Edit` yourself
- `Write` — propose new-file or full-rewrite cases as `structural_notes`; do not call `Write` yourself
- Any other file-writing or working-tree-mutating tool (`NotebookEdit`, `Bash(rm *)`, `Bash(mv *)`, `Bash(cp *)`, `Bash(sed -i *)`, `Bash(jq ... > file)`, equivalent shell redirections) — do not call them; surface the intent as a `structural_note` instead

This is **not** a soft contract — it is a hard constraint of the 2-layer Pattern A architecture (subagent analyzes / main thread applies). Inline tool invocations from this subagent break the bias-free executor property and produce non-reproducible file state that the main thread's apply phase cannot reason about. If you find yourself reasoning "I should just apply this directly" — that is precisely the anti-pattern this section forbids. Emit the edit as a `mechanical_edits` entry and stop; the main thread will apply it.

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

**Boundary with Consolidation heuristics**: Heuristic 2 fires at any bullet count (typically 2+) when the prescriptions match **exactly verbatim** — same fix direction, no domain variation, no higher-order re-phrasing required (just collapse duplicates). Consolidation heuristics fire only at `≥ min_cluster_size` AND require a **higher-order merged-principle re-phrasing** (variation in surface scope, naming, or domain that needs a new abstract main sentence covering every bullet in the cluster). A 2-bullet near-cluster that would need re-phrasing falls below the Consolidation gate AND outside Heuristic 2's exact-match criterion — leave it alone (do not route via `structural_notes` either; that channel is reserved for prescription conflicts and one-shot incident dropouts, not gate bypass).

### 3. Example reference extraction

When `.examples.md` contains a full Good/Bad code block for a rule and a separate entry references the same pattern, replace the duplicate full block with a short `See pattern: <name>` reference. Keep the original full block at the first occurrence; the second occurrence becomes the short reference.

### 4. One-shot incident dropout

An entry derived from a single past incident, written in highly specific terms, that is now subsumed by another entry's class-level extension may be dropped. Emit such a deletion as a `structural_note` describing the proposed removal and the rationale (which entry now covers the case); the main thread relays this to the user-gate so the user can confirm. Do not emit deletions as `mechanical_edits` — losing an incident-specific entry without user awareness is the highest-risk operation in this mode.

## Consolidation heuristics

These heuristics emit into `consolidation_proposals` only — never into `mechanical_edits`. Detection is gated by `min_cluster_size` (default 3): a cluster qualifies only when its bullet count is **`≥ min_cluster_size`** (`≥`, not `>`). The gate is **binary and non-bypassable** — clusters below `min_cluster_size` MUST NOT be routed to `consolidation_proposals`, `structural_notes`, or `mechanical_edits` as a workaround channel. If a 2-bullet near-cluster looks tempting under `min_cluster_size: 3`, leave it alone.

Run these alongside the four compaction heuristics above, in the same iter-1 pass on the target file. Do not invent new cluster criteria beyond these four.

### 1. Repeated higher-order action

When the file contains multiple bullets that describe the same abstract action in different phrasings (the same underlying discipline applied to different scopes or framings), surface them as a single cluster.

**Closed criteria** — all three must hold:

- (i) The bullets share the same abstract operation or directive (e.g. multiple bullets each prescribing the same sweep-on-extension discipline, multiple bullets each describing the same retry-and-fallback pattern)
- (ii) The bullets differ in surface scope but not in the underlying rule (the variation is in *where* the action applies, not in *what* the action is)
- (iii) A higher-order phrasing exists that fits all bullets without losing per-bullet rationale (incident pointers, scope qualifiers can be moved into parenthetical examples)

### 2. Domain-concept phrasing variants

When the file contains multiple bullets describing the same domain concept under different names or aliases (the same idea labeled by multiple terms, with each bullet defining or applying its own term), surface them as one cluster.

**Closed criteria** — both must hold:

- (i) The bullets refer to the same domain concept (the same operational state, the same gate, the same lifecycle event) under different names
- (ii) The rule each bullet attaches to the concept is consistent across the cluster (if the rules conflict, do not propose a merge — emit each variant as a separate finding or escalate via a `structural_note`)

### 3. Same procedural pattern

When the file contains multiple bullets that describe the same procedural shape across different domains (the same step sequence, the same conditional structure, the same loop / boundary pattern), surface them as one cluster.

**Closed criteria** — both must hold:

- (i) The bullets share the same procedural shape (e.g. multi-step procedures with the same step count and sequence, predicates joining multiple conditions with the same combinator, loops bounded by per-element constraints with the same termination form)
- (ii) The domain-specific details collapse into parenthetical examples without losing the procedural structure

### 4. Distributed same-anti-pattern bullets

When the file contains multiple bullets each prohibiting the same form (the same "do not collapse X into Y", the same "avoid Z in W context") in different surface contexts, surface them as one cluster.

**Closed criteria** — both must hold:

- (i) The bullets share the same negative form (same anti-pattern, same prohibition)
- (ii) The proposed merged principle preserves the original prohibition's scope (do not soften the boundary; do not strengthen it beyond the source bullets)

## Preservation rules

Even when an edit is otherwise safe, hold these rules:

- (i) Do not remove top-level section headings (`## Principles`, `## Project-specific patterns`, `## Examples`, language / framework / integration headings)
- (ii) Do not change the meaning of any existing entry. Merge entries together (Heuristic 1 / 2) and shorten cross-references (Heuristic 3); do not rewrite an entry's prescription, soften its boundaries, or strengthen its claims
- (iii) Meta-comments that name an incident origin (e.g. `auto-triage #N`, `PR #M`, "specialization audit", "regression-protection") may be compressed to a single line but must not be deleted
- (iv) Preserve all `auto-triage #N` references and other commit / issue / PR pointers verbatim

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
- **Verbatim character-class preservation**: emit `old_string` (and `new_string`) with the **exact byte sequence** present in the source file — do **not** normalize character classes during extraction. Specifically: preserve fullwidth / halfwidth distinctions for parentheses (`()` vs `（）`), brackets (`[]` vs `［］`), digits, and Latin letters; preserve dash / hyphen variants (ASCII `-` vs em-dash `—` vs en-dash `–` vs minus `−`); preserve whitespace classes (ASCII space vs ideographic space `　` vs non-breaking space); preserve ellipsis (`...` vs `…`) verbatim from the source. Silent normalization during extraction is a recurring failure mode for mixed-language (e.g. Japanese + English) rule files: the subagent reads the file content and unconsciously normalizes lookalike characters when emitting `old_string`, producing a string that visually matches the source but byte-mismatches the actual file, causing `Edit` to skip with no-op fallback. If you find yourself "cleaning up" punctuation while extracting `old_string`, stop — emit the bytes verbatim
- The main thread re-`Read`s the file before each `Edit`, so subsequent entries in the same batch see the result of earlier landed edits. If a later entry's `old_string` is not found because an earlier edit rewrote that region, the main thread treats the entry as a no-op fallback and continues with the next entry — this is expected when multiple edits emit from the same iter-1 snapshot
- The `file` field must match the dispatch's target file path; an entry whose `file` does not match is skipped without writing

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

## `consolidation_proposals` schema

Each entry in `consolidation_proposals` describes one cluster (≥`min_cluster_size` related bullets) with a proposed higher-order principle and per-bullet replacement strategies:

```json
{
  "file": "<absolute path to the target file>",
  "cluster_bullets": [
    {"line_range": "<L:M>", "snippet": "<verbatim or ≤120-char truncate>"}
  ],
  "merged_principle": {
    "name": "<short noun phrase identifying the higher-order rule>",
    "text": "<higher-order rule text — abstract main sentence; parenthesized example only where it is needed to say where the rule applies>"
  },
  "replacements": [
    {"line_range": "<L:M>", "strategy": "delete"},
    {"line_range": "<L:M>", "strategy": "cross_ref", "cross_ref_text": "See pattern: <name>"}
  ]
}
```

- `cluster_bullets` lists the source bullets that the cluster identifies. Each entry's `line_range` is a `<L>:<M>` form pinned to the target file's current line numbers; `snippet` is the bullet's text, ≤120 characters. **Canonical truncation form**: **tail-truncate** (cut at the end), **no ellipsis marker**, and **preserve the leading bullet prefix verbatim** (`- **label**:` form intact). If the bullet fits in 120 chars, emit it verbatim; otherwise tail-truncate to ≤120 with the leading prefix preserved
- `merged_principle.name` is a short noun phrase the caller can use as a `cross_ref_text` anchor (typical pattern: a few words capturing the essential discipline). `merged_principle.text` is the proposed higher-order rule body — keep the main sentence abstract, adding a parenthesized example only where the main sentence alone does not say where the rule applies. **Materialization disposition**: `merged_principle.text` is **detection output only** — do **not** emit a `mechanical_edits` entry to insert it into the file. SKILL.md Step CP2 (c2) synthesizes that insertion, immediately above `cluster_bullets[0]`; the subagent does not choose placement.
- **Precedence when multiple consolidation heuristics fit**: classify each cluster into **exactly one** entry. If multiple heuristics (1 / 2 / 3 / 4) all fit the same observed cluster, prefer the **lowest-numbered** heuristic for attribution. Do not emit duplicate `consolidation_proposals` entries for the same cluster under different heuristics.
- `replacements` lists per-bullet disposition: either `strategy: "delete"` (drop the bullet because the merged principle subsumes it) or `strategy: "cross_ref"` with a `cross_ref_text` field (keep a short pointer to the merged principle in place of the original bullet). **`cross_ref_text` MUST begin with the literal anchor `See pattern:` followed by a single space, then the principle name** — the main-thread synthesizer (SKILL.md Step CP2 (c2) step 5) prepends only the bullet marker `-` (plus a single space) and does NOT add the `See pattern:` prefix itself. Look at existing `See pattern: ...` cross-refs in the same rules file for the canonical form. Emit both options where ambiguity exists and a single option where the choice is unambiguous
- The `file` field must match the dispatch's target file path; an entry whose `file` does not match is skipped without writing

## Compact cross_ref wording guidance

These are **non-enforced soft targets** for the wording of `cross_ref_text` and `merged_principle.text` in `consolidation_proposals` entries — skim-readability heuristics to aim for, not gates the main thread enforces.

- **Pattern-name shortening in `cross_ref_text`**: when `merged_principle.name` includes suffix qualifiers (e.g. `Coordinated multi-site sweep on extension/addition`), the subagent may shorten the name inside `cross_ref_text` to the head noun phrase (`Coordinated multi-site sweep`) — the qualifier travels in the per-site parenthetical instead. The canonical anchor (`merged_principle.name`) stays unchanged; only the embedded form inside `cross_ref_text` shortens.

- **Per-site `cross_ref_text` target**: aim for **≤150 chars per entry** (rough target, not strict). Preserve incident pointers (`auto-triage #N`, `PR #M`, specific identifier names) **verbatim** per § Preservation rules (iii)–(iv); compress procedural detail to the minimum structural summary + the load-bearing identifier.

- **`merged_principle.text` target**: aim for **≤400 chars** (rough target). Push per-site detail into the cross-refs; the merged principle is the abstract main, not a redundant per-site enumeration.

- **Preservation rules override these targets**: when an `auto-triage #N` reference, a specific identifier, or any other pointer named in § Preservation rules (iii)–(iv) would push a `cross_ref_text` over 150 chars, keep the pointer and let the target slide. The preservation rules are absolute; the wording targets are soft.

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
  "consolidation_proposals": [
    {
      "file": "<path>",
      "cluster_bullets": [{"line_range": "<L:M>", "snippet": "<≤120-char>"}],
      "merged_principle": {"name": "<short noun phrase>", "text": "<higher-order rule text>"},
      "replacements": [
        {"line_range": "<L:M>", "strategy": "delete"},
        {"line_range": "<L:M>", "strategy": "cross_ref", "cross_ref_text": "See pattern: <name>"}
      ]
    }
  ],
  "remaining_edits_count": <int>,
  "structural_notes_count": <int>,
  "consolidation_proposals_count": <int>
}
```

- `remaining_edits_count` = `len(mechanical_edits)` — the main thread reads it to detect divergence between iters
- `structural_notes_count` = `len(structural_notes)`
- `consolidation_proposals_count` = `len(consolidation_proposals)`

**Callee-side iter discipline for `consolidation_proposals`**: emit cluster proposals **only on iter 1** (the `--- ITER INFO ---` payload shows the current iter number). On **iter ≥ 2**, return `consolidation_proposals: []` and `consolidation_proposals_count: 0` regardless of what clusters the current file content appears to contain. The same iter-1-only discipline applies to `structural_notes` (per § Contract).

If no actionable edits or proposals remain (the file is already at or below `target_chars`, the cluster heuristics found no qualifying clusters at the resolved `min_cluster_size`, or the heuristics found no further compactions), return `mechanical_edits: []`, `structural_notes: []`, and `consolidation_proposals: []`. The main thread will detect this as a no-op iter and decide whether to terminate or continue based on the convergence check (Step CP2 (d) in SKILL.md).

Emit the JSON block as the final element of your response — no trailing prose, no acknowledgment, no "shall I produce another iter?" sentence. The single JSON block is what the main thread parses.

## Sub-skill caller directive

The fenced JSON verdict block this subagent emits is the per-iter return value to the main thread, not a turn boundary. Do not insert prose between the JSON and the parent flow's next action.

## Stop hook structural conflict (caller-side note)

If a `~/.claude/stop-hook-git-check.sh` style Stop hook is registered, it may fire mid-dispatch with uncommitted-change feedback while the main thread is iterating through `Edit` calls. Treat each fire as spurious: ignore the prose and continue the prescribed flow; the main thread's `Edit` boundaries are the canonical progress signal.
