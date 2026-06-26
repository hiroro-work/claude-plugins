# Prose Style Guide

The refactor subagent rewrites natural-language prose to be **concise and natural for a native reader of the target language**. This guide is the rule set injected into the dispatch payload; apply it to the prose in the TARGET LANGUAGE only.

## Preserve (hard constraint, applies before every rule)

Rewrite **only** natural-language prose. Never alter, add, or drop any of the following — keep them verbatim:

- Code, syntax, and program structure.
- Identifiers — function / variable / type / class / module names.
- Product / API / library / tool names used as proper nouns (e.g. `git`, `Promise`, `Agent`). These stay in their original form even when the surrounding prose is in another language. **Ordinary technical vocabulary is not preserved here** — apply the `Preserve-vs-translate litmus test` below to tell a preserved proper noun from translatable vocabulary.
- String literals that carry program logic: keys, enum values, format specifiers, file paths, URLs, commands, config tokens.
- Delimiters around a preserved token — do not add, remove, or change backticks, quotes, or other code-span decoration surrounding an identifier or code fragment. If a token appears bare in the source, keep it bare; refactor the wording around it, not its presentation.
- Factual content — do not add claims, drop information, or reorder steps. Improve **only** concision and naturalness.

When a candidate rewrite could change program behavior or touch a non-prose token, do not make it.

### Preserve-vs-translate litmus test

The boundary between a preserved proper noun and translatable ordinary vocabulary is the most common source of unnatural code-mixing, so make it the deciding test for every source-language word that appears inside target-language prose. A token already written in the target language's own script — an established katakana loanword for `ja` such as `キャッシュ` or `レスポンス` — is already native prose, not a litmus candidate: leave it unless it reads unnaturally. Apply the three checks in order — first match wins:

1. **Preserve-test** — the word names a *specific* product, API, library, tool, format, standard, or code symbol that appears verbatim as a proper noun in code or docs (`git`, `Promise`, `Agent`, `JSON`, `URL`). Keep it verbatim, whether or not the source wrapped it in backticks.
2. **Translate-test** — the word *describes* an action, state, quality, or relation and has an everyday equivalent in the target language. Translate it.
3. **Default** — neither test clearly matches: translate. Over-preserving ordinary vocabulary is the code-mixing this guide exists to remove, so a bare word that is not clearly a proper noun defaults to translation.

The preserve-test outranks the translate-default, so a recognized proper noun (`git` / `Promise` / `API` / `URL`) is never translated even when it appears bare. Ordinary vocabulary takes the translate side (for `ja`: `dispatch`→「呼び出す」 not 「dispatch する」, `stale`→「古い」 not 「stale だった」, `validate`→「検証する」, `scope`→「範囲」, `fallback`→「代替手段」). These glosses show the translate-vs-code-mix contrast, not a fixed dictionary: pick the target word that reads most naturally in context, since one source word can map to different targets (`dispatch`→「振り分ける」 when it distributes work across workers, 「呼び出す」 when it invokes a call).

## General rules (all target languages)

1. **Cut filler.** Remove words that add length without meaning — restating the obvious, hedging ("basically", "essentially"), and ceremony ("it should be noted that").
2. **Say what the code does not.** A comment that paraphrases the code it sits above is noise; keep comments that explain a non-obvious *why* (a constraint, an invariant, a workaround) and delete pure *what*-narration.
3. **One idea per sentence.** Split runaway sentences that chain three or more clauses; merge two sentences that state the same thing.
4. **Prefer the direct form.** Active over passive where it reads naturally, concrete nouns over abstractions, the plain verb over a nominalized phrase ("decides" over "makes a decision").
5. **Match the surrounding register.** Keep terminology and tone consistent with the neighboring prose; do not introduce a synonym for a term already used nearby.
6. **Translate ordinary vocabulary; don't code-mix.** Decide each source-language word by the Preserve section's `Preserve-vs-translate litmus test`: translate ordinary vocabulary that has a natural target-language equivalent, and keep the source-language form only for the proper nouns / identifiers / code the litmus test preserves. Dropping ordinary source-language words into target-language prose reads as unnatural to a native reader.

## Japanese (`ja`) — primary use case

Models prone to verbosity tend to produce Japanese that reads as translated-from-English. Fix these patterns:

1. **Machine-translation / literal-translation tone (機械翻訳調・直訳調)** — Drop English-syntax calques: leading "〜することによって", over-use of "〜において" / "〜に関して", and literal renderings of English connectives. Rephrase into the structure a native writer would choose.
2. **Redundant politeness and modifiers (冗長な敬体・修飾)** — Trim redundant politeness scaffolding ("〜していただく必要があります" → "〜してください" where appropriate) and stacked modifiers that add no information.
3. **Restatement removal (重複の除去)** — Remove restatement: a sentence that repeats the previous sentence's content with different words, or a parenthetical that duplicates the main clause.
4. **Technical-term handling (テクニカルターム)** — Apply the `Preserve-vs-translate litmus test`: keep genuine proper-noun terms and identifiers in their original form, and translate ordinary technical vocabulary that has a natural Japanese equivalent rather than code-mixing. On a proper-noun term's first use, a short Japanese gloss in parentheses may aid comprehension.
5. **Particle and word-order naturalness (助詞・語順)** — Fix unnatural particle choices and English-driven word order so the sentence flows as native Japanese.
6. **Verbose politeness forms (丁寧語の過剰形)** — Where doing so does not change the meaning or nuance, shorten these over-long politeness constructions that large language models commonly produce:
   - 「〜となります」 / 「〜となっております」 expressing a **static state** (not a transition) → 「〜です」 / 「〜できます」 (as appropriate) (e.g. 「デフォルト値となります」→「デフォルト値です」, 「可能となっております」→「できます」). Do **not** shorten these when they express a genuine state change (e.g. 「有効となります」= "becomes active").
   - 「〜させていただきます」 in contexts where the extra courtesy level is unnecessary → 「〜します」 / 「〜しました」. Do **not** simplify it in deliberate courtesy contexts such as apology or notification messages where a higher politeness level is appropriate.
   - 「〜のほう」 used as a meaningless filler (e.g. 「設定のほうを確認してください」) → delete 「のほう」 (「設定を確認してください」). Retain 「のほう」 when it carries comparative meaning (e.g. 「左のほうが速い」).
   - 「〜ということ」 chained redundantly → omit where the surrounding sentence remains clear without it.
7. **Register consistency (敬体/常体の統一)** — Identify the register (敬体: です・ます調, or 常体: だ・である調) established by the surrounding prose and maintain it consistently throughout your rewrites. Do not mix the two within the same document or section. If the surrounding register cannot be determined, follow the register of the first complete sentence in the provided text.

## English (`en`) and other languages

Apply the general rules above. For English specifically: prefer short Anglo-Saxon verbs over Latinate nominalizations, cut throat-clearing introductions, and break long subordinate-clause chains into separate sentences. For any other target language, apply the general rules and the same "read as native, not translated" standard.
