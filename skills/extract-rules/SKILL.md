---
name: extract-rules
description: Extract project-specific coding rules and domain knowledge from existing codebase, generating markdown documentation for AI agents.
model: opus
allowed-tools: Read, Glob, Grep, Write, Bash(ls:*), Bash(mkdir:*), Bash(git ls-files:*), Bash(grep:*), Bash(wc:*), Bash(head:*), Bash(tail:*), Bash(sort:*), Bash(uniq:*), Bash(tree:*)
---

# Extract Rules

Analyzes existing codebase to extract project-specific coding rules and domain knowledge, generating structured markdown documentation for AI agents.

## Usage

```text
/extract-rules                      # Extract rules from codebase (initial)
/extract-rules --force              # Overwrite existing rule files
/extract-rules --dry-run            # Analyze only (no file output)
/extract-rules --from-conversation  # Extract rules from conversation and append
```

## Configuration

Users can configure extraction settings in `extract-rules.local.md`:

- Project-level: `.claude/extract-rules.local.md` (takes precedence)
- User-level: `~/.claude/extract-rules.local.md`

**File format:** YAML frontmatter only (no markdown body). The file uses `.md` extension for consistency with other Claude Code config files, but contains only YAML between `---` delimiters.

```yaml
---
# Target directories for analysis
# Default: "." (all directories not excluded by .gitignore)
# Set specific directories to limit scope
target_dirs:
  - .

# Directories to exclude (in addition to .gitignore)
# These are applied even if not in .gitignore
exclude_dirs:
  - .git
  - .claude

# File patterns to exclude (in addition to .gitignore)
exclude_patterns:
  - "*.generated.ts"
  - "*.d.ts"
  - "*.min.js"

# Note: .gitignore patterns are automatically applied
# Common exclusions like node_modules/, dist/, build/ are typically in .gitignore

# Output directory
output_dir: .claude/rules

# Output language for reports
language: ja
---
```

## Output Structure

```text
.claude/rules/
├── languages/
│   ├── typescript.md
│   └── ...              # python.md, go.md, ruby.md, etc.
├── frameworks/
│   ├── react.md
│   └── ...              # nextjs.md, firebase.md, rails.md, etc.
└── project.md           # Domain, architecture (not portable)
```

## Processing Flow

### Mode Detection

Check arguments to determine mode:

- No arguments or `--force` → **Full Extraction Mode** (Step 1-7)
- `--dry-run` → **Full Extraction Mode** but skip file writing
- `--from-conversation` → **Conversation Extraction Mode** (Step C1-C4)

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

**Extract from settings:**
- `target_dirs` (default: `["."]` - all directories)
- `exclude_dirs` (default: `[".git", ".claude"]`)
- `exclude_patterns` (default: `["*.generated.ts", "*.d.ts", "*.min.js"]`)
- `output_dir` (default: `.claude/rules`)
- `language` (default: `ja`)

**Note:** `.gitignore` patterns are always applied. Common exclusions like `node_modules/`, `dist/`, `build/` are typically in `.gitignore` and automatically excluded.

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

**Output:** List of detected languages and frameworks

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

**Note:** Using `git ls-files` ensures that nested `.gitignore` files in subdirectories are automatically respected. Untracked files (e.g., `.env`, local configs) are excluded, which helps protect sensitive information.

### Step 4: Analyze by Category

For each detected language and framework:

1. Use Grep/Read to collect relevant code patterns
2. Identify project-specific conventions (see Project-Specific Rule Policy)
3. Decide which patterns to include as rules (use AI judgment)

Determine appropriate detection methods based on language and project structure.

### Step 5: Analyze Documentation

Also analyze non-code documentation:

- README.md
- CONTRIBUTING.md
- PR templates
- Existing CLAUDE.md

Extract explicit coding rules and guidelines from these documents.

### Step 6: Generate Output

**If `--dry-run` is set:** Display analysis results only, skip file writing.

**Otherwise:**

1. Check if output directory exists
   - If exists and `--force` not set: Error "Output directory already exists. Use --force to overwrite."
   - If exists and `--force` set:
     - **Warning:** "Existing rules will be overwritten. Manual edits will be lost."
     - List files that will be overwritten
     - Proceed with overwrite (backup is user's responsibility via git)
   - If not exists: Create directory

2. Generate rule files:
   - `languages/<lang>.md` for language-specific rules
   - `frameworks/<framework>.md` for framework-specific rules
   - `project.md` for project-specific rules

**Rule file format (with paths frontmatter):**

```markdown
---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# TypeScript Rules

- Define functions using arrow functions
- Prefer `type` over `interface`
- Use named exports (avoid default exports)
- Custom hooks: `use` prefix + `Client` suffix (e.g., `useAuthClient`)
```

**paths patterns by category:**
- TypeScript: `**/*.ts`, `**/*.tsx`
- Python: `**/*.py`
- React: `**/*.tsx`, `**/*.jsx`
- (project.md: no paths frontmatter = applies to all files)

### Step 7: Report Summary

Display analysis summary:

```markdown
## Extraction Complete

**Project**: [project name]
**Languages**: [detected languages]
**Frameworks**: [detected frameworks]
**Analyzed files**: [count]

### Generated Files

| File | Rules |
|------|-------|
| languages/typescript.md | 5 rules |
| frameworks/react.md | 3 rules |
| project.md | 2 rules |

**Output**: `<output_dir>` (default: .claude/rules/)

### Recommended Actions

1. Review generated rules and edit if needed
2. Add reference to CLAUDE.md:
   \`\`\`markdown
   ## Coding Rules
   See .claude/rules/ for project-specific coding rules.
   \`\`\`
3. Re-run with `/extract-rules --force` when codebase evolves
```

---

## Conversation Extraction Mode

When `--from-conversation` is specified, extract rules from the conversation history.

### Step C1: Check Prerequisites

1. Check if output directory exists (default: `.claude/rules/`)
   - If not exists: Error "Run /extract-rules first to initialize rule files."

2. Load existing rule files to understand current rules

### Step C2: Determine Conversation Source

**Option A: Read from transcript file (preferred, full history)**

If transcript file path is known:
- Location: `~/.claude/projects/<project-path>/<session-id>.jsonl`
- Read the JSONL file (each line is a JSON object)
- Focus on `type: "user"` and `type: "assistant"` entries
- This includes ALL messages from session start (even after compaction)

**Option B: Use current context (fallback)**

If transcript path is unknown (e.g., running in Codex or other AI tools):
- Analyze the current conversation context
- Note: May have limited history if context was compacted

### Step C3: Extract Rules

Look for:

1. **Explicit preferences**: User statements like:
   - "Use type instead of interface"
   - "Write tests with describe/it"
   - "Name files in kebab-case"

2. **Implicit patterns**: User corrections or feedback:
   - "No, use camelCase here"
   - "Please add JSDoc comments"
   - "Move this to the services directory"

3. **Code review feedback**: User comments on generated code

### Step C4: Append Rules

1. Categorize each extracted rule:
   - Language-specific → `languages/<lang>.md`
   - Framework-specific → `frameworks/<framework>.md`
   - Project-specific → `project.md`

2. Check for duplicates: Skip if rule already exists

3. Append new rules as bullet points to appropriate files

4. Report what was added:
   ```markdown
   ## Rules Extracted from Conversation

   ### Added to languages/typescript.md:
   - Prefer `type` over `interface`

   ### No changes:
   - "API calls must go through the `services/` layer" - Already documented
   ```

---

## Important Notes

- This skill uses AI to understand intent, not just pattern matching
- Both code AND documentation are analyzed
- Use `--from-conversation` after significant discussions about coding style
- Generated rules are meant to be reviewed and refined by humans

## Project-Specific Rule Policy

**Goal:** Extract only project-specific rules, NOT general knowledge that AI already knows.

**Exclusion criteria (do NOT include as rules):**
- Language-standard conventions (e.g., camelCase in JavaScript, snake_case in Python)
- Widely-known best practices (e.g., "use const instead of let when possible")
- Framework-default patterns (e.g., React functional components are now standard)

**Inclusion criteria (DO include as rules):**
- Patterns explicitly documented in README, CONTRIBUTING, or CLAUDE.md
- Project-specific naming conventions (e.g., `useFooClient`, `BarService` prefixes)
- Deviations from common conventions (e.g., project uses snake_case in TypeScript)
- Domain-specific terminology and patterns
- Custom architectural decisions unique to the project

**When uncertain:** If a pattern matches general knowledge AND is not explicitly documented in the project, prefer to exclude it. The goal is to capture what makes this project unique, not to repeat common knowledge.

## Security Considerations

**Sensitive Information Protection:**

- `git ls-files` only analyzes tracked files, automatically excluding untracked `.env`, credentials, and other gitignored files
- **Warning:** If `.env` or credential files are accidentally tracked in git, they WILL be included in analysis
- Hardcoded secrets in source code may appear in examples
- When generating rule files, avoid including:
  - API keys, tokens, or credentials found in code
  - Internal URLs or endpoints
  - Customer names or personal information
  - High-entropy strings that may be secrets
- If sensitive information is detected in samples, redact with placeholders (e.g., `API_KEY_REDACTED`)
- Review generated rule files before committing to repository
- **Conversation extraction:** Same rules apply - do not extract sensitive information from conversation history (API keys, credentials, internal URLs mentioned in chat)
