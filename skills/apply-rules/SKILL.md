---
name: apply-rules
description: Apply organization-wide rules (from merge-rules output) to the current project. Detects tech stack, merges Principles, cleans up promoted patterns from .local.md, and fixes non-conforming files.
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls *), Bash(mkdir *), Bash(wc *), Bash(mktemp *), Bash(rm -rf /var/folders/*), Bash(rm -rf /tmp/*), Bash(rm .claude/*), Bash(gh api *), Bash(gh auth status *)
---

# Apply Rules

Applies organization-wide rules (produced by merge-rules) to the current project. Detects the project's tech stack, selects relevant rules, merges them with existing extract-rules output, cleans up promoted patterns from `.local.md` files, and ensures the final structure conforms to the extract-rules/merge-rules convention.

## Usage

```text
/apply-rules <source>                  # Apply from GitHub URL or local path
/apply-rules                           # Apply using config file
/apply-rules --config <path>           # Apply using specified config file
/apply-rules --dry-run                 # Show what would change without writing
/apply-rules --dry-run <source>        # Dry run with specified source
```

`<source>` points directly to the rules directory (merge-rules or extract-rules output):
- GitHub: `https://github.com/org/repo/tree/main/.claude/rules`
- Local: `~/org-rules/.claude/rules`

## Configuration

Config file search order:
1. `--config <path>` argument
2. `.claude/apply-rules.local.md` (project-level)
3. `~/.claude/apply-rules.local.md` (user-level)

**File format:** YAML frontmatter only (no markdown body), same convention as `extract-rules.local.md` and `merge-rules.local.md`.

```yaml
---
# Rules directory (GitHub URL or local path)
# GitHub: https://github.com/org/repo/tree/main/.claude/rules
# Local: ~/org-rules/.claude/rules
source: https://github.com/org/repo/tree/main/.claude/rules

# Alternative: specify GitHub source components separately
# (useful when branch name contains "/" or for tags/SHAs)
# source_repo: org/repo
# source_ref: feature/rules-v2
# source_path: .claude/rules

# Output directory in target project (default: .claude/rules/)
output_dir: .claude/rules/

# Auto-detect which rules to apply (default: true)
# When false, applies ALL rules from source
auto_detect: true

# Explicitly include rules even if not auto-detected
include: []
# Example: [languages/typescript, integrations/rails-inertia]

# Explicitly exclude rules even if auto-detected
exclude: []
# Example: [frameworks/rails-views]

# Report language (default: ja)
language: ja
---
```

CLI argument `<source>` overrides the config's `source` field.

## Processing Flow

### Step 1: Load Configuration

1. If CLI `<source>` argument provided, use it (overrides config `source`)
2. Search for config file (see search order above)
3. Parse YAML frontmatter, apply defaults for omitted fields
   - **`language` resolution order:** Skill config → Claude Code settings (`~/.claude/settings.json` → `language` field) → default `ja`
4. Validate:
   - `source` must be specified (via CLI argument or config file)
   - If neither: Error "No source specified. Provide a GitHub URL or local path as argument, or create `.claude/apply-rules.local.md` with a `source:` field."

### Step 2: Fetch Source Rules

**If source is a local path:**

1. Expand `~` and resolve to absolute path
2. Verify directory exists and contains rule files (`.md`)
3. Read directly from this location

**If source is a GitHub URL:**

Parse URL to extract owner, repo, branch, and path:
- `https://github.com/{owner}/{repo}/tree/{branch}/{path}`
- Example: `https://github.com/org/repo/tree/main/.claude/rules`
  → owner: `org`, repo: `repo`, branch: `main`, path: `.claude/rules`

**Note on ambiguous refs:** Branch names may contain `/` (e.g., `feature/rules-v2`), and refs can also be tags or SHAs. Simple URL splitting cannot reliably separate ref from path. To handle this robustly:
- Try resolving ref candidates from longest prefix first using `gh api repos/{owner}/{repo}/git/ref/{candidate}`
- Alternatively, the user can specify components separately in the config:
  ```yaml
  source_repo: org/repo
  source_ref: feature/rules-v2
  source_path: .claude/rules
  ```
  When these fields are present, they take precedence over URL parsing.
- For the common case (branch = `main` or `master`), simple URL parsing works.

Fetch using `gh api`:

1. Verify authentication: `gh auth status`
2. Create temp directory: `mktemp -d`
3. List top-level directory contents:
   ```
   gh api repos/{owner}/{repo}/contents/{path}?ref={branch}
   ```
   For each entry with `type: "dir"`, recursively fetch subdirectory contents:
   ```
   gh api repos/{owner}/{repo}/contents/{path}/{subdir}?ref={branch}
   ```
   This dynamically discovers all categories (not limited to `languages/`, `frameworks/`, `integrations/`).
4. For each `.md` file found, fetch content and decode:
   ```
   gh api repos/{owner}/{repo}/contents/{file_path}?ref={branch} --jq '.content | @base64d'
   ```
   Save to tmpdir preserving directory structure
5. Temp dir is cleaned up in Step 8

**Inventory source files:**
- Glob for `**/*.md` and `**/*.examples.md` under the source rules directory
- Skip `project.md` and `project.examples.md` (inherently project-specific)
- Skip `.local.md` files (merge-rules output should not contain these, but handle gracefully)
- Parse each file: extract YAML frontmatter (`paths:`) and body sections

### Step 3: Detect Target Project Tech Stack

Analyze the current working directory to determine which source rules are relevant. Detection is best-effort, based on dependency files (e.g., `Gemfile`, `package.json`) and project directory structure (e.g., `app/controllers/`).

Read `references/detection-heuristics.md` for the full detection table mapping indicators to rule files. If the source contains rule files not covered in the table, use AI judgment to match them against the project's dependencies and file structure.

**Apply overrides:**
- Add `include:` entries to the detected set
- Remove `exclude:` entries from the detected set
- If `auto_detect: false`: start with ALL source rules, then apply `exclude` only

### Step 4: Filter and Propose

**If `auto_detect: false`:** Apply ALL source rules (minus `exclude` entries). Skip the proposal step entirely — no integration proposals or skipped rules. Proceed directly to Step 5.

**If `auto_detect: true` (default):**

1. **Auto-matched rules**: Rules that match detected tech stack → apply automatically
2. **Integration proposals**: For integrations NOT detected in the project but related to a detected framework (e.g., source has `integrations/rails-pundit` but project doesn't use `pundit`), use `AskUserQuestion` to present them as a single list:

   > The following integration rules are available in the source but were not detected in your project. Which would you like to apply?
   > 1. `integrations/rails-pundit` — Authorization library Pundit rules
   > 2. `integrations/rails-good-job` — Job queue GoodJob rules
   >
   > Options: all / none / specify by number (e.g. "1" or "1,2")

   Apply only those the user approves.

3. **Skipped rules**: Rules for tech not detected and not in related frameworks → skip, list in report

### Step 5: Inventory Existing Target Rules

1. Check if `{output_dir}/` exists in the target project
2. If exists, read all files: `.md`, `.local.md`, `.examples.md`
3. Parse frontmatter and body sections for each
4. Categorize files the same way as source files
5. **Detect hybrid format**: If any target `.md` file contains `## Project-specific patterns` (hybrid format from extract-rules `split_output: false`), note this. The merge step will convert hybrid to split format because the split format (separate `.md` and `.local.md`) is the standard expected by both extract-rules and merge-rules, and mixing formats causes confusion when rules flow back through the pipeline. Note: source files from merge-rules should not contain `## Project-specific patterns` (promoted patterns are converted to Principles format)

### Step 5.5: Normalize File Names

Before merging, align target file names with source (canonical) names. This prevents duplicate files for the same concept (e.g., `rails-controller.md` vs `rails-controllers.md`).

1. Compare target file names against source file names within the same category
2. Detect naming variants: singular/plural (`controller`/`controllers`), minor differences for the same concept
3. If renames are detected, use `AskUserQuestion` to confirm:
   > The following target files will be renamed to match source (canonical) names:
   > 1. `frameworks/rails-controller.md` → `frameworks/rails-controllers.md`
   >
   > Options: all / none / specify by number
4. Apply approved renames and report in the summary

### Step 6: Merge Rules

For each filtered source rule file, determine the merge action:

**6a. Merge `.md` files (Principles):**

**Case: No existing `.md`**
1. Copy source `.md` as-is (source from merge-rules contains only `## Principles`)

**Case: Existing `.md` exists**
1. **`paths:` frontmatter**: Union of all path patterns, deduplicate
2. **Hybrid → split conversion**: If existing `.md` contains `## Project-specific patterns` (hybrid format):
   - Extract that section and move to `.local.md` (create if not exists, append if exists)
   - Remove the section from `.md`, keeping only `## Principles`
3. **`## Principles`**:
   - Match principles by name (text before parenthetical hints)
   - Source principle not in target → Add
   - Target principle not in source → Keep (project may have added its own)
   - Same principle, same meaning but different hints → Union hints from both
   - Same principle name but different content → Collect all conflicts, then use `AskUserQuestion` to present them together:
     > The following principles differ between org rules and project rules:
     >
     > **1. Immutability** (in `languages/ruby.md`)
     > - Org: `Immutability (spread, map/filter/reduce, const)`
     > - Project: `Immutability (freeze, deep clone, readonly)`
     >
     > **2. Error handling** (in `frameworks/rails.md`)
     > - Org: `Error handling (rescue, custom exceptions)`
     > - Project: `Error handling (rescue, retry, circuit breaker)`
     >
     > For each, choose: (a) Adopt org rule / (b) Keep project rule / (c) Keep both
     > Example: "1a, 2c" or "all a"

**6b. Clean up promoted patterns from `.local.md` files:**

`.local.md` files contain project-specific patterns discovered by extract-rules. When org rules promote a pattern to a Principle, the original pattern in `.local.md` becomes redundant. apply-rules cleans up these duplicates while preserving genuinely project-specific patterns.

- apply-rules does not write new patterns to `.local.md`
- **Cross-format duplicate removal**: After merging Principles in Step 6a, scan target `.local.md` for patterns whose description matches a Principle name now present in the corresponding `.md` (e.g., `` `useAuth() → { user, login, logout }` - auth hook interface `` is a duplicate of `Auth hook interface (useAuth)` in `## Principles`). Use AI judgment for semantic equivalence (case-insensitive, synonyms)
- Remove matched patterns from `.local.md`
- If `.local.md` becomes empty after removal, delete the file
- Preserve all patterns that do not match any Principle (genuinely project-specific)

**6c. Merge `.examples.md` files:**

**Case: No existing `.examples.md`**
- Copy source `.examples.md` as-is (source from merge-rules contains only `## Principles Examples`)

**Case: Existing `.examples.md` exists**
1. **`## Principles Examples`**: Add examples from source for principles not already covered in target
2. **`## Project-specific Examples`** (target only): Remove examples whose `###` title corresponds to patterns removed from `.local.md` in Step 6b. Preserve all other existing entries

**6d. Ensure `## Examples` reference:**
- Every `.md` and `.local.md` that still exists and has a corresponding `.examples.md` must end with:
  ```markdown
  ## Examples
  When in doubt: ./<name>.examples.md
  ```
- If a `.local.md` was deleted in Step 6b (became empty), no reference is needed

### Step 7: Structure Conformance Check + Auto-cleanup

Scan `output_dir` for files that don't conform to extract-rules/merge-rules convention:

**Valid patterns:**
- `{category}/{name}.md`
- `{category}/{name}.local.md`
- `{category}/{name}.examples.md`
- `project.md`
- `project.examples.md`

**Valid categories:** `languages/`, `frameworks/`, `integrations/`

**Non-conforming file handling:**
1. Read the non-conforming file and analyze its content
2. Determine the appropriate conforming file(s) to migrate rules into (based on category, content, and `paths:` hints)
3. Use `AskUserQuestion` to present the migration plan as a single list for confirmation:
   > The following non-conforming files were detected. Migrate their rules to conforming files and delete them?
   > 1. `frameworks/old-custom-rules.md` → migrate to `frameworks/rails.md`
   > 2. `ruby-rules.md` → migrate to `languages/ruby.md`
   > 3. `project.rules.md` → migrate to `project.md` (**project file — confirm individually**)
   >
   > Options: all / none / specify by number (e.g. "1,2")
   >
   > Note: `project.*` files are excluded from "all". Specify them individually by number.
4. User approval → merge rules into conforming file(s) and delete non-conforming files
5. Report all migrations and deletions

### Step 8: Cleanup

If source was a GitHub URL, remove the temp directory: `rm -rf <tmpdir>`

### Step 9: Report Summary

Display report. Report headers are always in English, content in the configured `language`.

```
# Apply Rules Report

## Source
- https://github.com/org/repo/tree/main/.claude/rules (15 rule files)

## Target Project Detection
- Languages: ruby
- Frameworks: rails, rails-controllers, rails-models, rails-views
- Integrations: rails-devise, rails-pundit

## Applied Rules
| File | Action | Principles |
|------|--------|------------|
| languages/ruby.md | Merged | +3 added, 7 kept |
| frameworks/rails.md | Created | 13 |
| frameworks/rails-controllers.md | Created | 5 |
| integrations/rails-devise.md | Merged | +1 added |

## Promoted Pattern Cleanup
- languages/ruby.local.md: removed 1 pattern (now in Principles)
- frameworks/rails.local.md: no duplicates found

## Preserved
- languages/ruby.local.md (2 remaining patterns)
- frameworks/rails.local.md (3 patterns, untouched)

## User-approved Integrations
- integrations/rails-pundit (not detected, approved by user)

## Skipped (not relevant to project)
- languages/typescript.md
- frameworks/react.md
- frameworks/nextjs.md
- integrations/rails-stripe.md

## Structure Cleanup
- frameworks/old-custom.md → rules migrated to frameworks/rails.md → deleted

## Conflicts (resolved by user)
- languages/ruby.md: "Immutability" → user chose: Keep both
```

## Conflict Handling

Summary of user-confirmation points and automatic actions:

| Situation | Action |
|-----------|--------|
| Principle in source, not in target | Auto-add |
| Principle in target, not in source | Auto-keep |
| Same principle, different hints | Auto-union hints |
| Same principle name, different content | **AskUserQuestion**: collect all conflicts, present together (adopt org / keep project / keep both) |
| Non-conforming file detected | **AskUserQuestion**: present migration plan as single list for confirmation |
| `project.*` non-conforming file | Excluded from "all" — must be specified individually by number |
| Target file name differs from source canonical name | **AskUserQuestion**: confirm renames (all / none / specify) |
| Undetected integration rule (related framework) | **AskUserQuestion**: present as single list for approval (all / none / specify) |
| `.local.md` pattern matching a Principle | Auto-remove from `.local.md` (cross-format duplicate cleanup) |
| `.local.md` pattern not matching any Principle | Preserved |
| `## Project-specific Examples` for removed pattern | Auto-remove |
| `## Project-specific Examples` for remaining pattern | Preserved |
