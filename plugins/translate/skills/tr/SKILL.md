---
name: tr
description: Translate text between Japanese and English. Auto-detects source language. Use --hq for high-quality (sonnet), --fast for standard (haiku).
---

# Translate

Translate text using Claude subagents.

## Usage

```
/tr <text to translate>
/tr --to <lang> <text to translate>
/tr --from <lang> <text to translate>
/tr --hq <text to translate>
/tr --fast <text to translate>
```

## Options

- `--hq`: Force high-quality translation (sonnet model)
- `--fast`: Force standard translation (haiku model)
- `--to <lang>`: Specify target language (e.g., `zh`, `fr`, `ko`)
- `--from <lang>`: Specify source language (e.g., `ja`, `en`, `zh`)

## Configuration

Users can configure defaults in `translate.local.md`:

- **Project-level**: `.claude/translate.local.md` (takes precedence)
- **User-level**: `~/.claude/translate.local.md`

If both files exist, **project-level settings take precedence**.

```markdown
---
default_quality: hq      # or "fast" (default)
primary_language: ja     # Language to detect (default: ja)
secondary_language: en   # Default target when primary detected (default: en)
---
```

## Examples

```
/tr こんにちは
/tr Hello, how are you?
/tr Bonjour               # French → Japanese (default)
/tr --to zh Hello, world!
/tr --from ja Konnichiwa
/tr --from en --to ja Hello
/tr --hq この文章を翻訳してください
/tr --fast --to fr Hello, world!
```

## Execution

1. **Check for settings file**: Search for `translate.local.md` in the following locations:
   1. **Project-level**: `.claude/translate.local.md`
   2. **User-level**: `~/.claude/translate.local.md`

   Settings file resolution:
   - If both files exist, use project-level settings only (project-level takes precedence)
   - If only one file exists, use that file
   - If neither file exists, proceed with default settings

   Parse YAML frontmatter for settings:
   - `default_quality`: If `hq`, default to sonnet model
   - `primary_language`: Language to detect (default: `ja` for Japanese)
   - `secondary_language`: Target when primary detected (default: `en` for English)
   - If file is missing or invalid, use defaults: `fast` quality, `ja`/`en` languages

2. **Parse options**:
   - If `--hq` is present → use `tr-hq` agent (sonnet)
   - If `--fast` is present → use `tr` agent (haiku)
   - If both `--hq` and `--fast` → `--hq` takes priority
   - If neither → use default from settings (or haiku if no settings)

3. **Construct prompt for agent**: Build the prompt with settings and text
   - Priority: `--to`/`--from` options override settings file, which overrides defaults
   - If custom languages are configured, prefix with: `primary: <primary_language>, secondary: <secondary_language>`
   - If `--from <lang>` is specified, include: `--from <lang>`
   - If `--to <lang>` is specified, include: `--to <lang>`
   - Append the user's text to translate

4. **Invoke agent**: Use Task tool with the appropriate agent (`tr` or `tr-hq`)

5. **Return result**: The agent returns only the translated text
