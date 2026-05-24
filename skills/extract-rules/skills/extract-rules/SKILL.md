---
name: extract-rules
description: Extract project-specific coding rules and domain knowledge from existing codebase, generating markdown documentation for AI agents. Use when onboarding a new project, after code review discussions about coding style, or when coding conventions need documenting. Also consider running after sessions where coding preferences were discussed or corrected (--from-conversation), or after PRs with significant review feedback (--from-pr).
model: opus
allowed-tools: Read, Glob, Grep, Write, Edit, Agent, TodoWrite, Bash(ls *), Bash(mkdir *), Bash(git ls-files *), Bash(git checkout HEAD -- *), Bash(wc *), Bash(head *), Bash(tail *), Bash(sort *), Bash(uniq *), Bash(tree *), Bash(gh pr view *), Bash(gh pr diff *), Bash(gh api *), Bash(gh auth status *), Bash(gh repo view *), Bash(node *)
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
/extract-rules --compact                       # Compact all over-threshold rules files (output_dir/**/*.md)
/extract-rules --compact path/to/file.md ...   # Compact specific files (caller passes explicit paths)
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
| `output_dir` | `.claude/rules` | Output directory for rule files (`.md` and `.local.md`). This directory is inside Claude Code's `.claude/rules/**` recursive auto-load scope, so every file written here is injected into context on session start |
| `examples_output_dir` | `.claude/rules-extras` | Output directory for `.examples.md` files. Defaults to a sibling directory **outside** `.claude/rules/**` so examples are not auto-loaded into context on session start. Set to `output_dir` (or any path under `output_dir`) to opt examples back into auto-load |
| `staging_output_dir` | `.claude/rules-staging` | Output directory for staged project-level patterns extracted in incremental modes (`--from-conversation` / `--from-pr`). On 1st observation, project-level patterns land here; on 2nd observation (matched in a later incremental run or by `--update`), they are promoted to `<output_dir>/project.md` and removed from staging. Defaults to a sibling directory **outside** `.claude/rules/**` so staged candidates are not auto-loaded into context on session start. Set to `output_dir` (or any path under `output_dir`) to opt staging back into auto-load. Language / framework / integration patterns bypass staging and land directly in their respective `.local.md` files (gating is scoped to project-level patterns) |
| `language` | `ja` | Report language (e.g., `ja`) |
| `split_output` | `true` | Separate Principles (.md) and patterns (.local.md) |
| `resolve_references` | `true` | Resolve file references during restructure |
| `compaction_threshold` | `40000` | Char count threshold for `--compact` mode (file is compacted if char count exceeds this). Set to a very large number (e.g. `99999999`) to opt out of compaction. The default `40000` matches Claude Code's per-file warning threshold (40k chars, observed in Claude Code 2.1.x) — firing the gate exactly at the warning matches the user's visible signal that the file needs attention (buffer 0). To restore the prior `32000` default (80% buffer for subsequent rule additions — preventive trigger before the warning fires), set `compaction_threshold: 32000` explicitly |
| `min_cluster_size` | `3` | Minimum related-bullet cluster size for `--compact` mode's consolidation detection. The subagent emits `consolidation_proposals` only when a cluster has at least this many related bullets. Set to a very large number (e.g. `99999999`) to disable consolidation while keeping compaction (matches the `compaction_threshold` opt-out sentinel convention) |

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
examples_output_dir: .claude/rules-extras
staging_output_dir: .claude/rules-staging
language: ja
split_output: true
resolve_references: true
compaction_threshold: 40000
min_cluster_size: 3
---
```

## Output Structure

Three output directories are involved: `output_dir` for rule files (`.md` / `.local.md`), `examples_output_dir` for `.examples.md` files, and `staging_output_dir` for staged 1st-observation project-level patterns from incremental modes. The default values place rule files under Claude Code's `.claude/rules/**` recursive auto-load scope and place examples / staging in sibling directories outside that scope, so examples and staged candidates do not consume context on session start. The `paths:` frontmatter on rule files is preserved as a human-facing category-scope hint — its loader-side semantics is not empirically verified, and the actual auto-load boundary is determined by directory placement only.

**Default** (`split_output: true`):
```text
.claude/rules/                     # output_dir (inside auto-load scope)
├── languages/
│   ├── typescript.md              # Principles only (portable)
│   └── typescript.local.md        # Project-specific patterns only
├── frameworks/
│   ├── react.md                   # Principles only (portable)
│   └── react.local.md             # Project-specific patterns only
└── project.md                     # Always single file (no split)

.claude/rules-extras/              # examples_output_dir (outside auto-load scope)
├── languages/
│   └── typescript.examples.md     # Examples for both
├── frameworks/
│   └── react.examples.md          # Examples for both
└── project.examples.md            # Examples

.claude/rules-staging/             # staging_output_dir (outside auto-load scope)
└── project.staging.local.md       # 1st-observation project-level candidates (incremental modes only)
```

Staging holds project-level 1-shot pattern candidates written by a single `--from-conversation` / `--from-pr` invocation; the next incremental run promotes a re-observed candidate to canonical and removes it from staging.

Principles (portable across projects) and Project-specific patterns (local) are separated by default. This enables organizational rule sharing and AI-driven merge across projects.

**Hybrid mode** (`split_output: false`):
```text
.claude/rules/                     # output_dir (inside auto-load scope)
├── languages/
│   └── typescript.md              # Principles + Project-specific patterns
├── frameworks/
│   └── react.md                   # Principles + Project-specific patterns
└── project.md                     # Domain, architecture, conventions

.claude/rules-extras/              # examples_output_dir (outside auto-load scope)
├── languages/
│   └── typescript.examples.md     # Examples
├── frameworks/
│   └── react.examples.md          # Examples
└── project.examples.md            # Examples

.claude/rules-staging/             # staging_output_dir (outside auto-load scope)
└── project.staging.local.md       # 1st-observation project-level candidates (incremental modes only)
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

Example output with integrations (split mode — each category also gets a `.examples.md` under `examples_output_dir`):
```text
.claude/rules/                     # output_dir
├── languages/
│   └── ruby.md / ruby.local.md
├── frameworks/
│   ├── rails.md / rails.local.md
│   ├── rails-controllers.md / .local.md
│   └── rails-models.md / .local.md
├── integrations/
│   ├── rails-inertia.md / .local.md
│   └── rails-pundit.md / .local.md
└── project.md

.claude/rules-extras/              # examples_output_dir
├── languages/
│   └── ruby.examples.md
├── frameworks/
│   ├── rails.examples.md
│   ├── rails-controllers.examples.md
│   └── rails-models.examples.md
├── integrations/
│   ├── rails-inertia.examples.md
│   └── rails-pundit.examples.md
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
- `--compact [<paths>]` → **Compaction Mode** (Step CP1-CP5)
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

**Extract settings** (`target_dirs`, `exclude_dirs`, `exclude_patterns`, `output_dir`, `examples_output_dir`, `staging_output_dir`, `language`, `split_output`, `resolve_references`, `compaction_threshold`) from the config file. See Configuration section above for defaults.

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

1. Check if `output_dir` exists
   - If exists: Error "Output directory already exists. Use `--restructure` to reorganize, `--update` to add new patterns, or delete the directory manually to start fresh."
   - If not exists: Create `output_dir`. Also create `examples_output_dir` if it differs from `output_dir` and does not exist yet (when both resolve to the same path the single directory created above is reused).

2. Generate rule files per category. Rule files (`<name>.md` and `<name>.local.md`) are written under `output_dir`; `<name>.examples.md` files are written under `examples_output_dir` (default: `.claude/rules-extras` — outside Claude Code's `.claude/rules/**` auto-load scope, so examples do not consume context on session start).

   - `languages/<lang>.md` for language-specific rules (under `output_dir`)
   - `frameworks/<framework>.md` for framework-specific rules (under `output_dir`)
   - `project.md` for project-specific rules (under `output_dir`)
   - **Layered frameworks**: `<framework>.md` (cross-layer) + `<framework>-<layer>.md` per detected layer with scoped `paths:`
   - **Integration libraries**: See `references/integration-criteria.md` "Output structure" section.

   **By default** (`split_output: true`): Generate 3 files per category (except project which gets 2):
   - `<output_dir>/<name>.md` — `## Principles` only (portable), with `paths:` frontmatter
   - `<output_dir>/<name>.local.md` — `## Project-specific patterns` only (local), with the **same `paths:` frontmatter** as its `<name>.md` counterpart (`paths:` is retained as a human-facing category-scope hint; loader-side semantics is not empirically verified, and auto-load is determined by directory placement only)
   - `<examples_output_dir>/<name>.examples.md` — Examples for both. Whether the file is auto-loaded depends on `examples_output_dir`'s placement relative to `.claude/rules/**`: with the default `.claude/rules-extras` it is outside auto-load scope; with `examples_output_dir` set to `output_dir` (or any path under it) it is auto-loaded
   - Layer-specific and regular files each define their own `paths:` independently (applies to both `.md` and `.local.md`). Cross-layer files (`<framework>.md` / `<framework>.local.md`) use no `paths:` or broad scope as they apply across all layers.
   - Skip generating a file if it would be empty. Skipped files are omitted from the Step 7 report.

   **When `split_output: false`**: Generate single hybrid file per category under `output_dir`, and the matching `<name>.examples.md` under `examples_output_dir`.

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

When in doubt: ../../rules-extras/languages/typescript.examples.md
```

(The path above assumes default settings — `output_dir: .claude/rules` and `examples_output_dir: .claude/rules-extras`. See `references/examples-format.md` § Reference Section in Rule Files for the relative-path computation under non-default settings.)

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

**Staging awareness**: Update Mode reads the staging file under `staging_output_dir` (when present) and promotes any staged project-level patterns that re-match against fresh code observations to canonical (`<output_dir>/project.md`, the single hybrid file for project-level patterns), removing them from staging. Update Mode does **not** write new entries to staging — un-matched new patterns from this run land directly in canonical as today (operator-driven Update is treated as explicit "land this now" intent). See `references/conversation-mode.md` § Mode interaction summary for the full per-mode staging behavior.

**Operational note**: After a dependency's major-version bump, run `--update` so the Step U3 staleness check flags removed symbols. The check only scans inline `` `symbol` `` in `.local.md`'s `## Project-specific patterns` — `.examples.md` is not auto-scanned, so manually review it for the affected framework(s). Stale samples there propagate via reviewers trusting project examples as authoritative. `--restructure` is not a substitute here: it reorganizes files without running the staleness check.

### Step U1: Load Settings and Check Prerequisites

1. Load settings from `extract-rules.local.md` (same as Step 1 in Full Extraction Mode)

2. Check if output directory exists (default: `.claude/rules/`)
   - If not exists: Error "Run /extract-rules first to initialize rule files."
   - If `split_output: true` and hybrid files exist (`.md` files containing both `## Principles` and `## Project-specific patterns`): warn that hybrid files were found — recommend running `--restructure` to migrate to split format
   - If `split_output: false` and `.local.md` files exist: warn that orphaned `.local.md` files were found — recommend deleting orphaned files manually or running `--restructure`

3. Load existing rule files to understand current rules (load `<output_dir>/<name>.md`, `<output_dir>/<name>.local.md`, and `<examples_output_dir>/<name>.examples.md` when split). When `examples_output_dir` does not yet exist (e.g. legacy projects where examples were co-located under `output_dir`), fall back to loading `<output_dir>/<name>.examples.md` so existing examples are not invisible to the merge step; `--restructure` can subsequently migrate them to `examples_output_dir`. Additionally load `<staging_output_dir>/project.staging.local.md` if present — this file is required for the Step U4 staging-match branch. Skip silently if the staging file does not yet exist (no incremental run has populated it yet).

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

1. **Check if already exists**: Compare with existing rules (check both shared and local files if `split_output: true`). Evaluate the branches below in order, first match wins (same evaluate-in-order discipline as `references/conversation-mode.md` § Step C5's "Check for duplicates and route per category" step):
   - Exact match → Skip
   - Similar but different → Keep both (let user review)
   - **Cross-format duplicate check**: A project-specific pattern may have been promoted to a Principle by merge-rules. Check if the pattern's description semantically matches an existing principle name in the corresponding `.md` file (use AI judgment: case-insensitive, synonyms). For example, `` `useAuth() → { user, login, logout }` - auth hook interface `` is a duplicate of `Auth hook interface (useAuth)` in `## Principles`. Skip patterns that already exist as Principles.
   - **Staging match (project-level patterns only)**: if the pattern matches an entry in `<staging_output_dir>/project.staging.local.md` per the staging-match criterion (see `references/conversation-mode.md` § Step C5's "staging-match criterion" paragraph), schedule a **promote** — append to `<output_dir>/project.md` (the single hybrid file for project-level patterns) in Step U5, then delete the matched entry from staging in Step U5 (move-atomicity: canonical-first, staging-delete-second). Update Mode does not write new staging entries; un-matched project-level patterns land directly in canonical.
   - New → Add

2. **Preserve manual edits**: Do not modify existing rules

### Step U5: Append New Rules

1. **New category detected** (e.g., new framework/language): Create new rule files following Step 6 format. Report as "New" in Step U6.
2. Append new principles to `## Principles` section
3. Append new project-specific patterns to `## Project-specific patterns` section
4. **When `split_output: true`**: Principles go to `<output_dir>/<name>.md`, patterns go to `<output_dir>/<name>.local.md`. Create missing files with proper frontmatter.
5. For `<output_dir>/project.md`: always append to the single file
6. Maintain file structure and formatting
7. **Update `.examples.md`**: Resolve the target path via `examples_output_dir` (`<examples_output_dir>/<name>.examples.md`). Create the file (and any missing parent directories under `examples_output_dir`) when absent. Follow the common generation procedure in `references/examples-format.md` to add examples for each new rule. Per `references/conversation-mode.md` § Step C5's **"Update `.examples.md`"** step ("examples-on-canonical-only"), both direct canonical appends and promotes from staging count as canonical writes and trigger examples; Update Mode has no staging-only path, so every new rule in this step gets an `.examples.md` entry.
8. **Promote staging matches** (project-level patterns flagged in Step U4 as staging matches): append each to `<output_dir>/project.md` (the single hybrid file for project-level patterns, per item 5) and, after verifying the canonical write, `Edit` `<staging_output_dir>/project.staging.local.md` to remove the corresponding bullet. If the staging-delete `Edit` fails because the bullet is no longer uniquely matchable, leave the duplicate — the next session's canonical-match skip resolves it. Update Mode does not write new staging entries.

### Step U5.5: Security Self-Check

Run Security Self-Check (same as Step 6.5) on new/updated files, **including the staging file** if any staging-delete edits landed in Step U5 (the staging file was rewritten by the staging-delete `Edit`).

### Step U6: Report Changes

Report what was added per file. Also report any stale rules found in Step U3. Include `canonical_skip_count` and `promoted_count` (Update Mode never increments `staged_count` because it does not write new staging entries). See `references/report-templates.md` for format.

---

## Restructure Mode

When `--restructure` is specified, re-analyze the codebase to determine the optimal file structure, then merge existing rule content into the new structure. Use this when the project has evolved (new frameworks, architectural changes), when `split_output` settings change, or after updating the extract-rules skill itself.

**Note**: Restructure Mode does NOT run the Step U3 staleness check — use `--update` first so stale symbols are flagged for manual review (see the Update Mode operational note for the post-major-version-bump workflow).

### Step R1: Load Settings and Snapshot Existing Rules

1. Load settings (same as Step 1 in Full Extraction Mode)
2. Check `output_dir` exists → Error if not: "Run /extract-rules first to initialize rule files."
3. Read and parse all existing rule files: `<output_dir>/**/<name>.md` and `<output_dir>/**/<name>.local.md` (rule files), plus `<examples_output_dir>/**/<name>.examples.md` (examples files). When `examples_output_dir` differs from `output_dir`, also scan `<output_dir>/**/<name>.examples.md` to pick up legacy co-located examples written by older runs; treat such legacy files as candidates to migrate during Step R4.

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
6. **Handle `.examples.md`**: Write `.examples.md` files to `<examples_output_dir>/<name>.examples.md`, following the same structure changes as rule files. When R1 picked up legacy `<output_dir>/<name>.examples.md` files (co-located with rule files from older runs), move them to the new location under `examples_output_dir` and remove the legacy copies after the new file is written. Generate new `.examples.md` for categories that didn't have one (see `references/examples-format.md`).

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
- `output_dir`, `examples_output_dir`, and `staging_output_dir` paths, plus `split_output` / `language` settings (the subagent must write rule files under `output_dir`, `.examples.md` files under `examples_output_dir`, and staging entries under `staging_output_dir`)
- `canonical_files`: list of existing rule file paths for canonical-match deduplication — include both rule files under `output_dir` and `.examples.md` files under `examples_output_dir`
- `staging_files`: list of existing staging file paths for staging-match detection — include the project-level staging file under `staging_output_dir` (gating is scoped to project-level patterns)
- The subagent instructions from `references/conversation-mode.md`

After the subagent completes, report the results to the user.

---

## Compaction Mode

When `--compact` is specified, compact over-threshold rules files so they stay below Claude Code's per-file warning threshold (40k chars in Claude Code 2.1.x). Target file selection, char-count check, and threshold filtering all happen inside this mode — callers (e.g. `dev-workflow` Step 11) invoke `--compact` without file arguments and let this mode resolve the target set.

Use the Pattern A iteration loop convention (sibling to `verify-diff` / `publicity-review` / `skill-review`): the Skill wrapper runs in the main thread, a subagent performs the compaction analysis, the main thread applies the resulting `mechanical_edits`, and a fenced JSON return contract is emitted for caller dispatch. Per-file outer loop with `max_iterations = 2` (default).

### Step CP1: Load Settings and Resolve Targets

1. Load settings from `extract-rules.local.md` (same as Step 1 in Full Extraction Mode). `compaction_threshold` (default `40000`) is the filter applied below in step 3. `min_cluster_size` (default `3`) gates consolidation detection inside Step CP2 — it does not affect target resolution here
2. Check `output_dir` exists. If not, emit `{"status": "error", "reason": "output directory not found"}` and stop
3. Resolve targets:
   - With explicit path arguments (caller-passed paths): use those paths. For each, `Read` the file content and measure its char count via the `Read` output length (do **not** use `Bash(wc -m)` — `Read` length matches Claude Code's char-count metric, while `wc -c` reports bytes which diverge for multi-byte content). All explicit paths join the Step CP2 target set, regardless of char count: under-threshold paths still enter Step CP2 so the consolidation pass can run on them — `mechanical_edits` will be empty for under-threshold files (the convergence check at (d) terminates them immediately), but `consolidation_proposals` may still be emitted. The widened `skipped-below-threshold` status (set at Step CP2 (d), not here — (f) merely records what (d) chose) labels these files. Explicit-paths mode accepts paths under either `output_dir` or `examples_output_dir` — callers needing to compact `.examples.md` files when `examples_output_dir != output_dir` must use this mode
   - Without arguments: `Glob <output_dir>/**/*.md` (covers `.md` / `.local.md` uniformly — and also `.examples.md` if any are still co-located under `output_dir` from legacy runs, since the glob does not distinguish by extension). For each file, `Read` and measure its char count; collect entries with char count `> compaction_threshold` into the target set. **Note**: discovery mode does **not** surface sub-threshold files in `files_processed` (they are silently filtered out). This asymmetry is intentional: an unargumented `--compact` invocation reports only files that actually crossed the threshold, while caller-passed paths report every path the caller named so the caller can correlate input to output. **Trade-off**: clusters inside small (under-threshold) files are not detected by discovery mode; to scan them for consolidation, invoke `--compact <path>` (or `--compact <path1> <path2> ...`) with explicit paths. **Discovery scope**: this branch scans `output_dir` only — when `examples_output_dir` differs from `output_dir` (including the default `.claude/rules-extras` configuration), `.examples.md` files under `examples_output_dir` are **not** discovered automatically. Rationale: `.examples.md` files outside `.claude/rules/**` are already exempt from Claude Code auto-load, so they do not consume session-start context and the compaction priority is correspondingly lower; the explicit-paths route preserves the ability to compact them on demand

   Cache the per-file `Read` content keyed by path for reuse in Step CP2 (a) iter 1's dispatch payload — avoids a second `Read` of the same file before the first subagent dispatch
4. If the target set is empty (no paths resolved at all — empty explicit-paths argument or zero discovery hits), emit `{"status": "no-actionable", "compaction_threshold": <int>, "min_cluster_size": <int>, "files_processed": [], "reason": "no targets resolved"}` and stop

### Step CP2: Per-File Compaction (Pattern A iteration loop)

**Pre-register per-file TodoWrite items** — before entering the per-file outer loop, create one TodoWrite row per file in the target set (e.g. `compact: <path>`); the target set now includes both over-threshold and under-threshold explicit paths (under-threshold paths enter the loop so the consolidation pass can run on them). Mark each row `in_progress` before its first dispatch and `completed` after the per-file loop terminates (regardless of `per_file_status` outcome — `converged` / `partial` / `unresolved` / `error` / `skipped-below-threshold` all flip the row to `completed`; the outcome is carried in the per-file record, not the TodoWrite status). Per-iter progress within a file is tracked inline within this Step (no per-iter TodoWrite row) because the iter count is bounded at `max_iterations = 2`.

For each file in the target set, run the per-file iteration loop. `max_iterations = 2` by default (compaction is judgment-heavy; two passes give the subagent a chance to refine its first attempt before declaring `partial`). Under-threshold files terminate at iter 1's (d) convergence check (chars_after ≤ compaction_threshold is already true), so their loop effectively runs once for consolidation detection only.

**(a) Read & dispatch (per-iter)**: On iter 1, reuse the cached content from Step CP1 step 3 — `chars_before` is that cache entry's char count (avoids re-reading the same file). On iter `i ≥ 2`, re-`Read` the target file so the subagent operates on the post-prior-iter content. Spawn an `Agent` (`subagent_type: general-purpose`) with the dispatch prompt assembled from these `--- LABEL ---` sections (same fence convention as `verify-diff` Step 3 dispatch):

- `--- TARGET FILE ---`: absolute path + full current content
- `--- COMPACTION HEURISTICS ---`: the four heuristics enumerated in `references/compaction-mode.md` § Heuristics (class-level extension merge / similar-entry merge / example reference extraction / one-shot incident dropout) — emit into `mechanical_edits` / `structural_notes`
- `--- CONSOLIDATION HEURISTICS ---`: the four heuristics enumerated in `references/compaction-mode.md` § Consolidation heuristics — emit into `consolidation_proposals` only, gated by the resolved `min_cluster_size`
- `--- TARGET CHARS ---`: the resolved `compaction_threshold`
- `--- MIN CLUSTER SIZE ---`: the resolved `min_cluster_size` integer
- `--- ITER INFO ---`: current iter number (1 or 2), `max_iter` (2). On iter 2, also include a one-line summary of what iter 1 applied (the count of `mechanical_edits` landed and the iter-1 `chars_after` figure) so the subagent can plan an additional pass. Note: `consolidation_proposals` are collected from iter 1 only and the subagent should not re-emit them on iter 2
- `--- COMPACTOR PROMPT ---`: the subagent instructions, including the `mechanical_edits` `old_string` uniqueness convention (1–3 lines of surrounding context, per the `verify-diff` convention) and the two-heuristic-set / distinct-output-array routing (see `references/compaction-mode.md` § Contract). Include the body verbatim from `references/compaction-mode.md`
- `--- RESPONSE FORMAT ---`: the fenced JSON schema the subagent must emit (per-iter response, not the top-level skill return shape)

**(b) Parse**: parse the subagent's fenced JSON response. Evaluate in this order, **first match wins** (same evaluate-in-order discipline as `verify-diff` § (b) Parse & apply):

1. **Verdict missing or malformed** — no fenced JSON block found, or JSON parse fails → terminate this file's loop with per-file `status: "error"`, `reason: "verdict parse failure"`
2. **Schema violation** — required keys (`mechanical_edits`, `structural_notes`, `consolidation_proposals`) are missing, values are not arrays, or any entry fails its expected shape: each `mechanical_edits` entry needs non-empty string `file`, `old_string`, `new_string`; each `structural_notes` entry needs non-empty string `file`, `description`, `rationale`; each `consolidation_proposals` entry needs non-empty string `file`, non-empty `cluster_bullets` array (each item with non-empty string `line_range` and `snippet`), `merged_principle` object with non-empty string `name` and `text`, and non-empty `replacements` array (each item with non-empty string `line_range`, `strategy ∈ {"delete", "cross_ref"}`, and — when `strategy: "cross_ref"` — non-empty string `cross_ref_text`) → terminate with per-file `status: "error"`, `reason: "verdict schema violation"`. Validating entry shape here prevents a malformed entry from crashing downstream consumers (`Edit` calls for `mechanical_edits`, caller-side rendering for `consolidation_proposals`). For forward-compat with older subagent prompts that do not emit `consolidation_proposals`, the main thread treats a **missing** `consolidation_proposals` key (not present in the JSON) as an empty array; only an explicitly non-array value triggers the schema-violation path
3. **Divergence (iter `i ≥ 2`)** — the `(remaining_edits_count, structural_notes_count)` multiset matches iter `i − 1`'s same multiset (the subagent is not making forward progress) → terminate with per-file `status: "unresolved"`, `reason: "no progress between iters"`
4. **Otherwise** — proceed to apply

**(c) Apply (per-iter)**: this phase has two sub-phases — (c1) `mechanical_edits` apply (compaction heuristics 1–4), followed by (c2) `consolidation_proposals` main-thread synthesis (iter 1 only; consolidation heuristics 1–4). Both sub-phases share the iter-level `applied_edits_count` counter.

**(c1) `mechanical_edits` apply**: for each entry in `mechanical_edits`, re-`Read` the target file (so `old_string` matches the current contents after any earlier edit in this iter), then call `Edit`. **Scope rail**: before each `Edit`, verify the entry's `file` equals the target file's path; if not, skip that entry (no working-tree write) and record the rejected path. This mirrors `verify-diff` Auto-derive A2 (c) Scope rail. If `old_string` is not found, skip that entry — this is the expected no-op fallback for overlapping edits emitted from the same iter-1 snapshot. Increment the iter-level `applied_edits_count` only for entries whose `Edit` call succeeded.

**(c2) `consolidation_proposals` main-thread synthesis (iter 1 only)**: for each cluster in `consolidation_proposals` (process clusters sequentially — cluster A complete before cluster B begins, so cluster B's bullet extraction reads the post-cluster-A working-tree state). Per § `consolidation_proposals` schema in `references/compaction-mode.md`, the subagent does **not** emit `mechanical_edits` for these proposals — main thread synthesizes the `Edit` calls from the proposal's `cluster_bullets` + `merged_principle` + `replacements` fields. Per-cluster procedure:

1. **Re-Read target file** to capture the current content (cluster B reads post-cluster-A state).
2. **Verbatim bullet extraction**: for each `cluster_bullets[i]`, use `snippet` (≤120 chars prefix, canonical `tail-truncate / no ellipsis / leading bullet prefix preserved` form per schema) as a **byte-level prefix-match seed** against current file lines. Extract the full bullet body **excluding the trailing newline** — the surrounding `\n` is preserved on disk by `Edit`'s in-place replacement semantics for steps 4 (insertion) and 5 (`cross_ref`), and the trailing `\n` is appended explicitly to `old_string` by step 5's `delete` strategy. **Tie-breaker (best-effort)**: if multiple lines prefix-match, use `cluster_bullets[i].line_range` as the authoritative selector. Note that (c1)'s `mechanical_edits` apply earlier in the same iter may have shifted line numbers since the subagent's iter-1 snapshot — `line_range` is best-effort against the post-(c1) file; if the snippet collides with multiple lines AND `line_range` no longer resolves to a prefix-matching line, treat the bullet as unresolvable and let the resulting `Edit` no-op-skip via the standard verbatim-not-found fallback (no wrong-line edit lands). Comparison is byte-level — do not interpret backticks or regex metacharacters. **Multi-line bullet**: if `line_range.M > L`, extract lines L through M inclusive as the full bullet body (multi-line `old_string` — same trailing-newline-excluded convention; the final line's `\n` is omitted).
3. **Ambiguous-emit picker**: per `references/compaction-mode.md` § `consolidation_proposals` schema's `replacements` paragraph, the subagent may emit **both** a `{strategy: "delete"}` and a `{strategy: "cross_ref"}` entry for the same `line_range` when the choice is ambiguous. Main thread **prefers `cross_ref` over `delete`** to preserve incident pointers per § Preservation rules (iii)–(iv); ignore the `delete` entry when both are present.
4. **Insertion edit** (1 per cluster): `Edit` with `old_string` = `cluster_bullets[0]` full bullet, `new_string` = `- ` + `merged_principle.text` + `\n` + the original bullet body. This inserts the merged principle immediately above the first cluster bullet.
5. **Per-replacement edits**: iterate over the picker-selected `replacements[j]` entries from step 3 (a single chosen strategy per `line_range` after the cross_ref-over-delete preference is applied; `cluster_bullets[i]` without a matching `replacements[]` entry — e.g., `cluster_bullets[0]` when the subagent only emitted replacement strategies for `i ≥ 1` — is left in place as the anchor for step 4's insertion and is not edited here). For each selected `replacements[j]`, join back to the corresponding `cluster_bullets[i]` via `line_range` to obtain the full bullet body, then:
   - `strategy: "cross_ref"`: `Edit` with `old_string` = full bullet, `new_string` = `- ` + `cross_ref_text`
   - `strategy: "delete"`: `Edit` with `old_string` = full bullet + trailing `\n`, `new_string` = `""`

The same scope rail and no-op-fallback semantics from (c1) apply: any entry whose `file` does not match the dispatched target path is skipped (recorded as rejected); any `old_string` not found in the current content is skipped (treated as overlapping-edit no-op fallback). Increment `applied_edits_count` for each successful `Edit` — the counter is **shared** between (c1) and (c2), so a post-(c) `applied_edits_count > 0` means at least one compaction edit **or** consolidation edit landed.

**(d) Per-iter convergence check**: re-`Read` the target file to measure `chars_after_iter_i`. If `chars_after_iter_i ≤ compaction_threshold`, the file's compaction work is **complete**; terminate the loop. The per-file status is then **`skipped-below-threshold`** when the cumulative `applied_edits_count` across iters is `0` (no compaction-or-consolidation edits ever landed — this can only happen when the file was already at-or-below threshold on entry, since otherwise (d)'s convergence check would have been false and the loop would have continued to iter 2 or terminated via (e) as `partial`), or **`converged`** when the cumulative `applied_edits_count > 0` (one or more edits — compaction-mechanical or consolidation-synthesized — landed and the file is now at-or-below threshold). Per (c1) + (c2), `applied_edits_count` aggregates both edit classes, so the convergence check is uniform across compaction-only / consolidation-only / mixed runs

**(e) Continue or terminate**: if `i < max_iterations` and not converged, proceed to iter `i + 1` (back to (a)). If `i == max_iterations` and not converged, terminate the loop with per-file `status: "partial"` (the file was reduced but did not reach the threshold)

**(f) Per-file record**: at file completion, aggregate:

- `path`, `chars_before`, `chars_after` (the latest measured), `iterations_used`
- `applied_edits_count` (sum across iters)
- `structural_notes` — captured from iter 1 only (treat iter 1 as the source of truth; iter 2 re-runs the heuristics on already-modified content and may return drifted notes — same `inferred_intent persistence` discipline as `verify-diff`). If iter 1 produced no parseable verdict (terminated via the (b) error paths), `structural_notes` is `[]`
- `consolidation_proposals` — same iter-1-only discipline as `structural_notes` above. Iter 2's `consolidation_proposals_count` is ignored (the subagent should not re-emit them, and the main thread does not consume them if returned). If iter 1 produced no parseable verdict, `consolidation_proposals` is `[]`
- `per_file_status` ∈ {`converged`, `partial`, `unresolved`, `error`, `skipped-below-threshold`}. Set by (d) (`converged` or `skipped-below-threshold` per the threshold-vs-applied-edits discrimination), (e) (`partial`), or (b) (`error` / `unresolved`). The `skipped-below-threshold` value's semantic is **widened**: it now means "compaction skipped because the file was already at-or-below threshold (no compaction-or-consolidation edits landed — cumulative `applied_edits_count == 0`), but Step CP2 still ran the per-file dispatch and any `consolidation_proposals` / `structural_notes` may be present"
- `below_threshold` = `chars_after ≤ compaction_threshold`
- `reason` (set only when `per_file_status ∈ {error, unresolved}`; omitted otherwise — including for `converged` / `partial` / `skipped-below-threshold`)

**Important**: `consolidation_proposals` are **auto-applied by the main thread synthesis sub-phase (c2)** — the subagent still emits them as detection-only output (the subagent does **not** call `Edit` itself, per the analysis-only / file-write contract in `references/compaction-mode.md` § Forbidden tool calls and § `consolidation_proposals` schema's Materialization disposition), and the main thread synthesizes the corresponding `Edit` calls from the cluster description. The `consolidation_proposals` array in the per-file record is therefore now the **applied-cluster trace** (surfaced alongside the resulting file-content change), not a caller-judgment note. `structural_notes` remain **not applied** by this mode — they are surfaced as caller-judgment notes (the caller, e.g. `dev-workflow` Step 11 user-gate, decides whether to act). This matches the `skill-review` semantic for structural notes.

### Step CP3: Security Self-Check

Run Security Self-Check (same as Step 6.5 in Full Extraction Mode) on all modified files. If any sensitive content is detected, revert the file via `Bash(git checkout HEAD -- <path>)` and record the file in `files_processed` with the following fixed shape (overrides the per-file record produced by Step CP2 (f)):

- `path`: the reverted file's path
- `per_file_status: "error"`
- `reason: "security check failed"`
- `applied_edits_count: 0` (the revert wiped this file's landed edits — they no longer exist on disk)
- `iterations_used`: the count of iters whose subagent dispatch returned a verdict before the revert (carry over from Step CP2 (f))
- `structural_notes`: carry over from Step CP2 (f) (iter-1 captured notes survive the revert because they are caller-judgment notes about the file's prose, not edits that were wiped)
- `consolidation_proposals`: carry over from Step CP2 (f) (same reasoning as `structural_notes` — cluster proposals are not file edits)
- `chars_before`: the pre-Step-CP2 measurement (carry over from Step CP2 (f))
- `chars_after`: the post-revert measurement, which equals `chars_before` since the revert restored the file to its pre-edit state
- `below_threshold`: recomputed against the post-revert `chars_after` (so this matches whatever the file's threshold relation was before Step CP2 ran)

### Step CP4: Emit Structured Summary

Emit a single fenced JSON block at the end of the response, matching the schema:

```json
{
  "status": "compacted" | "no-actionable" | "error",
  "compaction_threshold": <int>,
  "min_cluster_size": <int>,
  "files_processed": [
    {
      "path": "<abs-path>",
      "chars_before": <int>,
      "chars_after": <int>,
      "iterations_used": <int>,
      "applied_edits_count": <int>,
      "structural_notes": [
        {"description": "<str>", "rationale": "<str>"}
      ],
      "consolidation_proposals": [
        {
          "cluster_bullets": [{"line_range": "<L:M>", "snippet": "<str>"}],
          "merged_principle": {"name": "<str>", "text": "<str>"},
          "replacements": [
            {"line_range": "<L:M>", "strategy": "delete"},
            {"line_range": "<L:M>", "strategy": "cross_ref", "cross_ref_text": "<str>"}
          ]
        }
      ],
      "per_file_status": "converged" | "partial" | "unresolved" | "error" | "skipped-below-threshold",
      "below_threshold": <bool>,
      "reason": "<optional, required when per_file_status=error or unresolved>"
    }
  ],
  "reason": "<optional, required when top-level status=error>"
}
```

Top-level `status` mapping (3-way OR — fires when any of `mechanical_edits` / `consolidation_proposals` / `structural_notes` is non-empty on any file):

- `compacted`: at least one file in `files_processed` has `applied_edits_count > 0` **OR** non-empty `consolidation_proposals[]` **OR** non-empty `structural_notes[]`
- `no-actionable`: the target set was empty, **or** every file satisfies all three of (`applied_edits_count == 0`, empty `consolidation_proposals[]`, empty `structural_notes[]`) — including all-error cases where iter-1 verdicts failed before notes / proposals could be collected
- `error`: top-level dispatch error (e.g. settings load failure, output directory missing). Per-file dispatch errors do not propagate to the top — they appear inside `files_processed` with `per_file_status: "error"` under top-level `status: "compacted"` (when at least one other file applied edits or produced notes / proposals) or `status: "no-actionable"` (when no file produced any actionable output)

`reason` enum (closed list — callers may switch on these values deterministically):

- Per-file `reason` (set when `per_file_status ∈ {error, unresolved}`):
  - `"verdict parse failure"` — subagent response had no fenced JSON block or failed to parse (Step CP2 (b) #1)
  - `"verdict schema violation"` — required keys missing, values not arrays, or entry shape failed (Step CP2 (b) #2)
  - `"no progress between iters"` — divergence check on iter `i ≥ 2` matched the prior iter's multiset (Step CP2 (b) #3)
  - `"security check failed"` — Step CP3 detected sensitive content and reverted the file
- Top-level `reason` (set when `status == "error"`):
  - `"output directory not found"` — Step CP1 step 2 directory check failed
  - `"no targets resolved"` — used with `status: "no-actionable"` from Step CP1 step 4 (top-level `reason` is optional in `no-actionable`; this token is its canonical value)

Partial results: when top-level `status: "compacted"`, individual files in `files_processed` may carry `per_file_status` of `error` / `unresolved` / `partial` / `skipped-below-threshold` mixed with `converged`. Callers should branch on `per_file_status` per file rather than assume uniform success. (`skipped-below-threshold` appears in explicit-paths mode for files whose char count was already at-or-below `compaction_threshold` — Step CP2 still ran on them for the consolidation pass, so they may carry `consolidation_proposals` / `structural_notes` even though `applied_edits_count == 0`.)

### Step CP5: Sub-skill caller directive

See § Sub-skill caller directive at the bottom of this SKILL.md.

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

---

## Sub-skill caller directive

When invoked as a sub-skill (i.e. via `Skill(extract-rules)` from an orchestrator such as `dev-workflow` Step 11), the fenced JSON verdict block this skill emits in `--compact` mode is the **structured return value** of the skill's procedure — it is **not** a deliverable to the user, and emitting it does **not** terminate the orchestrator's turn. The same agent that ran this skill must immediately issue the next tool call dictated by the orchestrator's flow (see `dev-workflow` SKILL.md `§ No-Stall Principle`; orchestrators that surface a per-callee guidance bullet — e.g. `dev-workflow`'s `**Pre-invocation reminder**` at Step 11's `**Char-count compaction gate**` paragraph — name the specific next action there). Do not insert a prose summary, an acknowledgment, or a "shall I proceed?" sentence between the JSON verdict and the next tool call. Only one fenced JSON block — the verdict block — appears in the response, so callers can locate it unambiguously. The skill's own procedure is over; the orchestrator's procedure continues without pause.

This directive applies specifically to `--compact` mode. Other modes (Full Extraction, Update, Restructure, Conversation, PR Review) produce prose reports rather than fenced JSON verdicts and are not subject to this contract.

---

## Stop hook structural conflict (caller-side note)

If a `~/.claude/stop-hook-git-check.sh` style Stop hook is registered, it may fire mid-dispatch with uncommitted-change feedback. This is a known structural conflict between non-interactive orchestrator flows (such as `dev-workflow` Step 11) and per-turn hooks — see `§ Stop hook structural conflict` in `dev-workflow` SKILL.md (the canonical orchestrator for `--compact` invocations; `dev-workflow-triage` carries a parallel section for its own per-Finding flow). Ignore such feedback and continue the prescribed flow; per-file flow runs that complete the orchestrator's sub-step boundaries are the canonical completion signal.
