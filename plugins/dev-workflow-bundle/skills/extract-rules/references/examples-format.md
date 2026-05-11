# Examples File Format (.examples.md)

Reference guide for generating and updating `.examples.md` files.

## Purpose

`.examples.md` files provide Good/Bad code examples that help Claude apply rules correctly. They are intentionally separated from rule files (no `paths:` frontmatter) so they are NOT auto-loaded into context — Claude reads them only when needed for clarification.

## File Structure

Always generate one `.examples.md` per rule category (regardless of `split_output` setting). When `split_output: true`, the `.examples.md` combines examples for both `.md` principles and `.local.md` patterns in one file.

**Section headings (`#`, `##`) are always in English regardless of the `language` setting.** Only the rule content (Good/Bad examples, descriptions) follows the `language` setting.

**Example title (`###`) must match the corresponding rule name in the rule file.** Do not translate or rephrase the extracted title. This ensures a clear 1:1 mapping between rules and their examples.

- **Principles**: Use the principle name (text before parenthetical hints)
  - Rule: `- FP only (no classes, pure functions, composition over inheritance)` → `### FP only`
  - Rule: `- Concern分離 (共有ロジックは concerns/ に抽出)` → `### Concern分離`
- **Project-specific patterns**: Use the signature portion (backtick content)
  - Rule: `` - `useAuth() → { user, login, logout }` - auth hook interface `` → `` ### `useAuth() → { user, login, logout }` ``
  - Rule: `` - `clean_bracket_params(:keyword)` - WAF付加のブラケット除去 `` → `` ### `clean_bracket_params(:keyword)` ``

```markdown
# <Category> Rules - Examples

## Principles Examples

### <Principle name from rule file>
**Good:**
```<lang>
<actual code from codebase demonstrating correct usage>
```
**Bad:**
```<lang>
<anti-pattern found in codebase or typical AI-generated code>
```

## Project-specific Examples

### <Pattern signature from rule file>
```<lang>
<usage example from codebase>
```
```

- No `paths:` frontmatter (prevents auto-loading into context)
- Skip generating the file if no examples exist for any rule in the category

## Relationship with merge-rules

When merge-rules promotes project-specific patterns to Principles, it converts the pattern format and moves examples to `## Principles Examples`:
- Pattern `` `useAuth() → { user, login, logout }` - auth hook interface `` → Principle `Auth hook interface (useAuth)`
- Pattern example under `## Project-specific Examples` → moved to `## Principles Examples` with the converted principle name as `###` title

After apply-rules applies merged org rules, a project's `.examples.md` may contain both:
- `## Principles Examples` — includes examples for both original principles and promoted patterns
- `## Project-specific Examples` — project-local patterns that were not promoted

apply-rules automatically cleans up duplicates: when a `.local.md` pattern is removed because it matches a promoted Principle, the corresponding `## Project-specific Examples` entry is also removed.

## Good/Bad Contrast Guidelines

- **Principles**: Use Good/Bad contrast. Good examples from actual codebase, Bad from actual anti-patterns or typical Claude-generated code
- **Project-specific patterns**: Good examples only (usage demonstration). Bad is optional

See `extraction-criteria.md` "Example Quality Criteria" section for detailed quality criteria and the decision table for when Good/Bad contrast is effective.

## Reference Section in Rule Files

Each rule file (`.md` and `.local.md`) that has a corresponding `.examples.md` must end with a reference section:

```markdown
## Examples
When in doubt: ./<name>.examples.md
```

**Direction is one-way: rule file → examples file only.** `.examples.md` files themselves never carry a `## Examples` reference section — no self-reference (link to themselves), no link to a sibling `.examples.md`. When generating or updating an examples file, do not append a reference section. Templates and subagent prompts that scaffold examples files must omit this section.

## Common Generation Procedure

This procedure applies to all modes (Full Extraction, Update, Restructure, Conversation, PR Review). After generation, run the Portability check (below).

### For Full Extraction / Restructure

Examples are generated alongside rule files. Since the codebase has already been analyzed in earlier steps, use the code patterns already collected to create examples.

### For Update / Conversation / PR Review (incremental modes)

For each new rule added:

1. **Search the codebase** (using Grep/Read) to find actual code examples that demonstrate the rule
2. **For principles**: Find Good examples in the codebase; for Bad, look for older/refactored code or use typical Claude output as contrast
3. **For project-specific patterns**: Find actual usage sites in the codebase
4. **If no relevant code can be found** (e.g., the rule is about something not yet implemented): skip the example for now
5. Append to the `.examples.md` file. Create `.examples.md` if it doesn't exist

## Portability check (post-generation)

After writing each example + description, re-read the pair and ask: "Does this description hold for every call site of this pattern, or does it leak assumptions from the specific site it was mined from?"

Common leaks:

- **Test-file origin**: unit-test samples often describe the pattern in test-isolation terms. Either rewrite the description in production-contract terms with a production Good example, or add a `test-only` qualifier to the rule title
- **Specific-site framing**: description references local variables / fixture names. Rewrite in terms of the pattern's contract

Applies to all modes (Full Extraction, Update, Restructure, Conversation, PR Review).
