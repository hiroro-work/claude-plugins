# Init Mode

1. Detect project type from config files (package.json, Gemfile, pyproject.toml, Cargo.toml, go.mod, Makefile)
2. Detect package manager from lock files (JS/TS only)
3. Infer check_commands for the detected project type
   - Detect static checks (lint, format, typecheck, etc.)
   - **TypeScript multi-tsconfig handling**:
     - Scan `tsconfig*.json` files **directly under the project root only** — do not recurse into `packages/*` / `apps/*` (workspace territory, user-configured)
     - Exclude tsconfigs whose name signals a non-typecheck role (e.g. `tsconfig.eslint.json`, `tsconfig.*.test.json`, `tsconfig.vitest.json`)
     - To detect `references: [...]` on the root `tsconfig.json`, use the `Read` tool and parse the file as JSONC (strip `//` / `/* */` comments and trailing commas before checking the `references` key). Avoid shelling out to `tsc --showConfig` or `grep`: the former needs tooling not in `allowed-tools`, the latter false-hits inside `//`-commented blocks
     - Trigger: **2 or more** tsconfigs remain after exclusion, or the root `tsconfig.json` resolves to a non-empty `references` array
     - Action: register one type-check command per tsconfig in `check_commands`. Match the detected package manager so commands fit the `allowed-tools` `Bash(<pm> run *)` / `Bash(<pm> exec *)` globs — e.g. `pnpm exec tsc -p tsconfig.app.json --noEmit` for pnpm projects, or add per-tsconfig scripts in `package.json` and use `<pm> run typecheck:<name>` for npm/yarn/bun. (Per-tsconfig `-p` was chosen over `tsc -b --noEmit` for universal compatibility; see CHANGELOG entry for the design rationale.) Present the generated command list to the user in Step 6 for confirmation so any environment mismatch is caught before the config is saved
       - **Solution-Style root exclusion**: if the root `tsconfig.json` has a non-empty `references` array, exclude the root itself from per-tsconfig registration — `tsc -p tsconfig.json --noEmit` typically fails on Solution-Style roots because emit is disabled there. Register commands only for the referenced leaf tsconfigs plus any other non-root tsconfigs that survived the name-based exclusion above
4. Determine test_commands (dev-workflow always uses `Skill(run-tests)` as the canonical test skill):
   a. **Check existing `run-tests` skill**: Look for `.claude/skills/run-tests/SKILL.md`
      - **Current format** (Agent tool in allowed-tools + subagent execution pattern + three-status return contract + `--base-commit` input contract): use as-is, skip generation. However, offer to regenerate if any of these gaps are detected:
        - Prerequisites are detected in the project but the existing skill lacks a Prerequisites section
        - Docker-related prerequisites are detected (docker-compose.yml / compose.yml exists) but the existing skill's Prerequisites section lacks Docker daemon readiness check (e.g. `docker info`)
      - **Outdated or not found**: read any existing test commands and prerequisites from the old skill before removal, then proceed to (b). Remove the old file and incorporate extracted content into the newly generated skill
      - Note: if other test-related skills exist (e.g., `test-runner`, `test-file`), inform user that dev-workflow uses `run-tests` as its canonical test skill and offer to incorporate their test commands into the generated `run-tests`
   b. **Generate `run-tests` skill**: Detect test commands and prerequisites from project config
      - Detect test commands from project config (package.json scripts, Makefile targets, etc.)
      - Analyze project structure: source directories, test file locations, test command definitions
      - **Detect test prerequisites** from project files:
        - `docker-compose.yml` / `docker-compose.yaml` / `compose.yml` / `compose.yaml` → generates **two** prerequisites in order:
          1. Docker daemon: check: `docker info > /dev/null 2>&1` / setup: `open -a Docker` then poll `docker info` every 3 seconds (max 30 seconds) until ready (macOS; on Linux use `sudo systemctl start docker`)
          2. Docker services: check: `docker compose ps --status running` / setup: `docker compose up -d`
        - `config/database.yml` + `db/schema.rb` (Rails) → check: `bin/rails db:version` / setup: `bin/rails db:prepare`
        - `.env.example` → check: `test -f .env` / setup: manual guidance only (auto-copy is unsafe)
        - `bin/setup` / `script/setup` → if present, prioritize as a single setup command over individual prerequisites
      - Prepare draft `.claude/skills/run-tests/SKILL.md` with:
        - frontmatter: name, description, allowed-tools (`Agent`, `Bash(<pkg-manager> run *)`, `Bash(<specific test commands>)`, `Bash(git diff *)`, `Bash(<detected prerequisite check/setup commands>)` — include only commands for technologies actually detected in the project)
        - Prerequisites section (only if prerequisites were detected — omit entirely if none)
        - Test commands list (detected from project)
        - Subagent-based execution process (see template below)
        - Three-status return contract (SUCCESS / TEST_FAILED / EXECUTION_ERROR)
   c. **Fallback**: If step 4b could not detect any test commands from project config, propose project-type standard command (e.g., `cargo test`, `python -m pytest`) wrapped in a generated `run-tests` skill, or ask user
   d. Set `test_commands: ["Skill(run-tests)"]`
5. Ask user which reviewer skill to use (default: ask-peer)
   - Options: ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot
6. Present detected commands, test approach, prerequisites (if any), review_iterations (default: 3), and reviewer to user for confirmation
7. On user approval, save settings to `.claude/dev-workflow.md` (project shared, git tracked). If `.claude/dev-workflow.md` already exists, preserve any keys not managed by `--init` (e.g., `task_decomposition`, `custom_instructions`, `hooks`) by reading the existing file first and merging the new values into it. If the existing file has malformed YAML, warn the user and ask whether to overwrite it (losing unmanaged keys) or abort so they can fix it manually. Write generated skill files (if any from 4b/4c)
8. Verify commands and skills work
   - Run each check_command and report pass/fail
   - **Pseudo-execute** `run-tests` (newly created skills are not registered in the current session, so `Skill(run-tests)` cannot be used):
     a. Read the generated `.claude/skills/run-tests/SKILL.md`
     b. If a Prerequisites section exists, run each check command; if a check fails and a setup command is defined, execute the setup command; if the setup starts an asynchronous service, re-run the check command with retries (e.g. every 3-5 seconds) for up to 30 seconds (commands not in allowed-tools will prompt user for approval, providing a natural safety gate); if a prerequisite has no setup command (e.g. .env), report as a warning with guidance; on setup failure, suggest fixes but do not block
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
allowed-tools: Agent, Bash(git diff *), Bash(<detected test commands>), Bash(<detected prerequisite check/setup commands>)
# NOTE: Only include commands for technologies actually detected in the project.
---

# Test Runner

## Prerequisites

> Include this section ONLY if prerequisites were detected during init. Omit entirely if none.

Before running tests, check these conditions and set up if needed:
- <description>: check `<check command>` → if failed, setup `<setup command>`

Example:
- Service runtime: check `<readiness command>` → if failed, start the service, then re-check readiness
- Project services: check `<service status command>` → if failed, setup `<service start command>`
- Database state: check `<db check command>` → if failed, setup `<db prepare command>`
- Required local file: check `test -f <file>` → if failed, report EXECUTION_ERROR with guidance

## Process

1. Check prerequisites (if any): run each check command in order; if a check fails, run the corresponding setup command; if the setup starts an asynchronous service (e.g. daemon, database), re-run the check command with retries (e.g. every 3-5 seconds) for up to 30 seconds before declaring failure; if setup still fails, return EXECUTION_ERROR with remediation guidance
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
