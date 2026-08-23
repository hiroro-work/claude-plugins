# Crit Commit-Review Gate (Step 10)

Deep reference for Step 10's **crit diff-review path** (`commit_review_gate: "crit"`, opt-in). Read and follow it top to bottom.

## crit CLI contract

crit (<https://github.com/tomasz-tomczyk/crit>) is a **separately-installed** local binary. This gate only invokes it — it never installs, configures, or depends on crit's own Claude Code plugin / `/crit` slash command / `agent_cmd` / live-thread features. The invoking process blocks until the user finishes the review in the browser (or the gate is interrupted).

This gate uses crit's **commit range review mode** (`crit --range <base>..<head>`) — **never** the file/dir mode (`crit <file-1> <file-2> ...`). File arguments never enter crit's git-diff-aware code path — that mode reviews the named files' current on-disk content, so the browser shows the final code and no diff at all. Commit range mode is git-diff-aware and renders the diff between the two given revisions.

- **Availability**: `crit --version` exits `0` when installed. `command -v crit` is avoided as an availability probe — it is not covered by this skill's `Bash(crit *)` allowed-tools grant and would trip a permission dialog.
- **Scoping mechanism — detached review object, no ref ever moves**: crit's commit-range mode diffs exactly the two revisions named in `--range`; it does not accept a file-list argument to additionally narrow which paths within that range are shown, and it ignores the working tree entirely (dirty or clean) outside the named range. To scope the review to **only** the commit currently under review — while other not-yet-landed commits' files sit uncommitted in the working tree — this gate ranges against the **candidate** the per-commit loop has already built for that commit (`references/interactive-commits.md` § Per-commit loop sub-step **a. Build the candidate, then present it**): a dangling commit produced by the same stage → `write-tree` → `commit-tree` technique [`diff-presentation.md`](diff-presentation.md) § Detached review object owns. **This gate synthesizes no object of its own** — that is why it stages nothing and has no unstage step (see step 4's "Read the decision" step), and why it does not appear as a caller in that file's § Caller endpoints. This gate's endpoints are `<base>` = `<pre_round_head>` and `<head>` = `<round_commit>`.
- **Invocation**: `crit --range <pre_round_head>..<round_commit>` — no positional file arguments. `<pre_round_head>` is the candidate's parent, captured upstream as `<candidate_parent>` (see step 3's per-round launch below); `<round_commit>` is the candidate's SHA, also built upstream. **Do not pass `--no-open` or `--quiet`** — these flags correlate with unreliable daemon startup; the plain form does not. § Story prologue's ingest call is the one carve-out — it saves the story and exits instead of launching a review.
- **Scope — verified to ignore the dirty working tree**: other uncommitted changes sitting in the working tree — tracked or untracked, belonging to other not-yet-reviewed commits in the same Step 10 run — do not appear. Untracked new files belonging to *this* commit are picked up natively once they are inside the candidate's tree; no `git add -N` intent-to-add preprocessing is needed.
- **Decision output — read both stdout and stderr**: **both** approve and revise-with-comments complete with **exit code `0`**, so the exit code does not distinguish the decision — it is read from a literal `approved: true` / `approved: false` line, followed (on `false`) by the unresolved-comment count and a JSON array of comment objects. **Capture and scan both streams** for the `approved:` line rather than assuming either one exclusively; do not gate the parse on a single stream.
- **Comment JSON shape**: `{"scope": "line"|"review", "path": "<file>", "id": "<id>", "start_line": <n>, "end_line": <n>, "body": "<comment text>", "anchor": "<nearby heading/text>", "author": "<name>", "created_at": "<iso8601>", "updated_at": "<iso8601>", "review_round": <n>}`. A review-level comment (not tied to a specific line) omits `path` and `anchor` and carries `scope: "review"`. **`quote` (the reviewer's selected text) may appear per crit's own documentation** — treat it as optional, use-if-present, never required.
- **Commit message rendering — subject only**: the daemon hands the browser each commit's **subject line** and drops the body — the gap § Story prologue fills.
- **Story mode**: `crit story` attaches an editorial layer to a range's review, and the browser renders the diff around it. Only the hand-authored form § Story prologue uses is in scope: the bare `crit story` builds that layer through crit's own `agent_cmd`, which this section's opening paragraph rules out.
- **Non-zero exit** (interrupted, closed without finishing, or a launch failure) means the review did not complete normally.

## Story prologue

A commit's body never reaches the browser (§ crit CLI contract's "Commit message rendering — subject only" bullet), so each round hands crit a **story** to carry what the change does and why.

Two foreground commands, both returning immediately:

1. **List the hunks**: `crit story --range <base>..<head> --prep /dev/stdout`. Only the `--- (<file_path>, <old_start>) [<status>]` lines matter — each is one hunk's id, with `<old_start>` reading `0` for a new file.
2. **Ingest the story**: hand the JSON below to `crit story` on stdin through a quoted heredoc, which keeps the call a single `crit` invocation — no second binary joins the pipeline, and nothing in the JSON is expanded by the shell:

   ```bash
   crit story --range <base>..<head> --story-file - --refresh --no-open <<'STORY'
   <the JSON below>
   STORY
   ```

   The closing `STORY` must start at column 0 — the indentation this numbered list gives the block above is presentational, and a heredoc whose terminator is indented never closes. `--refresh` keeps the call idempotent. `--no-open` is the one carve-out from § crit CLI contract's "Invocation" bullet. Scan **both** stdout and stderr for the `{"ok":...}` result line rather than assuming either carries it.

The JSON is crit's own schema:

```json
{
  "prologue": {
    "title": "<= 48 chars",
    "overview": "1-3 sentences that stand alone",
    "key_changes": ["one concise bullet per change"],
    "risks": ["one concise bullet per risk"],
    "diagram": ""
  },
  "chapters": [
    {
      "id": "ch1",
      "title": "<= 48 chars",
      "summary": "one line that stands alone",
      "hunk_refs": [{"file_path": "<path>", "old_start": 0}],
      "diagram": ""
    }
  ],
  "support": [
    {"hunk_refs": [{"file_path": "<path>", "old_start": 0}], "reason": "Lockfile churn."}
  ]
}
```

Filling it in:

- **Where the prose comes from**: whatever already states this diff's point before the launch — for this gate, the subject and body fixed for the commit at `references/interactive-commits.md` § Per-commit loop sub-step **a. Build the candidate, then present it** (`title` from the subject, trimmed to the schema's 48-character limit when the subject runs longer, `overview` and `key_changes` from the body, `risks` from what the body flags as worth watching). A caller with no commit substitutes its own source. Where the caller also states that point in chat, `overview` reuses that wording rather than re-phrasing it. The story otherwise says nothing its source did not — with the one exception crit forces: `key_changes` and `risks` are required and rejected when empty, so whatever the source leaves unstated is read off the diff the round is about to show.
- **Chapters group hunks by theme rather than by file**, and one commit rarely needs more than one or two. `support[]` takes the mechanical hunks that deserve no editorial attention — lockfiles, generated output, version bumps.
- **Coverage**: every hunk goes in a chapter or in `support[]` — crit counts the two alike and rejects only a story that places fewer than half of the range's hunks *anywhere*. An all-`support[]` story is accepted, so a release-bookkeeping commit that is nothing but version bumps needs no chapter invented for it.
- **`diagram`** stays `""` unless a Mermaid diagram genuinely clarifies a structure the prose cannot.
- **Language**: the prologue, the chapters, and each `support[]` entry's `reason` follow the resolved `language` ([`localization.md`](localization.md) § Localization granularity). Paths, identifiers, and the JSON keys stay verbatim.

**A story failure is non-fatal.** When either command exits non-zero, or the ingest answers `{"ok":false, ...}` because its coverage check rejected the story, drop the story and go straight to the launch. Render a one-line note in the resolved `language` carrying `<reason>` — the last non-empty stderr line truncated to ≤ 80 characters, the `{"ok":false, ...}` line itself when a rejection left stderr empty, or `(no stderr)`. Ahead of both rules below: an `{"ok":false, ...}` answer carrying `"auto_repaired":true` is not a failure — keep the story and render no note. Otherwise an `{"ok":false, ...}` answer is a rejection whatever exit code came with it, and a rejected story is not retried; a non-zero exit carrying no such answer is retried once after a 1–2 second sleep and then dropped. Never route the round to the chat surface. An older crit without the `story` subcommand surfaces the same way and needs no separate branch.

**Re-ingested every round, not re-written.** The ingest runs again each round, but the prose comes from a settled source, so reuse the first round's wording for as long as that source is unchanged (an `adjust` round that re-fixes the subject or body re-derives it) and re-derive only `hunk_refs`.

## Procedure

1. **Check availability and reachability — once per run, cached.** The first time Step 10 needs this gate (the first commit whose Diff element is reached with `commit_review_gate: "crit"` and no caller skip), run **both, unconditionally (no short-circuit — run (b) even if (a) already failed)**: (a) `crit --version` (non-zero exit / command-not-found → unavailable) and (b) `printenv CLAUDE_CODE_REMOTE` (value `true` → local browser unreachable). Cache the combined result (`crit_commit_review_available`) for the rest of the run — do not re-check per commit. Read [`diff-presentation.md`](diff-presentation.md) here too: § Rendering ladder governs this gate's own chat fallback. This check is **independent** of the `CLAUDE_CODE_REMOTE` probe Step 4 runs for its own plan-approval gate: this gate re-probes rather than threading cached state across them. **Callers probe ahead of the read**, so reaching this step at all means either the caller already resolved the pair — reuse its cached result — or it ran no probe, in which case run them here as a self-contained guard.

2. **If either check failed**: treat the entire Step 10 run as `commit_review_gate: "diff"` from this point on — every commit's Diff element renders via the existing chat-text presentation in `references/interactive-commits.md` § Per-commit loop sub-step **a. Build the candidate, then present it** (verbatim / condensed / skeleton). Emit **one** informational note for the whole run (not per commit), in the resolved `language` (see [`localization.md`](localization.md) § Localization granularity), before continuing this commit's chat rendering under that fallback: when unavailable, name the install URL (<https://github.com/tomasz-tomczyk/crit>); when remote (and not unavailable), name that no local browser is reachable; when both checks failed, name only the install URL. Do not re-attempt crit later in the same run.

3. **If both checks passed — per-round launch**: for the commit currently at sub-step **a. Build the candidate, then present it**'s Diff element, take `<pre_round_head>` = the `<candidate_parent>` that `references/interactive-commits.md` § Per-commit loop sub-step **a. Build the candidate, then present it** captured for this commit — do **not** resolve `HEAD` again here; that sub-step owns the capture. It is stable for every round of the *same* commit and is re-captured upstream when the loop advances to the next commit. For each round:
   1. Take `<round_commit>` = the `<candidate>` that `references/interactive-commits.md` § Per-commit loop sub-step **a. Build the candidate, then present it** has already built — no object build here (see the **Scoping mechanism** bullet above). Its parent is `<pre_round_head>` and its tree is exactly what this commit will land, and it carries the subject/body fixed for the commit at that same sub-step.
   2. Author and ingest this round's story per § Story prologue, over the same `<pre_round_head>..<round_commit>` endpoints.
   3. Launch `crit --range <pre_round_head>..<round_commit>` as **background Bash** (`run_in_background: true`) — not the `Agent` tool. Emit a Progress Visibility status line in the same turn.

4. **Read the decision.** When the background process exits, read both captured stdout and stderr together and locate the `approved:` line in whichever stream carries it (see the stdout/stderr note above) — a non-zero exit or no parseable line is itself one of the outcomes step 5's decision mapping enumerates below, not an error at this step. **When the line is present, decide on it.** When it is absent, before concluding "no parseable line", re-read the capture until the host's termination marker appears (Claude Code appends `[exited with code N]` as the capture's last line), for up to 5 further reads. Each read is a fresh tool call and that round-trip is the only spacing — do not insert a `sleep`, which this skill does not grant. **Both a marker with no `approved:` line and 5 reads without a marker are the "no parseable line" outcome**, reported in one line. `Source of truth for this guard: this step; mirrored at visual-plan-review.md § Procedure step 5. Keep in sync.` No unstage belongs here either (see the **Scoping mechanism** bullet above).

5. **Decision mapping** (first match wins):
   - **Non-zero exit, or no parseable `approved:` line obtained** → this commit only falls back to the existing chat-text Diff presentation and the standard § Approval token closed list accept/adjust/cancel gate (`references/interactive-commits.md` § Per-commit loop sub-step **b. Per-commit accept gate**). `crit_commit_review_available` is **not** cleared — crit is used again for the next commit.
   - **`approved: true`** → maps directly to this gate's `accept` — proceed straight to `c. Land the candidate` for this commit. Any accompanying comments are advisory only (the user chose approve regardless).
   - **`approved: false`, comments empty** → start a new round at step 3's per-round launch. Nothing changed, so the same `<round_commit>` is relaunched over the same range.
   - **`approved: false`, comments present** → process every comment in the round in this fixed order: apply all `scope: "line"` edits, then re-run their required verification (below), then process `scope: "review"` dispositions last — they must run only after that re-verification completes, since some redirect control flow:
     - **`scope: "line"`** (a specific code-level fix request): apply the requested code edit. A round may contain more than one `scope: "line"` comment — apply all of them here; do not re-verify between individual comments.

       If this round applied at least one `scope: "line"` edit, re-verify it per § Round re-verification weight. **That re-verification must complete before processing any `scope: "review"` comment below** — a `scope: "review"` disposition that redirects control flow (`cancel`, or an `adjust` branch re-entering a different gate) must never bypass the pending re-verification for this round's line edits.
     - **`scope: "review"`** (not tied to a line — e.g. a request to change the subject, split the commit, cancel, or any other non-code-content request; processed after the `scope: "line"` re-verification above): classify the comment's `body` text per [`finish-phase.md`](finish-phase.md) § Approval token closed list's four buckets exactly as if the user had typed it in chat (that list's fourth bucket — non-committal/interrogative wording — collapses into `adjust` by its own definition, so this classifier only ever needs to branch on the three resulting outcomes below: `cancel` / `adjust` / `accept`). A **`cancel`** classification routes straight to `references/interactive-commits.md` § Mid-loop cancel — the `Mid-loop adjust — closed-list branches` classifier (branches a–g) covers only the `adjust` bucket, so a cancel-shaped comment must not be forced through it. An **`adjust`** classification enters that classifier as normal and applies the matched branch's disposition — a branch that touches *other* commits' files (merge / split / reorder) operates on the working tree exactly as `git status` reports it. An **`accept`** classification is advisory only: a comment reading as an affirmation does not itself trigger `c. Land the candidate`. **When a round contains more than one `scope: "review"` comment**, resolve by priority rather than arrival order — `cancel` > `adjust` > `accept`: a `cancel` classification anywhere in the round wins outright regardless of what else was submitted; absent a `cancel`, the first `adjust`-classified comment wins and any further `scope: "review"` comments in the round are not separately processed; if only `accept`-classified comments are present, all are advisory per above.
     After all comments are applied and any re-verification lands, decide whether to start a new round based on how this round's `scope: "review"` comment (if any) resolved: a **direct `cancel` classification** already stopped Step 10 outright via § Mid-loop cancel above — do not start a new round. An **`adjust` classification** hands off to its matched Mid-loop adjust branch's own next action instead (which may itself re-enter this commit's `references/interactive-commits.md` § Per-commit loop sub-step `a`, or resolve the commit via a merge/drop — `references/interactive-commits.md` § Mid-loop adjust branches **c**/**d** are an explicit normal completion, not a cancel) — do not also apply this sentence. Otherwise (no `scope: "review"` comment this round, or an `accept`-classified one, advisory only per above) the commit is still pending — start a new round. Because this gate builds no object, the rebuild is **upstream's**: re-enter `references/interactive-commits.md` § Per-commit loop sub-step `a`, whose **Stale boundary → pathspec derivation** covers a group the round's edits made stale. That sub-step's own Diff-review mode branch re-enters this gate at step 3's per-round launch with the rebuilt candidate as `<round_commit>` — so re-entering `a` is the whole instruction; do not also launch from here, or the round launches twice.
6. **No machine iteration cap.** Each round blocks on a real browser submit, so the loop is human-paced — no iteration ceiling is needed.

## Round re-verification weight

What a round owes once its `scope: "line"` edits have landed, keyed on what those edits changed. § Procedure step 5's `scope: "line"` bullet is the only entry, reached once every line edit in the round is applied.

**Classify the round's applied edits** as **metadata-only** or **actual-code**, per the distinction `references/interactive-commits.md` § Mid-loop adjust branch **g** defines — read it there. Only its vocabulary is borrowed: branch **g** covers the user's own out-of-band edits, a different scenario from an AI-applied fix driven by a specific parsed review comment. A **rename** of an identifier or a path is also actual-code *here* however mechanical it looks — what a rename breaks is cross-reference consistency, the rules-compliance walk is the only pass that goes looking for it, and unlike branch **g**'s metadata-only path this branch does not re-enter the gate for a human to look again. A round is actual-code when **any** of its edits is, and metadata-only only when every one of them is. **Tie-break: take the actual-code branch whenever the classification is not clear** — the metadata-only branch runs neither the test phase nor the rules walk, and nothing later in the run catches a misclassification there.

Name the branch this round took in one line in the resolved `language`, with the reason for it. Paired bilingual sample (runtime rendering demonstration):

- `language: ja`: `この round は体裁のみ（コメント文面の書き換え 2 件）— check_commands だけを再実行します`
- `language: en`: `this round is metadata-only (2 comment rewordings) — re-running check_commands only`

Then run the matching branch:

- **actual-code** → re-run **Step 7 (Check / Test) and Step 7.5 (Rules Compliance Review)** once for the whole round. That Step 7 re-run does **not** re-fire Step 7's concurrent rules-review / code-review launches. The Step 7.5 re-entry **continues into** that step's sub-steps (b)–(d) (`references/step7.5-rules-compliance.md`'s "Who continues into (b)–(d)" paragraph); under `run_mode == "fast"` that continuation takes the 1-pass cap, appending its ledger string with `<site>` = `Step 10 crit round`. Every exit in that re-run returns to this round's comment processing — sub-step 2's nothing-actionable judgment as much as (b)–(d)'s. No user gate for this re-verification; sub-step (d)'s persistent-violations gate is the one exception, and it returns control to this round. If Step 7 fails, follow Step 7's existing fail-stop discipline (retry, then report and stop).
- **metadata-only** → run **Step 7 (Check / Test)'s `check_commands` phase alone**, without its `test_commands` phase, once for the whole round, then return to this round's comment processing. Step 7.5 (Rules Compliance Review) is not re-entered, and no `fast_mode_skipped_steps` string is appended. On a `check_commands` failure, follow Step 7's fail-stop discipline.

## Fallback contract

This gate never silently stalls Step 10: unavailability or an unreachable browser routes the whole run to `diff` mode (step 2's "If either check failed" case above); and a single commit's crit interruption routes just that commit to the `diff` gate (step 5's non-zero-exit case) while crit stays in use for the rest of the run. A **candidate-build** failure is not this gate's to route: the candidate is built upstream, and `references/interactive-commits.md` § Per-commit loop sub-step `d` stops Step 10 on it. Both `diff`-mode destinations are the pre-existing chat-text Diff presentation, and there is no intermediate browser-based fallback tier: the chat presentation is the designed floor. One failure is a non-fatal exception to this "route away" pattern, neither falling back nor stopping: a story failure at step 3's per-round launch (see § Story prologue's "A story failure is non-fatal." paragraph).
