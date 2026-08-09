# Project Rules

## SKILL.md設計

- シンプルな箇条書き形式を優先
- エビデンス・信頼度等の詳細情報は不要（コンテキスト削減のため）
- 一般知識で判断可能なことはルールに含めない
- AIに判断を委ねる方針（細かく書きすぎない）
- SKILL.md 内外の相互参照は、サブステップ番号**単独**（例: `Step 2.7`）で書かず、安定した節見出し・フレーズを必ず含める。許容形は 2 つ: (i) 安定フレーズ単独（例: `Step 2 difficulty assessment`）、(ii) **番号 + 安定記述子のペア形**（例: `Step 8 sub-step 1's review-payload definition`、`Step 7's "Concurrent code review launch" paragraph`）。禁止対象は bare number 単独参照のみ — ペア形なら番号がずれても記述子が grep 解決の anchor として残る
- 呼び出し先が守るべき制約は、呼び出し先自身の規則に置く。呼び出し元の散文に書いた注意書きは、呼び出し契約にそれを運ぶ欄が無ければ一切届かない

## allowed-tools設計

- `Bash(*)`は避け、具体的なコマンドを指定（例: `Bash(git ls-files *)`）
- 検索/参照系のBashコマンドは許可してよい
- 必要な権限のみ追加（mkdir -p等）

## セキュリティ

- `.gitignore`に設定されているファイル/ディレクトリはデフォルトで除外
- `.env`等の機密情報は抽出対象外
- `git ls-files`を使用して追跡ファイルのみを対象にする

## ワークフロー

- peerに相談する（作業計画レビュー、完了時チェック）
- codex等の外部ツールにレビューを依頼
- session 中断を挟んだ resume 後は、中断前の background `Agent` dispatch を失われた前提で扱う。完了通知を待ち続けず liveness を確認し、失われた executor を即座に再 dispatch する

## ドキュメント言語

- プラン文書（`.claude/plans/*.md` 等）は日本語で記述する
- 実装物（SKILL.md、README.md、CHANGELOG.md、plugin.json の description 等、配布される成果物）は英語で記述する
- ユーザーとの会話は日本語で行う（グローバル設定）
- 配布される SKILL.md / `references/*.md` で **i18n 機能**（resolved `language` に従って出力切替する仕様等）を documenting する場合、**英語の meta-prose**（規律の記述）と **runtime rendering の paired bilingual sample**（`language: ja` / `language: en` 各値に対応する 1 例ずつ）を分離して書く。Japanese-only example は rules-review で low-confidence flag を呼び込む
- 対象言語へ訳した語は「元の語を知らない読者が、その語だけを見て意味を取れるか」で判定する。対象言語の文字で書かれていること自体を検査の免除理由にせず、原語の比喩表現をそのまま対象言語の動詞に置き換えない（落ちる例: `セマンティクス` / `タイブレーク` / `着地する`（land）/ `〜に倒す`（fall back to）/ `走行`（run）/ `閉じたリスト`（closed list）。同じ基準で `キャッシュ` `レスポンス` は通る）
- 出力する散文は語彙だけでなく組み立て方も規定する。1 文 1 主張を箇条書きの項目にも適用し、参照は文頭ではなく文末に置き、括弧の入れ子を作らない。語彙だけを規定した状態では、(i)〜(iv) を 1 文に詰めて「を持つ」で閉じる形や、節参照が主語の位置を占める形が残る
- 文体規則がサブエージェントへの入力として渡される仕組みの場合、その規則は自分が直接書く出力には自動適用されない。ユーザーに見せる散文は自分で書いたものでも明示的に推敲へ通す

## SKILL.md の配布性

- このリポジトリは配布用マーケットプレイスのため、SKILL.md にユーザー固有の情報（特定リポジトリ名 `owner/repo`、絶対パス、個人識別子等）をハードコードしない
- リポジトリ情報やパスが必要な機能は設定ファイル（`.claude/<skill>.local.md` 等の frontmatter）経由で受け取る
- `~/.claude/...` 配下のパス（例: `~/.claude/settings.json`）は **Claude Code の標準 config root** であり、ユーザー固有パスではない。SKILL.md からこれらを参照するのは配布性違反にならない。「絶対パスをハードコードしない」原則の対象は、特定ユーザーの `/Users/<name>/...` や個別プロジェクト固有の絶対パスに限る
- 配布される一般用途スキル（`skills/dev-workflow/references/self-retrospective.md` の Purpose 行に列挙される bundle skill）の SKILL.md prose / `references/*.md` prose には、**適用文脈固定の語彙**（Skill 開発、特定プロジェクトのアーキテクチャ、特定 framework 等）を直接埋めない。原理は抽象的な主文として書き、具体例は **括弧書き** で添える。Why: producer 出力が triage で skill prose に verbatim 反映されるため、配布物として過剰仕様になる
- 上記ルールの Source of truth: 本ルール bullet が canonical、producer 側 operational expansion は `skills/dev-workflow/references/self-retrospective.md` § Distribution-aware fix direction にあり双方向相互参照（片方更新時は他方も同期）。bundle skill enum 追加時は producer の Purpose 行 1 箇所更新で本ルールの間接参照が追従
- 配布性ルールの **intra-bundle 例外とその厳格化**: 同一 SKILL.md 内の sibling Step 参照と、`dev-workflow-bundle` の `skills` 配列メンバーである sibling skill 名の参照は「適用文脈固定の語彙」**ではない**（self-reference / intra-bundle reference は別レイヤー）。ただしこの例外は参照先が**実際にメンバーである場合に限る** — `.claude/skills/<name>/` 配下の project-local skill を配布 skill prose（plugin source `skills/<name>/**` 配下の SKILL.md / `references/*.md`）から参照すると、配布先に当該 skill が存在せず **dangling reference**（distribution leak）になる。判断軸: 「intra-bundle sibling だから OK」と reject する前に、`jq -r '(.plugins[] | select(.name == "dev-workflow-bundle") | .skills[])' .claude-plugin/marketplace.json` でメンバーシップを確認するのを明示の gate にする。列挙されていなければ例外は適用されず違反として扱い、参照を削除して rationale を self-contained に書き換える

## ローカルスキル設計

- ルーチン用途（非対話環境での定期実行など）を想定するローカルスキル（`.claude/skills/<name>/`）は、外部プラグインスキルへの依存を避ける。Routine 環境に当該プラグインが install されていないと無条件失敗するため、参照したいベストプラクティスは `skills/<name>/references/` 配下に要旨を抽出して自己完結させる
- スキル自身を修正する種類のルーチン（triage 等）では、1 改善 = 1 commit の粒度で落とす。複数 Finding が同一ファイルに当たる場合も、Finding ごとに対象ファイルを直前に再 Read → Edit を組み直し → commit を繰り返す。事前に「2 件目以降は conflict」と落とす過剰防衛はしない
- 非対話／ルーチン実行を想定するスキルには `§ No-Stall Principle` 節を SKILL.md 冒頭に明記する。サブスキル復帰点・ループ境界・非致命エラー処理点で「一区切りつける」誘惑が入るため、次の 3 点を明文化する。(i) 許容される唯一の非完走経路（fatal-abort exits）を closed list で列挙する。(ii) サブスキル復帰時は戻り値を意味判定し、即座に既存分岐へ戻す。(iii) 非致命エラー（`*-failed` / `overflow` 系）は記録して続行する。複数スキルで同名節を使う場合は表記を一致させ、クロスリファレンスは安定節見出しで行う
- ephemeral 環境が主戦場のルーチンスキルが staging 文書を生成する場合、デフォルトを「成功時削除」にしない。(i) session 終了で workspace が破棄され蓄積しない、(ii) in-session に確認できる、(iii) 外部に canonical な永続記録がある、の 3 条件が揃えば「残す + `.gitignore` で commit 混入のみブロック」を優先する。SKILL.md に「gitignored／外部コメントが canonical record」を明記し、`rm` を allowed-tools に足さない（権限最小化）
- 非対話／ルーチン実行スキルが staging ファイルを生成する際、書き込み先は `.claude/` 配下を避ける。Claude Code が `.claude/*` を sensitive file 扱いするため、`Write` 許可があっても permission dialog で停止する。代わりに repo root 直下の dedicated directory（例: `.triage/`）を使い、`.gitignore` で commit 混入をブロックする。SKILL.md に「`.claude/` 外に置くのは sensitive-path treatment 回避のため」と明記する
- 非対話／ルーチン実行スキルでは、サブスキル復帰時の No-Stall 違反が観測された return point に「return-point no-stall reminder」をインライン bullet で配置する。SKILL.md 冒頭の `§ No-Stall Principle` 節と意図的に重複させる（抽象節だけでは agent が決定の瞬間に参照しないため）。reminder は `(regardless of outcome — <列挙>, any non-error result)` で非致命結果を closed list 列挙し、次 action を「next tool call で発行」と明示し、`§ No-Stall Principle` への安定参照を含める
- 非対話／ルーチン実行スキルが GitHub issue / PR / 検索結果等の collection をループ処理する場合、per-invocation 件数 cap は subagent dispatch overhead を織り込んで保守的に設定する。経験則 `--limit 50` を初期値とし、`overflow=true`（cap 張り付き）を summary に明記する
- 非対話／ルーチン実行スキルでは、`§ No-Stall Principle` に「Phase / per-X TodoWrite transitions are non-stalling」段落を明記する。TodoWrite 書き込みは in-memory state 操作で sensitive-path treatment / permission dialog が発生しない。phase 行 / per-item 行の `pending → in_progress → completed` 遷移は同一 tool-call burst 内で発行可能であり、ターン跨ぎの「summary 出力 → 次ターン flip」誘惑を排除する旨を SKILL.md prose で明示する
- 非対話／ルーチン実行スキルで collection ループが 0 件で skip される経路では、複数 phase 行を **1 回の TodoWrite call で同時遷移**させる。phase 行ごとに別 call を発行すると stall 誘発点が増えるため、0-item 経路は「multi-row flip in single call」として SKILL.md prose に明記する
- 非対話／ルーチン実行スキルで分岐 path が下流の dispatch ブロック（reminder / status flip 等）を経由しない構造の場合、上流 sub-step 末尾に **forward jump pointer** を明示挿入する。短絡 path で「skip = 何もしない」と誤解されると下流の必須 transition が抜ける
- 非対話／ルーチン実行スキルの `§ No-Stall Principle` 節で、同じ境界に条件で分かれる reminder を配置する場合、**両 variant を SKILL.md 上で並列に prose 記述**し、agent が runtime で applicable variant を選ぶ形を採る。dispatch 位置を分散させると参照しにくくなるため、closed-list 形式の reminder を同一位置に並べる
- 多段階 subagent dispatch を伴うルーチンで、環境起因の spurious feedback（自動配置フック等）が実行を分断する構造的衝突がある場合、orchestrator スキルの SKILL.md に **canonical write-up 節**（`§ Stop hook structural conflict` 等）を立て、衝突メカニズム / correct behavior / Pre-flight 検知指針を集約する。Pre-flight で hook 登録を検出したときは abort せず summary に warning 行を出す（observability 目的）
- 上記の orchestrator 集約とセットで、callee スキルの SKILL.md にも **short cross-reference note** を該当節周辺に追加する。callee 側 note は canonical を再記述せず、衝突文脈と「該当しない場合は無視」旨だけ 2–3 文で書き、orchestrator 節へ stable heading で参照する。orchestrator 単独修正だと callee subagent 内の決定点で参照されないため、cross-skill 構造的衝突は **orchestrator + 全 callee** ペアで documenting する
- 非対話／ルーチン実行スキルの `§ No-Stall Principle` 節で non-fatal error class を列挙する場合、per-Finding / per-issue 単位の処理失敗（`comment-failed` / `close-failed` / `commit-failed` 等）に加えて、**per-turn 単位の environment-induced spurious feedback** も並列の non-fatal class として明記する。両者は disposition が同じ（記録して続行）だが発生粒度が異なるため、明示列挙がないと「フック指示に従って即 commit」誤動作を防げない
- `Skill(<callee>)` 戻り点で stall が発生する callee（verdict が free-form prose のもの）には、**callee 側 SKILL.md に末尾 fenced JSON return contract を導入**する。`Skill()` は prompt 注入で明示的な return boundary が無く、prose verdict が turn 全体を消費して return-point reminder では救えない。callee 末尾の `{ "status": "...", ... }` で (i) verdict turn が短く閉じ、(ii) orchestrator が parse → 次 action の機械フローを組め、(iii) status mapping が callee 側で完結する。orchestrator reminder の増設だけでは不十分で、callee 出力契約自体を狭めるのが効く
- 上記の callee-side fenced JSON return contract を導入する場合、orchestrator 側に **verdict parse-failure handling** を明示する。`status: "error"` を JSON 経路で受け取るケースと、JSON block 自体が parse できないケースは別経路として扱い、それぞれで「loop 終了 / 該当 counter increment / no retry」を mapping table に明文化する。これを抜くと callee 側 contract が破綻したときに orchestrator が無限 loop か沈黙のいずれかに落ちる
- 集約サマリに同じ counter が複数の sub-condition から累積する場合、**warning 文字列を sub-condition ごとに differentiate** する。同一文字列に集約すると user が「どの sub-source が threshold を踏んだか」を identify できず、後追い triage で原因を切り分けられない。SKILL.md 側にも「区別意図」を 1 行明記する
- bundle 内 review 系スキルは **Pattern A**（Skill ラッパー + 内部 `Agent` dispatch + main-thread Edit / safety-rail / verdict）に揃える。review walk が main thread context を必要としないタスクでは (i) bias-free executor 確保、(ii) design pattern 一貫性、(iii) token 効率の 3 点で Pattern A が優位。新規作成・既存再構築では Process step を inline 実行で書かず、`Agent` dispatch + main-thread apply の 2 層に分ける。Pattern A 化は outer `Skill()` boundary の stall リスクとは直交した独立改善
- review 系 skill の SKILL.md で interactive-only path が live caller 無く silent dead-code 化している場合、**path を deprecate** して標準フローに合流させる。retain して「standalone と sub-skill で切り替える」設計は (i) caller 側で mode を渡す術が無い、(ii) 直接利用時もその path が扱う判断を手動で下すのが合理的、の 2 点で正当化されない。「将来 caller が増えた時に役立つ」は trigger にならない
- Pattern A skill で `Agent` 不可時の fallback 段落は、canonical write-up を持つ skill（`rules-review` SKILL.md `§ 5. Review` の **Claude Code path** / **Fallback path** bullet）にポインタを張る形に圧縮する。inline で 3 段落書き直すのは冗長で、上流 canonical の更新が伝播しない。skill 固有の specialization だけ 1 行追加する形に留める
- Pattern A skill の subagent dispatch prompt では、payload セクションを `--- LABEL ---` fence で区切る convention を採る。ad-hoc な `## Sub-heading` 方式は subagent 側で payload 境界を見失いやすく、fence convention なら bundle 横断で template を流用できる
- Pattern A skill の callee return JSON parse logic は、`verify-diff` § (b) Parse & apply の **first-match-wins evaluate-in-order** 規律を踏襲する: (1) verdict missing/malformed → (2) schema violation → (otherwise) apply。loop を持たない single-pass dispatch では verify-diff の (3) Converged / (4) Divergence は N/A なので圧縮する
- subagent 返却 JSON の **per-entry shape validation は parse 時に行う**（apply 時ではない）。object array では、required key 欠落・値の型不一致・entry ごとの shape 違反を一括で schema violation と判定し、`{"status": "error", "reason": "verdict schema violation"}` で停止する。malformed entry が後段の `Edit` call を crash させる経路を未然に塞ぐ
- subagent の `suggested_edits` / `mechanical_edits` の `old_string` には **1–3 lines of surrounding context** を含めて unique にする convention を dispatch prompt 内に明記する（short one-liners は collide して Edit fail）。後段 edit が前段 edit の rewrote した region と overlap して `old_string` not-found になる skip は **no-op fallback として正常**。SKILL.md に skip 時の counter 加算除外（`Increment <counter> only for entries whose Edit call succeeded — skipped entries do not count`）を明示する
- Pattern A iteration loop スキルの SKILL.md frontmatter `allowed-tools` には、`Read, Edit, Agent, TodoWrite, Bash(git diff *), Bash(git rev-parse *)` などの sibling baseline 集合を mirror する。特に **`TodoWrite` は容易に抜ける**（pre-register 設計を prose に書きつつ frontmatter 宣言を落とすと、sub-skill 経由 invocation で permission dialog で停止する）。新規追加時は sibling の `allowed-tools` 行を 1 行 diff して付け落としを検出する
- Pattern A iteration loop の (a) Dispatch sub-step で `affected_files` を再 Read する際、iter 1 では全件 Read、**iter `i ≥ 2` では iter `i-1` で `Edit` が成功したファイルのみ再 Read** する（untouched files は iter-1 snapshot を保持）。全件再 Read は wasted work で context 肥大を招く。iter 2+ では `git diff <Base ref>` も再実行して landed edits を反映する
- 集約サマリで sub-skill counter 列を render する場合、**source of truth を 1 行明記**する。同じ counter が「warning 行」と「per-Finding record status token」の二重実装になると後追い triage で判断できない
- orchestrator が per-Finding execution log で `[iter <iterations_used>/<max>]` を render する場合、**`<max>` は orchestrator が caller として実際に渡している integer をハードコード**する（プレースホルダ表記は禁止）。引数を渡さず callee の既定に委ねる場合も、その既定値を同じくハードコードする。プレースホルダのままだと複数 callee 呼び分けで denominator がブレる
- スキルが固定 N 個の入力フィールドの有無で 2 mode を分岐する場合、**all-present → mode A、all-absent → mode B、partial（1〜N-1 個だけ provided）→ early return with schema** の 3 分岐契約を採る。partial を silent fallback として扱わず、暗黙に合流させもせず、`incomplete args` の bug signal として loud に surface する（caller テンプレの書き間違いが silent 通過する / mode を後追いできない、の 2 点で正当化されない）
- Pattern A iter loop で executor が毎 iter ステートレスに推論する設計では、**iter 1 verdict から推論値を main thread context に capture して per-loop fixed として扱う**。iter 2+ は別値を返す可能性があるが上書きしない。理由は 2 つで、単一の安定推論値を報告しないと誤読源になること、divergence 比較に推論値を含めると毎 iter ノイズになること。iter 1 が parseable verdict を produce しなかった経路では `null` を per-target verdict object に書き、「iter-1 値なし」を識別可能にする
- スキルが mode で空入力（empty diff / 空 collection / empty target）の disposition を分ける場合、**caller framing がある mode（explicit-args 系）では `conflict`**（caller が work あり signal なのに input が空 = bug）、**無い mode（auto-derive 系）では `skipped`**（informational）とする。同じ「空入力」でも bug 文脈と informational 文脈は別の disposition に分類する
- 既存 mode の status enum に新 mode 専用値を追加する場合、**`<新値> は <新 mode> only` であり既存 mode 経路では emit されない旨を SKILL.md prose に明記**する。明記しないと既存 caller の switch 文が新値で沈黙落ちするか dead code 経路に入る。新値を「mode-additive」と位置付け、既存 caller 互換性を契約として守る
- Pattern A skill が複数 target を loop する設計で safety rail として `git checkout HEAD -- <path>` を使う場合、**rail 発火の前段に「scope 外 write を `Edit` 呼び出し前に skip する pre-check」を必須**にする。pre-check が無いと、T1 の executor が T2 の path に edit を返した際、rail の `git checkout` が T2 で landing 済みの sibling edits を wipe する collateral-damage path が開く。pre-check で out-of-scope path を skip すれば実 write が無く revert も不要で、`reverted_paths` には informational に詰めて surface する
- 1 つの SKILL.md が同型の **iteration loop を複数持つ**場合、`§ Return-point no-stall reminder` のような inline reminder bullet を **全 sibling loop に同型コピー**する。片方の loop にだけ置くと、無い loop の境界で stall が再発する（別 loop の reminder は active prompt として参照されない）。reminder wording も sibling 間で揃える: closed-list / next tool call / `§ No-Stall Principle` 安定参照の 3 要素を structural に整合させる
- **stall risk は verdict の形で判定する**: `§ No-Stall Principle` 節で stall しうる callee を数える際、verdict が **free-form Markdown / 構造化 prose**（fenced JSON 末尾なし）の sub-skill はすべて同じ stall リスクを持つ。reviewer 系は構造化に見えても、fenced JSON return contract が無ければ同じ経路で stall する。新規 reviewer 系の追加・改修で stall を観測したら、callee 側に末尾 fenced JSON return contract の導入を検討する
- **Routing-field classification by anchor position, not request type**: レビューコメント等の入力を分岐させる routing フィールドは、「要求の種類」ではなく「コメントがどこにアンカーされているか」という構造的な位置で分類する。種類ベースで分けると、複数の種類が混在するラウンドで first-match-wins の分岐が片方しか拾わず、残りのコメントが確定的に落ちる
- **Split-baseline mirroring takes the reasoned-stronger convention**: 既存の sibling 手続きを写して新しい手続きを書くとき、その規約が baseline 間で割れている場合は、最も近い sibling ではなく **理由が明記されている強い側** の規約を採り、割れている事実を書き添える

## プラグイン構造

- 単体スキルプラグインは direct-skill 方式（`source: "./skills/<skill-dir>"` + `skills: ["./"]`）を使う。`plugins/` 配下のラッパーディレクトリを作らない
- direct-skill 方式ではプラグイン名と skill ディレクトリ名が異なっても OK（例: plugin `peer` → skill `ask-peer`）
- wrapper 方式（`plugins/<name>/`）は以下のいずれかに該当する場合のみ: (1) `agents/` を持つエージェント依存プラグイン、(2) `plugin.json` にフック定義を持つプラグイン、(3) 複数スキル bundle
- wrapper には 2 サブパターン: (A) エージェント/フック wrapper（`plugin.json` 必須）、(B) bundle wrapper（`plugin.json` 不要、marketplace.json 側の `skills` 配列で参照スキルを明示）
- bundle では marketplace.json の `skills` 配列と `plugins/<bundle>/skills/` 配下のエントリセットを必ず一致させる。ずれると配布が壊れるため、`/verify-plugins` と `run-tests` で整合性を検証すること
- **wrapper 配下の `skills/` エントリは symlink ではなく実ディレクトリコピー**。upstream の plugin cache が symlink を解決しない bug（[anthropics/claude-code#53948](https://github.com/anthropics/claude-code/issues/53948)）を回避するための暫定対応。検証ツール（`run-tests` の check 3、`/verify-plugins`）は symlink を要求せず、`SKILL.md` を含む実ディレクトリを合格として扱うこと — 要求したままにすると全 wrapper が毎回 FAIL し、恒常 FAIL が新規問題の検出を潰す。symlink 復活時は本 bullet と各検証ツールの exemption 記述をまとめて削除する
- フックの自動設定が必要な場合はプラグイン化
- PreCompactだけでなくStopフックも検討（Compactが発生しない場合に対応）
- 設定が複雑なスキルには README.md を用意する。`skills/<name>/README.md` に置けば direct-skill 方式で source 直下に配置されるため、利用者に自動的に届く
- プラグイン構造を変更する場合、`.claude-plugin/marketplace.json` だけでなく検証ツール（`.claude/skills/run-tests/SKILL.md`、`.claude/commands/verify-plugins.md`）とドキュメント（`CLAUDE.md`）の該当箇所もセットで更新する。片方だけ更新すると見落としが発生する
- bundle skills（メンバーの権威は `marketplace.json` の `dev-workflow-bundle` plugin の `skills` 配列。解決コマンドは § SKILL.md の配布性 の intra-bundle 例外 bullet を参照）を編集する際は、`skills/<name>/`（canonical）と `plugins/dev-workflow-bundle/skills/<name>/`（bundle copy）の **両方** を同期する。upstream symlink bug（[anthropics/claude-code#53948](https://github.com/anthropics/claude-code/issues/53948)）の暫定対応で bundle copy が実体コピーになっているため、片方のみ編集すると `verify-bundle-sync` が drift を検出して `dev-workflow` Step 7（Check / Test）/ `dev-workflow-triage` (d4) で FAIL する。同期は `cp -R skills/<name>/. plugins/dev-workflow-bundle/skills/<name>/`。symlink 復活時は `verify-bundle-sync` skill ごと本ルールも削除する
- **bundle 全メンバーに複製する横断ディレクティブは byte-identical を保ち、メンバー追加時に必ず同梱する**: `## Dispatch authorization`（起動＝subagent 呼び出しの許可。inline 実行への差し替えを正当化するのは技術的可用性と caller の明示的な契約条項の 2 つだけで、権限の形をした制限はどちらでもない）は bundle の全メンバーの SKILL.md に**同一文言**で置く。各メンバーは単独インストール可能なので、兄弟スキルへのポインタでは解決できず自己完結した複製が必要。**配置は preamble 末尾 / 手続き本文の直前**（route 判断が起きる前に文脈に入っている必要があるため）。文言を変える時は 各メンバー × (canonical + bundle copy) の全箇所を 1 commit で sweep する（`verify-bundle-sync` は canonical↔bundle copy しか比較しないのでスキル間の一致は見ない）。**機械検査は `run-tests` の Check 7**（節の存在 + 本文の一致 — 見出しから次の `## ` までを `Read` して直接比較する。ハッシュコマンドは `allowed-tools` 外なので使わない）が担うので、bundle に新メンバーを追加する時は `marketplace.json` の 4 編集（別記）に加えて本節の同梱も必須 — 漏れると Check 7 が落ちる。先行する 2 節 `## Sub-skill caller directive` / `## Stop hook structural conflict (caller-side note)` は同じ「複数メンバーへの複製」形だが **全メンバー複製でも byte-identical でもない**（前者はスキル名でパラメータ化され、後者は § ローカルスキル設計 の指示どおり各スキル固有の衝突文脈を書く設計）。したがって両節は「複製節の先例」としてのみ引き、byte-identity の先例として引かない
- mobpro（`skills/mobpro/`）は dev-workflow の SKILL.md インライン定義を転記して自己完結させている。以下を変更する際は mobpro 側の対応節も sweep 対象にする — 上流は dev-workflow の `§ Configuration` / `§ Workflow artifacts` / `§ Step 7: Check / Test` / `§ Step 9: Completion Hooks` / `§ Step 10: Interactive Commits` / `§ Step 11: Update Rules` / `§ Completion` のインライン定義、`skills/dev-workflow/references/prerequisites.md`、`skills/dev-workflow/references/configuration.md`、`skills/dev-workflow/references/step4-finalize-plan.md`（§ Establish the plan document の slug 解決・§ Browser-reachability probe・**Plan-body prose polish** 段落）、および mobpro SKILL.md の runtime Read closed list 節に列挙される `skills/dev-workflow/references/*.md`。下流は `skills/mobpro/SKILL.md`・`skills/mobpro/references/inline-defs.md`・`skills/mobpro/references/configuration.md`・`skills/mobpro/references/crit-diff-review.md`・`skills/mobpro/references/m5-plan-approval.md`・`skills/mobpro/references/m9-rules-code-review.md`・`skills/mobpro/references/m11-commit.md`。`Keep in sync with ...` note を持たない節でも、上流の節見出しを名指しで追っているなら sweep 対象から外さない。同期元は節ごとに異なるので取り違えないこと: `SKILL.md` と `inline-defs.md` の転記は原則 `dev-workflow SKILL.md § <節名>` が上流だが、`inline-defs.md` § (a) の `self_retrospective` / `workability_retrospective` の分類と `configuration.md` § Fallback keys の Default 列は `dev-workflow references/configuration.md` が上流（前者は dev-workflow SKILL.md の Scalar 列挙に載っていないため、SKILL.md だけを見た機械的 sweep が drift と誤判定しうる）。`dev-workflow references/diff-presentation.md` だけは例外で、mobpro が転記せず実行時に読むので sweep 不要 — 代わりに節名を変えるとポインタが切れる（`verify-skill-refs` が検出する）
- 上流の記述を転記している下流ドキュメントへ例外を足す修正は、同じ反復のうちに上流の断定的な記述も掃く。レビュー指摘に応じた修正であっても、それ自体が新たな矛盾を作る側になりうる

## バージョン管理 / リリース運用

- bundle に含まれるスキル（メンバーの権威は `marketplace.json` の `dev-workflow-bundle` plugin の `skills` 配列）の version bump は、対応するスキル plugin と `dev-workflow-bundle` plugin を **常にペアで bump** する。CHANGELOG の version subsection 見出しも `### <skill> vX.Y.Z / dev-workflow-bundle vX.Y.Z` の対形式で書く（既存 CHANGELOG の不変条件）
- `.claude/skills/<name>/` 配下の **project-local skill**（marketplace.json 未登録、配布されない）は version bump / CHANGELOG ペア bump ルールの対象外。`marketplace.json` の `plugins[]` に entry が無く、`plugin.json` の `version` も持たない。この分類は本 bullet が canonical（`project.rules.local.md` の project-local skill 項目は本 bullet を参照する）。code review の version bump / CHANGELOG entry 漏れ finding には、marketplace.json で `grep` 確認後 reject する
- **diff-level version-bump 義務**: bundle skill の `SKILL.md` / `references/**` を変更する diff には、同じ diff 内にペア version bump（`marketplace.json`）と `CHANGELOG.md` エントリが含まれていなければ違反。これは「per-Finding と別の bookkeeping commit にまとめる」commit 構造ルール（下記）とは **独立した diff-level の不変条件**で、commit 分離とは別概念として両立する（diff から決定論的にチェックでき、rules-review が機械検証できる）。project-local skill（上記）は対象外
- bump 直前に `dev-workflow` plugin と `dev-workflow-bundle` plugin の現 version を `jq -r ...` で読む version-skew guard を入れる。比較は **`dev-workflow` の version が `dev-workflow-bundle` より厳密に大きい時だけ abort**（`dev-workflow-bundle ≥ dev-workflow` は bundle が先行する正常状態として通す）。この guard は `dev-workflow` vs `dev-workflow-bundle` のペアに限定し、全 member へ一般化しない（各 member は独立 version 系列を持ち、bundle より major が上のものもあるため、一般化すると常時誤 abort する）。abort 時は per-Finding コミットを preserve する
- `marketplace.json` の version 書き換えは `jq | mv` ではなく `Edit` ツールで version 行を直接書き換える。`Bash(mv *)` を allowed-tools に追加せずに済むため、「allowed-tools は必要最小限」原則と整合する。Edit 直後に `jq empty` で構文整合性を再確認する
- `Edit` で plugin の version を書き換えるときの `old_string` には plugin name + 周辺 + version を含める塊を取り、name の閉じる double-quote と末尾 `,` まで必ず含める（例: `"name": "dev-workflow",`）。trailing カンマを含めないと `"name": "dev-workflow-bundle"` の prefix と被って not-unique error になる。`replace_all` は禁止
- 自動化スクリプトやルーチンスキルでスキルを更新した場合、CHANGELOG.md / marketplace.json の version bump は **per-Finding コミットとは別の bookkeeping commit** にまとめる（`chore(release): bump <plugins> (auto-triage YYYY-MM-DD)` のような subject）。「1 accepted Finding = 1 commit」ルールを維持し、scope check の意味を保つため
- CHANGELOG.md のエントリは新しい version subsection を `## YYYY-MM-DD` 直下に **prepend** する（既存スタイル「新しい version が上」と整合）。同日複数 invocation が起きうる場合、commit subject 末尾に `(auto-triage YYYY-MM-DD)` 等のサフィックスを付けて commit log で区別できるようにする
- CHANGELOG.md エントリ本文で過去 commit を参照する場合、生 commit hash ではなく `auto-triage #N` 形式を使う。commit hash の直接参照は reword / rebase で安定性が落ち、既存 entry の一貫性も壊す
- CHANGELOG.md fix entry の `Category:` token は既存 taxonomy（`missing-branch` / `ambiguity` / `wrong-default`）の closed list から選ぶ。新規の記述的 token を発明しない。新 failure mode が収まらない場合は、まず 3 種いずれにマップ可能か判断し、それでも収まらない時のみ CHANGELOG ルール改定を経て新 token を導入する

## Examples

When in doubt: ../rules-extras/project.rules.examples.md
