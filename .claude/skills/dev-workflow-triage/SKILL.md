---
name: dev-workflow-triage
description: Triage open issues in the dev-workflow-bundle retrospective repo. Read each open issue, judge each Finding (accept / reject), apply accepted fixes to the bundle skills (dev-workflow, ask-peer, extract-rules, rules-review), post a triage comment, and close the issue. Designed for non-interactive routine execution (no plan mode, no user prompts) on Claude Code on the Web.
allowed-tools: Read, Edit, Write, Skill(skill-review), Bash(gh auth status), Bash(gh --version), Bash(gh issue list *), Bash(gh issue comment *), Bash(gh issue close *), Bash(git diff *), Bash(git add *), Bash(git commit *), Bash(git reset), Bash(git checkout HEAD -- *), Bash(git rev-parse *), Bash(git config --get *), Bash(jq *), Bash(mkdir -p *)
---

# Dev Workflow Triage

Non-interactive daily triage of the `dev-workflow-bundle` retrospective issues. Either proceed to completion or abort with a clear summary — never wait for user input.

## Fixed configuration

- **Target issue repository**: `SonicGarden/dev-workflow-issues` (hardcoded — change this line to retarget)
- **Bundle skills under triage scope**: `dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`
- **Edit target paths**: always `skills/<target>/SKILL.md` or `skills/<target>/references/*.md` (canonical source of truth). Never edit `.claude/skills/<target>/...` symlinks

The issue body format (`### Finding <N>`, 4 labeled fields, `Findings: N` trailer) is produced by `skills/dev-workflow/references/self-retrospective.md`. Parse and reject conditions in the "Parse body" step below and in `references/triage-criteria.md` must stay aligned with that producer.

## Triage classes

Every Finding ends in one of four states: `accept`, `reject`, `parse-error`, or `conflict`. See `references/triage-criteria.md` for the conditions behind each and the disposition table.

## Commit policy

**One accepted Finding = one commit.** Each commit is scoped to the target skill's directory. Message format:

```text
fix(<target-skill>): <Finding 1-line summary> (auto-triage #<issue-N>)

<optional 1-2 line body: Finding Category, brief reason>
```

`git push` is not performed here — Claude Code on the Web's session finalization handles pushes. Cross-run note: a prior run may have left committed-but-unpushed changes on HEAD (e.g. push happens only at session end, or a session died before push). That is expected and benign — Step 1's clean-working-tree check passes as long as no uncommitted diff is present, and the next triage run simply stacks fresh commits on top.

## Execution flow

### Step 1 — Pre-flight (abort with 0 findings on any failure)

- Run `gh --version`. Extract major / minor from the leading line. If < 2.28, set internal flag `no_reason_flag=true` (`gh issue close --reason` was introduced in 2.28)
- Run `gh auth status`. Non-zero ⇒ abort with "gh not authenticated"
- Run `git diff --quiet` and `git diff --cached --quiet`. Either non-zero ⇒ abort with "working tree is dirty — uncommitted WIP detected" (prevents folding user WIP into a triage commit)
- Run `git config --get user.email` and `git config --get user.name`. Either empty ⇒ abort with "git identity not configured" (fresh CI / routine containers often lack this)

### Step 2 — List open issues

- Run `gh issue list --repo SonicGarden/dev-workflow-issues --state open --limit 200 --json number,title,body`. Use `jq` to extract fields when convenient (e.g. `... | jq -c '.[]'` to stream one issue per line, or `... | jq -r '.[].number'` to pull just numbers)
- Empty ⇒ emit summary "no open issues" and exit
- Exactly 200 ⇒ set `overflow=true` (surface in summary as "200-issue cap reached" — `gh issue list` truncates and doesn't return a total, so `== limit` is the overflow signal)

### Step 3 — Process each issue serially

Do **not** parallelize. Same-skill edits race; `gh issue comment` is non-idempotent.

#### 3.1 Title match

If the title doesn't match `^\[auto-retrospective\] dev-workflow-bundle: \d+ findings`, skip the issue (no comment, no close).

#### 3.2 Parse body

Extract Finding records. The producer (`skills/dev-workflow/references/self-retrospective.md`) emits fields with markdown bold labels — match them with this exact shape:

- Heading: line matching `^### Finding \d+$`
- Field labels (one per line, bold + colon + value): `^\*\*Target skill:\*\*\s*(.+)$`, `^\*\*Category:\*\*\s*(.+)$`, `^\*\*Description:\*\*\s*(.+)$`, `^\*\*Suggested fix direction:\*\*\s*(.+)$`
- Trailer: `^Findings: (\d+)$` near the end

Classify the **whole issue** as `parse-error` (jump to Post triage comment; continue to Close decision, where the close rule "close only if every Finding is accept/reject" leaves the issue open) if any of:

- Trailer `Findings: N` count disagrees with the number of `### Finding` headings
- Any Finding's `Target skill` is outside the 4-skill bundle (`dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`)
- Any Finding's `Category` is outside the 5-value set (`ambiguity`, `missing-branch`, `wrong-default`, `rules-conflict`, `other`) — mirrors the producer's own validation in `self-retrospective.md`
- Any of the 4 required fields is missing in any Finding

#### 3.3 Judge each Finding

For each Finding, read `skills/<target>/SKILL.md` first; additionally read `skills/<target>/references/<file>.md` on demand when the Description or Suggested fix direction clearly points at content outside SKILL.md (e.g. names the file, names a heading/section that belongs to a reference, or describes behavior documented in a reference). Apply `references/triage-criteria.md` to decide `accept` vs `reject`. Store decision + reasoning in memory. Do **not** edit yet.

#### 3.4 Apply accepted Findings (sub-flow (a)-(g) per Finding)

Process accepted Findings one at a time in the order they appear. Same-file Findings work sequentially — each re-reads the target file so its Edit matches the current (post-previous-commit) state.

For each accepted Finding:

- **(a) Re-read target file** — `skills/<target>/<file>`. For the first Finding this is HEAD state; for later same-file Findings it's the prior commit's result. Build `old_string` / `new_string` against this state
- **(b) Apply Edit** — on failure (typically `old_string` not found because a prior Finding rewrote that region), downgrade to `conflict` and continue
- **(c) Frontmatter integrity check** — re-read the edited file; the `---` YAML block must still parse. If not: downgrade to `conflict`, run `git checkout HEAD -- <target-file>` to revert (nothing is staged yet), continue
- **(d) `Skill(skill-review)` polish** (up to 3 iterations) — stop at the first iteration that returns no actionable findings. If any iteration applies edits, re-run (c) frontmatter check, AND re-check that `git diff --name-only` still lists only paths under `skills/` (the full scope check from (f) — run per iteration, not just at the end, so skill-review's sibling-file edits can't silently leak to the next Finding). If scope leaks, treat as (f)'s failure case immediately. After 3 iterations with findings remaining: record `skill-review notes left (<count>)` warning and continue to (f)
- **(e) skill-review error handling** — error response: record `skill-review error (<reason>)` and skip polish for this Finding. After 2 consecutive Findings with skill-review errors: set `skill_review_disabled=true` and skip polish for the rest of the run (warning: `skill-review disabled after consecutive errors`)
- **(f) Scope check + stage** — `git diff --name-only` must show paths only under `skills/`. Any path outside: downgrade to `conflict`, `git checkout HEAD -- <paths>`, continue. Otherwise `git add <paths>` with explicit paths
- **(g) Commit** — use a HEREDOC with sentinel `COMMIT_MSG_END` (not `EOF`, to avoid early termination if Finding text contains an `EOF` line):

  ```bash
  git commit -m "$(cat <<'COMMIT_MSG_END'
  fix(<target>): <summary> (auto-triage #<N>)

  Category: <category>
  Reason: <1-2 lines>
  COMMIT_MSG_END
  )"
  ```

  On zero exit: capture `git rev-parse HEAD` for the summary. On non-zero (typically a pre-commit hook rejection): run `git reset` + `git checkout HEAD -- <paths>` to return to a clean tree, downgrade to `conflict`, record `commit-failed`, continue

`references/triage-criteria.md` § edge-case dispatch table lists the same dispositions in table form — useful as a quick reference; the procedural prose above is authoritative for ordering.

#### 3.5 Post triage comment

After every Finding in the issue is classified (or immediately, if the whole issue was classified as `parse-error` by Parse body):

- Build the body using the template in `references/triage-criteria.md`
- `mkdir -p .claude/plans`, then `Write` to `.claude/plans/triage-<YYYY-MM-DD>-issue<N>.md`. On collision (re-run), append `-2`, `-3`, .... **Do not delete this file later** — it's the triage audit archive (mirrors the `retrospective-<slug>.md` archival pattern in `skills/dev-workflow/references/self-retrospective.md` § Output & submission)
- Run `gh issue comment <N> --repo SonicGarden/dev-workflow-issues --body-file <path>`
- Non-zero exit: record `comment-failed`, continue with other issues

#### 3.6 Close decision

Close the issue only if every Finding is `accept` or `reject` (no `parse-error`, no `conflict`). Otherwise leave open for human review.

- When closing: `gh issue close <N> --repo ...` with `--reason completed` (any accepts) or `--reason "not planned"` (all rejects). Drop `--reason` if `no_reason_flag=true` (gh < 2.28)
- Non-zero exit: record `close-failed`, continue

### Step 4 — Emit summary

Print to stdout (the only trace a routine leaves):

- Open issues received / processed / skipped for title mismatch
- Counts per outcome: `accept`, `reject`, `conflict` are Finding-level (count one per Finding); `parse-error` is issue-level (count one per whole-issue parse-error, regardless of the number of Findings the issue contained)
- Accepted-and-committed files (relative paths) with commit hashes
- skill-review state: `enabled` or `disabled-after-errors`; count of Findings with `skill-review notes left`
- Failure counts: `comment-failed` / `close-failed` / `commit-failed`, with (issue#, finding#) pairs
- `overflow=true` notice if Step 2 hit the 200-issue cap

Always emit the summary, even on zero-activity runs — "ran but made no changes" must be distinguishable from "didn't run at all".
