# Init Mode

1. Detect project type from config files (package.json, Gemfile, pyproject.toml, Cargo.toml, go.mod, Makefile)
2. Detect package manager from lock files (JS/TS only)
3. Infer check_commands for the detected project type
   - Detect static checks (lint, format, typecheck, etc.)
4. Determine test_commands using the following priority (check project-local `.claude/skills/` only):
   a. **Existing test skill detection**: Scan all `.claude/skills/*/SKILL.md` and check frontmatter name/description for test-related keywords (test, spec, etc.)
      - If one found: propose `Skill(<skill-name>)`
      - If multiple found: list all and let user choose
   b. **Propose test skill generation** (`run-tests`): If no existing test skill AND 3+ distinct test scopes detected (e.g., `test:app`, `test:e2e`, `test:functions` — exclude variants like `test:watch`, `test:coverage`)
      - Skip if `.claude/skills/run-tests/SKILL.md` already exists
      - Analyze project structure: source directories, test file locations, test command definitions
      - Prepare draft `.claude/skills/run-tests/SKILL.md` with:
        - frontmatter: name, description, allowed-tools (include `Bash(<pkg-manager> run *)` etc. matching the project)
        - Path pattern → test command mapping table based on detected project structure
        - Standard execution procedure (receive file path via `$ARGUMENTS`, select command by pattern, execute, report)
      - Propose `Skill(run-tests)` for test_commands
   c. **Direct commands**: If no existing test skill AND only 1-2 test scopes
      - Use direct commands (e.g., `pnpm test`, `go test ./...`)
   d. **Fallback**: If no test commands detected, propose project-type standard command (e.g., `cargo test`, `python -m pytest`) or ask user
5. Ask user which reviewer skill to use (default: ask-peer)
   - Options: ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot
6. Present detected commands, test approach, and reviewer to user for confirmation
7. On user approval, save `.claude/dev-workflow.local.md` and write generated skill files (if any from 4b)
