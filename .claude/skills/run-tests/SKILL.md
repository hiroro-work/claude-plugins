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
2. Spawn a subagent (Agent tool, subagent_type: `general-purpose`, `model: sonnet`) to execute verification — pass `sonnet` as the `Agent` tool's `model` parameter. The structural checks (jq / readlink / frontmatter validation) are mechanical, so `sonnet` is sufficient by default; this is a deliberate skill-side cost choice.
3. Return the subagent's structured summary to the caller

## Subagent Instructions

> Verify this Claude Code plugins marketplace repository. Perform the following checks **yourself, directly, in this agent, using Read/Bash/Glob** — do not spawn a nested `Agent` and do not dispatch any `Skill()`. Re-delegation is an observed failure mode: the executor stops to wait on its child and returns no verdict, which the caller then treats as a parse failure. Return a structured summary.
>
> ### Checks
>
> 1. **Load marketplace manifest**: Read `.claude-plugin/marketplace.json`. Extract the `plugins` array. For each plugin, capture `name`, `source`, `skills` (optional), and `version`.
>
> 2. **Skill entity existence**: Verify each `skills/*/` directory contains `SKILL.md`.
>
> 3. **Plugin source directory structure**: For each plugin in marketplace.json, dispatch by `source` prefix:
>    - **If `source` starts with `./skills/`** (direct-skill plugin): verify `<source>/SKILL.md` exists and `skills: ["./"]` is present
>    - **If `source` starts with `./plugins/`** (wrapper plugin): verify `<source>/` exists; if `<source>/skills/` exists, each entry under it must be **either** a symlink (use `readlink`) resolving to an existing `skills/<skill>/SKILL.md` **or** a real directory containing `SKILL.md`; if `<source>/agents/` exists, each `.md` file must have YAML frontmatter; if `<source>/.claude-plugin/plugin.json` exists, its JSON must be valid
>      - **Real directories are expected, not a defect.** Every wrapper's `skills/` entries were converted from symlinks to real copies in commit `56026cb` to work around [anthropics/claude-code#53948](https://github.com/anthropics/claude-code/issues/53948) (the plugin cache does not resolve symlinks). Do **not** report a real directory as a broken/missing symlink — that turns every run into a permanent `TEST_FAILED` and buries genuinely new failures. Content equality between a real-directory copy and its canonical `skills/<name>/` is **out of scope here**: `verify-bundle-sync` owns that check. Source of truth: `.claude/rules/project.rules.md` § プラグイン構造's wrapper-entry bullet; when symlinks are restored, drop this sub-bullet together with that rule
>    - **Additionally, for wrapper bundles** (wrapper plugin with `skills` array of specific paths like `./skills/<name>`): verify each path in `skills` array resolves to an existing `skills/<name>/SKILL.md`, AND verify the set of paths matches the set of entries under `<source>/skills/` (each entry has a corresponding `skills` entry, and vice versa — detect drift in either direction)
>
> 4. **Version consistency**: For each plugin, if `<source>/.claude-plugin/plugin.json` exists (only possible for `./plugins/` sources), verify its `version` matches marketplace.json.
>
> 5. **JSON syntax**: Validate `.claude-plugin/marketplace.json` and every `plugins/*/.claude-plugin/plugin.json` with `jq empty`.
>
> 6. **Frontmatter presence**: Verify each `skills/*/SKILL.md` and each agent file (`plugins/*/agents/*.md`) starts with `---` on the first line (YAML frontmatter).
>
> 7. **Cross-member directive identity**: for each path in the `dev-workflow-bundle` plugin's `skills` array, verify `<path>/SKILL.md` contains a line that is exactly `## Dispatch authorization` (an anchored whole-line match — a heading carrying extra text, e.g. `## Dispatch authorization (caller-side)`, does not count and is reported as missing), and that that section's body — the lines between that heading and the next `## ` heading (or end of file, if it is the last `## ` section), with leading and trailing blank lines trimmed — is identical character-for-character, internal whitespace included, across every member, taking the **first member that has the section** as the reference body so the failure report stays deterministic even when an earlier member is the one missing it. `Read` each member's section and compare the delimited bodies directly — the directive sits in each member's preamble (within the first ~170 lines of every current member), so pass `Read` an `offset`/`limit` window around the heading instead of reading whole files; the seven members total well over 300k chars and only this one section is in scope. The sections that *follow* the directive differ per member, so comparing anything wider than the delimited body reports false divergence. Report any member that is missing the section or whose body diverges. Rationale: the section must be self-contained per member because each is independently installable, so no cross-reference can enforce the wording — this check is what makes the identity invariant real (see `.claude/rules/project.rules.md` § プラグイン構造).
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
