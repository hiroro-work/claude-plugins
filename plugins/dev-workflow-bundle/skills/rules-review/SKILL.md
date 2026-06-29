---
name: rules-review
description: "Check code changes for .claude/rules/ compliance. Use this skill when you need to verify that code changes follow project coding rules, whether as part of dev-workflow or standalone. Triggers on: rule compliance check, rules review, verify conventions, check coding standards. Best suited for hard rules (naming, imports, placement, explicit prohibitions); intent-style rules are checked on a best-effort basis."
effort: medium
allowed-tools: Read, Glob, Agent, Bash(git diff *), Bash(git rev-parse *)
---

# Rules Review

Check code changes for compliance with `.claude/rules/` rule files.

## Usage

```text
/rules-review --base-commit <sha>    # Check diff from specified commit
/rules-review                        # Check diff from HEAD~1
```

An optional `Model:` value (`sonnet` / `opus` / `haiku`) may also be passed as a natural-language argument — an independent optional field (not part of a fixed-arity mode gate). When present and valid it is applied as the `model` parameter on each reviewer `Agent` dispatch in §5 (a caller such as `dev-workflow` uses this to run the review on a cheaper model). When absent, the reviewer `Agent` inherits the session model (backward-compatible default). `Model:` is **only effective on the Claude Code `Agent`-dispatch path**; on the inline / Codex fallback path no `Agent` is spawned, so the value is moot (the executing agent's own model governs).

## Processing Flow

### 1. Prepare

1. Parse `--base-commit <sha>` from `$ARGUMENTS`. If not provided, use `git rev-parse HEAD~1`. Also parse the optional `Model:` value (`sonnet` / `opus` / `haiku`) from `$ARGUMENTS` (see § Usage); hold it for §5's reviewer `Agent` dispatch. Absent or invalid → no model override (inherit)
2. Get changed files: `git diff --name-only <base-commit>`
3. If no changed files, output `No changed files` as the final prose result, then emit the verdict per `## Return contract` and end the processing flow (no further processing steps)

### 2. Collect Rules

1. Find rule files: `Glob(".claude/rules/**/*.md")`
2. Exclude `*.examples.md` from the check targets (they are reference material, not enforceable rules)
3. If no rule files found, output `No rule files found in .claude/rules/` as the final prose result, then emit the verdict per `## Return contract` and end the processing flow

### 3. Match Rules to Changed Files

For each rule file:

1. Read the file and parse YAML front-matter for `paths:` globs
2. If `paths:` exists: match each glob against the changed file list. If at least one changed file matches, include this rule
3. If `paths:` does not exist (e.g., `project.md`): apply to all changed files
4. Record which changed files each rule applies to

### 4. Group Rules by Category

Group matched rules into categories based on their directory path:

- **project**: Files directly under `.claude/rules/` (e.g., `project.md`, `project.local.md`)
- **{subdirectory}**: Files under `.claude/rules/{subdirectory}/` (e.g., `languages`, `frameworks`, `integrations`, or any custom directory)

Within a category, group related rules by filename prefix into families (e.g., `rails.md`, `rails-controllers.md`, `rails-models.md` = one family). Keep related rules together for consistent judgment.

Grouping policy (deterministic):
- Default: 1 group per category (one Agent per category).
- Split a category by family only when it contains more than 3 **matched** rule files (rules with ≥ 1 matching changed file per Step 3 (Match Rules to Changed Files); rules that matched nothing are already discarded per the "Discard empty groups" bullet below and do not count toward this threshold), so each sub-group stays ≤ 3 files. Never split a family across groups.
- Never merge across categories, even if each category has only 1 rule file.
- Discard empty groups.

If no rules matched any changed files, output `No applicable rules for changed files` as the final prose result, then emit the verdict per `## Return contract` and end the processing flow.

### 5. Review

Prefer parallel execution: launch one reviewer per group through the current host's reviewer-dispatch mechanism.

Host-aware dispatch:

- **Claude Code path**: when the `Agent` tool is exposed and nested dispatch is not blocked, launch one reviewer `Agent` per group — passing the parsed `Model:` value (§1) as the `Agent` `model` parameter when present, omitting it when absent (inherit).
- **Codex path**: when Codex exposes a subagent / delegation mechanism in the current session, launch one reviewer per group through that mechanism.
- **Fallback path**: when no host-provided reviewer dispatch is available — the `Agent` tool is absent from the tool surface, or the host indicates before dispatch that reviewer dispatch cannot recurse — execute the same reviewer prompt **inline sequentially** for each group. Being invoked as a sub-skill (e.g. via `Skill()` on the main thread) does **not** by itself trigger this path: decide by whether `Agent` is exposed and callable, not by invocation lineage — if it is, take the Claude Code path. The current agent acts as the reviewer, reading the embedded rules/examples/diff and producing the reviewer report in the same format.

Detect availability by inspecting the current tool surface. Do not attempt speculative tool calls just to probe availability. Do not substitute `claude -p`, `codex`, or other external CLIs; the inline path is the defined fallback. Collect results identically in all paths.

Each reviewer (dispatched or inline) receives the following prompt:

```
You are a rules compliance reviewer. Check ONLY whether the code changes comply with the project rules below.
Do NOT report general code quality, bugs, or design issues — only check what is explicitly stated in the rules.

**Scope**: only the lines added or modified in the diff are in-scope. Pre-existing patterns elsewhere in the file that already match or violate a rule are out-of-scope unless the rule text itself explicitly demands file-wide / project-wide consistency (look for phrases like "across the file", "project-wide", "every occurrence", or equivalent).

**Cross-file scope**: when a rule's text does not restrict its scope to a single file (i.e., contains no "in this file", "within this file", or equivalent limiting phrase), apply it across all changed files in the diff — including cross-file references, imports, and shared contracts between changed files (for skill development: cross-references between SKILL.md files, callee/orchestrator return-contract wording, references/*.md inter-file citations). Apply this cross-file expansion in cycle 1 — deferring cross-file rule application to a later cycle is a defect, not expected behavior.

**Same-rule complete enumeration in cycle 1**: when a rule fires at one location in the diff, actively sweep the **full diff** for additional same-rule violations rather than reporting only the first instance encountered. For rules whose violations cluster around a shared identifier, anchor, naming token, or cross-reference shape (renaming residue, deprecated import names, stale API references, anchor / cross-ref form requirements — for skill development this includes step / heading anchor stability, callee-name references, bundled rule citations), grep the diff for the violation's defining token (the renamed identifier, the rule-mandated anchor form, the deprecated name) and emit a separate report entry for every match — partial enumeration across cycles is a defect of the same shape as deferring cross-file expansion above, and turns what should be one repair pass into multiple round-trips through the caller's iteration budget.

**Existing-baseline judgment**: when the new diff follows the same pattern as a heavily-used existing baseline, judge the new addition against the rule on its own merits — do not let the existing baseline either excuse or condemn the new lines unless the rule's own scope clause says so.

Rules may include hard rules (binary compliance) and intent rules (judgment-based). Evaluate both. For intent-rule cases where your judgment is low-confidence (borderline compliant / unclear intent), report them in the violation list as findings with an explicit "low-confidence" marker rather than silently returning the no-violation string — the exact "No rule violations found" response is reserved for cases where you are confident no violations exist.

For low-confidence intent-rule findings, include a constructive resolution direction in `Suggested fix` — describe the typical relocation pattern rather than a bare flag: preserve the rationale by moving it to a more appropriate surface rather than deleting it outright. For a comment-minimization rule this means moving the "why" explanation into accompanying documentation while keeping the code itself comment-free; for other intent-style rules, identify whether the intent can be satisfied by relocating the flagged content rather than simply removing it.

**Rule-doc drift classification**: if the code is consistent with its behavior across multiple locations in the diff and in the surrounding codebase, while the rule's text describes a *different* behavior — and the code pattern appears to be intentionally established (not an oversight) — classify the finding as **`rule-doc-drift`** rather than a code violation. Indicators (supporting signals — use judgment, not automatic trigger): (i) the same "non-compliant" pattern appears in 3+ call sites in the diff or in the broader file, all following the same shape; (ii) the rule's text cites an **external platform signal** (a documented platform threshold, a version-pinned default, a documented API behavior) and the diff updates the same signal to a different value, with surrounding code or companion docs aligning to the new value; (iii) the rule's text cites a **numeric value / token / literal** that conflicts with the diff's new default for the same concept, and at least one additional signal suggests the referent has intentionally shifted (matching sibling defaults, companion-doc updates, or other changed call sites). When the evidence is limited to a sole new occurrence with no corroborating signal, prefer a code violation or explicitly mark the drift judgment as low-confidence rather than auto-classifying `rule-doc-drift`. For rule-doc-drift findings, set `Classification: rule-doc-drift` in the report entry and recommend routing to rule extraction (`Skill(extract-rules)`) rather than a code fix. Set the Suggested fix to the literal string `Route to extract-rules to update the rule document rather than fixing the code`. The caller decides whether to fix the code or update the rule. Do **not** automatically apply code changes for rule-doc-drift findings.

**Group-exception membership verification**: when a rule includes an exception clause conditioned on the target being a member of a named group — for example, "references to siblings within the same bundle are permitted", "intra-package cross-imports are allowed", or "calls between services in the same module do not require a contract change" — verify actual group membership from the authoritative source (the distribution manifest, package declaration, module registry, or equivalent official membership list) before applying the exception. Apparent co-location in the same repository, directory, or naming domain is insufficient: a component may reside alongside the group without being a declared member. When actual membership cannot be confirmed, treat the exception as inapplicable and report the reference as a violation (for skill development: before applying the "intra-bundle sibling" exception to a cross-skill reference, confirm the referenced skill is listed in the bundle's `skills` array in `.claude-plugin/marketplace.json` — co-location under the same repository does not imply bundle membership).

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
- **Suggested fix**: <specific fix to become compliant; for `rule-doc-drift` findings, write "Route to extract-rules to update the rule document rather than fixing the code">
- **Confidence**: `high` for hard-rule violations; `low-confidence` for intent-rule borderline findings (see note above).
- **Classification**: `code-violation` (default, omit for brevity) | `rule-doc-drift` (only when the finding meets the rule-doc-drift criteria above)

When the same rule line is violated at multiple locations or by multiple sub-rules, emit **one entry per (location, sub-rule)** pair — do not collapse them into a single entry. This keeps fixes actionable.

If no violations are found, respond with exactly: "No rule violations found"
```

Before launching reviewers, **prepare the data to embed in each prompt** (do NOT rely on reviewers running git commands themselves):
- For each group, run `git diff <base-commit> -- <matched-files>` using the **union of files matched by any rule in that group** (so each reviewer sees every file it is responsible for, and the same file may appear in diffs for multiple groups if multiple rules match it).
- For each rule file, check if a corresponding `.examples.md` exists (same basename, e.g., `rails-controllers.md` → `rails-controllers.examples.md`) and read its content.
- If no `.examples.md` exists for any rule in the group, omit the `## Reference: Code Examples` section entirely from that reviewer prompt (do not write a placeholder line like `(no examples file)`).
- **Resolve pointer rules before embedding**: if a matched rule file carries no inline enforceable rule text and instead defers its substance to a document outside the scanned tree via a reference link (an `@<path>` include, or a markdown link to a doc outside `.claude/rules/`), resolve that reference and `Read` the target so the embedded `## Rules to Check` content is the actual rule text — embedding the bare pointer would make the reviewer judge against empty rules and return `No rule violations found` even when the referenced rule is violated. If the reference cannot be resolved (target missing, or outside readable scope), do **not** embed an empty stub: drop the rule from the group and record it as an explicit coverage gap per § 6. Aggregate Results, so an unread rule is never silently reported as compliant.
- When multiple rule files are embedded in one reviewer prompt, separate them with a `### <.claude/rules/... path>` sub-heading inside the `## Rules to Check` section.

For each reviewer:
- Set the reviewer description / task label to the group category name (e.g., "Review rules: frameworks") when the dispatch mechanism supports a label field
- Embed the pre-captured diff output directly in the prompt text
- Embed the rule file contents and examples in the prompt text

### 6. Aggregate Results

1. Collect results from all reviewers (parallel Agents or inline iterations).
2. If all groups returned exactly `No rule violations found` **and no synthetic non-evaluation entries (`(review failed)` / `(rule not evaluated — ...)` coverage gaps) were added in step 4**:
   - Output: `No rule violations found` as the final prose result, then emit the verdict per `## Return contract` and end the processing flow.
   - A single synthetic entry blocks this all-clean branch (fall through to step 3, which renders the consolidated list so the coverage gap / review failure surfaces loudly). This § 6 prose split is the authority for the clean-vs-not decision; the `## Return contract` status mapping reads the **same** consolidated list and stays consistent with it.
3. If violations were found:
   - Output the consolidated violation list, organized by rule file.
   - Format each violation clearly with all fields (rule file, violated rule, location, description, fix suggestion, confidence).
   - Keep `low-confidence` findings in the list with their marker preserved — do not drop them.
4. Edge cases:
   - If a reviewer returns an empty response or a response that does not match either `No rule violations found` or the violation format, retry that group once. If it fails again, include a synthetic entry in the final output under the group name with `Rule file: (review failed)`, `Description: reviewer returned unparseable output`, and continue aggregation for other groups.
   - If a rule was dropped during data prep because it is an unresolvable pointer (see § 5's **Resolve pointer rules before embedding** bullet), include a synthetic entry in the final output with `Rule file: (rule not evaluated — unresolved pointer to <ref>)` and `Description: rule body deferred to an out-of-tree document that could not be resolved; left unevaluated rather than reported clean`. These coverage-gap entries are treated the same as `(review failed)` synthetic entries for the verdict (see `## Return contract`) — they surface loudly instead of letting an unread rule pass silently as `No rule violations found`.
   - If a reviewer returns only `low-confidence` findings (no high-confidence violations), still emit the violation list — do not substitute `No rule violations found`.

## Output Format

### When compliant

```
No rule violations found
```

> **Scope note**: This check covers only rules documented under `.claude/rules/`. Project-specific vocabulary, naming, or style conventions that have not yet been written into a rules file are out of scope — if such an unwritten convention may apply to the changed code, verify manually or run `Skill(extract-rules)` to capture the pattern as a rule. The prose line stays exactly `No rule violations found` so callers that substring-match on that string (see `§ 6. Aggregate Results`) keep working; a single fenced JSON verdict block (see `## Return contract`) follows it as the additive structured return value.

### When violations found

```
## Rules Compliance Violations

### .claude/rules/frameworks/rails-controllers.md

- **Violated rule**: <rule text, quoted verbatim>
- **Location**: app/controllers/users_controller.rb:15
- **Description**: <description; if quoting a bundled rule line, name the specific sub-rule>
- **Suggested fix**: <suggestion>
- **Confidence**: high

### .claude/rules/languages/ruby.md

- **Violated rule**: <rule text, quoted verbatim>
- **Location**: app/models/user.rb:42
- **Description**: <description>
- **Suggested fix**: <suggestion>
- **Confidence**: low-confidence
```

## Return contract

Emit a single fenced JSON block at the end of the response, matching the schema below. The block is **additive**: the `## Output Format` prose above is unchanged, and the verdict block is appended **after** it. Emit the verdict on **every** exit path — including the early exits in § 1. Prepare / § 2. Collect Rules / § 4. Group Rules by Category (those end the *processing flow*, not the response; the verdict block still follows). Only one fenced JSON block — the verdict block — appears in the response, so callers can locate it unambiguously.

```json
{
  "status": "no-issues|violations|error",
  "violations_count": 0,
  "reason": null
}
```

Status mapping (evaluate in order, first match wins):

- `no-issues` — no changed files (§ 1. Prepare), no rule files (§ 2. Collect Rules), no applicable rules (§ 4. Group Rules by Category), or all groups returned exactly `No rule violations found` **with no synthetic non-evaluation entries present** (the all-clean branch of § 6. Aggregate Results — a `(review failed)` or `(rule not evaluated — ...)` coverage-gap entry blocks this branch). `violations_count: 0`, `reason: null`.
- `error` — the review could not be produced: diff collection failed (§ 1. Prepare), matched rule files could not be read (§ 3. Match Rules to Changed Files), or the consolidated violation list in § 6. Aggregate Results is **non-empty yet holds no real finding** — it is entirely synthetic non-evaluation entries (`(review failed)` and/or `(rule not evaluated — ...)` coverage gaps), **including the case where some reviewer groups ran clean (contributing no list entry) while the only entries are synthetic**. `violations_count: 0`, `reason` = the matching closed-enum string below (per the reason-selection order). The § 6. Aggregate Results prose still renders those synthetic entries; the verdict status reflects that no rule was actually evaluated to a finding.
- `violations` — the consolidated violation list (§ 6. Aggregate Results) holds at least one real finding (`high` / `low-confidence` / `rule-doc-drift`), possibly mixed with `(review failed)` and/or `(rule not evaluated — ...)` coverage-gap synthetic entries. `violations_count` = total entries in that list. `reason: null`.

Field rules:

- `violations_count`: non-negative integer. Total entries in the consolidated violation list (§ 6. Aggregate Results) for `violations`; `0` for `no-issues` and `error`. (For `error` the count is `0` even when the list holds synthetic non-evaluation entries — `violations_count` is a real-finding count, not the list length. The `violations`-vs-`error` asymmetry, where `violations` counts synthetic entries mixed in with real findings while `error` reports `0`, is intentional: an `error` list by definition evaluated nothing to a finding.)
- `reason`: a closed-enum string only when `status == "error"`, otherwise JSON `null` — keep it to the enum tokens (no free-form text, newlines, or control characters) so the verdict stays mechanically parseable. **Reason selection (within `status == "error"`, evaluate in order, first match wins):** a `diff collection failed` / `rule loading failed` source first (mutually exclusive — they short-circuit before any reviewer is dispatched) → else `verdict parse failure` if the consolidated list holds ≥ 1 `(review failed)` entry → else `coverage gap only` (the synthetic entries are all coverage gaps). Closed enum:
  - `"diff collection failed"` — § 1. Prepare produced no usable changed-file list.
  - `"rule loading failed"` — matched rule files could not be read in § 3. Match Rules to Changed Files.
  - `"verdict parse failure"` — the consolidated list holds ≥ 1 `(review failed)` entry (a reviewer group returned unparseable output even after the retry) and no real finding, so the verdict is `error` rather than `violations` (the list may also carry coverage-gap entries and clean groups that contributed no entry). A `(review failed)` group alongside a **real finding** from another group stays counted under `violations`, not `error`; a clean (no-finding) sibling group does not — then the list has no real finding and the verdict is `error`.
  - `"coverage gap only"` — the consolidated list's synthetic entries are **all** `(rule not evaluated — ...)` coverage gaps from unresolvable pointers (§ 5's **Resolve pointer rules before embedding** bullet) — no `(review failed)` entries — and the list holds no real finding (any reviewer groups that ran returned clean and contributed no entry, or no group ran at all). Use this token when the `error` arises solely from dropped pointer rules rather than from a diff / rule-load failure or unparseable reviewer output.

## Sub-skill caller directive

When invoked as a sub-skill (i.e. via `Skill(rules-review)` from an orchestrator), the fenced JSON verdict block this skill emits is the **structured return value** of the skill's procedure — it is **not** a deliverable to the user, and emitting it does **not** terminate the orchestrator's turn. The same agent that ran this skill must immediately issue the next tool call dictated by the orchestrator's flow (see the orchestrator's `§ No-Stall Principle`; orchestrators that surface a per-callee guidance bullet name the specific next action there). Do not insert a prose summary, an acknowledgment, or a "shall I proceed?" sentence between the JSON verdict and the next tool call. The JSON verdict block and the next tool call MUST be emitted in the same assistant turn. Closing the turn after emitting the JSON block — even with no prose between them — is the same violation as inserting prose. Only one fenced JSON block — the verdict block — appears in the response, so callers can locate it unambiguously. The skill's own procedure is over; the orchestrator's procedure continues without pause.
