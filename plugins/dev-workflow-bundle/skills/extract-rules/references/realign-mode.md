# Realign Mode — Procedure and Subagent Instructions

Deep reference for SKILL.md **Realign Mode** (Steps RA1–RA5). Realign re-judges rules that are **already written** against the current extraction criteria, and drops, splits, or trims the ones that no longer meet them.

## Contract

- **Input** (to the subagent): the sections § Step RA2 — Dispatch the analysis subagent enumerates — that fence list is the single statement of what crosses the boundary. The subagent `Read`s the target file and the criteria sections itself
- **Output** (from the subagent): a single fenced JSON block matching § Response schema, with no prose around it
- **Apply phase**: the main thread applies `mechanical_edits` via `Edit`, and only after the approval gate in Step RA3. The subagent does not call `Edit`

## Forbidden tool calls

You are an **analysis-only** subagent. Your sole output is the fenced JSON verdict block § Response schema defines. The main thread owns every file-writing action.

**Do not call any of these from this dispatch**: `Edit` — propose edits as `mechanical_edits` entries instead; `Write`; any other file-writing or working-tree-mutating tool (`NotebookEdit`, `Bash(rm *)`, `Bash(mv *)`, `Bash(cp *)`, `Bash(sed -i *)`, a shell redirection into a file).

This is a hard constraint of the two-layer Pattern A architecture (subagent analyzes / main thread applies), not a soft one: an inline write from this dispatch breaks the bias-free executor property and leaves file state the apply phase cannot reason about. If you find yourself reasoning "I should just apply this directly" — that is the anti-pattern this section forbids. Emit the edit and stop.

## Step RA1 — Resolve targets (main thread)

Load settings from `extract-rules.local.md` (same as Step 1 in Full Extraction Mode), resolving `output_dir` and `examples_output_dir`. If `output_dir` does not exist, report `Run /extract-rules first to initialize rule files.` and stop.

Two ways to arrive at the target list:

- **Named paths** — `--realign <path> [<path> ...]` judges exactly those files. Accept a path only when it resolves under `output_dir`; reject anything else with a fail-loud diagnostic naming the resolved path and `output_dir`, and stop.
- **Discovery** — `--realign` with no paths judges every `*.md` under `output_dir`, recursively, in lexicographic order so repeated runs present the same sequence. Exclude `*.examples.md` — when `examples_output_dir` sits under `output_dir` the two trees collapse into one (§ `.examples.md` follow-through covers what happens to those files). When the walk finds nothing, report that `output_dir` holds no rule files and stop.

Resolve `examples_output_dir` here — the follow-through needs it.

**Shared `.md` files need a word at the gate.** A shared `.md` may carry Principles that merge-rules promoted organization-wide. Realign judges locally and its referrer count scans this repository only, so it cannot see that a Principle is load-bearing in another project. Discovery sweeps these files in without the operator having named them, so say which targets are shared `.md` when presenting the gate — under discovery always, and under named paths whenever one was named deliberately.

## Judgement criteria

Read `<skill dir>/references/extraction-criteria.md` § What a Rule Is Made Of, § Durability: Would This Change What Gets Written Next Time?, and § Reach: Is the Rule Worth Its Permanent Cost?. Those sections are the criteria. Do not invent others, and do not judge against a criterion this skill has retired.

The reach test is the one that shrinks an over-grown file. The other two ask whether an entry is a rule at all, and a file that has already been through a compression pass tends to pass them everywhere.

The unit of judgement is a **rule** — one top-level bullet under a section heading. Judge bullets only:

- **Never judge or move a heading.** A file's section structure is out of scope, including any custom section heading a project added. A rule stays in the section it is in.
- **Never judge the file's preamble prose.** Some rule files open with a sentence stating the file's own convention.

## Verdicts

Assign each rule exactly one verdict from this closed list.

- **`keep`** — passes the criteria in § Judgement criteria as written. No edit.
- **`drop`** — fails the durability test (it records one piece of work rather than directing future work) or the reach test (it does not earn permanent context). Name which in the `reason`.
- **`split`** — carries more than one claim. Emit the resulting rules, each judged on its own, so a split can yield fewer parts than the original had clauses. List each resulting rule's bold label in `resulting_labels`. When **every** part fails the criteria, the verdict is `drop`, not a `split` with nothing left — an empty `resulting_labels` is a schema violation that stops the run.
- **`reshape`** — one durable, wide-reaching claim, but padded: an account of how the situation first came up, a restatement of a norm already present, or a description of current implementation state sits alongside the norm. Cut back to the norm, its trigger, and its discriminator.

Every entry carries a one-sentence `reason`, `keep` included — a `keep` states what makes the rule durable.

## Step RA2 — Dispatch the analysis subagent (main thread)

**One target file per dispatch, files processed in the order given.** Before the first dispatch, register one task per target file (`realign: <path>`) via `TaskCreate` — or the equivalent `TodoWrite` operation where the Task tools are unavailable — and mark each `in_progress` before its dispatch. **Every row flips to `completed` on every outcome** — the file's edits landed, the user refused at the gate, or a parse failure stopped the run — and the outcome is carried in the report, not in the task status. Dispatch without asking the user to re-confirm: per `SKILL.md` § Dispatch authorization, a permission-shaped restriction does not justify substituting inline execution.

Spawn an `Agent` (`subagent_type: general-purpose`) per file, assembling the prompt from these `--- LABEL ---` fence sections. This list is the **closed set** of what reaches the subagent; a constraint absent from it does not cross the boundary, however firmly this file states it:

- `--- SKILL DIR ---`: this skill's absolute directory path, so the reference paths below resolve
- `--- TARGET FILE ---`: the target file's absolute path, and the instruction to `Read` it in full before judging. Not its content — see § Contract
- `--- JUDGEMENT CRITERIA ---`: § Judgement criteria **verbatim** — the section names alone would leave the unit of judgement behind
- `--- VERDICTS ---`: § Verdicts verbatim
- `--- FORBIDDEN TOOL CALLS ---`: § Forbidden tool calls verbatim — **this file's**
- `--- MECHANICAL EDITS SCHEMA ---`: § `mechanical_edits` schema verbatim, plus the two rules it cites from `references/compaction-mode.md` § `mechanical_edits` schema — the `old_string` uniqueness convention and the verbatim character-class preservation rule. Take those two rules only, not that section's JSON block, which has no `label` field
- `--- RESPONSE FORMAT ---`: § Response schema verbatim
- `--- CALLER DIRECTIVE ---`: § Sub-skill caller directive verbatim

Parse each returned block per § Parse failure and schema violation, then compute the referrer counts below. Hold every file's verdicts until all dispatches have returned: Step RA3 opens **one** gate covering all target files.

## Referrer count (main thread, before the gate)

For every rule whose verdict is not `keep`, count how many **other files** mention its label — its bold-prose label, or its leading signature where it has one — and report the count beside the verdict. A rule's own file never counts toward its own count; another of the run's target files does. Collect the whole run's labels in **one** search rather than one per rule or one per file: `git grep -F -e '<label-1>' -e '<label-2>' …` returns every hit with its file, and `-F` matters because a label routinely carries backticks, parentheses, and other regex metacharacters. `git grep` searches tracked files only, so in a project that does not track `output_dir` every count reads 0 — say so at the gate rather than letting 0 read as "nothing cites this".

A non-zero count is not a veto — it is the fact the approver needs in order to decide between keeping the rule, updating the citing document, and accepting the break.

## Step RA3 — Present and confirm (main thread, USER APPROVAL GATE)

One gate for the whole run. Present every non-`keep` rule with its verdict, its `reason`, and its referrer count, grouped by target file and then by verdict. State the per-file counts (`keep` / `drop` / `split` / `reshape`) above each list, and name the shared `.md` targets per § Step RA1's **Shared `.md` files need a word at the gate** paragraph. Then ask the user to accept the set, or to name the rules to exclude from it.

On acceptance, apply the accepted subset. On a request to exclude, drop the `mechanical_edits` entries whose `label` matches an excluded rule and apply the rest. On a refusal, write nothing and report that.

## Step RA4 — Apply (main thread)

Apply the accepted `mechanical_edits` in order, per target file. Before each `Edit`, re-`Read` that file so `old_string` matches the current contents after any earlier edit in this pass.

- Skip — without calling `Edit` — any entry whose `file` is not the target file it was returned for.
- Skip an entry whose `old_string` is not found and continue. Two accepted edits can overlap a region an earlier one already rewrote.

**What the counts mean.** The `keep` / `drop` / `split` / `reshape` counts are counts of **judgements**, fixed when the gate resolves and unchanged by what applies — a rule the user excluded moves to `keep` at the gate, and nothing after the gate moves a rule between verdicts. An accepted entry whose `Edit` did not land is **not** silently absorbed: record it and report it under § Step RA5's not-applied line, naming the rule and its intended verdict. That line is what keeps a `drop` that never landed from reading as a completed drop.

### `.examples.md` follow-through

An applied `drop` orphans the dropped rule's entry in the examples file, since a `###` title there matches its rule's name exactly. Remove that entry in the same pass. **Resolve the examples path from the target file's path relative to `output_dir`, not from its basename** — `<output_dir>/languages/typescript.local.md` gives `<examples_output_dir>/languages/typescript.examples.md`, so a basename-only derivation would drop the `languages/` segment and silently find nothing. Strip a trailing `.local` before `.md`.

On an applied `split`, keep the entry against whichever `resulting_labels` name still matches it, and remove it when none does. These edits are the main thread's own — they never arrive as `mechanical_edits`. `references/examples-format.md` § Entry removal states the disposition.

## Step RA5 — Security Self-Check and report

Run the Security Self-Check (same as SKILL.md Step 6.5) on every file written, including any `.examples.md` the follow-through touched. Then report per `references/report-templates.md` § Realign Mode, one section per target file, adding a not-applied line for any accepted entry whose `Edit` did not land.

## Parse failure and schema violation (main thread)

Evaluate in order, first match wins:

1. **No fenced JSON block, or the JSON fails to parse** → report the failure to the user and stop.
2. **Schema violation** → report and stop. Validate all of this here, before any `Edit`, so a malformed verdict cannot reach the apply phase:
   - `rules` missing or not an array; an entry missing `label` / `verdict` / `reason`; a `verdict` outside the closed list; a `split` entry whose `resulting_labels` is missing, empty, or holds anything but non-empty strings.
   - `rules[].label` values are **unique** within the file. A duplicate makes the Step RA3 exclusion ambiguous, and excluding one occurrence would silently exclude the other.
   - A `mechanical_edits` entry missing `file` / `label` / `old_string` / `new_string`.
   - **Label correspondence, both directions**: every `mechanical_edits[].label` matches some `rules[].label`, and every non-`keep` rule has exactly one entry. Without the first, a rule the user excludes at the gate keeps its edit and lands a write the gate rejected; without the second, a missing entry is indistinguishable at Step RA5's not-applied line from one whose `Edit` did not apply.
3. **Otherwise** → continue to the gate.

A failure on any one target file stops the run before the gate — a partial gate would ask the approver to accept a set that is missing a file's judgements without saying so.

## `mechanical_edits` schema

`{"file": "<target file path>", "label": "<the rule's label, matching its rules entry>", "old_string": "<unique snippet>", "new_string": "<replacement>", "reason": "<short reason>"}`

`label` is what ties the edit back to its judgement.

The uniqueness convention and the **verbatim character-class preservation** rule are the ones `references/compaction-mode.md` § `mechanical_edits` schema states — the second matters here because rule files routinely mix scripts, and a normalized dash or bracket makes `old_string` miss silently. One realign-specific note: a rule's leading label can repeat elsewhere in the file, so include surrounding context rather than the label alone. A `drop` emits an entry whose `new_string` omits the bullet. Write `new_string` in the language the surrounding rule prose is written in — a `reshape` shortens a rule, it does not translate it.

## Response schema

Emit a single fenced JSON block at the end of the response, matching this schema, and write no other prose:

````json
{
  "rules": [
    {"label": "<the rule's leading label or signature>", "verdict": "keep|drop|split|reshape", "reason": "<one sentence>", "resulting_labels": ["<label>", "…"]}
  ],
  "mechanical_edits": [
    {"file": "<path>", "label": "<matching rules[].label>", "old_string": "<unique 1-3 line snippet>", "new_string": "<replacement>", "reason": "<short reason>"}
  ]
}
````

`resulting_labels` is required on a `split` entry and omitted on every other verdict. Every rule in the target file appears exactly once in `rules`, `keep` entries included — an omitted rule reads as a missing judgement. `mechanical_edits` carries an entry for each non-`keep` rule and nothing else.

## Sub-skill caller directive

The fenced JSON verdict block this subagent emits is its return value to the main thread, not a turn boundary. Do not insert prose between the JSON and the parent flow's next action.

## Stop hook structural conflict (caller-side note)

If a `~/.claude/stop-hook-git-check.sh` style Stop hook is registered, it may fire mid-dispatch with uncommitted-change feedback while the main thread is applying `Edit` calls. Treat each fire as spurious: ignore the prose and continue the prescribed flow. Do not commit from inside this mode — commit policy belongs to the caller.
