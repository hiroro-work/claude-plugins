# Project Rules - Examples

## Principles Examples

### 呼び出し先への制約は呼び出し先の規則に置く
**Good**: 「YAML のブロックスカラーの字下げを保つ」という制約を、`prose-polish` の `references/prose-style-guide.md` § Preserve に 1 行足す。全ての呼び出し元・対象・単独実行に効く。
**Bad**: 呼び出し元（`plan-approval.md` や `mobpro` の Procedure）の散文に `instruct prose-polish to leave each line's leading indentation exactly as found` と書く。`## Invocation contract` の欄は `File:` / `Files:` / `Text:` / `Language:` / `Model:` に限られ、この文を運ぶ欄が無いので Step 1 の解釈で落ちる。CHANGELOG に「dispatch tells the callee to ...」と書けば、契約が果たせない約束を公開することになる。

### 訳語は原語を知らない読者が読めるかで判定する
**Good**: 「原語を知らない読者が、その語だけで意味を取れるか」を判定の先頭に置く。`キャッシュ` / `レスポンス` は通り、`セマンティクス` / `タイブレーク` は訳す側に回る。
**Bad**: 「対象言語の文字で書かれた語は既に自然なので判定しない」と免除する。カタカナにしただけの語が全て素通りする。原語の比喩を字面で訳した `着地する`（land）/ `〜に倒す`（fall back to）/ `走行`（run）/ `閉じたリスト`（closed list）も、語自体は日本語なので語彙の検査を通ってしまう。

### 散文は語彙だけでなく組み立ても規定する
**Good**: 1 文 1 主張を箇条書きの項目にも適用し、参照は文末に置き、括弧の入れ子を避ける。
**Bad**: 訳すか原語で残すかの語彙規則だけを置く。推敲した後も、`新設する節は (i) …、(ii) …、(iii) …、(iv) …、を持つ` のように 1 項目へ 4 主張を詰めて末尾の動詞で閉じる形や、`§ Per-commit loop sub-step a の From a pathspec 段落は、…` のように参照が主語に座る形が残る。

### 自分で書いた散文も明示的に推敲へ通す
**Good**: ユーザーに見せる説明文を `Skill(prose-polish)` の text モードに通してから提示する。1 回 20〜60 秒かかる（style guide の読み込みとサブエージェントの推論が大半で、文章量にはほぼ比例しない）。
**Bad**: 「style guide があるから自分の出力にも効いている」と考える。style guide は `prose-polish` のサブエージェントへ渡す入力で、メインスレッドが直接書く文章には効かない。

### 下流へ例外を足すときは上流の断定も直す
**Good**: 下流に「`--resume` でもプラン草稿への復帰経路は対象」と例外を足すとき、上流の `never on a --resume run` も同時に例外付きへ書き換える。
**Bad**: 下流だけ直す。レビューの指摘に応じた修正でも、転記の片側だけ変えれば新しい矛盾になる。この食い違いは 2 巡目のルール確認で初めて見つかった（1 巡目は修正前を見ていた）。

### 兄弟の手続きを写すときは理由が書かれた強い側に揃える
**Good**: 新しい手続きの `git add` を `git add -- "<path-1>" "<path-2>" ...`（引用符付き）で書き、「`--` で区切り、ダブルクォートで空白・引用符・非 ASCII を扱う」と理由を書いている側に揃える。割れていた事実はコミットメッセージに 1 行残す。
**Bad**: 直接写した兄弟（`mobpro` 側の転記）が引用符なしなので、それに倣う。最も近いものを写すと弱い側に揃ってしまい、空白を含むファイル名で語分割が起きる。

### bundle メンバーはスキルと bundle をペアで上げる
**Good**: CHANGELOG の小見出しを `### dev-workflow v1.34.2 / dev-workflow-bundle v1.34.2` の対で書き、marketplace.json の両方の version を上げる。
**Bad**: `dev-workflow` だけ上げる。bundle で配布される版が黙って古いまま残る。

### version を書き換える `old_string` にはプラグイン名と末尾のカンマを含める
**Good**: `old_string` に `"name": "dev-workflow",` から `"version": "1.34.2",` までを含め、version だけを書き換える。直後に `jq empty .claude-plugin/marketplace.json` で構文を確かめる。`replace_all` は使わない。
**Bad**: `old_string` を `"name": "dev-workflow"` だけにする。`"dev-workflow-bundle"` の前方と一致し、一意でないとエラーになる。

### 自動更新でのバージョンと CHANGELOG は別の記録用コミットにする
**Good**: Finding ごとの修正を `fix(dev-workflow): ...` でコミットし、version の引き上げを `chore(release): bump ... (auto-triage YYYY-MM-DD)` で別にコミットする。
**Bad**: 修正と引き上げを同じコミットに混ぜる。「採用した Finding 1 件 = 1 コミット」と範囲の検査の意味が薄れる。

### ルーチンが一覧を回すときは件数に上限を付ける
**Good**: `gh issue list --limit 50` とし、上限に達したら Step 4 の要約に `overflow=true` と書く。
**Bad**: `--limit 200` にする。1 回の実行で順に triage すると、サブエージェントの呼び出しが積み重なって実行時間が膨らむ。

### 進捗の状態遷移でターンを区切らない
**Good**: 0 件で処理を飛ばすときは、Step 2 / 3 / 3.7 / 4 の行を同じツール呼び出しの連なりでまとめて `completed` にする。
**Bad**: 遷移ごとにターンを分ける。そのたびに止まる誘惑が生まれる。

### 短絡する経路には下流への移動先を書く
**Good**: 短絡する経路の末尾に `Skipping does not bypass the reminder dispatch — apply the dispatch at the end of § Close decision.` と書く。
**Bad**: `On title mismatch, skip ... continue` とだけ書く。「飛ばす = 何もしない」と読まれ、下流の注意書きの呼び出しが抜ける。

### サブスキルの呼び出し直前と戻り点に注意書きを置く
**Good**: `Skill(<callee>)` の直前に `**Pre-invocation reminder**` を置き、状態ごとの次のツール呼び出しと「JSON は戻り値」であることを書く。直後には `**Return-point no-stall reminder**: At each iteration boundary (regardless of reviewer outcome — findings reported, "No actionable findings", any non-error result), the next action ... must be issued in the **next tool call**. See § No-Stall Principle.` を置く。同じ SKILL.md にレビュー役を呼ぶ反復ループが 2 つあれば、両方の境界に同じ形で置く。issue ループの境界で「残りの issue がある」「最後の issue」の 2 つに分かれるなら、両方の版を同じ場所に並べる。
**Bad**: 片方のループにだけ置く。無い側の境界で停止が再発する（別のループの注意書きは判断の瞬間に参照されない）。注意書きを別々の場所に散らすと、判断の場面で見つけにくい。

### 非対話ルーチンには `§ No-Stall Principle` 節を置く
**Good**: 非致命エラーを `Per-Finding/issue: comment-failed/close-failed/commit-failed` と `Per-turn (environment-induced): stop-hook spurious fire` の 2 系統に分けて並べる。扱いは同じ（記録して続ける）でも、粒度が違うことを明示する。
**Bad**: ターン単位の系統を挙げない。フックの合図を致命的なものと扱い、即座にコミットする誤動作が起きる。

### `~/.claude/` 配下は参照してよい
**Good**: `~/.claude/` 配下を直接参照する（Claude Code の標準の設定ディレクトリ）。
**Bad**: `/Users/alice/.claude/settings.json` のように特定ユーザーの絶対パスを埋め込む。

### 環境由来の衝突は呼び出し元にまとめ、呼び出し先には短い参照を置く
**Good**: 呼び出し元（`dev-workflow-triage/SKILL.md`）の `## Stop hook structural conflict` に仕組みと正しい振る舞いを全て書き、呼び出し先（`verify-diff/SKILL.md`）は `§ Scope check boundary` の近くに 2〜3 文の注記と見出しへの参照だけを置く。
**Bad**: 呼び出し先にも全文を書き直す。呼び出し元を更新しても伝わらず、冗長になる。

### 停止しやすいサブスキルは末尾の JSON で結果を返す
**Good**: 呼び出し先の SKILL.md の末尾に `## Return contract` 節を置き、`{"status": "no-actionable-findings"|"applied-edits"|"notes-left"|"error", "applied_edits_count": <int>, "notes_remaining_count": <int>, "reason": "..."}` を 1 つのコードブロックで必ず返させる。呼び出し元はそれを解釈して `record.skill_review` に対応づける。`ask-peer` のように重大度の階層を持つレビュー系にも同じ理屈が当てはまる。
**Bad**: 自由形式のチェックリストだけを返す。構造化して見える Markdown でも、判定がターン全体を使い、戻り点の注意書きでは救えずに止まる。

### 呼び出し元は JSON の解釈失敗を別経路で扱う
**Good**: (d2) で末尾の JSON を解釈し、`no-actionable-findings` / `applied-edits` / `notes-left` / `error` / 解釈失敗を対応表で `record.<callee>` に変換する。`error` と解釈失敗は、ループを終える・再試行しない・エラーのカウンタを増やす。
**Bad**: `judge the result and proceed` の 1 行で済ませる。呼び出し先の契約が崩れると、無限ループか無言の停止に陥る。

### bundle のレビュー系スキルは Pattern A にする
**Good**: レビューの走査は新しいサブエージェントで行い（`verify-diff` / `rules-review` と同じ形）、`Edit` の適用はメインスレッドに残してレビュー役を偏りのない状態に保つ。非対話のルーチンからの呼び出しを想定し、確認を求めない。
**Bad**: メインスレッドで直接実行する。偏りのない実行役がいなくなり、レビューの散文がメインの文脈に積もり、bundle 内で設計がばらつく。

### `Agent` が使えないときの代替手段は正本へのポインタにする
**Good**: `**Agent unavailable fallback**: detect availability and fall back per the canonical write-up in rules-review SKILL.md § 5. Review ...` のように、正本への参照と 1 行の差分だけを書く。
**Bad**: 毎回 3 段落で書き直す。正本を更新しても他の呼び出し先に伝わらない。

### 呼び出しプロンプトの区切りは `--- LABEL ---` にする
**Good**: `--- BEST PRACTICES CHECKLIST ---` / `--- CHANGED FILES ---` / `--- REVIEWER PROMPT ---` / `--- RESPONSE FORMAT ---` で区切る（`skill-review` の呼び出しプロンプトと同じ）。
**Bad**: その場しのぎの `## 見出し` で区切る。サブエージェントが各部の終わりを見失いやすく、bundle 内の書き方も揃わない。

### 戻り値の JSON は先に一致した条件で判定する
**Good**: (1) 判定が無いか不正 → `{"status":"error","reason":"verdict parse failure"}` で止める、(2) スキーマ違反 → `{"status":"error","reason":"verdict schema violation"}` で止める、(3) それ以外 → 適用、の順に評価する。単発の呼び出しでは `verify-diff` § (b) の (3) Converged / (4) Divergence は要らないので省く。
**Bad**: 評価の順を暗黙にする。実行ごとに結果がぶれ、`verify-diff` との対応も読めない。

### エントリの形は解釈の時点で検査する
**Good**: 最上位のキーに加え、各エントリの `file` / `old_string` / `new_string` / `description` が空でない文字列かを解釈時に確かめる。後段のツールが参照するフィールド（例: `publicity_review.remaining_findings[].file` → `git checkout HEAD -- <path>`）も含める。違反ならスキーマ違反で止める。
**Bad**: 最上位だけ検査する。不正なエントリで後段の `Edit` や `git checkout` が落ちる経路が残る。

### `old_string` には前後 1〜3 行を含めさせる
**Good**: 呼び出しプロンプトに `> old_string must match exactly one location ... Include 1–3 lines of surrounding context so the snippet is unique` と書く。適用の段階ではエントリごとに読み直してから `Edit` し、`old_string` が見つからなければ飛ばす。`applied_edits_count` は成功したエントリだけ数える。
**Bad**: 規約も飛ばし方も決めない。短い 1 行が衝突して再呼び出しを繰り返し、サブエージェントの質の低下だと取り違える。

### 警告の文言は発生源ごとに変える
**Good**: 同じ `notes_remaining_count` でも、`skill-review notes left after applied-edits (3)` と `skill-review notes left after max iters (1)` のように条件ごとに書き分ける。
**Bad**: `skill-review notes left (3)` / `(1)` と同じ文言にまとめる。どの条件から来たのか利用者が特定できない。

### CHANGELOG でコミットを参照するときは `auto-triage #N` の形にする
**Good**: `auto-triage #6` の形で書き、既存のエントリと揃える。
**Bad**: `fcf70b2` のような生のハッシュを書く。reword や rebase で変わり、既存のエントリとも揃わない。

### CHANGELOG の `Category:` は既存の 3 種から選ぶ
**Good**: 新しい失敗も既存の 3 種に当てはめる（例: 「既定値が bundle 内部のものだった」は `wrong-default`）。
**Bad**: `distribution-leak` / `scope-leak` のような説明的な語を作る。分類の一貫性が崩れる。

### bundle スキルの本文に適用分野を固定する語彙を書かない
**Good**: 主文には読者を限定しない抽象的な原理を書く。主文だけでは適用先が決まらない場合に限り、例を 1 つ括弧書きで添える。
**Bad**: 適用分野を固定する語彙を主文に埋める。スキル開発以外で bundle スキルを使う読者には読み解きにくい。個々の括弧書きは読み込み量の削減で随時消えるので、この例は形だけを示す。特定の項目の文面を写さない。

### `allowed-tools` は兄弟の Pattern A スキルと突き合わせる
**Good**: 兄弟（`verify-diff`）の `allowed-tools` 行をそのまま照合元にし、`TaskCreate` / `TaskUpdate` を必ず含める。
**Bad**: 進捗管理ツールの宣言を忘れる。非対話のルーチンから呼ばれたときに確認ダイアログで止まる。

### 2 回目以降の反復では編集したファイルだけ読み直す
**Good**: 1 回目は `affected_files` を全て読み、`i ≥ 2` では前の反復で `suggested_edits` が成功したパスだけ読み直す（触れていないファイルは 1 回目の内容を使う）。`git diff <Base ref>` も `i ≥ 2` で取り直す。
**Bad**: 毎回全て読み直す。メインスレッドの文脈が膨らみ、トークンも無駄になる。

### 同じカウンタを 2 か所で計算しない
**Good**: どちらが唯一の算出元かを 1 行で書く（例: `**Source of truth: the warning strings recorded by (d3) ... not the per-Finding record.publicity_review token (which stores a count only).**`）。
**Bad**: 算出元を書かない。後で triage する人が、どちらの値を信じればよいか判断できない。

### `[iter <n>/<max>]` の分母は実際に渡す値を直書きする
**Good**: 呼び出し先ごとに渡す上限を分母に書く（`verify_diff: [iter <iterations_used>/3]`、`publicity_review: [iter <iterations_used>/2]`）。
**Bad**: `<max_iterations>` のまま残す。どの値を渡しているか読めず、呼び出し先ごとに上限が違うと分母がぶれる。

### 3 分岐でモードを決める
**Good**: 全てある → 引数指定モード、全て無い → 自動導出モード、一部だけ → `{"mode":"explicit-args","status":"error","reason":"incomplete args"}` で早期に返す。
**Bad**: 「1 つでも指定があれば引数指定、空なら自動導出」とする。呼び出し元のテンプレートの書き間違いが素通りする。

### 1 回目の推論値をループの間は固定する
**Good**: `inferred_intent` のように毎回推論し直す値は、1 回目の判定から控えてループの間は固定する。2 回目以降は上書きせず、発散の比較にも入れない。1 回目に判定が無ければ `null` にする。
**Bad**: 毎回上書きする。発散の比較がノイズだらけになり、収束しない。

### 空の入力はモードで扱いを分ける
**Good**: 引数指定モードで差分が空なら `conflict`（呼び出し元は作業があると示している）、自動導出モードなら `skipped`（情報）にする。
**Bad**: モードを区別せず一律に `conflict` にする。自動導出モードでは「空 = 不具合」と断定する根拠が無い。

### 新モード専用の状態値はそう明記する
**Good**: 新しいモードで足した値に「`partial` is auto-derive-only」と書き、既存の呼び出し元が受け取る列挙値を変えない。
**Bad**: 全てのモードで N+1 個の値を列挙する。既存の呼び出し元の分岐が新しい値を取りこぼし、使われない経路で黙って落ちる。

### 範囲外への書き込みは `Edit` の前に飛ばす
**Good**: `Edit` ごとの事前確認で `out_of_scope` のパスを飛ばす（書き込みが無いので戻す必要もない）。`reverted_paths` には情報として載せる。
**Bad**: 書き込んだ後にまとめて `git checkout HEAD -- <sibling-path>` で戻す。対象 T1 の実行役が T2 のパスへ編集を返すと、T2 で既に済んでいた編集まで消える。

### 言語で出力を切り替える仕様は、英語の本文と日英の例を分ける
**Good**: 規律は英語の本文で述べ、例は括弧書きで日英を併記する（例: `(e.g. '品質ゲート（check_commands / Phase 10 Rules Compliance Review）' for language: ja, 'quality gate (check_commands / Phase 10 Rules Compliance Review)' for language: en)`）。
**Bad**: 本文を日本語で書く（配布物は英語という規則に反する）。日本語だけの例を置く（rules-review の低確度の指摘を招く）。

### 例は本文で言い切れない逐語内容があるときだけ置く
**Good**: 逐語内容を運ぶ例だけを置く。そのまま出力される固定文字列（`upstream-override` / `先行合意上書き`）、言語で変わる描画規約（`Phase 10（Rules Compliance Review）` / `Phase 10 (Rules Compliance Review)`）、再現が要るスロットの構造（`<N>/<total> コミット済み` / `<N>/<total> commits made`）。主題が規約そのものの `skills/dev-workflow/references/plan-format.md` では、例そのものが規約の内容なので残す。
**Bad**: 言い回ししか示さない例を置く。「難易度判定（<tier> tier）により <steps> を skip しました」/「Skipped <steps> per the difficulty-skip matrix (<tier> tier)」は、本文に「工程名と難易度を名指しする 1 行」と書けば足りる。

### bundle 内の参照は例外だが、所属を確かめてから適用する
**Good**: 同じ SKILL.md 内の参照（`Phase 5 / Phase 10 / Phase 11`）や、bundle のメンバーである兄弟スキル名（`rules-review` / `extract-rules`）は配布性の違反ではないと判断し、退ける理由に書く。
**Bad**: 同じファイル内の参照まで一般化する（"the user-judgment gate" など）。節をまたぐ参照が読みにくくなり、追えなくなる。配布性の規則が防ぐのは bundle の外の語彙だけ。

### 開発用スキルはバージョン管理の対象外
**Good**: 対象が `.claude/skills/` にしかない開発用スキル（marketplace.json にも plugin.json にも無い）なら、引き上げと CHANGELOG の指摘を退ける（`grep -c '"name": "<skill>"' .claude-plugin/marketplace.json` で確かめる）。
**Bad**: 開発用スキルにも適用する。使わない版番号とエントリが積み上がる。

### 入力の振り分けはアンカーの位置で分類する
**Good**: `**`approved: false` with comments** (either `scope`, or both in one round) → handle **every** comment the round carries, regardless of `scope`` とし、1 つの分岐で全てのコメントを処理する。修正の要求か質問かは、分岐でなく処理の中身で分ける。
**Bad**: `scope: "line"` → 修正を適用、`scope: "review"` → 質問として回答、の 2 分岐を先に一致した順に並べる。行への修正とレビュー全体への質問が同じラウンドに混じると前者だけが一致し、後者が確実に落ちる。`scope: "line"` の質問（学習セッションで最も多い）にも処理が無くなる。`scope` は crit の契約上アンカーの位置であって、要求の種類ではない。

### bundle 全メンバーに複製する横断ディレクティブは byte-identical を保ち、メンバー追加時に必ず同梱する
**Good**: 前置き部分の末尾、手続き本文の直前に置く。
**Bad**: 先行する `## Sub-skill caller directive` / `## Stop hook structural conflict (caller-side note)` がファイルの末尾にあるのを見て、`## Dispatch authorization` も末尾に置く。実行経路を決めた後に読まれるので効かない。`run-tests` の Check 7 は節の有無と本文の一致だけを見て配置は検査しないので、この取り違えは機械検査に掛からない。

### 同梱スクリプトは Node の組み込みモジュールだけで書く
**Good:**
```javascript
// skills/dev-workflow/scripts/plan-review/serve.mjs — import は組み込みのみ
import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { spawn } from "node:child_process";
```
```javascript
// ブラウザ側のライブラリは対象外 — バージョンを固定した CDN から読む（export-plan-html.mjs がタグを書き出す）
const MARKED_SRC = "https://cdnjs.cloudflare.com/ajax/libs/marked/16.3.0/lib/marked.umd.min.js";
```
**Bad:**
```javascript
// npm パッケージを import し、package.json を足す
import { program } from "commander";   // 配布先に node_modules が無く起動時に失敗する
import chalk from "chalk";
```

## Project-specific Patterns Examples

### `jq` の `null` 文字列フォールバック
**Good**: `producer_version=$(jq -r '... // "unknown"' file 2>/dev/null); [ -z "$producer_version" ] && producer_version="unknown"` のように 2 段で受ける。
**Bad**: `jq ... || echo unknown` だけにする。エントリが無いと `null` を出して正常終了するので `||` が動かず、文字列 `"null"` が流れ出る。

### detached HEAD を事前に検出する
**Good**: 事前チェックで `git symbolic-ref -q HEAD >/dev/null` の終了コードが 0 以外なら中止する。
**Bad**: `git rev-parse --abbrev-ref HEAD` で元のブランチを控える。detached HEAD では `HEAD` が返り、後の `git switch "$original_branch"` が「HEAD という名前のブランチ」を探して失敗する。

### 0 件になりうる glob は必ずクォートする
**Good**: `git for-each-ref --sort=-refname 'refs/heads/triage-*'` のようにシングルクォートで囲む。
**Bad**: クォートしない。一致が無いと zsh の `nomatch` がシェルを中断させ、ルーチンが無言で止まる。

### 既存の列挙値を増やさず、基準を厳しくする
**Good**: 既存の却下基準 #1「Already addressed」を 2 つの条件の AND に具体化する（CHANGELOG に該当するエントリがある、かつ現在の SKILL.md で再現しない。両方を引用し、片方でも疑わしければ次の基準へ進む）。新しい判定値は足さない。
**Bad**: `already-addressed-version` のような新しい判定値を作る。下流のパーサ・対応表・状態の列挙を全て直すことになり、後方互換も崩れる。

### カウンタは正常終了のときだけ増やす
**Good**: 成功（`Zero exit: increment ... by 1`）と失敗（`Non-zero exit: record ...-failed. **Do not increment ...**`）の両方を対にして書く。ループの開始で 0 にし、`--amend` で同じコミットを直しても増やさない。
**Bad**: 失敗側を省く。「省略 = 増やさない」とも「暗黙に増やす」とも読め、後段の振り分けが定まらない。

### 後段の振り分けは設定フラグでなくカウンタで決める
**Good**: `If triage_commit_count == 0 and bookkeeping_skipped, run auto-cleanup` のように、実際に起きた数で後片付けを判定する。
**Bad**: `triage_branch_active` のようなフラグとカウンタを組み合わせる。致命的な中止の経路では判定を通らず、フラグが使われないまま残る。設定フラグ（`<flag>: true`）は「やる予定」を表すだけなので、「有効だが飛ばされた」場合を「コミット済み」の分岐へ誤って流す。

### 分岐の振る舞いは否定でなく全列挙で書く
**Good**: 共通の動作を「Full set (applies to both `<status-A>` and `<status-B>`)」として上に置き、分岐ごとの差分だけを下の「Branch-specific actions」に並べる。
**Bad**: `same record writes ... except` と否定で書く。`iterations_used` / `warnings[]` のような集計用のフィールドが見えない穴になる（Code Review の 1 回目で重大な指摘になった）。

### 前例の無い機能に頼る書き直しは実装前に試験する
**Good**: Phase 6 (Implement) の前に Step 0 の試験を必須として Test plan に入れる。実現できるか・ツールを継承するか・状態遷移を模擬できるか・判定の 4 項目で判断し、全体の判定を READY / NEEDS-FALLBACK / BLOCKED のどれかにする。
**Bad**: Risks に「推奨」と書くだけにする。2 回目のレビューで重大な指摘が続く。

### 呼び出し層と呼び出し先の失敗を別のカウンタで数える
**Good**: 呼び出し層の失敗（E.1 / E.2 / E.3）では `D_dispatch_error_count` だけを進め、呼び出し先ごとの無効化カウンタ（`<skill>_disabled`）は増やしも戻しもしない（呼び出し先は動いていないので、その健全性の情報は無い）。Step 4 の集計でも別の行に出す。
**Bad**: 1 つのカウンタにまとめる。集計でどちらの失敗かが読めなくなる。

### 順に呼ぶ複数の `Skill()` は 1 回の `Agent` にまとめる
**Good**: Finding ごとに続く `Skill(callee-A) → Skill(callee-B) → Skill(callee-C)` を 1 回の `Agent`（`subagent_type: general-purpose`）にまとめ、集約した JSON（`status` ∈ {`ok`, `callee-abort`, `error`}、`outer_iter`、`outer_exit`、呼び出し先ごとの入れ子のフィールド）を返させる。プロンプトには「**Do not run further `Skill()` dispatches beyond what is enumerated**」と書く。
**Bad**: `Skill()` を直接順に呼ぶ。判断の地点ごとに JSON を返した後で止まる機会が生まれ、注意書きを足しても効果は薄れていく。

### 太字ラベルは `§ <Heading>'s "<label>" paragraph` の形で参照する
**Good**: `§ Apply accepted Findings's "Per-Finding input binding (mandatory)" paragraph` のように、太字の文言をそのまま引用符で囲む。
**Bad**: 存在しない見出しを参照する。Code Review で重大な指摘になる。

### 値や手順を足すときは同期先を全て挙げて 1 コミットで直す
**Good**: 並列の列挙（`record.verify_diff` / `record.skill_review` / `record.publicity_review` など）に新しい値を足すときは、全ての兄弟に同じく足し、集計の描画の分岐も全ての値を扱うようにする。SKILL.md の全件列挙と `references/*.md` の表のようにファイルをまたぐ場合も、同じコミットで両方を直し、参照側に `Source of truth: SKILL.md ... keep in sync` と書く。
**Bad**: 片側だけ直す。集計の描画で取りこぼし、2 回目以降のレビューでファイル間の食い違いとして指摘される。

### grep で拾えない参照も洗い出す
**Good**: 名前の変更で SKILL.md 15 か所と README.md 2 か所を列挙したら、実装の直前に同義語（`simplification` / `simplify phases` / `cleanup pass` など）でも grep し、表に無い一致を直す対象に加える。Test plan に「同義語で洗い出した対象」を 1 行書く。
**Bad**: 列挙した行だけを機械的に置換する。README.md では `simplify phases` を `tidy phases` に変えたのに、SKILL.md の `custom_instructions` の説明は `simplification` のまま残り、skill-review で食い違いとして捕まる。

### 承認の段階で大きな変更を求められたら、プランを 1 回で書き直す
**Good**: ユーザーの大きな変更の後、プランを通しで書き直す。タイトルから旧い方針の語句を消し、Context / Goal / Approach を置き換え、Risks も新しい方針の不明点に入れ替える。Phase 4 (Plan Review) を通し直してから、今回の実行が使った承認の場へ出し直す。
**Bad**: 旧い記述を残して新しい記述を併記する。プランが膨らみ、次のレビューで「決定が埋もれている」「範囲が広がっている」と再び指摘される。

### 既存の選択肢を選び直すなら入れ替え、無かった選択なら新しい決定を足す
**Good**: ユーザーが既存の Decision の代替案を選んだら、推奨と代替を入れ替えて注記する。Decisions に無かった既定値を求められたら、見出しに `**user 既選択: <value> — Phase 5 gate にて**` を付けた Decision § (N+1) を足し、Approach / Scope / Test plan / Risks / CHANGELOG を新しい既定値に合わせて直す。
**Bad**: 元の Decision 1（例: 設定キーの名前）を、既定値の議論のために無理に入れ替える。元の Decisions の構造が壊れる。

### 外部への副作用はルーチン自身が実行する
**Good**: ルーチン自身が `git push` を 1 回の実行につき 1 か所（Step 4 の末尾、後片付けの判定の後・要約の直前）で行い、`allowed-tools` に `Bash(git push *)` を足す。セッション単位の「指定ブランチ」規則と衝突する事情も SKILL.md に書く。
**Bad**: `session finalization handles pushes` と環境に任せる。衝突の事情が SKILL.md から抜け、手元の環境では push が黙って行われない。

### 外部コマンドの失敗は 1 回だけ再試行し、自動で復旧しない
**Good**: 再試行は 1〜2 秒待って 1 回だけ。`<reason>` は stderr の最後の空でない行を 80 字以内に切り、空か空白だけなら `(no stderr)` にする。`Do not auto-recover (no force push, no rebase, no branch rename)` と禁止を書く。
**Bad**: 4 段階の指数バックオフで再試行する。認証・non-fast-forward・フックによる拒否のように決まって失敗するものには効かない。理由の取り出し方も決めず、自動復旧の禁止も書かないので、後段の LLM が「rebase してから再試行」をでっち上げる。

### Agent 定義の frontmatter に `allowed-tools` を書く
**Good**: 呼び出す 3 つのスキルの `allowed-tools` を合わせ、`Skill(<name>)` を明記する（`allowed-tools: Read, Edit, Agent, Skill(verify-diff), Skill(skill-review), Skill(publicity-review), Bash(git diff *), Bash(git rev-parse *), Bash(git checkout HEAD -- *)`）。`Bash(*)` は避け、呼び出し先と同じ粒度にする。
**Bad**: `allowed-tools` を書かない。サブエージェント内の `Skill()` が権限不足で失敗し、`/verify-plugins` の構造検査では見つからず、実際のルーチンで初めて表に出る。

### Agent 定義で `Skill(<callee>)` を許すなら、中身を直接実行しないよう書く
**Good**: Agent 定義に独立した `## Dispatch discipline` 節を設け、3 段落で意図的に繰り返す。(i) `Each callee MUST be invoked via its Skill(<name>) tool call. Do not read, interpret, or replicate any callee's SKILL.md logic inline`、(ii) `when the Flow says "dispatch Skill(verify-diff)", issue a Skill(verify-diff) tool call and wait for its return. Do not substitute your own evaluation`、(iii) `Do not run further Skill() dispatches beyond the three enumerated`。呼び出し先の内部スキーマのフィールド名は書かない。
**Bad**: 節を置かない。呼び出し先の SKILL.md が文脈に入り、サブエージェントが中身を直接実行してスキーマ違反を繰り返し、`D_dispatch_disabled = true` で残りの Finding を全て飛ばす。

### 識別用の照合は緩く、内容の検査は厳しくする
**Good**: 識別の層は緩くする（タイトルの書式の検査をやめ、文法の揺れを許し、本文の解釈を正式な判別に使う）。内容の層は厳しくする（4 つの必須フィールド、列挙値の検査、解釈失敗の条件で triage の可否を決める）。
**Bad**: 識別の層に `^\[auto-retrospective\] dev-workflow-bundle: \d+ findings` のような厳しい照合を残す。単数形の `1 finding` が黙って飛ばされ、末尾が欠けただけの issue が解釈失敗に回る。

### 全件条件の判定には全体の状態の条件も足す
**Good**: 閉じる判定を 2 つの条件の AND で書く。(i) 全体の条件 `body parse produced at least one Finding entry — i.e. this is NOT a whole-issue parse-error path`、(ii) 要素ごとの条件 `every parsed Finding was either accepted or rejected with reason cited`。
**Bad**: 要素ごとの条件だけにする。issue 全体の解釈に失敗して Finding の配列が空になると、全称条件が真になって自動で閉じてしまう（Phase 4 (Plan Review) で見落とし、Phase 11 (Code Review) で重大な指摘として捕まった）。

### Step の番号を振り直すときは、機械置換と個別の上書きを分け、2 段階の grep で確かめる
**Good**: プランの Design 節を 2 層で書く。(i) 一般規則: 旧 Step N → 新 Step M の単純な置換で安全な参照を列挙する。(ii) 個別の上書き: 機械的に置換すると意味を誤る箇所を行ごとに挙げる（行番号は編集前の目安）。最後は、旧い見出しの語句の OR で grep して 0 件を確かめ、番号を単語境界で grep して残りを目で見る。
**Bad**: 全て機械的に置換する。`on_complete: Runs after Step 9` が、そのフック自体が Step 9 になったのに `Runs after Step 11` へ書き換わって意味を誤る。`grep -rn "Step 9"` だけでは、旧い見出しの残りと新しい正しい参照が両方出て切り分けられない。

### 登録時に回数が決まらない反復は進捗管理ツールに 1 行で登録する
**Good**: 反復の回数がユーザーの承認しだいの Step は 1 行で登録し、「count is not known until the proposal phase」と注記する。
**Bad**: コミットごとの行に展開する。回数が決まらないので登録できず、途中で書き換えれば止まる地点が増える。

### 変更の集合は一度だけ、特殊なファイル名でも崩れない形で集める
**Good**: `git status --porcelain=v1 --untracked-files=all -z` で集める（`=v1` で書式を固定してユーザーの設定に左右されず、`-z` で引用符付けを抑えて空白・引用符・非 ASCII を復元できる）。未追跡のファイルは `Read` で新規ファイルの差分として見せ、変更と区別して表示する。
**Bad**: `-z` を省いた `git status --porcelain` を使う。空白を含むファイル名が引用符付きになり、後の照合がずれる。

### コミットは pathspec で範囲を絞る
**Good**: `git add -- "<file-1>" "<file-2>" ...` を 1 回で実行してパスを明示する。
**Bad**: `git add -A` を使う。無関係な変更までステージされる。

### 記録用コミットは決まったファイルだけに絞る
**Good**: Phase 14 (Interactive Commits) で集めた変更のうち、無関係な作業ツリーの変更（`.gitignore` の個人用の除外など）や作業の成果物（`.claude/plans/*`）を見分け、全てのコミットから外してコミット計画に「除外: …」と書く。記録用コミットの pathspec は `{.claude-plugin/marketplace.json, CHANGELOG.md}` だけにする。混入したら `git commit --amend -- <その 2 ファイルだけ>` で直す。
**Bad**: `git add -A` で集めた全てを記録用コミットにまとめる。無関係な `.gitignore` の変更がリリースのコミットに入り、ユーザーに指摘されて amend をやり直す。

### 複数箇所から参照する語は 1 か所で定義する
**Good**: 言語別の文言や列挙の対応は 1 か所で定義し、他の箇所は `emit the localized token defined at § <Heading>'s "<bold label>" paragraph` のように参照する。
**Bad**: 2 か所に描き直す。正本を直しても伝わらずにずれる。言語別の文言はとくに頻繁に変わるのでずれやすい。

### 暫定対処のスキルは既存ルーチンの 1 か所だけにつなぐ
**Good**: 上流の不具合の暫定対処として足す開発用スキルは、既存のルーチンの 1 か所に閉じ込める。既存の小手順の境界に 1 段落の小手順を挿入するだけにし、外側の状態遷移・記録のスキーマ・カウンタ・Finding ごとの進捗の行・停止防止の列挙には触れず、削除の手順を SKILL.md に書く。
**Bad**: 状態遷移の各所に分岐・記録のフィールド・カウンタ・進捗の行を足す。168 行に広がり、何を消せばよいか読めなくなる。

### 検証が落ち続けるなら、検証でなく編集の範囲を広げる
**Good**: 検証スキルが全件で落ち続けるなら、編集の範囲を広げる（例: 正本の編集の直後に `cp -R` で bundle 側のコピーへ同期する工程を足し、同期 → 検証の 2 段にする）。
**Bad**: 検証を失敗扱いしないよう緩める、警告に下げる、検出だけの確認を足して衝突を連鎖させる。編集の範囲の漏れという根本の原因が隠れる。自動適用で緩める側に寄せず、Phase 11 (Code Review) のユーザーゲートで判断を仰ぐ。

### Setup モードでは `Write` の直前に不在を確かめ直す
**Good**: `test -f` などの事前確認を置かずに `Read .claude/<config>.local.md` を直接呼び、エラーを「未設定」の条件として扱う（`allowed-tools` は `Read, Write` だけで `Bash(test *)` を含めない）。Setup モードの手順には `Before writing: re-confirm \`.claude/<config>.local.md\` does not exist ... If it now exists, abort Setup mode ... never overwrite` と書く。
**Bad**: Step 1 で不在を確かめた後、確かめ直さずに `Write` する。間に別のセッションが設定を作っていると上書きする。`test -f` との二段構えは、確認と使用の間に隙間を作るうえ、権限の範囲も広げる。

### `Read` のエラーは既定で止める
**Good**: `On Read error: enter Setup mode only when the file does not exist. For any other Read error ... stop with an error ... If the Read tool's error does not distinguish missing-vs-other reliably, default to stop-with-error` と書く。
**Bad**: エラーなら一律に Setup モードへ進む。権限や文字コードのエラーを「存在しない」と取り違え、既存の設定をテンプレートで上書きする。

### テストが落ちたら、今回の変更のせいか元からかを見分ける
**Good**: Phase 9 (Check / Test) でテストが失敗を挙げたら、`git stash` で変更を退避するか基準コミットで同じテストを回し、元からあるものか見分ける。元からなら Phase 11 (Code Review) で「pre-existing failures (out of scope of this PR), no new regression」と書く。
**Bad**: 元からある失敗を「自分の変更が壊した」と取り違えて直しにかかる。範囲が際限なく広がる。

### 戻り値の JSON を指示する文で終わりを命じない
**Good**: 呼び出し先の SKILL.md で `Emit a single fenced JSON block at the end of the response, matching the schema for the mode that ran:` と書き、独立した `## Sub-skill caller directive` 節に「the fenced JSON verdict block ... is the **structured return value** ... not a deliverable to the user ... does not terminate the orchestrator's turn」と書く。JSON が 1 つだけであることも書き、兄弟の 3 つの呼び出し先でもスキル名を除いて同じ文面にする。
**Bad**: `End every invocation` / `Do not produce any additional turn` のような終わりを命じる動詞を使う。呼び出し元に「ターンを閉じろ」と読まれ、停止が再発する。

### コミットの承認ゲートでは本文をそのまま見せる
**Good**: Phase 14 (Interactive Commits) のゲートで、4 つを独立したコードブロックで表示する。(i) 件名、(ii) 本文（空なら `(no body)`）、(iii) ファイルの一覧（ステージの範囲を明示）、(iv) ファイルごとの差分（追跡済みは `git diff <base-commit>` の該当部分、未追跡は `Read` で作った新規ファイルの差分）。SKILL.md に `The body MUST appear in a dedicated fenced code block; a prose statement like "body included" without a rendered block is insufficient` と書く。
**Bad**: 「本文を含め、差分を全て表示」と散文で言うだけで実際には表示しない。ユーザーが「本文はどれですか？」と聞き返し、1 ターン無駄になる。

### しきい値の数値はプラットフォームの観測値に余裕の比率をかけて決める
**Good**: 設定表の説明に根拠・比率・バージョン依存を書く（例: `default 32000 is 80% of Claude Code's per-file warning threshold (40k chars, observed in Claude Code 2.1.x)`）。
**Bad**: 根拠の無い数値だけを書く。出どころがわからず、後で直すかどうか判断できない。

### しきい値の無効化はフラグでなく大きな番兵値で表す
**Good**: 既存のしきい値の処理はそのままにし、`compaction_threshold: 99999999` のような大きな値で実質無効にできることを、設定の説明に 1 行書く。
**Bad**: `compaction_enabled: false` のような無効化フラグを足す。`enabled=false` でしきい値が `N` のときの意味が曖昧になり、下流に真偽値の判定も増える。

### 文書の大きさは文字数（`wc -m`）で測る
**Good**: レビュー役とプランの数値の単位を突き合わせる（警告の `47.6k chars` は `wc -m`、レビュー役の `66045` は `wc -c` の値で、日本語を含むとバイト数と文字数は一致しない）。食い違いは退ける理由に書く。
**Bad**: 単位を確かめずに判断する。文字数で書いた値をバイト数で書き直す退行を起こす。

### サブエージェントへの長いプロンプトは `references/<mode>-prompt.md` に置く
**Good**: 反復ループの呼び出しプロンプトが長くなったら `references/<mode>-prompt.md` に切り出す。SKILL.md にはスキーマを正本として残し、references のファイルに `Single canonical home for the executor prompt; do not duplicate the prompt body in SKILL.md` と書く。
**Bad**: 50 行を超えるプロンプトを SKILL.md に直接書く。600 行という目安を超えやすく、別のモードで使い回すと重複する。

### 直近に入れた試験的な機能のフラグは既定で無効にする
**Good**: 兄弟の設定（`polish_prose` など）の既定が `true` でも、直近に入れた試験的な機能は既定を `false` にする。Decisions に既定値を独立した問いとして立て、推奨を明示的な有効化、代替を兄弟との一貫性にする。CHANGELOG には `**Default: disabled** — set <flag>: true ... to opt in per project` と `**Behavior change from v<prior>**: ...users who adopted v<prior>'s <feature> and want to retain that behavior must explicitly set <flag>: true` を書く。
**Bad**: 兄弟が `true` だからと既定を有効にする。検証していない試験的な機能が全ユーザーで無条件に動き、想定外の副作用が出る。

### 今回の実行の後続の工程で試せる変更は、その場で検証する
**Good**: 配布スキルの新しい設定フラグや飛ばす経路の変更で、今回の実行の後続の Step がその既定値を自然に通るなら、Test plan に「今回の実行で確かめる」と書く（例: `<config-file>` に新しいフラグを書かない → 新しい既定値 → 今回の Step N が <skip-path> を通る）。範囲外の欄に「`<config-file>` への明示的な追加は別の作業。今回の実行で既定値を試すため意図的に外す」と書く。
**Bad**: 同じ PR で `<config-file>` に新しいフラグを書く。飛ばす経路が消えて検証の機会を失い、別のセッションで手作業の確認が要る。

### 意図して受け入れた状態は Risks でなく Context に書く
**Good**: subtask を分けたことで、subtask 1 が入ってから subtask 2 が入るまで新しいスキルが使われない期間がある。これを Context に `**使われない期間の自然帰結**: subtask の分割で想定した状態で、この PR を入れること自体が解消の手段` と書く。
**Bad**: 同じ状態を Risks に書く。Risks に「意図して受け入れた状態」と「想定外の不確実性」が混じり、次のレビューで「受け入れ済みなのかリスクなのか曖昧」と再び指摘される。

### 不自然な言い回しは、まず既存の言い回しに揃える
**Good**: Code Review で `reported nothing to tidy` が不自然と指摘されたら、同じ SKILL.md を grep して似た言い回し（`§ No-Stall Principle` の `"No actionable findings"`）を見つけ、`reported no actionable findings` に揃える。
**Bad**: `reported zero tidy findings` のような新しい言い回しを作る。兄弟スキルと揃わず、呼び出し元の意味検査を広げる必要が生じ、次のレビューで再び指摘される。

### 起動時に決まる読み込みの挙動は、再起動して確かめる
**Good**: `.examples.md` を `.claude/rules/**` の自動読み込みの範囲の外へ移す変更で、(i) `paths:` frontmatter のローダー側の扱いは一次情報が無いので観測に基づく仮定と明記し、(ii) `.claude/rules-extras/` が読み込みの範囲外かはこのセッションでは確かめられない（ローダーは次の起動時に動く）と認め、(iii) Test plan に「コミットの後・push の前に Claude Code を再起動し、新しいセッションの文脈から examples が外れたことを確かめる」と 1 行足し、(iv) Risks に「ローダーの仕様は一次情報が未確認の観測に基づく仮定」と書く。
**Bad**: セッション内の `grep` や `Read` で「設定どおりに書かれている」ことを確かめて検証済みとする。起動時のローダーの挙動はセッション内では動かないので保証にならず、PR を出した後の次のセッションで初めて変化がわかる。

### 複数行の結果は `while IFS= read -r` で回す
**Good:**
```bash
bundle_skills=$(jq -r '(.plugins[] | select(.name == "dev-workflow-bundle") | .skills[]) // empty' .claude-plugin/marketplace.json)
printf '%s\n' "$bundle_skills" | while IFS= read -r entry; do
  name=${entry#./skills/}
  diff -rq "skills/$name" "plugins/dev-workflow-bundle/skills/$name"
done
```
**Bad:**
```bash
# zsh はクォートしない変数を語分割しないので、複数行の出力でも 1 要素として 1 回しか回らない
# （bash は IFS で分割して複数回回るので、シェルによって黙って結果が変わる）
for entry in $bundle_skills; do
  ...
done
```

### SKILL.md の節を references へ移すときは、節ラベルと実行時に参照される定義を残す
**Good:**
```markdown
<!-- SKILL.md § Phase 14: 手続きの本文は references へ移し、ラベルと実行時に参照される定義は残す -->
On entry to Phase 14, initialize `landed_count = 0` before running the procedure — so the
value is well-defined for the Completion section even when the empty-output skip path in
`references/commits.md` fires before its per-commit loop ever starts.

Read [`references/commits.md`](references/commits.md) and follow § Procedure — it is the
single canonical home for Phase 14's procedure body.
```
**Bad:**
```markdown
<!-- SKILL.md: 節ラベルごと消し、初期化（実行時に参照される定義）まで references へ移す -->
<!-- → 他の Phase や § Completion が `landed_count` を読むとき値が定まっていない -->
<!-- → 既存の参照（§ Phase 14 など）がリポジトリ中で切れる -->
See `references/commits.md` for everything about commits.
```

### SKILL.md の節を references へ移すときは、修飾の無い `§` 参照の解決先を冒頭で宣言する
**Good:**
```markdown
<!-- 既定の解決先を宣言する形（commits.md） -->
Read from `SKILL.md` Phase 14 (Interactive Commits), Phase 15 (Update Rules), and Phase 16
(PR Rule Extraction). Unqualified `§` references point into this file.

<!-- 外を指す参照だけを明示する形（mob-mode.md） -->
Unqualified `§` references point into this file; `Phase N` refers to `SKILL.md`.
```
**Bad:**
```markdown
<!-- 節の本文を逐語コピーしただけで、冒頭に解決先の宣言が無い -->
# Phase 6 — Implement (extracted sub-steps)

1. ... § Workflow artifacts を差し引いた変更ファイル集合を集める ...
<!-- → この `§ Workflow artifacts` が移した先と SKILL.md のどちらの節かは読み手に決まらない -->
```

### 再開後は中断前のバックグラウンド呼び出しを失われたものとして扱う
**Good:**
```text
<!-- セッションの中断 → 再開後: 中断前にバックグラウンドで呼んだ Agent は失われた前提で扱う -->
中断前に呼んだ 2 つの実行役の生存を確かめる → どちらも見つからない
→ 両方のグループの実行役をすぐ呼び直す（完了通知を待ち続けない）
```
**Bad:**
```text
<!-- 再開後も中断前の呼び出しの完了通知を待ち続ける -->
「起動済みの 2 つの実行役の完了通知を待ちます」→（通知は来ない — 呼び出しは中断で消えている）
```
