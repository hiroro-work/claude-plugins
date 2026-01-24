# Claude Code Plugins Marketplace

Claude Code用プラグインを公開するためのマーケットプレイスリポジトリです。

## リポジトリ構成

```
.
├── .claude-plugin/
│   └── marketplace.json      # プラグインマニフェスト
├── skills/                   # スキル専用（Skills.sh + マーケットプレイス両対応）
│   └── <skill-name>/
│       └── SKILL.md          # 正規ファイル（二重管理なし）
├── plugins/                  # エージェント依存プラグインのみ
│   └── <plugin-name>/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── skills/
│       │   └── <skill-name>/
│       │       └── SKILL.md
│       ├── agents/
│       │   └── <agent-name>.md
│       └── README.md
├── .claude/
│   ├── commands/             # 開発用コマンド
│   ├── skills/               # スキルへのシンボリックリンク
│   └── agents/               # エージェントへのシンボリックリンク
├── CHANGELOG.md              # 変更履歴
└── README.md                 # リポジトリ説明
```

## スキル追加フロー（エージェント非依存）

スキルが `allowed-tools` を持ち、エージェントに依存しない場合:

### 1. skills/ディレクトリにスキル作成

```
skills/<skill-name>/
└── SKILL.md
```

### 2. SKILL.md

```markdown
---
name: <skill-name>
description: スキルの説明
allowed-tools: Read, Glob, Grep
---

# スキル名

スキルの詳細な説明と使い方
```

### 3. marketplace.json の skills 配列に追加

`.claude-plugin/marketplace.json` の `hiropon-skills` プラグインの `skills` 配列に追加:

```json
{
  "name": "hiropon-skills",
  "source": "./",
  "skills": [
    "./skills/ask-claude",
    "./skills/<skill-name>"  // 追加
  ]
}
```

### 4. シンボリックリンク作成

```bash
ln -s ../../skills/<skill-name> .claude/skills/<skill-name>
```

### 5. CHANGELOG.md 更新

## プラグイン追加フロー（エージェント依存）

エージェントを必要とするプラグインの場合:

### 1. plugins/ディレクトリにプラグイン作成

```
plugins/<plugin-name>/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── <skill-name>/
│       └── SKILL.md
├── agents/
│   └── <agent-name>.md
└── README.md
```

### 2. plugin.json

```json
{
  "name": "<plugin-name>",
  "version": "1.0.0",
  "description": "プラグインの説明",
  "author": {
    "name": "hiroro-work",
    "url": "https://github.com/hiroro-work"
  },
  "homepage": "https://github.com/hiroro-work/claude-plugins",
  "repository": "https://github.com/hiroro-work/claude-plugins",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"]
}
```

### 3. marketplace.json に追加

`.claude-plugin/marketplace.json` の `plugins` 配列に追加:

```json
{
  "name": "<plugin-name>",
  "source": "./plugins/<plugin-name>",
  "description": "プラグインの説明",
  "version": "1.0.0",
  "author": { "name": "hiropon" },
  "category": "workflow"
}
```

### 4. シンボリックリンク作成

```bash
# スキル
ln -s ../../plugins/<plugin-name>/skills/<skill-name> .claude/skills/<skill-name>

# エージェント
ln -s ../../plugins/<plugin-name>/agents/<agent-name>.md .claude/agents/<agent-name>.md
```

### 5. CHANGELOG.md 更新

## 検証コマンド

```bash
/verify-plugins        # 構造・バージョン・動作テスト
/verify-plugins --full # 完全検証（CLI更新確認を含む）
/test-skills           # スキル・エージェント動作テスト
```

## コーディング規約

### 命名規則

- スキル名: kebab-case（例: `security-scanner`, `ask-claude`）
- プラグイン名: kebab-case（例: `peer`, `translate`）
- エージェント名: kebab-case（例: `peer`, `tr`）

### allowed-tools

- 必要最小限の権限のみ付与
- `Bash(*)` は避け、具体的なコマンドを指定（例: `Bash(git:*)`, `Bash(jq:*)`）
- セキュリティスキャンで警告される可能性のあるパターンは正当な理由がある場合のみ使用

### バージョン管理

- セマンティックバージョニング（SemVer）を使用
- `marketplace.json` と `plugin.json` のバージョンは常に一致させる

### ドキュメント

- README.md: ユーザー向けのドキュメント（使い方、機能、設定など）
- SKILL.md: Claude向けの指示（処理フロー、出力形式など）

## セキュリティ

プラグイン追加時は `/security-scanner --project` でセキュリティスキャンを実行し、問題がないことを確認してください。
