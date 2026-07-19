---
name: extract-skill-section
description: Extract a named SKILL.md section's body verbatim into a references/<name>.md file, replace the body with a skeleton (section label + delegation pointer, runtime definitions left in place), sync the bundle copy, and verify byte-identity plus cross-reference integrity via verify-skill-refs / verify-bundle-sync. One-command automation of the manual section-extraction procedure used to shrink oversized SKILL.md files. Non-interactive — no user prompts. Project-local routine — not for marketplace distribution.
allowed-tools: Read, Write, Edit, Grep, Bash(grep *), Bash(sed -n *), Bash(cat *), Bash(tail *), Bash(diff *), Bash(wc *), Bash(cp *), Bash(mktemp *), Bash(jq *), Skill(verify-skill-refs), Skill(verify-bundle-sync)
---

# Extract Skill Section

Extracts one contiguous section body out of an oversized SKILL.md into a `references/<name>.md` file, compresses the section in place to a skeleton (the original section label + a one-line delegation pointer), syncs the bundle copy when the target is a bundle member, and verifies the move mechanically. It automates the manual 5-point extraction procedure recorded in `.claude/rules/project.rules.local.md` (§ "Retain the original section label + keep runtime-referenced definitions inline when extracting a heavyweight block out of SKILL.md into a `references/*.md`"). It is a **project-local** skill (lives under `.claude/skills/extract-skill-section/`, not registered in `.claude-plugin/marketplace.json`).

Two invariants the skill enforces, and one it deliberately does not:

- **Verbatim move**: the extracted body lands in the reference file byte-identical (verified by `diff`, no normalization). Heading-level changes or other semantic edits are out of scope — apply them as ordinary edits after this skill returns.
- **No definition duplication**: inline retention is achieved by **not extracting** the runtime-referenced definitions in the first place (the `Inline-keep:` pre-flight check), never by re-inserting a copy — so a definition can never exist in both the skeleton and the reference file.
- **Boundary correctness is not guaranteed**: the byte-identity check proves the moved content is verbatim, not that the range selection was right. The Pre-flight boundary confirmation is the only guard — review it carefully.

**Bookkeeping is the caller's responsibility**: when the target is a bundle skill, the produced diff intentionally contains no paired version bump or CHANGELOG entry (the diff-level version-bump invariant in `.claude/rules/project.rules.md` is satisfied by the caller's release commit, not by this skill).

## Invocation contract

The caller passes labeled arguments in natural language. A field counts as **provided** iff it has a non-empty, non-whitespace value.

- `Target file:` *(required)* — the SKILL.md (or other Markdown file) to extract from.
- `Section:` *(required)* — the section's heading line, verbatim (e.g. `### Step 8: Code Review`).
- `Reference file:` *(required)* — the destination path, conventionally `<target-root>/references/<name>.md`.
- `Start after:` *(optional)* — a verbatim line inside the section; the extraction range starts on the line **after** it (start-side boundary override, used to leave leading runtime definitions in place).
- `End before:` *(optional)* — a verbatim line; the extraction range ends on the line **before** it (end-side boundary override).
- `Inline-keep:` *(optional)* — one or more phrases (one per line) naming runtime-referenced definitions that must stay inline in the target file (checked at Pre-flight step 3, `Inline-keep:` verification).
- `Bundle copy dir:` *(optional)* — explicit sync destination for the edited files; `none` skips bundle sync explicitly. When absent, the destination is auto-derived per Process step 7 (Bundle sync).

**Missing required arguments** (any of the three absent): do not run the procedure — reply with a one-line usage summary of the fields above and emit the § Return contract JSON with `{"status": "error", "reason": "incomplete args"}`.

## Process

### 1. Pre-flight

1. **Anchor uniqueness**: every verbatim line-anchor argument — `Section`, plus `Start after:` / `End before:` when provided — must match exactly one line in the target file: `grep -Fxn '<anchor>' '<Target file>'` returns exactly one output line (which also yields the anchor's line number for Pre-flight step 2, the extraction-range resolution). Zero matches → error `section not found` (for `Section`) / `<field> anchor not found`; two or more → error `section heading not unique` / `<field> anchor not unique`.
2. **Resolve the extraction range [S,E]** (1-based line numbers): default `S` = the line after the `Section` heading line, `E` = the line before the next heading of the same or higher level (or end of file). `Start after:` / `End before:` override the respective side. Then `Read` the range once with a few lines of margin (offset ≈ S−5, limit ≈ E−S+10) and confirm from that single read: (i) the range covers exactly the intended body, and (ii) a boundary candidate that looks like a heading is not a fake heading inside a fenced code block (check for an odd number of ``` fence lines above it within the section).
3. **`Inline-keep:` verification**: `grep -Fn` each phrase in the target file and confirm at least one occurrence lies **outside** [S,E]. A phrase found only inside the range → error `inline-keep phrase inside extraction range` — advise the caller to adjust `Start after:` / `End before:`, or to extract this section manually (a definition sandwiched mid-range cannot be excluded by a single contiguous range).
4. **Reference file absence**: the `Reference file` must not already exist (a successful `Read` means it exists → error `reference file already exists` — never overwrite). Re-confirm absence immediately before the Write in Process step 3 (Compose the reference file) below.

### 2. Extract

```bash
scratch=$(mktemp -d)
sed -n '<S>,<E>p' '<Target file>' > "$scratch/body"
wc -m < "$scratch/body"        # extracted_chars
wc -m < '<Target file>'        # target_chars_before
```

### 3. Compose the reference file

Write the header block to the `Reference file` (after re-confirming it still does not exist), following the house preamble convention. `<Title>` is derived from the `Section` label: its text without the leading `#`s and without any `Step N:`-style numbering prefix:

```markdown
# <Title> (extracted from `<target basename>` <Section label>)

Deep reference for `<target basename>` **<Section label>**. <One sentence naming what stays inline in the parent, when `Inline-keep:` was given.> Content is verbatim-extracted, retaining its original numbering and indentation. Unqualified `§ <Heading>` references and `sub-step N` references resolve to `<target basename>`.

```

The header ends with one blank line. After the Write — and **before** the append — determine `K` mechanically rather than by manual count (an off-by-one here would surface as a false `verification_failed` at Process step 6, Verbatim verification): `K=$(wc -l < '<Reference file>')`. Then append the body byte-identically:

```bash
cat "$scratch/body" >> '<Reference file>'
```

### 4. Skeleton replacement

`Edit` the target file: replace exactly the extracted range [S,E] with the skeleton — a one-line purpose sentence plus the canonical delegation pointer:

> Read [`references/<name>.md`](references/<name>.md) and follow the procedure from top to bottom.

The `Edit`'s `old_string` is the **full verbatim block** — the heading line, the entire [S,E] body, and the first line after `E` (no elision; `Edit` requires an exact match, and the two outer lines make it unique). The section label (heading line) and every definition outside [S,E] stay in place untouched (the intro's **No definition duplication** invariant).

### 5. Citing-site sweep

Grep **repo-wide** (from the repo root) for references to the moved content — the sub-headings and bold-prose labels that left the target file. Run the sweep as **one pass**: a single Grep alternation over the moved labels, or `grep -rnFf "$scratch/labels" .` with the labels written one per line to `$scratch/labels` (fixed-string matching also avoids regex-escaping the labels).

- **Inside the target skill tree** (the target file's skill root, including its `references/*.md`): update or add pointers in the canonical cross-reference form — `§ <bold-label>` within the same file, `references/<name>.md § <bold-label>` across files.
- **Outside the target skill tree** (e.g. `.claude/rules/`, sibling skills): **detection-only** — do not edit; record each hit in the § Return contract's `out_of_tree_refs[]` and emit one Layer 1 warning line per hit. Disposition belongs to the caller (auto-editing rule files has too large a blast radius).
- **Excluded from the sweep results entirely** (neither pointer-edit targets nor `out_of_tree_refs[]` entries): the new `Reference file` itself (it is the moved labels' definition site), and any hit under the sync destination Process step 7 (Bundle sync) will resolve (at sweep time that copy still holds the pre-extraction text; the sync overwrites it immediately after — reporting it would emit a spurious warning on every bundle-member run).

Track every file edited in this run for `edited_files` (membership defined in § Return contract).

### 6. Verbatim verification

```bash
tail -n +<K+1> '<Reference file>' > "$scratch/ref-body"
diff "$scratch/body" "$scratch/ref-body"
```

Two separate commands, no process substitution — each matches its own `allowed-tools` entry on its own. Record `wc -m < '<Target file>'` as `target_chars_after`. Empty diff (zero exit) → `verbatim_check: "identical"`. Any difference → `verbatim_check: "mismatch"`: skip Process steps 7 (Bundle sync) and 8 (Verification dispatch) (`bundle_sync` and both `verify_*` fields report `"skipped"` — their work would be spent on an already-failed run) and emit the § Return contract directly (the Aggregation mapping folds the mismatch into `status` and its no-auto-recovery rule applies).

### 7. Bundle sync

Resolve the sync destination, first match wins:

1. `Bundle copy dir:` provided and not `none` → use it verbatim.
2. `Bundle copy dir: none` → skip (`bundle_sync: "skipped"`).
3. **Auto-derive** — fires only when **all** hold: the `Target file`'s normalized absolute path resolves under the current working directory (the repo root when invoked from the repo), its repo-root-relative form starts with `skills/<member>/`, and `jq -r '(.plugins[] | select(.name == "dev-workflow-bundle") | .skills[]) // empty' .claude-plugin/marketplace.json` lists `./skills/<member>`. Destination: `plugins/dev-workflow-bundle/skills/<member>/`. Any condition failing → skip. The repo-root anchoring is deliberate: a scratch mirror whose path merely *contains* `skills/<member>/` must never trigger a copy into the real bundle tree.

When syncing, copy **only the files this run edited** under the target skill root, one surgical `cp <src> <dest>` per file — never `cp -R .../.` (it can sweep workflow artifacts such as `.claude/` plan files into the bundle copy, per the existing bundle-sync rule).

### 8. Verification dispatch

1. `Skill(verify-skill-refs)` — always pass `Target dir: <target skill root>` (one rule, no dependence on the callee's default).
2. `Skill(verify-bundle-sync)` — dispatch only when Process step 7 (Bundle sync) synced into the repo's real bundle copy (`plugins/dev-workflow-bundle/skills/<member>/`). For an explicit custom `Bundle copy dir:`, instead verify each copied file with a direct `diff <src> <dest>` and report the outcome in the **same** `verify_bundle_sync` field — `"ok"` when every diff is clean, `"drift"` otherwise (`"skipped"` is reserved for runs where no sync happened). verify-bundle-sync inspects **all** bundle members, so when its `drift_files[]` names a member other than the target member, add a Layer 1 attribution note that the drift is likely pre-existing and unrelated to this extraction.

Judge each callee's fenced JSON verdict semantically and issue the next action in the **next tool call, in the same turn**, regardless of outcome (`ok` / `violations` / `drift` / `"skipped"`-equivalent, any non-error result — and on non-ok outcomes the next action is folding the result per § Return contract's Aggregation mapping, not a pause): the verdict is a return value, not a turn boundary. When this skill itself runs as a callee, the caller's `§ No-Stall Principle` governs the same boundary (see § Sub-skill caller directive). A callee response with no parseable fenced JSON → first match wins: `{"status": "error", "reason": "verdict parse failure"}` (same evaluate-in-order discipline as `verify-diff` § (b) Parse & apply, restricted to the cases that apply to a single-pass dispatch).

## Return contract

The skill emits its result in **two layers** in a single response (mirroring `verify-bundle-sync` § Return contract's form).

**Layer 1 — Prose summary** (first, at the top of the response):

```
Status: SUCCESS | TEST_FAILED | EXECUTION_ERROR

<one-paragraph summary: target file, section, reference file, extracted chars, target chars before/after, bundle-sync disposition>
<if TEST_FAILED: what failed — byte mismatch, or which verification dispatch returned non-ok>
<out-of-tree reference warnings, one line each — present regardless of status>
<verify-bundle-sync pre-existing-drift attribution note, when applicable>
<if EXECUTION_ERROR: reason and which step failed>
```

**Layer 2 — Fenced JSON verdict** (last, at the end of the response):

````
```json
{
  "status": "ok" | "verification_failed" | "error",
  "target_file": "<path>",
  "section": "<heading line>",
  "reference_file": "<path>",
  "extracted_chars": <int>,
  "target_chars_before": <int>,
  "target_chars_after": <int>,
  "verbatim_check": "identical" | "mismatch" | "skipped",
  "edited_files": ["<path>"],
  "out_of_tree_refs": [{"file": "<path>", "match": "<phrase>"}],
  "bundle_sync": "synced" | "skipped",
  "verify_skill_refs": "ok" | "violations" | "error" | "skipped",
  "verify_bundle_sync": "ok" | "drift" | "error" | "skipped",
  "reason": "<required when status != ok, else omit>"
}
```
````

Mapping between the prose status token and the JSON `status` field:

| Prose `Status:` | JSON `status` |
| --- | --- |
| `SUCCESS` | `ok` |
| `TEST_FAILED` | `verification_failed` |
| `EXECUTION_ERROR` | `error` |

**Aggregation mapping** (how callee outcomes fold into the top-level `status`):

- `verification_failed` — the byte-identity diff mismatched (Process step 6, Verbatim verification), **or** any sync/reference verification returned non-ok (`verify_skill_refs: "violations" | "error"`, `verify_bundle_sync: "drift" | "error"`); `reason` names which. On any `verification_failed`, record and report — never auto-recover (no revert, no retry); leave the working tree as-is for inspection.
- `error` — invalid arguments, a Pre-flight failure, a tool failure, or a callee verdict parse failure (`reason: "verdict parse failure"`).
- `ok` — everything else.
- `verify_skill_refs` is a passthrough of the callee's own JSON `status`, or `"skipped"` when the dispatch did not run. `verify_bundle_sync` reports the **sync-verification outcome regardless of mechanism** — the callee's JSON `status` for a real-bundle-copy sync, or the direct per-file diff outcome for a custom `Bundle copy dir:` (`"ok"` / `"drift"`); `"skipped"` only when no sync ran. `edited_files` is the union of the new reference file, the target file, and every sweep-edited file. An error verdict synthesized before extraction completes carries zeroed counts, empty arrays, and `"skipped"` in every string-enum field (`verbatim_check` / `bundle_sync` / `verify_skill_refs` / `verify_bundle_sync` — `verbatim_check: "skipped"` exists for exactly this case: the check never ran).

## Sub-skill caller directive

When invoked as a sub-skill (i.e. via `Skill(extract-skill-section)` from an orchestrator), the fenced JSON verdict block this skill emits is the **structured return value** of the skill's procedure — it is **not** a deliverable to the user, and emitting it does **not** terminate the orchestrator's turn. The same agent that ran this skill must immediately issue the next tool call dictated by the orchestrator's flow (see the orchestrator's `§ No-Stall Principle`; orchestrators that surface a per-callee guidance bullet name the specific next action there). Do not insert a prose summary, an acknowledgment, or a "shall I proceed?" sentence between the JSON verdict and the next tool call. The JSON verdict block and the next tool call MUST be emitted in the same assistant turn. Closing the turn after emitting the JSON block — even with no prose between them — is the same violation as inserting prose. Only one fenced JSON block — the verdict block — appears in the response, so callers can locate it unambiguously. The skill's own procedure is over; the orchestrator's procedure continues without pause.
