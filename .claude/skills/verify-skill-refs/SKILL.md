---
name: verify-skill-refs
description: Statically lint the dev-workflow and mobpro skill trees for SKILL.md cross-reference and output-naming invariants — dangling `§` / bold-label references, mirrored closed-list divergence, bare-number step references in prose, bare identifiers in user-facing output literals, and governed-site enumeration gaps — via a deterministic Node script plus a judgment subagent, returning a structured two-layer verdict whose pass/fail fields repeat identically across runs. Use after editing either tree's `SKILL.md` or its `references/*.md` to catch cross-reference and naming drift before commit. Non-interactive — no user prompts. Project-local routine — not for marketplace distribution.
allowed-tools: Agent, Read, Grep, Bash(node *), Bash(diff *)
---

# Verify Skill Refs

Static lint for the cross-reference and output-naming invariants that hold each workflow-orchestrator skill tree together — its `SKILL.md` plus its `references/*.md`. Detect-only — it never modifies any files. Editing this skill (adding a detection class, a warning token, or a target root; manifest upkeep) is covered by [`README.md`](README.md).

**Target roots (closed list)**: `skills/dev-workflow` and `skills/mobpro` — both are linted on a no-argument run. Each root declares its own **identifier pattern** (dev-workflow: `Step <n>[.<n>]`; mobpro: `M<n>`) and its own **name authority** (dev-workflow: Step 1 sub-step 7's phase registration list plus its `###` headings; mobpro: each `## M<n> — <name>` heading) — classes (c) and (e) read the pattern and authority of whichever root a candidate came from, both inferred from the root's own content rather than from its path. `§` resolution is per-root, except that a reference **naming** another skill resolves in that skill's tree — `references/check-rules.md` § Class (a)'s "Resolution scope model" paragraph owns the full model.

Five detection classes — the detection rules live in [`references/check-rules.md`](references/check-rules.md):

- **(a) Reference resolution failure** — `§ <Heading>` / `references/<file>.md § <Heading>` / bold-prose-label references that do not resolve to an existing heading or bold label. Only **unambiguous** dangling references are violations (demotion criteria: `references/check-rules.md` § Class (a)'s "Demotion rule (violation vs warning)" paragraph).
- **(b) Mirrored closed-list divergence** — manifest-registered "keep in sync" pairs whose two sites have drifted apart. Warning-only.
- **(c) Bare-number step references in prose** — the root's identifier carrying no stable descriptor (the number+descriptor pair form and stable-phrase forms are allowed). Warning-only, and the one class scoped to a `--base-commit` diff rather than the whole tree (§ Invocation contract).
- **(d) Governed-site enumeration gaps** — manifest-registered enumerations (e.g. `subagent_model` read sites) missing an actual site that grep locates. Warning-only.
- **(e) Bare identifier in a user-facing output literal** — a literal string the tree tells the orchestrator to render, emit, warn, or append to a rendered-verbatim ledger, carrying the root's identifier with no phase name beside it. **Status-affecting** (violations), unlike (b)(c)(d) — see the Severity model below. This is the machine counterpart of each root's `§ Phase naming in user-facing output` section.

**Severity model**: classes **(a)** and **(e)** are status-affecting; **(b)(c)(d)**, the two demotion paths (`a-demoted` / `e-demoted`), `scope-narrowed`, `stale-manifest`, and `judgment-failed` are warning-only, and a run with zero violations and any number of warnings still returns `SUCCESS`.

## Invocation contract

- **No arguments** → lint **every** § Target roots entry: each root's `SKILL.md` plus its `references/*.md`.
- **`--base-commit <sha>`** scopes **class (c) only**; classes (a)(b)(d)(e) always cover the whole tree (`references/check-rules.md` § Class (c)'s "Scope: changed lines only." paragraph). Omitting the flag reports class (c) as not applicable rather than failing.
- **`Target dir: <path>`** *(optional)* — lint that one root instead of the default set. It must contain `SKILL.md` + `references/*.md`. When provided, the bundle-copy identity check (Process step 2) is skipped, and the root's identifier pattern / name authority are inferred from its content (a `Step <n>`-shaped tree reads dev-workflow's, an `M<n>`-shaped one mobpro's); a root matching neither shape runs classes (a)(b)(d) only, with (c) and (e) reported as not-applicable in the Layer 1 summary. Findings come from the override target alone, but the **sibling default root is still loaded for resolution**, so references naming it do not report as dangling. A target whose directory name matches a default root shadows it.

## Process

1. **Resolve the target roots**: the single `Target dir:` value when provided, else every § Target roots entry. The main thread needs the root paths only for Process step 2 (the bundle-copy identity check); enumerating each root's target files (`<root>/SKILL.md` plus every `<root>/references/*.md`) belongs to Process step 3's mechanical stage, which also halts with `reason: "target root missing: <path>"` when a root's `SKILL.md` cannot be read.
2. **Bundle-copy identity check, once per root** (skip entirely when `Target dir:` was provided): for each root run `diff -rq <root> plugins/dev-workflow-bundle/<root-basename-path>` — `skills/dev-workflow` → `plugins/dev-workflow-bundle/skills/dev-workflow`, `skills/mobpro` → `plugins/dev-workflow-bundle/skills/mobpro`.
   - Identical (empty output, zero exit) → this root contributes `identical`, and the Layer 1 summary notes its findings apply to both trees.
   - Drift (non-empty output) → the canonical lint still runs in full for that root; it contributes `drift` and one Layer 1 warning line: `bundle copy drift detected in <root> — sync verification delegated to verify-bundle-sync`. The bundle copy is not linted a second time.
   - Non-zero exit with empty output → tool failure; halt with the error response (`reason: "diff failed"`).
   - **Aggregate to the single `bundle_copy` verdict field**: `"identical"` only when every root was identical; `"drift"` when any root drifted (the per-root detail lives in the Layer 1 warning lines).
3. **Run the mechanical stage**: `node "<skill base directory>/scripts/lint.mjs" [--target-dir <path>] [--base-commit <sha>]`, where `<skill base directory>` is the directory the harness reports as "Base directory for this skill" at this skill's invocation — the same mechanism `dev-workflow` uses to run its bundled `scripts/plan-review/serve.mjs`. **Do not hardcode an absolute path.** The script prints one JSON object on stdout: the § Return contract's Layer 2 fields (minus `bundle_copy`) plus a `judgment_payload` carrying the class (c) residue and the manifest rows.
   - The script itself emits `status: "error"` for the failures it can detect — a missing target root, a lint target with no `references/*.md`, an unreadable target file, an unrecognized argument, an unresolvable `--base-commit`. Pass its `reason` through unchanged.
   - **`node` unavailable, or the script exits non-zero with no parseable JSON** → emit the error response with `reason: "node unavailable"` / `reason: "lint script failed"`. There is deliberately **no** fallback that re-derives the mechanical stage by judgment.
4. **Dispatch the judgment subagent** (Agent tool, subagent_type: `general-purpose`, `model: sonnet`). Skip the dispatch entirely when `judgment_payload` holds no manifest rows and no class (c) residue — nothing was owed to judgment, so Process step 5 renders the script's verdict unchanged and appends **no** `judgment-failed` warning. Assemble the prompt from these sections, each framed with a `--- LABEL ---` fence:
   - `--- TARGET ROOTS ---`: one line per root — `<root path>` followed by its identifier pattern (verbatim from § Target roots). The name authority is not sent.
   - `--- CHECK RULES ---`: the full content of `references/check-rules.md`.
   - `--- JUDGMENT PAYLOAD ---`: the `judgment_payload` object verbatim.
   - `--- EXECUTOR PROMPT ---`: the § Executor prompt below, verbatim.
5. **Merge & render** — the script's verdict is authoritative for `status`, `violation_entries`, and `checked`; the judgment stage only appends warnings. Evaluate its return in order, first match wins (same evaluate-in-order discipline as `verify-diff` § (b) Parse & apply, restricted to the cases that apply to a single-pass dispatch):
   1. **Verdict missing or malformed** — no fenced JSON block in the subagent response, or JSON parse fails → append one `judgment-failed` warning (`detail`: `judgment stage returned no parseable verdict — classes (b) / (d) / (c) not judged`) and render. Do **not** convert this into `status: "error"`.
   2. **Schema violation** — `warning_entries` missing or not an array, or any entry missing a non-empty string `class` / `file` / `detail` or carrying a `class` outside the § Executor prompt's enum → same disposition as above, with `detail` naming the schema violation instead.
   3. **Otherwise** — append its `warning_entries` to the script's.
   Then render the two-layer Return contract, merging in the step 2 `bundle_copy` result (neither executor computes it) and dropping `judgment_payload`.

**`Agent` unavailable fallback**: detection and fallback follow the canonical write-up in `rules-review` SKILL.md § 5. Review (the "Fallback path" bullet and the "Detect availability by inspecting the current tool surface" paragraph). verify-skill-refs specialization: availability has **two independent axes** — `node` gates the mechanical stage (step 3, no fallback), and `Agent` gates only the judgment stage. On an `Agent` fallback the script still runs; perform the judgment stage's three checks inline in the main thread from the same `judgment_payload` and emit the same two-layer Return contract, so callers parse identically on both paths.

## Executor prompt

Include the following verbatim in the dispatch payload:

> You are a bias-free lint judge. You have **not** seen prior conversation context — only the TARGET ROOTS, CHECK RULES, JUDGMENT PAYLOAD, and this prompt. The mechanical stage has already run: extraction, reference resolution, and both status-affecting classes are settled and are **not** yours to revisit. Execute only the CHECK RULES' § Executor pipeline "Judgment stage" — classes (b) and (d) from the manifest rows in the payload, and the class (c) residue against § Class (c)'s "Allowed forms" closed list. Everything you report is a warning; you cannot change the run's status.
>
> Do the work **yourself, in this agent** — do not spawn a nested subagent (`Agent` tool) and do not dispatch any `Skill()`. Re-delegation is an observed failure mode: the executor stops to wait on its child and returns no verdict, which the caller then treats as a parse failure.
>
> Use the **Grep tool** (ripgrep-class, environment-invariant) when you need to locate a manifest site — or `rg` via Bash when the Grep tool is not exposed in your tool surface (same ripgrep engine). Never use Bash `grep` (its flavor varies across environments: BSD / GNU / ugrep, with incompatible word-boundary syntax). Read only the specific regions a judgment needs — never the target files end-to-end.
>
> Write a brief reasoning summary (one line per finding), then end your response with a single fenced JSON block matching this schema:
>
> ```json
> {
>   "warning_entries": [{"class": "b" | "c" | "d" | "stale-manifest", "file": "<repo-relative path>", "detail": "<one line>"}]
> }
> ```
>
> Return an empty array when nothing diverges, no site is missing from its enumeration, and every class (c) residue entry turns out to match an allowed form. If a check could not be run at all — no ripgrep-class search is exposed in your tool surface — omit the fenced block instead, so the caller records `judgment-failed` rather than reading an empty array as an all-clear.

## Return contract

The skill emits its result in **two layers** in a single response.

**Layer 1 — Prose summary** (first, at the top of the response):

```
Status: SUCCESS | TEST_FAILED | EXECUTION_ERROR

<one-paragraph summary: the roots linted, file count, per-class finding counts, bundle-copy note (per-root when any root drifted), and any not-applicable class — class (c) whenever no `--base-commit` was given, plus classes (c) and (e) under a `Target dir:` override whose root matches neither identifier shape>
<if TEST_FAILED: one line per violation (class, file, reference or literal, why)>
<warnings grouped by class, one line each — present regardless of status>
<if EXECUTION_ERROR: reason and which step failed>
```

**Layer 2 — Fenced JSON verdict** (last, at the end of the response): the mechanical stage's verdict with the judgment stage's warnings appended and the main-thread `bundle_copy` merged in, per Process step 5.

```json
{
  "status": "ok" | "violations" | "error",
  "violation_entries": [{"class": "a" | "e", "file": "<repo-relative path>", "detail": "<the reference or literal + why it fails>"}],
  "warning_entries": [{"class": "a-demoted" | "b" | "c" | "d" | "e-demoted" | "scope-narrowed" | "stale-manifest" | "judgment-failed", "file": "<repo-relative path>", "detail": "<one line>"}],
  "checked": {"roots": 0, "files": 0, "refs_extracted": 0, "refs_unresolved": 0, "manifest_pairs": 0, "step_candidates": 0, "output_literals": 0},
  "bundle_copy": "identical" | "drift" | "skipped",
  "reason": "<required when status=error, else omit>"
}
```

`status` is `"violations"` iff `violation_entries` is non-empty, `"error"` only for infrastructure or wiring failures (a missing target root, a lint target with no `references/*.md`, an unreadable target file, an unrecognized argument, an unresolvable `--base-commit`, `node` unavailable, or a failed `diff`), else `"ok"`. Warnings never change `status`.

**Which fields are deterministic** — the contract a caller can build a pass/fail gate on: `status`, `violation_entries`, every `checked` count, and the `a-demoted` / `e-demoted` / `scope-narrowed` warnings all come from `scripts/lint.mjs` and are byte-identical across repeated runs of one tree. The `b` / `c` / `d` warnings come from the judgment stage and may vary between runs; they are diagnostic signal, not gate input. **`stale-manifest` is emitted by both stages** (the script for an unreadable rules file or an allowlist entry matching nothing, the judgment stage for a manifest anchor that no longer resolves), so it is not in the deterministic set. `judgment-failed` marks a run where even that signal is absent.

Mapping between the prose status token and the JSON `status` field:

| Prose `Status:` | JSON `status` |
| --- | --- |
| `SUCCESS` | `ok` |
| `TEST_FAILED` | `violations` |
| `EXECUTION_ERROR` | `error` |

**`checked` counters** — which population each counts. The rules the script applies live in `references/check-rules.md`.

| Counter | Counts |
| --- | --- |
| `roots` / `files` | Roots linted, and target files across them. A sibling root loaded only so that references naming it resolve is in neither. |
| `refs_extracted` | Class (a) candidates surviving the fence filter and the template exclusions — including ones later found to be out of scope. |
| `refs_unresolved` | Of those, the ones that resolved nowhere in scope. Each becomes either a violation or an `a-demoted` warning, so this exceeds `violation_entries` whenever a demotion cause applied. |
| `manifest_pairs` | Class (b) plus class (d) manifest rows handed to the judgment stage. Rows are selected by the linted roots only. |
| `step_candidates` | Class (c) identifier matches inside the diff scope, before the allowed-form filter. `0` when no `--base-commit` was given, and for a target outside the repository (no diff applies to it). |
| `output_literals` | Class (e) candidates extracted, before the identifier and authority-name tests. |

- `bundle_copy`: set by the main thread from Process step 2 (`"skipped"` under a `Target dir:` override). Omitted on `status: "error"`; an error verdict (a Process step 2 halt, or a step 3 script failure) carries empty `violation_entries` / `warning_entries` and a zeroed `checked`. A judgment-stage failure is **not** an error verdict — see Process step 5.
- `reason`: required on `status: "error"`. Short, ≤ 80 characters.
