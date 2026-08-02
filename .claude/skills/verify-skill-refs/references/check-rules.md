# Check Rules — verify-skill-refs

Canonical home for the detection rules this lint applies. Two executors share them: `scripts/lint.mjs` implements everything mechanically decidable and a dispatched subagent judges the rest — § Executor pipeline draws the split. `SKILL.md` injects this file verbatim into the judgment dispatch payload as `--- CHECK RULES ---`, so its length is a cost on every run — keep it terse (single canonical home; do not duplicate these rules in `SKILL.md`).

**Path convention**: every file reference in this document — including manifest anchors — is **target-root-relative** (`SKILL.md`, `references/<file>.md`), so the same rule text applies to every root and a `Target dir:` override resolves identically.

**Per-root resolution**: a run lints one or more roots (`SKILL.md` § Target roots). Every pass is root-scoped — heading indexes, the class (c) identifier pattern, and the class (e) name authority all come from the root the candidate was extracted from. `§` resolution is root-scoped too, with one exception the trees require: a reference that **names** another skill resolves in that skill's tree (§ Class (a)'s "Resolution scope model" paragraph). Each manifest section (classes (b) / (d)) declares the root its entries belong to in one sentence above its table, and those entries are checked only against that root — one root per section, so a table mixing roots would need splitting into two sections. The declaration must carry a literal `root: <path>` token: that is what the script parses, and a section phrased without one has its rows checked on every run. A manifest section whose root is absent from this run is skipped silently, not reported as stale.

## Class (a) — Cross-reference resolution

**Reference forms to extract (closed list of variants):**

1. **Section references**: `§ <Heading>` — optionally wrapped in backticks, optionally with nested backticks inside the heading text (e.g. `` `§ Configuration's `subagent_model` bullet` ``), optionally carrying a possessive `'s` plus a trailing descriptor (`§ Step 6's **Cross-layer review handoff ledger** paragraph`).
2. **Qualified file + section references**: `references/<file>.md § <Heading>`, `<file>.md § <Heading>`, `SKILL.md § <Heading>`.
3. **Bold-prose-label references**: a quoted label naming a paragraph — `Step N's "<label>" paragraph`, `§ <Heading>'s "<label>" paragraph`, `the "<label>" paragraph`. The quoted label resolves against a `**<label>**` bold span.

Source of truth for the reference-form convention: `.claude/rules/project.rules.md` § SKILL.md設計's stable-anchor cross-reference bullet and `.claude/rules/project.rules.local.md`'s "Bold-prose label cross-reference style" bullet — keep this closed list in sync when those rules evolve.

**Extraction exclusions (do not extract):**

- Candidates containing an angle-bracket placeholder (`<...>`) — template forms such as `§ <Heading>` document the convention itself and are not references.
- Candidates inside fenced code blocks (code samples and command snippets quote reference syntax without referring). The fence delimiters (`` ^\s*``` ``, blockquote marker stripped first) pair in document order into the line intervals a candidate's line number is tested against; an unclosed final fence runs to end of file.

**Resolution procedure:**

1. Build a per-file **heading index** and a per-file **bold-span index** once (all `#`–`####` lines; every `**...**` span), each entry carrying its normalized forms. Both indexes take only lines **outside** fenced blocks, by the same mechanical fence filter as § Class (a)'s Extraction exclusions — a heading or bold span inside a code sample is quoted syntax, not an anchor a reference can resolve to. A `§` key resolves against **either** index — the tree points `§` at bold-prose labels as well as headings.
2. Normalize each extracted candidate: strip wrapping backticks / quotes and trailing sentence punctuation; split off a possessive tail (`'s <descriptor>`) — the text before the possessive is the **heading key**, and a quoted or bold label inside the descriptor tail is a **label key** (a quoted label without a possessive splits the same way). Compare heading keys against index entries with whitespace-normalized prefix matching in **either direction** (a reference may cite a stable prefix of a longer heading, e.g. `§ Step 10: Interactive Commits` against the heading `Step 10: Interactive Commits`; and a key may run past the heading it names, because the reference continues into its own trailing prose). A key also resolves against a heading's **subject** — the heading text before its em-dash gloss, parenthetical qualifier, or colon title — which is the part references actually cite (`§ Workflow artifacts set` naming `Workflow artifacts (cross-step fixed exclusion)`).
3. **Resolution scope model**:
   - **Qualified form** → resolve within the named file. When the run loaded no file of that name, the reference points outside the linted trees and is **out of scope**.
   - **Owner-named form** (a skill named before the qualifier, a possessive, or a file named earlier on the line) → resolve in that skill's tree. An owner this run did not load is **out of scope**; the linted sibling root is not.
   - **Unqualified form** (`§ <Heading>` alone) → resolve in the same file first, then `SKILL.md`, then any other file **of the same root**. A violation means the key resolves nowhere at all — `SKILL.md` legitimately cites headings that live in a references file (e.g. `§ User-gate summary preamble`). The same-file → `SKILL.md` order is the documented convention (seed: `references/update-rules.md`'s opening declaration).
   - A key resolving in **more than one file is resolved** — e.g. "Cross-layer review handoff ledger" resolves in both `SKILL.md` § Step 6 (its definition) and `references/step6-tidy.md` (which carries it as a bold span). Never flag multi-resolution.
4. Label keys resolve against the bold-span index from step 1, whitespace-normalized, within the resolution scope — and against the heading index too, since a label sometimes graduates into a heading.

**Demotion rule (violation vs warning):**

A candidate that fails resolution is a **violation** (`class: "a"`) only when it is **unambiguous**: extracted from running prose, with a clean normalized key, and unresolvable everywhere. Demote to a warning (`class: "a-demoted"`) on any of these, each of which is decided mechanically. **Evaluate them in the order listed and report the first match** — the list runs from the cause that says the most about the reference to the one that says the least, so a candidate whose target exists in a sibling tree reports that (actionable: name the tree) rather than an extraction artifact that also happens to apply:

- **Sibling-root-only resolution** — the key resolves in a sibling root the reference does not name. The target exists, so this cannot be a violation; the pointer merely omits which tree it lives in.
- **Sub-item anchor** — the key names something below heading level, which no index reaches: a lettered sub-step (`§ (e)`), a dotted anchor whose parent section does resolve (`§ 1.3` under a `1.` heading), or a step inside a section that resolves (`§ Procedure step 4`). An anchor whose own parent is missing stays a violation.
- **Extraction uncertainty** — an over-long key, unbalanced delimiters (backticks or parentheses), or a key ending on a preposition or conjunction, all of which mark a key cut mid-phrase.
- **Exemplar context** — the candidate sits in a passage that documents the convention by quoting it. This cause is declared as the allowlist in `scripts/lint.mjs`, whose entries name a file plus a verbatim fragment; it is empty whenever the structural causes above already cover every exemplar in the trees. An entry an earlier cause outranks still counts as matched, so it is not reported stale.

When in doubt, demote.

## Manifest discipline (shared by classes (b) and (d))

Both manifest-driven classes follow the same operating rules:

- **Closed list**: only manifest-registered entries are checked. Append an entry whenever a new "keep in sync" / "update both together" directive is added to the target tree. The tables below are the single source of truth in both directions: `scripts/lint.mjs` parses them to count `checked.manifest_pairs` and to hand the rows to the judgment stage, so a row added here needs no second edit anywhere.
- **One-way maintenance**: the manifest lives on this lint-skill side only — writing a sync directive into the distributed dev-workflow prose that points at a project-local skill would be a distribution leak, so the target tree never references this manifest. Upkeep rides the Edit-time coordinated-multi-site-sweep audit and the monthly consolidation pass.
- **Anchors**: manifest anchors are stable phrase anchors — headings, bold labels, or verbatim prose phrases — never line numbers; file parts are target-root-relative per the Path convention.
- **Anchor staleness**: when a manifest anchor itself no longer resolves, emit `class: "stale-manifest"` — a manifest-maintenance signal, deliberately distinct from the class's own divergence / gap warning.

## Class (b) — Mirrored closed-list divergence (manifest-driven)

Entry schema: `id` / `site_a` (file + stable anchor phrase) / `site_b` (same) / `compare` (the equivalence to judge).

All four entries below carry `root: skills/dev-workflow`.

| id | site_a | site_b | compare |
| --- | --- | --- | --- |
| merge-strategy-overlay | `SKILL.md` § Configuration, "Merge strategy per key type" paragraph | `references/step1-load-settings.md` § Sub-step 1 — Overlay / merge procedure (`SKILL.md` Step 1's sub-step 1 is now a one-line delegating pointer to it) | Same key-type classes with the same per-class merge semantics (scalar replace / list append / list-replace / hooks deep-merge / null-clears / absent-inherits) |
| localization-enumeration | `references/configuration.md`, the `language` bullet's enumeration of localized outputs (`SKILL.md` § Configuration's `language` bullet is now a one-line index into it) | `references/plan-format.md` § Localization granularity, opening "Applies to" sentence | Same output-category set (each category present on both sides) |
| no-stall-gate-enum | `SKILL.md` § No-Stall Principle, user-gate enumeration | Each bullet's named definition site ("defined in ..." pointer), plus every `USER APPROVAL GATE` marker in `SKILL.md` | Every enumerated gate's definition site exists; every `USER APPROVAL GATE` marker has a corresponding enumeration bullet |
| init-adaptive-regions | `references/init-mode.md`, the run-tests SKILL.md Template's "keep that list in sync" note | `references/init-mode.md`, step 4a's "Adaptive regions" closed list | Each listed adaptive region exists as a span of the embedded template, and no other template span is described as per-project-adaptive outside the list |

Judgment: read both sites and compare per the `compare` column. Divergence → warning `class: "b"` naming the pair `id` and the diverging member.

## Class (c) — Bare-number step references in prose

**Scope: changed lines only.** Unlike the other classes, this one is checked only over the lines a `--base-commit` diff reports as changed or added (plus untracked files in full), and is reported **not applicable** when no `--base-commit` was given — `checked.step_candidates` is then `0`. The predicate is settled inside a single sentence, so no edit elsewhere can turn a compliant line non-compliant and a line-granular diff scope stays sound.

1. Candidate extraction: Grep the candidate's root identifier pattern (word-boundary) across the target files — `\bStep [0-9]+(\.[0-9]+)?\b` for a `Step`-shaped root, `\bM[0-9]+(-[0-9]+)?\b` for an `M`-shaped one.
2. **Allowed forms** (closed list — matching candidates are compliant, not findings):
   - **Heading / full-title forms**: a heading line, or the full `Step N: <Title>` form (number + colon + title) anywhere in prose.
   - **Number + stable-descriptor pair**: the same sentence binds a stable descriptor to the number — a possessive paragraph reference (`Step 7's "Concurrent rules-review launch" paragraph`), a sub-step qualifier (`Step 8 sub-step 1's review-payload definition`), a parenthesized title (`Step 9 (Completion Hooks)`), or an adjacent quoted stable phrase. The descriptor binds from **either side**: `Step 6 Tidy` and `Plan Review (Step 3)` are both the pair form.
   - **Descriptor-carrying enumeration items**: a list item naming the step with a descriptive phrase and/or a definition pointer (e.g. `Step 7.5 persistent-violations decision (defined in ...)`), including slash-run lists whose shared descriptor context covers each number.

   Source of truth: `.claude/rules/project.rules.md` § SKILL.md設計's bare-number prohibition bullet (its two 許容形) — keep this closed list in sync when that rule evolves.
3. Residue — a bare number whose sentence binds no descriptor — → warning `class: "c"` with the file and the sentence fragment. Regex-classifiable allowed forms are dropped by § Executor pipeline's mechanical stage; only the residue reaches judgment. This class is warning-only: the long-tail allowed-form classification is judgment-based, and the target tree legitimately contains many compliant pair forms.

## Class (d) — Governed-site enumeration gaps (manifest-driven)

§ Manifest discipline applies. Entry schema: `id` / `site_pattern` (the Grep pattern locating actual sites, plus the filter distinguishing real sites from mere mentions) / `enumeration_site` (where the closed list lives) / `documented_exclusions` (prose-declared exceptions to respect).

The single entry below carries `root: skills/dev-workflow`.

| id | site_pattern | enumeration_site | documented_exclusions |
| --- | --- | --- | --- |
| subagent-model-read-sites | `subagent_model` across `SKILL.md`, filtered to dispatch / propagation statements (lines that pass, resolve, or propagate a model — not mere mentions of the key) | `references/configuration.md`, the `subagent_model` bullet's "It governs (i) ... (ii) ..." enumeration (`SKILL.md` § Configuration's own bullet is now a one-line index into it) | Sites the prose itself declares excluded from governance — e.g. the Step 2 research delegation's "excluded from `subagent_model` governance" declaration. Declared exclusions are compliant, not gaps |

Judgment: an actual site located by `site_pattern` that is covered by **neither** the enumeration **nor** a documented exclusion → warning `class: "d"` naming the site line and the enumeration it is missing from.

## Class (e) — Bare identifier in a user-facing output literal

The machine counterpart of each root's `§ Phase naming in user-facing output` section: a literal string the tree tells the orchestrator to put in front of the user must not carry the root's identifier without naming what that phase does. **Status-affecting** — the core predicate is closed and mechanical (identifier present AND no authority name present); extraction ambiguity is what the demotion rule below absorbs.

**1. Build the root's name-authority set** (once per root). Grep the authority named for that root in `SKILL.md` § Target roots and collect the phase names:

- A `Step`-shaped root: the phase registration list in `SKILL.md` Step 1's sub-step 7 — each list item's `Step <n>: <Name>` yields the name `<Name>`, stripping a bracketed command suffix (`Step 7: Check / Test [check: …]` → `Check / Test`) and a parenthesized registration condition (`Step 10: Interactive Commits (only if …)` → `Interactive Commits`). Add the `###` heading name for any phase the list omits.
- An `M`-shaped root: each `## M<n> — <Name>` heading yields `<Name>`, minus any trailing parenthetical (`## M8 — Check / test (quality gate, max 3 retries)` → `Check / test`).

Match names **case-insensitively** and on whitespace-normalized text — the same phase legitimately appears title-cased in a heading and sentence-cased in a rendered label, and that is a casing choice, not a second description.

**2. Extract output literals** (the closed list of literal-bearing forms — a candidate outside these forms is not extracted at all):

- A paired-sample line: `` - `language: <lang>`: `<literal>` `` — the backticked `<literal>` is the candidate.
- A blockquote line (`> …`) inside a section whose prose marks it as shown to the user verbatim (a guidance line, a fixed sentence). The whole line is the candidate.
- A backticked literal whose surrounding prose marks it as emitted: the verb set `render` / `emit` / `warn` / `present` / `report` / `surface` / `note` / `append`, with the verb in the run of prose **immediately before** the span rather than anywhere on the line. The backticked span is the candidate, and only a multi-word one — a whitespace-free span is a cross-reference, which is class (a) / (c) territory.

Skip candidates inside fenced code blocks using the same mechanical fence filter as § Class (a)'s Extraction exclusions.

**3. Judge each candidate.** A candidate whose text contains the root's identifier pattern **and** no name from step 1's authority set is a **violation** (`class: "e"`), reported with the literal and the identifier that stands bare. A candidate carrying no identifier at all is compliant by the drop-the-number option — not a finding. A candidate carrying both is compliant.

**4. Demotion rule.** Report `class: "e-demoted"` (warning) instead when the candidate is itself an exemplar of the naming rule — a section documenting the forbidden form must be allowed to quote it — which is the shared allowlist named in § Class (a)'s "Demotion rule (violation vs warning)" paragraph. Extraction ambiguity is handled by not extracting: step 2's forms require the emit verb to sit in the run of prose immediately before the span, and a span that is a bare cross-reference rather than a sentence is never a candidate. When in doubt, demote — the class's status-affecting weight is what makes over-reporting costly.

**Known template case**: a literal whose identifier list is a placeholder (`<registered steps, each as number + phase name>`) names no phase at extraction time yet renders compliantly, so a placeholder **that itself demands the paired form** is compliant. Any other placeholder in the literal is irrelevant to this class: in `Step 7: <skill> dispatch failed twice`, no substitution puts a phase name beside the identifier, so the identifier still stands bare and the literal is a violation.

## Common FP-suppression principle

When a candidate's classification is uncertain — extraction ambiguity, exemplar-vs-real doubt, allowed-form borderline, manifest-site interpretation — resolve toward **warning**, never violation. Violations are reserved for the unambiguous cases of the two status-affecting classes, (a) and (e); every judgment-based determination reports as a warning so the lint's pass/fail status stays deterministic. (The class (a) demotion rule is this principle applied to extraction; class (e) applies it earlier, by not extracting an ambiguous candidate at all.)

## Executor pipeline (two stages)

The pipeline runs in two stages with different executors, split by whether the work is decidable mechanically.

### Mechanical stage — `scripts/lint.mjs`

Enumeration, extraction, indexing, class (a) resolution, class (e) judgment, class (c) pre-filtering, and every `checked` count are performed by `scripts/lint.mjs` before the judgment stage is dispatched. The rules in the class sections above are the specification that script implements. What it settles is not the judgment stage's to revisit; `SKILL.md` § Process step 3 describes it for the main thread's benefit, and § Return contract states which of its fields a caller may gate on. Numeric bounds live as named constants at the top of that script, not here.

**Narrowed extraction is reported, never silent.** An unclosed fence masks to end of file, and a line with an odd number of backticks has untrustworthy code-span pairing; each emits `class: "scope-narrowed"` with the file and line, so a swallowed region is distinguishable from a clean one. Reported for every tree the run loads, including one loaded only so that references naming it resolve — a swallowed sibling silently escalates a cross-root reference into a class (a) violation. Warning-only, and emitted by the mechanical stage alone.

### Judgment stage — this executor

Only what needs judgment reaches the dispatched executor, in the form the script already extracted:

1. **Class (b)** — read both sites of each manifest row supplied in the payload and judge divergence per its `compare` column.
2. **Class (d)** — for each manifest row supplied, locate the actual sites with its `site_pattern`, and judge which are covered by neither the enumeration nor a documented exclusion.
3. **Class (c) residue** — classify each residue entry against the full closed list in § Class (c)'s "Allowed forms" paragraph. The regex-classifiable forms were already dropped mechanically, so only the judgment-dependent forms remain.

Anchor staleness (`stale-manifest`) is judged here too, since it is a property of the manifest sites this stage reads.
