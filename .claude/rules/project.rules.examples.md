# Project Rules - Examples

## Principles Examples

### bundle スキルと dev-workflow-bundle のペア bump
**Good** (CHANGELOG.md):
```markdown
## 2026-04-25

### dev-workflow v1.34.2 / dev-workflow-bundle v1.34.2

- fix(dev-workflow): ...
```
**Bad:**
```markdown
## 2026-04-25

### dev-workflow v1.34.2

- fix(dev-workflow): ...
```
（`dev-workflow-bundle` の対が抜けると bundle 配布の version が静かに古いまま残る）

### `Edit` での marketplace.json version 書き換え
**Good:**
```jsonc
// old_string (name の閉じる " と trailing , まで含める)
"name": "dev-workflow",
      "source": "./plugins/dev-workflow",
      "version": "1.34.2",

// new_string
"name": "dev-workflow",
      "source": "./plugins/dev-workflow",
      "version": "1.34.3",
```
**Bad:**
```jsonc
// old_string が "name": "dev-workflow" だけ → "dev-workflow-bundle" の prefix と被って not-unique error
"name": "dev-workflow"
```
Edit 直後に `jq empty .claude-plugin/marketplace.json` で syntax 確認する。`replace_all` は禁止。

### bookkeeping commit の分離
**Good** (commit log):
```text
feat(dev-workflow-triage): release bookkeeping after accepted Findings
fix(dev-workflow): Step 7.5 semantic-judgment branch
chore(release): bump dev-workflow / dev-workflow-bundle (auto-triage 2026-04-25)
```
（per-Finding fix と version bump が別コミット）
**Bad:**
```text
fix(dev-workflow): Step 7.5 semantic-judgment branch + bump version
```
（同じコミットに混ぜると「1 accepted Finding = 1 commit」「scope check」の意味が薄れる）

### Routine スキルの per-invocation 件数 cap heuristic
**Good** (`dev-workflow-triage` SKILL.md Step 2):
```text
gh issue list --repo <owner>/<repo> --state open --limit 50
# Exactly 50 ⇒ overflow=true; report "50-issue cap reached" in Step 4 summary
```
（subagent dispatch コストを考慮して保守的に 50 に設定。cap 到達時は overflow フラグで人に追加 invocation を促す）
**Bad:**
```text
gh issue list --repo <owner>/<repo> --state open --limit 200
# Exactly 200 ⇒ overflow=true
```
（200 件を 1 routine 走行で順次 triage すると verify-diff/skill-review の subagent dispatch が積み重なって walltime が膨らむ）

### 0-item 経路の multi-row flip
**Good** (per-issue ループが 0 件で skip される SKILL.md 記述):
```markdown
If Step 2 reported 0 open issues, mark Step 2 / Step 3 / Step 3.7 / Step 4 all
`completed` in a **single TodoWrite call** and proceed directly to Completion summary.
```
（phase 行を 1 call で同時遷移させて stall 誘発点を減らす）
**Bad:**
```markdown
If 0 issues, mark Step 2 completed.
Then mark Step 3 completed.
Then mark Step 3.7 completed.
Then mark Step 4 completed.
```
（phase 行ごとに別 call にすると、call 間でターン跨ぎの停止誘惑が入る）

### Forward jump pointer for skip path
**Good** (`§ Title match` の skip path 末尾):
```markdown
The per-issue row is flipped pending → completed here per § Title-mismatch skip path.
Skipping does not bypass the reminder dispatch — apply the dispatch at the end of § Close decision.
```
（短絡 path から下流 dispatch への forward jump を明示）
**Bad:**
```markdown
On title mismatch, skip the issue and continue.
```
（「skip = 何もしない」と誤読されると下流の必須 reminder dispatch が抜ける）

### 並列 reminder dispatch（runtime variant 選択）
**Good** (`§ No-Stall Principle` issue-loop boundary):
```markdown
**Reminder #1 (more issues remain)**: Ensure the just-finished per-issue row is
completed (regardless of outcome — accepted, rejected, parse-error, title-mismatch-skip,
any non-error result), then proceed to the next issue with the next tool call.
See § No-Stall Principle.

**Reminder #2 (last issue)**: Ensure the just-finished per-issue row is completed
(regardless of outcome — accepted, rejected, parse-error, title-mismatch-skip,
any non-error result), then proceed to Step 3.7 with the next tool call.
See § No-Stall Principle.
```
（両 variant を並列に prose 記述、closed-list 形式で structural 整合）
**Bad:**
```markdown
After the last issue is processed, jump to Step 3.7.
(For non-last issues, reminder #1 in another section applies.)
```
（dispatch 位置が分散すると agent が決定点で参照しにくくなる）

### `~/.claude/` 配下は Claude config root
**Good** (`dev-workflow-triage` Pre-flight):
```markdown
**Stop hook detection** (Web env observability): run
`jq -r '.hooks.Stop // empty' ~/.claude/settings.json`
and if the output is non-empty, set `stop_hook_present=true` and surface
a warning line in the Step 4 summary. Do not abort.
```
（`~/.claude/settings.json` は Claude Code 標準 config root への参照であり、ユーザー固有の絶対パスではないので SKILL.md にハードコードしてよい）
**Bad:**
```markdown
**Stop hook detection**: run
`jq -r '.hooks.Stop // empty' /Users/alice/.claude/settings.json`
```
（特定ユーザーの `/Users/<name>/...` を埋め込むと配布性が壊れる）

### Cross-skill 構造的衝突の orchestrator + callee documenting
**Good** (orchestrator `dev-workflow-triage/SKILL.md` canonical):
```markdown
## Stop hook structural conflict

**Conflict mechanism**: the per-Finding flow in `§ 3.4 Apply accepted Findings`
runs `(b) Edit → (d) Skill(verify-diff) → (d2) Skill(skill-review) →
(g) commit`. Each subagent dispatch creates a turn boundary, and uncommitted
state between (b) and (g) is **normal**. The hook fires every boundary.

**Correct behavior**: treat hook feedback as a non-fatal `stop-hook spurious
fire` per § No-Stall Principle — record and continue, do not commit prematurely.
```
**Good** (callee `verify-diff/SKILL.md` short note near `§ Scope check boundary`):
```markdown
> **Stop hook note (Web env)**: if a `~/.claude/stop-hook-git-check.sh` style
> Stop hook is registered, it may fire mid-dispatch with uncommitted-change
> feedback. This is a known structural conflict — see
> `§ Stop hook structural conflict` in the orchestrator (`dev-workflow-triage`).
> Ignore the feedback and continue the prescribed flow.
```
（orchestrator に canonical write-up、callee には 2–3 文の short note + stable heading 参照）
**Bad** (callee 側で canonical を full 再記述):
```markdown
## Stop hook structural conflict
**Conflict mechanism**: per-Finding flow runs (b) Edit → (d) verify-diff → ...
（以下 orchestrator と同一の長文）
```
（callee で full 再記述すると、orchestrator 側の更新が伝播しない／冗長）

### Per-turn environment-induced spurious feedback を non-fatal class に列挙
**Good** (`§ No-Stall Principle` 内):
```markdown
**Non-fatal errors (record and continue):**
- Per-Finding/issue: `comment-failed`, `close-failed`, `commit-failed`
- Per-turn (environment-induced): `stop-hook spurious fire` —
  Web env's `~/.claude/stop-hook-git-check.sh` may inject
  `Please commit and push…` between turns; record and proceed to the
  next prescribed action.
```
（per-Finding と per-turn の disposition class を並列に列挙、disposition は同じだが発生粒度を分けて明示）
**Bad:**
```markdown
**Non-fatal errors:** comment-failed, close-failed, commit-failed
```
（per-turn class が抜けると agent が hook フィードバックを fatal 扱いして即 commit する誤動作経路が開く）

### Callee-side fenced JSON return contract for stall-prone sub-skills
**Good** (callee `skill-review/SKILL.md` 末尾):
````markdown
## Return contract

When invoked as a sub-skill (via `Skill(skill-review)`), terminate the
processing turn by emitting a single fenced JSON block:

```json
{
  "status": "no-actionable-findings" | "applied-edits" | "notes-left" | "error",
  "applied_edits_count": <int>,
  "notes_remaining_count": <int>,
  "reason": "<optional, required when status=error>"
}
```

Do not emit a prose checklist walk-through after the JSON block — the
caller parses the JSON and proceeds. The orchestrator (`dev-workflow-triage`
§ 3.4 Apply accepted Findings) maps `status` to its `record.skill_review`
token and dispatches the next action.
````
（fenced JSON 末尾必須にすると verdict turn が短く閉じて orchestrator の parse → 次 action フローが組める）
**Bad** (callee verdict が free-form prose のみ):
```markdown
After running the checklist:
- Frontmatter: untouched.
- Structure / length: ...
- Writing style: ...
（9 項目の prose checklist walk-through）

No actionable findings.
```
（prose verdict が turn 全体を消費して自然な turn-end を作り、orchestrator の return-point reminder では救えず stall する）

### Orchestrator-side verdict parse-failure handling
**Good** (orchestrator `dev-workflow-triage/SKILL.md` (d2) bullet 内):
```markdown
Parse the fenced JSON verdict at the end of `Skill(skill-review)` output.
Map `status` per the table below; if the JSON block is missing or
malformed (verdict parse failure), or `status: "error"` is returned,
**terminate the (d2) loop with no retry**, increment the (e) error
counter, and proceed to the next Finding.

| status | record.skill_review token | next action |
|---|---|---|
| `no-actionable-findings` | `clean` | proceed to (f) |
| `applied-edits` | `notes left after applied-edits (<n>)` if `notes_remaining_count > 0` else `clean` | proceed to (f) |
| `notes-left` | `notes left after max iters (<n>)` | proceed to (f) |
| `error` / parse-failure | `parse-error` | terminate (d2), no retry |
```
（verify-diff の `Verdict missing or malformed` style と整合させ、JSON 経路の `error` と parse-failure を別経路として明文化）
**Bad:**
```markdown
After `Skill(skill-review)` returns, judge the result and proceed to (f).
```
（callee contract が壊れたときの分岐が無く、orchestrator が無限 loop か沈黙に落ちる）

### bundle 内 review 系スキルの Pattern A 統一
**Good** (`skill-review/SKILL.md` の冒頭一行サマリ):
```markdown
The review walk runs in a fresh subagent (Pattern A — same shape as
`verify-diff` and `rules-review`); Edit application stays in the main thread
to keep the reviewer bias-free. Designed to be called from non-interactive
routines such as `dev-workflow-triage` (d2) or `dev-workflow` `hooks.on_complete`;
it never prompts the user.
```
（Skill ラッパー + 内部 Agent dispatch + main-thread Edit の 2 層構造、bias-free executor、bundle 内 review skill の design pattern 一貫性）
**Bad** (review walk を全て orchestrator main thread で inline 実行):
```markdown
## Process

1. Detect changed skill files (main thread)
2. Read changed files (main thread)
3. Walk best-practices.md against each file and flag findings (main thread)
4. Apply mechanical fixes (main thread)
5. Verify (main thread)
```
（bias-free executor が確保されない・review prose が main context に積もる・bundle 内の他 review skill と design pattern が乖離する）

### Standalone interactive-only path の deprecate
**Good** (`skill-review/SKILL.md` Process step 4):
```markdown
**Surface structural notes**:

- Set `notes_remaining_count = len(structural_notes)`
- Do not apply structural notes. They are reported through the verdict;
  the caller decides whether and how to act on them.
  The skill itself does not run a user-confirm dialogue
```
（structural change を常に notes_remaining_count に集計、`/skill-review` 直接利用時も user が verdict + notes を見て手動判断する形に統一）
**Bad** (旧 skill-review Process step 4):
```markdown
4. **Apply improvements**: ... Confirm with the user first before structural
   changes: moving content between files, deleting sections, or rewriting
   large portions of a section. **When invoked as a sub-skill** (no human
   in the loop), do **not** wait for confirmation: leave structural changes
   unapplied and surface them via `notes_remaining_count` instead.
   Standalone behavior is unchanged
```
（live caller が両方 sub-skill mode で interactive path に到達し得ない silent dead-code、caller 側で mode を渡す術もない）

### Agent unavailable fallback の cross-reference 圧縮
**Good** (`skill-review/SKILL.md` Step 3 末尾):
```markdown
**Agent unavailable fallback**: detect availability and fall back per the
canonical write-up in `rules-review` SKILL.md `§ 5. Review` (the "Detecting
Agent availability" / "Fallback when Agent is unavailable" paragraphs).
The skill-review specialization: when falling back, walk the embedded
checklist over each changed file inline-sequentially in the main thread
and emit the same fenced JSON block defined above so Step 4's parser
handles both paths identically.
```
（canonical へのポインタ + 1 行 specialization のみ）
**Bad** (毎回 3 段落 inline で書き直し):
```markdown
**Agent unavailable fallback**: the `Agent` tool is considered unavailable
when its schema is not exposed... Do not attempt a speculative call to
detect availability... Fallback when Agent is unavailable: execute the
same reviewer prompt inline sequentially... Do not substitute claude -p
or external CLIs...
（rules-review §5 と同一の長文を skill-review 側で再記述）
```
（canonical の更新が他 callee に伝播しない・冗長）

### `--- LABEL ---` fence convention for Pattern A dispatch prompts
**Good** (`skill-review/SKILL.md` Step 3 — Dispatch reviewer Agent):
```markdown
Invoke the `Agent` tool to dispatch a fresh reviewer. Assemble the dispatch
prompt from the four sections below, each framed with a clear `--- LABEL ---`
fence (same convention as `verify-diff` § Step 3 (a) Dispatch bias-free
executor) so the reviewer can parse each payload unambiguously:

- `--- BEST PRACTICES CHECKLIST ---`: the full content of `references/best-practices.md`
- `--- CHANGED FILES ---`: each changed skill file's path, full content, and unified diff
- `--- REVIEWER PROMPT ---`: the reviewer prompt and JSON schema below (verbatim)
- `--- RESPONSE FORMAT ---`: the response format and constraints below (verbatim)
```
（fence convention 統一で template 流用容易、subagent 側 payload 境界明確）
**Bad** (ad-hoc な `## Sub-heading` 方式):
```markdown
Invoke the Agent tool. Include:

## Best Practices
<full content>

## Changed Files
<each file>

## Reviewer Prompt
<prompt>
```
（subagent 側で section 終端境界が曖昧、bundle 内 dispatch prompt の流儀が揃わない）

### Pattern A callee return JSON の first-match-wins parse-order
**Good** (`skill-review/SKILL.md` Step 4 — Parse & apply):
```markdown
Parse the subagent's fenced JSON response. Evaluate in this order,
**first match wins** (same evaluate-in-order discipline as `verify-diff`
§ (b) Parse & apply, restricted to the cases that apply to a single-pass
dispatch):

1. **Verdict missing or malformed** — no fenced JSON block found, or JSON
   parse fails → emit `{"status": "error", ..., "reason": "verdict parse failure"}` and stop
2. **Schema violation** — required keys missing, values not arrays, or any
   entry fails its expected shape → emit `{"status": "error", ...,
   "reason": "verdict schema violation"}` and stop
3. **Otherwise** — proceed with apply
```
（verify-diff (b) と同じ規律、loop の (3) Converged / (4) Divergence は single-pass で N/A なので圧縮）
**Bad:**
```markdown
After receiving the subagent JSON, validate the schema and apply edits.
If validation fails, emit an error verdict.
```
（評価順序が implicit で agent runtime によって再現性が崩れる、verify-diff との対応が見えない）

### Subagent return JSON の per-entry shape validation
**Good** (`skill-review/SKILL.md` Step 4 step 2):
```markdown
2. **Schema violation** — required keys (`mechanical_edits`, `structural_notes`)
   are missing, values are not arrays, or any entry fails its expected shape
   (`mechanical_edits` entries must have non-empty string `file`, `old_string`,
   `new_string`; `structural_notes` entries must have non-empty string `file`,
   `description`) → emit `{"status": "error", "applied_edits_count": 0,
   "notes_remaining_count": 0, "reason": "verdict schema violation"}` and stop.
   Validating entry shape here prevents a malformed entry from crashing the
   `Edit` call later
```
（top-level keys だけでなく entry-level non-empty string も parse 時に検証）
**Bad:**
```markdown
2. **Schema violation** — `mechanical_edits` or `structural_notes` keys missing
   → emit error verdict
```
（entry-level shape を見ないと、後段 Edit が `Cannot read property 'old_string' of null` 系で crash する経路が残る）

### `old_string` 1–3 lines context convention in dispatch prompts
**Good** (`skill-review/SKILL.md` Step 3 reviewer prompt 内):
```markdown
> `old_string` must match exactly one location in the current file. Include
> **1–3 lines of surrounding context** so the snippet is unique — short
> one-liners collide and cause the Edit to fail.
```
そして apply 段で:
```markdown
- For each entry in `mechanical_edits`, re-`Read` the target file (so
  `old_string` matches the current contents after any earlier edit landed),
  then call `Edit`
- If `old_string` is not found, skip that entry and continue with the next.
  This is expected when the subagent emits multiple edits from a single
  snapshot and a later edit overlaps a region an earlier one already
  rewrote — the skip is a no-op fallback, not an error
- Increment `applied_edits_count` only for entries whose `Edit` call
  succeeded — skipped entries do not count
```
（dispatch prompt 内に context 量を明示、apply 段で skip-on-overlap を no-op fallback と明文化）
**Bad** (dispatch prompt 内 convention 無し / skip 扱い未定義):
```markdown
> Return suggested edits as `{old_string, new_string}` pairs.
```
そして apply 段:
```markdown
- For each entry, call Edit with old_string and new_string.
- If Edit fails, retry the dispatch.
```
（short one-liners が collide して Edit fail → retry-dispatch loop に落ちる、subagent quality drift と誤帰因しやすい）

### Aggregate counter warning string differentiation
**Good** (Step 4 aggregate summary):
```text
- skill-review notes left after applied-edits (3)   # M2: applied-edits 経路の残 notes
- skill-review notes left after max iters (1)        # M2: callee internal max iter 到達経路の残 notes
```
（同じ `notes_remaining_count` でも sub-condition が違うので warning 文字列を differentiate、SKILL.md にも区別意図を 1 行明記）
**Bad:**
```text
- skill-review notes left (3)
- skill-review notes left (1)
```
（同一文字列に集約すると user が「どの sub-source が threshold を踏んだか」を identify できず、後追い triage で原因切り分け不能）

### CHANGELOG entry での過去 commit 参照
**Good** (CHANGELOG.md fix entry 本文):
```markdown
- fix(ask-peer): generalize peer reviewer "operational reality" prompt to remove skill-bundle internal vocabulary (subtask 1 of meta-scope-leak)
  - Category: wrong-default; The peer personality "Planning" focus area inherited `subagent dispatch and time budgets` / `sub-dispatches` from auto-triage #6, which defaulted to skill-bundle internal vocabulary instead of language-agnostic wording.
```
（過去 commit 参照は `auto-triage #6` 形式で、既存 entry スタイルと一貫）
**Bad:**
```markdown
- fix(ask-peer): generalize peer reviewer "operational reality" prompt
  - Category: wrong-default; ... inherited from the auto-triage #6 commit `fcf70b2`, which defaulted to skill-bundle internal vocabulary ...
```
（生の commit hash `fcf70b2` を埋めると repo の reword / rebase で安定性が下がる + 既存 entry の `auto-triage #N` のみ参照スタイルから外れる）

### CHANGELOG `Category:` token の closed taxonomy
**Good** (CHANGELOG.md fix entry):
```markdown
- fix(ask-peer): generalize peer reviewer prompt
  - Category: wrong-default; ...
```
（`missing-branch` / `ambiguity` / `wrong-default` の closed list から選択）
**Bad:**
```markdown
- fix(ask-peer): generalize peer reviewer prompt
  - Category: distribution-leak; The reviewer prompt leaked skill-bundle internal vocabulary to general-purpose reviewers...
```
（`distribution-leak` / `scope-leak` のような新規記述的 token を発明すると CHANGELOG 全体の taxonomy 一貫性が崩れる。新 failure mode は既存 3 種にマップ可能か再検討する — 上記の例なら「default 値が generic でなく skill-bundle internal だった」= `wrong-default` にマップできる）

### bundle skill SKILL.md prose のメタ文脈語彙汎化
**Good** (`skills/dev-workflow/SKILL.md` Step 2 self-audit bullet):
```markdown
- **Cross-component structural-blast-radius**: if the plan fixes a structural pattern (shared base classes, cross-cutting middleware, return/API contracts, mirrored services, parallel route handlers — for skill development this includes subagent dispatch shape, hook wiring, state-file handling, return-contract design) rather than content scoped to one component, check whether sibling components sharing that structure have the same defect.
```
（抽象原理「shared base classes, cross-cutting middleware, return/API contracts, mirrored services, parallel route handlers」を主文に書き、skill 開発文脈の具体例「subagent dispatch shape, hook wiring, state-file handling, return-contract design」は括弧書きで添える）
**Bad:**
```markdown
- **Cross-skill structural-blast-radius**: if the plan fixes a structural pattern (subagent dispatch shape, hook wiring, or state-file handling pattern) rather than content scoped to one skill, check whether sibling skills sharing that structure have the same defect.
```
（適用文脈固定の語彙が主文に直接埋まると、bundle skill を skill 開発以外の用途で利用する読者が読み解きづらい / 適用しにくい）

### Pattern A iteration loop skill の `allowed-tools` baseline mirror
**Good** (`skills/publicity-review/SKILL.md` frontmatter):
```yaml
---
name: publicity-review
description: ...
allowed-tools: Read, Edit, Agent, TodoWrite, Bash(git diff *), Bash(git rev-parse *), Bash(git checkout HEAD -- *)
---
```
（sibling Pattern A skill `verify-diff` の `allowed-tools` を mirror。`TodoWrite` を含めることで sub-skill 経由 invocation 時の permission dialog を未然に防ぐ）
**Bad:**
```yaml
---
name: publicity-review
description: ...
allowed-tools: Read, Edit, Agent, Bash(git diff *), Bash(git rev-parse *)
---
```
（SKILL.md prose 内で `iteration TodoWrite items を pre-register` と書きながら frontmatter に `TodoWrite` を宣言し忘れている。non-interactive routine から呼ぶと permission dialog で停止する。新規 Pattern A skill 追加時は sibling の `allowed-tools` 行を 1 行 diff で照合する）

### Iter loop の (a) Dispatch sub-step での選択的 re-Read
**Good** (`skills/publicity-review/SKILL.md` Step 2 (a)):
```markdown
On iter 1, `Read` the full current contents of each `affected_files` entry. On `i ≥ 2`, only re-`Read` the subset of `affected_files` whose path appeared in a successfully-applied `suggested_edits` entry during iter `i-1` (untouched files keep their iter-1 snapshot — re-reading them is wasted work and balloons main-thread context). On `i ≥ 2`, also re-run `git diff <Base ref>` so the diff reflects edits that landed in prior iterations.
```
（iter 1 = 全件 Read、iter 2+ = 直前 iter で edit 成功したファイルのみ再 Read。`git diff` も再実行して累積 edits を反映）
**Bad:**
```markdown
At the start of every iteration, `Read` the full current contents of each `affected_files` entry and re-run `git diff <Base ref>`.
```
（毎 iter で全件 Read すると main-thread context が肥大し、token 効率も悪い。untouched files の snapshot を保持して reuse する）

### 集約サマリでの source-of-truth labeling
**Good** (`dev-workflow-triage/SKILL.md` Step 4 publicity-review breakdown):
```markdown
- publicity-review state: `enabled` or `disabled-after-errors`; count of Findings with `publicity-review unresolved (<n>)` broken down by top category (e.g. `secret×N, ...`); count of Findings with `publicity-review conflict (<reason>)` broken down by reason; count of Findings with `publicity-review skipped (<reason>)` broken down by reason. **Source of truth: the warning strings recorded by (d3) (the `unresolved`/`conflict`/`skipped` rows), not the per-Finding `record.publicity_review` token (which stores a count only).** Same pattern as the verify-diff and skill-review aggregate lines above.
```
（counter を render する複数の sub-source（warning 文字列 vs per-Finding record token）が存在する場合、どちらが canonical かを 1 行明記）
**Bad:**
```markdown
- publicity-review state: ... count of Findings with `publicity-review unresolved (<n>)` broken down by top category; count of Findings with `publicity-review conflict (<reason>)` broken down by reason; count of Findings with `publicity-review skipped (<reason>)` broken down by reason.
```
（canonical な source が読めず、後追い triage で「どちらの値を信じればよいか」が判断できない）

### orchestrator render の `<max_iterations>` ハードコード
**Good** (`dev-workflow-triage/SKILL.md` per-Finding render rules):
```markdown
- `verify_diff` ∈ {`converged`, `unresolved`, `skipped`, `conflict`}: render `<token> [iter <iterations_used>/3]`
- `publicity_review` ∈ {`converged-iter-<k>`, `unresolved-<count>`, `conflict (<reason>)`, `skipped (<reason>)`}: render `<token> [iter <iterations_used>/2]`
```
（orchestrator が verify-diff には default 3、publicity-review には `Max iterations = 2` を渡しているため、それぞれの denominator を hardcode）
**Bad:**
```markdown
- `verify_diff`: render `<token> [iter <iterations_used>/<max_iterations>]`
- `publicity_review`: render `<token> [iter <iterations_used>/<max_iterations>]`
```
（プレースホルダのままだと caller がどの値を渡しているか読めず、複数 callee で異なる max を呼び分けるケースの denominator がブレる）

### Mode determination の 3 分岐契約 (all/none/partial)
**Good** (`verify-diff/SKILL.md` `## Invocation contract` § Mode determination):
```markdown
- **All three present** → **explicit-args mode** (run `## Workflow` Step 1–5).
- **All three absent** → **auto-derive mode** (run `## Auto-derive mode` instead).
- **1 or 2 of the three provided** (incomplete framing) → return early with the explicit-args mode Step 1 schema (does **not** enter auto-derive mode — `incomplete args` is an explicit-args bug signal, surfaced loudly rather than silently falling back):
  {"mode": "explicit-args", "status": "error", "reason": "incomplete args", ...}
```
（partial 入力は loud な bug signal として early return。silent fallback / 暗黙合流のいずれにも倒さない）
**Bad:**
```markdown
- 3 つのうち 1 つ以上が指定されていれば explicit-args mode、全部空なら auto-derive mode。
```
（partial 入力が silent に explicit-args に倒れる設計。caller のテンプレ書き間違いが通ってしまい、後追いで「どちらの mode で動いたか」が読めない）

### Pattern A iter loop の inferred-state iter-1 fixing
**Good** (`verify-diff/SKILL.md` `A2 § Per-iter loop semantics` (6.1)):
```markdown
**(6.1) `inferred_intent` persistence**: capture `inferred_intent` from the **iter 1 verdict** into main-thread context and treat that value as fixed for the rest of the per-skill loop. iter 2+ verdicts may return a different `inferred_intent` because the executor reruns Phase 1 each dispatch — do **not** overwrite the iter-1 value. ... If iter 1 produced no parseable verdict (sub-case 1 / 2 / dispatch error) and the per-skill loop terminates immediately with `status=skipped`, set `inferred_intent: null` in the per-skill verdict object — there is no iter-1 value to fix. Divergence comparison (sub-case 4) uses the existing `(remaining_gaps, regressions)` multiset pair only; `inferred_intent` is excluded since the main thread fixes it.
```
（毎 iter ステートレスに再推論される値は iter 1 で main thread が capture して fix。iter 2+ 値で上書きしない・divergence 比較から除外・iter 1 が verdict 出さなかった経路は `null`）
**Bad:**
```markdown
Each iter, the executor returns a new `inferred_intent`. Use the latest one in the per-skill verdict.
```
（毎 iter 上書きすると per-target verdict が「単一の安定した推論値」を報告できない。divergence 比較も noisy になり収束しない）

### Mode-specific empty-input disposition
**Good** (`verify-diff/SKILL.md` `## Auto-derive mode` § A1):
```markdown
2. If the diff is empty, return early with the auto-derive aggregate shape (matches A3 schema):

   {"mode": "auto-derive", "status": "skipped", "reason": "empty diff", "iterations_used_total": 0, ...}

   Auto-derive treats an empty diff as `skipped` rather than `conflict` (the explicit-args mode policy) — without caller framing, an empty diff is informational, not a bug signal.
```
（caller framing がある explicit-args では empty-diff = conflict、無い auto-derive では empty-diff = skipped。同じ「空入力」状態でも文脈で disposition を分ける）
**Bad:**
```markdown
2. If the diff is empty, return `{"status": "conflict", "reason": "empty diff"}` regardless of mode.
```
（auto-derive mode では caller framing がないので「空 = bug」と断定する根拠がない。informational 扱いで `skipped` に倒すのが正しい）

### Mode-additive status enum extension
**Good** (`verify-diff/SKILL.md` `## Workflow` § Step 5):
```markdown
- **auto-derive mode**: emit the aggregate schema defined in `## Auto-derive mode` § A3 (5-value `status` enum including `partial`, plus the per-skill nesting).

`partial` is **auto-derive-only** and is never emitted by the explicit-args mode contract — existing callers wired to the explicit-args 4-value enum (e.g. `dev-workflow-triage`'s (d) verdict parser) will not see it.
```
（新 mode が追加した status 値は「mode-only」と明記。既存 caller の 4-value enum 互換性を契約として守る）
**Bad:**
```markdown
- 全ての mode で `status` ∈ {`converged`, `unresolved`, `skipped`, `conflict`, `partial`} を emit する。
```
（既存 caller の switch 文が `partial` を取りこぼす dead code path に入り、沈黙落ちが起きる）

### Multi-target safety-rail の pre-check before global revert
**Good** (`verify-diff/SKILL.md` `A2 § Per-iter loop semantics` (b) sub-case 5 and (c) Scope rail):
```markdown
(b) sub-case 5 apply edits the file named by `suggested_edits[i].file`. **Before each `Edit`**, verify `suggested_edits[i].file ∈ F` (the per-skill `files` set); if not, record the path in an `out_of_scope` list and skip the entry without calling `Edit` (no working-tree write occurs, so no revert is needed for that entry — see (c) Scope rail).

(c) Scope rail (per-skill, judgment annotation): each per-skill dispatch is an independent executor, and (b) sub-case 5's pre-check already prevents writes outside `F`. After the apply phase, if `out_of_scope` is non-empty, ... emit the per-skill verdict with `status: "conflict"`, `reason: "scope violation"`, `reverted_paths: out_of_scope`. No `git checkout HEAD --` runs because no offending write actually landed (the pre-check skipped them); `reverted_paths` reports the rejected paths for caller-visibility. ... This design avoids the multi-skill collateral-damage failure mode where a global `git checkout HEAD -- <sibling-path>` would wipe a sibling skill's already-landed edits.
```
（pre-check で out-of-scope path を `Edit` 前に skip → 実 write 無し → `git checkout` 不要。`reverted_paths` は informational で実 revert は走らない）
**Bad:**
```markdown
(b) For each `suggested_edits[i]`, call `Edit(file)` directly.
(c) After apply, for any path written outside the per-skill `files` set, run `git checkout HEAD -- <path>` to revert.
```
（multi-target loop で T1 の executor が T2 の path に edit を返した場合、`git checkout` が T2 で既に landing 済みの sibling-target edits を wipe する。pre-check が無いと collateral damage path が開く）

### i18n 機能 documenting の英語 meta-prose と paired bilingual sample 分離
**Good** (`skills/dev-workflow/references/plan-format.md` § User-gate summary preamble):
```markdown
- Technical jargon pairs the localized phrasing with the original technical term in parentheses on first use within the preamble (e.g. `品質ゲート（check_commands / Step 7.5）` for `language: ja`, `quality gate (check_commands / Step 7.5)` for `language: en`).
- Output language follows the resolved `language` (see `SKILL.md` § Configuration; default `ja`).
```
（meta-prose `Technical jargon pairs ...` は英語、bilingual sample は `language: ja` / `language: en` の paired demonstration として括弧書き内に併記。「実装物は英語で記述する」ルールに整合し、runtime の挙動も読者が読み取れる）
**Bad:**
```markdown
- 専門用語は日本語と原語をセットで記載（例: `品質ゲート（check_commands / Step 7.5）`）
```
（Japanese meta-prose は「実装物は英語で記述する」ルールに違反する。さらに Japanese-only の sample は rules-review で `borderline / low-confidence` flag され、後追い triage で 1 cycle 余分にかかる）

### 配布性ルール scope clarification: same-bundle self-reference
**Good** (rules-review / code review finding triage):
```markdown
Finding N-3: 「`dev-workflow/references/plan-format.md` の `Step 4 / Step 7.5 / Step 8` という bundle 内部固有の節名が主文に埋め込まれており、§ SKILL.md の配布性 ルールに違反する可能性がある」

Reject 理由: `Step 4 / Step 7.5 / Step 8` は同一 SKILL.md（`skills/dev-workflow/SKILL.md`）内で defined されている self-reference であり、配布性ルールが禁ずる「適用文脈固定の語彙（skill 開発、特定 framework 等の out-of-bundle vocabulary）」とは別レイヤー。同 bundle 内 sibling skill 名（`rules-review` / `simplify` / `extract-rules` 等）の参照も同様に違反ではない。
```
（同 SKILL.md 内 self-reference / 同 bundle 内 sibling skill name reference は配布性違反ではないことを明記して reject）
**Bad:**
```markdown
Finding N-3 を accept: 「Step 4 / Step 7.5 / Step 8」を一般化した呼称（"the user-judgment gate", "the rules compliance step", "the code review step"）に書き換える
```
（self-reference まで一般化すると SKILL.md 内の cross-section reference が読みづらくなり、可読性とトレーサビリティが下がる。配布性ルールは out-of-bundle vocabulary を防ぐためのもので、self-reference には適用しない）

### 同 SKILL.md 内 sibling iteration loop の return-point reminder symmetric coverage
**Good** (`skills/dev-workflow/SKILL.md` Step 3 Plan Review iter loop末尾 + Step 8 Code Review iter loop末尾、両方に同型 reminder):
```markdown
### Step 3: Plan Review
...
   **Return-point no-stall reminder**: At each iteration boundary (regardless of reviewer outcome — findings reported, "No actionable findings", any non-error result), the next action — the next iteration's reviewer dispatch when more iteration items remain, or the Step 4 transition when this was the last iteration or "No actionable findings" was returned — must be issued in the **next tool call**. See `§ No-Stall Principle`.

### Step 8: Code Review
...
   **Return-point no-stall reminder**: At each iteration boundary (regardless of reviewer outcome — findings reported, "No actionable findings", any non-error result), the next action — the next iteration's reviewer dispatch when more iteration items remain, or the Step 9 transition when this was the last iteration or "No actionable findings" was returned, or the Step 7 / Step 7.5 re-run when code was modified — must be issued in the **next tool call**. See `§ No-Stall Principle`.
```
（両 iter loop に同型 reminder を配置、closed-list 形式・next tool call 明示・`§ No-Stall Principle` 安定参照の 3 要素で structural 整合）
**Bad** (Step 8 にだけ reminder、Step 3 には無い):
```markdown
### Step 3: Plan Review
1. Mark iteration item as `in_progress`. Call reviewer skill.
2. If "No actionable findings": mark completed and skip remaining.
3. Otherwise: apply / reject and continue to next iteration.

### Step 8: Code Review
...
   **Return-point no-stall reminder**: At each iteration boundary (regardless of reviewer outcome ...
```
（Step 3 iter boundary で stall が再発する。`Skill(ask-peer)` 戻り後にユーザーが `なぜ止まっているの？` と問うパターンが繰り返される。reminder は同型 sibling loop 間で symmetric coverage が必要）

### Free-form prose verdict reviewer skill の stall リスク認識
**Good** (新規 reviewer 系 sub-skill 追加 / stall 観測時の判断):
```markdown
判断: `ask-peer` の plan review verdict は `## Critical / ## Major / ## Minor` の Severity 階層で構造化された Markdown だが、fenced JSON の return contract を持たない。`Skill(ask-peer)` 戻り後にユーザー判断点で stall が観測された経緯から、free-form Markdown verdict は `skill-review` 等と同じ stall リスクを抱える。

対処: ask-peer SKILL.md 末尾に fenced JSON return contract（`{ "status": "no-actionable-findings" | "findings-reported", "severity_counts": { "critical": N, "major": N, "minor": N }, ... }` 形式）の導入を検討。orchestrator 側（dev-workflow Step 3 / Step 8）で parse → 次 action の機械フローを組めるようにする。
```
（構造化されているように見える Markdown verdict も fenced JSON の return contract が無ければ stall リスクは同じ、という認識）
**Bad:**
```markdown
判断: `ask-peer` の verdict は Severity 階層で構造化されているので `skill-review` のような stall リスクは無い。orchestrator 側の return-point reminder で十分。
```
（"構造化されているように見える Markdown" と "機械的 parse 可能な fenced JSON" を混同している。reminder は背景文脈に退き、決定の瞬間に active prompt として参照されないため、prose verdict が turn 全体を消費する stall は再発する）

### project-local skill の version-bump 適用範囲
**Good** (code review finding triage):
```markdown
Finding N-4: "verify-diff の version bump と CHANGELOG entry が抜けている。リリース運用ルールに従ってペア bump すべき。"

Reject 理由: `verify-diff` は `.claude/skills/` 配下の project-local skill であり、`marketplace.json` の `plugins[]` に entry が無い（`grep -c '"name": "verify-diff"' .claude-plugin/marketplace.json` で確認）。`plugin.json` も持たない。version bump / CHANGELOG ペア bump ルールは bundle 配布対象（`dev-workflow` / `ask-peer` / `extract-rules` / `rules-review`）にのみ適用される。
```
（finding の対象スキルが project-local かどうかを marketplace.json で確認してから reject）
**Bad:**
```markdown
Finding N-4 を accept: 「リリース運用ルールに従って version bump と CHANGELOG entry を追加する」ですべての skill 改修に対応する。
```
（project-local skill にまでルールを過剰適用すると、運用しない version 番号や entry が積み上がる。適用範囲を marketplace.json 登録有無で線引きすべき）
