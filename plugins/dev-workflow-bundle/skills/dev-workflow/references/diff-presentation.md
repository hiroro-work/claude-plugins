# Diff Presentation (shared)

Two procedures more than one diff-review surface needs, written in `<base>` / `<head>` vocabulary so neither is tied to one caller's endpoints. A caller of § Detached review object supplies its `<base>` and its unstage point (§ Caller endpoints lists them); a caller of § Rendering ladder supplies the measurement input and the full-diff command. Some callers use one section, some both. This file is the single canonical home for both procedures — a caller points here rather than restating the steps.

## Detached review object

To review exactly the delta between two states while unrelated changes sit uncommitted in the working tree, synthesize a **plumbing-level commit object**: no ref moves, no hook runs, nothing lands, and an interrupted session strands nothing.

1. **Stage** the paths in scope: `git add -- "<path-1>" "<path-2>" ...`, one explicit pathspec per path, double-quoted so spaces, quotes, and non-ASCII characters survive. `-A` and other bulk forms are forbidden — they sweep unrelated drift into the review. Record the staged set; step 5 consumes it.
2. **Snapshot** the index: `git write-tree` → `<tree>`. It reads the index only, so unstaged and untracked files never enter it; the review's file-level scoping comes from diffing two trees, not from the snapshot omitting anything.
3. **Wrap** the tree: `git commit-tree <tree> -p <base>`, message piped via stdin → `<head>`. This updates no ref and runs no hook, so `<head>` is a dangling commit that ordinary garbage collection reclaims.
4. **Review** `<base>..<head>`.
5. **Unstage** at the caller's unstage point (§ Caller endpoints): `git reset -- "<path-1>" "<path-2>" ...` over the set staged in step 1, returning those entries to `HEAD`'s tree. Always pass that pathspec, and **skip the call entirely when the set is empty** — a bare `git reset --` would unstage whatever the user had staged before the run.

A caller that hands `<head>` to an external review tool owns verifying that the tool accepts a dangling object ([`crit-commit-review.md`](crit-commit-review.md) § crit CLI contract records that verification for crit).

**On failure**: a `git add` / `write-tree` / `commit-tree` that exits non-zero leaves no `<head>` to range against, so the caller falls back to whichever surface needs no new object — that disposition is the caller's. A step 5 unstage that fails is different: retry once after a 1–2 second sleep, then render a one-line note with `<reason>` (the last non-empty stderr line, truncated to ≤ 80 characters, or `(no stderr)` when empty) and proceed. Either way, do **not** auto-recover (no `git reset --hard`, no manual index or ref manipulation) and leave the staged paths as they are. Leftovers cannot reach a commit: a caller either re-stages by pathspec before it next touches the index, or replaces the index outright (`git read-tree`) before committing.

### Caller endpoints

Each caller supplies these three values and does **not** restate the steps above.

| Caller | `<base>` | Resolution timing | Unstage point |
| --- | --- | --- | --- |
| [`interactive-commits.md`](interactive-commits.md) — Step 10's per-commit candidate (steps 1–2 on its pathspec derivation only; step 3 on both) | `HEAD`, via `git rev-parse HEAD` | once per commit, when that commit's candidate is built | only on its non-landing exits — see the note below |
| `mobpro` `references/diff-review.md` — M6 per-unit review | `m6_review_base` | initialized at M6 loop entry, then advanced to the previous unit's `<head>` as each unit's review resolves | once, at M6 exit |
| [`step5-implement.md`](step5-implement.md) — Step 5 per-Build-order-step boundary | `step5_boundary_base` | initialized to `<base-commit>` at Step 5 entry, then advanced to the previous step's `<head>` as each Build order step's edits land | once, at Step 5 exit |

Two rows above use only part of the five-step shape:

- **`interactive-commits.md`** — no unstage on the landing path: its `c. Land the candidate` commits the index it set, leaving the index equal to the new `HEAD`, so there is nothing left to reset. The exits that leave before that commit do reset the paths they staged — see its § Per-commit loop sub-step `a`, which holds that closed list. It uses steps 1–2 only where it derives a tree from a pathspec; where the tree comes from a Build order boundary nothing is staged and only step 3 applies. Step 10's `crit` path is **not** a caller here despite reviewing a dangling object — it ranges against this caller's candidate ([`crit-commit-review.md`](crit-commit-review.md)'s **Scoping mechanism — detached review object, no ref ever moves** bullet).
- **`step5-implement.md`** — steps 1–3 and 5 only: it records objects for Step 10 to consume instead of reviewing them, so step 4 has no counterpart. The objects stay dangling here; the ref-moving landing that eventually consumes them belongs to [`interactive-commits.md`](interactive-commits.md) § Per-commit loop.

## Rendering ladder

When a diff renders as chat text, measure it **once** up front, pick one mode, and hold it for every file in that rendering. The caller supplies the measurement input (which per-file slices make up the diff) and the full-diff command the skeleton trailer names. The thresholds are fixed internal constants, not configurable.

Three modes, first match wins:

- **verbatim** — **first** the line-count gate: total line count ≤ **100 lines**; **otherwise** the char-count gate: total character count ≤ **4000 chars**. Line count is checked first so a long-line prose diff with few lines is not downgraded by the char-count test.
- **condensed** — total character count ≤ **20000 chars**: the first **100 lines** of each file, then `… [N lines omitted]`, where N is that file's remaining line count.
- **skeleton** — anything larger: the first **20 lines** of each file, then `… [N lines omitted — run <the caller's full-diff command for that path> to view the full diff for this file]`. When a slice has no such command — an untracked path, which `git diff` never prints — name the path to open instead: `… [N lines omitted — open <path> to view this file in full]`. No file is dropped.
