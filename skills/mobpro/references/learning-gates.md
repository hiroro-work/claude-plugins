# mobpro Learning Gates

Operational detail for `mobpro`'s learning gates — the M6 diff review, the M8 error narration, the M9 prediction narration, the M3 plan-building checkpoints, and the explanation-length discipline. `mobpro`'s SKILL.md holds each gate's firing condition and branch skeleton; this file holds the "how to run it" detail and what each prompt has to convey. It is a `mobpro`-own reference (not a transcription of any `dev-workflow` file). **Read it once**, at M3 — § E fires there, ahead of every other section; § A is then loop-invariant across M6, and M8 and M9 name a section of that same copy.

**Each section states what its prompt must convey, not the words to say it in.** Write the prompt yourself, in the run's resolved `language`, in the voice the rest of the session is already speaking — a fixed sample would pin a register that the surrounding conversation then has to fight. The junior's own illustrative replies quoted in the reply-handling lists (`進めて` / `go ahead`, `どう？` / `how about it?`, and the like) are the exception: those are speech to classify, not text `mobpro` emits, so they stay as literal tokens.

Nothing here asks the junior to answer a comprehension question — § E stops for a reply, but only to ask what the junior still finds unclear (`SKILL.md` § Learning-Stop Principle's "Narration is not a stop" paragraph owns that rule). The AI narrates; the junior learns by reading each diff and asking whatever the narration left open.

## § A. M6 diff review

The junior reviews each implementation unit's diff. This is the implementation loop's recurring learning stop and where their questions land; `SKILL.md` § Learning-Stop Principle owns its firing condition and [`diff-review.md`](diff-review.md) its display surface.

**Opening the review**: state the point of this unit's diff, hand the diff over, and invite questions on anything that stands out.

**Question handling**: the review **blocks on the junior's turn** — hand the diff over and wait, because a stop they cannot speak into is not a review. Answer each question within the § D length, then wait again. Once their turn arrives carrying no question, do **not** solicit a second one: move to the next unit. A junior's "understood, go ahead" (`進めて` / `go ahead`) ends the review at hand immediately.

**Change requests raised during the review**: a comment asking for a code change is applied like any other review finding — fix it, explain the fix within the § D length, and re-present the diff. A question that needs no code change is answered and does not re-open the unit.

## § B. M8 error narration

When `check_commands` or `test_commands` fails, the AI does not stop to hand the error to the junior — it narrates its own read of the error, then fixes it. The narration names four things: which command failed, which part of its output you read and what that part says, the cause you drew from it, and the fix you are about to make. **Every** failure is narrated; there is no first-failure-only special case, and a verification-pass re-entry of M8 narrates the same way (so `SKILL.md` § Learning-Stop Principle's "Primary-pass rule" paragraph does not reach this section).

## § C. M9 pre-review prediction narration + cross-check

Before dispatching `rules-review` and the code reviewer, the AI states where it expects findings to land, naming the specific spots and why they are exposed. **Order the prediction with what this run wrote first** (the code and prose just added — e.g. a rule or bookkeeping paragraph added for consistency) ahead of any prediction about pre-existing assets, because findings concentrate on freshly-written content far more often than on long-standing code, so leading with it counters the reflex to predict outward while the risk sits inside. Name the checks about to run, then one clause per predicted spot in that order — each naming the spot and why it is exposed. When no pre-existing asset is worth predicting, name only this run's text rather than adding a negative prediction.

When `code_review_enabled` is `false` the code reviewer is not dispatched, so name only the rules-compliance check (`m9-rules-code-review.md` § **Pre-review prediction narration**). After the reviews return, cross-check the prediction against the actual findings, **acknowledging what the prediction got right before naming what it missed** — the miss is the part worth explaining. This narration fires only on M9's primary pass (`SKILL.md` § Learning-Stop Principle's "Primary-pass rule" paragraph).

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

**Opening the first checkpoint**: say that the walk comes before the plan, name how many parts there will be, then give the first.

**Closing every checkpoint**, the first included: ask what is still unclear through `AskUserQuestion` — one question, `multiSelect` off. Give it three options, one each for **go on** / **question** / **change** below; the tool's own free-text option carries anything they do not cover, and is also where a junior who already knows what they want to say can say it in one turn. **A labeled option returns its label and nothing else** — so the two non-advancing options open a short follow-up rather than carrying the junior's words, which is what their reply-handling arms below are for. Word each option's description as what happens next, never as an instruction to write something the option cannot accept. Write the question, the header, and every option's label and description in the resolved `language`. The question asks what is still unclear; the header is one word naming the moment, not the act of checking understanding, which would contradict the paragraph above — it renders as a short chip. **It is still not a comprehension question** (this file's opening paragraph): the options ask what was left open, never whether the junior got something right. When `AskUserQuestion` is not exposed on the current tool surface, ask the same question as chat prose and classify the reply identically — the modal is the surface, not the gate.

**The modal stops here, deliberately** — do not harmonize it outward to § A's diff review or to `m5-plan-approval.md` sub-step 2's chat-path approval question without reopening that decision; the reasoning is in [`../README.md`](../README.md) § Why the checkpoint modal stops at M3.

Each option's label says what the junior wants — carry on, ask something, or send you somewhere else — and its description says what happens next: the following part, a follow-up asking which part did not land, or a follow-up asking where to look.

**Reply handling** — four buckets, judged semantically (the phrasings below are illustrative, not literal discriminators). The three options map onto **go on** / **question** / **change** in that order; a free-text reply is classified across all four, which is the only way **not an answer** arises:

- **go on** (`無い` / `大丈夫` / `進めて` / `nothing unclear` / `go ahead`, or any equivalent that nothing was left open): move to the next checkpoint, or — once the last one closes — to M3 sub-step 3's plan authoring.
- **question** (anything naming a part that did not land, or asking about what was explained): answer within the § D length, then ask the closing question again. A question is never an approval, so do not advance on the answer alone. **When the reply is the bare option label** — the modal path, which carries no words of their own — ask which part did not land, wait for the answer, and only then answer it.
- **change** (a request to look somewhere else, or to take a different direction): do that reading or record that direction, share what came of it, and ask again. **When the reply is the bare option label**, ask where to look or which direction to take, and wait for the answer before doing either. A request to drop the task outright is the far end of this bucket and takes M5's **withdraw** disposition — end the workflow without authoring the plan. Source of truth: `m5-plan-approval.md` sub-step 3's **adjust** bucket; this bucket is that one a phase earlier, so keep it in sync when that bucket changes.
- **not an answer** (interrogative or non-committal — `どう？` / `なるほど` / `how about it?` / `I see`): re-classify it with a confirming question, the way `m5-plan-approval.md` sub-step 3 handles its own non-committal replies. Neither advance nor re-share on it.
