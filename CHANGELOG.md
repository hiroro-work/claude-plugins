# Changelog

## [1.1.1] - 2025-12-28

### Fixed

- `ask-codex`: Fix `allowed-tools` pattern from `Bash(codex exec:*)` to `Bash(codex:*)`

## [1.1.0] - 2025-12-28

### Changed

- `ask-claude`, `ask-codex`, `ask-gemini`: Add `allowed-tools` to eliminate double permission prompts when using skills

## [1.0.0] - 2025-12-25

### Added

- Initial release
- `ask-claude` plugin: Claude CLI integration for getting a second opinion
- `ask-codex` plugin: Codex CLI integration for getting a second opinion
- `ask-gemini` plugin: Gemini CLI integration for getting a second opinion
- `peer` plugin: Claude subagent for peer review, planning discussions, and brainstorming
