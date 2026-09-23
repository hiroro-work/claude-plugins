# Claude Code Plugins Marketplace

Claude Code 用プラグインを配布するマーケットプレイスのリポジトリ。

## リポジトリ構成

プラグインの置き方は 2 通りある。

1. **direct-skill 方式**: 単体スキルのプラグイン。スキルディレクトリをそのまま source にする（`source: "./skills/<skill-dir>"` + `skills: ["./"]`）
2. **wrapper 方式**: エージェントを持つもの、フックを定義するもの、複数スキルの bundle。`plugins/<plugin-name>/` にまとめる

```text
.
├── .claude-plugin/
│   └── marketplace.json      # プラグイン一覧とバージョンの記載元
├── skills/                   # スキルの実体。direct-skill 方式の source を兼ねる
│   └── <skill-name>/
│       ├── .claude-plugin/   # direct-skill 方式で source になるスキルのみ
│       │   └── plugin.json
│       ├── SKILL.md
│       ├── references/       # (任意) SKILL.md から読む手順・定義
│       └── README.md         # (任意) 利用者向けの設定リファレンス
├── plugins/                  # wrapper 方式のプラグイン
│   └── <plugin-name>/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── skills/
│       │   └── <skill-name>/ # skills/<skill-name> の実ディレクトリコピー
│       ├── agents/           # (エージェント依存のみ)
│       │   └── <agent-name>.md
│       └── README.md         # (任意)
├── tests/                    # リポジトリ自身のテスト（*.test.mjs）。Skill(run-node-tests) が実行する
├── .claude/
│   ├── commands/             # 開発用コマンド（/verify-plugins 等）
│   ├── skills/               # skills/* へのシンボリックリンクと、配布しない開発用スキル
│   ├── agents/               # plugins/*/agents/*.md へのシンボリックリンク
│   ├── rules/                # 毎セッション読み込まれるルール
│   ├── rules-extras/         # ルールの Good/Bad 例（自動では読み込まれない）
│   ├── rules-staging/        # extract-rules が 1 回だけ観測したルール候補
│   └── dev-workflow.md       # dev-workflow の設定
├── CHANGELOG.md
└── README.md
```

marketplace.json の `source` に `"./"` を書かない。`skills/` 配下の全スキルが自動検出され、重複登録される（[anthropics/claude-code#13344](https://github.com/anthropics/claude-code/issues/13344)）。source には `./skills/<skill-dir>` か `./plugins/<plugin-name>` を指定する。

wrapper 配下の `skills/<skill-name>/` は symlink でなく実ディレクトリのコピーにする。plugin cache が symlink を解決しない不具合（[anthropics/claude-code#53948](https://github.com/anthropics/claude-code/issues/53948)）への暫定対応で、`skills/<skill-name>/` を編集したらコピーも同期する。

## プラグインマニフェスト

全プラグインの source 直下に `.claude-plugin/plugin.json` を置く。`name` は marketplace.json の `name` と揃え、`version` は書かない。理由と例外（`caffeinate` / `translate`）は `.claude/rules/project.rules.md` § プラグイン構造 にある。

```json
{
  "name": "<plugin-name>",
  "description": "プラグインの説明",
  "author": { "name": "hiropon", "url": "https://github.com/hiroro-work" },
  "homepage": "https://github.com/hiroro-work/claude-plugins",
  "repository": "https://github.com/hiroro-work/claude-plugins",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"]
}
```

## スキルを追加する（direct-skill 方式）

エージェントにもフック定義にも依存しないスキルはこの方式にする。`plugins/` 配下にラッパーは作らない。

1. `skills/<skill-name>/` に `SKILL.md` と `.claude-plugin/plugin.json` を作る

   ```markdown
   ---
   name: <skill-name>
   description: スキルの説明
   allowed-tools: Read, Glob, Grep
   ---

   # スキル名

   スキルの詳細な説明と使い方
   ```

2. marketplace.json の `plugins` 配列に追加する。プラグイン名とスキル名は違ってよい（例: plugin `peer` → skill `ask-peer`）

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

3. 開発用のシンボリックリンクを張る: `ln -s ../../skills/<skill-name> .claude/skills/<skill-name>`
4. CHANGELOG.md を更新する

## プラグインを追加する（wrapper 方式）

| 種類 | 用途 | `agents/` | `skills/` |
| --- | --- | --- | --- |
| **エージェント / フック wrapper** | エージェント依存（`translate`）、フック定義（`caffeinate`） | エージェント依存なら必須 | 単一スキルのコピー |
| **bundle wrapper** | 複数スキルの束（`dev-workflow-bundle`） | 不要 | 複数スキルのコピー + marketplace.json の `skills` 配列 |

### エージェント / フック wrapper

1. `skills/<skill-name>/SKILL.md` を作り、`plugins/<plugin-name>/skills/` へコピーする

   ```bash
   mkdir -p plugins/<plugin-name>/skills/<skill-name>
   cp -R skills/<skill-name>/. plugins/<plugin-name>/skills/<skill-name>/
   ```

2. `plugins/<plugin-name>/.claude-plugin/plugin.json` を置く。フックは `hooks` フィールドに書く（例: `plugins/caffeinate/.claude-plugin/plugin.json`）
3. エージェントがあれば `plugins/<plugin-name>/agents/<agent-name>.md` に置く
4. 開発用のシンボリックリンクを張る。スキルは必ず、エージェントはある場合だけ

   ```bash
   ln -s ../../skills/<skill-name> .claude/skills/<skill-name>
   ln -s ../../plugins/<plugin-name>/agents/<agent-name>.md .claude/agents/<agent-name>.md
   ```

5. marketplace.json に `"source": "./plugins/<plugin-name>"` のエントリを追加する（`skills` は書かない）
6. CHANGELOG.md を更新する

### 既存の bundle にメンバーを足す

1. `skills/<name>/` に `SKILL.md` と `.claude-plugin/plugin.json` を作り、開発用のシンボリックリンクを張る（上の「スキルを追加する」の手順 1 と 3）
2. `plugins/dev-workflow-bundle/skills/<name>/` へコピーする（手順は上と同じ `cp -R`）
3. marketplace.json を 4 か所編集する: 新しいプラグインのエントリ（direct-skill 方式の形）の追加、bundle の `skills` 配列への `./skills/<name>` の追加、bundle の `description` への名前の追加、bundle の `version` の引き上げ
4. `plugins/dev-workflow-bundle/.claude-plugin/plugin.json` の `description` も marketplace.json と同じ文面にする
5. 新メンバーの `SKILL.md` の前置き部分の末尾に `## Dispatch authorization` 節を置く。本文は他メンバーと 1 文字も違えない（`/verify-plugins` と `run-tests` の Check 7 が検査する）
6. CHANGELOG.md を更新する

`skills` 配列と `plugins/<bundle-name>/skills/` 配下のエントリは必ず一致させる。新しい bundle を作る場合も、`skills` 配列を明示すること以外はエージェント / フック wrapper と同じ手順になる。

## 検証コマンド

```bash
/verify-plugins        # 構造・バージョン・動作テスト
/verify-plugins --full # 上記 + CLI 更新の確認
/test-skills           # スキル・エージェントの動作テスト
```

`Skill(run-tests)`（構造）、`Skill(run-node-tests)`（`tests/`）、`Skill(verify-bundle-sync)`（bundle コピーの同期）は dev-workflow の Check / Test でも実行される。

## コーディング規約

- スキル名・プラグイン名・エージェント名は kebab-case（例: `security-scanner`、`peer`、`tr-hq`）
- バージョンは SemVer。marketplace.json にだけ書く（`caffeinate` / `translate` は plugin.json と揃えて上げる）
- README.md は利用者向け（使い方・設定）、SKILL.md は Claude 向け（処理の流れ・出力形式）
- `allowed-tools` やバージョン運用などの規範は `.claude/rules/` にある

## セキュリティ

プラグインを追加したら `/security-scanner --project` を実行し、問題がないことを確かめる。
