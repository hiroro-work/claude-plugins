# Task decomposition

Read from `SKILL.md` Phase 2 (Task Decomposition). Unqualified `§` references point into this file.

## Propose a split (Normal sub-mode, full lane only)

Decide from these signals, and say in one line which one drove the decision:

- **Distinct verification paths** (strongest): two or more units each with its own end-to-end check or acceptance criterion.
- **Independent workproducts**: two or more independently deployable artifacts (functions, plugins, packages, services, endpoints, CLI commands). Migrations and bulk ports usually qualify.
- **Acceptable dead-on-arrival**: one unit may land unconsumed until the next lands, and the user prefers that to one large PR.
- **"X and Y" requests**, **cross-layer work** where earlier layers ship alone, **large refactors** that benefit from staged rollout, or **a design document** that already enumerates units (use its units).
- **Walking skeleton**: a new feature whose minimal happy path verifies on its own; subtask 1 is the wired-for-real skeleton (stubs allowed and recorded), later subtasks add validation, errors, edge cases, polish.

Vetoes: one concern with one verification path; a split that breaks atomicity (a cross-caller rename lands as one commit; this veto is absolute); subtasks so small that per-PR overhead exceeds the benefit (overridden by the independent-workproducts, dead-on-arrival, design-document, and walking-skeleton signals). Distinct verification paths override every veto but atomicity. Do not split only when every signal says no.

When units share code, count exclusive versus shared files per unit. Many exclusive files → split at the unit boundary. Few exclusive files against a dominant shared set → one subtask whose description records the shape (shared base first, then a thin step per unit).

Present the subtasks as a plain list with each `verification_hint` and `depends_on`, ending with `Proceed? (yes / adjust / no = run as one task)`. `adjust` → revise and re-present. `no` → run as one task, no state file. `yes` → derive the slug (kebab-case, ASCII, `-2` on collision), read `decomposition-state.md` and write the state file per its § State file with every subtask `pending`, mark the first runnable one (`depends_on: []`, smallest id) `in_progress`, write back, and tell the user the path and both resume forms: `--resume <slug>` and `--resume .claude/plans/dev-workflow.<slug>.md`.
