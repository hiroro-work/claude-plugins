---
name: tidy
description: Review changed code for reuse, quality, and efficiency, then apply cleanup edits. Dispatches a fresh host-provided reviewer per iteration when available; the main thread applies mechanical edits and re-dispatches until no further edits remain. Non-interactive — no user prompts. Use after implementation as a code-cleanup pass complementary to correctness review.
allowed-tools: Read, Edit, Agent, TaskCreate, TaskUpdate, TodoWrite, Bash(git diff *), Bash(git status *), Bash(git checkout HEAD -- *)
---

# Tidy

The cleanup walk runs in a fresh host-provided reviewer per iteration when reviewer dispatch is available; Edit application stays in the main thread to keep the reviewer bias-free. The skill loops the dispatch + apply cycle until the reviewer returns no more `mechanical_edits`, max iterations is reached, or a safety rail trips. Designed to be called from non-interactive routines; it never prompts the user.

**Scope**: invocation targets are **arbitrary source files** (application code, config, SKILL.md, any text). The skill does not restrict the changed-file set to a fixed directory prefix — any path in the diff is reviewed unless caught by the exclusion list (Step 1 step 3).

## Invocation contract

The caller passes these fields in natural language (the skill extracts them from the invocation text):

- `Base ref` *(optional, default `<working-tree-vs-HEAD>`)* — git ref to diff against. When omitted, the skill looks at the working tree's uncommitted + staged + untracked changes (the default scope for a post-implementation cleanup pass). When specified (e.g. `Base ref: main`), the skill switches to `git diff <Base ref>` semantics — useful for callers that want to review a stack of already-committed changes between a base branch and HEAD.

  **Untracked-file scope asymmetry**: the default mode includes untracked new files (collected via `git status --porcelain=v1 --untracked-files=all -z`), but the explicit `Base ref` mode reads committed history only and **excludes untracked files**. A caller passing `Base ref: HEAD~5` expecting "everything since base" will silently miss new files added since `HEAD~5` that were never committed. If you need untracked files in scope, omit `Base ref` and rely on the working-tree default.

- `Max iterations` *(optional, default `3`)* — upper bound on the refinement loop. Cleanup polish typically converges in 1–2 iterations.

- `Custom instructions` *(optional)* — free-form text injected into the dispatch payload as additional constraints alongside the cleanup checklist. Orchestrators that carry their own `custom_instructions` config (e.g. workflow steps that pass project-wide constraints) route that text through this field.

- `Model` *(optional)* — model id applied as the `model` parameter on the reviewer `Agent` dispatch in Step 3 (a). An independent optional field (not part of a fixed-arity mode gate); a caller such as `dev-workflow` passes it to run the cleanup reviewer on a specific model. Because this skill runs a **per-iteration dispatch loop**, the same value is applied to **every** iteration's reviewer dispatch. Effective **only on the Claude Code `Agent`-dispatch path**; on the reviewer-dispatch-unavailable inline fallback (Step 3 (a)) no `Agent` is spawned, so the value is moot (the executing agent's own model governs). **Validity predicate**: a value is valid only if it is one of the model ids the current `Agent` tool's `model` parameter accepts — check the tool's live schema loaded in the current session rather than a fixed list, since Anthropic adds new model families over time (`sonnet` / `opus` / `haiku` / `fable` as of this writing); a full `claude-*` id (e.g. `claude-sonnet-5`) is outside that parameter's accepted aliases and is therefore invalid too. An absent field or an invalid value → no override; the reviewer `Agent` inherits the session model (backward-compatible default).

The caller must **not** stage changes while this skill is running. The skill reads the working tree; staged content would mix into the diff and corrupt the verdict. (The `Base ref` mode reads committed history vs the ref, so staging interference applies only to the default working-tree mode.)

## Process

### Step 1 — Detect changed files (main thread)

1. Parse `Base ref`, `Max iterations`, `Custom instructions`, and the optional `Model` value from the invocation text per `§ Invocation contract`. Hold `Model` for the Step 3 (a) reviewer dispatch; absent or invalid → no override (inherit). See `§ Invocation contract`'s `Model` field for the validity predicate.
2. Compute the changed-file set based on `Base ref`:
   - **Default mode** (no `Base ref` provided):
     - `git diff --name-only` for unstaged tracked changes
     - `git diff --name-only --cached` for staged tracked changes
     - `git status --porcelain=v1 --untracked-files=all -z` and collect entries prefixed `??` for untracked files
   - **Explicit `Base ref` mode** (e.g. `Base ref: main`): `git diff --name-only <Base ref>` only. Untracked files are out of scope (see `§ Invocation contract`).
3. Apply the exclusion list — drop any path matching:
   - **Lockfiles / dependency manifests**: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `Gemfile.lock`, `Cargo.lock`, `poetry.lock`, `uv.lock`, `Pipfile.lock`, `go.sum`, any `*.lock`
   - **Generated / build artifacts**: paths under `dist/`, `build/`, `node_modules/`, `target/`, `vendor/`, `.next/`, `.nuxt/`
   - **Binary files** (extension-based): `*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.webp`, `*.ico`, `*.pdf`, `*.zip`, `*.tar`, `*.gz`, `*.so`, `*.dylib`, `*.exe`, `*.bin`
4. Hold the filtered set in main-thread context as `changed_files` (the scope-check baseline for Step 3 (c)). Additionally retain the subset of paths that arrived as `??`-prefixed entries (untracked files) as `untracked_paths` — Step 3 (c)'s frontmatter rail uses it for the HEAD-absent check.
5. If `changed_files` is empty, emit the verdict `{"status": "no-actionable-findings", "iterations_used": 0, "applied_edits_count": 0, "notes_remaining_count": 0, "reverted_paths": [], "reason": null}` per `§ Return contract` and stop. `iterations_used: 0` because the iteration loop never runs.

### Step 2 — Gather review inputs (main thread)

For each entry in `changed_files`, in the main thread:

1. `Read` the file's full current contents. Hold in main-thread context as the iter-1 snapshot.
2. `Read` `references/cleanup-checklist.md`.
3. Pre-capture each changed file's `git diff`:
   - **Default mode**: for staged-only changes use `git diff --cached -- <file>`, for working-tree-only changes use `git diff -- <file>`, for mixed staged + unstaged edits concatenate them (staged section first) into one unified diff payload. For **untracked** files there is no diff (the file did not exist at base) — present the full file contents as the "new file" hunk in the dispatch payload.
   - **Explicit `Base ref` mode**: `git diff <Base ref> -- <file>` (committed history vs the ref).

### Step 3 — Iteration loop (i = 1 .. Max iterations)

**Pre-register iteration tasks** — before entering the loop, use the current host's task-tracking surface when available. In Claude Code, `TaskCreate` one task per iteration with subject `iteration 1`, `iteration 2`, ..., `iteration <Max iterations>`. Mark `in_progress` (via `TaskUpdate`) before each dispatch, `completed` after parse + apply (a converged iteration marks `completed` immediately after parsing). On early convergence (no `mechanical_edits` returned) or safety-rail-triggered exit, mark remaining iteration tasks `completed` with the skip note recorded in the task's `description` field (the `content` field under the `TodoWrite` fallback) as `— skipped: converged` / `— skipped: <reason>`. Pre-registration is load-bearing when the host supports it: without it, executor-driven loops tend to stop at the first iteration that looks acceptable.

**Task tools unavailable fallback**: when the executor's tool set lacks the Task tools (`TaskCreate` / `TaskUpdate`), use the equivalent `TodoWrite` operations if it is present (e.g. the VSCode extension, Claude Code before v2.1.142, or a Codex host that exposes compatible task tracking) — the status values and pre-register semantics are identical, and `allowed-tools` grants both. If **neither** the Task tools nor `TodoWrite` is surfaced (e.g. the skill runs inside a nested subagent context where progress-tracking tools were not surfaced), skip the pre-registration step and hold iteration state (current `i`, cumulative `applied_edits_count`, `notes_remaining_count`, accumulated `out_of_scope`, `reverted_paths`) in main-thread context instead. Progress tracking is not correctness-critical — the loop semantics in (a)–(c) are unaffected. Same shape as the reviewer-dispatch unavailable fallback in (a).

#### (a) Dispatch reviewer

On `i == 1`, use the snapshot from Step 2. On `i ≥ 2`, only re-`Read` the subset of `changed_files` whose path appeared in a successfully-applied `mechanical_edits` entry during iter `i - 1` (untouched files keep their iter-1 snapshot — re-reading them is wasted work and balloons main-thread context). For that same re-read subset, also re-run the per-file `git diff` so the diff payload reflects edits that landed in prior iterations; files outside the subset keep their iter-1 diff.

Dispatch a fresh reviewer through the current host's reviewer-dispatch mechanism. In Claude Code, use the `Agent` tool when it is exposed and nested dispatch is not blocked — passing the parsed `Model` value (§ Invocation contract) as the `Agent` `model` parameter only when it resolved to a valid override, and omitting it otherwise (absent **or** invalid → inherit). Apply the same `Model` decision on every iteration's dispatch. In Codex, use the exposed subagent / delegation mechanism when available. Assemble the dispatch prompt from the five sections below, each framed with a clear `--- LABEL ---` fence so the reviewer can parse each payload unambiguously:

- `--- CLEANUP CHECKLIST ---`: the full content of `references/cleanup-checklist.md`
- `--- CHANGED FILES ---`: each changed file's path, full content, and unified diff (one block per file, separated by `### <path>` sub-headings; for untracked files present "(new file — no prior contents)" before the full current contents)
- `--- CUSTOM INSTRUCTIONS ---`: the value of `Custom instructions` from the invocation, or the literal `(none)` placeholder when the field is empty (the fence is always emitted to keep the payload section order stable)
- `--- REVIEWER PROMPT ---`: the reviewer prompt below (verbatim)
- `--- RESPONSE FORMAT ---`: the response format and constraints below (verbatim)

**Reviewer prompt (include verbatim in the dispatch):**

> You are a fresh reviewer of changed code. You have **not** seen prior conversation context — only the CLEANUP CHECKLIST, CHANGED FILES, and CUSTOM INSTRUCTIONS below. Walk the CLEANUP CHECKLIST against each CHANGED FILE.
>
> **Preserve functionality (hard constraint)**: never propose a change that alters observable behavior — features, outputs, error conditions, or side-effect ordering — regardless of which checklist item the finding matches. Read § Preserve functionality at the top of the CLEANUP CHECKLIST as the binding rule. If a candidate fix could plausibly change behavior, downgrade it to a `structural_note`; when behavior preservation is clear from the diff and the fix matches § Behavior-preserving structural improvements, a `mechanical_edit` is correct.
>
> Only the **changed lines and their immediately surrounding context** are in-scope (lines added or modified, plus surrounding code where the change participates in a structural cleanup opportunity). Do not audit pre-existing untouched code in sibling regions. Project conventions under `.claude/rules/` and `CLAUDE.md` override the checklist where they conflict — defer to them for language-specific / framework-specific standards (import style, function-declaration form, return-type annotation conventions, error-handling patterns, component / module structure).
>
> Classify each finding:
>
> - **mechanical_edit**: a fix that can be applied as a textual replacement — removing a redundant narration comment, deleting a dead branch, replacing a defensive guard on an already-safe path, collapsing a needless local helper, expanding a nested ternary into an `if`/`else`, or a behavior-preserving structural improvement that meets the CLEANUP CHECKLIST's § Behavior-preserving structural improvements conditions. Return as a `{file, old_string, new_string, rationale}` Edit
> - **structural_note**: a fix that requires moving content between files, deleting sections, rewriting large portions, or carries any risk of behavior change. Return as a `{file, description}` note. These will **not** be applied automatically — the caller surfaces them via `notes_remaining_count`
>
> `old_string` must match exactly one location in the current file. Include **1–3 lines of surrounding context** so the snippet is unique — short one-liners collide and cause the Edit to fail.
>
> If CUSTOM INSTRUCTIONS is non-empty, treat its text as additional constraints — apply alongside (not in place of) the checklist.
>
> **Balance rails (required)**: a candidate `mechanical_edit` that would violate § Balance rails — anti-over-simplification at the bottom of the CLEANUP CHECKLIST is **not actionable** as a mechanical fix even when it matches one of items 1–10. Either downgrade to `structural_note` or skip the finding entirely. The most common path to silent behavior change is over-simplification; the balance rails are how you avoid it. § Balance rails and § Preserve functionality are the **negative gates** (what must not be mechanical); § Behavior-preserving structural improvements is the **positive gate** a finding reaches only after passing them.
>
> **Overlap resolution (required)**: when a finding could match more than one checklist item, apply the **Overlap handling** rules listed in the CLEANUP CHECKLIST and emit only the preferred classification (**first-match-wins per finding** — never split one finding across multiple items).
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

**Reviewer-dispatch unavailable fallback**: detect availability by inspecting the current tool surface; do not attempt a speculative call just to probe availability. When no host-provided reviewer dispatch is available — the `Agent` tool is absent from the tool surface, or the host indicates before dispatch that reviewer dispatch cannot recurse — walk the cleanup checklist over each changed file inline-sequentially in the main thread once per iteration. Being invoked as a sub-skill (e.g. via `Skill()` on the main thread) does **not** by itself trigger this path: decide by whether `Agent` is exposed and callable, not by invocation lineage — if it is, dispatch via `Agent`. Under the fallback, construct the same fenced JSON block defined above so step (b)'s parser handles both paths identically. **Output scope**: the per-iteration JSON produced under fallback is *internal state* for step (b)'s parser — hold it in main-thread context only; do **not** write it into the user-visible response. Only the terminal verdict JSON from `§ Return contract` appears in the response (see the uniqueness clause there).

#### (b) Parse & apply — evaluate in this order, first match wins

Evaluate the four sub-cases below in order; the first match determines the action. Dispatch failures (reviewer-dispatch tool error / timeout / empty response) are handled in `§ Dispatch failure` before this parse step runs and do not enter sub-cases 1–4 below.

1. **Verdict missing or malformed** — no fenced JSON block found, or JSON parse fails → exit loop with terminal `{"status": "error", "iterations_used": <i>, "applied_edits_count": <cumulative>, "notes_remaining_count": 0, "reverted_paths": [], "reason": "verdict parse failure"}`. Do not consume remaining iter slots.
2. **Schema violation** — required keys (`mechanical_edits`, `structural_notes`) are missing, values are not arrays, or any entry fails its expected per-entry shape (`mechanical_edits` entries must have non-empty string `file`, `old_string`, `new_string`; `structural_notes` entries must have non-empty string `file`, `description`) → exit loop with terminal `{"status": "error", "iterations_used": <i>, "applied_edits_count": <cumulative>, "notes_remaining_count": 0, "reverted_paths": [], "reason": "verdict schema violation"}`. Validating per-entry shape here prevents a malformed entry from crashing a downstream `Edit` call.
3. **No more apply work** — `mechanical_edits == []` → exit loop. Determine the terminal status from cumulative state and the current iter's `structural_notes`:
   - cumulative `applied_edits_count == 0` AND `structural_notes == []` → `no-actionable-findings`
   - cumulative `applied_edits_count > 0` AND `structural_notes == []` → `applied-edits` (notes count = 0)
   - `structural_notes != []` (regardless of cumulative count) → if cumulative > 0 then `applied-edits` (with `notes_remaining_count > 0`), else `notes-left`

   No divergence detection: `mechanical_edits == []` already captures "no more apply work", and `structural_notes` are not applied (they persist by design), so a divergence rule keyed on `structural_notes` would always trigger after iter 2.
4. **Otherwise** — apply `mechanical_edits` in order:
   - For each entry, verify `file ∈ changed_files`; if not, record the path in an `out_of_scope` list and skip the entry without calling `Edit` (no working-tree write occurs, so the scope rail in (c) does not need to revert it). The `out_of_scope` list is later surfaced via `reverted_paths` in the terminal verdict if non-empty.
   - For each in-scope entry, re-`Read` the target file (so `old_string` matches the current contents after any earlier edit landed), then call `Edit`.
   - If an `old_string` is not found, skip that entry and continue with the next. This is expected when the reviewer emits multiple edits from a single snapshot and a later edit overlaps a region an earlier one already rewrote — the skip is a no-op fallback, not an error.
   - Increment `applied_edits_count` only for entries whose `Edit` call succeeded — skipped entries do not count.
   - After the edits (applied or skipped), if at least one Edit succeeded, run the safety rails in (c), then continue to iteration `i + 1`. If all entries skipped, also continue (the next iter will re-dispatch with the current file state).

#### (c) Per-iteration safety rails — run only if at least one edit was applied

- **Frontmatter integrity** — for each edited file that begins with a `---`-delimited YAML frontmatter block, re-`Read` and parse the frontmatter. If parsing fails:

  ```
  git checkout HEAD -- <file>
  ```

  Exit loop with terminal `{"status": "error", "iterations_used": <i>, "applied_edits_count": <surviving on disk>, "notes_remaining_count": 0, "reverted_paths": [<file>], "reason": "frontmatter broken"}`. `applied_edits_count` reflects edits still on disk after the revert (the revert wipes this file's prior-iter contributions; cross-file edits to other paths in earlier iters survive). Files without a frontmatter block skip this rail.

  **Untracked-path specialization**: if the offending file is in `untracked_paths` (i.e. HEAD-absent — the iteration just edited an untracked new file), the `git checkout HEAD -- <file>` invocation would fail with `did not match any file(s)` and pollute the rail message. Skip the `git checkout` for HEAD-absent paths; the file is left in its post-edit state, `applied_edits_count` retains all surviving on-disk edits (no revert occurred), and `reverted_paths` still carries the offending path as an informational entry so the caller sees what could not be reverted.

- **Scope** — the per-edit pre-check in (b) step 4 already skips out-of-scope writes, so no global `git diff --name-only` revert is needed. If the `out_of_scope` list accumulated by (b) step 4 is non-empty for this iteration, exit loop with terminal `{"status": "error", "iterations_used": <i>, "applied_edits_count": <cumulative>, "notes_remaining_count": 0, "reverted_paths": <out_of_scope>, "reason": "scope violation"}` (no actual `git checkout` runs — the pre-check prevented the write).

### Step 4 — Max iterations reached without convergence

If the loop runs all `Max iterations` without (b) sub-case 3 firing (i.e. the reviewer kept emitting `mechanical_edits` to the end, but apply progress stalled — typically all entries skipping because `old_string` collisions), determine the terminal status from cumulative state and the **last iter's** `structural_notes`:

- cumulative `applied_edits_count > 0` → `applied-edits` (notes_remaining = last-iter `structural_notes` count)
- cumulative `applied_edits_count == 0` AND last-iter `structural_notes == []` → `no-actionable-findings` (rare degenerate case: the reviewer emitted unappliable edits but no notes; debug-wise suspect reviewer quality drift, but the file state is clean)
- cumulative `applied_edits_count == 0` AND last-iter `structural_notes != []` → `notes-left`

### Step 5 — Emit verdict

End your response with a single fenced JSON block matching the schema in `§ Return contract`. See `§ Sub-skill caller directive` for the caller-side no-stall discipline that applies when this skill is invoked as a sub-skill.

## Scope

- Only review files that have uncommitted changes (default mode) or that appear in the `Base ref`-vs-HEAD diff — diff-scoped, not a full audit
- Project conventions (`.claude/rules/`, `CLAUDE.md`) override the checklist where they conflict
- Don't chase perfection — fix real cleanup wins, note structural ones, move on
- **Sub-skill scope note (caller-side)**: when this skill runs as a sub-skill, structural changes are surfaced via `notes_remaining_count` rather than applied. The caller decides whether and how to act on them. See `§ Sub-skill caller directive` for the no-stall discipline that applies on the sub-skill invocation path.

## Return contract

The skill emits a single fenced JSON block at the very end of the invocation. Only one fenced JSON block must appear **in the user-visible response** — the verdict block — so callers can locate it unambiguously. Intermediate structured outputs that the skill constructs internally for its own parser (e.g., the per-iteration reviewer JSON synthesized under the Agent-unavailable fallback path) are held in main-thread context and do not enter the response stream.

Emit a single fenced JSON block at the end of the response, matching the schema:

```json
{
  "status": "no-actionable-findings|applied-edits|notes-left|error",
  "iterations_used": N,
  "applied_edits_count": N,
  "notes_remaining_count": N,
  "reverted_paths": ["<path>", "..."],
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
- `iterations_used`: number of iterations whose reviewer dispatch returned a verdict, **including the iteration whose verdict triggered convergence**. Step 1 early returns (no changed files after exclusion) count as `0`
- `applied_edits_count`: non-negative integer count of `Edit` calls whose result is still on disk at the time the verdict is emitted. For `verdict parse failure` / `verdict schema violation` / `dispatch error` / `scope violation`, this is the cumulative count of successful `Edit` calls across earlier iterations of the same invocation (none of these recovery paths revert in-scope edits — `scope violation` only flags the offending out-of-scope paths informationally). The exception is `frontmatter broken`: its recovery reverts the edited file itself (or skips the revert for an untracked HEAD-absent path), so the count drops accordingly
- `notes_remaining_count`: non-negative integer. Count of structural / still-actionable items flagged in the **terminal iteration** but not applied (the skill surfaces them via this counter rather than running an interactive dialogue, since the skill is non-interactive by design). Always `0` for `no-actionable-findings` and any `error` status
- `reverted_paths`: array of `<path>` strings. Empty array `[]` for `no-actionable-findings` / `applied-edits` / `notes-left` / `verdict parse failure` / `verdict schema violation` / `dispatch error` / Step 1 early returns. For `frontmatter broken`: contains the offending file path in both branches (HEAD-present revert: path was reverted; HEAD-absent: path retained as informational entry since the rail skipped `git checkout`). For `scope violation`: contains the `out_of_scope` paths the pre-check rejected (no `git checkout` ran; the entries are informational rejected-write records). (Source of truth: the JSON shapes in Step 1 early return, Step 3 (b) sub-cases 1/2, Step 3 (c) frontmatter/scope rails, and `§ Dispatch failure`; keep this enumeration in sync when status conditions are added.)
- `reason`: enum string only when `status == "error"`, otherwise JSON `null`. Keep `reason` payloads to the listed enum tokens — no free-form text, newlines, or control characters — so the verdict stays mechanically parseable

**When to emit `status: "error"`**:

- `reason: "verdict parse failure"` — an iteration found no fenced JSON block in the reviewer response, or JSON parse failed
- `reason: "verdict schema violation"` — an iteration parsed the JSON but required keys (`mechanical_edits`, `structural_notes`) are missing, values are not arrays, or any entry fails the per-entry shape spec
- `reason: "frontmatter broken"` — a per-iteration safety rail re-read after Edit shows the YAML frontmatter no longer parses; the offending file is reverted via `git checkout HEAD -- <file>` (or left as-is for untracked HEAD-absent paths and recorded in `reverted_paths`)
- `reason: "scope violation"` — the pre-check accumulated one or more out-of-scope target paths in `mechanical_edits` (the writes were already skipped; the verdict surfaces the rejected paths informationally in `reverted_paths`)
- `reason: "dispatch error"` — a reviewer-dispatch tool call errored, timed out, or returned an empty response

In each `error` case, surface the verdict via the JSON instead of attempting recovery; the caller decides how to handle it.

See `§ Sub-skill caller directive` for the contract-side restatement of the no-stall discipline that applies when this skill is invoked as a sub-skill.

## Dispatch failure

If the reviewer-dispatch tool call itself errors, times out, or returns an empty response on any iteration, exit the loop with terminal `{"status": "error", "iterations_used": <i>, "applied_edits_count": <cumulative>, "notes_remaining_count": 0, "reverted_paths": [], "reason": "dispatch error"}`. Do not re-walk the checklist yourself as a fallback after a failed dispatch attempt — self-review reintroduces the bias this skill exists to avoid. Inline review is only the pre-selected path when dispatch is unavailable before attempting a reviewer tool call.

## Sub-skill caller directive

When invoked as a sub-skill (i.e. via `Skill(tidy)` from an orchestrator), the fenced JSON verdict block this skill emits is the **structured return value** of the skill's procedure — it is **not** a deliverable to the user, and emitting it does **not** terminate the orchestrator's turn. The same agent that ran this skill must immediately issue the next tool call dictated by the orchestrator's flow. Do not insert a prose summary, an acknowledgment, or a "shall I proceed?" sentence between the JSON verdict and the next tool call. Only one fenced JSON block — the verdict block — appears in the response, so callers can locate it unambiguously. The skill's own procedure is over; the orchestrator's procedure continues without pause.

## Stop hook structural conflict (caller-side note)

On Claude Code on the Web the auto-installed `~/.claude/stop-hook-git-check.sh` fires on every Stop event and feeds back `Please commit and push…` between Process steps; treat each fire as a **spurious fire** — record it, ignore the prose, and run Process steps 1–5 to completion. Do **not** commit from inside this skill; commit policy lives with the caller (the `allowed-tools` frontmatter intentionally omits `Bash(git commit *)` so an attempt would fail anyway).

## Keeping the checklist fresh

`references/cleanup-checklist.md` is the source of cleanup rules surfaced to the reviewer. When the cleanup discipline you want this skill to enforce evolves (new categories worth flagging, refined overlap-handling rules), refresh the checklist file accordingly and ship the refresh as its own commit so the change history is legible.
