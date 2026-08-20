# Localization (shared)

The localization boundary for every user-facing output this skill (and `mobpro`) produces. Read it whenever either produces user-facing prose.

## Localization granularity

Applies to all user-facing prose produced by this skill — plan bodies, user-gate preambles, violation / finding lists, log lines, commit-gate framing prose, and the Completion summary. The resolved `language` (see `SKILL.md` § Configuration) controls the output language; dev-workflow's `references/configuration.md` `language` bullet carries the exhaustive category enumeration and the per-category verbatim carve-outs. `Source of truth: that bullet; keep the gist above as a subset of its categories, and keep the two in sync when categories are added or removed.`

**Two-way rule:**

- **Translate**: generic technical concepts that have natural equivalents in the target language. The output must read naturally to a native speaker of the resolved language. Examples: primary source → 一次情報源 (`ja`), self-audit → 自己監査 (`ja`), blast radius → 影響範囲 (`ja`), edge case → 境界ケース (`ja`).
- **Preserve verbatim**: file-internal identifiers — function names, config key names (`check_commands`, `plan_review`), section anchors (`Step 7.5`), stable cross-reference labels (`§ No-Stall Principle`), file paths (`references/plan-format.md`), skill names (`Skill(rules-review)`), and section headings (`Overview` / `Decisions` / `Build order` / `Test plan` / `Risks` / `Unknowns`). Preserving a step anchor verbatim does not license writing it bare: whenever one appears in output, pair it with what that phase does per the running skill's § Phase naming in user-facing output section.

**First-use pairing**: on the first occurrence of a translated concept within a given output block (preamble, expanded section, completion summary), pair the localized phrasing with the original technical term in parentheses (e.g. `一次情報源（primary source）` for `language: ja`). Subsequent occurrences within the same block use the localized form alone. This convention is consistent with [`plan-format.md`](plan-format.md) § User-gate summary preamble's jargon pairing rule — that section adds format constraints specific to preamble bullets (e.g. pairing with an identifying handle when the localized and original terms coincide under `language: en`).

**Negative-direction rule (do not over-preserve)**: everything outside the Two-way rule's verbatim category and First-use pairing — the connective prose that links identifiers together (ordinary sentences, function words, transitions, descriptive verbs and adjectives) — is written **only** in the resolved `language`, with no source-language vocabulary sprinkled in. Three sub-rules bind this:

- **(a) Verbatim-preservation scope is closed**: the verbatim category covers machine-readable tokens, code fragments, file paths, commands, and section headings only. Ordinary nouns, adjectives, conjunctions, and verb phrases are concept words that **do** translate — render them in the resolved `language` and do not retain the source-language word alongside the translation.
- **(b) First-use pairing is gated on translation-gap need**: pair the localized term with the source-language original in parentheses only when the resolved `language` does not yet have a settled translation, or when explicitly showing the localized-to-original correspondence once carries value for the reader (e.g. domain jargon a reader may map back to documentation). For concept words whose translation reads naturally in the resolved `language`, omit the parenthetical and use the localized form alone.
- **(c) Function-word connectives stay in the resolved language only**: words that carry connective / structural function inside a sentence (the resolved-language equivalents of "regarding", "with respect to", "in the case of", "however", "because") are rendered solely in the resolved `language` — never with the source-language counterpart in parentheses or inline. These words are not domain jargon and the pairing would only add noise.

What this rule targets is defensive over-preservation, which reads as half-translated.

**Sentence-construction rules**: the rules above govern which words to use; these four govern how the sentence is built. They cover the same output set this section opens with. `prose-polish`'s style guide carries counterparts to (d) and (g) only: (e) and (f) are governed here alone.

- **(d) One claim per sentence, and per bullet**: split a sentence that chains three or more clauses. Split a bullet that packs an inline `(i)/(ii)/(iii)` enumeration behind a trailing verb — it holds the structure open to the end.
- **(e) References belong at the end of an output sentence, not the front**: a sentence opening with `§ <Heading>'s "<label>" paragraph` makes the reader wait for the subject. State what is true, then name where it is defined. This governs output prose only — inside these skill files the same pair form is the required citation shape, wherever it sits in the sentence.
- **(f) No nested parentheticals**: a parenthetical inside another means the sentence carries two asides. Promote one to its own sentence, or drop it.
- **(g) No word that only decodes back through the source language**: a translated word the reader can only understand by reconstructing the original has failed, whether a transliteration or a word-for-word rendering of a figure of speech. `prose-polish`'s style guide carries the worked examples.

**Paired bilingual samples**:

- `language: ja`: `一次情報源（primary source）の確認を経てプランを策定済み`
- `language: en`: `Plan drafted after verifying the primary source`
- `language: ja`: `影響範囲（blast radius）: SKILL.md の 3 セクション + references/plan-format.md`
- `language: en`: `Blast radius: 3 sections of SKILL.md + references/plan-format.md`
