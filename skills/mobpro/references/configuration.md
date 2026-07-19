# mobpro Configuration

> **Walking-skeleton status**: this reference documents the *target* configuration schema. In the current skeleton, M1 reads **no** config files — every key resolves to its built-in default. Config-file reading (mobpro-specific keys + the dev-workflow fallback chain) is wired in a later subtask; until then this file is the schema reference the wiring will implement against.

`mobpro` splits its settings into two groups: a small set of **mobpro-specific** keys that shape the learning experience, and a set of **fallback** keys that describe the project (reviewer, checks, tests, language, …) and are read from `dev-workflow`'s existing config so the project's quality bar lives in one place.

## mobpro-specific keys

Read from `.claude/mobpro.md` (team-shared, git-tracked) then `.claude/mobpro.local.md` (personal, gitignored) — later layer wins. These three keys are the **complete** closed list; there are no others.

```yaml
# .claude/mobpro.md  /  .claude/mobpro.local.md
---
checkpoint: "unit"             # unit | subtask | off  (default: unit)
quiz: true                     # default: true  (non-boolean → true)
error_reading_practice: true   # default: true  (non-boolean → true)
---
```

- **`checkpoint`** — where the M6 learning checkpoint fires. `unit`: after each M6 implementation unit, plus the M5 teach-back. `subtask`: once after all M6 units complete, plus the M5 teach-back. `off`: no checkpoint, and M5 becomes a normal approval (no teach-back). Invalid value → `unit`. In every setting, a junior's "understood, go ahead" always skips an individual checkpoint. *(Skeleton: only the form (c) "any questions?" checkpoint is implemented; the `unit` / `subtask` / `off` dispatch and the teach-back arrive in a later subtask.)*
- **`quiz`** — whether the (b) lightweight-quiz checkpoint form and the M9 pre-review prediction quiz are used. Default `true`; a non-boolean falls back to `true`. *(Skeleton: off — quiz arrives in a later subtask.)*
- **`error_reading_practice`** — whether the junior reads the error first on the **first** M8 failure of a run before the AI fixes it. Default `true`; a non-boolean falls back to `true`. *(Skeleton: off — practice arrives in a later subtask.)*

## Fallback keys (read from dev-workflow config)

These project-characteristic keys are read — when absent from mobpro's own config — from `dev-workflow`'s three layers (`~/.claude/dev-workflow.local.md` → `.claude/dev-workflow.md` → `.claude/dev-workflow.local.md`) using the same per-class merge semantics as `dev-workflow` (see [`inline-defs.md`](inline-defs.md) § (a)). `mobpro` never writes to these files.

**Closed list**: `reviewer` / `review_iterations` / `check_commands` / `test_commands` / `language` / `polish_prose` / `interactive_commits` / `commit_review_gate` / `compact_rules` / `confirm_remaining_steps` / `custom_instructions` / `hooks` / `self_retrospective` / `workability_retrospective`.

The membership criterion is "every dev-workflow key that governs a step `mobpro` also runs". When wiring config reading, re-derive this list against that criterion to catch omissions (a Test plan item).

A key that is set in neither mobpro's config nor dev-workflow's config resolves to `dev-workflow`'s own default via its own resolution chain (e.g. `language`: merged config → `~/.claude/settings.json` `language` → default `ja`). `mobpro` runs with all defaults even when no config file exists anywhere.

## Not-adopted keys (deliberately ignored)

These `dev-workflow` keys are **not** honored by `mobpro`. If present in dev-workflow config they are ignored **silently** (no warning — they are legitimate dev-workflow settings):

- **`plan_review_gate`** — M5 is always a chat teach-back approval. `visual` / `crit` would replace the approval *surface itself* with a browser, which is mutually exclusive with the chat-based teach-back that is the point of M5.
- **`implementation_executor`** — always `main`. The AI driver must make each edit in view of the junior; delegating to a subagent would turn the walkthrough into an after-the-fact explanation.
- **`subagent_model`** — `mobpro` has no difficulty assessment, so there is no tier to resolve a per-tier model from; every dispatch inherits the session model.

## `commit_review_gate` is adopted (asymmetry with `plan_review_gate`)

`commit_review_gate` is a fallback key even though `plan_review_gate` (not adopted, above) is not, because `crit` here only swaps the *diff-viewing* surface at M11 — the approval dialogue (learning note → approval judgment) is unchanged, and a structured browser diff view actually helps a junior read the change. That is the whole asymmetry: `plan_review_gate` would replace an *approval* surface (hence exclusive with the M5 teach-back), while `commit_review_gate` replaces only a *viewing* surface. *(Skeleton: the `crit` branch arrives in a later subtask; the skeleton presents diffs in chat.)*
