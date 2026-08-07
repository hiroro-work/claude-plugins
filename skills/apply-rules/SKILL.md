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

# Output directory in target project (default: .claude/rules)
# Inside Claude Code's .claude/rules/** auto-load scope
# Examples go to the sibling <output_dir>-extras (.claude/rules-extras), outside that scope
output_dir: .claude/rules

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

**Examples directory (no configuration key).** `.examples.md` files live in a sibling of the rules directory: that path with any trailing `/` removed and `-extras` appended — `<output_dir>-extras` in the target project, `<source>-extras` on the source side, `.claude/rules-extras/` under the default `output_dir`. The split is about auto-load scope: `output_dir` sits inside Claude Code's `.claude/rules/**` recursive scope and is injected into context at session start, while the `-extras` sibling sits outside it so examples do not consume that context. Reading takes each rule file's examples from the derived directory first and from the rule file's own directory only when that misses, so a **pre-split layout** — examples still beside the rule files — is still picked up; writing always targets the derived directory. apply-rules does not read extract-rules' `examples_output_dir`. Two of its values resolve here: the literal default `.claude/rules-extras` — but only while the rules directory is also its default, since extract-rules' examples default is a fixed path rather than one derived from `output_dir` — and the `examples_output_dir: <output_dir>` opt-back-in, through the co-located fallback. Any other value, a path nested under `output_dir` included, puts examples where apply-rules' **resolution** does not look; Step 7 (Structure Conformance Check + Auto-cleanup) still finds such a file when it scans `output_dir` and offers to relocate it. Source of truth for the derived name is extract-rules' `examples_output_dir` default; keep in sync when that default changes.

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
   Save under `<tmpdir>/rules/`, preserving the directory structure below `{path}`
5. Repeat items 3-4 (the recursive directory listing and the per-file content fetch) for `{path}-extras`, saving under `<tmpdir>/rules-extras/`. A `404` on the listing means this source keeps no separate examples directory — skip it silently. `<source>` for the rest of this Step is `<tmpdir>/rules`, so `<source>-extras` resolves to `<tmpdir>/rules-extras` exactly as it does for a local source
6. Temp dir is cleaned up in Step 8 (Cleanup)

**Inventory source files:**

- Glob for `**/*.md` under `<source>` — the result includes any `.examples.md` a pre-split source kept beside its rule files
- Glob for `**/*.examples.md` under `<source>-extras`. A missing `<source>-extras` is the normal pre-split case: treat it as an empty listing rather than an error
- A rule file's examples are the `<name>.examples.md` at the same relative sub-path, with `<source>-extras` winning over a co-located copy from the first glob
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
2. If exists, list `{output_dir}/**/*.md` — which includes any co-located `.examples.md` — and `<output_dir>-extras/**/*.examples.md`. A missing `<output_dir>-extras` is the normal pre-split case: treat it as an empty listing rather than an error
3. Read each rule file (the `.md` and `.local.md` entries of the first listing) and resolve its examples per § Configuration's "Examples directory (no configuration key)" paragraph: the `<name>.examples.md` at the same relative sub-path, with a trailing `.local` dropped from the rule file's basename (`languages/ruby.local.md` → `languages/ruby.examples.md`). Read each resolved examples file once — a `.md` and its `.local.md` resolve to the same one. Every later step reads target examples through this resolution
4. Parse frontmatter and body sections for each
5. Categorize files the same way as source files
6. **Detect hybrid format**: If any target `.md` file contains `## Project-specific patterns` (hybrid format from extract-rules `split_output: false`), note this. The merge step will convert hybrid to split format because the split format (separate `.md` and `.local.md`) is the standard expected by both extract-rules and merge-rules, and mixing formats causes confusion when rules flow back through the pipeline. Note: source files from merge-rules should not contain `## Project-specific patterns` (promoted patterns are converted to Principles format)

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
- **Sync `paths:` frontmatter**: for any `.local.md` that still exists after cleanup, ensure its `paths:` frontmatter matches the sibling `.md`'s `paths:` (union and deduplicate with any existing entries on `.local.md`). This keeps project-specific patterns auto-loading under the same scope as the portable Principles. Older `.local.md` files generated before extract-rules propagated `paths:` to `.local.md` may be unscoped; this step retrofits the scope without requiring a full extract-rules re-run

**6c. Merge `.examples.md` files:**

Every merge result is written to `<output_dir>-extras/<relative-sub-path>/<name>.examples.md`, creating any missing parent directories. This holds even when Step 5 (Inventory Existing Target Rules) resolved the existing file from a co-located copy: that copy is read, never updated in place — Step 7 (Structure Conformance Check + Auto-cleanup) disposes of it.

**Case: No existing `.examples.md`**
- Copy source `.examples.md` as-is (source from merge-rules contains only `## Principles Examples`)

**Case: Existing `.examples.md` exists**
1. **`## Principles Examples`**: Add examples from source for principles not already covered in target
2. **`## Project-specific Examples`** (target only): Remove examples whose `###` title corresponds to patterns removed from `.local.md` in Step 6b. Preserve all other existing entries

**6d. Ensure `## Examples` reference:**

This sub-step is a sweep over Step 5 (Inventory Existing Target Rules)' inventory rather than a per-source-file action inside the loop above: it covers every target rule file under `output_dir`, including ones no filtered source rule file touched — `project.md` among them, since Step 2 always skips `project.md` from the source inventory. Those files' examples can still be a pre-split leftover that Step 7 (Structure Conformance Check + Auto-cleanup) relocates, so their reference needs recomputing too.

- Every `.md` and `.local.md` that still exists and has a corresponding `.examples.md` must end with:
  ```markdown
  ## Examples
  When in doubt: <relative-path-to-examples-file>
  ```
- The path is always `<output_dir>-extras/<same relative sub-path>/<name>.examples.md`, expressed relative to the rule file's own directory. With the default `output_dir`, `.claude/rules/languages/typescript.md` gets `../../rules-extras/languages/typescript.examples.md` and `.claude/rules/project.md` gets `../rules-extras/project.examples.md`. Recompute it rather than keeping whatever the file already carried — an existing reference may still point at a co-located copy
- That destination holds whether Step 6c (Merge `.examples.md` files) wrote the file or Step 7 (Structure Conformance Check + Auto-cleanup) relocates a pre-split leftover into it. Recompute unconditionally — do not special-case the leftover. Step 7's relocation is user-approved, so a declined move leaves this reference pointing at a path that does not exist; record each such rule file in the Step 9 report's `## Structure Cleanup` section rather than pointing the reference back at the leftover
- If a `.local.md` was deleted in Step 6b (became empty), no reference is needed

### Step 7: Structure Conformance Check + Auto-cleanup

Scan `output_dir` and `<output_dir>-extras` for files that don't conform to extract-rules/merge-rules convention:

**Valid patterns under `output_dir`:**
- `{category}/{name}.md`
- `{category}/{name}.local.md`
- `project.md`

**Valid patterns under `<output_dir>-extras`:**
- `{category}/{name}.examples.md`
- `project.examples.md`

**Valid categories:** `languages/`, `frameworks/`, `integrations/`

An `.examples.md` under `output_dir` is a pre-split leftover when its path matches one of the **Valid patterns under `<output_dir>-extras`** above — non-conforming only in which directory it sits. One whose name or sub-path is non-conforming too (e.g. `project.rules.examples.md`) stays with items 1-4, so a relocation never lands a file at a destination that is itself non-conforming. Handle the leftover class as a **relocation**, not as the **Non-conforming file handling** items 1-2 below describe:

- **Decide by whether the destination already exists.** The destination is `<output_dir>-extras` at the same relative sub-path. When nothing is there, **move** the leftover to it — `Read` it, `mkdir -p` any missing parent, `Write` it at the destination, then delete the leftover; there is no `mv` grant, and Step 5.5 (Normalize File Names) already renames this way. When something is there, that file wins and the leftover is **deleted** — usually Step 6c (Merge `.examples.md` files)' merged output, but not always: 6c runs only for source rule files that survived Step 4's filter, so a project that has run extract-rules since it gained `examples_output_dir` can hold an extras-side file for a rule 6c never touched. Keying on existence rather than on what 6c did keeps the two arms decidable from the tree alone.
- **Skip items 1-2** (`Read` and pick a migration target): the destination is fixed by the rule above, and the surviving file's content is whichever of the two Step 5 (Inventory Existing Target Rules) resolved.
- **Render it** in item 3's `AskUserQuestion` migration-plan proposal as `<path> → move to <extras path>` or `<path> → delete (superseded by <extras path>)`, matching the arm chosen above, and in the Step 9 `## Structure Cleanup` report in that section's past tense — `<path> → moved to <extras path>` / `<path> → deleted (superseded by <extras path>)`.

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
- languages/ruby.examples.md → moved to ../rules-extras/languages/ruby.examples.md
- project.examples.md → deleted (superseded by ../rules-extras/project.examples.md)

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
