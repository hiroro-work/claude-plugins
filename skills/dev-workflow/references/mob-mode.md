# Mob mode

Read at Load Settings when `mode` is `mob`; never opened in solo mode. Unqualified `§` references point into this file; `Phase N` refers to `SKILL.md`. Mob mode is the learning-oriented run: the AI drives (writes every edit, on the main thread, never delegated) and narrates; the junior navigates, reads each unit's diff, asks, and approves commits. Every phase, gate, setting, and tier rule of the solo run still applies; this file adds stops and narration and replaces the plan shape. Pedagogy never scales down: the stops below fire at every tier and under every run mode.

## Learning stops

Two stops exist on top of `SKILL.md` § User gates, and no setting turns them off:

- The per-unit diff review in Implement (§ Per-unit review), after every unit. It blocks until a junior turn carries no question and no change request.
- A junior's question after a commit's "point of this diff" note (§ Commits). Answer, then continue; no question, no stop.

One extra user gate: the plan-building checkpoints — the orientation checkpoint and the detail checkpoints of § Design dialogue. Narration never stops: the design-approach narration, the check/test error read, and the pre-review prediction ask nothing. There is no quiz anywhere; a checkpoint asks only what is still unclear.

**Register**: speak as a senior pairing with a junior — complete sentences in the resolved language, plain words, and the reason alongside the fact. The caps below bound length, not tone: never collapse a narration or an answer into fragments, labels, or a bare list.

**Explanation caps**: preview ≤ 6 lines; per-file walkthrough 1–3 lines plus 1–2 lines of why; existing-code explanation 1–3 lines per file; every other narration or answer 2–3 lines; an applied-finding explanation 1–2 lines.

## Design dialogue (Create Plan)

1. **Orientation checkpoint (USER GATE, always first)**. Before any code detail, align on the task and the terrain in two short parts: (a) the task in the junior's terms — what will exist when it is done, what stays out of scope, and any assumption you are making about the request; (b) a map of the part of the codebase the task touches at the file and module level — which files exist, what each is for in one line, and how they connect — without line-level detail or design options. End with the same open invitation every checkpoint uses and wait. A correction to the task understanding is applied before anything else is read in depth.
2. **Design-approach narration**: how you intend to build it, the obvious alternative, why this shape won.
3. **Detail checkpoints (USER GATE, once per run, before the plan is written)**. Do the research on the main thread, narrating. Segment it into 1–4 checkpoints by how much the junior must hold at once, one coherent piece each: the code a decision turns on, a constraint that rules an approach out, the proposed build order. Each checkpoint explains what the code does today before what follows for the plan, and starts by naming which part of the orientation map it zooms into. The first one says how many parts are left. Every checkpoint ends with an open invitation as the turn's last line — in the resolved language, worded like "Is anything unclear so far?" rather than a demand to name gaps — then waits. Replies: **go on** (nothing open) → next checkpoint or plan authoring; **question** → answer, ask again; **change** (look elsewhere, different direction) → do it, share, ask again; **not an answer** → ask a confirming question, neither advance nor re-share. A reply doubting the output arrived → re-share the checkpoint, shorter. If a checkpoint undercuts the approach narration, say so there and restate it.
4. Write the plan in § Plan shape. Skip Phase 3's simplicity self-audit. Do not show the plan or ask anything here; go to Plan Review.

## Plan shape

Replaces `plan-format.md`'s sections at every tier (no compact shape). Headings verbatim English; body in the resolved language. Under `## Plan`, in order:

- `### What we're building` — field bullets **Now** (what the code does today, one plain sentence), **After** (what the junior will have at the end, one plain sentence), **Scope** (`N files`, then one nested line per file in the Scope line shape `plan-format.md` defines, the change described in the junior's terms).
- `### Build order` — numbered `N. **<verb-first heading naming the files>** — <detail>`, typically 3–10 steps; one step = one change that can be followed in a single diff review. Implement segments on this and nothing else.
- `### Why this order` — 2–4 lines on dependencies and what breaks in another order.
- `### Choices I made` — one item per fork the build actually faced, no filtering by consequence, in the `**Question**` / `**Recommendation**` / optional `**Alternative**` shape, the Recommendation a two-line conclusion plus at most three nested reason bullets; omit `Alternative` when there was no real second option. When no fork qualifies, say so in one sentence.
- `### How we'll check it works` — one line per check, each naming the Build order step it verifies.
- `### Watch-outs` — optional; open points and risks. Omit when empty.

Plan Review reads this shape through five lenses instead of `plan-format.md`'s criteria: structure (the five required headings, step and item forms); hidden choices (a step or ordering that rests on a fork the choices never name); coverage (every step reached by a check); plain enough to follow (could someone new predict each unit's diff?); cross-file consistency. The absence of Overview / Decisions / Test plan is never a finding. After applying findings, explain each in 1–2 lines as "which lens this is". Never re-dispatch the reviewer, including Phase 4's approach-rewrite exception.

The browser gate composes the served copy from this plan; the figures layer always writes a `## Hero` block.

## Plan Approval

The browser gate runs at every tier, Trivial included; only a remote session (`CLAUDE_CODE_REMOTE=true`) falls back to chat. Before launching (in the launch turn, since the gate renders nothing afterwards) narrate in 2–3 lines what the plan builds and in what order; when Plan Review did not run or ran rules-only, say so and name the cause. The chat path keeps its read-back; the browser path has none.

## Per-unit review (Implement)

Each Build order step is one unit, registered as a sub-row; split a step covering more than one meaningful change into one row per change; the unit's name (the preview's) is its snapshot message, so split units get distinct commit subjects. Per unit, in order:

1. **Preview** (≤ 6 lines): what, why, which files.
2. **Edit** on the main thread.
3. **Walkthrough**: per changed file, what changed and why it was done that way.
4. **Snapshot** per `snapshots.md` § Snapshot at a Build order step boundary. The unit diff is `git diff <prev> <snapshot>`.
5. **Diff review (learning stop)**: open with the point of this unit's diff, hand the diff over (chat presentation, or the crit browser over `<prev>..<snapshot>` when `commit_review_gate` is `crit` and crit is available), invite questions, wait. Replies: **question needing no code change** → answer in 2–3 lines, wait again; **change request** → apply it, explain the fix in 1–2 lines, rebuild the snapshot from the same `<prev>` (the previous unit's snapshot, not the ref's current value, which is the object being replaced; rerun the snapshot recipe and `update-ref` over the old tip), re-present — a change never resolves the unit by itself; **a turn with neither** → the review is over, go to the next unit without soliciting another turn. On the crit surface, `approved: true` ends the review; `approved: false` with comments → handle every comment (edit or answer), rebuild, new round; without comments → new round, saying the submit changed nothing; an unparseable result → chat for this unit only.

Phase 6's step numbering otherwise holds: manual actions block first, out-of-plan files are added to Build order before editing, and `git add -N` for new files follows the last unit.

## Tidy

When the cleanup changed anything, explain why in 1–2 lines.

## Check / Test

Never hand an error over. On every failure, including re-entries from Verify Fixes and Interactive Commits, narrate four things before fixing: which command failed, which part of its output you read and what it says, the cause you drew, the fix you are about to make. On EXECUTION_ERROR narrate the first three and hand over at the gate. A `test_commands` entry naming a missing skill is noted and skipped without narration.

## Code Review

Before the reviews are launched (at Check / Test entry, or inline when the launch is skipped), predict where findings will land: name only the checks this run dispatches, then one clause per predicted spot, what this run wrote first, then pre-existing code. On Trivial say in one line that neither review runs and why. After the results return, cross-check the prediction, acknowledging what it got right before what it missed. Prediction fires only on the first pass, not on Verify Fixes. Phase 11's Critical-triggered escalation pass is not run in mob mode; the per-unit reviews and the unresolved-findings gate carry that weight.

## Commits

- Each commit's presentation gets a 1–2 line "point of this diff" note; on the crit path it goes out in the launch turn. A junior's question after it is a learning stop.
- At the commit-plan gate (chain path), label each commit by comparing it with the snapshot the junior reviewed at the same position on `refs/dev-workflow/<slug>-reviewed`: `same as reviewed` (empty `git diff <S_k> <commit>`), `changed since review` (name the files and hunk count), or `not reviewed` (the trailing review-fixes commit). Offer an **already reviewed** variant of accept: land `same as reviewed` commits without a gate; gate `changed since review` commits on the delta `git diff <S_k> <commit>` only (in the crit browser over `<S_k>..<commit>` when crit is in use, its story prologue saying these are fixes that landed after the unit review); gate `not reviewed` commits in full. Plain `accept` gates every commit in full. At a delta gate, a request to see the whole commit is answered with the full diff, then the wait resumes. Cohesion-path commits are always gated in full.
- At every gate in this phase, say what is being fixed and why before asking.

## Completion

Add a learning summary: "what was worth learning here" in ≤ 3 one-line points drawn from the reviewed units, plus one line each for tests, review, and rules outcomes. For a decomposed run, give both resume commands: `/mobpro --resume <slug>` to continue learning, and `/dev-workflow --resume <slug>` to hand off; the state file is shared.

## Other differences

- Task Decomposition: the walking-skeleton axis is the default candidate, and the first proposed subtask is "get the minimal happy path working". On accept, add a `Created by: mobpro` line to the state-file body.
- Comment discipline adds to Phase 7's rule: default to no comment, write one only where the why is non-obvious and keep it to one line; an explanation for the junior belongs in the walkthrough, never in a comment; a comment the junior asks for is written.
