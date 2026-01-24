# Claude Code Plugins Marketplace

Claude Code用プラグインを公開するためのマーケットプレイスリポジトリです。

## リポジトリ構成

```
.
├── .claude-plugin/
│   └── marketplace.json      # プラグインマニフェスト（全プラグイン一覧）
├── skills/                   # Skills.sh用スキル（SKILL.md直接配置）
│   └── <skill-name>/
│       └── SKILL.md
├── plugins/
│   └── <plugin-name>/        # 各プラグインディレクトリ
│       ├── .claude-plugin/
│       │   └── plugin.json   # プラグインメタデータ
│       ├── skills/
│       │   └── <skill-name>/
│       │       └── SKILL.md  # スキル定義
│       ├── agents/
│       │   └── <agent-name>.md  # エージェント定義（任意）
│       └── README.md         # プラグインドキュメント
├── .claude/
│   ├── commands/             # 開発用コマンド
│   ├── skills/               # プラグインスキルへのシンボリックリンク
│   └── agents/               # プラグインエージェントへのシンボリックリンク
├── CHANGELOG.md              # 変更履歴
└── README.md                 # リポジトリ説明
```

## プラグイン追加フロー

### 1. プラグインディレクトリ作成

```bash
plugins/<plugin-name>/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── <skill-name>/
│       └── SKILL.md
├── agents/              # エージェントがある場合
│   └── <agent-name>.md
└── README.md
```

### 2. 必須ファイル

#### plugin.json

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

#### SKILL.md

```markdown
---
name: <skill-name>
description: スキルの説明。Use /<skill-name> to ...
allowed-tools: Read, Glob, Grep
---

# スキル名

スキルの詳細な説明と使い方
```

### 3. marketplace.json に追加

`.claude-plugin/marketplace.json` の `plugins` 配列に追加：

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

# エージェント（ある場合）
ln -s ../../plugins/<plugin-name>/agents/<agent-name>.md .claude/agents/<agent-name>.md
```

### 5. Skills.sh対応（スキルがエージェント非依存の場合のみ）

スキルが `allowed-tools` を持ち、エージェントに依存しない場合は、Skills.sh用にコピー:

```bash
# skills/ディレクトリにコピー
mkdir -p skills/<skill-name>
cp plugins/<plugin-name>/skills/<skill-name>/SKILL.md skills/<skill-name>/SKILL.md
```

**対象条件:**
- スキルに `allowed-tools` が指定されている
- スキルがTask toolでエージェントを呼び出さない
- スキル単体で完結する設計

**現在のSkills.sh対応スキル:** ask-claude, ask-codex, ask-gemini, security-scanner

**重要: 二重管理のルール**

- `plugins/` が正（source of truth）
- `skills/` への同期はリリース時に手動で行う
- スキルを更新した場合は、必ず `skills/` にもコピーすること

### 6. CHANGELOG.md 更新

```markdown
## YYYY-MM-DD

### <plugin-name> v1.0.0

- Initial release: ...
- Feature 1
- Feature 2
```

### 7. verify-plugins.md と test-skills.md 更新

- `verify-plugins.md`: ファイル存在確認テーブル、結果サマリーテーブルに追加
- `test-skills.md`: テスト対象テーブル、allowed-tools、テスト手順、結果サマリーに追加

## 検証コマンド

```bash
/verify-plugins        # 構造・バージョン・動作テスト
/verify-plugins --full # 完全検証（CLI更新確認を含む）
/test-skills           # スキル・エージェント動作テスト
```

## コーディング規約

### 命名規則

- プラグイン名: kebab-case（例: `security-scanner`, `ask-claude`）
- スキル名: kebab-case（例: `security-scanner`, `ask-peer`）
- エージェント名: kebab-case（例: `security-scanner`, `peer`）

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
