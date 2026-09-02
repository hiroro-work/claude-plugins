# Difficulty tiers

Read from `SKILL.md` Phase 2 (Task Decomposition). Unqualified `§` references point into this file.

## Tier criteria

Assess once, from the effective task plus cheap probes (read a named file, grep a named identifier). File count is a hint, not the criterion. When two tiers seem to fit, take the higher one.

- **Trivial**: one obviously correct fix with no judgment call. A typo, a one-line edit, a config value, or a mechanical multi-site edit applying the same replacement everywhere (version bump, rename with one unambiguous target). Many files do not raise it when the edit is identical at every site. It rises to Simple or above as soon as more than one plausible approach exists, the logic affects behavior in a way a subtle mistake could pass unnoticed, or the correct fix is genuinely ambiguous.
- **Simple**: a straightforward bug fix or small feature with an obvious, pattern-following solution and no new design decision, within a single module (one or several files). Exception: a change to an external library's config file or type-level API after that library had a recent major-version bump is at least Moderate.
- **Moderate**: at least one genuine design decision, even a pattern-following one, or a change spanning multiple modules.
- **Complex**: cross-module work, new patterns, API changes, or significant refactoring.

Express lane = Trivial, Simple. Full lane = Moderate, Complex. The skip table in `SKILL.md` § Difficulty and the skip table is the only consumer of the tier.

## Re-check after planning

The first assessment happens before any plan exists, and the Simple / Moderate line ("at least one genuine design decision") often shows only once the plan is drafted. So at the end of Create Plan, assess the drafted plan against § Tier criteria once more. The tier only rises: an equal or lower result changes nothing. When it rises, emit one line naming the old and new tier, then set every phase row the new tier runs back from `completed` (skipped) to `pending`, per the skip table. Plan Review has not run yet, so nothing is re-done. No other re-check exists; Implement onward never changes the tier.
