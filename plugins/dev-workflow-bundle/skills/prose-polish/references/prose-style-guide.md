# Prose Style Guide

The refactor subagent rewrites natural-language prose to be **concise and natural for a native reader of the target language**. This guide is the rule set injected into the dispatch payload; apply it to the prose in the TARGET LANGUAGE only.

## Preserve (hard constraint, applies before every rule)

Rewrite **only** natural-language prose. Never alter, add, or drop any of the following — keep them verbatim:

- Code, syntax, and program structure.
- Identifiers — function / variable / type / class / module names.
- Product / API / library / tool names used as proper nouns (e.g. `git`, `Promise`, `Agent`). These stay in their original form even when the surrounding prose is in another language. **Ordinary technical vocabulary does not belong here** — when it has a natural equivalent in the target language, translate it (see the per-language rules below) rather than leaving it in the source language, which reads as unnatural code-mixing to a native reader.
- String literals that carry program logic: keys, enum values, format specifiers, file paths, URLs, commands, config tokens.
- Delimiters around a preserved token — do not add, remove, or change backticks, quotes, or other code-span decoration surrounding an identifier or code fragment. If a token appears bare in the source, keep it bare; refactor the wording around it, not its presentation.
- Factual content — do not add claims, drop information, or reorder steps. Improve **only** concision and naturalness.

When a candidate rewrite could change program behavior or touch a non-prose token, do not make it.

## General rules (all target languages)

1. **Cut filler.** Remove words that add length without meaning — restating the obvious, hedging ("basically", "essentially"), and ceremony ("it should be noted that").
2. **Say what the code does not.** A comment that paraphrases the code it sits above is noise; keep comments that explain a non-obvious *why* (a constraint, an invariant, a workaround) and delete pure *what*-narration.
3. **One idea per sentence.** Split runaway sentences that chain three or more clauses; merge two sentences that state the same thing.
4. **Prefer the direct form.** Active over passive where it reads naturally, concrete nouns over abstractions, the plain verb over a nominalized phrase ("decides" over "makes a decision").
5. **Match the surrounding register.** Keep terminology and tone consistent with the neighboring prose; do not introduce a synonym for a term already used nearby.
6. **Translate ordinary vocabulary; don't code-mix.** Render ordinary technical words in the target language when a natural equivalent exists — keep the source-language form only for the proper nouns / identifiers / code listed under Preserve. Dropping source-language words into target-language prose reads as unnatural to a native reader (for `ja`: write 「呼び出す」「古い」「所属を確認」, not 「dispatch する」「stale だった」「membership を確認」).

## Japanese (`ja`) — primary use case

Models prone to verbosity tend to produce Japanese that reads as translated-from-English. Fix these patterns:

1. **Machine-translation / literal-translation tone (機械翻訳調・直訳調)** — Drop English-syntax calques: leading "〜することによって", over-use of "〜において" / "〜に関して", and literal renderings of English connectives. Rephrase into the structure a native writer would choose.
2. **Redundant politeness and modifiers (冗長な敬体・修飾)** — Trim redundant politeness scaffolding ("〜していただく必要があります" → "〜してください" where appropriate) and stacked modifiers that add no information.
3. **Restatement removal (重複の除去)** — Remove restatement: a sentence that repeats the previous sentence's content with different words, or a parenthetical that duplicates the main clause.
4. **Technical-term handling (テクニカルターム)** — Keep genuine proper-noun terms and identifiers (product / API / library / tool names, code symbols) in their original form, but translate ordinary technical vocabulary that has a natural Japanese equivalent rather than code-mixing (per general rule 6 — e.g. 「dispatch」→「呼び出す」, not 「dispatch する」). On a proper-noun term's first use, a short Japanese gloss in parentheses may aid comprehension.
5. **Particle and word-order naturalness (助詞・語順)** — Fix unnatural particle choices and English-driven word order so the sentence flows as native Japanese.
6. **Verbose politeness forms (丁寧語の過剰形)** — Where doing so does not change the meaning or nuance, shorten these over-long politeness constructions that large language models commonly produce:
   - 「〜となります」 / 「〜となっております」 expressing a **static state** (not a transition) → 「〜です」 / 「〜できます」 (as appropriate) (e.g. 「デフォルト値となります」→「デフォルト値です」, 「可能となっております」→「できます」). Do **not** shorten these when they express a genuine state change (e.g. 「有効となります」= "becomes active").
   - 「〜させていただきます」 in contexts where the extra courtesy level is unnecessary → 「〜します」 / 「〜しました」. Do **not** simplify it in deliberate courtesy contexts such as apology or notification messages where a higher politeness level is appropriate.
   - 「〜のほう」 used as a meaningless filler (e.g. 「設定のほうを確認してください」) → delete 「のほう」 (「設定を確認してください」). Retain 「のほう」 when it carries comparative meaning (e.g. 「左のほうが速い」).
   - 「〜ということ」 chained redundantly → omit where the surrounding sentence remains clear without it.
7. **Register consistency (敬体/常体の統一)** — Identify the register (敬体: です・ます調, or 常体: だ・である調) established by the surrounding prose and maintain it consistently throughout your rewrites. Do not mix the two within the same document or section. If the surrounding register cannot be determined, follow the register of the first complete sentence in the provided text.

## English (`en`) and other languages

Apply the general rules above. For English specifically: prefer short Anglo-Saxon verbs over Latinate nominalizations, cut throat-clearing introductions, and break long subordinate-clause chains into separate sentences. For any other target language, apply the general rules and the same "read as native, not translated" standard.

## Paired bilingual before / after samples

These demonstrate the runtime rewrite for each target language (the skill rewrites prose in whichever language `Language:` resolves to). Code and identifiers stay verbatim across the rewrite.

**`language: ja`** — a verbose Japanese code comment:

- Before: `// この関数は、引数として渡されたユーザーIDを使用することによって、データベースからユーザー情報を取得するという処理を行います。`
- After: `// 渡された userId でユーザー情報を DB から取得する。`

**`language: ja`** — a redundant test description:

- Before: `it("ユーザーが存在しない場合において、nullが返却されるということを確認するテスト", ...)`
- After: `it("ユーザーが存在しなければ null を返す", ...)`

**`language: ja`** — a verbose AI-generated explanation (説明文):

- Before: 「この機能を使用することによって、ファイルの内容を自動的に変換させていただくことが可能となっております。」
- After: 「この機能を使うと、ファイルの内容を自動で変換できます。」

**`language: ja`** — an over-polite instruction (指示文):

- Before: 「設定のほうを変更していただく必要がございます。まず最初に設定ファイルを開いていただきまして、該当の値をご変更ください。」
- After: 「設定を変更してください。設定ファイルを開き、該当の値を書き換えます。」

**`language: en`** — a verbose English comment:

- Before: `// This function is responsible for performing the retrieval of the user information from the database by making use of the provided user ID.`
- After: `// Fetch the user record from the DB by userId.`

**`language: en`** — a nominalized sentence:

- Before: `Make a determination as to whether the configuration value is present before the execution of the validation step.`
- After: `Check whether the config value is present before validating.`

Note how `userId` / `null` / `it(...)` / `DB` stay verbatim in every rewrite — only the natural-language wording around them changes.
