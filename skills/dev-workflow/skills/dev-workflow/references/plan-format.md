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

### Overview
- **Goal**: 1 sentence — what the user gets
- **Difficulty**: Simple | Moderate | Complex (must match the Step 2 difficulty assessment)
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

### Sizing guidance

- Overview: at most 5 bullets, each at most one line. Overlong Overviews defeat the "30-second scan" goal.
- Decisions: up to 5 items. A single genuine (a)+(b) item is fine — surface it alone rather than padding.
- Design / Test plan: no fixed cap, but avoid narrating what well-named files/functions already convey.

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

## Localization granularity

Applies to all user-facing prose produced by this skill — plan body content, user-gate preambles, violation/finding lists, Completion summary, and Step 9.5 `Description` / `Suggested fix direction` paragraphs. The resolved `language` (see `SKILL.md` § Configuration) controls the output language.

**Two-way rule:**

- **Translate**: generic technical concepts that have natural equivalents in the target language. The output must read naturally to a native speaker of the resolved language. Examples: primary source → 一次情報源 (`ja`), self-audit → 自己監査 (`ja`), blast radius → 影響範囲 (`ja`), edge case → 境界ケース (`ja`).
- **Preserve verbatim**: file-internal identifiers — function names, config key names (`check_commands`, `review_iterations`), section anchors (`Step 7.5`), stable cross-reference labels (`§ No-Stall Principle`), file paths (`references/plan-format.md`), skill names (`Skill(verify-diff)`), and section headings (`Overview` / `Decisions` / `Design` / `Test plan` / `Risks` / `Unknowns`).

**First-use pairing**: on the first occurrence of a translated concept within a given output block (preamble, expanded section, completion summary), pair the localized phrasing with the original technical term in parentheses (e.g. `一次情報源（primary source）` for `language: ja`). Subsequent occurrences within the same block use the localized form alone. This convention is consistent with § User-gate summary preamble's jargon pairing rule, which is a preamble-specific specialization of this broader principle — § User-gate summary preamble adds format constraints specific to preamble bullets (e.g. pairing with an identifying handle when the localized and original terms coincide under `language: en`).

**Paired bilingual samples** (runtime rendering demonstration, not meta-prose):

- `language: ja`: `一次情報源（primary source）の確認を経てプランを策定済み`
- `language: en`: `Plan drafted after verifying the primary source`
- `language: ja`: `影響範囲（blast radius）: SKILL.md の 3 セクション + references/plan-format.md`
- `language: en`: `Blast radius: 3 sections of SKILL.md + references/plan-format.md`

## User-gate summary preamble

Each user-judgment gate that presents structured content (a plan body, a remaining-violations list, an unresolved-findings list) emits a short summary preamble. For Step 7.5 and Step 8, it appears at the top of the user-facing output, above the structured content. For Step 4, it appears after the plan body per § Step 4 presentation order (the plan body is rendered first in natural reading order; the preamble follows the `---` separator). In all cases the preamble is above the guidance line. The preamble names the *shape* of the situation (count, categories, what the gate is asking); it does not paraphrase, summarize, or re-list the structured content.

**Applies to:**

- Step 4 plan approval
- Step 7.5 persistent-violations decision
- Step 8 unresolved-findings decision

The other user-gates listed in `SKILL.md` § No-Stall Principle (Step 1.5 dialogues, Step 7 scope-drift stop, Completion subtask PR URL prompt) do not emit a preamble — their structured content is either a single short prompt or already self-explanatory, and a 3–5 item summary above them would be padding noise.

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

Each gate's Optional slot conditions are independent — do not import Step 8's `non-uniform reasons` constraint into Step 7.5 (Step 7.5's Optional triggers on `auto-fix attempted and recorded` regardless of uniformity), or vice versa.

**Omission condition:**

When the structured content has only one item (a single remaining violation in Step 7.5, or a single unresolved finding in Step 8), the preamble SHOULD be omitted — a 3–5 item preamble above a single concrete item is padding noise that duplicates what the item itself states. The Step 4 preamble always has ≥ 3 items by construction, so this omission does not apply to Step 4. Do not announce the omission in the user-facing output (e.g. an "preamble omitted because only one item" line) — the announcement itself is padding noise; present the single concrete item directly.

## Step 4 presentation order

Step 4 presents the full plan body in natural reading order (Overview → Decisions → Design → Test plan → Risks/Unknowns), followed by an approval summary at the bottom where the chat viewport naturally lands. Step 7.5 and Step 8 do **not** use this protocol — they present preamble + content directly.

**Output sequence (Step 4 only):**

1. `## Plan` header as a visual boundary separating the plan from prior conversation
2. Full plan body in template order — `Overview`, `Decisions`, `Design`, `Test plan`, `Risks / Unknowns` (if present) — rendered in full, following § Localization granularity. Section headings render at `###` level (one below the `## Plan` container); sub-sections (Title, Goal, Scope, Decision N, Implementation, etc.) at `####`
3. Horizontal rule (`---`) as a visual separator between the plan body and the approval summary
4. Summary preamble per § User-gate summary preamble
5. Guidance line per § Step 4 guidance lines
6. **`ExitPlanMode` must be called in the same turn** — do not output additional text or wait for user input between the guidance line and the `ExitPlanMode` call. `ExitPlanMode` triggers the approval modal; delaying it to a subsequent turn causes the workflow to appear stalled with no visible approval mechanism

The user may approve, reject, or request refinement via the approval modal. If the user requests changes, the plan re-enters Plan Mode interaction without repeating the full presentation sequence.
