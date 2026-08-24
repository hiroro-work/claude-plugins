# mobpro Configuration

**Read this file once**, at M1; M12's `subagent_model` carve-out names § Not-adopted keys of that same copy.

## Fallback keys

These project-characteristic keys are read from `dev-workflow`'s three layers (`~/.claude/dev-workflow.local.md` → `.claude/dev-workflow.md` → `.claude/dev-workflow.local.md`) using the same per-class merge semantics as `dev-workflow` (see [`inline-defs.md`](inline-defs.md) § (a)). `mobpro` never writes to these files.

`Keep this list and its Default column in sync with dev-workflow references/configuration.md — a key listed there belongs here when it governs a step mobpro also runs and is not carved out by § Not-adopted keys. The Default column is the only runtime source for the values in this table (SKILL.md § Runtime reads).` A key absent from all three layers resolves to its Default below. This closed list of 13 is complete:

| Key | Default | Used by |
| --- | --- | --- |
| `reviewer` | `ask-peer` | M1 probe, M4, M9 |
| `code_review` | `true` | M1 (`code_review_enabled`), M9 |
| `check_commands` | none (unset) | M8 |
| `boundary_check_commands` | none (unset) | M6 per-unit object build |
| `test_commands` | `["Skill(run-tests)"]` | M8 |
| `language` | merged config → `~/.claude/settings.json` `language` → `ja` | every user-facing output |
| `polish_prose` | `true` | M5 plan-body polish, M7 |
| `interactive_commits` | `true` | M11 registration, M12 rule-update commit gate |
| `commit_review_gate` | `diff` | M6 diff-review surface, M11 diff surface |
| `custom_instructions` | none (unset) | M3, M4, M6, M9 |
| `hooks.on_complete` | none (unset) | M10 registration and execution |
| `self_retrospective.feedback` | none (unset) | M12 |
| `workability_retrospective` | `enabled: false`, `backlog_dir: .claude/improvements` | M12 |

## Not-adopted keys

These `dev-workflow` keys are **not** honored by `mobpro`. If present in dev-workflow config they are ignored **silently** (no warning).

- **`implementation_executor`** — always `main`.
- **`subagent_model`** — every dispatch inherits the session model.

## Resolution procedure

`SKILL.md` M1's **Resolve settings** sub-step delegates here. Four files are read: the three dev-workflow layers named in § Fallback keys and `~/.claude/settings.json` (the last link in `language`'s fallback chain). Issue their `Read` calls — plus step 3's one `Glob` — in **one upfront burst**; a file that does not exist is **skipped, not an error**. The per-class merge semantics live in [`inline-defs.md`](inline-defs.md) § (a).

1. **Fallback keys**: merge dev-workflow's three layers as listed in § Fallback keys and resolve that section's closed list, taking each unset key's value from its Default column. An **invalid** value (wrong type, or outside the key's accepted set) is handled by substituting the Default and emitting **one** warning line naming the key and the substituted value. **All three layers being absent is not an error**.
2. **Not-adopted keys**: ignore silently — no warning, no note (§ Not-adopted keys).
3. **Removed keys (tombstone)**: `diff_verbatim_line_threshold` / `diff_verbatim_threshold` / `diff_condensed_threshold` are not read — the rendering thresholds are fixed constants in `../dev-workflow/references/diff-presentation.md` § Rendering ladder. If step 1's merged layers still carry any of the three, emit **one** warning line naming them. Separately, the `checkpoint` / `quiz` / `error_reading_practice` **keys** do not exist — M3's plan-building checkpoints are not the `checkpoint` key returning. `Glob` `.claude/mobpro*.md` — one call covering both former layers, and not a `Read`. On any hit, emit **one** warning line naming every file found and stating that `mobpro` no longer reads them; presence is never an error.

These are **project config files**, not `dev-workflow` reference files: `SKILL.md` § Runtime reads' closed list governs the latter, and its "never read `dev-workflow/SKILL.md`" constraint is untouched by this procedure.
