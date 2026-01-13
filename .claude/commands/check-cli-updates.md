---
description: Check for CLI updates and validate SKILL.md contents for ask-claude, ask-codex, ask-gemini plugins
allowed-tools: WebSearch, WebFetch, Read, Grep, Glob, Bash(claude:*), Bash(codex:*), Bash(gemini:*), Bash(which:*), Skill(ask-claude), Skill(ask-codex), Skill(ask-gemini), Skill(ask-peer)
---

# CLI Update Check

このプロジェクトのask-claude, ask-codex, ask-geminiプラグインが利用している外部CLIの最新情報を調査し、SKILL.mdの内容に更新が必要かチェックしてください。

## 対象プラグイン

| プラグイン | CLI | SKILL.mdパス | 公式リポジトリ |
|-----------|-----|-------------|---------------|
| ask-claude | `claude` | plugins/ask-claude/skills/ask-claude/SKILL.md | https://github.com/anthropics/claude-code |
| ask-codex | `codex` | plugins/ask-codex/skills/ask-codex/SKILL.md | https://github.com/openai/codex |
| ask-gemini | `gemini` | plugins/ask-gemini/skills/ask-gemini/SKILL.md | https://github.com/google-gemini/gemini-cli |

## 作業手順

### Step 0: 前提確認

各CLIがインストールされているか確認してください：

- `which claude`
- `which codex`
- `which gemini`

インストールされていないCLIはスキップし、結果サマリーで報告してください。

### Step 1: 現状確認

各SKILL.mdを読んで、現在記載されているオプションを確認してください。

### Step 2: CLIヘルプ確認

各CLIの `--help` と `--version` を実行して、現在のオプションとバージョンを確認してください：

- `claude --help` / `claude --version`
- `codex exec --help` / `codex --version`
- `gemini --help` / `gemini --version`

### Step 3: 最新ドキュメント調査

WebSearchを使って、各CLIの最新ドキュメントを調査してください。
利用可能なMCP（Context7など）があれば活用してください。

確認ポイント：
- 使用しているオプションが有効か
- 非推奨（deprecated）や廃止されたオプションがないか
- 新しく追加された重要なオプションがないか

### Step 4: peerレビュー

調査結果をpeerにレビュー依頼してください。

### Step 5: スキル動作確認

各スキルが正しく動作することを確認してください。
このプロジェクトでは `.claude/skills/` にローカルスキルが設定されているため、`plugins/` 配下の最新のスキルを直接テストできます。

- `/ask-codex` で Codex CLI が呼び出せるか確認
- `/ask-gemini` で Gemini CLI が呼び出せるか確認
- `/ask-claude` で Claude CLI が呼び出せるか確認

### Step 6: 結果サマリー

以下の形式で結果を報告してください：

| プラグイン | CLIバージョン | 状態 | 必要なアクション |
|-----------|--------------|------|-----------------|
| ask-claude | x.x.x | ✅/⚠️/N/A | なし/修正内容/未インストール |
| ask-codex | x.x.x | ✅/⚠️/N/A | なし/修正内容/未インストール |
| ask-gemini | x.x.x | ✅/⚠️/N/A | なし/修正内容/未インストール |
