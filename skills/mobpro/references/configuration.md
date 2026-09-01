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
| `language` | merged config → `~/.claude/settings.json` `language` → `ja` | every user-facing output, M12's PR-spec prompt and its decline note included |
| `polish_prose` | `true` | M5 plan-body polish, M7 |
| `commit_review_gate` | `diff` | M6 diff-review surface, M11 diff surface |
| `plan_artifact` | `off` | M5 publish and team-review gate; accepted values are `off` / `share` / `review`; `--artifact <value>` overrides it for one run (§ Resolution procedure step 1.5) |
| `custom_instructions` | none (unset) | M3, M4, M6, M9 |
| `hooks.on_complete` | none (unset) | M10 registration and execution |
| `self_retrospective.feedback` | none (unset) | M12 |
| `workability_retrospective` | `enabled: false`, `backlog_dir: .claude/improvements` | M12 |

## Not-adopted keys

These `dev-workflow` keys are **not** honored by `mobpro`. If present in dev-workflow config they are ignored **silently** (no warning).

- **`implementation_executor`** — always `main`.
- **`subagent_model`** — every dispatch inherits the session model.

## Resolution procedure

`SKILL.md` M1's **Resolve settings** sub-step delegates here. Four files are read: the three dev-workflow layers named in § Fallback keys and `~/.claude/settings.json` (the last link in `language`'s fallback chain). Issue their `Read` calls in **one upfront burst**; a file that does not exist is **skipped, not an error**. The per-class merge semantics live in [`inline-defs.md`](inline-defs.md) § (a).

1. **Fallback keys**: merge dev-workflow's three layers as listed in § Fallback keys and resolve that section's closed list, taking each unset key's value from its Default column. An **invalid** value (wrong type, or outside the key's accepted set) is handled by substituting the Default and emitting **one** warning line naming the key and the substituted value. **All three layers being absent is not an error**.
1.5. **`--artifact <value>` override**: when this invocation passed `--artifact` with one of `plan_artifact`'s three accepted values, that value replaces the `plan_artifact` step 1 resolved, for this run alone. The flag is not a fourth config layer: it never merges with the three files, is never written back to them, and reaches no other key. An invalid or unsupported flag value emits **one** warning line and is ignored, leaving step 1's value in effect. `Source of truth: dev-workflow references/configuration.md § Configuration — per-key detail's "plan_artifact" bullet, which owns the override's value space and its invalid-value fallback; keep in sync.`
2. **Not-adopted keys**: ignore silently — no warning, no note (§ Not-adopted keys).

These are **project config files**, not `dev-workflow` reference files: `SKILL.md` § Runtime reads' closed list governs the latter, and its "never read `dev-workflow/SKILL.md`" constraint is untouched by this procedure.
