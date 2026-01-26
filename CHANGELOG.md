# Changelog

## 2026-01-26

### security-scanner v1.2.0

**Multi-agent support for skills scanning**

- feat: Add `target_agents` configuration to scan skills from multiple AI agents
- Supported agents: `claude`, `codex`, `gemini`, `agents` (Skills.sh/Amp)
- Default: `claude` only (backward compatible)
- note: For Skills.sh, configure `target_agents` appropriately to avoid redundant scanning
- feat: Add Agent column to report summary and findings
- feat: Add `report_language` configuration (default: `ja`)
- fix: Add `Bash(ls:*)` to allowed-tools for symlink directory listing
- Agent-specific skill paths:
  - claude: `.claude/skills/`, `~/.claude/skills/`
  - codex: `.codex/skills/`, `~/.codex/skills/`
  - gemini: `.gemini/skills/`, `~/.gemini/skills/`
  - agents: `.agents/skills/`, `~/.config/agents/skills/`, `~/.agents/skills/`

## 2026-01-25

### ask-copilot v1.0.0

- Initial release: Copilot CLI integration for getting a second opinion
- `/ask-copilot` skill to invoke `copilot` CLI

## 2026-01-24

### Repository restructure (anthropics/skills pattern)

- Adopt anthropics/skills pattern for skill-only items
- `skills/` is now canonical location (no duplication)
- Skill-only plugins use `source: "./"` + `skills` array to reference `skills/` directory
- Agent-dependent plugins (peer, translate) remain in `plugins/`
- Delete redundant `plugins/` directories: ask-claude, ask-codex, ask-gemini, security-scanner

**For existing users:** Refresh the marketplace to update to the new structure.

### Skills.sh support

- Add `skills/` directory for Skills.sh distribution
- Available skills: `ask-claude`, `ask-codex`, `ask-gemini`, `security-scanner`
- Install via: `npx skills add hiroro-work/claude-plugins`
- Note: Agent features (peer, translate) are only available via Claude Code Plugin Marketplace

### security-scanner v1.1.2

- feat: Add URL auto-detection for GitHub URLs (`--url` flag is now optional)

### security-scanner v1.1.1

- Remove `--plugins` and `--skills` options to simplify the skill (always scans both)

### security-scanner v1.1.0

**Renamed from plugin-security to security-scanner** to reflect expanded scope and clearer purpose.

- feat: Add `--url` option for scanning plugins from GitHub public repositories
- feat: Add skills scanning (`~/.claude/skills/`, `.claude/skills/`)
- Supports full GitHub URLs (e.g., `https://github.com/owner/repo/tree/main/plugins/my-plugin`)
- Supports non-plugin content: skill directories without plugin.json, single SKILL.md files
- Uses GitHub Contents API via WebFetch (no authentication required for public repos)
- Error handling for private repos, rate limits, and invalid paths
- Renamed: `/plugin-security` → `/security-scanner`
- Renamed: `.claude/plugin-security.local.md` → `.claude/security-scanner.local.md`
- Remove security-scanner agent (skill is self-contained with `allowed-tools`)

## 2026-01-20

### security-scanner v1.0.0 (formerly plugin-security)

- Initial release: Security scanner for Claude Code plugins
- `/security-scanner` command to scan all installed plugins
- `--user` option for user-level plugins only (`~/.claude/plugins/`)
- `--project` option for project-level plugins only (`.claude/plugins/`)
- `--all` option for full audit (ignore trusted sources and self-exclusion)
- AI semantic analysis to detect malicious code AND natural language instructions
- Detects: remote code execution, reverse shells, credential theft, data exfiltration, etc.
- Trusted sources configuration via `.claude/security-scanner.local.md`
- Self-exclusion with impersonation protection (`security-scanner@hiropon-plugins` only)
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
