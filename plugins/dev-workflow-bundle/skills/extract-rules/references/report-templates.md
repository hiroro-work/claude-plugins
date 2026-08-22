# Report Templates

Reference templates for each mode's output report.

## Full Extraction Mode (Step 7)

````markdown
## Extraction Complete

**Project**: [project name]
**Languages**: [detected languages]
**Frameworks**: [detected frameworks]
**Integrations**: [detected integrations]
**Analyzed files**: [count]

### Generated Files

| File | Principles | Patterns | Examples |
|------|------------|----------|----------|
| languages/typescript.md | 3 | 5 | 8 |
| frameworks/react.md | 2 | 8 | 10 |
| integrations/rails-inertia.md | 1 | 4 | 5 |
| project.md | - | architecture, conventions | 3 |

**Examples** = total number of `###` example entries in the corresponding `.examples.md` file (Principles Examples + Project-specific Examples combined).

**Output**: `<output_dir>` (default: .claude/rules/)

### Recommended Actions

1. Review generated rules and edit if needed
2. Add reference to CLAUDE.md:
   ```markdown
   ## Coding Rules
   See .claude/rules/ for project-specific coding rules.
   ```
3. Re-run with `/extract-rules --update` when codebase evolves
````

## Update Mode (Step U6)

```markdown
## Update Complete

### New files:
| File | Principles | Patterns |
|------|------------|----------|
| frameworks/nextjs.md | 2 | 3 |

### Added to languages/typescript.md:
#### Principles
- (none)

#### Project-specific patterns
- `useNewFeature()` returns `{ data, refresh }` - new feature hook

#### Examples (typescript.examples.md)
- Added example for `useNewFeature()`

### Added to frameworks/react.md:
- (none)

### Promoted from staging (2nd observation, matched by --update):
- `formatCurrency(amount, currency)` - locale-aware money formatter  (→ .claude/rules/project.md)

### Unchanged files:
- project.md

### Potentially stale rules:
| File | Pattern | Reason |
|------|---------|--------|
| languages/typescript.local.md | `useOldHook()` | Symbol not found in codebase |

**Tip**: Review added rules and remove any that are incorrect or redundant. Check stale rules — they may have been renamed or removed.
```

The `### Promoted from staging (2nd observation, matched by --update):` section is omitted when `promoted_count == 0`. Update Mode never writes new staging entries (so no `### Newly staged` section here — `staged_count` is always 0; see SKILL.md Step U6 for the counter contract).

## Restructure Mode (Step R5)

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

## Conversation Extraction Mode (Step C4)

```markdown
## Extracted from Conversation

### Added to languages/typescript.md:
#### Principles
- Immutability (spread, map/filter, const)

#### Project-specific patterns
- `RefOrNull<T extends { id: string }> = T | { id: null }` - nullable refs

#### Examples (typescript.examples.md)
- Added Good/Bad for Immutability
- Added usage example for `RefOrNull<T>`

### Promoted from staging (2nd observation):
- `pathFor() + url()` - Page Object navigation pair  (→ .claude/rules/project.md)

### Newly staged (1st observation, awaiting re-observation):
- `useDataFetch(key)` - typed data hook with cache key  (→ .claude/rules-staging/project.staging.local.md)

### No changes:
- Functional style - Already documented
```

Each extracted pattern appears in exactly one section per run:

- canonical match → `### No changes:` (contributes to `canonical_skip_count`)
- staging match → `### Promoted from staging (2nd observation):` (contributes to `promoted_count`)
- new staging append → `### Newly staged (1st observation, awaiting re-observation):` (contributes to `staged_count`)

Omit the `### Promoted from staging` and `### Newly staged` sections entirely when the corresponding count is 0.

## Compaction Mode (Step CP4)

Compaction Mode returns a fenced JSON block (the only output) — not a Markdown report. See `SKILL.md` § Step CP4: Emit Structured Summary for the canonical schema. The main thread (caller) renders human-readable output if needed.

**Human-readable rendering examples** (illustrative — the caller chooses the format):

`status: "compacted"` (typical success path):

```text
Compaction complete (threshold: 40000 chars)

- .claude/rules/project.rules.local.md: 47600 → 31200 chars (under threshold, converged in 2 iters, 12 edits)
- .claude/rules/languages/typescript.local.md: 41200 → 28500 chars (under threshold, converged in 1 iter, 8 edits)

Total: 2 files compacted, 82600 chars saved
```

`status: "compacted"` with mixed per-file outcomes:

```text
Compaction partial (threshold: 40000 chars)

- .claude/rules/languages/typescript.local.md: 41200 → 28500 chars (under threshold, converged in 1 iter, 8 edits)
- .claude/rules/project.rules.local.md: 47600 → 42000 chars (over threshold, partial in 2 iters, 14 edits)
  → 1 structural_note: consider splitting patterns into per-domain files

Total: 2 files processed, 1 under threshold, 1 still over threshold
```

`status: "no-actionable"`:

```text
No compaction needed — no files exceed threshold (40000 chars)
```

`status: "error"`:

```text
Compaction failed: <reason>
```

Each per-file entry's `per_file_status` carries the loop outcome (`converged` / `partial` / `unresolved` / `error` / `skipped-below-threshold`); the caller uses this to surface follow-up actions to the user (e.g. via a user-gate that accepts/rejects per file). The `skipped-below-threshold` value appears only in explicit-paths mode for caller-passed paths whose char count was already at or below `compaction_threshold` (see SKILL.md § Step CP1 step 3).

## Realign Mode (Step RA5)

Realign Mode returns a prose report, one section per file judged.

```markdown
## Realigned .claude/rules/project.md

Judged 38 rules — keep 24 / drop 7 / split 4 / reshape 3

### Dropped (7)
- **Batch job retry wiring** - records how one job was wired, not how the next should be (referrers: 0)
- **Modal close-button placement** - restates a norm the file already carries under another name (referrers: 1)

### Split (4)
- **Migration ordering and backfill batching** → 2 rules: migration ordering; backfill batch sizing (referrers: 0)

### Reshaped (3)
- **Feature-flag rollout gate** - 1,120 → 340 chars; cut the account of the first rollout, kept the norm and its trigger (referrers: 2)

### Not applied (1)
- **Retry-budget accounting** (drop) - `old_string` no longer matched after an earlier edit rewrote the region

### Examples updated
- Removed 6 orphaned entries from `.claude/rules-extras/project.examples.md` — one per applied drop; the not-applied drop keeps its entry
```

Every non-`keep` rule appears in exactly one section, each entry carrying the referrer count Step RA3's gate presented. Omit a section whose count is 0. When every rule was kept, report the `keep` count and state that nothing changed.

A rule the user excluded at the Step RA3 gate counts as `keep`. Name the exclusions on one line below the counts.

**Not applied** lists every accepted edit that did not land, naming the rule and the verdict it was accepted under. The rule still appears in its verdict's section — the counts are counts of judgements (`references/realign-mode.md` § Step RA4's **What the counts mean** paragraph). Omit it when every accepted edit landed.

## PR Review Extraction Mode (Step P5)

**Single PR:**

```markdown
## Extracted from PR Review

**PR**: #123 - PR title
**Comments analyzed**: 15 (3 bot comments filtered)

### Added to frameworks/rails.local.md:
#### Project-specific patterns
- `fetchWithRetry(url, options)` - API call wrapper with retry

#### Examples (rails.examples.md)
- Added usage example for `fetchWithRetry()`

### Promoted from staging (2nd observation):
- `enqueueWithDelay(job, delay)` - background job dispatch wrapper  (→ .claude/rules/project.md)

### Newly staged (1st observation, awaiting re-observation):
- `withTenantScope(query)` - multi-tenancy query wrapper  (→ .claude/rules-staging/project.staging.local.md)

### No changes:
- No project-specific rules found in general feedback
```

The `### Promoted from staging` / `### Newly staged` sections follow the same per-section invariant as the Conversation template above. Staging gating applies only to project-level patterns — language / framework / integration entries (like the `fetchWithRetry()` example above when scoped to `frameworks/rails.local.md`) bypass staging.

**Multiple PRs:**

```markdown
## Extracted from PR Review (cross-PR analysis)

**PRs analyzed**: 5
| PR | Title | Comments |
|----|-------|----------|
| #123 | Feature A | 12 |
| #456 | Fix B | 8 |
| org/other#78 | Refactor C | 15 |
| #789 | Feature D | 6 |
| #101 | Update E | 9 |

**Total comments**: 50 (7 bot comments filtered)

### Added to frameworks/rails.md:
#### Principles (organizational emphasis — recurring across PRs)
- DRY厳格 (ビジネス値の定数化を徹底, ビューへのハードコード禁止)

### Added to frameworks/rails.local.md:
#### Project-specific patterns
- `fetchWithRetry(url, options)` - API call wrapper with retry

#### Examples (rails.examples.md)
- Added Good/Bad for DRY厳格
- Added usage example for `fetchWithRetry()`

### Skipped (general knowledge, single PR only):
- const over let (PR #123 only)
- Early returns (PR #456 only)
```
