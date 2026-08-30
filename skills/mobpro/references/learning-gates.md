# mobpro Learning Gates

**Read it once**, at M3 — § A is then loop-invariant across M6, and M8 and M9 name a section of that same copy.

**Each section states what its prompt must convey, not the words to say it in.** Write the prompt yourself, in the run's resolved `language`, in the voice the rest of the session is already speaking. The junior's own illustrative replies quoted in the reply-handling lists (`進めて` / `go ahead`, `どう？` / `how about it?`, and the like) are the exception: those are speech to classify, not text `mobpro` emits, so they stay as literal tokens.

Nothing here asks the junior to answer a comprehension question — § E stops for a reply, but only to ask what the junior still finds unclear (`SKILL.md` § Learning-Stop Principle's "Narration is not a stop" paragraph owns that rule).

## § A. M6 diff review

The junior reviews each implementation unit's diff.

**Opening the review**: state the point of this unit's diff, hand the diff over, and invite questions on anything that stands out.

**Question handling**: the review **blocks on the junior's turn** — hand the diff over and wait. Answer each question within the § D length, then wait again, so the review runs as many rounds as the junior has questions. **One turn closes the review**: once theirs arrives carrying no question and no change request, do **not** solicit a second one — move to the next unit. A junior's "understood, go ahead" (`進めて` / `go ahead`) ends the review at hand immediately.

**Change requests raised during the review**: a comment asking for a code change is applied like any other review finding — fix it, explain the fix within the § D length, and re-present the diff. A question that needs no code change is answered and does not re-open the unit.

## § B. M8 error narration

When `check_commands` or `test_commands` fails, the AI does not stop to hand the error to the junior — it narrates its own read of the error, then fixes it. The narration names four things: which command failed, which part of its output you read and what that part says, the cause you drew from it, and the fix you are about to make. **Every** failure is narrated; there is no first-failure-only special case, and a verification-pass re-entry of M8 narrates the same way (so `SKILL.md` § Learning-Stop Principle's "Primary-pass rule" paragraph does not reach this section).

## § C. M9 pre-review prediction narration + cross-check

Before dispatching `rules-review` and the code reviewer, the AI states where it expects findings to land, naming the specific spots and why they are exposed. **Order the prediction with what this run wrote first** ahead of any prediction about pre-existing assets. Name the checks about to run, then one clause per predicted spot in that order. When no pre-existing asset is worth predicting, name only this run's text rather than adding a negative prediction.

Name only the checks this run actually dispatches (`m9-rules-code-review.md` sub-step 1): the code reviewer is not dispatched when `code_review_enabled` is `false`, and the rules-compliance check is not dispatched on the express lane. When neither is left, there is nothing to predict — take the one-line report `SKILL.md` M9's "Entry condition — the step is entered on every run" paragraph defines instead of narrating. After the reviews return, cross-check the prediction against the actual findings, **acknowledging what the prediction got right before naming what it missed**. This narration fires only on M9's primary pass (`SKILL.md` § Learning-Stop Principle's "Primary-pass rule" paragraph).

## § D. Explanation length discipline

The caps, by explanation class:

- **Preview** (M6 unit announcement): ≤ 6 lines.
- **Per-file walkthrough** (M6): 1–3 lines per changed file, plus 1–2 lines for why it was done that way.
- **Existing-code explanation** (the first half of an M3 checkpoint, § E): 1–3 lines per file or component covered — the same shape as the M6 walkthrough above. Its second half, what follows from that code, takes the narration-class cap below.
- **Narration-class single explanations** — M3's design-approach narration, the second half of each M3 checkpoint and the answers given inside it (§ E), M5's plan explanation, the M8 error read (§ B), the M9 prediction and its cross-check (§ C), and each answer to a junior's question (§ A): 2–3 lines each.
- **Applied-finding explanations** (M4 and M9, one per finding): 1–2 lines each — deliberately tighter than the narration class.

## § E. M3 plan-building checkpoints

**Each checkpoint carries two halves in this order**: what the relevant code does today and how it is put together, then what follows from it for the plan.

**Opening the first checkpoint**: say that the walk comes before the plan, name how many parts there will be, then give the first.

**Closing every checkpoint**, the first included: ask in chat what is still unclear, and put the question on the **turn's last line**. Keep that placement on every later turn this checkpoint asks it again. Anywhere else in the turn, the question reads as one more paragraph of narration rather than as the point the run stops at. **It is still not a comprehension question**: it asks what was left open, never whether the junior got something right. Then wait for the reply.

**One reply closes a checkpoint**: only the **go on** bucket below advances past it, so a checkpoint runs as many rounds as the junior has questions and answering one is never a checkpoint's last act.

**Reply handling** — four buckets, judged semantically (the phrasings below are illustrative, not literal discriminators):

- **go on** (`無い` / `大丈夫` / `進めて` / `nothing unclear` / `go ahead`, or any equivalent that nothing was left open): move to the next checkpoint, or — once the last one closes — to M3 sub-step 3's plan authoring.
- **question** (anything naming a part that did not land, asking about what was explained, or saying only that a question exists): answer within the § D length, then ask the closing question again. **When the reply says a question exists without naming it**, ask which part did not land and wait for that answer before answering it.
- **change** (a request to look somewhere else, or to take a different direction): do that reading or record that direction, share what came of it, and ask again. **When the reply names no place or direction**, ask which and wait for that answer before doing either. A request to drop the task outright is the far end of this bucket and takes M5's **withdraw** disposition — end the workflow without authoring the plan. Source of truth: `m5-plan-approval.md` sub-step 3's **adjust** bucket; this bucket is that one a phase earlier, so keep it in sync when that bucket changes.
- **not an answer** (interrogative or non-committal — `どう？` / `なるほど` / `how about it?` / `I see`): re-classify it with a confirming question, the way `m5-plan-approval.md` sub-step 3 handles its own non-committal replies. Neither advance nor re-share on it. **Carve-out — a reply doubting the output arrived** (`こっちに質問してた？` / `画面に出ていないかも` / `did you ask me something?` / any equivalent reading as *the checkpoint never reached me*): re-share instead — send the checkpoint again, shortened.
