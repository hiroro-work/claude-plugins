# mobpro Learning Gates

Operational detail for `mobpro`'s learning gates — the M6 diff review, the M8 error narration, the M9 prediction narration, the M3 plan-building checkpoints, and the explanation-length discipline. `mobpro`'s SKILL.md holds each gate's firing condition and branch skeleton; this file holds the "how to run it" detail and the user-facing prompt wording. It is a `mobpro`-own reference (not a transcription of any `dev-workflow` file). **Read it once**, at M3 — § E fires there, ahead of every other section; § A is then loop-invariant across M6, and M8 and M9 name a section of that same copy.

The prompt wording is given as **paired bilingual samples** (a `language: ja` line and a `language: en` line) that demonstrate the runtime rendering; the surrounding meta-prose is the rule. Render each prompt in the run's resolved `language`.

**Register**: every Japanese sample in `mobpro` — here and in the sibling references — is written in polite form (敬語), the register the session speaks in throughout, so the voice does not change at the moment the junior is asked something. A new sample joins it. The junior's own illustrative replies (`進めて` / `どう？` and the like) are quoted speech used to classify a reply, not text `mobpro` emits, so they stay as they are.

Nothing here asks the junior to answer a comprehension question — § E stops for a reply, but only to ask what the junior still finds unclear (`SKILL.md` § Learning-Stop Principle's "Narration is not a stop" paragraph owns that rule). The AI narrates; the junior learns by reading each diff and asking whatever the narration left open.

## § A. M6 diff review

The junior reviews each implementation unit's diff. This is the implementation loop's recurring learning stop and where their questions land; `SKILL.md` § Learning-Stop Principle owns its firing condition and [`diff-review.md`](diff-review.md) its display surface.

**Opening the review**: state the point of this unit's diff, then hand the diff over.

- `language: ja`: `この unit の差分です。<この差分の狙い>。気になるところがあれば聞いてください。`
- `language: en`: `Here's this unit's diff. <the point of this diff>. Ask about anything that stands out.`

**Question handling**: the review **blocks on the junior's turn** — hand the diff over and wait, because a stop they cannot speak into is not a review. Answer each question within the § D length, then wait again. Once their turn arrives carrying no question, do **not** solicit a second one: move to the next unit. A junior's "understood, go ahead" (`進めて` / `go ahead`) ends the review at hand immediately.

**Change requests raised during the review**: a comment asking for a code change is applied like any other review finding — fix it, explain the fix within the § D length, and re-present the diff. A question that needs no code change is answered and does not re-open the unit.

## § B. M8 error narration

When `check_commands` or `test_commands` fails, the AI does not stop to hand the error to the junior — it narrates its own read of the error, then fixes it. **Every** failure is narrated; there is no first-failure-only special case, and a verification-pass re-entry of M8 narrates the same way (so `SKILL.md` § Learning-Stop Principle's "Primary-pass rule" paragraph does not reach this section).

- `language: ja`: `<コマンド名> が失敗しました。<エラーメッセージのどこを見て何を読み取ったか>。原因は<原因>なので、<直し方>で直します。`
- `language: en`: `<command> failed. <which part of the error message was read, and what it says>. The cause is <cause>, so the fix is <fix>.`

## § C. M9 pre-review prediction narration + cross-check

Before dispatching `rules-review` and the code reviewer, the AI states where it expects findings to land, naming the specific spots and why they are exposed. **Order the prediction with what this run wrote first** (the code and prose just added — e.g. a rule or bookkeeping paragraph added for consistency) ahead of any prediction about pre-existing assets, because findings concentrate on freshly-written content far more often than on long-standing code, so leading with it counters the reflex to predict outward while the risk sits inside. The sample below shows the single-spot form; with more than one spot, fill the slot with one clause per spot in that order, and when no pre-existing asset is worth predicting, name only this run's text rather than adding a negative prediction:

- `language: ja`: `これからルール準拠チェックとコードレビューをかけます。<指摘されそうな箇所>が指摘を受けそうです — <理由>。`
- `language: en`: `We're about to run the rules-compliance check and code review. I expect <spots> to get flagged — <why>.`

When `code_review_enabled` is `false` the code reviewer is not dispatched, so drop the code-review half of the localized pair above — `コードレビュー` / `code review` — and name only the rules-compliance check (`m9-rules-code-review.md` § **Pre-review prediction narration**). After the reviews return, cross-check the prediction against the actual findings, **acknowledging what the prediction got right before naming what it missed** — the miss is the part worth explaining. This narration fires only on M9's primary pass (`SKILL.md` § Learning-Stop Principle's "Primary-pass rule" paragraph).

## § D. Explanation length discipline

Narration is the session's main channel, so these caps are wide enough to carry a real explanation and narrow enough to stay out of lecture territory:

- **Preview** (M6 unit announcement): ≤ 6 lines.
- **Per-file walkthrough** (M6): 1–3 lines per changed file, plus 1–2 lines for why it was done that way.
- **Existing-code explanation** (the first half of an M3 checkpoint, § E): 1–3 lines per file or component covered — the same shape as the M6 walkthrough above, since the junior is reading unfamiliar code in both cases. Its second half, what follows from that code, takes the narration-class cap below.
- **Narration-class single explanations** — M3's design-approach narration, the second half of each M3 checkpoint and the answers given inside it (§ E), M5's plan explanation, the M8 error read (§ B), the M9 prediction and its cross-check (§ C), and each answer to a junior's question (§ A): 2–3 lines each.
- **Applied-finding explanations** (M4 and M9, one per finding): 1–2 lines each — deliberately tighter than the narration class, because a findings list is read as a list.

This section is the **single consolidated statement** (source of truth) of the length discipline. The inline caps at their application sites are kept inline as load-bearing local values and are not rewritten; they instantiate this discipline. The closed list, which a new inline cap must join in the same change that introduces it: M3's and M5's "2–3 lines" narration, M4 / M9's "1–2 lines" per applied finding, M6's "≤ 6 lines" preview, M7's "1–2 lines" cleanup explanation, M11's "1–2 line" point-of-this-diff note, and M13's "≤ 3 one-line points" learning summary.

## § E. M3 plan-building checkpoints

The code a plan rests on reaches the junior in installments, and each installment ends in a partial approval. `SKILL.md` M3 sub-step 2.5's **Plan-building checkpoints** gate owns the firing condition, the 2–5 segmentation, and the rule that the existing code comes before what was concluded from it; this section holds the wording and the reply handling.

**Each checkpoint carries two halves in this order**: what the relevant code does today and how it is put together, then what follows from it for the plan.

**Opening the first checkpoint**: name how many there will be, then give the first.

- `language: ja`: `プランを書く前に、関係するコードを<総数>回に分けて説明します。1 回目: <今どうなっているか>。したがって<そこから言えること>。`
- `language: en`: `Before I write the plan, I'll walk you through the code it touches in <total> parts. Part 1: <how it works today>, which means <what follows for the plan>.`

**Closing every checkpoint**, the first included: ask what is still unclear.

- `language: ja`: `ここまでで分からないところはありますか？ 無ければ次に進みます。`
- `language: en`: `Anything still unclear here? I'll go on if not.`

**Reply handling** — four buckets, judged semantically (the phrasings below are illustrative, not literal discriminators):

- **go on** (`無い` / `大丈夫` / `進めて` / `nothing unclear` / `go ahead`, or any equivalent that nothing was left open): move to the next checkpoint, or — once the last one closes — to M3 sub-step 3's plan authoring.
- **question** (anything naming a part that did not land, or asking about what was explained): answer within the § D length, then ask the closing question again. A question is never an approval, so do not advance on the answer alone.
- **change** (a request to look somewhere else, or to take a different direction): do that reading or record that direction, share what came of it, and ask again. A request to drop the task outright is the far end of this bucket and takes M5's **withdraw** disposition — end the workflow without authoring the plan. Source of truth: `m5-plan-approval.md` sub-step 3's **adjust** bucket; this bucket is that one a phase earlier, so keep it in sync when that bucket changes.
- **not an answer** (interrogative or non-committal — `どう？` / `なるほど` / `how about it?` / `I see`): re-classify it with a confirming question, the way `m5-plan-approval.md` sub-step 3 handles its own non-committal replies. Neither advance nor re-share on it.
