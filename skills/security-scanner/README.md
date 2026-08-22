# Security Scanner

Scans installed Claude Code plugins and agent skills for malicious content — both dangerous code patterns and malicious natural-language instructions. This document is the **configuration reference**; for the instructions Claude follows at runtime, see `SKILL.md`.

## Configuration

Users can configure target agents and trusted sources in `security-scanner.local.md`:

- Project-level: `.claude/security-scanner.local.md` (takes precedence)
- User-level: `~/.claude/security-scanner.local.md`

If both files exist, **project-level settings take precedence**.

```markdown
---
# Report language (default: ja)
# Examples: ja, en, zh, ko, fr, de, etc.
report_language: ja

# Target agents to scan (default: claude only)
# Valid values: claude, codex, gemini, agents
target_agents:
  - claude
  - codex
  - gemini
  - agents

# Trusted sources (skipped during scanning)
trusted_marketplaces:
  - claude-plugins-official    # Skip all plugins from this marketplace
  - my-marketplace

trusted_plugins:
  - plugin-dev@claude-plugins-official    # Skip specific plugin
  - frontend-design@claude-code-plugins

trusted_skills:
  - my-skill                   # Skip specific skill by name (all agents)
---
```

### Report Language

- `report_language`: Language for the security report output
- Any language code is accepted (e.g., `ja`, `en`, `zh`, `ko`, `fr`, `de`)
- Default: `ja` (Japanese)

### Target Agents

- `target_agents`: List of agent IDs to scan skills for
- If not specified or empty, defaults to `["claude"]`
- Valid agent IDs: `claude`, `codex`, `gemini`, `agents`

`SKILL.md` is the source of truth for the accepted keys, the valid `target_agents` values, and every default — Step 1's **Default values** and **Validation** blocks and Step 3's **Agent path mapping** table. This document restates them, so keep the two in sync: adding an agent ID or changing a default sweeps both files in the same commit.

**Symlink note**: For Skills.sh, the skill body is in `.agents/skills/` and other agent directories contain symlinks. Configure `target_agents` appropriately to avoid redundant scanning (e.g., use only `agents` instead of all agents).

### Trusted Sources

**Trusted sources are skipped during scanning.**

- `trusted_marketplaces`: Skip all plugins from these marketplaces
- `trusted_plugins`: Skip specific plugins (format: `plugin-name@marketplace`)
- `trusted_skills`: Skip specific skills by name (applies to all agents)

To add/remove settings, edit `security-scanner.local.md` in `.claude/` (project-level) or `~/.claude/` (user-level).

## Self-exclusion

The scanner excludes itself so its own example threat patterns are not reported as findings. It identifies itself by **path**, not by name — whether it is installed as a plugin or vendored as a plain skill — and the report names the basis each skip rested on.

`SKILL.md` § Step 4's **Self-exclusion** block is the source of truth for the matching rule. This document restates the fallback and the second-copy case for users, so keep the two in sync: changing the matching rule, the fallback, or the second-copy disposition sweeps both files in the same commit.

When the harness reports no base directory the path match cannot run at all, and the scanner falls back to skipping plugins and skills named `security-scanner`. That fallback is the one case where a same-named impostor would also be skipped, which is why the report distinguishes it.

Self-exclusion covers the copy that is actually running. If a second copy of the scanner is installed elsewhere on the same host — a plugin install alongside a vendored `.claude/skills/security-scanner`, say — scanning from one reports the other's threat-pattern list. List the second copy in `trusted_plugins` or `trusted_skills`.

To exclude the scanner explicitly on any host, list it in `trusted_plugins` (or `trusted_skills`), or its marketplace in `trusted_marketplaces`. `--all` disables self-exclusion and all trusted-source filtering.
