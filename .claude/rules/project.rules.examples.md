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

## Project-specific Patterns Examples

### `jq` の `null` 文字列フォールバック
**Good** (`skills/dev-workflow/references/self-retrospective.md` § 4 Assemble):
```bash
producer_version=$(jq -r '(.plugins[] | select(.name == "dev-workflow") | .version) // "unknown"' .claude-plugin/marketplace.json 2>/dev/null)
[ -z "$producer_version" ] && producer_version="unknown"
```
（filter 内で `// "unknown"` を使い、追加で post-pipeline `-z` ガードで「ファイル不在 / `jq` non-zero exit / 空出力」を吸収する 2 段構え）
**Bad:**
```bash
producer_version=$(jq -r '.plugins[] | select(.name == "dev-workflow") | .version' .claude-plugin/marketplace.json 2>/dev/null || echo unknown)
```
（`jq` は entry 不在時に literal `null\n` を stdout に出して **zero exit** するため `|| echo unknown` がフォーカルしない。文字列 `"null"` がそのまま下流に流れる）

### detached HEAD ガード
**Good** (`skills/dev-workflow-triage/SKILL.md` Step 1 Pre-flight):
```bash
if ! git symbolic-ref -q HEAD >/dev/null; then
  abort "detached HEAD: cannot save original branch reference"
fi
original_branch=$(git rev-parse --abbrev-ref HEAD)
```
（`symbolic-ref -q HEAD` の non-zero exit を以って detached HEAD を early detect、abort で summary に理由を出す）
**Bad:**
```bash
original_branch=$(git rev-parse --abbrev-ref HEAD)
# detached HEAD だと original_branch="HEAD" になり、後段の git switch "$original_branch" が「HEAD という名前のブランチ」を探して fail
git switch -c "$triage_branch" "$base"
# ... 作業 ...
git switch "$original_branch"  # detached HEAD の場合 silent fail / unexpected branch switch
```
（branch 操作を伴う routine スキルでは detached HEAD guard を必ず Pre-flight に置く）

### `refs/heads/<glob>` の single-quote
**Good** (`skills/dev-workflow-triage/SKILL.md` § Triage branch isolation):
```bash
triage_branch_base=$(git for-each-ref --sort=-refname 'refs/heads/triage-*' --format='%(refname:short)' | head -n1)
```
（zsh の `nomatch` option がデフォルト有効で、マッチが無いと shell が abort する。single-quote で shell 展開を防ぐ）
**Bad:**
```bash
triage_branch_base=$(git for-each-ref --sort=-refname refs/heads/triage-* --format='%(refname:short)' | head -n1)
```
（zsh で初回走行時に `triage-*` がマッチせず `zsh: no matches found: refs/heads/triage-*` で routine が silent halt）

### Run-level invariant の Pre-flight への hoist
**Good** (`skills/dev-workflow-triage/SKILL.md` Step 1 Pre-flight):
```markdown
**Cache run-level invariants** (used in every per-Finding loop iteration):
- `current_version`: resolve once via `jq -r '...' .claude-plugin/marketplace.json` (with the `// "unknown"` + `-z` guard pattern above)
- `changelog_content`: `Read` `CHANGELOG.md` once into memory

The per-Finding loop in § 3.3 references these cached values; do not re-resolve / re-Read inside the loop.
```
（loop に入る前に Step 1 Pre-flight に hoist し、N×M の jq / Read 累積を解消）
**Bad** (Step 3.3 per-Finding loop 内で毎回 resolve):
```markdown
For each Finding:
  current_version=$(jq -r '.plugins[] | ...' .claude-plugin/marketplace.json)
  changelog=$(cat CHANGELOG.md)
  ... (judgment using current_version / changelog) ...
```
（N Findings × M Finding-level operations で jq / Read が累積、Simplify 段階で頻出する fix 方向）

### disposition enum 拡張ではなく既存 enum の厳格化
**Good** (`skills/dev-workflow-triage/SKILL.md` § 3.3 Judge each Finding):
```markdown
**Reject criterion #1 (Already addressed) — strict form when `producer_version < current_version` or `unknown`**:
Reject only if **both** legs hold (cite the evidence inline in the rejection reason):
  (i) The CHANGELOG entries between `producer_version` and `current_version` contain a fix entry for the same `<target-skill>` matching this Finding's class;
  (ii) The current `<target-skill>` SKILL.md / references no longer exhibit the phenomenon described in the Finding.
If either leg has doubt, fall through to the standard checklist (do not reject).
```
（既存 reject #1「Already addressed」を 2-leg AND test で具体化、新 disposition value は追加しない）
**Bad:**
```markdown
Add a new disposition value `already-addressed-version` to the per-Finding record schema, distinct from `rejected`.
Mapping table updates: ... (downstream parser, aggregate counter, status enum 全部 update)
```
（新 enum value は downstream parser / mapping table / status enum 全部の update が必要、後方互換性も崩れる）

### counter 増分は「zero exit only / 失敗 path には without incrementing 明記」
**Good** (`skills/dev-workflow-triage/SKILL.md` § 3.4 (g) Commit):
```markdown
(g) Commit the staged change.
  - Zero exit: increment `triage_commit_count` by 1.
  - Non-zero exit: record `commit-failed` in the per-Finding record. **Do not increment `triage_commit_count`**.
```
（成功 / 失敗の両分岐で increment 命令を symmetric に明示）
**Bad:**
```markdown
(g) Commit the staged change. On zero exit, increment `triage_commit_count`. On non-zero exit, record `commit-failed`.
```
（失敗側で increment 命令を省略すると「省略 = increment しない」と読めるが「省略 = 既存実装由来の暗黙の increment」と誤読される余地が残る。symmetry を明示することで cleanup 条件のbistability を守る）

### dead flag よりも単一 counter で cleanup 条件を表現
**Good** (`skills/dev-workflow-triage/SKILL.md` Step 4 Summary auto-cleanup 判定):
```markdown
If `triage_commit_count == 0` and release-bookkeeping was skipped (no commits), run auto-cleanup:
  git switch "$original_branch" && git branch -D "$triage_branch_name"
```
（counter 単独で cleanup 条件を判定）
**Bad** (boolean flag + counter の合成):
```markdown
Set `triage_branch_active = true` when branch creation succeeds in Step 1 Pre-flight.
If `triage_branch_active && triage_commit_count == 0 && bookkeeping_skipped`, run auto-cleanup.
```
（fatal abort path は Step 4 summary を経由しないため `triage_branch_active` flag が判定に寄与する path が存在せず、dead flag に。Code Review iter 1 の「dead flag drop」finding パターン）

### Run-level 失敗系は per-Finding edge-case 表に混ぜない
**Good** (`skills/dev-workflow-triage/SKILL.md` Pre-flight 節 + `references/triage-criteria.md` Edge-case 表 を分離):
```markdown
# SKILL.md Pre-flight 節 (手続き的)
- `git switch -c <triage-branch>` 非ゼロ exit → abort `branch creation failed (base=<base>)`
- `git symbolic-ref -q HEAD` 非ゼロ exit → abort `detached HEAD: cannot save original branch reference`

# triage-criteria.md Edge-case 表 (per-Finding loop 内のみ)
| Edge case | Disposition |
|---|---|
| marketplace.json 不在 | `current_version = "unknown"` |
| Finding 文字列が malformed | per-Finding `parse-error` |
```
（Run-level boundary は SKILL.md Pre-flight に手続き的に記述、per-Finding edge-case 表は loop 内 case のみ）
**Bad** (両方を Edge-case 表に混在):
```markdown
| Edge case | Disposition |
|---|---|
| `git switch -c` 失敗 | abort run |
| 検出 HEAD detached | abort run |
| marketplace.json 不在 | `current_version = "unknown"` |
| Finding 文字列が malformed | per-Finding `parse-error` |
```
（Run-level / per-Finding の semantics scope が混ざり、loop 内 disposition と loop 外 abort が同列に並ぶことで読み手の判断が曖昧になる）

### Step 6 Simplify の rationale 段落は brevity を保つ
**Good** (`skills/dev-workflow/references/self-retrospective.md` § 4 jq pattern note, brief):
```markdown
> Resolve `<X.Y.Z>` via `jq`'s in-filter `// "unknown"` plus a post-pipeline `-z` guard. The `|| echo` fallback alone misses the case where `jq` outputs the literal `null\n` with zero exit (entry / key absent).
```
（technical context は 2 文に圧縮、Simplify-revival check で再導入された膨らみを brevity に戻す）
**Bad** (100+ words の rationale 段落):
```markdown
> The `<X.Y.Z>` resolution requires careful handling of three distinct error paths. First, when the marketplace.json file does not exist at the expected path, `jq` itself returns a non-zero exit code, and `2>/dev/null` suppresses the stderr. Second, when the file exists but the `dev-workflow` plugin entry is absent from the `plugins` array, `jq -r` outputs the literal string `null` followed by a newline to stdout, but importantly returns zero exit code... (以下 6 段落続く)
```
（technical 正確性は両方同じだが、配布スキル prose は brevity が要件。Code Review iter 2 で「英文 clarity / 冗長」として上がる頻出 finding）

### Branch behavior は completion で specify する（negation 禁止）
**Good** (`skills/dev-workflow-triage/SKILL.md` § Apply accepted Findings (D) Aggregate JSON parse and record-write):
```markdown
**Full record-write set (applies to both `aggregate.status == "ok"` and `aggregate.status == "callee-abort"`):**

- `record.verify_diff = aggregate.verify_diff.status`
- `record.iterations_used = aggregate.verify_diff.iterations_used`
- `record.skill_review = aggregate.skill_review.status`
- `record.publicity_review = aggregate.publicity_review.status`
- `record.publicity_iterations_used = aggregate.publicity_review.iterations_used`
- `record.warnings ⨃= aggregate.warnings`
- `record.outer_iter = aggregate.outer_iter`
- `record.outer_exit = aggregate.outer_exit`

**Branch-specific actions:**

- If `aggregate.status == "ok"`: proceed to (f) scope check
- If `aggregate.status == "callee-abort"`: revert paths via `git checkout HEAD -- <path>`, skip remaining (D) work for this Finding, record `commit-skipped`
```
（共通 record 書き込みを Full set として上に立て、分岐固有の動作だけを下に列挙）
**Bad** (negation で specify):
```markdown
- If `aggregate.status == "ok"`: write all `record.*` fields and proceed to (f)
- If `aggregate.status == "callee-abort"`: same record writes as `ok` except revert and skip (f)
```
（"same record writes ... except" の negation で specify すると、後追い読み手が defaults を再構築する必要があり、`iterations_used` / `warnings[]` のような aggregation field が hidden gap になる。Code Review iter 1 で Critical-severity finding として上がる）

### Pre-implementation smoke test (Step 0) for undocumented platform capabilities
**Good** (Plan の Test plan 節):
```markdown
**Step 0 Pre-implement smoke test (必須 — gating phase before Step 5)**:

1. Test 1 — Skill-from-subagent feasibility: dispatch `Agent` with `subagent_type: general-purpose` and have it call `Skill(verify-diff)`; PASS if subagent returns `SKILL-WORKS-IN-SUBAGENT` token
2. Test 2 — allowed-tools inheritance: enumerate subagent's tool set; verify `Skill` is included and `Agent` is NOT (recursion prevention)
3. Test 3 — outer-loop simulation: small fixture exercising the planned (d-loop) state machine
4. Test 4 — audit-trail recording: emit overall verdict ∈ {READY-TO-IMPLEMENT, NEEDS-FALLBACK, BLOCKED}

Risks § 4 mitigation: subagent 内 outer-loop 挙動 unknowns は Step 0 item #3 で必ず gate（"推奨" ではなく "必須"）。
```
（feasibility / tool inheritance / state-machine simulation / audit-trail の 4 項目で gate、wording は「必須」で統一）
**Bad** (Risks のみで mitigation を表現、smoke test を「推奨」と書く):
```markdown
**Risks**: subagent から Skill 呼び出しの実機可用性は前例なし。Step 0 smoke test を**推奨**。
```
（"推奨" だと iter 2 で Major-severity finding として上がる。前例なしの platform capability に依存する architectural rewrite では smoke test は必須化する）

### Dispatch-layer health と callee-layer health の counter 分離
**Good** (`skills/dev-workflow-triage/SKILL.md` (E) Per-Finding subagent error handling):
```markdown
**(E) Shared updates** — applies on E.1 (verdict parse failure) / E.2 (schema violation) / E.3 (tool error):

- Increment `D_dispatch_error_count` by 1
- Per-callee disable counters (`verify_diff_disabled` / `skill_review_disabled` / `publicity_review_disabled`) are **NOT** incremented or reset on the (E) path — only `D_dispatch_error_count` advances. Rationale: callee skills did not run, so per-callee health information is not observable from this turn
- If `D_dispatch_error_count >= 3`: set `D_dispatch_disabled = true` and skip subsequent (D) dispatches; `D_dispatch_error_count` resets to 0 only on a successful (D) dispatch
```
そして Step 4 aggregate render で:
```markdown
- (D) dispatch state: `enabled` or `disabled-after-errors` (D_dispatch_error_count=<n>); count of Findings with each (E) class
- per-callee disable state: `verify_diff` <enabled/disabled>, `skill_review` <enabled/disabled>, `publicity_review` <enabled/disabled> — independent observability axis from (D) state above
```
（dispatch-layer の health (`D_dispatch_*`) と callee-layer の health (`<skill>_disabled`) を別 counter / 別 render 行で表現）
**Bad** (両 layer を 1 counter に集約):
```markdown
**(E) Shared updates**: increment per-callee disable counter for whichever callee was about to run when (E) fired
```
（callee は走らなかったため per-callee health 情報を持たないのに increment すると Step 4 aggregate で「dispatch-layer error なのか callee-layer error なのか」が読めなくなる。observability axis が崩れる）

### Sequential N-callee orchestration を 1 Agent dispatch に集約
**Good** (`skills/dev-workflow-triage/SKILL.md` § Apply accepted Findings (D) Per-Finding subagent dispatch):
```markdown
For each accepted Finding, dispatch a single `Agent` (subagent_type: general-purpose) that internally runs the `Skill(verify-diff) → Skill(skill-review) → Skill(publicity-review)` chain and returns one aggregate JSON. Orchestrator-side decision points: 9 (3 callees × up-to-3 outer iters) → 1 (single aggregate parse).

Subagent prompt step 2 wording: "**Do not run further `Skill()` dispatches beyond the three enumerated below.** Each callee is invoked exactly once per outer-iter pass; do not dispatch additional Skill() calls outside this contract."

Aggregate JSON schema (top-level): `status` ∈ {`ok`, `callee-abort`, `error`}, `outer_iter`, `outer_exit`, plus nested per-callee return fields (`verify_diff.{status, iterations_used, reverted_paths, warnings}`, `skill_review.{status, applied_edits_count, notes_remaining_count, reason}`, `publicity_review.{status, iterations_used, reverted_paths, remaining_findings, reason}`).
```
（orchestrator stall surface を N→1 に削減、subagent prompt で追加 dispatch を明示禁止して subagent 内 stall surface も bound、aggregate schema で全 callee 状態を nest して carry）
**Bad** (orchestrator から sequential `Skill()` 直呼び):
```markdown
For each accepted Finding:
  Skill(verify-diff)     → parse JSON → branch
  Skill(skill-review)    → parse JSON → branch
  Skill(publicity-review)→ parse JSON → branch
  (each return point creates a JSON-echo turn-end opportunity for stall)
```
（reminder / closed list / anti-pattern 列挙系の prose discipline は diminishing returns に入っており、N decision points × 違反確率の積み上がりが構造的問題なので architectural fix が必要）

### Routing-field entry shape validation extension
**Good** (`skills/dev-workflow-triage/SKILL.md` (E.2) Schema violation):
```markdown
2. **Schema violation** — required keys (`verify_diff`, `skill_review`, `publicity_review`, `outer_iter`, `outer_exit`) are missing, values fail their expected shape, or any entry in `publicity_review.remaining_findings[]` lacks a non-empty string `file` (the callee-abort revert branch dereferences `<entry>.file` via `git checkout HEAD -- <path>`; without entry-shape validation the revert step crashes on malformed paths) → emit `{"status": "error", "reason": "verdict schema violation"}` and apply (E) Shared updates
```
（既存の `Edit` 向け entry-shape validation rule を class-level extend: `Edit` だけでなく `git checkout` を含む全 downstream tool call が dereference するフィールドを parse 段階で validate）
**Bad** (top-level keys のみ check):
```markdown
2. **Schema violation** — required keys missing or values fail their expected shape → emit error verdict
```
（routing-field の entry-shape validation がないと、revert path 計算で `git checkout` が malformed `<path>` で crash する経路が残る。iter 2 Code Review で Major finding として上がる）

### Bold-prose label cross-reference style
**Good** (`skills/dev-workflow-triage/SKILL.md` での cross-reference):
```markdown
Per the record-write rules in § Apply accepted Findings's "Per-Finding record kept in memory" paragraph, ...
```
（参照先が `### Heading` でなく段落冒頭の bold-prose label `**Per-Finding record kept in memory**` で identify される場合、`§ <Heading>'s "<bold label>" paragraph` の form で bold 内文言を verbatim で囲み込む）
**Bad** (存在しない heading に dangling reference):
```markdown
Per the record-write rules in § Apply accepted Findings record schema, ...
```
（`Apply accepted Findings record schema` という heading は実在せず、実体は bold-prose label。Code Review で Major-severity dangling cross-reference として上がる）

### Sibling enum field の symmetric extension audit
**Good** (`record.verify_diff` / `record.skill_review` / `record.publicity_review` enum 拡張):
```markdown
- `record.verify_diff` ∈ {`converged`, `unresolved`, `skipped`, `conflict`, `error`}
- `record.skill_review` ∈ {`clean`, `notes left after applied-edits (<n>)`, `notes left after max iters (<n>)`, `parse-error`, `error`}
- `record.publicity_review` ∈ {`converged-iter-<k>`, `unresolved-<count>`, `conflict (<reason>)`, `skipped (<reason>)`, `error`}
```
（3 sibling enum 全てに `error` 値を symmetric に追加、aggregate render の switch 文も全 enum を網羅）
**Bad** (片側だけ asymmetric に拡張):
```markdown
- `record.verify_diff` ∈ {..., `error`}
- `record.skill_review` ∈ {..., `error`}
- `record.publicity_review` ∈ {...}   # error が抜けている
```
（asymmetric に残すと aggregate render の `switch (record.publicity_review)` で `error` ケースが取りこぼされる。Code Review iter 2 / iter 3 の class-level extension audit で finding 化）

### Plan rewrite triggered by user material change at Step 4 gate
**Good** (Decisions § 1 で Alternative を採用と決定後の plan rewrite):
```markdown
- Title から旧 approach 由来の語句を削除（例: "1-pass linear" を削除）
- Context / Goal / Approach の旧記述を全て新 approach に置換、コスト削減効果が消える等の実態変化も明記
- Decisions § 1 の Recommendation と Alternative を swap（user 既選択を Recommendation に）
- Decisions § 3（旧 phased landing 議論）は #2 を切り離す path がなく意味喪失したため削除
- Risks § 4 を「subagent 内 outer-loop 挙動 unknowns」に完全置換（旧 approach 由来の Risks は残さない）
- Step 3-(N+1) で再 review iter を立ち上げてから ExitPlanMode で再提示
```
（material change 後の plan を 1 pass で end-to-end rewrite、Title / Context / Goal / Approach / Decisions / Risks 全節を sweep）
**Bad** (旧記述を残したまま新記述を併記):
```markdown
**Approach (revised)**: subagent 内に outer loop を移植して維持する案に変更（旧 approach: outer loop 廃止）
**Decisions § 1 (NEW Recommendation)**: subagent 内移植維持
**Decisions § 1 (旧 Recommendation, now Alternative)**: outer-loop 廃止
**Risks § 4 (revised)**: subagent 内 outer-loop unknowns（旧 risks: regression sensitivity loss）
```
（旧記述が残ったまま新記述を併記すると plan size が肥大化、Step 3-(N+1) reviewer に「buried decisions / scope creep」と再指摘される頻出パターン）

### Routine-side action ownership over environment-finalization delegation
**Good** (`dev-workflow-triage/SKILL.md` `## Commit policy` paragraph 2):
```markdown
`git push` is run by this routine — see `§ Push triage branch to origin` under
`§ Step 4 — Emit summary` (once per run at end of Step 4). Per-Finding (g) Commit
and Step 3.7 (j) bookkeeping only commit to local HEAD.
```
そして `§ Step 4 — Emit summary` 配下の新節:
```markdown
#### Push triage branch to origin

Run after the auto-cleanup decision settles, before emitting the summary stdout.

- If `triage_commit_count == 0` (auto-cleanup ran or attempted): no push
- If `triage_commit_count > 0`: `git push -u origin "$triage_branch_name"`...

**Session-level push-target conflict**: if operator-level instructions
(`CLAUDE.md`, session bootstrap, environment templates) name a different
"designated branch" as the push target, do **not** consolidate the triage
branch into that name. The triage branch name is per-run isolation
infrastructure (`§ Triage branch isolation`); consolidating into a different
name loses same-day re-run stacking semantics and disconnects the operator's
PR identity from the run timestamp. Reconcile post-run by rebase / merge
if needed, not by mid-routine rename.
```
（routine 自身が `git push` を once per run で実行、`Bash(git push *)` を `allowed-tools` に追加、session-level "designated branch" rule との conflict 文脈を SKILL.md 内に明記、design intent ベースの rationale を伴う禁止条項）
**Bad** (旧 prose):
```markdown
`git push` is not performed here — Claude Code on the Web's session
finalization handles pushes. Cross-run note: a prior run may have left
committed-but-unpushed changes on HEAD ...
```
（環境機能への委譲宣言。session-level rule との衝突点が SKILL.md 内で言及されず、別ブランチ名への consolidate 誤読を許す。local 環境では暗黙に push が落ちる feature parity 欠落も発生）

### Closed form-set invariant for multi-form summary tokens
**Good** (`dev-workflow-triage/SKILL.md` Step 4 `triage-branch:` summary bullet):
```markdown
- `triage-branch`: one of
  - `<triage_branch_name> (based on <triage_branch_base>) — <N> commits — pushed to origin` (push success)
  - `<triage_branch_name> (based on <triage_branch_base>) — <N> commits — push-failed (<reason>)` (push fail — branch retained for the operator to push manually)
  - `<triage_branch_name> (based on <triage_branch_base>) — created and deleted (0 commits)` (auto-cleanup case — partial-cleanup failures are reported via the separate `cleanup:` warning, not here)
```
そして `§ Auto-cleanup` で:
```markdown
- Render `triage-branch: ... — created and deleted (0 commits)` regardless of cleanup outcome —
  partial-cleanup failures (`cleanup: switch back failed (...)` / `cleanup: branch -D failed (...)`)
  surface via separate `cleanup:` warning lines, keeping the `triage-branch:` form set closed at 3
```
（form 数を 3 に bounded、partial cleanup failure は別 warning line に分離）
**Bad** (新 form を追加):
```markdown
- `triage-branch`: one of
  - `... — <N> commits — pushed to origin`
  - `... — <N> commits — push-failed (<reason>)`
  - `... — created and deleted (0 commits)` (auto-cleanup full success)
  - `... — partial cleanup: switch back failed` (auto-cleanup partial)   # 4th form
  - `... — partial cleanup: branch -D failed` (auto-cleanup partial)     # 5th form
```
（form 数が 5 に膨張。後追い読み手が switch 漏れする / class-level extension audit の対象が不明確になる）

### External-command failure: retry once + stderr-derived `<reason>` + no auto-recovery
**Good** (`dev-workflow-triage/SKILL.md` `#### Push triage branch to origin`):
```markdown
- `git push -u origin "$triage_branch_name"`. On non-zero exit, retry once after a
  1–2 second sleep; on the second non-zero exit, record `push-failed (<reason>)`
  and stop retrying
- On zero exit (initial attempt or the single retry): record push status
  `pushed to origin` for the `triage-branch:` summary line
- On the second non-zero exit: record push status `push-failed (<reason>)` and
  surface as a non-fatal warning per `§ No-Stall Principle`. `<reason>` is the
  **last non-empty line of `git push` stderr, truncated to ≤ 80 characters** —
  sufficient for an operator to distinguish auth / network / non-fast-forward /
  hook-rejection without inventing a classification taxonomy. If stderr has no
  non-empty line (empty or whitespace-only), render `push-failed (no stderr)`.

  Do **not** auto-recover (no force push, no rebase, no branch rename) —
  the operator can `git push` manually post-run
```
（retry 1 回・1–2 second sleep、stderr 最終 non-empty 行 ≤ 80 文字 truncate、空 / whitespace-only fallback `(no stderr)` 明記、auto-recovery 禁止条項）
**Bad** (over-spec retry / fragile reason / 暗黙 recovery 容認):
```markdown
- `git push -u origin "$triage_branch_name"` with exponential-backoff retry
  (4 retries: 2s, 4s, 8s, 16s)
- On persistent failure, append `— push failed (<exit reason>)` and surface as
  a warning
```
（4 段 retry は deterministic rejection（auth / non-fast-forward / hook）には無効で over-spec、`<exit reason>` の抽出仕様が未定義で empty stderr 経路が render すると漏れ、auto-recovery を禁止する文言が無いため downstream LLM が `rebase してから retry` を hallucinate）

### Mis-justification audit when citing infrastructure mechanisms
**Good** (`dev-workflow-triage/SKILL.md` § Push triage branch to origin の禁止条項 rationale):
```markdown
**Session-level push-target conflict**: ... do **not** consolidate the triage
branch into that name. The triage branch name is per-run isolation
infrastructure (`§ Triage branch isolation`); consolidating into a different
name loses same-day re-run stacking semantics and disconnects the operator's
PR identity from the run timestamp.
```
（design intent ベース — 「per-run isolation を失う」「operator の PR identity が run timestamp と切れる」という実態を justify。引用する mechanism が「実際にどう動くか」の主張ではない）
**Bad** (誤った mechanism 引用):
```markdown
**Session-level push-target conflict**: ... do **not** consolidate the triage
branch into that name. The triage branch name is per-run isolation
infrastructure; losing the name loses same-day re-run stacking semantics
since `§ Triage branch isolation`'s `git for-each-ref` requires prior-run
`triage-*` to survive on origin.
```
（`git for-each-ref` は local refs を読むので origin 残存は要件ではない。誤引用が peer review iter 1 で Major finding として上がる）

### Cross-section rendering-authority pointer (computed-here / rendered-there)
**Good** (`dev-workflow-triage/SKILL.md` の 2 sections 相互ポインタ):
```markdown
#### Auto-cleanup of empty triage branch

Run **before** `§ Push triage branch to origin` and the summary stdout
(Auto-cleanup determines the rendering of the 0-commit form only — the
>0-commit form's suffix is decided by `§ Push triage branch to origin` below).

...

When `triage_commit_count > 0`, do **not** run the cleanup ... Render the
appropriate `<N> commits` form per `§ Step 4 — Emit summary` `triage-branch`
bullet (the post-push state determined by `§ Push triage branch to origin`
decides between the `pushed to origin` and `push-failed (<reason>)` suffix).

#### Push triage branch to origin

Run **after** the auto-cleanup decision settles, **before** emitting the
summary stdout (so the `triage-branch` summary line above can render the
post-push state).
```
（実行順 + 各 section の rendering 担当範囲が両方向から読める。0-commit form / >0-commit form の決定権がどちらにあるか明示）
**Bad** (片方向のみ / 相互ポインタ無し):
```markdown
#### Auto-cleanup of empty triage branch

If `triage_commit_count == 0`, run cleanup and render `... — created and deleted (0 commits)`.

#### Push triage branch to origin

If `triage_commit_count > 0`, push and render `... — pushed to origin` or
`... — push-failed (<reason>)`.
```
（実行順序 / どちらが最終 render を確定するかが prose から読めず、後追い読み手は section 順序とコード読みで再構築する必要がある）

### Agent definition (`.claude/agents/<name>.md`) frontmatter `allowed-tools` requirement
**Good** (`.claude/agents/triage-per-finding-reviewer.md` frontmatter):
```yaml
---
name: triage-per-finding-reviewer
description: |
  Per-Finding review chain executor for dev-workflow-triage's § Apply accepted Findings (D) sub-step.
  Runs verify-diff → skill-review → publicity-review wrapped in an outer review loop (max 3 iterations)
  inside a single Agent dispatch, and emits a single fenced aggregate JSON verdict.
  Designed exclusively for dev-workflow-triage; not a general-purpose review agent.
allowed-tools: Read, Edit, Agent, TodoWrite, Skill(verify-diff), Skill(skill-review), Skill(publicity-review), Bash(git diff *), Bash(git rev-parse *), Bash(git checkout HEAD -- *)
---
```
（callee 3 skills (`verify-diff` / `skill-review` / `publicity-review`) の `allowed-tools` union + `Skill(<name>)` 参照を明示。`Bash(*)` を避けて callee と同じ glob 粒度。nested dispatch が permission denied にならない）
**Bad** (`name` / `description` のみで `allowed-tools` が抜けている):
```yaml
---
name: triage-per-finding-reviewer
description: |
  Per-Finding review chain executor ...
---
```
（agent dispatch 自体は通るが、subagent 内で `Skill(verify-diff)` 呼び出しが permission denied で fail。SKILL.md / marketplace.json と違って `/verify-plugins` の構造検証では検出されず、実 routine 走行で初めて surface する silent failure 経路）

### Subagent inline-execution prohibition for `Skill(<callee>)` dispatches in agent definitions
**Good** (`.claude/agents/triage-per-finding-reviewer.md` の `## Inputs` と `## Flow` の間に `## Dispatch discipline` 節を新設):
```markdown
## Dispatch discipline

Each callee (verify-diff, skill-review, publicity-review) **MUST** be invoked via
its `Skill(<name>)` tool call. Do not read, interpret, or replicate any callee's
SKILL.md logic inline — even if the callee's SKILL.md content is visible in your
context. Do not construct or simulate callee verdicts — dispatch the `Skill()`
tool call and let the callee produce its own fenced JSON verdict. The Flow steps
then inspect the returned verdict fields as specified.

Concretely: when the Flow says "dispatch `Skill(verify-diff)`", issue a
`Skill(verify-diff)` tool call and wait for its return. Do not substitute your
own evaluation of the diff, scenario generation, or verdict construction. The
same applies to `Skill(skill-review)` and `Skill(publicity-review)`.

**Do not run further `Skill()` dispatches beyond the three enumerated above.**
Each callee is invoked exactly once per outer-iter pass; do not dispatch
additional `Skill()` calls outside this contract.
```
（3 段落の意図的重複: positive obligation / concrete example / closed-set bound の 3 angle 補強。callee 内部スキーマの具体的 field 名は書かない）
**Bad** (`## Dispatch discipline` 節が無い、または弱い 1 行のみ):
```markdown
## Inputs

The orchestrator provides ... `target_file`, `description`, `suggested_fix_direction`, ...

## Flow

Initialize `outer_iter = 0`, `outer_exit = "—"`.

For `k` in `1..3`:
  1. Dispatch `Skill(verify-diff)` with `Description` / `Suggested fix direction` / ...
  2. ...
```
（`allowed-tools` に `Skill(verify-diff)` があると callee SKILL.md が context に injected され、subagent が dispatch せず inline 実行して verify-diff 内部の `{"status": "converged", ...}` を返す failure mode が発生。orchestrator (E.2) schema violation で 3 連続 fail → `D_dispatch_disabled = true` で残り全 Finding が skip される。Flow に "dispatch `Skill()`" と書くだけでは positive obligation の reinforcement が不足）

### Routing-identifier permissive / content strict layering
**Good** (`dev-workflow-triage/SKILL.md` § Step 3 prelude / Body parse):
```markdown
> Every open issue proceeds directly to body parse — there is no title-level
> pre-check. Body parse is the canonical discriminator between triage candidates
> and unparseable issues; title format may evolve (grammar variations like
> `1 finding` vs `N findings`) without breaking triage routing.

#### 3.2 Body parse

- **Trailer** (optional cross-check): `^Findings: (\d+)$` near the end. When
  present, the captured count cross-checks against the number of `### Finding`
  headings; the heading count is canonical regardless of whether the trailer
  is present.
- **Parse-error conditions** (strict — these gate triage validity):
  - Zero `### Finding` headings in the body
  - Trailer is **present** and its count disagrees with the `### Finding`
    heading count
  - Any Finding's Target skill is outside the 4-skill bundle
  - Any of the 4 required fields is missing in any Finding
  - Category is outside the 5-value set
```
（identifier layer は廃止 / permissive、content layer の 4 fields + enum 検証は strict 維持）
**Bad** (identifier layer に strict check を残す):
```markdown
#### 3.1 Title match

- Match `^\[auto-retrospective\] dev-workflow-bundle: \d+ findings`. On mismatch,
  skip the issue and record `title-mismatch-skip`.

#### 3.2 Body parse

- **Trailer** (required): `^Findings: (\d+)$` must be present near the end.
  Absence is a parse-error condition.
```
（`\d+ findings` で `1 finding` 単数形が silent skip される、trailer 欠落で本来 triage 可能な issue が parse-error 経路に倒れる。identifier と content を同水準の strict 検証で書くと grammar 揺れ / format 揺れで silent skip 経路が開く）

### Vacuous-truth gap in per-element ALL-quantifier close predicates
**Good** (`dev-workflow-triage/SKILL.md` § 3.6 Close decision):
```markdown
Close the issue if **both** legs hold (2-leg AND predicate):

1. **Whole-state gate**: the body parse produced at least one `### Finding`
   entry — i.e. this is NOT a whole-issue parse-error path. Whole-issue
   parse-error issues are left open and surface via the per-issue comment;
   no close decision is made here.
2. **Per-element check**: every parsed Finding was either accepted (commit
   landed in this run's triage branch) or rejected with reason cited in the
   per-Finding comment.

> Per-element ALL-quantifier alone is insufficient — must be gated by the
> whole-state predicate to avoid vacuous-true regression on empty / aborted
> state (zero Findings vacuously satisfies "every Finding is OK").
```
（whole-state gate で zero-record / abort-state を弾いてから per-element check を評価）
**Bad** (per-element ALL-quantifier 単独):
```markdown
Close the issue if **every parsed Finding** was either accepted or rejected
with reason cited.
```
（whole-issue parse-error で Finding 配列が空のまま close 判定に入ると vacuous-true で auto-close が起動する silent regression。plan 段で behavior が抽象的に扱われるため Step 3 reviewer が見落とし、Step 8 Code Review で Critical-severity finding として初めて catch される）

### Closed-list extension audit across SKILL.md ↔ `references/*.md`
**Good** (SKILL.md parse-error 条件追加と同時に reference 表も同期):
```markdown
# .claude/skills/dev-workflow-triage/SKILL.md
**Parse-error conditions** (closed list):
- Zero `### Finding` headings in the body                          # ← 新規追加
- Trailer is present and its count disagrees with heading count
- Any of the 4 required fields missing
- Target skill outside the 4-skill bundle
- Category outside the 5-value set

# .claude/skills/dev-workflow-triage/references/triage-criteria.md
> Source of truth: SKILL.md § Parse body parse-error conditions;
> this table mirrors that list — keep in sync.

| Edge case | Disposition |
|---|---|
| Zero `### Finding` headings        | parse-error / leave open |   # ← 同期追加
| Trailer present & count mismatch   | parse-error / leave open |
| 4 required fields missing          | parse-error / leave open |
| Target skill outside bundle        | parse-error / leave open |
| Category outside 5-value set       | parse-error / leave open |
```
（SKILL.md 側 closed list 追加 → reference 側 table 行追加を 2-step audit で同時に。source-of-truth directive 行で bidirectional 追従義務を明文化）
**Bad** (片側だけ追加):
```markdown
# SKILL.md
**Parse-error conditions**:
- Zero `### Finding` headings in the body   # ← 新規追加
- ... (既存 4 条件)

# triage-criteria.md
| Edge case | Disposition |
|---|---|
| Trailer present & count mismatch   | parse-error |
| 4 required fields missing          | parse-error |
| Target skill outside bundle        | parse-error |
| Category outside 5-value set       | parse-error |
# "Zero `### Finding` headings" 行が抜けたまま
```
（SKILL.md と reference の closed list が drift し、reference 側 Category 行を読んだ reader / downstream consumer が古い列挙で判断する経路が残る。Code Review iter 2+ で Major-severity な cross-file inconsistency finding として上がる）

### Step renumbering propagation (Generic rule + Individual overrides)
**Good** (Plan の Design § F):
```markdown
#### F. cross-reference 一括更新

**Generic rule (mechanical sweep)**:
- 旧 Step 9 (Update Rules) → 新 Step 11
- 旧 Step 9.5 → 新 Step 11.5
- 旧 Step 10 (Completion Hooks) → 新 Step 9
- 旧 `runs after Step 10` 系 → `runs after Step 11.5`

**Individual overrides (mechanical sweep を適用しない)** — line 番号は pre-edit reference:
- L66: `Runs after Step 9` → `Runs as Step 9 (immediately after Step 8).`
  理由: `on_complete` は新番号で Step 9 そのもので、generic rule を機械適用すると `Runs after Step 11` という意味的誤りになる
- Step 8 return-point reminder: `Step 9 transition` → `Step 9 (Completion Hooks) transition` で disambiguate
- L116 (No-summary turn 段落): `runs after Step 10` → `runs after Step 11.5`、`returning no new rules at Step 9` → `Step 11`
```
（2 階層に分けて記述：mechanical sweep が安全な参照群 + 個別 override が必要な参照群）
**Bad** (全部 mechanical sweep に倒す):
```markdown
**Cross-reference update**: 旧 Step 9 → 新 Step 11 / 旧 Step 9.5 → 新 Step 11.5 / 旧 Step 10 → 新 Step 9 を全部 sed -i で機械置換
```
（`on_complete: Runs after Step 9` の `Step 9` まで `Step 11` に書き換わって、hook の section 自体が `Runs after Step 11` と書かれる意味的誤りが発生）

### TodoWrite single-row for unknown sub-iteration count
**Good** (`dev-workflow/SKILL.md` Step 1 sub-step 7):
```markdown
- Step 10: Interactive Commits (only if `interactive_commits` is `true`; single row — per-commit iteration is handled inline within Step 10 because the commit count is not known until the proposal phase)
```
（commit 数が approval gate 通過時に確定するため registration 時には per-commit 展開できない旨を annotation で明示）
**Bad** (per-commit row に展開):
```markdown
- Step 10: Interactive Commits
- Step 10-1: Commit 1
- Step 10-2: Commit 2
- Step 10-N: Commit N
```
（N が未確定なので registration できない。mid-flight で TodoWrite を書き換える stall surface が増える）

### Behavior-change default-flip → CHANGELOG opt-out note + downstream automation visibility
**Good** (CHANGELOG.md entry):
```markdown
### dev-workflow v1.35.0 / dev-workflow-bundle v1.35.0

- feat(dev-workflow): introduce Step 10 Interactive Commits and reorder post-Step-8 phases. **Default: enabled** — set `interactive_commits: false` in `.claude/dev-workflow.md` or `~/.claude/dev-workflow.local.md` to opt out. The new step runs after hooks.on_complete and proposes commit groupings + messages for user approval, then iterates per-commit. extract-rules and self-retrospective now run after the commit phase.
```
そして Plan の Risks § 3:
```markdown
3. **Default `true` の behavior change 波及**: 全 dev-workflow ユーザーの next workflow run で Interactive Commits gate 起動。CHANGELOG entry で `interactive_commits: false` opt-out を明示 + minor bump (1.35.0) を compatibility signal とする。**Downstream automation 補足**: 「dev-workflow 終了時の uncommitted state」依存の user 側 automation がある場合 minor bump では signal 強度不足の可能性 → CHANGELOG note で visibility 確保
```
（CHANGELOG entry 冒頭に opt-out 手順を loud に表記 + downstream automation note）
**Bad** (minor bump だけで signal とする):
```markdown
### dev-workflow v1.35.0

- feat(dev-workflow): introduce Step 10 Interactive Commits.
```
（default flip の事実が entry から読み取れず、opt-out 方法も書かれていない。`hooks.on_complete` 終了後に uncommitted state を期待する user 側 automation が silent breakage する）

### Multi-form gate vocabulary disambiguation in § No-Stall Principle
**Good** (`dev-workflow/SKILL.md` § No-Stall Principle):
```markdown
- **Step 10 commit-plan approval gate** — accept the proposed commit grouping (subjects + file lists) for the working-tree changes; fires once on the initial plan and re-fires whenever a `Mid-loop adjust` file-regrouping / split-adding branch rebuilds the un-landed portion of the plan
- **Step 10 per-commit accept gate** — accept each individual commit (subject / body / files / diff) before it lands; repeats N times where N is the approved commit count, judged per § Approval token closed list inside Step 10
- **Step 10 fold-or-defer gate** — after a pre-commit hook auto-modifies the working tree following a zero-exit commit, ask the user whether to amend the just-landed commit (`fold`) or leave the changes uncommitted for a later iteration (`defer`); judged per the distinct `fold` / `defer` / `cancel` binary classifier in Step 10's `Post-commit auto-modify cycle bound` paragraph (not the per-commit-accept-gate enum)
- **Step 10 ambiguous-adjust clarifier** — when a `Mid-loop adjust` request cannot be classified into branches a–g, ask the user a clarifying question and re-enter the gate that issued the request
```
（4 gate を別 bullet で列挙、fold-or-defer の binary classifier が per-commit accept gate の enum とは区別される旨を明示）
**Bad** (merge して 1 bullet):
```markdown
- **Step 10 user-gates**: commit-plan approval / per-commit accept / fold-or-defer / clarification — judged per § Approval token closed list
```
（fold/defer の binary semantics が accept/adjust/cancel の 4 値 enum に conflate されて、reader が「fold は adjust ですか？」のような取り違えをする）

### `git status --porcelain=v1 --untracked-files=all -z` canonical pattern
**Good** (`dev-workflow/SKILL.md` Step 10 Procedure):
```markdown
1. **Collect changes**: run `git status --porcelain=v1 --untracked-files=all -z` once (the `=v1` form pins format; `--untracked-files=all` overrides any user-side `status.showUntrackedFiles=no` config; `-z` emits NUL-separated entries with no C-style quoting so filenames containing spaces, quotes, or non-ASCII characters are recoverable verbatim). Parse the NUL-separated output: entries prefixed `??` are untracked, others are tracked changes.

...

- **c. Stage**: run `git add -- "<file-1>" "<file-2>" ..." in a single invocation with one explicit pathspec per file (verbatim filenames recovered from Procedure 1's `-z` output — never the C-quoted form). The `--` separator + double-quoting handle spaces, quotes, and non-ASCII characters; `-A` and other bulk forms are forbidden because they may stage unrelated drift
```
（`=v1` format pin + `--untracked-files=all` user config override + `-z` C-quoting 抑制 + multi-pathspec single call + `--` separator + double-quote + `-A` 禁止）
**Bad** (`-z` 省略 + bulk staging):
```markdown
1. Run `git status --porcelain` to list changes.
- Stage: `git add -A`
```
（filename に space を含むケースで C-quoted 形式が emit されて downstream pathspec mismatch、`-A` で unrelated drift staging）

### Untracked-file `Read` fallback for all-changes diff presentation
**Good** (`dev-workflow/SKILL.md` Step 10):
```markdown
1. ...Then run `git diff <base-commit>` once to capture the per-file diff for **tracked** files; for **untracked** files the diff is empty, so for each untracked path also `Read` its file contents and treat that as the "diff" to present at `Per-commit loop`'s `Present` step (since `git diff` omits untracked paths by design)

...

- **a. Present**: show the current commit's `subject`, `body` (if any), file list, and the diff of those files. Tracked files use the per-file portion of the diff captured at Procedure 1; **untracked** files use the full file contents (also captured at Procedure 1) shown as a "new file" hunk — make the untracked status explicit in the presentation so the user can distinguish "added file" from "modified file" before approving
```
（tracked / untracked 2 経路明示、once Procedure 1 で in-memory に保持して reuse、UI 上 untracked status を明示）
**Bad** (`git diff` のみで untracked 無視):
```markdown
1. Run `git diff <base-commit>` to capture all changes.
- Present: show subject, body, file list, and the diff.
```
（untracked files が presentation から silent に欠落、user が新規 file の存在を把握できないまま approve）

### Counter lifecycle: zero-exit-only increment + amend exclusion
**Good** (`dev-workflow/SKILL.md` Step 10 landed_count lifecycle):
```markdown
4. **Per-commit loop**: initialize `landed_count = 0` at the start of the loop; then process each commit in order:
   ...
   - **d. Commit**: ...On zero exit, **increment `landed_count` by 1**.
   - **e. Non-zero-exit retry (commit-attempt failure)**: ...Then **stop Step 10**. **Do not increment `landed_count`**. Do not auto-recover ...

5. **Post-commit auto-modify cycle bound**: ... On `fold`: ... `git commit --amend --no-edit` ... to incorporate them. The amend re-commits the same logical commit — `landed_count` is **not** re-incremented.
```
（4 点 explicit: initialize / zero-exit increment / 失敗 path no increment / amend no re-increment）
**Bad** (lifecycle 不完全):
```markdown
4. Per-commit loop: for each commit, run git add then git commit. Increment landed_count after commit. On failure, stop.
5. If hook auto-modifies, do git commit --amend.
```
（amend が landed_count を再 increment するかが ambiguous、failure path で increment するかが implicit。downstream routing の bistability が崩れる）

### Routing on `<counter> > 0` vs config-flag alone
**Good** (`dev-workflow/SKILL.md` Completion subtask continuation):
```markdown
5. **If a next subtask exists**: branch on **whether Step 10 actually landed any commits this run** (use the landed_count from Step 10 — taking the config flag alone would mis-route the case where `interactive_commits: true` met the Step 10 skip conditions and exited at zero commits):
   - `landed_count > 0`: tell the user the current subtask's changes have already been committed by Step 10 — open a PR for those commits, then start a new session with `/dev-workflow --resume <slug>` once the PR is up
   - `landed_count == 0` (either because `interactive_commits: false` or because Step 10 was skipped): tell the user to commit the current subtask's changes and open a PR *before* resuming
```
（counter で routing、`landed_count == 0` の 2 cause を OR で union 説明）
**Bad** (config-flag で routing):
```markdown
5. **If a next subtask exists**:
   - `interactive_commits: true`: Step 10 で commit 済み — PR を開いてから resume
   - `interactive_commits: false`: commit してから resume
```
（`interactive_commits: true` だが skip 条件で 0 commits 終了した case が「commit 済み」branch に倒れて、user に "PR を開いてから resume" と案内するが実際は commit が無い silent regression）

### 2-stage grep audit for cross-file Step renumbering
**Good** (Plan Test plan step 5):
```markdown
5. **Cross-ref sweep (line-by-line checklist)** — § F / § I / § J で列挙した line ごとに phrase 確認。**line 番号はすべて pre-edit reference** であり、最終確認は phrase / heading anchor で行う。2 段階 grep で漏れ検出:
   1. 旧 section heading 句（`Step 9: Update Rules|Step 9\.5: Self-Retrospective|Step 10: Completion Hooks`）が 0 hit
   2. `\b(Step 9|Step 9\.5|Step 10)\b` の残り hit が新ナンバリング下の正規参照であることを目視確認
```
（phrase-only + word-boundary の 2 段で false-negative / false-positive を両方抑え、pre-edit line number と最終 phrase anchor 確認を明示）
**Bad** (broad grep のみ):
```markdown
5. `grep -rn "Step 9" skills/` で残り参照を確認
```
（旧 section heading の取り残しと新ナンバリング下の正規参照が両方 hit して切り分けできず、reviewer が手で目視する必要が出る）

### Token defined-once + cross-reference (re-render 禁止)
**Good** (`dev-workflow/SKILL.md` § Step 10 + § Completion):
```markdown
# § Step 10 (canonical definition site)
**Localized summary tokens** (per [`references/plan-format.md`](references/plan-format.md) § Localization granularity). These tokens are defined here as the single source of truth — `§ Completion` below references the same paired form rather than re-rendering it:

- `language: ja`: `Step 10 部分完了: <N>/<total> コミット適用済み`
- `language: en`: `Step 10 partial completion: <N>/<total> commits landed`

# § Completion (cross-reference, no re-render)
**Step 10 partial-state line**: if Step 10 ended via its `Mid-loop cancel` branch, emit the localized partial-completion token defined at § Step 10's "Localized summary tokens" paragraph. On a normal completion path, omit this line.
```
（canonical 定義は § Step 10 に 1 箇所、§ Completion は bold-prose paragraph reference 形式で参照）
**Bad** (§ Completion でも再記述):
```markdown
# § Step 10
**Localized summary tokens**:
- `language: ja`: `Step 10 部分完了: <N>/<total> コミット適用済み`
- `language: en`: `Step 10 partial completion: <N>/<total> commits landed`

# § Completion
**Step 10 partial-state line**: if Step 10 ended via Mid-loop cancel:
- `language: ja`: `Step 10 部分完了: <N>/<total> コミット適用済み`
- `language: en`: `Step 10 partial completion: <N>/<total> commits landed`
```
（同じ token を 2 箇所に記述すると wording 更新時に drift する）

### Step 4 user material change: Recommendation/Alternative swap + 「user 既選択」 annotation
**Good** (Decision 2 を user が Alternative 採用に変更した後の plan rewrite):
```markdown
#### Decision 2. `interactive_commits` のデフォルト値 — **user 既選択: `true`（opt-out）**
- **Question**: 新 Step 10 をデフォルトで実行するか
- **Recommendation**: デフォルト `true`（opt-out）。**user が Step 4 gate でこちらを選択**。理由: 「dev-workflow は clean な commit 状態で終わる」を canonical flow として位置づける
- **Alternative**: デフォルト `false`（opt-in）。silent behavior change を避けたい場合の選択肢。コスト: 配布されるスキルの canonical flow が "commit しない" 状態に留まる
- **CHANGELOG note**: default `true` 採用により merge 直後の next workflow run で全 user の挙動が変わる ...
```
そして関連節も新 Recommendation 文脈に sweep:
```markdown
- Scope adjusted: 4 files (`.claude/dev-workflow.md` no longer in scope since default `true` means no opt-in needed in this repo)
- Design § B: default true + non-boolean fallback direction flipped (warn + default true)
- Risks # 3 rewritten: now describes default `true` behavior change risk + mitigation
```
（Recommendation/Alternative swap + 「user 既選択」 annotation + Scope / Design / Risks の同期 sweep）
**Bad** (旧 Recommendation を残したまま新 Alternative を併記):
```markdown
#### Decision 2. `interactive_commits` のデフォルト値
- **Recommendation (旧)**: デフォルト `false`（opt-in）
- **Recommendation (新 — user 選択)**: デフォルト `true`（opt-out）

#### Risks
3. デフォルト `false` の silent behavior change 回避（旧 plan の Risk）
3b. デフォルト `true` の全 user behavior change 波及（新 plan の Risk）
```
（旧 / 新 が併記されると plan size 肥大 + Step 3-(N+1) reviewer が「どちらが live なのか」と困惑して再指摘）
