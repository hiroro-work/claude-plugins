---
name: merge-rules
description: Merge extract-rules output from multiple projects into a unified portable rule set. Promotes .local.md patterns shared across projects to Principles format.
allowed-tools: Read, Glob, Grep, Write, Bash(ls *), Bash(mkdir *), Bash(wc *)
---

# Merge Rules

Merges `.claude/rules/` from multiple projects into a unified portable rule set (.md + .examples.md). Promotes `.local.md` patterns that appear across a threshold of projects by converting them to Principles format. Merges `.examples.md` files alongside rule files.

## Usage

```text
/merge-rules                    # Merge using config file
/merge-rules --config <path>    # Merge using specified config file
/merge-rules --dry-run          # Show what would be merged without writing
```

## Configuration

Config file search order:
1. `--config <path>` argument
2. `.claude/merge-rules.local.md` (project-level)
3. `~/.claude/merge-rules.local.md` (user-level)

**File format:** YAML frontmatter only (no markdown body), same convention as `extract-rules.local.md`.

```yaml
---
# Source projects (each must have extract-rules output)
projects:
  - ~/projects/frontend-app
  - ~/projects/backend-api
  - ~/projects/shared-lib

# Output directory (default: .claude/rules/)
output_dir: .claude/rules/

# Rules directory within each project (default: .claude/rules/)
# Corresponds to extract-rules' output_dir setting
rules_dir: .claude/rules/

# Threshold for promoting .local.md patterns (default: 0.5 = majority)
# Examples: 3 projects → 2/3 needed, 4 projects → 3/4, 5 projects → 3/5
promote_threshold: 0.5

# Report language (default: ja)
language: ja
---
```

## Processing Flow

### Step 1: Load Configuration

1. Search for config file (see search order above)
   - If not found: Error "No config file found. Create `.claude/merge-rules.local.md` or specify with `--config`."
2. Parse YAML frontmatter, apply defaults for omitted fields
   - **`language` resolution order:** Skill config → Claude Code settings (`~/.claude/settings.json` → `language` field) → default `ja`
3. Validate:
   - `projects` must have at least 2 entries
   - Each project path must exist and contain `rules_dir`
   - Error with clear message if validation fails

### Step 2: Collect Rule Files

For each project:

1. Find all `.md`, `.local.md`, and `.examples.md` files under `{path}/{rules_dir}/` (recursive)
2. Categorize:
   - `languages/*.md` → portable principles (always merge). **If the file also contains `## Project-specific patterns`** (hybrid format from `split_output: false`), treat patterns as promotion candidates (same as `.local.md`)
   - `frameworks/*.md` → same as above
   - `integrations/*.md` → same as above
   - `languages/*.local.md` → promotion candidate
   - `frameworks/*.local.md` → promotion candidate
   - `integrations/*.local.md` → promotion candidate
   - `languages/*.examples.md` → example file (merge with rules)
   - `frameworks/*.examples.md` → example file (merge with rules)
   - `integrations/*.examples.md` → example file (merge with rules)
   - `project.md` → skip (inherently project-specific)
   - `project.examples.md` → skip (inherently project-specific)
3. Parse each file: extract YAML frontmatter (`paths:`) and body sections (`## Principles`, `## Project-specific patterns`, `## Principles Examples`, `## Project-specific Examples`)

### Step 3: Normalize Similar File Names

Before merging, group files that refer to the same concept but have different names. This applies to `.md`, `.local.md`, and `.examples.md` files — a `.md` and its corresponding `.local.md` and `.examples.md` share the same normalization (e.g., `rails-controller.md`, `rails-controller.local.md`, and `rails-controller.examples.md` are normalized together with their `rails-controllers.*` variants).

1. Detect similar file names within the same directory (e.g., `rails-controller.md` vs `rails-controllers.md`, `rails-model.md` vs `rails-models.md`)
   - Singular/plural variants (e.g., `controller` / `controllers`)
   - Minor naming differences for the same concept (use AI judgment based on file content and `paths:` frontmatter overlap)
2. For each group of similar files, select a canonical name:
   - Prefer the name used by the majority of projects
   - If tied, prefer the name matching extract-rules' layered framework convention (e.g., `<framework>-<layer>`)
3. Treat grouped files as the same file for subsequent merge steps (Step 4 and Step 5)
4. Report normalized groups in the summary (e.g., "`rails-controller.md` + `rails-controllers.md` → `rails-controllers.md`")

### Step 4: Merge Portable Rules (.md)

**Design note:** Once a pattern is promoted to a Principle (via Step 5), it becomes a permanent org-level rule. Subsequent merge-rules runs will preserve it through Step 4's principle deduplication, regardless of whether the original `.local.md` pattern still meets the promotion threshold. To demote or remove a promoted Principle, manually edit the org rules output.

For each unique (normalized) file name across projects (e.g., `languages/typescript.md`, `integrations/rails-inertia.md`):

1. Collect all versions from projects that have this file (including normalized variants)
2. Merge `## Principles` sections:
   - Deduplicate by principle name (text before parenthetical hints)
   - Union hints from all projects for the same principle
   - If same principle name but clearly different meaning → keep both, flag in report (see Conflict Handling)
   - Preserve unique principles from any project
3. Merge `paths:` frontmatter: union of all path patterns, deduplicate
4. If file exists in only 1 project, include as-is

### Step 5: Promote .local.md Patterns to Principles

For each normalized category (e.g., `languages/typescript`, `frameworks/rails-controllers`, `integrations/rails-inertia`):

1. Collect `## Project-specific patterns` from all projects — from `.local.md` files and from hybrid `.md` files that contain this section (see Step 2)
2. **Deduplicate against existing Principles**: Exclude patterns whose description (text after ` - `) semantically matches an existing principle name in the corresponding `.md` output (from Step 4). Use AI judgment for semantic equivalence (case-insensitive, synonyms). This prevents self-amplification when `.local.md` contains patterns previously promoted by older versions
3. Match remaining patterns by inline code signature (backtick portion before ` - `)
   - Use AI judgment to determine semantic equivalence (e.g., `useAuth()` and `useAuth() → { user, login, logout }` refer to the same pattern)
4. Count occurrences per pattern across projects
5. Calculate threshold: pattern must appear in more than `len(projects) * promote_threshold` projects (i.e., strict majority when threshold = 0.5)
6. **Convert to Principles format** and append to `## Principles` in the corresponding normalized `.md` output:
   - Signature format: `` `signature` - description `` → Principles format: `Description (simplified signature)`
   - The description becomes the principle name, the function/type name from the signature becomes the hint
   - Examples:
     - `` `useAuth() → { user, login, logout }` - auth hook interface `` → `Auth hook interface (useAuth)`
     - `` `clean_bracket_params(:keyword)` - WAF付加のブラケット除去 `` → `WAF付加のブラケット除去 (clean_bracket_params)`
     - `` `RefOrNull<T extends { id: string }> = T | { id: null }` - nullable refs `` → `Nullable refs (RefOrNull<T>)`
   - Apply Step 4's principle deduplication to the converted principles (skip if same principle name already exists)
7. Patterns below threshold → discard (listed in report for reference)

### Step 5.5: Merge Examples (.examples.md)

For each normalized `.examples.md` file group:

1. Collect all versions from projects that have this file (including normalized variants)
2. **Principles Examples**: Merge by section heading (e.g., `### FP only`)
   - Same principle heading across projects → adopt the most detailed example, or merge Good/Bad from different projects
   - If Good/Bad contrast exists in one project but not another → adopt from the project that has it
   - Deduplicate identical examples
3. **Promoted pattern examples**: For patterns promoted in Step 5, include their examples under `## Principles Examples`
   - Use the same semantic equivalence judgment as Step 5 (matching by inline code signature with AI judgment) to link `###` example headings to promoted patterns — do not rely solely on exact heading match
   - `###` title uses the converted Principle name (from Step 5), not the original signature
   - Include the full original signature as a Good example showing usage
   - Discard examples for patterns below threshold (same as the pattern itself)
4. Output `.examples.md` file structure:

```markdown
# <Category> Rules - Examples

## Principles Examples

### <Principle name>
**Good:**
```<lang>
<example>
```
**Bad:**
```<lang>
<example>
```
```

- `###` titles must match the corresponding rule name in the merged output `.md` file. Do not rephrase
- No `paths:` frontmatter (prevents auto-loading)
- If no examples exist for any merged rule, skip generating the `.examples.md` file

### Step 6: Write Output

1. Check output directory:
   - If `--dry-run`: skip writing, show planned file list with contents summary, then go to Step 7
   - If exists and has files: warn and ask for confirmation before overwriting
   - If not exists: create with `mkdir -p`
2. Write merged files preserving directory structure:
   - `languages/<lang>.md`
   - `languages/<lang>.examples.md` (if examples exist)
   - `frameworks/<framework>.md`
   - `frameworks/<framework>.examples.md` (if examples exist)
   - `integrations/<framework>-<integration>.md`
   - `integrations/<framework>-<integration>.examples.md` (if examples exist)
   - Only `.md` and `.examples.md` files (no `.local.md` in output)
3. Output file format:

```markdown
---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# TypeScript Rules

## Principles

- Immutability (spread, map/filter/reduce, const)
- Type safety (strict mode, explicit annotations, no any)
- Auth hook interface (useAuth)
```

- Output `.md` contains only `## Principles` (promoted patterns are converted and included here)
- Omit `## Principles` section if no principles exist for this category
- If a corresponding `.examples.md` was generated, append a reference section at the end:
  ```markdown
  ## Examples
  When in doubt: ./<name>.examples.md
  ```

### Step 7: Report Summary

Display report using the project's directory name (last path component) as label. Report headers are always in English.

```
# Merge Rules Report

## Sources
- frontend-app (3 files)
- backend-api (2 files)
- shared-lib (4 files)

## File Name Normalization
- `rails-controller.md` + `rails-controllers.md` → `rails-controllers.md`
- `rails-model.md` + `rails-models.md` → `rails-models.md`

## Merge Results
| File | Sources | Principles | Promoted to Principles | Examples |
|------|---------|------------|------------------------|----------|
| languages/typescript.md | 3/3 | 5 | 2 | 7 |
| frameworks/react.md | 2/3 | 3 | 1 | 4 |
| integrations/rails-inertia.md | 2/3 | 2 | 0 | 2 |

**Principles** = total including promoted. **Examples** = total `###` entries in the output `.examples.md`.

## Promoted to Principles
- `useAuth()` → Auth hook interface (useAuth) - 3/3 projects
- `pathFor() + url()` → Path helpers (pathFor, url) - 2/3 projects

## Below Threshold (reference)
- `useCustomHook()` (typescript) - 1/3 (frontend-app only)
- `ApiClient.create()` (typescript) - 1/3 (backend-api only)

## Skipped
- project.md x3 (project-specific, skipped)
```

## Conflict Handling

- **Same principle, different hints**: Union all hints, deduplicate
- **Same principle name, different meaning**: Keep both, flag in report for human review
- **Same category, different paths**: Union all path patterns
- **Contradicting principles**: Keep both, report as conflict for human review
