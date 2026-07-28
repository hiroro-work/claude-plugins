---
name: mobpro
description: Learning-oriented development workflow (mob-programming style) that runs the SAME quality gates as dev-workflow — plan review, checks/tests, rules-compliance review, code review, interactive commits, rule maintenance — while pausing after every implementation unit for a diff review, so a junior engineer can follow WHAT is being built and WHY. The AI is always the driver (it writes all code) and narrates what it is doing and why; the junior navigates, reads each diff, asks questions, and approves commits. Use this instead of dev-workflow when the goal is to develop a feature WHILE a junior learns from it, not merely to ship efficiently.
allowed-tools: Agent, Read, Write, Edit, Glob, Grep, TaskCreate, TaskUpdate, TaskList, TodoWrite, AskUserQuestion, Skill(ask-peer), Skill(ask-claude), Skill(ask-codex), Skill(ask-gemini), Skill(ask-copilot), Skill(ask-agy), Skill(extract-rules), Skill(tidy), Skill(simplify), Skill(run-tests), Skill(rules-review), Skill(prose-polish), Bash(pwd), Bash(mkdir -p .claude/plans), Bash(cp .claude/plans/*), Bash(rm -f .claude/plans/*), Bash(pnpm run *), Bash(pnpm exec *), Bash(npm run *), Bash(yarn run *), Bash(bun run *), Bash(bundle exec *), Bash(make lint *), Bash(make format *), Bash(make test *), Bash(make typecheck *), Bash(make check *), Bash(python -m pytest *), Bash(poetry run *), Bash(uv run *), Bash(cargo test *), Bash(cargo clippy *), Bash(cargo fmt *), Bash(go test *), Bash(go vet *), Bash(git diff *), Bash(git status *), Bash(git rev-parse *), Bash(git symbolic-ref -q *), Bash(git merge-base *), Bash(git remote show *), Bash(git switch -c *), Bash(git add *), Bash(git commit *), Bash(git log *), Bash(git checkout HEAD -- *), Bash(git reset -- *), Bash(git write-tree), Bash(git commit-tree *), Bash(git ls-files *), Bash(grep -q *), Bash(test -f *), Bash(gh api --method POST /repos/*/issues *), Bash(gh auth status), Bash(jq *), Bash(node *), Bash(printenv CLAUDE_CODE_REMOTE), Bash(crit *)
---

# mobpro

A learning-oriented development workflow. It runs the same quality gates as `dev-workflow` by calling the same `dev-workflow-bundle` sibling skills under the same conventions, but it re-shapes the flow around a junior engineer's understanding: the AI is always the driver — it writes every edit and narrates what it is doing and why — while the junior navigates, reviewing each implementation unit's diff, asking whatever the narration left open, and judging commits. Quality is never traded for pedagogy: `mobpro` runs M4 and M7–M12 gates in full, with no difficulty-based skipping.

## Usage

```text
/mobpro [-i N | --iterations N] <task>          # Execute a learning session (Normal sub-mode)
/mobpro --resume <state-file> [-i N]            # Resume a subtask from a decomposition state file
```

There is no `--init`, no `--fast`, no `--executor`, and no difficulty assessment — `mobpro` deliberately keeps the invocation surface minimal (see [`references/configuration.md`](references/configuration.md)).

## Relationship to dev-workflow

`mobpro` shares dev-workflow's quality machinery rather than re-implementing it:

- **Same sibling callees**: the reviewer (`ask-peer` etc.), `simplify` / `tidy`, `prose-polish`, `rules-review`, `run-tests`, `extract-rules` — invoked with the same conventions.
- **Same project-characteristic settings**: `reviewer` / `check_commands` / `test_commands` / `language` and the other fallback keys are read from dev-workflow's config layers (see [`references/configuration.md`](references/configuration.md)). `mobpro` never writes to those files.
- **Same state-file schema and path** (`.claude/plans/dev-workflow.<slug>.md`): a parent task started under `mobpro` can be resumed with `/dev-workflow --resume <slug>`, and vice versa. The schema's single source of truth is dev-workflow's `references/task-decomposition.md`.
- **Install requirement**: `mobpro` MUST be installed via the `dev-workflow-bundle` plugin — it reads `dev-workflow`'s reference files as install-time siblings (see § Runtime reads). A standalone `mobpro`-only install has no `dev-workflow` sibling and its runtime reads fail.

## Runtime reads (closed list)

`mobpro` is an orchestrator: it holds the flow discipline and delegates each procedure body to a `dev-workflow` reference file read at runtime. It reads **only** the files in the table below, via the sibling-relative path `../dev-workflow/references/<name>.md` (the bundle install co-locates `mobpro` and `dev-workflow` under one `skills/` directory — verified for the installed-cache layout by subtask 2's Step 0 smoke test). It never reads any other `dev-workflow` file at runtime — in particular, never `dev-workflow/SKILL.md`.

| File | Read at | Purpose |
| --- | --- | --- |
| `task-decomposition.md` | M2 | Decompose (§ B) / resume (§ A) / state-file schema |
| `prerequisites.md` | M1 / M7 (+ M4 / M9 callee failure) | Callee retry / fallback protocol (reviewer 3-option fallback, `simplify`→`tidy` resolution, etc.) |
| `plan-format.md` | M3 | § Localization granularity only — the plan's shape is mobpro's own `references/plan-format.md` |
| `step3-plan-review.md` | M4 | The six-category review payload definition (sub-step 1 payload only; iteration / stop discipline follows M4 below) |
| `visual-plan-review.md` | M5 (only when `plan_review_gate` resolves to `visual` — including as the `crit` gate's fallback) | The whole file — § Procedure plus the § serve.mjs contract flags and § Prev snapshot `cp` discipline it depends on |
| `step7.5-rules-compliance.md` | M9 | Persistent-violations gate + 2nd-cycle procedure |
| `step8-code-review.md` | M9 | § Sub-step 1 code-review payload definition (payload only; the payload carries a pointer to `review-categories.md § Code review categories` that the **reviewer** reads — out of orchestrator scope, as at M4) |
| `step9-completion-hooks.md` | M10 | Hook execution / review-class classification / failure-continue / post-hook re-check |
| `diff-presentation.md` | M6 loop entry, both surfaces (M11 reuses that read — the file is invariant within a run) | § Detached review object (the `<base>`..`<head>` scoping technique) + § Rendering ladder (verbatim / condensed / skeleton) |
| `interactive-commits.md` | M11 | § Propose commit plan / § Per-commit loop procedure body |
| `crit-commit-review.md` | M6 / M11 (only when `commit_review_gate` resolves to `crit`) | Diff review via crit — CLI contract, availability determination, launch. M11 also takes its per-round unstage and per-commit outcome mapping; M6 defers unstaging to M6 exit and substitutes its own mapping (`references/diff-review.md` § crit path) |
| `crit-plan-review.md` | M5 (only when `plan_review_gate` resolves to `crit`) / M6 / M11 (same condition as the row above, via `crit-commit-review.md`'s pointer) | At M5, the whole file — § Procedure plus the § crit CLI contract it depends on (the `crit --version` probe, exit codes, the `approved:` stdout line, comment JSON shape); this file *is* the crit plan gate. At M6 / M11, § crit CLI contract only — the shared crit facts `crit-commit-review.md` delegates rather than restates (comment JSON shape, probe rationale) |
| `update-rules.md` | M12 | Step 11 procedure body (compaction gate included) |
| `session-scan.md` | M12 | Shared session-scan dispatch-once contract |
| `self-retrospective.md` | M12 (only when `self_retrospective.feedback` is set) | Step 11.5-equivalent procedure |
| `workability-retrospective.md` | M12 (only when `workability_retrospective.enabled`) | Step 11.6-equivalent procedure |
| `completion.md` | M13 | § Completion reminders render bodies + staging-artifact cleanup |

**Script carve-out**: the visual gate's viewer, `../dev-workflow/scripts/plan-review/serve.mjs`, is **executed**, not read, so it falls outside this table's scope. Resolve its path by the same sibling-relative rule (and by the NEEDS-FALLBACK path below when that does not resolve) — never under `mobpro`'s own directory, which ships no `scripts/`.

**Constraint scope**: this "read only the table" rule binds the orchestrator (this SKILL.md) and covers **dev-workflow** files only — `mobpro` freely reads its **own** `references/` (`configuration.md`, `inline-defs.md`, `learning-gates.md`, `diff-review.md`, `plan-format.md`) as normal skill-internal reads. It does **not** bind reviewer subagents dispatched at M4 / M9 — a reviewer following `step3-plan-review.md`'s instructions to read `review-categories.md` / `simplicity-self-audit.md` is normal and out of scope.

**NEEDS-FALLBACK path**: if the sibling-relative read cannot resolve in a given install (the Step 0 smoke test returned NEEDS-FALLBACK), resolve `dev-workflow`'s source directory absolutely via `jq -r '(.plugins[] | select(.name == "dev-workflow") | .source)' <marketplace.json>` and read from there instead.

## M ↔ Step remap directive

`mobpro`'s M1–M13 map onto `dev-workflow`'s Step 1–11 / Completion one-to-one. Every reference file read at runtime is written in `dev-workflow` vocabulary, so **remap as you read it**: a `Step N` reference maps to the corresponding M below; a task-row instruction (e.g. "mark `Step 1.5` as `completed`") targets the corresponding M row; a resume-command hint (`/dev-workflow --resume <slug>`) maps to M13's two-command presentation. Without this remap the reference's `dev-workflow` row names and command hints would leak into `mobpro`'s output verbatim.

| mobpro | dev-workflow Step | mobpro | dev-workflow Step |
| --- | --- | --- | --- |
| M1 Load settings | Step 1 | M8 Check / test | Step 7 |
| M2 Kickoff | Step 1.5 | M9 Rules + code review | Step 7.5 / Step 8 |
| M3 Design dialogue | Step 2 | M10 Completion hooks | Step 9 |
| M4 Plan review | Step 3 | M11 Commit | Step 10 |
| M5 Plan approval | Step 4 | M12 Rule update / retrospective | Step 11 / 11.5 / 11.6 |
| M6 Implementation loop | Step 5 | M13 Wrap-up | Completion |
| M7 Tidy + prose polish | Step 6 / 6.5 | | |

## Learning-Stop Principle

`mobpro`'s core discipline, the pedagogical counterpart to dev-workflow's `§ No-Stall Principle`. It is a two-sided rule: `mobpro` stops **only** at the two closed lists below, and nowhere else. It takes effect once M2 has settled the effective task (mirroring dev-workflow's No-Stall scoping "after Step 1.5 resolves the effective task") — so M1's reviewer-fallback prompt and M2's learning-goal / decomposition / leftover-picker dialogues precede the principle and are not listed here.

**(1) Learning stops (closed list).** The deliberate learning-stop points are:

- The M6 diff review — one after **each** implementation unit, always (no setting gates it). It **blocks on the junior's turn** and ends once that turn carries no further question; procedures per M6 sub-step 2 (d)'s delegation.
- A junior's question raised after M11's "point of this diff" note (respond, then continue; if no question comes, do not stop).

**Narration is not a stop.** M3's design approach, M8's error read, and M9's prediction plus cross-check ([`references/learning-gates.md`](references/learning-gates.md) § B (M8 error narration) / § C (M9 pre-review prediction narration + cross-check)) ask the junior nothing, so they never pause the run. `mobpro` holds **no** comprehension-check stop, and no setting revives one.

**Primary-pass rule**: M9's prediction narration fires only on M9's primary pass — its loop-exit aggregate re-verification and the per-round M9 re-runs the M11 `crit` path mandates do not re-fire it. M8's error narration is exempt (every failure is narrated). This paragraph owns that closed list of re-entry sites; other sites cross-reference it rather than re-enumerating them.

**(2) User gates (closed list — approval / judgment).** M5 plan approval; M8 check/test fail-stop (error-stop after 3 retries) and the two scope stops; M9 persistent-violations gate and unresolved-findings gate; M11 commit gates (commit-plan approval / per-commit accept / fold-or-defer / ambiguous-adjust); M12 gates (compaction approval / confirm-remaining-steps / rule-update commit / workability disposition); M13 deferral-exclusion gate and PR-URL prompt.

**(3) Nowhere else.** Outside lists (1) and (2) — sibling-skill return points, no-op results, TaskUpdate / TodoWrite transitions — do not stop; issue the next action in the same turn. An M5 `plan_review_gate` browser-submit wait, or an M6 / M11 `commit_review_gate: crit` browser-submit wait, is a **harness-tracked background boundary**, not a stop (proceed on the gate process's exit notification; never prompt "type continue"). Any new stop point added to M1–M13 must be added to list (1) or (2) in the same change (synchronization audit). `mobpro` inherits dev-workflow's accumulated stall defenses (return-point reminders, no-summary-turn rule) — re-expressed here with `mobpro`'s closed lists as the subject.

## Cross-step state variables (initialized at M1)

`base_commit` (recorded at M3) / `N_plan` / `N_code` / `bundle_skills_unavailable = []` / `landed_count = 0` (incremented by M11 on a landed commit; initialized at M1 — not at M11 entry as dev-workflow does — so M13's branch is well-defined even when M11 is unregistered or skipped) / `implementation_diff_paths` (recorded by M6 step 5's implementation-diff snapshot) / `m9_fix_files = []` (files edited during M9 review iterations; read by M9's loop-exit aggregate re-verification) / `session_scan_dispatched = false` / `session_scan_result = null` (M12 dispatch-once contract) / `compaction_applied_count = 0` / `below_threshold_failed_files = []` (M12 compaction gate; read by M13's compaction reminder; initialized at M1 — like `landed_count` — so M13 is well-defined even when M12's confirm-remaining-steps gate skips or the `compact_rules` gate leaves the compaction sub-step unentered) / `state_file_path = null` (the decomposition state file's **resolved absolute path**, set at M2 in both sub-modes — § A step 2 on Resume, state-file creation on Normal — and read by M4's subtask scope and M13's lifecycle; **never** re-derived from `slug`; stays `null` on an undecomposed run, which is what M13's "When `state_file_path` is non-`null`" gate tests) / the learning goal (settled at M2). `mobpro` does **not** carry dev-workflow's `difficulty_skipped_steps` / `fast_mode_skipped_steps` / `step8_fix_files` (no difficulty assessment, no fast mode; the M9 fix aggregate uses `m9_fix_files`).

## Configuration

`mobpro` has **no configuration of its own**. It reads dev-workflow's three config layers for the project-characteristic keys, plus `~/.claude/settings.json` as the last link in `language`'s fallback chain. The full schema — the fallback closed list, the not-adopted keys, and the § Resolution procedure M1 follows — is in [`references/configuration.md`](references/configuration.md). Every pedagogical choice is fixed rather than configurable (§ Learning-Stop Principle), so the learning flow is the same on every project; `mobpro` runs entirely on defaults when no dev-workflow config file exists anywhere.

**Settings merge strategy**: the fallback keys merge across the dev-workflow layers with dev-workflow's per-class semantics — read [`references/inline-defs.md`](references/inline-defs.md) § (a) (`Keep in sync with dev-workflow SKILL.md § Configuration`).

## Workflow artifacts (cross-step fixed exclusion)

The full definition — the in-session-state files this workflow owns (plan documents under `.claude/plans/`, decomposition state files, backlog files, the M5 visual-gate served / comments / prev files, the rule-extraction candidate file, and other staging artifacts under `.claude/`) and excludes structurally from every changed-file enumeration — is transcribed in [`references/inline-defs.md`](references/inline-defs.md) § (b) Workflow artifacts (`Keep in sync with dev-workflow SKILL.md § Workflow artifacts`). M6 / M7 / M9 / M11 apply that single shared exclusion when building any changed-file set. This heading is the stable anchor other M-steps reference as "§ Workflow artifacts".

## Dispatch authorization

This skill's procedure dispatches subagents, so invoking the skill **is** the request to use that mechanism: an ambient instruction allowing subagent dispatch only when the user asked for it — a **permission-shaped restriction** — is already satisfied by this invocation. Do not ask the user to re-confirm the dispatch, and do not silently substitute inline execution for a dispatch this procedure specifies. Only two things justify that substitution: **technical availability** (the dispatch tool is not present and callable on the current tool surface), and an **explicit contract term from the caller** bounding this skill to its own thread. A permission-shaped restriction is neither.

## M1 — Load settings

1. **Resolve settings**: read [`references/configuration.md`](references/configuration.md) § Resolution procedure and follow it from top to bottom. Resolution must complete before sub-step 4's registration burst, whose conditional omissions read the resolved `hooks.on_complete` / `interactive_commits`. That procedure also carries the **removed-config tombstone** (`.claude/mobpro.md` / `.claude/mobpro.local.md` are no longer read; it warns once if either is still present).
2. Read `../dev-workflow/references/prerequisites.md`. Probe the resolved reviewer with a one-word `ping`; on failure retry once; on persistent failure present that file's three-option fallback prompt (switch reviewer / self-review / pause at the gate). Initialize `bundle_skills_unavailable = []` (append discipline per that file).
3. Resolve `N_plan` / `N_code`: `-i N` (positive integer) > `review_iterations` (scalar or `{plan, code}` map, same validation as dev-workflow) > default `3`. **No difficulty-based reduction** — every gate is a teaching surface.
4. Register all phases with the Task tools (`TodoWrite` fallback where Task tools are unavailable) in one upfront burst: the M1–M13 rows + `M4-1 … M4-N_plan` + `M9-1 … M9-N_code`. Conditional omissions (exactly three): omit `M2` in Resume sub-mode (the row only — M2's Resume path still runs, it just has nothing to register there); omit `M10` when `hooks.on_complete` is unset; omit `M11` when `interactive_commits` is false. `M12` is always one row (it branches internally on the 11.5 / 11.6 conditions).
5. Initialize the § Cross-step state variables.
6. Emit the Language checkpoint (`Output language: <lang>`).

## M2 — Kickoff

1. **Learning-goal confirmation** (Normal sub-mode): ask what the junior wants to understand this session (1–2 goals); if they defer, propose 1–2 from the task and confirm. Paired sample:
   - `language: ja`: `今日のセッションで理解したいことを 1〜2 個教えてください（例: このプロジェクトのルーティングの仕組み / テストの書き方）。特になければこちらで提案します。`
   - `language: en`: `What would you like to understand from today's session (1–2 goals, e.g. how this project's routing works / how tests are written)? If nothing specific, I'll suggest a couple.`
2. **Normal sub-mode**: read `../dev-workflow/references/task-decomposition.md` § B and follow it. Consider the walking-skeleton decomposition axis as the default candidate and shape the first proposed subtask as "get the minimal happy path working" (proposal-priority only — the § B.1 one-line rationale label still follows that axis's discriminator). The yes / adjust / no gate, state-file creation, and progress row are used verbatim from that reference.
3. **Resume sub-mode** (`--resume <state-file>`): read § A of the same reference and follow it, together with the preamble sections it depends on — § State file schema (validate the invariants on every read), § Canonical state-file path (this is what sets `state_file_path`), and § Parent-task progress row. Two notes: § A step 5's all-subtasks-completed branch routes to the Completion cleanup path (M13 territory), not to M3 — § A's own delete-report-stop applies verbatim there, so none of M13's lifecycle chain runs on a run that executed nothing; and § A step 3a's planning-draft recovery continues in **Normal sub-mode** as written, so step 1's learning-goal confirmation fires even though the run was invoked with `--resume`. Because § A records the resolved path (step 2) *before* it discovers the file is a planning draft (step 3), and 3a declares no state file active, **reset `state_file_path` to `null` when 3a fires** — the recovered Normal path re-binds it only if the user then accepts a decomposition. Once § A has selected the subtask, re-surface the state-file body's learning-goal line. A state file created by `dev-workflow` carries no such line (the reverse-direction handoff the README advertises) — fall back to step 1's learning-goal confirmation in that case, so M13's learning summary always has goals to summarize against:
   - `language: ja`: `前回の学習ゴール: <...>`
   - `language: en`: `Last session's learning goals: <...>`
4. On decompose-accept, add a `Created by: mobpro` line and the learning-goal line to the state-file body (frontmatter schema unchanged).
5. Settle the effective task and proceed to M3.

## M3 — Design dialogue

1. Record `base_commit`: `git rev-parse HEAD`.
2. **Design-approach narration**: state in 2–3 lines how you intend to build it and why that shape was chosen over the obvious alternative. Ask the junior nothing — this is narration, so it does not pause the run (§ Learning-Stop Principle's "Narration is not a stop" paragraph).
   - `language: ja`: `この機能は<作り方>で作る。<別案>もあるけど<理由>でこちらにした。`
   - `language: en`: `I'll build this by <approach>. <Alternative> was an option too, but <reason> makes this the better shape.`
3. Author the plan document and `Write` it to `.claude/plans/<slug>.md`, following [`references/plan-format.md`](references/plan-format.md) § Template. Localization follows `../dev-workflow/references/plan-format.md` § Localization granularity (that section alone). Apply `custom_instructions` to plan priorities. **Resolve `<slug>` once per run and reuse it verbatim on any M5 re-entry**: take the state file's `slug` when `state_file_path` is non-`null`, else derive a kebab-case slug from the effective task (transliterate non-ASCII where reasonable, strip punctuation, lowercase), suffixing `-2`, `-3`, … only on collision with an existing `.claude/plans/<slug>.md` from a **prior** run (`Keep in sync with dev-workflow references/step4-finalize-plan.md's path (b) slug resolution.`). M5's `visual` gate derives three more paths from the same slug (§ Workflow artifacts), so re-resolving it mid-run would orphan them.
4. **Deliberately not adopted**: `EnterPlanMode` (M3 presents nothing; every `plan_review_gate` value runs M5 outside Plan Mode — `plan-mode` just means chat here), the Step 2 research-delegation, the difficulty assessment (Adjust N), the Simplicity self-audit, and the Plan self-check — learning-session plans are small, and simplicity is checked by M4's category (a).
5. Do not show the plan to the user or ask for approval here — go straight to M4 (same prohibition as dev-workflow Step 2's "no unreviewed-plan presentation").

## M4 — Plan review (quality gate)

For each iteration M4-1 … M4-N_plan, in order:

1. Reuse `../dev-workflow/references/step3-plan-review.md` sub-step 1's six-category review payload definition and pass the full plan + `custom_instructions` + the state-file subtask scope (when decomposed) to `Skill(<reviewer>)`. **One substitution**: where that payload has the reviewer read `plan-format.md` for the `Decisions` (a)+(b) criterion and § Step 3 (f) content-quality rubric, hand it [`references/plan-format.md`](references/plan-format.md) § Template + § Review lens instead — resolving that path under **mobpro's** skill directory, not dev-workflow's same-named file. § Review lens carries the mapping rule for the rest of the payload, so the substitution needs nothing further here.
2. Judge the response semantically: no actionable findings → mark this and remaining iterations `completed` and go to M5.
3. Findings → apply to the plan (reject unreasonable ones with a stated reason), then **teach**: explain each applied finding as "what review lens this is" in 1–2 lines. Continue to the next iteration.
4. After N_plan iterations, carry any unresolved points into M5's presentation as "open points".

## M5 — Plan approval (USER GATE)

1. **Approval surface** — branch on `plan_review_gate` (resolved at M1; Default `visual` — see [`references/configuration.md`](references/configuration.md)). The chain is crit → visual → chat, the same routing dev-workflow Step 4 path (b) uses. **On either browser path, before entering the reference at all**, do both of these in the turn that issues the launch: emit sub-step 2's plan narration, and fold any open points M4 carried forward into the plan document's `Watch-outs` so the browser renders them (the `visual` gate copies its served file from the plan document at its step 3, one step ahead of the launch, so folding once the reference is under way is already too late). Once the reference is entered it blocks on the browser submit and neither browser path renders anything in chat, so a later turn is too late — the same discipline M11's `crit` path applies to its "point of this diff" note.
   - **`crit`**: read `../dev-workflow/references/crit-plan-review.md` and follow it top to bottom. It owns its own availability (`crit --version`) and browser-reachability checks and returns `approve` / `rewrite-approach` / `fallback`; its `fallback` continues with the **`visual`** bullet below, never straight to chat.
   - **`visual`**: read `../dev-workflow/references/visual-plan-review.md` and follow it top to bottom. It owns the browser-reachability check and returns the same three values; its `fallback` continues with the **chat** bullet below. Resolve `serve.mjs` under the sibling `dev-workflow` directory (`../dev-workflow/scripts/plan-review/serve.mjs`) rather than by that reference's step 1 base-directory rule, which here resolves under `mobpro` — per § Runtime reads' "Script carve-out" paragraph. Read and follow that reference unconditionally: jumping straight to the **chat** bullet — including on the grounds that chat is faster — silently disables the gate, and § Learning-Stop Principle is not a licence for it; only the reference's own `fallback` return routes to chat. Issue that reference's prev-snapshot `cp` with **unquoted** paths — M3 sub-step 3 keeps `<slug>` kebab-case ASCII, and the `allowed-tools` grant is path-scoped.
   - **chat** (`plan-mode`, and the destination of either gate's `fallback`): present the full plan in chat.

   Each browser gate launches its process via **background Bash**, not the `Agent` tool, so M12's only-direct-`Agent`-use invariant holds. All three surfaces run outside Plan Mode (M3's **Deliberately not adopted** sub-step). Neither browser path renders the plan in chat — the browser is the review surface.
2. **Plan narration**: explain in 2–3 lines what it builds and in what order — narration, not a comprehension question (distinct from M3 sub-step 2's **Design-approach narration**, which fired earlier on the approach-vs-alternative fork). On the browser paths sub-step 1 has already placed it in the launch turn; on the chat path it follows the plan body and is closed by the approval question — the only thing this gate asks the junior. Emit the narration **once per M5 entry**: when a browser gate returns `fallback`, it already went out with the launch turn, so present the plan body and go straight to the approval question rather than repeating it. The question below is **chat-path only**: on the browser paths the submit is itself the approval, so do not also ask it in chat, which would invite a reply while the gate blocks on the browser:
   - `language: ja`: `このプランで進めていい？ 気になるところがあれば先に聞いて。`
   - `language: en`: `Shall we go with this plan? Ask first if anything looks off.`
3. Classify the outcome into three buckets: **accept** (→ implementation) / **adjust** (revise the plan → add one M4 iteration → re-review → re-enter M5) / **withdraw** (end the workflow). A browser gate's return maps directly — `approve` → **accept**, `rewrite-approach` → **adjust** (the gate has already written its revisions to `.claude/plans/<slug>.md`, so resume adjust at the add-an-M4-iteration leg rather than revising the plan again); `fallback` is a route rather than an outcome (continue down sub-step 1's chain). On the chat path classify the reply semantically; interrogative / non-committal replies re-classify via a confirming question.
4. **Chat path**: run a one-line read-back before applying any revise instruction (same discipline as dev-workflow Step 4's read-back). **Browser paths**: no read-back — each gate applies its own submitted comments autonomously inside its loop, and a chat prompt there would break the blocking browser round-trip; the `visual` gate's "switch to alternative" toggle is itself the confirmation gesture, which is why that gate's procedure omits the read-back deliberately. Both gate procedures send the swap's dependent updates through "the text-path swap-decisions bucket" in dev-workflow's `SKILL.md`, which `mobpro` neither reads nor has (M5's buckets are accept / adjust / withdraw): treat the swap as a localized in-gate edit and sweep its dependents across `mobpro`'s own sections — `What we're building` / `Build order` / `How we'll check it works` / `Watch-outs`, per [`references/plan-format.md`](references/plan-format.md) § Review lens' mapping rule, whose first two absorb dev-workflow's `Approach` / `Scope` sweep vocabulary.

## M6 — Implementation loop

1. **Unit segmentation**: each `Build order` step in the plan is one unit — register them as implementation sub-rows (additions, not a replacement of the M6 row), splitting any step that covers more than one meaningful change into one row per change as you register it. If the plan carries no `Build order` section, segment it into 3–10 units yourself under the same rule. Initialize the loop-local state [`references/diff-review.md`](references/diff-review.md) defines — `m6_review_base` (to `base_commit`), `m6_staged_paths` (to `[]`), and `m6_crit_available` (unset until its probe runs). All three are M6-loop-local, so none is a § Cross-step state variables member.
2. Per unit: (a) **preview** ≤ 6 lines (what / why / which files) → (b) **AI edits** (main-thread; never delegate to a subagent — the junior must see the edit as it happens) → (c) **walkthrough** per changed file → (d) **diff review** — read [`references/diff-review.md`](references/diff-review.md) and [`references/learning-gates.md`](references/learning-gates.md) § A (M6 diff review) and follow them. Both are loop-invariant: read them once at loop entry, then apply per unit. `diff-review.md`'s preamble sends you to a third loop-invariant file, `../dev-workflow/references/diff-presentation.md` — read it at the same point. Preview and walkthrough lengths follow [`references/learning-gates.md`](references/learning-gates.md) § D (explanation length discipline).
3. Apply `custom_instructions` throughout. Per the § Workflow artifacts exclusion, treat `.claude/`-internal state files as excluded from every downstream changed-file enumeration.
4. After the last unit's review resolves, run the **M6-exit unstage** defined in [`references/diff-review.md`](references/diff-review.md) § Per-unit review range — the diff reviews leave their paths staged on purpose, and this is the one place that clears them, so M11 still sees new files as untracked.
5. After all units land, record `implementation_diff_paths = git diff <base_commit> --name-only` (read by M11's Post-hook attribution check).

## M7 — Tidy + prose polish (quality gate)

1. Call `Skill(simplify)`; if unavailable, `Skill(tidy)` (pass `Base ref: <base_commit>`). Resolution / both-unavailable skip / ledger append follow `../dev-workflow/references/prerequisites.md`'s Cleanup skill bullet.
2. If cleanup changed anything, explain why in 1–2 lines (e.g. "this duplication was a future maintenance hazard, so it was pulled into one function").
3. If `polish_prose` is true, call `Skill(prose-polish)` in file mode (`Language:` = resolved language, no `Model:`). On failure retry once, then skip and append to `bundle_skills_unavailable`.
4. **No difficulty skip** — M7 always runs.

## M8 — Check / test (quality gate, max 3 retries)

1. Run `check_commands` in order; on all-pass, run `test_commands` in order (each entry must be of the form `Skill(<name>)`). **Missing test skill**: when a `test_commands` entry names a skill that does not exist (the `Skill()` call fails as not-found, after one retry), that is **not** a test failure — emit the note below, skip that entry, and continue; the retry budget is untouched and the error narration does not fire (there is no failure output to read out).
   - `language: ja`: `test_commands の \`Skill(<name>)\` が見つかりませんでした — このエントリを skip します。テストを走らせるには test_commands にこのプロジェクトに存在するスキルを設定してください（設定方法は README § Configuration）。`
   - `language: en`: `test_commands entry \`Skill(<name>)\` was not found — skipping it. To run tests, point \`test_commands\` at a skill that exists in this project (see README § Configuration).`
2. **On failure**: narrate the read of the error — which part of the message you read and what it says — then fix it without stopping to ask the junior anything (prompt shape and the every-failure rule in [`references/learning-gates.md`](references/learning-gates.md) § B (M8 error narration)). Fix → re-run, up to 3 retries; exceeding that reports and stops (error-stop).
3. **Scope stops**: two step-internal USER GATES apply during `check_commands` (the only non-completing exits here) — the pre-execution scope-narrowing stop and the scope-drift stop. Read [`references/inline-defs.md`](references/inline-defs.md) § (c) and apply both.

## M9 — Rules + code review (quality gate)

1. **Pre-review prediction narration**: before dispatching the reviews below, state where you expect findings to land and why, then cross-check that prediction against the actual results afterward (prompt + cross-check discipline in [`references/learning-gates.md`](references/learning-gates.md) § C (M9 pre-review prediction narration + cross-check)). Primary pass only — § Learning-Stop Principle's "Primary-pass rule" paragraph.
2. **Rules compliance**: call `Skill(rules-review) --base-commit <base_commit>`. Violations → fix → explain each fix in 1–2 lines. The 2nd-cycle procedure and the persistent-violations user gate follow `../dev-workflow/references/step7.5-rules-compliance.md`.
3. **Code review** (M9-1 … M9-N_code): build the payload from `../dev-workflow/references/step8-code-review.md` § Sub-step 1 (the three review categories a/b/c — full rubric in `review-categories.md`, which the reviewer reads, as at M4 — untracked-file inclusion, `.claude/rules/` safety-net, continuation item) — payload definition only; iteration / stop discipline follows this procedure — and pass it to `Skill(<reviewer>)`. Judge → apply or reject-with-reason (files edited by an applied fix append to `m9_fix_files`) → explain each in 1–2 lines → no actionable findings marks the rest `completed`.
4. **Unresolved-findings gate**: if actionable findings remain after N_code iterations, present them for a user decision (correspond / accept-and-continue / stop) — same shape as dev-workflow Step 8 sub-step 4.
5. **Loop-exit aggregate re-verification (2 gates)**: once the review iterations settle, if `m9_fix_files` is non-empty, (1) re-run check/test once (reuse M8 — its error narration fires here too, per [`references/learning-gates.md`](references/learning-gates.md) § B (M8 error narration)), and (2) run one `Skill(rules-review)` scoped to `m9_fix_files` — the same 2-gate structure as dev-workflow Step 8's Deferred verification (no per-iteration re-runs).
6. **Deliberately not adopted**: dev-workflow Step 7's concurrent background launches (`run_in_background` `Agent` dispatch of rules-review / code review) — a learning session runs these synchronously so the walkthrough can interleave. M9 issues no direct `Agent` dispatch (M12's session scan is `mobpro`'s only direct `Agent` use).

## M10 — Completion hooks

Skip (and do not register) when `hooks.on_complete` is unset. Otherwise, before executing any entry, apply the **task-derived-change gate** transcribed in [`references/inline-defs.md`](references/inline-defs.md) § (d) — skip the whole `hooks.on_complete` list (marking M10 `completed` with a skip-reason line) when there are no task-derived changes since `<base_commit>`. When the gate passes, read `../dev-workflow/references/step9-completion-hooks.md` and run each entry in order (review-class classification, failure-record-and-continue, post-hook re-check).

## M11 — Commit (USER GATES)

Runs only when `interactive_commits` is true (else unregistered). Read `../dev-workflow/references/interactive-commits.md` and follow § Propose commit plan → § Per-commit loop verbatim. The one learning extension is a 1–2 line "point of this diff" note added to each per-commit presentation; the approval tokens, procedure, and presented elements are otherwise unchanged. `git push` is never performed by any step.

**Diff surface (`commit_review_gate` branch)**: `diff` — the default — presents the diff in chat. `crit` reads `../dev-workflow/references/crit-commit-review.md` and follows it: availability determination, launch, outcome mapping, and its chat fallback when crit is unavailable or unreachable. It launches crit via **background Bash**, not the `Agent` tool, so M12 sub-step 3's only-direct-`Agent`-use invariant holds. On the `crit` path, emit the "point of this diff" note **in the same turn as the crit launch, before the junior opens the browser**, so it guides their reading. The same key governs M6's per-unit diff review ([`references/diff-review.md`](references/diff-review.md)); each gate probes crit availability and emits its own unavailability note independently. That reference's per-round Step 7 (Check / Test) + Step 7.5 (Rules Compliance Review) re-runs map to M8 and M9 sub-step 2 (rules compliance) only — not M9's code-review iterations — and are verification passes here, so § Learning-Stop Principle's "Primary-pass rule" paragraph applies: no prediction narration.

**Step 10 inline definitions**: `interactive-commits.md` depends on definitions that live inline in dev-workflow's SKILL.md — the Approval token closed list (which `crit-commit-review.md`'s comment classifier also points at, so the `crit` path resolves it here too), Localized summary tokens, the `landed_count` lifecycle, the Post-hook attribution check, and the branch-ancestry guard. Read [`references/inline-defs.md`](references/inline-defs.md) § (e) and apply them.

## M12 — Rule update / retrospective

1. **confirm-remaining-steps entry gate** (when `confirm_remaining_steps` is true): ask whether to run the remaining rule-maintenance / retrospective work (list only the registered ones) or skip to M13. On skip, mark those `completed` without running and note the skip.
2. Read `../dev-workflow/references/update-rules.md` and run the Step 11 procedure body (`Skill(extract-rules)`, the `compact_rules` gate, and — when `interactive_commits` is true — the rule-update commit gate).
3. When `self_retrospective.feedback` is set, read `self-retrospective.md`; when `workability_retrospective.enabled`, read `workability-retrospective.md`; run each in kind. The shared session scan follows `session-scan.md` § Dispatch-once contract — dev-workflow's participants are Step 11 / 11.5 / 11.6; in `mobpro` the **three sub-phases of M12** are the participants (`session_scan_dispatched` / `session_scan_result` are the M1-declared cross-step variables, and the first sub-phase that needs the scan dispatches it once). This scan dispatch is `mobpro`'s only direct `Agent` use.
4. `mobpro` is itself a bundle member, so it is one of self-retrospective's improvement-signal targets (registered via that file's Purpose line).

**Step 11 skeleton**: the `rule-extraction-active` gate (double-count defense), session-scan wiring, the extract-rules-unavailable candidates fallback, and the rule-update commit gate firing condition are transcribed in [`references/inline-defs.md`](references/inline-defs.md) § (f) — apply them.

## M13 — Wrap-up (Completion)

1. Read `../dev-workflow/references/completion.md` and run the staging-artifact cleanup. Render only the § Completion reminders whose state exists in `mobpro` — the **6** applicable of dev-workflow's 8: Difficulty-skip and Fast-mode-skip never fire (`mobpro` has neither ledger); Bundle-skill availability (`bundle_skills_unavailable`), M11 partial-state, rule-update / examples-dir / staging-dir, and the compaction reminder fire on their conditions. The reminders' `uncommitted_*` partition scan follows [`references/inline-defs.md`](references/inline-defs.md) § (g).
2. **Learning summary**: against M2's learning goals, summarize "what was understood today" in ≤ 3 one-line points, plus one line each for the quality-gate outcomes (tests / review / rules).
3. When `state_file_path` is non-`null`, run the state-file lifecycle in this order, applying [`references/inline-defs.md`](references/inline-defs.md) § (g) in full for each item's discipline: deferral/exclusion gate — promote anything excluded or deferred during M6 / M8 into a tracked subtask entry, since a prose-only item is invisible to `--resume` → `completed` write-back → PR-URL prompt → progress-row refresh → find the next runnable subtask (smallest-id `pending` whose `depends_on` are all `completed`; when none remains, every subtask is `completed`) → then **exactly one** of two mutually-exclusive branches. **(i) A next runnable subtask exists**: next-subtask guidance (`landed_count > 0` → "open a PR for the landed commits, then resume"; `== 0` → "commit and open a PR first, then resume", adding the extract-rules residue warning when step 1's `uncommitted_*` sets are non-empty), rendered together with step 4's resume-command pair. **(ii) None remains (every subtask is `completed`)**: emit **no** resume guidance at all — there is nothing left to resume — and instead report the parent task as fully done, listing every subtask's title and its recorded `pr` (if any), the same roll-up § A step 5's all-completed branch gives; **then** remove the progress row and delete the state file at `state_file_path` — the roll-up must come first, since the deletion destroys the `pr` records.
4. **Only when step 3 ran and it found a next runnable subtask** — so never on an undecomposed run, and never once the last subtask completed and the state file was deleted — render that step's next-subtask guidance as **both** resume commands (per § M ↔ Step remap directive, dev-workflow's single `/dev-workflow --resume <slug>` hint becomes the pair below):
   - `language: ja`: `学びながら続けるなら /mobpro --resume <slug>、シニアに通常ワークフローで引き継ぐなら /dev-workflow --resume <slug>。`
   - `language: en`: `To keep learning through the rest, run /mobpro --resume <slug>; to hand off to a senior on the standard workflow, /dev-workflow --resume <slug>.`
