# Restructure Mode (extracted from `SKILL.md` ## Restructure Mode)

Deep reference for `SKILL.md` **Restructure Mode**. The `### Mode Detection` entry that routes `--restructure` here stays inline in the parent. Unqualified references resolve as follows: `Step R1`–`Step R5` name sections of this file; `Step 1`–`Step 7` (including the `Step 2-5` range) name `SKILL.md` § Full Extraction Mode steps; `Step U3` names `references/update-mode.md`.

When `--restructure` is specified, re-analyze the codebase to determine the optimal file structure, then merge existing rule content into the new structure. Use this when the project has evolved (new frameworks, architectural changes) or when `split_output` settings change; `README.md` § Choosing a mode says which mode a given change calls for.

**Note**: Restructure Mode does NOT run the Step U3 staleness check — use `--update` first so stale symbols are flagged for manual review (`README.md` § After a dependency major-version bump).

### Step R1: Load Settings and Snapshot Existing Rules

1. Load settings (same as Step 1 in Full Extraction Mode)
2. Check `output_dir` exists → Error if not: "Run /extract-rules first to initialize rule files."
3. Load existing rule files (`SKILL.md` § Step 1's **"Load existing rule files"** paragraph), reading and parsing every match under `<output_dir>/**` and `<examples_output_dir>/**` rather than one category's files. Legacy co-located `<output_dir>/**/<name>.examples.md` files are candidates to migrate during Step R4.

### Step R2: Re-analyze Codebase

Execute Step 2-5 from Full Extraction Mode to determine the ideal file structure.

### Step R2.5: Resolve File References

Skip this step if `resolve_references` is `false`. Default is `true`.

Scan existing rule content (loaded in R1) for file references, resolve them, extract rules from the referenced files, and merge those into the R1 snapshot. Rules from references count as existing rules, so they take priority on conflict in R4.

#### 1. Detect References

Detect references in all loaded rule content — 3 patterns:

- Markdown links: `[text](path/to/file.md)` (anchors like `#section` are stripped for path resolution)
- Text references: "See `<path>`", "Refer to `<path>`", "Details in `<path>`", "参照: `<path>`" and similar patterns
- @references: `@path/to/file.md` — `@` prefix means repository root (e.g., `@docs/conventions.md` → `<repo-root>/docs/conventions.md`)

Exclude references inside code blocks.

#### 2. Resolve Paths

- `@` prefix → resolve from repository root
- `./` or `../` prefix → resolve from the rule file's directory
- Bare paths (e.g., `docs/foo.md`) → try rule file's directory first, then repository root
- Absolute paths (`/`-prefixed), URLs → skip (report in R5)
- Non-existent files → skip (report in R5)

#### 3. Validate Resolved Files

- Must be git-tracked (`git ls-files` check)
- Must be text files (`.md`, `.txt`, or other text extensions)
- Must not be under `output_dir` (avoid re-ingesting generated rule files)
- Apply `exclude_dirs` and `exclude_patterns` from settings

#### 4. Read and Extract Rules

- For code files: apply the same extraction criteria as Step 4 (see `references/extraction-criteria.md`), using project type information from R2
- For documentation files (`.md`, `.txt`): apply Step 5 criteria — extract explicit coding rules and guidelines
- Classify as Principles / Project-specific patterns
- Categorize by language/framework/project scope

#### 5. Merge into Rules Pool

Merge extracted rules into the R1 snapshot so they participate in R4's category routing. Rules extracted from references are treated as **existing rules**, so they take priority on conflict in R4.

#### 6. Remove Resolved Reference Lines

- Standalone reference lines → remove entirely
- References mixed with other content → remove only the reference portion
- Failed to resolve → preserve as-is, report in R5

#### 7. Circular Reference Prevention

Maintain a visited set and skip already-processed files. Limit resolution depth to 3 levels.

### Step R3: Show Restructure Plan and Confirm

Compare old and new file structures, display planned changes (Keep/New/Remove per file), and wait for user confirmation before proceeding. If references were resolved in R2.5, include the number of rules extracted from referenced files in the plan display.

### Step R4: Merge and Write

1. Fresh extraction results as base, route existing rules (including rules extracted from resolved references) to appropriate new files by category/scope/layer/integration
2. **Existing rules take priority** on conflict (respect manual edits, conversation-extracted rules, and reference-extracted rules)
3. Unmatched rules → `project.md` as fallback; preserve custom sections in the most relevant file
4. Apply `split_output` setting (handle hybrid ↔ split transitions), deduplicate
5. **Write new files first**, then remove old files no longer in the new structure
6. **Handle `.examples.md`**: Write `.examples.md` files to `<examples_output_dir>/<name>.examples.md`, following the same structure changes as rule files. When R1 picked up legacy `<output_dir>/<name>.examples.md` files (co-located with rule files from older runs), move them to the new location under `examples_output_dir` and remove the legacy copies after the new file is written. Generate new `.examples.md` for categories that didn't have one (see `references/examples-format.md`).

### Step R4.5: Security Self-Check

Run Security Self-Check (same as Step 6.5) on all generated files.

### Step R5: Report Summary

Report structural changes, content merge summary, unmatched rules, and reference resolution results. See § Report format (Step R5).

## Report format (Step R5)

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
| languages/typescript.examples.md | 8 examples | 2 examples | 10 examples |

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
