# Plan format

Read from `SKILL.md` Phase 3 (Create Plan) and Phase 5 (Plan Approval). The file `.claude/plans/<slug>.md` holds the full body under a `## Plan` heading, sections as `###`, in this order. Section headings, field labels, and the Scope kind tokens stay English; prose follows the resolved language.

1. `> Review guide` — two lines: the must-review sections (Overview, Decisions, Build order) and the reference sections (Test plan, Risks).
2. `### Overview` — one-line field bullets, in this order: **Now** (what stands today, one sentence), **After** (what the user gets, one sentence), **Not changing** (what this plan leaves alone; `nothing` when there is no boundary worth naming), **Approach** (one or two sentences), **Highlights** (optional: migrations, destructive operations, breaking contracts, new dependencies, security), **Difficulty** (the tier), **Scope** (`N files`, then one nested line per file in the shape below). The viewer renders Now / After side by side, Highlights and Not changing as bands, Difficulty as a chip, and Scope as a table; the counts it shows are read from the plan, never written.
   Scope line shape, `<kind>` one of `new` / `edit` / `delete`, the step tag naming the Build order step(s) that touch the file (a range or list allowed: `(steps 4–6)`); files that move together may share a line:

   ```markdown
     - <kind> `<path>` — <one-line change> (step <N>)
   ```

3. `### Decisions` — one to five items the user should judge. Each item is `**Question**`, `**Recommendation**`, optional `**Alternative**`, nothing else. The Recommendation is the conclusion in two or three lines, followed by at most three nested rationale bullets; the Alternative is one or two lines. An item qualifies only when (a) reasonable engineers could disagree and (b) reversing it later costs real rework. A choice of value or threshold, or a "why X over Y" hidden in Build order, is a Decision and moves here. When nothing qualifies, the section is exactly: `No user decisions required — approve if the approach looks reasonable.`
4. `### Build order` — a numbered list, each step `N. **<verb-first heading naming the files>** — <what this step changes, one line>`, then the how (identifiers, values, commands, edge cases) on nested lines beneath it, uncapped: Implement follows these lines and reads nothing else. The one-line what may be omitted when the heading says it. If order is free, one line says so.
5. `### Test plan` — test files, types, and coverage, or the justification for no tests; each item names the Build order step it verifies.
6. `### Risks / Unknowns` — optional; omit when empty.

**Compact shape (express lane)**: Overview, Decisions (always the fixed sentence), Build order, Test plan, in that order; no Review guide, no Highlights, no Risks. If a qualifying Decision surfaces while drafting a compact plan, the tier assessment was wrong: say so in one line, keep the tier, and write the item anyway.

**Presentation at Plan Approval**: `## Plan`, the Review guide, Overview and Decisions in full, Build order as headings only, Test plan and Risks as heading plus a one-line gist, then `---`, a 3–5 bullet summary (After and verification always; decisions, risks, main files when present), one guidance line (there are Decisions to judge / no Decisions, approve if reasonable / this is subtask N of M), and the plan path. The review-status sentence comes from `plan-approval.md` § Chat gate.
