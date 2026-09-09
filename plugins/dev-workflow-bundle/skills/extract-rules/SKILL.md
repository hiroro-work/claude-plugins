---
name: extract-rules
description: Extract project-specific coding rules and domain knowledge from existing codebase, generating markdown documentation for AI agents. Use when onboarding a new project, after code review discussions about coding style, or when coding conventions need documenting. Also consider running after sessions where coding preferences were discussed or corrected (--from-conversation), or after PRs with significant review feedback (--from-pr).
model: opus
effort: high
allowed-tools: Read, Glob, Grep, Write, Edit, Agent, TaskCreate, TaskUpdate, Bash(ls *), Bash(mkdir *), Bash(git ls-files *), Bash(git grep *), Bash(git checkout HEAD -- *), Bash(wc *), Bash(head *), Bash(tail *), Bash(sort *), Bash(uniq *), Bash(tree *), Bash(gh pr view *), Bash(gh pr diff *), Bash(gh api *), Bash(gh auth status *), Bash(gh repo view *), Bash(node *)
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
/extract-rules --realign                       # Re-judge every rule file under output_dir against current criteria
/extract-rules --realign path/to/file.md ...   # Re-judge only the named files
/extract-rules --apply-conversation-candidates <path>  # Apply pre-scanned rule candidates (Step C5 only; orchestrator sub-skill)
# Multiple specs allowed (space-separated) → cross-analysis detects org-wide principles
```

**Change-origin flags**: a change-based extraction is scoped only by `--from-conversation` or `--from-pr`. This skill accepts no diff-base / commit-sha origin argument such as `--base-commit <sha>`; passing one is unsupported.

## Configuration

Settings file: `extract-rules.local.md` (YAML frontmatter only, no markdown body)
- Project-level: `.claude/extract-rules.local.md` (takes precedence)
- User-level: `~/.claude/extract-rules.local.md`

| Setting | Default | Description |
|---------|---------|-------------|
| `target_dirs` | `["."]` | Analysis target directories |
| `exclude_dirs` | `[".git", ".claude"]` | Exclude directories (in addition to .gitignore) |
| `exclude_patterns` | `[]` | Exclude file patterns (e.g., `*.generated.ts`, `*.d.ts`) |
| `output_dir` | `.claude/rules` | Output directory for rule files (`.md` and `.local.md`) |
| `examples_output_dir` | `.claude/rules-extras` | Output directory for `.examples.md` files. Defaults to a sibling directory **outside** `.claude/rules/**` so examples are not auto-loaded into context on session start. Set to `output_dir` (or any path under `output_dir`) to opt examples back into auto-load |
| `staging_output_dir` | `.claude/rules-staging` | Output directory for 1st-observation project-level patterns staged by incremental modes. Defaults to a sibling directory **outside** `.claude/rules/**` so staged candidates are not auto-loaded into context on session start. Set to `output_dir` (or any path under `output_dir`) to opt staging back into auto-load. Staging gating and the promote path: `references/conversation-mode.md` § Step C5 and § Mode interaction summary |
| `language` | `ja` | Report language (e.g., `ja`) |
| `split_output` | `true` | Separate Principles (.md) and patterns (.local.md) |
| `resolve_references` | `true` | Resolve file references during restructure |
| `compaction_threshold` | `40000` | Char count threshold for `--compact` mode (file is compacted if char count exceeds this). Set to a very large number (e.g. `99999999`) to opt out of compaction. The default `40000` matches Claude Code's per-file warning threshold (40k chars, observed in Claude Code 2.1.x) — firing the gate exactly at the warning matches the user's visible signal that the file needs attention (buffer 0). |
| `min_cluster_size` | `3` | Minimum related-bullet cluster size for `--compact` mode's consolidation detection. The subagent emits `consolidation_proposals` only when a cluster has at least this many related bullets. Set to a very large number (e.g. `99999999`) to disable consolidation while keeping compaction |

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

Three output directories are involved: `output_dir` for rule files (`.md` / `.local.md`), `examples_output_dir` for `.examples.md` files, and `staging_output_dir` for staged 1st-observation project-level patterns from incremental modes. The `paths:` frontmatter on rule files is a human-facing category-scope hint; the auto-load boundary is determined by directory placement only.

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

Principles (portable across projects) and Project-specific patterns (local) are separated by default.

**Hybrid mode** (`split_output: false`): no `<name>.local.md` — each `<name>.md` carries both `## Principles` and `## Project-specific patterns`. The other two directories are unchanged.

**Layered frameworks** (Rails, Django, Spring, etc.):
When a framework has distinct architectural layers, generate layer-specific files:
- `<framework>.md` — Cross-layer rules (no `paths:` or broad scope)
- `<framework>-<layer>.md` — Layer-specific rules with scoped `paths:` (e.g., `app/models/**`)
- In split mode, both cross-layer and layer-specific files get `.local.md` counterparts

**Integration libraries** (Inertia, Pundit, Devise, Turbo, etc.):
When integration libraries are detected alongside a layered framework:
- `integrations/<framework>-<integration>.md` — Integration-specific rules
- Separated from layer files into dedicated `integrations/` directory
- In split mode, integration files also get `.local.md` counterparts

**Format switching:** Run `--restructure` after changing `split_output` setting to switch between split and hybrid formats.

## Dispatch authorization

This skill's procedure dispatches subagents, so invoking the skill **is** the request to use that mechanism: an ambient instruction allowing subagent dispatch only when the user asked for it — a **permission-shaped restriction** — is already satisfied by this invocation. Do not ask the user to re-confirm the dispatch, and do not silently substitute inline execution for a dispatch this procedure specifies. Only two things justify that substitution: **technical availability** (the dispatch tool is not present and callable on the current tool surface), and an **explicit contract term from the caller** bounding this skill to its own thread. A permission-shaped restriction is neither.

## Processing Flow

### Mode Detection

Check arguments to determine mode:

- No arguments → **Full Extraction Mode** (Step 1-7)
- `--update` → **Update Mode** (Step U1-U6)
- `--restructure` → **Restructure Mode** (Step R1-R5)
- `--from-conversation [session-id]` → **Conversation Extraction Mode** (Step C1-C5)
- `--compact [<paths>]` → **Compaction Mode** (Step CP1-CP5)
- `--realign [<paths>]` → **Realign Mode** (Step RA1-RA5)
- `--from-pr <number|owner/repo#number|range> [...]` → **PR Review Extraction Mode** (Step P1-P5)
- `--apply-conversation-candidates <path>` → **Conversation Candidate Apply Mode** (Step A1-A2)

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

**Load existing rule files** (incremental modes; Full Extraction skips it): read `<output_dir>/<name>.md`, `<output_dir>/<name>.local.md`, and `<examples_output_dir>/<name>.examples.md`. When `examples_output_dir` does not exist yet (legacy projects that co-located examples under `output_dir`), fall back to `<output_dir>/<name>.examples.md`. Also read `<staging_output_dir>/project.staging.local.md` when present — the staging-match branch needs it; skip silently when it does not exist.

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
   - Avoid multi-line code blocks

5. Apply AI judgment to determine which patterns meet the extraction criteria (see `references/extraction-criteria.md`)

Determine appropriate detection methods based on language and project structure.

### Step 5: Analyze Documentation and Existing Rules

Also analyze non-code documentation:

- README.md
- CONTRIBUTING.md
- PR templates
- Existing CLAUDE.md

Extract explicit coding rules and guidelines from these documents.

**Deduplication check:** Read any files under `.claude/rules/` to build a set of already-documented rules. Rules extracted in Step 4 that overlap with these existing rules should be skipped. Note: CLAUDE.md is NOT a deduplication source — rules should exist in `.claude/rules/` even if also mentioned in CLAUDE.md. This check applies to every mode that extracts new rules.

### Step 6: Generate Output

Read `references/security.md` before generating output to ensure sensitive information is not included.

1. Check if `output_dir` exists
   - If exists: Error "Output directory already exists. Use `--restructure` to reorganize, `--update` to add new patterns, or delete the directory manually to start fresh."
   - If not exists: Create `output_dir`. Also create `examples_output_dir` if it differs from `output_dir` and does not exist yet (when both resolve to the same path the single directory created above is reused).

2. Generate rule files per category. Rule files (`<name>.md` and `<name>.local.md`) are written under `output_dir`; `<name>.examples.md` files are written under `examples_output_dir`.

   - `languages/<lang>.md` for language-specific rules (under `output_dir`)
   - `frameworks/<framework>.md` for framework-specific rules (under `output_dir`)
   - `project.md` for project-specific rules (under `output_dir`)
   - **Layered frameworks**: `<framework>.md` (cross-layer) + `<framework>-<layer>.md` per detected layer with scoped `paths:`
   - **Integration libraries**: See `references/integration-criteria.md` "Output structure" section.

   **By default** (`split_output: true`): Generate 3 files per category (except project which gets 2):
   - `<output_dir>/<name>.md` — `## Principles` only (portable), with `paths:` frontmatter
   - `<output_dir>/<name>.local.md` — `## Project-specific patterns` only (local), with the **same `paths:` frontmatter** as its `<name>.md` counterpart
   - `<examples_output_dir>/<name>.examples.md` — Examples for both
   - Layer-specific and regular files each define their own `paths:` independently (applies to both `.md` and `.local.md`). Cross-layer files (`<framework>.md` / `<framework>.local.md`) use no `paths:` or broad scope.
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

For a **prose rule** — a project-level rule stating a working convention rather than naming a symbol — see `references/extraction-criteria.md` § What a Rule Is Made Of.

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

**Note:** This check applies to all modes that write rule files. Also check `.examples.md` files.

### Step 7: Report Summary

Display analysis summary. See `references/report-templates.md` § Full Extraction Mode (Step 7) for format.

---

## Update Mode

When `--update` is specified, re-scan the codebase and add new patterns while preserving existing rules. Update Mode reads the staging file and promotes re-matched project-level patterns to canonical; it never writes new staging entries.

Read `references/update-mode.md` for the full processing steps (U1-U6); re-read it when a `Step U` reference no longer resolves in context. Key flow:

1. Load settings; check prerequisites and load existing rule files
2. Re-scan the codebase (Step 2-5 of Full Extraction Mode)
3. Staleness check on existing project-specific patterns
4. Compare, merge, and append new rules; promote staging matches
5. Security Self-Check, then report

---

## Restructure Mode

When `--restructure` is specified, re-analyze the codebase to determine the optimal file structure, then merge existing rule content into the new structure. Use this when the project has evolved (new frameworks, architectural changes) or when `split_output` settings change; `README.md` § Choosing a mode says which mode a given change calls for.

Read `references/restructure-mode.md` for the full processing steps (R1-R5); re-read it when a `Step R` reference no longer resolves in context. Key flow:

1. Load settings; snapshot the existing rule files
2. Re-analyze the codebase (Step 2-5 of Full Extraction Mode)
3. Resolve file references in the snapshot (skipped when `resolve_references: false`)
4. **USER CONFIRMATION** on the restructure plan, then merge and write
5. Security Self-Check, then report

---

## Conversation Extraction Mode

When `--from-conversation` is specified, extract rules from the full conversation history stored in session `.jsonl` files. The heavy processing (jsonl parsing, analysis, rule writing) is delegated to a subagent.

### Step C1: Prepare and Locate Session File (main agent)

1. Load settings from `extract-rules.local.md` (same as Step 1 in Full Extraction Mode)

2. Check if output directory exists (default: `.claude/rules/`)
   - If not exists: Error "Run /extract-rules first to initialize rule files."

3. **Locate the session file:**

   1. Get the current working directory (`pwd`)
   2. Encode the path: replace `/` and `.` with `-` (leading `-` is kept)
      - Example: `/Users/alice/src/github.com/acme/widget` → `-Users-alice-src-github-com-acme-widget`
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

## Conversation Candidate Apply Mode

When `--apply-conversation-candidates <path>` is specified, run **only Step C5** (dedup / route / write / promote / `.examples.md` / Security Self-Check) against a pre-scanned rule-candidate block, skipping the jsonl parsing and analysis (C3/C4).

The input candidate file conforms to `references/conversation-mode.md` § Rule-candidate contract. This mode runs entirely in the **main agent** (no subagent spawn).

### Step A1: Load Settings and Read Candidates (main agent)

1. Load settings from `extract-rules.local.md` (same as Step 1 in Full Extraction Mode).
2. Check the output directory exists (default `.claude/rules/`); if not, Error "Run /extract-rules first to initialize rule files."
3. Read the candidate file at `<path>` and validate it against `references/conversation-mode.md` § Rule-candidate contract: each `### Candidate <N>` carries the required fields, `Type` / `Category` hold enum values, and the trailing `Candidates: <N>` count matches the number of parsed `### Candidate` blocks. On an empty file, a parse failure, a count mismatch, or any candidate that omits a field its `Type` / `Category` discriminators mark required-non-empty (per the contract's Fields section — e.g. a `Type: pattern` candidate with an empty `Signature`), stop with a fail-loud diagnostic naming the path and the validation failure — do not silently proceed with a partial candidate set.

### Step A2: Apply via Step C5 (main agent)

Execute `references/conversation-mode.md` § Step C5 with the Step A1 candidate list standing in for C4's in-context extracted items, running **directly in the main agent** (no subagent — see the mode intro above). Step C5 item 1 resolves `canonical_files` / `staging_files` from settings directly (no prompt boundary). Step C5 then performs dedup / routing / staging append+promote / `.examples.md` generation (mined from the codebase per `references/examples-format.md`) / Security Self-Check, and returns its counter summary. Report to the user using the `references/conversation-mode.md` § Report format (Step C5 item 8) template, reused as-is (its `### Promoted from staging` / `### Newly staged` / `### No changes` subsections apply unchanged) — no new template section is added.

---

## Compaction Mode

When `--compact` is specified, compact over-threshold rules files (thresholds: § Configuration).

Read `references/compaction-procedure.md` for the full processing steps (CP1-CP5); re-read it when a `Step CP` reference no longer resolves in context. Key flow:

1. Load settings; resolve targets
2. Per-file Pattern A loop: dispatch, parse, apply, converge
3. Security Self-Check with revert
4. Fenced JSON summary
5. § Sub-skill caller directive

---

## Realign Mode

When `--realign [<path> ...]` is specified, re-judge rules already written against the current extraction criteria, then drop, split, or trim the ones that no longer meet them (`README.md` § Choosing a mode says which of the two modes a given change calls for). Named paths judge only those files; no paths judges every rule file under `output_dir`.

**Against `--compact`**, which also shrinks a rule file: one invariant divides them — `--compact` preserves the set of norms a file states, merging near-duplicates and dropping an entry only where another already subsumes it, while `--realign` can take a norm away outright. When both apply to one file, realign first.

Read `references/realign-mode.md` for the full processing steps (RA1-RA5). Key flow:

1. Load settings; check `output_dir` exists (same as Step C1's output-directory-existence check); resolve the targets from the named paths, or by discovery under `output_dir` when none were named
2. Dispatch one analysis subagent per target file, parse its fenced JSON verdict, and count each non-`keep` rule's referrers
3. **USER APPROVAL GATE** — present the verdicts; nothing is written until it resolves
4. Apply the accepted edits and follow through on the affected `.examples.md` entries
5. Security Self-Check on every file written, then report per `references/realign-mode.md` § Report format (Step RA5)

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

When invoked as a sub-skill (i.e. via `Skill(extract-rules)` from an orchestrator), the fenced JSON verdict block this skill emits in `--compact` mode is the **structured return value** of the skill's procedure — it is **not** a deliverable to the user, and emitting it does **not** terminate the orchestrator's turn. The same agent that ran this skill must immediately issue the next tool call dictated by the orchestrator's flow (an orchestrator that surfaces a per-callee guidance bullet names the specific next action there). Do not insert a prose summary, an acknowledgment, or a "shall I proceed?" sentence between the JSON verdict and the next tool call. Only one fenced JSON block — the verdict block — appears in the response, so callers can locate it unambiguously. The skill's own procedure is over; the orchestrator's procedure continues without pause.

This directive applies specifically to `--compact` mode. Other modes (Full Extraction, Update, Restructure, Conversation, Conversation Candidate Apply, Realign, PR Review) produce prose reports rather than fenced JSON verdicts and are not subject to this contract.

---

## Stop hook structural conflict (caller-side note)

If a `~/.claude/stop-hook-git-check.sh` style Stop hook is registered, it may fire mid-dispatch with uncommitted-change feedback. This is a known structural conflict between non-interactive orchestrator flows and per-turn hooks. Treat each fire as spurious: ignore the prose and continue the prescribed flow; per-file flow runs that complete the orchestrator's sub-step boundaries are the canonical completion signal.
