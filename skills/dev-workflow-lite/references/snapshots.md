# Snapshot chain and review-fix absorption

Read from `SKILL.md` Phase 6 (Implement) and Phase 14 (Interactive Commits). Unqualified `§` references point into this file. The chain gives Interactive Commits one commit per Build order step; absorption folds the later review layers' edits into the step commits that own the edited lines, so each commit shows a step's work in its reviewed form.

## Chain state

- Ref `refs/dev-workflow-lite/<slug>` points at the newest snapshot. Snapshots are ordinary commit objects whose first parent chain ends at `<base-commit>`.
- Temp index `.git/dev-workflow-lite.index` (literal path). Snapshots are built there so the user's index is never touched.
- Both are workflow artifacts. When `.git` is not a directory (a linked worktree, checked at Load Settings) the chain is not built and Interactive Commits takes its chain-absent path. A ref left by an earlier run of the same slug is deleted right before step 1's snapshot (`SKILL.md` Phase 6).

## Snapshot at a Build order step boundary

After the last edit of Build order step k, with `<prev>` = the ref's current target, or `<base-commit>` for step 1, and `<paths>` = the files this step edited or created or deleted, minus `SKILL.md` § Workflow artifacts:

```bash
GIT_INDEX_FILE=.git/dev-workflow-lite.index git read-tree <prev>
GIT_INDEX_FILE=.git/dev-workflow-lite.index git add -- "<p1>" "<p2>"
GIT_INDEX_FILE=.git/dev-workflow-lite.index git write-tree          # → <tree>
```

If `<tree>` equals `<prev>^{tree}`, the step changed nothing: take no snapshot. Otherwise `git commit-tree <tree> -p <prev>` with the step's bold heading as the message on stdin, and `git update-ref refs/dev-workflow-lite/<slug> <sha>`. A non-zero exit anywhere abandons the chain for the run: `git update-ref -d` the ref, say so in one line, and continue; Interactive Commits then takes its chain-absent path.

## Absorb review fixes

Runs at the start of Interactive Commits when the ref exists. `<tip>` = the ref's target.

1. **Residue**: first `git add -N -- <path>` for every untracked file outside `SKILL.md` § Workflow artifacts (files the review layers created since Implement's own `add -N`; an untracked file would otherwise be invisible to the diff). Then `git diff <tip> --stat`. Empty → the chain is final; skip to step 6.
2. **Attribute**: `node "<base dir>/scripts/absorb/attribute.mjs" --base <base-commit> --tip <tip> --out .claude/plans/<slug>.absorb`. It blames each zero-context residue hunk against `<tip>` and writes one patch per owning chain commit, plus `trailing.patch` for hunks no chain commit owns; every patch applies with `--unidiff-zero`. Read its JSON. A non-zero exit → step 5's fallback.
3. **Fold** in a throwaway worktree:
   ```bash
   git worktree add --detach .git/dev-workflow-lite-wt <tip>
   git -C .git/dev-workflow-lite-wt switch -c dev-workflow-lite/<slug>
   ```
   For each target in order: `git -C .git/dev-workflow-lite-wt apply --unidiff-zero "<patch>"`, `git -C .git/dev-workflow-lite-wt add -A` (allowed here only because the worktree is throwaway and holds nothing but the tip plus this patch), `git -C .git/dev-workflow-lite-wt commit --no-verify --no-gpg-sign --fixup=<commit>`. If an apply fails, append that patch to the trailing set and continue. Then:
   ```bash
   GIT_SEQUENCE_EDITOR=true GIT_EDITOR=true git -c commit.gpgsign=false -C .git/dev-workflow-lite-wt rebase -i --autosquash <base-commit>
   ```
   If the rebase exits non-zero: `git -C .git/dev-workflow-lite-wt rebase --abort` and go to step 5's fallback.
4. **Trailing commit**: if `trailing.patch` exists or any apply failed, apply those patches in the worktree with `--unidiff-zero`, `add -A`, and `commit --no-verify --no-gpg-sign -m "<subject in the deduced style naming the review fixes>"`. If the trailing apply fails, go to step 5's fallback.
5. **Publish** the result: `git update-ref refs/dev-workflow-lite/<slug> $(git -C .git/dev-workflow-lite-wt rev-parse HEAD)`. **Fallback** (attribution, rebase, or trailing apply failed): keep the original chain and append one commit holding the whole residue — build it with the temp index as in § Snapshot at a Build order step boundary, with `<tip>` as `<prev>` and every residue path as `<paths>`, message `review fixes` — then say in one line that review fixes could not be attributed to steps. Either way, finish with `git worktree remove --force .git/dev-workflow-lite-wt` and `git branch -D dev-workflow-lite/<slug>` when they exist, and `rm -rf .claude/plans/<slug>.absorb`. The worktree never outlives this procedure.
6. **Consistency check**: `git diff <new tip>` against the working tree must be empty apart from § Workflow artifacts. If it is not, take the fallback of step 5 over the remaining difference.

The chain's commits are then the commit plan (`commits.md` § Procedure, chain path).
