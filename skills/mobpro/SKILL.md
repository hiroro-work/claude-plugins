---
name: mobpro
description: Learning-oriented development workflow (mob-programming style) that runs the SAME quality gates as dev-workflow — plan review, checks/tests, rules-compliance review, code review, interactive commits, rule maintenance — while pausing after every implementation unit for a diff review, so a junior engineer can follow WHAT is being built and WHY. The AI is always the driver (it writes all code) and narrates what it is doing and why; the junior navigates, reads each diff, asks questions, and approves commits. Use this instead of dev-workflow when the goal is to develop a feature WHILE a junior learns from it, not merely to ship efficiently.
allowed-tools: Agent, Read, Write, Edit, Glob, Grep, TaskCreate, TaskUpdate, TaskList, TodoWrite, Skill(ask-peer), Skill(ask-claude), Skill(ask-codex), Skill(ask-gemini), Skill(ask-copilot), Skill(ask-agy), Skill(extract-rules), Skill(tidy), Skill(simplify), Skill(run-tests), Skill(rules-review), Skill(prose-polish), Bash(pwd), Bash(mkdir -p .claude/plans), Bash(cp .claude/plans/*), Bash(rm -f .claude/plans/*), Bash(pnpm run *), Bash(pnpm exec *), Bash(npm run *), Bash(yarn run *), Bash(bun run *), Bash(bundle exec *), Bash(make lint *), Bash(make format *), Bash(make test *), Bash(make typecheck *), Bash(make check *), Bash(python -m pytest *), Bash(poetry run *), Bash(uv run *), Bash(cargo test *), Bash(cargo clippy *), Bash(cargo fmt *), Bash(go test *), Bash(go vet *), Bash(git diff *), Bash(git status *), Bash(git rev-parse *), Bash(git symbolic-ref -q *), Bash(git merge-base *), Bash(git remote show *), Bash(git switch -c *), Bash(git add *), Bash(git commit *), Bash(git log *), Bash(git checkout HEAD -- *), Bash(git reset -- *), Bash(git write-tree), Bash(git read-tree *), Bash(git commit-tree *), Bash(git ls-files *), Bash(grep -q *), Bash(test -f *), Bash(gh api --method POST /repos/*/issues *), Bash(gh auth status), Bash(jq *), Bash(node *), Bash(printenv CLAUDE_CODE_REMOTE), Bash(crit *)
---

# mobpro

A learning-oriented development workflow. It runs the same quality gates as `dev-workflow` by calling the same `dev-workflow-bundle` sibling skills under the same conventions, but it re-shapes the flow around a junior engineer's understanding: the AI is always the driver — it writes every edit and narrates what it is doing and why — while the junior navigates, reviewing each implementation unit's diff, asking whatever the narration left open, and judging commits. Quality is never traded for pedagogy: `mobpro` runs M4 and M7–M12 gates in full, with no difficulty-based skipping. The one exception is the caller passing `--fast` (§ Fast mode).

## Usage

```text
/mobpro [--fast] <task>                         # Execute a learning session (Normal sub-mode)
/mobpro --resume <state-file> [--fast]          # Resume a subtask from a decomposition state file
```

There is no `--init`, no `--executor`, and no difficulty assessment — `mobpro` deliberately keeps the invocation surface minimal (see [`references/configuration.md`](references/configuration.md)). `--fast` is the one modifier it takes (§ Fast mode).

## Relationship to dev-workflow

`mobpro` shares dev-workflow's quality machinery rather than re-implementing it:

- **Same sibling callees**: the reviewer (`ask-peer` etc.), `simplify` / `tidy`, `prose-polish`, `rules-review`, `run-tests`, `extract-rules` — invoked with the same conventions.
- **Same project-characteristic settings**: `reviewer` / `check_commands` / `test_commands` / `language` and the other fallback keys are read from dev-workflow's config layers (see [`references/configuration.md`](references/configuration.md)). `mobpro` never writes to those files.
- **Same state-file schema and path** (`.claude/plans/dev-workflow.<slug>.md`): a parent task started under `mobpro` can be resumed with `/dev-workflow --resume <slug>`, and vice versa. The schema's single source of truth is dev-workflow's `references/task-decomposition.md`.
- **Install requirement**: `mobpro` MUST be installed via the `dev-workflow-bundle` plugin — it reads `dev-workflow`'s reference files as install-time siblings (see § Runtime reads).

## Runtime reads (closed list)

`mobpro` is an orchestrator: it holds the flow discipline and delegates each procedure body to a `dev-workflow` reference file read at runtime. It reads **only** the files in the table below, via the sibling-relative path `../dev-workflow/references/<name>.md` (the bundle install co-locates `mobpro` and `dev-workflow` under one `skills/` directory). It never reads any other `dev-workflow` file at runtime — in particular, never `dev-workflow/SKILL.md`.

**Each file is read once**, at the earliest **Read at** point its row names, and reused for the rest of the run. `mobpro`'s own `references/` follow the same rule; the ones reached from more than one M-step name their read point in their own preamble (§ Constraint scope).

| File | Read at | Purpose |
| --- | --- | --- |
| `task-decomposition.md` | M2 | The shared core both sub-modes need — § State file schema / § Canonical state-file path / § Parent-task progress row |
| `task-decomposition-normal.md` | M2 (Normal sub-mode only) | § B decomposition procedure — the yes / adjust / no gate and state-file creation |
| `task-decomposition-resume.md` | M2 (Resume sub-mode only) | § A resume procedure — state-file validation and the subtask picker |
| `prerequisites.md` | M1 / M7 | Callee retry / fallback protocol (reviewer 3-option fallback, `simplify`→`tidy` resolution, etc.). M4 and M9 apply the same protocol when a reviewer call fails, working from this read rather than taking one of their own |
| `localization.md` | M3 | The localization boundary every user-facing output follows — the plan's shape is mobpro's own `references/plan-format.md` |
| `plan-format.md` | M9 / M12 (only when a user gate emits a summary preamble) | § User-gate summary preamble only — M9's unresolved-findings gate (sub-step 4), the persistent-violations gate its sub-step 5 reuse reaches, and M12's workability disposition gate each ask for it by name |
| `step3-plan-review.md` | M4 | The review payload definition — categories a–d and the groups they split across (sub-step 1 payload only; pass / stop discipline follows M4 below) |
| `visual-plan-review.md` | M5 (only when the browser-reachability probe clears) | The whole file — § Procedure plus the § serve.mjs contract flags and § Prev snapshot `cp` discipline it depends on |
| `step7.5-rules-compliance.md` | M9 | Persistent-violations gate + 2nd-cycle procedure |
| `code-review-payload.md` | M9 (only when `code_review_enabled` — M9 sub-step 3 (code review) is skipped when `code_review: false`) | § Sub-step 1 code-review payload definition (payload only; the payload carries a pointer to `review-categories.md § Code review categories` that the **reviewer** reads — out of orchestrator scope, as at M4) |
| `step9-completion-hooks.md` | M10 | Hook execution / review-class classification / failure-continue / post-hook re-check |
| `diff-presentation.md` | M6 loop entry, both surfaces (M11 reuses it) | § Detached review object (the `<base>`..`<head>` scoping technique) + § Rendering ladder (verbatim / condensed / skeleton) |
| `interactive-commits.md` | M11 | its § Procedure in full, from § Collect changes through § Per-commit loop and the sections after it |
| `crit-commit-review.md` | M6 / M11 (only when `commit_review_gate` resolves to `crit` **and** that gate's two crit-availability probes clear) | Diff review via crit — CLI contract, story prologue, launch. That gate synthesizes no object of its own, so it stages nothing and has no unstage step (its § Procedure step 4). M11 also takes its per-commit outcome mapping; M6 substitutes its own and clears its own staged paths at M6 exit (`references/crit-diff-review.md`, reached from `references/diff-review.md` § crit path) |
| `update-rules.md` | M12 | Step 11 procedure body |
| `session-scan.md` | M12 | Shared session-scan dispatch-once contract |
| `self-retrospective.md` | M12 (when `self_retrospective.feedback` is set, **or** as the session-jsonl resolution source below) | Step 11.5-equivalent procedure; its §1.4 owns the shared session-jsonl resolution — the only copy of that procedure |
| `workability-retrospective.md` | M12 (when `workability_retrospective.enabled`) | Step 11.6-equivalent procedure; its §1.3 does not restate the session-jsonl resolution — it defers to `self-retrospective.md` §1.4, adding two Step 11.6 substitutions |
| `completion.md` | M13 | § Completion reminders render bodies + staging-artifact cleanup |

**Session-jsonl resolution**: `update-rules.md` resolves the session jsonl through `self-retrospective.md` §1.4 / `workability-retrospective.md` §1.3, which upstream calls identical — but §1.3 only points back at §1.4 rather than restating it. So on a run where rule-extraction is active but **neither** retrospective is configured, M12 reads `self-retrospective.md` for that procedure alone and stops at §1.4.

**Script carve-out**: the visual gate's viewer, `../dev-workflow/scripts/plan-review/serve.mjs`, is **executed**, not read, so it falls outside this table's scope. Resolve its path by the same sibling-relative rule (and by the NEEDS-FALLBACK path below when that does not resolve) — never under `mobpro`'s own directory, which ships no `scripts/`.

**Constraint scope**: this "read only the table" rule binds the orchestrator (this SKILL.md) and covers **dev-workflow** files only — `mobpro` freely reads its **own** `references/` (`configuration.md`, `inline-defs.md`, `learning-gates.md`, `diff-review.md`, `crit-diff-review.md`, `plan-format.md`, `m5-plan-approval.md`, `m9-rules-code-review.md`, `m11-commit.md`) as normal skill-internal reads. It does **not** bind reviewer subagents dispatched at M4 / M9 — a reviewer following `step3-plan-review.md`'s instructions to read `review-categories.md` / the two `simplicity-self-audit*.md` files — whichever of them its own group's Reads column names — is normal and out of scope.

**NEEDS-FALLBACK path**: if the sibling-relative read cannot resolve in a given install, resolve `dev-workflow`'s source directory absolutely via `jq -r '(.plugins[] | select(.name == "dev-workflow") | .source)' <marketplace.json>` and read from there instead.

## M ↔ Step remap directive

`mobpro`'s M1–M13 map onto `dev-workflow`'s Step 1–11 / Completion one-to-one. Every reference file read at runtime is written in `dev-workflow` vocabulary, so **remap as you read it**: a `Step N` reference maps to the corresponding M below; a task-row instruction (e.g. "mark `Step 1.5` as `completed`") targets the corresponding M row; a resume-command hint (`/dev-workflow --resume <slug>`) maps to M13's two-command presentation.

| mobpro | dev-workflow Step | mobpro | dev-workflow Step |
| --- | --- | --- | --- |
| M1 Load settings | Step 1 | M8 Check / test | Step 7 |
| M2 Kickoff | Step 1.5 | M9 Rules + code review | Step 7.5 / Step 8 / Step 8.5 |
| M3 Design dialogue | Step 2 | M10 Completion hooks | Step 9 |
| M4 Plan review | Step 3 | M11 Commit | Step 10 |
| M5 Plan approval | Step 4 | M12 Rule update / retrospective | Step 11 / 11.5 / 11.6 |
| M6 Implementation loop | Step 5 | M13 Wrap-up | Completion |
| M7 Tidy + prose polish | Step 6 / 6.5 | | |

## Learning-Stop Principle

`mobpro`'s core discipline, the pedagogical counterpart to dev-workflow's `§ No-Stall Principle`. It is a two-sided rule: `mobpro` stops **only** at the two closed lists below, and nowhere else. It takes effect once M2 has settled the effective task (mirroring dev-workflow's No-Stall scoping "after Step 1.5 resolves the effective task") — so M1's reviewer-fallback prompt and M2's decomposition / leftover-picker dialogues precede the principle and are not listed here.

**(1) Learning stops (closed list).** The deliberate learning-stop points are:

- The M6 diff review — one after **each** implementation unit, always (no setting gates it). It **blocks on the junior's turn** and ends once that turn carries no further question and no change request; procedures per M6 sub-step 2 (d)'s delegation.
- A junior's question raised after M11's "point of this diff" note (respond, then continue; if no question comes, do not stop).

**Narration is not a stop.** M3's design approach, M8's error read, and M9's prediction plus cross-check ([`references/learning-gates.md`](references/learning-gates.md) § B (M8 error narration) / § C (M9 pre-review prediction narration + cross-check)) ask the junior nothing, so they never pause the run. M3's checkpoints in list (2) do stop, but what they ask for is whatever the junior still finds unclear — a gap they report, never a question they have to answer correctly: `mobpro` holds **no** quiz-style comprehension check, and no setting revives one.

**Primary-pass rule**: M9's prediction narration fires only on M9's primary pass — its post-pass aggregate re-verification and the per-round M9 re-runs the M11 `crit` path mandates do not re-fire it. M8's error narration is exempt (every failure is narrated). This paragraph owns that closed list of re-entry sites; other sites cross-reference it rather than re-enumerating them.

**(2) User gates (closed list — approval / judgment).** M3 plan-building checkpoints (M3 sub-step 2.5's **Plan-building checkpoints** gate); M5 plan approval; M8 check/test fail-stop (error-stop after 3 retries) and the two scope stops; M9 persistent-violations gate (not under `--fast`, whose 1-pass cap takes the return before it — § Fast mode) and unresolved-findings gate (the latter only when `code_review_enabled` — M9's code-review pass carries it); M11 commit gates (commit-plan approval / per-commit accept / fold-or-defer / ambiguous-adjust); M12 gates (confirm-remaining-steps / rule-update commit / workability disposition); M13 deferral-exclusion gate and PR-URL prompt.

**(3) Nowhere else.** Outside lists (1) and (2) — sibling-skill return points, no-op results, TaskUpdate / TodoWrite transitions — do not stop; issue the next action in the same turn. An M5 visual-gate browser-submit wait, an M6 / M11 `commit_review_gate: crit` browser-submit wait, and the wait on M9's two concurrent review dispatches are all **harness-tracked background boundaries**, not stops (proceed on the completion notification; never prompt "type continue"). Any new stop point added to M1–M13 must be added to list (1) or (2) in the same change (synchronization audit).

## Cross-step state variables (initialized at M1)

`base_commit` (recorded at M3) / `plan_review_enabled` / `code_review_enabled` / `bundle_skills_unavailable = []` / `landed_count = 0` (incremented by M11 on a landed commit; initialized at M1 — not at M11 entry as dev-workflow does — so M13's branch is well-defined even when M11 is unregistered or skipped) / `implementation_diff_paths` (recorded by M6 step 5's implementation-diff snapshot) / `implementation_boundaries = []` (appended by M6's per-unit review as each unit's object is accepted — [`references/diff-review.md`](references/diff-review.md) § Per-unit review range step 3; read by M11 as the Build-order boundary chain that `../dev-workflow/references/interactive-commits.md` § Propose commit plan consumes) / `m9_fix_files = []` (files edited by M9's rules-compliance fixes and its code-review fixes alike; read by M9's post-pass aggregate re-verification) / `session_scan_dispatched = false` / `session_scan_result = null` (M12 dispatch-once contract) / `state_file_path = null` (the decomposition state file's **resolved absolute path**, set at M2 in both sub-modes — `../dev-workflow/references/task-decomposition-resume.md` § A step 2 on Resume, state-file creation on Normal — and read by M4's subtask scope and M13's lifecycle; **never** re-derived from `slug`; stays `null` on an undecomposed run, which is what M13's "When `state_file_path` is non-`null`" gate tests). `fast_mode_active` (set at M1 sub-step 1's settings resolution; read by every skip site § Fast mode lists) / `fast_mode_skipped_steps = []` (the ledger those sites append to — both are initialized at that same sub-step 1, so M1 sub-step 5's init pass leaves them as it finds them rather than clearing the record sub-step 3 already appended). `mobpro` does **not** carry dev-workflow's `difficulty_skipped_steps` / `review_fix_files` (no difficulty assessment; the M9 fix aggregate uses `m9_fix_files`).

## Configuration

`mobpro` has **no configuration of its own**. It reads dev-workflow's three config layers for the project-characteristic keys, plus `~/.claude/settings.json` as the last link in `language`'s fallback chain. The full schema — the fallback closed list, the not-adopted keys, and the § Resolution procedure M1 follows — is in [`references/configuration.md`](references/configuration.md). Every pedagogical choice is fixed rather than configurable (§ Learning-Stop Principle). `mobpro` runs entirely on defaults when no dev-workflow config file exists anywhere.

**Settings merge strategy**: the fallback keys merge across the dev-workflow layers with dev-workflow's per-class semantics — read [`references/inline-defs.md`](references/inline-defs.md) § (a) (`Keep in sync with dev-workflow SKILL.md § Configuration`).

## Fast mode

`--fast` is an **invocation modifier**, not a config key: nothing in § Configuration resolves it, and M1 sub-step 1 sets `fast_mode_active` from whether the flag was passed on this invocation. It trades the same passes `dev-workflow`'s `--fast` trades, and **nothing else** — every learning stop in § Learning-Stop Principle list (1) still fires, M6's per-unit diff review included, and so does every list (2) gate but the M9 persistent-violations one, M3's plan-building checkpoints included.

**Source of truth: this section; keep in sync.** The closed list of what `--fast` skips, each with the site that performs the skip and the `fast_mode_skipped_steps` record it appends:

| Skipped | Site | Ledger record |
| --- | --- | --- |
| M4 (Plan review) | M1 sub-step 3 sets `plan_review_enabled = false` | `M4 — Plan review skipped (fast mode)` — appended only when the phase was `true` beforehand |
| M5's plan-body prose polish | [`references/m5-plan-approval.md`](references/m5-plan-approval.md)'s **Plan-body prose polish** paragraph | none — a silent skip, since the user gate follows immediately |
| M7's `prose-polish` pass | M7 sub-step 3's `prose-polish` call | `Prose polish skipped (fast mode)` |
| M9's rules re-verification (2nd cycle + persistent-violations gate) | [`references/m9-rules-code-review.md`](references/m9-rules-code-review.md) sub-step 5's **`--fast` 1-pass cap** paragraph | `Aggregate rules re-verification skipped (fast mode)` at M9's own site; `Commit-gate rules re-verification skipped (fast mode)` at the M11 `crit` round |

Every record lands in `fast_mode_skipped_steps` (§ Cross-step state variables), which M13 renders through the Fast-mode-skip reminder, so no recorded skip is silent — the M5 row is the one deliberate exception, and its user gate follows immediately. That reminder renders each record's **phase-name part** and supplies the cause itself, so a record must identify its site inside that part rather than in a trailing parenthetical. This table defines every record above. Append a row here when a new `--fast` skip site is introduced, and sweep [`README.md`](README.md) § Usage's prose summary of the skip set in the same commit.

## Workflow artifacts (cross-step fixed exclusion)

The full definition — the in-session-state files this workflow owns (plan documents under `.claude/plans/`, decomposition state files, backlog files, the M5 visual-gate served / comments / URL / prev files, the rule-extraction candidate file, and other staging artifacts under `.claude/`) and excludes structurally from every changed-file enumeration — is transcribed in [`references/inline-defs.md`](references/inline-defs.md) § (b) Workflow artifacts (`Keep in sync with dev-workflow SKILL.md § Workflow artifacts`). M6 / M7 / M9 / M11 apply that single shared exclusion when building any changed-file set. This heading is the stable anchor other M-steps reference as "§ Workflow artifacts".

## Phase naming in user-facing output

`M1`–`M13` are **internal identifiers**. Never let a bare identifier stand alone in anything the junior reads: chat prose, status lines, gate prompts, skip notes, ledger records, the wrap-up summary, and the task rows themselves. Pair it with what that phase does, or **drop the number** and name the phase. The test is one question: **could the reader recover the meaning from this line alone?** Take the name from that M-step's own heading, minus any trailing parenthetical — the single authority, so one phase never acquires two descriptions — so `## M8 — Check / test (quality gate, max 3 retries)` yields `M8 — Check / test` for a task-row subject, and `M8 (Check / test)` in prose. The two ledgers M13 renders are the carve-outs where the **drop the number** option is available. `bundle_skills_unavailable`'s `<context>` slot takes it because the `dev-workflow` reference files that append to it are shared with workflows that number their phases differently (`extract-rules unavailable (rule update)`, per [`references/inline-defs.md`](references/inline-defs.md) § (f)). `fast_mode_skipped_steps` records are written out in full at § Fast mode's table, each already resolved against this rule — nothing is derived here. The same holds for any **drop the number** label authored inside a shared `dev-workflow` reference file (`Check / Test:` at M11, `the rule-update phase` at M13): that wording belongs to the file, not to this heading list. The name itself stays in English on every `language`. This governs output only — it leaves untouched the identifiers this file uses in its own cross-references, which follow their own number-plus-stable-descriptor rule.

The parenthesized prose form takes the resolved language's own parentheses. Paired bilingual sample (runtime rendering demonstration):

- `language: ja`: `M8（Check / test）`
- `language: en`: `M8 (Check / test)`

## Direct Agent dispatch sites

`mobpro` reaches for the `Agent` tool at exactly these sites — a closed list; everything else delegates through `Skill(<name>)` or launches a process via background Bash. `Counterpart of dev-workflow SKILL.md § Configuration's Agent tool usage bullet; the two lists differ by design and are kept in sync only in shape.`

- **M9's two review dispatches** — `rules-review` and the code reviewer, launched together when background dispatch is available ([`references/m9-rules-code-review.md`](references/m9-rules-code-review.md) § **Concurrent dispatch of both reviews**).
- **M10's review-class `hooks.on_complete` entries** — dispatched concurrently by `../dev-workflow/references/step9-completion-hooks.md` when background dispatch is available. Unlike the other two this site is per-project: it exists only where `hooks.on_complete` names at least one review-class skill.
- **M12's shared session scan** — one dispatch per run (M12 sub-step 3).

M5's visual gate and the M6 / M11 `crit` gates launch a process too, but via **background Bash**, so they are not on this list.

## Dispatch authorization

This skill's procedure dispatches subagents, so invoking the skill **is** the request to use that mechanism: an ambient instruction allowing subagent dispatch only when the user asked for it — a **permission-shaped restriction** — is already satisfied by this invocation. Do not ask the user to re-confirm the dispatch, and do not silently substitute inline execution for a dispatch this procedure specifies. Only two things justify that substitution: **technical availability** (the dispatch tool is not present and callable on the current tool surface), and an **explicit contract term from the caller** bounding this skill to its own thread. A permission-shaped restriction is neither.

## M1 — Load settings

1. **Resolve settings**: read [`references/configuration.md`](references/configuration.md) § Resolution procedure and follow it from top to bottom. Resolution must complete before sub-step 4's registration burst, whose conditional omissions read the resolved `hooks.on_complete` / `interactive_commits`. That procedure also carries the **removed-config tombstone** (`.claude/mobpro.md` / `.claude/mobpro.local.md` are no longer read; it warns once if either is still present). Resolve `fast_mode_active` here too — it comes from this invocation's flags rather than from any of those files (§ Fast mode) — and initialize `fast_mode_skipped_steps = []` alongside it, ahead of sub-step 3's own append to that ledger.
2. Read `../dev-workflow/references/prerequisites.md`. Probe the resolved reviewer with a one-word `ping`; on failure retry once; on persistent failure present that file's three-option fallback prompt (switch reviewer / self-review / pause at the gate). Initialize `bundle_skills_unavailable = []` (append discipline per that file).
3. Resolve `plan_review_enabled` / `code_review_enabled` from `plan_review` / `code_review` (booleans, default `true`, same validation as dev-workflow). **No difficulty-based lowering** — `mobpro` has no difficulty assessment, so nothing turns a phase off on the workflow's own initiative; every gate is a teaching surface. **A configured `false` is honored**: it turns that phase off (M4 for the plan phase, M9's code review for the code phase — each step's own entry condition below). The preceding rule forbids the workflow *deciding* to drop a gate; a configured `false` is the user's own declaration. **`--fast` forces the plan phase off** on the same footing — a flag the caller passed, not a call the workflow made. When `fast_mode_active`, set `plan_review_enabled = false`, and append the record § Fast mode's M4 row defines to `fast_mode_skipped_steps`, on the condition that row states. `code_review_enabled` is untouched — fast mode skips the plan phase only (§ Fast mode).
4. Register all phases with the Task tools (`TodoWrite` fallback where Task tools are unavailable) in one upfront burst: the M1–M13 rows. Subject each row per § Phase naming in user-facing output (`M6 — Implementation loop`), keeping the identifier so later instructions can resolve rows by subject. Conditional omissions — a phase that will not exist on this run gets no `TaskCreate` at all (exactly three): omit `M2` in Resume sub-mode (the row only — M2's Resume path still runs, it just has nothing to register there); omit `M10` when `hooks.on_complete` is unset; omit `M11` when `interactive_commits` is false. `M12` is always one row (it branches internally on the 11.5 / 11.6 conditions).

   **Disabled review phases** are a separate case. When `plan_review_enabled` is `false`, register the `M4` row directly as `completed`. When `code_review_enabled` is `false`, register the `M9` row `pending` as usual — M9 still runs, since its rules-compliance work is not gated on the code phase (M9's "Entry condition — this step always runs" paragraph).
5. Initialize the § Cross-step state variables.
6. Emit the Language checkpoint (`Output language: <lang>`).

## M2 — Kickoff

1. **Normal sub-mode**: read `../dev-workflow/references/task-decomposition.md` for the shared core, then `../dev-workflow/references/task-decomposition-normal.md` § B and follow it. Consider the walking-skeleton decomposition axis as the default candidate and shape the first proposed subtask as "get the minimal happy path working" (proposal-priority only — the § B.1 one-line rationale label still follows that axis's discriminator). The yes / adjust / no gate, state-file creation, and progress row are used verbatim from that reference.
2. **Resume sub-mode** (`--resume <state-file>`): read `../dev-workflow/references/task-decomposition.md` for the shared core it depends on — § State file schema (validate the invariants on every read), § Canonical state-file path (this is what sets `state_file_path`), and § Parent-task progress row — then `../dev-workflow/references/task-decomposition-resume.md` § A and follow it. Two notes: § A step 5's all-subtasks-completed branch routes to the Completion cleanup path (M13 territory), not to M3 — § A's own delete-report-stop applies verbatim there, so none of M13's lifecycle chain runs on a run that executed nothing; and § A step 3a's planning-draft recovery continues in **Normal sub-mode** as written. Because § A records the resolved path (step 2) *before* it discovers the file is a planning draft (step 3), and 3a declares no state file active, **reset `state_file_path` to `null` when 3a fires** — the recovered Normal path re-binds it only if the user then accepts a decomposition.
3. On decompose-accept, add a `Created by: mobpro` line to the state-file body (frontmatter schema unchanged).
4. **Deliberately not adopted**: an up-front learning-goal question — what the junior takes away comes out of the work rather than out of goals declared before any code exists, so M13's learning summary draws on the units they actually reviewed.
5. Settle the effective task and proceed to M3.

## M3 — Design dialogue

1. Record `base_commit`: `git rev-parse HEAD`.
2. **Design-approach narration**: state in 2–3 lines how you intend to build it, name the obvious alternative, and say why this shape beat it. Ask the junior nothing — this is narration, so it does not pause the run (§ Learning-Stop Principle's "Narration is not a stop" paragraph).

2.5. **Plan-building checkpoints (USER GATES)**. Before the plan document is written, do the research the plan rests on and hand it to the junior in installments rather than all at once. Run this **once per run**: M5's adjust bucket revises an already-shared plan through M4 and M5 and never re-enters M3, so the checkpoints do not repeat. Sub-step 2's approach narration was an opening position taken before any of this research existed, so when a checkpoint's findings undercut it, say so at that checkpoint and restate the approach.
   - **Explain the existing code before what you concluded from it.** The junior has not read this codebase, so a checkpoint carrying findings alone hands them a conclusion they have no way to check. Walk the code each checkpoint rests on first: what the relevant part does today and how it is put together, then what follows from it for the plan.
   - **Segment that walk into 2–5 checkpoints** by how much the junior has to hold at once rather than by how much you found — one coherent piece each: the part of the codebase a decision turns on, a constraint that rules an approach out, the Build order you propose.
   - **Do the reading on the main thread**, narrating as you go. Never delegate this research to a subagent — the junior has to see what was consulted, the same rule M6 sub-step 2 (b)'s **AI edits** follow.
   - **Each checkpoint is a partial approval**, covering only what was shared at that point, which is why M5's approval of the finished plan still follows. Per checkpoint: explain, then ask in chat what is still unclear, and wait for the reply. **Only a reply saying nothing was left open advances past a checkpoint** — on anything else, do not advance; take the action § E's matching reply bucket names. This bullet deliberately restates that condition, because it is the text in context when the run decides whether to advance. Keep it in sync with § E's "One reply closes a checkpoint" paragraph. Read [`references/learning-gates.md`](references/learning-gates.md) here and follow § E (M3 plan-building checkpoints) for the prompt wording, the reply classification, and the length.

3. Author the plan document and `Write` it to `.claude/plans/<slug>.md`, following [`references/plan-format.md`](references/plan-format.md) § Template. Localization follows `../dev-workflow/references/localization.md`. Apply `custom_instructions` to plan priorities. **Resolve `<slug>` once per run and reuse it verbatim on any M5 re-entry**: take the state file's `slug` when `state_file_path` is non-`null`, else derive a kebab-case slug from the effective task (transliterate non-ASCII where reasonable, strip punctuation, lowercase), suffixing `-2`, `-3`, … only on collision with an existing `.claude/plans/<slug>.md` from a **prior** run (`Keep in sync with dev-workflow references/step4-finalize-plan.md's Establish the plan document paragraph.`). M5's `visual` gate derives three more paths from the same slug (§ Workflow artifacts), so re-resolving it mid-run would orphan them.
4. **Deliberately not adopted**: the tier assessment (`../dev-workflow/references/tier-assessment.md`, and with it the express lane), the Simplicity self-audit, and the Plan self-check — learning-session plans are small, and simplicity is checked by M4's category (a). dev-workflow's Step 2 codebase research now happens in sub-step 2.5's **Plan-building checkpoints** gate — on the main thread, not delegated to a subagent as Step 2 does.
5. Do not show the plan document to the user or ask for approval of it here — go straight to M4, so the document first reaches the junior at M5 and never arrives unreviewed. What sub-step 2.5 shared is the research behind the document, not the document itself. This is where `mobpro` parts from dev-workflow's Step 2, whose matching prohibition also bars any "shall I go on?" question at this phase: sub-step 2.5's checkpoints ask exactly that, by design.

## M4 — Plan review (quality gate)

**Entry condition — skipped entirely when `plan_review_enabled` is `false`**. Two causes, and no others — `mobpro` has no difficulty assessment, so nothing else lowers the flag: a configured `plan_review: false`, or `--fast` forcing it off at M1 sub-step 3 (§ Fast mode). M1 sub-step 4's registration burst already registered this step's row `completed`, so do not re-mark it: go straight to M5, whose presentation carries no "open points". The plan then reaches the junior unreviewed by the reviewer; M5's approval gate is its only review.

Otherwise, run the single review pass:

1. Reuse `../dev-workflow/references/step3-plan-review.md` sub-step 1's review payload definition — categories a–d, split across the groups that file's table draws, dispatched in parallel — and pass the full plan + `custom_instructions` + the state-file subtask scope (when decomposed) to `Skill(<reviewer>)`. Three adjustments, each landing on a different part of the payload:
   - **The mapping rule goes to every group.** [`references/plan-format.md`](references/plan-format.md) § Review lens translates the section names a `dev-workflow` plan uses into the ones a `mobpro` plan uses (`Decisions` → `Choices I made`, and so on). Hand it to **every** group, not only the one holding category (d): category (a) also tells the reviewer to surface findings as `Decisions` items.
   - **The `plan-authoring.md` substitution**: in whichever group's Reads column names `plan-authoring.md` for the `Decisions` (a)+(b) criterion and § Step 3 (d) content-quality rubric, hand it `references/plan-format.md` § Template instead — § Review lens reached that group already, under the previous adjustment. Resolve that path under **mobpro's** skill directory rather than dev-workflow's same-named file.
   - **The Empty-Decisions drop**: in whichever group's Reads column names `plan-format.md` § Empty-Decisions fixed sentences, omit that item rather than mapping it — it has no counterpart in a `mobpro` plan (`Choices I made` lists every fork, so it is never empty).
2. Judge the response semantically: no actionable findings → mark the `M4` row `completed` and go to M5.
3. Findings → apply to the plan (reject unreasonable ones with a stated reason), then **teach**: explain each applied finding as "what review lens this is" in 1–2 lines, then mark the `M4` row `completed`. Do not re-dispatch the reviewer here; M5's approval gate is the plan's next review surface. **The one exception** is M5's adjust bucket, which re-opens this row and re-runs the pass against a *revised* plan rather than iterating on the same one.
4. Carry any unresolved points into M5's presentation as "open points".

## M5 — Plan approval (USER GATE)

The plan-body prose-polish pass, the approval surface (the visual gate degrading to chat), the plan narration, and the accept / adjust / withdraw outcome classification are in [`references/m5-plan-approval.md`](references/m5-plan-approval.md); `Read` it and follow the procedure from top to bottom.

## M6 — Implementation loop

1. **Unit segmentation**: each `Build order` step in the plan is one unit — register them as implementation sub-rows (additions, not a replacement of the M6 row), splitting any step that covers more than one meaningful change into one row per change as you register it. If the plan carries no `Build order` section, segment it into 3–10 units yourself under the same rule. Initialize the loop-local state [`references/diff-review.md`](references/diff-review.md) defines — `m6_review_base` (to `base_commit`), `m6_staged_paths` (to `[]`), and `m6_crit_available` (unset until its probe runs). All three are M6-loop-local, so none is a § Cross-step state variables member.
2. Per unit: (a) **preview** ≤ 6 lines (what / why / which files) → (b) **AI edits** (main-thread; never delegate to a subagent — the junior must see the edit as it happens) → (c) **walkthrough** per changed file → (d) **diff review** — read [`references/diff-review.md`](references/diff-review.md) at loop entry (it is loop-invariant) and apply it per unit together with [`references/learning-gates.md`](references/learning-gates.md) § A (M6 diff review), which M3 read at its sub-step 2.5's **Plan-building checkpoints** gate. `diff-review.md`'s preamble sends you to a third loop-invariant file, `../dev-workflow/references/diff-presentation.md` — read it at the same point. Preview and walkthrough lengths follow [`references/learning-gates.md`](references/learning-gates.md) § D (explanation length discipline).
3. Apply `custom_instructions` throughout. Per the § Workflow artifacts exclusion, treat `.claude/`-internal state files as excluded from every downstream changed-file enumeration.
4. After the last unit's review resolves, run the **M6-exit unstage** defined in [`references/diff-review.md`](references/diff-review.md) § Per-unit review range — the diff reviews leave their paths staged on purpose, and this is the one place that clears them, so M11 still sees new files as untracked.
5. After all units land, record `implementation_diff_paths = git diff <base_commit> --name-only` (read by M11's Post-hook attribution check).

## M7 — Tidy + prose polish (quality gate)

1. Call `Skill(simplify)`; if unavailable, `Skill(tidy)` (pass `Base ref: <base_commit>`). Resolution / both-unavailable skip / ledger append follow `../dev-workflow/references/prerequisites.md`'s Cleanup skill bullet.
2. If cleanup changed anything, explain why in 1–2 lines (e.g. "this duplication was a future maintenance hazard, so it was pulled into one function").
3. If `polish_prose` is true **and `fast_mode_active` is not** (§ Fast mode), call `Skill(prose-polish)` in file mode (`Language:` = resolved language, no `Model:`). On failure retry once, then skip and append `prose-polish unavailable (prose polish pass)` to `bundle_skills_unavailable`. When `fast_mode_active` is what skips it, append the record § Fast mode's M7 row defines to `fast_mode_skipped_steps`. A `polish_prose: false` skip records nothing — that is a standing project setting rather than something this run did.
4. **No difficulty skip** — M7 always runs, and only sub-step 3's polish is `--fast`-skippable.

## M8 — Check / test (quality gate, max 3 retries)

1. Run `check_commands` in order; on all-pass, run `test_commands` in order (each entry must be of the form `Skill(<name>)`). **Missing test skill**: when a `test_commands` entry names a skill that does not exist (the `Skill()` call fails as not-found, after one retry), that is **not** a test failure — emit the note below, skip that entry, and continue; the retry budget is untouched and the error narration does not fire (there is no failure output to read out).
   - `language: ja`: `test_commands の \`Skill(<name>)\` が見つかりませんでした — このエントリを skip します。テストを走らせるには test_commands にこのプロジェクトに存在するスキルを設定してください（設定方法は README § Configuration）。`
   - `language: en`: `test_commands entry \`Skill(<name>)\` was not found — skipping it. To run tests, point \`test_commands\` at a skill that exists in this project (see README § Configuration).`
2. **On failure**: narrate the read of the error — which part of the message you read and what it says — then fix it without stopping to ask the junior anything (prompt shape and the every-failure rule in [`references/learning-gates.md`](references/learning-gates.md) § B (M8 error narration)). Fix → re-run, up to 3 retries; exceeding that reports and stops (error-stop).
3. **Scope stops**: two step-internal USER GATES apply during `check_commands` (the only non-completing exits here) — the pre-execution scope-narrowing stop and the scope-drift stop. Read [`references/inline-defs.md`](references/inline-defs.md) § (c) and apply both.

## M9 — Rules + code review (quality gate)

**Entry condition — this step always runs**, including when `code_review_enabled` is `false`. That flag gates **only** sub-steps 3 and 4 (the code-review pass and its unresolved-findings gate); sub-step 2's rules-compliance work does not read it, and sub-step 1's pre-review prediction narration and sub-step 5's post-pass aggregate re-verification stay in force. So a configured `code_review: false` narrows M9 to rules compliance rather than skipping it.

The pre-review prediction narration, the concurrent dispatch of both reviews, the rules-compliance and code-review passes, the unresolved-findings USER GATE, and the post-pass aggregate re-verification are in [`references/m9-rules-code-review.md`](references/m9-rules-code-review.md); `Read` it and follow the procedure from top to bottom.

## M10 — Completion hooks

Skip (and do not register) when `hooks.on_complete` is unset. Otherwise, before executing any entry, apply the **task-derived-change gate** transcribed in [`references/inline-defs.md`](references/inline-defs.md) § (d) — skip the whole `hooks.on_complete` list (marking M10 `completed` with a skip-reason line) when there are no task-derived changes since `<base_commit>`. When the gate passes, read `../dev-workflow/references/step9-completion-hooks.md` and run each entry in order (review-class classification, failure-record-and-continue, post-hook re-check).

## M11 — Commit (USER GATES)

Runs only when `interactive_commits` is true (else unregistered). **Read [`references/m11-commit.md`](references/m11-commit.md) first** — it holds the boundary-chain input, the `commit_review_gate` diff-surface branch, and the Step 10 inline definitions the Procedure below consumes as it runs, not after it. Then read `../dev-workflow/references/interactive-commits.md` and follow its **Procedure** from top to bottom, verbatim — starting at § Collect changes, not at § Propose commit plan, which reads what § Collect changes produces. The one learning extension is a 1–2 line "point of this diff" note added to each per-commit presentation; the approval tokens, procedure, and presented elements are otherwise unchanged. `git push` is never performed by any step.

## M12 — Rule update / retrospective

1. **confirm-remaining-steps entry gate** (always presented): ask whether to run the remaining rule-maintenance / retrospective work (list only the sub-phases this run enabled, naming each by what it does — M12's sub-phases are not registered as rows of their own, so they have no identifier to pair and take § Phase naming in user-facing output's **drop the number** option) or skip to M13 (Wrap-up). On skip, mark those `completed` without running and note the skip.
2. Read `../dev-workflow/references/update-rules.md` and run the Step 11 procedure body (`Skill(extract-rules)` and — when `interactive_commits` is true — the rule-update commit gate).
3. When `self_retrospective.feedback` is set, read `self-retrospective.md`; when `workability_retrospective.enabled`, read `workability-retrospective.md`; run each in kind. The shared session scan follows `session-scan.md` § Dispatch-once contract — dev-workflow's participants are Step 11 / 11.5 / 11.6; in `mobpro` the **three sub-phases of M12** are the participants (`session_scan_dispatched` / `session_scan_result` are the M1-declared cross-step variables, and the first sub-phase that needs the scan dispatches it once). This scan dispatch is one of the sites in § Direct Agent dispatch sites. `session-scan.md` § Inputs asks the caller to thread `subagent_model` into the scan subagent's `model`; `mobpro` does not adopt that key (`references/configuration.md` § Not-adopted keys), so omit the parameter and let the scan inherit the session model.
4. `mobpro` is itself a bundle member, so it is one of self-retrospective's improvement-signal targets (registered via that file's Purpose line).

**Step 11 skeleton**: the `rule-extraction-active` gate (double-count defense), session-scan wiring, the extract-rules-unavailable candidates fallback, and the rule-update commit gate firing condition are transcribed in [`references/inline-defs.md`](references/inline-defs.md) § (f) — apply them.

## M13 — Wrap-up (Completion)

1. Read `../dev-workflow/references/completion.md` and run the staging-artifact cleanup. Render only the § Completion reminders whose state exists in `mobpro` — the **6** applicable of dev-workflow's 7: Difficulty-skip never fires (`mobpro` runs no difficulty assessment, so it has no `difficulty_skipped_steps` ledger); Fast-mode-skip (`fast_mode_skipped_steps`), Bundle-skill availability (`bundle_skills_unavailable`), M11 partial-state, and rule-update / examples-dir / staging-dir fire on their conditions. The reminders' `uncommitted_*` partition scan follows [`references/inline-defs.md`](references/inline-defs.md) § (g).
2. **Learning summary**: from the units the junior reviewed and the reasoning that came with them, summarize "what was worth learning here" in ≤ 3 one-line points, plus one line each for the quality-gate outcomes (tests / review / rules).
3. When `state_file_path` is non-`null`, run the state-file lifecycle in this order, applying [`references/inline-defs.md`](references/inline-defs.md) § (g) in full for each item's discipline: deferral/exclusion gate — promote anything excluded or deferred during M6 / M8 into a tracked subtask entry → `completed` write-back → PR-URL prompt → progress-row refresh → find the next runnable subtask (smallest-id `pending` whose `depends_on` are all `completed`; when none remains, every subtask is `completed`) → then **exactly one** of two mutually-exclusive branches. **(i) A next runnable subtask exists**: next-subtask guidance (`landed_count > 0` → "open a PR for the landed commits, then resume"; `== 0` → "commit and open a PR first, then resume", adding the extract-rules residue warning when step 1's `uncommitted_*` sets are non-empty), rendered together with step 4's resume-command pair. **(ii) None remains (every subtask is `completed`)**: emit **no** resume guidance at all — there is nothing left to resume — and instead report the parent task as fully done, listing every subtask's title and its recorded `pr` (if any), the same roll-up `../dev-workflow/references/task-decomposition-resume.md` § A step 5's all-completed branch gives; **then** remove the progress row and delete the state file at `state_file_path` — the roll-up must come first, since the deletion destroys the `pr` records.
4. **Only when step 3 ran and it found a next runnable subtask** — so never on an undecomposed run, and never once the last subtask completed and the state file was deleted — render that step's next-subtask guidance as **both** resume commands (per § M ↔ Step remap directive, dev-workflow's single `/dev-workflow --resume <slug>` hint becomes the pair below):
   - `language: ja`: `学びながら続けるなら /mobpro --resume <slug>、シニアに通常ワークフローで引き継ぐなら /dev-workflow --resume <slug> を実行してください。`
   - `language: en`: `To keep learning through the rest, run /mobpro --resume <slug>; to hand off to a senior on the standard workflow, /dev-workflow --resume <slug>.`
