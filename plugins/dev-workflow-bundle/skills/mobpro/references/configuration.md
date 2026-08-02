# mobpro Configuration

`mobpro` has no configuration of its own — every key it honors comes from `dev-workflow`'s layers (§ Fallback keys), and every pedagogical choice is fixed rather than configurable (`SKILL.md` § Learning-Stop Principle).

## Fallback keys

These project-characteristic keys are read from `dev-workflow`'s three layers (`~/.claude/dev-workflow.local.md` → `.claude/dev-workflow.md` → `.claude/dev-workflow.local.md`) using the same per-class merge semantics as `dev-workflow` (see [`inline-defs.md`](inline-defs.md) § (a)). `mobpro` never writes to these files.

`Keep this list and its Default column in sync with dev-workflow references/configuration.md — a key listed there belongs here when it governs a step mobpro also runs and is not carved out by § Not-adopted keys. The Default column is the only runtime source for the values in this table (SKILL.md § Runtime reads).` A key absent from all three layers resolves to its Default below. This closed list of 14 is complete:

| Key | Default | Used by |
| --- | --- | --- |
| `reviewer` | `ask-peer` | M1 probe, M4, M9 |
| `plan_review` | `true` | M1 (`plan_review_enabled`), M4 |
| `code_review` | `true` | M1 (`code_review_enabled`), M9 |
| `check_commands` | none (unset) | M8 |
| `test_commands` | `["Skill(run-tests)"]` | M8 |
| `language` | merged config → `~/.claude/settings.json` `language` → `ja` | every user-facing output |
| `polish_prose` | `true` | M7 |
| `interactive_commits` | `true` | M11 registration, M12 rule-update commit gate |
| `plan_review_gate` | `visual` | M5 approval surface |
| `commit_review_gate` | `diff` | M6 diff-review surface, M11 diff surface |
| `custom_instructions` | none (unset) | M3, M4, M6, M9 |
| `hooks.on_complete` | none (unset) | M10 registration and execution |
| `self_retrospective.feedback` | none (unset) | M12 |
| `workability_retrospective` | `enabled: false`, `backlog_dir: .claude/improvements` | M12 |

## Not-adopted keys

These `dev-workflow` keys are **not** honored by `mobpro`. If present in dev-workflow config they are ignored **silently** (no warning — they are legitimate dev-workflow settings). `This list is the source of truth for README.md § Configuration's "Deliberately ignored" paragraph; keep the two in sync.`

- **`implementation_executor`** — always `main`.
- **`subagent_model`** — every dispatch inherits the session model.

## Resolution procedure

`SKILL.md` M1's **Resolve settings** sub-step delegates here. Four files are read: the three dev-workflow layers named in § Fallback keys and `~/.claude/settings.json` (the last link in `language`'s fallback chain). All four are independent, so issue their `Read` calls — plus step 3's one `Glob` — in **one upfront burst**; a file that does not exist is **skipped, not an error**. The per-class merge semantics live in [`inline-defs.md`](inline-defs.md) § (a) and are not restated here.

1. **Fallback keys**: merge dev-workflow's three layers as listed in § Fallback keys and resolve that section's closed list, taking each unset key's value from its Default column. An **invalid** value (wrong type, or outside the key's accepted set) is handled by substituting the Default and emitting **one** warning line naming the key and the substituted value, since `mobpro` cannot read dev-workflow's per-key validation prose at runtime. One exception, transcribed here because `SKILL.md` M5 depends on it (`Keep in sync with dev-workflow references/configuration.md's plan_review_gate bullet.`): `plan_review_gate` accepts `plan-mode` / `visual` / `crit`, and `plan-mode` is honored silently — no warning — even though `mobpro` never enters Plan Mode (`SKILL.md` M5 routes that value to the chat approval). **All three layers being absent is not an error** — the deliberate difference from `dev-workflow`, which stops and prompts `--init`.
2. **Not-adopted keys**: ignore silently — no warning, no note (§ Not-adopted keys).
3. **Removed keys (tombstone)**: `diff_verbatim_line_threshold` / `diff_verbatim_threshold` / `diff_condensed_threshold` are no longer read — M6 took them from the dev-workflow layers until mobpro v1.7.0, and the rendering thresholds are now fixed constants in `../dev-workflow/references/diff-presentation.md` § Rendering ladder. If step 1's merged layers still carry any of the three, emit **one** warning line naming them. Separately, `checkpoint` / `quiz` / `error_reading_practice` no longer exist. `Glob` `.claude/mobpro*.md` — one call covering both former layers, and not a `Read`, since their contents are never parsed. On any hit, emit **one** warning line naming every file found and stating that `mobpro` no longer reads them; presence is never an error.

These are **project config files**, not `dev-workflow` reference files: `SKILL.md` § Runtime reads' closed list governs the latter, and its "never read `dev-workflow/SKILL.md`" constraint is untouched by this procedure.
