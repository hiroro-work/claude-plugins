# Changelog

## 2026-03-06

### extract-rules v1.5.0

- feat: Add integration library detection and separation
  - Detect integration libraries (Inertia, Pundit, Devise, Turbo, etc.) from dependency files
  - Separate integration-specific rules into `integrations/` directory (e.g., `integrations/rails-inertia.md`)
  - Distinguish between framework layers (inherent architecture) and integrations (optional libraries)
  - Framework name included in integration file names (rules differ by host framework)
  - Works with all modes: Full Extraction, Update, Restructure, Conversation Extraction

### merge-rules v1.0.0

- feat: New skill to merge extract-rules output from multiple projects
  - YAML config file for specifying source projects
  - Merges portable principles (.md) across projects with deduplication
  - Promotes .local.md patterns shared across 2/3+ of projects to common patterns
  - Outputs .md files only (no .local.md)
  - `--dry-run` option for preview without writing
  - Conflict detection and reporting

## 2026-03-03

### extract-rules v1.4.0

- feat: Add `--restructure` option for file structure reorganization with content merge
  - Re-analyzes codebase to determine optimal file structure
  - Merges existing rules into new structure (preserves manual edits and conversation-extracted rules)
  - Existing rules take priority over fresh extraction on conflict (respects manual edits)
  - Shows restructure plan for user confirmation before execution
  - Handles split_output mode transitions (hybrid ↔ split)
  - Unmatched rules fall back to project.md
- **breaking**: Change `split_output` default from `false` to `true` (Principles and Project-specific patterns are now separated by default)
- remove: `--force` option (use `rm -rf .claude/rules/ && /extract-rules` or `--restructure` instead)
- refactor: Extract report templates to `references/report-templates.md` (progressive disclosure)
- refactor: Simplify Restructure Mode steps (R1-R6 → R1-R5, concise descriptions)

## 2026-03-02

### extract-rules v1.3.0

- feat: Add `split_output` option for `.local.md` file separation (opt-in)
  - `split_output: false` (default): Single hybrid file per category (backwards compatible)
  - `split_output: true`: Principles → `<name>.md` (portable), Project-specific patterns → `<name>.local.md` (local)
  - Classification is mechanical: `## Principles` → shared file, `## Project-specific patterns` → local file
  - `project.md` is never split (inherently project-specific)
- feat: Add layered framework support (Rails, Django, Spring, etc.)
  - Detect architectural layers (e.g., models, controllers, views) when directories exist
  - Generate layer-specific files with scoped `paths:` (e.g., `rails-model.md`)
  - Cross-layer rules in `<framework>.md` (no `paths:` or broad scope)
- feat: Handle orphaned `.local.md` files when switching split modes
  - `--force`: Warns and deletes orphaned `.local.md` files
  - `--update`: Warns and recommends running `--force` to clean up
- refactor: Extract classification criteria to `references/extraction-criteria.md`
  - Progressive disclosure: metadata → SKILL.md body → bundled references
- refactor: Remove `Bash(grep *)` from allowed-tools (use Grep tool instead)
- docs: Enhanced skill description for better trigger matching

## 2026-02-25

### caffeinate v1.0.0

- feat: macOS caffeinate management plugin
  - Prevent idle/system sleep with `caffeinate -is`
  - PID file-based process management (unique per project)
  - start/stop/status modes (`/caffeinate`, `/caffeinate stop`)
  - Auto-stop on session end via SessionEnd hook

## 2026-02-21

### extract-rules v1.2.0

- feat: Add scope criterion to Concrete Example Criteria (Symbol + Scope dual filter)
  - Project-wide usage or convention-defining patterns only — skip local utilities
- feat: Change Decision criterion to inconsistency-based approach
  - "Would AI produce inconsistent results without knowing this pattern?"
- feat: Change Fallback rule from "include when uncertain" to "apply the scope criterion"
  - Rules should answer "how to write new code" not "what utilities exist"

## 2026-02-02

### ask-claude v1.1.2, ask-codex v1.1.2, ask-gemini v1.1.1, ask-copilot v1.0.1, security-scanner v1.2.1, extract-rules v1.1.1

- refactor: Update `allowed-tools` Bash syntax from legacy colon format to space format
  - Changed: `Bash(command:*)` → `Bash(command *)`
  - This follows the current recommended syntax per Claude Code official documentation
  - Affected skill files and command files
  - Updated documentation examples in `CLAUDE.md`, `.claude/rules/project.rules.md`, `docs/article-peer-plugin.md`

## 2026-01-29

### extract-rules v1.1.0

- feat: Add `--update` option to re-scan and add new patterns while preserving existing rules
- feat: Hybrid output format (Principles + Project-specific patterns)
- feat: Abstract principles with implementation hints for general style choices
- feat: Compact one-line format for project-specific patterns
- remove: `--dry-run` option (use git to revert if needed)
- docs: Add extraction criteria sections

## 2026-01-28

### extract-rules v1.0.0

- Initial release: Extract project-specific coding rules from codebase for AI agents
- `/extract-rules` command to analyze codebase and generate rule documentation
- `--force` option to overwrite existing rule files
- `--dry-run` option for analysis without file output
- `--from-conversation` option to extract rules from conversation history
- 11 extraction categories: naming, types, testing, error-handling, structure, imports, comments, architecture, domain, async-patterns, logging
- Language/framework-based organization for rule portability
- Configurable via `.claude/extract-rules.local.md`
- Output structure:
  - `languages/` - Language-specific rules (portable)
  - `frameworks/` - Framework-specific rules (portable)
  - `project/` - Project-specific rules (domain, architecture)

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

### translate v1.1.0

- feat: Add user-level configuration support (`~/.claude/translate.local.md`)
- Project-level settings take precedence over user-level
- Aligns with security-scanner configuration pattern

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
