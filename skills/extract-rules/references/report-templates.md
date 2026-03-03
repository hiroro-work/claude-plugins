# Report Templates

Reference templates for each mode's output report.

## Full Extraction Mode (Step 7)

````markdown
## Extraction Complete

**Project**: [project name]
**Languages**: [detected languages]
**Frameworks**: [detected frameworks]
**Analyzed files**: [count]

### Generated Files

| File | Principles | Patterns |
|------|------------|----------|
| languages/typescript.md | 3 | 5 |
| frameworks/react.md | 2 | 8 |
| project.md | - | architecture, conventions |

**Output**: `<output_dir>` (default: .claude/rules/)

### Recommended Actions

1. Review generated rules and edit if needed
2. Add reference to CLAUDE.md:
   ```markdown
   ## Coding Rules
   See .claude/rules/ for project-specific coding rules.
   ```
3. Re-run with `/extract-rules --update` when codebase evolves
````

## Update Mode (Step U5)

```markdown
## Update Complete

### Added to languages/typescript.md:
#### Principles
- (none)

#### Project-specific patterns
- `useNewFeature()` returns `{ data, refresh }` - new feature hook

### Added to frameworks/react.md:
- (none)

### Unchanged files:
- project.md

**Tip**: Review added rules and remove any that are incorrect or redundant.
```

## Restructure Mode (Step R5)

```markdown
## Restructure Complete

**Project**: [project name]
**Languages**: [detected languages]
**Frameworks**: [detected frameworks]

### Structural Changes

| Action | File |
|--------|------|
| Kept | languages/typescript.md |
| Created | frameworks/nextjs.md |
| Removed | frameworks/old.md |

### Content Merge Summary

| File | Fresh | Merged from existing | Total |
|------|-------|---------------------|-------|
| languages/typescript.md | 3 principles, 5 patterns | 0 principles, 2 patterns | 3 principles, 7 patterns |

### Unmatched Rules (→ project.md)
- (none)

**Tip**: Review merged files for rules that may have been placed in the wrong category.
```

## Conversation Extraction Mode (Step C4)

```markdown
## Extracted from Conversation

### Added to languages/typescript.md:
#### Principles
- Immutability (spread, map/filter, const)

#### Project-specific patterns
- `RefOrNull<T extends { id: string }> = T | { id: null }` - nullable refs

### No changes:
- Functional style - Already documented
```
