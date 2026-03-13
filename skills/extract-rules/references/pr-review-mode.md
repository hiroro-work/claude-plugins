# PR Review Extraction Mode

When `--from-pr` is specified, extract rules from PR review comments (human comments only).
Single or multiple PRs can be specified. Multiple PRs enable cross-PR frequency analysis to detect organizational emphasis.

## Step P1: Load Settings and Check Prerequisites

1. Load settings from `extract-rules.local.md` (same as Step 1 in Full Extraction Mode)

2. Check if output directory exists (default: `.claude/rules/`)
   - If not exists: Error "Run /extract-rules first to initialize rule files."

3. Load existing rule files to understand current rules (if `split_output: true`, load both `<name>.md` and `<name>.local.md`)

4. Verify `gh` CLI is available and authenticated
   - Run `gh auth status` to confirm authentication
   - If `gh` is not installed: Error "gh CLI is not installed. Install it first: https://cli.github.com/"
   - If not authenticated: Error "gh CLI is not authenticated. Run `gh auth login` first."

## Step P2: Parse Arguments and Get Repository Info

Parse all arguments (space-separated) to determine targets. Each argument is independently parsed:

- **Number** (e.g., `123`): Use as PR number, get repository from `gh repo view --json nameWithOwner`
- **Repository-scoped number** (e.g., `owner/repo#123`): Extract `{owner}/{repo}` and PR number
- **Number range** (e.g., `100..110`): Expand to individual PR numbers (#100, #101, ..., #110) for the current repository
- **Repository-scoped range** (e.g., `owner/repo#100..110`): Expand range for the specified repository
- **URL** (e.g., `https://github.com/owner/repo/pull/123`): Also accepted, parsed as `owner/repo#123`
- All formats can be mixed (e.g., `--from-pr 100..105 org/other#99`)
- Cross-repository PRs are allowed (useful for detecting organization-wide principles)

Validate each PR exists:

- Number: `gh pr view <number> --json number,title,state`
- URL: `gh pr view <URL> --json number,title,state`
- Range-expanded numbers: validate each individually
- If any PR not found: skip silently and continue with remaining PRs (ranges often contain issues or gaps)

**Performance note:** Each PR requires 3 API calls (Step P3). Keep total PR count reasonable (recommended: up to 10 PRs) to avoid GitHub API rate limits. If a range expands to more than 10 PRs, warn the user and suggest narrowing the range.

## Step P3: Fetch PR Review Comments

For each PR, fetch all review-related comments from 3 endpoints:

1. **Inline review comments** (code-level feedback):
   `gh api repos/{owner}/{repo}/pulls/{number}/comments --paginate`

2. **General PR comments** (issue-level discussion):
   `gh api repos/{owner}/{repo}/issues/{number}/comments --paginate`

3. **Review bodies** (top-level review summaries):
   `gh api repos/{owner}/{repo}/pulls/{number}/reviews --paginate`

Tag each comment with its source PR number for cross-PR analysis.

**Filter out bot comments:**
- Exclude comments where `user.type` is `"Bot"`
- Exclude comments where `user.login` ends with `[bot]`

**Large PR handling:**
- If total comments exceed ~100 per PR, focus on review summaries and inline comments with code change context, skip general discussion comments
- `gh pr diff <number>` to get the diff for context
- If diff exceeds ~2000 lines, use inline comments' `path` field to reference only relevant file sections

## Step P4: Extract Principles and Patterns

Analyze the collected human review comments to identify coding rules.

**First, apply the general knowledge filter.** Most PR review comments are general best practices (const over let, no magic numbers, DRY, early returns, etc.). These are knowledge any AI already has — skip them. Only extract rules that reflect project/team-specific choices.

- **General best practice feedback** → Skip (do NOT extract)
  (e.g., "Use `const` here", "This is a magic number", "DRY this up", "Prefer early returns")
- **Project/team-specific choices** → Extract as principles
  (e.g., "We don't use classes here, FP only", "Always use Zustand, not Redux for state")
- **Project-specific guidance** → Extract with concrete examples
  (e.g., "Use our `useAuth()` hook", "Wrap API calls with `fetchWithRetry()`")
- **Ignore non-rule comments**: LGTM, approvals, questions, bug reports, merge/CI discussions

Apply the same criteria as Full Extraction Mode (see `extraction-criteria.md`).

### Cross-PR frequency analysis (multiple PRs only)

When multiple PRs are provided, perform additional frequency analysis after the initial classification:

- Identify general best practice comments that appear **repeatedly across different PRs** (not just multiple times in a single PR)
- A general principle mentioned across multiple PRs by reviewers signals an **organizational emphasis** — the team cares about this principle more than typical teams do
- Promote such recurring principles from "general knowledge (skip)" to extractable, but **reframe them to capture the specific way the organization applies them**, not just restate the general principle
  - Example: DRY指摘が複数PRで繰り返される → `DRY厳格 (ビジネス値の定数化を徹底, ビューへのハードコード禁止)` のように具体的な適用方法を明記
  - Example: const指摘が複数PRで繰り返される → 単なる「const使え」ではなく、どういう場面で特に厳しく求めているかを具体化

Use AI judgment to determine what constitutes "repeated across PRs" based on the number of PRs analyzed. The goal is to identify patterns that clearly stand out as organizational values, not to apply rigid thresholds.

**For single PR:** Skip frequency analysis entirely. Apply only the general knowledge filter (existing behavior).

**If no project-specific rules are found, report that no rules were extracted.** It is expected that many PRs contain only general feedback and yield zero extractable rules.

## Step P5: Append Principles and Patterns

Same as Step C4 in Conversation Extraction Mode:

1. Categorize each extracted item by language/framework/integration/project
2. When `split_output: true`: Project-specific patterns go to `.local.md` files
3. Check for duplicates against existing rules
4. Append using standard format
5. Run Security Self-Check (same as Step 6.5)
6. Report what was added (see `report-templates.md` for format)
