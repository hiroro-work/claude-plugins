# Check Rules — verify-skill-refs

Canonical home for the detection rules the lint executor applies. `SKILL.md` injects this file verbatim into the dispatch payload as `--- CHECK RULES ---` (single canonical home; do not duplicate these rules in `SKILL.md`).

**Path convention**: every file reference in this document — including manifest anchors — is **target-root-relative** (`SKILL.md`, `references/<file>.md`), so a `Target dir:` override resolves identically to the default target.

## Class (a) — Cross-reference resolution

**Reference forms to extract (closed list of variants):**

1. **Section references**: `§ <Heading>` — optionally wrapped in backticks, optionally with nested backticks inside the heading text (e.g. `` `§ Configuration's `subagent_model` bullet` ``), optionally carrying a possessive `'s` plus a trailing descriptor (`§ Step 6's **Cross-layer review handoff ledger** paragraph`).
2. **Qualified file + section references**: `references/<file>.md § <Heading>`, `<file>.md § <Heading>`, `SKILL.md § <Heading>`.
3. **Bold-prose-label references**: a quoted label naming a paragraph — `Step N's "<label>" paragraph`, `§ <Heading>'s "<label>" paragraph`, `the "<label>" paragraph`. The quoted label resolves against a `**<label>**` bold span.

Source of truth for the reference-form convention: `.claude/rules/project.rules.md` § SKILL.md設計's stable-anchor cross-reference bullet and `.claude/rules/project.rules.local.md`'s "Bold-prose label cross-reference style" bullet — keep this closed list in sync when those rules evolve.

**Extraction exclusions (do not extract):**

- Candidates containing an angle-bracket placeholder (`<...>`) — template forms such as `§ <Heading>` document the convention itself and are not references.
- Candidates inside fenced code blocks (code samples and command snippets quote reference syntax without referring). Mechanical fence filter: one root-wide Grep of the fence-delimiter pattern (`` ^\s*``` ``), grouped per file, then derive the in-fence line intervals from the delimiter pairs and drop candidates whose line number falls inside an interval — no per-candidate Read.

**Resolution procedure:**

1. Build a per-file **heading index** once (all `#`–`####` lines). No bold-span index is built — bold density in this tree makes a full `**...**` index cost far more than the few dozen label keys actually referenced; label keys resolve by reverse lookup in step 4.
2. Normalize each extracted candidate: strip wrapping backticks / quotes; split off a possessive tail (`'s <descriptor>`) — the text before the possessive is the **heading key**, and a quoted or bold label inside the descriptor tail is a **label key**. Compare heading keys against index entries with whitespace-normalized prefix matching (a reference may cite a stable prefix of a longer heading, e.g. `§ Step 10: Interactive Commits` against the heading `Step 10: Interactive Commits`).
3. **Resolution scope model**:
   - **Qualified form** → resolve only within the named file.
   - **Unqualified form** (`§ <Heading>` alone) → resolve in the same file first, then `SKILL.md`, then any other target file. A violation means the key resolves **nowhere in the tree** — `SKILL.md` legitimately cites headings that live in a references file (e.g. `§ User-gate summary preamble`). The same-file → `SKILL.md` order is the documented convention (seed: `references/update-rules.md`'s opening declaration).
   - A key resolving in **more than one file is resolved** — e.g. "Char-count compaction gate" intentionally exists in both `SKILL.md` and `references/update-rules.md` (documented at the top of `references/update-rules.md`). Never flag multi-resolution.
4. Label keys resolve via a **candidate-driven existence Grep**: for each label key, Grep the literal `**<label>**` (whitespace-normalized) within the resolution scope — cost scales with the number of referenced labels (small), not the tree's bold density (large).

**Demotion rule (violation vs warning):**

- A candidate that fails resolution is a **violation** (`class: "a"`) only when it is **unambiguous**: extracted from running prose (not exemplar / template context) and its normalized key is clean (no placeholder residue, no truncation artifacts).
- Demote to a warning (`class: "a-demoted"`) when the candidate sits in exemplar context — e.g. `references/review-categories.md`'s cross-reference-stability material contains example-only references (`§ "Single source of truth" rule`) that resolve nowhere by design — or when extraction / normalization is uncertain. When in doubt, demote.

## Manifest discipline (shared by classes (b) and (d))

Both manifest-driven classes follow the same operating rules:

- **Closed list**: only manifest-registered entries are checked. Append an entry whenever a new "keep in sync" / "update both together" directive is added to the target tree.
- **One-way maintenance**: the manifest lives on this lint-skill side only — writing a sync directive into the distributed dev-workflow prose that points at a project-local skill would be a distribution leak, so the target tree never references this manifest. Upkeep rides the Edit-time coordinated-multi-site-sweep audit and the monthly consolidation pass.
- **Anchors**: manifest anchors are stable phrase anchors — headings, bold labels, or verbatim prose phrases — never line numbers; file parts are target-root-relative per the Path convention.
- **Anchor staleness**: when a manifest anchor itself no longer resolves, emit `class: "stale-manifest"` — a manifest-maintenance signal, deliberately distinct from the class's own divergence / gap warning.

## Class (b) — Mirrored closed-list divergence (manifest-driven)

Entry schema: `id` / `site_a` (file + stable anchor phrase) / `site_b` (same) / `compare` (the equivalence to judge).

| id | site_a | site_b | compare |
| --- | --- | --- | --- |
| merge-strategy-overlay | `SKILL.md` § Configuration, "Merge strategy per key type" paragraph | `SKILL.md` § Step 1: Load Settings, sub-step 1's "Overlay" procedure | Same key-type classes with the same per-class merge semantics (scalar replace / list append / list-replace / hooks deep-merge / null-clears / absent-inherits) |
| localization-enumeration | `SKILL.md` § Configuration, `language` bullet's enumeration of localized outputs | `references/plan-format.md` § Localization granularity, opening "Applies to" sentence | Same output-category set (each category present on both sides) |
| no-stall-gate-enum | `SKILL.md` § No-Stall Principle, user-gate enumeration | Each bullet's named definition site ("defined in ..." pointer), plus every `USER APPROVAL GATE` marker in `SKILL.md` | Every enumerated gate's definition site exists; every `USER APPROVAL GATE` marker has a corresponding enumeration bullet |
| init-adaptive-regions | `references/init-mode.md`, the run-tests SKILL.md Template's "keep that list in sync" note | `references/init-mode.md`, step 4a's "Adaptive regions" closed list | Each listed adaptive region exists as a span of the embedded template, and no other template span is described as per-project-adaptive outside the list |

Judgment: read both sites and compare per the `compare` column. Divergence → warning `class: "b"` naming the pair `id` and the diverging member.

## Class (c) — Bare-number Step references

1. Candidate extraction: Grep `\bStep [0-9]+(\.[0-9]+)?\b` (word-boundary) across the target files.
2. **Allowed forms** (closed list — matching candidates are compliant, not findings):
   - **Heading / full-title forms**: a heading line, or the full `Step N: <Title>` form (number + colon + title) anywhere in prose.
   - **Number + stable-descriptor pair**: the same sentence binds a stable descriptor to the number — a possessive paragraph reference (`Step 7's "Concurrent rules-review launch" paragraph`), a sub-step qualifier (`Step 8 sub-step 1's review-payload definition`), a parenthesized title (`Step 9 (Completion Hooks)`), or an adjacent quoted stable phrase.
   - **Descriptor-carrying enumeration items**: a list item naming the step with a descriptive phrase and/or a definition pointer (e.g. `Step 7.5 persistent-violations decision (defined in ...)`), including slash-run lists whose shared descriptor context covers each number.

   Source of truth: `.claude/rules/project.rules.md` § SKILL.md設計's bare-number prohibition bullet (its two 許容形) — keep this closed list in sync when that rule evolves.
3. Residue — a bare number whose sentence binds no descriptor — → warning `class: "c"` with the file and the sentence fragment. Regex-classifiable allowed forms are dropped mechanically at § Executor pipeline step 4; only the residue reaches judgment. This class is warning-only: the long-tail allowed-form classification is judgment-based, and the target tree legitimately contains many compliant pair forms.

## Class (d) — Governed-site enumeration gaps (manifest-driven)

§ Manifest discipline applies. Entry schema: `id` / `site_pattern` (the Grep pattern locating actual sites, plus the filter distinguishing real sites from mere mentions) / `enumeration_site` (where the closed list lives) / `documented_exclusions` (prose-declared exceptions to respect).

| id | site_pattern | enumeration_site | documented_exclusions |
| --- | --- | --- | --- |
| subagent-model-read-sites | `subagent_model` across `SKILL.md`, filtered to dispatch / propagation statements (lines that pass, resolve, or propagate a model — not mere mentions of the key) | `SKILL.md` § Configuration, `subagent_model` bullet ("It governs (i) ... (ii) ..." enumeration) | Sites the prose itself declares excluded from governance — e.g. the Step 2 research delegation's "excluded from `subagent_model` governance" declaration. Declared exclusions are compliant, not gaps |

Judgment: an actual site located by `site_pattern` that is covered by **neither** the enumeration **nor** a documented exclusion → warning `class: "d"` naming the site line and the enumeration it is missing from.

## Common FP-suppression principle

When a candidate's classification is uncertain — extraction ambiguity, exemplar-vs-real doubt, allowed-form borderline, manifest-site interpretation — resolve toward **warning**, never violation. Violations are reserved for unambiguous class (a) dangling references; every judgment-based determination reports as a warning so the lint's pass/fail status stays deterministic. (The class (a) demotion rule is this principle applied to extraction.)

## Executor pipeline (run in this order)

1. **Enumerate** the target files from the `--- TARGET FILES ---` payload.
2. **Extraction pass** (Grep tool only — ripgrep-class; never Bash `grep`): run **one scoped Grep per pattern across the whole target root** — the returned file column gives per-file grouping for free, so do not loop per file. Patterns: the class (a) variant seeds (`§` broad seed for section references, `"[^"]+" paragraph` for bold-label references — refine as needed within the variant closed list), the § Class (c) step 1 pattern, and each class (d) manifest entry's `site_pattern`. Then apply the mechanical fence filter (§ Class (a)'s Extraction exclusions) to the collected candidates.
3. **Index pass**: one scoped Grep of heading lines (`^#{1,4}\s`) across the target root, grouped per file into the heading indexes. No bold-span index — see § Class (a)'s Resolution procedure step 1.
4. **Set difference (mechanical pre-filter)**: (i) class (a) — normalize candidates per § Class (a)'s Resolution procedure and resolve them against the heading indexes and candidate-driven label Greps under the scope model; resolved candidates are dropped. (ii) class (c) — drop candidates matching the regex-classifiable allowed forms (a candidate on a heading line; `Step [0-9.]+:` colon-title; `Step [0-9.]+ \(`; `Step [0-9.]+'s "`; `Step [0-9.]+ sub-step`). Only the residue of both classes proceeds to judgment.
5. **Judgment pass** (LLM judgment, residue only): apply the class (a) demotion rule to the unresolved residue; classify the class (c) residue against the full allowed-forms closed list; read the class (b) / (d) manifest sites and judge divergence / gaps / anchor staleness.
6. **Assemble the verdict JSON** per the schema in the `--- EXECUTOR PROMPT ---` payload, filling `checked` with the per-pass counts: `files` (target files enumerated), `refs_extracted` (class (a) candidates surviving the fence filter), `refs_unresolved` (class (a) residue left unresolved after step 4), `manifest_pairs` (class (b) plus class (d) manifest entries judged), `step_candidates` (class (c) candidates from step 2).
