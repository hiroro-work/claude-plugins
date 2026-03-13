---
name: extract-rules
description: Extract project-specific coding rules and domain knowledge from existing codebase, generating markdown documentation for AI agents. Use this skill when onboarding a new project, after significant code review discussions about coding style, when coding conventions need to be documented, or when the team's coding patterns should be captured for consistency. Also consider running with --from-conversation after sessions where coding preferences were discussed or corrected, or --from-pr after PRs with significant review feedback.
model: opus
allowed-tools: Read, Glob, Grep, Write, Bash(ls *), Bash(mkdir *), Bash(git ls-files *), Bash(wc *), Bash(head *), Bash(tail *), Bash(sort *), Bash(uniq *), Bash(tree *), Bash(gh pr view *), Bash(gh pr diff *), Bash(gh api *), Bash(gh auth status *), Bash(gh repo view *)
---

# Extract Rules

Analyzes existing codebase to extract project-specific coding rules and domain knowledge, generating structured markdown documentation for AI agents.

## Usage

```text
/extract-rules                      # Extract rules from codebase (initial)
/extract-rules --update             # Re-scan and add new patterns (preserve existing)
/extract-rules --restructure        # Re-analyze, reorganize structure, merge existing rules
/extract-rules --from-conversation  # Extract rules from conversation and append
/extract-rules --from-pr 123                   # カレントリポのPR指定
/extract-rules --from-pr owner/repo#123        # 他リポのPR指定（URL形式も可）
/extract-rules --from-pr 100..110              # 範囲指定（カレントリポ）
/extract-rules --from-pr owner/repo#100..110   # 範囲指定（他リポ）
# 複数指定可（スペース区切り）→ 横断分析で組織重視の原則を検出
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
| `language` | (none) | Report output language (e.g., `ja`) |
| `split_output` | `true` | Separate Principles (.md) and patterns (.local.md) |

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
---
```

## Output Structure

**Default** (`split_output: true`):
```text
.claude/rules/
├── languages/
│   ├── typescript.md          # Principles only (portable)
│   ├── typescript.local.md    # Project-specific patterns only
│   └── ...
├── frameworks/
│   ├── react.md               # Principles only (portable)
│   ├── react.local.md         # Project-specific patterns only
│   └── ...
└── project.md                 # Always single file (no split)
```

Principles (portable across projects) and Project-specific patterns (local) are separated by default. This enables organizational rule sharing and AI-driven merge across projects.

**Hybrid mode** (`split_output: false`):
```text
.claude/rules/
├── languages/
│   └── typescript.md    # Principles + Project-specific patterns
├── frameworks/
│   └── react.md         # Principles + Project-specific patterns
└── project.md           # Domain, architecture, conventions
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

Example output with integrations:
```text
.claude/rules/
├── languages/
│   └── ruby.md
├── frameworks/
│   ├── rails.md
│   ├── rails-controllers.md
│   └── rails-models.md
├── integrations/
│   ├── rails-inertia.md
│   └── rails-pundit.md
└── project.md
```

**Format switching:** Run `--restructure` after changing `split_output` setting to switch between split and hybrid formats.

## Processing Flow

### Mode Detection

Check arguments to determine mode:

- No arguments → **Full Extraction Mode** (Step 1-7)
- `--update` → **Update Mode** (Step U1-U5)
- `--restructure` → **Restructure Mode** (Step R1-R5)
- `--from-conversation` → **Conversation Extraction Mode** (Step C1-C4)
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

**Extract settings** (`target_dirs`, `exclude_dirs`, `exclude_patterns`, `output_dir`, `language`, `split_output`) from the config file. See Configuration section above for defaults.

### Step 2: Detect Project Type

Detect project language and framework:

**1. Check configuration files:**
- `package.json` → Node.js/TypeScript/JavaScript
- `tsconfig.json` → TypeScript
- `pyproject.toml`, `requirements.txt` → Python
- `go.mod` → Go
- `Cargo.toml` → Rust
- `Gemfile` → Ruby/Rails
- `pom.xml`, `build.gradle` → Java

**2. Count file extensions:**
- `.ts`, `.tsx` → TypeScript
- `.js`, `.jsx` → JavaScript
- `.py` → Python
- `.go` → Go
- `.rb` → Ruby

**3. Detect framework-specific files:**

Identify frameworks by their config files (e.g., `next.config.*`, `playwright.config.*`, `jest.config.*`) and dependencies in package.json, requirements.txt, Gemfile, etc.

**4. Detect architectural layers** (for layered frameworks):

If a framework has distinct layers with separate directories (e.g., Rails: `app/models/`, `app/controllers/`, `app/views/`; Django: `models.py`, `views.py`; Spring: `controller/`, `service/`, `repository/`), detect them for layer-specific rule files. Only split when corresponding directories actually exist.

**5. Detect integration libraries** (for layered frameworks):

Read `references/integration-criteria.md` for detection rules and classification criteria.

**Output:** List of detected languages, frameworks, architectural layers, and integration libraries

### Step 3: Collect Sample Files

Collect target files for analysis:

1. **Get git-tracked files** (if in a git repository)
   - Use `git ls-files` to get list of tracked files
   - This automatically respects ALL `.gitignore` files (root and subdirectories)
   - If not a git repo, fall back to Glob with manual exclusions:
     - Read `.gitignore` if present and apply patterns
     - Apply `exclude_dirs` and `exclude_patterns` from settings
     - Note: Nested `.gitignore` files may not be fully respected in non-git mode

2. Filter files by `target_dirs` setting

3. Exclude files matching:
   - `exclude_dirs` from settings
   - `exclude_patterns` from settings

4. Filter by detected language extensions

5. Sample files per category, distributed across directories for representative coverage
   - Target: 10-15 files per category (language/framework)
   - For large projects (100+ files per category): prioritize diversity across directories over quantity
   - For small projects (<10 files per category): analyze all files

### Step 4: Analyze by Category

Read `references/extraction-criteria.md` before proceeding to understand the classification criteria.

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

### Step 5: Analyze Documentation

Also analyze non-code documentation:

- README.md
- CONTRIBUTING.md
- PR templates
- Existing CLAUDE.md

Extract explicit coding rules and guidelines from these documents.

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

   **By default** (`split_output: true`): Generate 2 files per category (except project.md):
   - `<name>.md` — `## Principles` only (portable)
   - `<name>.local.md` — `## Project-specific patterns` only (local)
   - Layer-specific and regular files require `paths:` frontmatter independently. Cross-layer files (`<framework>.md`) use no `paths:` or broad scope as they apply across all layers.
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

**Note:** This check applies to all modes that generate or update rule files (Full Extraction, Update, Restructure, Conversation Extraction).

### Step 7: Report Summary

Display analysis summary. See `references/report-templates.md` for format.

---

## Update Mode

When `--update` is specified, re-scan the codebase and add new patterns while preserving existing rules.

### Step U1: Load Settings and Check Prerequisites

1. Load settings from `extract-rules.local.md` (same as Step 1 in Full Extraction Mode)

2. Check if output directory exists (default: `.claude/rules/`)
   - If not exists: Error "Run /extract-rules first to initialize rule files."
   - If `split_output: true` and hybrid files exist (`.md` files containing both `## Principles` and `## Project-specific patterns`): warn that hybrid files were found — recommend running `--restructure` to migrate to split format
   - If `split_output: false` and `.local.md` files exist: warn that orphaned `.local.md` files were found — recommend deleting orphaned files manually or running `--restructure`

3. Load existing rule files to understand current rules (load both `<name>.md` and `<name>.local.md` when split)

### Step U2: Re-scan Codebase

Execute Step 2-5 from Full Extraction Mode:
- Detect project type
- Collect sample files
- Analyze by category
- Analyze documentation

### Step U3: Compare and Merge

For each extracted principle/pattern:

1. **Check if already exists**: Compare with existing rules (check both shared and local files if `split_output: true`)
   - Exact match → Skip
   - Similar but different → Keep both (let user review)
   - New → Add

2. **Preserve manual edits**: Do not modify existing rules

### Step U4: Append New Rules

1. **New category detected** (e.g., new framework/language): Create new rule files following Step 6 format. Report as "New" in Step U5.
2. Append new principles to `## Principles` section
3. Append new project-specific patterns to `## Project-specific patterns` section
4. **When `split_output: true`**: Principles go to `<name>.md`, patterns go to `<name>.local.md`. Create missing files with proper frontmatter.
5. For `project.md`: always append to the single file
6. Maintain file structure and formatting

### Step U4.5: Security Self-Check

Run Security Self-Check (same as Step 6.5) on new/updated files.

### Step U5: Report Changes

Report what was added per file. See `references/report-templates.md` for format.

---

## Restructure Mode

When `--restructure` is specified, re-analyze the codebase to determine the optimal file structure, then merge existing rule content into the new structure. Use this when the project has evolved (new frameworks, architectural changes), when `split_output` settings change, or after updating the extract-rules skill itself.

### Step R1: Load Settings and Snapshot Existing Rules

1. Load settings (same as Step 1 in Full Extraction Mode)
2. Check output directory exists → Error if not: "Run /extract-rules first to initialize rule files."
3. Read and parse all existing rule files under output directory (`.md` and `.local.md`)

### Step R2: Re-analyze Codebase

Execute Step 2-5 from Full Extraction Mode to determine the ideal file structure.

### Step R3: Show Restructure Plan and Confirm

Compare old and new file structures, display planned changes (Keep/New/Remove per file), and wait for user confirmation before proceeding.

### Step R4: Merge and Write

1. Fresh extraction results as base, route existing rules to appropriate new files by category/scope/layer/integration
2. **Existing rules take priority** on conflict (respect manual edits and conversation-extracted rules)
3. Unmatched rules → `project.md` as fallback; preserve custom sections in the most relevant file
4. Apply `split_output` setting (handle hybrid ↔ split transitions), deduplicate
5. **Write new files first**, then remove old files no longer in the new structure

### Step R4.5: Security Self-Check

Run Security Self-Check (same as Step 6.5) on all generated files.

### Step R5: Report Summary

Report structural changes, content merge summary, and unmatched rules. See `references/report-templates.md` for format.

---

## Conversation Extraction Mode

When `--from-conversation` is specified, extract rules from the conversation history.

### Step C1: Load Settings and Check Prerequisites

1. Load settings from `extract-rules.local.md` (same as Step 1 in Full Extraction Mode)

2. Check if output directory exists (default: `.claude/rules/`)
   - If not exists: Error "Run /extract-rules first to initialize rule files."

3. Load existing rule files to understand current rules (if `split_output: true`, load both `<name>.md` and `<name>.local.md`)

### Step C2: Analyze Conversation Context

Analyze the current conversation context to identify coding style discussions, preferences, and corrections.

- Focus on user instructions, code review feedback, and explicit style preferences
- Note: If context was compacted, history may be limited — extract what is available

### Step C3: Extract Principles and Patterns

Look for user preferences and classify them (same as Full Extraction Mode):

**1. General best practice feedback** → Skip (do NOT extract):
   - "Use const" "No magic numbers" "DRY" "Early returns" → General knowledge, AI already knows
   Only extract if the project/team has made a specific choice beyond general best practices:
   - "We use FP only, no classes" → Team-specific paradigm choice

**2. Project-specific patterns** → Extract with concrete examples:
   - "Use `RefOrNull<T>` for nullable refs" → Include type definition
   - "Always use `pathFor()` with `url()`" → Include usage pattern

**3. Code review feedback**: Identify underlying philosophy or specific patterns

Apply the same criteria as Full Extraction Mode (see `references/extraction-criteria.md`).

### Step C4: Append Principles and Patterns

1. Categorize each extracted item:
   - Language-specific → `languages/<lang>.md`
   - Framework-specific → `frameworks/<framework>.md`
   - Integration-specific → `integrations/<framework>-<integration>.md`
   - Project-level → `project.md`

   **By default** (`split_output: true`): Conversation-extracted **project-specific patterns** always go to `.local.md` files. Principles may be added to shared files. `project.md` is always a single file — project-level items go there regardless of `split_output`. Promoting patterns to shared files should be done manually or via organization-level merge.

2. Check for duplicates: Skip if already exists or covered

3. Append using the same format as Step 6 (see Format guidelines)

4. Run Security Self-Check (same as Step 6.5) on updated files.

5. Report what was added. See `references/report-templates.md` for format.

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
6. Append to existing rule files (same as Step C4)

---

