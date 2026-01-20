---
description: Test all plugin skills and agents to verify they work correctly
allowed-tools: Bash(which:*), Skill(ask-claude), Skill(ask-codex), Skill(ask-gemini), Skill(ask-peer), Skill(tr), Task
---

# Test Skills and Agents

このリポジトリの全プラグインのスキル・エージェントが正常に動作するかテストします。

## テスト対象

| プラグイン | スキル | エージェント | 外部依存 |
|-----------|--------|------------|---------|
| ask-claude | /ask-claude | - | `claude` CLI |
| ask-codex | /ask-codex | - | `codex` CLI |
| ask-gemini | /ask-gemini | - | `gemini` CLI |
| peer | /ask-peer | peer | なし |
| translate | /tr | tr, tr-hq | なし |

## 作業手順

### Step 1: CLI存在確認

外部CLIが必要なスキルのため、インストール状況を確認：

- `which claude`
- `which codex`
- `which gemini`

インストールされていないCLIに依存するスキルはスキップします。

### Step 2: スキル動作テスト

**重要**: 各スキルは `Skill` ツールを使って呼び出してください。

#### ask-claude

- `Skill(skill: "ask-claude", args: "what is 2+2?")` を実行
- CLIがインストールされていない場合はスキップ

#### ask-codex

- `Skill(skill: "ask-codex", args: "what is 2+2?")` を実行
- CLIがインストールされていない場合はスキップ

#### ask-gemini

- `Skill(skill: "ask-gemini", args: "what is 2+2?")` を実行
- CLIがインストールされていない場合はスキップ

#### peer

- `Skill(skill: "ask-peer", args: "Review this plan: 1. Read file 2. Edit file")` を実行

#### translate

- `Skill(skill: "tr", args: "hello")` を実行 → 日本語への翻訳を確認

### Step 3: エージェント動作テスト

`Task` ツールを使って各エージェントをテストします。

#### tr エージェント

- `Task(subagent_type: "tr", prompt: "Translate: Good morning")` を実行
- 日本語への翻訳結果を確認

#### tr-hq エージェント

- `Task(subagent_type: "tr-hq", prompt: "Translate: The quick brown fox jumps over the lazy dog")` を実行
- 日本語への翻訳結果を確認

### Step 4: 結果サマリー

以下の形式で結果を報告してください：

```
## テスト結果

### スキル

| プラグイン | スキル | 結果 | 備考 |
|-----------|--------|------|------|
| ask-claude | /ask-claude | ✅/⚠️/N/A | 正常/エラー内容/CLI未インストール |
| ask-codex | /ask-codex | ✅/⚠️/N/A | ... |
| ask-gemini | /ask-gemini | ✅/⚠️/N/A | ... |
| peer | /ask-peer | ✅/⚠️ | ... |
| translate | /tr | ✅/⚠️ | ... |

### エージェント

| プラグイン | エージェント | 結果 | 備考 |
|-----------|------------|------|------|
| translate | tr | ✅/⚠️ | ... |
| translate | tr-hq | ✅/⚠️ | ... |

### 総合結果
✅ 全テスト成功 / ⚠️ N件の問題が見つかりました

問題がある場合は詳細を記載：
- [プラグイン名]: 問題の内容と推奨対応
```
