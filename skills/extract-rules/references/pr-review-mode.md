# PR Review Extraction Mode

When `--from-pr <number>` is specified, extract rules from PR review comments (human comments only).

## Step P1: Load Settings and Check Prerequisites

1. Load settings from `extract-rules.local.md` (same as Step 1 in Full Extraction Mode)

2. Check if output directory exists (default: `.claude/rules/`)
   - If not exists: Error "Run /extract-rules first to initialize rule files."

3. Load existing rule files to understand current rules (if `split_output: true`, load both `<name>.md` and `<name>.local.md`)

4. Verify `gh` CLI is available and authenticated
   - Run `gh auth status` to confirm authentication
   - If `gh` is not installed: Error "gh CLI is not installed. Install it first: https://cli.github.com/"
   - If not authenticated: Error "gh CLI is not authenticated. Run `gh auth login` first."

## Step P2: Validate PR and Get Repository Info

1. Get repository info: `gh repo view --json nameWithOwner` → extract `{owner}/{repo}`
2. Validate PR exists: `gh pr view <number> --json number,title,state`
   - If PR not found: Error "PR #<number> not found."

## Step P3: Fetch PR Review Comments

Fetch all review-related comments from 3 endpoints:

1. **Inline review comments** (code-level feedback):
   `gh api repos/{owner}/{repo}/pulls/{number}/comments --paginate`

2. **General PR comments** (issue-level discussion):
   `gh api repos/{owner}/{repo}/issues/{number}/comments --paginate`

3. **Review bodies** (top-level review summaries):
   `gh api repos/{owner}/{repo}/pulls/{number}/reviews --paginate`

**Filter out bot comments:**
- Exclude comments where `user.type` is `"Bot"`
- Exclude comments where `user.login` ends with `[bot]`

**Large PR handling:**
- If total comments exceed ~100, focus on review summaries and inline comments with code change context, skip general discussion comments
- `gh pr diff <number>` to get the diff for context
- If diff exceeds ~2000 lines, use inline comments' `path` field to reference only relevant file sections

## Step P4: Extract Principles and Patterns

Analyze the collected human review comments to identify coding rules:

- **Code review corrections** → Identify the underlying principle
  (e.g., "Use `const` here" → Immutability principle)
- **Style/convention feedback** → Abstract to principles
  (e.g., "Prefer early returns" → Control flow principle)
- **Project-specific guidance** → Extract with concrete examples
  (e.g., "Use our `useAuth()` hook" → Project-specific pattern)
- **Ignore non-rule comments**: LGTM, approvals, questions, bug reports, merge/CI discussions

Apply the same criteria as Full Extraction Mode (see `extraction-criteria.md`).

## Step P5: Append Principles and Patterns

Same as Step C4 in Conversation Extraction Mode:

1. Categorize each extracted item by language/framework/integration/project
2. When `split_output: true`: Project-specific patterns go to `.local.md` files
3. Check for duplicates against existing rules
4. Append using standard format
5. Run Security Self-Check (same as Step 6.5)
6. Report what was added (see `report-templates.md` for format)
