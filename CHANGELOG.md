# Changelog

## 2026-03-27

### dev-workflow v1.7.0 / dev-workflow-bundle v1.7.0

- feat: Add test review perspectives to plan creation, plan review, and code review
  - Step 2: Require test plan in implementation plan (what to test, test types, scope — or why no tests are needed)
  - Step 3: Change review category from "test strategy" to "test plan adequacy" for explicit presence/scope check
  - Step 8: Add "missing or insufficient tests for changes" to Correctness & edge cases category

### dev-workflow v1.6.0 / dev-workflow-bundle v1.6.0

- feat: Pre-register review iterations in Step 1 TodoWrite checklist as sub-items (Step 3-1/3-2/3-3, Step 8-1/8-2/8-3)
  - Iterations visible from workflow start, making skipping structurally harder
  - Step 3/8 rewritten as "process each pending iteration item" instead of loop description
  - Eliminates natural-language loop that AI tends to short-circuit after 1 pass
  - Skip remaining only when reviewer returns "No actionable findings"

### dev-workflow v1.5.0 / dev-workflow-bundle v1.5.0

- feat: Pre-register 3 review iterations as TodoWrite items in Step 3/8
  - Default is "run 3 times"; skip remaining only when reviewer returns "No actionable findings"
  - Prevents short-circuiting reviews after a single iteration

### dev-workflow v1.4.0 / dev-workflow-bundle v1.4.0

- feat: Strengthen code review (Step 8) enforcement to prevent skipping
  - Add TodoWrite-based workflow phase tracking in Step 1 (all phases registered upfront, phase items must remain)
  - Add GATE check between Step 7 and Step 8 (verify prior steps completed)
  - Add `MANDATORY, DO NOT SKIP` marker to Step 8 header
  - Structure review request into 3 categories (Correctness, Conventions, Simplicity)
  - Add iteration status tracking via TodoWrite in Step 8
- fix: Change review loop condition from "code modified" to "actionable feedback remains"
- fix: Use base-commit (`git rev-parse HEAD` at Step 2) instead of `HEAD` for accurate diff across intermediate commits
- feat: Require reviewer to explicitly state "No actionable findings" when no issues found
- feat: Strengthen plan review (Step 3) with same improvements
  - Structure review request into 3 categories (Scope & feasibility, Approach & alternatives, Completeness)
  - Include `.claude/rules/` compliance as explicit review dimension
  - Fix review loop condition from "plan modified" to "actionable feedback remains"
  - Require reviewer to explicitly state "No actionable findings" when no issues found
- chore: Add `Bash(git rev-parse *)` to allowed-tools

## 2026-03-26

### dev-workflow v1.3.0 / dev-workflow-bundle v1.3.0

- feat: Make reviewer skill configurable via `reviewer` setting in `dev-workflow.local.md`
  - Supported: ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot (default: ask-peer)
  - Unsupported or unspecified values fall back to ask-peer
  - Init Mode now includes reviewer selection step
  - All ask-* skills added to allowed-tools
- refactor: Generalize "peer" references in Step 3/8 headings and descriptions
  - `Peer Plan Review` → `Plan Review`, `Peer Code Review` → `Code Review`
  - `Skill({reviewer})` template replaced with natural language instructions

### peer v2.1.0 / dev-workflow-bundle v1.2.1

- feat: Add "Implementation discussion → Structured tradeoff analysis" to Output Format

### dev-workflow v1.2.0 / dev-workflow-bundle v1.2.0

- fix: Make peer re-review loop explicit (Step 3, Step 8)
  - Explicitly specify `Skill(ask-peer)` re-invocation after modifications
  - Require both updated artifact (plan/git diff) and change summary on re-review
  - Clarify iteration counting (max 3 including initial review)
  - Separate success exit (no feedback → next step) from max iterations reached (user decision)

### dev-workflow v1.1.0 / dev-workflow-bundle v1.1.0 (BREAKING)

- **BREAKING**: Remove `lint_command`/`format_command`/`test_command`. Re-run `/dev-workflow --init` required
- feat: Replace single command config with array-based categories
  - `lint_command`/`format_command`/`test_command` → `check_commands`/`test_commands`
  - `check_commands`: Multiple static checks (lint, format, typecheck, etc.) as array
  - `test_commands`: Multiple test commands (unit, e2e, integration, etc.) as array
- feat: Support `Skill()` entries in test_commands for skill-based test execution
- feat: Improve Init Mode to detect multiple check/test commands
- fix: Clarify Step 7 flow (check failure blocks test execution, fallback to run all tests when uncertain)
- chore: Expand allowed-tools (`bun run`, `pnpm exec`, `uv run`, `make typecheck`, `make check`)

### translate v1.1.1

- fix: Strengthen agent prompts to prevent chat mode on short inputs
  - tr (haiku): Change role to "translation engine", explicitly prohibit greetings/questions/self-introduction
  - tr-hq (sonnet): Add task boundary constraint while preserving expert role definition
  - Add short English input example (`hello` → `こんにちは`) to both agents

### peer v2.0.0 (BREAKING)

- refactor: Convert from plugin to standalone skill
  - Embed peer agent personality directly in SKILL.md
  - Remove `plugins/peer/` directory (agent file + plugin.json)
  - Spawn peer subagent via Agent tool instead of dedicated agent type
  - **Breaking**: `subagent_type: "peer"` is no longer available. Use `/ask-peer` skill instead.

### dev-workflow v1.0.0 / dev-workflow-bundle v1.0.0

- feat: Add guided development workflow skill
  - Orchestrates: plan → peer review → implement → lint/format/test → code review → rules update
  - `--init` mode for project setup (auto-detect lint/format/test commands)
  - Peer plan review and code review with `.claude/rules/` reference
  - Review loops with max 3 iterations
  - Automatic rule extraction via extract-rules `--from-conversation`
- feat: Add dev-workflow-bundle (skills-only)
  - All-in-one install: dev-workflow + ask-peer + extract-rules

## 2026-03-25

### ask-codex v1.2.0 / ask-gemini v1.2.0 / ask-copilot v1.0.2

- feat: Add conversation continuation support
  - ask-codex: `codex exec resume --last "prompt"` to resume the most recent session (dedicated section)
  - ask-gemini: `gemini --resume latest -p "prompt"` to resume the most recent session
- fix(ask-gemini): Use `-p` flag consistently for non-interactive mode
  - Quick start, all examples, and notes updated to use `-p` instead of positional args
  - Added `-p` to common options table
- fix(ask-copilot): Add follow-up prompt to continuation example (consistent with other ask-* skills)

## 2026-03-16

### extract-rules v1.9.1 / merge-rules v1.1.1

- fix: Standardize all section headings (`#`, `##`, `###`) and reference labels to English regardless of `language` setting
  - Remove i18n heading tables and language-aware label switching (`判断に迷った場合` / `When in doubt` → `When in doubt` fixed)
  - `language` setting now only affects rule content (Good/Bad examples, descriptions) and reports
- refactor: Unify `## Common patterns` into `## Project-specific patterns` in merge-rules output
  - Eliminates separate section for promoted patterns — input/output section names now match
  - Simplifies re-merging of merge-rules output
- fix: Add explicit `###` title matching rule (must match rule file names exactly, no translation/rephrasing)
  - extract-rules: Added to SKILL.md and examples-format.md with concrete examples
  - merge-rules: Added to Step 5.5 output constraints

### ask-codex v1.1.3 / ask-gemini v1.1.2

- fix: Update outdated model names in SKILL.md examples
  - ask-codex: `o4-mini` → `gpt-5.3-codex` (Codex CLI flagship model)
  - ask-gemini: `gemini-2.5-pro` → `gemini-3.1-pro-preview` (gemini-3-pro-preview was deprecated on 2026-03-09)

### extract-rules v1.9.0

- feat: Add `.examples.md` generation for Good/Bad code examples per rule category
  - Separate from rule files (no `paths:` frontmatter) — not auto-loaded into context
  - Good/Bad contrast for principles, usage examples for project-specific patterns
  - All modes support `.examples.md` (Full Extraction, Update, Restructure, Conversation, PR Review)
  - Format specification externalized to `references/examples-format.md`
  - Quality criteria added to `references/extraction-criteria.md`
- feat: Add `language` resolution chain: skill config → Claude Code settings → default `ja`
  - **Note**: Default changed from `(none)` (English) to `ja`. To keep English output, set `language: en` in config
- fix: `language` description updated to reflect usage in both reports and generated labels

### merge-rules v1.1.0

- feat: Add `.examples.md` merge support
  - Merge Principles Examples by section heading (adopt most detailed or merge Good/Bad)
  - Project-specific Examples linked to promoted patterns via semantic matching
  - Output under `## Common patterns Examples` section
- feat: Add hybrid format (`split_output: false`) input support
  - Detect `## Project-specific patterns` in `.md` files and treat as promotion candidates
- feat: Add `language` resolution chain: skill config → Claude Code settings → default `ja`
- fix: `promote_threshold` example corrected (`4 projects → 3/4`, not `2/4`)
- fix: Report template switched to English base with `language` setting support

## 2026-03-14

### extract-rules v1.8.0

- feat: Add `resolve_references` setting for `--restructure` mode
  - Scan existing rule files for references (Markdown links, text references, `@path`) and resolve them
  - Extract rules from referenced files and merge into the restructure pipeline
  - Referenced rules treated as existing rules (take priority on conflict)
  - Detailed processing steps externalized to `references/resolve-references.md`

### extract-rules v1.7.0

- feat: Reframe extraction criteria around "Claude's knowledge gap"
  - Core question changed from "Is this project-specific?" to "Would Claude produce something different without this rule?"
  - Anti-pattern extraction added (things Claude would naturally do that the team has rejected)
- feat: Add staleness check in `--update` mode
  - Verifies referenced symbols in `.local.md` still exist in codebase
  - Reports potentially stale rules for user review (no auto-deletion)
- feat: Add deduplication check against existing CLAUDE.md and `.claude/rules/`
  - Prevents extracting rules already documented elsewhere
- improve: Enhance `--from-conversation` mode
  - User corrections explicitly identified as highest-value signal
  - Guidance to run soon after corrections (before context compaction)

## 2026-03-13

### extract-rules v1.6.0

- feat: Add `--from-pr` mode to extract coding rules from PR review comments
  - Fetches inline review comments, general PR comments, and review bodies via `gh` CLI
  - Filters out bot comments automatically
  - Uses PR diff context for better pattern understanding
  - Supports both PR number (current repo) and GitHub URL (any repo)

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
