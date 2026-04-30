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
runs `(b) Edit → (d) Skill(verify-diff) → (d2) Skill(skill-review) ×3 →
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
| `notes-left` | `notes left after 3 iters (<n>)` | proceed to (f) |
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
- skill-review notes left after 3 iters (1)         # M2: iter 上限到達経路の残 notes
```
（同じ `notes_remaining_count` でも sub-condition が違うので warning 文字列を differentiate、SKILL.md にも区別意図を 1 行明記）
**Bad:**
```text
- skill-review notes left (3)
- skill-review notes left (1)
```
（同一文字列に集約すると user が「どの sub-source が threshold を踏んだか」を identify できず、後追い triage で原因切り分け不能）
