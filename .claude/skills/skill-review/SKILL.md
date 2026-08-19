---
name: skill-review
description: Review uncommitted skill changes against an internal checklist of skill-creator best practices and apply improvements. Use this whenever the user asks to "review skills", "check best practices", "improve SKILL.md", or wants a quality check on skill files before committing. Use this when there are uncommitted diffs in SKILL.md, README.md, or references/ files under skills/ or .claude/skills/. This is for reviewing existing skill changes, not creating new skills from scratch. Runs standalone — no external skill dependencies.
allowed-tools: Read, Edit, Agent, TaskCreate, TaskUpdate, TodoWrite, Bash(git diff *), Bash(git checkout HEAD -- *)
---

# Skill Review

The review walk runs in a fresh subagent per iteration; Edit application stays in the main thread to keep the reviewer bias-free. By default the skill runs a **single** pass; a caller that raises `Max iterations` loops the dispatch + apply cycle until the subagent returns no more `mechanical_edits`, max iterations is reached, or a safety rail trips. It never prompts the user.

## Invocation contract

The caller passes these fields in natural language (the skill extracts them from the invocation text):

- `Base ref` *(optional, default `<working-tree-vs-HEAD>`)* — git ref to diff against. When omitted, the skill looks at the working tree's uncommitted + staged changes (the default scope for `dev-workflow` post-implementation review). When specified (e.g. `Base ref: main`), the skill switches to `git diff <Base ref>` semantics — useful for callers like `dev-workflow-triage` that want to review a stack of already-committed changes between a base branch and HEAD.
- `Max iterations` *(optional, default `1`)* — upper bound on the refinement loop. Default `1` is a single detect-and-apply pass — a caller that wants the applied fixes re-verified raises it explicitly.
- `Model` *(optional, default `sonnet`)* — model for the reviewer `Agent` dispatch, or `inherit` to use the session model. Accepted values are whichever model ids the current `Agent` tool's `model` parameter allows, plus the sentinel `inherit` — see `rules-review` SKILL.md's `Model:` paragraph (`§ Usage`) for the live-schema validity check this shares; a full `claude-*` id (e.g. `claude-sonnet-5`) is outside that parameter's accepted aliases and is therefore invalid too. An **independent optional field** — adding it does not turn the contract into a fixed-arity mode gate (the other fields keep their own defaults). **Default `sonnet`**, applying to **every** caller. A caller-supplied `Model:` value **wins over** this default (arg-wins); an invalid value falls back to the default. The resolved value is applied to **every** iteration's reviewer dispatch. It applies **only on the Claude Code `Agent`-dispatch path**; the inline fallback path spawns no `Agent`.

The caller must not stage changes while this skill is running.

## Process

### Step 1 — Detect changed skill files (main thread)

1. Parse the fields from the invocation text (`Base ref`, `Max iterations`, and the optional `Model:`) per `§ Invocation contract`. Resolve the reviewer model: the caller-supplied `Model:` when present and valid, else the skill-side default `sonnet`. Hold it for Step 3 (a) Dispatch reviewer Agent.
2. Compute the changed-file set based on `Base ref`:
   - Default mode (no `Base ref` provided): run `git diff --name-only` and `git diff --name-only --cached` to find uncommitted + staged changes.
   - Explicit mode (e.g. `Base ref: main`): run `git diff --name-only <Base ref>` — captures the cumulative diff from `<Base ref>` to HEAD (committed history, not working-tree).
3. Filter to files matching `skills/**/SKILL.md`, `skills/**/README.md`, `skills/**/references/**`, `.claude/skills/**/SKILL.md`, `.claude/skills/**/references/**`. The `**` **crosses directory boundaries on purpose** so the `references/**` patterns match reference files nested at any depth (`skills/<name>/references/<sub>/…`); the flat direct-skill layout (`skills/<name>/SKILL.md`) is matched directly. Do **not** narrow the trailing `references/**` to a single-segment `*`: `*` does not cross `/`, so nested reference files would not match and `changed_files` could come back empty — a silent false `no-actionable-findings` with `iterations_used: 0` even though reference files did change. Bundle copies under `plugins/<bundle>/skills/<name>/` are intentionally **out of scope**: they are byte-identical mirrors of the canonical `skills/<name>/` files, and `verify-bundle-sync` owns that identity check.
4. Hold the filtered set in main-thread context as `changed_files` (the scope-check baseline for Step 3 (c)).
5. If `changed_files` is empty, emit the verdict `{"status": "no-actionable-findings", "iterations_used": 0, "applied_edits_count": 0, "notes_remaining_count": 0, "reason": null}` per `§ Return contract` and stop.

### Step 2 — Gather review inputs (main thread)

For each changed skill, in the main thread:

1. `Read` the full `SKILL.md` and any changed `references/` or `README.md` files. Hold the contents in main-thread context as the iter-1 snapshot.
2. `Read` `references/best-practices.md`.
3. Pre-capture each changed file's `git diff`. In default mode (no `Base ref`): for staged-only changes use `git diff --cached -- <file>`, for working-tree-only changes use `git diff -- <file>`, for mixed staged + unstaged edits concatenate them (staged section first) into one unified diff payload. In explicit `Base ref` mode: use `git diff <Base ref> -- <file>` (committed history vs the ref).

### Step 3 — Iteration loop (i = 1 .. Max iterations)

**Pre-register iteration tasks** — before entering the loop, `TaskCreate` one task per iteration named `iteration 1`, `iteration 2`, ..., `iteration <Max iterations>`. Mark `in_progress` (via `TaskUpdate`) before each dispatch, `completed` after parse + apply (a converged iteration marks `completed` immediately after parsing). On early convergence (no `mechanical_edits` returned) or safety-rail-triggered exit, mark remaining iteration tasks `completed` with note appended to the task's `description` field (the `content` field under the `TodoWrite` fallback) as `— skipped: converged` / `— skipped: <reason>`. Where the Task tools are unavailable (e.g. the VSCode extension, or Claude Code before v2.1.142), use the equivalent `TodoWrite` operations instead — the status values and pre-register semantics are identical. Pre-registration is load-bearing when a caller raises `Max iterations` — without it, the executor-driven loop tends to stop at the first iteration that looks acceptable.

#### (a) Dispatch reviewer Agent

On `i == 1`, use the snapshot from Step 2. On `i ≥ 2`, only re-`Read` the subset of `changed_files` whose path appeared in a successfully-applied `mechanical_edits` entry during iter `i - 1` (untouched files keep their iter-1 snapshot). On `i ≥ 2`, also re-run the per-file `git diff` so the diff payload reflects edits that landed in prior iterations.

Invoke the `Agent` tool to dispatch a fresh reviewer, passing the model from Step 1's `Model:` resolution as the `Agent` `model` parameter (the default `sonnet` when the caller supplied none); pass no `model` only when the resolved value is `inherit`. Assemble the dispatch prompt from the four sections below, each framed with a clear `--- LABEL ---` fence:

- `--- BEST PRACTICES CHECKLIST ---`: the full content of `references/best-practices.md`
- `--- CHANGED FILES ---`: each changed skill file's path, full content, and unified diff (one block per file, separated by `### <path>` sub-headings)
- `--- REVIEWER PROMPT ---`: the reviewer prompt and JSON schema below (verbatim)
- `--- RESPONSE FORMAT ---`: the response format and constraints below (verbatim)

**Reviewer prompt (include verbatim in the dispatch):**

> You are a fresh reviewer of skill files. You have **not** seen prior conversation context — only the checklist and changed files below. Walk the BEST PRACTICES CHECKLIST against each CHANGED FILE.
>
> Only the modified sections of changed files are in-scope (frontmatter fields the diff touched, paragraphs replaced, lines added). Do not audit sibling sections or files the diff did not touch. Project conventions under `.claude/rules/` and `CLAUDE.md` override the checklist where they conflict.
>
> **Two classifications, used by both passes below.** *Inert*: why an edit was made, which alternative was rejected, how a convention split between files was resolved, what a sibling file does or does not say, any note addressed to a future editor rather than to the executing agent, and any clause explaining how a constraint came to be written. *Load-bearing*: a prohibition, a scope boundary, or a guard against a plausible wrong generalization; a statement of what goes wrong when a rule is broken **where the breakage would pass undetected rather than raise an error**; an override of a default set elsewhere; wording a project rule requires to be present verbatim.
>
> **Removal-trace pass — run this first, before the checklist walk, over the diff's removed (`-`) lines. Report it even when every removal is sound.** The prose-weight pass below reads only added and modified lines, so without this pass a deletion-only diff gets no scrutiny at all. Give **every** removed sentence one of three verdicts — none may go unjudged, and grouping by hunk is fine on a large diff:
>
> - `covered-elsewhere` — name where the content still lives: elsewhere in the file, in another file, or closed structurally by a tool grant.
> - `load-bearing-lost` — the removal took a constraint, a branch criterion, a decision rule, or a contract with something outside the file. Return it as a `mechanical_edit` restoring the minimum text that carries the constraint.
> - `inert` — matches the inert classification above.
>
> Two rules for the hard cases. Before ruling a removed flag, mode, field, or contract token `inert`, **grep the repo for that token** — a generator, a template-conformance check, or a sibling skill may depend on it. And **that no caller currently exercises a documented input mode or contract is not grounds to accept its removal**.
>
> **Prose-weight pass — run this second, and report it even when you find nothing.** For every line the diff added or modified, test each sentence with one question: would an agent executing this skill do anything differently if the sentence were deleted? A sentence that fails is a deletion candidate. Scope is the diff, exactly as the paragraph above sets it — do not widen either pass to untouched content.
>
> Two reporting rules. State the touched regions' net line change (lines added minus deleted) in your reasoning. And report every deletion candidate as a `mechanical_edit` — never as a `structural_note`, which the caller does not apply.
>
> Also flag "hallucination gaps" — points in the changed content where an executing agent would have to guess (ambiguous filenames, unstated success criteria, missing decision rules between branches).
>
> Classify each finding:
>
> - **mechanical_edit**: a fix that can be applied as a textual replacement — rewording a vague description, swapping a `Bash(*)` wildcard for a narrower pattern, trimming heavy-handed `MUST` / `NEVER` phrasing, fixing a broken link. Return as a `{file, old_string, new_string, rationale}` Edit
> - **structural_note**: a fix that requires moving content between files, deleting sections, or rewriting large portions of a section. Return as a `{file, description}` note. These will **not** be applied automatically — the caller surfaces them via `notes_remaining_count`
>
> `old_string` must match exactly one location in the current file. Include **1–3 lines of surrounding context** so the snippet is unique — short one-liners collide and cause the Edit to fail.
>
> **Gate reachability rule (required)**: when there are no actionable mechanical findings on this iteration, you **must** return `mechanical_edits: []`. Do not emit speculative or "nice to have" edits — `mechanical_edits == []` is the convergence signal and must be empty when no apply work remains. Continuing to flag issues only as `structural_notes` is fine; that is the documented exit path for non-mechanical findings.

**Response format (include verbatim in the dispatch):**

> Write your reasoning and per-file findings in natural language, then end your response with a single fenced JSON block matching this schema:
>
> ````
> ```json
> {
>   "mechanical_edits": [
>     {"file": "<path>", "old_string": "<unique 1-3 line snippet>", "new_string": "<replacement>", "rationale": "<short reason>"}
>   ],
>   "structural_notes": [
>     {"file": "<path>", "description": "<short description>"}
>   ]
> }
> ```
> ````

**Agent unavailable fallback**: detect availability and fall back per the canonical write-up in `rules-review` SKILL.md `§ 5. Review` (the "Detecting Agent availability" / "Fallback when Agent is unavailable" paragraphs). The skill-review specialization: when falling back, walk the embedded checklist over each changed file inline-sequentially in the main thread once per iteration and emit the same fenced JSON block defined above so step (b)'s parser handles both paths identically.

#### (b) Parse & apply — evaluate in this order, first match wins

1. **Verdict missing or malformed** — no fenced JSON block found, or JSON parse fails → exit loop with terminal `{"status": "error", "iterations_used": <i>, "applied_edits_count": <cumulative>, "notes_remaining_count": 0, "reason": "verdict parse failure"}`. Do not consume remaining iter slots.
2. **Schema violation** — required keys (`mechanical_edits`, `structural_notes`) are missing, values are not arrays, or any entry fails its expected per-entry shape (`mechanical_edits` entries must have non-empty string `file`, `old_string`, `new_string`; `structural_notes` entries must have non-empty string `file`, `description`) → exit loop with terminal `{"status": "error", "iterations_used": <i>, "applied_edits_count": <cumulative>, "notes_remaining_count": 0, "reason": "verdict schema violation"}`.
3. **No more apply work** — `mechanical_edits == []` → exit loop. Determine the terminal status from cumulative state and the current iter's `structural_notes`:
   - cumulative `applied_edits_count == 0` AND `structural_notes == []` → `no-actionable-findings`
   - cumulative `applied_edits_count > 0` AND `structural_notes == []` → `applied-edits` (notes count = 0)
   - `structural_notes != []` (regardless of cumulative count) → if cumulative > 0 then `applied-edits` (with `notes_remaining_count > 0`), else `notes-left`

4. **Otherwise** — apply `mechanical_edits` in order:
   - For each entry, re-`Read` the target file (so `old_string` matches the current contents after any earlier edit landed), then call `Edit`.
   - If an `old_string` is not found, skip that entry and continue with the next. This is expected when the subagent emits multiple edits from a single snapshot and a later edit overlaps a region an earlier one already rewrote — the skip is a no-op fallback, not an error.
   - Increment `applied_edits_count` only for entries whose `Edit` call succeeded — skipped entries do not count.
   - After the edits (applied or skipped), if at least one Edit succeeded, run the safety rails in (c), then continue to iteration `i + 1`. If all entries skipped, also continue (the next iter will re-dispatch with the current file state).

#### (c) Per-iteration safety rails — run only if at least one edit was applied

- **Frontmatter integrity** — for each edited file that begins with a `---`-delimited YAML frontmatter block, re-`Read` and parse the frontmatter. If parsing fails:
  ```
  git checkout HEAD -- <file>
  ```
  Exit loop with terminal `{"status": "error", "iterations_used": <i>, "applied_edits_count": 0, "notes_remaining_count": 0, "reason": "frontmatter broken"}` — the revert wipes the edited file's prior-iter edits as well, so `applied_edits_count` reflects the on-disk surviving edits (typically `0` since most invocations edit a single skill file across iters; if a multi-file invocation has surviving in-scope edits to other files, report the count of those). Files without a frontmatter block skip this rail.
- **Scope** — run `git diff --name-only`. If any returned path is **not** in `changed_files`:
  ```
  git checkout HEAD -- <each offending path>
  ```
  Exit loop with terminal `{"status": "error", "iterations_used": <i>, "applied_edits_count": <cumulative>, "notes_remaining_count": 0, "reason": "scope violation"}` — the revert only touches the offending out-of-scope paths, so in-scope `Edit` calls from earlier iters remain on disk and `applied_edits_count` reflects their cumulative count.

### Step 4 — Max iterations reached without convergence

If the loop runs all `Max iterations` without (b) sub-case 3 firing, determine the terminal status from cumulative state and the **last iter's** `structural_notes`. At the default `Max iterations` of `1` this is the ordinary path for any pass that applied edits:

- cumulative `applied_edits_count > 0` → `applied-edits` (notes_remaining = last-iter `structural_notes` count)
- cumulative `applied_edits_count == 0` AND last-iter `structural_notes == []` → `no-actionable-findings`
- cumulative `applied_edits_count == 0` AND last-iter `structural_notes != []` → `notes-left`

### Step 5 — Emit verdict

End your response with a single fenced JSON block matching the schema in `§ Return contract`. See `§ Sub-skill caller directive` for the caller-side no-stall discipline that applies when this skill is invoked as a sub-skill.

## Scope

- Only review files that have uncommitted changes — diff-scoped, not a full audit
- Project conventions (`.claude/rules/`, `CLAUDE.md`) override the checklist where they conflict
- Don't chase perfection — fix real issues, note minor ones, move on

## Return contract

Only one fenced JSON block must appear in the response — the verdict block.

End every invocation with a single fenced JSON block matching this schema:

```json
{
  "status": "no-actionable-findings|applied-edits|notes-left|error",
  "iterations_used": N,
  "applied_edits_count": N,
  "notes_remaining_count": N,
  "reason": "verdict parse failure|verdict schema violation|frontmatter broken|scope violation|dispatch error|null"
}
```

The `|null` token at the end of the `reason` enum means JSON `null` (not the string `"null"`).

Field semantics:

- `status`:
  - `no-actionable-findings`: the iteration loop converged with cumulative `applied_edits_count == 0` AND no `structural_notes` outstanding
  - `applied-edits`: at least one mechanical fix was applied across the iteration loop (cumulative `applied_edits_count > 0`); `notes_remaining_count` may be `0` (clean convergence) or `> 0` (notes alongside applied edits)
  - `notes-left`: cumulative `applied_edits_count == 0` AND `notes_remaining_count > 0` (only structural changes were flagged, surfaced via `notes_remaining_count`)
  - `error`: an internal error occurred — see `reason`
- `iterations_used`: number of iterations whose subagent dispatch returned a verdict, **including the iteration whose verdict triggered convergence**. Step 1 early returns (no changed skill files) count as `0`
- `applied_edits_count`: non-negative integer count of `Edit` calls whose result is still on disk at the time the verdict is emitted. For `verdict parse failure` / `verdict schema violation` / `dispatch error` / `scope violation`, this is the cumulative count of successful `Edit` calls across earlier iterations of the same invocation (none of these recovery paths revert in-scope edits — `scope violation` only reverts the offending out-of-scope paths). The exception is `frontmatter broken`: its recovery (`git checkout HEAD -- <edited file>`) reverts the edited skill file itself, wiping any earlier-iter edits to that file; the count drops accordingly (typically to `0` since most invocations edit a single skill file across iters, but multi-file invocations may report the count of surviving edits to other files)
- `notes_remaining_count`: non-negative integer. Count of structural / still-actionable items flagged in the **terminal iteration** but not applied. Always `0` for `no-actionable-findings` and any `error` status
- `reason`: enum string only when `status == "error"`, otherwise JSON `null`. Keep `reason` payloads to the listed enum tokens — no free-form text, newlines, or control characters — so the verdict stays mechanically parseable

**When to emit `status: "error"`**: the skill emits `error` when it detects a problem during the iteration loop. Conditions:

- `reason: "verdict parse failure"` — an iteration found no fenced JSON block in the subagent response, or JSON parse failed
- `reason: "verdict schema violation"` — an iteration parsed the JSON but required keys (`mechanical_edits`, `structural_notes`) are missing, values are not arrays, or any entry fails the per-entry shape spec
- `reason: "frontmatter broken"` — a per-iteration safety rail (Step 3 (c)) re-read after Edit shows the YAML frontmatter no longer parses; the offending file is reverted via `git checkout HEAD -- <file>`
- `reason: "scope violation"` — a per-iteration safety rail (Step 3 (c)) `git diff --name-only` lists paths outside the `changed_files` scope captured at Step 1; the offending paths are reverted
- `reason: "dispatch error"` — an `Agent` tool call errored, timed out, or returned an empty response (see `§ Dispatch failure` below)

In each `error` case, surface the verdict via the JSON instead of attempting recovery.

## Dispatch failure

If the `Agent` tool call itself errors, times out, or returns an empty response on any iteration, exit the loop with terminal `{"status": "error", "iterations_used": <i>, "applied_edits_count": <cumulative>, "notes_remaining_count": 0, "reason": "dispatch error"}`. Do not re-walk the checklist yourself as a fallback — self-review reintroduces the bias this skill exists to avoid.

## Sub-skill caller directive

When invoked as a sub-skill (i.e. via `Skill(skill-review)` from an orchestrator), the fenced JSON verdict block this skill emits is the **structured return value** of the skill's procedure — it is **not** a deliverable to the user, and emitting it does **not** terminate the orchestrator's turn. The same agent that ran this skill must immediately issue the next tool call dictated by the orchestrator's flow (see `dev-workflow-triage` SKILL.md `§ No-Stall Principle`; orchestrators that surface a per-callee guidance bullet — e.g. `dev-workflow-triage`'s `**Pre-invocation reminder**` — name the specific next action there). Do not insert a prose summary, an acknowledgment, or a "shall I proceed?" sentence between the JSON verdict and the next tool call. The JSON verdict block and the next tool call MUST be emitted in the same assistant turn. Closing the turn after emitting the JSON block — even with no prose between them — is the same violation as inserting prose. Only one fenced JSON block — the verdict block — appears in the response, so callers can locate it unambiguously. The skill's own procedure is over; the orchestrator's procedure continues without pause.

## Stop hook structural conflict (caller-side note)

On Claude Code on the Web the auto-installed `~/.claude/stop-hook-git-check.sh` fires on every Stop event and feeds back `Please commit and push…` between Process steps; treat each fire as a **spurious fire** — record it, ignore the prose, and run Process steps 1–5 to completion. Do **not** commit from inside this skill; commit policy lives with the caller. See `dev-workflow-triage` SKILL.md `§ Stop hook structural conflict` for the canonical write-up.

