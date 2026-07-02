---
name: verify-skill-refs
description: Statically lint the dev-workflow skill tree for SKILL.md cross-reference invariants — dangling `§` / bold-label references, mirrored closed-list divergence, bare-number Step references, and governed-site enumeration gaps — via a subagent, returning a structured two-layer verdict. Use after editing `skills/dev-workflow/SKILL.md` or its `references/*.md` to catch cross-reference drift before commit. Non-interactive — no user prompts. Project-local routine — not for marketplace distribution.
allowed-tools: Agent, Read, Glob, Grep, Bash(diff *)
---

# Verify Skill Refs

Static lint for the cross-reference invariants that hold `skills/dev-workflow/SKILL.md` and its `references/*.md` together. It mechanizes the verification patterns accumulated as manual canonical rules in `.claude/rules/` (stable-phrase-anchor cross-references, closed-list mirroring, the bare-number Step reference prohibition, governed-site enumerations). It is a **project-local** skill (lives under `.claude/skills/verify-skill-refs/`, not registered in `.claude-plugin/marketplace.json`). Detect-only — it never modifies any files.

Four detection classes — the detection rules live in [`references/check-rules.md`](references/check-rules.md) (single canonical home; do not duplicate them here):

- **(a) Reference resolution failure** — `§ <Heading>` / `references/<file>.md § <Heading>` / bold-prose-label references that do not resolve to an existing heading or bold label. Only **unambiguous** dangling references are violations (demotion criteria: `references/check-rules.md` § Class (a)'s "Demotion rule (violation vs warning)" paragraph).
- **(b) Mirrored closed-list divergence** — manifest-registered "keep in sync" pairs whose two sites have drifted apart. Warning-only.
- **(c) Bare-number Step references** — `Step N` prose references carrying no stable descriptor (the number+descriptor pair form and stable-phrase forms are allowed). Warning-only.
- **(d) Governed-site enumeration gaps** — manifest-registered enumerations (e.g. `subagent_model` read sites) missing an actual site that grep locates. Warning-only.

**Class-addition sweep**: when adding a detection class, update this closed set in one pass — the class list above, the warning-class enum in § Executor prompt's verdict schema, the "Severity model" paragraph's class enumeration, the class's rule section in `references/check-rules.md`, and the class's integration into `references/check-rules.md` § Executor pipeline (extraction pattern / mechanical pre-filter / judgment) (§ Return contract's Layer 2 delta form carries no enum of its own — just confirm it still holds).

**Severity model**: warnings never change the status — a run with zero violations and any number of warnings still returns `SUCCESS`. Classes (b)(c)(d) and the class (a) demotion path involve LLM judgment and are non-deterministic; gating the status on them would make a future `test_commands` wiring fail non-deterministically. Promoting a class to fail-gating is a deliberate later decision once its precision has a track record.

## Invocation contract

- **No arguments** → lint the default target: `skills/dev-workflow/SKILL.md` + `skills/dev-workflow/references/*.md`.
- **`--base-commit <sha>`** is accepted but **ignored** — the scope is structural, not changeset-dependent: a reference in an *unchanged* file dangles when a *changed* file removes its target heading, so changed-file narrowing is unsound (same accept-and-ignore convention as `verify-bundle-sync`).
- **`Target dir: <path>`** *(optional)* — lint an alternate root containing `SKILL.md` + `references/*.md` (e.g. a scratch copy with injected defects, for testing detection rules). When provided, the bundle-copy identity check (Process step 2) is skipped — the override target is not the canonical tree.

## Process

1. **Resolve the target root**: the `Target dir:` value when provided, else `skills/dev-workflow`. Target files = `<target-root>/SKILL.md` plus every `<target-root>/references/*.md` (via Glob). If `<target-root>/SKILL.md` cannot be read, halt and emit the Return contract's error response with `reason: "target root missing: <path>"`.
2. **Bundle-copy identity check** (skip when `Target dir:` was provided): run `diff -rq skills/dev-workflow plugins/dev-workflow-bundle/skills/dev-workflow` (same exit-code / stdout discrimination as `verify-bundle-sync` Process step 2). This step exists only for the [anthropics/claude-code#53948](https://github.com/anthropics/claude-code/issues/53948) symlink workaround — delete it (and the `bundle_copy` verdict field it feeds) when the bundle layout returns to symlinks; see `verify-bundle-sync` SKILL.md's deletion note, which enumerates this site.
   - Identical (empty output, zero exit) → set `bundle_copy: "identical"` and note in the Layer 1 summary that the findings apply to both trees.
   - Drift (non-empty output) → the canonical lint still runs in full; set `bundle_copy: "drift"` and add one warning line to the Layer 1 summary: `bundle copy drift detected — sync verification delegated to verify-bundle-sync`. The bundle copy is not linted a second time.
   - Non-zero exit with empty output → tool failure; halt with the error response (`reason: "diff failed"`).
3. **Read** [`references/check-rules.md`](references/check-rules.md) for verbatim injection into the dispatch payload.
4. **Dispatch the lint subagent** (Agent tool, subagent_type: `general-purpose`, `model: sonnet` — mechanical extraction dominates the work, so `sonnet` is sufficient by default; a deliberate skill-side cost choice mirroring `run-tests`). Assemble the dispatch prompt from these sections, each framed with a `--- LABEL ---` fence:
   - `--- TARGET FILES ---`: the resolved target files as repo-relative paths, one per line (paths only — the subagent works grep-first and must not read the files end-to-end).
   - `--- CHECK RULES ---`: the full content of `references/check-rules.md`.
   - `--- EXECUTOR PROMPT ---`: the § Executor prompt below, verbatim.
5. **Parse & render** — evaluate in order, first match wins (same evaluate-in-order discipline as `verify-diff` § (b) Parse & apply, restricted to the cases that apply to a single-pass dispatch):
   1. **Verdict missing or malformed** — no fenced JSON block in the subagent response, or JSON parse fails → emit the Return contract with `Status: EXECUTION_ERROR` / `status: "error"`, `reason: "verdict parse failure"`.
   2. **Schema violation** — `status` missing or outside its enum, `violation_entries` / `warning_entries` missing or not arrays, or any entry missing a non-empty string `class` / `file` / `detail` → the error response with `reason: "verdict schema violation"`.
   3. **Otherwise** — render the two-layer Return contract from the verdict, merging in the step 2 `bundle_copy` result (the subagent does not compute it).

**`Agent` unavailable fallback**: detection and fallback follow the canonical write-up in `rules-review` SKILL.md § 5. Review (the "Fallback path" bullet and the "Detect availability by inspecting the current tool surface" paragraph). verify-skill-refs specialization: on fallback, execute `references/check-rules.md` § Executor pipeline inline in the main thread against the target files and emit the same two-layer Return contract, so callers parse identically on both paths.

## Executor prompt

Include the following verbatim in the dispatch payload:

> You are a bias-free lint executor. You have **not** seen prior conversation context — only the TARGET FILES, CHECK RULES, and this prompt. Execute the CHECK RULES' § Executor pipeline top to bottom against the TARGET FILES.
>
> Execute the pipeline **yourself, in this agent** — do not spawn a nested subagent (`Agent` tool) and do not dispatch any `Skill()`. Re-delegation is an observed failure mode: the executor stops to wait on its child and returns no verdict, which the caller then treats as a parse failure.
>
> Use the **Grep tool** (ripgrep-class, environment-invariant) for all pattern extraction — or `rg` via Bash when the Grep tool is not exposed in your tool surface (same ripgrep engine). Never use Bash `grep` (its flavor varies across environments: BSD / GNU / ugrep, with incompatible word-boundary syntax). Work grep-first: build indexes and extract candidates with Grep, and Read only the specific regions you need for judgment — never the target files end-to-end.
>
> If you need scratch space, write **outside any skill tree** (never under `skills/` or `plugins/` — stray output there breaks bundle-sync verification); prefer the session scratchpad or the system temp directory.
>
> Write a brief reasoning summary (per-class counts, then one line per finding), then end your response with a single fenced JSON block matching this schema:
>
> ```json
> {
>   "status": "ok" | "violations" | "error",
>   "violation_entries": [{"class": "a", "file": "<repo-relative path>", "detail": "<the reference text + why it is unresolved>"}],
>   "warning_entries": [{"class": "a-demoted" | "b" | "c" | "d" | "stale-manifest", "file": "<repo-relative path>", "detail": "<one line>"}],
>   "checked": {"files": 0, "refs_extracted": 0, "refs_unresolved": 0, "manifest_pairs": 0, "step_candidates": 0},
>   "reason": "<required when status=error, else omit>"
> }
> ```
>
> `status` is `"violations"` iff `violation_entries` is non-empty, `"error"` only for infrastructure failures (unreadable target file, or no ripgrep-class search available — neither the Grep tool nor `rg`), else `"ok"`. Warnings never change `status`.

## Return contract

The skill emits its result in **two layers** in a single response (mirroring `verify-bundle-sync` § Return contract's form) so both prose-reading and JSON-parsing callers can extract the verdict mechanically.

**Layer 1 — Prose summary** (first, at the top of the response):

```
Status: SUCCESS | TEST_FAILED | EXECUTION_ERROR

<one-paragraph summary: target root, file count, per-class finding counts, bundle-copy note>
<if TEST_FAILED: one line per violation (class, file, reference, why)>
<warnings grouped by class, one line each — present regardless of status>
<if EXECUTION_ERROR: reason and which step failed>
```

**Layer 2 — Fenced JSON verdict** (last, at the end of the response): identical to the § Executor prompt's verdict schema, plus one main-thread field merged in per Process step 5 — `"bundle_copy": "identical" | "drift" | "skipped"`.

Mapping between the prose status token and the JSON `status` field (the status value and the array field names are deliberately distinct — `violations` vs `violation_entries` — mirroring `verify-bundle-sync`'s `drift` / `drift_files[]` separation):

| Prose `Status:` | JSON `status` |
| --- | --- |
| `SUCCESS` | `ok` |
| `TEST_FAILED` | `violations` |
| `EXECUTION_ERROR` | `error` |

- `bundle_copy`: set by the main thread from Process step 2 (`"skipped"` under a `Target dir:` override). Omitted on `status: "error"`; a main-thread-synthesized error verdict (a Process step 1 or 2 halt, or step 5's verdict-missing / schema-violation cases) carries empty `violation_entries` / `warning_entries` and a zeroed `checked`.
- `reason`: required on `status: "error"`. Short, ≤ 80 characters.
- A future `test_commands` caller parses the **JSON layer** (`.status`); the prose layer serves human readers and `dev-workflow` Step 7's semantic judgment.

**EXECUTION_ERROR is deterministic** within a run (missing target root, unreadable files, tool failure) — see `verify-bundle-sync`'s canonical note on why caller retries are harmless but futile.
