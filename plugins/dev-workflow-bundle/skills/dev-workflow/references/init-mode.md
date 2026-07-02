# Init Mode

1. Detect project type from config files (package.json, Gemfile, pyproject.toml, Cargo.toml, go.mod, Makefile)
2. Detect package manager from lock files (JS/TS only)
3. Infer check_commands for the detected project type
   - Detect static checks (lint, format, typecheck, etc.)
   - **TypeScript multi-tsconfig handling**:
     - Scan `tsconfig*.json` files **directly under the project root only** — do not recurse into `packages/*` / `apps/*` (workspace territory, user-configured)
     - Exclude tsconfigs whose name signals a non-typecheck role (e.g. `tsconfig.eslint.json`, `tsconfig.*.test.json`, `tsconfig.vitest.json`)
     - To detect `references: [...]` on the root `tsconfig.json`, use the `Read` tool and parse the file as JSONC (strip `//` / `/* */` comments and trailing commas before checking the `references` key). Avoid shelling out to `tsc --showConfig` or `grep`: the former needs tooling not in `allowed-tools`, the latter false-hits inside `//`-commented blocks
     - Trigger: **2 or more** tsconfigs remain after exclusion, or the root `tsconfig.json` resolves to a non-empty `references` array
     - Action: register one type-check command per tsconfig in `check_commands`. Match the detected package manager so commands fit the `allowed-tools` `Bash(<pm> run *)` / `Bash(<pm> exec *)` globs — e.g. `pnpm exec tsc -p tsconfig.app.json --noEmit` for pnpm projects, or add per-tsconfig scripts in `package.json` and use `<pm> run typecheck:<name>` for npm/yarn/bun. (Per-tsconfig `-p` was chosen over `tsc -b --noEmit` for universal compatibility; see CHANGELOG entry for the design rationale.) Present the generated command list to the user in Step 6 for confirmation so any environment mismatch is caught before the config is saved
       - **Solution-Style root exclusion**: if the root `tsconfig.json` has a non-empty `references` array, exclude the root itself from per-tsconfig registration — `tsc -p tsconfig.json --noEmit` typically fails on Solution-Style roots because emit is disabled there. Register commands only for the referenced leaf tsconfigs plus any other non-root tsconfigs that survived the name-based exclusion above
4. Determine test_commands (dev-workflow always uses `Skill(run-tests)` as the canonical test skill):
   a. **Check existing `run-tests` skill**: Look for `.claude/skills/run-tests/SKILL.md`
      - **Current format** (Agent tool in allowed-tools + subagent execution pattern + three-status return contract + `--base-commit` input contract): use as-is, but first check the existing skill against the **known template-feature gaps** below AND run the **Template-conformance backstop** below before skipping generation. Each known gap carries its own disposition — a **surgical in-place patch** or a **regenerate**. Skip generation only when **no known gap is detected and the backstop finds no further drift**; when a gap is found, offer to apply its disposition (do not blanket-regenerate a Current-format skill that only needs a surgical patch). The known-gaps list is a **closed list of common template features with tailored dispositions** — its job is to supply a precise surgical patch (or a scoped regenerate) for frequently-seen drift, **not** to serve as the completeness boundary (that is the Template-conformance backstop's role). The two are layers: append a tailored entry to the known-gaps list when a recurring drift deserves a surgical patch, and drop an entry when the template removes or changes the directive it covered. Step 4a only **decides and offers** the disposition here (for both the known gaps and the backstop); the actual surgical `Edit` or regenerated file is written in Step 7 (after the Step 6 confirmation gate), not at this step.
        - **Surgical in-place patch** (preserves all project-specific content — detected test commands, prerequisites, description, and allowed-tools are left untouched; offer to add only the missing directive via an `Edit`):
          - The subagent-spawn step does not pass `model: sonnet` to the `Agent` dispatch. The latest template dispatches the verification subagent with `model: sonnet` as a deliberate skill-side cost choice (see the run-tests SKILL.md Template's Process step). Detection: the existing skill's subagent-spawn instruction lacks a `model: sonnet` directive on its `Agent` call. Fix: insert `model: sonnet` into that dispatch step. (This is the drift that re-running `--init` on a project whose `run-tests` predates the `model: sonnet` default would otherwise leave unaddressed.)
        - **Regenerate** (rebuild the skill from the latest template, re-deriving test commands and prerequisites — first extract whatever test commands and prerequisites the old skill already defines before removal (best-effort per artifact: extract what is present, re-derive the rest from project config in (b)), following the same extract-before-remove step described in the **Outdated or not found** path below — offer to regenerate if any of these structural gaps are detected):
          - Prerequisites are detected in the project but the existing skill lacks a Prerequisites section
          - Docker-related prerequisites are detected (docker-compose.yml / compose.yml exists) but the existing skill's Prerequisites section lacks Docker daemon readiness check (e.g. `docker info`)
        - **When both a surgical-patch gap and a regenerate gap apply to the same skill** (the regenerate may come from the known-gaps list above **or** from the Template-conformance backstop below): the regenerate subsumes the surgical patch — rebuilding from the latest template already emits the surgical directive (e.g. `model: sonnet`), so offer only the regenerate, not both independently. Strongest action wins; never silently drop the surgical gap. (The backstop's own skip clause only suppresses it when a known-gap **regenerate** is already selected; when only a known-gap **surgical patch** is selected the backstop still runs, so a backstop-offered regenerate can co-occur with a known-gap surgical patch — this rule resolves that pairing too.)
        - **Template-conformance backstop** (the completeness layer — runs after the known-gaps checks above, before deciding to skip generation; skip it entirely when a known-gap **regenerate** disposition is already selected, since the regenerate rebuilds from the template and subsumes any backstop-detectable drift): compare the existing skill against the embedded template (§ run-tests SKILL.md Template) across its **non-adaptive spans** — every part of the template that is *not* in the **Adaptive regions** closed list below. A non-adaptive span is a gap when a load-bearing instruction or named contract present in the template is **absent or semantically contradicted** in the existing skill and is not already handled by a known-gap disposition above. Judge by **meaning, not literal lines**: a difference in wording or phrasing that preserves the instruction is **not** a gap. The comparison target is the *entire* non-adaptive content, **not** a fixed list of directives — comparing the whole non-adaptive span (rather than enumerating each load-bearing directive) is what catches template features that were never enumerated as known gaps, which is the failure class this backstop exists to close. Current load-bearing anchors, **illustrative and non-exhaustive**: the three-status return contract (SUCCESS / TEST_FAILED / EXECUTION_ERROR and its required body structure — the four-criteria check above only confirms its *presence*; the backstop compares its body conformance), the `--base-commit` scope branch, the `model: sonnet` dispatch directive, the `Agent`-tool subagent dispatch, and the Prerequisites structure. **Disposition**: a backstop-detected gap is offered as a **regenerate** — an un-enumerated directive has no known insertion point, so a surgical patch is not possible — using the same decide-and-offer-here / execute-in-Step-7 split as the known gaps. Promote a recurring backstop hit to a tailored known-gap entry per the bidirectional maintenance note in the **Current format** paragraph above. Excluding the adaptive regions is what distinguishes this from the literal full-file diff, which would false-positive on the per-project commands / allowed-tools / description that `--init` intentionally adapts.
        - **Adaptive regions** (closed list — the spans the backstop treats as expected-to-differ and excludes from comparison; this is the single source of truth, referenced from § run-tests SKILL.md Template):
          - the frontmatter `description`
          - the `Bash(...)` command entries in `allowed-tools` (but **not** the `Agent` tool entry itself — that is load-bearing)
          - the Prerequisites section content
          - the Process step's test-command enumeration
          - within the Subagent Instructions, **only the project-specific checks / task body** (what the subagent verifies or runs — the checks enumeration, "execute the test commands listed above", and similar project-specific text) — **not** the three-status return contract, which is load-bearing and stays in the non-adaptive comparison span
      - **Outdated or not found**: read any existing test commands and prerequisites from the old skill before removal, then proceed to (b). Remove the old file and incorporate extracted content into the newly generated skill
      - Note: if other test-related skills exist (e.g., `test-runner`, `test-file`), inform user that dev-workflow uses `run-tests` as its canonical test skill and offer to incorporate their test commands into the generated `run-tests`
   b. **Generate `run-tests` skill**: Detect test commands and prerequisites from project config
      - Detect test commands from project config (package.json scripts, Makefile targets, etc.)
      - Analyze project structure: source directories, test file locations, test command definitions
      - **Detect test prerequisites** from project files:
        - `docker-compose.yml` / `docker-compose.yaml` / `compose.yml` / `compose.yaml` → generates **two** prerequisites in order:
          1. Docker daemon: check: `docker info > /dev/null 2>&1` / setup: `open -a Docker` then poll `docker info` every 3 seconds (max 30 seconds) until ready (macOS; on Linux use `sudo systemctl start docker`)
          2. Docker services: check: `docker compose ps --status running` / setup: `docker compose up -d`
        - `config/database.yml` + `db/schema.rb` (Rails) → check: `bin/rails db:version` / setup: `bin/rails db:prepare`
        - `.env.example` → check: `test -f .env` / setup: manual guidance only (auto-copy is unsafe)
        - `bin/setup` / `script/setup` → if present, prioritize as a single setup command over individual prerequisites
      - Prepare draft `.claude/skills/run-tests/SKILL.md` with:
        - frontmatter: name, description, allowed-tools (`Agent`, `Bash(<pkg-manager> run *)`, `Bash(<specific test commands>)`, `Bash(git diff *)`, `Bash(<detected prerequisite check/setup commands>)` — include only commands for technologies actually detected in the project)
        - Prerequisites section (only if prerequisites were detected — omit entirely if none)
        - Test commands list (detected from project)
        - Subagent-based execution process (see template below)
        - Three-status return contract (SUCCESS / TEST_FAILED / EXECUTION_ERROR)
   c. **Fallback**: If step 4b could not detect any test commands from project config, propose project-type standard command (e.g., `cargo test`, `python -m pytest`) wrapped in a generated `run-tests` skill, or ask user
   d. Set `test_commands: ["Skill(run-tests)"]`
5. Ask user which reviewer skill to use (default: ask-peer)
   - Options: ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot, ask-agy
6. Present detected commands, test approach, prerequisites (if any), review_iterations (default: 3), and reviewer to user for confirmation
7. On user approval, save settings to `.claude/dev-workflow.md` (project shared, git tracked). If `.claude/dev-workflow.md` already exists, preserve any keys not managed by `--init` (e.g., `custom_instructions`, `hooks`) by reading the existing file first and merging the new values into it. If the existing file has malformed YAML, warn the user and ask whether to overwrite it (losing unmanaged keys) or abort so they can fix it manually. Write generated skill files (if any from 4b/4c)
8. Verify commands and skills work
   - Run each check_command and report pass/fail
   - **Pseudo-execute** `run-tests` (newly created skills are not registered in the current session, so `Skill(run-tests)` cannot be used):
     a. Read the generated `.claude/skills/run-tests/SKILL.md`
     b. If a Prerequisites section exists, run each check command; if a check fails and a setup command is defined, execute the setup command; if the setup starts an asynchronous service, re-run the check command with retries (e.g. every 3-5 seconds) for up to 30 seconds (commands not in allowed-tools will prompt user for approval, providing a natural safety gate); if a prerequisite has no setup command (e.g. .env), report as a warning with guidance; on setup failure, suggest fixes but do not block
     c. Determine test scope: run `git diff --name-only HEAD` to detect changed files; if HEAD is unavailable or no changed files, run all tests
     d. Execute the test commands listed in the skill directly via Bash (no subagent needed for init verification)
     e. Report results using the three-status format (SUCCESS / TEST_FAILED / EXECUTION_ERROR)
   - Display results summary
   - If any command/skill fails, suggest fixes but do not block (config is already saved)
   - Note: `--init` completes the session. Run `/dev-workflow <task>` in a new session for the generated skills to be recognized

## run-tests SKILL.md Template

When generating the `run-tests` skill, use this structure (adapt commands and allowed-tools to the detected project).

> Which spans of this template `--init` adapts per-project (vs. the load-bearing spans the step 4a **Template-conformance backstop** compares against an existing skill) are enumerated once in step 4a's **Adaptive regions** closed list — keep that list in sync when this template's adaptive vs. load-bearing structure changes.

```markdown
---
name: run-tests
description: Run project tests via subagent to keep main context clean
allowed-tools: Agent, Bash(git diff *), Bash(<detected test commands>), Bash(<detected prerequisite check/setup commands>)
# NOTE: Only include commands for technologies actually detected in the project.
---

# Test Runner

## Prerequisites

> Include this section ONLY if prerequisites were detected during init. Omit entirely if none.

Before running tests, check these conditions and set up if needed:
- <description>: check `<check command>` → if failed, setup `<setup command>`

Example:
- Service runtime: check `<readiness command>` → if failed, start the service, then re-check readiness
- Project services: check `<service status command>` → if failed, setup `<service start command>`
- Database state: check `<db check command>` → if failed, setup `<db prepare command>`
- Required local file: check `test -f <file>` → if failed, report EXECUTION_ERROR with guidance

## Process

1. Check prerequisites (if any): run each check command in order; if a check fails, run the corresponding setup command; if the setup starts an asynchronous service (e.g. daemon, database), re-run the check command with retries (e.g. every 3-5 seconds) for up to 30 seconds before declaring failure; if setup still fails, return EXECUTION_ERROR with remediation guidance
2. Determine test scope:
   - If $ARGUMENTS contains `--base-commit <sha>`: run `git diff --name-only <sha>` to get changed files (includes committed, staged, and unstaged changes)
   - Otherwise: run `git diff --name-only HEAD` to detect changed files (if HEAD is unavailable or no changed files detected, run all tests)
   - Localized changes → run only tests covering changed modules/files
   - Cross-cutting changes (shared utils, config, DB schema) or unsure → run all tests
3. Spawn a subagent (Agent tool, `model: sonnet`) to execute tests — pass `sonnet` as the `Agent` tool's `model` parameter. Running the listed test commands and summarizing results is mechanical, so `sonnet` is sufficient by default; this is a deliberate skill-side cost choice.
4. Subagent runs the following test commands in order:
   - <detected test commands here>
5. Return the subagent's structured summary to the caller

## Subagent Instructions

> Execute the test commands listed above.
> Return a structured summary with one of three statuses:
>
> **Status: SUCCESS**
> - All tests passed
> - Per-command results: command, pass/fail
>
> **Status: TEST_FAILED**
> - Per-command results: command, pass/fail
> - For failures:
>   - Failed test names
>   - Error messages
>   - Relevant code locations (file:line)
>   - Stack trace excerpt (first meaningful lines showing root cause)
> - Keep the summary concise but include enough detail to fix the issue without re-running
>
> **Status: EXECUTION_ERROR**
> - Command that failed to execute
> - Error output
> - This status is for infrastructure/environment errors (including prerequisite failures), not test failures
```
