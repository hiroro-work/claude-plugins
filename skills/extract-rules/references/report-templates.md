# Report Templates

Reference templates for each mode's output report.

## Full Extraction Mode (Step 7)

````markdown
## Extraction Complete

**Project**: [project name]
**Languages**: [detected languages]
**Frameworks**: [detected frameworks]
**Integrations**: [detected integrations]
**Analyzed files**: [count]

### Generated Files

| File | Principles | Patterns |
|------|------------|----------|
| languages/typescript.md | 3 | 5 |
| frameworks/react.md | 2 | 8 |
| integrations/rails-inertia.md | 1 | 4 |
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

## Update Mode (Step U6)

```markdown
## Update Complete

### New files:
| File | Principles | Patterns |
|------|------------|----------|
| frameworks/nextjs.md | 2 | 3 |

### Added to languages/typescript.md:
#### Principles
- (none)

#### Project-specific patterns
- `useNewFeature()` returns `{ data, refresh }` - new feature hook

### Added to frameworks/react.md:
- (none)

### Unchanged files:
- project.md

### Potentially stale rules:
| File | Pattern | Reason |
|------|---------|--------|
| languages/typescript.local.md | `useOldHook()` | Symbol not found in codebase |

**Tip**: Review added rules and remove any that are incorrect or redundant. Check stale rules — they may have been renamed or removed.
```

## Restructure Mode (Step R5)

```markdown
## Restructure Complete

**Project**: [project name]
**Languages**: [detected languages]
**Frameworks**: [detected frameworks]
**Integrations**: [detected integrations]

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

### Resolved References

| Source File | Referenced File | Extracted |
|-------------|----------------|-----------|
| project.md | docs/conventions.md | 2 principles, 3 patterns |
| languages/typescript.md | @docs/ts-guidelines.md | 1 principle |

### Unresolved References

| Source File | Reference | Reason |
|-------------|-----------|--------|
| project.md | https://wiki.example.com/style | URL (skipped) |
| frameworks/react.md | docs/old-patterns.md | File not found |

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

## PR Review Extraction Mode (Step P5)

**Single PR:**

```markdown
## Extracted from PR Review

**PR**: #123 - PR title
**Comments analyzed**: 15 (3 bot comments filtered)

### Added to frameworks/rails.local.md:
#### Project-specific patterns
- `fetchWithRetry(url, options)` - API call wrapper with retry

### No changes:
- No project-specific rules found in general feedback
```

**Multiple PRs:**

```markdown
## Extracted from PR Review (cross-PR analysis)

**PRs analyzed**: 5
| PR | Title | Comments |
|----|-------|----------|
| #123 | Feature A | 12 |
| #456 | Fix B | 8 |
| org/other#78 | Refactor C | 15 |
| #789 | Feature D | 6 |
| #101 | Update E | 9 |

**Total comments**: 50 (7 bot comments filtered)

### Added to frameworks/rails.md:
#### Principles (organizational emphasis — recurring across PRs)
- DRY厳格 (ビジネス値の定数化を徹底, ビューへのハードコード禁止)

### Added to frameworks/rails.local.md:
#### Project-specific patterns
- `fetchWithRetry(url, options)` - API call wrapper with retry

### Skipped (general knowledge, single PR only):
- const over let (PR #123 only)
- Early returns (PR #456 only)
```
