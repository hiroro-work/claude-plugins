# Claude Plugins

Claude Code plugins for integrating with AI coding assistants.

## Plugins

| Plugin | Type | Description |
|--------|------|-------------|
| ask-claude | Skill | Get a second opinion from another Claude instance |
| ask-codex | Skill | Get a second opinion from OpenAI Codex |
| ask-gemini | Skill | Get a second opinion from Google Gemini |
| peer | Agent + Skill | Peer engineer for code review, planning, and brainstorming |
| translate | Agent + Skill | AI-powered translation with /tr command (configurable quality) |
| security-scanner | Skill | Scan plugins and skills for security risks |

## Installation

### Via Skills.sh (Claude Code, Cursor, Copilot, etc.)

```bash
npx skills add hiroro-work/claude-plugins
```

Available skills: `ask-claude`, `ask-codex`, `ask-gemini`, `security-scanner`

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
/plugin install peer@hiropon-plugins
/plugin install translate@hiropon-plugins
/plugin install security-scanner@hiropon-plugins
```

## Requirements

- **ask-claude**: Requires `claude` CLI
- **ask-codex**: Requires `codex` CLI
- **ask-gemini**: Requires `gemini` CLI
- **peer**: No external dependencies (runs as Claude subagent)
- **translate**: No external dependencies (runs as Claude subagent)
- **security-scanner**: No external dependencies

## Usage

### Skill Plugins (ask-claude, ask-codex, ask-gemini)

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

## License

MIT License
