---
name: dev-workflow
description: Guided development workflow with automated plan review, implementation, testing, and code review. Orchestrates plan → review → implement → check/test → code review → rules update.
allowed-tools: Read, Write, Edit, Glob, Grep, TodoWrite, EnterPlanMode, ExitPlanMode, Skill(ask-peer), Skill(ask-claude), Skill(ask-codex), Skill(ask-gemini), Skill(ask-copilot), Skill(extract-rules), Skill(simplify), Bash(pwd), Bash(pnpm run *), Bash(pnpm exec *), Bash(npm run *), Bash(yarn run *), Bash(bun run *), Bash(bundle exec *), Bash(make lint *), Bash(make format *), Bash(make test *), Bash(make typecheck *), Bash(make check *), Bash(python -m pytest *), Bash(poetry run *), Bash(uv run *), Bash(cargo test *), Bash(cargo clippy *), Bash(cargo fmt *), Bash(go test *), Bash(go vet *), Bash(git diff *), Bash(git status *), Bash(git log *), Bash(git rev-parse *)
---

# Dev Workflow

## Usage

```text
/dev-workflow --init         # Project setup (detect check/test commands)
/dev-workflow <task>         # Execute workflow (default)
```

## Prerequisites

- **Reviewer skill** (`reviewer` setting, default: ask-peer): Required for plan/code review. Supported: ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot. If the configured skill is unavailable, ask user directly instead.
- **extract-rules skill**: Required for rule update. If unavailable, skip with message.

## Configuration

Settings file: `dev-workflow.local.md` (YAML frontmatter only)
- Project-level: `.claude/dev-workflow.local.md` (takes precedence)
- User-level: `~/.claude/dev-workflow.local.md`

```yaml
---
reviewer: "ask-peer"
check_commands:
  - "pnpm run lint:fix"
  - "pnpm run format"
  - "pnpm run typecheck"
test_commands:
  - "pnpm run test:unit"
  - "pnpm run test:e2e"
  - "Skill(test-runner)"
---
```

- **reviewer**: Reviewer skill name (default: `ask-peer`). Choose from: ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot. Unsupported values fall back to `ask-peer`
- **check_commands**: Static checks (lint, format, typecheck, etc.). Always run all in order
- **test_commands**: Test execution. AI decides whether to run all tests or only related ones based on changes
- Entries starting with `Skill(` are treated as skill invocations (commands and skills can be mixed)
- Executed in array order
- Note: Skills specified with `Skill()` must be installed in the project

## Mode Detection

- `--init` → Init Mode
- Otherwise → Execution Mode

---

## Init Mode

1. Detect project type from config files (package.json, Gemfile, pyproject.toml, Cargo.toml, go.mod, Makefile)
2. Detect package manager from lock files (JS/TS only)
3. Infer check/test commands for the detected project type
   - check_commands: Detect static checks (lint, format, typecheck, etc.)
   - test_commands: Detect test-related keys from package.json scripts, etc. (test, test:unit, test:e2e, test:integration, etc.)
4. Ask user which reviewer skill to use (default: ask-peer)
   - Options: ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot
5. Present detected commands and reviewer to user for confirmation
6. Save to `.claude/dev-workflow.local.md`

---

## Execution Mode

### Step 1: Load Settings

1. Read `.claude/dev-workflow.local.md` (project-level, priority) or `~/.claude/dev-workflow.local.md` (user-level)
2. If neither exists, prompt user to run `/dev-workflow --init` and stop
3. Resolve `reviewer` from config. If not specified or not in the supported list (ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot), use `ask-peer`
4. Register all workflow phases with `TodoWrite`, including review iterations. Do NOT skip any phase:
   - Step 2: Create Plan
   - Step 3: Plan Review
   - Step 3-1: Plan Review - iteration 1
   - Step 3-2: Plan Review - iteration 2
   - Step 3-3: Plan Review - iteration 3
   - Step 4: Finalize Plan
   - Step 5: Implement
   - Step 6: Simplify
   - Step 7: Check / Test
   - Step 8: Code Review (MANDATORY)
   - Step 8-1: Code Review - iteration 1
   - Step 8-2: Code Review - iteration 2
   - Step 8-3: Code Review - iteration 3
   - Step 9: Update Rules
   Mark each item `in_progress` when starting and `completed` when done. These items must always remain in the list — implementation sub-tasks in Step 5 are additions, not replacements.

### Step 2: Create Plan

1. Record the current commit as base-commit (`git rev-parse HEAD`) for later diff comparison
2. `EnterPlanMode`
3. Analyze the task and codebase, create implementation plan (must include test plan: what to test, test types, scope — or why no tests are needed)
4. **No code changes in this phase**
5. Do not ask the user to approve the plan yet. Proceed to Step 3 first for plan review.

### Step 3: Plan Review

Mark `Step 3: Plan Review` as `in_progress`. Process each pending iteration item (Step 3-1, 3-2, 3-3) in order:

1. Mark the iteration item as `in_progress`. Call the reviewer skill resolved in Step 1 (e.g. `Skill(ask-peer)`): Review the plan.
   - Instruct reviewer to read `.claude/rules/` for project conventions
   - Request feedback organized into three categories:
     a. **Scope & feasibility**: scope appropriateness, dependencies, risks, `.claude/rules/` compliance
     b. **Approach & alternatives**: simpler methods, architectural fit with existing code
     c. **Completeness**: edge cases, error handling, test plan adequacy
   - Reviewer should only report actionable findings. If none, explicitly state "No actionable findings"
2. If reviewer returned "No actionable findings": mark this and remaining iteration items as `completed` (skip). Mark `Step 3: Plan Review` as `completed` and proceed to Step 4.
3. Otherwise: apply improvements, reject inapplicable points with reason. Mark this iteration item as `completed`. Continue to the next pending iteration item (back to step 1) with:
   - the updated plan
   - a summary of changes made and rejections with reasons
   - the same three-category structure, `.claude/rules/` reference, and "No actionable findings" requirement
4. If all 3 iteration items are completed and actionable feedback still remains, carry the unresolved points forward to Step 4.

Mark `Step 3: Plan Review` as `completed`.

### Step 4: Finalize Plan

1. Present the reviewed plan to the user (include any unresolved review points from Step 3)
2. Collaborate with the user to refine the plan as needed (normal Plan Mode interaction)
3. After the user accepts, `ExitPlanMode` and begin implementation

### Step 5: Implement

1. Follow the plan, track progress with `TodoWrite`

### Step 6: Simplify

1. `Skill(simplify)`: Review changed code for reuse, quality, and efficiency, then fix any issues found

### Step 7: Check / Test (max 3 retries)

1. Run `check_commands` in order (always run all)
   - On failure, fix and retry (do not proceed to test_commands)
2. Run `test_commands` in order
   - Entries starting with `Skill(` are skill invocations; others are shell commands
   - AI decides whether to run all tests or only related ones based on changes (when in doubt, run all)
3. After 3 retries, report to user and stop
4. **Only execute commands/skills from the configuration file**

> **GATE**: Verify TodoWrite shows Steps 2-7 as completed. Mark Step 8 as `in_progress`.

### Step 8: Code Review -- MANDATORY, DO NOT SKIP

Mark `Step 8: Code Review` as `in_progress`. Process each pending iteration item (Step 8-1, 8-2, 8-3) in order:

1. Mark the iteration item as `in_progress`. Call the reviewer skill resolved in Step 1 (e.g. `Skill(ask-peer)`): Review code changes.
   - Include `git diff <base-commit>` (base-commit recorded in Step 2) to capture all changes since workflow start
   - Instruct reviewer to also read `.claude/rules/`
   - Request feedback organized into three categories:
     a. **Correctness & edge cases**: bugs, error handling gaps, race conditions, missing validations, missing or insufficient tests for changes
     b. **Conventions & consistency**: adherence to `.claude/rules/`, naming, file structure, patterns
     c. **Simplicity & maintainability**: unnecessary complexity, duplication, unclear abstractions
   - Reviewer should only report actionable findings. If none, explicitly state "No actionable findings"
2. If reviewer returned "No actionable findings": mark this and remaining iteration items as `completed` (skip). Mark `Step 8: Code Review` as `completed` and proceed to Step 9.
3. Otherwise: fix genuine issues, reject inapplicable points with reason. Re-run Step 7 if code was modified. Mark this iteration item as `completed`. Continue to the next pending iteration item (back to step 1) with:
   - the latest `git diff <base-commit>`
   - a summary of fixes made and rejections with reasons
   - the same three-category structure, `.claude/rules/` reference, and "No actionable findings" requirement
4. If all 3 iteration items are completed and actionable feedback still remains, present the unresolved points to user for decision.

Mark `Step 8: Code Review` as `completed`.

### Step 9: Update Rules

1. `Skill(extract-rules)` with `--from-conversation` (always)
2. `Skill(extract-rules)` with `--update` (only if significant structural/pattern changes occurred)
3. If extract-rules is unavailable, skip this step and inform user

### Completion

Report summary: tasks completed, files modified, test results, review outcomes, rules updated.
