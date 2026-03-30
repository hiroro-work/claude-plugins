# Init Mode

1. Detect project type from config files (package.json, Gemfile, pyproject.toml, Cargo.toml, go.mod, Makefile)
2. Detect package manager from lock files (JS/TS only)
3. Infer check_commands for the detected project type
   - Detect static checks (lint, format, typecheck, etc.)
4. Determine test_commands (dev-workflow always uses `Skill(run-tests)` as the canonical test skill):
   a. **Check existing `run-tests` skill**: Look for `.claude/skills/run-tests/SKILL.md`
      - **Current format** (Agent tool in allowed-tools + subagent execution pattern + three-status return contract + `--base-commit` input contract): use as-is, skip generation
      - **Outdated or not found**: read any existing test commands from the old skill before removal, then proceed to (b). Remove the old file and incorporate extracted test commands into the newly generated skill
      - Note: if other test-related skills exist (e.g., `test-runner`, `test-file`), inform user that dev-workflow uses `run-tests` as its canonical test skill and offer to incorporate their test commands into the generated `run-tests`
   b. **Generate `run-tests` skill**: Detect test commands from project config
      - Detect test commands from project config (package.json scripts, Makefile targets, etc.)
      - Analyze project structure: source directories, test file locations, test command definitions
      - Prepare draft `.claude/skills/run-tests/SKILL.md` with:
        - frontmatter: name, description, allowed-tools (`Agent`, `Bash(<pkg-manager> run *)`, `Bash(<specific test commands>)`, `Bash(git diff *)` — match project's package manager and test commands)
        - Test commands list (detected from project)
        - Subagent-based execution process (see template below)
        - Three-status return contract (SUCCESS / TEST_FAILED / EXECUTION_ERROR)
   c. **Fallback**: If step 4b could not detect any test commands from project config, propose project-type standard command (e.g., `cargo test`, `python -m pytest`) wrapped in a generated `run-tests` skill, or ask user
   d. Set `test_commands: ["Skill(run-tests)"]`
5. Ask user which reviewer skill to use (default: ask-peer)
   - Options: ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot
6. Present detected commands, test approach, review_iterations (default: 3), and reviewer to user for confirmation
7. On user approval, save `.claude/dev-workflow.local.md` (including reviewer, review_iterations, check_commands, and test_commands) and write generated skill files (if any from 4b/4c)
8. Verify commands and skills work
   - Run each check_command and report pass/fail
   - Run `Skill(run-tests)` without arguments (the skill will fall back to `git diff --name-only HEAD` for scope detection; if HEAD is unavailable, all tests run — both are acceptable for init verification)
   - Display results summary
   - If any command/skill fails, suggest fixes but do not block (config is already saved)

## run-tests SKILL.md Template

When generating the `run-tests` skill, use this structure (adapt commands and allowed-tools to the detected project):

```markdown
---
name: run-tests
description: Run project tests via subagent to keep main context clean
allowed-tools: Agent, Bash(<pkg-manager> run *), Bash(<specific-test-commands>), Bash(git diff *)
---

# Test Runner

## Process

1. Determine test scope:
   - If $ARGUMENTS contains `--base-commit <sha>`: run `git diff --name-only <sha>` to get changed files (includes committed, staged, and unstaged changes)
   - Otherwise: run `git diff --name-only HEAD` to detect changed files (if HEAD is unavailable or no changed files detected, run all tests)
   - Localized changes → run only tests covering changed modules/files
   - Cross-cutting changes (shared utils, config, DB schema) or unsure → run all tests
2. Spawn a subagent (Agent tool) to execute tests
3. Subagent runs the following test commands in order:
   - <detected test commands here>
4. Return the subagent's structured summary to the caller

## Subagent Instructions

> Execute the test commands listed above.
> Return a structured summary with one of three statuses:
>
> **Status: SUCCESS**
> - All tests passed
> - Per-command results: command, pass/fail
>
> **Status: TEST_FAILED**
> - Per-command results: command, pass/fail
> - For failures:
>   - Failed test names
>   - Error messages
>   - Relevant code locations (file:line)
>   - Stack trace excerpt (first meaningful lines showing root cause)
> - Keep the summary concise but include enough detail to fix the issue without re-running
>
> **Status: EXECUTION_ERROR**
> - Command that failed to execute
> - Error output
> - This status is for infrastructure/environment errors, not test failures
```
