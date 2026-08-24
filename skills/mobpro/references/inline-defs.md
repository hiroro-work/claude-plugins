# Transcribed dev-workflow inline definitions

These are the `dev-workflow` definitions that `mobpro` needs but that it does not read at runtime (SKILL.md § Runtime reads).

**Read this file once**, at the first point that needs a transcription (SKILL.md § Configuration's pointer to § (a), before M1 completes); the later pointers from M8 / M10 / M11 / M12 / M13 name a section of that same copy.

---

## (a) Settings merge strategy

`Keep in sync with dev-workflow SKILL.md § Configuration "Merge strategy per key type".` `mobpro` merges the fallback keys across the dev-workflow layers with these per-class semantics (M1 applies them via [`configuration.md`](configuration.md) § Resolution procedure):

- **Scalar** (`reviewer`, `code_review`, `commit_review_gate`, `polish_prose`, `interactive_commits`, `custom_instructions`, `language`, `self_retrospective`, `workability_retrospective`): higher layer wins (replaces) **when the key is present**; an absent key inherits from lower layers. Map-valued scalars — the nested maps `self_retrospective` / `workability_retrospective` — replace **wholesale** (no per-key cross-layer merge); an absent map key falls to its default at resolution time, and the merged map's leaves are then read individually (`self_retrospective.feedback`; `workability_retrospective.enabled` / `.backlog_dir`) — leaf-level reading of the merged result, not leaf-level merging across layers.
- **List** (`check_commands`, `boundary_check_commands`): append — lower-layer items first, then higher-layer items, duplicates removed (keep first occurrence).
- **List-replace** (`test_commands`): higher layer's list replaces lower layer's as a whole (defaults to `["Skill(run-tests)"]` when unset).
- **`hooks`**: deep-merge at the `hooks` level — each sub-key (`on_complete`) merged as a list (append, deduplicated).
- **`null` or empty** (`[]`, `{}`) explicitly clears the key; a key absent from a layer inherits from lower layers.

## (b) Workflow artifacts (cross-step fixed exclusion)

`Keep in sync with dev-workflow SKILL.md § Workflow artifacts.` Files this workflow creates and maintains as in-session state — plan documents under `.claude/plans/`, decomposition state files, backlog files, the M5 visual-gate served / comments / URL / prev files (`.claude/plans/<slug>.plan-review.md` / `.plan-review.comments.json` / `.plan-review.url` / `.plan-review.prev.md`), the M5 visual-gate figures file (`.claude/plans/<slug>.figures.md`), the rule-extraction candidate file, and other workflow-internal staging artifacts under `.claude/` — are **cross-step fixed exclusions** from every per-step changed-file enumeration (M7 tidy scope, M7 prose-polish scope, M9 rules-review diff input, M11 commit grouping, sub-skill dispatch payloads, scope checks). The exclusion is **structural** — not gated on `.gitignore` presence. Steps that build a changed-file set apply this single shared exclusion rather than re-deriving it.

## (c) Scope stops (M8)

`Keep in sync with dev-workflow SKILL.md § Step 7's scope-narrowing / scope-drift bullets.` Two step-internal USER GATES apply during `check_commands` (the only non-completing exits there):

- **Pre-execution scope-narrowing stop**: a `check_commands` entry assessed as a repo-wide auto-fix tool + the working tree has unrelated existing changes + narrowing is infeasible → stop and ask the user (run full-width / skip / alternative scoped invocation).
- **Scope-drift stop**: a command writes non-trivial changes outside the task-scope snapshot (`git diff --name-only <base_commit>`) → warn and wait, leaving the tree as-is. Trivial whitespace/comment-only drift ≤ 5 lines attributable to the formatter/linter proceeds automatically with a one-line note.

## (d) Task-derived-change gate (M10)

`Keep in sync with dev-workflow references/finish-phase.md § Step 9's task-derived-change gate paragraph.` Before executing any `hooks.on_complete` entry, check whether the tracked diff since `<base_commit>` contains task-produced changes. When it does not — the tracked diff is empty or every changed path is pre-existing work unrelated to this task, **and** `git status --porcelain=v1 --untracked-files=all` shows no task-derived untracked files (gitignored paths never appear there) — skip the whole `hooks.on_complete` list, mark M10 `completed`, and emit one line naming the skip reason. When an unrelated pre-existing diff exists, also add a warning line surfacing those paths. On any doubt about whether a changed path is task-derived, run the hooks as usual (the gate skips only when the absence of task-derived changes is clear).

## (e) Step 10 inline definitions (M11)

`Keep in sync with dev-workflow references/finish-phase.md § Step 10.` `interactive-commits.md` depends on these definitions that live in dev-workflow's `references/finish-phase.md` § Step 10 (or, where noted, elsewhere in dev-workflow):

- **`<base-commit>`** (`Keep in sync with dev-workflow SKILL.md § Step 2: Create Plan's first numbered item`): § Collect changes defines it as the value dev-workflow's Step 2 records at workflow start. In `mobpro` that value is `base_commit`, recorded at M3 (`SKILL.md` § Cross-step state variables) — read it wherever the Procedure says `<base-commit>`. The dev-workflow phase names the Procedure cites alongside it need no entry here: `SKILL.md` § M ↔ Step remap directive already maps them.
- **Approval token closed list** (judge each reply semantically, not by exact phrase): **accept** (affirmative — "OK" / "approve" / "next" / "コミットして" / "進めて" or equivalent) / **adjust** (a specific revision demand — subject change, file regrouping, split) / **cancel** / **stop** (explicit halt) / **NOT approval** (interrogative or non-committal — "look good?" / "これでいい？"; treat as `adjust` and re-present, never silently advance). When presenting a gate, include at least one short accept token.
- **Localized summary tokens** (single source of truth; M13 references the same paired form):
  - `language: ja`: `M11（Commit）部分完了: <N>/<total> コミット適用済み`
  - `language: en`: `M11 (Commit) partial completion: <N>/<total> commits landed`
- **`landed_count` lifecycle**: initialized to `0` at M1 (SKILL.md § Cross-step state variables); incremented by exactly 1 on each commit's zero exit; a retry / abort / failed commit does not increment; an `--amend` / re-commit is not re-incremented.
- **Build-order boundary chain (`implementation_boundaries`)**: the ordered `{heading, object}` list `interactive-commits.md` § Propose commit plan reads to decide between its chain-present and chain-absent grouping. In `mobpro` it is **already produced by M6**, which appends to it at [`diff-review.md`](diff-review.md) § Per-unit review range step 3. M11 hands that section a populated chain on any run whose M6 units all reviewed cleanly, and an empty one (its chain-absent path) when M6 never ran or its object builds failed.
- **Post-hook attribution check**: run `git diff <base_commit> --name-only` (`step10_diff_paths`), compute `hook_introduced_paths = step10_diff_paths − implementation_diff_paths` after first subtracting the § (b) Workflow artifacts set, cross-reference the remainder against the review-hook applied sites; surface any unattributed path with `git diff <base_commit> -- <path>` and require explicit resolution (confirm as an expected side-effect, or `git checkout HEAD -- <path>`) before commit grouping.
- **Branch-ancestry guard**: an unexpected current branch is normal when the environment pre-creates a working branch, **as long as** the branch descends from `<base_commit>` (`git merge-base --is-ancestor <base_commit> HEAD`, zero exit = it does). Non-zero exit → stop and surface the discrepancy rather than switching branches unilaterally.

## (f) Step 11 skeleton (M12)

`Keep in sync with dev-workflow references/finish-phase.md § Step 11.`

- **`rule-extraction-active` gate**: rule extraction is **inactive** if (a) any `hooks.on_complete` entry contains the string `extract-rules`, OR (b) M10 ran a hook whose output shows `extract-rules --from-conversation` ran this session (signal: output contains `staged_count` or `promoted_count`). When inactive, skip all conversation-derived extraction (do not dispatch the shared scan on rule-extraction's behalf, do not call `extract-rules`) — this preserves the staged-promotion 1st→2nd-observation escalation from miscounting one session as two.
- **Session-scan wiring**: when rule-extraction is active, M12 dispatches the shared scan (or consumes an already-dispatched result) per `../dev-workflow/references/session-scan.md`.
- **extract-rules-unavailable fallback**: if `extract-rules` is unavailable, save reusable patterns to `.claude/plans/rules-candidates-<YYYY-MM-DD>.md` (append if present), inform the user, and append `extract-rules unavailable (rule update)` to `bundle_skills_unavailable`.
- **Rule-update commit gate firing condition**: fires only when `interactive_commits` is true AND there are uncommitted changes under any of extract-rules' three output directories (`output_dir` / `examples_output_dir` / `staging_output_dir`), detected via `git status --porcelain=v1 --untracked-files=all -z` filtered to those dirs with the § (b) Workflow artifacts set subtracted.

## (g) Completion inline definitions (M13)

`Keep in sync with dev-workflow references/finish-phase.md § Completion.`

- **State-file lifecycle**: sub-task `status` `completed` write-back + optional PR-URL record; **commit-before-resume guidance** — the next run takes a fresh base-commit from HEAD, so uncommitted changes leak into the next subtask's diff; when `landed_count == 0`, instruct the user to commit + open a PR before resuming; all-done state-file deletion + progress-row removal + canonical state-file-path discipline (never re-derive from `slug`); **single-writer constraint** (no concurrent sessions against one state file); **extract-rules residue warning** (uncommitted residue in the three output dirs must be committed before resuming); **execution-time deferral/exclusion gate** (items excluded, deferred, or discovered as unassigned during implementation must be promoted to tracked subtask entries before declaring completion — items recorded only in prose are invisible to `--resume`). Get user approval per uncovered item on one of this closed 3-option set: (a) add as a new `pending` subtask, with a `depends_on` link when sequencing matters, (b) fold into an existing `pending` subtask's scope, or (c) explicitly accept as permanently out of parent-task scope. The M13 report must confirm that no goal-required item remains in untracked prose form.
- **`uncommitted_*` 3-set partition scan**: resolve the three extract-rules output directories once and run a single `git status --porcelain=v1 --untracked-files=all -z`, partitioning output into `uncommitted_rule_changes` / `uncommitted_examples_changes` / `uncommitted_staging_changes` (each path lands in exactly one set via directory membership, then a filename-class tie-break). The three rule-update / examples-dir / staging-dir reminders read these sets; none re-scans.
