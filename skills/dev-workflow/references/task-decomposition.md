# Task Decomposition

Deep reference for Step 1.5. Any proposal in this step is a plain yes/no dialogue, not a plan.

## State file schema

Every state file lives at `.claude/plans/dev-workflow.<slug>.md` and consists of YAML frontmatter plus a short human-readable body. Validate these invariants on every read (Resume) and match them on creation (Normal) — stop and report the first violation if broken.

- Required top-level keys: `parent_task` (string), `slug` (kebab-case string), `created_at` (ISO 8601 string), `subtasks` (non-empty array)
- Each subtask has: unique integer `id`, non-empty `title` / `description` / `verification_hint`, `depends_on` (array of prior subtask ids — every referenced id must exist, and the overall graph must be a DAG with no cycles), `status` ∈ {`pending`, `in_progress`, `completed`}, `pr` (string URL or `null`)

**Single-writer constraint**: never run two concurrent `/dev-workflow` sessions against the same state file. Parallel writers race on both the file itself and the shared `git HEAD` that subtasks use as base-commit, silently corrupting subtask boundaries. Different parent tasks (different slugs) in parallel are fine.

## Canonical state-file path

Once a state file is resolved (Resume) or created (Normal), hold its **resolved absolute path** as the canonical state-file path for the rest of the workflow. Every subsequent read, write, and the final delete must target this exact path, never a re-derivation from `slug` — under symlinks, collision-suffixed slugs, or non-standard layouts, the two can disagree and the workflow would orphan or mis-delete state files.

## Parent-task progress row

When a state file is in play, surface parent progress with a single top-level progress row (created via `TaskCreate`): `Parent task: <done>/<total> subtasks done — <slug>`. This row is a progress **display**, not a work item — keep its status as `pending` throughout the parent task's lifetime. Never mark it `in_progress`. Refresh the `<done>/<total>` count (via `TaskUpdate`) whenever a subtask finishes, and remove the row entirely (delete the task, or omit it from the list under the `TodoWrite` fallback) when the state file is deleted. Only insert the row once a state file actually exists (i.e. after [`task-decomposition-resume.md`](task-decomposition-resume.md) § A step 5, or after [`task-decomposition-normal.md`](task-decomposition-normal.md) § B step 3.f). A run that stays undecomposed gets no row.

## A. Resume sub-mode (`--resume <state-file>` provided)

The procedure lives in [`task-decomposition-resume.md`](task-decomposition-resume.md) — `Read` it when `--resume` was provided.

## B. Normal sub-mode (`<task>` provided, no `--resume`)

The procedure lives in [`task-decomposition-normal.md`](task-decomposition-normal.md) — `Read` it when no `--resume` was provided (and from [`task-decomposition-resume.md`](task-decomposition-resume.md) § A step 3a's planning-draft recovery, which continues in this sub-mode).

## End-of-run cleanup

The actual cleanup steps that run when a subtask finishes (mark `completed`, record PR URL, pick next subtask, delete state file when done) live in the **Completion** section of `SKILL.md`. The canonical state-file path recorded in [`task-decomposition-resume.md`](task-decomposition-resume.md) § A step 2 or [`task-decomposition-normal.md`](task-decomposition-normal.md) § B step 3.f is what the Completion section reads and writes.
