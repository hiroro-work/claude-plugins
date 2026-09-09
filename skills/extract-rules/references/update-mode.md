# Update Mode (extracted from `SKILL.md` ## Update Mode)

Deep reference for `SKILL.md` **Update Mode**. The `### Mode Detection` entry that routes `--update` here stays inline in the parent. Unqualified references resolve as follows: `Step U1`–`Step U6` name sections of this file; `Step 1`, `Step 2-5`, `Step 6` and `Step 6.5` name `SKILL.md` § Full Extraction Mode steps; `§ Step C5` names `references/conversation-mode.md`.

When `--update` is specified, re-scan the codebase and add new patterns while preserving existing rules.

**Staging awareness**: Update Mode reads the staging file under `staging_output_dir` (when present), promotes staged project-level patterns that re-match fresh code observations to `<output_dir>/project.md`, and writes no new staging entries — un-matched new patterns land directly in canonical. Per-mode staging behavior: `references/conversation-mode.md` § Mode interaction summary.

### Step U1: Load Settings and Check Prerequisites

1. Load settings from `extract-rules.local.md` (same as Step 1 in Full Extraction Mode)

2. Check if output directory exists (default: `.claude/rules/`)
   - If not exists: Error "Run /extract-rules first to initialize rule files."
   - If `split_output: true` and hybrid files exist (`.md` files containing both `## Principles` and `## Project-specific patterns`): warn that hybrid files were found — recommend running `--restructure` to migrate to split format
   - If `split_output: false` and `.local.md` files exist: warn that orphaned `.local.md` files were found — recommend deleting orphaned files manually or running `--restructure`

3. Load existing rule files (`SKILL.md` § Step 1's **"Load existing rule files"** paragraph). The staging file it loads is what the Step U4 staging-match branch reads.

### Step U2: Re-scan Codebase

Execute Step 2-5 from Full Extraction Mode:
- Detect project type
- Collect sample files
- Analyze by category
- Analyze documentation

### Step U3: Staleness Check

Before adding new rules, check existing project-specific patterns for staleness:

1. Collect patterns from `## Project-specific patterns` sections:
   - When `split_output: true`: from `.local.md` files
   - When `split_output: false`: from `## Project-specific patterns` sections in `.md` files
2. For each pattern that has an inline code signature (`` `symbol` ``), verify the symbol still exists in the codebase using Grep
   - Skip patterns without searchable symbols (e.g., principles, anti-patterns like "No default exports")
   - For combination patterns (e.g., `` `pathFor() + url()` ``), check each symbol individually
3. Patterns whose symbols can no longer be found → Flag as potentially stale in the Step U6 report
4. Do NOT auto-delete stale rules — only report them for user review

### Step U4: Compare and Merge

For each extracted principle/pattern:

1. **Check if already exists**: Compare with existing rules (check both shared and local files if `split_output: true`). Evaluate the branches below in order, first match wins:
   - Exact match → Skip
   - Similar but different → Keep both (let user review)
   - **Cross-format duplicate check**: A project-specific pattern may have been promoted to a Principle by merge-rules. Check if the pattern's description semantically matches an existing principle name in the corresponding `.md` file (use AI judgment: case-insensitive, synonyms). For example, `` `useAuth() → { user, login, logout }` - auth hook interface `` is a duplicate of `Auth hook interface (useAuth)` in `## Principles`. Skip patterns that already exist as Principles.
   - **Staging match (project-level patterns only)**: per `references/conversation-mode.md` § Step C5's "staging-match criterion" paragraph, schedule a **promote** in Step U5. Update Mode does not write new staging entries; un-matched project-level patterns land directly in canonical.
   - New → Add

2. **Preserve manual edits**: Do not modify existing rules

### Step U5: Append New Rules

1. **New category detected** (e.g., new framework/language): Create new rule files following Step 6 format. Report as "New" in Step U6.
2. Append new principles to `## Principles` section
3. Append new project-specific patterns to `## Project-specific patterns` section
4. **When `split_output: true`**: Principles go to `<output_dir>/<name>.md`, patterns go to `<output_dir>/<name>.local.md`. Create missing files with proper frontmatter.
5. For `<output_dir>/project.md`: always append to the single file
6. Maintain file structure and formatting
7. **Update `.examples.md`**: Resolve the target path via `examples_output_dir` (`<examples_output_dir>/<name>.examples.md`). Create the file (and any missing parent directories under `examples_output_dir`) when absent. Follow the common generation procedure in `references/examples-format.md` to add examples for each new rule. Promotes from staging (item 8) count as canonical writes and get an entry too.
8. **Promote staging matches** (project-level patterns flagged in Step U4): append each to `<output_dir>/project.md` per item 5, then delete the matched staging bullet — move atomicity and the staging-delete failure disposition are `references/conversation-mode.md` § Step C5 items 4–5.

### Step U5.5: Security Self-Check

Run Security Self-Check (same as Step 6.5) on new/updated files, **including the staging file** if any staging-delete edits landed in Step U5 (the staging file was rewritten by the staging-delete `Edit`).

### Step U6: Report Changes

Report what was added per file. Also report any stale rules found in Step U3. Include `canonical_skip_count` and `promoted_count` (Update Mode never increments `staged_count`). See § Report format (Step U6).

## Report format (Step U6)

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

#### Examples (typescript.examples.md)
- Added example for `useNewFeature()`

### Added to frameworks/react.md:
- (none)

### Promoted from staging (2nd observation, matched by --update):
- `formatCurrency(amount, currency)` - locale-aware money formatter  (→ .claude/rules/project.md)

### Unchanged files:
- project.md

### Potentially stale rules:
| File | Pattern | Reason |
|------|---------|--------|
| languages/typescript.local.md | `useOldHook()` | Symbol not found in codebase |

**Tip**: Review added rules and remove any that are incorrect or redundant. Check stale rules — they may have been renamed or removed.
```

The `### Promoted from staging (2nd observation, matched by --update):` section is omitted when `promoted_count == 0`. Update Mode never writes new staging entries (so no `### Newly staged` section here — `staged_count` is always 0; see § Step U6 for the counter contract).
