---
name: rules-review
description: "Check code changes for .claude/rules/ compliance. Use this skill when you need to verify that code changes follow project coding rules, whether as part of dev-workflow or standalone. Triggers on: rule compliance check, rules review, verify conventions, check coding standards. Best suited for hard rules (naming, imports, placement, explicit prohibitions); intent-style rules are checked on a best-effort basis."
allowed-tools: Read, Glob, Agent, Bash(git diff *), Bash(git rev-parse *)
---

# Rules Review

Check code changes for compliance with `.claude/rules/` rule files.

## Usage

```text
/rules-review --base-commit <sha>    # Check diff from specified commit
/rules-review                        # Check diff from HEAD~1
```

## Processing Flow

### 1. Prepare

1. Parse `--base-commit <sha>` from `$ARGUMENTS`. If not provided, use `git rev-parse HEAD~1`
2. Get changed files: `git diff --name-only <base-commit>`
3. If no changed files, output `No changed files` as the final result and exit the skill (no further steps)

### 2. Collect Rules

1. Find rule files: `Glob(".claude/rules/**/*.md")`
2. Exclude `*.examples.md` from the check targets (they are reference material, not enforceable rules)
3. If no rule files found, output `No rule files found in .claude/rules/` as the final result and exit the skill

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
- Split a category by family only when it contains more than 3 rule files, so each sub-group stays ≤ 3 files. Never split a family across groups.
- Never merge across categories, even if each category has only 1 rule file.
- Discard empty groups.

If no rules matched any changed files, output `No applicable rules for changed files` as the final result and exit the skill.

### 5. Review

Prefer parallel execution: launch one reviewer Agent per group in a single message containing multiple Agent tool calls.

Detecting Agent availability: the `Agent` tool is considered **unavailable** when its schema is not exposed in the current session's tool list (neither as a top-level tool nor via `ToolSearch`). Do not attempt a speculative call to detect availability — inspect the tool list directly.

Fallback when Agent is unavailable (e.g., this skill is itself running inside a sub-agent that cannot recurse): execute the same reviewer prompt **inline sequentially** for each group — Claude itself acts as the reviewer, reading the embedded rules/examples/diff and producing the reviewer report in a single message per group. Do not substitute `claude -p` or external CLIs; the inline path is the defined fallback. Collect results identically in both paths.

Each reviewer (Agent or inline) receives the following prompt:

```
You are a rules compliance reviewer. Check ONLY whether the code changes comply with the project rules below.
Do NOT report general code quality, bugs, or design issues — only check what is explicitly stated in the rules.

**Scope**: only the lines added or modified in the diff are in-scope. Pre-existing patterns elsewhere in the file that already match or violate a rule are out-of-scope unless the rule text itself explicitly demands file-wide / project-wide consistency (look for phrases like "across the file", "project-wide", "every occurrence", or equivalent).

**Cross-file scope**: when a rule's text does not restrict its scope to a single file (i.e., contains no "in this file", "within this file", or equivalent limiting phrase), apply it across all changed files in the diff — including cross-file references, imports, and shared contracts between changed files (for skill development: cross-references between SKILL.md files, callee/orchestrator return-contract wording, references/*.md inter-file citations). Apply this cross-file expansion in cycle 1 — deferring cross-file rule application to a later cycle is a defect, not expected behavior.

**Same-rule complete enumeration in cycle 1**: when a rule fires at one location in the diff, actively sweep the **full diff** for additional same-rule violations rather than reporting only the first instance encountered. For rules whose violations cluster around a shared identifier, anchor, naming token, or cross-reference shape (renaming residue, deprecated import names, stale API references, anchor / cross-ref form requirements — for skill development this includes step / heading anchor stability, callee-name references, bundled rule citations), grep the diff for the violation's defining token (the renamed identifier, the rule-mandated anchor form, the deprecated name) and emit a separate report entry for every match — partial enumeration across cycles is a defect of the same shape as deferring cross-file expansion above, and turns what should be one repair pass into multiple round-trips through the caller's iteration budget.

**Existing-baseline judgment**: when the new diff follows the same pattern as a heavily-used existing baseline, judge the new addition against the rule on its own merits — do not let the existing baseline either excuse or condemn the new lines unless the rule's own scope clause says so.

Rules may include hard rules (binary compliance) and intent rules (judgment-based). Evaluate both. For intent-rule cases where your judgment is low-confidence (borderline compliant / unclear intent), report them in the violation list as findings with an explicit "low-confidence" marker rather than silently returning the no-violation string — the exact "No rule violations found" response is reserved for cases where you are confident no violations exist.

**Rule-doc drift classification**: if the code is consistent with its behavior across multiple locations in the diff and in the surrounding codebase, while the rule's text describes a *different* behavior — and the code pattern appears to be intentionally established (not an oversight) — classify the finding as **`rule-doc-drift`** rather than a code violation. Indicators (supporting signals — use judgment, not automatic trigger): (i) the same "non-compliant" pattern appears in 3+ call sites in the diff or in the broader file, all following the same shape; (ii) the rule's text cites an **external platform signal** (a documented platform threshold, a version-pinned default, a documented API behavior) and the diff updates the same signal to a different value, with surrounding code or companion docs aligning to the new value; (iii) the rule's text cites a **numeric value / token / literal** that conflicts with the diff's new default for the same concept, and at least one additional signal suggests the referent has intentionally shifted (matching sibling defaults, companion-doc updates, or other changed call sites). When the evidence is limited to a sole new occurrence with no corroborating signal, prefer a code violation or explicitly mark the drift judgment as low-confidence rather than auto-classifying `rule-doc-drift`. For rule-doc-drift findings, set `Classification: rule-doc-drift` in the report entry and recommend routing to rule extraction (`Skill(extract-rules)`) rather than a code fix. Set the Suggested fix to the literal string `Route to extract-rules to update the rule document rather than fixing the code`. The caller decides whether to fix the code or update the rule. Do **not** automatically apply code changes for rule-doc-drift findings.

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
- When multiple rule files are embedded in one reviewer prompt, separate them with a `### <.claude/rules/... path>` sub-heading inside the `## Rules to Check` section.

For each reviewer:
- Set `description` to the group category name (e.g., "Review rules: frameworks") when using the Agent tool
- Embed the pre-captured diff output directly in the prompt text
- Embed the rule file contents and examples in the prompt text

### 6. Aggregate Results

1. Collect results from all reviewers (parallel Agents or inline iterations).
2. If all groups returned exactly `No rule violations found`:
   - Output: `No rule violations found` as the final result and exit the skill.
3. If violations were found:
   - Output the consolidated violation list, organized by rule file.
   - Format each violation clearly with all fields (rule file, violated rule, location, description, fix suggestion, confidence).
   - Keep `low-confidence` findings in the list with their marker preserved — do not drop them.
4. Edge cases:
   - If a reviewer returns an empty response or a response that does not match either `No rule violations found` or the violation format, retry that group once. If it fails again, include a synthetic entry in the final output under the group name with `Rule file: (review failed)`, `Description: reviewer returned unparseable output`, and continue aggregation for other groups.
   - If a reviewer returns only `low-confidence` findings (no high-confidence violations), still emit the violation list — do not substitute `No rule violations found`.

## Output Format

### When compliant

```
No rule violations found
```

> **Scope note**: This check covers only rules documented under `.claude/rules/`. Project-specific vocabulary, naming, or style conventions that have not yet been written into a rules file are out of scope — if such an unwritten convention may apply to the changed code, verify manually or run `Skill(extract-rules)` to capture the pattern as a rule. The literal output stays exactly `No rule violations found` (no extra lines) so callers that match on that string (see `§ 6. Aggregate Results`) keep working.

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
