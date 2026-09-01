---
description: Verify all plugins structure, versions, and execute skill/agent tests
argument-hint: [--full]
allowed-tools: Read, Glob, Grep, Bash(jq *), Bash(for *), Bash(echo *), Bash(if *), Bash(head *), Bash(do *), Bash(ls *), Bash(readlink *), Bash(test *), Skill(test-skills), Skill(check-cli-updates)
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
- `skills/*/` - スキル実体ディレクトリ（direct-skill 方式のプラグインは直接 source に指定される）
- `*/.claude-plugin/plugin.json` - 各プラグインのマニフェスト
- `plugins/*/` - ラッパープラグイン（bundle やエージェント依存プラグインで使用）

## プラグイン構造の 2 パターン

1. **direct-skill 方式**: `source: "./skills/<skill-dir>"` + `skills: ["./"]`（単体スキルプラグイン）
2. **wrapper 方式**: `source: "./plugins/<plugin-name>"`（bundle、エージェント依存プラグイン、フック定義プラグイン）

## 検証項目

### 1. スキル実体の存在確認（skills/配下）

`skills/*/SKILL.md` が存在することを確認。

### 2. プラグインsourceディレクトリの構造確認

marketplace.json の各プラグインを `source` プレフィックスで分岐:

**direct-skill 方式（`source: "./skills/..."`）**:
- `<source>/SKILL.md` が存在すること
- `skills: ["./"]` が明示されていること
- `<source>/.claude-plugin/plugin.json` が存在し、`name` が marketplace.json の `name` と一致すること

**wrapper 方式（`source: "./plugins/..."`）**:
- `source` ディレクトリが存在すること
- `<source>/skills/` がある場合、配下エントリがシンボリックリンクであること、参照先 `skills/<skill>/SKILL.md` が存在すること
- `<source>/agents/` がある場合、各 `.md` ファイルに YAML frontmatter が存在すること
- `<source>/.claude-plugin/plugin.json` が存在し、`name` が marketplace.json の `name` と一致すること
- bundle の場合（`skills` 配列が specific パスを含む）: `skills` 配列の各パスが `skills/<name>/SKILL.md` に解決されること、かつ `<source>/skills/` 配下のエントリセットと一致すること

### 3. バージョン整合性

marketplace.json の全プラグインについて:
- `<source>/.claude-plugin/plugin.json` が `version` を宣言している場合: marketplace.json と一致すること
- `version` を持たない plugin.json は不備ではない。marketplace.json を単一のバージョン源とし、plugin.json はそれを継承する（現在 `version` を宣言しているのは `plugins/caffeinate` と `plugins/translate` のみ）

### 4. 構文検証

- 各 `plugin.json` が有効なJSONであること
- 各 `SKILL.md` にYAMLフロントマターが存在すること
- 各エージェント定義ファイルにYAMLフロントマターが存在すること

### 5. bundle 横断ディレクティブの同一性

`dev-workflow-bundle` の `skills` 配列の各メンバーの `SKILL.md` が `## Dispatch authorization` 節を持ち、その本文が全メンバーで byte-identical であること（`run-tests` Check 7 と同一項目。source of truth は `.claude/rules/project.rules.md` § プラグイン構造 の「**bundle 全メンバーに複製する横断ディレクティブは byte-identical を保ち、メンバー追加時に必ず同梱する**」bullet）。

### 6. スキル・エージェント動作確認

各プラグイン/スキルの機能が正常に動作することを確認。

## 作業手順

### Step 1: marketplace.json の読み込み

`.claude-plugin/marketplace.json` を読み込み、登録されている全プラグインをリストアップしてください。

### Step 2: スキル実体の存在確認

`skills/*/SKILL.md` を Glob で列挙し、marketplace.json に登録された全スキルの実体が存在することを確認してください。

### Step 3: プラグインsourceディレクトリの構造確認

marketplace.json の各プラグインについて、`source` プレフィックスで分岐:

**direct-skill 方式（`source: "./skills/..."`）**:

1. `<source>/SKILL.md` が存在すること
2. `skills: ["./"]` が明示されていること
3. `<source>/.claude-plugin/plugin.json` が存在し、`name` が marketplace.json の `name` と一致すること

**wrapper 方式（`source: "./plugins/..."`）**:

1. `source` ディレクトリが存在すること
2. `<source>/skills/` がある場合、配下エントリが **シンボリックリンク（参照先 `skills/<skill>/SKILL.md` が存在）または `SKILL.md` を含む実ディレクトリ** であること。全 wrapper は commit `56026cb` で symlink から実コピーへ変換済み（[anthropics/claude-code#53948](https://github.com/anthropics/claude-code/issues/53948) 回避）なので、実ディレクトリを不備として報告しないこと（source of truth: `.claude/rules/project.rules.md` § プラグイン構造 の wrapper エントリ bullet）
3. `<source>/agents/` がある場合、各 `.md` に YAML frontmatter が存在すること。`<source>/.claude-plugin/plugin.json` が存在し、`name` が marketplace.json の `name` と一致すること
4. **bundle の場合** (`skills` 配列が specific パスを含む): 配列内の各パスが `skills/<name>/SKILL.md` に解決されること、かつ `<source>/skills/` 配下のエントリセットと `skills` 配列のセットが一致すること（どちらか一方にしかないエントリを検出）

```bash
# wrapper 方式のシンボリックリンク確認例
ls -la plugins/<name>/skills/
readlink plugins/<name>/skills/<skill-name>
test -f plugins/<name>/skills/<skill-name>/SKILL.md
```

### Step 4: バージョン整合性チェック

marketplace.json の全プラグインについて:

1. marketplace.json のバージョンを取得
2. `<source>/.claude-plugin/plugin.json` が `version` を宣言している場合、そのバージョンを取得し一致を確認。`version` の無い plugin.json は marketplace.json のバージョンを継承するため、不一致として扱わない

不一致がある場合は警告として記録してください。

### Step 5: JSON構文検証

各 `plugin.json` について `jq` で構文チェック：

```bash
jq . plugins/<plugin>/.claude-plugin/plugin.json > /dev/null
jq . skills/<skill-dir>/.claude-plugin/plugin.json > /dev/null
```

### Step 6: フロントマター存在確認

各 `SKILL.md` と エージェントファイルの先頭が `---` で始まることを確認してください。

### Step 6.5: bundle 横断ディレクティブの同一性確認

`dev-workflow-bundle` の `skills` 配列を反復し、各メンバーの `SKILL.md` に `## Dispatch authorization` 見出しがあること、かつ節本文のハッシュが全メンバーで一致することを確認してください（検証項目 5）。欠落または分岐しているメンバーを報告します。

```bash
for e in $(jq -r '(.plugins[] | select(.name=="dev-workflow-bundle") | .skills[])' .claude-plugin/marketplace.json); do
  n="${e#./skills/}"
  # 前後の空行を trim してから比較する（run-tests Check 7 と同じ delimitation。
  # trim しないと末尾空行だけの差分を文言分岐と誤判定する）
  printf '%-14s %s\n' "$n" "$(awk '/^## Dispatch authorization$/{f=1;next} f&&/^## /{exit} f{print}' "skills/$n/SKILL.md" | sed -e '/./,$!d' | tail -r | sed -e '/./,$!d' | tail -r | md5 -q)"
done
```

### Step 7: スキル・エージェント動作テスト

**Skillツールを使って `test-skills` スキルを呼び出してください。**

```text
Skill(skill: "test-skills")
```

このスキルでは以下がテストされます：

- 各スキル動作（/ask-claude, /ask-codex, /ask-gemini, /ask-copilot, /ask-agy, /ask-peer, /tr, /caffeinate, /security-scanner）
- 各エージェント動作（tr, tr-hq）
- 外部CLI依存のスキルは、CLIがインストールされていない場合スキップ

### Step 8: CLI更新確認（`--full` 指定時のみ）

**`--full` オプションが指定された場合のみ**、このステップを実行してください。
指定されていない場合は、このステップをスキップして Step 9 に進んでください。

```text
Skill(skill: "check-cli-updates")
```

このスキルでは以下が確認されます：

- 各CLIの最新バージョンとインストール済みバージョンの比較
- SKILL.mdに記載されているオプションの有効性
- 非推奨オプションや新機能の確認

### Step 9: 結果サマリー

以下の形式で結果を報告してください：

```
## 検証結果

### スキル実体
| スキル | SKILL.md | 状態 |
|--------|----------|------|
| ask-claude | ✅ | ✅ |
| ... | ... | ... |

### direct-skill プラグイン (`source: "./skills/..."`)
| プラグイン | source存在 | skills: ["./"] | SKILL.md存在 | 状態 |
|-----------|-----------|----------------|--------------|------|
| ask-claude | ✅ | ✅ | ✅ | ✅ |
| ... | ... | ... | ... | ... |

### wrapper プラグイン (`source: "./plugins/..."`)
| プラグイン | source存在 | skillsシンボリックリンク | 参照先存在 | bundle skills配列整合 | 状態 |
|-----------|-----------|----------------------|----------|---------------------|------|
| translate | ✅ | ✅ | ✅ | N/A | ✅ |
| caffeinate | ✅ | ✅ | ✅ | N/A | ✅ |
| dev-workflow-bundle | ✅ | ✅ | ✅ | ✅ | ✅ |

### バージョン整合性
| プラグイン | marketplace | plugin.json | 状態 |
|-----------|-------------|-------------|------|
| translate | 1.1.1 | 1.1.1 | ✅ |
| caffeinate | 1.0.0 | 1.0.0 | ✅ |
| ask-claude | 1.1.3 | 継承 | ✅ |
| ... | ... | ... | ... |

### 構文検証
| 対象 | JSON | フロントマター | 状態 |
|------|------|---------------|------|
| translate | ✅ | ✅ | ✅ |
| caffeinate | ✅ | ✅ | ✅ |
| ask-claude | ✅ | ✅ | ✅ |
| ... | ... | ... | ... |

### 動作テスト
| 対象 | スキル/エージェント | 結果 | 備考 |
|------|-------------------|------|------|
| ask-claude | /ask-claude | ✅/⚠️/N/A | 正常動作/エラー内容/CLI未インストール |
| ... | ... | ... | ... |

### 総合結果
✅ 全スキル/プラグインが正常です / ⚠️ N件の問題が見つかりました

問題がある場合は詳細を記載：
- [対象名]: 問題の内容と推奨対応
```
