---
name: verify-diff
description: Empirically verify that a code diff achieves its stated objective by dispatching a bias-free executor that actually runs auto-derived evaluation scenarios against the post-diff file. The executor returns a JSON verdict with `suggested_edits`, and this skill applies them iteratively until the executor declares no further fixes are needed, max-iterations is reached, or a safety rail trips. Non-interactive — no user prompts. Use after applying an Edit when you need a dynamic cross-check that complements static reviewers like skill-review.
allowed-tools: Read, Edit, Agent, TodoWrite, Bash(git diff *), Bash(git checkout HEAD -- *)
---

# Verify Diff

The convergence signal is the executor itself returning `suggested_edits: []` on a pass verdict — that is, the executor declares nothing more is left to fix. This skill loops until that signal, max iterations is reached, or a safety rail trips.

Designed to be called from non-interactive routines such as `dev-workflow-triage`. It never prompts the user; it either returns a structured summary or terminates early with a machine-readable reason code.

## Invocation contract

The caller passes these fields in natural language (the skill extracts them from the invocation text):

- `Description` *(required for explicit-args mode; absent for auto-derive mode)* — the original problem the diff is supposed to address
- `Suggested fix direction` *(required for explicit-args mode; absent for auto-derive mode)* — how the diff was meant to be shaped
- `Target file` *(required for explicit-args mode; absent for auto-derive mode)* — one relative path (single-file scope; multi-file diffs are out of scope in this mode)
- `Base ref` *(optional, default `HEAD`)* — git ref to diff against (both modes)
- `Max iterations` *(optional, default `3`)* — upper bound on the refinement loop (both modes; auto-derive applies the same upper bound to each per-skill loop)

### Mode determination

A field counts as **provided** iff the caller supplied a non-empty, non-whitespace value. Empty string and whitespace-only count as **absent**.

- **All three of** `Description` / `Suggested fix direction` / `Target file` provided → **explicit-args mode** (run `## Workflow` § Step 1 – Step 5 unchanged).
- **All three absent** → **auto-derive mode** (run `## Auto-derive mode` instead).
- **1 or 2 of the three provided** (incomplete framing) → return early with the explicit-args mode Step 1 schema (does **not** enter auto-derive mode — `incomplete args` is an explicit-args bug signal, surfaced loudly rather than silently falling back):

  ```json
  {"status": "skipped", "reason": "incomplete args", "iterations_used": 0, "applied_edits_count": 0, "unresolved_gaps": [], "reverted_paths": [], "objective_met": "unknown"}
  ```

The caller must **not** stage changes while this skill is running. The skill reads the working tree vs `Base ref`; staged content would mix into the diff and corrupt the verdict.

## Auto-derive mode

Triggered when `Description`, `Suggested fix direction`, and `Target file` are **all** absent (see `## Invocation contract` § Mode determination). The mode infers intent from the diff itself and verifies on a per-skill basis, so the empirical check still runs when the caller (e.g. `dev-workflow` `hooks.on_complete`) has no per-Finding framing to pass through. The per-iteration loop semantics defined in `## Workflow` § Step 3 are reused verbatim per skill, with the auto-derive-specific overrides spelled out in `A2 § Per-iter loop semantics`.

### A1. Collect diff and group by skill

1. Run `git diff <Base ref>` (`Base ref` defaults to `HEAD`).
2. If the diff is empty, return early with the auto-derive aggregate shape (matches A3 schema):

   ```json
   {"mode": "auto-derive", "status": "skipped", "reason": "empty diff", "iterations_used_total": 0, "applied_edits_count_total": 0, "non_skill_files": [], "per_skill": {}}
   ```

   Auto-derive treats an empty diff as `skipped` rather than `conflict` (the explicit-args mode policy) — without caller framing, an empty diff is informational, not a bug signal.
3. Compute `affected_files` from the diff (`git diff --name-only <Base ref>`).
4. Group each file by skill prefix:
   - `skills/<name>/...` → skill `<name>`
   - `.claude/skills/<name>/...` → skill `<name>`
   - paths outside both prefixes → `non_skill_files` bucket (not dispatched; reported in the aggregate verdict)
   - **Dedup**: if the same skill `<name>` appears under both prefixes (a file under `skills/<name>/...` and another under `.claude/skills/<name>/...`), merge both into the same skill key so symlink-resolved or dev-test-symlink layouts do not register the same skill twice. `files` keeps every distinct path string that appeared in the diff (both prefixes if they were both listed). `primary_file` selection (A2 § Primary file selection) prefers the `skills/<name>/...` form when both are present.
5. If `skill_groups` is empty (only non-skill files were changed), return early with `status=skipped`, `reason="no skill files in diff"`. The aggregate verdict still records the skipped paths so the caller can see what was bypassed:

   ```json
   {"mode": "auto-derive", "status": "skipped", "reason": "no skill files in diff", "iterations_used_total": 0, "applied_edits_count_total": 0, "non_skill_files": ["<path>", "..."], "per_skill": {}}
   ```

### A2. Per-skill dispatch

Auto-derive pre-registers `N skills × Max iterations` TodoWrite rows total, namespaced by `<skill>`. For each `(skill, files)` pair in `skill_groups`:

1. **Pre-register iteration TodoWrite items** named `<skill> iter 1` … `<skill> iter <Max iterations>` following the same protocol as `## Workflow` § Step 3 pre-registration (mark `in_progress` before dispatch, `completed` after parse + apply, append `— skipped: <reason>` on early exit).
2. **Primary file selection** — pick `primary_file` = `<skill-dir>/SKILL.md` if it appears in `files`; otherwise the first entry in `files` sorted lexicographically. This choice only labels the per-skill verdict's `primary_file` field for human-readable anchoring and influences the dispatch payload's framing — it does **not** affect per-skill verdict semantics (`status` / `applied_edits_count` / `objective_met` etc.), which are emitted for the whole `files` set.
3. **Per-iter snapshot** — on iter 1, `Read` the full current contents of every entry in `files` (per-iter snapshot) and run `git diff <Base ref> -- <files>` to capture the per-skill diff. The A1 (1) full-tree diff is used **only for skill-prefix splitting in A1** and is not forwarded to the dispatch payload; the `--- DIFF ---` payload carries the per-skill diff only, keeping main-thread context bounded. On `i ≥ 2`, only re-`Read` the subset of `files` whose path appeared in a successfully-applied `suggested_edits` entry during iter `i-1` (untouched files keep their iter-1 snapshot — wasted work otherwise, same convention as `publicity-review` § Step 2 (a)) and re-run `git diff <Base ref> -- <files>` so the per-skill diff reflects edits that landed in prior iterations.
4. **Dispatch payload assembly** — invoke the `Agent` tool to dispatch a fresh executor. Assemble the dispatch prompt from the four sections below, each framed with a clear `--- LABEL ---` fence (same convention as `## Workflow` § Step 3 (a) Dispatch bias-free executor and sibling Pattern A skills `publicity-review` / `skill-review`):

   - `--- DIFF ---`: the per-skill multi-file diff captured in `A2 § Per-iter snapshot`
   - `--- AFFECTED FILES ---`: each entry in `files` as a `### <path>` sub-heading followed by that file's full current contents (publicity-review pattern)
   - `--- INFERENCE PROMPT ---`: the body of `references/auto-derive-prompt.md` § Executor prompt injected verbatim, with `<skill-name>` substituted by the current skill's name. The reference holds the two-phase Phase 1 INFER INTENT (1–2 sentences) + Phase 2 VERIFY (scenarios + checklist) prompt
   - `--- RESPONSE FORMAT ---`: `references/auto-derive-prompt.md` § Response format injected verbatim — output schema (including `inferred_intent` and per-entry `file` for `suggested_edits`) plus the "1–3 lines of surrounding context" convention. Single canonical home for the response format; do not duplicate the schema body in this SKILL.md

   **Agent unavailable fallback**: detect availability and fall back per the canonical write-up in `rules-review` SKILL.md `§ 5. Review` (the "Detecting Agent availability" / "Fallback when Agent is unavailable" paragraphs). Auto-derive specialization: when falling back, walk the executor prompt inline-sequentially against each per-skill group in the main thread and emit the same A3 aggregate JSON defined below so callers' parse path is identical.

5. **Schema differences from explicit-args mode** (the response format adds two extensions over `## Workflow` § Step 3 (a)):

   - **`inferred_intent`**: a new top-level required field (string, 1–2 sentences). Its value is captured from iter 1 only — see `A2 § Per-iter loop semantics` (6.1) below.
   - **`suggested_edits` per-entry shape**: `{file, old_string, new_string, rationale}` — `file` is required and must equal one of the paths in `files`. This is the publicity-review / skill-review multi-file pattern (different from explicit-args mode's `{old_string, new_string, rationale}`, which targets the single `Target file`).

6. **Per-iter loop semantics** — reuse `## Workflow` § Step 3 (b) Parse & apply and § Step 3 (c) safety rails verbatim, with these auto-derive-specific overrides:

   - **(b) sub-case 2 schema violation** is extended: in addition to the existing checks, require non-empty string `inferred_intent` at the top level **and** non-empty string `file` on every `suggested_edits` entry. Per-entry shape failures here prevent a malformed entry from crashing a downstream `Edit` call.
   - **(b) sub-case 5 apply** edits the file named by `suggested_edits[i].file` (not the explicit-args `Target file`). **Before each `Edit`**, verify `suggested_edits[i].file ∈ F` (the per-skill `files` set); if not, record the path in an `out_of_scope` list and skip the entry without calling `Edit` (no working-tree write occurs, so no revert is needed for that entry — see (c) Scope rail). `old_string` mismatches on in-scope entries remain the no-op fallback. `applied_edits_count` increments only for `Edit` calls that succeeded; record the `file` path of each successfully-applied edit into the per-iter set `D` consumed by (c) Frontmatter rail.
   - **(c) Scope rail (per-skill, judgment annotation)**: each per-skill dispatch is an independent executor, and (b) sub-case 5's pre-check already prevents writes outside `F`. After the apply phase, if `out_of_scope` is non-empty, the executor attempted to write paths the dispatch payload did not authorize — emit the per-skill verdict with `status: "conflict"`, `reason: "scope violation"`, `reverted_paths: out_of_scope`. No `git checkout HEAD --` runs because no offending write actually landed (the pre-check skipped them); `reverted_paths` reports the rejected paths for caller-visibility. Other per-skill loops continue. This design avoids the multi-skill collateral-damage failure mode where a global `git checkout HEAD -- <sibling-path>` would wipe a sibling skill's already-landed edits.
   - **(c) Frontmatter rail**: applies per edited file in **this iter's apply phase** (the set `D` defined in (b) sub-case 5 — paths whose `Edit` call returned success this iter). For each such file with a `---`-delimited YAML frontmatter block, re-`Read` and parse it; on parse failure, run `git checkout HEAD -- <file>` and emit the per-skill verdict with `status: "conflict"`, `reason: "frontmatter broken"`, `reverted_paths=[<file>]`. Since `D ⊆ F` by construction (pre-check filtering), the `git checkout` only ever touches paths in this skill's `files` — no sibling-skill collateral damage. Files without frontmatter skip this rail (same as explicit-args mode).
   - **(6.1) `inferred_intent` persistence**: capture `inferred_intent` from the **iter 1 verdict** into main-thread context and treat that value as fixed for the rest of the per-skill loop. iter 2+ verdicts may return a different `inferred_intent` because the executor reruns Phase 1 each dispatch — do **not** overwrite the iter-1 value. Auditability requires the per-skill verdict to report a single, stable intent across the loop; iter-2+ drift would make the verdict misleading to a human reader.

     `inferred_intent` write rules at per-skill loop exit (closed list, covers every termination path so the field is unambiguous regardless of `status`):

     - iter 1 produced no parseable verdict (sub-case 1 / 2 / dispatch error) and the per-skill loop terminates immediately with `status=skipped` → write `inferred_intent: null` (there is no iter-1 value to fix).
     - All other termination paths — `converged` at any iter, `conflict` from (c) Scope rail or Frontmatter rail at any iter, `skipped (divergent gaps)` at iter ≥ 2, max-iter `unresolved` — write the iter-1 captured value into `inferred_intent` regardless of `status`. The captured value is fixed at iter 1 and survives subsequent iter outcomes.

     Divergence comparison (sub-case 4) uses the existing `(remaining_gaps, regressions)` multiset pair only; `inferred_intent` is excluded since the main thread fixes it.

7. **Per-skill verdict** — assembled in main-thread context at per-skill loop exit (no JSON is emitted yet; A3 aggregates and emits a single block at the end):

   ```text
   {
     "primary_file": "<path>",
     "files": ["<path>", ...],
     "inferred_intent": "<1-2 sentences>",     // iter-1 value, fixed per (6.1)
     "status": "converged|unresolved|skipped|conflict",
     "iterations_used": N,
     "objective_met": "yes|partial|no|unknown",
     "applied_edits_count": N,
     "unresolved_gaps": ["..."],
     "reverted_paths": ["..."],
     "reason": "..." or null
   }
   ```

   - Field semantics for `unresolved_gaps` / `reverted_paths` / `reason` mirror `## Workflow` § Step 5 — Emit structured summary (the explicit-args contract). Per-skill `status` is the 4-value enum (`converged|unresolved|skipped|conflict`); the new `partial` value lives only at the top level (see A3).
   - **Per-skill `skipped` paths**: (b) sub-case 1 verdict missing/malformed, (b) sub-case 2 schema violation, (b) sub-case 4 divergent gaps, and dispatch error (the `Agent` call itself errored / timed out / returned empty). These mirror the explicit-args mode's `skipped` paths. Because each skill is an independent executor, a `skipped` per-skill verdict alongside other `converged` per-skill verdicts is the typical case that triggers the top-level `partial` rule in A3.

### A3. Aggregate per-skill verdicts

After every per-skill loop has finished, emit a single fenced JSON block at the end of the invocation matching this schema (this replaces `## Workflow` § Step 5 — Emit structured summary for the auto-derive mode code path):

```json
{
  "mode": "auto-derive",
  "status": "converged|partial|unresolved|skipped|conflict",
  "iterations_used_total": 0,
  "applied_edits_count_total": 0,
  "non_skill_files": ["<path>", "..."],
  "per_skill": {
    "<skill-name>": { "...per-skill verdict object from `A2 § Per-skill verdict`..." }
  },
  "reason": null
}
```

`iterations_used_total` and `applied_edits_count_total` are sums across every per-skill verdict.

**Top-level `status` rule** (precedence, first-match-wins):

1. any per-skill `status == conflict` → `conflict`
2. else any per-skill `status == unresolved` → `unresolved`
3. else every per-skill `status == converged` → `converged`
4. else every per-skill `status == skipped` → `skipped`
5. else (a mix of `converged` and `skipped` only — neither `conflict` nor `unresolved`) → `partial`

`partial` is **auto-derive-only** and is never emitted by the explicit-args mode contract — existing callers wired to the explicit-args 4-value enum (e.g. `dev-workflow-triage`'s (d) verdict parser) will not see it.

**Top-level `reason` rule**:

- `status: "skipped"` from A1 early-return: enum string (`"empty diff"` or `"no skill files in diff"`).
- `status: "skipped"` from A3 aggregation (every per-skill is `skipped`): JSON `null` at the top level. Each skill's individual `reason` survives in its per-skill verdict object — callers should `inspect per_skill[<skill>].reason` for the underlying cause.
- All other top-level statuses (`converged` / `partial` / `unresolved` / `conflict`): JSON `null`.

This split prevents a same-status / different-`reason`-shape ambiguity for the `skipped` case (A1 carries an enum string; A3 carries `null` and pushes per-skill `reason` deeper into the verdict).

## Workflow

### Step 1 — Extract context

1. Parse the five fields from the invocation text. If `Target file` is missing or empty, return early:
   ```json
   {"status": "skipped", "reason": "missing target", "iterations_used": 0, "applied_edits_count": 0, "unresolved_gaps": [], "reverted_paths": [], "objective_met": "unknown"}
   ```
2. Run `git diff <Base ref> -- <Target file>`. This captures working-tree-vs-base; no staging is assumed.
3. If the diff is empty, return early with `status=conflict` and `reason="empty diff"`. An empty diff means the caller's Edit did not actually change the file, which is a bug signal the parent should surface as a conflict, not a warning.

### Step 2 — Derive evaluation scenarios (inline, no dispatch)

Generate 1–2 evaluation scenarios plus a requirements checklist from the caller's Finding framing before the executor loop begins. This runs in the skill's main thread — `Read` only, no Agent dispatch.

1. `Read` the first 100 lines of `Target file` to pick up the frontmatter, `description`, and opening intent prose.
2. Produce **at least one** "median" scenario — the typical use case the `Description` and `Suggested fix direction` imply. If those two fields are too thin to anchor a median, fall back to the target file's own frontmatter `description`: "does the diff achieve what this file declares as its purpose?" This fallback always yields a scenario.
3. Add **one** "edge" scenario only if the Finding text explicitly names a boundary condition, a failure mode, or an input class the median does not cover. Otherwise stop at one scenario — do not pad.
4. For each scenario, write a requirements checklist of 3–7 items. Frame each item as an **intent / behavior / property** the diff must achieve, not as a reference to specific text fragments or line numbers — edits may legitimately rewrite a referenced fragment mid-run and invalidate text-anchored checks. When the Finding inherently involves a specific fragment (e.g. a rename), frame the item around the resulting behavior (e.g. "no occurrences of the old name remain in the specified scope") rather than requiring an exact substring match. **At least one item must be tagged `[critical]`** (minimum success bar; prevents vacuous-pass verdicts).
5. Hold the scenarios and checklists in main-thread context for the duration of the run. **Do not regenerate mid-run** — cross-iteration reproducibility depends on fixing them once.

### Step 3 — Iteration loop (i = 1 .. Max iterations)

**Pre-register iteration TodoWrite items** — before entering the loop, create `iteration 1`, `iteration 2`, ..., `iteration <Max iterations>` TodoWrite items. Mark `in_progress` before each dispatch, `completed` after parse+apply (for a `converged` verdict, "apply" is a no-op — mark `completed` immediately after parsing the verdict). On early convergence (verdict matches the converged rule) or safety-rail triggered exit (`skipped` / `conflict`), mark remaining iteration items `completed` with note matching the exit reason (e.g. `skipped: converged at iter 2`). The "note" lives in the TodoWrite item's `content` field — append as `— <reason>`; TodoWrite has no dedicated note field. Pre-registration is load-bearing: without it, the executor-driven loop tends to stop after the first iteration that looks acceptable, even when gaps remain that further iterations could close.

#### (a) Dispatch bias-free executor

At the start of every iteration, `Read` the full current contents of `Target file` so the snapshot reflects prior edits. On `i ≥ 2`, also re-run `git diff <Base ref> -- <Target file>` so the diff reflects edits that landed in prior iterations.

Invoke the `Agent` tool to dispatch a fresh executor. Assemble the dispatch prompt from the four sections below, each framed with a clear section label (e.g. `--- TARGET FILE ---`, `--- UNIFIED DIFF ---`, `--- SCENARIOS ---`, `--- EXECUTOR PROMPT ---`) so the executor can parse each payload unambiguously. Use the same order as the labels above:

- **TARGET FILE**: `Target file`'s full current contents (verbatim)
- **UNIFIED DIFF**: the unified diff
- **SCENARIOS**: the scenarios and requirements checklists from Step 2 — Derive evaluation scenarios (verbatim, identical across all iterations)
- **EXECUTOR PROMPT**: the executor prompt and JSON schema below (verbatim)

**Executor prompt (include verbatim in the executor prompt):**

> You are a fresh executor of the target file. You have **not** seen the original Finding framing — only the scenarios and checklist below. **Actually execute each scenario** against the target as written; do not merely read and judge. Produce scenario artifacts in your response body, then report unclear points, discretionary fills, and retries in natural language.
>
> Judge whether the diff resolves the problem the scenarios encode AND follows the scenarios' intent. Check for regressions — changes that break behavior the original file relied on. Return `objective_met: "yes"` only if there are **no remaining gaps AND no regressions**. Otherwise return `"partial"` (direction is right but gaps remain) or `"no"` (diff does not address the objective).
>
> **Gate reachability rule (required)**: when your final verdict is `objective_met: "yes"` AND `regressions: []`, you **must** return `suggested_edits: []`. Do not emit speculative or nice-to-have edits on a pass — record any such observations in `remaining_gaps` instead. `suggested_edits` is the convergence signal and must be empty when you are declaring the work done.

**Response format (include verbatim in the executor prompt):**

> Write your reasoning and scenario execution in natural language, then end your response with a single fenced JSON block matching this schema:
>
> ````
> ```json
> {
>   "objective_met": "yes|partial|no",
>   "remaining_gaps": ["<short phrase>"],
>   "regressions": ["<short phrase>"],
>   "suggested_edits": [
>     {"old_string": "<unique snippet>", "new_string": "<replacement>", "rationale": "<why>"}
>   ],
>   "confidence": "high|medium|low"
> }
> ```
> ````
>
> `old_string` must match exactly one location in the current file. Include **1–3 lines of surrounding context** so the snippet is unique — short one-liners collide and cause the Edit to fail.

#### (b) Parse & apply — evaluate in this order, first match wins

1. **Verdict missing or malformed** — no fenced JSON block found, or JSON parse fails → return `status=skipped`, `reason="verdict parse failure"`.
2. **Schema violation** — `objective_met` is not one of `yes|partial|no`, or required keys are missing → return `status=skipped`, `reason="verdict schema violation"`.
3. **Converged** — `objective_met == "yes"` AND `regressions` is empty → exit loop with `status=converged` and proceed directly to Step 5 — Emit structured summary. If `suggested_edits` is nonempty, discard the edits (do not apply them) — the gate-reachability rule told the executor to return `[]` on a pass verdict, so nonempty edits on a pass are treated as ignored observations consistent with that contract. Safety rails (c) do not run (no edit was applied this iteration).
4. **Divergence** — only when `i >= 2`: if both `remaining_gaps` AND `regressions` contain the same elements as the previous iteration's values (compare as multisets — sort each array textually before comparison so a reordered-but-identical report still counts as divergence), the loop is not making progress → return `status=skipped`, `reason="divergent gaps"`. (Skip on `i = 1`. Comparing the `(remaining_gaps, regressions)` pair catches an executor that reports regressions-only with empty `suggested_edits`, which would otherwise loop on empty-equal `remaining_gaps` alone.)
5. **Otherwise** — apply `suggested_edits` in order:
   - Re-Read the target file before each Edit so `old_string` matches current contents.
   - If an `old_string` is not found, skip that edit and continue with the next. This is expected when the executor returned multiple edits from a single snapshot and a later edit overlaps a region an earlier edit already rewrote — the skip is a no-op fallback, not an error.
   - After the edits (applied or skipped), run the safety rails in (c), then continue to iteration `i + 1`.

#### (c) Per-iteration safety rails — run only if at least one edit was applied

- **Frontmatter integrity** — Re-Read the file. If the file begins with a `---`-delimited YAML frontmatter block, parse it; if parsing fails:
  ```
  git checkout HEAD -- <Target file>
  ```
  Return `status=conflict`, `reason="frontmatter broken"`, `reverted_paths=[<Target file>]`. If the file has no frontmatter block at all (e.g., a plain source file), skip this rail — there is nothing to corrupt.
- **Scope** — Run `git diff --name-only`. If any returned path is not `<Target file>`:
  ```
  git checkout HEAD -- <each offending path>
  ```
  Return `status=conflict`, `reason="scope violation"`, `reverted_paths=[<each offending path>]`.

### Step 4 — Max iterations reached without convergence

Set `status=unresolved`, `unresolved_gaps = <last remaining_gaps>`. `applied_edits_count` reflects edits that actually landed (not skipped).

### Step 5 — Emit structured summary

End every invocation with a single fenced JSON block. The schema depends on the mode that ran:

- **explicit-args mode**: emit the schema below (4-value `status` enum). Existing callers (e.g. `dev-workflow-triage`'s (d) verdict parser) consume this contract.
- **auto-derive mode**: emit the aggregate schema defined in `## Auto-derive mode` § A3 (5-value `status` enum including `partial`, plus the per-skill nesting).

The explicit-args mode schema:

```json
{
  "status": "converged|unresolved|skipped|conflict",
  "iterations_used": N,
  "objective_met": "yes|partial|no|unknown",
  "applied_edits_count": N,
  "unresolved_gaps": ["..."],
  "reverted_paths": ["..."],
  "reason": "verdict parse failure|verdict schema violation|divergent gaps|frontmatter broken|scope violation|missing target|incomplete args|empty diff|dispatch error|null"
}
```

The `|null` token at the end of the `reason` enum means JSON `null` (not the string `"null"`).

Field semantics by status:

- `reason`: JSON `null` for `converged` and `unresolved`; the matching enumerated string otherwise.
- `objective_met`: the last verdict's value for `converged` (always `"yes"`), `unresolved`, and `skipped (divergent gaps)`. `"unknown"` for all other skipped/conflict paths — this also covers the degenerate case where no verdict was ever received (e.g. `Max iterations ≤ 0`, or every dispatch failed).
- `unresolved_gaps`: the last verdict's `remaining_gaps` for `unresolved` and `skipped (divergent gaps)`; `[]` otherwise (including the no-verdict degenerate cases above).
- `applied_edits_count`: count of `suggested_edits` whose `Edit` call succeeded. Edits skipped because their `old_string` did not match do not count. Applies to all statuses.
- `iterations_used`: the number of iterations whose executor dispatch returned a verdict, whether or not edits landed — **including the iteration whose verdict triggered `converged`** (which applies no edits itself). Early returns from Step 1 (`missing target`, `empty diff`) and from `## Invocation contract` § Mode determination (`incomplete args`) count as `0`.

## Dispatch failure

If the `Agent` tool call itself errors, times out, or returns an empty response, return `status=skipped`, `reason="dispatch error"`. Do not re-read the file yourself as a fallback — self-review reintroduces the bias this skill exists to avoid.

## No structure-only mode

This skill does not have a static-review fallback. Callers that want best-practices checking (prose quality, naming, description rigor) should chain `Skill(skill-review)` after `verify-diff`; the two skills are complementary, not substitutes.

## Scope check boundary

`verify-diff` runs its scope check per iteration (inside (c)) to catch leaks the moment they appear. A caller running its own final scope check per Finding provides a last-resort backstop — two independent gates, different granularities. In auto-derive mode the scope check is per-skill — the baseline is the per-skill `files` set rather than a single `Target file` — see `## Auto-derive mode` `A2 § Per-iter loop semantics` (c).

## Stop hook structural conflict (caller-side note)

This skill operates on an uncommitted working tree throughout: main thread `Edit` applies executor-suggested edits, the Step 3 iteration loop dispatches further `Agent` executors, and the caller is the one that eventually decides whether to commit. On Claude Code on the Web the auto-installed `~/.claude/stop-hook-git-check.sh` fires on every Stop event between dispatches and feeds back `Please commit and push…`. **Treat each fire as a spurious fire** — record it, ignore the prose, and keep going until Step 5 emits the structured summary. Do **not** commit from inside this skill (and `allowed-tools` omits `git commit` so an attempt would fail anyway); commit policy lives with the caller (e.g. `dev-workflow-triage`'s per-Finding flow). See `dev-workflow-triage` SKILL.md `§ Stop hook structural conflict` for the canonical write-up.

In auto-derive mode the per-skill loop dispatches an `Agent` for each skill (and again per iteration), so the multiplier on hook-fire count is `N skills × iter` rather than the single dispatch loop of explicit-args mode. Same disposition (record and continue), but the higher fire count is normal for this mode.

## Outer review loop interaction (caller-side note)

When invoked from `dev-workflow-triage`'s § 3.4 (d-loop) at outer iter ≥ 2, the cumulative diff against `Base ref = HEAD` may include sibling-review polish edits (from `Skill(skill-review)` / `Skill(publicity-review)`) unrelated to the original Finding's `Description` / `Suggested fix direction`. The bias-free executor may judge those polish lines as "regression" and emit `unresolved` more frequently than it would in iter 1 — this is the expected disposition under outer-loop wrapping, not a `verify-diff` bug. Caller-side handling: the caller treats `unresolved` as a non-fatal warning (does not abort the Finding), and the outer loop's early-exit may absorb the noise once all three callees stop applying edits. See `dev-workflow-triage` SKILL.md `§ 3.4 Apply accepted Findings` (d-loop) Notes — Base ref behavior for the canonical write-up.

## Related

- `prompt-tuning` — iterative empirical evaluation of a whole prompt against multi-scenario requirement checklists. Shares the anti-self-review philosophy (dispatch a fresh executor; never self-review) but operates at prompt-quality granularity, while `verify-diff` operates on a single diff with a single objective. `verify-diff` automates prompt-tuning's human-in-the-loop by having the executor emit `suggested_edits` from its unclear-points report. The auto-derive mode reuses the same intent-inference pattern from prompt-tuning and re-specializes it for diff-verification granularity.
