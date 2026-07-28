---
name: verify-skill-refs
description: Statically lint the dev-workflow and mobpro skill trees for SKILL.md cross-reference and output-naming invariants — dangling `§` / bold-label references, mirrored closed-list divergence, bare-number step references in prose, bare identifiers in user-facing output literals, and governed-site enumeration gaps — via a subagent, returning a structured two-layer verdict. Use after editing either tree's `SKILL.md` or its `references/*.md` to catch cross-reference and naming drift before commit. Non-interactive — no user prompts. Project-local routine — not for marketplace distribution.
allowed-tools: Agent, Read, Glob, Grep, Bash(diff *)
---

# Verify Skill Refs

Static lint for the cross-reference and output-naming invariants that hold each workflow-orchestrator skill tree together — its `SKILL.md` plus its `references/*.md`. It mechanizes the verification patterns accumulated as manual canonical rules in `.claude/rules/` (stable-phrase-anchor cross-references, closed-list mirroring, the bare-number step reference prohibition, governed-site enumerations) and the phase-naming invariant each target tree declares in its own `§ Phase naming in user-facing output` section. It is a **project-local** skill (lives under `.claude/skills/verify-skill-refs/`, not registered in `.claude-plugin/marketplace.json`). Detect-only — it never modifies any files.

**Target roots (closed list)**: `skills/dev-workflow` and `skills/mobpro` — both are linted on a no-argument run. They are the two skills that carry numbered phase identifiers plus a `references/` tree, so they are the two the reference-resolution and phase-naming invariants apply to. Each root declares its own **identifier pattern** (dev-workflow: `Step <n>[.<n>]`; mobpro: `M<n>`) and its own **name authority** (dev-workflow: Step 1 sub-step 7's phase registration list; mobpro: each `## M<n> — <name>` heading) — classes (c) and (e) read the pattern and authority of whichever root a candidate came from. Cross-root references are out of scope: each root resolves independently, so a `§` reference in one root never resolves against the other's headings. Append a root here when another skill acquires the same shape.

Five detection classes — the detection rules live in [`references/check-rules.md`](references/check-rules.md) (single canonical home; do not duplicate them here):

- **(a) Reference resolution failure** — `§ <Heading>` / `references/<file>.md § <Heading>` / bold-prose-label references that do not resolve to an existing heading or bold label. Only **unambiguous** dangling references are violations (demotion criteria: `references/check-rules.md` § Class (a)'s "Demotion rule (violation vs warning)" paragraph).
- **(b) Mirrored closed-list divergence** — manifest-registered "keep in sync" pairs whose two sites have drifted apart. Warning-only.
- **(c) Bare-number step references in prose** — the root's identifier carrying no stable descriptor (the number+descriptor pair form and stable-phrase forms are allowed). Warning-only.
- **(d) Governed-site enumeration gaps** — manifest-registered enumerations (e.g. `subagent_model` read sites) missing an actual site that grep locates. Warning-only.
- **(e) Bare identifier in a user-facing output literal** — a literal string the tree tells the orchestrator to render, emit, warn, or append to a rendered-verbatim ledger, carrying the root's identifier with no phase name beside it. **Status-affecting** (violations), unlike (b)(c)(d) — see the Severity model below. This is the machine counterpart of each root's `§ Phase naming in user-facing output` section.

**Class-addition sweep**: when adding a detection class, update this closed set in one pass — the class list above, the class-count word opening that list, the verdict-schema enums in § Executor prompt (both the `violation_entries` `class` enum and the `warning_entries` one), the "Severity model" paragraph's class enumeration, the class's rule section in `references/check-rules.md`, and the class's integration into `references/check-rules.md` § Executor pipeline (extraction pattern / mechanical pre-filter / judgment) (§ Return contract's Layer 2 delta form carries no enum of its own — just confirm it still holds).

**Severity model**: classes **(a)** and **(e)** are status-affecting; **(b)(c)(d)** and the two demotion paths (`a-demoted` / `e-demoted`) are warning-only, and a run with zero violations and any number of warnings still returns `SUCCESS`. The split is by **determinism of the core predicate**, not by importance. (b)(c)(d) rest on open-ended judgment — is this prose a real reference, does this descriptor count as stable, is this site governed — so gating on them would make a `test_commands` wiring fail non-deterministically. (a) and (e) each reduce to a closed mechanical test once extraction settles: (a) "does this key match a heading or bold span"; (e) "does this literal contain the root's identifier **and** no name from the root's authority list". Extraction ambiguity is what the demotion paths absorb, which is why each has one — a candidate whose extraction is uncertain becomes a warning rather than weakening the class's own predicate. Promoting (b)(c)(d) is a deliberate later decision once precision has a track record.

## Invocation contract

- **No arguments** → lint **every** § Target roots entry: each root's `SKILL.md` plus its `references/*.md`.
- **`--base-commit <sha>`** is accepted but **ignored** — the scope is structural, not changeset-dependent: a reference in an *unchanged* file dangles when a *changed* file removes its target heading, so changed-file narrowing is unsound (same accept-and-ignore convention as `verify-bundle-sync`).
- **`Target dir: <path>`** *(optional)* — lint that one root instead of the default set (e.g. a scratch copy with injected defects, for testing detection rules), so it both narrows and overrides. It must contain `SKILL.md` + `references/*.md`. When provided, the bundle-copy identity check (Process step 2) is skipped — the override target is not a canonical tree — and the root's identifier pattern / name authority are inferred from its content (a `Step <n>`-shaped tree reads dev-workflow's, an `M<n>`-shaped one mobpro's); a root matching neither shape runs classes (a)(b)(d) only, with (c) and (e) reported as not-applicable in the Layer 1 summary.

## Process

1. **Resolve the target roots**: the single `Target dir:` value when provided, else every § Target roots entry. For each root, target files = `<root>/SKILL.md` plus every `<root>/references/*.md` (via Glob). If a root's `SKILL.md` cannot be read, halt and emit the Return contract's error response with `reason: "target root missing: <path>"` — a missing root is a wiring defect, not a root to silently drop.
2. **Bundle-copy identity check, once per root** (skip entirely when `Target dir:` was provided): for each root run `diff -rq <root> plugins/dev-workflow-bundle/<root-basename-path>` — `skills/dev-workflow` → `plugins/dev-workflow-bundle/skills/dev-workflow`, `skills/mobpro` → `plugins/dev-workflow-bundle/skills/mobpro` (same exit-code / stdout discrimination as `verify-bundle-sync` Process step 2). This step exists only for the [anthropics/claude-code#53948](https://github.com/anthropics/claude-code/issues/53948) symlink workaround — delete it (and the `bundle_copy` verdict field it feeds) when the bundle layout returns to symlinks; see `verify-bundle-sync` SKILL.md's deletion note, which enumerates this site.
   - Identical (empty output, zero exit) → this root contributes `identical`, and the Layer 1 summary notes its findings apply to both trees.
   - Drift (non-empty output) → the canonical lint still runs in full for that root; it contributes `drift` and one Layer 1 warning line: `bundle copy drift detected in <root> — sync verification delegated to verify-bundle-sync`. The bundle copy is not linted a second time.
   - Non-zero exit with empty output → tool failure; halt with the error response (`reason: "diff failed"`).
   - **Aggregate to the single `bundle_copy` verdict field**: `"identical"` only when every root was identical; `"drift"` when any root drifted (the per-root detail lives in the Layer 1 warning lines).
3. **Read** [`references/check-rules.md`](references/check-rules.md) for verbatim injection into the dispatch payload.
4. **Dispatch the lint subagent** (Agent tool, subagent_type: `general-purpose`, `model: sonnet` — mechanical extraction dominates the work, so `sonnet` is sufficient by default; a deliberate skill-side cost choice mirroring `run-tests`). Assemble the dispatch prompt from these sections, each framed with a `--- LABEL ---` fence:
   - `--- TARGET ROOTS ---`: one line per root — `<root path>` followed by its identifier pattern and its name authority (verbatim from § Target roots), so classes (c) and (e) know which to apply to a candidate from that root.
   - `--- TARGET FILES ---`: the resolved target files as repo-relative paths, one per line, grouped under their root (paths only — the subagent works grep-first and must not read the files end-to-end).
   - `--- CHECK RULES ---`: the full content of `references/check-rules.md`.
   - `--- EXECUTOR PROMPT ---`: the § Executor prompt below, verbatim.
5. **Parse & render** — evaluate in order, first match wins (same evaluate-in-order discipline as `verify-diff` § (b) Parse & apply, restricted to the cases that apply to a single-pass dispatch):
   1. **Verdict missing or malformed** — no fenced JSON block in the subagent response, or JSON parse fails → emit the Return contract with `Status: EXECUTION_ERROR` / `status: "error"`, `reason: "verdict parse failure"`.
   2. **Schema violation** — `status` missing or outside its enum, `violation_entries` / `warning_entries` missing or not arrays, or any entry missing a non-empty string `class` / `file` / `detail` → the error response with `reason: "verdict schema violation"`.
   3. **Otherwise** — render the two-layer Return contract from the verdict, merging in the step 2 `bundle_copy` result (the subagent does not compute it).

**`Agent` unavailable fallback**: detection and fallback follow the canonical write-up in `rules-review` SKILL.md § 5. Review (the "Fallback path" bullet and the "Detect availability by inspecting the current tool surface" paragraph). verify-skill-refs specialization: on fallback, execute `references/check-rules.md` § Executor pipeline inline in the main thread against the target files and emit the same two-layer Return contract, so callers parse identically on both paths.

## Executor prompt

Include the following verbatim in the dispatch payload:

> You are a bias-free lint executor. You have **not** seen prior conversation context — only the TARGET ROOTS, TARGET FILES, CHECK RULES, and this prompt. Execute the CHECK RULES' § Executor pipeline top to bottom against the TARGET FILES, running every pass across all roots at once (one Grep per pattern over the whole file set — the returned file column tells you which root a candidate came from). Resolve `§` references and apply classes (c) / (e) **within the candidate's own root only**: each root has its own headings, its own identifier pattern, and its own name authority, so never resolve a candidate from one root against another's.
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
>   "violation_entries": [{"class": "a" | "e", "file": "<repo-relative path>", "detail": "<the reference or literal + why it fails>"}],
>   "warning_entries": [{"class": "a-demoted" | "b" | "c" | "d" | "e-demoted" | "stale-manifest", "file": "<repo-relative path>", "detail": "<one line>"}],
>   "checked": {"roots": 0, "files": 0, "refs_extracted": 0, "refs_unresolved": 0, "manifest_pairs": 0, "step_candidates": 0, "output_literals": 0},
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

<one-paragraph summary: the roots linted, file count, per-class finding counts, bundle-copy note (per-root when any root drifted), and any not-applicable class under a `Target dir:` override>
<if TEST_FAILED: one line per violation (class, file, reference or literal, why)>
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
