# dev-workflow 改善施策カタログ（2026-07 版）

高品質化 / コスト削減 / 高速化の 3 軸で dev-workflow の改善施策を整理した**検討用資料**。実装着手の指示書ではなく、各施策の採否はこれから判断する。

- 旧版（2026-06-12、peer レビュー 1 回反映済み）は `.claude/plans/archive/dev-workflow-improvement-ideas-20260612.md` に保存。施策 ID（L1 / A1 / C6 …）は旧版から継続し、新規施策には新 ID（G2a / G2b / H / L2 / C9 / D11 / P1 / U 系、2026-07-02 追記分は B6 / G4）を振る
- 作成: 2026-07-02（peer レビュー 1 回反映済み）
- 追記: 2026-07-02 設定キー削減の洗い出し（B6 / G4 起票。peer レビュー 1 回反映済み — interactive_commits / custom_instructions の第 1 弾除外、review_iterations map の deferred 化、tombstone 段階の追加、削減見積もりの再計算を反映）。同日 user 指摘を反映: **配布スキルのため「本 repo で未使用」は需要なしの根拠にならない** — 判定軸を機能的冗長性に改め、backlog_dir を削除非対象へ降格、第 1 弾の実削除も G4 告知 + 待機期間経由に統一

## 現状の事実（2026-07-02 実測）

- 本体 `skills/dev-workflow/SKILL.md` は **243.7k chars（概算 60k tokens 相当の常駐 context、2026-07-02 実測）**。旧版時点の 159k から **3 週間で +53%**。references は 12 ファイル合計 262k chars。2026-07-06 実測では SKILL.md **244.6k chars** / references 合計 **263.0k chars** — G2a 導入後もわずかに増加継続（L2 / G4 landed 分の反映）
- **旧版 Tier 1 の 5 施策（L1 / A1 / C6 / E11 / F13）は 3 週間ですべて未着手**。G2（成長ガバナンス）も未着手のまま、G2 が警告した「triage 日次 append による肥大」が実測どおり進行した
- ステップ構成: 1 → 1.5 → 2 → 3 → 4 (USER GATE) → 5 → 6 → 6.5 → 7 → 7.5 → 8 → 9 → 10 (USER GATE) → 11 → 11.5 → 11.6 → Completion。設定キー 16–18 個（nested サブキーの数え方による）
- references の hot / cold **実測**（2026-07-06、A1 手順(i) 実施 — SKILL.md 全文の Read 条件を悉皆 grep して検証。旧分類は grep ベースの推測で 2 件誤っていた。詳細は § A1 参照）:
  - **main thread が直接 Read するもの**（SKILL.md 本体の常駐 context 圧迫に直結。難易度 tier を問わず全 run で Read）: plan-format 40.2k / simplicity-self-audit 45.2k / interactive-commits 19.5k（`interactive_commits: true` = default）/ visual-plan-review 17.9k（`visual_plan_review: true` = **default**。旧分類は「フラグ限定の cold」だったが v1.81.0 で experimental マーカー除去済みのため誤り）/ task-decomposition 16.0k（Step 1.5 で Normal/Resume 問わず無条件 Read。旧分類「分割提案が出る run 限定」も誤り）/ session-scan 15.5k ≈ **154.4k chars**
  - **subagent context のみに載るもの**（orchestrator 自身の context は圧迫しないが token コストには乗る）: review-categories 22.6k（reviewer subagent、Step 3 + Step 8 で最大 2 回）/ rule-extraction-axis 10.6k（session-scan subagent、rule-extraction-active 時）
  - **flag 限定で hot 化するもの**（default 無効・本 repo 自身の dogfooding config では有効）: update-rules 9.8k（`compact_rules: true`）/ self-retrospective 28.4k（`self_retrospective.feedback` 設定時）/ workability-retrospective 19.8k（`workability_retrospective.enabled: true`）— 3 つとも difficulty 非依存
  - **未使用（`--init` 専用）**: init-mode 17.3k（Execution Mode では一切 Read されない）
- subagent / sub-skill dispatch 地点（Moderate 1 run で概算 10–15 dispatch）: Step 3 ×N_plan(≤2) / Step 5 委譲（条件付き）/ Step 6 simplify（内部 4 並列）/ Step 6.5 prose-polish / Step 7 background ×2 / Step 7.5 rules-review / Step 8 ×N_code(≤2) / Step 9 hooks / Step 11 系 session scan ×1 + extract-rules ×1–2
- 2026-06-12 以降に landed した主な機能: visual_plan_review、confirm_remaining_steps gate、polish_prose default flip、Step 2 research 委譲・Step 5 実装委譲、Step 11.6 workability retrospective、静的 effort default（prose-polish / extract-rules / rules-review）、self-retrospective single gate、subagent_model の tidy / run-tests 伝播（旧・別資料分）

## 次の 1 手（この 2 件だけ task brief まで分解済み）

旧版は Tier 表・依存マップ・着手順まで揃えても 3 週間動かなかった。原因は資料の質ではなく、**カタログ → 実行への変換経路が無かった**こと。今回は上位 2 件だけを即着手可能な粒度まで落とす。3 件目以降は下の Tier 表どおり。

**着手時の実行規約**: 各 task brief を `/dev-workflow` の task 入力としてそのまま渡す。brief 内の「着手時の Decision」と明記された項目は Step 4 plan の Decisions 節の種（R / A を立てて user gate で確定）。brief 本文の**確定済み設計**（制約・設計課題の対応方針 — user 指摘を反映済みの最終形）は plan 作成時に再オープンしない。Tier 1 以下の施策は意図的に粗いままなので、着手時にまず本節と同じ粒度の brief 化を行ってから実行に入る。

**順次実行の消化規約**（「本資料の対応を順次行う」型の指示を受けたセッション向け）: § 着手順を上から読み、**未 landed の最初の項目 1 つ**を当該 run の task とする。1 施策 = 1 dev-workflow run（= 1 PR）— 同一セッションで続ける場合も施策ごとに新しい run として起動する。**時間待機・観測条件付きの項目は自動消化の対象外**（B6 実削除 = deprecation notice から待機期間明け後、G4 stage 3 = 時間軸 anchor 成立後、着手順の最終項目 = 実需・実測の観測後）— 条件成立を確認できた場合のみ着手し、未成立なら次の無条件項目へ進む。

**進捗の書き戻し**: 施策が landed したら同じ run 内で本資料を更新する — 該当 brief（または施策節）の冒頭に `**landed**: vX.Y.Z / PR #N / YYYY-MM-DD` 行を追記し、§ 着手順の該当項目に「済（YYYY-MM-DD）」を付ける。**本資料が唯一の消化状態記録** — 順次実行の次セッションはここを読んで次の 1 手を特定する。

### 1 手目: G2a + G2b 初回パス — char-budget ゲート導入と初回 consolidation（止血 + 空き確保）

**landed**: dev-workflow v1.86.1 / dev-workflow-bundle v1.96.1（`.claude/skills/dev-workflow-triage/SKILL.md` の char-budget gate は project-local のため version 対象外）/ 2026-07-02。実装時の scope 修正: Decision 3 のレビューで「`subagent_model` 3 重複」の想定が誤りと判明（`self_retrospective` の "Agent tool usage" bullet は別コンテンツで、他 4 箇所から stable-phrase-anchor 参照される保護対象）し、consolidation 対象を実在する 2 重複（`:73`/`:233`）に限定して着地。Code Review で `cumulative_delta_this_run` running-total 設計に (d) conflict downgrade 時の残留増分が未反映という Major な正当性バグが見つかり、(a.5) を「毎回 `wc -m` で fresh 測定」方式に再設計して解消

- **Goal**: dev-workflow-triage の per-Finding accept 判定に SKILL.md char-budget ゲートを追加し、日次 append による純増を止める（成長ネット 0 原則）。同時に G2b の**初回 consolidation パス**を 1 回実行して空きを作り、hard cap を「consolidation 後サイズ + headroom」に anchor する — ゲート導入直後から budget-defer queue が積み上がる事態を避ける（2026-07-02 user 指摘: G2a 単独導入だと deferred issue が G2b 着手まで滞留し続けるため、defer を「G2b 待ち」にするのではなく「headroom でほぼ発火させない」設計に変更）
- **内容**: (i) Pre-flight で triage 対象 skill の SKILL.md 現在 chars（`wc -m`）を取得しキャッシュ（Pre-flight hoist の既存規律に合流）、(ii) Finding accept 時に fix 適用による増分を概算し（概算 = 当該 Finding の Edit 群の `new_string` − `old_string` 文字数差の合計。run 累計は commit 後の `wc -m` 再測定で確定し summary に使う）、閾値超過の fix には「同一節内の統廃合（既存 reminder への合流・cross-ref 化）を同時に行う形」への組み替えを必須化、(iii) run summary に `skill-md-growth: +N chars` 行を追加、(iv) 導入と同時に**初回 consolidation パス**を `skills/dev-workflow/SKILL.md` に 1 回実行 — L1（lint）未着手段階のため **conservative 範囲に限定**（厳密重複 reminder の統合 + 同義 prose の cross-ref 化のみ、repo-wide grep で dangling 参照ゼロを検証）。攻めた統廃合は L1 後の月次パス（G2b 本体）に回す。増分閾値と headroom の具体値は着手時の Decision（threshold は観測可能シグナルに anchor する既存規律に従う）
- **制約（2026-07-02 user 要件）**: dev-workflow-triage は非対話ルーチン実行のため、本ゲートは **run 中に user gate を作らない**。閾値判定 → 統廃合形への組み替え（1 回のみの bounded retry）→ それでも超過なら budget-defer、の全経路を決定論的な agent 側規則で完結させる。人間の確認は従来どおり run 後の非同期（triage-review / issue コメント）のみ
- **設計課題（2026-07-02 user 指摘）**: hard cap 張り付き状態で budget 起因の却下が常態化すると**自動改善パイプラインそのものが止まる**。対応 3 層: (i) 常用経路は却下でなく統廃合形への組み替え — 改善は密度を上げて継続し、落ちるのは組み替え不能な純増 fix のみ、(ii) budget 起因 defer の warning 行（differentiated 文字列）を **G2b（consolidation）起動のトリガー**として扱う — G2a は G2b / A1 とセットで初めて成立し、単独長期運用は改善 throughput を絞る（§ G2b 位置づけの 3 点セットと整合。G2a 先行は緊急止血であって G2b を先送りする根拠ではない）、(iii) budget 超過は **reject-close でなく defer** — Finding の内容は正しく「空きがない」だけなので、改善 signal を捨てず `budget-deferred` label 付き close + G2b 後に re-open して再 triage 投入（順番待ち化）。label は Finding 判定の disposition enum ではなく **collection 段階の pre-filter**（既存 title-mismatch-skip と同じ層）として扱い、enum 不変の既存規律と両立させる — 詳細は着手時の Decision。さらに追加 user 指摘「deferred issue が G2b まで残り続けるなら同時にやるべき」を受け、**G2b 初回パスを 1 手目に統合**（headroom 確保で defer の発火自体を稀にする — § 次の 1 手参照）
- **Scope**: ゲート分は `.claude/skills/dev-workflow-triage/SKILL.md`（project-local — version bump / CHANGELOG 対象外）。初回 consolidation 分は `skills/dev-workflow/SKILL.md` + bundle copy 同期 + ペア bump / CHANGELOG（配布 skill の diff-level version-bump 義務に従う）
- **Test plan の種**: 次回 triage 定期走行で summary に growth 行が出ること（live validation）。budget 超過時の組み替え経路は synthetic Finding で 1 回確認。初回 consolidation は repo-wide grep で dangling 参照ゼロ + `verify-bundle-sync` PASS を確認
- **想定 diff 規模**: 中（ゲート分は小 + 初回 consolidation 分）。L1 / A1 に依存しない（consolidation を conservative 範囲に限定することで L1 不在を許容）

### 2 手目: L1 — verify-skill-refs（SKILL.md 不変条件の静的 lint）

**landed**: project-local `.claude/skills/verify-skill-refs/`（version bump / CHANGELOG 対象外）/ 2026-07-02。注入テストで 4 クラス全検出経路を確認、canonical ツリーで violations 0（FP-0 達成 — 真陽性の class (a) violation は現行ツリーに存在せず、配線前提の懸念は非実在と判明）。genuine findings: 3 件（fix は別 scope — 配布 skill のペア bump / CHANGELOG を要するため）: (1) `§ Step 1 registration mechanics` ×4 箇所が実 anchor `**Registration mechanics (Task tools)**` と文言不一致（緩い anchor）、(2) localization-enumeration ペアの双方向乖離（SKILL.md `language` bullet ↔ plan-format § Localization granularity「Applies to」）、(3) references 3 ファイル冒頭の bare-number 形「Deep reference for Step N.」。実装知見: sonnet executor は「pipeline を実行せよ」型 prompt で nested subagent へ再委譲して verdict 未返却のまま停止する failure mode を 2/2 で再現 — executor prompt に nested-dispatch 禁止条項を明記して対処

- **Goal**: rules に手動 canonical pattern として蓄積している検証を機械化する project-local skill。**A1（thin-core 化）の安全網** — 切り出しの最大リスクが dangling ref なので、lint が先
- **内容**: run-tests 型（subagent 検証）で対象 = `skills/dev-workflow/**` + bundle copy。検出クラス: (a) `§ <Heading>` / bold-prose label 参照の解決失敗、(b) SKILL.md 内 closed list ↔ `references/*.md` table の乖離、(c) bare-number の Step 参照残存（word-boundary grep）、(d) governed-site 列挙（`subagent_model` read sites 等）の欠落
- **Scope**: `.claude/skills/verify-skill-refs/`（marketplace 未登録）。dev-workflow 設定の `test_commands` への追加は検出精度の安定後に別 commit
- **Test plan の種**: 既知の dangling ref を意図的に注入して検出確認 → 現行 SKILL.md で false-positive 0 になるまで規則調整（数イテレーション見込み）
- **想定 diff 規模**: 中（新 skill 1 本 + references）

## 軸 × 施策マッピング

主軸 = その施策の主測定指標が属する軸（●）。副次効果は ○。

| ID | 施策 | 高品質化 | コスト削減 | 高速化 | Tier |
| ---- | ------ | :---: | :---: | :---: | ------ |
| G2a | triage char-budget ゲート | | ● | | **0（次の 1 手、G2b 初回パスとセット）** |
| L1 | verify-skill-refs 静的 lint | ● | ○ | | **0（次の 1 手）** |
| A1 | thin-core 化第 2 弾（指標再定義） | | ● | ○ | 1（L1 後） |
| G2b | 月次 consolidation pass | ○ | ● | | 1（初回パスのみ Tier 0 に前倒し、月次化は A1 とセット） |
| C6 | ask-peer fenced JSON contract | ● | | ○ | 1 |
| E11 | release-helper skill | ● | | ○ | 1 |
| F13 | run-metrics 軽量版 | ○ | ○ | ○ | 1（横断基盤） |
| L2 | verify-diff stray-output ガード | ● | | | 1（小粒・独立） |
| B6 | 設定キー削減（G4 lifecycle 適用第 1 弾） | | ● | | 1（G4 とセット・小粒） |
| G4 | 設定フラグ lifecycle 規律 + history sunset | ○ | ● | | 1（B6 とセット） |
| C7 | Step 3 レビュー並列 fan-out | | | ● | 2（C6 後） |
| C8 | review payload の tier 連動 trimming | | ● | | 2（F13 後） |
| C9 | レビュー層間の重複読込 dedup 監査 | | ● | ○ | 2（F13 後） |
| D9 | mid-flight tier escalation | ● | ○ | | 2（条件付き） |
| D11 | 静的 effort default の残 callee 監査 | | ● | | 2（小粒） |
| D12 | subagent_model tier 別 default 値の監査 | | ● | | 2（小粒、F13 後） |
| H1 | refactor-bench skill | ● | | | 2 |
| H2 | tidy 並列 angle-split | ● | | | 2（H1 後） |
| U2 | Step 1.5 分割提案の visual review 化 | ● | | | 2 |
| P1 | Step 11 系の並列化 | | | ● | 2（探索） |
| B4 | checkpoint resume（契約絞り版） | | ○ | ● | 2（条件付き） |
| G3 | upstream 機能置換ウォッチ | | ○ | ○ | 2（軽量運用） |

---

## 軸 1: 高品質化

### L1: verify-skill-refs 静的 lint（Tier 0 — § 次の 1 手を参照）

task brief は § 次の 1 手に記載。品質軸での位置づけ: review iteration で人力 catch している finding クラス（dangling cross-ref / closed-list 乖離などの cross-file 不整合）を Step 7 で決定的に検出する。A1 切り出しの安全網を兼ねる。

### C6: ask-peer に fenced JSON return contract（Tier 1）

**概要**: ask-peer の prose feedback 末尾に fenced JSON（findings count / severity 内訳 / status）を**付加**し（additive 形 — 対話的 standalone 利用の prose は壊さない）、dev-workflow Step 3 / Step 8 の verdict 判定を機械化する。並列 fan-out 時の merge 結果スキーマも同時に定義。

**価値**: verdict の誤読・stall の根本対策（rules の既存方向性「reviewer 系 callee で stall 観測時は fenced JSON return contract」と整合）。C7 / F13 counts 拡張の前提。

**リスク・コスト**: 低〜中。ask-peer + bundle copy のペア bump。caller 側（dev-workflow Step 3 / Step 8）の parse 分岐追加が本体。

### L2: verify-diff stray-output ガード（Tier 1・小粒・独立）

**landed**: dev-workflow v1.86.3 / dev-workflow-bundle v1.96.3（`.claude/skills/verify-diff/` は project-local のため version 対象外）/ 2026-07-03（PR 未作成、ローカル feature branch `verify-diff-stray-output-guard` にコミット済み）。実装時の scope 拡大: Step 3 レビューで `git ls-files` に加えガード内の `grep -q` も dev-workflow の `allowed-tools` 未許可（Critical → 追加後の Code Review で判明した Major）と判明し、`Bash(git ls-files *)` + `Bash(grep -q *)` の両方を追加。scope 外検討として `.gitignore` 追加案を Risks に記録し不採用（fail-loud な検出を優先）。

**概要**: verify-diff の auto-derive executor がシナリオ実行の出力キャプチャ（`*.stdout` / `*.stderr`）を配布 skill ツリー内に残し、`verify-bundle-sync` の drift FAIL を誘発した実績（バックログ 2026-06-23 起票）への 2 点対応: (a) `check_commands` に stray ファイル検出ガードを追加、(b) executor prompt（`references/auto-derive-prompt.md`）に「シナリオ出力は scratchpad 等の skill ツリー外へ」の規律を 1 行明記。

**価値**: 再発性の構造問題を小 diff で根絶。**リスク**: ほぼなし。

### H1: refactor-bench skill（Tier 2）

**概要**: リファクタ系 callee（tidy / simplify / prose-polish）の性能を共通 fixture で比較する検証基盤（バックログ 2026-06-25 起票の昇格）。cross-skill 比較と同一 skill の before-after 比較（回帰検知）の 2 モード。fixture は skill 配下に git 追跡で同梱。recall（気づき）と apply（適用）の 2 軸を分離計測。

**価値**: callee 改修の効果を定量化する初の基盤。H2 の検証手段。**リスク**: LLM judgment ベースで非決定的 — 傾向比較に留める設計が前提。

### H2: tidy 並列 angle-split 化（Tier 2、H1 後）

**概要**: tidy の単一 reviewer を simplify 型の観点別並列 dispatch（3–4 グループ）に改修（バックログ 2026-06-25 起票の昇格）。1.4.0 改修で apply 率は simplify に追いついたが、Altitude 系一般化の判断の深さに差が残る。

**リスク・コスト**: 並列化で dispatch コスト増（グループ数 × iteration）。Step 6 primary は simplify のまま — tidy は simplify 非搭載環境の fallback として exercise される位置づけを維持。bundle ペア bump。

### U2: Step 1.5 分割提案の visual review 化（Tier 2）

**概要**: Step 1.5 task decomposition の分割 proposal gate を、Step 4 で確立した visual review 基盤（serve.mjs）で提示する（stub `.claude/plans/visual-review-step-1-5.md` の昇格）。

**価値**: 分割判断の見やすさ向上（既存資産の流用で新規実装は薄い）。**リスク**: visual_plan_review と同じ接続性 fallback 設計が必要。

### E11: release-helper project-local skill（Tier 1）

**概要**: version bump 系の機械的手順 — version-skew guard / ペア bump / marketplace.json の Edit 規約 / CHANGELOG prepend / bundle copy `cp -R` 同期 — を 1 つの project-local skill に集約（旧版から継続）。rules に事故記録が最も多い領域。

**設計条件**: dev-workflow-triage の bookkeeping commit ロジックと重複するため**共有 callee** として設計。bundle-sync 部分は #53948 解消時に撤去する分離モジュールに（G3 の撤去トリガと連動）。

### D9: mid-flight tier escalation（Tier 2・条件付き）

**概要**: Step 5 で scope が想定超過した場合に tier を引き上げ、skip 済み Step 6 / 6.5 / 7.5 を復活させる（旧版から継続）。

**条件**: escalate 一方向のみ / 再評価点は Step 5 完了時の 1 箇所固定 / `subagent_model`「Resolved once in Step 2」invariant の改定 sweep / skip 済み task row を `pending` に戻す逆方向遷移の設計。条件が重いので実需（Simple 判定 → 実は Moderate だった事故の観測）を待って着手。

---

## 軸 2: コスト削減

### A1: thin-core 化第 2 弾 — 測定指標を「run あたり総読込 chars」に再定義（Tier 1、L1 後）

**概要**: 旧版の A1 は「SKILL.md 単体の削減」だったが、**hot-path reference への切り出しは per-run 総読込では削減ゼロ**になるため、指標を「SKILL.md 常駐 + hot references の run あたり総読込 chars」に置き直す。難易度 tier を問わず全 run で main thread が読む chars は下限 **399.0k**（shipped default 設定。実測は下記参照。旧概算「387k」は grep ベースの推測値で、実測により更新）。

**実測結果（2026-07-06、手順(i) 実施）**: `skills/dev-workflow/references/` 配下 12 ファイルへの言及箇所を SKILL.md 全文から悉皆 grep し、各参照が main thread 直読みか subagent context 限定か、無条件 Read かフラグ限定か（default 値込み）を一次情報から確認した。

| ファイル | chars | 分類 | Read 条件 |
| --- | ---: | --- | --- |
| simplicity-self-audit.md | 45,165 | main-thread hot | Step 2 sub-step 4、全 tier 無条件 |
| plan-format.md | 40,246 | main-thread hot | Step 2 self-check + Step 4 描画、全 tier 無条件 |
| interactive-commits.md | 19,521 | main-thread hot | Step 10、`interactive_commits: true`（= default） |
| visual-plan-review.md | 17,856 | main-thread hot | Step 4、`visual_plan_review: true`（= **default**、v1.81.0 で experimental マーカー除去済み） |
| task-decomposition.md | 16,047 | main-thread hot | Step 1.5、Normal/Resume 問わず無条件 |
| session-scan.md | 15,547 | main-thread hot | Step 11、rule-extraction-active（= default true） |
| review-categories.md | 22,637 | subagent-context hot | reviewer subagent（Step 3 + Step 8、最大 2 回） |
| rule-extraction-axis.md | 10,645 | subagent-context hot | session-scan subagent、rule-extraction-active 時 |
| update-rules.md | 9,785 | flag 限定 hot | `compact_rules: true`（default 無効） |
| self-retrospective.md | 28,394 | flag 限定 hot | `self_retrospective.feedback` 設定時（default 無効） |
| workability-retrospective.md | 19,799 | flag 限定 hot | `workability_retrospective.enabled: true`（default 無効） |
| init-mode.md | 17,338 | 未使用 | `--init` 専用、Execution Mode では非読込 |

main thread の run あたり総読込 chars の下限（SKILL.md 244.6k + main-thread hot 合計 154.4k）:

- **shipped default 設定**: **399.0k chars**（Trivial task でもこの 6 ファイルは全て Read される）
- **本 repo 自身の dogfooding config**（`compact_rules` / `self_retrospective.feedback` / `workability_retrospective.enabled` を全て有効化）: 399.0k + 58.0k（flag 限定 hot 3 件） = **457.0k chars**

旧分類（grep ベースの推測）は task-decomposition.md と visual-plan-review.md を cold（限定的）と誤分類していた。前者は Step 1.5 が分割提案の有無に関わらず無条件で読み、後者は `visual_plan_review` の default が `true` に切り替わった時点（v1.81.0）で実質常時 hot に変わっている。

**手順**: (i) 第一歩として 12 references の hot / cold 実測分類（済 — 上記実測結果。F13 軽量版の読込メトリクスと半分重なるため F13 はこの結果を再利用する）、(ii) cold 化できる SKILL.md 内重量ブロック（Step 1 parsing prose / Configuration 節の二重管理 = 旧 B5 / Step 3 / Step 7 / Step 8）の切り出し、(iii) hot reference 自体の圧縮（plan-format 40k / simplicity-self-audit 45k は切り出し先の肥大でもある）。

**landed（手順(ii) 一部、subtask 1 / 2026-07-06）**: dev-workflow v1.86.5 / dev-workflow-bundle v1.96.5。Step 1 sub-step 5 の設定 parsing prose と § Configuration の重複（旧 B5）を解消し、Step 3 / Step 8 間で重複していた「Prose-integrity self-check (post-fix)」bullet を一本化。SKILL.md は 244,592 → 243,685 chars（−907 chars）。**scope 縮小**: 当初計画した Step 8 post-fix self-check 群（6 bullet）+ Step 3 の Approach-reconsideration self-audit の新規 reference 切り出しは、Step 3 plan review（peer review）で「post-fix 分岐は Moderate/Complex タスクで高頻度に発火するため、SKILL.md（常時 Read）から reference（post-fix 時のみ Read）への relocation は run あたり総読込 chars をほぼ動かさない」と指摘され scope 外とした（本節冒頭の「切り出しだけでは無条件 Read のままなら削減ゼロ」と同種の教訓）。Step 7 の重量ブロックも当初候補だったが、Concurrent rules-review / code review launch は既に共有 mechanics を cross-ref 化済みで対象外と判断。**残作業**: 手順(ii) の Step 8 post-fix self-check 群の切り出し可否は改めて要評価（未着手、tracked subtask 化はしない）。手順(iii)（hot reference 圧縮）は subtask 2 として別 run で実施予定

**リスク・上限**: No-Stall 節・runtime-referenced definitions（state 初期化 / closed list / USER GATE 宣言）は inline 残置必須（canonical rule）のため削減に上限。着地目標は hot/cold 実測後に設定する（旧版の「90–110k」は SKILL.md 単体指標の数字なので流用しない）。切り出しは既存 canonical 5 点（元節ラベル残置 + 委譲ポインタ + 逐語コピー + runtime 定義 inline + repo-wide grep 0 dangling）に従う。bundle copy 同期 + ペア bump（patch）。**切り出しだけでは無条件 Read のままなら削減ゼロ**という原則を実測から得た知見として明記する — task-decomposition.md / visual-plan-review.md は既に SKILL.md 外の独立 reference なのに main-thread hot なままの実例であり、切り出し（(ii)/(iii)）は「読込を条件付きにできる場合」にのみ効果を持つ。逆に総 chars を最も動かすレバーは flag 自体の削除（G4 stage3 の `visual_plan_review` / `polish_prose`）であり、これは G4 との単なる副次連動ではなく A1 の total-chars 指標そのものを動かす主要レバーである。

**依存**: L1 が安全網として先。G2a / G2b とセットでないと効果が経年で蒸発（旧版からの 3 週間で実証済み）。

### G2a: triage char-budget ゲート（Tier 0 — § 次の 1 手を参照）

旧 G2 から**即効の止血分**を分離したもの。task brief は § 次の 1 手に記載。A1 より先に G2b 初回パスとセットで入れる — +53%/3 週の成長率では、L1 / A1 の作業期間中も肥大が進むため。

### G2b: 月次 consolidation pass（Tier 1、A1 とセット）

**概要**: 旧 G2 の残り半分。重複 reminder の統合、reinforcement-by-repetition の妥当性再監査、同義 prose の cross-ref 化を、triage とは別の月次ルーチンとして設置。月次 pass の手順には **budget-deferred issue の re-open（再 triage への再投入）** を含める — consolidation で空きを作った直後が再投入のトリガーで、これを月次手順に割り当てないと defer queue が永久滞留する（G2a の defer 設計とペア。担当は月次 pass、triage 側は label pre-filter で skip するだけ）。

**位置づけ**: G2a が「これ以上増やさない」、G2b が「既存を減らす」、A1 が「構造で減らす」。3 点セットで初めて成長曲線が反転する。

**初回パスの前倒し（2026-07-02 user 指摘反映）**: 初回 consolidation パスは G2a とセットで 1 手目に統合（§ 次の 1 手参照 — budget-defer queue の積み上がり防止と cap headroom の確保のため。conservative 範囲限定）。本節の残り scope は**月次ルーチン化**（定常運転と、L1 後に解禁される攻めた統廃合）で、従来どおり A1 とセット。

**具体項目（2026-07-02 追加、2026-07-07 更新）**: (i) `subagent_model` governed-site 列挙の重複状態監査（旧想定は 3 箇所重複だったが 1 手目 v1.86.1 のレビューで誤りと判明 — 実在した重複は Configuration `subagent_model` bullet と Step 2 sub-step 1 の 2 箇所のみで既に解決済み。「`Agent` tool usage」bullet は別コンテンツで意図的に保護されており統合対象外。以降は月次ルーチンでの drift 定期監査として継続）、(ii) G4 が定義する version-tagged history note sunset の実行（G4 は基準定義、本 pass が実行の場）。

**landed（月次ルーチン設置 + 具体項目実行、subtask 3 / 2026-07-07）**: 月次 consolidation ルーチンを `.claude/skills/dev-workflow-monthly-consolidation/SKILL.md`（project-local skill）として設置。既存 sibling（`dev-workflow-triage` / `triage-review`）の拡張は dispatch 形状の不一致により不採用、独立新設を選択（詳細は decomposition state file `.claude/plans/dev-workflow.a1-cold-extraction-g2b-consolidation.md` subtask 3 参照）。具体項目の検証結果: (i) `subagent_model` governed-site 重複は上記のとおり 2 箇所のみで既に解決済み、dangling reference 0 件を repo-wide grep で確認。(ii) G4 history note sunset 適格性チェック — `visual_plan_review`（実際の default flip は v1.85.0 / 2026-07-02、5 日経過）、`polish_prose`（実際の default flip は v1.84.0 / 2026-07-01、6 日経過）のいずれも calendar-anchor 基準（≥4 週間 = 28 日）に未達のため、現時点で sunset 対象なし。

### B6: 設定キー削減 — G4 lifecycle 適用第 1 弾（Tier 1、G4 とセット）【新規 2026-07-02】

**landed（tombstone 部分）**: 一度 dev-workflow v1.86.4 / dev-workflow-bundle v1.96.4（2026-07-03）として SKILL.md § Configuration の closed list + Step 1 の warn チェック + README.md の対応表を追加したが、「もう存在しないキー1つのための恒久的な SKILL.md 肥大化はコストに見合わない」との user 指摘を受けて同日中に revert（`4ece3d1`、version も 1.86.3 / 1.96.3 に戻した）。tombstone 機構自体は次の実際のキー削除時に導入する方針に変更。他キーは下表の判定どおり削除非推奨 / deferred のまま変更なし

**概要**: 設定キーは 17 個（nested 含む）、Configuration 節は 22.3k chars で SKILL.md の約 9%（2026-07-02 実測）。機能的に冗長なキー（OFF 側の設定が実質的な価値を生まないキー）を G4 の告知 + 待機期間を経て削除し、config surface と分岐複雑性を減らす。価値の本体は char 削減量（第 1 弾は ~1.1k と小さい）より、**Step 1 の parse 行・タスク登録条件・context-compaction recovery 検査項目・利用箇所分岐の削減**と、G4 lifecycle の実運用開始にある。

**判定軸（user 指摘反映）**: dev-workflow は配布スキルであり、**本 repo で未使用・未設定であることは需要なしの根拠にならない**（配布先 config は観測不能で、「未使用の観測」自体が不可能）。documented 需要の一次情報（CHANGELOG 等）は削除拒否の根拠に使えるが、その逆方向（記録なし → 需要なし）は成立しない。削除側の根拠に使えるのは**機能的冗長性**（そのキーを OFF/変更しても得られる価値がほぼ無いこと）のみで、実削除はいずれも G4 stage 2.5（deprecation notice）→ 待機期間 → stage 3 を経る。

**per-key 判定表**（2026-07-02 洗い出し、peer レビュー + user 指摘反映済み）:

| キー | 判定 | 主根拠 |
| ---- | ---- | ------ |
| `task_decomposition` | **削除済み（第 1 弾、2026-07-02 — dev-workflow v1.86.0 / dev-workflow-bundle v1.96.0）** | **機能的冗長性**: `false` にして得られる価値がほぼ無い — Step 1.5 の判定自体が軽量で、単一タスクは gate なしで素通りする構造のため、ON のままでも体感差が出にくい。documented 需要も無し（CHANGELOG v1.23.0 は導入エントリのみ — 補強材料であり主根拠ではない）。**実施メモ**: 本来 G4 stage 2.5（deprecation notice）→ 待機期間 → stage 3 の順で削除する計画だったが、ユーザー判断により本 run で lifecycle を経ず即時削除（キー自体・Step 1 parse・Step 1.5 の条件分岐を撤去し、Step 1.5 は Normal sub-mode で無条件実行）。詳細は CHANGELOG.md 該当エントリ参照 |
| `workability_retrospective.backlog_dir` | **削除非推奨（user 指摘で降格）** | 出力先 placement は正当な customization 軸（例: backlog を `.claude/` 外や `docs/` 配下に置きたい運用）で機能的冗長とは言えず、配布先の未使用は観測不能。~0.7k の削減と釣り合わない |
| `review_iterations` の map 形式 `{plan, code}` | **deferred（F13 後）** | v1.57.0（2026-06-11、handoff measure M5）導入から日が浅く、per-phase 調整需要の有無は F13 実測で判断。Overlay の map-class 説明 prose は `subagent_model` が同 class として相乗りしており（Configuration の merge strategy 節）、単独廃止の実削減は ~1k 弱に留まる |
| `interactive_commits` | **削除非推奨** | CHANGELOG v1.35.0 に「external CI が commit/push する運用では `false` に」という documented opt-out 需要あり = G4 stage 3 基準に不合格。`false` は Step 10 と Step 11 rule-commit gate の両方を抑止するため、「gate decline で代替」は毎 run 最大 2 decline の UX 後退になる |
| `custom_instructions` | **削除非推奨（条件付き）** | Step 6 simplify / tidy dispatch への generic constraint channel として機能（CHANGELOG の「simplify rubric は custom_instructions 経由で」という peer レビュー済み既決定の受け皿）。CLAUDE.md / `.claude/rules` は callee dispatch payload に自動注入されないため代替にならない。A1(B5) / G2b でのチャネル再設計とセットでのみ再検討 |

**削除 mechanics**: unknown key は Step 1 Overlay で silent ignore されるため機械的には graceful だが、**silent ≠ graceful** — 挙動キーの削除は設定済みユーザーに無警告の挙動変化を起こす。削除時は G4 の tombstone 段階（§ G4 参照）+ CHANGELOG loud note（既存の default-flip note 規律の削除版）を必須とする。第 1 弾も例外ではなく、G4 stage 2.5（deprecation notice）→ 待機期間 → stage 3 の順で削除する — 「本 repo で未使用」を理由とした即削除はしない。

**確認事項（2026-07-02 追記、`task_decomposition` 削除 diff の prompt-tuning 実測）**: 上記の「unknown key は Step 1 Overlay で silent ignore される」という記述自体は empirical に正しいと確認できた（3 想定状況中、旧 `task_decomposition: false` が残留したケースで Step 1.5 は無条件実行を維持し、stale キーは無害だった）が、**この silent-ignore 挙動は SKILL.md / task-decomposition.md のどこにも明文の一般則として書かれていない** — Step 1 Overlay の一般マージ規則と sub-step 5 の個別キー parse リストという 2 つの独立した記述から推論しないと導けない。暗黙動作に依存せず挙動変化を loud 化する G4 tombstone 段階の設計思想は、この観察でさらに裏付けられる（tombstone がない限り「未知キーがどうなるか」は読者の推論任せ）。

**削減見込み**: 第 1 弾 ~1.1k（task_decomposition のみ）。本丸は G4 stage 3 の `visual_plan_review` / `polish_prose` 適用（+8–10k — 時期は G4 の時間軸 anchor に従う）で、B6 単独の即時値と混ぜて見積もらない。

### C8: review payload の tier 連動 trimming（Tier 2、F13 後）

**概要**: tier に応じてレビュー payload の**文脈量**（diff 全文 vs 要約、references 添付の有無）を軽量化（旧版から継続）。**カテゴリ削減はしない** — structural-level deep audit が iter 1 で Critical を catch する実績が rules に繰り返し記録されているため（旧版の既決定を維持）。

### C9: レビュー層間の重複読込 dedup 監査（Tier 2、F13 後）【新規】

**概要**: Step 6（simplify）/ 6.5（prose-polish）/ 7.5（rules-review）/ 8（code review）/ 9（hooks）が**同一 diff を層ごとに繰り返し読む**構造の重複コストを F13 で実測し、payload の共有・差分再送などの dedup を設計する。

**Framing 注意**: これは**層間の重複読込の削減**であり、C8 の既決定「カテゴリ削減はしない」（層内）とは別物 — 各層の検出能力は削らない。実測前に削る案にしない（「F13 実測後に判断」の依存を固定）。

### D11: 静的 effort default の残 callee 監査（Tier 2・小粒）【新規】

**概要**: 2026-06-29 に prose-polish / extract-rules / rules-review へ導入した静的 effort frontmatter default を、残る bundle / project-local callee（tidy、run-tests subagent、session-scan Agent 等）に広げるかの監査。選定 3 サブ規律（難易度非依存テスト / per-mode arch 分析 / model pin 有無の上限）は rules 記録済みなので、それに従い機械的に判定。

**注意**: ask-peer（レビュー深度がタスク複雑度に比例）と dev-workflow 本体（orchestrator の frontmatter effort はセッション全体を上書き）は対象外を維持。**動的 effort 連動は本施策の scope 外**（G3 の watch 項目 — メモリ記録の再開条件と整合）。

### D12: subagent_model の tier 別 default 値監査（Tier 2・小粒、F13 後）【新規】

**概要**: 既存 default map（`{trivial: sonnet, simple: sonnet}`、moderate / complex は inherit）の**値そのもの**を見直す監査。haiku で品質が落ちない機械的 dispatch が F13 の実測で特定できれば、該当 tier / callee の default を下げる。D10（step 別 override **機構** — Record-only 維持）とは別物で、既存機構の値チューニングのみ。

**リスク**: レビュー系 callee の品質低下。実測なしの引き下げはしない（F13 依存）。

---

## 軸 3: 高速化

### C7: Step 3 レビューの並列 fan-out（Tier 2、C6 後）

**概要**: レビュー 6 カテゴリを並列 reviewer に分けて同時 dispatch（旧版から継続）。

**効能の正しい framing**: iteration 数は減らない（finding → fix → 再レビューの直列依存）。効能は「1 iteration の wall-clock 削減」で、payload ×並列数の token コスト増と引き換え。**latency と token のトレードオフ案**として、C6（merge スキーマ）完了後に判断。

### P1: Step 11 系（Update Rules / Self-Retro / Workability）の並列化（Tier 2・探索）【新規】

**概要**: session scan は既に 3 軸共有化済み。その下流の Step 11 / 11.5 / 11.6 の**分析・生成部分**を並列 dispatch し、run 終端の tail latency を削る。

**条件**: (i) USER GATE（Step 11 compaction / 11.5 single approval / 11.6 disposition）は直列のまま — 並列化するのは gate 前の分析だけ、(ii) 書き込み先が互いに独立（`.claude/rules/` / GitHub issues / backlog dir）であることを atomicity 前提として明記、(iii) No-Stall 節の TodoWrite 遷移規律との整合を設計時に確認。効果はタスク終端の体感のみなので優先度は低め。

### B4: checkpoint resume — 契約絞り版（Tier 2・条件付き）

**概要**: step 完了ごとに状態（完了 step / tier / N_plan / N_code / base-commit / counters）を state file へ書き出し、session 切断から再開可能にする（旧版 Record-only からの条件付き昇格）。

**契約**: 再開粒度は「**直近完了 step の次から、当該 step を冒頭から再実行**」に固定（mid-step 再開は原理的に不可）。各 step の冪等性監査、write（step 完了時）/ read（resume 時のみ）の非対称設計を最初に固定。Claude Code on the Web の ephemeral 環境で run が長時間化した実需が観測されたら着手。

---

## 横断基盤

### F13: run-metrics 軽量版（Tier 1 — C8 / C9 / C7 の判断材料）

**概要**: ワークフロー実行メトリクスを Step 11.5 の `self_retrospective.feedback` に**相乗り**で emit（新チャネルは作らない — 旧版の決定を維持）。

**軽量版の項目**: tier / resolved subagent_model / dispatch 数 / 読込 chars 概算（SKILL.md + Read した references — A1 の hot/cold 実測と共用）/ stall 検出 / difficulty_skipped_steps。**counts 系（iterations used / findings 数)は C6 の構造化 return が前提**なので後段拡張。

### G3: upstream 機能置換ウォッチ（Tier 2・軽量運用）

Claude Code native 機能が in-house 機構を置換できるようになった時の検知枠（旧版から継続、watch 項目を更新）:

- **symlink bug [#53948](https://github.com/anthropics/claude-code/issues/53948) の修正** → `cp -R` 同期 + `verify-bundle-sync` + 関連 rules の撤去（E11 のモジュール分離と連動）
- **`Agent` tool の effort パラメータ公開** → effort 動的設定（tier 連動）の再開条件（メモリ記録済み）。Workflow tool の `agent()` には effort が既に公開されており、Agent tool にも来る兆候と読める
- **Workflow tool の配布 skill からの利用可否** → C7 / P1 の並列化を deterministic script で書き直せる可能性
- **built-in simplify / code-review の進化** → Step 6 / Step 8 の in-house 機構の置換可否
- **セッションタイトル設定手段の公開**（U1） → dev-workflow がタスク内容に応じてセッションタイトルを設定する軸外 UX 小粒案（§ バックログ disposition 表参照）の着手条件

運用は専用 skill を作らず、triage Pre-flight への月次 1 回チェックか手動チェックリストで十分。

### G4: 設定フラグ lifecycle 規律 — graduate 後の出口定義（Tier 1、B6 とセット）【新規 2026-07-02】

**landed**: `.claude/rules/project.rules.local.md`（新規ルール）/ 2026-07-03。本節の 4 段階 lifecycle・calendar-anchor 閾値・opt-out signal 観測チャネル・History note sunset 適格基準を project rule として正式化。History note sunset の実行（月次 consolidation パスでの適用）は本節の記述どおり G2b に委譲したまま

**概要**: 設定フラグの現行 lifecycle は experimental（opt-in、default `false`）→ graduate（default flip）の 2 段階で止まっており、フラグは蓄積する一方。出口 2 段階を追加定義する:

- **stage 2.5 — deprecation notice**: flip 後の安定を確認したら、CHANGELOG + README に「vX で削除予定。opt-out（`false`）依存があれば issue を」と告知
- **stage 3 — フラグ削除（挙動無条件化）**: 「flip から ≥4 週間 かつ deprecation notice から ≥2 週間、opt-out signal ゼロ」で削除。本リポジトリは 3 週間で 15 minor 進むペースのため「K リリース安定」ではなく **calendar-time で anchor** する（threshold を観測可能シグナルに anchor する既存規律に整合）。削除時は **tombstone**: 削除済みキーの closed list を Step 1 に 1 行残し、config に present なら warn（silent behavior change の loud 化。1 キーあたり数十 chars）。tombstone 自体も次の期間経過後に削除
- **opt-out signal の観測チャネル（closed list）**: (a) 本 repo の dogfooding config、(b) `SonicGarden/dev-workflow-issues`（self-retrospective 経由の実走行 signal）、(c) 本 marketplace repo の GitHub issues、(d) 既知利用プロジェクト（grant / b-soccer-accompany / pegasus）の config 確認。配布先の完全観測は不可能なので、「観測」から「告知 + 待機期間」への転換が設計思想

**第 1 適用候補**: `visual_plan_review`（flip = v1.85.0 / 2026-07-02。stage 3 で Plan Mode 経路・`plan_mode_active` 派生・Step 4 text path が丸ごと消え ~5–7k 削減）/ `polish_prose`（flip = v1.84.0。~2.5k 削減）。いずれも flip 直後のため stage 2.5 開始は安定確認後。

**Behavior-change / History note の sunset（同梱）**: Configuration bullet 内の version-tagged 履歴注記（「Behavior change from vX.Y.Z」「(History: v1.70.0 …)」）は CHANGELOG が canonical であるべき履歴情報。**現行挙動の説明を兼ねる段落は残し、version 参照つき履歴部分のみ**を次々 bump 後に SKILL.md 側から削除する。即時 ~1.5–2k + 将来の accretion 防止。実行は G2b 月次 pass のチェックリスト項目として実装（新ルーチンは作らない — G4 は基準定義、G2b が実行の場）。

---

## バックログ・断片メモの disposition（全件）

`.claude/improvements/` 5 件 + `.claude/plans/` stub 4 件の閉じたリスト。今後の断片は起票時に本表へ追記する。

| ファイル | 中身 | disposition |
| --------- | ------ | ------------- |
| improvements/2026-06-23-visual-plan-review-no-timeout.md | **ファイル名と中身が乖離** — 中身は verify-diff stray-output ガード起票 | **L2 に昇格** |
| improvements/2026-06-25-refactor-bench.md | リファクタ性能ベンチ skill 案 | **H1 に昇格** |
| improvements/2026-06-25-tidy-parallel-angle-split.md | tidy 並列化（改善案 C） | **H2 に昇格** |
| improvements/2026-06-25-dev-workflow-remaining-steps.md | tidy 1.4.0 run の残 step（11/11.5/11.6）実行メモ | 本資料 scope 外の実行残タスク。Step 11.5 の issue 実在確認のみ残 → 個別消化 |
| improvements/2026-06-26-prose-polish-cross-file-duplicate-comments.md | **ファイル名と中身が乖離** — 中身は run-tests flat-layout 誤検出起票 | **解決済み見込み** — restructure（PR #74、2026-06-26）で flat 配置に復帰し前提が消滅。次回 run-tests PASS 確認で close |
| plans/effort-controll.md | effort 自動設定 | 静的分は landed（2026-06-29）。動的分は **G3 watch 項目**へ（メモリ記録の再開条件と整合）。stub は archive 可 |
| plans/session-title.md | セッションタイトル自動設定（U1） | **記録のみ（軸外 UX 小粒）** — Claude Code がタイトル設定手段を公開しているか未調査。G3 watch に相乗り |
| plans/skip-after-commits.md | Step 10 後の残 step 確認 gate | **解決済み** — confirm_remaining_steps（v1.82.0）で landed。stub は archive 可 |
| plans/visual-review-step-1-5.md | Step 1.5 の visual review 化 | **U2 に昇格** |

## 旧版カタログ項目の現況

| 旧 ID | 現況（2026-07-02） |
| ------- | -------------------- |
| L1 | 未着手 → **Tier 0（次の 1 手・2 手目）** |
| A1 | 未着手（159k → 244k に悪化）→ Tier 1、指標を「run あたり総読込 chars」に再定義 |
| A2（Step 番号廃止） | Record-only 継続 |
| A3（phase 分割） | Record-only 継続 |
| B4 | Record-only → Tier 2（契約絞り版）に条件付き昇格 |
| B5 | A1 統合のまま（変更なし） |
| C6 | 未着手 → Tier 1 |
| C7 / C8 | 未着手 → Tier 2 |
| D9 | 未着手 → Tier 2（条件付き） |
| D10（step 別 model override） | Record-only 継続 |
| E11 | 未着手 → Tier 1 |
| E12 | G3 統合のまま（変更なし） |
| F13 | 未着手 → Tier 1（軽量版先行） |
| G2 | 未着手 → **G2a（Tier 0）/ G2b（Tier 1）に分割** |
| G3 | 未着手 → 継続。watch 項目に「Agent tool の effort 公開」「Workflow tool 利用可否」を追加 |
| 別資料: subagent_model 拡張（tidy / run-tests） | **実施済み**（landed） |

## 記録のみ（採用しない、再提案しないこと）

- **A2（Step 番号廃止）/ A3（phase 別 sub-skill 分割）/ D10（step 別 model override）**: 旧版の判断を維持（理由は旧版参照）
- **非対話 full-auto mode / Codex 対応**: 旧版の判断を維持
- **confirm_remaining_steps の default flip（false → true）**: 実験的機能は opt-in default という既存規律に従い当面 false 維持。polish_prose と同じく実績ベースで graduate を別途判断（コスト削減効果はあるがルール抽出という資産形成を落とすトレードオフがあるため、graduate 判断には F13 の実測が欲しい）
- **B6 洗い出しで削除非対象と判定した設定キー（再提案しないこと）**: `interactive_commits` / `custom_instructions` / `workability_retrospective.backlog_dir`（根拠は B6 の per-key 判定表参照）、`compact_rules` / `confirm_remaining_steps`（本 repo の config で `true` 設定・使用中 — 使用実績は需要の**正の証拠**として有効。逆に未使用は需要なしの根拠にならない、B6 判定軸参照。graduate 判断は上の bullet どおり F13 待ち）、`reviewer` / `language` / `check_commands` / `test_commands` / `hooks` / `self_retrospective.feedback`（core 機能）、`subagent_model`（コスト削減の能動 lever — 値の見直しは D12、governed-site 重複状態の監査は G2b 具体項目 (i) 参照）

## 相互依存マップ

| 依存 | 内容 |
| ------ | ------ |
| G2a ⇄ G2b 初回パス | 1 手目に統合（defer queue の積み上がり防止 + cap headroom 確保）。月次ルーチンとしての G2b 本体は A1 とセットのまま |
| L1 → A1 | lint が切り出しの安全網。**L1 が先、A1 が後** |
| A1 ⊃ B5 | 設定スキーマ統合は thin-core 化の 1 チャンク（旧版から継続） |
| A1 ↔ G2b | consolidation なしの thin-core 化は経年で効果が蒸発（3 週間 +53% で実証済み） |
| A1 ↔ F13 | hot/cold 実測と読込メトリクスが半分重なる。二重実装しない（A1 が導入した main-thread/subagent-context 区分は F13 の読込メトリクス設計にもそのまま転用できる） |
| C6 → C7 | 並列結果の merge は構造化 return が前提 |
| C6 → F13（counts 拡張） | counts 系メトリクスの信頼性の前提 |
| F13 → C8 / C9 / D12 | payload trimming / dedup / model default 引き下げは実測後に判断 |
| H1 → H2 | bench が並列化改修の検証基盤 |
| E11 ↔ G3 | bundle-sync モジュールの撤去トリガ連動 |
| B4 → A3 | phase 分割（Record-only）の前提。逆ではない |
| G4 → B6 | lifecycle 基準の定義が先、flag 削除の実行が後（同一 PR で G4 定義 + B6 第 1 弾を入れるのは可） |
| B6 → A1（B5 チャンク） | キーの意味論削減が先、設定スキーマの表現統合が後 — 消す予定のテキストを A1 で再構成しない |
| G4 stage 3 → visual_plan_review / polish_prose のフラグ削除 | flip 安定 + deprecation notice 期間の経過が削除条件 |
| G4 ↔ G2b | history sunset は G4 が基準定義、G2b 月次 pass が実行の場 |

## 着手順

1. **G2a + G2b 初回パス**（止血 + 空き確保 — 最優先。consolidation は conservative 範囲に限定して L1 を待たず実行、cap は consolidation 後サイズ + headroom に anchor）— 済（2026-07-02）
2. **L1**（安全網 — A1 の前提）— 済（2026-07-02）
3. **L2**（小粒・独立。1–2 の合間に随時）— 済（2026-07-03）
4. **G4 定義 + B6 第 1 弾の deprecation notice**（小粒・独立。同一 PR 可。実削除は待機期間後の別 PR。A1 + G2b の手前に置く — 消す予定のテキストを A1 で再構成しない順序を守る）— 済（2026-07-03）。**landed**: `.claude/rules/project.rules.local.md`（新規ルール、version 管理対象外）のみ。実装時のスコープ縮小（2026-07-03 user 指摘反映）: 当初 G4 の tombstone 機構を `task_decomposition`（B6 第 1 弾、着手前にすでに user 判断で lifecycle を経ず即時削除済み）へ retroactive 適用し SKILL.md/README.md に closed list + warn チェックを追加したが、「もう存在しないキー1つのための恒久的な SKILL.md 肥大化はコストに見合わない」との user 指摘を受けて revert（`4ece3d1`）。G2a/G2b/A1 の char-budget 優先方針と整合させ、tombstone の実装自体は次の実際のキー削除（例: G4 stage 3 の `visual_plan_review` / `polish_prose`）まで先送り。dev-workflow / dev-workflow-bundle の version bump も revert 済み（1.86.3 / 1.96.3 のまま変更なし）
5. **A1 第 2 弾 + G2b**（L1 完了後。第一歩は references の hot/cold 実測分類 — 済（2026-07-06）、§ A1 参照。残りは 3 subtask に分解して実行中 — decomposition state file: `.claude/plans/dev-workflow.a1-cold-extraction-g2b-consolidation.md`）
   - subtask 1（A1(ii) の一部 — SKILL.md 内重複 prose の dedup、scope 縮小版）— 済（2026-07-06）、§ A1 の landed note 参照
   - subtask 2（A1(iii) — hot reference 圧縮: plan-format.md / simplicity-self-audit.md）— 未着手
   - subtask 3（G2b — 月次 consolidation ルーチン設置 + subagent_model governed-site 重複監査（解決済み確認） + G4 history note sunset 適格性チェック（対象なし））— 済（2026-07-07）
6. **C6** → **F13 軽量版**（→ C6 完了後に counts 拡張）
7. **E11**
8. 実需・実測の観測後に個別判断: C7 / C8 / C9 / D9 / D11 / D12 / H1 → H2 / U2 / P1 / B4（+ B6 deferred 分 = review_iterations map 形式の廃止判断、G4 stage 3 = visual_plan_review / polish_prose のフラグ削除判断）
