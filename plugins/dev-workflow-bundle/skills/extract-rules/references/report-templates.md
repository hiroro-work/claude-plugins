# Report Templates

Report template for Full Extraction Mode. Every other mode carries its template in its own procedure reference.

## Full Extraction Mode (Step 7)

````markdown
## Extraction Complete

**Project**: [project name]
**Languages**: [detected languages]
**Frameworks**: [detected frameworks]
**Integrations**: [detected integrations]
**Analyzed files**: [count]

### Generated Files

| File | Principles | Patterns | Examples |
|------|------------|----------|----------|
| languages/typescript.md | 3 | 5 | 8 |
| frameworks/react.md | 2 | 8 | 10 |
| integrations/rails-inertia.md | 1 | 4 | 5 |
| project.md | - | architecture, conventions | 3 |

**Examples** = total number of `###` example entries in the corresponding `.examples.md` file (Principles Examples + Project-specific Examples combined).

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
