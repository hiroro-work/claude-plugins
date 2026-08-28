# mobpro

A learning-oriented development workflow for pairing with a junior engineer. `mobpro` runs the **same quality gates** as `dev-workflow` — plan review, static checks, tests, rules-compliance review, code review, interactive commits, and rule maintenance — but re-shapes the flow so a junior can follow *what* is being built and *why*.

The model is mob-programming with a fixed driver: **the AI always drives** (it writes every edit) and narrates as it goes — what it is about to do, what it just did, and why. The junior **navigates**: while the plan is still being built they are walked through the code it touches in installments and say what is still unclear; after each implementation unit they review that unit's diff and ask whatever the narration left open; and they approve each commit. The junior does not write code, and `mobpro` never asks them to answer a comprehension question — nor does it ask up front what they want to learn, since what they take away comes out of the work rather than from goals declared before any code exists. The learning is in reading each diff, hearing the reasoning, and judging.

> **Install**: use the `dev-workflow-bundle` plugin. `mobpro` reads `dev-workflow`'s reference files as install-time siblings, so a standalone `mobpro`-only install will not work.

## When to use mobpro vs dev-workflow

| Use `mobpro` | Use `dev-workflow` |
| --- | --- |
| A junior is learning from this change | Shipping efficiently is the only goal |
| You want to pause after each unit and read the diff together | You want the workflow to run to completion without learning pauses |
| A teaching session (feature or fix as the vehicle) | Routine / non-interactive execution |

Both use the same reviewer, checks, tests, and rules. `mobpro` adds learning pauses on top; the one gate it does not carry is dev-workflow's Critical-triggered code-review escalation pass.

## Typical sessions

- **Onboarding.** A new team member needs to learn the project's routing, test conventions, and review standards. Run a real feature request through `mobpro`: they hear the reasoning behind each unit, review its diff, and approve each commit — the feature ships and the codebase gets explained in the same pass.
- **Splitting a parent task between a junior and a senior.** Decompose at kickoff, run the first subtask or two under `mobpro` while the junior learns the shape of the change, then hand the rest to a senior with `/dev-workflow --resume <slug>`. The state file carries the subtask boundaries across the handoff — see § Interop with dev-workflow.
- **Teaching review literacy on a bug fix.** A small fix is often the better vehicle: the junior hears how the AI reads the failing output, hears where it expects the reviewer to object, then sees which of those the reviewer actually raised.

## Usage

```text
/mobpro [--fast|--deep] <task>                  # Start a learning session
/mobpro --resume <state-file> [--fast|--deep]   # Resume a decomposed subtask
```

There is no `--init` or `--executor`. The run-mode flags `--fast` / `--deep` work the same way they do in `dev-workflow`, and passing both is a fatal error. `--deep` runs the plan review at full scope; passing neither flag narrows it to project-rule compliance; `--fast` drops that pass altogether, along with the two prose-polish passes, and shortens the rules re-check that follows the review fixes. Everything that makes the session a teaching session stays — the plan-building checkpoints and every per-unit diff review still fire — and the wrap-up lists what was skipped (source of truth: [`SKILL.md`](SKILL.md) § Run modes).

**The plan is written for the junior to read** — plain wording, a numbered build order up front, and the reasoning for that order stated rather than assumed, with each fork in the road shown as a recommendation next to the option it beat, so the junior can weigh the call rather than be handed an undecided choice. Each step of that build order becomes one implementation unit, so the plan doubles as the list of diffs the junior will review (source of truth: [`references/plan-shape.md`](references/plan-shape.md)). The plan is not handed over finished, either: the code behind it is walked through in installments beforehand — what each part does today, then what follows from it — and each installment closes with "anything still unclear?". That is where the junior can redirect the plan, while redirecting is still cheap.

**The git index during the implementation loop**: so that each unit's diff review shows just that unit's delta rather than everything since the run started, `mobpro` stages the unit's changed paths with `git add` and leaves them staged until the loop ends, then unstages that set in one pass — nothing is committed until the commit gate. A path you had staged yourself is left alone unless a unit's review touched it — and then it loses only its staging, never its content (source of truth: [`references/diff-review.md`](references/diff-review.md) § Per-unit review range's **M6-exit unstage** paragraph).

Those per-unit snapshots are also what the commit gate proposes from: the commit plan comes out as **one commit per unit the junior reviewed, in the order they reviewed them** — plus a last commit for whatever the cleanup and review gates changed afterwards — rather than regrouped from the finished tree. So the diffs they approved during the loop and the commits they approve at the end are the same slices — and a unit that revisited a file already touched by an earlier unit still gets its own commit, instead of the two being flattened together. One thing can break that correspondence, and the commit gate asks before it does: when a `pre-commit` hook is installed and the commit plan holds two or more commits — a single per-unit commit plus the final cleanup commit already counts — a hook that shelves the unstaged changes to reformat the staged ones can fail to put them back. You choose between dropping the per-unit commits so every hook runs (they then carry final content rather than the reviewed slices) and proceeding unchanged, with a third option — keep them and suppress that one hook manager — offered whenever a suppression setting for it can be resolved (source of truth: `../dev-workflow/references/interactive-commits.md` § Propose commit plan's **Stashing-hook incompatibility gate**; keep in sync).

### Adding or dropping a run-mode difference

`SKILL.md` § Run modes' table is the closed list of what the `fast` run mode skips, one row per skip site with the `fast_mode_skipped_steps` record it appends. A difference that **skips** work appends to that ledger; one that **adds** work — anything on the `deep` side — records nothing, so the ledger stays fast-specific. Adding or dropping a row there sweeps the skip-set summary in § Usage above in the same commit.

### Adding an inline explanation-length cap

[`references/learning-gates.md`](references/learning-gates.md) § D is the single consolidated statement of the explanation-length discipline. The caps quoted inline at their application sites instantiate it and stay inline rather than being rewritten into pointers to it. Adding one sweeps § D in the same commit. The inline sites: M3's and M5's "2–3 lines" narration, M4 / M9's "1–2 lines" per applied finding, M6's "≤ 6 lines" preview, M7's "1–2 lines" cleanup explanation, M11's "1–2 line" point-of-this-diff note, and M13's "≤ 3 one-line points" learning summary.

### Renaming a plan-section heading

[`references/plan-shape.md`](references/plan-shape.md) § Template's heading names are the source of truth for every site that names them verbatim. Outside that file: the `SECTION_TYPES` prefix table in dev-workflow's `scripts/plan-review/public/plan-parse.mjs` (which M5's visual gate classifies plans with), [`references/m5-plan-approval.md`](references/m5-plan-approval.md) § **Approval surface** and its § **Chat path** sub-step's swap-dependent sweep list, and `SKILL.md` M6 sub-step 1's unit segmentation. Inside it: the paragraph below the template block, § Review lens' opening paragraph, every § Review lens bullet, and § Figures' targetable-section list. Renaming a heading sweeps all of them in the same commit. One carve-out: `Build order` and its step shape are owned upstream by `../dev-workflow/references/plan-authoring.md` § Template, so a rename of that heading starts there and sweeps that section's closed list together with this one — the sites listed above name `Build order` too.

## Interop with dev-workflow

`mobpro` and `dev-workflow` share the same decomposition **state-file** schema and path (`.claude/plans/dev-workflow.<slug>.md`). So a parent task can be started under `mobpro` (learning through the first subtasks) and the rest handed off to a senior with `/dev-workflow --resume <slug>` — or the reverse.

**Single-writer rule**: never run two sessions (mobpro or dev-workflow) against the same state file at once — parallel writers race on both the file and the shared `git HEAD` base-commit and silently corrupt subtask boundaries. Hand off sequentially: finish (and commit) one subtask, then resume in the other tool.

## Configuration

`mobpro` has **no configuration of its own**. It reads your `dev-workflow` configuration for everything that describes the project, runs on sensible defaults even when no config file exists anywhere, and never writes to `dev-workflow`'s files.

The teaching behavior is deliberately not configurable: the plan-building checkpoints and the per-unit diff review always fire, and there is no comprehension-check gate to turn on or off. The **review** gates are a different matter — the code phase is a project characteristic, so `code_review` governs it here exactly as it does in `dev-workflow`: `code_review: false` narrows the rules-and-code-review phase to its rules-compliance half rather than skipping it. The plan-review phase is not configured at all — it comes from the run mode (§ Usage). When that leaves the pass narrowed or off, the approval gate says so, since the plan's design then reaches the junior unreviewed. Earlier versions exposed `checkpoint`, `quiz`, and `error_reading_practice` in `.claude/mobpro.md` / `.claude/mobpro.local.md`; those keys are gone — the always-on gates above are not them coming back — and `mobpro` warns once if either file is still present so the change is not silent.

**Inherited from dev-workflow** — the project-characteristic keys (`reviewer`, `code_review`, `check_commands`, `boundary_check_commands`, `test_commands`, `language`, `interactive_commits`, `commit_review_gate`, `hooks`, and the rest of the closed list) are read from `~/.claude/dev-workflow.local.md` → `.claude/dev-workflow.md` → `.claude/dev-workflow.local.md` using dev-workflow's own merge rules. Setting `commit_review_gate: "crit"` there makes `mobpro` show diffs in crit's browser view instead of chat — both the per-unit diff review during implementation and each commit's diff at the commit gate — which is usually easier for a junior to read. Each of those views opens on a story: a prologue saying what the change does and what to watch for, plus chapters grouping the diff's hunks. At the commit gate it is built from the commit message; during implementation, from the point of that unit. Approving the commit plan also carries an extra option: skip the review of the commits that correspond to units already reviewed during implementation — no browser round-trip and no second approval, since the plan approval covers them. Each still shows its subject, message, file list, and check/test result, plus the point of that commit, so the junior can follow along — only the diff and the second confirmation go away. `crit` is a separately-installed local CLI, so both gates fall back to the chat diff when it is not installed or no local browser is reachable (as on Claude Code on the Web).

Setting `boundary_check_commands` there runs those commands as each implementation unit's object is built, so the diff the junior reviews is already the content that will be committed. `mobpro` runs them on every run — it builds a unit object regardless of `interactive_commits`, which in `dev-workflow` gates the equivalent step (source of truth: [`../dev-workflow/references/diff-presentation.md`](../dev-workflow/references/diff-presentation.md) § Caller endpoints' `step 1.5 command list` column).

The plan approval opens the bundled browser review gate, degrading to a chat approval when no local browser is reachable. The AI speaks its short walkthrough of the plan in chat either way.

**About `test_commands`' default** — it defaults to `["Skill(run-tests)"]` (source of truth: [`references/configuration.md`](references/configuration.md) § Fallback keys' Default column), and `run-tests` is not bundled: `dev-workflow --init` generates it into the consuming project, and `mobpro` has no `--init`. On a project that never ran `--init`, `mobpro` skips that entry with a note rather than reporting a test failure (`SKILL.md` § M8 — Check / test is the source of truth for that disposition) — point `test_commands` at a `Skill(<name>)` that runs your tests (entries are skill invocations, not shell commands), or run `dev-workflow --init` to generate `run-tests`.

**Deliberately ignored** — `implementation_executor` and `subagent_model` are dev-workflow keys `mobpro` does not honor. They are ignored silently, since they remain valid settings for `dev-workflow` itself. `implementation_executor` stays `main` for the same reason the AI always drives: the junior has to watch each edit land. `subagent_model` has nothing to resolve against, since `mobpro` runs no difficulty assessment.

See [`references/configuration.md`](references/configuration.md) for the full schema, the complete fallback list, and the canonical list of ignored keys (§ Not-adopted keys). Source of truth for the **Deliberately ignored** paragraph above is that section's list; keep the two in sync — adding a key there sweeps that paragraph in the same commit.
