---
name: rules-review
description: "Check code changes for .claude/rules/ compliance. Use this skill when you need to verify that code changes follow project coding rules, whether as part of dev-workflow or standalone. Triggers on: rule compliance check, rules review, verify conventions, check coding standards."
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
3. If no changed files, output "No changed files" and stop

### 2. Collect Rules

1. Find rule files: `Glob(".claude/rules/**/*.md")`
2. Exclude `*.examples.md` from the check targets (they are reference material, not enforceable rules)
3. If no rule files found, output "No rule files found in .claude/rules/" and stop

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

Discard empty groups. If a group is too large for a single agent, split by family. If groups are small enough, merge into a single group.

If no rules matched any changed files, output "No applicable rules for changed files" and stop.

### 5. Parallel Review

Launch one Agent per group **in parallel** (use a single message with multiple Agent tool calls).

Each Agent receives the following prompt:

```
You are a rules compliance reviewer. Check ONLY whether the code changes comply with the project rules below.
Do NOT report general code quality, bugs, or design issues — only check what is explicitly stated in the rules.

## Rules to Check

<Rule file contents with file paths>

## Reference: Code Examples

<Corresponding .examples.md content, if available>

## Diff to Review

<Scoped git diff for the matched files>

## Report Format

For each violation, report:
- **Rule file**: <.claude/rules/... path>
- **Violated rule**: <exact rule text>
- **Location**: <file:line>
- **Description**: <what violates the rule and why>
- **Suggested fix**: <specific fix to become compliant>

If no violations are found, respond with exactly: "No violations found"
```

Before launching Agents, **prepare the data to embed in each prompt** (do NOT rely on Agents running git commands themselves):
- For each group, run `git diff <base-commit> -- <matched-files>` and capture the output
- For each rule file, check if a corresponding `.examples.md` exists (same basename, e.g., `rails-controllers.md` → `rails-controllers.examples.md`) and read its content

For each Agent:
- Set `description` to the group category name (e.g., "Review rules: frameworks")
- Embed the pre-captured diff output directly in the prompt text
- Embed the rule file contents and examples in the prompt text

### 6. Aggregate Results

1. Collect results from all Agents
2. If all groups returned "No violations found":
   - Output: "All rules compliant"
3. If violations were found:
   - Output the consolidated violation list, organized by rule file
   - Format each violation clearly with all fields (rule file, violated rule, location, description, fix suggestion)

## Output Format

### When compliant

```
All rules compliant
```

### When violations found

```
## Rules Compliance Violations

### .claude/rules/frameworks/rails-controllers.md

- **Violated rule**: <rule text>
- **Location**: app/controllers/users_controller.rb:15
- **Description**: <description>
- **Suggested fix**: <suggestion>

### .claude/rules/languages/ruby.md

- **Violated rule**: <rule text>
- **Location**: app/models/user.rb:42
- **Description**: <description>
- **Suggested fix**: <suggestion>
```
