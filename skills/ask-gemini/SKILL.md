---
name: ask-gemini
description: Asks Gemini CLI for coding assistance. Use for getting a second opinion, code generation, debugging, or delegating coding tasks.
allowed-tools: Bash(gemini *)
---

# Ask Gemini

Executes the local `gemini` CLI to get coding assistance.

**Note:** This skill requires the `gemini` CLI to be installed and available in your system's PATH.

## Quick start

Run a single query with `-p` (non-interactive mode):

```bash
gemini -p "Your question or task here"
```

## Common options

| Option | Description |
|--------|-------------|
| `-p` | Non-interactive mode (required for scripting) |
| `-m MODEL` | Specify model |
| `-y, --yolo` | Auto-approve all tool executions |
| `-r, --resume latest` | Resume the most recent session |

> For all available options, run `gemini --help`

## Examples

**Ask a coding question:**

```bash
gemini -p "How do I implement a binary search in Python?"
```

**Use a specific model:**

```bash
gemini -p -m <model> "Review this code for potential issues"
```

**Let Gemini make changes automatically:**

```bash
gemini -y -p "Refactor this function to use async/await"
```

**Continue a previous session:**

```bash
gemini --resume latest -p "Now add error handling to that function"
```

## Notes

- The `-p` flag runs Gemini non-interactively and outputs result to stdout
- Gemini CLI uses the `GEMINI_API_KEY` environment variable for authentication
- Use `-y/--yolo` for automatic execution without confirmation prompts
- The command inherits the current working directory
