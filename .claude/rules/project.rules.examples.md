# Project Rules - Examples

## Principles Examples

### bundle スキルと dev-workflow-bundle のペア bump
**Good**: `### dev-workflow v1.34.2 / dev-workflow-bundle v1.34.2` の対形式で CHANGELOG subsection 見出しを書く。**Bad**: `### dev-workflow v1.34.2` のみ — `dev-workflow-bundle` の対が抜けると bundle 配布 version が静かに古いまま残る。

### `Edit` での marketplace.json version 書き換え
**Good**: `old_string` に name の閉じる `"` と trailing `,` まで含める（例: `"name": "dev-workflow",` + 周辺 + `"version": "1.34.2",`）→ `version` だけ書き換え。Edit 直後に `jq empty .claude-plugin/marketplace.json` で syntax 確認、`replace_all` は禁止。**Bad**: `old_string` が `"name": "dev-workflow"` だけ → `"dev-workflow-bundle"` prefix と被って not-unique error。

### bookkeeping commit の分離
**Good** (commit log): per-Finding fix と version bump が別コミット (`fix(dev-workflow): ...` と `chore(release): bump ... (auto-triage YYYY-MM-DD)` を分離)。**Bad**: `fix(dev-workflow): ... + bump version` で混ぜると「1 accepted Finding = 1 commit」「scope check」の意味が薄れる。

### Routine スキルの per-invocation 件数 cap heuristic
**Good**: `gh issue list --limit 50` + cap 到達時 `overflow=true` を Step 4 summary に明記。**Bad**: `--limit 200` — 1 routine 走行で順次 triage すると subagent dispatch が積み重なって walltime が膨らむ。

### 0-item 経路の multi-row flip
**Good**: 0 件 skip 時は Step 2/3/3.7/4 を **single TodoWrite call** で `completed` 一括遷移。**Bad**: phase 行ごとに別 call → call 間でターン跨ぎ停止誘惑が入る。

### Forward jump pointer for skip path
**Good**: 短絡 path 末尾に `Skipping does not bypass the reminder dispatch — apply the dispatch at the end of § Close decision.` 形式の forward jump を明示。**Bad**: `On title mismatch, skip the issue and continue.` のみ → 「skip = 何もしない」と誤読されて下流 reminder dispatch が抜ける。

### 並列 reminder dispatch（runtime variant 選択）
**Good**: issue-loop boundary に Reminder #1 (more issues remain) / Reminder #2 (last issue) を並列に prose 記述、両 variant とも closed-list `(regardless of outcome — accepted, rejected, parse-error, title-mismatch-skip, any non-error result)` + next tool call 明示 + `§ No-Stall Principle` 参照で structural 整合。**Bad**: 位置を分散すると agent が決定点で参照しにくくなる。

### `~/.claude/` 配下は Claude config root
**Good**: `jq -r '.hooks.Stop // empty' ~/.claude/settings.json` のように `~/.claude/` 配下を直接参照可（Claude Code 標準 config root）。**Bad**: `/Users/alice/.claude/settings.json` のような特定 user の絶対パス埋め込みは配布性違反。

### Cross-skill 構造的衝突の orchestrator + callee documenting
**Good**: orchestrator (`dev-workflow-triage/SKILL.md`) に canonical write-up（`## Stop hook structural conflict` で Conflict mechanism + Correct behavior を full 記述）、callee (`verify-diff/SKILL.md`) は `§ Scope check boundary` 周辺に 2–3 文の short note + stable heading 参照のみ。**Bad**: callee 側で canonical を full 再記述すると orchestrator 側更新が伝播しない／冗長。

### Per-turn environment-induced spurious feedback を non-fatal class に列挙
**Good**: `§ No-Stall Principle` 内で `Per-Finding/issue: comment-failed/close-failed/commit-failed` と `Per-turn (environment-induced): stop-hook spurious fire` を並列に列挙（disposition 同じだが粒度を分けて明示）。**Bad**: per-turn class が抜けると agent が hook フィードバックを fatal 扱いして即 commit する誤動作経路が開く。

### Callee-side fenced JSON return contract for stall-prone sub-skills
**Good**: callee SKILL.md 末尾に `## Return contract` 節 + 単一 fenced JSON block (`{"status": "no-actionable-findings"|"applied-edits"|"notes-left"|"error", "applied_edits_count": <int>, "notes_remaining_count": <int>, "reason": "..."}`) を必須化、caller が parse して `record.skill_review` にマップ。**Bad**: free-form prose checklist のみ → turn 全体を消費して return-point reminder では救えず stall。

### Orchestrator-side verdict parse-failure handling
**See pattern**: `### Callee-side fenced JSON return contract for stall-prone sub-skills` — orchestrator counterpart: (d2) で末尾 JSON を parse し `no-actionable-findings`/`applied-edits`/`notes-left`/`error`/parse-failure を mapping table で `record.<callee>` に変換、`error`/parse-failure は loop terminate / no retry / error counter increment。`judge the result and proceed` 一行だと callee contract 破綻時 orchestrator が無限 loop か沈黙落ち。

### bundle 内 review 系スキルの Pattern A 統一
**Good**: review walk は fresh subagent で実行（Pattern A — `verify-diff` / `rules-review` と同形）、Edit application は main thread に残して reviewer を bias-free に保つ。non-interactive routine 呼び出しを想定し prompt しない。**Bad**: main thread inline 実行は bias-free executor 不在 + review prose が main context に積もる + bundle 内 design pattern 乖離。

### Standalone interactive-only path の deprecate
**Good**: structural change は常に `notes_remaining_count` に集計し apply しない（caller が verdict + notes を見て判断、skill 自身は user-confirm dialogue を持たない）。**Bad**: `Confirm with the user first ... When invoked as a sub-skill, do not wait` のような mode 分岐 — live caller が両方 sub-skill mode で interactive path 到達不能の silent dead-code（caller 側で mode を渡す術もない）。

### Agent unavailable fallback の cross-reference 圧縮
**Good**: canonical write-up へポインタ + 1 行 specialization のみ（例: `**Agent unavailable fallback**: detect availability and fall back per the canonical write-up in rules-review SKILL.md § 5. Review ...`、skill-review specialization は fenced JSON 共通化のみ 1 行追加）。**Bad**: 毎回 3 段落 inline で書き直す → canonical 更新が他 callee に伝播しない / 冗長。

### `--- LABEL ---` fence convention for Pattern A dispatch prompts
**Good**: dispatch prompt を `--- BEST PRACTICES CHECKLIST ---` / `--- CHANGED FILES ---` / `--- REVIEWER PROMPT ---` / `--- RESPONSE FORMAT ---` のような `--- LABEL ---` fence で区切る（`verify-diff` Step 3 (a) 由来）。**Bad**: ad-hoc な `## Sub-heading` 方式は subagent 側で section 終端境界が曖昧 + bundle 内流儀が揃わない。

### Pattern A callee return JSON の first-match-wins parse-order
**Good**: subagent fenced JSON を **first match wins** で evaluate-in-order: (1) Verdict missing/malformed → `{"status":"error","reason":"verdict parse failure"}` stop、(2) Schema violation → `{"status":"error","reason":"verdict schema violation"}` stop、(3) Otherwise → apply。`verify-diff` § (b) と同規律、single-pass dispatch では (3) Converged / (4) Divergence は N/A なので圧縮。**Bad**: 評価順序を implicit にすると runtime 再現性崩れ + verify-diff との対応が読めない。

### Subagent return JSON の per-entry shape validation
**Good**: Schema violation check で top-level keys 不在に加え entry-level shape (`file` / `old_string` / `new_string` / `description` が non-empty string、`Edit` の `old_string` だけでなく downstream tool が dereference する全 routing field — 例 `publicity_review.remaining_findings[].file` → `git checkout HEAD -- <path>`) を parse 時検証 → schema violation で停止。**Bad**: top-level only だと後段 `Edit` / `git checkout` が malformed entry で crash する経路が残る (iter 2 Major finding 頻出)。

### `old_string` 1–3 lines context convention in dispatch prompts
**Good**: dispatch prompt 内に `> old_string must match exactly one location ... Include 1–3 lines of surrounding context so the snippet is unique` を明示。apply 段では per-entry re-Read → Edit、`old_string` 不在は **no-op fallback** として skip（multiple edits 同 snapshot 由来の overlap 原因なら quality drift ではない）、`applied_edits_count` の increment は Edit 成功 entry のみ。**Bad**: convention 無し / skip 扱い未定義 → short one-liners collide → retry-dispatch loop → subagent quality drift と誤帰因。

### Aggregate counter warning string differentiation
**Good**: 同 `notes_remaining_count` でも sub-condition 違いで warning 文字列を differentiate (`skill-review notes left after applied-edits (3)` / `skill-review notes left after max iters (1)`)、SKILL.md にも区別意図を 1 行明記。**Bad**: `skill-review notes left (3)` / `(1)` の同一文字列集約 → user が sub-source を identify できず原因切り分け不能。

### CHANGELOG entry での過去 commit 参照
**Good**: 過去 commit 参照は `auto-triage #6` 形式で既存 entry スタイルと一貫させる。**Bad**: 生の commit hash (`fcf70b2` 等) を埋めると repo の reword / rebase で安定性が下がる + 既存 entry の `auto-triage #N` 参照スタイルから外れる。

### CHANGELOG `Category:` token の closed taxonomy
**Good**: `Category:` token は closed list（`missing-branch` / `ambiguity` / `wrong-default`）から選択。新 failure mode は既存 3 種にマップ可能か再検討（例: 「default 値が skill-bundle internal だった」= `wrong-default`）。**Bad**: `distribution-leak` / `scope-leak` のような新規記述的 token 発明は taxonomy 一貫性が崩れる。

### bundle skill SKILL.md prose のメタ文脈語彙汎化
**Good**: 主文に抽象原理（`shared base classes, cross-cutting middleware, return/API contracts, mirrored services, parallel route handlers`）を書き、skill 開発文脈の具体例（`subagent dispatch shape, hook wiring, state-file handling, return-contract design`）は括弧書きで添える。**Bad**: 適用文脈固定の語彙を主文に直接埋めると、bundle skill を skill 開発以外で利用する読者に読み解きづらい。

### Pattern A iteration loop skill の `allowed-tools` baseline mirror
**Good**: sibling Pattern A skill (`verify-diff`) の `allowed-tools` を mirror、`TodoWrite` 必須（`Read, Edit, Agent, TodoWrite, Bash(git diff *), Bash(git rev-parse *), Bash(git checkout HEAD -- *)`）。**Bad**: `TodoWrite` を declare し忘れると non-interactive routine から呼んだ時 permission dialog で停止。新規 Pattern A skill 追加時は sibling と 1 行 diff で照合する。

### Iter loop の (a) Dispatch sub-step での選択的 re-Read
**Good**: iter 1 = `affected_files` 全件 Read、`i ≥ 2` = 直前 iter で `suggested_edits` 成功した path subset のみ re-Read（untouched files は iter-1 snapshot 保持）、`git diff <Base ref>` も `i ≥ 2` で再実行して累積 edits 反映。**Bad**: 毎 iter で全件 Read すると main-thread context が肥大し token 効率も悪い。

### 集約サマリでの source-of-truth labeling
**Good**: counter を複数 sub-source から render する場合、どちらが canonical かを 1 行明記（例: `**Source of truth: the warning strings recorded by (d3) ... not the per-Finding record.publicity_review token (which stores a count only).**`）。**Bad**: source 明記なしだと後追い triage で「どちらの値を信じるか」が判断できない。

### orchestrator render の `<max_iterations>` ハードコード
**Good**: orchestrator が callee ごとに渡す max iter 値を denominator にハードコード（`verify_diff: [iter <iterations_used>/3]`, `publicity_review: [iter <iterations_used>/2]`）。**Bad**: `<max_iterations>` プレースホルダのままだと caller がどの値を渡しているか読めず、複数 callee で異なる max を使う場合 denominator がブレる。

### Mode determination の 3 分岐契約 (all/none/partial)
**Good**: All-present → explicit-args mode、All-absent → auto-derive mode、Partial (1〜N-1) → early return with `{"mode":"explicit-args","status":"error","reason":"incomplete args"}` (silent fallback せず loud bug signal)。**Bad**: 「1 つ以上指定で explicit-args、空で auto-derive」 → caller のテンプレ書き間違いが silent に通って後追いで mode 判別不能。

### Pattern A iter loop の inferred-state iter-1 fixing
**Good**: `inferred_intent` のような毎 iter 再推論される値は iter 1 verdict から main-thread context に capture して per-skill loop 中固定 (iter 2+ 値で上書きしない、divergence 比較から除外、iter 1 verdict なし経路は `null`)。**Bad**: 毎 iter 上書きすると per-target verdict が「単一の安定した推論値」を報告できず、divergence 比較が noisy で収束しない。

### Mode-specific empty-input disposition
**Good**: caller framing がある explicit-args では empty-diff = `conflict` (bug signal)、無い auto-derive では empty-diff = `skipped` (informational)。**Bad**: mode 区別せず一律 `conflict` だと auto-derive で「空 = bug」と断定する根拠がない。

### Mode-additive status enum extension
**Good**: 新 mode が追加した status 値は「mode-only」と明記 (`partial` is **auto-derive-only** and is never emitted by the explicit-args mode contract)、既存 caller の 4-value enum 互換性を契約として守る。**Bad**: 全 mode で 5-value 列挙すると既存 caller の switch 文が `partial` を取りこぼし dead code path で沈黙落ち。

### Multi-target safety-rail の pre-check before global revert
**Good**: per-Edit pre-check で `out_of_scope` path を skip（実 write 無し → revert 不要）、`reverted_paths` は informational only。**Bad**: write 後に global `git checkout HEAD -- <sibling-path>` で revert すると、multi-target loop で T1 executor が T2 path に edit を返した場合 T2 で既に landed した sibling edits を wipe する collateral damage 経路が開く。

### i18n 機能 documenting の英語 meta-prose と paired bilingual sample 分離
**Good**: meta-prose は英語、bilingual sample は paired demonstration として括弧書きに併記 (例: `(e.g.  '品質ゲート（check_commands / Step 7.5）' for language: ja, 'quality gate (check_commands / Step 7.5)' for language: en)`)。**Bad**: Japanese meta-prose は「実装物は英語で記述する」ルール違反 + Japanese-only sample は rules-review で borderline flag される。

### 配布性ルール scope clarification: same-bundle self-reference
**Good**: 同 SKILL.md 内 self-reference (`Step 4 / Step 7.5 / Step 8`) や同 bundle 内 sibling skill 名（`rules-review` / `simplify` / `extract-rules`）の参照は **配布性ルール違反ではない**（reject 理由として明記）。**Bad**: self-reference まで一般化（"the user-judgment gate" 等）すると SKILL.md 内 cross-section reference の可読性 / トレーサビリティが下がる。配布性ルールは out-of-bundle vocabulary を防ぐもの。

### 同 SKILL.md 内 sibling iteration loop の return-point reminder symmetric coverage
**Good**: 同型 iter loop（Step 3 Plan Review / Step 8 Code Review が両方とも `Skill(<reviewer>)` を呼ぶ N-iter loop）両方に `**Return-point no-stall reminder**: At each iteration boundary (regardless of reviewer outcome — findings reported, "No actionable findings", any non-error result), the next action ... must be issued in the **next tool call**. See § No-Stall Principle.` を同型配置。**Bad**: 片方にだけ reminder を置くと reminder 無い loop 境界で stall 再発（別 loop の reminder は active prompt として参照されない）。

### Free-form prose verdict reviewer skill の stall リスク認識

**See pattern**: `### Callee-side fenced JSON return contract for stall-prone sub-skills` — 全 reviewer-style sub-skill (`ask-peer` Severity 階層含む) に class-level extend。Structured-looking Markdown は fenced JSON return contract の代替にならず、reminder は決定の瞬間で参照されないため prose verdict が turn 全体を消費する stall が再発する。新規追加 / stall 観測時は callee SKILL.md 末尾に fenced JSON 導入を検討。

### project-local skill の version-bump 適用範囲
**Good**: 対象 skill が `.claude/skills/` 配下 project-local（`marketplace.json` 無し、`plugin.json` 無し）なら version bump / CHANGELOG ペア bump ルール対象外として reject（`grep -c '"name": "<skill>"' .claude-plugin/marketplace.json` で確認）。**Bad**: project-local skill にまで accept で過剰適用すると、運用しない version 番号 / entry が積み上がる。

## Project-specific Patterns Examples

### `jq` の `null` 文字列フォールバック
**Good**: filter 内 `// "unknown"` + post-pipeline `-z` ガードの 2 段構え (`producer_version=$(jq -r '(.plugins[] | select(.name == "<n>") | .version) // "unknown"' file 2>/dev/null); [ -z "$producer_version" ] && producer_version="unknown"`)。**Bad**: `jq ... || echo unknown` のみ — entry 不在時 `jq` は literal `null\n` を zero exit で出すため `||` 不発火、文字列 `"null"` が下流に流れる。

### detached HEAD ガード
**Good**: Pre-flight で `git symbolic-ref -q HEAD >/dev/null` non-zero exit を以って detached HEAD を early detect、abort で理由を summary に出す。**Bad**: `git rev-parse --abbrev-ref HEAD` だと detached HEAD で `HEAD` literal を返し、後段 `git switch "$original_branch"` が「HEAD という名前のブランチ」を探して fail。

### `refs/heads/<glob>` の single-quote
**Good**: `git for-each-ref --sort=-refname 'refs/heads/triage-*' --format='...'` で single-quote。**Bad**: unquoted `refs/heads/triage-*` だと zsh の `nomatch` option がマッチ無し時に shell abort、`zsh: no matches found` で routine が silent halt。

### Run-level invariant の Pre-flight への hoist
**Good**: per-loop iteration で繰り返し resolve する不変量（`current_version` from marketplace.json、`changelog_content` from CHANGELOG.md 等）は Step 1 Pre-flight に hoist して 1 回だけ resolve / Read、loop 内では cached value を参照。**Bad**: per-Finding loop 内で毎回 jq / Read すると N×M で累積、Simplify 段階で頻出 fix。

### disposition enum 拡張ではなく既存 enum の厳格化
**Good**: 既存 reject criterion #1「Already addressed」を **2-leg AND test** で具体化（(i) CHANGELOG 該当 entry あり AND (ii) 現 SKILL.md で再現せず、両方 cited、片方でも doubt なら fall-through）、新 disposition value は追加しない。**Bad**: 新 disposition value (`already-addressed-version` 等) を発明 → downstream parser / mapping table / status enum 全部 update + 後方互換性も崩れる。

### counter 増分は「zero exit only / 失敗 path には without incrementing 明記」
**Good**: 成功 (`Zero exit: increment ... by 1`) / 失敗 (`Non-zero exit: record ...-failed. **Do not increment ...**`) 両分岐で increment 命令を **symmetric に明示**。**Bad**: 失敗側で increment 命令を省略すると「省略 = increment しない / 暗黙 increment」が両解釈可能で bistability。

### dead flag よりも単一 counter で cleanup 条件を表現
**Good**: counter 単独で cleanup 条件を判定（`If triage_commit_count == 0 and bookkeeping_skipped, run auto-cleanup`）。**Bad**: `triage_branch_active` のような boolean flag + counter の合成 — fatal abort path は判定 path を通らないため flag が判定に寄与せず dead flag になる（Code Review iter 1 の「dead flag drop」finding パターン）。

### Run-level 失敗系は per-Finding edge-case 表に混ぜない
**Good**: SKILL.md Pre-flight 節に Run-level failure (`branch creation failed` / `detached HEAD` 等) を手続き的に記述、`references/triage-criteria.md` Edge-case 表は per-Finding loop 内 case (`marketplace.json 不在` / `Finding 文字列 malformed` 等) のみ。**Bad**: 同 Edge-case 表に混在させると Run-level / per-Finding semantics scope が混ざり読み手の判断が曖昧。

### Step 6 Simplify の rationale 段落は brevity を保つ
**Good**: technical context を 2 文に圧縮（例: `Resolve <X.Y.Z> via jq's in-filter // "unknown" plus a post-pipeline -z guard. The || echo fallback alone misses the case where jq outputs the literal null\n with zero exit (entry / key absent).`）。**Bad**: 100+ words の rationale 段落 — 配布スキル prose は brevity 要件、Code Review iter 2 で「英文 clarity / 冗長」として上がる頻出 finding。

### Branch behavior は completion で specify する（negation 禁止）
**Good**: 共通動作を「Full set (applies to both `<status-A>` and `<status-B>`)」として上に立て、分岐固有の差分だけを下の「Branch-specific actions」で列挙する 2 階層。**Bad**: `same record writes ... except` の negation specify は `iterations_used` / `warnings[]` 等 aggregation field が hidden gap になる（Code Review iter 1 Critical finding）。

### Pre-implementation smoke test (Step 0) for undocumented platform capabilities
**Good**: Step 5 Implement 前に Step 0 Pre-implement smoke test を必須 phase として Test plan に組み込む（feasibility / tool inheritance / state-machine simulation / audit-trail の 4 項目で gate、wording は「必須」で統一、overall verdict ∈ {READY-TO-IMPLEMENT, NEEDS-FALLBACK, BLOCKED}）。前例なし platform capability 依存の architectural rewrite では必須化。**Bad**: Risks に「推奨」表記だけだと iter 2 Major finding 頻出。

### Dispatch-layer health と callee-layer health の counter 分離
**Good**: dispatch-layer error path (E.1/E.2/E.3) は `D_dispatch_error_count` のみ advance、per-callee disable counter (`<skill>_disabled`) は increment も reset もしない（callee は走っておらず per-callee health 情報なし）。Step 4 aggregate で別行 render（dispatch-layer state と per-callee state を独立 observability axis として保持）。**Bad**: 1 counter に集約すると dispatch-layer / callee-layer error の区別が aggregate で読めず observability 崩壊。

### Sequential N-callee orchestration を 1 Agent dispatch に集約
**Good**: per-Finding で連続する `Skill(callee-A) → Skill(callee-B) → Skill(callee-C)` を 1 個の `Agent` (subagent_type: general-purpose) dispatch にまとめ、aggregate JSON (`status` ∈ {`ok`, `callee-abort`, `error`}, `outer_iter`, `outer_exit`, plus nested per-callee return fields) を返す。orchestrator stall surface を N→1 に削減、subagent prompt で「**Do not run further `Skill()` dispatches beyond the enumerated**」を明示。**Bad**: sequential `Skill()` 直呼びは N decision points 各が JSON-echo turn-end stall opportunity 化、reminder 系 prose discipline は diminishing returns。

### Bold-prose label cross-reference style
**Good**: bold-prose label を参照する場合 `§ <Heading>'s "<bold label>" paragraph` 形式で bold 内文言を verbatim で囲み込む（例: `§ Apply accepted Findings's "Per-Finding record kept in memory" paragraph`）。**Bad**: 存在しない heading に dangling reference (`§ Apply accepted Findings record schema`) — Code Review Major finding として上がる。

### Sibling enum field の symmetric extension audit
**Good**: 並列 sibling enum (`record.verify_diff` / `record.skill_review` / `record.publicity_review` 等) に新値（例: `error`）を追加する場合、全 sibling に **symmetric に追加**、aggregate render の switch 文も全 enum を網羅。**Bad**: 片側だけ asymmetric に拡張すると aggregate render で取りこぼし（Code Review iter 2 / iter 3 の class-level extension audit で finding 化）。

### Plan rewrite triggered by user material change at Step 4 gate
**Good**: user material change 後の plan は 1 pass で end-to-end rewrite — Title から旧 approach 由来語句削除、Context / Goal / Approach 全置換、Decisions の Recommendation/Alternative を swap (user 既選択を Recommendation に annotation 付き)、Risks は新 approach 固有 unknowns に完全置換、Step 3-(N+1) で再 review iter してから ExitPlanMode 再提示。**Bad**: 旧記述を残したまま新記述を併記すると plan size が肥大化、Step 3-(N+1) reviewer に「buried decisions / scope creep」と再指摘される。

### Routine-side action ownership over environment-finalization delegation
**Good**: routine 自身が `git push` を once per run（Step 4 末尾の単一箇所、cleanup 判定後 / summary stdout 直前）で実行、`allowed-tools` に `Bash(git push *)` 追加、session-level "designated branch" rule との conflict 文脈を SKILL.md 内に明記（`consolidating into a different name loses same-day re-run stacking semantics and disconnects the operator's PR identity from the run timestamp` 等の design-intent rationale）。**Bad**: 「環境が代行する (`session finalization handles pushes`)」宣言は session-level rule との衝突点が SKILL.md 内に欠落 + local 環境では暗黙に push が落ちる feature parity 欠落も発生。

### Closed form-set invariant for multi-form summary tokens
**Good**: `triage-branch:` summary line の form 数を **closed list として 3 に bounded** (push success / push-failed / created-and-deleted)、partial-cleanup failures は別 warning line (`cleanup: switch back failed (...)` 等) に分離。**Bad**: 新 form (`partial cleanup: switch back failed` 等) を追加すると form 数が 5 に膨張、後追い読み手が switch 漏れする。

### External-command failure: retry once + stderr-derived `<reason>` + no auto-recovery
**Good**: retry は **1 回のみ、1–2 second sleep**、`<reason>` は stderr 最終 non-empty 行を **≤ 80 文字 truncate**（空 / whitespace-only なら `(no stderr)` fallback）、`Do not auto-recover (no force push, no rebase, no branch rename)` 明示禁止。**Bad**: exponential backoff 4 段 retry は deterministic rejection (auth / non-fast-forward / hook) には無効で over-spec、`<exit reason>` 抽出仕様未定義、auto-recovery 禁止文言なしだと downstream LLM が `rebase してから retry` を hallucinate。

### Mis-justification audit when citing infrastructure mechanisms
**Good**: 禁止条項を design-intent ベースで justify（「per-run isolation を失う」「operator の PR identity が run timestamp と切れる」）。**Bad**: 引用先 mechanism の挙動を一次情報で確認せず誤引用（例: `git for-each-ref requires prior-run triage-* to survive on origin` — 実際は local refs のみ参照）— peer review iter 1 で Major finding として上がる。

### Cross-section rendering-authority pointer (computed-here / rendered-there)
**Good**: 「section A で compute、section B で render」設計では両 section に **明示的相互参照ポインタ**を置く（A 冒頭に `Run before § B (A determines rendering of 0-commit form only — >0-commit form is decided by § B below)`、B 冒頭に `Run after the auto-cleanup decision settles, before emitting the summary stdout`）。**Bad**: 片方向のみ / 相互ポインタ無しだと実行順 / 最終 render 確定権が prose から読めず、後追い読み手は section 順序と code 読みで再構築する必要がある。

### Agent definition (`.claude/agents/<name>.md`) frontmatter `allowed-tools` requirement
**Good**: agent frontmatter に callee 3 skills の `allowed-tools` union + `Skill(<name>)` 参照を明示（`allowed-tools: Read, Edit, Agent, TodoWrite, Skill(verify-diff), Skill(skill-review), Skill(publicity-review), Bash(git diff *), Bash(git rev-parse *), Bash(git checkout HEAD -- *)`、`Bash(*)` 避けて callee と同じ glob 粒度）。**Bad**: `allowed-tools` が抜けると subagent 内 `Skill()` 呼び出しが permission denied で fail、`/verify-plugins` の構造検証では検出されず実 routine 走行で初めて surface する silent failure。

### Subagent inline-execution prohibition for `Skill(<callee>)` dispatches in agent definitions
**Good**: agent 定義に独立 `## Dispatch discipline` 節を新設、3 段落の意図的重複で reinforcement — (i) positive obligation (`Each callee MUST be invoked via its Skill(<name>) tool call. Do not read, interpret, or replicate any callee's SKILL.md logic inline`)、(ii) concrete restatement (`when the Flow says "dispatch Skill(verify-diff)", issue a Skill(verify-diff) tool call and wait for its return. Do not substitute your own evaluation`)、(iii) closed-list bound (`Do not run further Skill() dispatches beyond the three enumerated`)。callee 内部スキーマの具体的 field 名は書かない。**Bad**: `Dispatch discipline` 節欠落だと callee SKILL.md が context injected され、subagent が inline 実行 → schema violation 連続 fail → `D_dispatch_disabled = true` で残り全 Finding skip。

### Routing-identifier permissive / content strict layering
**Good**: identifier layer は permissive（title format は廃止 / grammar 揺れ許容、body parse が canonical discriminator）、content layer は strict（4 required fields, enum 検証、parse-error conditions が triage validity を gate）。**Bad**: identifier layer に `^\[auto-retrospective\] dev-workflow-bundle: \d+ findings` のような strict check を残すと `1 finding` 単数形が silent skip / trailer 欠落で本来 triage 可能な issue が parse-error に倒れる。

### Vacuous-truth gap in per-element ALL-quantifier close predicates
**Good**: close decision を 2-leg AND predicate で表現 — (i) whole-state gate (`body parse produced at least one Finding entry — i.e. this is NOT a whole-issue parse-error path`) AND (ii) per-element check (`every parsed Finding was either accepted or rejected with reason cited`)。SKILL.md prose に `Per-element ALL-quantifier alone is insufficient — must be gated by whole-state predicate to avoid vacuous-true regression on empty / aborted state` の注記。**Bad**: per-element 単独だと whole-issue parse-error で空 Finding 配列が vacuous-true 通過し auto-close 起動（Step 3 で見落とし Step 8 Code Review Critical で catch）。

**See pattern**: `### Sibling enum field の symmetric extension audit` — same class-level extension audit applies cross-file (SKILL.md closed list ↔ `references/*.md` table); add new case to both files in the same commit, embed `Source of truth: SKILL.md ... keep in sync` directive in the reference file. Skipping the reference side surfaces as Major cross-file inconsistency finding in Code Review iter 2+.

### Step renumbering propagation (Generic rule + Individual overrides)
**Good**: Plan の Design 節で 2 階層に記述 — (i) Generic rule (mechanical sweep): 旧 Step N → 新 Step M の単純置換が安全な参照を列挙、(ii) Individual overrides (mechanical sweep を適用しない): 旧 `Runs after Step 9` が新番号で当該 hook 自体が Step 9 になる等の semantic 誤りを避ける line 別 override、line 番号は pre-edit reference 明記。**Bad**: 全部 mechanical sweep だと `on_complete: Runs after Step 9` が `Runs after Step 11` に上書きされ意味的誤り。

### TodoWrite single-row for unknown sub-iteration count
**Good**: sub-iteration count が user-approval input に依存する Step（Interactive Commits 等）は per-iteration row に展開せず **single row のまま登録**、annotation で「count is not known until the proposal phase」と明示。**Bad**: per-commit row (`Step 10-1` ... `Step 10-N`) 展開は N 未確定で registration 不能、mid-flight 書き換えで stall surface が増える。

### Behavior-change default-flip → CHANGELOG opt-out note + downstream automation visibility
**Good**: CHANGELOG entry 冒頭に **opt-out 手順を loud に表記** (`**Default: enabled** — set <flag>: <old-default> in <config-path> to opt out`)、Risks 節 / CHANGELOG note に **downstream automation 注意喚起** (minor bump では signal 強度不足の可能性、CHANGELOG note で visibility 確保)。**Bad**: minor bump 単独だと default flip が entry から読み取れず、CHANGELOG を読まない自動 update CI で silent breakage。

### Multi-form gate vocabulary disambiguation in § No-Stall Principle
**Good**: 各 gate を別 bullet で列挙し vocabulary を明示分離 — commit-plan approval / per-commit accept (accept/adjust/cancel) / fold-or-defer (binary classifier `fold`/`defer`/`cancel`、per-commit accept enum とは区別) / ambiguous-adjust clarifier。各 gate の canonical token classifier を `§ Step <N>'s "<paragraph label>" paragraph` で参照。**Bad**: 1 bullet merge は fold/defer binary semantics と accept/adjust/cancel 4 値 enum が conflate して取り違え。

### `git status --porcelain=v1 --untracked-files=all -z` canonical pattern
**Good**: `git status --porcelain=v1 --untracked-files=all -z`（`=v1` format pin + user config override + `-z` で C-quoting 抑制し space / quote / non-ASCII 復元可能）、stage は `git add -- "<file-1>" "<file-2>" ...` 単一 invocation で pathspec 明示、`-A` 禁止（unrelated drift staging）。Untracked は `Read` で new-file hunk として presentation。**Bad**: `git status --porcelain` (`-z` 省略) + `git add -A` だと filename space で C-quoted mismatch + unrelated drift staging。

**See pattern**: `### \`git status --porcelain=v1 --untracked-files=all -z\` canonical pattern` — companion: `git diff <base-commit>` omits untracked files by design; use `Read` for new-file hunk and mark untracked-vs-modified explicitly in UI.

### Counter lifecycle: zero-exit-only increment + amend exclusion
**Good**: counter (`landed_count` / `triage_commit_count` 等) の 4 点 explicit — (i) loop 開始 0 初期化、(ii) landing zero exit で +1、(iii) retry / abort / commit-failed 経路は increment しない、(iv) `--amend` で同 logical commit を更新した場合は再 increment しない。SKILL.md に `On zero exit, increment ... by 1` / `The amend re-commits the same logical commit — ... is not re-incremented` を symmetric に明示。**Bad**: 増分条件が ambiguous だと downstream routing の bistability 崩壊。

**See pattern**: `### Counter lifecycle: zero-exit-only increment + amend exclusion` — companion: downstream routing は config-flag intent (`interactive_commits: true`) ではなく **actual counter** (`landed_count > 0`) で分岐すべき。flag は「やる予定」、counter は「実際に起きた」。flag 判定だと `enabled-but-skipped` case を「already committed」branch に mis-route する silent regression。

### 2-stage grep audit for cross-file Step renumbering
**Good**: 2 段 grep — (1) phrase-pair-only grep（旧 section heading 句の OR）で 0 hit 確認、(2) word-boundary grep on bare numbers で残り hit を目視確認（新番号 semantics 下の正規参照は OK / 誤って旧番号のまま残った参照は flag）。line 番号は pre-edit reference、最終確認は phrase / heading anchor。**Bad**: broad grep のみ (`grep -rn "Step 9"`) だと旧 heading 残骸と新正規参照が両方 hit し切り分け不能。

### Token defined-once + cross-reference (re-render 禁止)
**Good**: localized token / enum mapping のような複数箇所参照 token は **1 箇所定義 + 他箇所は cross-reference**（例: `§ Step 10` で defined、`§ Completion` は `emit the localized partial-completion token defined at § Step 10's "Localized summary tokens" paragraph` で参照）。**Bad**: 2 箇所に re-render すると canonical 更新が伝播せず drift（i18n token は wording 更新頻度高く drift リスク大）。

**See pattern**: `### Plan rewrite triggered by user material change at Step 4 gate` — swap-direction specialization: user choose Alternative → Recommendation/Alternative swap + 「user 既選択」annotation + Scope/Design/Risks を 1 pass sweep。旧/新併記は Step 3-(N+1) reviewer に buried-decisions / scope-creep finding として上がる。

### Temporary-workaround skill integration: single hook point over state-machine weave
**Good**: upstream の不具合の暫定対処として追加する project-local skill は既存 routine skill の **単一 hook point に閉じ込める**（既存 sub-step 境界に 1 段落の sub-step 挿入、outer state machine / record schema / counter / TodoWrite per-Finding rows / No-Stall reminder enumeration には触れない）+ deletion 手順を SKILL.md prose に明記。Step 1 で「暫定 = 削除予定」属性を察知して early reject。**Bad**: deep integration（state machine 各所に branch / record field / counter / TodoWrite row 追加）で 168 行広がると削除箇所が読めない。

### Edit-induced false-positive: widen edit scope, not add detect-only check
**Good**: verification skill が N 個全てで持続 fail する場合、root cause は edit operation の scope が incomplete → **edit 側の scope を適切に広げる**（例: canonical edit 直後に `cp -R` で bundle copy へ sync する phase を追加、phase 1 sync → phase 2 verify の 2 段構成）。**Bad**: verification を fail-open / warning に降格 / detect-only + accept conflict cascade — root cause の edit-scope 漏れを隠蔽。auto-apply で fail-open に倒さず Step 8 user-gate で判断を仰ぐ。

### Project-local skill placement and layout
**Good**: project-local skill は `.claude/skills/<name>/SKILL.md` **flat layout** 配置、`marketplace.json` 登録なし / CHANGELOG entry なし、SKILL.md prose の deprecation pointer に「symlink 復活時の削除手順」を明記（marketplace.json は言及しない）。Step 1 difficulty assessment 時点で project-local 判定。**Bad**: nested layout + marketplace 登録だと訂正後 symlink / marketplace entry / CHANGELOG subsection / SKILL.md pointer の 4 箇所修正が必要。

### Globally-exposed project-local skill: relative symlink under `~/.claude/skills/<name>`
**Good**: `ln -s ../../Sources/github.com/<owner>/<repo>/.claude/skills/<name> ~/.claude/skills/<name>` で **relative path** symlink を張る（既存 `~/.claude/skills/*` の `../../.agents/skills/...` convention と同じ relative form）。SKILL.md prose では「exposed globally via a `~/.claude/skills/<name>` symlink」と書くのみで absolute path を例示しない。**Bad**: `ln -s /Users/<name>/Sources/.../.claude/skills/<name> ~/.claude/skills/<name>` のような absolute path だと repo を後で `mv` / rename したとき symlink が dangling になる + SKILL.md に absolute path を例示するとコピペで absolute 形が増殖する。

### `Read`-then-`Write` skills: drop `test -f` / `test -d` pre-checks (TOCTOU anti-pattern)
**Good**: `Read .claude/<config>.local.md` を直接呼び、Read error を "unconfigured / missing" の停止条件として扱う。`allowed-tools: Read, Write` のみで `Bash(test *)` を含めない。**Bad**: `Bash(test -f .claude/<config>.local.md)` → 成功なら `Read` という二段構えだと (i) TOCTOU anti-pattern（pre-check と Read の間に file が消える / 現れる）、(ii) Read 自体が missing error を出すため pre-check は重複、(iii) `allowed-tools` に `Bash(test *)` を残すことになり permission surface が広がる。

### Setup-mode pre-existence re-check (defensive race guard)
**Good**: Setup-mode procedure に `Before writing: re-confirm \`.claude/<config>.local.md\` does not exist (defensive guard against a race where it appeared between Step 1 and here). If it now exists, abort Setup mode and report the conflict — never overwrite` を明示。**Bad**: Step 1 で「不在を確認 → Setup-mode 入る」決定後、Setup-mode 末尾で確認せずに `Write` するロジックだと、同一 invocation 内で並行 session / sibling tool が間に config を作成した場合に既存 file を clobber する破壊経路が開く。

### `Read` error semantics: default to stop-with-error, not Setup mode, when missing-vs-other not distinguishable
**Good**: SKILL.md prose に `On Read error: enter § Setup mode (config missing) **only** when the file does not exist. For any other Read error (permission, encoding, etc.) stop with an error reporting the path — do not enter Setup mode, since the existing file would be clobbered. If the \`Read\` tool's error does not distinguish missing-vs-other reliably, default to stop-with-error` と明示。**Bad**: `On Read error: enter Setup mode` の一段分岐だと permission denied / encoding error を「不在」と誤分類して既存 config を template で上書きする。

### Project-local skill self-description canonical phrasing
**Good**: 冒頭で ``Append a single task line to an Obsidian Vault's `inbox.md`. This is a **project-local** skill (lives under `.claude/skills/inbox-add/`, not registered in `.claude-plugin/marketplace.json`) and is exposed globally via a `~/.claude/skills/inbox-add` symlink.`` のように sibling skill (`triage-review` / `verify-bundle-sync`) と punctuation まで mirror した形で self-describe。**Bad**: 「This skill is project-local. It lives under .claude/skills/. It is not in marketplace.json.」のように prose 形で散らすと sibling と house-style が揃わず Reuse review で finding になる。

### Pre-existing layout flag vs new-change regression discrimination
**Good**: Step 7 で test agent が failures flag した場合、`git stash` で変更退避 / base commit で同 test 再実行して pre-existing か discriminate、pre-existing なら Step 8 で reviewer に「pre-existing failures (out of scope of this PR), no new regression」と明記。**Bad**: pre-existing failures を「私の change が壊した」と誤帰因して修正に向かうと scope creep が爆発。

### Callee-side terminal-action verbs prompt-inject orchestrator turn-end (reframe JSON as return value, not turn boundary)
**Good**: callee SKILL.md で `Emit a single fenced JSON block at the end of the response, matching the schema for the mode that ran:` のような **schema-verb 形式** + 独立 `## Sub-skill caller directive` section で「the fenced JSON verdict block this skill emits is the **structured return value** of the skill's procedure — it is **not** a deliverable to the user, and emitting it does **not** terminate the orchestrator's turn」を明示、uniqueness clause + sibling 3 callee に byte-identical wording 配置。**Bad**: `End every invocation` / `Do not produce any additional turn after the JSON` のような terminal-action verb は orchestrator main thread に「turn を閉じろ」prompt-injection として作用し、fenced JSON 導入しても stall 再発する。

**See pattern**: `### Callee-side terminal-action verbs prompt-inject orchestrator turn-end ...` — orchestrator-side counterpart (B): `**Pre-invocation reminder**` を `Skill(<callee>)` dispatch 直前に挿入（next tool call per status branch + framing JSON as return value）+ 既存 return-point reminder を AFTER に保持 → 2 reminder が決定境界を直交 cover。CRITICAL: (B) は (A) に依存、callee 側 wording fix が先。重複は意図的 reinforcement-by-repetition（Simplify-revival check で削減候補にしない）。

### Anchor-mismatch sibling pre-extraction for sibling-symmetric directive placement
**Good**: 既存 inline directive を独立 top-level section に切り出して 3 callee に sibling-symmetric placement する設計で、各 callee の anchor section 構造が非対称な場合、anchor が bullet レベルでしかない sibling を **先に top-level section に promote する pre-extraction step** を Design に組み込み、その後 3 callee 全てに新 section を uniform position に挿入。Design 節で全 sibling anchor 構造を 1 行 diff して pre-implementation で structural asymmetry を検出。**Bad**: pre-extraction 省略は implementation 段階で uniform placement 判定不能、Step 3 iter 2 blocker C-severity。

**See pattern**: `### \`git status --porcelain=v1 --untracked-files=all -z\` canonical pattern` — Web-env specialization: stop-hook can auto-stage `.claude/plans/*.md` etc., so per-commit must scope with `git commit -m <msg> -- <path-1> <path-2> ...` (flag order: `-m` BEFORE `--`). `git add -A` / bulk staging pulls in stop-hook drift; do NOT add team-shared plan dirs to `.gitignore` — exclude them via commit pathspec instead.

### Per-commit accept gate: render commit body verbatim in a fenced code block, not as a prose promise
**Good**: Step 10 per-commit accept gate の Present step で **4 要素 closed list を独立 fenced code block で render** — (i) Subject fenced block、(ii) Body fenced block (empty body は `(no body)` placeholder)、(iii) Files list (pathspec、staging 範囲明示)、(iv) per-file Diff (tracked は `git diff <base-commit>` portion、untracked は `Read` で new-file hunk)。SKILL.md prose に `The body MUST appear in a dedicated fenced code block; a prose statement like "body included" without a rendered block is insufficient and triggers an immediate re-render request from the user` 禁止条項。**Bad**: `Body 含め、diff full preview。` のように prose 宣言のみで実 rendering なし → user が "bodyはどれですか？" と返して 1 turn 余分。

### Threshold magic numbers anchored on observable platform signals + buffer ratio (not arbitrary)
**Good**: Configuration table description に observable platform signal を anchor として明記 + buffer ratio + version-sensitivity（例: `default 32000 is 80% of Claude Code's per-file warning threshold (40k chars, observed in Claude Code 2.1.x) to leave headroom for subsequent rule additions`）。**Bad**: 任意 magic number (`30000`) だけだと出所不明 + 後追い保守判断材料なし + warning 閾値変更時の更新判断不能。

### Opt-out via large sentinel value, not boolean disable flag, for numeric threshold config
**Good**: 既存 numeric threshold pipeline を変更せず、**large sentinel value** (`compaction_threshold: 99999999`) で「実質的に無限大」を表現、Configuration table description に opt-out path を 1 行明記。**Bad**: 新 boolean disable flag (`compaction_enabled: false`) は `enabled=false × threshold=N` の semantics が ambiguous + downstream に boolean check 追加が必要。

### Char count vs byte count distinction for multibyte content (`wc -m` vs `wc -c`)
**Good**: reviewer の measurement unit と plan の数値 unit を明示的に整合 check（warning message `47.6k chars` は `wc -m` 単位、reviewer の `66045` は `wc -c` 単位 — 日本語多言語で byte ≠ char）、byte vs char の乖離を rationale として reject reason に明記。**Bad**: unit を確認せず numeric mismatch を「plan が wrong」と即断、warning message が char 単位なのに byte で書き直す regression が発生。

### Subagent dispatch prompt body lives in `references/<mode>-prompt.md`, not inline in SKILL.md
**Good**: Pattern A iteration loop の subagent dispatch prompt body が長文化する場合、prompt body を `references/<mode>-prompt.md` に切り出し（SKILL.md は schema source-of-truth として残す、references file には `Single canonical home for the executor prompt; do not duplicate the prompt body in SKILL.md` note）。**Bad**: SKILL.md inline で 50+ 行 prompt 全文埋めると 600 行 best-practice を超えやすい + 別 mode 再利用時に重複発生。

### Step 1.5 (or pre-implementation) check: user-specified step number / location reference may be stale
**Good**: user が dispatch 時に「Step N で X を」と指定した場合、SKILL.md 実体と semantic match を確認、mismatch なら正しい step を identify して plan に反映 + user に訂正報告（例: `注: ユーザー指示は「Step 9」と書いていましたが、現行 dev-workflow では Step 11 が Update Rules です — Step 11 に組み込みます`）。**Bad**: literal step number と SKILL.md 実体の semantic mismatch を確認せず silent 解釈すると、wrong step に edit が入る silent regression。

### Reference site sweep: `references/plan-format.md` § User-gate summary preamble Applies-to list extension for new user-gates
**Good**: 新 user-gate を追加する場合、(i) SKILL.md `§ No-Stall Principle` に新 gate bullet 追加と (ii) `references/plan-format.md` § User-gate summary preamble の **Applies-to list + Content slots** を **同 commit で update**。Test plan の sweep target に両ファイル update を明記。**Bad**: SKILL.md だけ更新だと preamble が間違った gate set を表示、reviewer confused（class-level extension audit post-Critical/Major-fix 対象）。

### Experimental feature → opt-in default `false` heuristic (overrides sibling-config consistency)
**Good**: 直近リリースで導入された experimental 機能は、既存 sibling config (`interactive_commits` / `task_decomposition` 等) が default `true` でも、安全側を優先して default `false` (opt-in) に倒す。Decisions § N で「default value」を独立 question として立て、Recommendation に opt-in + Alternative に sibling-consistency を並べる。CHANGELOG entry は `**Default: disabled** — set <flag>: true ... to opt in per project` + `**Behavior change from v<prior>**: ...users who adopted v<prior>'s <feature> and want to retain that behavior must explicitly set <flag>: true`。**Bad**: 既存 sibling が `true` だからと自動的に opt-out に倒すと未検証 experimental が全 user unconditional 走行で想定外副作用。

### Decision insertion (not swap) for previously-unstated default-value choice at Step 4 gate
**Good**: user が Step 4 gate で「現プランで Decisions に立てていなかった選択肢」（典型: default value）を要求した場合、Recommendation/Alternative の **swap** ではなく **新 Decision § (N+1) として insert**（見出しに `**user 既選択: <value> — Step 4 gate にて**` annotation、user 選択を Recommendation に / 元プランの暗黙 default を Alternative に並記、Approach/Scope/Test plan/Risks を新 default 文脈に sweep、CHANGELOG entry も新 default 文脈で書き直し）。**Bad**: 元 Decision 1（例: 設定キー名）を無理矢理 default value 議論で swap → 元 Decisions の structure が壊れる。

### Live validation via current workflow run's own subsequent steps
**Good**: 配布スキルの新 config flag / 新 skip-path 変更で、本走行自身の後続 step で新 default が natural に exercise される場合、Test plan の検証項目を「本走行で live validation」と書く（例: `<config-file>` に新 flag 未指定 → 新 default → 本走行の Step N が <skip-path> を通る、新 guard / informational note の実発火を本走行自身で検証）+ Out-of-scope reject notes に「`<config-file>` への明示追加は別タスク、本走行で default 検証を exercise させるため意図的にスコープ外」と明記（dogfooding 不能な変更では従来通り manual verification を Test plan に書く）。**Bad**: 同 PR で `<config-file>` に新 flag 明示追加すると skip path を潰して live validation 機会を失い、別 session manual verification の手間が発生。
