# Cleanup Checklist

The reviewer walks each CHANGED FILE against the items below. Classify each finding as `mechanical_edit` (textual replacement) or `structural_note` (needs human moving / deleting / large rewrite).

Each item is **judgment-style**, not a regex — describe the cleanup opportunity in your own words on the way to producing a fix.

## Preserve functionality (hard constraint, applies before every item)

**Never change what the code does — only how it does it.** All original features, outputs, observable behaviors, error conditions, and side-effect ordering must remain intact after the cleanup. If a candidate fix would alter any of these, it is **out of scope** for this skill regardless of which item below it matches — surface it as a `structural_note` for human review rather than emitting it as a `mechanical_edit`. When a fix's behavior preservation is clear from the diff, it is eligible for a `mechanical_edit` (see § Behavior-preserving structural improvements); default to `structural_note` only when there is genuine risk that an output, error condition, or side-effect ordering could change.

## Items

1. **Redundancy / duplication** — same logic appearing at 2+ sites within the diff (extract or inline); the same data structure declared in multiple places (consolidate).

2. **Dead code** — unused imports, unused variables / parameters, unreachable branches, code that the user explicitly removed earlier in the session and a later edit re-introduced (deletion is authoritative, not a gap to fill).

3. **Over-abstraction / premature generalization** — a helper called from exactly one site, a class with exactly one instantiation, a parameter that always receives the same value. **Counter-rail**: do not delete an abstraction that is earning its keep at multiple call sites or expressing a domain concept — flag only abstractions whose single observed use shows the generalization never materialized.

4. **Defensive guards on already-safe paths** — null checks where the call site guarantees non-null, redundant guard layers where an upstream guard already handles the case (double-coverage).

5. **Speculative features** — functionality beyond the stated requirement; features added "for future use" without an explicit trigger (user requirement, known bug, documented rule).

6. **Comment narration / preamble + naming clarity** — line-by-line paraphrase of code, restating surrounding context, comments that explain *what* the code does instead of non-obvious *why*. Also: identifier names whose meaning is genuinely unclear to a reader unfamiliar with the file (a name that requires the explanatory comment to make sense — fix the name so the comment becomes redundant, then the comment is a delete-candidate).

7. **Redundant prose in docs / SKILL.md** — re-statement of what well-named identifiers already convey, repeated rationale that adds no new constraint, paragraphs that paraphrase an adjacent paragraph.

8. **Naming consistency drift (within-diff scope)** — a rename that did not propagate to all call sites within the same change; a function whose name no longer matches its current behavior after the change. Out of scope: pre-existing name mismatches the diff does not touch.

9. **Compactness over clarity** — nested ternary operators, dense one-liners, expressions that pack multiple conditions / lookups / transformations into a single chain. Prefer `if` / `else` / `switch` / named intermediate values when expanding makes the intent legible. Specific anti-patterns: nested ternaries (`a ? b : c ? d : e` — almost always replaceable with `if`/`else` or `switch`), deeply chained method calls without intermediate names, single-line conditionals that hide branches.

10. **Altitude (implementation depth)** — a fix layered onto shared infrastructure as a special case (e.g. per-type `if` branches added to a generic dispatcher) is a sign the fix is too shallow. Flag the shallow special-casing; the deeper form generalizes the shared mechanism. Disposition follows § Behavior-preserving structural improvements item 3 — a behavior-preserving, textually-expressible generalization is a `mechanical_edit`, a mechanism redesign is a `structural_note`. Distinct from the Items-list item 3 (Over-abstraction): that item **removes** an abstraction that never materialized, whereas Altitude **adds** a generalization that absorbs the shallow special cases.

## Balance rails — anti-over-simplification

Apply these as **negative space**: a candidate `mechanical_edit` that would violate any of these is **not actionable** as a mechanical fix even when it matches one of items 1–10. Either downgrade to `structural_note` or skip the finding entirely.

- **Don't sacrifice readability for fewer lines** — if "simpler" means "denser", it is not actually simpler.
- **Don't remove abstractions that are pulling their weight** — a helper that is called from N call sites, or that names a domain concept, is earning its existence even if N is small. Items 1 / 3 target abstractions that show no such use; everything else stays.
- **Don't combine unrelated concerns into one function / component** to collapse line count. Cohesion matters more than line count. (This rail constrains the **code shape**, not how edits are packaged: when several independent improvements apply to one region, emit them as separate `mechanical_edits` rather than bundling them into one — splitting does not trip this rail.)
- **Don't replace explicit code with overly clever idioms** — clever shortcuts that require the reader to mentally simulate the language semantics to understand are net negative.
- **Don't make the code harder to debug or extend** — if the cleanup removes a useful stepping stone (a named intermediate value, a deliberately verbose error path), keep it.
- **Don't change observable behavior** — see § Preserve functionality. This rail is reproduced here because over-simplification is the most common path to silent behavior change.

## Behavior-preserving structural improvements (positive gate)

A finding reaches this gate **only after** passing § Preserve functionality and § Balance rails (the negative gates) — those decide what must *not* be a `mechanical_edit`. This gate then names the structural improvements that **are** eligible for a `mechanical_edit` once behavior preservation is clear from the diff, so safe structural fixes stop being over-downgraded to `structural_note`. Each is mechanical only when its closed conditions hold; otherwise it stays a `structural_note`.

1. **Reuse an existing helper** — replace a re-implementation of logic an existing helper already provides (in this file or an imported module) with a call to that helper. Mechanical only when the helper's observable behavior — return value, exceptions, side effects — is identical and that identity is clear from the diff.
2. **Imperative-to-declarative loop rewrite** — rewrite an index / accumulator loop as a declarative transform (`map` / `filter` / `reduce` / `for...of`). Mechanical only when the loop body has no early exit (`break` / `continue` / early `return`), no `throw`, and no external side effect (logging, outer-state mutation, I/O); otherwise the rewrite can change short-circuit behavior, evaluation order, or error propagation — leave it a `structural_note`.
3. **Generalize a special case** — replace special-cased branches layered on shared infrastructure with a generalized form (e.g. a lookup set or table the shared path consults). Mechanical only when the generalization preserves behavior **and** is expressible as a textual replacement; a generalization that requires redesigning the mechanism stays a `structural_note`.

When several of these apply to one region, emit them as **separate** `mechanical_edits` (per § Balance rails' "don't combine concerns" parenthetical).

**Single fix spanning multiple sites**: first ask *one finding or several?* — this rule is only for **one** finding whose fix needs edits at several non-adjacent sites, and is distinct from the independent-improvements case above (several **independent** findings touching one region stay separate `mechanical_edits` with no atomicity concern, per § Balance rails' "don't combine concerns" parenthetical). For a single finding spanning sites — e.g. "generalize a special case" registers an entry in a shared table *and* removes the now-redundant special-case branch. Emit these as that many `mechanical_edits` entries sharing one rationale; it is still **one finding**, so first-match-wins-per-finding is not violated. But applied edits are **not atomic** — each `mechanical_edit` is applied independently and any whose `old_string` no longer matches is skipped, so a subset can land on its own. Such a fix is mechanical **only if every proper subset of its edits preserves behavior on its own**. If landing some-but-not-all of the edits would change an output, error condition, or side-effect ordering — e.g. the special-case removal lands but the table registration does not, so the generic lookup now throws — behavior preservation is not clear under non-atomic apply: downgrade the whole fix to a single `structural_note`.

## Overlap handling

When a finding could match more than one item, apply these rules and emit only the preferred classification. **First-match-wins per finding** — never split one finding across multiple items.

- **(1) + (3)** — a single-call-site helper that looks like both duplication and over-abstraction: **prefer (3) over-abstraction**. The defect is that the abstraction was unnecessary, not that the same code repeats.
- **(2) + (5)** — code added "for future use" but never called within the diff: **prefer (5) speculative-features** when the intent reads as "future use" in adjacent prose / comments; **prefer (2) dead code** when no such intent is signaled and the code simply has no caller.
- **(4) + (5)** — a try/catch / null-guard around an operation that currently cannot fail, added "for a future path": **prefer (5) speculative-features**.
- **(6) + (7)** — prose redundancy in SKILL.md / `references/*.md`: **prefer (7) redundant prose** by default; **prefer (6) comment narration** only when the redundant content has the line-by-line paraphrase structure of narration / preamble (not just general repetition).
- **(8)** is independent — rename propagation gaps are a **consistency** layer, not a duplication layer. Apply (8) on its own; do not collapse it into (1).
- **(9) + (6)** — a dense one-liner whose intent would become clear if the obvious-`what` comment were instead reflected in the code structure: **prefer (9) compactness** — fix the code shape, then the comment falls out of (6) automatically. Apply (6) on its own only when the code shape is already clear.
- **(1) + (10)** — reusing an existing helper vs generalizing a special case: **prefer (1) duplication** when the deeper form already exists as a helper to call; **prefer (10) Altitude** when no such generalization exists yet and the repeated special-casing itself is the defect.

## Reviewer judgment notes

- The checklist is a starting frame, not a constraint. If a real cleanup opportunity does not fit any item cleanly, surface it as a `structural_note` with the reason — the caller can route it to a human.
- Project conventions under `.claude/rules/` and `CLAUDE.md` override this checklist where they conflict. Language-specific or framework-specific standards (import style, function-declaration form, return-type annotation conventions, component / module structure, error-handling patterns) live in those project files — defer to them rather than inferring a standard from the diff.
- Don't chase aesthetic preferences — fix concrete cleanup wins, leave style-only edits to the formatter.
- Default to `structural_note` only when a fix carries genuine risk of behavior change or over-simplification. When § Preserve functionality and § Balance rails (the negative gates) are satisfied and the fix matches § Behavior-preserving structural improvements (the positive gate), a `mechanical_edit` is the right call — the negative gates decide what must not be mechanical, the positive gate decides what may be.
