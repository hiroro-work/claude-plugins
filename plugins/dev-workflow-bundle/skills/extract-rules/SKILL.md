---
name: extract-rules
description: Extract project-specific coding rules and domain knowledge from existing codebase, generating markdown documentation for AI agents. Use when onboarding a new project, after code review discussions about coding style, or when coding conventions need documenting. Also consider running after sessions where coding preferences were discussed or corrected (--from-conversation), or after PRs with significant review feedback (--from-pr).
model: opus
allowed-tools: Read, Glob, Grep, Write, Bash(ls *), Bash(mkdir *), Bash(git ls-files *), Bash(wc *), Bash(head *), Bash(tail *), Bash(sort *), Bash(uniq *), Bash(tree *), Bash(gh pr view *), Bash(gh pr diff *), Bash(gh api *), Bash(gh auth status *), Bash(gh repo view *), Bash(node *)
---

# Extract Rules

Analyzes existing codebase to identify what Claude would get wrong without project-specific guidance, extracting coding rules and domain knowledge as structured markdown documentation for AI agents.

## Usage

```text
/extract-rules                      # Extract rules from codebase (initial)
/extract-rules --update             # Re-scan and add new patterns (preserve existing)
/extract-rules --restructure        # Re-analyze, reorganize structure, merge existing rules
/extract-rules --from-conversation              # Extract from current session (latest)
/extract-rules --from-conversation <session-id> # Extract from a specific session
/extract-rules --from-pr 123                   # PR in current repo
/extract-rules --from-pr owner/repo#123        # PR in another repo (URL form also accepted)
/extract-rules --from-pr 100..110              # PR range (current repo)
/extract-rules --from-pr owner/repo#100..110   # PR range (another repo)
# Multiple specs allowed (space-separated) → cross-analysis detects org-wide principles
```

## Configuration

Settings file: `extract-rules.local.md` (YAML frontmatter only, no markdown body)
- Project-level: `.claude/extract-rules.local.md` (takes precedence)
- User-level: `~/.claude/extract-rules.local.md`

| Setting | Default | Description |
|---------|---------|-------------|
| `target_dirs` | `["."]` | Analysis target directories |
| `exclude_dirs` | `[".git", ".claude"]` | Exclude directories (in addition to .gitignore) |
| `exclude_patterns` | `[]` | Exclude file patterns (e.g., `*.generated.ts`, `*.d.ts`) |
| `output_dir` | `.claude/rules` | Output directory |
| `language` | `ja` | Report language (e.g., `ja`) |
| `split_output` | `true` | Separate Principles (.md) and patterns (.local.md) |
| `resolve_references` | `true` | Resolve file references during restructure |

```yaml
---
target_dirs:
  - .
exclude_dirs:
  - .git
  - .claude
exclude_patterns:
  - "*.generated.ts"
output_dir: .claude/rules
language: ja
split_output: true
resolve_references: true
---
```

## Output Structure

**Default** (`split_output: true`):
```text
.claude/rules/
├── languages/
│   ├── typescript.md              # Principles only (portable)
│   ├── typescript.local.md        # Project-specific patterns only
│   ├── typescript.examples.md     # Examples for both (no auto-load)
│   └── ...
├── frameworks/
│   ├── react.md                   # Principles only (portable)
│   ├── react.local.md             # Project-specific patterns only
│   ├── react.examples.md          # Examples for both (no auto-load)
│   └── ...
├── project.md                     # Always single file (no split)
└── project.examples.md            # Examples (no auto-load)
```

Principles (portable across projects) and Project-specific patterns (local) are separated by default. This enables organizational rule sharing and AI-driven merge across projects.

**Hybrid mode** (`split_output: false`):
```text
.claude/rules/
├── languages/
│   ├── typescript.md              # Principles + Project-specific patterns
│   └── typescript.examples.md     # Examples (no auto-load)
├── frameworks/
│   ├── react.md                   # Principles + Project-specific patterns
│   └── react.examples.md          # Examples (no auto-load)
├── project.md                     # Domain, architecture, conventions
└── project.examples.md            # Examples (no auto-load)
```

**Layered frameworks** (Rails, Django, Spring, etc.):
When a framework has distinct architectural layers, generate layer-specific files:
- `<framework>.md` — Cross-layer rules (no `paths:` or broad scope)
- `<framework>-<layer>.md` — Layer-specific rules with scoped `paths:` (e.g., `app/models/**`)
- In split mode, both cross-layer and layer-specific files get `.local.md` counterparts

**Integration libraries** (Inertia, Pundit, Devise, Turbo, etc.):
When integration libraries are detected alongside a layered framework:
- `integrations/<framework>-<integration>.md` — Integration-specific rules
- Separated from layer files into dedicated `integrations/` directory
- Framework name is included because rules differ by host framework
  (e.g., Rails: `render inertia:` vs Laravel: `Inertia::render()`)
- In split mode, integration files also get `.local.md` counterparts

Example output with integrations (split mode — each category also gets `.examples.md`):
```text
.claude/rules/
├── languages/
│   ├── ruby.md / ruby.local.md / ruby.examples.md
├── frameworks/
│   ├── rails.md / rails.local.md / rails.examples.md
│   ├── rails-controllers.md / .local.md / .examples.md
│   └── rails-models.md / .local.md / .examples.md
├── integrations/
│   ├── rails-inertia.md / .local.md / .examples.md
│   └── rails-pundit.md / .local.md / .examples.md
├── project.md
└── project.examples.md
```

**Format switching:** Run `--restructure` after changing `split_output` setting to switch between split and hybrid formats.

## Processing Flow

### Mode Detection

Check arguments to determine mode:

- No arguments → **Full Extraction Mode** (Step 1-7)
- `--update` → **Update Mode** (Step U1-U6)
- `--restructure` → **Restructure Mode** (Step R1-R5)
- `--from-conversation [session-id]` → **Conversation Extraction Mode** (Step C1-C5)
- `--from-pr <number|owner/repo#number|range> [...]` → **PR Review Extraction Mode** (Step P1-P5)

---

## Full Extraction Mode

### Step 1: Load Settings

Search for `extract-rules.local.md`:

1. **Project-level**: `.claude/extract-rules.local.md`
2. **User-level**: `~/.claude/extract-rules.local.md`

**Priority:**
- If both exist, use project-level only
- If only one exists, use that file
- If neither exists, use default settings

**Extract settings** (`target_dirs`, `exclude_dirs`, `exclude_patterns`, `output_dir`, `language`, `split_output`, `resolve_references`) from the config file. See Configuration section above for defaults.

**`language` resolution:** skill config → Claude Code settings (`~/.claude/settings.json` `language` field) → default `ja`

### Step 2: Detect Project Type

Detect project language and framework:

**1. Detect languages** by config files (`package.json`, `tsconfig.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`, `pom.xml`, etc.) and file extensions (`.ts`/`.tsx`, `.py`, `.go`, `.rb`, etc.)

**2. Detect frameworks** by their config files (e.g., `next.config.*`, `playwright.config.*`) and dependencies in package manifests.

**3. Detect architectural layers** (for layered frameworks):
If a framework has distinct layers with separate directories (e.g., Rails: `app/models/`, `app/controllers/`; Django: `models.py`, `views.py`), detect them for layer-specific rule files. Only split when corresponding directories actually exist.

**4. Detect integration libraries** (for layered frameworks):
Read `references/integration-criteria.md` for detection rules and classification criteria.

**Output:** List of detected languages, frameworks, architectural layers, and integration libraries

### Step 3: Collect Sample Files

Collect target files for analysis:

1. **Get git-tracked files** using `git ls-files` (respects `.gitignore`). If not a git repo, fall back to Glob with manual exclusions from settings.
2. Filter by `target_dirs`, `exclude_dirs`, `exclude_patterns`, and detected language extensions
3. Sample 10-15 files per category, distributed across directories for representative coverage. Large projects (100+): prioritize directory diversity. Small projects (<10): analyze all files.

### Step 4: Analyze by Category

Read `references/extraction-criteria.md` before proceeding to understand the classification criteria. The core question for every pattern is: **"Would Claude produce something different without knowing this?"** — extract only what fills the gap between Claude's general knowledge and this project's actual conventions.

For each detected language, framework, and **integration library**:

1. Use Grep/Read to collect relevant code patterns

1.5. **Separate integration-specific patterns** (for layered frameworks with integrations):
   See `references/integration-criteria.md` "Pattern routing" section.

2. **Classify each pattern** (see `references/extraction-criteria.md`):
   - **General style choice** (uses only language built-ins) → Abstract principle + hints
   - **Project-defined symbol** (types, functions, hooks defined in project) → Include concrete example

3. **For general style patterns:**
   - Group related patterns (e.g., "prefer const", "avoid mutations", "use spread" → Immutability)
   - Formulate as principle with parenthetical implementation hints (2-4 keywords)

4. **For project-specific patterns:**
   - Extract only the **minimal signature** (type definition, function signature, or API combination)
   - Format as one line: `signature` - brief context (2-5 words)
   - Avoid multi-line code blocks to minimize context overhead

5. Apply AI judgment to determine which patterns meet the extraction criteria (see `references/extraction-criteria.md`)

Determine appropriate detection methods based on language and project structure.

### Step 5: Analyze Documentation and Existing Rules

Also analyze non-code documentation:

- README.md
- CONTRIBUTING.md
- PR templates
- Existing CLAUDE.md

Extract explicit coding rules and guidelines from these documents.

**Deduplication check:** Read any files under `.claude/rules/` to build a set of already-documented rules. Rules extracted in Step 4 that overlap with these existing rules should be skipped to avoid duplication. Note: CLAUDE.md is NOT a deduplication source — rules should exist in `.claude/rules/` even if also mentioned in CLAUDE.md, because rule files are portable across projects via merge-rules. This check applies to all modes (Full Extraction, Update, Conversation, PR Review).

### Step 6: Generate Output

Read `references/security.md` before generating output to ensure sensitive information is not included.

1. Check if output directory exists
   - If exists: Error "Output directory already exists. Use `--restructure` to reorganize, `--update` to add new patterns, or delete the directory manually to start fresh."
   - If not exists: Create directory

2. Generate rule files per category:

   - `languages/<lang>.md` for language-specific rules
   - `frameworks/<framework>.md` for framework-specific rules
   - `project.md` for project-specific rules
   - **Layered frameworks**: `<framework>.md` (cross-layer) + `<framework>-<layer>.md` per detected layer with scoped `paths:`
   - **Integration libraries**: See `references/integration-criteria.md` "Output structure" section.

   **By default** (`split_output: true`): Generate 3 files per category (except project.md which gets 2):
   - `<name>.md` — `## Principles` only (portable), with `paths:` frontmatter
   - `<name>.local.md` — `## Project-specific patterns` only (local), with the **same `paths:` frontmatter** as its `<name>.md` counterpart (so local patterns auto-load under the same scope)
   - `<name>.examples.md` — Examples for both (no `paths:` frontmatter, no auto-load)
   - Layer-specific and regular files each define their own `paths:` independently (applies to both `.md` and `.local.md`). Cross-layer files (`<framework>.md` / `<framework>.local.md`) use no `paths:` or broad scope as they apply across all layers.
   - Skip generating a file if it would be empty. Skipped files are omitted from the Step 7 report.

   **When `split_output: false`**: Generate single hybrid file per category with both sections.

**Rule file format (hybrid example):**

```markdown
---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# TypeScript Rules

## Principles

- FP only (no classes, pure functions, composition over inheritance)
- Strict null handling (no non-null assertions, explicit narrowing required)
- Barrel exports required (re-export from index.ts per directory)

## Project-specific patterns

- `RefOrNull<T extends { id: string }> = T | { id: null }` - nullable relationships
- `pathFor(page) + url()` - Page Object navigation pair
- `useAuthClient()` returns `{ user, login, logout }` - auth hook interface

## Examples

When in doubt: ./typescript.examples.md
```

**Format guidelines:**

For **Principles** section:
- Each principle: `Principle name (hint1, hint2, hint3)`
- Principle name: noun phrase naming the philosophy (e.g., "Immutability" not "Use const")
- Hints: 2-4 keywords per principle, describing implementation techniques observed in the project
- Only for general style choices (language built-ins)

For **Project-specific patterns** section:
- **One line per pattern**: `` `signature` `` - brief context
- Use inline code for signatures, not code blocks
- Keep context to 2-5 words
- Only include the minimal signature: type name, function signature with return type, or API combination
- Example of minimal: `useAuth() → { user, login, logout }` (not full implementation)

**For `.examples.md` files:** Read `references/examples-format.md` for file structure, Good/Bad contrast guidelines, and the reference section format. Each rule file with a corresponding `.examples.md` must end with a `## Examples` reference section (see the reference for format). `###` titles must match the corresponding rule name exactly — do not translate or rephrase.

**paths patterns by category:**
- TypeScript: `**/*.ts`, `**/*.tsx`
- Python: `**/*.py`
- React: `**/*.tsx`, `**/*.jsx`
- Integration libraries: scope `paths:` to layers where the integration is used
  (e.g., Inertia in controllers: `app/controllers/**`)
- (project.md: no paths frontmatter = applies to all files)

### Step 6.5: Security Self-Check

After generating all rule files, verify no sensitive information was included:

1. Grep generated/updated files for patterns that may indicate secrets:
   - Long hex strings: `[0-9a-fA-F]{20,}`
   - Base64-like strings: `[A-Za-z0-9+/=]{40,}`
   - Keyword-adjacent literals: `(key|token|secret|password|credential)\s*[:=]\s*["'][^"']+`
   - Internal URLs: `(internal|staging|localhost:[0-9]+)`
2. If found, redact with placeholders (e.g., `API_KEY_REDACTED`) and warn the user

**Note:** This check applies to all modes that generate or update rule files (Full Extraction, Update, Restructure, Conversation Extraction). Also check `.examples.md` files — they contain actual code from the codebase and may include sensitive information.

### Step 7: Report Summary

Display analysis summary. See `references/report-templates.md` for format.

---

## Update Mode

When `--update` is specified, re-scan the codebase and add new patterns while preserving existing rules.

**Operational note**: After a dependency's major-version bump, run `--update` so the Step U3 staleness check flags removed symbols. The check only scans inline `` `symbol` `` in `.local.md`'s `## Project-specific patterns` — `.examples.md` is not auto-scanned, so manually review it for the affected framework(s). Stale samples there propagate via reviewers trusting project examples as authoritative. `--restructure` is not a substitute here: it reorganizes files without running the staleness check.

### Step U1: Load Settings and Check Prerequisites

1. Load settings from `extract-rules.local.md` (same as Step 1 in Full Extraction Mode)

2. Check if output directory exists (default: `.claude/rules/`)
   - If not exists: Error "Run /extract-rules first to initialize rule files."
   - If `split_output: true` and hybrid files exist (`.md` files containing both `## Principles` and `## Project-specific patterns`): warn that hybrid files were found — recommend running `--restructure` to migrate to split format
   - If `split_output: false` and `.local.md` files exist: warn that orphaned `.local.md` files were found — recommend deleting orphaned files manually or running `--restructure`

3. Load existing rule files to understand current rules (load `<name>.md`, `<name>.local.md`, and `<name>.examples.md` when split)

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

This prevents rule files from growing indefinitely as the codebase evolves.

### Step U4: Compare and Merge

For each extracted principle/pattern:

1. **Check if already exists**: Compare with existing rules (check both shared and local files if `split_output: true`)
   - Exact match → Skip
   - Similar but different → Keep both (let user review)
   - **Cross-format duplicate check**: A project-specific pattern may have been promoted to a Principle by merge-rules. Check if the pattern's description semantically matches an existing principle name in the corresponding `.md` file (use AI judgment: case-insensitive, synonyms). For example, `` `useAuth() → { user, login, logout }` - auth hook interface `` is a duplicate of `Auth hook interface (useAuth)` in `## Principles`. Skip patterns that already exist as Principles.
   - New → Add

2. **Preserve manual edits**: Do not modify existing rules

### Step U5: Append New Rules

1. **New category detected** (e.g., new framework/language): Create new rule files following Step 6 format. Report as "New" in Step U6.
2. Append new principles to `## Principles` section
3. Append new project-specific patterns to `## Project-specific patterns` section
4. **When `split_output: true`**: Principles go to `<name>.md`, patterns go to `<name>.local.md`. Create missing files with proper frontmatter.
5. For `project.md`: always append to the single file
6. Maintain file structure and formatting
7. **Update `.examples.md`**: Follow the common generation procedure in `references/examples-format.md` to add examples for each new rule.

### Step U5.5: Security Self-Check

Run Security Self-Check (same as Step 6.5) on new/updated files.

### Step U6: Report Changes

Report what was added per file. Also report any stale rules found in Step U3. See `references/report-templates.md` for format.

---

## Restructure Mode

When `--restructure` is specified, re-analyze the codebase to determine the optimal file structure, then merge existing rule content into the new structure. Use this when the project has evolved (new frameworks, architectural changes), when `split_output` settings change, or after updating the extract-rules skill itself.

**Note**: Restructure Mode does NOT run the Step U3 staleness check — use `--update` first so stale symbols are flagged for manual review (see the Update Mode operational note for the post-major-version-bump workflow).

### Step R1: Load Settings and Snapshot Existing Rules

1. Load settings (same as Step 1 in Full Extraction Mode)
2. Check output directory exists → Error if not: "Run /extract-rules first to initialize rule files."
3. Read and parse all existing rule files under output directory (`.md`, `.local.md`, and `.examples.md`)

### Step R2: Re-analyze Codebase

Execute Step 2-5 from Full Extraction Mode to determine the ideal file structure.

### Step R2.5: Resolve File References

Skip this step if `resolve_references` is `false`. Default is `true`.

Scan existing rule content (loaded in R1) for file references (Markdown links, text references like "See `<path>`", `@path` references), resolve them, extract rules from referenced files, and merge into the R1 snapshot. Rules from references are treated as existing rules (take priority on conflict in R4). See `references/resolve-references.md` for detailed processing steps.

### Step R3: Show Restructure Plan and Confirm

Compare old and new file structures, display planned changes (Keep/New/Remove per file), and wait for user confirmation before proceeding. If references were resolved in R2.5, include the number of rules extracted from referenced files in the plan display so the user understands where additional rules came from.

### Step R4: Merge and Write

1. Fresh extraction results as base, route existing rules (including rules extracted from resolved references) to appropriate new files by category/scope/layer/integration
2. **Existing rules take priority** on conflict (respect manual edits, conversation-extracted rules, and reference-extracted rules)
3. Unmatched rules → `project.md` as fallback; preserve custom sections in the most relevant file
4. Apply `split_output` setting (handle hybrid ↔ split transitions), deduplicate
5. **Write new files first**, then remove old files no longer in the new structure
6. **Handle `.examples.md`**: Rename/merge `.examples.md` files following the same structure changes as rule files. Generate new `.examples.md` for categories that didn't have one (see `references/examples-format.md`).

### Step R4.5: Security Self-Check

Run Security Self-Check (same as Step 6.5) on all generated files.

### Step R5: Report Summary

Report structural changes, content merge summary, unmatched rules, and reference resolution results. See `references/report-templates.md` for format.

---

## Conversation Extraction Mode

When `--from-conversation` is specified, extract rules from the full conversation history stored in session `.jsonl` files. The heavy processing (jsonl parsing, analysis, rule writing) is delegated to a subagent to keep the main context clean.

### Step C1: Prepare and Locate Session File (main agent)

1. Load settings from `extract-rules.local.md` (same as Step 1 in Full Extraction Mode)

2. Check if output directory exists (default: `.claude/rules/`)
   - If not exists: Error "Run /extract-rules first to initialize rule files."

3. **Locate the session file:**

   1. Get the current working directory (`pwd`)
   2. Encode the path: replace `/` and `.` with `-` (leading `-` is kept)
      - Example: `/Users/hiropon/Sources/github.com/myproject` → `-Users-hiropon-Sources-github-com-myproject`
   3. Session files are stored at: `~/.claude/projects/<encoded-path>/<session-id>.jsonl`

4. **Select the target session:**

   - If a `<session-id>` argument is provided: use `~/.claude/projects/<encoded-path>/<session-id>.jsonl`
   - If no argument: use the most recently modified `.jsonl` file in the directory (by `ls -t`)
     - Note: This is a heuristic — if multiple Claude Code instances are running concurrently, the latest file may not be the current session.
   - Verify the file exists. Inform the user which session file was selected.

### Step C2: Delegate to Subagent (main agent)

Spawn a subagent using the Agent tool. The subagent performs all heavy processing (C3–C5) and returns a summary of what was added. Read `references/conversation-mode.md` for the full subagent instructions (Steps C3–C5).

Include in the agent prompt:
- This skill's absolute directory path (where SKILL.md resides — needed to run bundled scripts)
- Session file absolute path
- Output directory path and `split_output` / `language` settings
- List of existing rule file paths (for deduplication)
- The subagent instructions from `references/conversation-mode.md`

After the subagent completes, report the results to the user.

---

## PR Review Extraction Mode

When `--from-pr` is specified, extract rules from PR review comments (human comments only).
Single or multiple PRs can be specified. Numbers and URLs can be mixed. Cross-repository PRs are allowed.

Read `references/pr-review-mode.md` for the full processing steps (P1-P5). Key flow:
1. Check prerequisites (`gh` CLI authentication)
2. Parse all PR arguments, validate each PR exists
3. Fetch review comments from GitHub API (3 endpoints per PR), filter bot comments
4. Extract principles and patterns (same criteria as `references/extraction-criteria.md`)
5. **Multiple PRs**: Cross-PR frequency analysis — general best practices that are repeatedly pointed out across different PRs are promoted as organizational emphasis (reframed with specific application context, not just restated)
6. Append to existing rule files and update `.examples.md` (same as Step C5)
