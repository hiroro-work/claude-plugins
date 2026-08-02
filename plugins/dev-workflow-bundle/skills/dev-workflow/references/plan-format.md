# Plan Format

Specification for how plans are structured, self-checked, reviewed, and presented in `/dev-workflow`.

Read this reference when executing any of the following:

- **Step 2** — creating the plan (§ Template, § Step 2 self-check)
- **Step 3** — peer plan review (§ Step 3 (f) content-quality rubric)
- **Step 4** — presenting the plan to the user (§ Step 4 guidance lines, § Step 4 presentation order)
- **Any user-facing prose output** — localization boundary (§ Localization granularity)

## Template

`Source of truth for the Build order heading name and its N. **<heading>** — <detail> step shape: this section. A rename or a shape change sweeps this closed list in the same commit — this skill's README.md (plan-structure table, Two-tier presentation, How to review a plan quickly, visual-gate bullets), mobpro's references/plan-format.md (§ Template and § Review lens' Structure bullet), and, in scripts/plan-review/public/index.html, SECTION_TYPES for the heading plus collapseBuildOrderSteps and STEP_SEP_RE for the shape. Those sites re-encode the name or the shape in a form a grep for the old token can miss, which is what puts them on the list; a passing mention anywhere in this skill's own files is not a member, because that grep does reach it.`

Every plan produced in Step 2 must follow this structure. Overview, Decisions, Build order, and Test plan are **required** (including Decisions when there are no user decisions — use the fixed sentence in § Empty-Decisions fixed sentences). Risks / Unknowns is optional.

```markdown
## Plan

> Review guide
> - must-review — Overview, Decisions, Build order
> - reference — Test plan, Risks

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

### Build order
<The body of the plan, **always** an ordered, numbered list of implementation steps — the order is the order the work lands in, and Step 5 executes it step by step. Write each step as `N. **<heading>** — <detail>`: a bold heading naming the change (verb-first, naming the file(s) it touches), then the detail. **The bold heading is what splits summary from detail** — the visual plan-review gate collapses each step to it and expands the rest on click, so a step that does not open with one renders uncollapsed. The em dash is the conventional separator and is stripped on render; it is not what the split keys on. A step may also name the Decision it implements and the task-relevant skill(s) to invoke there (see `SKILL.md` Step 2's **Task-relevant skill annotation** bullet for what qualifies as task-relevant). When the work has no inherent order, number it anyway — the numbering is then the order this plan chooses, and one line directly under the section heading says the order is free. See § Traceability for the optional Build order→Decision link. A Build order step — or the section as a whole — MAY include a mermaid diagram (e.g. a flowchart or sequence diagram) when a complex flow, state transition, or branching structure is hard to follow in prose; the diagram is a section-level visual aid, not a numbered step, so give it its own line rather than wedging it into the heading / detail shape above. The diagram must **replace** the prose it would otherwise need — a diagram that merely restates the numbered steps is padding (cut per § Sizing guidance). The visual plan-review gate renders mermaid as a diagram; the chat approval it degrades to shows the raw fenced block (acceptable degradation).>

### Test plan
<Test files to add or update, test types, coverage scope — or the justification for no tests. Each test item should reference the Build order step(s) it verifies (recommended) — see § Traceability.>

### Risks / Unknowns
<Non-trivial risks or open questions. Omit the section entirely if none.>
```

### Review guide line

The `> Review guide` block sits directly under `## Plan`, above Overview, so a reviewer can tell at a glance which sections need judgment and which are reference detail. It renders as a multi-line blockquote — a heading line followed by one bullet per category. Unlike § Empty-Decisions fixed sentences and § Step 4 guidance lines (single sentences using the same **Blockquote rendering convention**), this block's `>`-prefixed bullets **are** the rendered output — don't extend those other two sections to this multi-line form:

- **Must-review** = the sections that need the user's judgment: `Overview` (Goal / Approach / Scope / Difficulty, plus `Highlights` when present), `Decisions`, and `Build order`. `Highlights` is one Overview bullet, not a standalone must-review category — Overview always carries it. Rendering `Overview` in the must-review tier matches § Step 4 presentation order (which already shows Overview in full) and gives empty-`Decisions` plans a substantive review anchor (Goal / Approach). `Build order` is must-review because it is the sequence the work will actually land in — Step 5 executes it step by step — so approving the plan approves that sequence.
- **Reference** = supporting detail the user can skim: `Test plan`, `Risks` (omit any that are absent).
- Localization (§ Localization granularity): the connective words (`Review guide`, `must-review`, `reference`) are translated to the resolved `language`; the section-name tokens (`Overview` / `Highlights` / `Decisions` / `Build order` / `Test plan` / `Risks`) stay verbatim — they are file-internal identifiers, and translating them would break the Step 2 self-check / Step 3 (f) heading exact-match.

Paired bilingual sample (runtime rendering demonstration, not meta-prose):

- `language: en`:

  ```text
  > Review guide
  > - must-review — Overview, Decisions, Build order
  > - reference — Test plan, Risks
  ```

- `language: ja`:

  ```text
  > レビュー指針（Review guide）
  > - 要確認 — Overview, Decisions, Build order
  > - 参考 — Test plan, Risks
  ```

**Must-review low-load rule**: keep the must-review tier (`Overview`, `Decisions`, `Build order`) plain, in the resolved `language`, and scannable. Technical depth and rationale detail belong in the reference tier (`Test plan` / `Risks`), not in must-review. `Overview` stays within its § Sizing guidance soft cap (≤ 5 bullets, one line each). `Build order` carries per-step detail, and what keeps it low-load is the per-step collapse § Template describes: the tier opens at N one-line headings with the detail one click away. **That collapse is the visual gate's alone.** The plan document a reader opens from the chat approval's pointer carries the tier at full length — which is why each heading must carry its step on one line (§ Sizing guidance) rather than relying on the collapse. Reuse the must-review token set (`Overview` + `Decisions` + `Build order`) verbatim — do not introduce new section vocabulary.

### Sizing guidance

A plan is the user's review surface, not a document — its purpose is fast, accurate review. Default to the **tersest form that still lets the reviewer judge**: cut only redundancy, duplication, and padding — **never** the information, rationale, or boundaries the reviewer needs to decide. Operational test for "is this padding?": if removing a passage does not change what the reviewer can verify or decide, it is padding (cut it); if it does, keep it. Prefer bullets over prose, but use prose where a bullet cannot carry the logic. The caps below are soft — clarity wins over character count. Traceability references (§ Traceability) are exempt from this padding rule — they pass the operational test (they change what the reviewer/implementer can verify), so a Step 6 tidy/simplify pass must not strip them.

- Overview: at most 5 bullets (4 when Highlights is omitted), each at most one line. Overlong Overviews defeat the "30-second scan" goal.
- Highlights: a **single** Overview bullet (it is one of the ≤5 Overview bullets above, not a separate list), holding at most 3 high-impact items on one line — only genuinely high-impact items. See § Template for the categories and the omit-when-none rule.
- Decisions: up to 5 items. A single genuine (a)+(b) item is fine — surface it alone rather than padding.
- Build order: an ordered, numbered list of actionable implementation steps, each written as `N. **<heading>** — <detail>` per § Template. Write a step as a bare heading only when the change is self-evident; otherwise keep the detail the reviewer needs to judge. Keep every heading to one line — it has to carry its step on every approval surface (§ Review guide line's **Must-review low-load rule** paragraph). As a concrete instance of the padding test above, avoid narrating what well-named files/functions already convey, and do not restate Decisions or Overview content. A mermaid diagram that **replaces** prose the reviewer would otherwise need (a complex flow / state transition / branching) is **not** padding — it changes what the reviewer can follow, so it is exempt from the cut rule; a diagram that merely re-draws the numbered steps is padding (cut it).
- Test plan: bullet-list the test files and the case each covers, one line per case; each case may reference the Build order step(s) it verifies (see § Traceability). Do not re-describe (duplicate) the implementation.

## Traceability

Links between plan sections run **one direction only — the reference tier points up**:

- **Test → Build order step** (recommended): each Test plan item names the Build order step(s) it verifies.
- **Build order → Decision** (optional): a Build order step may name the Decisions item it implements.
- **Empty-Decisions degradation**: when Decisions renders an empty-Decisions fixed sentence (§ Empty-Decisions fixed sentences), `Build order → Decision` is naturally absent (it is optional and has no target item); `Test → Build order step` still applies unchanged.
- The must-review tier carries **no** downward back-references (no "this Decision drives steps 3–4" annotations) — that detail lives in the reference tier.

This section is the single source of truth for the traceability convention; § Step 2 self-check and § Step 3 (f) content-quality rubric reference it rather than restating the rule. Traceability references are also exempt from § Sizing guidance's padding / cut-duplication rule (stated and explained there).

## Decisions criterion (AND condition)

An item belongs in Decisions only if **both** are true:

- **(a)** reasonable engineers could legitimately disagree on the choice, AND
- **(b)** switching the choice later would require non-trivial rework (migration, renames, re-review, API shape changes, etc.).

Preference-level choices that satisfy (a) but not (b) — e.g. putting a helper in the same file vs. a new file, naming bikesheds — do **not** belong in Decisions. Note them in Build order and let the AI decide.

### Not in Decisions

- Mechanical details (function names, variable names, file names)
- Choices uniquely determined by project rules under `.claude/rules/` or by existing patterns
- Details already vetted by peer in Step 3
- Style-level preferences that are cheap to reverse

## Empty-Decisions fixed sentences

When no items qualify under the (a)+(b) criterion, render Decisions with one of these fixed sentences — "no decisions" must be an explicit signal, not a missing section.

**Blockquote rendering convention** (defined once here; § Step 4 guidance lines below reuse it):

- The leading `>` is Markdown blockquote rendering for visual separation in this spec, not part of the literal text.
- When extracting, strip the blockquote prefix (`>` plus one separator space).
- Rendering it as a plain paragraph or as a blockquote in the output is a presentation choice and does not affect "verbatim" compliance.

Additional rule specific to Decisions: place the extracted sentence alone — no preceding explanation, no trailing elaboration, no padded items alongside.

**Normal mode (no state file):**

> No user decisions required — approve if the approach looks reasonable.

**Resume mode (executing a subtask from a decomposition state file):**

> No user decisions required (subtask scoped — boundaries approved in prior Step 1.5 (Task Decomposition)).

## Subtask / Resume handling

When Step 2 runs inside a decomposed subtask (a state file from Step 1.5 is active), the subtask's **boundaries, order, and purpose were already user-approved** in the parent run's Step 1.5. Do not re-surface them in Decisions.

Restrict Decisions to **judgment calls that arise inside the current subtask**. Examples:

- Subtask A is "add authentication middleware" → choosing the token-verification scheme (JWT vs. session) is in scope.
- Subtask B is "introduce chart rendering" → choosing the charting library (Chart.js vs. Recharts) is in scope.

If the current subtask has no in-scope decisions, use the Resume-mode fixed sentence in § Empty-Decisions fixed sentences.

## Step 2 self-check

After the Simplicity self-audit in Step 2, run this check on the plan. Fix any failures before Step 3.

**Run this check in the order listed — structural compliance first, then content quality.** If the plan was seeded from a carry-over document (an inherited spec, a prior-session draft, or a hand-off note), verify structure before content: carry-over documents use free-form prose that does not match the template, and transplanting their content without first establishing the template skeleton is the most common source of non-compliant plans. Create the template skeleton first, then embed the carry-over content.

- [ ] **Structural compliance**: the plan contains exactly the required sections (`Overview`, `Decisions`, `Build order`, `Test plan`) in that order, with correct heading levels (`###` for top-level sections, `####` for sub-sections), and no sections outside the enumerated template (Overview, Decisions, Build order, Test plan, optionally Risks / Unknowns). If this check fails, stop here and restructure before running the remaining content checks.
- [ ] Every Decisions item passes the (a)+(b) criterion — if in doubt, drop it to Build order.
- [ ] **When Decisions renders an empty-Decisions fixed sentence** (§ Empty-Decisions fixed sentences): scan Build order and Approach for any passage that answers a "why X over Y" question or introduces a fixed value, threshold, or boundary — these are (a)+(b) candidates that may have been overlooked when the author pre-judged the task as decision-free. If any surface, promote to Decisions before advancing to Step 3. Declaring "no decisions" does not discharge the buried-decisions check; it makes it more important to run.
- [ ] No choice that qualifies under (a)+(b) is buried inside Build order instead of surfaced in Decisions. **Promotion cues** — any one is sufficient to flag a Build order passage as a Decisions candidate:
  - A Build order step answers a "why X over Y" question or a "why this specific value / boundary / timing" question, but Decisions has no corresponding item.
  - The plan introduces a new enum / fixed-value set, but Decisions does not record that each member is necessary and non-overlapping with the others.
  - A choice that passes the (a)+(b) criterion appears with no Alternative line (or no one-line rejection reason) — promote the alternative analysis into a Decisions item rather than leaving it as Build order prose.
- [ ] If executing a subtask (state file active): Decisions does not re-surface subtask-boundary questions.
- [ ] Build order is an ordered, numbered list of actionable steps, each shaped `N. **<heading>** — <detail>` (§ Template), with `<detail>` omitted where the change is self-evident (§ Sizing guidance) — apart from the two non-step lines § Template places outside the numbered list: an optional section-level mermaid diagram, and — when the work has no inherent order — the one line directly under the section heading saying the order is free.
- [ ] Test plan items reference the Build order step(s) they verify where applicable (§ Traceability).
- [ ] Must-review content (`Overview`, `Decisions`, `Build order`) is plain and scannable — each Build order heading on one line; technical depth and any back-references live behind the heading or in the reference tier.
- [ ] **Upstream-document impact scope**: if the plan was seeded from an external or upstream document (spec, design doc, hand-off note) that enumerates the files, call sites, or affected components, independently cross-search the codebase for the same pattern (e.g. grep for the affected API, hook, or parameter), compare the search results against the document's enumeration, and record any discrepancy in Risks / Unknowns or expand Scope accordingly.
- [ ] **Permission and capability assumption verification**: verify from a primary source (official documentation, actual permission-matcher behavior, or hands-on test) any assumption that a new external command, CLI flag, or permission grant will execute without a confirmation dialog or access barrier. If the assumption cannot be confirmed at planning time, add an explicit verification step to the plan or record it in Risks / Unknowns as unconfirmed.
- [ ] **Numerical constant origin disambiguation**: for any concrete numerical constant introduced in the plan — upper limits, thresholds, buffer sizes, retry counts, timeout values — state explicitly whether the value is **derived** (determined by an external specification, a calculation from known constraints, or an empirical measurement — cite the source or formula) or **discretionary** (a design judgment call — an approximation, a round number, or a value selected from a reasonable range without an external fixed point). Do not frame a discretionary value as a derived one.

This is the **author's first-pass judgment** on plan content; Step 3 category (f) re-checks content externally. The **Structural compliance** bullet above is the only structural property checked here; category (f) does not re-check it.

## Step 3 (f) content-quality rubric

Step 3 adds a sixth review category — **f. Presentation & attention allocation (content quality)** — on top of the five categories (a–e) whose rubric bodies live in `references/review-categories.md` § Plan review categories (labels enumerated in `SKILL.md` Step 3). Format compliance is already enforced by the Step 2 self-check, so (f) focuses on content.

Reviewer checks:

- **(a)+(b) criterion, external verification** — does every Decisions item genuinely pass both? Flag items that look like style-level preferences smuggled in.
- **Buried-decisions check** — does the Build order body contain a judgment call that should have been surfaced in Decisions? (Inverse of the criterion — look for hidden choices, not just wrong ones.)
- **Cross-section consistency** — e.g. does every file listed in Overview's Scope appear in Build order? Does every test file promised in Test plan correspond to Build order content? Do the choices made in Decisions actually drive the Build order? Where § Traceability references are present, do Test→Build order step references resolve to real Build order steps, and Build order→Decision references to real Decisions items?
- **Cross-file consistency (multi-file plans)** — when the plan edits more than one file (multiple modules, parallel components, multiple docs — for skill development this includes multiple `SKILL.md` or `references/*.md` files), check that (i) parallel concepts use consistent names / headings / labels across files, (ii) cross-references between the edited files use consistent phrasing, and (iii) the same note or rationale isn't duplicated or paraphrased redundantly across files. Skip this bullet for single-file plans.

Reviewer does not re-check structural compliance (section presence, bullet count, etc.) — that is Step 2's responsibility.

## Step 4 guidance lines

In Step 4, present the plan with one of these literal English guidance lines placed at the bottom of the plan output, after the summary preamble (see § Step 4 presentation order for the full sequence). The template depends on (i) whether Decisions has qualifying items and (ii) whether a state file is active.

Rendering conventions for the variants below: same **Blockquote rendering convention** as § Empty-Decisions fixed sentences above.

**Decisions has one or more qualifying items (Normal or Resume):**

> Decisions has items requiring your judgment — see the full plan above for details. The plan has been reviewed in Step 3 (Plan Review).

**Decisions is empty, Normal mode:**

> No user decisions required — approve if the approach looks reasonable. Full plan details appear above. The plan has been reviewed in Step 3 (Plan Review) for correctness and convention compliance.

**Decisions is empty, Resume mode (subtask execution):**

> No user decisions required (subtask scoped — boundaries approved in prior Step 1.5 (Task Decomposition)). Full plan details appear above.

Pick exactly one variant and use its literal text verbatim — do not concatenate variants, do not reword the sentence content.

**Disabled-plan-phase conditional**: when `plan_review_enabled` is `false` and Step 3 was therefore skipped, the "The plan has been reviewed in Step 3 ..." sentence is false, and the Step 4 user-approval gate is the sole review of the plan — so this must be signaled regardless of which variant is chosen. Each cause in `SKILL.md` Step 3's Disabled-phase exception (its closed list is the source) gets its own replacement sentence; never conflate them, since the wrong one asserts something false about the task. Evaluate in order, first match wins:

- **a configured `plan_review: false`** (§ Configuration's `plan_review` bullet) — use `Step 3 (Plan Review) was skipped because plan_review is false for this project — this approval is the sole review.` This is first because a standing project setting outranks whatever tier or mode this particular run landed on.
- **an assessed tier of Trivial** — use `Step 3 (Plan Review) was skipped because this task was assessed Trivial — this approval is the sole review.` Key this on the **assessed tier**, never on `code_review_enabled` being `false`: a configured `code_review: false` also produces that without the tier being Trivial, so a flag-based test would assert Trivial of a task that was never assessed so (the same discriminator `references/step4-finalize-plan.md` § Sub-step 3's Trivial re-activation keys on, for the same reason).
- **`--fast` forced the plan phase off on a non-Trivial tier** — use `Step 3 (Plan Review) was skipped because fast mode skips Plan Review for this run — this approval is the sole review.` instead, since the task was not assessed Trivial and saying so would contradict the difficulty log line (`SKILL.md` Step 2's Assess difficulty), which names the real tier.

Applying whichever sentence the list above selected (all three cases alike): for a preamble variant that **contains** a "The plan has been reviewed in Step 3 ..." sentence, **replace** that sentence with it; for a variant that **contains no** such sentence (the Resume-mode empty-Decisions variant), **append** it. The lead clause of each variant ("Decisions has items requiring your judgment ..." / "No user decisions required ...") is unchanged in both cases — only the review-status sentence is substituted or appended.

## Localization granularity

Applies to all user-facing prose produced by this skill — plan body content, user-gate preambles, violation/finding lists, the Step 2 difficulty-assessment log, Step 10 commit-plan / per-commit gate framing prose and the Step 11 "Commit rule updates" gate output (verbatim git output and file paths remain English), Completion summary, and Step 11.5 `Description` / `Suggested fix direction` paragraphs. The resolved `language` (see `SKILL.md` § Configuration) controls the output language.

Source of truth: `SKILL.md` § Configuration `language` bullet maintains the same enumeration — keep in sync when categories are added or removed.

**Two-way rule:**

- **Translate**: generic technical concepts that have natural equivalents in the target language. The output must read naturally to a native speaker of the resolved language. Examples: primary source → 一次情報源 (`ja`), self-audit → 自己監査 (`ja`), blast radius → 影響範囲 (`ja`), edge case → 境界ケース (`ja`).
- **Preserve verbatim**: file-internal identifiers — function names, config key names (`check_commands`, `plan_review`), section anchors (`Step 7.5`), stable cross-reference labels (`§ No-Stall Principle`), file paths (`references/plan-format.md`), skill names (`Skill(rules-review)`), and section headings (`Overview` / `Decisions` / `Build order` / `Test plan` / `Risks` / `Unknowns`). Preserving a step anchor verbatim does not license writing it bare: whenever one appears in output, pair it with what that phase does per the running skill's § Phase naming in user-facing output section.

**First-use pairing**: on the first occurrence of a translated concept within a given output block (preamble, expanded section, completion summary), pair the localized phrasing with the original technical term in parentheses (e.g. `一次情報源（primary source）` for `language: ja`). Subsequent occurrences within the same block use the localized form alone. This convention is consistent with § User-gate summary preamble's jargon pairing rule, which is a preamble-specific specialization of this broader principle — § User-gate summary preamble adds format constraints specific to preamble bullets (e.g. pairing with an identifying handle when the localized and original terms coincide under `language: en`).

**Negative-direction rule (do not over-preserve)**: the Two-way rule and First-use pairing above are **positive-direction** rules — they name what to preserve verbatim and what to pair on first use. Everything outside those two categories — the connective prose that links identifiers together (ordinary sentences, function words, transitions, descriptive verbs and adjectives) — is written **only** in the resolved `language`, with no source-language vocabulary sprinkled in. Three sub-rules bind this:

- **(a) Verbatim-preservation scope is closed**: the verbatim category covers machine-readable tokens, code fragments, file paths, commands, and section headings only. Ordinary nouns, adjectives, conjunctions, and verb phrases are concept words that **do** translate — render them in the resolved `language` and do not retain the source-language word alongside the translation.
- **(b) First-use pairing is gated on translation-gap need**: pair the localized term with the source-language original in parentheses only when the resolved `language` does not yet have a settled translation, or when explicitly showing the localized-to-original correspondence once carries value for the reader (e.g. domain jargon a reader may map back to documentation). For concept words whose translation reads naturally in the resolved `language`, omit the parenthetical and use the localized form alone.
- **(c) Function-word connectives stay in the resolved language only**: words that carry connective / structural function inside a sentence (the resolved-language equivalents of "regarding", "with respect to", "in the case of", "however", "because") are rendered solely in the resolved `language` — never with the source-language counterpart in parentheses or inline. These words are not domain jargon and the pairing would only add noise.

Intent: a native reader of the resolved `language` sees natural prose, while the verbatim-preserved identifiers stay machine-grep-able. This rule targets defensive over-preservation — sprinkling source-language vocabulary into connective prose, which reads as half-translated.

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
- Step 11.6 workability-candidate disposition gate

The other user-gates listed in `SKILL.md` § No-Stall Principle (Step 1.5 dialogues, Step 7 scope-drift stop, Step 10 commit-plan approval / per-commit accept / fold-or-defer / ambiguous-adjust clarifier gates, the Step 11 confirm-remaining-steps entry gate, the Step 11 rule-update commit gate, Completion subtask PR URL prompt) do not emit a preamble — their structured content is either a single short prompt or already self-explanatory (Step 10's commit gates and the Step 11 rule-update commit gate render the commit data verbatim via `git`-shaped output), and a 3–5 item summary above them would be padding noise.

**Format constraints (closed list):**

- Bulleted list, 3–5 items, each one sentence.
- Technical jargon pairs the localized phrasing with the original technical term in parentheses on first use within the preamble (e.g. `品質ゲート（check_commands / Step 7.5 Rules Compliance Review）` for `language: ja`, `quality gate (check_commands / Step 7.5 Rules Compliance Review)` for `language: en`). When the localized phrasing and the original technical term coincide (typically under `language: en` for English-origin jargon), pair the term with its identifying handle instead (e.g. `Step 7.5 (Rules Compliance Review)`, `rules-review (the rules-compliance reviewer skill)`) so the parenthetical still adds disambiguating information.
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
- **Step 11.6 workability-candidate disposition gate**:
  - Required: how many candidates were detected / **category breakdown** (`skill-candidate` vs `lint-rule-candidate` counts) / what decision is asked (the 4-way disposition — act now / make a subtask / save to backlog / reject).
  - Optional: none.

Each gate's Optional slot conditions are independent — do not import Step 8's `non-uniform reasons` constraint into Step 7.5 (Step 7.5's Optional triggers on `auto-fix attempted and recorded` regardless of uniformity), or vice versa.

**Omission condition:**

When the structured content has only one item (a single remaining violation in Step 7.5, a single unresolved finding in Step 8, a single accepted-edits file in Step 11, or a single workability candidate in Step 11.6), the preamble SHOULD be omitted — a 3–5 item preamble above a single concrete item is padding noise that duplicates what the item itself states. The Step 4 preamble always has ≥ 3 items by construction, so this omission does not apply to Step 4. Do not announce the omission in the user-facing output (e.g. an "preamble omitted because only one item" line) — the announcement itself is padding noise; present the single concrete item directly.

## Step 4 presentation order

Step 4's **chat approval** — the surface the visual gate degrades to — uses a **two-tier presentation** so the user's review surface stays scannable while full detail stays one file away. **Scope**: the chat output sequence below is chat-only; the two bullets between here and it name both surfaces because the plan document they share is written before either runs. Step 7.5 and Step 8 do **not** use this protocol — they present preamble + content directly.

- **Plan document** (`.claude/plans/<slug>.md`, written by Step 4 sub-step 2 before either surface runs) = the **full** plan body: the `> Review guide` line + Overview → Decisions → Build order → Test plan → Risks/Unknowns, in template order.
- **Chat presentation** = a **condensed** view (the must-review tier, with `Build order` cut to its step headings), closed by a pointer to the plan document — so nothing the condensed view omits is unreachable.

**Chat output sequence (Step 4 only):**

1. `## Plan` header as a visual boundary separating the plan from prior conversation
2. The `> Review guide` line per § Review guide line
3. Condensed plan body, following § Localization granularity — heading levels: `###` for sections (one below the `## Plan` container), `####` for sub-sections:
   - `Overview` in full (including `Highlights` when present) — it is already short
   - `Decisions` in full — these need the user's judgment
   - `Build order` as its **step headings only**: the numbered list with each step's bold heading and not the per-step detail (that lives in the plan document). Chat has no collapse affordance, so the headings are its counterpart to the visual gate's per-step collapse (§ Review guide line's **Must-review low-load rule** paragraph)
   - `Test plan` and `Risks / Unknowns` as **their heading plus a one-line gist each** — enough to see what each covers without reproducing it; the detail stays in the plan document, and the essentials also surface via the preamble's `verification approach` and `known risks` slots
4. Horizontal rule (`---`) as a visual separator between the condensed body and the approval summary
5. Summary preamble per § User-gate summary preamble
6. Guidance line per § Step 4 guidance lines
7. A one-line pointer to the plan document at `.claude/plans/<slug>.md`, then wait for the user's chat reply

The user may approve, reject, or request refinement — through the visual gate's browser submit, or through the chat reply on this surface. If the user requests changes, the plan re-enters that same surface without repeating the full presentation sequence.

**Candidate-list implementation boundary**: when the plan lists multiple candidate items (a roadmap, a staged rollout, or a set of options) but scopes only a subset for this run, include a one-sentence boundary statement in the full plan body before the guidance line: name which item(s) will be implemented this run and that the remaining candidates are deferred records only — no automatic execution queues them. Without this boundary statement, candidates listed but not scoped may be misread as implicitly queued for sequential auto-execution. Example: `This run implements [X]; [Y] and [Z] are recorded as future candidates and will not be executed automatically.`
