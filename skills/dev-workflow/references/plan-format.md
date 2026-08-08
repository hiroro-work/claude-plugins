# Plan Format — review, localization, and presentation

How a finished plan is reviewed, localized, and presented. The companion file [`plan-authoring.md`](plan-authoring.md) covers the other half — § Template, § Sizing guidance, § Traceability, the Decisions criterion, § Step 2 self-check, and the Step 3 (d) rubric that re-checks them — and the two together are the specification for `/dev-workflow` plans. Unlike that file, this one is read on **every** lane, which is what decides the split: everything a plan-approval surface needs lives here, everything only an author or a reviewer needs lives there.

Read this reference when executing any of the following:

- **Step 2 / Step 4** — rendering Decisions when no item qualifies (§ Empty-Decisions fixed sentences)
- **Step 4** — presenting the plan to the user (§ Step 4 guidance lines, § Step 4 presentation order)
- **Any user-facing prose output** — the summary preamble a structured-content gate emits (§ User-gate summary preamble). The localization boundary itself lives in [`localization.md`](localization.md), read on its own

## Empty-Decisions fixed sentences

When no items qualify under the (a)+(b) criterion, render Decisions with one of these fixed sentences — "no decisions" must be an explicit signal, not a missing section.

**Blockquote rendering convention** (defined once here; § Step 4 guidance lines below reuses it):

- The leading `>` is Markdown blockquote rendering for visual separation in this spec, not part of the literal text.
- When extracting, strip the blockquote prefix (`>` plus one separator space).
- Rendering it as a plain paragraph or as a blockquote in the output is a presentation choice and does not affect "verbatim" compliance.

Additional rule specific to Decisions: place the extracted sentence alone — no preceding explanation, no trailing elaboration, no padded items alongside.

**Normal mode (no state file):**

> No user decisions required — approve if the approach looks reasonable.

**Resume mode (executing a subtask from a decomposition state file):**

> No user decisions required (subtask scoped — boundaries approved in prior Step 1.5 (Task Decomposition)).

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
- **an assessed tier of Trivial** — use `Step 3 (Plan Review) was skipped because this task was assessed Trivial — this approval is the sole review.` Key this on the **assessed tier**, never on `code_review_enabled` being `false`: a configured `code_review: false` also produces that without the tier being Trivial, so a flag-based test would assert Trivial of a task that was never assessed so (the same discriminator `references/step4-finalize-plan.md` § Sub-step 3's express-lane re-activation keys on, for the same reason).
- **`--fast` forced the plan phase off on a non-Trivial tier** — use `Step 3 (Plan Review) was skipped because fast mode skips Plan Review for this run — this approval is the sole review.` instead, since the task was not assessed Trivial and saying so would contradict the difficulty log line (`references/tier-assessment.md` § Difficulty log line), which names the real tier.

Applying whichever sentence the list above selected (all three cases alike): for a preamble variant that **contains** a "The plan has been reviewed in Step 3 ..." sentence, **replace** that sentence with it; for a variant that **contains no** such sentence (the Resume-mode empty-Decisions variant), **append** it. The lead clause of each variant ("Decisions has items requiring your judgment ..." / "No user decisions required ...") is unchanged in both cases — only the review-status sentence is substituted or appended.

## Localization granularity

The rule body lives in [`localization.md`](localization.md) — `Read` it whenever this skill produces user-facing prose. `Source of truth: localization.md; this heading stays as the stable anchor for bare § Localization granularity references.`

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

- **Plan document** (`.claude/plans/<slug>.md`, written by Step 4 sub-step 2 before either surface runs) = the **full** plan body: the `> Review guide` line (omitted on the express lane, whose compact plan is short enough to read whole — `references/step2-create-plan.md` § Compact plan template) + Overview → Decisions → Build order → Test plan → Risks/Unknowns, in template order.
- **Chat presentation** = a **condensed** view (the must-review tier, with `Build order` cut to its step headings), closed by a pointer to the plan document — so nothing the condensed view omits is unreachable.

**Chat output sequence (Step 4 only):**

1. `## Plan` header as a visual boundary separating the plan from prior conversation
2. The `> Review guide` line per [`plan-authoring.md`](plan-authoring.md) § Review guide line — **omitted on the express lane**, which authors no such line (see the Plan-document bullet above); renumbering nothing, the sequence simply continues at item 3
3. Condensed plan body, following [`localization.md`](localization.md) § Localization granularity — heading levels: `###` for sections (one below the `## Plan` container), `####` for sub-sections:
   - `Overview` in full (including `Highlights` when present) — it is already short
   - `Decisions` in full — these need the user's judgment
   - `Build order` as its **step headings only**: the numbered list with each step's bold heading and not the per-step detail (that lives in the plan document). Chat has no collapse affordance, so the headings are its counterpart to the visual gate's per-step collapse ([`plan-authoring.md`](plan-authoring.md) § Review guide line's **Must-review low-load rule** paragraph)
   - `Test plan` and `Risks / Unknowns` as **their heading plus a one-line gist each** — enough to see what each covers without reproducing it; the detail stays in the plan document, and the essentials also surface via the preamble's `verification approach` and `known risks` slots
4. Horizontal rule (`---`) as a visual separator between the condensed body and the approval summary
5. Summary preamble per § User-gate summary preamble
6. Guidance line per § Step 4 guidance lines
7. A one-line pointer to the plan document at `.claude/plans/<slug>.md`, then wait for the user's chat reply

The user may approve, reject, or request refinement — through the visual gate's browser submit, or through the chat reply on this surface. If the user requests changes, the plan re-enters that same surface without repeating the full presentation sequence.

**Candidate-list implementation boundary**: when the plan lists multiple candidate items (a roadmap, a staged rollout, or a set of options) but scopes only a subset for this run, include a one-sentence boundary statement in the full plan body before the guidance line: name which item(s) will be implemented this run and that the remaining candidates are deferred records only — no automatic execution queues them. Without this boundary statement, candidates listed but not scoped may be misread as implicitly queued for sequential auto-execution. Example: `This run implements [X]; [Y] and [Z] are recorded as future candidates and will not be executed automatically.`
