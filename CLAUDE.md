# Claude Code Plugins Marketplace

Claude Code用プラグインを公開するためのマーケットプレイスリポジトリです。

## リポジトリ構成

プラグインには 2 つの配置パターンがある:

1. **direct-skill 方式**: 単体スキルプラグインはスキルディレクトリを直接 source にする（`source: "./skills/<skill-dir>"` + `skills: ["./"]`）。`plugins/` 配下のラッパーは不要
2. **wrapper 方式**: エージェント依存プラグイン、フック定義プラグイン、複数スキルの bundle は `plugins/<plugin-name>/` 配下にまとめる

```text
.
├── .claude-plugin/
│   └── marketplace.json      # プラグインマニフェスト
├── skills/                   # SKILL.mdの実体かつ単体スキルプラグインのsource
│   └── <skill-name>/
│       ├── SKILL.md
│       └── README.md         # (任意、ユーザー向け設定リファレンスなど)
├── plugins/                  # wrapper 方式のプラグインのみ
│   └── <plugin-name>/
│       ├── skills/           # bundle の場合、複数 skill 分のエントリ
│       │   └── <skill-name>  # skills/<skill-name> の実ディレクトリコピー
│       ├── .claude-plugin/   # (エージェント依存 / フック定義プラグイン)
│       │   └── plugin.json
│       ├── agents/           # (エージェント依存プラグインのみ)
│       │   └── <agent-name>.md
│       └── README.md         # (任意)
├── tests/                    # リポジトリ自身のテスト。*.test.mjs を Skill(run-node-tests) が実行する
│   └── <feature>/
├── .claude/
│   ├── commands/             # 開発用コマンド
│   ├── skills/               # 開発・テスト用シンボリックリンク
│   └── agents/               # エージェントへのシンボリックリンク
├── CHANGELOG.md              # 変更履歴
└── README.md                 # リポジトリ説明
```

**注意:** marketplace.json で `source: "./"` を使ってはいけない。`skills/` 配下の全スキルが自動発見されて重複登録される（[anthropics/claude-code#13344](https://github.com/anthropics/claude-code/issues/13344)）。必ず `./skills/<skill-dir>` または `./plugins/<plugin-name>` のように specific なパスを指定する。

## スキル追加フロー（direct-skill 方式 / エージェント非依存）

スキルが `allowed-tools` を持ち、エージェント / フック定義に依存しない場合。`plugins/` 配下のラッパーは作らない。

### 1. skills/ ディレクトリにスキル作成

```text
skills/<skill-name>/
├── SKILL.md
└── README.md   # (任意、設定が複雑ならユーザー向けリファレンスを追加)
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

### 3. marketplace.json に追加

`.claude-plugin/marketplace.json` の `plugins` 配列に追加（プラグイン名とスキル名が異なっても OK、例: plugin `peer` → skill `ask-peer`）:

```json
{
  "name": "<plugin-name>",
  "source": "./skills/<skill-name>",
  "skills": ["./"],
  "description": "スキルの説明",
  "version": "1.0.0",
  "author": { "name": "hiropon" },
  "category": "workflow"
}
```

### 4. 開発・テスト用シンボリックリンク作成

```bash
ln -s ../../skills/<skill-name> .claude/skills/<skill-name>
```

### 5. CHANGELOG.md 更新

## プラグイン追加フロー（wrapper 方式）

wrapper には **2 つのサブパターン** がある。必要なファイル構成が異なるので混同しないこと:

| サブパターン | 用途 | `.claude-plugin/plugin.json` | `agents/` | `skills/` |
|---|---|---|---|---|
| **A. エージェント / フック wrapper** | エージェント依存 (`translate`)、フック定義 (`caffeinate`) | 必須 | エージェント依存なら必須 | 単一スキルのエントリ |
| **B. bundle wrapper** | 複数スキルの束 (`dev-workflow-bundle`) | 不要 | 不要 | 複数スキルのエントリ + marketplace.json の `skills` 配列 |

### サブパターン A: エージェント / フック wrapper

#### A-1. skills/ ディレクトリにスキル作成＋プラグインディレクトリ作成

```text
skills/<skill-name>/
└── SKILL.md

plugins/<plugin-name>/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── <skill-name>  # → ../../../skills/<skill-name> (シンボリックリンク)
├── agents/            # エージェント依存プラグインのみ
│   └── <agent-name>.md
└── README.md
```

```bash
mkdir -p skills/<skill-name>
mkdir -p plugins/<plugin-name>/skills
ln -s ../../../skills/<skill-name> plugins/<plugin-name>/skills/<skill-name>
```

#### A-2. plugin.json

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

フック定義が必要な場合は `plugin.json` の `hooks` フィールドで指定（例は `plugins/caffeinate/.claude-plugin/plugin.json` を参照）。

#### A-3. marketplace.json に追加

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

### サブパターン B: bundle wrapper

#### B-1. プラグインディレクトリ作成（plugin.json は不要）

```text
plugins/<bundle-name>/
└── skills/
    ├── <skill-a>  # → ../../../skills/<skill-a>
    ├── <skill-b>  # → ../../../skills/<skill-b>
    └── ...
```

```bash
mkdir -p plugins/<bundle-name>/skills
ln -s ../../../skills/<skill-a> plugins/<bundle-name>/skills/<skill-a>
ln -s ../../../skills/<skill-b> plugins/<bundle-name>/skills/<skill-b>
```

#### B-2. marketplace.json に追加（`skills` 配列を明示）

```json
{
  "name": "<bundle-name>",
  "source": "./plugins/<bundle-name>",
  "skills": ["./skills/<skill-a>", "./skills/<skill-b>"],
  "description": "bundle の説明",
  "version": "1.0.0",
  "author": { "name": "hiropon" },
  "category": "workflow"
}
```

`skills` 配列と `plugins/<bundle-name>/skills/` 配下のエントリセットは **必ず一致** させること（`/verify-plugins` と `run-tests` が整合性を検証する）。

**wrapper 配下の `skills/` エントリは symlink ではなく実ディレクトリコピー**（`ln -s` の例は upstream bug 修正後の想定形）。plugin cache が symlink を解決しない bug（[anthropics/claude-code#53948](https://github.com/anthropics/claude-code/issues/53948)）を回避するため commit `56026cb` で全 wrapper を一括変換済み。詳細と検証ツール側の扱いは `.claude/rules/project.rules.md` § プラグイン構造 の wrapper エントリ bullet を参照。

`dev-workflow-bundle` にメンバーを追加する場合はもう 1 つ義務がある: 新メンバーの `SKILL.md` に横断ディレクティブ `## Dispatch authorization` を他メンバーと byte-identical に同梱すること（漏れると `/verify-plugins` と `run-tests` Check 7 が落ちる）。文言・配置の source of truth は `.claude/rules/project.rules.md` § プラグイン構造 の「**bundle 全メンバーに複製する横断ディレクティブは byte-identical を保ち、メンバー追加時に必ず同梱する**」bullet。

### wrapper 共通: 開発・テスト用シンボリックリンク作成

```bash
# スキル
ln -s ../../skills/<skill-name> .claude/skills/<skill-name>

# エージェント（サブパターン A のみ）
ln -s ../../plugins/<plugin-name>/agents/<agent-name>.md .claude/agents/<agent-name>.md
```

### wrapper 共通: CHANGELOG.md 更新

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
- `Bash(*)` は避け、具体的なコマンドを指定（例: `Bash(git *)`, `Bash(jq *)`）
- セキュリティスキャンで警告される可能性のあるパターンは正当な理由がある場合のみ使用

### バージョン管理

- セマンティックバージョニング（SemVer）を使用
- `marketplace.json` と `plugin.json` のバージョンは常に一致させる

### ドキュメント

- README.md: ユーザー向けのドキュメント（使い方、機能、設定など）
- SKILL.md: Claude向けの指示（処理フロー、出力形式など）

## セキュリティ

プラグイン追加時は `/security-scanner --project` でセキュリティスキャンを実行し、問題がないことを確認してください。
