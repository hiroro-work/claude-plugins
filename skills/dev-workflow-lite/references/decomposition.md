# Task decomposition

Read from `SKILL.md` Phase 2 (Task Decomposition) and Phase 18 (Completion). Unqualified `§` references point into this file.

## State file

Path `.claude/plans/dev-workflow.<slug>.md`, the same format `dev-workflow` writes, so a split started by either skill resumes in the other. YAML frontmatter plus a short human-readable body.

```yaml
---
parent_task: "<the user's request>"
slug: "<kebab-case>"
created_at: "<ISO 8601>"
subtasks:
  - id: 1
    title: "..."
    description: "..."
    verification_hint: "How completion is observed"
    depends_on: []
    status: pending        # pending | in_progress | completed
    pr: null               # URL string once known
---
```

Validate on every read: the four top-level keys present, ids unique integers, `depends_on` only earlier existing ids with no cycles, every string non-empty. Stop and report the first violation; the user repairs the file. Once resolved, hold the absolute path and use it for every later read, write, and delete. Never run two sessions against one state file.

## Propose a split (Normal sub-mode, full lane only)

Decide from these signals, and say in one line which one drove the decision:

- **Distinct verification paths** (strongest): two or more units each with its own end-to-end check or acceptance criterion.
- **Independent workproducts**: two or more independently deployable artifacts (functions, plugins, packages, services, endpoints, CLI commands). Migrations and bulk ports usually qualify.
- **Acceptable dead-on-arrival**: one unit may land unconsumed until the next lands, and the user prefers that to one large PR.
- **"X and Y" requests**, **cross-layer work** where earlier layers ship alone, **large refactors** that benefit from staged rollout, or **a design document** that already enumerates units (use its units).
- **Walking skeleton**: a new feature whose minimal happy path verifies on its own; subtask 1 is the wired-for-real skeleton (stubs allowed and recorded), later subtasks add validation, errors, edge cases, polish.

Vetoes: one concern with one verification path; a split that breaks atomicity (a cross-caller rename lands as one commit; this veto is absolute); subtasks so small that per-PR overhead exceeds the benefit (overridden by the independent-workproducts, dead-on-arrival, design-document, and walking-skeleton signals). Distinct verification paths override every veto but atomicity. Do not split only when every signal says no.

When units share code, count exclusive versus shared files per unit. Many exclusive files → split at the unit boundary. Few exclusive files against a dominant shared set → one subtask whose description records the shape (shared base first, then a thin step per unit).

Present the subtasks as a plain list with each `verification_hint` and `depends_on`, ending with `Proceed? (yes / adjust / no = run as one task)`. `adjust` → revise and re-present. `no` → run as one task, no state file. `yes` → derive the slug (kebab-case, ASCII, `-2` on collision), write the state file with every subtask `pending`, mark the first runnable one (`depends_on: []`, smallest id) `in_progress`, write back, and tell the user the path and both resume forms: `--resume <slug>` and `--resume .claude/plans/dev-workflow.<slug>.md`.

## Resume

1. Resolve the argument, first hit wins: an existing path; `.claude/plans/<arg>`; `.claude/plans/dev-workflow.<arg>.md`. Not found → list `.claude/plans/dev-workflow.*.md` and stop.
2. A file with no frontmatter, or without `parent_task` / `subtasks`, is not a state file: say so, treat it as an inherited spec, set the effective task to its first heading or paragraph, and continue in Normal sub-mode without a state file.
3. Validate (§ State file).
4. Pick the subtask. All `completed` → go to § Finish a subtask's final step. No leftover `in_progress` → take the runnable frontier (`pending` with all dependencies `completed`); empty frontier → stop and report; one candidate, or none whose description carries a readiness condition ("resume only when X") → take the smallest id; otherwise ask the user to pick (USER GATE). Leftover `in_progress` entries → keep the runnable ones as candidates alongside the runnable `pending` ones, reset unrunnable leftovers to `pending`, and ask the user to pick when more than one remains. Mark the choice `in_progress`, write back.
5. Summarize which parent task resumes, which subtask is current, and its `verification_hint`. The subtask is the effective task; the parent text and sibling statuses are background context.

## Finish a subtask (Completion, decomposed runs only)

1. If work items were excluded or deferred during this run and live only in prose, ask the user per item: add as a new `pending` subtask (with `depends_on` when order matters), fold into an existing pending subtask, or accept as out of scope. Items left in prose are invisible to `--resume`.
2. Mark the subtask `completed`; write back.
3. Ask for an optional PR URL (USER GATE); set `pr` when given.
4. Find the next runnable subtask. If one exists and `landed_count > 0`: tell the user to open a PR for the landed commits, then start a new session with `--resume <slug>`. If one exists and nothing landed: tell the user to commit and open a PR first, because the next run takes a fresh `<base-commit>` and uncommitted changes would leak into the next subtask's diff. Add, when rule files remain uncommitted, that those need committing too. Never push.
5. If no subtask remains: `rm -f <state-file path>` and list every subtask's title and `pr` in the summary.
