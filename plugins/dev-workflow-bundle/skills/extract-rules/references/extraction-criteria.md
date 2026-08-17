# Extraction Criteria

Reference guide for determining what to extract and how to classify patterns.

## Core Principle: Claude's Knowledge Gap

The purpose of rule extraction is to capture what Claude would get wrong or produce differently without seeing this specific codebase. Claude already has extensive knowledge of languages, frameworks, and general best practices. Rules should fill the gap between Claude's general knowledge and this project/team's actual conventions.

## What a Rule Is Made Of

A rule earns its place by what it contains, not by how much it explains. Keep three things:

- **The norm** — the single thing to do, or not to do.
- **The trigger** — the situation in which it applies.
- **The discriminator** — how to tell that situation from the ones next to it, where a reader would otherwise have to guess.

Leave out:

- How the situation first came up, and what was tried before the norm settled.
- A record that it happened again, or how many times.
- Names belonging to one piece of work — a particular file, a numbered step of a particular procedure, an identifier that existed only in that change.
- A restatement of a norm the file already carries under another name.
- A case some more general rule already covers.
- A description of how the code currently looks, when nothing about the norm depends on it staying that way.

**Exit test**: read the written rule on its own, with no memory of what produced it. Can you name in one phrase the moment it fires? If not, it is not a rule yet — either the trigger is missing, or what you wrote is an account rather than a norm.

**One rule, one claim.** A rule states a single claim a reader can apply or violate. A candidate that needs "and also", several bolded sub-clauses, or a numbered procedure to state is not one rule. Split it into the rules it contains and judge each on its own; most such candidates lose most of their parts to the durability test below, because a procedure decomposes into steps and steps are not rules.

**The written shape.** A project-level rule stating a working convention — the shape conversation extraction produces most often — is written as a **bold label, then one claim**: `**<short label>**: <the norm>, the situation it fires in, and how to tell that situation from the ones next to it`. Carry only the three things above; worked examples belong in `.examples.md`. Aim for **≤400 chars** — a soft target, not a gate, and the figure `references/compaction-mode.md` § Compact cross_ref wording guidance already sets for a merged principle on the same skim-readability grounds. The bold label is the rule's name: `.examples.md` titles it verbatim, and other documents cite it, so keep it stable when reshaping. Principles and signature-bearing patterns keep their own shapes (main SKILL.md Step 6 Format guidelines).

**These shapes are a signal, not a gate.** A candidate that fits none of the three written shapes is usually more than one rule: split it and judge each part. Not fitting a shape is never by itself grounds to reject a durable, wide-reaching rule.

## Durability: Would This Change What Gets Written Next Time?

The knowledge-gap test above asks whether Claude needs to be told. It does not ask whether the thing is worth telling. An account of how one change happened to be made passes the knowledge-gap test too — nobody could have guessed it — while constraining nothing that comes after.

Apply a second test to every candidate that survives the knowledge-gap test.

> "If a related but different task came up next week, would this rule change what gets written?"
> - **Yes** → extract it
> - **No — it only records what was written this time** → skip it

Signals that a candidate is a record rather than a rule:

- It reads as a sequence of what was done, in the order it was done.
- Its subject is one artifact rather than a class of situation.
- Its justification is that this is what was done, with no statement of what goes wrong otherwise.
- Removing it would make no future change wrong — only different.

Whether a candidate carries a code signature is **not** a signal either way. A durable convention about how to work often has no signature at all, and a one-off note can carry one.

A narrower retroactive counterpart lives in Compaction Mode as `heuristic 4 (one-shot incident dropout)` (`references/compaction-mode.md`), which drops an incident-specific entry only when another entry already subsumes it. This test does not require subsumption.

## Reach: Is the Rule Worth Its Permanent Cost?

Rule files are loaded at the start of every session, whether or not the situation a rule names ever comes up. Every rule therefore charges rent against the reader's attention forever, and durability alone does not cover that rent: a norm that fires in exactly one narrow configuration of one component is durable and still not worth carrying.

Apply this third test to every candidate that survives the two above. It has two halves, and a candidate needs only one of them.

> **Reach** — how wide is the class of situations this fires in? A recurring shape of work, or one configuration of one component?
> **Consequence** — what happens if the rule is absent when the situation does come up? Something breaks quietly and is expensive to find, or the work is simply redone once?

Keep the candidate when its reach is wide, **or** when a narrow reach pairs with a consequence that is silent, destructive, or expensive to recover from. Skip it when a narrow reach pairs with a consequence an ordinary rerun or review would absorb.

One further signal to skip: **already enforced elsewhere**. When a mechanical check this project actually runs — a linter, a type checker, a test, an automated verification step whose failure surfaces in the normal workflow — catches the violation on its own, the rule documents that check rather than guarding anything. The check is the rule; carrying a prose copy costs attention and adds no decision. A convention a linter *could* enforce but this project does not is still a rule.

This test is the one that keeps a rule file from growing without bound. The two tests above ask whether a candidate is a rule at all; this one asks whether it is worth the room. Expect it to reject more candidates than the other two combined, and expect it to reject some that are genuinely true — being correct is not the bar.

## Principle Extraction Criteria

**Goal:** Extract principles where Claude's default behavior would produce code inconsistent with this project's conventions.

### Extract these principles

Principles where **Claude would produce something different** without being told:

- **FP only (classes prohibited)** - Claude might use classes since both paradigms are valid; this team chose one
- **Zustand only (Redux prohibited)** - Claude might suggest Redux as it's more widely documented
- **No ORM, raw SQL only** - Claude would default to ORM as the standard approach
- **Barrel exports required** - Claude might not add index.ts re-exports unless told
- **Anti-patterns the team has deliberately rejected** - Things Claude would naturally do that this team avoids (e.g., "No utility file creation — add to existing modules" / "No default exports — named exports only")

### Do NOT extract these

Principles that **Claude already knows and would follow by default**:

- Language/framework best practices documented in official style guides
- Common code review feedback applicable to any project (const over let, no magic numbers, DRY, SOLID, early returns, etc.)
- Patterns where only one practical approach exists (PascalCase for React components, snake_case for Python, etc.)

**Rule of thumb:** If Claude would produce correct, consistent code without this rule, it is general knowledge — do not extract it.

### Decision criterion

> "Would Claude produce code that is different from this project's conventions without knowing this rule?"
> - **Yes** → Extract it (e.g., Claude would use classes, but this team uses FP only)
> - **No** → Skip it (e.g., Claude already uses const over let, avoids magic numbers)

**Note**: In incremental modes (`--from-conversation` / `--from-pr` / `--apply-conversation-candidates`), the "Extract" action for **project-level patterns** is split into "stage on 1st observation" and "promote on 2nd observation" — see SKILL.md § Configuration `staging_output_dir` and `references/conversation-mode.md` § Step C5's "Check for duplicates and route per category" step for the 3-branch dedup. Principle extraction and language / framework / integration patterns bypass staging and land directly in canonical.

---

## Concrete Example Criteria

**Goal:** Determine when to include concrete code examples vs abstract principles.

### Include concrete examples when

Pattern involves **project-defined symbols** that AI cannot infer, **AND** meets at least one scope criterion:

**Symbol criteria** (what):
- **Custom types/interfaces** defined in the project (not from node_modules)
- **Project-specific hooks** (e.g., `useAuthClient`, `useDataFetch`)
- **Utility functions** with non-obvious signatures
- **Non-obvious combinations** (e.g., `pathFor()` + `url()` must be used together)

**Scope criteria** (why it matters):
- **Project-wide usage**: Used across many files/modules, AI needs to know about it to write consistent code
- **Convention-defining**: Not using it would break project consistency (e.g., required wrapper, mandatory type)

**Important: Keep examples minimal**
- One line per pattern: `signature` - context (2-5 words)
- Include only the type signature or function signature
- Omit implementation details, only show the "shape" AI needs to know

### Keep abstract (principles only) when

Pattern uses only **language built-ins** or **well-known patterns**:

- `const`, `let`, spread operators, map/filter/reduce
- Standard design patterns with well-known implementations
- Framework APIs documented in official docs

### Decision criterion

> "Would AI writing **new code** in this project produce **inconsistent results** without knowing this pattern?"
> - **Yes** → Include concrete example (e.g., `useAuth()` — without it, AI would write custom auth logic)
> - **No** → Skip or abstract principle only (e.g., a utility hook used in 2 files — AI not knowing it won't cause inconsistency)

### Example classification

| Pattern | Classification | Reason |
|---------|---------------|--------|
| Prefer `const` over `let` | Do not extract | General best practice, AI already knows |
| No magic numbers | Do not extract | General best practice, AI already knows |
| FP only, no classes | Principle | Team-specific paradigm choice |
| `RefOrNull<T>` type usage | Concrete example | Project-defined type, AI cannot infer |
| `pathFor()` + `url()` combination | Concrete example | Project-specific API combination |

### Gray zone handling

For patterns that are **not clearly general or project-specific**:

- Extended types from node_modules (e.g., `type MyUser = User & { custom: string }`)
- Specific combinations of standard libraries (e.g., zod + react-hook-form patterns)

**Fallback rule: When uncertain, apply the scope criterion.**

- If the pattern is used project-wide or defines a convention → include
- If the pattern is a local utility (1-2 usage sites) → skip
- Rationale: Over-specifying with local utilities clutters rule files with implementation details rather than style guidance. Rules should answer "how to write new code" not "what utilities exist."

---

## Example Quality Criteria

**Goal:** Ensure `.examples.md` files contain useful, accurate examples that help Claude apply rules correctly.

### Good examples (what to include)

- **Source from actual codebase**: Good examples must come from real code found in the project, not fabricated. If no relevant code can be found (e.g., the rule is about something not yet implemented), skip the example for now
- **Minimal but complete**: Show enough context to understand usage, but not full implementation details
- **Representative**: Choose examples that demonstrate the most common usage pattern

### Bad examples (anti-patterns)

- **From actual codebase**: Prefer real anti-patterns found in the project (e.g., older code, refactored patterns)
- **From typical Claude output**: If no real anti-pattern exists, show what Claude would typically generate without the rule
- **Optional**: If no meaningful Bad example exists (e.g., project-specific type usage), omit Bad and show only Good

### When Good/Bad contrast is effective

| Rule type | Good/Bad contrast? | Reason |
| --------- | ------------------- | ------ |
| Paradigm choices (FP only, no ORM) | Yes | Claude would default to the opposite |
| Prohibited patterns (no default exports) | Yes | Shows what to avoid |
| Project-defined types/hooks | Good only | No meaningful "bad" — Claude just doesn't know the type exists |
| API combinations (pathFor + url) | Good only | Shows correct usage pattern |
