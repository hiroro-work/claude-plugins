# mobpro Learning Gates

Operational detail for `mobpro`'s learning gates — the teach-back, the checkpoint forms, the error-reading practice, the prediction quiz, and the explanation-length discipline. `mobpro`'s SKILL.md holds each gate's firing condition and branch skeleton; this file holds the "how to run it" detail and the user-facing prompt wording. It is a `mobpro`-own reference (not a transcription of any `dev-workflow` file), read at M5 / M6 / M8 / M9.

The prompt wording is given as **paired bilingual samples** (a `language: ja` line and a `language: en` line) that demonstrate the runtime rendering; the surrounding meta-prose is the rule. Render each prompt in the run's resolved `language`.

## § A. Checkpoint 3 forms & dispatch

The M6 checkpoint (and any checkpoint another M-step invokes) selects **one** of three forms per firing — never all three at once:

- **(a) teach-back** — ask the junior to explain the change in their own words.
  - `language: ja`: `この変更が何をしているか、自分の言葉で説明してみて。`
  - `language: en`: `Explain in your own words what this change does.`
- **(b) lightweight quiz** — one `AskUserQuestion` with 2–3 choices, a single question probing a consequence of the change. **Not used when `quiz: false`** (form (b) drops out of the selection pool, leaving only (a) and (c)).
  - `language: ja`: `このバリデーションを外すと、どのテストが落ちる？`（選択肢 2〜3 個）
  - `language: en`: `If we remove this validation, which test fails?` (2–3 options)
- **(c) open question** — an open opportunity for questions.
  - `language: ja`: `ここまでで質問ある？`
  - `language: en`: `Any questions so far?`

**Tempo control (fixed by the `checkpoint` setting — no per-firing judgment):**

- `checkpoint: unit` — a checkpoint after **each** M6 implementation unit, plus the M5 teach-back.
- `checkpoint: subtask` — a **single** checkpoint after all M6 units complete, plus the M5 teach-back.
- `checkpoint: off` — **no** M6 checkpoint, and M5 is a normal approval with **no** teach-back (see § B).

In every setting, the junior's "understood, go ahead" (`進めて` / `go ahead`) always skips the individual checkpoint at hand.

**Form selection**: prefer the form **not** used most recently, so the checkpoints rotate rather than repeating one form. When `quiz: false`, rotate between (a) and (c) only. The "form used last" is tracked **inline within M6** as ephemeral per-run state; it is **not** a `§ Cross-step state variables` member (do not add it to that closed list).

**Wrong-answer handling**: when the junior's answer is wrong or incomplete, state the correct explanation briefly and move on. A checkpoint result **never** changes the implementation — comprehension checks and quality gates stay independent. Do not re-open or redo landed work because a checkpoint answer missed.

## § B. M5 teach-back

When `checkpoint` is **not** `off`, M5 opens with a teach-back before the approval judgment:

- `language: ja`: `このプランで何をどの順に作るか、自分の言葉で 2〜3 文にまとめてみて。`
- `language: en`: `In 2–3 sentences, summarize in your own words what this plan builds and in what order.`

Correct misunderstandings and fill gaps **one point at a time**, 2–3 lines each (per § E, explanation length discipline). Do not force the junior to restate a corrected point. After the teach-back, proceed to the M5 approval judgment.

When `checkpoint: off`, **skip the teach-back** and present a normal approval confirmation only.

## § C. M8 first-failure error-reading practice

When `error_reading_practice: true` **and** this is the **first** check/test failure of the run, hold before the AI fixes it and give the junior a chance to read the error:

- `language: ja`: `エラーが出た。まずエラーメッセージを読んでみて — どのあたりが原因だと思う？`
- `language: en`: `An error came up. Read the error message first — where do you think the cause is?`

After the junior's guess (or "I don't know" — do not press), the AI states the actual cause in 1–2 lines (per § E, explanation length discipline) and fixes it. **Second and later failures in the same run are fixed immediately** with no practice. The M9 loop-exit aggregate re-verification reuses M8's check/test procedure but **never** inserts the practice (it runs with practice off).

## § D. M9 pre-review prediction quiz + cross-check

When `quiz: true`, M9 opens — before dispatching `rules-review` and the code reviewer — with a single free-form prediction question:

- `language: ja`: `これからルール準拠チェックとコードレビューをかける。どこか指摘されそうな箇所、心当たりある？`
- `language: en`: `We're about to run the rules-compliance check and code review. Any spots you think might get flagged?`

After the review returns, cross-check the junior's prediction against the actual findings in 1–2 lines (per § E, explanation length discipline), **acknowledging the correctly-predicted points first** before noting what they missed. When `quiz: false`, skip the prediction question and the cross-check.

## § E. Explanation length discipline

To keep the learning tempo and avoid lecturing, every explanation the AI gives stays within these caps:

- **Preview** (M6 unit announcement): ≤ 6 lines.
- **Diff walkthrough** (M6): 1–2 lines per changed file, plus one line for a design decision when there is one.
- **Any other single explanation** the AI gives — M4 applied findings, M9 fixes, the M8 error-cause statement (§ C), the M9 prediction cross-check (§ D): 1–2 lines each.

This section is the **single consolidated statement** (source of truth) of the length discipline. The inline caps at their application sites — M4 / M9's "1–2 lines" per applied finding and M6's "≤ 6 lines" preview — are kept inline as load-bearing local values and are not rewritten; they instantiate this discipline. M6's checkpoint prose references this section rather than restating the caps.
