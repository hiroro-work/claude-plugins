# Triage Criteria

Reference loaded by `dev-workflow-triage` during the "Judge each Finding" step (accept/reject decision) and the "Post triage comment" step (comment body template).

## Accept / reject decision checklist

### Accept when **all** are true

- [ ] The problem the Finding describes **reproduces in the current file state** — read `skills/<target>/SKILL.md` and `skills/<target>/references/*.md` and confirm the ambiguity / missing-branch / wrong-default / rules-conflict is still present.
- [ ] The `Suggested fix direction` translates to a **local edit** — a paragraph rewrite, a new clause inside an existing section, an explicit step addition, a rules-reference insertion. It should be expressible as one `Edit` tool call (one `old_string` → `new_string`).
- [ ] The edit target sits inside `skills/<target>/` (SKILL.md or `references/*.md`). Never a rules file, never a different skill, never outside `skills/`.
- [ ] The fix doesn't trigger a cascade — i.e. doesn't require simultaneous edits to sibling files or cross-skill coordination to remain consistent.

### Reject when **any** is true

1. **Already addressed**: reading the current file shows the Finding's concern is already handled (a later commit after the retrospective was generated covered it).
2. **Out-of-scope target mentioned in description**: `Target skill` is one of the four bundle skills, but the `Description` body actually complains about a different skill's behavior (bundle or non-bundle). Not the triage target's fault to fix.
3. **Too abstract**: the `Suggested fix direction` doesn't point at a concrete edit ("improve the error handling", "make it clearer", "consider X better"). Without a concrete landing point, a single-pass Edit can't be responsibly planned.
4. **Rules file required**: the only plausible fix is editing `.claude/rules/*.md`. Rules updates are owned by `extract-rules`. A `rules-conflict` Finding can still be accepted when the fix is *referencing* existing rules from the skill — only reject when the rules themselves need new content.
5. **Large restructure**: the fix implies splitting a SKILL.md, introducing new section structure, reshuffling cross-skill responsibilities, or editing more than one file / creating new files. Not safe for a single-pass autonomous run.
6. **Contradicts a deliberate design choice**: reading the target file shows the current behavior is intentional (documented in a comment, a Decisions section, a rule file, or a commit message). Reject and note the source.

Note: the accept/reject checklist above is scoped to the triage judgment that runs before any edits. The subsequent `verify-diff` polish step empirically re-checks the applied diff against the Finding's stated objective, but its verdict does not retroactively change the accept decision — `verify-diff` can downgrade a Finding to `conflict` via safety rails, which is already covered by the edge-case dispatch table below.

## Edge-case dispatch table

Quick reference for per-case dispositions. SKILL.md's procedural prose is authoritative for execution order; this table flattens the same information for faster scanning.

| Case | Disposition |
|---|---|
| `gh` not authenticated | Abort run with summary "gh not authenticated" |
| Open-issue list empty | Emit summary "no open issues" and exit |
| Title doesn't match `^\[auto-retrospective\] dev-workflow-bundle: \d+ findings` | Skip the issue — no comment, no close |
| `Findings: N` line disagrees with `### Finding` count, or required field missing | Whole issue → `parse-error`; post comment; leave open |
| `Target skill` outside the 4-skill bundle | Whole issue → `parse-error`; post comment; leave open |
| Description text names a skill other than the declared `Target skill` | Per-Finding `reject` (out-of-scope target in description) |
| Edit `old_string` not found (prior Finding's commit overwrote the region) | Per-Finding `conflict`; commit nothing; continue |
| Edit leaves frontmatter broken | Per-Finding `conflict`; `git checkout HEAD -- <file>`; continue from clean tree |
| verify-diff returns `converged` | Proceed to (d2) skill-review polish |
| verify-diff returns `unresolved` (max iterations hit with gaps remaining) | Per-Finding warning `verify-diff unresolved (<n> gaps)`; proceed to (d2) |
| verify-diff returns `skipped` (reason codes defined in `.claude/skills/verify-diff/SKILL.md` § Step 4) | Per-Finding warning `verify-diff skipped (<reason>)`; proceed to (d2) |
| verify-diff returns `conflict` (reason codes defined in `.claude/skills/verify-diff/SKILL.md` § Step 4) | Per-Finding `conflict`; `git checkout HEAD -- <reverted_paths>` (idempotent safety re-run since verify-diff already reverted internally); skip (d2); continue |
| 2 consecutive Findings with verify-diff `skipped` or `conflict` (counter resets on `converged` / `unresolved` — any successful-or-still-functioning return between errors breaks the streak) | Set `verify_diff_disabled=true`; skip verify-diff for rest of run; warn on each affected Finding |
| skill-review returns no findings in ≤ 3 iterations | Proceed to commit |
| skill-review still flags findings after 3 iterations | Proceed to commit; add warning `skill-review notes left (<n>)` in the comment |
| skill-review returns an error response | Per-Finding warning `skill-review error (<reason>)`; skip polish for this Finding |
| 2 consecutive Findings with skill-review errors | Set `skill_review_disabled=true`; skip polish for the rest of the run; warn on each affected Finding |
| `git diff` shows a path outside `skills/` after (d) | Per-Finding `conflict`; `git checkout HEAD -- <paths>`; continue |
| `git commit` non-zero (usually a pre-commit hook rejection) | `git reset` + `git checkout HEAD -- <paths>`; per-Finding `conflict`; record `commit-failed` |
| `gh issue comment` non-zero | Record `comment-failed`; other issues continue |
| `gh issue close` non-zero | Record `close-failed`; other issues continue |
| `gh issue list` returns exactly 200 items | Set `overflow=true`; surface in summary ("200-issue cap reached") |
| Step 3.7 reaches release bookkeeping with zero accepted-and-committed Findings across the run | Skip release bookkeeping; record `release-bookkeeping=skipped (no commits)`; per-Finding commits (none in this case) and Step 4 summary proceed |
| Step 3.7 version-skew guard: pre-bump versions of `dev-workflow` plugin and `dev-workflow-bundle` plugin disagree | Abort release bookkeeping with no marketplace / CHANGELOG edits; record `release-bookkeeping=failed (version skew: dev-workflow=<v1>, dev-workflow-bundle=<v2>)` |
| Step 3.7 post-Edit `jq empty .claude-plugin/marketplace.json` returns non-zero | Revert via `git checkout HEAD -- .claude-plugin/marketplace.json`; record `release-bookkeeping=failed (json invalid)` |
| Step 3.7 `git diff --name-only` after Edits lists a path other than `.claude-plugin/marketplace.json` / `CHANGELOG.md`, OR the bookkeeping `git commit` returns non-zero | Revert via `git checkout HEAD -- .claude-plugin/marketplace.json CHANGELOG.md` (and `git reset` for the commit-error branch); record `release-bookkeeping=failed (<scope leak\|commit error>)` |

## Comment body template

Use this shape when building the `--body-file` content in the "Post triage comment" step:

```markdown
## Triage: YYYY-MM-DD (auto)

### Finding <n>: <accepted|rejected|conflict|parse-error>
- **Target**: <skill name>
- **Category**: <ambiguity|missing-branch|wrong-default|rules-conflict|other>
- **Reasoning**: <1-2 sentences in English>
- **Applied changes**: <file:section> at <commit-hash> | `—`
- **Notes** (optional, only if warnings): `verify-diff unresolved (<n> gaps)`, `verify-diff skipped (<reason>)`, `verify-diff disabled after consecutive errors`, `skill-review notes left (<n>)`, `skill-review error (<reason>)`, `skill-review disabled after consecutive errors`

... repeat for each Finding in the issue ...

Result: <closed as completed | closed as not planned | left open for manual review>
```

Template notes:

- One Finding section per `### Finding <n>` in the source issue, in source order.
- `Applied changes`: `skills/<target>/<file>:<heading>` at commit hash when committed; `—` otherwise. Use heading names, not line numbers (line numbers churn).
- `Notes`: include only when a warning fired; omit the bullet entirely on clean runs.
- Whole-issue `parse-error` (see SKILL.md § Parse body): still emit one `### Finding <n>` section per parseable Finding and set the label to `parse-error`; the Reasoning cites the triggering parse-error condition (e.g. "Target skill outside bundle"). If the body couldn't be parsed into Findings at all (heading/count mismatch, no extractable Findings), emit a single `### Whole issue: parse-error` section instead, with the triggering condition in Reasoning and `Applied changes: —`.
