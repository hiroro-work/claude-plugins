# Resolve File References (Step R2.5)

Scan existing rule content (loaded in R1) for references to other files, resolve them, and integrate the referenced content. This step runs after R2 so that project type information (languages, frameworks) is available for categorizing extracted rules.

## 1. Detect References

Detect references in all loaded rule content — 3 patterns:

- Markdown links: `[text](path/to/file.md)` (anchors like `#section` are stripped for path resolution)
- Text references: "See `<path>`", "Refer to `<path>`", "Details in `<path>`", "参照: `<path>`" and similar patterns
- @references: `@path/to/file.md` — `@` prefix means repository root (e.g., `@docs/conventions.md` → `<repo-root>/docs/conventions.md`)

Exclude references inside code blocks to avoid false positives.

## 2. Resolve Paths

- `@` prefix → resolve from repository root
- `./` or `../` prefix → resolve from the rule file's directory
- Bare paths (e.g., `docs/foo.md`) → try rule file's directory first, then repository root
- Absolute paths (`/`-prefixed), URLs → skip (report in R5)
- Non-existent files → skip (report in R5)

## 3. Validate Resolved Files

- Must be git-tracked (`git ls-files` check)
- Must be text files (`.md`, `.txt`, or other text extensions)
- Must not be under `output_dir` (avoid re-ingesting generated rule files)
- Apply `exclude_dirs` and `exclude_patterns` from settings

## 4. Read and Extract Rules

- For code files: apply the same extraction criteria as Step 4 (see `extraction-criteria.md`), using project type information from R2
- For documentation files (`.md`, `.txt`): apply Step 5 criteria — extract explicit coding rules and guidelines
- Classify as Principles / Project-specific patterns
- Categorize by language/framework/project scope

## 5. Merge into Rules Pool

Merge extracted rules into the R1 snapshot so they participate in R4's category routing. Rules extracted from references are treated as **existing rules** (user intentionally added the reference), so they take priority on conflict in R4.

## 6. Remove Resolved Reference Lines

- Standalone reference lines → remove entirely
- References mixed with other content → remove only the reference portion
- Failed to resolve → preserve as-is, report in R5

## 7. Circular Reference Prevention

Maintain a visited set and skip already-processed files. Limit resolution depth to 3 levels.
