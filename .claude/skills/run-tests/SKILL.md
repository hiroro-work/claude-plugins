---
name: run-tests
description: Verify plugins marketplace structure, version consistency, and JSON/frontmatter validity via subagent
allowed-tools: Agent, Bash(git diff *), Bash(jq *), Bash(ls *), Bash(readlink *), Bash(test *), Read, Glob
---

# Test Runner

This project is a Claude Code plugins marketplace. "Tests" here means verifying the repository structure, version consistency, JSON syntax, and SKILL.md/agent frontmatter validity — equivalent to the `/verify-plugins` command logic.

## Process

1. Determine test scope:
   - If `$ARGUMENTS` contains `--base-commit <sha>`: run `git diff --name-only <sha>` to get changed files (includes committed, staged, and unstaged changes)
   - Otherwise: run `git diff --name-only HEAD` to detect changed files (if HEAD is unavailable or no changed files detected, run full verification)
   - This marketplace is small and structural; any change touching `.claude-plugin/marketplace.json`, `plugins/**`, `skills/**`, or `.claude-plugin/plugin.json` should trigger full verification. If only unrelated files (e.g. `README.md`, `CHANGELOG.md`, `docs/**`) changed, still run full verification — it is fast
2. Spawn a subagent (Agent tool, subagent_type: `general-purpose`) to execute verification
3. Return the subagent's structured summary to the caller

## Subagent Instructions

> Verify this Claude Code plugins marketplace repository. Perform the following checks and return a structured summary.
>
> ### Checks
>
> 1. **Load marketplace manifest**: Read `.claude-plugin/marketplace.json`. Extract the `plugins` array. For each plugin, capture `name`, `source`, and `version`.
>
> 2. **Skill entity existence**: For each `skills/*/` directory referenced by plugins (via symlinks under `plugins/<name>/skills/<skill>`), confirm the target directory exists and contains `SKILL.md`.
>
> 3. **Plugin source directory structure**: For each plugin in marketplace.json:
>    - `source` directory exists (e.g. `plugins/<name>`)
>    - `plugins/<name>/skills/` entries are symlinks (use `readlink`)
>    - Symlink targets resolve to existing `skills/<skill>/SKILL.md`
>
> 4. **Version consistency**: For each plugin:
>    - If `plugins/<name>/.claude-plugin/plugin.json` exists, verify its `version` matches marketplace.json
>    - If not, only marketplace.json version is checked
>
> 5. **JSON syntax**: Validate every `.claude-plugin/marketplace.json` and `plugins/*/.claude-plugin/plugin.json` with `jq empty`.
>
> 6. **Frontmatter presence**: Verify each `SKILL.md` and each agent file (`plugins/*/agents/*.md`) starts with `---` on the first line (YAML frontmatter).
>
> ### Return Format
>
> Return a structured summary with one of three statuses:
>
> **Status: SUCCESS**
> - All checks passed
> - Per-check summary: counts (e.g., "15 skills verified, 13 plugins, 0 version mismatches")
>
> **Status: TEST_FAILED**
> - Per-check results with failures highlighted
> - For each failure:
>   - The specific check that failed
>   - File path and what was expected vs actual
>   - Remediation hint (e.g., "recreate symlink", "bump version in plugin.json")
> - Keep the summary concise but include enough detail to fix without re-running
>
> **Status: EXECUTION_ERROR**
> - Command that failed to execute (e.g., `jq` missing, marketplace.json unreadable)
> - Error output
> - This status is for infrastructure/environment errors, not verification failures
