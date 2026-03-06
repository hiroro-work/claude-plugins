# Claude Plugins

Claude Code plugins for integrating with AI coding assistants.

## Plugins

| Plugin | Type | Description |
|--------|------|-------------|
| ask-claude | Skill | Get a second opinion from another Claude instance |
| ask-codex | Skill | Get a second opinion from OpenAI Codex |
| ask-gemini | Skill | Get a second opinion from Google Gemini |
| ask-copilot | Skill | Get a second opinion from GitHub Copilot |
| peer | Agent + Skill | Peer engineer for code review, planning, and brainstorming |
| translate | Agent + Skill | AI-powered translation with /tr command (configurable quality) |
| security-scanner | Skill | Scan plugins and skills for security risks |
| extract-rules | Skill | Extract project-specific coding rules from codebase for AI agents |
| merge-rules | Skill | Merge portable coding rules from multiple projects into a unified rule set |
| caffeinate | Plugin | Manage macOS caffeinate to prevent system sleep |

## Installation

### Via Skills.sh (Claude Code, Cursor, Copilot, etc.)

```bash
npx skills add hiroro-work/claude-plugins
```

Available skills: `ask-claude`, `ask-codex`, `ask-gemini`, `ask-copilot`, `security-scanner`, `extract-rules`, `merge-rules`

> Note: Agent features (peer, translate) and hook features (caffeinate) are only available via Claude Code Plugin Marketplace.

### Via Claude Code Plugin Marketplace (Full features)

#### 1. Add marketplace

```bash
/plugin marketplace add hiroro-work/claude-plugins
```

#### 2. Install plugins

```bash
/plugin install ask-claude@hiropon-plugins
/plugin install ask-codex@hiropon-plugins
/plugin install ask-gemini@hiropon-plugins
/plugin install ask-copilot@hiropon-plugins
/plugin install peer@hiropon-plugins
/plugin install translate@hiropon-plugins
/plugin install security-scanner@hiropon-plugins
/plugin install extract-rules@hiropon-plugins
/plugin install merge-rules@hiropon-plugins
/plugin install caffeinate@hiropon-plugins
```

## Requirements

- **ask-claude**: Requires `claude` CLI
- **ask-codex**: Requires `codex` CLI
- **ask-gemini**: Requires `gemini` CLI
- **ask-copilot**: Requires `copilot` CLI
- **peer**: No external dependencies (runs as Claude subagent)
- **translate**: No external dependencies (runs as Claude subagent)
- **security-scanner**: No external dependencies
- **extract-rules**: No external dependencies
- **merge-rules**: No external dependencies (requires extract-rules output from multiple projects)
- **caffeinate**: macOS only (`caffeinate` command)

## Usage

### Skill Plugins (ask-claude, ask-codex, ask-gemini, ask-copilot)

These plugins provide `/ask-*` commands for getting second opinions from other AI assistants.

### Agent + Skill Plugin (peer)

The peer plugin provides both an agent and a skill:

- **Agent**: Automatically triggered by Claude Code when peer consultation is needed
- **Skill**: Invoke with `/ask-peer` command for explicit consultation

Use cases:

- Planning review before implementation
- Code review after completing work
- Brainstorming for problem-solving
- A second opinion on your approach

### Plugin (caffeinate)

Prevent macOS system sleep during long-running sessions using `caffeinate`.

```bash
/caffeinate            # Start caffeinate
/caffeinate stop       # Stop caffeinate
/caffeinate status     # Check status
```

Automatically stops on session end via SessionEnd hook.

### Skill Plugin (extract-rules)

Extract project-specific coding rules and domain knowledge from your codebase, generating structured markdown documentation for AI agents.

```bash
/extract-rules                      # Extract rules from codebase (initial)
/extract-rules --update             # Re-scan and add new patterns (preserve existing)
/extract-rules --restructure        # Re-analyze, reorganize structure, merge existing rules
/extract-rules --from-conversation  # Extract rules from conversation
```

Output files are generated in `.claude/rules/` directory.

**Configuration** (optional): Create `.claude/extract-rules.local.md` with YAML frontmatter to customize target directories, exclusions, output language, and split output mode. See SKILL.md for details.

### Skill Plugin (merge-rules)

Merge extract-rules output from multiple projects into a unified portable rule set. Promotes `.local.md` patterns shared across projects.

```bash
/merge-rules                    # Merge using config file
/merge-rules --config <path>    # Merge using specified config file
/merge-rules --dry-run          # Show what would be merged without writing
```

**Configuration** (required): Create `.claude/merge-rules.local.md` with YAML frontmatter listing source projects. See SKILL.md for details.

## License

MIT License
