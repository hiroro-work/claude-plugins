# verify-skill-refs — maintenance notes

Notes for editing this skill. `SKILL.md` and `references/check-rules.md` are both loaded on every run — `check-rules.md` is injected verbatim into the judgment dispatch payload — so anything an executing agent does not act on lives here instead.

## Adding a detection class

Update this closed set in one pass:

- the class list in `SKILL.md`, and the class-count word opening it
- the `warning_entries` `class` enum in `SKILL.md` § Executor prompt
- the `class` enums in `SKILL.md` § Return contract's Layer 2 schema (both `violation_entries` and `warning_entries`)
- the `SKILL.md` "Severity model" paragraph's class enumeration
- the class's rule section in `references/check-rules.md`
- the class's placement in `references/check-rules.md` § Executor pipeline (mechanical stage or judgment stage)
- for anything the mechanical stage decides: its implementation and its `checked` counter in `scripts/lint.mjs`, that counter's key in `SKILL.md` § Return contract's Layer 2 schema, and its row in § Return contract's `checked` counters table

A new class carrying its own demotion token also sweeps the warning-token sites below.

## Adding a warning-only token to an existing stage

Shorter closed set:

- the `SKILL.md` "Severity model" paragraph's warning-only enumeration
- the `warning_entries` `class` enum in `SKILL.md` § Return contract's Layer 2 schema
- the token's rule in `references/check-rules.md` — plus its stage placement in that file's § Executor pipeline when the rule sits elsewhere, as `stale-manifest`'s does
- then **either** the mechanical-stage site (§ Return contract's "Which fields are deterministic" script-owned list) **or** the judgment-stage pair (the `warning_entries` `class` enum in § Executor prompt **and** the may-vary-between-runs list inside that same "Which fields are deterministic" paragraph)

Never both for a new token — a token has one owning stage. `stale-manifest` is the one exception (§ Return contract records that both stages emit it), so a token deliberately shared across stages sweeps both site sets.

## Classes considered and not built

**Does an output-instructing site carry the resolved-language rule?** Proposed as the counterpart to class (e): where (e) checks that a user-facing output *literal* names its phase, this would have checked that a site *instructing* user-facing output cites the localization rules. It is not built, for two reasons.

The first is that the invariant it would enforce no longer holds. `dev-workflow`'s `SKILL.md` § Configuration `language` bullet now states that a site emitting user-facing output carrying no language note of its own is not exempt from those rules. "Every output-instructing site carries a language note" is therefore no longer a design property of the tree, and a check enforcing it would push the prose back toward the per-site-note design that bullet replaced.

The second is that neither anchor extracts the right candidate set. Anchoring on class (e)'s emit verbs (`references/check-rules.md` § Class (e) step 2's extraction forms owns the set) selects 415 lines across the `dev-workflow` root's `SKILL.md` + `references/*.md`, with nothing in the line to separate user-facing output from internal operations that use the same verbs — appending to a ledger variable, reporting to a caller. Anchoring instead on the output literals class (e) already extracts gives a precise 155 candidates across both roots but misses every literal-free site, including `references/step8-code-review.md`'s post-fix natural-language quality self-check, which is one of the sites that motivated the proposal. Both counts were measured at `dev-workflow` v1.118.19 — the emit-verb count with the same verb set class (e) uses, the literal count from `scripts/lint.mjs`'s `output_literals`.

## Adding a target root

Append it to `SKILL.md` § Target roots when another skill acquires the same shape — numbered phase identifiers plus a `references/` tree, which is what the reference-resolution and phase-naming invariants apply to.

## Manifest upkeep (`references/check-rules.md` classes (b) / (d))

- Append an entry whenever a new "keep in sync" / "update both together" directive is added to a target tree. The manifest tables are the single source of truth in both directions — `scripts/lint.mjs` parses them — so a row added there needs no second edit anywhere.
- **One-way**: the manifest lives on this lint-skill side only. Writing a sync directive into the distributed dev-workflow prose that points at a project-local skill would be a distribution leak, so the target tree never references this manifest. Upkeep rides the Edit-time coordinated-multi-site-sweep audit and the monthly consolidation pass.

## Rules this skill mechanizes

`references/check-rules.md`'s closed lists transcribe conventions owned elsewhere; keep them in sync when those rules evolve.

| check-rules.md site | Source of truth |
| --- | --- |
| § Class (a)'s reference forms | `.claude/rules/project.rules.md` § SKILL.md設計's stable-anchor cross-reference bullet, and `.claude/rules/project.rules.local.md`'s "Bold-prose label cross-reference style" bullet |
| § Class (c)'s "Allowed forms" | `.claude/rules/project.rules.md` § SKILL.md設計's bare-number prohibition bullet (its two 許容形) |

A change to a detection rule and the corresponding change to `scripts/lint.mjs` land in the same commit — nothing else enforces the correspondence. Numeric bounds live as named constants at the top of that script, not in the rule prose.

## Temporary: bundle-copy identity check

`SKILL.md` Process step 2 exists only for the [anthropics/claude-code#53948](https://github.com/anthropics/claude-code/issues/53948) symlink workaround. Delete it, and the `bundle_copy` verdict field it feeds, when the bundle layout returns to symlinks. `verify-bundle-sync` SKILL.md's deletion note enumerates this site.

## Keeping the rule prose single-homed

`references/check-rules.md` is the canonical home for the detection rules. Do not duplicate them into `SKILL.md`.
