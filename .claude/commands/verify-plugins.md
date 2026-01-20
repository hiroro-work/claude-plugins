---
description: Verify all plugins structure, versions, and execute skill/agent tests
argument-hint: [--full]
allowed-tools: Read, Glob, Grep, Bash(jq:*), Bash(for:*), Bash(echo:*), Bash(if:*), Bash(head:*), Bash(do:*), Skill(test-skills), Skill(check-cli-updates)
---

# Verify Plugins

このリポジトリの全プラグインの構造、バージョン整合性、および動作を検証します。

## 使い方

```text
/verify-plugins        # 基本検証（構造・バージョン・動作テスト）
/verify-plugins --full # 完全検証（CLI更新確認を含む）
```

## 対象ファイル

- `.claude-plugin/marketplace.json` - プラグインマニフェスト
- `plugins/*/` - 各プラグインディレクトリ

## 検証項目

### 1. ファイル存在確認

各プラグインについて以下のファイルが存在することを確認：

| プラグイン | plugin.json | スキル | エージェント |
|-----------|-------------|--------|------------|
| ask-claude | plugins/ask-claude/.claude-plugin/plugin.json | skills/ask-claude/SKILL.md | - |
| ask-codex | plugins/ask-codex/.claude-plugin/plugin.json | skills/ask-codex/SKILL.md | - |
| ask-gemini | plugins/ask-gemini/.claude-plugin/plugin.json | skills/ask-gemini/SKILL.md | - |
| peer | plugins/peer/.claude-plugin/plugin.json | skills/ask-peer/SKILL.md | agents/peer.md |
| translate | plugins/translate/.claude-plugin/plugin.json | skills/tr/SKILL.md | agents/tr.md, agents/tr-hq.md |

### 2. バージョン整合性

`marketplace.json` と各 `plugin.json` のバージョンが一致することを確認。

### 3. 構文検証

- 各 `plugin.json` が有効なJSONであること
- 各 `SKILL.md` にYAMLフロントマターが存在すること
- 各エージェント定義ファイルにYAMLフロントマターが存在すること

### 4. スキル・エージェント動作確認

各プラグインの機能が正常に動作することを確認。

## 作業手順

### Step 1: marketplace.json の読み込み

`.claude-plugin/marketplace.json` を読み込み、登録されている全プラグインをリストアップしてください。

### Step 2: ファイル存在確認

上記の表に従って、各プラグインの必須ファイルが存在することを確認してください。
Globを使って効率的に確認できます。

### Step 3: バージョン整合性チェック

各プラグインについて：
1. marketplace.json のバージョンを取得
2. plugin.json のバージョンを取得
3. 一致を確認

不一致がある場合は警告として記録してください。

### Step 4: JSON構文検証

各 `plugin.json` について `jq` で構文チェック：

```bash
jq . plugins/<plugin>/.claude-plugin/plugin.json > /dev/null
```

### Step 5: フロントマター存在確認

各 `SKILL.md` と エージェントファイルの先頭が `---` で始まることを確認してください。

### Step 6: スキル・エージェント動作テスト

**Skillツールを使って `test-skills` スキルを呼び出してください。**

```text
Skill(skill: "test-skills")
```

このスキルでは以下がテストされます：

- 各プラグインのスキル動作（/ask-claude, /ask-codex, /ask-gemini, /ask-peer, /tr）
- 各プラグインのエージェント動作（tr, tr-hq）
- 外部CLI依存のスキルは、CLIがインストールされていない場合スキップ

### Step 7: CLI更新確認（`--full` 指定時のみ）

**`--full` オプションが指定された場合のみ**、このステップを実行してください。
指定されていない場合は、このステップをスキップして Step 8 に進んでください。

```text
Skill(skill: "check-cli-updates")
```

このスキルでは以下が確認されます：

- 各CLIの最新バージョンとインストール済みバージョンの比較
- SKILL.mdに記載されているオプションの有効性
- 非推奨オプションや新機能の確認

### Step 8: 結果サマリー

以下の形式で結果を報告してください：

```
## 検証結果

### ファイル存在
| プラグイン | plugin.json | スキル | エージェント | 状態 |
|-----------|-------------|--------|------------|------|
| ask-claude | ✅ | ✅ | N/A | ✅ |
| ask-codex | ✅ | ✅ | N/A | ✅ |
| ask-gemini | ✅ | ✅ | N/A | ✅ |
| peer | ✅ | ✅ | ✅ | ✅ |
| translate | ✅ | ✅ | ✅ | ✅ |

### バージョン整合性
| プラグイン | marketplace | plugin.json | 状態 |
|-----------|-------------|-------------|------|
| ask-claude | 1.1.1 | 1.1.1 | ✅ |
| ... | ... | ... | ... |

### 構文検証
| プラグイン | JSON | フロントマター | 状態 |
|-----------|------|---------------|------|
| ask-claude | ✅ | ✅ | ✅ |
| ... | ... | ... | ... |

### 動作テスト
| プラグイン | スキル/エージェント | 結果 | 備考 |
|-----------|-------------------|------|------|
| ask-claude | /ask-claude | ✅/⚠️/N/A | 正常動作/エラー内容/CLI未インストール |
| ask-codex | /ask-codex | ✅/⚠️/N/A | ... |
| ask-gemini | /ask-gemini | ✅/⚠️/N/A | ... |
| peer | /ask-peer | ✅/⚠️ | ... |
| translate | /tr | ✅/⚠️ | ... |
| translate | tr agent | ✅/⚠️ | ... |
| translate | tr-hq agent | ✅/⚠️ | ... |

### 総合結果
✅ 全プラグインが正常です / ⚠️ N件の問題が見つかりました

問題がある場合は詳細を記載：
- [プラグイン名]: 問題の内容と推奨対応
```
