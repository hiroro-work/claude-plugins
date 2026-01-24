# Changelog

## 2026-01-24

### skills-scanner v1.1.0

**Renamed from plugin-security to skills-scanner** to reflect expanded scope.

- feat: Add `--url` option for scanning plugins from GitHub public repositories
- feat: Add skills scanning (`~/.claude/skills/`, `.claude/skills/`)
- feat: Add type filters: `--plugins`, `--skills` (can combine with `--user`/`--project`)
- Supports full GitHub URLs (e.g., `https://github.com/owner/repo/tree/main/plugins/my-plugin`)
- Supports non-plugin content: skill directories without plugin.json, single SKILL.md files
- Uses GitHub Contents API via WebFetch (no authentication required for public repos)
- Error handling for private repos, rate limits, and invalid paths
- Renamed: `/plugin-security` → `/skills-scanner`
- Renamed: `.claude/plugin-security.local.md` → `.claude/skills-scanner.local.md`

## 2026-01-20

### skills-scanner v1.0.0 (formerly plugin-security)

- Initial release: Security scanner for Claude Code plugins
- `/skills-scanner` command to scan all installed plugins
- `--user` option for user-level plugins only (`~/.claude/plugins/`)
- `--project` option for project-level plugins only (`.claude/plugins/`)
- `--all` option for full audit (ignore trusted sources and self-exclusion)
- AI semantic analysis to detect malicious code AND natural language instructions
- Detects: remote code execution, reverse shells, credential theft, data exfiltration, etc.
- Trusted sources configuration via `.claude/skills-scanner.local.md`
- Self-exclusion with impersonation protection (`skills-scanner@hiropon-plugins` only)
- Uses only Read, Glob, Grep tools (no command execution)

## 2026-01-15

### translate v1.0.0

- Initial release: AI-powered translation plugin using Claude subagents
- `/tr` command with haiku model (default)
- `--hq` option for high-quality translation using sonnet model
- `--fast` option to force standard translation using haiku model
- `--to` option for specifying target language
- `--from` option for specifying source language (skip auto-detection)
- Auto-detects Japanese/English translation direction
- Configurable defaults via `.claude/translate.local.md` (quality, languages)

## 2026-01-13

### ask-claude v1.1.1

- Update description to clarify it's for non-Claude AI agents (Codex, Gemini, etc.)

## 2025-12-28

### ask-codex v1.1.1

- Fix `allowed-tools` pattern from `Bash(codex exec:*)` to `Bash(codex:*)`

### ask-claude, ask-codex, ask-gemini v1.1.0

- Add `allowed-tools` to eliminate double permission prompts when using skills

## 2025-12-25

### Initial release v1.0.0

- `ask-claude` plugin: Claude CLI integration for getting a second opinion
- `ask-codex` plugin: Codex CLI integration for getting a second opinion
- `ask-gemini` plugin: Gemini CLI integration for getting a second opinion
- `peer` plugin: Claude subagent for peer review, planning discussions, and brainstorming
