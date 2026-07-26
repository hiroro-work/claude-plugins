# mobpro Configuration

`mobpro` splits its settings into two groups: a small set of **mobpro-specific** keys that shape the learning experience, and a set of **fallback** keys that describe the project (reviewer, checks, tests, language, …) and are read from `dev-workflow`'s existing config so the project's quality bar lives in one place.

## mobpro-specific keys

Read from `.claude/mobpro.md` (team-shared, git-tracked) then `.claude/mobpro.local.md` (personal, gitignored) — later layer wins. These three keys are the **complete** closed list; there are no others — a project-characteristic key placed in a mobpro layer (e.g. `reviewer`) is not read from here; it resolves only from dev-workflow's layers per § Fallback keys.

```yaml
# .claude/mobpro.md  /  .claude/mobpro.local.md
---
checkpoint: "unit"             # unit | subtask | off  (default: unit)
quiz: true                     # default: true  (non-boolean → true)
error_reading_practice: true   # default: true  (non-boolean → true)
---
```

- **`checkpoint`** — where the M6 learning checkpoint fires. `unit`: after each M6 implementation unit, plus the M5 teach-back. `subtask`: once after all M6 units complete, plus the M5 teach-back. `off`: no checkpoint, and M5 becomes a normal approval (no teach-back). Invalid value → `unit`. In every setting, a junior's "understood, go ahead" always skips an individual checkpoint.
- **`quiz`** — whether the (b) lightweight-quiz checkpoint form and the M9 pre-review prediction quiz are used. Default `true`; a non-boolean falls back to `true`.
- **`error_reading_practice`** — whether the junior reads the error first on the **first** M8 failure of a run before the AI fixes it. Default `true`; a non-boolean falls back to `true`.

## Fallback keys

These project-characteristic keys are read from `dev-workflow`'s three layers (`~/.claude/dev-workflow.local.md` → `.claude/dev-workflow.md` → `.claude/dev-workflow.local.md`) using the same per-class merge semantics as `dev-workflow` (see [`inline-defs.md`](inline-defs.md) § (a)). `mobpro` never writes to these files.

`Keep the Default column in sync with dev-workflow references/configuration.md.` A key absent from all three layers resolves to its Default below — transcribed here because `mobpro` does not read `dev-workflow`'s own config documentation at runtime (§ Runtime reads in `SKILL.md`), so this table is the only place a run can learn these values. This closed list of 14 is complete:

| Key | Default | Used by |
| --- | --- | --- |
| `reviewer` | `ask-peer` | M1 probe, M4, M9 |
| `review_iterations` | `3` per phase | M1 (N_plan / N_code) |
| `check_commands` | none (unset) | M8 |
| `test_commands` | `["Skill(run-tests)"]` | M8 |
| `language` | merged config → `~/.claude/settings.json` `language` → `ja` | every user-facing output |
| `polish_prose` | `true` | M7 |
| `interactive_commits` | `true` | M11 registration, M12 rule-update commit gate |
| `commit_review_gate` | `diff` | M11 diff surface |
| `compact_rules` | `false` | M12 compaction gate |
| `confirm_remaining_steps` | `false` | M12 entry gate |
| `custom_instructions` | none (unset) | M3, M4, M6, M9 |
| `hooks.on_complete` | none (unset) | M10 registration and execution |
| `self_retrospective.feedback` | none (unset) | M12 |
| `workability_retrospective` | `enabled: false`, `backlog_dir: .claude/improvements` | M12 |

The membership criterion is "every dev-workflow key that governs a step `mobpro` also runs". `dev-workflow` exposes 17 configuration keys: the 14 above plus the 3 in § Not-adopted keys account for all of them. `mobpro` therefore runs on defaults alone even when no config file exists anywhere.

**`test_commands`' default needs a `run-tests` skill to exist.** `run-tests` is not a bundled skill — `dev-workflow --init` generates it into the consuming project, and `mobpro` has no `--init` of its own. So on a project that has never run `--init`, the default resolves to a skill that is not there. M8 handles that case explicitly rather than treating it as a test failure (see `SKILL.md` § M8 — Check / test).

## Not-adopted keys

These `dev-workflow` keys are **not** honored by `mobpro`. If present in dev-workflow config they are ignored **silently** (no warning — they are legitimate dev-workflow settings):

- **`plan_review_gate`** — M5 is always a chat teach-back approval. `visual` / `crit` would replace the approval *surface itself* with a browser, which is mutually exclusive with the chat-based teach-back that is the point of M5. Its deprecated predecessor `visual_plan_review` is ignored on the same terms: it only ever resolves into `plan_review_gate`, so it carries no separate disposition.
- **`implementation_executor`** — always `main`. The AI driver must make each edit in view of the junior; delegating to a subagent would turn the walkthrough into an after-the-fact explanation.
- **`subagent_model`** — `mobpro` has no difficulty assessment, so there is no tier to resolve a per-tier model from; every dispatch inherits the session model.

## `commit_review_gate` is adopted (asymmetry with `plan_review_gate`)

`commit_review_gate` is a fallback key even though `plan_review_gate` (not adopted, above) is not, because `crit` here only swaps the *diff-viewing* surface at M11 — the approval dialogue (learning note → approval judgment) is unchanged, and a structured browser diff view actually helps a junior read the change. That is the whole asymmetry: `plan_review_gate` would replace an *approval* surface (hence exclusive with the M5 teach-back), while `commit_review_gate` replaces only a *viewing* surface.

## Resolution procedure

`SKILL.md` M1's **Resolve settings** sub-step delegates here. Six files are read: the five project config files named in the two sections above, plus `~/.claude/settings.json` (the last link in `language`'s fallback chain). All six are independent, so issue their `Read` calls in **one upfront burst**; a file that does not exist is **skipped, not an error**. The per-class merge semantics live in [`inline-defs.md`](inline-defs.md) § (a) and are not restated here.

1. **mobpro-specific keys**: merge the two layers listed in § mobpro-specific keys, in that order. Resolve `checkpoint` / `quiz` / `error_reading_practice` per that section; on an invalid value substitute the key's default and emit **one** warning line naming the key and the substituted value.
2. **Fallback keys**: merge dev-workflow's three layers as listed in § Fallback keys and resolve that section's closed list, taking each unset key's value from its Default column. An **invalid** value (wrong type, or outside the key's accepted set) is treated the same way — substitute the Default and emit one warning line, as in step 1 — since `mobpro` cannot read dev-workflow's per-key validation prose at runtime. One exception, transcribed here because `SKILL.md` M1's `N_plan` / `N_code` sub-step requires it: in `review_iterations`' `{plan, code}` map form, an absent or invalid **map key** falls back to `3` for that phase only (per-key validation) rather than resetting both phases. **All three layers being absent is not an error** — the deliberate difference from `dev-workflow`, which stops and prompts `--init`.
3. **Not-adopted keys**: ignore silently — no warning, no note (§ Not-adopted keys).

These are **project config files**, not `dev-workflow` reference files: `SKILL.md` § Runtime reads' closed list governs the latter, and its "never read `dev-workflow/SKILL.md`" constraint is untouched by this procedure.
