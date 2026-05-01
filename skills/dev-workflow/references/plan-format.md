# Plan Format

Specification for how plans are structured, self-checked, reviewed, and presented in `/dev-workflow`.

Read this reference when executing any of the following:

- **Step 2** — creating the plan (§ Template, § Step 2 self-check)
- **Step 3** — peer plan review (§ Step 3 (f) content-quality rubric)
- **Step 4** — presenting the plan to the user (§ Step 4 guidance lines)

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

- [ ] Every Decisions item passes the (a)+(b) criterion — if in doubt, drop it to Design.
- [ ] No choice that qualifies under (a)+(b) is buried inside Design instead of surfaced in Decisions.
- [ ] If executing a subtask (state file active): Decisions does not re-surface subtask-boundary questions.
- [ ] No section appears outside the enumerated template (Overview, Decisions, Design, Test plan, optionally Risks / Unknowns) — added "meta" sections such as introductions, methodology notes, or recap blocks belong inside Design or should be dropped entirely.

This is the **author's first-pass judgment** on plan content; Step 3 category (f) re-checks the same material externally. The template's required-headings list defines the closed set of sections; adherence to it is the only structural property checked here, captured by the final bullet above.

## Step 3 (f) content-quality rubric

Step 3 adds a sixth review category — **f. Presentation & attention allocation (content quality)** — on top of the five categories (a–e) already in `SKILL.md`. Format compliance is already enforced by the Step 2 self-check, so (f) focuses on content.

Reviewer checks:

- **(a)+(b) criterion, external verification** — does every Decisions item genuinely pass both? Flag items that look like style-level preferences smuggled in.
- **Buried-decisions check** — does the Design body contain a judgment call that should have been surfaced in Decisions? (Inverse of the criterion — look for hidden choices, not just wrong ones.)
- **Cross-section consistency** — e.g. does every file listed in Overview's Scope appear in Design? Does every test file promised in Test plan correspond to Design content? Do the choices made in Decisions actually drive the Design?
- **Cross-file consistency (multi-file plans)** — when the plan edits more than one file (multiple modules, parallel components, multiple docs — for skill development this includes multiple `SKILL.md` or `references/*.md` files), check that (i) parallel concepts use consistent names / headings / labels across files, (ii) cross-references between the edited files use consistent phrasing, and (iii) the same note or rationale isn't duplicated or paraphrased redundantly across files. Skip this bullet for single-file plans.

Reviewer does not re-check structural compliance (section presence, bullet count, etc.) — that is Step 2's responsibility.

## Step 4 guidance lines

In Step 4, present the plan with one of these literal English guidance lines placed at the very top, above the plan body. The template depends on (i) whether Decisions has qualifying items and (ii) whether a state file is active.

Rendering conventions for the variants below:

- The leading `>` is Markdown blockquote rendering for visual separation in this spec, not part of the literal text.
- When extracting, strip the blockquote prefix (`>` plus one separator space).
- Rendering it as a plain paragraph or as a blockquote in the output is a presentation choice and does not affect "verbatim" compliance.

**Decisions has one or more qualifying items (Normal or Resume):**

> Please focus on the **Decisions** section below — these are the points where your judgment is actually needed. The rest has been reviewed in Step 3; skim only if something looks off.

**Decisions is empty, Normal mode:**

> No user decisions required — approve if the overall approach looks reasonable. The plan has already been reviewed in Step 3 for correctness and convention compliance.

**Decisions is empty, Resume mode (subtask execution):**

> No user decisions required (subtask scoped — boundaries approved in prior Step 1.5). Approve if the detailed design within this subtask looks reasonable.

Pick exactly one variant and use its literal text verbatim — do not concatenate variants, do not reword the sentence content.
