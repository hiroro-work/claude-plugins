---
description: Verify all plugins structure, versions, and execute skill/agent tests
argument-hint: [--full]
allowed-tools: Read, Glob, Grep, Bash(jq *), Bash(for *), Bash(echo *), Bash(if *), Bash(head *), Bash(do *), Skill(test-skills), Skill(check-cli-updates)
---

# Verify Plugins

このリポジトリの全プラグイン/スキルの構造、バージョン整合性、および動作を検証します。

## 使い方

```text
/verify-plugins        # 基本検証（構造・バージョン・動作テスト）
/verify-plugins --full # 完全検証（CLI更新確認を含む）
```

## 対象ファイル

- `.claude-plugin/marketplace.json` - プラグインマニフェスト
- `skills/*/` - スキル専用ディレクトリ（anthropics/skillsパターン）
- `plugins/*/` - エージェント依存プラグインディレクトリ

## 検証項目

### 1. ファイル存在確認

#### スキル専用（skills/配下）

| スキル | SKILL.md |
|--------|----------|
| ask-claude | skills/ask-claude/SKILL.md |
| ask-codex | skills/ask-codex/SKILL.md |
| ask-gemini | skills/ask-gemini/SKILL.md |
| ask-copilot | skills/ask-copilot/SKILL.md |
| security-scanner | skills/security-scanner/SKILL.md |

#### エージェント依存プラグイン（plugins/配下）

| プラグイン | plugin.json | スキル | エージェント |
|-----------|-------------|--------|------------|
| peer | plugins/peer/.claude-plugin/plugin.json | skills/ask-peer/SKILL.md | agents/peer.md |
| translate | plugins/translate/.claude-plugin/plugin.json | skills/tr/SKILL.md | agents/tr.md, agents/tr-hq.md |

### 2. バージョン整合性

`marketplace.json` と各 `plugin.json` のバージョンが一致することを確認。
（スキル専用はバージョン管理なし）

### 3. 構文検証

- 各 `plugin.json` が有効なJSONであること
- 各 `SKILL.md` にYAMLフロントマターが存在すること
- 各エージェント定義ファイルにYAMLフロントマターが存在すること

### 4. スキル・エージェント動作確認

各プラグイン/スキルの機能が正常に動作することを確認。

## 作業手順

### Step 1: marketplace.json の読み込み

`.claude-plugin/marketplace.json` を読み込み、登録されている全プラグインをリストアップしてください。

### Step 2: ファイル存在確認

上記の表に従って、各スキル/プラグインの必須ファイルが存在することを確認してください。
Globを使って効率的に確認できます。

### Step 3: バージョン整合性チェック

**エージェント依存プラグイン（peer, translate）のみ**：
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

- 各スキル動作（/ask-claude, /ask-codex, /ask-gemini, /ask-copilot, /ask-peer, /tr, /security-scanner）
- 各エージェント動作（peer, tr, tr-hq）
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

### ファイル存在（スキル専用）
| スキル | SKILL.md | 状態 |
|--------|----------|------|
| ask-claude | ✅ | ✅ |
| ask-codex | ✅ | ✅ |
| ask-gemini | ✅ | ✅ |
| ask-copilot | ✅ | ✅ |
| security-scanner | ✅ | ✅ |

### ファイル存在（エージェント依存プラグイン）
| プラグイン | plugin.json | スキル | エージェント | 状態 |
|-----------|-------------|--------|------------|------|
| peer | ✅ | ✅ | ✅ | ✅ |
| translate | ✅ | ✅ | ✅ | ✅ |

### バージョン整合性
| プラグイン | marketplace | plugin.json | 状態 |
|-----------|-------------|-------------|------|
| peer | 1.0.0 | 1.0.0 | ✅ |
| translate | 1.0.0 | 1.0.0 | ✅ |

### 構文検証
| 対象 | JSON | フロントマター | 状態 |
|------|------|---------------|------|
| peer | ✅ | ✅ | ✅ |
| translate | ✅ | ✅ | ✅ |
| ask-claude | N/A | ✅ | ✅ |
| ask-codex | N/A | ✅ | ✅ |
| ask-gemini | N/A | ✅ | ✅ |
| ask-copilot | N/A | ✅ | ✅ |
| security-scanner | N/A | ✅ | ✅ |

### 動作テスト
| 対象 | スキル/エージェント | 結果 | 備考 |
|------|-------------------|------|------|
| ask-claude | /ask-claude | ✅/⚠️/N/A | 正常動作/エラー内容/CLI未インストール |
| ask-codex | /ask-codex | ✅/⚠️/N/A | ... |
| ask-gemini | /ask-gemini | ✅/⚠️/N/A | ... |
| ask-copilot | /ask-copilot | ✅/⚠️/N/A | ... |
| peer | /ask-peer | ✅/⚠️ | ... |
| translate | /tr | ✅/⚠️ | ... |
| translate | tr agent | ✅/⚠️ | ... |
| translate | tr-hq agent | ✅/⚠️ | ... |
| security-scanner | /security-scanner | ✅/⚠️ | ... |

### 総合結果
✅ 全スキル/プラグインが正常です / ⚠️ N件の問題が見つかりました

問題がある場合は詳細を記載：
- [対象名]: 問題の内容と推奨対応
```
