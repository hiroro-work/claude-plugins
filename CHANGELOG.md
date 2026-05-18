# Changelog

## 2026-05-18

### dev-workflow v1.36.1 / dev-workflow-bundle v1.36.1

- fix(dev-workflow): add Upstream-handoff agreement override audit to Step 2 Simplicity self-audit (auto-triage #27)
  - Category: missing-branch; Step 2 § Simplicity self-audit had no branch to surface plan-vs-prior-session-agreed-upstream-document overrides as Decisions items, so reviewer-driven overrides reached Step 4 user gate without explicit user-decision opportunity. New bullet enumerates the diff in Decisions with uphold/overwrite Recommendation/Alternative and an explicit override marker.
- fix(dev-workflow): add Temporary-workaround minimal coupling audit to Step 2 Simplicity self-audit (auto-triage #27)
  - Category: wrong-default; Step 2 § Simplicity self-audit had no audit item for declared-temporary plan elements, so initial drafts defaulted to permanent-element-depth integration and triggered user pushback. New bullet sets minimal coupling as first-class Recommendation, deep integration as Alternative with explicit removal-cost rationale, and requires Removability as a Risks evaluation axis.
- fix(dev-workflow): add Pre-existing vs regression discrimination to Step 7 test_commands loop (auto-triage #27)
  - Category: missing-branch; Step 7 retry path had no formal sub-step to discriminate test-skill TEST_FAILED reports as regression vs pre-existing. New sub-bullet names the two paths (trust test-skill's own classification if present; otherwise re-run at base-commit), defines the informational disposition for pre-existing failures (not counted toward retry budget, not auto-fixed), and recommends the regression-vs-pre-existing return contract as a verification-class skill convention.
- fix(dev-workflow): add Late-stage scaffolding self-audit to Step 5 Implement (auto-triage #27)
  - Category: ambiguity; Step 5 had no explicit guidance to re-apply Step 2 § Simplicity self-audit rigor to structural elements newly added during implementation. Late-stage scaffolding correctness gaps surfaced first at Step 8 iter 1. New item 3 names 4 audit legs (sibling symmetry, error-path symmetry, boundary-value coverage, reference-site sweep) for newly introduced elements.
- fix(dev-workflow): add Cross-file closed-list extension audit to Step 3 (a) (auto-triage #26)
  - Category: missing-branch; Step 3 (a) review had no explicit sub-check for closed lists mirrored across SKILL.md + references/*.md sibling files. Mirror copies drifted past Step 3 review. New sub-check requires Test plan to enumerate every reference site as a sweep target.
- fix(dev-workflow): add State-variable lifecycle completeness to Step 3 (c) Completeness (auto-triage #26)
  - Category: missing-branch; Step 3 (c) had no explicit sub-check requiring Design to symmetrically specify init / advance / non-advance / reference-sites for new state variables. Counter increment semantics surfaced only at Step 8 iter 2 as Major findings. New sub-check enumerates the 4 lifecycle points with symmetric success/failure path specification as the general principle.
- fix(dev-workflow): add Internal convention citation verification to Step 3 (a) (auto-triage #26)
  - Category: wrong-default; Step 3 (a) Premise challenge required verification only for external requirements / known bugs / project rules — internal-convention citations could pass through without primary-source verification. New sub-check requires reviewer to verify via grep/Read; if not found, treat as new convention requiring full justification.
- fix(dev-workflow): add Internal cross-reference stability to Step 3 (a) (auto-triage #26)
  - Category: ambiguity; Step 3 (a) did not actively check for raw sub-step number references in cross-ref prose. Rules-compliance violation surfaced only at Step 7.5. New sub-check requires references to use stable phrase anchors (section headings, bold-prose labels, quoted phrases) — refactor-resilient anchoring as general principle.
- fix(dev-workflow): add CHANGELOG signal placement check to Step 3 (c) (auto-triage #26)
  - Category: missing-branch; Step 3 had no self-audit for CHANGELOG signal placement when plan flips a distributed default. Behavior-change signals could end up buried in late bullets. New sub-check verifies first-line visibility, opt-out colocation, and bump-strength alignment on three axes.
- fix(dev-workflow): add External CLI behavior verification to Step 3 (a) (auto-triage #26)
  - Category: missing-branch; Shell content portability check covered shell-level concerns but not CLI sub-command semantics (git diff omits untracked, porcelain C-quoting, amend pre-staging, gh list truncation). New sub-check extends External library primary-source verification (category (e)) to CLI/shell domain. Unverified items lift to Risks as stale-CLI-assumption.
- fix(dev-workflow): add Closed-list reference sweep to Step 3 (c) (auto-triage #26)
  - Category: ambiguity; Closed-list modifications (enum / branch set / gate count / status token) needed an explicit sweep across reference sites (count claims, sibling enum fields, disposition mapping tables, render rules). New sub-check requires class-level extension audit across all reference sites; canonical change is necessary but not sufficient.

### dev-workflow v1.36.0 / dev-workflow-bundle v1.36.0

- feat(dev-workflow): relax `test_commands` from fixed `["Skill(run-tests)"]` to a list-replace key (default unchanged; higher-priority config layer's list replaces lower as a whole — no item-level merge or dedup). Project config can append additional structural-check skills. Step 7 iterates the list in order; any TEST_FAILED / EXECUTION_ERROR halts the loop immediately.

## 2026-05-17

### dev-workflow v1.35.0 / dev-workflow-bundle v1.35.0

- feat(dev-workflow): introduce Step 10 Interactive Commits and reorder post-Step-8 phases. **Default: enabled** — set `interactive_commits: false` in `.claude/dev-workflow.md` or `~/.claude/dev-workflow.local.md` to opt out. The new step runs after `hooks.on_complete` and proposes commit groupings + messages for user approval, then iterates per-commit. `extract-rules` and `self-retrospective` now run after the commit phase. If your downstream automation relies on `/dev-workflow` ending with an uncommitted tree (e.g. an external CI that commits and pushes for you), set `interactive_commits: false`.
- feat(dev-workflow): `hooks.on_complete` now executes as Step 9 (before extract-rules), shifted from its former post-Update-Rules timing. Hook entries that assumed rules had already been updated at hook-run time may need to be revisited.
- feat(dev-workflow): renumber post-Step-8 phases to monotonic execution order — old `Step 9` (Update Rules) → `Step 11`, old `Step 9.5` (Self-Retrospective) → `Step 11.5`, old `Step 10` (Completion Hooks) → `Step 9`. All cross-references in SKILL.md and `references/self-retrospective.md` updated.

## 2026-05-15

### dev-workflow v1.34.19 / dev-workflow-bundle v1.34.19

- fix(dev-workflow): add harmless-class bypass to Step 7 scope-drift guard (auto-triage #25)
  - Category: missing-branch; Scope-drift guard blocked on all out-of-scope changes without classifying whether they were harmless (whitespace/comment-only, ≤5 lines, formatter-attributable). Added 3-condition bypass so trivial formatting drift proceeds automatically with a one-line note.
- fix(dev-workflow): pass subtask scope boundaries to Step 3 / Step 8 reviewer (auto-triage #25)
  - Category: missing-branch; When a state file was active, plan reviewer and code reviewer were not informed of the current subtask's scope or what other subtasks covered, causing false-positive findings about missing out-of-scope functionality. Added subtask scope instruction to both reviewer dispatch steps.
- fix(dev-workflow): add TDD-conflict resolution for characterization test subtasks (auto-triage #25)
  - Category: missing-branch; When custom_instructions included a TDD-style requirement, subtasks adding characterization/coverage tests for existing behavior triggered a TDD-loop conflict. Added keyword-based detection and explicit TDD-loop-external declaration to Step 2 plan creation.
- fix(dev-workflow): add e2e coverage check to Step 3 Plan Review category (c) (auto-triage #25)
  - Category: missing-branch; Plan Review completeness check lacked an e2e/integration coverage verification item. Changes affecting user-visible interactions or role-based authorization flows could pass review without an e2e test plan.
- fix(dev-workflow): add no-summary-turn constraint at review-return boundaries (auto-triage #24)
  - Category: missing-branch; No-Stall Principle did not explicitly prohibit summary-only turns when a reviewer or sub-skill returned a semantically-empty result. Added paragraph banning verdict lists, conclusion paragraphs, and "shall I proceed?" sentences at review-return transition boundaries.
- fix(dev-workflow): add structural compliance as first Step 2 self-check item (auto-triage #24)
  - Category: missing-branch; Structural compliance (required sections, heading levels, no extra sections) was not the first self-check item and lacked a "stop here and restructure" gate. Also added template-skeleton-first guidance for plans seeded from carry-over documents.
- fix(dev-workflow): add planning-draft recovery branch to Resume sub-mode schema validation (auto-triage #23)
  - Category: missing-branch; --resume with a file lacking YAML frontmatter or missing required keys would fatal-stop instead of treating the file as an inherited planning draft. Added step 3a planning-draft recovery that continues to Normal sub-mode with the document as background context.

### peer v2.2.5

- fix(ask-peer): respect explicit scope boundaries in subtask review (auto-triage #23)
  - Category: missing-branch; Peer reviewer had no instruction to honor explicit in-scope boundaries from consultation requests, causing out-of-scope subtask functionality to be reported as Critical/Major findings. Added Scope boundary discipline to the Peer Agent Personality.

### rules-review v1.1.3

- fix(rules-review): add rule-doc-drift classification for stale rule documents (auto-triage #23)
  - Category: missing-branch; When code followed a consistent pattern across 3+ diff locations but the rule document described different behavior, the reviewer classified it as a code violation rather than a rule-doc-drift finding. Added classification field and route-to-extract-rules recommendation for the drift case.

## 2026-05-14

### dev-workflow v1.34.18 / dev-workflow-bundle v1.34.18

- fix(dev-workflow): add prerequisites fallback branch to Step 7.5 (auto-triage #22)
  - Category: missing-branch; Step 7.5 lacked a defined fallback branch when `check_commands` is undefined or empty, leaving executor behavior unspecified. Added explicit continuation flow so the skill proceeds deterministically when no check commands are configured.
- fix(dev-workflow): clarify bulk-vs-split execution strategy default in Step 7.5 (auto-triage #22)
  - Category: wrong-default; Step 7.5 execution strategy defaulted to bulk-run without documenting the rationale or the conditions under which split execution is appropriate. Added bulk-first default with split-on-error fallback and explicit criteria for when split-first is the better choice.
- fix(dev-workflow): add progress visibility instructions to Step 7.5 (auto-triage #22)
  - Category: ambiguity; Step 7.5 provided no guidance on what to output during command execution, leaving executor choice between silent execution and verbose logging undefined. Added explicit progress display instructions covering command number, result, and error details.
- fix(dev-workflow): add Cross-component sibling coverage check to Step 3 Plan Review (auto-triage #22)
  - Category: missing-branch; Step 3 scope & feasibility category lacked a sub-check for structural patterns shared across sibling components, leaving reviewers without guidance to flag plans that fix one component while leaving affected siblings unchanged. Added Cross-component sibling coverage sub-check with three directions: structural-fix propagation, new-component alignment, and intra-patch uniformity.

### peer v2.2.4 / dev-workflow-bundle v1.34.18

- fix(ask-peer): add error handling section for subagent dispatch failures (auto-triage #22)
  - Category: missing-branch; ask-peer had no defined behavior when subagent dispatch fails due to transient errors (HTTP 5xx, timeout, or empty response). Added `## Error Handling` section specifying retry-once policy, failure surfacing to the caller, and prohibition on autonomous skill rerouting.

## 2026-05-12

### dev-workflow v1.34.17 / dev-workflow-bundle v1.34.17

- fix(dev-workflow): add prose-language self-audit step in Step 4 before ExitPlanMode (auto-triage #21)
  - Category: missing-branch; Step 4 lacked an explicit self-audit step to verify that prose output language conforms to the resolved `language` setting before calling `ExitPlanMode`. Added the self-audit requirement so the plan author catches language mismatches before the approval gate.
- fix(dev-workflow): record class-level sweep outcome in next-iteration summary (auto-triage #21)
  - Category: missing-branch; The next-iteration summary in Step 8 Code Review did not record the outcome of the class-level sweep, leaving the reviewer unable to distinguish "sweep ran and found nothing" from "sweep was skipped". Added explicit recording of class-level sweep result so subsequent iters have an auditable trace.
- fix(dev-workflow): Add user-visible diagnostic when Plan Review incomplete (auto-triage #21)
  - Category: missing-branch; When Plan Review (Step 3) ended without all findings resolved, no user-visible diagnostic was emitted — the workflow could silently advance with unresolved findings. Added a diagnostic summary when the Plan Review exits with outstanding items.
- fix(dev-workflow): Add Premise challenge clause to Step 3 (a) Scope & feasibility (auto-triage #20)
  - Category: missing-branch; Step 3 reviewer category (a) Scope & feasibility lacked a lens for challenging unsupported constraints, scope boundaries, and strictness levels in the Recommendation. Any constraint whose origin cannot be identified in an external requirement, known bug, or existing project rule must now be surfaced as a finding with at least one relaxed or eliminated alternative, so the plan author can populate the relevant Decisions `Alternative` field.
- fix(dev-workflow): Add Collection-predicate boundary cases to Step 3 (c) Completeness (auto-triage #20)
  - Category: missing-branch; Step 3 reviewer category (c) Completeness had no guidance for checking all/every and any/some predicates over per-element classification results. Vacuous-truth gaps (empty set, all-same-classification, mixed-classification) silently passed plan review. Added Collection-predicate boundary cases check requiring reviewers to trace predicates through all three boundary scenarios.
- fix(dev-workflow): Add context-compaction recovery step to Step 1 (auto-triage #19)
  - Category: missing-branch; When session context is compacted before Step 1 runs in the current turn, skip-condition judgments (e.g. whether `self_retrospective.feedback` is set, whether `hooks.on_complete` is configured) relied on stale cached values from the compaction summary rather than the actual merged config. Added item 8 instructing re-read of all configuration files from disk after context compaction to ensure skip conditions are evaluated against the actual config state.

### extract-rules v1.13.3 / dev-workflow-bundle v1.34.17

- fix(extract-rules): Add item 4 to Step C4 to skip routine pattern re-application (auto-triage #19)
  - Category: missing-branch; Step C4 lacked guidance to distinguish user-directed design decisions from mechanical code following (symmetric duplication, template expansion, mechanical extension of an existing structure). Subagents were over-extracting patterns added without user guidance or correction. Added item 4 instructing the subagent to skip routine re-application and extract only when a new design decision was made, an exceptional case was handled, or the user explicitly corrected or redirected the approach.

## 2026-05-09

### dev-workflow v1.34.16 / dev-workflow-bundle v1.34.16

- fix(dev-workflow): semantic judgment of reviewer return at Step 3 / Step 8 (auto-triage #16 followup)
  - Category: ambiguity; Step 3 / Step 8 reviewer-return handlers used exact-string matching (`"No actionable findings"`), which stalled the orchestrator when `Skill(ask-peer)` or other free-form-prose reviewers returned natural-language Markdown verdicts that did not contain that exact phrase. Replaced with semantic judgment matching Step 7.5's existing pattern (trust the orchestrator's natural-language interpretation, do not rely on exact-phrase matching since reviewer phrasing varies). Caller-side fix for the original auto-triage #16 F5 stall problem; the earlier callee-side fix (ask-peer return contract) was reverted because forcing a review-specific JSON schema onto a general-purpose consultation skill was the wrong layer of abstraction.

### dev-workflow v1.34.15 / dev-workflow-bundle v1.34.15

- fix(dev-workflow): add result-recovery branch to Step 6 for unobservable Simplify output (auto-triage #17)
  - Category: ambiguity; Step 6 lacked a recovery branch when context compaction occurred during/after `Skill(simplify)`, making the result unobservable. Added bullet 3 instructing inspection of `git diff <base-commit>`: if changes attributable to a simplification pass are visible, treat simplify as completed and proceed; otherwise re-execute `Skill(simplify)` once (inspection-and-fix-class skills are idempotent) before Step 7.
- fix(dev-workflow): extend class-level extension audit to Critical/Major-severity findings (auto-triage #16)
  - Category: missing-branch; Step 8 class-level extension audit only triggered after Critical-severity fixes, so Major-severity findings whose fix addresses a structural pattern (e.g. negation-style branch description) escaped class-level scan and re-surfaced in subsequent iters as the same defect at a sibling location. Extended the trigger to include Major-severity findings whose fix addresses a structural pattern (closed enums, shared safety-rail callers, parallel handlers, etc.) so iter-1 sibling instances are caught in the same iter as the named instance.
- fix(dev-workflow): extend Simplify-revival check to iter 1 when Step 6 ran (auto-triage #16)
  - Category: missing-branch; Simplify-revival check fired only at iter k≥2, but iter-1 fixes can already re-introduce narration / preamble / redundant prose that an earlier Step 6 Simplify pass deliberately removed (fix patches see only the line-level diff). Extended to iter k≥1 when Step 6 ran earlier in this session (iter k≥2 otherwise) so first-iter fixes are also audited against Simplify deletions.

### rules-review v1.1.2 / dev-workflow-bundle v1.34.15

- fix(rules-review): add cross-file scope expansion to reviewer prompt (auto-triage #15)
  - Category: wrong-default; Reviewer prompt's `**Scope**` statement implicitly framed checks as same-file, causing cross-file references / imports / shared-contract violations to be missed in cycle 1 and only caught in cycle 2 as low-confidence findings. Added an explicit cross-file scope clause: when a rule's text doesn't restrict to a single file (no "in this file" / "within this file" / equivalent limiting phrase), apply it across all changed files in the diff including cross-file references, imports, and shared contracts. Also added an explicit cycle 1 requirement — deferring cross-file rule application to a later cycle is a defect, not expected behavior.

### dev-workflow v1.34.14 / dev-workflow-bundle v1.34.14

- fix(dev-workflow): add empty-Decisions buried-decisions self-check gate (auto-triage #16)
  - Category: missing-branch; Step 2 self-check lacked an explicit branch for the case where Decisions renders a no-decisions fixed sentence, leaving buried (a)+(b)-criterion items in Design undetected before advancing to Step 3.

## 2026-05-08

### dev-workflow v1.34.13 / dev-workflow-bundle v1.34.13

- fix(dev-workflow): replace progressive disclosure with full-plan + approval-summary presentation order in Step 4
  - Category: wrong-default; Step 4 used a progressive disclosure protocol (section inventory with on-demand expansion) that relied on HTML `<details>` tags in the VSCode extension environment, where they rendered as plain text. Additionally, the `ExitPlanMode` call was not mandated in the same turn as the plan text output, causing the approval modal to not appear — making the workflow look stalled with no visible way to approve. Replaced `§ Progressive disclosure at user-gates` with `§ Step 4 presentation order`: plan body renders in full in natural reading order (Overview → Decisions → Design → Test plan → Risks), followed by a `---` separator and an approval summary (preamble + guidance line) at the bottom where the chat viewport lands. Added explicit mandate that `ExitPlanMode` must be called in the same turn as the plan output. Updated guidance lines to remove "expand" references, removed stale "section inventory" mentions from `§ Localization granularity` and the `language` config description, and updated `§ User-gate summary preamble` to describe per-gate preamble positioning.

## 2026-05-07

### dev-workflow v1.34.12 / dev-workflow-bundle v1.34.12

- feat(dev-workflow): add progressive disclosure protocol for Step 4 and localization granularity for all user-facing prose
  - Category: missing-branch; Step 4 plan approval presented the full plan body by default, requiring users to scan the entire content before forming a decision. Added `§ Progressive disclosure at user-gates` to `references/plan-format.md` defining a default output sequence (summary preamble → guidance line → section inventory) with on-demand section expansion for Step 4. Step 7.5 and Step 8 retain direct presentation (preamble + content) since violation/finding lists are typically short. Also added `§ Localization granularity` codifying the two-way translate/preserve-verbatim boundary for all user-facing prose with first-use pairing and paired bilingual samples. Updated Step 4.1 in `SKILL.md` to reference the new protocol, Step 7.5.d and Step 8.4 to reference § Localization granularity directly, and Completion to output in the resolved language. Expanded the `language` config bullet to cover preambles, section inventory, and Completion summary.

## 2026-05-06

### dev-workflow v1.34.11 / dev-workflow-bundle v1.34.11

- fix(dev-workflow): add shell content portability check to Step 3 Plan Review category (a) (auto-triage #14)
  - Category: missing-branch; Step 3 reviewer categories had no explicit lens for shell portability / quoting / expansion / shell-flavor differences on plans containing shell content, surfacing such issues only at iter 2. New clause in category (a) Scope & feasibility names quoting / expansion / special-character handling / shell-flavor differences with concrete examples (zsh `nomatch` on unquoted globs, bash vs. POSIX drift) so iter-1 reviewers have a checkable signal at plan time rather than at Step 7.
- fix(dev-workflow): add intra-patch self-duplication audit direction (iii) to Step 2 Cross-component pattern alignment (auto-triage #14)
  - Category: wrong-default; Step 2 Simplicity self-audit's Cross-component pattern alignment bullet covered (i) propagating a fix outward and (ii) aligning a new component inward but had no explicit lens for "this very change itself lands the same processing pattern at multiple call sites within one patch". Same-class defects within a patch slipped past Step 2 and surfaced only as Step 8 class-level extension findings. New (iii) Intra-patch self-duplication direction names shared validators / common error handling / mirrored formatting-serialization logic at multiple call sites within one change and links back to (i)'s blast-radius treatment, with skill-development examples (producer / consumer JSON parse pattern, return-contract across callees) in parentheses.
- fix(dev-workflow): add prose-integrity self-check to Step 8 per-iteration discipline (auto-triage #14)
  - Category: ambiguity; Step 8 per-iteration discipline only mandated mechanical re-runs (Step 7 / Step 7.5) after a fix; prose semantic breakage (mid-word sentence cuts, broken logical connectives, paragraph-logic breakage) introduced by line-level fix patches surfaced only at iter k+1 as Major findings, costing an extra iter. New Prose-integrity self-check (post-fix) bullet names the three failure modes with concrete connective examples (`however` / `therefore` / `because` / `but`) so iter-1 agents catch breakage before the next reviewer dispatch.

### dev-workflow v1.34.10 / dev-workflow-bundle v1.34.10

- feat(dev-workflow): emit Producer version line in self-retrospective issue body
  - Category: missing-branch; Retrospective issue bodies carried no record of which `dev-workflow` version produced them, leaving the triage routine unable to distinguish stale issues (already-fixed in a later release) from current ones. Added a `**Producer version:** dev-workflow v<X.Y.Z>` line directly under the body header in `references/self-retrospective.md` § 4 Assemble — resolved from `.claude-plugin/marketplace.json` via `jq` with a literal `unknown` fallback when the file or entry is missing. Consumer-side stale-issue handling (regex extract, version-aware reject path with `(i)` CHANGELOG entry + `(ii)` SKILL.md cite gates and either-leg doubt fall-through to standard checklist) lives in the project-local `dev-workflow-triage` skill, where it can evolve independently of the bundle.

## 2026-05-05

### dev-workflow v1.34.9 / dev-workflow-bundle v1.34.9

- fix(dev-workflow): add Step 3 Plan Review return-point no-stall reminder mirroring Step 8 (auto-triage #13)
  - Category: missing-branch; Step 3's iteration loop lacked the inline `Return-point no-stall reminder` bullet that Step 8 already carries, so the no-stall discipline only fired via the abstract `§ No-Stall Principle` section, not at the decision moment. Added a sibling-mirrored reminder that enumerates reviewer outcomes as a closed-list and names case-specific next actions, with stable cross-reference to `§ No-Stall Principle`.

### dev-workflow v1.34.8 / dev-workflow-bundle v1.34.8

- feat(dev-workflow): add user-gate summary preamble convention to Step 4 / Step 7.5 / Step 8
  - Category: ambiguity; The three user-judgment gates presented structured content without a TL;DR layer, leaving users to scan the full structured content before forming an overall picture. Added a `§ User-gate summary preamble` section to `references/plan-format.md` and one-line references from each of the three gate steps in `SKILL.md`.

## 2026-05-03

### dev-workflow v1.34.7 / dev-workflow-bundle v1.34.7

- fix(dev-workflow): add post-Critical-fix class-level extension audit to Step 8 iteration loop (auto-triage #12)
  - Category: ambiguity; Step 8 step 3 had no explicit instruction to scan the rest of the diff for instances of the same defect class after a Critical-severity fix, leaving fixes scoped to the single named instance even when the class spanned the diff. Added an inline self-audit bullet sequenced before the modified-vs-rejected branches, with same-defect-class characterization (same operation / broken assumption / side-effect pattern) and concrete examples in parentheses.
- fix(dev-workflow): augment plan-format Step 2 self-check with promotion cues for buried Decisions (auto-triage #12)
  - Category: wrong-default; The buried-decisions checkbox previously gave no concrete cue for spotting a Design-buried judgment, so author self-check rarely caught what Step 3 external review later flagged. Added a closed-list of three promotion cues (why-X-over-Y / fixed-value-or-timing rationale, new enum without per-member necessity, (a)+(b)-passing choice missing an Alternative line) that operationalize the (a)+(b) criterion at detection time.

## 2026-05-02

### dev-workflow v1.34.6 / dev-workflow-bundle v1.34.6

- fix(dev-workflow): cover new-component alignment direction in Step 2 Simplicity self-audit (auto-triage #11)
  - Category: missing-branch; The Step 2 Simplicity self-audit's `Cross-component structural-blast-radius` bullet only covered the "propagate fix outward" direction; the symmetric "align new component inward" branch was absent, surfacing late as Step 3 reviewer or Step 4 user pushback. Renamed to `Cross-component pattern alignment` and rewrote to audit both alignment directions explicitly, with skill-development examples kept in parentheses.
- fix(dev-workflow): add consistency-with-siblings rationale check to Step 2 Simplicity self-audit (auto-triage #11)
  - Category: wrong-default; Step 2 Simplicity self-audit had no branch for plan elements whose primary rationale is "align with existing sibling implementations / for consistency" alone, leaving lighter alternatives unsurfaced and divergence-cost notes implicit. Added a new bullet that triggers on this rationale, requires lighter alternatives in parallel in Decisions, and requires a one-line cost-of-divergence record when consistency is chosen.

## 2026-05-01

### dev-workflow v1.34.5 / dev-workflow-bundle v1.34.5

- fix(dev-workflow): add Distribution-aware fix direction guidance to retrospective producer §3 Sanitization to prevent skill-development vocabulary leak into bundle skills' SKILL.md prose (subtask 2 of meta-scope-leak)
  - Category: wrong-default; The producer's §3 "Keep as-is" line allowed `suggested fix directions expressed in skill-level vocabulary` by default. The triage applier transcribes those directions mostly verbatim into target SKILL.md prose, so skill-development vocabulary leaked into bundle skills' user-visible distribution surface. Added a `§ Distribution-aware fix direction (bundle skill targets)` sub-section requiring abstract-principle-first phrasing with skill-development examples in parens when the target is one of the bundle skills and the fix lands in SKILL.md / references prose. The corresponding source-of-truth rule was added to `.claude/rules/project.rules.md` § SKILL.md の配布性 with a Good/Bad example in `.claude/rules/project.rules.examples.md`.
- chore(release): synchronize dev-workflow and dev-workflow-bundle plugin versions to v1.34.5 (dev-workflow +2 jump from v1.34.3, dev-workflow-bundle +1 from v1.34.4 — pair-bump alignment)

### ask-peer v2.2.3 / dev-workflow-bundle v1.34.4

- fix(ask-peer): generalize peer reviewer "operational reality" prompt to remove skill-bundle internal vocabulary (subtask 1 of meta-scope-leak)
  - Category: wrong-default; The peer personality "Planning" focus area inherited `subagent dispatch and time budgets` / `sub-dispatches` from auto-triage #6, which defaulted to skill-bundle internal vocabulary instead of language-agnostic wording. These tokens confuse general-purpose project reviewers. Replaced with `compute and time budgets` / `operations`; the `N × M` sanity-check example survives.

## 2026-04-30

### ask-peer v2.2.2 / dev-workflow-bundle v1.34.3

- fix(ask-peer): add numerical self-consistency and operational-reality observations to plan review (auto-triage #6)
  - Category: missing-branch; Plan reviews missed (i) numerical off-by-one between plan body counts and TodoWrite reality, and (ii) the operational feasibility of upper-bound limits given subagent dispatch overhead. Extended the Planning focus area in the peer-personality block to enumerate both observations.

### dev-workflow v1.34.3 / dev-workflow-bundle v1.34.3

- fix(dev-workflow): make ExitPlanMode precondition explicit at Step 4 step 3 (auto-triage #7)
  - Category: ambiguity; Step 3 → Step 4 ordering invariant was implicit; agent could issue `ExitPlanMode` mid-Step-3. Step 4 step 3 now names the TodoWrite precondition and the remediation when it trips.
- fix(dev-workflow): add cross-skill structural-blast-radius bullet to Step 2 Simplicity self-audit (auto-triage #7)
  - Category: missing-branch; Step 2 self-audit only covered intra-plan incrementality. New bullet requires explicit scope expansion or a Risks-entry deferral when sibling skills share the same structural pattern.
- fix(dev-workflow): add cross-file consistency check to Step 3 (f) rubric (auto-triage #7)
  - Category: ambiguity; Step 3 (f) covered cross-section consistency within a single plan but not cross-file consistency across multiple SKILL.md / references files. New bullet sits beside the existing cross-section check, gated on multi-file plans.
- fix(dev-workflow): add inline no-stall reminder at Step 8 iteration boundary (auto-triage #6)
  - Category: missing-branch; Step 8 iteration boundaries had no inline no-stall reminder, so the agent stalled between iter k and iter k+1. Reminder enumerates reviewer outcomes in closed-list form and names the three possible next actions, all gated to "next tool call".
- fix(dev-workflow): add Simplify-revival check to Step 8 reviewer category c (auto-triage #5)
  - Category: missing-branch; Step 8 review fix cycle could silently re-introduce narration that Step 6 Simplify deliberately removed. New clause in category c. (iter k ≥ 2 only) tells the reviewer to flag that regression class.
- fix(dev-workflow): require recording cycle-to-cycle judgment drift in Step 7.5 (auto-triage #5)
  - Category: ambiguity; Step 7.5 1st/2nd cycle verdicts could legitimately differ on the same location, but the SKILL.md never required recording the reason. New clause in step 3.c covers both drift directions and requires the reason in the audit trail before completion.

### extract-rules v1.13.2 / dev-workflow-bundle v1.34.3

- fix(extract-rules): clarify examples-format reference direction is one-way (auto-triage #5)
  - Category: wrong-default; Examples-file generation defaulted to emitting a self-reference link at the end because the format spec did not state the reference direction explicitly. New clause forbids self-links and binds templates / subagent prompts to omit the section.

### rules-review v1.1.1 / dev-workflow-bundle v1.34.3

- fix(rules-review): add explicit scope policy to reviewer prompt (auto-triage #5)
  - Category: ambiguity; Reviewer prompt did not state whether rules apply diff-only or file-wide. New "Scope" clause makes diff-only the default, with an explicit escape when the rule text demands file-wide consistency.

### extract-rules v1.13.1

- docs(extract-rules): Translate remaining Japanese comments in the Usage block to English
  - The `/extract-rules --from-pr` examples in `## Usage` carried Japanese comments (`カレントリポのPR指定`, `他リポのPR指定（URL形式も可）`, `範囲指定（カレントリポ）`, `範囲指定（他リポ）`, `複数指定可（スペース区切り）→ 横断分析で組織重視の原則を検出`). Project rules require distributed artifacts (SKILL.md included) to be in English; the comments now read `PR in current repo`, `PR in another repo (URL form also accepted)`, `PR range (current repo)`, `PR range (another repo)`, and `Multiple specs allowed (space-separated) → cross-analysis detects org-wide principles`. No behavioral change

## 2026-04-25

### dev-workflow v1.34.2 / dev-workflow-bundle v1.34.2

- fix(dev-workflow): Require repo-wide grep before drafting plans for version/identifier string replacement tasks
  - Step 2 sub-step 3 gains a new bullet: when the core operation is replacing a specific version string, identifier, or constant across the project (e.g. version bump, rename, migration), grep the entire repository for the old value before drafting the plan and enumerate the complete list of affected files in the Design section. Missing even one location is the primary regression source for this task class — surfacing the full target set at plan time blocks the "we forgot a place" failure mode rather than catching it at Step 7
- fix(dev-workflow): Require pinned-dependency compatibility verification on runtime/language major-version upgrades
  - Step 3 sub-step 1 (a) Scope & feasibility gains: when the plan proposes upgrading the base runtime or language major version, the reviewer must verify that all pinned dependencies (runtime and dev) explicitly cover the new version. Any dependency whose supported range does not include the new version must be flagged, and the plan must adopt the most conservative version all pinned dependencies safely support rather than leaving compatibility gaps for the user to catch at Step 4
- fix(dev-workflow): Add a Scope-drift guard around `check_commands` so auto-fix writes outside the task scope are surfaced instead of silently accepted
  - Step 7 sub-step 1 gains a "Scope-drift guard" bullet: before each command, record `git diff --name-only <base-commit>` as the task-scope snapshot. After the command, re-check the diff — any file newly appearing outside that snapshot was written by the command (auto-fix/write behavior sweeping unrelated drift). On detection, warn the user (listing both the in-scope files and the newly-appeared out-of-scope files), do **not** auto-revert / `git checkout` / delete the out-of-scope changes (leave the working tree as the command left it for user inspection), leave `Step 7: Check / Test` as `in_progress`, and wait for user direction. Positioned as the only allowed non-completing exit from the check_commands phase
  - The `## No-Stall Principle` enumeration adds **Step 7 scope-drift stop** as a new permissible pause point alongside the existing entries (Step 1.5 dialogues, Step 4 plan approval, Step 7 fail-stop, Step 7.5 persisting violations, Step 8 unresolved findings, Completion subtask PR URL prompt). Required by the section's own "update the enumeration and the definition together" invariant — a pause point introduced only in the Step 7 definition would have left the closed-list claim false

## 2026-04-24

### dev-workflow v1.34.1 / dev-workflow-bundle v1.34.1

- fix(dev-workflow): Extend the `language` config scope to cover all user-facing prose the skill produces, not just Step 9.5
  - `language` now governs the Step 4 plan body (Overview / Decisions / Design / Test plan / Risks / Unknowns content) and the Step 2 difficulty-assessment log in addition to the Step 9.5 finding `Description` / `Suggested fix direction` paragraphs. Previously a Japanese user still received an English plan in Step 4 even though the rest of the conversation was Japanese
  - Plan section headings (`Overview` / `Decisions` / `Design` / `Test plan` / `Risks` / `Unknowns`), the Step 4 literal guidance line, and the Step 9.5 schema tokens / terminal summary / destination header remain English regardless of the setting so the template-contract and machine-checkable strings stay load-bearing
  - `## Configuration` entry rewritten to enumerate the three covered surfaces; Step 2 sub-step 7 and Step 4 sub-step 1 explicitly instruct writing the difficulty log and plan body prose in the resolved language
- fix(dev-workflow): Forbid non-template sections in the plan via a new Step 2 self-check bullet
  - `references/plan-format.md` § Step 2 self-check gains: "No section appears outside the enumerated template (Overview, Decisions, Design, Test plan, optionally Risks / Unknowns) — added 'meta' sections such as introductions, methodology notes, or recap blocks belong inside Design or should be dropped entirely". Header wording updated from "run this check on the Decisions section" to "run this check on the plan" to reflect the expanded scope; the trailing paragraph restates the template's required-headings list as the closed set of sections and the only structural property checked here
- fix(dev-workflow): Close Step 2 sub-step 8 against confirmation-seeking transition phrases
  - Step 2 sub-step 8 now explicitly forbids confirmation-seeking transition sentences such as "if this design looks good, I'll proceed to Step 3 (Plan Review)" or "shall I move on to Plan Review?" — they superficially read as natural conversation but constitute the same approval gate the step already prohibits and waste user attention on an unreviewed plan. The moment Step 2 ends, the workflow must advance to Step 3 without emitting any user-facing message about the plan or the transition
- fix(dev-workflow): Close Step 8 short-circuit rationalizations when re-running Step 7 / Step 7.5 after a fix
  - Step 8 iteration-loop sub-step 3 now mandates "Always re-run Step 7 and Step 7.5 — no exceptions" and explicitly disallows the common rationalizations: confidence in the fix, small diff size, modified paths that appear out of scope for the configured `check_commands` / `test_commands` (e.g. edits landing entirely under a local-skill directory or a docs-only path), or the re-run "would be a no-op". A genuine no-op outcome is the audit trail; skipping the re-run removes the trail. The only permissible skip remains the separate branch where no code was modified in the iteration

### dev-workflow v1.34.0 / dev-workflow-bundle v1.34.0

- feat(dev-workflow): Submit Step 9.5 repo-mode retrospectives via `gh api` instead of `gh issue create` to run with the minimum GitHub token permissions
  - `references/self-retrospective.md` § 4 Submit repo mode step 2 now invokes `gh api --method POST /repos/<feedback>/issues -f title=... -F body=@<staging-file>`. `gh api` only needs a token with `Issues: write` on the target repo, whereas `gh issue create` additionally requires broader read scopes for label/assignee metadata lookups — switching narrows the blast radius of a leaked token
  - `allowed-tools` in `SKILL.md` replaces `Bash(gh issue create *)` with `Bash(gh api --method POST /repos/*/issues *)` — pinned to the issue-creation endpoint so other `POST /repos/{o}/{r}/...` paths that carry higher blast radius (webhooks, deploy keys, `dispatches`, git refs/commits, repo transfer, releases) are NOT pre-approved. The two wildcards cover `<owner>/<repo>` in the URL and the trailing `-f title=... -F body=@<file>` flags. The § 5 "gh submission failure" retry hint and the README destination table / prerequisites entry are updated to the new invocation and call out the reduced token-scope requirement
- feat(dev-workflow): Delete the Step 9.5 repo-mode staging file after a successful submission, preserve it on failure
  - `references/self-retrospective.md` § 4 Submit repo mode gains sub-step 3: after the `gh api` POST returns exit 0, `rm` the staging file `.claude/plans/retrospective-<slug>.md`. On non-zero exit the file is left in place as a retry affordance — § 5 "gh submission failure" now surfaces the preserved path and a full `gh api` retry command
  - Path mode unchanged (the written file is the user-facing deliverable in that mode). The path-mode bullet now explicitly notes the no-delete behavior so the mode asymmetry is visible at a glance

## 2026-04-23

### dev-workflow v1.33.0 / dev-workflow-bundle v1.33.0

- feat(dev-workflow): Add configurable output language for Step 9.5 finding prose
  - New top-level scalar config key `language` (e.g. `ja`, `en`), merged across the three settings layers like other scalars. Resolution: merged skill config → `~/.claude/settings.json` `language` field → default `ja`. `null` / empty string / non-string values fall through to the next step. Reading `~/.claude/settings.json` warns only on malformed JSON or an invalid `language` value; a missing file or missing key silently falls through to `ja`
  - Scope: only the `Description` / `Suggested fix direction` paragraphs of Step 9.5 findings honor the setting. Everything else — schema tokens (`### Finding <N>`, labels, enum values, `Findings: <N>`, `Status: ERROR`), terminal summary, destination header — stays English regardless of the setting
  - Step 9.5 threads the resolved language into `references/self-retrospective.md` §2.1 subagent prompt (new `Language` input + new "Language handling" instruction step). §3 sanitization applies to the localized prose regardless of language
  - §5 Machine-checkable rejection contract pinned to English so string/enum matching stays load-bearing. Added a **Contract note — do not relax for i18n** to prevent future editors from "fixing" §5 to accept translated tokens and silently break the main ↔ subagent contract

### dev-workflow v1.32.1 / dev-workflow-bundle v1.32.1

- fix(dev-workflow): Introduce No-Stall Principle so the workflow never pauses except at explicit user-gate points
  - New `## No-Stall Principle` section placed at the top of `## Execution Mode`. Enumerates the exhaustive list of permissible pause points (Step 1.5 decomposition dialogue, Step 1.5 Resume picker, Step 4 plan approval, Step 7 after 3 retries, Step 7.5 step 3.d persisting violations, Step 8 step 4 unresolved findings, Completion subtask PR URL prompt). At every other point the agent must treat skill results semantically and proceed automatically — no reliance on exact-phrase matching
  - Step 6 (Simplify): add an explicit completion clause — regardless of whether `Skill(simplify)` applied fixes or returned any other non-error result, mark the step `completed` and proceed to Step 7 automatically. Previously the step had a single sub-step (the skill invocation) with no guidance on handling a no-op return, so the workflow paused until the user said "continue"
  - Step 7.5 (Rules Compliance Review) step 2: replace the exact-phrase list ("No rule violations found", "All rules compliant", …) with a semantic-judgment instruction. The list was fragile because (i) `"All rules compliant"` was never emitted by the current rules-review implementation, and (ii) any future wording change in rules-review would silently break the match. Semantic judgment plus the No-Stall Principle is robust to output-format drift
  - Step 7.5 step 3.c (2nd-cycle re-run after violation fix): make the clean-2nd-cycle branch explicit — reuse the same semantic judgment as step 2 and proceed to Step 8 automatically. Previously only the "violations persist" branch was written, leaving the clean-re-run case without an explicit progress instruction
  - Step 9 (Update Rules): add a closing sub-step — after `Skill(extract-rules)` invocations return, mark the step `completed` and proceed automatically regardless of whether new rules were added or the skill reported nothing changed. Pre-emptive alignment with the No-Stall Principle so Step 9 stays consistent with Steps 6 and 7.5

## 2026-04-22

### dev-workflow v1.32.0 / dev-workflow-bundle v1.32.0

- feat(dev-workflow): Structured plan format with a mandatory Decisions section to cut Step 4 user-review fatigue
  - New file `references/plan-format.md` — single source of truth for plan structure (Overview / Decisions / Design / Test plan / Risks), the (a)+(b) Decisions criterion, Subtask / Resume handling, the Step 2 self-check, the Step 3 (f) content-quality rubric, and the three literal Step 4 guidance lines
  - Step 2 Create Plan: sub-step 3 now instructs authors to follow the template in `references/plan-format.md`; new sub-step 5 **Plan presentation format self-check** runs the author's first-pass judgment on the (a)+(b) Decisions criterion, and subsequent sub-steps shift forward by one (the difficulty-based N adjustment and "do not present" now sit at sub-steps 7 and 8)
  - Step 3 Plan Review: adds review category **(f) Presentation & attention allocation (content quality)** — external re-check of the Decisions section's content (does each item genuinely pass (a)+(b), is there a judgment call buried in Design, are Overview/Design/Test plan/Decisions mutually consistent). Format compliance is not re-checked here — the Step 2 self-check is authoritative for structure, keeping the division of labor clean and preventing the "No actionable findings" short-circuit from bypassing format validation
  - Step 4 Finalize Plan: sub-step 1 leads with one of three literal English guidance lines (Decisions present / empty-Normal / empty-Resume) drawn verbatim from `references/plan-format.md`. The "Decisions present" variant tells the user where their judgment is actually needed; the empty variants turn "no decisions" into a strong skim-and-approve signal rather than a mistakenly-dropped section
  - README `## Plan format` section: user-facing summary of the template, the Decisions gate, and the recommended review procedure

### dev-workflow v1.31.0 / dev-workflow-bundle v1.31.0

- feat(dev-workflow): Address plan self-audit and code-review rubric gaps from retrospective-2026-04-22 (findings F1 / F2 code-review-side / F3 planning-side / F4 / F5 code-review-side; see Explicit defers below for what each finding did not cover in this release)
  - Step 2 Simplicity self-audit: added **Root-cause provenance check** — if the plan leans on a root-cause claim from an AI-authored prior-session artifact (inherited spec file, decomposition state file's AI-authored description), re-derive the root cause from the user's original ask before treating it as load-bearing. Previously the audit only flagged inherited design elements; root-cause claims embedded in those drafts could be adopted wholesale and later discovered to be wrong only after the implementation had been built on them
  - Step 2 Simplicity self-audit: added **Plan-level incrementality** as an author-side check. Previously incrementality was only asked at the reviewer level in Step 3.d; concrete plans that bundle independent work (e.g. a new retry primitive + unrelated control-flow refactor) could slip past the author and rely on the reviewer to catch them. Author-side check lets the split be proposed before peer review, reducing rework
  - Step 5 Implement: added a **Respect prior in-session edits** self-discipline — content the user explicitly removed earlier in this session (comments, guards, logs) must not reappear when applying plan steps, Step 6 simplify output, or Step 8 review fixes. Placed on the implementing agent (main) because reviewers/simplify subagents only see `git diff <base-commit>` and cannot detect a user-delete-then-agent-readd cycle whose net diff is zero. Previously the rubric treated "missing rationale" as something to add; that framing caused agents to silently resurrect comments and guards the user had already removed
  - Step 8 Code Review rubric: category **(b) Conventions & consistency** now explicitly treats **comment narration** (line-by-line paraphrase of the code) and **comment preamble** (restating information obvious from the surrounding function/file) as delete-candidates — the default action is removal, not asking the author to expand the rationale. The prior binary "does this comment explain why?" check was too permissive; long narration with one sentence of intent still passed
  - Step 8 Code Review rubric: category **(c) Simplicity & maintainability** now specifically enumerates the speculative-addition patterns that kept resurfacing across review iterations — **defensive hardening of already-safe paths, future-proofing for hypothetical double-calls, and double-coverage over paths already protected elsewhere** — with explicit "default to removal" framing. The prior generic "speculative features without explicit trigger" wording was read as a soft suggestion and routinely ignored in favor of "noting for later"
  - Step 7.5 literal-string match list: added `"No rule violations found"` to the e.g. list so the revised rules-review output (see below) is recognized as a compliant response

- Explicit defers (not implemented in this release):
  - **Finding 2 — Step 6 simplify-side application**: the retrospective's F2 fix direction named both code-review and simplify. This release strengthens Step 8 (code-review) only; the Step 6 simplify invocation is unchanged. Peer review during planning flagged that propagating the same rubric to Step 6 would duplicate responsibility without a distinct enforcement mechanism — `Skill(simplify)` already receives `custom_instructions` as its generic constraint channel. Users who want the speculative-addition / narration-preamble rubric at simplify time should surface it via `custom_instructions`. Revisit if future retrospectives show simplify-stage regressions
  - **Finding 3 — skill self-version staleness warning**: the retrospective's F3 also asked for a startup-time warning when the skill runs with a version older than what's available locally. Deferred as a separate task — dev-workflow itself has no version-read mechanism today, and "is a newer version available?" needs upstream-check infrastructure that's out of scope for a text-level rubric update
  - **Finding 5 — commit-message body scope**: the retrospective's F5 also asked that the same narration/preamble rubric apply to commit-message bodies. Commit authoring is not dev-workflow's responsibility (dev-workflow never stages, commits, or pushes); the Completion step delegates commit creation to the user (or to `hooks.on_complete` skills like `skill-review` / `work-complete`). The rubric should live in whichever skill owns commit authoring, not here

### extract-rules v1.13.0

- feat(extract-rules): Add post-generation Portability check to examples-format reference (retrospective-2026-04-22 finding F6)
  - `references/examples-format.md`: appended a new `## Portability check (post-generation)` section — after writing each example + description, re-read the pair and ask whether the description holds for every call site of the pattern, or leaks assumptions from the specific site it was mined from. Flags two common leaks: (i) **test-file origin** (unit-test samples that describe the pattern in test-isolation terms, which diverge from production semantics when the same pattern appears in production code) and (ii) **specific-site framing** (descriptions that reference local variables / fixture names that don't generalize). Fallback is to add a `test-only` qualifier to the rule title so downstream readers do not apply the rule outside its mined context
  - Applies to all modes (Full Extraction, Update, Restructure, Conversation, PR Review)
  - Also corrected the `## Common Generation Procedure` opening line to list `Restructure` alongside the other modes — the section already has a `### For Full Extraction / Restructure` subheading, but the parenthetical mode list at the top omitted Restructure

### rules-review v1.1.0

- feat(rules-review): Clarify hard-rule vs intent-rule coverage and align output string (retrospective-2026-04-22 finding F7)
  - `description`: appended "Best suited for hard rules (naming, imports, placement, explicit prohibitions); intent-style rules are checked on a best-effort basis." Previously the skill advertised a uniform "rule compliance check" which could be read as full coverage; in practice intent-style rules (comment taste, speculative-addition avoidance) are judgment calls that benefit from dev-workflow's Step 8 code-review in addition to this skill's structural scan
  - Agent prompt (Step 5): tells reviewers that rules may include **hard rules (binary compliance)** and **intent rules (judgment-based)**, to evaluate both, and that low-confidence intent-rule cases must be reported in the violation list with an explicit `low-confidence` marker — the exact "No rule violations found" response is reserved for confidently-clean cases. This preserves the aggregator's exact-string contract (Step 6) while routing borderline intent-rule cases out of the clean path, where the user would otherwise miss them
  - Output string change: `All rules compliant` → `No rule violations found` (single line, both the Step 6 aggregation branch and the Output Format template). Synced with dev-workflow Step 7.5's literal-string match list in the same release so the new string is recognized as compliant by the workflow

Note: `merge-rules` and `apply-rules` are **not** bumped. The output format of extract-rules is unchanged (the new Portability check is a pre-write guideline, not a format change), and rules-review's output string change has no downstream consumer beyond dev-workflow (updated in the same release).

## 2026-04-21

### dev-workflow v1.30.1 / dev-workflow-bundle v1.30.1

- fix(dev-workflow): Exclude Solution-Style root tsconfig from per-tsconfig type-check registration in `--init`
  - `references/init-mode.md`: when the root `tsconfig.json` has a non-empty `references` array (Solution-Style), the root itself is now excluded from `check_commands`. `tsc -p tsconfig.json --noEmit` typically fails on Solution-Style roots because emit is disabled at the root; only the referenced leaf tsconfigs and other non-root tsconfigs that survive the name-based exclusion get registered. This closes a gap in v1.30.0's multi-tsconfig auto-registration where the generated command list could include a root entry that always errored
- docs(dev-workflow): Clarify Step 1.5 decomposition rationale is a chat message to the user
  - `references/task-decomposition.md`: the one-line rationale is now explicitly a **chat message to the user** — not a TodoWrite note or state-file field. This is the only visible audit trail for the "do NOT decompose" path, since the yes/adjust/no dialogue only fires on the "decompose" path. Without the chat line, negative decomposition decisions left no externally visible record

### extract-rules v1.12.1

- docs(extract-rules): Propagate `paths:` frontmatter from `<name>.md` to `<name>.local.md`, add `## Examples` link in project-specific templates
  - `SKILL.md` Step 6 output structure: `<name>.local.md` now carries the **same `paths:` frontmatter** as its `<name>.md` counterpart, so local project-specific patterns auto-load under the same scope as the portable Principles. Previously only `<name>.md` was documented as having `paths:`, which left `<name>.local.md` effectively unscoped despite being the more context-sensitive of the pair
  - Layer-specific and cross-layer rules about `paths:` now apply uniformly to both `.md` and `.local.md`
  - `## Project-specific patterns` template gains a trailing `## Examples` section pointing to the co-located `.examples.md` file (e.g. `./typescript.examples.md`), so reviewers can jump from a pattern note to runnable Good/Bad samples without guessing the filename

### apply-rules v2.0.2

- fix(apply-rules): Sync `paths:` frontmatter from `.md` to `.local.md` during Step 6b cleanup
  - `.local.md` files generated by extract-rules before v1.12.1 lack `paths:` frontmatter and are effectively unscoped. apply-rules Step 6b now retrofits the scope by copying (union + dedup) the sibling `.md`'s `paths:` onto any `.local.md` that survives the promoted-pattern cleanup. This aligns existing projects with the v1.12.1 contract without requiring a full extract-rules re-run
  - `.local.md` files deleted by the cleanup (emptied) are unaffected — no frontmatter sync is performed on deleted files

Note: `merge-rules` is **not** bumped. merge-rules output contains no `.local.md` (patterns are promoted to Principles), and input `.local.md` frontmatter is already parsed gracefully regardless of whether `paths:` is present.

## 2026-04-20

### dev-workflow v1.30.0 / dev-workflow-bundle v1.30.0

- feat(dev-workflow): Strengthen Simple classification, add external-library primary-source verification, close multi-tsconfig coverage gap, and open a runtime trigger for examples.md staleness review (retrospective-2026-04-20 findings F1/F2/F3/F4)
  - Step 2.6: Simple escalates to at least Moderate when the change touches an external library's configuration file or type-level API AND that library has had a recent major-version bump. The check is a quick `git diff <base-commit>` on the project's package manifest looking for major version changes. Similar qualitative risks (external config-DSL rewrites, etc.) follow the same rule. Mechanical check + qualitative trigger are combined so stale-config failures after a major upgrade cannot slip through the Simple path
  - Step 3 Plan Review: added a new category (e) **External library primary-source verification** (independent of category (a) so it gets its own reviewer checklist slot). When the plan touches an external library's API, configuration DSL, configuration file, enabled options, or type-level behavior — interpreted broadly so plugin activation and option tweaks count — reviewers must treat in-project references (`.examples.md`, `.local.md`, existing implementations) as secondary and require the plan to cite at least one primary source (installed type definitions, package source, or official reference docs). If the primary source cannot be consulted in the current environment (missing installed deps, no web access), the item is flagged in the plan as a stale-API concern instead of being trusted silently. Step 8 is not changed — the check is scoped to the planning gate to avoid noise at code review
  - Step 7: notes that TypeScript Project References / multi-tsconfig setups can leave changed files uncovered by `check_commands`. `--init` now auto-registers per-tsconfig `tsc -p <path> --noEmit` when 2+ tsconfigs or `references: [...]` are detected. The per-tsconfig form was chosen over `tsc -b --noEmit` because the latter is only supported on TypeScript ≥ 5.6; per-tsconfig `-p` is universally compatible and needs no version probing
  - Step 9: `--update` now additionally triggers when a dependency's major-version bump is detected via `git diff <base-commit>` on the package manifest (same signal as Step 2.6). This opens the runtime path for finding F3 — without this trigger the extract-rules Update Mode operational note was documented but never read in practice, because `--update` only ran on "significant structural/pattern changes"
  - Step 9.5: Simple hard-skip is now overridable by an explicit user request **within the same session** (e.g. "run the retrospective for this run anyway"). The manual re-run runs the `references/self-retrospective.md` procedure from §1 without updating TodoWrite (the Step 9.5 row stays `completed`) and prompts the user to re-verify the session jsonl selection at §1.4. Cross-session re-runs are not supported — once the workflow session has ended, the Step 2.6 difficulty assessment cannot be recovered. `references/self-retrospective.md`:7 was rewritten to define both the normal read path and the manual-re-run read path consistently
  - README.md sync: the Simple row now carries the major-bump exception as a footnote, and the Hard-skip-on-Simple section is retitled "overridable on explicit request" with invocation example
  - Out of scope (deferred): a lightweight coverage-check sub-step that warns when a changed file is not covered by any `check_command`. Out of scope for this release — the `--init` improvement closes the most common TypeScript instance, and a generic coverage-check step needs more design

### extract-rules v1.12.0

- docs(extract-rules): Operational note for post-major-version updates (retrospective-2026-04-20 finding F3)
  - Update Mode now opens with an operational note: after a dependency's major-version bump, run `--update` so the staleness check (Step U3) can flag removed symbols. The note also makes explicit that the current Step U3 check only inspects inline `` `symbol` `` patterns in `## Project-specific patterns` sections (`.local.md`) — code samples inside `.examples.md` are **not** auto-scanned. Manual review of `.examples.md` is required after a major bump; otherwise stale configuration samples there can silently propagate into future plans via reviewers treating project examples as authoritative
  - `--restructure` is not recommended for post-major-bump sync (it does not run a staleness check)
  - Out of scope: Restructure / Conversation / PR-Review mode ripple of the staleness check, fenced-code-block parser for `.examples.md`. Not addressed in this release

Note: `apply-rules` and `merge-rules` are **not** bumped. The `extract-rules` output format is unchanged by this release, and neither SKILL.md references dev-workflow / extract-rules content directly, so their behavior is unaffected.

## 2026-04-18

### dev-workflow v1.29.0 / dev-workflow-bundle v1.29.0

- feat(dev-workflow): Add Step 9.5 Self-Retrospective (Phase 1 — bundle-skill improvement signal)
  - New optional config key `self_retrospective.feedback` (string). When set, a new Step 9.5 runs between Step 9 (Update Rules) and Step 10 (Completion Hooks), scanning the current conversation for improvement signals about the bundled skills (`dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`), sanitizing them, and submitting to a user-configured destination
  - Destination is auto-detected from the `feedback` string: `owner/repo` pattern → GitHub issue via `gh issue create`; paths starting with `/`, `~/`, `./`, `../` → a markdown file under that directory; any other value → warn and skip
  - Raw conversation (jsonl) stays in-session — only abstracted, project-agnostic text leaves. Explicit sanitization rules cover absolute paths, project/repo/product/user names, project-specific code identifiers, and dates/IDs/URLs. User preview + approve/edit/skip loop is always shown before submission
  - Skipped entirely when `self_retrospective.feedback` is unset or invalid (Step 9.5 not registered in TodoWrite). Also hard-skipped when Step 2 assesses the task as Simple difficulty (typo fix, config tweak), regardless of config — Simple tasks rarely exercise the bundled skills enough to produce meaningful signal
  - Repo-mode runs an early `gh auth status` check at Step 1 as a warning only, so the user is alerted up front that Step 9.5 will abort later; Step 9.5 re-checks and aborts with an actionable message as a backstop
  - Issue title is fixed as `[auto-retrospective] dev-workflow-bundle: <N> findings (<YYYY-MM-DD>)` so downstream automation can filter reliably; no default label
  - Full procedure (pre-flight, extraction, sanitization, submission, error handling) lives in `references/self-retrospective.md` (mirrors the Step 1.5 → `task-decomposition.md` deep-reference pattern)
  - Phase 2 (local skill-ification candidates from conversation scan, with create/edit/skip approval UX that writes directly under `.claude/skills/`) is intentionally deferred to a follow-up release (planned 1.30.0). Phase 1 ships the retrospective infrastructure; Phase 2 adds the higher-risk file-creation flow with name validation, allowed-tools constraints, and SKILL.md syntax validation

### dev-workflow v1.28.0 / dev-workflow-bundle v1.28.0

- feat(dev-workflow): Refine Step 1.5 decomposition heuristic toward independently-verifiable units
  - `references/task-decomposition.md` section B step 1 criteria reordered and rewritten. "The task splits into 2+ units where each unit has a distinct verification path" is now the strongest decompose signal, elevated above cross-module / and-list / staged-refactor heuristics
  - When decomposition signals are mixed, the workflow now biases toward proposing decomposition (the yes/adjust/no dialogue is cheap, smaller shippable PRs cut review load). "Feature looks singular" is no longer sufficient grounds on its own
  - Do NOT decompose criteria reframed around single verification path, atomicity-breaking splits, and a new guardrail against over-splitting (subtasks so small that per-PR overhead exceeds the benefit)
  - Rationale log now names the **primary signal** that drove the decision (e.g. `decompose: 2 distinct verification paths — admin CRUD + chat insertion`), so decomposition bias can be audited after the fact
  - Section B step 3.c decomposition-proposal dialogue now lists each subtask with its `verification_hint` (and `depends_on`), so the user can judge the breakdown at a glance before answering yes/adjust/no
  - Clarified decompose vs. veto precedence: atomicity / over-split vetoes and the single-verification-path case override non-primary positive signals (and-list, cross-layer, staged refactor). Only the primary signal — genuinely distinct verification paths — overrides these vetoes. Resolves the ambiguity where a light "X and Y" request could decompose despite PR overhead outweighing benefit
  - Clarified that `verification_hint` shown in the Step 1.5 proposal is advisory context for the split decision, not a user-approved completion contract — consistent with Step 2's existing treatment of `verification_hint` as AI-authored draft within otherwise-approved state files, so Step 2 can still refine hints without violating the yes the user gave in Step 1.5
  - Addresses a failure mode where features with 2 distinct verification units (e.g. admin CRUD + chat insertion) were classified as "feature contained in one module" and shipped as a single oversized PR, requiring post-hoc splitting
  - README.md "Decomposition judgment" section synced with the new criteria

### dev-workflow v1.27.0 / dev-workflow-bundle v1.27.0

- feat(dev-workflow): Add simplicity-first audit to Step 2 / Plan Review / Code Review
  - Step 2 gains a new `Simplicity self-audit` sub-step. Right after drafting the plan, each element must be traceable to an explicit user requirement, a known bug/constraint, or a documented `.claude/rules/` rule; elements without such a trigger must be dropped or annotated with an explicit rationale
  - Inherited spec files under `.claude/plans/*.md` are treated as prior-session drafts, not confirmed requirements. Task-decomposition state files are the exception: user-approved subtask boundaries, order, `depends_on`, and purposes are honored as-is, while AI-authored descriptions within each subtask remain draft
  - Step 3 category (a) Scope & feasibility is reframed to verify the author's self-audit, so the reviewer focuses on elements with weak or missing rationale rather than re-running the same traceability check
  - Step 8 category (c) Simplicity & maintainability now explicitly flags speculative features without an explicit trigger, catching scope creep that slipped past earlier gates
  - Addresses a failure mode where prior-session plan files were treated as confirmed requirements and carried forward unvetted elaboration into implementation

## 2026-04-13

### dev-workflow v1.26.0 / dev-workflow-bundle v1.26.0

- feat(dev-workflow): Add `Incrementality` category to Step 3 Plan Review
  - Reviewer is now asked whether the plan can be split into smaller, independently verifiable units (hotfix vs refactor, behavior change vs structural change)
  - Catches cases where a task-level "single concern" still bundles independent work at the plan level, where Step 1.5 decomposition correctly passed
  - Regression attribution concerns ("which change caused this?") are called out as a strong splittability signal

## 2026-04-11

### dev-workflow v1.25.1 / dev-workflow-bundle v1.25.1

- fix(dev-workflow): Explicitly instruct autonomous judgment on review findings
  - Step 3 (Plan Review) and Step 8 (Code Review) now explicitly state "autonomously ... do not ask the user for judgment on individual review findings"
  - Addresses issue where the model deferred to the user on every review finding instead of autonomously applying fixes or rejecting inapplicable points
  - Final fallback to user (Step 3.4 / Step 8.4 for unresolved points after all iterations) remains unchanged

## 2026-04-10

### dev-workflow v1.25.0 / dev-workflow-bundle v1.25.0

- refactor(dev-workflow): Remove completion hooks prompt from `--init`
  - `--init` no longer asks about hooks — hooks are left unconfigured by default
  - Users can still configure `hooks.on_complete` manually in settings files (execution mode Step 10 unchanged)

### dev-workflow v1.24.0 / dev-workflow-bundle v1.24.0

- feat(dev-workflow): Add 3-layer configuration with type-aware merge
  - New project shared settings file: `.claude/dev-workflow.md` (git tracked, team-shared)
  - Settings are merged across three layers: user global (`~/.claude/dev-workflow.local.md`) → project shared (`.claude/dev-workflow.md`) → personal override (`.claude/dev-workflow.local.md`)
  - Merge strategy: scalar keys are replaced by higher layer; list keys (`check_commands`) are appended and deduplicated; `hooks` is deep-merged (`on_complete` list is appended). `null`/empty explicitly clears the key
  - `--init` now saves to `.claude/dev-workflow.md` (project shared) instead of `.claude/dev-workflow.local.md`
  - Existing `.claude/dev-workflow.local.md` continues to work as the highest-priority personal override layer — no migration needed
  - Personal overrides (`.claude/dev-workflow.local.md`) are created manually with only the keys to override

### dev-workflow v1.23.0 / dev-workflow-bundle v1.23.0

- feat(dev-workflow): Add `task_decomposition` setting to disable auto-decomposition in Normal sub-mode
  - Default `true` — existing behavior unchanged
  - Set to `false` to skip Step 1.5's auto-decomposition check entirely — Normal sub-mode requests (`/dev-workflow <task>`) are treated as single tasks. Step 1.5 is omitted from TodoWrite in this mode
  - `--resume <state-file>` is unaffected — existing state files can still be resumed explicitly
  - Non-boolean values fall back to `true` with a warning
- docs(dev-workflow): Refactor SKILL.md for skill-creator best practices
  - Step 1.5 Task Decomposition detail extracted to `references/task-decomposition.md` — SKILL.md drops from 306 to 254 lines (~17% reduction), and simple single-concern runs no longer load state-file semantics they don't need (progressive disclosure)
  - Step 3 / Step 8 `MUST continue re-review` reframed with the *why* (plan modifications often introduce fresh ripple effects; code fixes routinely introduce new bugs) so the instruction persuades instead of insisting
  - No runtime behavior change — all semantics preserved, just documented differently

## 2026-04-09

### dev-workflow v1.22.0 / dev-workflow-bundle v1.22.0

- feat(dev-workflow): Add task decomposition for splitting large tasks into PR-sized subtasks
  - New **Step 1.5: Task Decomposition** runs between Step 1 (Load Settings) and Step 2 (Create Plan)
  - In Normal sub-mode, the workflow lightweightly judges whether the request should be split and proposes a decomposition to the user for approval. Simple, single-concern tasks pass through unchanged
  - Approved decompositions are persisted to `.claude/plans/dev-workflow.<slug>.md` — one state file per parent task, so multiple parent tasks can proceed in parallel
  - Each subtask runs through the existing Step 2–10 flow as an independent PR-sized unit
  - New `--resume <state-file>` flag picks up the next runnable subtask in a fresh session. Accepts full path, filename, or bare slug
  - On subtask completion, the workflow instructs the user to commit + open a PR before resuming the next subtask. The workflow itself never stages, commits, or pushes
  - Parent-task progress is surfaced as a TodoWrite top-level row (`Parent task: N/TOTAL subtasks done — <slug>`)
  - Edge cases handled: YAML parse errors on state files, `depends_on` cycles, missing `--resume` targets, and leftover `in_progress` subtasks from interrupted sessions
  - Step 1.5 is intentionally separate from Plan Mode (which is still reserved for Step 2) so the decomposition proposal is a plain yes/no dialogue

## 2026-04-07

### dev-workflow v1.21.0 / dev-workflow-bundle v1.21.0

- feat(dev-workflow): Add automatic review iteration adjustment based on task difficulty
  - Assesses task difficulty (Simple/Moderate/Complex) after plan creation in Step 2
  - Reduces review iteration count (N) for simpler tasks — configured value acts as ceiling, not target
  - Simple tasks (typo fix, config tweak): N=1, Moderate (single-module multi-file): N=min(2,N), Complex: keep N
  - Explicit `-i N` / `--iterations N` CLI flag skips difficulty assessment (user override)
  - Excess TodoWrite iteration items (Step 3-x, Step 8-x) marked as completed when N is reduced

### All plugins (patch version bump)

- fix: Isolate plugin source directories to prevent duplicate skill registration
  - Each plugin now has its own `plugins/<name>/` source directory with symlinks to `skills/`
  - Previously all plugins shared `source: "./"`, causing Claude Code to auto-discover all skills for every plugin
  - Workaround for [anthropics/claude-code#13344](https://github.com/anthropics/claude-code/issues/13344)
- docs: Update CLAUDE.md to reflect new plugin structure and skill addition flow

## 2026-04-06

### dev-workflow v1.20.0 / dev-workflow-bundle v1.20.0

- feat(dev-workflow): Add `custom_instructions` configuration for injecting user-defined development instructions
  - Free-form string applied to planning (Step 2), plan review (Step 3), implementation (Step 5), simplify (Step 6), and code review (Step 8)
  - Configured via `dev-workflow.local.md` YAML frontmatter
  - `.claude/rules/` and explicit user requests take precedence over `custom_instructions`

### dev-workflow v1.19.0 / dev-workflow-bundle v1.19.0

- feat(dev-workflow): Add hooks configuration for executing skills/commands at workflow timing points
  - `hooks.on_complete`: runs after Step 9 (Update Rules), before completion report
  - Entry format: `Skill(<name>)` for skill invocation, or shell command string
  - Non-blocking: hook failures are reported as warnings in completion summary
  - Configured via `dev-workflow.local.md` YAML frontmatter
- feat(dev-workflow): Add Step 10 (Completion Hooks) to workflow execution
- feat(dev-workflow --init): Add hooks configuration step to project setup flow

## 2026-04-04

### merge-rules v2.0.0 / apply-rules v2.0.0 / extract-rules v1.11.0 / dev-workflow-bundle v1.18.3

**Breaking change**: Promoted patterns are now converted to Principles format and integrated into `## Principles`. The `## Project-specific patterns` section is no longer produced by merge-rules. Existing merge-rules output with `## Project-specific patterns` must be regenerated by re-running merge-rules.

- feat(merge-rules): Promote .local.md patterns to Principles format (`Description (signature)`) instead of separate `## Project-specific patterns` section
- feat(merge-rules): Add deduplication against existing Principles to prevent self-amplification from previously promoted patterns in `.local.md`
- feat(merge-rules): Promoted pattern examples are included under `## Principles Examples` (no more `## Project-specific Examples` in output)
- feat(merge-rules): Design note clarifying promoted Principles are permanent org-level rules
- feat(apply-rules): Clean up promoted patterns from `.local.md` files (cross-format duplicate removal)
- feat(apply-rules): Remove corresponding `## Project-specific Examples` entries for cleaned-up patterns
- feat(apply-rules): Delete `.local.md` files that become empty after cleanup
- remove(apply-rules): Remove promoted→`.local.md` routing (promoted patterns are now regular Principles)
- feat(extract-rules): Add cross-format duplicate check in Update mode (Step U4) and Conversation mode to prevent re-adding patterns already promoted to Principles
- refactor: Simplify skill descriptions for merge-rules, apply-rules, and extract-rules to reduce context overhead

### extract-rules v1.10.1 / dev-workflow-bundle v1.18.2 (earlier today)

- feat: Remove default size limits from `extract_session_messages.mjs` — all messages included by default
  - `--max-chars` and `--max-per-message` are now optional (default: no limit)
  - Previously defaulted to 100K chars / 2000 chars per message

## 2026-04-03

### extract-rules v1.10.0 / dev-workflow-bundle v1.18.1

- feat: `--from-conversation` mode reads full session history from `.jsonl` files on disk
  - No longer limited to context window — captures all messages including those lost to compaction
  - Session file located via encoded project path under `~/.claude/projects/`
  - Supports `<session-id>` argument to target a specific session (default: latest by mtime)
- feat: Delegate heavy processing to subagent to keep main context clean
  - Main agent handles settings + session file resolution (C1-C2)
  - Subagent handles jsonl parsing, analysis, rule extraction, and file writing (C3-C5)
  - Subagent instructions moved to `references/conversation-mode.md` (progressive disclosure)
- feat: Bundle Node.js script `scripts/extract_session_messages.mjs` for jsonl parsing
  - Filters user/assistant text messages, skips tool_use/thinking blocks
  - Recovers `AskUserQuestion` responses via interactive tool ID whitelist
  - Latest-first processing with configurable size limits (100K chars default)
  - Input validation, malformed JSON line diagnostics
- refactor: Replace `Bash(python3 *)` with `Bash(node *)` in allowed-tools (node is guaranteed by Claude Code)
- fix: Update `references/pr-review-mode.md` Step C4 → C5 reference

### dev-workflow v1.18.0 / dev-workflow-bundle v1.18.0

- feat: Improve init-mode run-tests generation for autonomous test execution
  - Add Docker daemon readiness check as prerequisite when docker-compose is detected (daemon → services, two-step)
  - Detect existing run-tests skills lacking Docker daemon check and offer regeneration
  - Support `.yaml` extension variants for docker-compose detection
  - Generalize run-tests template: category-based prerequisites, technology-agnostic allowed-tools
  - Add async service retry rule in Process section (re-check with retries for up to 30 seconds)
  - Align pseudo-execute flow with async retry rule

## 2026-04-02

### rules-review v1.0.0

- feat: New skill for `.claude/rules/` compliance checking
  - Match rule files to changed files via `paths:` frontmatter globs
  - Group rules by category (project, languages, frameworks, integrations, custom)
  - Parallel review via sub-agents per group
  - Standalone usage: `/rules-review --base-commit <sha>`

### dev-workflow v1.17.0 / dev-workflow-bundle v1.17.0

- feat: Add Step 7.5 (Rules Compliance Review) as dedicated rules enforcement step
  - Runs `Skill(rules-review)` between Check/Test (Step 7) and Code Review (Step 8)
  - 2-cycle max: fix violations → re-verify → escalate to user if unresolved
  - Step 8 re-run after code modifications includes Step 7.5
  - Step 8 retains lightweight rules check as safety net
- feat: Bundle `rules-review` skill with `dev-workflow-bundle` plugin

## 2026-04-01

### dev-workflow v1.16.0

- feat: Strengthen rules compliance checking and test coverage verification
  - Step 2: Require specific test files (existing to update or new to create) in test plan, not just abstract descriptions
  - Step 3: Plan reviewer verifies specific test files are identified and existing related tests are covered for update; read all files under `.claude/rules/`
  - Step 8: Reviewer must read all files under `.claude/rules/` and verify compliance against the diff, citing rule file path and violated rule text
  - Step 8: Verify planned test files from Step 2 are present in the diff

### dev-workflow v1.15.1

- fix: Ensure re-review after modifications in Plan Review (Step 3) and Code Review (Step 8)
  - If plan/code was modified based on review feedback, MUST continue to next iteration for re-review
  - If all points were rejected (no modifications), remaining iterations can be skipped
  - Step 8: Consolidate "Re-run Step 7" and "re-review required" under single "code was modified" branch

### dev-workflow v1.15.0

- fix: Strengthen plan approval flow to prevent premature user approval before plan review
  - Step 2: Explicitly forbid presenting plan or asking for approval/confirmation (bold + caps emphasis)
  - Step 3: Add internal review declaration — do not present plan to user during review iterations
  - Step 4: Add `(USER APPROVAL GATE)` to heading, mark as first time user sees the plan
  - Step 4: Add re-review condition — return to Step 3 with new iteration item if user requests material scope/approach changes
  - Step 4: Require explicit user acceptance before proceeding

### apply-rules v1.1.0

- feat: Add `AskUserQuestion` to `allowed-tools` for explicit user confirmation at decision points
  - Step 4 (Integration proposals): batched list with `all / none / number` selection
  - Step 5.5 (File name normalization): confirm renames before applying
  - Step 6 (Principle conflicts): collect all conflicts, present together with `1a, 2c` format
  - Step 7 (Non-conforming files): migration plan as single list, `project.*` excluded from "all"
- feat: Update Conflict Handling table to reflect all `AskUserQuestion` usage points

## 2026-03-31

### apply-rules v1.0.0

- feat: New skill to apply organization-wide rules (merge-rules output) to any project
  - Source specification via GitHub URL or local path (direct path to rules directory)
  - Auto-detect project tech stack (languages, frameworks, integrations) to filter relevant rules
  - Intelligent merge: `.md` (Principles) merged, `.local.md` preserved, promoted patterns routed to `.local.md`
  - Integration proposal: suggest unused but related integration rules for user approval
  - Structure conformance check: migrate non-conforming rule files with user confirmation
  - Fetch from GitHub via `gh api` (no git clone authentication issues)
  - Dry-run mode for previewing changes

## 2026-03-30

### dev-workflow v1.14.0 / dev-workflow-bundle v1.14.0

- fix: Embed check_commands/test_commands values in TodoWrite Step 7 description to prevent context loss
  - Step 7 registered as `Step 7: Check / Test [check: {check_commands} | test: {test_commands}]`
  - Settings values stay visible through TodoWrite progress checks, reducing risk of AI forgetting commands mid-workflow

### dev-workflow v1.13.0 / dev-workflow-bundle v1.13.0

- feat: Add test prerequisites check & setup to `run-tests` skill template
  - Auto-detect prerequisites from project files (docker-compose.yml, database.yml, .env.example, bin/setup)
  - Prerequisites section added to generated `run-tests` only when detected
  - Check prerequisites → setup if needed → spawn subagent for test execution; setup failure reports EXECUTION_ERROR with remediation
  - `allowed-tools` in generated skill dynamically includes prerequisite commands
- fix: Use pseudo-execution for `--init` verification step (resolves unregistered skill issue in same session)
  - Read generated SKILL.md and execute test commands directly instead of calling `Skill(run-tests)`
  - Prerequisites checks also run during pseudo-execution
- docs: Add session note — skills generated by `--init` are recognized from the next session onward

### dev-workflow v1.12.0 / dev-workflow-bundle v1.12.0

- feat: Subagent-based test execution to reduce main context consumption
  - `--init` generates canonical `run-tests` skill with Agent-based subagent execution
  - All test execution goes through `Skill(run-tests)` — no more direct shell commands or arbitrary skill names
  - Subagent returns structured summary (SUCCESS / TEST_FAILED / EXECUTION_ERROR) instead of raw test output
  - Includes stack trace excerpts and code locations for failures — enough to fix without re-running
  - Scope decision delegated to `run-tests` skill via `--base-commit <sha>` argument
  - Existing `run-tests` in current format is reused; outdated format is automatically regenerated (test commands are preserved)
- docs: Add `run-tests` SKILL.md template to `references/init-mode.md`

### dev-workflow v1.11.0 / dev-workflow-bundle v1.11.0

- feat: Add `review_iterations` default value (3) to `--init` generated config file
- feat: Add verification step after `--init` config creation
  - Run check_commands and test_commands to verify they work
  - `Skill()` entries: select a test file and invoke the skill, or run minimum test scope
  - Report pass/fail summary; failures suggest fixes but do not block

## 2026-03-28

### dev-workflow v1.10.0 / dev-workflow-bundle v1.10.0

- feat: Enhance `--init` test_commands detection with test skill auto-detection and generation
  - Detect existing test skills in `.claude/skills/` (e.g., `test-file`, `run-tests`) and propose `Skill(<name>)`
  - Auto-generate `run-tests` skill when 3+ distinct test scopes detected (with overwrite protection)
  - Fall back to direct commands for 1-2 test scopes, or project-type standard commands
- refactor: Extract Init Mode instructions to `references/init-mode.md` for progressive disclosure

### dev-workflow v1.9.0 / dev-workflow-bundle v1.9.0

- feat: Make review iteration count configurable (default: 3, positive integer)
  - Add `review_iterations` setting to `dev-workflow.local.md` configuration
  - Add `-i N` / `--iterations N` command option for per-invocation override
  - Priority: `-i` / `--iterations` option > config `review_iterations` > default `3`
  - Step 1: Dynamically generate N iteration sub-items for TodoWrite registration
  - Steps 3/8: Process N pending iteration items instead of hardcoded 3

### dev-workflow v1.8.0 / dev-workflow-bundle v1.8.0

- feat: Improve plan approval flow — reviewer reviews the plan before user approval
  - Step 2: Add instruction to proceed directly to Step 3 without asking user for approval
  - Step 4: Add explicit user approval flow (present → collaborate → accept → ExitPlanMode)
  - Step 3: Carry unresolved review points forward to Step 4 instead of asking user mid-review

### peer v2.2.0 / dev-workflow-bundle v1.7.1

- feat: Add autonomous parallel review — when a review request contains multiple independent categories, ask-peer spawns one subagent per category in parallel and merges results

## 2026-03-27

### dev-workflow v1.7.0 / dev-workflow-bundle v1.7.0

- feat: Add test review perspectives to plan creation, plan review, and code review
  - Step 2: Require test plan in implementation plan (what to test, test types, scope — or why no tests are needed)
  - Step 3: Change review category from "test strategy" to "test plan adequacy" for explicit presence/scope check
  - Step 8: Add "missing or insufficient tests for changes" to Correctness & edge cases category

### dev-workflow v1.6.0 / dev-workflow-bundle v1.6.0

- feat: Pre-register review iterations in Step 1 TodoWrite checklist as sub-items (Step 3-1/3-2/3-3, Step 8-1/8-2/8-3)
  - Iterations visible from workflow start, making skipping structurally harder
  - Step 3/8 rewritten as "process each pending iteration item" instead of loop description
  - Eliminates natural-language loop that AI tends to short-circuit after 1 pass
  - Skip remaining only when reviewer returns "No actionable findings"

### dev-workflow v1.5.0 / dev-workflow-bundle v1.5.0

- feat: Pre-register 3 review iterations as TodoWrite items in Step 3/8
  - Default is "run 3 times"; skip remaining only when reviewer returns "No actionable findings"
  - Prevents short-circuiting reviews after a single iteration

### dev-workflow v1.4.0 / dev-workflow-bundle v1.4.0

- feat: Strengthen code review (Step 8) enforcement to prevent skipping
  - Add TodoWrite-based workflow phase tracking in Step 1 (all phases registered upfront, phase items must remain)
  - Add GATE check between Step 7 and Step 8 (verify prior steps completed)
  - Add `MANDATORY, DO NOT SKIP` marker to Step 8 header
  - Structure review request into 3 categories (Correctness, Conventions, Simplicity)
  - Add iteration status tracking via TodoWrite in Step 8
- fix: Change review loop condition from "code modified" to "actionable feedback remains"
- fix: Use base-commit (`git rev-parse HEAD` at Step 2) instead of `HEAD` for accurate diff across intermediate commits
- feat: Require reviewer to explicitly state "No actionable findings" when no issues found
- feat: Strengthen plan review (Step 3) with same improvements
  - Structure review request into 3 categories (Scope & feasibility, Approach & alternatives, Completeness)
  - Include `.claude/rules/` compliance as explicit review dimension
  - Fix review loop condition from "plan modified" to "actionable feedback remains"
  - Require reviewer to explicitly state "No actionable findings" when no issues found
- chore: Add `Bash(git rev-parse *)` to allowed-tools

## 2026-03-26

### dev-workflow v1.3.0 / dev-workflow-bundle v1.3.0

- feat: Make reviewer skill configurable via `reviewer` setting in `dev-workflow.local.md`
  - Supported: ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot (default: ask-peer)
  - Unsupported or unspecified values fall back to ask-peer
  - Init Mode now includes reviewer selection step
  - All ask-* skills added to allowed-tools
- refactor: Generalize "peer" references in Step 3/8 headings and descriptions
  - `Peer Plan Review` → `Plan Review`, `Peer Code Review` → `Code Review`
  - `Skill({reviewer})` template replaced with natural language instructions

### peer v2.1.0 / dev-workflow-bundle v1.2.1

- feat: Add "Implementation discussion → Structured tradeoff analysis" to Output Format

### dev-workflow v1.2.0 / dev-workflow-bundle v1.2.0

- fix: Make peer re-review loop explicit (Step 3, Step 8)
  - Explicitly specify `Skill(ask-peer)` re-invocation after modifications
  - Require both updated artifact (plan/git diff) and change summary on re-review
  - Clarify iteration counting (max 3 including initial review)
  - Separate success exit (no feedback → next step) from max iterations reached (user decision)

### dev-workflow v1.1.0 / dev-workflow-bundle v1.1.0 (BREAKING)

- **BREAKING**: Remove `lint_command`/`format_command`/`test_command`. Re-run `/dev-workflow --init` required
- feat: Replace single command config with array-based categories
  - `lint_command`/`format_command`/`test_command` → `check_commands`/`test_commands`
  - `check_commands`: Multiple static checks (lint, format, typecheck, etc.) as array
  - `test_commands`: Multiple test commands (unit, e2e, integration, etc.) as array
- feat: Support `Skill()` entries in test_commands for skill-based test execution
- feat: Improve Init Mode to detect multiple check/test commands
- fix: Clarify Step 7 flow (check failure blocks test execution, fallback to run all tests when uncertain)
- chore: Expand allowed-tools (`bun run`, `pnpm exec`, `uv run`, `make typecheck`, `make check`)

### translate v1.1.1

- fix: Strengthen agent prompts to prevent chat mode on short inputs
  - tr (haiku): Change role to "translation engine", explicitly prohibit greetings/questions/self-introduction
  - tr-hq (sonnet): Add task boundary constraint while preserving expert role definition
  - Add short English input example (`hello` → `こんにちは`) to both agents

### peer v2.0.0 (BREAKING)

- refactor: Convert from plugin to standalone skill
  - Embed peer agent personality directly in SKILL.md
  - Remove `plugins/peer/` directory (agent file + plugin.json)
  - Spawn peer subagent via Agent tool instead of dedicated agent type
  - **Breaking**: `subagent_type: "peer"` is no longer available. Use `/ask-peer` skill instead.

### dev-workflow v1.0.0 / dev-workflow-bundle v1.0.0

- feat: Add guided development workflow skill
  - Orchestrates: plan → peer review → implement → lint/format/test → code review → rules update
  - `--init` mode for project setup (auto-detect lint/format/test commands)
  - Peer plan review and code review with `.claude/rules/` reference
  - Review loops with max 3 iterations
  - Automatic rule extraction via extract-rules `--from-conversation`
- feat: Add dev-workflow-bundle (skills-only)
  - All-in-one install: dev-workflow + ask-peer + extract-rules

## 2026-03-25

### ask-codex v1.2.0 / ask-gemini v1.2.0 / ask-copilot v1.0.2

- feat: Add conversation continuation support
  - ask-codex: `codex exec resume --last "prompt"` to resume the most recent session (dedicated section)
  - ask-gemini: `gemini --resume latest -p "prompt"` to resume the most recent session
- fix(ask-gemini): Use `-p` flag consistently for non-interactive mode
  - Quick start, all examples, and notes updated to use `-p` instead of positional args
  - Added `-p` to common options table
- fix(ask-copilot): Add follow-up prompt to continuation example (consistent with other ask-* skills)

## 2026-03-16

### extract-rules v1.9.1 / merge-rules v1.1.1

- fix: Standardize all section headings (`#`, `##`, `###`) and reference labels to English regardless of `language` setting
  - Remove i18n heading tables and language-aware label switching (`判断に迷った場合` / `When in doubt` → `When in doubt` fixed)
  - `language` setting now only affects rule content (Good/Bad examples, descriptions) and reports
- refactor: Unify `## Common patterns` into `## Project-specific patterns` in merge-rules output
  - Eliminates separate section for promoted patterns — input/output section names now match
  - Simplifies re-merging of merge-rules output
- fix: Add explicit `###` title matching rule (must match rule file names exactly, no translation/rephrasing)
  - extract-rules: Added to SKILL.md and examples-format.md with concrete examples
  - merge-rules: Added to Step 5.5 output constraints

### ask-codex v1.1.3 / ask-gemini v1.1.2

- fix: Update outdated model names in SKILL.md examples
  - ask-codex: `o4-mini` → `gpt-5.3-codex` (Codex CLI flagship model)
  - ask-gemini: `gemini-2.5-pro` → `gemini-3.1-pro-preview` (gemini-3-pro-preview was deprecated on 2026-03-09)

### extract-rules v1.9.0

- feat: Add `.examples.md` generation for Good/Bad code examples per rule category
  - Separate from rule files (no `paths:` frontmatter) — not auto-loaded into context
  - Good/Bad contrast for principles, usage examples for project-specific patterns
  - All modes support `.examples.md` (Full Extraction, Update, Restructure, Conversation, PR Review)
  - Format specification externalized to `references/examples-format.md`
  - Quality criteria added to `references/extraction-criteria.md`
- feat: Add `language` resolution chain: skill config → Claude Code settings → default `ja`
  - **Note**: Default changed from `(none)` (English) to `ja`. To keep English output, set `language: en` in config
- fix: `language` description updated to reflect usage in both reports and generated labels

### merge-rules v1.1.0

- feat: Add `.examples.md` merge support
  - Merge Principles Examples by section heading (adopt most detailed or merge Good/Bad)
  - Project-specific Examples linked to promoted patterns via semantic matching
  - Output under `## Common patterns Examples` section
- feat: Add hybrid format (`split_output: false`) input support
  - Detect `## Project-specific patterns` in `.md` files and treat as promotion candidates
- feat: Add `language` resolution chain: skill config → Claude Code settings → default `ja`
- fix: `promote_threshold` example corrected (`4 projects → 3/4`, not `2/4`)
- fix: Report template switched to English base with `language` setting support

## 2026-03-14

### extract-rules v1.8.0

- feat: Add `resolve_references` setting for `--restructure` mode
  - Scan existing rule files for references (Markdown links, text references, `@path`) and resolve them
  - Extract rules from referenced files and merge into the restructure pipeline
  - Referenced rules treated as existing rules (take priority on conflict)
  - Detailed processing steps externalized to `references/resolve-references.md`

### extract-rules v1.7.0

- feat: Reframe extraction criteria around "Claude's knowledge gap"
  - Core question changed from "Is this project-specific?" to "Would Claude produce something different without this rule?"
  - Anti-pattern extraction added (things Claude would naturally do that the team has rejected)
- feat: Add staleness check in `--update` mode
  - Verifies referenced symbols in `.local.md` still exist in codebase
  - Reports potentially stale rules for user review (no auto-deletion)
- feat: Add deduplication check against existing CLAUDE.md and `.claude/rules/`
  - Prevents extracting rules already documented elsewhere
- improve: Enhance `--from-conversation` mode
  - User corrections explicitly identified as highest-value signal
  - Guidance to run soon after corrections (before context compaction)

## 2026-03-13

### extract-rules v1.6.0

- feat: Add `--from-pr` mode to extract coding rules from PR review comments
  - Fetches inline review comments, general PR comments, and review bodies via `gh` CLI
  - Filters out bot comments automatically
  - Uses PR diff context for better pattern understanding
  - Supports both PR number (current repo) and GitHub URL (any repo)

## 2026-03-06

### extract-rules v1.5.0

- feat: Add integration library detection and separation
  - Detect integration libraries (Inertia, Pundit, Devise, Turbo, etc.) from dependency files
  - Separate integration-specific rules into `integrations/` directory (e.g., `integrations/rails-inertia.md`)
  - Distinguish between framework layers (inherent architecture) and integrations (optional libraries)
  - Framework name included in integration file names (rules differ by host framework)
  - Works with all modes: Full Extraction, Update, Restructure, Conversation Extraction

### merge-rules v1.0.0

- feat: New skill to merge extract-rules output from multiple projects
  - YAML config file for specifying source projects
  - Merges portable principles (.md) across projects with deduplication
  - Promotes .local.md patterns shared across 2/3+ of projects to common patterns
  - Outputs .md files only (no .local.md)
  - `--dry-run` option for preview without writing
  - Conflict detection and reporting

## 2026-03-03

### extract-rules v1.4.0

- feat: Add `--restructure` option for file structure reorganization with content merge
  - Re-analyzes codebase to determine optimal file structure
  - Merges existing rules into new structure (preserves manual edits and conversation-extracted rules)
  - Existing rules take priority over fresh extraction on conflict (respects manual edits)
  - Shows restructure plan for user confirmation before execution
  - Handles split_output mode transitions (hybrid ↔ split)
  - Unmatched rules fall back to project.md
- **breaking**: Change `split_output` default from `false` to `true` (Principles and Project-specific patterns are now separated by default)
- remove: `--force` option (use `rm -rf .claude/rules/ && /extract-rules` or `--restructure` instead)
- refactor: Extract report templates to `references/report-templates.md` (progressive disclosure)
- refactor: Simplify Restructure Mode steps (R1-R6 → R1-R5, concise descriptions)

## 2026-03-02

### extract-rules v1.3.0

- feat: Add `split_output` option for `.local.md` file separation (opt-in)
  - `split_output: false` (default): Single hybrid file per category (backwards compatible)
  - `split_output: true`: Principles → `<name>.md` (portable), Project-specific patterns → `<name>.local.md` (local)
  - Classification is mechanical: `## Principles` → shared file, `## Project-specific patterns` → local file
  - `project.md` is never split (inherently project-specific)
- feat: Add layered framework support (Rails, Django, Spring, etc.)
  - Detect architectural layers (e.g., models, controllers, views) when directories exist
  - Generate layer-specific files with scoped `paths:` (e.g., `rails-model.md`)
  - Cross-layer rules in `<framework>.md` (no `paths:` or broad scope)
- feat: Handle orphaned `.local.md` files when switching split modes
  - `--force`: Warns and deletes orphaned `.local.md` files
  - `--update`: Warns and recommends running `--force` to clean up
- refactor: Extract classification criteria to `references/extraction-criteria.md`
  - Progressive disclosure: metadata → SKILL.md body → bundled references
- refactor: Remove `Bash(grep *)` from allowed-tools (use Grep tool instead)
- docs: Enhanced skill description for better trigger matching

## 2026-02-25

### caffeinate v1.0.0

- feat: macOS caffeinate management plugin
  - Prevent idle/system sleep with `caffeinate -is`
  - PID file-based process management (unique per project)
  - start/stop/status modes (`/caffeinate`, `/caffeinate stop`)
  - Auto-stop on session end via SessionEnd hook

## 2026-02-21

### extract-rules v1.2.0

- feat: Add scope criterion to Concrete Example Criteria (Symbol + Scope dual filter)
  - Project-wide usage or convention-defining patterns only — skip local utilities
- feat: Change Decision criterion to inconsistency-based approach
  - "Would AI produce inconsistent results without knowing this pattern?"
- feat: Change Fallback rule from "include when uncertain" to "apply the scope criterion"
  - Rules should answer "how to write new code" not "what utilities exist"

## 2026-02-02

### ask-claude v1.1.2, ask-codex v1.1.2, ask-gemini v1.1.1, ask-copilot v1.0.1, security-scanner v1.2.1, extract-rules v1.1.1

- refactor: Update `allowed-tools` Bash syntax from legacy colon format to space format
  - Changed: `Bash(command:*)` → `Bash(command *)`
  - This follows the current recommended syntax per Claude Code official documentation
  - Affected skill files and command files
  - Updated documentation examples in `CLAUDE.md`, `.claude/rules/project.rules.md`, `docs/article-peer-plugin.md`

## 2026-01-29

### extract-rules v1.1.0

- feat: Add `--update` option to re-scan and add new patterns while preserving existing rules
- feat: Hybrid output format (Principles + Project-specific patterns)
- feat: Abstract principles with implementation hints for general style choices
- feat: Compact one-line format for project-specific patterns
- remove: `--dry-run` option (use git to revert if needed)
- docs: Add extraction criteria sections

## 2026-01-28

### extract-rules v1.0.0

- Initial release: Extract project-specific coding rules from codebase for AI agents
- `/extract-rules` command to analyze codebase and generate rule documentation
- `--force` option to overwrite existing rule files
- `--dry-run` option for analysis without file output
- `--from-conversation` option to extract rules from conversation history
- 11 extraction categories: naming, types, testing, error-handling, structure, imports, comments, architecture, domain, async-patterns, logging
- Language/framework-based organization for rule portability
- Configurable via `.claude/extract-rules.local.md`
- Output structure:
  - `languages/` - Language-specific rules (portable)
  - `frameworks/` - Framework-specific rules (portable)
  - `project/` - Project-specific rules (domain, architecture)

## 2026-01-26

### security-scanner v1.2.0

**Multi-agent support for skills scanning**

- feat: Add `target_agents` configuration to scan skills from multiple AI agents
- Supported agents: `claude`, `codex`, `gemini`, `agents` (Skills.sh/Amp)
- Default: `claude` only (backward compatible)
- note: For Skills.sh, configure `target_agents` appropriately to avoid redundant scanning
- feat: Add Agent column to report summary and findings
- feat: Add `report_language` configuration (default: `ja`)
- fix: Add `Bash(ls:*)` to allowed-tools for symlink directory listing
- Agent-specific skill paths:
  - claude: `.claude/skills/`, `~/.claude/skills/`
  - codex: `.codex/skills/`, `~/.codex/skills/`
  - gemini: `.gemini/skills/`, `~/.gemini/skills/`
  - agents: `.agents/skills/`, `~/.config/agents/skills/`, `~/.agents/skills/`

### translate v1.1.0

- feat: Add user-level configuration support (`~/.claude/translate.local.md`)
- Project-level settings take precedence over user-level
- Aligns with security-scanner configuration pattern

## 2026-01-25

### ask-copilot v1.0.0

- Initial release: Copilot CLI integration for getting a second opinion
- `/ask-copilot` skill to invoke `copilot` CLI

## 2026-01-24

### Repository restructure (anthropics/skills pattern)

- Adopt anthropics/skills pattern for skill-only items
- `skills/` is now canonical location (no duplication)
- Skill-only plugins use `source: "./"` + `skills` array to reference `skills/` directory
- Agent-dependent plugins (peer, translate) remain in `plugins/`
- Delete redundant `plugins/` directories: ask-claude, ask-codex, ask-gemini, security-scanner

**For existing users:** Refresh the marketplace to update to the new structure.

### Skills.sh support

- Add `skills/` directory for Skills.sh distribution
- Available skills: `ask-claude`, `ask-codex`, `ask-gemini`, `security-scanner`
- Install via: `npx skills add hiroro-work/claude-plugins`
- Note: Agent features (peer, translate) are only available via Claude Code Plugin Marketplace

### security-scanner v1.1.2

- feat: Add URL auto-detection for GitHub URLs (`--url` flag is now optional)

### security-scanner v1.1.1

- Remove `--plugins` and `--skills` options to simplify the skill (always scans both)

### security-scanner v1.1.0

**Renamed from plugin-security to security-scanner** to reflect expanded scope and clearer purpose.

- feat: Add `--url` option for scanning plugins from GitHub public repositories
- feat: Add skills scanning (`~/.claude/skills/`, `.claude/skills/`)
- Supports full GitHub URLs (e.g., `https://github.com/owner/repo/tree/main/plugins/my-plugin`)
- Supports non-plugin content: skill directories without plugin.json, single SKILL.md files
- Uses GitHub Contents API via WebFetch (no authentication required for public repos)
- Error handling for private repos, rate limits, and invalid paths
- Renamed: `/plugin-security` → `/security-scanner`
- Renamed: `.claude/plugin-security.local.md` → `.claude/security-scanner.local.md`
- Remove security-scanner agent (skill is self-contained with `allowed-tools`)

## 2026-01-20

### security-scanner v1.0.0 (formerly plugin-security)

- Initial release: Security scanner for Claude Code plugins
- `/security-scanner` command to scan all installed plugins
- `--user` option for user-level plugins only (`~/.claude/plugins/`)
- `--project` option for project-level plugins only (`.claude/plugins/`)
- `--all` option for full audit (ignore trusted sources and self-exclusion)
- AI semantic analysis to detect malicious code AND natural language instructions
- Detects: remote code execution, reverse shells, credential theft, data exfiltration, etc.
- Trusted sources configuration via `.claude/security-scanner.local.md`
- Self-exclusion with impersonation protection (`security-scanner@hiropon-plugins` only)
- Uses only Read, Glob, Grep tools (no command execution)

## 2026-01-15

### translate v1.0.0

- Initial release: AI-powered translation plugin using Claude subagents
- `/tr` command with haiku model (default)
- `--hq` option for high-quality translation using sonnet model
- `--fast` option to force standard translation using haiku model
- `--to` option for specifying target language
- `--from` option for specifying source language (skip auto-detection)
- Auto-detects Japanese/English translation direction
- Configurable defaults via `.claude/translate.local.md` (quality, languages)

## 2026-01-13

### ask-claude v1.1.1

- Update description to clarify it's for non-Claude AI agents (Codex, Gemini, etc.)

## 2025-12-28

### ask-codex v1.1.1

- Fix `allowed-tools` pattern from `Bash(codex exec:*)` to `Bash(codex:*)`

### ask-claude, ask-codex, ask-gemini v1.1.0

- Add `allowed-tools` to eliminate double permission prompts when using skills

## 2025-12-25

### Initial release v1.0.0

- `ask-claude` plugin: Claude CLI integration for getting a second opinion
- `ask-codex` plugin: Codex CLI integration for getting a second opinion
- `ask-gemini` plugin: Gemini CLI integration for getting a second opinion
- `peer` plugin: Claude subagent for peer review, planning discussions, and brainstorming
