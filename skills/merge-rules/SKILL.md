---
name: merge-rules
description: Merge extract-rules output from multiple projects into a unified portable rule set. Promotes .local.md patterns shared across projects. Use when creating organization-wide coding standards, merging team rules into global settings, or unifying rules across multiple repositories.
allowed-tools: Read, Glob, Grep, Write, Bash(ls *), Bash(mkdir *), Bash(wc *)
---

# Merge Rules

Merges `.claude/rules/` from multiple projects into a unified portable rule set (.md only). Promotes `.local.md` patterns that appear across a threshold of projects.

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
# Examples: 3 projects → 2/3 needed, 4 projects → 2/4, 5 projects → 3/5
promote_threshold: 0.5

# Output language for reports (default: ja)
language: ja
---
```

## Processing Flow

### Step 1: Load Configuration

1. Search for config file (see search order above)
   - If not found: Error "No config file found. Create `.claude/merge-rules.local.md` or specify with `--config`."
2. Parse YAML frontmatter, apply defaults for omitted fields
3. Validate:
   - `projects` must have at least 2 entries
   - Each project path must exist and contain `rules_dir`
   - Error with clear message if validation fails

### Step 2: Collect Rule Files

For each project:

1. Find all `.md` and `.local.md` files under `{path}/{rules_dir}/` (recursive)
2. Categorize:
   - `languages/*.md` → portable principles (always merge)
   - `frameworks/*.md` → portable principles (always merge)
   - `integrations/*.md` → portable principles (always merge)
   - `languages/*.local.md` → promotion candidate
   - `frameworks/*.local.md` → promotion candidate
   - `integrations/*.local.md` → promotion candidate
   - `project.md` → skip (inherently project-specific)
3. Parse each file: extract YAML frontmatter (`paths:`) and body sections (`## Principles`, `## Project-specific patterns`)

### Step 3: Normalize Similar File Names

Before merging, group files that refer to the same concept but have different names. This applies to both `.md` and `.local.md` files — a `.md` and its corresponding `.local.md` share the same normalization (e.g., `rails-controller.md` and `rails-controller.local.md` are normalized together with `rails-controllers.md` and `rails-controllers.local.md`).

1. Detect similar file names within the same directory (e.g., `rails-controller.md` vs `rails-controllers.md`, `rails-model.md` vs `rails-models.md`)
   - Singular/plural variants (e.g., `controller` / `controllers`)
   - Minor naming differences for the same concept (use AI judgment based on file content and `paths:` frontmatter overlap)
2. For each group of similar files, select a canonical name:
   - Prefer the name used by the majority of projects
   - If tied, prefer the name matching extract-rules' layered framework convention (e.g., `<framework>-<layer>`)
3. Treat grouped files as the same file for subsequent merge steps (Step 4 and Step 5)
4. Report normalized groups in the summary (e.g., "`rails-controller.md` + `rails-controllers.md` → `rails-controllers.md`")

### Step 4: Merge Portable Rules (.md)

For each unique (normalized) file name across projects (e.g., `languages/typescript.md`, `integrations/rails-inertia.md`):

1. Collect all versions from projects that have this file (including normalized variants)
2. Merge `## Principles` sections:
   - Deduplicate by principle name (text before parenthetical hints)
   - Union hints from all projects for the same principle
   - If same principle name but clearly different meaning → keep both, flag in report (see Conflict Handling)
   - Preserve unique principles from any project
3. Merge `paths:` frontmatter: union of all path patterns, deduplicate
4. If file exists in only 1 project, include as-is

### Step 5: Promote .local.md Patterns

For each normalized `.local.md` file group (e.g., `languages/typescript.local.md`, `frameworks/rails-controllers.local.md`, or `integrations/rails-inertia.local.md`):

1. Collect `## Project-specific patterns` from all projects that have this file (including normalized name variants)
2. Match patterns by inline code signature (backtick portion before ` - `)
   - Use AI judgment to determine semantic equivalence (e.g., `useAuth()` and `useAuth() → { user, login, logout }` refer to the same pattern)
3. Count occurrences per pattern across projects
4. Calculate threshold: pattern must appear in more than `len(projects) * promote_threshold` projects (i.e., strict majority when threshold = 0.5)
5. Patterns meeting threshold → append to the corresponding normalized `.md` output under `## Common patterns` section
6. Patterns below threshold → discard (listed in report for reference)

### Step 6: Write Output

1. Check output directory:
   - If `--dry-run`: skip writing, show planned file list with contents summary, then go to Step 7
   - If exists and has files: warn and ask for confirmation before overwriting
   - If not exists: create with `mkdir -p`
2. Write merged files preserving directory structure:
   - `languages/<lang>.md`
   - `frameworks/<framework>.md`
   - `integrations/<framework>-<integration>.md`
   - Only `.md` files (no `.local.md` in output)
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

## Common patterns

- `useAuth() → { user, login, logout }` - auth hook interface
```

- `## Common patterns` section is only included when promoted patterns exist
- Omit `## Principles` section if no principles exist for this category

### Step 7: Report Summary

Display report using the project's directory name (last path component) as label.

```
# Merge Rules レポート

## ソース
- frontend-app (3 files)
- backend-api (2 files)
- shared-lib (4 files)

## ファイル名の正規化
- `rails-controller.md` + `rails-controllers.md` → `rails-controllers.md`
- `rails-model.md` + `rails-models.md` → `rails-models.md`

## マージ結果
| ファイル | ソース数 | Principles | 昇格パターン |
|----------|----------|------------|-------------|
| languages/typescript.md | 3/3 | 5 | 2 |
| frameworks/react.md | 2/3 | 3 | 1 |
| integrations/rails-inertia.md | 2/3 | 2 | 0 |

## 昇格されたパターン
- `useAuth()` (typescript) - 3/3 プロジェクトで共通
- `pathFor() + url()` (react) - 2/3 プロジェクトで共通

## 閾値未満のパターン（参考）
- `useCustomHook()` (typescript) - 1/3 (frontend-app のみ)
- `ApiClient.create()` (typescript) - 1/3 (backend-api のみ)

## スキップ
- project.md x3 (プロジェクト固有のためスキップ)
```

## Conflict Handling

- **Same principle, different hints**: Union all hints, deduplicate
- **Same principle name, different meaning**: Keep both, flag in report for human review
- **Same category, different paths**: Union all path patterns
- **Contradicting principles**: Keep both, report as conflict for human review
