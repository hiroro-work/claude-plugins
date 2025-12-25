# Claude Plugins

Claude Code plugins for integrating with AI coding assistants.

## Plugins

| Plugin | Type | Description |
|--------|------|-------------|
| ask-claude | Skill | Get a second opinion from another Claude instance |
| ask-codex | Skill | Get a second opinion from OpenAI Codex |
| ask-gemini | Skill | Get a second opinion from Google Gemini |
| peer | Agent + Skill | Peer engineer for code review, planning, and brainstorming |

## Installation

### 1. Add marketplace

```bash
claude plugin marketplace add hiroro-work/claude-plugins
```

### 2. Install plugins

```bash
claude plugin install ask-claude@hiropon-plugins
claude plugin install ask-codex@hiropon-plugins
claude plugin install ask-gemini@hiropon-plugins
claude plugin install peer@hiropon-plugins
```

## Requirements

- **ask-claude**: Requires `claude` CLI
- **ask-codex**: Requires `codex` CLI
- **ask-gemini**: Requires `gemini` CLI
- **peer**: No external dependencies (runs as Claude subagent)

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
