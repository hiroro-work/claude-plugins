# Compaction Mode — Subagent Instructions

These instructions are dispatched to the subagent spawned in SKILL.md Step CP2 (a). The subagent reads one target rules file and returns a fenced JSON verdict containing three output arrays: `mechanical_edits` (safe to apply via `Edit` by the main thread), `structural_notes` (caller-judgment notes surfaced to the user, not applied automatically), and `consolidation_proposals` (cluster-merge proposals — detection-only output from the subagent; the main thread synthesizes `Edit` calls from these proposals in Step CP2 (c2), so the subagent's analysis-only contract is preserved while consolidation auto-apply is achieved at the main-thread layer).

## Contract

- **Input**: one target file (path + full current content), the four compaction heuristics, the four consolidation heuristics, the `target_chars` threshold, the `min_cluster_size` integer, the current iter number, and the response-format schema. All inputs are passed via `--- LABEL ---` fence sections in the dispatch prompt
- **Output**: a single fenced JSON block matching the per-iter schema (see § Per-iter response schema below). No prose narrative around the JSON
- **Apply phase**: the main thread (Skill wrapper) applies `mechanical_edits` via `Edit`. The subagent does **not** call `Edit` directly — this preserves the bias-free executor property (the analysis subagent is fresh per dispatch, while the apply phase stays in the main thread's working-tree context)
- **`structural_notes` disposition**: the main thread surfaces these as user-facing notes (e.g. `dev-workflow` Step 11 user-gate). They are never auto-applied. Reserve `structural_notes` for proposals that cannot be safely expressed as mechanical edits
- **`consolidation_proposals` disposition**: detection-only output from the subagent perspective (the subagent does not emit `Edit` calls or `mechanical_edits` entries for these — its analysis-only contract is preserved). At the main-thread layer, however, the cluster description is **auto-applied** by SKILL.md Step CP2 (c2): the main thread reads `cluster_bullets[].snippet` as a byte-level prefix seed, extracts the verbatim full bullet from the current working-tree file, and synthesizes `Edit` calls (insertion of `merged_principle.text` + per-bullet `replacements` strategy). The `consolidation_proposals` array in the per-file record is therefore the applied-cluster trace surfaced to the user-gate caller (e.g. `dev-workflow` Step 11), not a caller-judgment proposal.
- **Two heuristic sets, distinct subagent output arrays**: the subagent runs both heuristic sets in a single dispatch and routes output to distinct arrays. (a) Compaction heuristics (the original four) emit into `mechanical_edits` (auto-applied via main-thread `Edit` calls in Step CP2 (c1)) and `structural_notes` (caller-judgment, never auto-applied). (b) Consolidation heuristics (the four added in § Consolidation heuristics below, gated by `min_cluster_size`) emit into `consolidation_proposals` only — never into `mechanical_edits` (the subagent's analysis-only contract preserves cross-array disjointness at the subagent emission layer). The arrays do not share entries: a single observation classifies into exactly one array at the subagent layer. `structural_notes` and `consolidation_proposals` are both collected from **iter 1 only** (same `inferred_intent persistence` discipline; iter 2 reads modified content where cluster boundaries may have drifted). Main-thread layer note: SKILL.md Step CP2 (c2) synthesizes `Edit` calls from `consolidation_proposals` (separate from `mechanical_edits` — the disjointness above is between subagent-emitted arrays, not between subagent emission and main-thread synthesis).

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

**Boundary with Consolidation heuristics**: Heuristic 2 fires at any bullet count (typically 2+) when the prescriptions match **exactly verbatim** — same fix direction, no domain variation, no higher-order re-phrasing required (just collapse duplicates). Consolidation heuristics fire only at `≥ min_cluster_size` AND require a **higher-order merged-principle re-phrasing** (variation in surface scope, naming, or domain that needs an abstract main + parenthesized examples form). A 2-bullet near-cluster that would need re-phrasing falls below the Consolidation gate AND outside Heuristic 2's exact-match criterion — leave it alone (do not route via `structural_notes` either; that channel is reserved for prescription conflicts and one-shot incident dropouts, not gate bypass).

### 3. Example reference extraction

When `.examples.md` contains a full Good/Bad code block for a rule and a separate entry references the same pattern, replace the duplicate full block with a short `See pattern: <name>` reference. Keep the original full block at the first occurrence; the second occurrence becomes the short reference.

### 4. One-shot incident dropout

An entry derived from a single past incident, written in highly specific terms, that is now subsumed by another entry's class-level extension may be dropped. Emit such a deletion as a `structural_note` describing the proposed removal and the rationale (which entry now covers the case); the main thread relays this to the user-gate so the user can confirm. Do not emit deletions as `mechanical_edits` — losing an incident-specific entry without user awareness is the highest-risk operation in this mode.

## Consolidation heuristics

These heuristics emit into `consolidation_proposals` only — the subagent never emits `mechanical_edits` for them (analysis-only contract, see § Forbidden tool calls). The main thread synthesizes the actual `Edit` calls from the cluster description in Step CP2 (c2). Detection is gated by `min_cluster_size` (default 3): a cluster qualifies only when its bullet count is **`≥ min_cluster_size`** (`≥`, not `>`). The gate is **binary and non-bypassable** — clusters below `min_cluster_size` MUST NOT be routed to `consolidation_proposals`, `structural_notes`, or `mechanical_edits` as a workaround channel. If a 2-bullet near-cluster looks tempting under `min_cluster_size: 3`, leave it alone. Each proposal carries a merged-principle text plus per-bullet replacement strategies (`delete` or `cross_ref`) so the main-thread synthesis layer can construct the corresponding `Edit` calls.

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
    "text": "<higher-order rule text — abstract main + parenthesized concrete examples form>"
  },
  "replacements": [
    {"line_range": "<L:M>", "strategy": "delete"},
    {"line_range": "<L:M>", "strategy": "cross_ref", "cross_ref_text": "See pattern: <name>"}
  ]
}
```

- `cluster_bullets` lists the source bullets that the cluster identifies. Each entry's `line_range` is a `<L>:<M>` form pinned to the target file's current line numbers; `snippet` is the bullet's text, ≤120 characters. **Canonical truncation form** (so different subagent runs produce comparable snippets): **tail-truncate** (cut at the end), **no ellipsis marker**, and **preserve the leading bullet prefix verbatim** (`- **label**:` form intact). If the bullet fits in 120 chars, emit it verbatim; otherwise tail-truncate to ≤120 with the leading prefix preserved
- `merged_principle.name` is a short noun phrase the caller can use as a `cross_ref_text` anchor (typical pattern: a few words capturing the essential discipline). `merged_principle.text` is the proposed higher-order rule body — keep it in the abstract-main + parenthesized-concrete-examples form (see § Distribution-aware fix direction in the dev-workflow bundle's `references/self-retrospective.md` for the canonical phrasing pattern that applies to distributed rule prose). **Materialization disposition** (subagent layer): `merged_principle.text` is **detection output only** from the subagent — the subagent does **not** emit a `mechanical_edits` entry to insert it into the file (this preserves the analysis-only contract; see § Forbidden tool calls). **Auto-apply** (main-thread layer): SKILL.md Step CP2 (c2) reads the cluster description and synthesizes the `Edit` calls (insertion of `merged_principle.text` immediately above `cluster_bullets[0]` + per-replacement edits). Placement is fixed at "immediately above `cluster_bullets[0]`" — the subagent does not choose placement; the main-thread synthesis applies this canonical placement uniformly. Compact wording targets for cross-ref text and merged-principle text are described in § Compact cross_ref wording guidance below.
- **Precedence when multiple consolidation heuristics fit**: classify each cluster into **exactly one** entry. If multiple heuristics (1 / 2 / 3 / 4) all fit the same observed cluster, prefer the **lowest-numbered** heuristic for attribution. Do not emit duplicate `consolidation_proposals` entries for the same cluster under different heuristics. The cross-array disjointness rule (§ Contract, "arrays do not share entries") generalizes intra-array as well: one observation → one entry. (Disjointness applies at the subagent emission layer; main-thread synthesis of `Edit` calls from `consolidation_proposals` is a separate layer and does not violate this rule.)
- `replacements` lists per-bullet disposition: either `strategy: "delete"` (drop the bullet because the merged principle subsumes it) or `strategy: "cross_ref"` with a `cross_ref_text` field (keep a short pointer to the merged principle in place of the original bullet). **`cross_ref_text` MUST begin with the literal anchor `See pattern:` followed by a single space, then the principle name** — the main-thread synthesizer (SKILL.md Step CP2 (c2) step 5) prepends only the bullet marker `-` (plus a single space) and does NOT add the `See pattern:` prefix itself. Look at existing `See pattern: ...` cross-refs in the same rules file for the canonical form. The caller / user-gate decides which strategy to apply per bullet; the subagent emits both options where ambiguity exists and a single option where the choice is unambiguous
- The `file` field must match the dispatch's target file path. The main thread enforces the same scope rail used for `mechanical_edits` / `structural_notes`: any entry whose `file` does not match is skipped without writing

> **Per-iter vs aggregated shape asymmetry**: same convention as `structural_notes` above — the per-iter response includes `file` on every `consolidation_proposals` entry for scope-rail validation; the aggregated form surfaced through SKILL.md Step CP2 (f) and the Step CP4 top-level schema drops `file` (the per-file record's `path` carries the location).

## Compact cross_ref wording guidance

This subsection gives **non-enforced soft targets** for the wording of cross-ref text and merged-principle text in `consolidation_proposals` entries. These are not strict thresholds — the project rule `Threshold magic numbers anchored on observable platform signals + buffer ratio` (which governs strict config defaults like `compaction_threshold`) does **not** apply here; the targets below are skim-readability heuristics the subagent should aim for, not gates the main thread enforces.

- **Pattern-name shortening in `cross_ref_text`**: when `merged_principle.name` includes suffix qualifiers (e.g. `Coordinated multi-site sweep on extension/addition`), the subagent may shorten the name inside `cross_ref_text` to the head noun phrase (`Coordinated multi-site sweep`) — the qualifier travels in the per-site parenthetical instead. The canonical anchor (`merged_principle.name`) stays unchanged; only the embedded form inside `cross_ref_text` shortens.

- **Per-site `cross_ref_text` target**: aim for **≤150 chars per entry** (rough target, not strict). Rationale: one line at a 132-char editor wrap plus per-site identifier still leaves room for the leading `See pattern:` prefix; bullets longer than this lose skim-readability in the rule file. Preserve incident pointers (`auto-triage #N`, `PR #M`, specific identifier names) **verbatim** per § Preservation rules (iii)–(iv); compress procedural detail to the minimum structural summary + the load-bearing identifier.

- **`merged_principle.text` target**: aim for **≤400 chars** (rough target). Rationale: this is an empirically-observed upper bound at which a merged-principle bullet remains scannable in roughly 30 seconds (anchored on observed compaction sessions where 5 cross-refs + 1 merged-principle for a single cluster compressed to ≈700 chars total). Push per-site detail into the cross-refs; the merged principle is the abstract main, not a redundant per-site enumeration.

- **Preservation rules override these targets**: when an `auto-triage #N` reference, a specific identifier, or any other pointer named in § Preservation rules (iii)–(iv) would push a `cross_ref_text` over 150 chars, keep the pointer and let the target slide. The preservation rules are absolute; the wording targets are soft.

- **Why these targets are not strict**: the targets exist so the subagent's output stays readable when the main-thread synthesis lands it into the rule file. They are not enforced because (i) preservation rules can legitimately push individual bullets longer, (ii) the targets are subjective skim-readability heuristics, and (iii) the main thread synthesis applies the cross_ref / merged_principle text verbatim — there is no truncation step. The subagent should treat the targets as guidance, not gates.

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

- `remaining_edits_count` = `len(mechanical_edits)` — used by the main thread to detect divergence between iters (if iter 2 returns the same `(remaining_edits_count, structural_notes_count)` multiset as iter 1, the loop terminates with per-file `status: "unresolved"`). `consolidation_proposals_count` is reported for completeness but does **not** participate in the divergence multiset (consolidation_proposals are collected from iter 1 only)
- `structural_notes_count` = `len(structural_notes)`
- `consolidation_proposals_count` = `len(consolidation_proposals)`

**Callee-side iter discipline for `consolidation_proposals`**: emit cluster proposals **only on iter 1** (the `--- ITER INFO ---` payload shows the current iter number). On **iter ≥ 2**, return `consolidation_proposals: []` and `consolidation_proposals_count: 0` regardless of what clusters the current file content appears to contain — iter 1's `mechanical_edits` apply may have drifted cluster boundaries, and re-detection at iter 2 yields noise the main thread filters out anyway. The same iter-1-only discipline applies to `structural_notes` (per § Contract). Keep both rules subagent-enforced so the contract is symmetric between the orchestrator (SKILL.md Step CP2 (a)'s note) and this callee contract.

If no actionable edits or proposals remain (the file is already at or below `target_chars`, the cluster heuristics found no qualifying clusters at the resolved `min_cluster_size`, or the heuristics found no further compactions), return `mechanical_edits: []`, `structural_notes: []`, and `consolidation_proposals: []`. The main thread will detect this as a no-op iter and decide whether to terminate or continue based on the convergence check (Step CP2 (d) in SKILL.md).

Emit the JSON block as the final element of your response — no trailing prose, no acknowledgment, no "shall I produce another iter?" sentence. The single JSON block is what the main thread parses.

## Sub-skill caller directive

The fenced JSON verdict block this subagent emits is the per-iter return value — see `SKILL.md` § Sub-skill caller directive for the canonical wording (this is the per-iter / per-subagent equivalent of the same return-value-not-turn-boundary discipline; do not insert prose between the JSON and the parent flow's next action).

## Stop hook structural conflict (caller-side note)

If a `~/.claude/stop-hook-git-check.sh` style Stop hook is registered, it may fire mid-dispatch with uncommitted-change feedback while the main thread is iterating through `Edit` calls. This is a known structural conflict between non-interactive Pattern A flows and per-turn hooks — see `§ Stop hook structural conflict` in `dev-workflow` SKILL.md (the canonical orchestrator for `--compact` invocations). Ignore such feedback and continue the prescribed flow; the main thread's `Edit` boundaries are the canonical progress signal.
