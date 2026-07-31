# mobpro Learning Gates

Operational detail for `mobpro`'s learning gates — the M6 diff review, the M8 error narration, the M9 prediction narration, and the explanation-length discipline. `mobpro`'s SKILL.md holds each gate's firing condition and branch skeleton; this file holds the "how to run it" detail and the user-facing prompt wording. It is a `mobpro`-own reference (not a transcription of any `dev-workflow` file), read once at M6 loop entry (§ A is loop-invariant) and at M8 / M9.

The prompt wording is given as **paired bilingual samples** (a `language: ja` line and a `language: en` line) that demonstrate the runtime rendering; the surrounding meta-prose is the rule. Render each prompt in the run's resolved `language`.

Nothing here asks the junior to answer a comprehension question (`SKILL.md` § Learning-Stop Principle's "Narration is not a stop" paragraph). The AI narrates; the junior learns by reading each diff and asking whatever the narration left open.

## § A. M6 diff review

The junior reviews each implementation unit's diff. This is the implementation loop's recurring learning stop and where their questions land; `SKILL.md` § Learning-Stop Principle owns its firing condition and [`diff-review.md`](diff-review.md) its display surface.

**Opening the review**: state the point of this unit's diff, then hand the diff over.

- `language: ja`: `この unit の差分です。<この差分の狙い>。気になるところがあれば聞いて。`
- `language: en`: `Here's this unit's diff. <the point of this diff>. Ask about anything that stands out.`

**Question handling**: the review **blocks on the junior's turn** — hand the diff over and wait, because a stop they cannot speak into is not a review. Answer each question within the § D length, then wait again. Once their turn arrives carrying no question, do **not** solicit a second one: move to the next unit. A junior's "understood, go ahead" (`進めて` / `go ahead`) ends the review at hand immediately.

**Change requests raised during the review**: a comment asking for a code change is applied like any other review finding — fix it, explain the fix within the § D length, and re-present the diff. A question that needs no code change is answered and does not re-open the unit.

## § B. M8 error narration

When `check_commands` or `test_commands` fails, the AI does not stop to hand the error to the junior — it narrates its own read of the error, then fixes it. **Every** failure is narrated; there is no first-failure-only special case, and a verification-pass re-entry of M8 narrates the same way (so `SKILL.md` § Learning-Stop Principle's "Primary-pass rule" paragraph does not reach this section).

- `language: ja`: `<コマンド名> が落ちた。<エラーメッセージのどこを見て何を読み取ったか>。原因は<原因>なので<直し方>で直す。`
- `language: en`: `<command> failed. <which part of the error message was read, and what it says>. The cause is <cause>, so the fix is <fix>.`

## § C. M9 pre-review prediction narration + cross-check

Before dispatching `rules-review` and the code reviewer, the AI states where it expects findings to land, naming the specific spots and why they are exposed. **Order the prediction with what this run wrote first** (the code and prose just added — e.g. a rule or bookkeeping paragraph added for consistency) ahead of any prediction about pre-existing assets, because findings concentrate on freshly-written content far more often than on long-standing code, so leading with it counters the reflex to predict outward while the risk sits inside. The sample below shows the single-spot form; with more than one spot, fill the slot with one clause per spot in that order, and when no pre-existing asset is worth predicting, name only this run's text rather than adding a negative prediction:

- `language: ja`: `これからルール準拠チェックとコードレビューをかける。<指摘されそうな箇所>が引っかかりそう — <理由>。`
- `language: en`: `We're about to run the rules-compliance check and code review. I expect <spots> to get flagged — <why>.`

When `N_code` is `0` the code reviewer is not dispatched, so drop the code-review half of the localized pair above — `コードレビュー` / `code review` — and name only the rules-compliance check (`SKILL.md` M9 sub-step 1's **Pre-review prediction narration**). After the reviews return, cross-check the prediction against the actual findings, **acknowledging what the prediction got right before naming what it missed** — the miss is the part worth explaining. This narration fires only on M9's primary pass (`SKILL.md` § Learning-Stop Principle's "Primary-pass rule" paragraph).

## § D. Explanation length discipline

Narration is the session's main channel, so these caps are wide enough to carry a real explanation and narrow enough to stay out of lecture territory:

- **Preview** (M6 unit announcement): ≤ 6 lines.
- **Per-file walkthrough** (M6): 1–3 lines per changed file, plus 1–2 lines for why it was done that way.
- **Narration-class single explanations** — M3's design-approach narration, M5's plan explanation, the M8 error read (§ B), the M9 prediction and its cross-check (§ C), and each answer to a junior's question (§ A): 2–3 lines each.
- **Applied-finding explanations** (M4 and M9, one per finding): 1–2 lines each — deliberately tighter than the narration class, because a findings list is read as a list.

This section is the **single consolidated statement** (source of truth) of the length discipline. The inline caps at their application sites are kept inline as load-bearing local values and are not rewritten; they instantiate this discipline. The closed list, which a new inline cap must join in the same change that introduces it: M3's and M5's "2–3 lines" narration, M4 / M9's "1–2 lines" per applied finding, M6's "≤ 6 lines" preview, M7's "1–2 lines" cleanup explanation, M11's "1–2 line" point-of-this-diff note, and M13's "≤ 3 one-line points" learning summary.
