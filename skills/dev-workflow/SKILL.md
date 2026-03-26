---
name: dev-workflow
description: Guided development workflow with automated plan review, implementation, testing, and code review. Orchestrates plan → peer review → implement → check/test → code review → rules update.
allowed-tools: Read, Write, Edit, Glob, Grep, TodoWrite, EnterPlanMode, ExitPlanMode, Skill(ask-peer), Skill(extract-rules), Skill(simplify), Bash(pwd), Bash(pnpm run *), Bash(pnpm exec *), Bash(npm run *), Bash(yarn run *), Bash(bun run *), Bash(bundle exec *), Bash(make lint *), Bash(make format *), Bash(make test *), Bash(make typecheck *), Bash(make check *), Bash(python -m pytest *), Bash(poetry run *), Bash(uv run *), Bash(cargo test *), Bash(cargo clippy *), Bash(cargo fmt *), Bash(go test *), Bash(go vet *), Bash(git diff *), Bash(git status *), Bash(git log *)
---

# Dev Workflow

## Usage

```text
/dev-workflow --init         # Project setup (detect check/test commands)
/dev-workflow <task>         # Execute workflow (default)
```

## Prerequisites

- **ask-peer skill**: Required for plan/code review. If unavailable, ask user directly instead.
- **extract-rules skill**: Required for rule update. If unavailable, skip with message.

## Configuration

Settings file: `dev-workflow.local.md` (YAML frontmatter only)
- Project-level: `.claude/dev-workflow.local.md` (takes precedence)
- User-level: `~/.claude/dev-workflow.local.md`

```yaml
---
check_commands:
  - "pnpm run lint:fix"
  - "pnpm run format"
  - "pnpm run typecheck"
test_commands:
  - "pnpm run test:unit"
  - "pnpm run test:e2e"
  - "Skill(test-runner)"
---
```

- **check_commands**: 静的チェック（lint, format, typecheck等）。常に全実行
- **test_commands**: テスト実行。変更内容に応じて全実行 or 関連テストのみをAIが判断
- `Skill(`で始まるエントリはスキル呼び出しとして処理（コマンドとスキルの混在OK）
- 配列の順序通りに実行
- Note: `Skill()`で指定するスキルはプロジェクトにインストール済みである必要がある

## Mode Detection

- `--init` → Init Mode
- Otherwise → Execution Mode

---

## Init Mode

1. Detect project type from config files (package.json, Gemfile, pyproject.toml, Cargo.toml, go.mod, Makefile)
2. Detect package manager from lock files (JS/TS only)
3. Infer check/test commands for the detected project type
   - check_commands: lint, format, typecheckなど静的チェック系を検出
   - test_commands: package.json scripts等からtest関連キー（test, test:unit, test:e2e, test:integration等）を複数検出
4. Present detected commands to user for confirmation
5. Save to `.claude/dev-workflow.local.md`

---

## Execution Mode

### Step 1: Load Settings

1. Read `.claude/dev-workflow.local.md` (project-level, priority) or `~/.claude/dev-workflow.local.md` (user-level)
2. If neither exists, prompt user to run `/dev-workflow --init` and stop

### Step 2: Create Plan

1. `EnterPlanMode`
2. Analyze the task and codebase, create implementation plan
3. **No code changes in this phase**

### Step 3: Peer Plan Review (max 3 iterations)

1. `Skill(ask-peer)`: Review the plan. Instruct peer to also read `.claude/rules/` for project conventions.
2. Evaluate feedback, apply improvements, reject inapplicable points
3. Re-review if modified, repeat until no actionable feedback remains
4. If max iterations reached, present to user for decision

### Step 4: Finalize Plan

1. `ExitPlanMode` to begin implementation

### Step 5: Implement

1. Follow the plan, track progress with `TodoWrite`

### Step 6: Simplify

1. `Skill(simplify)`: Review changed code for reuse, quality, and efficiency, then fix any issues found

### Step 7: Check / Test (max 3 retries)

1. Run `check_commands` in order (always run all)
   - 失敗時は修正してリトライ（test_commandsには進まない）
2. Run `test_commands` in order
   - `Skill(`で始まるエントリはスキル呼び出し、それ以外はシェルコマンドとして実行
   - 変更内容に基づき全テスト実行か関連テストのみかをAIが判断（迷ったら全実行）
3. After 3 retries, report to user and stop
4. **Only execute commands/skills from the configuration file**

### Step 8: Peer Code Review (max 3 iterations)

1. `Skill(ask-peer)`: Review code changes (include `git diff HEAD` to capture all changes since workflow start). Instruct peer to also read `.claude/rules/`.
2. Evaluate feedback, fix genuine issues, reject inapplicable points
3. If code modified, re-run Step 7, then re-review
4. If max iterations reached, present to user for decision

### Step 9: Update Rules

1. `Skill(extract-rules)` with `--from-conversation` (always)
2. `Skill(extract-rules)` with `--update` (only if significant structural/pattern changes occurred)
3. If extract-rules is unavailable, skip this step and inform user

### Completion

Report summary: tasks completed, files modified, test results, review outcomes, rules updated.
