# Task Decomposition — Normal sub-mode (shared)

## B. Normal sub-mode (`<task>` provided, no `--resume`)

1. Assess whether the task should be decomposed. Keep judgment lightweight and log a one-line rationale **as a chat message to the user** (not a task note or state-file field) that names **which primary signal** drove the decision (e.g. `decompose: 2 distinct verification paths — admin CRUD + chat insertion`, `no decompose: single verification path — bug fix affects one handler`).

   When signals are mixed, err on the side of proposing decomposition. "Feature looks singular" is not sufficient grounds to skip decomposition; what matters is whether verification splits.

   - **Decompose (proactively propose when any of these hold)**:
     - The task splits into 2+ units where **each unit has a distinct verification path** (separate E2E, separate manual check, or separate acceptance criterion — including the case where the same feature must be implemented as 2+ non-shared per-platform / per-screen implementations, e.g. independent PC-screen and mobile-screen controller/view code, each verified separately; this does **not** apply when the platforms share one implementation that merely adapts via responsive layout or styling, which is a single verification path). This is the strongest signal
     - **Workproduct-independence axis**: the units can be reviewed / shipped / deployed as **independent PRs** even when they share a single verification surface. **Count first**: how many units in the request are **independently deployable or publishable** (cloud functions, plugins, packages, services, jobs, endpoints, CLI commands)? Treat a count of **2 or more** as a decompose signal. Migration and bulk-port tasks are where this is missed: the request reads as a single unit ("port package X") while holding N independently deployable artifacts — count those. Where the count is inconclusive the axis is a judgment call, and the case to watch is a pair whose PRs are each independently reviewable while their end-to-end verification only fires once both have landed
     - **Dead-on-arrival acceptability axis**: it is acceptable for one unit to land first as "implemented but not yet consumed" — i.e. a transient dead-on-arrival period until the second unit lands — and the user prefers this over the merged-PR alternative. Self-contained tools (newly published skills, library additions, infrastructure pieces that exist in isolation until callers switch over) carry this axis; tightly coupled changes that break callers / state mid-flight do not (those reduce to the atomicity veto below)
     - "and/plus"-style requests (`X and Y`, `X に加えて Y も`, `X と Y を実装`)
     - Cross-layer work where earlier layers are shippable standalone (e.g. data model → admin page → user-facing feature)
     - Large refactors that benefit from staged rollout
     - **Upper-design-document input axis**: the task input itself is an **upper-level design document that explicitly enumerates independent work units** (a parent plan listing independently-mergeable stages, a handoff document with multiple subtasks already linked via `depends_on`, or any document whose structure already declares the boundaries between independently deliverable units). When the input document has already authored the split boundaries, decompose into the units the document defines rather than re-deriving the split — treat that declaration as a decompose signal even when the distinct-verification-path signal is not separately visible
     - **Incremental-depth axis (walking skeleton)**: the task is a **new feature whose minimal end-to-end (E2E) happy path can be verified on its own**. Propose subtask 1 = a **walking skeleton** (happy path only; hardcoding / stubbing allowed, but wired for real so the E2E passes) and the rest = fleshing-out subtasks (validation → error handling → edge cases → performance / polish), each carrying its own verification path (an error-case test, etc.) in `verification_hint`. **This axis differs in kind from the signals above**: the others *recognize* a split line already present in the request, whereas this one *manufactures* a split line along the depth dimension as a proposal strategy. A discriminator resolves the overlap with the primary signal: label the decompose rationale (step 1's one-line chat message) with the **first (distinct verification path) signal when the split line pre-exists in the request** and with **`incremental-depth` when this axis manufactured the line** — recognizing a pre-existing line takes precedence in the judgment order. Instruct the skeleton subtask to record in its `description` / `verification_hint` **which parts were left hardcoded / stubbed and which fleshing-out subtask resolves each**.
   - **Do NOT decompose (vetoes)**:
     - Single-concern work with one verification path (typo, config tweak, obvious bug fix with an obvious solution)
     - Changes where splitting would break atomicity (e.g. a cross-caller rename must land as one commit to keep the tree compiling)
     - Subtasks so small that per-subtask PR / review overhead would exceed the benefit

   **Precedence when signals conflict**: the primary signal (distinct verification paths) overrides all vetoes. The workproduct-independence, dead-on-arrival, upper-design-document input, and incremental-depth axes override the "subtask too small" overhead veto. The atomicity veto (a split that breaks the tree mid-flight) remains absolute and is not overridden by these axes. Otherwise vetoes override the remaining non-primary positive signals (and-list, cross-layer, staged refactor). **Multi-axis disagreement default**: when the primary signal says "single verification path" but the workproduct-independence, dead-on-arrival, upper-design-document input, or incremental-depth axis says "yes" (or vice versa), err on the decompose-favoring side per the "When signals are mixed" rule above — auto-merge into one task only when the primary signal AND every other axis all agree "no decompose".
2. **If "do NOT decompose"**: mark `Step 1.5` as `completed`, set the "effective task" to the original request, and proceed to Step 2 without creating a state file
3. **If "decompose"**:
   a. Draft a subtask list conforming to the "State file schema" in [`task-decomposition.md`](task-decomposition.md). `verification_hint` describes how completion will be observed (e.g. "migration runs clean", "new auth spec passes", "UI login → logout works end-to-end"). Keep each subtask small enough to ship as a single PR

      **Drawing the boundary when units share code**: for each unit, count the files only that unit touches (**exclusive**) against the files two or more units touch (**shared**), counting per file rather than per symbol. Ample exclusive files per unit means the unit boundary is also a clean subtask boundary — split there. When the exclusive counts are tiny against a dominant shared set, propose those units as **one** subtask instead: its `description` records the shape — Build order runs the shared base first, then one thin step per unit, with each shared file assigned to the earliest step that needs it — and its `verification_hint` names each unit's check. Anything between the two is a judgment call — prefer the unit boundary. This decides **where** the split lines fall, never **whether** to decompose: it does not reverse a **Count first** hit, and where the shared set leaves no boundary standing, the single grouping still goes to step 3.c's proposal with those counts as its stated rationale.

   b. Validate the draft against the schema (DAG, unique ids, required fields). Revise if invalid
   c. Present the proposal to the user as a plain message. List each subtask with its `verification_hint` so the user can judge the breakdown at a glance, then ask for confirmation. Use this shape:

      ```text
      Proposed breakdown into <N> subtasks:

      1. <title>
         Verification: <verification_hint>
      2. <title>
         Verification: <verification_hint>
         (depends_on: [1])
      ...

      Proceed? (yes / adjust / no = run as one task)
      ```

      When step 3.a's boundary analysis collapsed every unit into a **single** grouping, keep the same shape but head it `Proposed grouping — 1 subtask (units share a dominant base):` and give the exclusive / shared counts as that entry's rationale, so the user can judge the collapse before answering.

      For the **incremental-depth axis**, subtask 1 is the skeleton and each later subtask carries its own error- / edge-case verification.

      The `verification_hint` is shown as **advisory context**: a `yes` only locks in subtask boundaries, order, `depends_on`, and purposes. Verification hints remain AI-authored draft and may be refined in Step 2 (Create Plan).

   d. On "adjust": iterate on the list (add / remove / merge / reorder / edit) and re-validate after each revision
   e. On "no": mark `Step 1.5` as `completed` and proceed to Step 2 as a single undecomposed task (no state file)
   f. On "yes", create the state file and pick the first subtask:
      - Generate a kebab-case `slug` from the parent task (transliterate non-ASCII where reasonable, strip punctuation, lowercase). On collision with `.claude/plans/dev-workflow.<slug>.md` (check via Read or Glob), suffix `-2`, `-3`, ... until free
      - Create `.claude/plans/dev-workflow.<slug>.md` matching the schema (all subtasks `status: "pending"`, `pr: null`) plus a short human-readable body summarizing the breakdown. Create `.claude/plans/` first if missing. Record the created file's absolute path as the canonical state-file path
      - Mark the first runnable subtask (`depends_on: []`, smallest id) as `in_progress` and write back
      - Tell the user the state file path and how to resume it: `/dev-workflow --resume <slug>` or `--resume .claude/plans/dev-workflow.<slug>.md`
      - Add the parent-task progress row (see [`task-decomposition.md`](task-decomposition.md) § Parent-task progress row)
4. Set the "effective task" for Step 2 onward to the `in_progress` subtask (or the original request if not decomposed), mark `Step 1.5` as `completed`, and proceed to Step 2
