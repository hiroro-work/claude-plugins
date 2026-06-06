# Plan Format

Specification for how plans are structured, self-checked, reviewed, and presented in `/dev-workflow`.

Read this reference when executing any of the following:

- **Step 2** — creating the plan (§ Template, § Step 2 self-check)
- **Step 3** — peer plan review (§ Step 3 (f) content-quality rubric)
- **Step 4** — presenting the plan to the user (§ Step 4 guidance lines, § Step 4 presentation order)
- **Any user-facing prose output** — localization boundary (§ Localization granularity)

## Template

Every plan produced in Step 2 must follow this structure. Overview, Decisions, Design, and Test plan are **required** (including Decisions when there are no user decisions — use the fixed sentence in § Empty-Decisions fixed sentences). Risks / Unknowns is optional.

```markdown
## Plan

> Review guide: must-review — Highlights, Decisions | reference — Design, Test plan, Risks

### Overview
- **Goal**: 1 sentence — what the user gets
- **Highlights**: high-impact items the reader must see first — DB / data migrations, destructive or irreversible operations, breaking API / contract changes, new runtime or dependency additions, security-sensitive changes (illustrative, non-exhaustive — use judgment, not a closed enum). One line. **Omit this bullet entirely when none apply.**
- **Difficulty**: Trivial | Simple | Moderate | Complex (must match the Step 2 difficulty assessment)
- **Scope**: N files — primary files to touch
- **Approach**: 1–2 sentences — the chosen strategy

### Decisions
<1–5 items that require user judgment, OR one of the fixed sentences from § Empty-Decisions fixed sentences when no items qualify>

Each item:
- **Question**: what needs to be decided
- **Recommendation**: the recommended choice and why
- **Alternative**: the other option (omit this line entirely when there is no alternative)

### Design
<Detailed design — the body of the plan. Structure by file or by step.>

### Test plan
<Test files to add or update, test types, coverage scope — or the justification for no tests.>

### Risks / Unknowns
<Non-trivial risks or open questions. Omit the section entirely if none.>
```

### Review guide line

The `> Review guide: ...` line sits directly under `## Plan`, above Overview, so a reviewer can tell at a glance which sections demand judgment and which are reference detail:

- **Must-review** = the sections that need the user's judgment: `Highlights` (high-impact callouts) and `Decisions`. When Highlights is omitted (no high-impact items), name `Decisions` alone.
- **Reference** = supporting detail the user can skim: `Design`, `Test plan`, `Risks` (omit any that are absent).
- Localization (§ Localization granularity): the connective words (`Review guide`, `must-review`, `reference`) are translated to the resolved `language`; the section-name tokens (`Highlights` / `Decisions` / `Design` / `Test plan` / `Risks`) stay verbatim — they are file-internal identifiers, and translating them would break the Step 2 self-check / Step 3 (f) heading exact-match.

Paired bilingual sample (runtime rendering demonstration, not meta-prose):

- `language: en`: `> Review guide: must-review — Highlights, Decisions | reference — Design, Test plan, Risks`
- `language: ja`: `> レビュー指針（Review guide）: 要確認 — Highlights, Decisions | 参考 — Design, Test plan, Risks`

### Sizing guidance

A plan is the user's review surface, not a document — its purpose is fast, accurate review. Default to the **tersest form that still lets the reviewer judge**: cut only redundancy, duplication, and padding — **never** the information, rationale, or boundaries the reviewer needs to decide. Operational test for "is this padding?": if removing a passage does not change what the reviewer can verify or decide, it is padding (cut it); if it does, keep it. Prefer bullets over prose, but use prose where a bullet cannot carry the logic. The caps below are soft — clarity wins over character count.

- Overview: at most 5 bullets (4 when Highlights is omitted), each at most one line. Overlong Overviews defeat the "30-second scan" goal.
- Highlights: a **single** Overview bullet (it is one of the ≤5 Overview bullets above, not a separate list), holding at most 3 high-impact items on one line — only genuinely high-impact items. See § Template for the categories and the omit-when-none rule.
- Decisions: up to 5 items. A single genuine (a)+(b) item is fine — surface it alone rather than padding.
- Design: structure by file or by step in bullet form; collapse a change to one line only when it is self-evident, and keep the detail the reviewer needs to judge. As a concrete instance of the padding test above, avoid narrating what well-named files/functions already convey, and do not restate Decisions or Overview content.
- Test plan: bullet-list the test files and the case each covers, one line per case. Do not re-describe (duplicate) the implementation.

## Decisions criterion (AND condition)

An item belongs in Decisions only if **both** are true:

- **(a)** reasonable engineers could legitimately disagree on the choice, AND
- **(b)** switching the choice later would require non-trivial rework (migration, renames, re-review, API shape changes, etc.).

Preference-level choices that satisfy (a) but not (b) — e.g. putting a helper in the same file vs. a new file, naming bikesheds — do **not** belong in Decisions. Note them in Design and let the AI decide.

### Not in Decisions

- Mechanical details (function names, variable names, file names)
- Choices uniquely determined by project rules under `.claude/rules/` or by existing patterns
- Details already vetted by peer in Step 3
- Style-level preferences that are cheap to reverse

## Empty-Decisions fixed sentences

When no items qualify under the (a)+(b) criterion, render Decisions with one of these fixed sentences — "no decisions" must be an explicit signal, not a missing section.

Rendering conventions for the sentences below:

- The leading `>` is Markdown blockquote rendering for visual separation in this spec, not part of the literal text.
- When extracting, strip the blockquote prefix (`>` plus one separator space).
- Place the extracted sentence alone in Decisions — no preceding explanation, no trailing elaboration, no padded items alongside.
- Rendering it as a plain paragraph or as a blockquote in the plan is a presentation choice and does not affect "verbatim" compliance.

**Normal mode (no state file):**

> No user decisions required — approve if the approach looks reasonable.

**Resume mode (executing a subtask from a decomposition state file):**

> No user decisions required (subtask scoped — boundaries approved in prior Step 1.5).

## Subtask / Resume handling

When Step 2 runs inside a decomposed subtask (a state file from Step 1.5 is active), the subtask's **boundaries, order, and purpose were already user-approved** in the parent run's Step 1.5. Do not re-surface them in Decisions.

Restrict Decisions to **judgment calls that arise inside the current subtask**. Examples:

- Subtask A is "add authentication middleware" → choosing the token-verification scheme (JWT vs. session) is in scope.
- Subtask B is "introduce chart rendering" → choosing the charting library (Chart.js vs. Recharts) is in scope.

If the current subtask has no in-scope decisions, use the Resume-mode fixed sentence in § Empty-Decisions fixed sentences.

## Step 2 self-check

After the Simplicity self-audit in Step 2, run this check on the plan. Fix any failures before Step 3.

**Run this check in the order listed — structural compliance first, then content quality.** If the plan was seeded from a carry-over document (an inherited spec, a prior-session draft, or a hand-off note), verify structure before content: carry-over documents use free-form prose that does not match the template, and transplanting their content without first establishing the template skeleton is the most common source of non-compliant plans. Create the template skeleton first, then embed the carry-over content.

- [ ] **Structural compliance**: the plan contains exactly the required sections (`Overview`, `Decisions`, `Design`, `Test plan`) in that order, with correct heading levels (`###` for top-level sections, `####` for sub-sections), and no sections outside the enumerated template (Overview, Decisions, Design, Test plan, optionally Risks / Unknowns). If this check fails, stop here and restructure before running the remaining content checks.
- [ ] Every Decisions item passes the (a)+(b) criterion — if in doubt, drop it to Design.
- [ ] **When Decisions renders an empty-Decisions fixed sentence** (§ Empty-Decisions fixed sentences): scan Design and Approach for any passage that answers a "why X over Y" question or introduces a fixed value, threshold, or boundary — these are (a)+(b) candidates that may have been overlooked when the author pre-judged the task as decision-free. If any surface, promote to Decisions before advancing to Step 3. Declaring "no decisions" does not discharge the buried-decisions check; it makes it more important to run.
- [ ] No choice that qualifies under (a)+(b) is buried inside Design instead of surfaced in Decisions. **Promotion cues** — any one is sufficient to flag a Design passage as a Decisions candidate:
  - Design answers a "why X over Y" question or a "why this specific value / boundary / timing" question, but Decisions has no corresponding item.
  - The plan introduces a new enum / fixed-value set, but Decisions does not record that each member is necessary and non-overlapping with the others.
  - A choice that passes the (a)+(b) criterion appears with no Alternative line (or no one-line rejection reason) — promote the alternative analysis into a Decisions item rather than leaving it as Design prose.
- [ ] If executing a subtask (state file active): Decisions does not re-surface subtask-boundary questions.

This is the **author's first-pass judgment** on plan content; Step 3 category (f) re-checks content externally. The **Structural compliance** bullet above is the only structural property checked here; category (f) does not re-check it.

## Step 3 (f) content-quality rubric

Step 3 adds a sixth review category — **f. Presentation & attention allocation (content quality)** — on top of the five categories (a–e) already in `SKILL.md`. Format compliance is already enforced by the Step 2 self-check, so (f) focuses on content.

Reviewer checks:

- **(a)+(b) criterion, external verification** — does every Decisions item genuinely pass both? Flag items that look like style-level preferences smuggled in.
- **Buried-decisions check** — does the Design body contain a judgment call that should have been surfaced in Decisions? (Inverse of the criterion — look for hidden choices, not just wrong ones.)
- **Cross-section consistency** — e.g. does every file listed in Overview's Scope appear in Design? Does every test file promised in Test plan correspond to Design content? Do the choices made in Decisions actually drive the Design?
- **Cross-file consistency (multi-file plans)** — when the plan edits more than one file (multiple modules, parallel components, multiple docs — for skill development this includes multiple `SKILL.md` or `references/*.md` files), check that (i) parallel concepts use consistent names / headings / labels across files, (ii) cross-references between the edited files use consistent phrasing, and (iii) the same note or rationale isn't duplicated or paraphrased redundantly across files. Skip this bullet for single-file plans.

Reviewer does not re-check structural compliance (section presence, bullet count, etc.) — that is Step 2's responsibility.

## Step 4 guidance lines

In Step 4, present the plan with one of these literal English guidance lines placed at the bottom of the plan output, after the summary preamble (see § Step 4 presentation order for the full sequence). The template depends on (i) whether Decisions has qualifying items and (ii) whether a state file is active.

Rendering conventions for the variants below:

- The leading `>` is Markdown blockquote rendering for visual separation in this spec, not part of the literal text.
- When extracting, strip the blockquote prefix (`>` plus one separator space).
- Rendering it as a plain paragraph or as a blockquote in the output is a presentation choice and does not affect "verbatim" compliance.

**Decisions has one or more qualifying items (Normal or Resume):**

> Decisions has items requiring your judgment — see the full plan above for details. The plan has been reviewed in Step 3.

**Decisions is empty, Normal mode:**

> No user decisions required — approve if the approach looks reasonable. Full plan details appear above. The plan has been reviewed in Step 3 for correctness and convention compliance.

**Decisions is empty, Resume mode (subtask execution):**

> No user decisions required (subtask scoped — boundaries approved in prior Step 1.5). Full plan details appear above.

Pick exactly one variant and use its literal text verbatim — do not concatenate variants, do not reword the sentence content.

**Trivial-task (N=0) conditional**: when Step 2 assessed the task as **Trivial** (N=0) and Step 3 was therefore skipped, the "The plan has been reviewed in Step 3 ..." sentence is false, and the Step 4 user-approval gate is the sole review of the plan — so this must be signaled regardless of which variant is chosen. Apply per variant: for a variant that **contains** a "The plan has been reviewed in Step 3 ..." sentence, **replace** that sentence with `Step 3 (internal review) was skipped because this task was assessed Trivial — this approval is the sole review.`; for a variant that **contains no** such sentence (the Resume-mode empty-Decisions variant), **append** that same sentence. The lead clause of each variant ("Decisions has items requiring your judgment ..." / "No user decisions required ...") is unchanged in both cases — only the review-status sentence is substituted or appended.

## Localization granularity

Applies to all user-facing prose produced by this skill — plan body content, user-gate preambles, violation/finding lists, Step 10 commit-plan / per-commit gate framing prose (verbatim git output and file paths remain English), Completion summary, and Step 11.5 `Description` / `Suggested fix direction` paragraphs. The resolved `language` (see `SKILL.md` § Configuration) controls the output language.

Source of truth: `SKILL.md` § Configuration `language` bullet maintains the same enumeration — keep in sync when categories are added or removed.

**Two-way rule:**

- **Translate**: generic technical concepts that have natural equivalents in the target language. The output must read naturally to a native speaker of the resolved language. Examples: primary source → 一次情報源 (`ja`), self-audit → 自己監査 (`ja`), blast radius → 影響範囲 (`ja`), edge case → 境界ケース (`ja`).
- **Preserve verbatim**: file-internal identifiers — function names, config key names (`check_commands`, `review_iterations`), section anchors (`Step 7.5`), stable cross-reference labels (`§ No-Stall Principle`), file paths (`references/plan-format.md`), skill names (`Skill(verify-diff)`), and section headings (`Overview` / `Decisions` / `Design` / `Test plan` / `Risks` / `Unknowns`).

**First-use pairing**: on the first occurrence of a translated concept within a given output block (preamble, expanded section, completion summary), pair the localized phrasing with the original technical term in parentheses (e.g. `一次情報源（primary source）` for `language: ja`). Subsequent occurrences within the same block use the localized form alone. This convention is consistent with § User-gate summary preamble's jargon pairing rule, which is a preamble-specific specialization of this broader principle — § User-gate summary preamble adds format constraints specific to preamble bullets (e.g. pairing with an identifying handle when the localized and original terms coincide under `language: en`).

**Negative-direction rule (do not over-preserve)**: the Two-way rule and First-use pairing above are **positive-direction** rules — they name what to preserve verbatim and what to pair on first use. Everything outside those two categories — the connective prose that links identifiers together (ordinary sentences, function words, transitions, descriptive verbs and adjectives) — is written **only** in the resolved `language`, with no source-language vocabulary sprinkled in. Three sub-rules bind this:

- **(a) Verbatim-preservation scope is closed**: the verbatim category covers machine-readable tokens, code fragments, file paths, commands, and section headings only. Ordinary nouns, adjectives, conjunctions, and verb phrases are concept words that **do** translate — render them in the resolved `language` and do not retain the source-language word alongside the translation.
- **(b) First-use pairing is gated on translation-gap need**: pair the localized term with the source-language original in parentheses only when the resolved `language` does not yet have a settled translation, or when explicitly showing the localized-to-original correspondence once carries value for the reader (e.g. domain jargon a reader may map back to documentation). For concept words whose translation reads naturally in the resolved `language`, omit the parenthetical and use the localized form alone.
- **(c) Function-word connectives stay in the resolved language only**: words that carry connective / structural function inside a sentence (the resolved-language equivalents of "regarding", "with respect to", "in the case of", "however", "because") are rendered solely in the resolved `language` — never with the source-language counterpart in parentheses or inline. These words are not domain jargon and the pairing would only add noise.

Intent: a native speaker of the resolved `language` reads the output as natural prose, while the verbatim-preserved identifiers (the cross-reference stability the positive-direction rules protect) stay machine-grep-able. Symptom this rule is meant to suppress: defensive over-preservation that sprinkles source-language vocabulary across connective prose, producing output that reads as half-translated to a native reader.

**Paired bilingual samples** (runtime rendering demonstration, not meta-prose):

- `language: ja`: `一次情報源（primary source）の確認を経てプランを策定済み`
- `language: en`: `Plan drafted after verifying the primary source`
- `language: ja`: `影響範囲（blast radius）: SKILL.md の 3 セクション + references/plan-format.md`
- `language: en`: `Blast radius: 3 sections of SKILL.md + references/plan-format.md`

## User-gate summary preamble

Each user-judgment gate that presents structured content (a plan body, a remaining-violations list, an unresolved-findings list) emits a short summary preamble. For Step 7.5 and Step 8, it appears at the top of the user-facing output, above the structured content. For Step 4, it appears after the plan body per § Step 4 presentation order (the plan body — condensed in chat per § Step 4 presentation order's two-tier split — is rendered first in natural reading order; the preamble follows the `---` separator). In all cases the preamble is above the guidance line. The preamble names the *shape* of the situation (count, categories, what the gate is asking); it does not paraphrase, summarize, or re-list the structured content.

**Applies to:**

- Step 4 plan approval
- Step 7.5 persistent-violations decision
- Step 8 unresolved-findings decision
- Step 11 compaction approval gate

The other user-gates listed in `SKILL.md` § No-Stall Principle (Step 1.5 dialogues, Step 7 scope-drift stop, Step 10 commit-plan approval / per-commit accept / fold-or-defer / ambiguous-adjust clarifier gates, Completion subtask PR URL prompt) do not emit a preamble — their structured content is either a single short prompt or already self-explanatory (Step 10's gates render the commit data verbatim via `git`-shaped output), and a 3–5 item summary above them would be padding noise.

**Format constraints (closed list):**

- Bulleted list, 3–5 items, each one sentence.
- Technical jargon pairs the localized phrasing with the original technical term in parentheses on first use within the preamble (e.g. `品質ゲート（check_commands / Step 7.5）` for `language: ja`, `quality gate (check_commands / Step 7.5)` for `language: en`). When the localized phrasing and the original technical term coincide (typically under `language: en` for English-origin jargon), pair the term with its identifying handle instead (e.g. `Step 7.5 (Rules Compliance Review)`, `rules-review (the rules-compliance reviewer skill)`) so the parenthetical still adds disambiguating information.
- Quoted heading anchors from rule files or other source files (e.g. a rule's section heading referenced from the preamble) are kept verbatim regardless of the resolved `language` — they are file-internal identifiers, not localizable prose.
- Output language follows the resolved `language` (see `SKILL.md` § Configuration; default `ja`).
- Mark the boundary between preamble and the rest of the output with a bold lead-in placed at the top of the preamble, above the first bullet (`**Summary**` for `language: en`, `**概要**` for `language: ja` — the lead-in text is localized to follow the resolved `language`). A fenced section is an acceptable alternative but is redundant when a bold lead-in is present — do not emit both.

**Content slots (per gate):**

- **Step 4 plan approval**:
  - Required: `goal` / `verification approach` (2 items by default).
  - Optional: `Decisions` (when not the empty fixed-sentence variant) / `known risks` (when the Risks section is present) / primary affected files (sourced from the plan body's Overview Scope's modified/added items only — exclude out-of-scope items, compressed into one sentence). When 2+ Optional slots qualify, fill in plan-body order: Decisions → Risks → affected files.
  - Affected-files promotion: 2 Required + ≥1 qualifying Optional already meets the 3-item lower bound, so promotion fires only when Decisions and Risks are both empty (0 qualifying Optional) — promote affected files to Required in that case so the preamble still hits the lower bound.
- **Step 7.5 persistent-violations decision**:
  - Required: how many violations remain / **rule categories** (e.g. categories surfaced by `rules-review` such as the type-safety / immutability rules under `.claude/rules/languages/`, or the distribution rules under `.claude/rules/project.rules.md`) / what decision is asked.
  - Optional: why auto-fix did not resolve (only when an auto-fix attempt was made and recorded).
- **Step 8 unresolved-findings decision**:
  - Required: how many findings remain / **review categories** (correctness / conventions / simplicity — the same three categories the reviewer skill organizes findings under) / what decision is asked.
  - Optional: why they could not be resolved or rejected (only when the reasons are non-uniform across the remaining findings).
- **Step 11 compaction approval gate**:
  - Required (6 slots always rendered; no promotion mechanic — the 3–5-item constraint above is **relaxed to 6** for this gate so the two explanatory slots can precede the four mechanical metrics): the gate's content is split into a **why-fired + decision-axes** prefix (slots 1–2) followed by **mechanical metrics** (slots 3–6) so the user reads "why am I being asked to judge / what are my choices" **before** the metrics — the metrics are supplementary input to the decision, not the decision itself. The mechanical-metrics-only form was empirically misread as a "compaction failure report" because the gate's reason for opening was implicit.
    1. **Why this gate fired** (1 sentence): name the root cause for opening the gate — that is, the reason `--compact` returned `status: "compacted"` requires user judgment rather than auto-apply. For the current compaction-gate design this is invariant ("`--compact` landed accepted edits whose disposition the user owns — auto-apply is not authorized for rule-file rewrites"); future gate-firing conditions (threshold-violation / regression-detected / etc.) can extend this slot with a closed-list root-cause classifier.
    2. **Decision axes** (1 sentence): enumerate the per-gate disposition options the user is choosing among — the **closed list** of decisions the user can take. For Step 11 this is `accept (apply all)` / `reject (revert all)` / `adjust (per-file disposition / clarification / other-out-of-scope)` / `cancel (leave working tree as-is)` per the `SKILL.md` § Step 11 sub-step 3 closed list. Other gates with multiple root-cause origins should enumerate the user-judgment axis tied to each root-cause classifier as a closed list, so the user sees the decision space rather than inferring it from the metric list.
    3. **How many files compacted** (count of `files_processed` entries with `applied_edits_count > 0` — the `files_processed.length` figure is not used because it also counts `error` / `unresolved` entries with zero edits).
    4. **Total chars saved** (sum of `chars_before - chars_after` across the same accepted-edits subset).
    5. **`per_file_status` breakdown** (counts of `converged` / `partial` / `unresolved` / `error`).
    6. **Count of files where `below_threshold` is `false`**.
  - Optional: `structural_notes` count (only when non-zero) / self-application warning (only when the current run is itself modifying `extract-rules` or `dev-workflow` and may have appended entries via `--from-conversation` that the immediately-following `--compact` could merge or drop — detect via `git diff <base-commit> --name-only` matching paths under `skills/extract-rules/` or `skills/dev-workflow/`, where `<base-commit>` is the value captured at Step 2's opening sub-step per `SKILL.md` § Step 2).
  - JSON field identifiers (`applied_edits_count`, `below_threshold`, `per_file_status`, `chars_before`, `chars_after`, `iterations_used`, `structural_notes`) and the `under threshold` / `over threshold` labels are preserved verbatim per § Localization granularity's "file-internal identifiers" rule; only the slot's surrounding prose is subject to first-use jargon pairing. Canonical paired example (`language: ja`): a preamble bullet renders as ``圧縮対象（`applied_edits_count > 0` を満たすファイル）: 3 件`` — the localized phrasing `圧縮対象` pairs with the verbatim JSON expression `` `applied_edits_count > 0` `` on first use, and the JSON tokens themselves stay verbatim regardless of `language` value (no `件数が 0 より多い` translation of `> 0`, no `適用編集数` translation of `applied_edits_count`). The same rule covers aggregate-level preamble prose: the unit name `chars` stays verbatim in slots like `総削減文字数: 30000 chars` / `total chars saved: 30000 chars`, while only the surrounding localized phrasing (`総削減文字数` / `total chars saved`) is the first-use-paired layer.
  - The per-file detail render (each file as `<path>: <chars_before> → <chars_after> chars (<below_threshold_label>, <per_file_status> in <iterations_used> iters[, <structural_notes_count> notes])`) lives in `SKILL.md` Step 11's "Char-count compaction gate" paragraph; the preamble's slots above are aggregate-only and complement the per-file detail.

Each gate's Optional slot conditions are independent — do not import Step 8's `non-uniform reasons` constraint into Step 7.5 (Step 7.5's Optional triggers on `auto-fix attempted and recorded` regardless of uniformity), or vice versa. The Step 11 compaction gate's Optional slots (`structural_notes` count, self-application warning) likewise carry their own trigger conditions independent of the other gates.

**Omission condition:**

When the structured content has only one item (a single remaining violation in Step 7.5, a single unresolved finding in Step 8, or a single accepted-edits file in Step 11), the preamble SHOULD be omitted — a 3–5 item preamble above a single concrete item is padding noise that duplicates what the item itself states. The Step 4 preamble always has ≥ 3 items by construction, so this omission does not apply to Step 4. Do not announce the omission in the user-facing output (e.g. an "preamble omitted because only one item" line) — the announcement itself is padding noise; present the single concrete item directly.

## Step 4 presentation order

Step 4 uses a **two-tier presentation** so the user's review surface stays scannable while full detail remains one click away. Step 7.5 and Step 8 do **not** use this protocol — they present preamble + content directly.

- **Plan file** (the Plan Mode plan file — the file you write with the `Write` tool before calling `ExitPlanMode`; the approval modal renders its contents) = the **full** plan body: the `> Review guide` line + Overview → Decisions → Design → Test plan → Risks/Unknowns, in template order. Always write the full plan to this file — the modal renders the file's contents, so the full plan is what the user sees on opening the approval modal.
- **Chat presentation** = a **condensed** view (must-review subset + file-level orientation), so the chat does not repeat the full body the modal already carries.

**Mechanism dependency**: the split relies on the current Claude Code behavior where `ExitPlanMode` reads the plan **file** and the approval modal shows that file's full contents — per the current `ExitPlanMode` tool contract, the plan is not passed as a tool argument, it is read from the file written during Plan Mode. Where the modal does not render the file, the condensed chat would under-inform — the always-write-the-full-plan rule above is the backstop, so nothing the condensed chat omits is unreachable.

**Chat output sequence (Step 4 only):**

1. `## Plan` header as a visual boundary separating the plan from prior conversation
2. The `> Review guide` line per § Review guide line
3. Condensed plan body, following § Localization granularity — heading levels: `###` for sections (one below the `## Plan` container), `####` for sub-sections:
   - `Overview` in full (including `Highlights` when present) — it is already short
   - `Decisions` in full — these need the user's judgment
   - `Design` as a **file-list only**: the files to change with one line of what-changes each — not the full Design body (that lives in the plan file / modal)
   - `Test plan` and `Risks / Unknowns` are **not** rendered in chat — they live in the plan file / modal; their essentials surface via the preamble's `verification approach` and `known risks` slots
4. Horizontal rule (`---`) as a visual separator between the condensed body and the approval summary
5. Summary preamble per § User-gate summary preamble
6. Guidance line per § Step 4 guidance lines
7. **`ExitPlanMode` must be called in the same turn** — do not output additional text or wait for user input between the guidance line and the `ExitPlanMode` call. `ExitPlanMode` triggers the approval modal (which renders the full plan file); delaying it to a subsequent turn causes the workflow to appear stalled with no visible approval mechanism

The user may approve, reject, or request refinement via the approval modal. If the user requests changes, the plan re-enters Plan Mode interaction without repeating the full presentation sequence.

**Candidate-list implementation boundary**: when the plan lists multiple candidate items (a roadmap, a staged rollout, or a set of options) but scopes only a subset for this run, include a one-sentence boundary statement in the full plan body (visible in the approval modal) before the guidance line: name which item(s) will be implemented this run and that the remaining candidates are deferred records only — no automatic execution queues them. Without this boundary statement, candidates listed but not scoped may be misread as implicitly queued for sequential auto-execution. Example: `This run implements [X]; [Y] and [Z] are recorded as future candidates and will not be executed automatically.`
