# Translate Plugin

AI-powered translation plugin for Claude Code using subagents.

## Features

- Auto-detects translation direction (Japanese → English, other languages → Japanese)
- Configurable translation quality (haiku or sonnet)
- Support for multiple target languages with `--to` option

## Usage

```bash
# Basic translation (auto-detect direction)
/tr こんにちは          # Japanese → English
/tr Hello              # English → Japanese
/tr Bonjour            # French → Japanese (non-Japanese defaults to Japanese)

# Specify source/target language
/tr --to zh Hello      # → Chinese
/tr --from ja Konnichiwa  # Japanese → English
/tr --from en --to ja Hello  # English → Japanese

# Quality options
/tr --hq <text>        # High-quality (sonnet)
/tr --fast <text>      # Standard (haiku)
```

## Configuration

Create `.claude/translate.local.md` to customize defaults:

```markdown
---
default_quality: hq      # Change default to high-quality (sonnet)
primary_language: ja     # Detect this language
secondary_language: en   # Translate to this when primary detected
---
```

### Options

| Setting | Values | Default | Description |
|---------|--------|---------|-------------|
| `default_quality` | `fast`, `hq` | `fast` | Default translation quality |
| `primary_language` | language code | `ja` | Language to detect |
| `secondary_language` | language code | `en` | Target when primary detected |

### Behavior Matrix

| Setting | No option | `--hq` | `--fast` |
|---------|-----------|--------|----------|
| `fast` | haiku | sonnet | haiku |
| `hq` | sonnet | sonnet | haiku |

## Models

- **haiku** (`standard`/`--fast`): Fast and cost-effective
- **sonnet** (`hq`/`--hq`): Higher quality for professional translations

## Notes

- Add `.claude/*.local.md` to `.gitignore`
- If both `--hq` and `--fast` are specified, `--hq` takes priority
- Option priority: `--to`/`--from` > settings file > default (ja→en)
- If settings file is missing or invalid, defaults to `fast` quality and ja/en languages
