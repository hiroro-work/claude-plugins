---
name: publicity-review
description: Review uncommitted diff for content unsuitable for publication to a public repository — secrets/credentials, user-specific absolute paths, internal-only URLs/hostnames, and personal identifiers. Each iteration dispatches a fresh subagent that returns findings; the main thread applies the subagent's mechanical fixes and re-dispatches until the subagent declares no remaining findings or max iterations is reached. Non-interactive — no user prompts. Use as a final gate before publishing changes; designed to be called from non-interactive routines such as dev-workflow's hooks.on_complete or dev-workflow-triage's per-Finding sub-flow.
allowed-tools: Read, Edit, Agent, TaskCreate, TaskUpdate, TodoWrite, Bash(git diff *), Bash(git rev-parse *), Bash(git checkout HEAD -- *)
---

# Publicity Review

The convergence signal is the executor itself returning `findings: []` AND `suggested_edits: []` on a pass verdict — that is, the subagent declares nothing more is left to flag. This skill loops until that signal, max iterations is reached, a divergence is detected, or a safety rail trips.

The detection scope is narrow on purpose: secrets, user-specific absolute paths (e.g. `/Users/<name>/...`), internal-only URLs / hostnames, personal identifiers, and obvious proprietary internal info. It is **not** a generic linter — license, brand, or stylistic content is out of scope.

Designed to be called from non-interactive routines such as `dev-workflow-triage` or `dev-workflow`'s `hooks.on_complete`. It never prompts the user; it either returns a structured summary or terminates early with a machine-readable reason code.

## Invocation contract

The caller passes these fields in natural language (the skill extracts them from the invocation text):

- `Base ref` *(optional, default `HEAD`)* — git ref to diff against
- `Max iterations` *(optional, default `2`)* — upper bound on the refinement loop
- `Model` *(optional, default `sonnet`)* — model for the reviewer `Agent` dispatch, or `inherit` to use the session model. Accepted values are whichever model ids the current `Agent` tool's `model` parameter allows — see `rules-review` SKILL.md's `Model:` paragraph (`§ Usage`) for the live-schema validity check this shares. An **independent optional field** — adding it does not turn the contract into a fixed-arity mode gate (the other fields keep their own defaults). **Default `sonnet`**: publicity-review's detection task is mechanical pattern-matching (secrets / paths / URLs), so it runs on `sonnet` by default — a deliberate skill-side cost choice that applies to **every** caller (e.g. `dev-workflow-triage`, `dev-workflow`'s `hooks.on_complete`). A caller-supplied `Model:` value **wins over** this default (arg-wins). The model applies **only on the Claude Code `Agent`-dispatch path**; on the inline fallback path no `Agent` is spawned, so it is moot (the executing agent's own model governs).

The caller must **not** stage changes while this skill is running. The skill reads the working tree vs `Base ref`; staged content would mix into the diff and corrupt the verdict.

## Workflow

### Step 1 — Extract context (main thread)

1. Parse the fields from the invocation text (`Base ref`, `Max iterations`, and the optional `Model:`). Resolve the reviewer model: caller-supplied `Model:` if present and valid, else the skill-side default `sonnet` (per § Invocation contract). Hold it for Step 2 (a).
2. Run `git diff <Base ref>`. This captures working-tree-vs-base; no staging is assumed.
3. If the diff is empty, return early:
   ```json
   {"status": "skipped", "iterations_used": 0, "applied_edits_count": 0, "findings_count": 0, "remaining_findings": [], "warnings_findings": [], "reverted_paths": [], "reason": "empty diff"}
   ```
4. Compute `affected_files` — the set of file paths in the diff. Hold this set in main-thread context as the scope-check baseline for Step 2 (c).

There is no explicit pre-flight diff-size cap — sibling review skills (`ask-peer`, `verify-diff`, `skill-review`, `rules-review`) all dispatch without one, and `publicity-review`'s detection task (local pattern matching for secret / path / URL signatures) is less context-sensitive than cross-file semantic review. If the dispatch is too large for the subagent runtime, the `Agent` tool returns an error / timeout / empty response, which falls through to `## Dispatch failure` (`status=skipped, reason="dispatch error"`). That path captures the only real-world failure mode an absolute byte cap was protecting against.

### Step 2 — Iteration loop (i = 1 .. Max iterations)

**Pre-register iteration tasks** — before entering the loop, `TaskCreate` one task per iteration named `iteration 1`, ..., `iteration <Max iterations>`. Mark `in_progress` (via `TaskUpdate`) before each dispatch, `completed` after parse + apply (a `converged` verdict marks `completed` immediately after parsing). On early convergence or safety-rail exit, mark remaining tasks `completed` with note appended to the task's `description` field (the `content` field under the `TodoWrite` fallback) as `— skipped: <reason>`. Where the Task tools are unavailable (e.g. the VSCode extension, or Claude Code before v2.1.142), use the equivalent `TodoWrite` operations instead — the status values and pre-register semantics are identical; `allowed-tools` grants both.

#### (a) Dispatch reviewer Agent

On iter 1, `Read` the full current contents of each `affected_files` entry. On `i ≥ 2`, only re-`Read` the subset of `affected_files` whose path appeared in a successfully-applied `suggested_edits` entry during iter `i-1` (untouched files keep their iter-1 snapshot — re-reading them is wasted work and balloons main-thread context). On `i ≥ 2`, also re-run `git diff <Base ref>` so the diff reflects edits that landed in prior iterations.

Invoke the `Agent` tool to dispatch a fresh reviewer, passing the resolved model (Step 1) as the `Agent` `model` parameter — the caller-supplied `Model:` if present, else the skill-side default `sonnet`; pass no `model` only when the resolved value is `inherit`. Assemble the dispatch prompt from the four sections below, each framed with a clear `--- LABEL ---` fence (same convention as `verify-diff` § Step 3 (a) Dispatch bias-free executor and `skill-review` § Step 3 (a) Dispatch reviewer Agent) so the reviewer can parse each payload unambiguously:

- `--- DIFF ---`: the unified diff (current `git diff <Base ref>` output)
- `--- AFFECTED FILES ---`: each `affected_files` entry's path + full current contents (one block per file, separated by `### <path>` sub-headings)
- `--- REVIEWER PROMPT ---`: the reviewer prompt and detection rules below (verbatim)
- `--- RESPONSE FORMAT ---`: the response format and JSON schema below (verbatim)

**Reviewer prompt (include verbatim in the dispatch):**

> You are a fresh reviewer of an uncommitted git diff for a **public open-source repository**. Your only job is to flag content in the diff's `+` lines (newly added content) that should not be published publicly.
>
> Detection categories (`category` enum):
>
> - `secret`: API keys, OAuth tokens, bearer tokens, passwords, private keys (`-----BEGIN .*PRIVATE KEY-----` blocks), `.env` literal values, AWS / GCP / Azure credentials, JWT secrets. Recognizable prefixes include `sk-`, `ghp_`, `gho_`, `AKIA`, `xox[bp]-`, `eyJ` (JWT-like). Any value matching one of these formats is treated as a credential for severity purposes — `severity: high` is load-bearing for the Step 3 secret-bypass rule and applies regardless of whether the value looks like a placeholder, dummy, or canonical docs example. Use `confidence` to express how likely the value is to be functionally exploitable: `high` for real-looking values (random-looking entropy); `medium` for plausible fixtures (looks real but variable name suggests test); `low` for obvious placeholders (sequential digits like `12345-67890`, alphabet runs like `abcdef`, or known canonical docs placeholders — AWS / GCP / Azure documentation values whose tail spells out `EXAMPLE` or `PLACEHOLDER`).
> - `user-specific-path`: absolute paths into a user's home directory like `/Users/<name>/...`, `/home/<name>/...`, or hardcoded references to a single contributor's local checkout. Default `severity: medium` (leaks contributor identity / breaks portability, but not exploitable as a credential). Exception — see exclusions below.
> - `internal-url`: hostnames or URLs that are clearly internal, such as `*.internal`, `*.corp`, `*.local`, internal Slack workspace URLs (`<workspace>.slack.com` references that name a private workspace), private Notion / Confluence pages.
> - `personal-identifier`: real names, personal email addresses, phone numbers, physical addresses of individuals — beyond what would normally appear in a git commit author signature (which is by definition already public).
> - `proprietary-info`: code or text labeled "internal only", "confidential", "do not distribute"; references to internal architecture documents that are not public.
> - `other`: catch-all for content that clearly should not be public but does not fit the categories above.
>
> Exclusions (do **not** flag these):
>
> - `~/.claude/...` — Claude Code's standard config root, not a user-specific path. Applies to mentions in prose, comments, and code alike (e.g. README sentences like ``Edit `~/.claude/settings.json` ``).
> - Files referenced via `.gitignore` — those files are already excluded from the repo.
> - Lines that appear in the diff context (lines without a leading `+`) — only judge `+` lines (newly added content).
> - `<word>/<word>` patterns (e.g. `anthropics/claude-code`) and full URLs to public hosts (`github.com`, `npmjs.com`, `pypi.org`, `crates.io`, etc.) referencing a public repo / package: do not flag if the reference points to a verifiable public resource. If you cannot verify and have residual doubt, emit a single low-stakes finding at `severity: low, confidence: low`. Applies to README / markdown prose, code comments, and config alike. (Public-host URLs are explicitly **not** `internal-url` — that category targets `*.internal` / `*.corp` / `*.local` / private SaaS workspaces only.)
>
> For each finding, also assign:
>
> - `severity` ∈ `high|medium|low`: how dangerous is this if published?
> - `confidence` ∈ `high|medium|low`: how certain are you that this is actually a leak (vs. a false positive)?
> - `snippet`: a short excerpt from the offending line — keep enough surrounding tokens to identify the variable / call site (e.g. `openai.api_key = "<REDACTED>"` rather than a bare `"<REDACTED>"`), but no more than the offending line itself. **For `category: secret` findings, replace the actual credential value with the literal string `<REDACTED>`** so the verdict block does not itself leak the secret.
> - `rationale`: a short reason in 1–2 phrases.
>
> When a finding is **mechanically fixable** (the replacement is unambiguous and does not require project context to decide), additionally emit a `suggested_edits` entry. Restrict `suggested_edits` emission to:
>
> - `category: secret`: replace the credential value with a syntactically inert placeholder. The default everywhere is the **quoted-string form** `"<REDACTED — replace with env var>"` (or single-quoted equivalent in the file's idiom). Only use a comment-form placeholder (`# <REDACTED>` for Python / shell, `// <REDACTED>` for JS / TS, `<!-- <REDACTED> -->` for HTML / markdown) when the offending line is itself a comment or standalone declaration that can be safely commented out — never to replace the value half of an assignment, which would leave the variable unset and change runtime behavior. Do **not** rewrite to a form that requires a new import or symbol the file doesn't already have (e.g. `os.environ[...]` requires `import os`, which a single Edit can't add cleanly — fall back to the quoted-string form).
> - `category: user-specific-path`: replace `/Users/<name>/...` (or `/home/<name>/...`) with `~/<rest-of-path>` — substitute only the user-home prefix. Do **not** rewrite to a project-relative path; that requires project context the reviewer doesn't have. If `<rest-of-path>` itself looks user-specific (e.g. `Sources/private-checkout/...`), record the finding without a `suggested_edits` entry.
>
> Do **not** emit `suggested_edits` for `internal-url`, `personal-identifier`, `proprietary-info`, or `other` — those need project context to fix correctly. Record them in `findings[]` only.
>
> `old_string` for each `suggested_edit` must match exactly one location in the current file. Include **1–3 lines of surrounding context** so the snippet is unique — short one-liners collide and cause the Edit to fail. Default to one line of context above and one below the offending line; expand only if uniqueness still fails. Emit one `suggested_edits` entry per offending line — do not merge multiple offending lines into a single Edit, since a later iter's apply phase may need to skip individual entries when an `old_string` no longer matches.
>
> **Gate reachability rule (required)**: when there are no findings, you **must** return `findings: []` AND `suggested_edits: []`. Do not emit speculative or "nice to have" edits when nothing was flagged.
>
> **`line` field**: always emit `null`. It is reserved and the orchestrator does not consume it; the `file` field carries the per-finding location.

**Response format (include verbatim in the dispatch):**

> Write your reasoning and per-finding rationale in natural language, then end your response with a single fenced JSON block matching this schema. The `line` field is reserved — always emit `null`; the orchestrator does not consume it. The `file` field carries the per-finding location.
>
> ````
> ```json
> {
>   "findings": [
>     {
>       "category": "secret|user-specific-path|internal-url|personal-identifier|proprietary-info|other",
>       "severity": "high|medium|low",
>       "confidence": "high|medium|low",
>       "file": "<path>",
>       "line": null,
>       "snippet": "<short excerpt, REDACTED for secret category>",
>       "rationale": "<short reason>"
>     }
>   ],
>   "suggested_edits": [
>     {"file": "<path>", "old_string": "<unique 1-3 line snippet>", "new_string": "<replacement>", "rationale": "<short>"}
>   ]
> }
> ```
> ````

#### (b) Parse & apply — evaluate in this order, first match wins

Same evaluate-in-order discipline as `verify-diff` § (b) Parse & apply.

1. **Verdict missing or malformed** — no fenced JSON block found, or JSON parse fails → return `status=skipped`, `reason="verdict parse failure"`.
2. **Schema violation** — required keys (`findings`, `suggested_edits`) missing, values not arrays, or any entry fails its expected per-entry shape (`findings` entries must have `category` ∈ enum, `severity` ∈ `high|medium|low`, `confidence` ∈ `high|medium|low`, non-empty `file` / `snippet` / `rationale`; `suggested_edits` entries must have non-empty `file` / `old_string` / `new_string`) → return `status=skipped`, `reason="verdict schema violation"`. Validating per-entry shape here prevents a malformed entry from crashing a downstream `Edit` call.
3. **Converged** — `findings == []` AND `suggested_edits == []` → exit loop with `status=converged` and proceed directly to Step 4. If `suggested_edits` is non-empty while `findings == []`, the gate-reachability rule was violated by the subagent — discard the edits (do not apply them) and treat this iteration as `converged`. Safety rails (c) do not run (no edit applied).
4. **Divergence** — only when `i >= 2`: if `findings` from this iter is the same multiset as the previous iter (sort each by `(category, file, snippet)` textually before comparison), the loop is not making progress → return `status=skipped`, `reason="divergent findings"`.
5. **Otherwise** — apply `suggested_edits` in order. The severity / confidence gate in Step 3 (`unresolved` judgment) applies to **iter-end residual findings**, not to apply-phase decisions, so every entry is applied unconditionally:
   - Re-Read the target file before each Edit so `old_string` matches current contents.
   - If an `old_string` is not found, skip that entry and continue with the next. This is expected when the subagent emits multiple edits from a single snapshot and a later edit overlaps a region an earlier one already rewrote — the skip is a no-op fallback, not an error.
   - Increment `applied_edits_count` only for entries whose `Edit` call succeeded.
   - After the edits, if at least one Edit succeeded, run the safety rails in (c), then continue to iteration `i + 1`.

#### (c) Per-iteration safety rails — run only if at least one edit was applied

- **Frontmatter integrity** — for each edited file, re-Read; if the file begins with a `---`-delimited YAML frontmatter block, parse it. If parsing fails:
  ```
  git checkout HEAD -- <file>
  ```
  Return `status=conflict`, `reason="frontmatter broken"`, `reverted_paths=[<file>]`. Files without a frontmatter block (plain source / plain markdown without frontmatter) skip this rail.
- **Scope** — Run `git diff --name-only`. If any returned path is **not** in `affected_files`:
  ```
  git checkout HEAD -- <each offending path>
  ```
  Return `status=conflict`, `reason="scope violation"`, `reverted_paths=[<each offending path>]`.

### Step 3 — Max iterations reached without convergence

Compute `remaining_findings` and `warnings_findings` from the **last verdict's `findings[]`** using this judgment rule:

A finding triggers `unresolved` (i.e., goes into `remaining_findings`) if either:

- **(secret bypass rule)** `category == "secret"` AND `severity` ∈ `medium|high`, regardless of `confidence` — the secret category is the highest-stakes one and a low-confidence true positive must not be silently dropped.
- **(general rule)** `severity` ∈ `medium|high` AND `confidence` ∈ `medium|high`.

Findings that match neither condition (e.g., `severity: low` only, or non-secret with `confidence: low`) go into `warnings_findings`. They are surfaced in the verdict but do not trigger a fail-closed disposition in callers.

If `remaining_findings` is empty (everything left was warnings-only), set `status=converged` (the leaks worth blocking on are gone). Otherwise set `status=unresolved`.

`applied_edits_count` reflects edits that actually landed (not skipped) cumulatively across all iterations.

### Step 4 — Emit structured summary

End your response with a single fenced JSON block matching this schema:

```json
{
  "status": "converged|unresolved|skipped|conflict",
  "iterations_used": 0,
  "applied_edits_count": 0,
  "findings_count": 0,
  "remaining_findings": [
    {"category": "<enum>", "severity": "<enum>", "confidence": "<enum>", "file": "<path>", "line": null, "snippet": "<short>", "rationale": "<short>"}
  ],
  "warnings_findings": [
    {"category": "<enum>", "severity": "<enum>", "confidence": "<enum>", "file": "<path>", "line": null, "snippet": "<short>", "rationale": "<short>"}
  ],
  "reverted_paths": [],
  "reason": null
}
```

Field semantics:

- Arrays (`remaining_findings`, `warnings_findings`, `reverted_paths`) and `reason` are populated only when the corresponding step produced a value; otherwise empty `[]` / JSON `null`. `findings_count = len(remaining_findings) + len(warnings_findings)` for `converged` / `unresolved`, `0` for `skipped` / `conflict`. `reverted_paths` is non-empty only for `conflict` (the safety rails are the only writer). `warnings_findings` is the bucket for findings that fall through Step 3's `unresolved` judgment rule.
- `iterations_used`: number of iterations whose subagent dispatch returned a verdict, including the iteration whose verdict triggered `converged`. Step 1 early return (empty diff) counts as `0`.

`reason` enum: `empty diff` | `verdict parse failure` | `verdict schema violation` | `divergent findings` | `frontmatter broken` | `scope violation` | `dispatch error` | `null`.

The `null` token at the end of the enum means JSON `null` (not the string `"null"`).

## Dispatch failure

If the `Agent` tool call itself errors, times out, or returns an empty response, return `status=skipped`, `reason="dispatch error"`. Do not re-read the diff yourself as a fallback — self-review reintroduces the bias this skill exists to avoid.

## Sub-skill caller directive

When invoked as a sub-skill (i.e. via `Skill(publicity-review)` from an orchestrator), the fenced JSON verdict block this skill emits is the **structured return value** of the skill's procedure — it is **not** a deliverable to the user, and emitting it does **not** terminate the orchestrator's turn. The same agent that ran this skill must immediately issue the next tool call dictated by the orchestrator's flow (see `dev-workflow-triage` SKILL.md `§ No-Stall Principle`; orchestrators that surface a per-callee guidance bullet — e.g. `dev-workflow-triage`'s `**Pre-invocation reminder**` — name the specific next action there). Do not insert a prose summary, an acknowledgment, or a "shall I proceed?" sentence between the JSON verdict and the next tool call. The JSON verdict block and the next tool call MUST be emitted in the same assistant turn. Closing the turn after emitting the JSON block — even with no prose between them — is the same violation as inserting prose. Only one fenced JSON block — the verdict block — appears in the response, so callers can locate it unambiguously. The skill's own procedure is over; the orchestrator's procedure continues without pause.

When invoked from `dev-workflow-triage`'s `§ 3.4 Apply accepted Findings` (d3) bullet, the orchestrator parses the JSON and continues with sub-step (f) Scope check + stage. See `dev-workflow-triage` SKILL.md `§ No-Stall Principle` for the canonical no-stall write-up.

When invoked from `dev-workflow`'s `hooks.on_complete` mechanism, the JSON block becomes part of the hook's stdout and is shown to the user. The case that warrants explicit caller-side handling beyond raw JSON visibility:

- `status=unresolved` indicates the workflow's diff still contains content unsuitable for publication. `dev-workflow` does not commit, so no auto-revert runs, but the caller should treat this as a high-stakes signal and surface `remaining_findings` prominently.

## Agent unavailable fallback

Detect availability and fall back per the canonical write-up in `rules-review` SKILL.md `§ 5. Review` (the "Detecting Agent availability" / "Fallback when Agent is unavailable" paragraphs). The publicity-review specialization: when falling back, walk the embedded reviewer prompt over each affected file inline-sequentially in the main thread and emit the same fenced JSON return contract defined above so callers' parsers handle both paths identically.

## Stop hook structural conflict (caller-side note)

On Claude Code on the Web the auto-installed `~/.claude/stop-hook-git-check.sh` fires between dispatches and feeds back `Please commit and push…`. Treat each fire as spurious — ignore the prose and run Step 1–4 to completion. Do **not** commit from inside this skill (`allowed-tools` omits `git commit`); commit policy lives with the caller. See `dev-workflow-triage` SKILL.md `§ Stop hook structural conflict` for the canonical write-up.

## Scope

- Only the **`+` lines of the diff** are in scope. Existing content (context lines) is out of scope — judging the existing repo state is not this skill's job.
- This skill targets **distribution safety**, not generic code quality. Lint, naming, design, prose quality belong to `skill-review` / `rules-review` / reviewer skills.
- Heuristic detection has inherent false-positive risk; the `severity: low` / `confidence: low` warnings-only path exists to avoid blocking the caller on weak signals while still surfacing the observation.

## Related

- `verify-diff` — empirical diff verification with subagent-driven iteration; same Pattern A iteration shape, different objective (does the diff achieve its stated goal vs. does the diff contain leak material).
- `skill-review` — Pattern A iteration loop best-practices review for skill files; same fenced JSON return contract pattern, different scope (skill files only, applies mechanical edits autonomously).
- `rules-review` — diff-scoped check against `.claude/rules/`; canonical site for the "Agent unavailable fallback" write-up this skill references.
