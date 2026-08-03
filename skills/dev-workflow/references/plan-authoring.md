# Plan Authoring

How a Step 2 plan is shaped and self-checked. The companion file [`plan-format.md`](plan-format.md) covers the other half — how a finished plan is reviewed, localized, and presented — and the two together are the specification for `/dev-workflow` plans.

Read this reference when executing:

- **Step 2** — creating the plan (§ Template) and running the author's own checklist (§ Step 2 self-check)

**Full lane only.** The express lane (Trivial / Simple — [`tier-assessment.md`](tier-assessment.md) § Lanes) authors from `references/step2-create-plan.md` § Compact plan template instead and never reads this file; a tier escalation out of that lane reads it as part of rejoining the full lane (§ Escalation).

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
- **Difficulty**: Trivial | Simple | Moderate | Complex (must match the tier Step 1.5 resolved, as any escalation has since revised it)
- **Scope**: N files — primary files to touch
- **Approach**: 1–2 sentences — the chosen strategy

### Decisions
<1–5 items that require user judgment, OR one of the fixed sentences from [`plan-format.md`](plan-format.md) § Empty-Decisions fixed sentences when no items qualify>

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

The `> Review guide` block sits directly under `## Plan`, above Overview, so a reviewer can tell at a glance which sections need judgment and which are reference detail. It renders as a multi-line blockquote — a heading line followed by one bullet per category. Unlike [`plan-format.md`](plan-format.md) § Empty-Decisions fixed sentences and its § Step 4 guidance lines (single sentences using the same **Blockquote rendering convention**), this block's `>`-prefixed bullets **are** the rendered output — don't extend those other two sections to this multi-line form:

- **Must-review** = the sections that need the user's judgment: `Overview` (Goal / Approach / Scope / Difficulty, plus `Highlights` when present), `Decisions`, and `Build order`. `Highlights` is one Overview bullet, not a standalone must-review category — Overview always carries it. Rendering `Overview` in the must-review tier matches § Step 4 presentation order (which already shows Overview in full) and gives empty-`Decisions` plans a substantive review anchor (Goal / Approach). `Build order` is must-review because it is the sequence the work will actually land in — Step 5 executes it step by step — so approving the plan approves that sequence.
- **Reference** = supporting detail the user can skim: `Test plan`, `Risks` (omit any that are absent).
- Localization ([`plan-format.md`](plan-format.md) § Localization granularity): the connective words (`Review guide`, `must-review`, `reference`) are translated to the resolved `language`; the section-name tokens (`Overview` / `Highlights` / `Decisions` / `Build order` / `Test plan` / `Risks`) stay verbatim — they are file-internal identifiers, and translating them would break the Step 2 self-check / Step 3 (f) heading exact-match.

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
- **Empty-Decisions degradation**: when Decisions renders an empty-Decisions fixed sentence ([`plan-format.md`](plan-format.md) § Empty-Decisions fixed sentences), `Build order → Decision` is naturally absent (it is optional and has no target item); `Test → Build order step` still applies unchanged.
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

## Subtask / Resume handling

When Step 2 runs inside a decomposed subtask (a state file from Step 1.5 is active), the subtask's **boundaries, order, and purpose were already user-approved** in the parent run's Step 1.5. Do not re-surface them in Decisions.

Restrict Decisions to **judgment calls that arise inside the current subtask**. Examples:

- Subtask A is "add authentication middleware" → choosing the token-verification scheme (JWT vs. session) is in scope.
- Subtask B is "introduce chart rendering" → choosing the charting library (Chart.js vs. Recharts) is in scope.

If the current subtask has no in-scope decisions, use the Resume-mode fixed sentence in [`plan-format.md`](plan-format.md) § Empty-Decisions fixed sentences.

## Step 2 self-check

After the Simplicity self-audit in Step 2, run this check on the plan. Fix any failures before Step 3.

**Run this check in the order listed — structural compliance first, then content quality.** If the plan was seeded from a carry-over document (an inherited spec, a prior-session draft, or a hand-off note), verify structure before content: carry-over documents use free-form prose that does not match the template, and transplanting their content without first establishing the template skeleton is the most common source of non-compliant plans. Create the template skeleton first, then embed the carry-over content.

- [ ] **Structural compliance**: the plan contains exactly the required sections (`Overview`, `Decisions`, `Build order`, `Test plan`) in that order, with correct heading levels (`###` for top-level sections, `####` for sub-sections), and no sections outside the enumerated template (Overview, Decisions, Build order, Test plan, optionally Risks / Unknowns). If this check fails, stop here and restructure before running the remaining content checks.
- [ ] Every Decisions item passes the (a)+(b) criterion — if in doubt, drop it to Build order.
- [ ] **When Decisions renders an empty-Decisions fixed sentence** ([`plan-format.md`](plan-format.md) § Empty-Decisions fixed sentences): scan Build order and Approach for any passage that answers a "why X over Y" question or introduces a fixed value, threshold, or boundary — these are (a)+(b) candidates that may have been overlooked when the author pre-judged the task as decision-free. If any surface, promote to Decisions before advancing to Step 3. Declaring "no decisions" does not discharge the buried-decisions check; it makes it more important to run.
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
