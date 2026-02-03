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

## Installation

### Via Skills.sh (Claude Code, Cursor, Copilot, etc.)

```bash
npx skills add hiroro-work/claude-plugins
```

Available skills: `ask-claude`, `ask-codex`, `ask-gemini`, `ask-copilot`, `security-scanner`, `extract-rules`

> Note: Agent features (peer, translate) are only available via Claude Code Plugin Marketplace.

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

### Skill Plugin (extract-rules)

Extract project-specific coding rules and domain knowledge from your codebase, generating structured markdown documentation for AI agents.

```bash
/extract-rules                      # Extract rules from codebase (initial)
/extract-rules --update             # Re-scan and add new patterns (preserve existing)
/extract-rules --force              # Overwrite all rule files
/extract-rules --from-conversation  # Extract rules from conversation
```

Output files are generated in `.claude/rules/` directory.

## License

MIT License
