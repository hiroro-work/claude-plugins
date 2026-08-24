# Diff Presentation (shared)

## Detached review object

To review exactly the delta between two states while unrelated changes sit uncommitted in the working tree, synthesize a **plumbing-level commit object**: no ref moves, no hook runs, nothing lands, and an interrupted session strands nothing.

1. **Stage** the paths in scope: `git add -- "<path-1>" "<path-2>" ...`, one explicit pathspec per path, double-quoted so spaces, quotes, and non-ASCII characters survive. `-A` and other bulk forms are forbidden — they sweep unrelated drift into the review. Record the staged set; step 5 consumes it.

   **step 1.5 — Re-stage after a between-steps mutation**: when § Caller endpoints' step 1.5 command list gives this caller a list, run each of its entries in order — a failing entry does not stop the entries after it — then repeat step 1's `git add` over the same path set. Step 2 reads the index alone, so a command's working-tree rewrites reach `<tree>` only through that second add. Any path outside step 1's set stays out of the object and remains an unstaged working-tree change — both a path a command creates, and an already-tracked file this caller did not edit that a repo-wide command rewrote. A caller whose column reads `none` skips this step.

   **On a command's non-zero exit**: this is not a step 1 / 2 / 3 git failure, so the "On failure" paragraph below fixes the `<reason>` format alone and leaves the disposition here. Record a one-line note naming the command and the caller's own unit of work, with `<reason>` shaped as that paragraph shapes it. Once the list has run through, fix what each failing entry reported and re-run that entry **once**, in list order, then repeat step 1's `git add` again so the fixes are in the index before step 2. On a second non-zero exit, keep the note as the record, repeat step 1's `git add` a final time so whatever the entries did land is in the index, and let step 2 snapshot it as it then stands; the caller names the gate that still stops its run.

2. **Snapshot** the index: `git write-tree` → `<tree>`. It reads the index only, so unstaged and untracked files never enter it; the review's file-level scoping comes from diffing two trees, not from the snapshot omitting anything.
3. **Wrap** the tree: `git commit-tree <tree> -p <base>`, message piped via stdin → `<head>`. This updates no ref and runs no hook, so `<head>` is a dangling commit that ordinary garbage collection reclaims.
4. **Review** `<base>..<head>`.
5. **Unstage** at the caller's unstage point (§ Caller endpoints): `git reset -- "<path-1>" "<path-2>" ...` over the set staged in step 1, returning those entries to `HEAD`'s tree. Always pass that pathspec, and **skip the call entirely when the set is empty** — a bare `git reset --` would unstage whatever the user had staged before the run.

A caller that hands `<head>` to an external review tool owns verifying that the tool accepts a dangling object.

**On failure**: on a non-zero `git add` / `write-tree` / `commit-tree`, the caller falls back to whichever surface needs no new object — that disposition is the caller's. A step 5 unstage that fails is different: retry once after a 1–2 second sleep, then render a one-line note with `<reason>` (the last non-empty stderr line, truncated to ≤ 80 characters, or `(no stderr)` when empty) and proceed. Either way, do **not** auto-recover (no `git reset --hard`, no manual index or ref manipulation) and leave the staged paths as they are.

### Caller endpoints

| Caller | `<base>` | Resolution timing | Unstage point | step 1.5 command list |
| --- | --- | --- | --- | --- |
| [`interactive-commits.md`](interactive-commits.md) — Step 10's per-commit candidate (steps 1 and 2, not 1.5, on its pathspec derivation only; step 3 on both) | `HEAD`, via `git rev-parse HEAD` | once per commit, when that commit's candidate is built | only on its non-landing exits (closed list at its § Per-commit loop sub-step `a`) | none — its objects land through a real `git commit`, where the project's own hooks fire |
| `mobpro` `references/diff-review.md` — M6 per-unit review | `m6_review_base` | initialized at M6 loop entry, then advanced to the previous unit's `<head>` as each unit's review resolves | once, at M6 exit | `boundary_check_commands`, on every run |
| [`step5-implement.md`](step5-implement.md) — Step 5 per-Build-order-step boundary (steps 1–3 and 5 only; it records objects for Step 10 to consume rather than reviewing them) | `step5_boundary_base` | initialized to `<base-commit>` at Step 5 entry, then advanced to the previous step's `<head>` as each Build order step's edits land | once, at Step 5 exit | `boundary_check_commands`, only where the sub-step runs at all |

## Rendering ladder

When a diff renders as chat text, measure it **once** up front, pick one mode, and hold it for every file in that rendering. The caller supplies the measurement input (which per-file slices make up the diff) and the full-diff command the skeleton trailer names. The thresholds are fixed internal constants, not configurable.

Three modes, first match wins:

- **verbatim** — **first** the line-count gate: total line count ≤ **100 lines**; **otherwise** the char-count gate: total character count ≤ **4000 chars**.
- **condensed** — total character count ≤ **20000 chars**: the first **100 lines** of each file, then `… [N lines omitted]`, where N is that file's remaining line count.
- **skeleton** — anything larger: the first **20 lines** of each file, then `… [N lines omitted — run <the caller's full-diff command for that path> to view the full diff for this file]`. When a slice has no such command — an untracked path, which `git diff` never prints — name the path to open instead: `… [N lines omitted — open <path> to view this file in full]`. No file is dropped.
