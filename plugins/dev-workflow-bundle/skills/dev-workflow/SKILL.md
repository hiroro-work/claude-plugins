---
name: dev-workflow
description: Guided development workflow that orchestrates plan → review → implement → check/test → code review → rules update. Use this skill whenever the user wants to develop a feature, fix a bug, refactor code, or make any code changes following a structured process — even if they don't explicitly mention "workflow" and simply describe what they want built or fixed.
allowed-tools: Agent, Read, Write, Edit, Glob, Grep, TodoWrite, EnterPlanMode, ExitPlanMode, Skill(ask-peer), Skill(ask-claude), Skill(ask-codex), Skill(ask-gemini), Skill(ask-copilot), Skill(extract-rules), Skill(simplify), Skill(run-tests), Skill(rules-review), Bash(pwd), Bash(mkdir -p .claude/plans), Bash(rm .claude/plans/*), Bash(pnpm run *), Bash(pnpm exec *), Bash(npm run *), Bash(yarn run *), Bash(bun run *), Bash(bundle exec *), Bash(make lint *), Bash(make format *), Bash(make test *), Bash(make typecheck *), Bash(make check *), Bash(python -m pytest *), Bash(poetry run *), Bash(uv run *), Bash(cargo test *), Bash(cargo clippy *), Bash(cargo fmt *), Bash(go test *), Bash(go vet *), Bash(git diff *), Bash(git status *), Bash(git rev-parse *), Bash(test -f *), Bash(gh api --method POST /repos/*/issues *), Bash(gh auth status), Bash(jq *)
---

# Dev Workflow

## Usage

```text
/dev-workflow --init                             # Project setup (detect check/test commands)
/dev-workflow [-i N | --iterations N] <task>    # Execute workflow (default)
/dev-workflow --resume <state-file> [-i N]      # Resume next subtask from a decomposition state file
```

## Prerequisites

- **Reviewer skill** (`reviewer` setting, default: ask-peer): Required for plan/code review. Supported: ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot. If the configured skill is unavailable, ask user directly instead.
- **rules-review skill**: Required for rules compliance review (Step 7.5). If unavailable, skip Step 7.5 with message.
- **extract-rules skill**: Required for rule update. If unavailable, skip with message.

## Configuration

Settings files (YAML frontmatter only, merged across layers):
1. `~/.claude/dev-workflow.local.md` — User global defaults (lowest priority)
2. `.claude/dev-workflow.md` — Project shared settings (git tracked, team-shared)
3. `.claude/dev-workflow.local.md` — Personal overrides (gitignored, highest priority)

Merge strategy per key type:
- **Scalar** (`reviewer`, `review_iterations`, `task_decomposition`, `custom_instructions`, `language`): higher layer wins (replaces)
- **List** (`check_commands`): append — lower-layer items first, then higher-layer items, duplicates removed (keep first occurrence). `test_commands` is excluded from merge — always fixed to `["Skill(run-tests)"]`
- **`hooks`**: deep-merge at the `hooks` level — each sub-key (`on_complete`) is merged as a list (append, deduplicated)

Keys absent from a higher layer inherit from lower layers. Only specify keys you want to override or extend.

```yaml
---
reviewer: "ask-peer"
review_iterations: 3
task_decomposition: true
custom_instructions: "Always use TDD. Write tests before implementation."
language: "ja"
check_commands:
  - "pnpm run lint:fix"
  - "pnpm run format"
  - "pnpm run typecheck"
test_commands:
  - "Skill(run-tests)"
hooks:
  on_complete:
    - "Skill(work-complete)"
self_retrospective:
  feedback: "owner/repo"        # or "/abs/path", "~/rel", "./rel"
---
```

- **reviewer**: Reviewer skill name (default: `ask-peer`). Choose from: ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot. Unsupported values fall back to `ask-peer`
- **review_iterations**: Max iterations for Plan Review (Step 3) and Code Review (Step 8) (default: `3`, must be a positive integer). Can be overridden per invocation with `-i N` / `--iterations N`
- **task_decomposition**: Whether Step 1.5 runs the auto-decomposition check in Normal sub-mode (default: `true`). Set to `false` to treat Normal sub-mode requests (`/dev-workflow <task>`) as single tasks — Step 1.5 is omitted from TodoWrite and the decomposition judgment is skipped entirely. `--resume <state-file>` is unaffected and still executes existing state files. Non-boolean values fall back to `true` with a warning
- **custom_instructions**: Free-form development instructions applied as guiding principles across planning, implementation, review, and simplification (e.g., "Always use TDD", "Prefer functional style"). Optional. `.claude/rules/` and explicit user requests take precedence if they conflict
- **language**: Optional. Output language code (e.g. `ja`, `en`) for user-facing prose produced by this skill — Step 4 plan body (Overview / Decisions / Design / Test plan / Risks / Unknowns content), user-gate preambles (Step 4 / Step 7.5 / Step 8), Step 2 difficulty-assessment log, Completion summary, and Step 9.5 finding `Description` / `Suggested fix direction` paragraphs. Resolution: merged skill config → Claude Code settings (`~/.claude/settings.json` → `language` field) → default `ja`. `null` / empty string / non-string values fall through to the next resolution step. For the localization boundary between translated concepts and verbatim identifiers, see [`references/plan-format.md`](references/plan-format.md) § Localization granularity. See `references/self-retrospective.md` §2.1 Language handling / §5 Contract note for the Step 9.5 scope contract. No Step 9.5 output unless `self_retrospective.feedback` is also configured AND the task is not assessed as Simple difficulty
- **check_commands**: Static checks (lint, format, typecheck, etc.). Always run all in order
- **test_commands**: Always `["Skill(run-tests)"]`. The `run-tests` skill is generated by `--init` and handles test execution via subagent (see Step 7). Run `--init` to generate or update the skill
- **hooks**: Execute skills/commands at specific workflow timing points
  - **on_complete**: Runs after Step 9. Entry format: `Skill(<name>)` or shell command string
  - Entries not covered by allowed-tools require user approval
- **self_retrospective**: Optional. Emits sanitized improvement signal for the `dev-workflow-bundle` skills (`dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`) at Step 9.5 (between Step 9 and Step 10). Raw conversation stays in-session; only abstracted text leaves
  - **feedback**: Destination string. Auto-detected:
    - Starts with `/`, `~/`, `./`, or `../` → local directory path → retrospective written as a markdown file under that directory
    - Matches `^[\w.-]+/[\w.-]+$` → GitHub `owner/repo` → retrospective submitted via `gh api` POST to `/repos/<feedback>/issues`
    - Any other string (including empty) → warn and skip Step 9.5
  - If `feedback` is unset, Step 9.5 is not registered in TodoWrite and never executes — the workflow behaves as before
  - Step 9.5 is also hard-skipped when Step 2 assesses the task as **Simple** difficulty (typo fix, config tweak, obvious bug fix), regardless of config — Simple tasks rarely produce meaningful bundle-skill signal
  - **`Agent` tool usage**: Step 9.5 is the only step in this skill that directly spawns a subagent via the `Agent` tool (for jsonl scan + sanitization). Other steps delegate to named skills (`Skill(ask-peer)`, `Skill(run-tests)`, `Skill(rules-review)`, `Skill(simplify)`, etc.), never to `Agent` directly. Do not invoke `Agent` from any other step.

## Mode Detection

- `--init` → Init Mode (`-i` / `--iterations` is ignored)
- `--resume <state-file>` → Execution Mode (Resume sub-mode; see Step 1.5)
- Otherwise → Execution Mode (Normal sub-mode)

---

## Init Mode

Read `references/init-mode.md` and follow the procedure.

> **Note**: Skills generated by `--init` (e.g. `run-tests`) are recognized from the next session onward. Do not run `/dev-workflow <task>` in the same session as `--init`.

---

## Execution Mode

### No-Stall Principle

Once the workflow has started (after Step 1.5 resolves the effective task), it must run to Completion without pausing, **except at the explicit user-gate points enumerated below**. Every other step — including every skill invocation, every no-op outcome, every "nothing to report" result — must be judged semantically by the agent and passed through automatically. Do not rely on exact-phrase matching; if the skill result reads as a successful completion (fixes applied, no changes needed, no violations, no new rules, or any equivalent "success / no-op" outcome regardless of wording), treat it as success and proceed to the next step.

**Explicit user-gates (the only permissible pause points):**

Each bullet names the gate and points to the authoritative definition site. When editing either the enumeration or the definition, update both together.

- **Step 1.5 task-decomposition proposal dialogue** — `yes / adjust / no` confirmation (Normal sub-mode; defined in Step 1.5 dispatch and `references/task-decomposition.md` § B. Normal sub-mode)
- **Step 1.5 leftover-subtask picker dialogue** — selecting which subtask to run when more than one leftover `in_progress` subtask is runnable (Resume sub-mode; defined in `references/task-decomposition.md` § A. Resume sub-mode)
- **Step 4 plan approval** (defined in Step 4: Finalize Plan)
- **Step 7 scope-drift stop** — when `check_commands` writes files outside the task-scope snapshot: warn and wait for user direction (defined in Step 7: Check / Test)
- **Step 7 check/test fail-stop** — failure after 3 retries: report the error and stop (defined in Step 7: Check / Test). Note: this is an error-stop, not a pause for user decision
- **Step 7.5 persistent-violations decision** — rule violations still present after the 2nd review cycle (defined in Step 7.5: Rules Compliance Review)
- **Step 8 unresolved-findings decision** — reviewer-reported actionable findings still unresolved after the N-th iteration (defined in Step 8: Code Review)
- **Completion subtask PR URL prompt** — when executing a decomposed subtask, ask for optional PR URL before resuming (defined in Completion)

**Fatal errors are out of scope for this principle**: configuration-file absence, malformed state file, irrecoverable skill / tool failures, and similar infrastructure-level errors halt the workflow with a diagnostic regardless of whether they appear in the list above. The No-Stall Principle governs *successful* step outcomes (including no-op successes); it does not force the agent to push through genuine errors.

At any point not listed above — including after `Skill(simplify)`, `Skill(rules-review)`, `Skill(extract-rules)`, `Skill(run-tests)`, and reviewer skills return — the agent must never wait for the user to say "continue" / "続けて". Semantic judgment of the returned result is sufficient.

### Step 1: Load Settings

1. Read settings from up to three layers and merge (type-aware):
   ```
   merged = {}
   if ~/.claude/dev-workflow.local.md exists:  overlay its frontmatter onto merged
   if .claude/dev-workflow.md exists:          overlay its frontmatter onto merged
   if .claude/dev-workflow.local.md exists:    overlay its frontmatter onto merged
   ```
   "Overlay" = for each key present in the file:
   - Scalar keys: `merged[key] = file[key]` (replace)
   - List keys (`check_commands`): append `file[key]` items after `merged[key]`, then deduplicate (keep first occurrence)
   - `hooks`: deep-merge — for each sub-key (e.g. `on_complete`), append and deduplicate the list
   - `null` or empty (`[]`, `{}`) explicitly clears the key — lower-layer value is discarded, not inherited
   - Key absent from the file: left untouched (inherit from lower layers)
   If a file's YAML frontmatter is malformed (parse error), warn the user naming the file, skip that layer, and continue with remaining layers.
2. If none of the three files exist, prompt user to run `/dev-workflow --init` and stop
3. Resolve `reviewer` from config. If not specified or not in the supported list (ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot), use `ask-peer`
4. Resolve **N** (review iteration count):
   1. If `-i` / `--iterations` option is present and is a positive integer, use it
   2. Else if config `review_iterations` is present and is a positive integer, use it
   3. Else use default `3`
5. Parse `hooks` from config. Warn and ignore if `hooks.on_complete` has invalid format. Parse `custom_instructions` from config (optional, string). Warn and ignore if not a string. Parse `task_decomposition` from config (optional, boolean, default `true`). Warn and fall back to `true` if present but not a boolean. Parse `language` from config per the Configuration bullet above. For `~/.claude/settings.json`, silently accept missing file / absent key / `null` value; warn once per Step 1 settings-load pass on malformed JSON, non-string, or empty string. The resolved language is available to Step 9.5. Parse `self_retrospective.feedback` from config (optional, string). Warn and ignore if not a string or if empty string `""`. When `feedback` matches the `owner/repo` pattern (`^[\w.-]+/[\w.-]+$`), additionally run `gh auth status` as an early warning only — if auth fails, warn but do not block the run
6. Determine execution sub-mode: **Resume** if `--resume <state-file>` was provided, otherwise **Normal**. Step 1.5 branches on this
7. Register all workflow phases with `TodoWrite`, including review iterations. Do NOT skip any phase:
   - **Step 1.5: Task Decomposition** (Normal sub-mode only, AND only when `task_decomposition` is `true` — omit this entry entirely in Resume sub-mode or when `task_decomposition` is `false`, since in either case the step has nothing to do at registration time)
   - Step 2: Create Plan
   - Step 3: Plan Review
   - Step 3-1 through Step 3-N: Plan Review - iteration 1 through N (generate N items based on resolved N)
   - Step 4: Finalize Plan
   - Step 5: Implement
   - Step 6: Simplify
   - Step 7: Check / Test [check: {check_commands} | test: {test_commands}]
   - Step 7.5: Rules Compliance Review
   - Step 8: Code Review
   - Step 8-1 through Step 8-N: Code Review - iteration 1 through N (generate N items based on resolved N)
   - Step 9: Update Rules
   - Step 9.5: Self-Retrospective (only if `self_retrospective.feedback` is set and parses as a valid destination — see Step 9.5 for detection rules; if unset/invalid, omit this entry)
   - Step 10: Completion Hooks (only if `hooks.on_complete` is configured)
   Mark each item `in_progress` when starting and `completed` when done. Registering all phases upfront gives the user visibility into overall progress and prevents steps from being accidentally dropped. Implementation sub-tasks in Step 5 are additions, not replacements.
   Note: Unless `-i` / `--iterations` was explicitly specified, Step 2 may reduce N based on task difficulty.

### Step 1.5: Task Decomposition

This step decides whether the user's request should be split into multiple smaller subtasks (each delivered as its own PR), or — in Resume sub-mode — picks the next subtask from an existing state file under `.claude/plans/dev-workflow.<slug>.md`.

State-file semantics are critical (a malformed or mis-routed file silently corrupts subtask boundaries), so the full procedure lives in a dedicated reference. **Dispatch**:

- **Resume sub-mode** (`--resume <state-file>` was provided): read [`references/task-decomposition.md`](references/task-decomposition.md) and follow **section A. Resume sub-mode** from top to bottom.
- **Normal sub-mode + `task_decomposition: true`** (the default): read [`references/task-decomposition.md`](references/task-decomposition.md) and follow **section B. Normal sub-mode**.
- **Normal sub-mode + `task_decomposition: false`**: no decomposition work. Set the "effective task" to the original request and proceed to Step 2 without creating a state file. Step 1.5 is not in TodoWrite in this case (see Step 1), so there is nothing to mark `completed`. You do not need to read the reference file.

`EnterPlanMode` is reserved for Step 2 — any decomposition proposal in Step 1.5 is a plain yes/no dialogue, not a plan.

After section A or B completes, the "effective task" is set for Step 2 onward: the selected subtask when decomposed, otherwise the original request.

### Step 2: Create Plan

1. Record the current commit as base-commit (`git rev-parse HEAD`) for later diff comparison
2. `EnterPlanMode`
3. Analyze the task and codebase, create implementation plan. Apply `custom_instructions` to shape plan priorities and structure. Follow the structure defined in [`references/plan-format.md`](references/plan-format.md) — Overview / Decisions / Design / Test plan required; Risks / Unknowns optional. Section-level content rules live in the reference file; do not re-derive them here.
   - **If a state file exists** (this run is executing one subtask of a decomposed parent): the "effective task" = the current `in_progress` subtask. Frame the plan around **just this subtask** while keeping the full parent task and other subtasks as background context so the plan stays consistent with the overall direction. Do not plan work belonging to other subtasks. See [`references/plan-format.md`](references/plan-format.md) § Subtask / Resume handling for how Decisions is scoped in this case
   - **Version/identifier string replacement tasks**: if the core operation is replacing a specific version string, identifier, or constant across the project (e.g. version bump, rename, migration), grep the entire repository for the old value before drafting the plan. Include the complete list of affected files in the Design section — missing even one location is the primary regression source for this task class
4. **Simplicity self-audit**: Before proceeding to Step 3, audit the plan:
   - Each plan element must be traceable to one of: (a) an explicit user requirement, (b) a known bug or constraint, or (c) a documented project rule under `.claude/rules/`. "Future-proofing", "UX polish", "consistency with other projects", or "might be useful later" are not sufficient triggers on their own.
   - **Inherited spec files** (`.claude/plans/*.md` — full-spec drafts, archived plans, or AI-authored details within a task-decomposition state file): treat the content as a prior-session draft, not as confirmed user requirements. Cross-check each inherited design decision against the user's original ask surfaced by Step 1.5 / the user message — prior-session elaboration is the most common source of scope creep.
     - **Exception — task-decomposition state files**: subtask boundaries, order, `depends_on`, and purposes were user-approved in a prior Step 1.5 and must be honored as-is. Only AI-authored descriptions, verification hints, and design elaborations within each subtask are draft.
   - **Root-cause provenance check**: if the plan leans on a root-cause claim from an AI-authored prior-session artifact, re-derive the root cause from the user's original ask before treating it as load-bearing. User-confirmed root causes are exempt.
   - **Plan-level incrementality**: check whether the plan splits into independently verifiable units (e.g. hotfix vs refactor). If yes, propose the split now rather than deferring to Step 3 plan review — PR-level splits restart via Step 1.5, intra-PR splits become staged commits (same dispatch as Step 3's Incrementality review category).
   - **Cross-component pattern alignment**: when the plan touches a structural pattern shared across sibling components (shared base classes, cross-cutting middleware, return/API contracts, mirrored services, parallel route handlers — for skill development this includes subagent dispatch shape, hook wiring, state-file handling, return-contract design), audit three alignment directions. (i) Propagating a fix outward — if the plan fixes a structural defect in one component, check whether siblings sharing the structure carry the same defect; either expand the plan's scope to cover them or add an explicit Risks entry deferring them with a one-line rationale (silently scoping a structural fix to one component leaves the same defect in the others). (ii) Aligning a new component inward — if the plan adds a new component alongside an existing sibling group, decide explicitly in Decisions whether to follow the siblings' shared shape (iteration-loop form, responsibility-split unit, return-contract form — for skill development this includes the iteration-loop vs. single-dispatch choice and the detection-vs-apply split) or intentionally diverge. (iii) Intra-patch self-duplication — if the plan itself lands the same processing pattern (shared validators, common error handling, mirrored formatting / serialization logic) at multiple call sites within this single change, treat those sites as siblings under (i): a defect at one site is likely present at the others, and a fix to one site must be applied to the rest of the same-pattern sites within the patch (for skill development this includes producer / consumer applying the same JSON parse / fallback pattern, or rolling out the same return-contract shape across multiple callees). Any of the three directions missing from Decisions tends to surface late as Step 3 reviewer pushback or Step 4 user pushback.
   - **Consistency-with-siblings as primary rationale**: when a plan element's primary rationale is "align with existing sibling implementations / for consistency" alone (i.e. not directly traceable to (a) explicit user requirement, (b) known bug or constraint, or (c) documented project rule), surface lighter alternatives alongside the consistency choice in Decisions — for example a scope-narrowed single-pass implementation, a hybrid that gates auto-application on specific conditions, or a detection-only design that delegates application to the caller (for skill development this includes single-dispatch detection-only, category-gated auto-apply, or the iteration-loop choice). When `consistency-with-siblings` is chosen, additionally record in one line the cost of taking a different shape from the siblings, so Step 3 reviewers and Step 4 user approval see the trade-off explicitly.
   - For each element that fails the audit, either (i) drop it from the plan, or (ii) add an explicit one-line rationale tying it to a concrete trigger (user requirement / bug / rule).
5. **Plan self-check**: Run the checklist in [`references/plan-format.md`](references/plan-format.md) § Step 2 self-check against the plan. This is the author's first-pass judgment on Decisions content; fix any failures before Step 3.
6. **No code changes in this phase**
7. **Adjust N by difficulty** (skip if `-i` / `--iterations` was explicitly specified): A typo fix doesn't need 3 rounds of review. Based on the plan just created, assess task difficulty and reduce N to avoid unnecessary iterations — the configured value is a ceiling, not a target:
   - **Simple** (typo fix, config tweak, straightforward bug fix with obvious solution): N = 1 — **unless** the change touches an external library's config file or type-level API AND that library had a recent major-version bump (primary check: `git diff <base-commit>` of the package manifest; if absent in this run, judge from other context since the bump may predate this run); then classify as at least Moderate. Similar qualitative risks (external config-DSL rewrites, etc.) follow the same rule. Purely cosmetic edits (comments, whitespace, auto-formatting) do not trigger the exception — use judgment
   - **Moderate** (multi-file within one module, feature following existing patterns): N = min(2, N)
   - **Complex** (cross-module, new patterns, API changes, significant refactoring): keep N
   File count is a hint, not the sole criterion. If adjusted, mark excess TodoWrite iteration items (Step 3-x and Step 8-x) as `completed`. Log the assessed difficulty and effective N in the resolved `language` (see §Configuration; default `ja`). If the difficulty is **Simple** and the Step 9.5 TodoWrite row exists (i.e. `self_retrospective.feedback` is configured), additionally mark that row as `completed` with note `skipped: Simple task`.
8. Do not present the plan to the user or ask for approval/confirmation — presenting an unreviewed plan wastes user time and risks approval of a suboptimal approach. This prohibition extends to confirmation-seeking transition sentences such as "if this design looks good, I'll proceed to Step 3 (Plan Review)", "shall I move on to Plan Review?", or any equivalent ask-for-go-ahead phrasing — these read as natural conversation but constitute the same approval-gate that wastes user attention on an unreviewed plan. The moment Step 2 ends, advance directly to Step 3 without emitting any user-facing message about the plan or the transition. The user will see the reviewed plan in Step 4.

### Step 3: Plan Review

This step is an internal review — the reviewer refines the plan before the user sees it, so the user receives a higher-quality plan in Step 4. Do not present the plan to the user or ask for feedback during this step.

Mark `Step 3: Plan Review` as `in_progress`. Process each pending iteration item (Step 3-1 through 3-N) in order:

1. Mark the iteration item as `in_progress`. Call the reviewer skill resolved in Step 1 (e.g. `Skill(ask-peer)`): Review the plan.
   - Instruct reviewer to read all files under `.claude/rules/` for project conventions, and [`references/plan-format.md`](references/plan-format.md) for the Decisions (a)+(b) criterion and § Step 3 (f) content-quality rubric
   - Request feedback organized into six categories:
     a. **Scope & feasibility**: verify the author's Step 2 simplicity self-audit (each plan element should already tie back to an explicit user requirement, known bug, or documented rule — flag only elements where the rationale is weak, missing, or looks like speculative "future-proofing" or unnecessary abstraction), dependencies, risks, `.claude/rules/` compliance. **Runtime/language major version upgrades**: if the plan proposes upgrading the base runtime or language major version, verify that all pinned dependencies (runtime and dev) explicitly cover the new version — any dependency whose supported range does not include the new version must be flagged, and the plan must adopt the most conservative version all pinned dependencies safely support rather than leaving compatibility gaps for the user to catch at Step 4. **Shell content portability**: if the plan contains shell commands or shell snippets (build scripts, CI commands, cross-OS scripts — for skill development this includes `Bash` examples in SKILL.md, `allowed-tools` glob patterns, and hook scripts), verify portability across runtime environments — quoting, expansion of variables and globs, special-character handling, and shell-flavor differences (e.g. zsh `nomatch` failing on unquoted globs that match nothing, bash vs. POSIX feature drift). Local shells may pass while CI or a different distribution fails — surface the compatibility check at plan time rather than catching it at Step 7
     b. **Approach & alternatives**: simpler methods, architectural fit with existing code
     c. **Completeness**: edge cases, error handling, test plan adequacy (verify specific test files are identified and existing related tests are covered for update)
     d. **Incrementality**: can this plan be split into smaller, independently verifiable units (e.g. hotfix vs refactor)? Step 1.5 checked at request level; this is the plan-level check — concrete plans often bundle independent work even when the task looks single-concern. If splittable, propose the split and order. For PR-level splits (distinct verification / rollback / regression attribution), recommend restarting via Step 1.5; for intra-PR splits, recommend staged commits
     e. **External library primary-source verification**: if the plan adopts or adjusts usage of an **external library's** API, configuration DSL, configuration file, enabled options, or type-level behavior (interpret broadly within that scope — plugin activation and option tweaks count, not just direct API calls; but **project-internal configuration decisions that happen to sit in a library's config file — e.g. toggling a style preference like tsconfig `strict` — are out of scope for this category**, since they carry no library-version-compatibility risk), treat in-project references (`.examples.md`, `.local.md`, existing implementations) as secondary since they can go stale after a dependency upgrade. Require the plan to cite at least one primary source — the language's most authoritative installed source (installed type definitions, package source, official reference docs). If the primary source cannot be consulted in this environment (missing installed deps, no web access), flag the item explicitly as a stale-API concern in the plan rather than silently trusting secondary material
     f. **Presentation & attention allocation (content quality)**: external re-check of the Decisions section's content — verify each item genuinely passes the (a)+(b) criterion, surface any judgment call buried in Design that should have been in Decisions, and check cross-section consistency (Overview Scope ↔ Design, Test plan ↔ Design, Decisions ↔ Design). Full rubric in [`references/plan-format.md`](references/plan-format.md) § Step 3 (f) content-quality rubric
   - If `custom_instructions` is configured, include the instructions text in the review request and have the reviewer verify alignment and report conflicts
   - Reviewer should only report actionable findings. If none, explicitly state "No actionable findings"
2. Judge the reviewer's response semantically: if the reviewer reports nothing actionable — no actionable findings, no improvements to apply, no review points raised, or any other "nothing to report" outcome regardless of exact wording — mark this and remaining iteration items as `completed` (skip). Mark `Step 3: Plan Review` as `completed` and proceed to Step 4 automatically. Per the No-Stall Principle, do not wait for user input and do not rely on exact-phrase matching; trust semantic judgment since the reviewer skill's phrasing varies (especially `Skill(ask-peer)` and other free-form-prose reviewers whose verdicts are natural-language Markdown rather than a fixed token).
3. Otherwise: autonomously apply improvements or reject inapplicable points with reason — do not ask the user for judgment on individual review findings. Mark this iteration item as `completed`.
   - **Prose-integrity self-check (post-fix)**: after applying a fix that edits plan prose adjacent to its target line (Decisions / Design / Test plan / Risks / Unknowns paragraphs), re-read the surrounding paragraph as a single unit before continuing — verify no sentence is cut mid-word, no logical connective is broken (the connectives `however` / `therefore` / `because` / `but` / etc. still anchor real clauses), and the paragraph's overall logic still holds. Mechanical fix patches see only the line-level diff and routinely leave the surrounding prose semantically broken in ways the next iteration's reviewer flags as a Major finding, costing an extra iter.
   - If the plan was modified: continue to the next pending iteration item (back to step 1). Plan modifications often introduce new gaps or ripple effects that the previous reviewer had no chance to see — the re-review round-trip is cheap compared to shipping a plan that looks fine to the author but has an unvetted section. Don't short-circuit even when the fixes feel airtight
   - If all points were rejected (no modifications): mark remaining iteration items as `completed` (skip — there is nothing new for the next reviewer to look at)
   Continue to the next pending iteration item with:
   - the updated plan
   - a summary of changes made and rejections with reasons
   - the same six-category structure (a–f), `.claude/rules/` reference, and "No actionable findings" requirement

   **Return-point no-stall reminder**: At each iteration boundary (regardless of reviewer outcome — findings reported, "No actionable findings", any non-error result), the next action — the next iteration's reviewer dispatch when more iteration items remain, or the Step 4 transition when this was the last iteration or "No actionable findings" was returned — must be issued in the **next tool call**. Do not insert an interstitial summary or acknowledgment turn between iterations; the abstract enumeration in `§ No-Stall Principle` is intentionally duplicated here so the rule fires at the decision moment.
4. If all N iteration items are completed and actionable feedback still remains, carry the unresolved points forward to Step 4.

Mark `Step 3: Plan Review` as `completed`.

### Step 4: Finalize Plan (USER APPROVAL GATE)

1. Before presenting, verify via `TodoWrite` that `Step 3: Plan Review` and every Step 3-x iteration item are `completed` — `ExitPlanMode` is the effective exit from Plan Mode, so issuing it while any Step 3 item is still `pending` or `in_progress` skips the internal review entirely. If any Step 3 item is not `completed`, return to Step 3 to process it (do not flip the row to `completed` without doing the review work).
2. **This is the first time the user sees the plan.** Present the reviewed plan to the user (include any unresolved review points from Step 3). Follow the presentation order in [`references/plan-format.md`](references/plan-format.md) § Step 4 presentation order — render in this order:
   a. `## Plan` header as a visual boundary.
   b. Full plan body in template order (Overview, Decisions, Design, Test plan, Risks/Unknowns if present) — rendered in full following [`references/plan-format.md`](references/plan-format.md) § Localization granularity in the resolved `language` (see §Configuration; default `ja`). Section headings render at `###` level (one below the `## Plan` container); sub-sections (Title, Goal, Scope, Decision N, Implementation, etc.) at `####`.
   c. Horizontal rule (`---`) separator.
   d. Summary preamble per [`references/plan-format.md`](references/plan-format.md) § User-gate summary preamble.
   e. Guidance line per [`references/plan-format.md`](references/plan-format.md) § Step 4 guidance lines (verbatim, no paraphrasing, no concatenation).
   f. **Call `ExitPlanMode` in the same turn, immediately after the guidance line.** `ExitPlanMode` triggers the approval modal — if it is not called, the user sees the plan text but has no way to approve. Delaying `ExitPlanMode` to a subsequent turn is the primary cause of Step 4 appearing stalled.

   Section headings (`Overview` / `Decisions` / `Design` / `Test plan` / `Risks` / `Unknowns`) and the Step 4 guidance line stay English.
3. Collaborate with the user to refine the plan as needed (normal Plan Mode interaction). If the user requests material changes to scope or approach, add a new review iteration item (e.g. Step 3-(N+1)) and return to Step 3 to process it before re-presenting. After the user accepts, begin implementation.

### Step 5: Implement

1. Follow the plan, track progress with `TodoWrite`. Apply `custom_instructions` throughout implementation
2. **Respect prior in-session edits**: content the user explicitly removed earlier in this session (comments, guards, logs) must not reappear. Treat deletion as authoritative, not as a gap to fill. This discipline applies when applying plan steps, when applying Step 6 simplify output, and when applying Step 8 review fixes — the reviewer/simplify subagents only see the diff and cannot enforce this themselves

### Step 6: Simplify

Implementation often introduces unnecessary complexity that's easier to spot in a dedicated pass after the code works.

1. `Skill(simplify)`: Review changed code for reuse, quality, and efficiency, then fix any issues found. Pass `custom_instructions` as constraints for simplification
2. Regardless of the outcome — whether `simplify` applied fixes, reported nothing to simplify, or returned any other non-error result — mark `Step 6: Simplify` as `completed` and proceed to Step 7 automatically. Per the No-Stall Principle, do not wait for user input.
3. **If `Skill(simplify)` result is not observable** (e.g. context compaction occurred during or immediately after the call): inspect `git diff <base-commit>`. If the diff contains changes clearly attributable to a simplification pass, treat simplify as completed and proceed to Step 7. Otherwise (no simplify-attributed changes visible, or ambiguous), re-execute `Skill(simplify)` once — inspection-and-fix-class skills are idempotent — then proceed to Step 7.

### Step 7: Check / Test (max 3 retries)

1. Run `check_commands` in order (always run all)
   - On failure, fix and retry (do not proceed to test execution)
   - **Scope-drift guard**: before each command, record `git diff --name-only <base-commit>` as the **task-scope snapshot** (the file set scoped to this task at the start of Step 7). After the command, re-check — any file newly appearing outside that snapshot was written by the command (auto-fix/write behavior sweeping unrelated drift). If scope drift is detected: warn the user (list both the in-scope files and the newly-appeared out-of-scope files), do **not** auto-revert / `git checkout` / delete the out-of-scope changes (leave the working tree as the command left it for user inspection), leave `Step 7: Check / Test` as `in_progress`, and wait for user direction. This is a step-internal stop directive — the only allowed non-completing exit from the check_commands phase — and is consistent with the No-Stall Principle, which permits explicit step-defined stops
2. Run `Skill(run-tests)` with `--base-commit <sha>` (from Step 2) via `$ARGUMENTS`
   - The skill handles scope decision and test execution internally via subagent
   - Returns structured summary: SUCCESS / TEST_FAILED / EXECUTION_ERROR
3. After 3 retries, report to user and stop

> **Coverage note (TypeScript multi-tsconfig)**: For projects with Project References or multiple `tsconfig*.json` files, a single `tsc --noEmit` may miss changed files that belong to other tsconfigs. `--init` auto-registers a per-tsconfig `tsc -p <path> --noEmit` in this case (see `references/init-mode.md` for detection rules). If coverage still looks incomplete, re-run `--init` or append the missing command manually.

> **GATE**: Verify Steps 2-7 are completed (check TodoWrite status; if status is inconsistent, verify actual completion by reviewing work done). Mark Step 7.5 as `in_progress`.

### Step 7.5: Rules Compliance Review

Dedicated rules compliance check, separate from code review (Step 8). This ensures rule enforcement gets focused attention rather than competing with correctness and design concerns.

1. `Skill(rules-review)` with `--base-commit <sha>` (base-commit recorded in Step 2) via `$ARGUMENTS`
2. Judge the result semantically: if the skill reports that there is nothing to act on — no actionable violations, no changed files, no applicable rules, no rule files found, or any other "nothing to report" outcome regardless of exact wording — mark `Step 7.5: Rules Compliance Review` as `completed` and proceed to Step 8 automatically. Per the No-Stall Principle, do not wait for user input and do not rely on exact-phrase matching; trust semantic judgment since the skill's phrasing may evolve across versions.
3. If violations found:
   a. Fix all reported violations
   b. Re-run Step 7 (Check / Test) to ensure fixes did not break anything
   c. Re-run `Skill(rules-review)` with `--base-commit <sha>` for verification (2nd cycle). Apply the same semantic judgment as step 2: if the re-run reports nothing actionable, mark `Step 7.5: Rules Compliance Review` as `completed` and proceed to Step 8 automatically (per the No-Stall Principle). When a 2nd-cycle verdict differs from the 1st on a specific location (a previously-flagged item now passes, or a previously-clean location is now flagged), record the reason inline in the Step 7.5 user-facing summary presented to the user (1–2 lines per drifted location: which location, 1st-cycle verdict, 2nd-cycle verdict, why) before completing — judgment drift between cycles is acceptable but must be explained, otherwise repeat-cycle stability cannot be assessed.
   d. If violations still persist after the 2nd review cycle, present remaining violations to user for decision. Above the violations list, emit a summary preamble per [`references/plan-format.md`](references/plan-format.md) § User-gate summary preamble. Render the violations following [`references/plan-format.md`](references/plan-format.md) § Localization granularity in the resolved `language`. Wait for user response before marking completed. (This is one of the explicit user-gates enumerated in the No-Stall Principle.)

Mark `Step 7.5: Rules Compliance Review` as `completed` only after all violations are resolved or user has decided on remaining violations.

> **GATE**: Verify Steps 2-7.5 are completed (check TodoWrite status; if status is inconsistent, verify actual completion by reviewing work done). Mark Step 8 as `in_progress`.

### Step 8: Code Review

Code review catches bugs, convention violations, and design issues that tests alone miss — skipping it risks shipping preventable defects. Always run this step even when tests pass cleanly.

Mark `Step 8: Code Review` as `in_progress`. Process each pending iteration item (Step 8-1 through 8-N) in order:

1. Mark the iteration item as `in_progress`. Call the reviewer skill resolved in Step 1 (e.g. `Skill(ask-peer)`): Review code changes.
   - Include `git diff <base-commit>` (base-commit recorded in Step 2) to capture all changes since workflow start
   - Thorough rules compliance has been verified in Step 7.5, but instruct reviewer to also flag any obvious `.claude/rules/` violations as a safety net — especially for code modified after Step 7.5
   - Request feedback organized into three categories:
     a. **Correctness & edge cases**: bugs, error handling gaps, race conditions, missing validations, missing or insufficient tests for changes (verify planned test files from Step 2 are present in the diff)
     b. **Conventions & consistency**: naming, file structure, patterns, `.claude/rules/` compliance (lightweight check — Step 7.5 handles the thorough review). Comments: treat narration (line-by-line paraphrase) and preamble (restating surrounding context) as delete-candidates, not as gaps to expand with more rationale
     c. **Simplicity & maintainability**: unnecessary complexity, duplication, unclear abstractions, speculative features without explicit trigger (functionality beyond what the stated requirement needs — flag for removal). Specifically: defensive hardening of already-safe paths, future-proofing for hypothetical double-calls, double-coverage over paths already protected elsewhere. **Simplify-revival check** (iter k ≥ 1 when Step 6 ran earlier in this session; iter k ≥ 2 otherwise): also verify that fixes applied in the previous iteration have not re-introduced narration, preamble, or redundant prose that an earlier Step 6 Simplify pass deliberately removed — fix patches see only the current diff and can silently undo Simplify's deletions across iterations
   - If `custom_instructions` is configured, include the instructions text in the review request and have the reviewer verify compliance and report conflicts
   - Reviewer should only report actionable findings. If none, explicitly state "No actionable findings"
2. Judge the reviewer's response semantically: if the reviewer reports nothing actionable — no actionable findings, no bugs / convention violations / design issues raised, or any other "nothing to report" outcome regardless of exact wording — mark this and remaining iteration items as `completed` (skip). Mark `Step 8: Code Review` as `completed` and proceed to Step 9 automatically. Per the No-Stall Principle, do not wait for user input and do not rely on exact-phrase matching; trust semantic judgment since the reviewer skill's phrasing varies (especially `Skill(ask-peer)` and other free-form-prose reviewers whose verdicts are natural-language Markdown rather than a fixed token).
3. Otherwise: autonomously fix genuine issues or reject inapplicable points with reason — do not ask the user for judgment on individual review findings. Mark this iteration item as `completed`.
   - **Class-level extension audit (post-Critical/Major-fix)**: immediately after applying a fix for a Critical-severity finding, or a Major-severity finding whose fix addresses a structural pattern (external I/O boundary conditions, closed enum / form-set networks, shared helper / safety-rail callers, parallel route handlers — for skill development: subagent return-value schemas, shared handler fallback paths, mirrored form-set network audits), and before the modified-vs-rejected branches below, scan the rest of the diff for **other instances of the same defect class** — same operation, same broken assumption, same side-effect pattern (e.g. shared-resource-destroying API call sequences, direct processing of unverified input, race conditions). Reviewer feedback typically names one instance; the underlying class often spans the diff (cross-construct propagation, shared safety-rail callers, parallel route handlers, etc.). Apply the same fix direction to additional matches found here, then continue to the modified-vs-rejected branch.
   - **Prose-integrity self-check (post-fix)**: after applying a fix that edits prose adjacent to its target line (comments, docstrings, paragraph-level documentation — for skill development this includes SKILL.md and `references/*.md` content), re-read the surrounding paragraph as a single unit before continuing — verify no sentence is cut mid-word, no logical connective is broken (the connectives `however` / `therefore` / `because` / `but` / etc. still anchor real clauses), and the paragraph's overall logic still holds. Mechanical fix patches see only the line-level diff and routinely leave the surrounding prose semantically broken in ways the next iteration's reviewer flags as a Major finding, costing an extra iter.
   - If code was modified: re-run Step 7 and Step 7.5 (with same base-commit from Step 2), then continue to the next pending iteration item (back to step 1). Code fixes routinely introduce fresh bugs, tighten one place while loosening another, or miss a caller the author didn't know about — the next review round is how those leaks get caught. **Always re-run Step 7 and Step 7.5 — no exceptions.** Do not short-circuit on any rationalization: not on confidence in the fix, not because the diff is small, not because the modified files appear out of scope for the configured `check_commands` / `test_commands` (e.g. edits land entirely under a local-skill directory or a docs-only path), not because re-running "would be a no-op". If a re-run is genuinely a no-op, the no-op outcome is the audit trail; skipping the re-run removes the trail. The only permissible skip is when no code was modified in this iteration (handled by the next bullet).
   - If all points were rejected (no modifications): mark remaining iteration items as `completed` (skip — there is nothing new for the next reviewer to look at)
   Continue to the next pending iteration item with:
   - the latest `git diff <base-commit>`
   - a summary of fixes made and rejections with reasons
   - the same three-category structure, `.claude/rules/` reference, and "No actionable findings" requirement

   **Return-point no-stall reminder**: At each iteration boundary (regardless of reviewer outcome — findings reported, "No actionable findings", any non-error result), the next action — the next iteration's reviewer dispatch when more iteration items remain, or the Step 9 transition when this was the last iteration or "No actionable findings" was returned, or the Step 7 / Step 7.5 re-run when code was modified — must be issued in the **next tool call**. Do not insert an interstitial summary or acknowledgment turn between iterations; the abstract enumeration in `§ No-Stall Principle` is intentionally duplicated here so the rule fires at the decision moment.
4. If all N iteration items are completed and actionable feedback still remains, present the unresolved points to user for decision. Above the unresolved points, emit a summary preamble per [`references/plan-format.md`](references/plan-format.md) § User-gate summary preamble. Render the findings following [`references/plan-format.md`](references/plan-format.md) § Localization granularity in the resolved `language`.

Mark `Step 8: Code Review` as `completed`.

### Step 9: Update Rules

1. `Skill(extract-rules)` with `--from-conversation` (always)
2. `Skill(extract-rules)` with `--update` (trigger on either: significant structural/pattern changes to application code occurred — new frameworks, libraries, architectural patterns, or API conventions introduced in the diff; prose-only changes to SKILL.md, agent definitions, references, or rule files do not qualify, OR a dependency had a recent major-version bump — i.e. the semver major digit increased in the manifest, not a minor / patch — detected via `git diff <base-commit>` of the package manifest. The same signal used in the Step 2 difficulty assessment. The major-bump trigger opens the extract-rules Update Mode operational note, which prompts manual review of `.examples.md` samples that may have gone stale after the bump)
3. If extract-rules is unavailable, skip this step and inform user
4. After the applicable invocations above return, or after the step was skipped because extract-rules is unavailable — regardless of whether new rules were added or the report indicates nothing changed — mark `Step 9: Update Rules` as `completed` and proceed automatically. Per the No-Stall Principle, do not wait for user input.

### Step 9.5: Self-Retrospective

Emit a sanitized improvement signal for the `dev-workflow-bundle` skills (`dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`) to a user-configured destination. Raw conversation jsonl stays in-session; only abstracted, project-agnostic text leaves.

Skip this step if `self_retrospective.feedback` is unset/invalid (Step 1 did not register the row) or the task was assessed Simple (Step 2 difficulty assessment pre-marked the row `completed`). Otherwise read [`references/self-retrospective.md`](references/self-retrospective.md) and follow the procedure from top to bottom.

**Manual re-run (same-session only)**: If the task was assessed Simple and Step 9.5 was auto-skipped, and the user in the same session explicitly requests Step 9.5 execution (e.g. "run the retrospective for this run anyway"), bypass the Simple hard-skip and follow `references/self-retrospective.md` from §1. Do **not** update the already-`completed` TodoWrite row. At §1.4, confirm with the user that the auto-detected session jsonl matches the intended run (multi-instance setups may pick the wrong one). Cross-session re-runs are unsupported: once the session ends, the Step 2 difficulty assessment and in-memory context are lost. The override covers only the Simple hard-skip — an unset or invalid `self_retrospective.feedback` still blocks Step 9.5 (those gates are about missing destination, not difficulty).

### Step 10: Completion Hooks

Skip this step if `hooks.on_complete` is not configured. Mark `Step 10: Completion Hooks` as `in_progress`.

1. Execute each entry in `hooks.on_complete` in order:
   - `Skill(<name>)` pattern: invoke the skill
   - Other strings: execute as a Bash command
2. If a hook fails, report the error but continue executing remaining hooks. Include as warnings in the Completion summary
3. After all hooks complete (or are skipped), mark `Step 10: Completion Hooks` as `completed` and proceed to Completion

### Completion

Report summary: tasks completed, files modified, test results, review outcomes, rules updated. Output in the resolved `language` following [`references/plan-format.md`](references/plan-format.md) § Localization granularity.

**If this run was executing a subtask from a decomposition state file**, also do the following (all reads/writes target the canonical state-file path recorded in Step 1.5):

1. Mark the current subtask's `status` as `completed` in the canonical state file and write back
2. Ask the user for an optional PR URL for this subtask. On a non-empty answer, set the subtask's `pr` field and write back; otherwise leave it `null`
3. Refresh the parent-task TodoWrite row's `<done>/<total>` count
4. Find the next runnable subtask (smallest-id `pending` with all `depends_on` `completed`)
5. **If a next subtask exists**: tell the user to commit the current subtask's changes and open a PR *before* resuming, then start a new session with `/dev-workflow --resume <slug>`. Explain why this matters: the next run records a fresh base-commit from HEAD, so uncommitted changes would leak into the next subtask's diff. The workflow itself never stages, commits, or pushes
6. **If no next subtask exists** (all subtasks completed): delete the canonical state file via `rm <canonical-path>`, remove the parent-task TodoWrite row, and include every subtask's title and recorded `pr` (if any) in the parent-task completion summary
