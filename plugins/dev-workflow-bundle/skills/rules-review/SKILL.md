---
name: rules-review
description: "Check code changes for .claude/rules/ compliance. Use this skill when you need to verify that code changes follow project coding rules, whether as part of dev-workflow or standalone. Triggers on: rule compliance check, rules review, verify conventions, check coding standards. Best suited for hard rules (naming, imports, placement, explicit prohibitions); intent-style rules are checked on a best-effort basis."
effort: medium
allowed-tools: Read, Glob, Agent, Bash(git diff *), Bash(git rev-parse *)
---

# Rules Review

## Usage

```text
/rules-review --base-commit <sha>    # Check diff from specified commit
/rules-review                        # Check diff from HEAD~1
```

Two optional values may also be passed as natural-language arguments. Each is an **independent optional field**, not part of a fixed-arity mode gate.

- `Model:` — one of the model ids the current `Agent` tool's `model` parameter accepts (check the tool's live schema loaded in the current session). When present and valid it becomes the `model` parameter on each reviewer `Agent` dispatch in § 5. Review; absent or invalid, the reviewer inherits the session model. It is **only effective on the Claude Code `Agent`-dispatch path** — on the inline / Codex fallback path the executing agent's own model governs.
- `Files:` — a comma- or newline-separated list of repo-relative file paths. When present, § 1. Prepare narrows the changed-file set to its intersection with the diff's changed files, so the review covers only those; absent or invalid, all changed files are reviewed. An empty intersection fires § 1. Prepare's `No changed files` early exit (a loud `no-issues`), so an empty scope never silently passes.

## Dispatch authorization

This skill's procedure dispatches subagents, so invoking the skill **is** the request to use that mechanism: an ambient instruction allowing subagent dispatch only when the user asked for it — a **permission-shaped restriction** — is already satisfied by this invocation. Do not ask the user to re-confirm the dispatch, and do not silently substitute inline execution for a dispatch this procedure specifies. Only two things justify that substitution: **technical availability** (the dispatch tool is not present and callable on the current tool surface), and an **explicit contract term from the caller** bounding this skill to its own thread. A permission-shaped restriction is neither.

## Processing Flow

### 1. Prepare

1. Parse `--base-commit <sha>` from `$ARGUMENTS`; if not provided, use `git rev-parse HEAD~1`. Parse the optional `Model:` and `Files:` values per § Usage
2. Get changed files: `git diff --name-only <base-commit>`. When `Files:` was provided, narrow this set to its intersection with the parsed paths (repo-relative match). Every downstream step operates on this possibly-narrowed set
3. If no changed files, output `No changed files` as the final prose result, then emit the verdict per `## Return contract` and end the processing flow

### 2. Collect Rules

1. Find rule files: `Glob(".claude/rules/**/*.md")`. Also `Glob(".claude/rules-extras/**/*.examples.md")`
2. Exclude `*.examples.md` from the **check targets**. Keep them in step 1's path lists — § 5. Review's pre-split fallback reads the co-located ones from there
3. If the check targets are empty after step 2's exclusion — output `No rule files found in .claude/rules/` as the final prose result, then emit the verdict per `## Return contract` and end the processing flow

### 3. Match Rules to Changed Files

For each rule file:

1. Read the file and parse YAML front-matter for `paths:` globs
2. If `paths:` exists: match each glob against the changed file list. If at least one changed file matches, include this rule
3. If `paths:` does not exist (e.g., `project.md`): apply to all changed files
4. Record which changed files each rule applies to

### 4. Group Rules by Category

Group matched rules into categories based on their directory path:

- **project**: Files directly under `.claude/rules/` (e.g., `project.md`, `project.local.md`)
- **{subdirectory}**: Files under `.claude/rules/{subdirectory}/` (e.g., `languages`, `frameworks`, or any custom directory)

Within a category, group related rules by filename prefix into families (`rails.md`, `rails-controllers.md`, `rails-models.md` = one family).

Grouping policy (deterministic):
- Default: 1 group per category (one Agent per category).
- Split a category by family only when it contains more than 3 **matched** rule files, so each sub-group stays ≤ 3 files. Never split a family across groups.
- Never merge across categories, even if each category has only 1 rule file.
- Discard empty groups.

If no rules matched any changed files, output `No applicable rules for changed files` as the final prose result, then emit the verdict per `## Return contract` and end the processing flow.

### 5. Review

Launch one reviewer per group through the current host's reviewer-dispatch mechanism, in parallel where the host allows it:

- **Claude Code path**: when the `Agent` tool is exposed and callable and no caller-imposed nesting bound applies (see the **Fallback path** bullet), launch one reviewer `Agent` per group — passing the parsed `Model:` value (§ 1. Prepare) as the `Agent` `model` parameter when present, omitting it when absent (inherit).
- **Codex path**: when Codex exposes a subagent / delegation mechanism in the current session, launch one reviewer per group through that mechanism.
- **Fallback path**: when no host-provided reviewer dispatch is available — the `Agent` tool is absent from the tool surface (e.g. a nested subagent context), or the invoking request explicitly bounds this skill to its own thread (a caller-imposed nesting bound) — execute the same reviewer prompt **inline sequentially** for each group; the current agent acts as the reviewer, reading the embedded rules / examples / diff and producing the reviewer report in the same format. Decide by whether `Agent` is exposed and callable and whether such a bound applies, not by invocation lineage: being invoked as a sub-skill does not trigger this path, and neither does a permission-shaped restriction (see `§ Dispatch authorization`).

Detect availability by inspecting the current tool surface. Do not attempt speculative tool calls just to probe availability. Do not substitute `claude -p`, `codex`, or other external CLIs; the inline path is the defined fallback. Collect results identically in all paths.

**No stall after dispatch**: once the reviewer `Agent`s are launched (Claude Code path) or the subagent / delegation mechanism is invoked (Codex path), do not end the response with a status-only message such as "dispatched — will report when complete". Continue to § 6. Aggregate Results as soon as the dispatched reviewers' results are available in the same flow; a dispatch is not itself a stopping point.

**Scoped re-check note**: when `Files:` narrowed the changed-file set (§ 1. Prepare), append this sentence to the end of the reviewer prompt's `**Scope**` paragraph — `This review is scoped to a caller-specified subset of the changed files. If you suspect a change in these files has a rule-relevant ripple effect on files outside this subset, raise it as a finding.` Omit it when `Files:` was absent.

Each reviewer (dispatched or inline) receives the following prompt:

```
You are a rules compliance reviewer. Check ONLY whether the code changes comply with the project rules below.
Do NOT report general code quality, bugs, or design issues — only check what is explicitly stated in the rules.

**Scope**: only the lines added or modified in the diff are in-scope. Pre-existing patterns elsewhere in the file are out-of-scope unless the rule text itself demands file-wide / project-wide consistency ("across the file", "project-wide", "every occurrence", or equivalent).

**Cross-file scope**: when a rule's text does not restrict its scope to a single file (i.e., contains no "in this file", "within this file", or equivalent limiting phrase), apply it across all changed files in the diff — including cross-file references, imports, and shared contracts between changed files. Apply this expansion in cycle 1; deferring it to a later cycle is a defect.

**Same-rule complete enumeration in cycle 1**: when a rule fires at one location, sweep the **full diff** for further same-rule violations instead of reporting only the first. When the violations cluster around a shared identifier, anchor, naming token, or cross-reference shape, grep the diff for the violation's defining token and emit a separate entry for every match.

**Existing-baseline judgment**: when the new diff follows the same pattern as a heavily-used existing baseline, judge the new addition against the rule on its own merits — do not let the existing baseline either excuse or condemn the new lines unless the rule's own scope clause says so.

Rules may include hard rules (binary compliance) and intent rules (judgment-based). Evaluate both. Report a borderline intent-rule case in the violation list with the `low-confidence` marker; the exact "No rule violations found" response is reserved for cases where you are confident no violations exist.

For low-confidence intent-rule findings, make `Suggested fix` a resolution direction rather than a bare flag: check first whether the rule's intent is satisfied by relocating the flagged content to a more appropriate surface, and say where, instead of proposing deletion.

**Rule-doc drift classification**: when the code follows one behavior consistently across the diff and the surrounding codebase while the rule's text describes a different one, and the pattern looks intentionally established rather than an oversight, classify the finding as **`rule-doc-drift`** instead of a code violation. Supporting signals — judgment, not an automatic trigger: (i) the same "non-compliant" pattern at 3+ sites, all the same shape; (ii) the rule cites an **external platform signal** (a documented threshold, a version-pinned default, a documented API behavior) that the diff updates, with surrounding code or companion docs aligned to the new value; (iii) the rule cites a **numeric value / token / literal** conflicting with the diff's new default for the same concept, plus one further signal that the referent shifted intentionally. A sole new occurrence with no corroborating signal is a code violation. Report drift per `## Report Format`, with the Suggested fix set to the literal string `Route to extract-rules to update the rule document rather than fixing the code`. The caller decides whether to fix the code or update the rule; never apply a code change for one yourself.

**Group-exception membership verification**: when a rule's exception clause is conditioned on the target being a member of a named group — for example "references to siblings within the same bundle are permitted" — verify membership from the authoritative source (the distribution manifest, package declaration, module registry, or equivalent) before applying it. Co-location in the same repository, directory, or naming domain is not membership. When membership cannot be confirmed, treat the exception as inapplicable and report the reference as a violation.

**Reference/citation matching strictness**: judge a required quotation or citation of a stable heading, section title, or bold-prose label against whichever form the citing rule's own text or an established sibling convention documents as canonical, applying the same criteria on every review cycle for the same diff text. Report a citation as non-compliant only when it deviates from that documented form — never merely for using a permitted prefix / pair variant such as `§ <Heading>'s "<bold label>" paragraph`.

## Rules to Check

<Rule file contents with file paths>

## Reference: Code Examples

<Corresponding .examples.md content, if available>

## Diff to Review

<Scoped git diff for the matched files>

## Report Format

For each violation, report:
- **Rule file**: <.claude/rules/... path>
- **Violated rule**: Quote the rule line verbatim from the rule file. If the line bundles multiple sub-rules (e.g., items in parentheses like `型安全性 (any禁止, 明示的型注釈)`), quote the whole line as-is and name the specific sub-rule in Description.
- **Location**: <file:line>
- **Description**: <what violates the rule and why; if quoting a bundled line, name the specific sub-rule here>
- **Suggested fix**: <specific fix to become compliant; for `rule-doc-drift` findings, the literal string given in the rule-doc-drift paragraph above>
- **Confidence**: `high` for hard-rule violations; `low-confidence` for intent-rule borderline findings and for every `rule-doc-drift` finding.
- **Classification**: `code-violation` (default, omit for brevity) | `rule-doc-drift` (only when the finding meets the rule-doc-drift criteria above)

When the same rule line is violated at multiple locations or by multiple sub-rules, emit **one entry per (location, sub-rule)** pair — do not collapse them into a single entry.

If no violations are found, respond with exactly: "No rule violations found"
```

Before launching reviewers, **prepare the data to embed in each prompt** (do NOT rely on reviewers running git commands themselves). Reuse the rule file content § 3. Match Rules to Changed Files already read — do not `Read` a rule file a second time here:
- For each group, run `git diff <base-commit> -- <matched-files>` using the **union of files matched by any rule in that group**. The same file may appear in more than one group's diff.
- For each rule file, resolve its `.examples.md` out of the two path lists § 2. Collect Rules step 1 gathered — no new filesystem probe. Take the rule file's path relative to `.claude/rules/` and replace the trailing `.md` (and a `.local` before it, when present) with `.examples.md`: `languages/ruby.md` and `languages/ruby.local.md` both give `languages/ruby.examples.md`. Look for that sub-path under `.claude/rules-extras/`; when it is absent, fall back to it beside the rule file (pre-split layout). Read each resolved file once — a `.md` and its `.local.md` resolve to the same one. Source of truth: extract-rules' `examples_output_dir` default; keep in sync (also § 2. Collect Rules step 1's second glob).
- If no `.examples.md` exists for any rule in the group, omit the `## Reference: Code Examples` section entirely from that reviewer prompt (do not write a placeholder line like `(no examples file)`).
- **Resolve pointer rules before embedding**: if a matched rule file carries no inline enforceable rule text and instead defers its substance to a document outside the scanned tree via a reference link (an `@<path>` include, or a markdown link to a doc outside `.claude/rules/`), resolve that reference and `Read` the target so the embedded `## Rules to Check` content is the actual rule text. If the reference cannot be resolved (target missing, or outside readable scope), do **not** embed an empty stub: drop the rule from the group and record it as an explicit coverage gap per § 6. Aggregate Results.
- When multiple rule files are embedded in one reviewer prompt, separate them with a `### <.claude/rules/... path>` sub-heading inside the `## Rules to Check` section.

For each reviewer, set the description / task label to the group category name (e.g., "Review rules: frameworks") when the dispatch mechanism supports a label field, and embed the pre-captured diff, rule contents, and examples directly in the prompt text.

### 6. Aggregate Results

1. Collect results from all reviewers (parallel Agents or inline iterations).
2. Decide clean vs. not by the entry-class mapping in `## Return contract`. When the consolidated list is empty, output `No rule violations found` as the final prose result, then emit the verdict per `## Return contract` and end the processing flow. A single synthetic entry falls through to step 3, which renders the list so the coverage gap surfaces loudly.
3. If violations were found:
   - Output the consolidated violation list, organized by rule file.
   - Use the `## Report Format` field shape, keeping every `low-confidence` marker.
4. Edge cases:
   - If a reviewer returns an empty response or a response that does not match either `No rule violations found` or the violation format, retry that group once. If it fails again, include a synthetic entry in the final output under the group name with `Rule file: (review failed)`, `Description: reviewer returned unparseable output`, and continue aggregation for other groups.
   - A list holding only `low-confidence` findings still renders as a violation list; never substitute `No rule violations found` for it.
   - If a rule was dropped during data prep because it is an unresolvable pointer (see § 5's **Resolve pointer rules before embedding** bullet), include a synthetic entry in the final output with `Rule file: (rule not evaluated — unresolved pointer to <ref>)` and `Description: rule body deferred to an out-of-tree document that could not be resolved; left unevaluated rather than reported clean`. These coverage-gap entries are synthetic entries for the verdict (see `## Return contract`).

## Output Format

- **Compliant**: the prose result is exactly `No rule violations found`, and nothing else.
- **Violations found**: a `## Rules Compliance Violations` heading, then one `### <.claude/rules/... path>` sub-heading per rule file, with that file's entries beneath it in the `## Report Format` field shape.

## Return contract

Emit a single fenced JSON block at the end of the response, matching the schema below, after the `## Output Format` prose. Emit the verdict on **every** exit path — including the early exits in § 1. Prepare / § 2. Collect Rules / § 4. Group Rules by Category (those end the *processing flow*, not the response; the verdict block still follows). Only one fenced JSON block — the verdict block — appears in the response, so callers can locate it unambiguously.

```json
{
  "status": "no-issues|violations|error",
  "violations_count": 0,
  "reason": null
}
```

**Entry classes in the consolidated violation list (§ 6. Aggregate Results).** A **real finding** is an entry a reviewer produced under `## Report Format`, whatever its `Confidence` and `Classification`. A **synthetic entry** is one this skill added for a rule that was never evaluated: `(review failed)` or `(rule not evaluated — ...)`. A group that ran clean contributes no entry.

Status mapping (evaluate in order, first match wins):

- `violations` — the list holds ≥ 1 real finding, whatever else it holds. `violations_count` = total entries in the list, `reason: null`.
- `error` — the review could not be produced: diff collection failed (§ 1. Prepare), matched rule files could not be read (§ 3. Match Rules to Changed Files), or the list is non-empty with no real finding. `violations_count: 0`, `reason` = the enum token below.
- `no-issues` — everything else: no changed files (§ 1. Prepare), no rule files (§ 2. Collect Rules), no applicable rules (§ 4. Group Rules by Category), or an empty list. `violations_count: 0`, `reason: null`.

Field rules:

- `violations_count`: non-negative integer. Total entries in the consolidated list for `violations`; `0` for `no-issues` and for `error`, even when the `error` list holds synthetic entries.
- `reason`: a closed-enum string only when `status == "error"`, otherwise JSON `null`. No free-form text, newlines, or control characters, so the verdict stays mechanically parseable. Take the first that applies:
  - `"diff collection failed"` — § 1. Prepare produced no usable changed-file list.
  - `"rule loading failed"` — matched rule files could not be read in § 3. Match Rules to Changed Files.
  - `"verdict parse failure"` — a reviewer group returned unparseable output even after the retry, so the list holds ≥ 1 `(review failed)` entry.
  - `"coverage gap only"` — the list's synthetic entries are all coverage gaps from unresolvable pointers (§ 5's **Resolve pointer rules before embedding** bullet).

## Sub-skill caller directive

When invoked as a sub-skill (i.e. via `Skill(rules-review)` from an orchestrator), the fenced JSON verdict block this skill emits is the **structured return value** of the skill's procedure — it is **not** a deliverable to the user, and emitting it does **not** terminate the orchestrator's turn. The same agent that ran this skill must immediately issue the next tool call dictated by the orchestrator's flow. Do not insert a prose summary, an acknowledgment, or a "shall I proceed?" sentence between the JSON verdict and the next tool call. Only one fenced JSON block — the verdict block — appears in the response, so callers can locate it unambiguously. The skill's own procedure is over; the orchestrator's procedure continues without pause.
