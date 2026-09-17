# Audit Pass — Procedure and Subagent Instructions

Deep reference for `SKILL.md` **Audit Pass**. The pass re-judges the entries an incremental run has just written, against the same extraction criteria that produced them, from a dispatch that never sees the run's input. Unqualified `§` references point into this file; references to `Step C5` name `references/conversation-mode.md`.

## Contract

- **Input** (to the subagent): the sections § Dispatch enumerates — that fence list is the single statement of what crosses the boundary. The subagent `Read`s the target files and the criteria sections itself
- **Output** (from the subagent): a single fenced JSON block matching § Response schema, with no prose around it
- **Apply phase**: the main thread applies `mechanical_edits` via `Edit`. The subagent does not call `Edit`

## What the pass judges

The target set is the **write record** the calling mode's write step kept — `references/conversation-mode.md` § Step C5 item 4 for Conversation, Conversation Candidate Apply, and PR Review, `references/update-mode.md` § Step U5 for Update. One target per bullet the run appended or promoted, carrying the file's absolute path, the bullet line verbatim, and the report section that will list it. Nothing else is a target: entries written before this run are out of scope, and `--realign` judges those. The run's report renders the same writes but is not the source, and a `.examples.md` write never enters the record.

The main thread derives each target's **label** from its bullet — the leading label or signature, in the sense `references/realign-mode.md` § Response schema gives the term — and sends it with the bullet. The verbatim bullet is what disambiguates a label that repeats elsewhere in the file.

When the record is empty, do not dispatch: report in one line that the pass had nothing to judge, and return.

The record is what the subagent is told to judge and the only thing it may judge. § Parse failure and schema violation rejects a verdict that reaches outside it.

## Judgement criteria

Read `<skill dir>/references/extraction-criteria.md` § What a Rule Is Made Of, § Durability: Would This Change What Gets Written Next Time?, and § Reach: Is the Rule Worth Its Permanent Cost?. Those sections are the criteria. Do not invent others.

Apply `references/extraction-criteria.md` § What a Rule Is Made Of's **"Exit test"** paragraph to every target entry.

The unit of judgement is one top-level bullet under a section heading. Never judge or move a heading, and never judge a file's preamble prose.

## Verdicts

`references/realign-mode.md` § Verdicts governs: its closed list of four, its definition of each, and its `reason` requirement all apply here unchanged. Do not add a verdict to that list.

## Forbidden tool calls

You are an **analysis-only** subagent. Your sole output is the fenced JSON verdict block § Response schema defines. The main thread owns every file-writing action.

**Do not call any of these from this dispatch**: `Edit` — propose edits as `mechanical_edits` entries instead; `Write`; any other file-writing or working-tree-mutating tool (`NotebookEdit`, `Bash(rm *)`, `Bash(mv *)`, `Bash(cp *)`, `Bash(sed -i *)`, a shell redirection into a file).

**Do not read the run's input** — the session `.jsonl` the extraction ran over, the PR comments it fetched, or the source files it scanned. Judge each entry from its written text alone.

## Dispatch (main thread)

One dispatch covers the whole target set. Spawn an `Agent` (`subagent_type: general-purpose`), assembling the prompt from these `--- LABEL ---` fence sections. This list is the **closed set** of what reaches the subagent; a constraint absent from it does not cross the boundary, however firmly this file states it:

- `--- SKILL DIR ---`: this skill's absolute directory path, so the reference paths below resolve
- `--- TARGET ENTRIES ---`: for each file holding targets, its absolute path and, per target, the label the main thread derived and the bullet line verbatim, plus the instruction to `Read` each file in full before judging, to judge only the listed entries, and to echo each label back in `rules` unchanged
- `--- JUDGEMENT CRITERIA ---`: § Judgement criteria **verbatim**
- `--- VERDICTS ---`: § Verdicts verbatim, plus `references/realign-mode.md` § Verdicts verbatim, which it defers to
- `--- FORBIDDEN TOOL CALLS ---`: § Forbidden tool calls verbatim — **this file's**
- `--- MECHANICAL EDITS SCHEMA ---`: § `mechanical_edits` schema verbatim, plus the sub-rules it reaches only by pointer — `references/realign-mode.md` § `mechanical_edits` schema's surrounding-context and `new_string` rules, and the two they take from `references/compaction-mode.md` § `mechanical_edits` schema. Take those rules only, not either section's JSON block
- `--- RESPONSE FORMAT ---`: § Response schema verbatim
- `--- CALLER DIRECTIVE ---`: § Sub-skill caller directive verbatim

## Response schema

Emit a single fenced JSON block at the end of the response, matching this schema, and write no other prose:

````json
{
  "rules": [
    {"label": "<the label `--- TARGET ENTRIES ---` gave, echoed unchanged>", "file": "<absolute path, as `--- TARGET ENTRIES ---` gave it>", "verdict": "keep|drop|split|reshape", "reason": "<one sentence>", "resulting_labels": ["<label>", "…"]}
  ],
  "mechanical_edits": [
    {"file": "<absolute path, as `--- TARGET ENTRIES ---` gave it>", "label": "<matching rules[].label>", "old_string": "<unique 1-3 line snippet>", "new_string": "<replacement>", "reason": "<short reason>"}
  ]
}
````

`resulting_labels` is required on a `split` entry and omitted on every other verdict. Every target entry appears exactly once in `rules`, `keep` entries included. `mechanical_edits` carries an entry for each non-`keep` entry and nothing else.

## `mechanical_edits` schema

`{"file": "<the entry's file, as its rules entry gives it>", "label": "<the entry's label, matching its rules entry>", "old_string": "<unique snippet>", "new_string": "<replacement>", "reason": "<short reason>"}`

`references/realign-mode.md` § `mechanical_edits` schema governs how `old_string` and `new_string` are written, including the two conventions it takes from `references/compaction-mode.md` § `mechanical_edits` schema. Its one difference here: `file` is the file the entry lives in rather than a per-dispatch target file.

## Parse failure and schema violation (main thread)

Evaluate in order, first match wins:

1. **No write record returned**, or **no fenced JSON block, or the JSON fails to parse** → the pass did not run.
2. **Schema violation** → the pass did not run. Validate all of this before any `Edit`:
   - `rules` missing or not an array; an entry missing `label` / `file` / `verdict` / `reason`; a `verdict` outside the closed list; a `split` entry whose `resulting_labels` is missing, empty, or holds anything but non-empty strings.
   - The `(file, label)` pairs in `rules` are **exactly** the targets the dispatch listed — none missing, none added, none repeated.
   - A `mechanical_edits` entry missing `file` / `label` / `old_string` / `new_string`.
   - **Correspondence, both directions**, matched on the `(file, label)` pair, never on `label` alone: every `mechanical_edits` pair matches some `rules` pair, and every non-`keep` entry has exactly one edit.
3. **Otherwise** → apply.

On either failure the run's writes stand as the extraction left them, and § Report format carries a line naming the failure. A failed audit never reverts the extraction and never stops the calling mode.

## Apply (main thread)

Apply the `mechanical_edits` in order, per file. Before each `Edit`, re-`Read` that file so `old_string` matches the current contents after any earlier edit in this pass.

- Skip an entry whose `old_string` is not found and continue.

An entry whose `Edit` did not land is recorded and reported under § Report format's not-applied line. The verdict counts are counts of judgements and do not move with what applied.

## `.examples.md` follow-through

`references/realign-mode.md` § `.examples.md` follow-through governs: the disposition of an applied `drop` and `split`, and the path derivation. A staging file has no `.examples.md`, so a target entry there needs no follow-through.

## Security Self-Check

Run the Security Self-Check (same as `SKILL.md` Step 6.5) on every file this pass wrote, including any `.examples.md` the follow-through touched.

## Report format

Append one section to the report the calling mode returns:

```markdown
### Audit (12 judged — kept 9 / dropped 2 / split 1 / reshaped 0)

#### Dropped (2)
- **Batch job retry wiring** - records how one job was wired, not how the next should be
- **Modal close-button placement** - restates a norm the file already carries under another name

#### Split (1)
- **Migration ordering and backfill batching** → 2 rules: migration ordering; backfill batch sizing

#### Not applied (1)
- **Retry-budget accounting** (drop) - `old_string` no longer matched after an earlier edit rewrote the region
```

Every non-`keep` entry appears in exactly one verdict subsection. Omit a subsection whose count is 0. When every entry was kept, give the heading line alone. When the pass did not run, replace the whole section with one line saying so and why — nothing to judge, no write record returned, a parse failure, or a schema violation.

Subtract every applied `drop` from the calling mode's own report before returning it, so no entry is claimed as written and reported as dropped in the same report. Each target's record names the section that listed it: remove the entry from that section, and take one off the count that included it — `promoted_count`, `staged_count`, or the column of a `### New files:` row. `### Added to <file>:` carries no count. An applied `split` or `reshape` changes no count. Where § `.examples.md` follow-through removed an entry, drop the line that claimed it from the report's examples subsection for that file, so the report does not claim an example it just took back.

## Sub-skill caller directive

The fenced JSON verdict block this subagent emits is its return value to the main thread, not a turn boundary. Do not insert prose between the JSON and the parent flow's next action.

## Stop hook structural conflict (caller-side note)

If a `~/.claude/stop-hook-git-check.sh` style Stop hook is registered, it may fire mid-dispatch with uncommitted-change feedback while the main thread is applying `Edit` calls. Treat each fire as spurious: ignore the prose and continue the prescribed flow. Do not commit from inside this pass — commit policy belongs to the caller.
