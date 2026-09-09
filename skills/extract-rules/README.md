# extract-rules

Operational guide for the `extract-rules` skill. `SKILL.md` holds the procedure the agent follows; this file holds the guidance a user needs when deciding how and when to run it.

## Choosing a mode

Four modes rewrite rules that already exist, and they are easy to confuse.

| You want to | Run |
|---|---|
| Add newly observed patterns, keeping everything already written | `--update` |
| Change the **file layout** — new frameworks, new architectural layers, a `split_output` switch | `--restructure` |
| Re-judge written rules against the current **extraction criteria**, dropping or trimming what no longer qualifies | `--realign` |
| Shrink an over-threshold file without changing the set of norms it states | `--compact` |

After the extract-rules skill itself is updated, the change decides the mode: `--restructure` when the file layout should change, `--realign` when the extraction criteria did.

`--realign` can take a norm away outright; `--compact` never does — it merges near-duplicates and drops an entry only where another already subsumes it. When both apply to one file, realign first.

## After a dependency major-version bump

Run `--update`. Its staleness check flags patterns whose inline `` `symbol` `` no longer resolves in the codebase, which is what a major bump tends to produce. Two limits are worth knowing:

- The check only scans inline `` `symbol` `` in the `## Project-specific patterns` section. `.examples.md` files are not scanned — review them by hand for the affected frameworks.
- `--restructure` does **not** run the check. Run `--update` first when both are needed.

Stale patterns are reported, never auto-deleted.

## Staging

Incremental runs (`--from-conversation`, `--from-pr`) do not write a newly observed project-level pattern straight into `.claude/rules/`. The first observation lands in the staging file under `staging_output_dir`; the second observation promotes it to canonical and removes it from staging. Language, framework, and integration patterns bypass staging entirely.

Two consequences:

- A staged candidate you already believe in can be moved into `.local.md` by hand rather than waiting for a re-observation.
- Deleting `output_dir` and re-running a full extraction leaves the staging file untouched, because it lives outside `output_dir`. The next incremental run will promote those candidates against the rebuilt canonical. Delete the staging directory by hand first when the staged candidates no longer apply.

## Relationship with merge-rules and apply-rules

`merge-rules` promotes a project-specific pattern to a Principle across projects: the bullet `` `useAuth() → { user, login, logout }` - auth hook interface `` becomes the Principle `Auth hook interface (useAuth)`, and its example moves from `## Project-specific Examples` to `## Principles Examples` under the converted name.

After `apply-rules` applies merged organization rules, a project's `.examples.md` can hold both sections at once — `## Principles Examples` covering original and promoted principles, `## Project-specific Examples` covering what stayed local. `apply-rules` removes the duplicate: when a `.local.md` pattern is dropped because a promoted Principle now covers it, its `## Project-specific Examples` entry goes with it.
