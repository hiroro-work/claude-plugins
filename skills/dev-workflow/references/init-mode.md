# Init Mode

1. Detect project type from config files (package.json, Gemfile, pyproject.toml, Cargo.toml, go.mod, Makefile)
2. Detect package manager from lock files (JS/TS only)
3. Infer check_commands for the detected project type
   - Detect static checks (lint, format, typecheck, etc.)
4. Determine test_commands (dev-workflow always uses `Skill(run-tests)` as the canonical test skill):
   a. **Check existing `run-tests` skill**: Look for `.claude/skills/run-tests/SKILL.md`
      - **Current format** (Agent tool in allowed-tools + subagent execution pattern + three-status return contract + `--base-commit` input contract): use as-is, skip generation. However, if prerequisites are detected in the project but the existing skill lacks a Prerequisites section, inform the user and offer to regenerate the skill to add prerequisite support
      - **Outdated or not found**: read any existing test commands and prerequisites from the old skill before removal, then proceed to (b). Remove the old file and incorporate extracted content into the newly generated skill
      - Note: if other test-related skills exist (e.g., `test-runner`, `test-file`), inform user that dev-workflow uses `run-tests` as its canonical test skill and offer to incorporate their test commands into the generated `run-tests`
   b. **Generate `run-tests` skill**: Detect test commands and prerequisites from project config
      - Detect test commands from project config (package.json scripts, Makefile targets, etc.)
      - Analyze project structure: source directories, test file locations, test command definitions
      - **Detect test prerequisites** from project files:
        - `docker-compose.yml` / `compose.yml` → check: `docker compose ps --status running` / setup: `docker compose up -d`
        - `config/database.yml` + `db/schema.rb` (Rails) → check: `bin/rails db:version` / setup: `bin/rails db:prepare`
        - `.env.example` → check: `test -f .env` / setup: manual guidance only (auto-copy is unsafe)
        - `bin/setup` / `script/setup` → if present, prioritize as a single setup command over individual prerequisites
      - Prepare draft `.claude/skills/run-tests/SKILL.md` with:
        - frontmatter: name, description, allowed-tools (`Agent`, `Bash(<pkg-manager> run *)`, `Bash(<specific test commands>)`, `Bash(git diff *)` — match project's package manager and test commands; add prerequisite-related commands if detected, e.g. `Bash(docker compose *)`, `Bash(bin/rails *)`, `Bash(test -f *)`)
        - Prerequisites section (only if prerequisites were detected — omit entirely if none)
        - Test commands list (detected from project)
        - Subagent-based execution process (see template below)
        - Three-status return contract (SUCCESS / TEST_FAILED / EXECUTION_ERROR)
   c. **Fallback**: If step 4b could not detect any test commands from project config, propose project-type standard command (e.g., `cargo test`, `python -m pytest`) wrapped in a generated `run-tests` skill, or ask user
   d. Set `test_commands: ["Skill(run-tests)"]`
5. Ask user which reviewer skill to use (default: ask-peer)
   - Options: ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot
6. Present detected commands, test approach, prerequisites (if any), review_iterations (default: 3), and reviewer to user for confirmation
7. On user approval, save `.claude/dev-workflow.local.md` (including reviewer, review_iterations, check_commands, and test_commands) and write generated skill files (if any from 4b/4c)
8. Verify commands and skills work
   - Run each check_command and report pass/fail
   - **Pseudo-execute** `run-tests` (newly created skills are not registered in the current session, so `Skill(run-tests)` cannot be used):
     a. Read the generated `.claude/skills/run-tests/SKILL.md`
     b. If a Prerequisites section exists, run each check command; if a check fails and a setup command is defined, execute the setup command (commands not in allowed-tools will prompt user for approval, providing a natural safety gate); if a prerequisite has no setup command (e.g. .env), report as a warning with guidance; on setup failure, suggest fixes but do not block
     c. Determine test scope: run `git diff --name-only HEAD` to detect changed files; if HEAD is unavailable or no changed files, run all tests
     d. Execute the test commands listed in the skill directly via Bash (no subagent needed for init verification)
     e. Report results using the three-status format (SUCCESS / TEST_FAILED / EXECUTION_ERROR)
   - Display results summary
   - If any command/skill fails, suggest fixes but do not block (config is already saved)
   - Note: `--init` completes the session. Run `/dev-workflow <task>` in a new session for the generated skills to be recognized

## run-tests SKILL.md Template

When generating the `run-tests` skill, use this structure (adapt commands and allowed-tools to the detected project):

```markdown
---
name: run-tests
description: Run project tests via subagent to keep main context clean
allowed-tools: Agent, Bash(<pkg-manager> run *), Bash(<specific-test-commands>), Bash(git diff *), <prerequisite-commands if any>
---

# Test Runner

## Prerequisites

> Include this section ONLY if prerequisites were detected during init. Omit entirely if none.

Before running tests, check these conditions and set up if needed:
- <description>: check `<check command>` → if failed, setup `<setup command>`

Example:
- Docker services: check `docker compose ps --status running` → if failed, setup `docker compose up -d`
- Database: check `bin/rails db:version` → if failed, setup `bin/rails db:prepare`
- Environment file: check `test -f .env` → if failed, report EXECUTION_ERROR with guidance to create .env from .env.example

## Process

1. Check prerequisites (if any): run each check command in order; if a check fails, run the corresponding setup command; if setup also fails, return EXECUTION_ERROR with remediation guidance
2. Determine test scope:
   - If $ARGUMENTS contains `--base-commit <sha>`: run `git diff --name-only <sha>` to get changed files (includes committed, staged, and unstaged changes)
   - Otherwise: run `git diff --name-only HEAD` to detect changed files (if HEAD is unavailable or no changed files detected, run all tests)
   - Localized changes → run only tests covering changed modules/files
   - Cross-cutting changes (shared utils, config, DB schema) or unsure → run all tests
3. Spawn a subagent (Agent tool) to execute tests
4. Subagent runs the following test commands in order:
   - <detected test commands here>
5. Return the subagent's structured summary to the caller

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
> - This status is for infrastructure/environment errors (including prerequisite failures), not test failures
```
