# Claude Plugins

Claude Code plugins for integrating with AI coding assistants.

## Plugins

| Plugin | Description |
|--------|-------------|
| ask-claude | Get a second opinion from another Claude instance |
| ask-codex | Get a second opinion from OpenAI Codex |
| ask-gemini | Get a second opinion from Google Gemini |

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
```

## Requirements

- **ask-claude**: Requires `claude` CLI
- **ask-codex**: Requires `codex` CLI
- **ask-gemini**: Requires `gemini` CLI
