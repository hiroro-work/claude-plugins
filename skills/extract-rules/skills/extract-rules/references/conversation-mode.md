# Conversation Extraction Mode — Subagent Instructions

These steps (C3–C5) are executed by the subagent spawned in Step C2.

## Step C3: Load and Analyze Session File

### 1. Extract messages

Run the bundled script to extract text messages from the session `.jsonl` file:

```bash
node <skill-path>/scripts/extract_session_messages.mjs <session-file> --output /tmp/session_messages_<session-id>.txt
```

Then read the output file with the Read tool.

The script handles:
- Parsing each JSON line and filtering to `type: "user"` and `type: "assistant"` only
- Extracting text from `message.content` (both string and array formats), skipping `tool_use`, `thinking` blocks
- Recovering user responses from interactive tools (`AskUserQuestion`, etc.) — these `tool_result` entries contain explicit user preferences and are high-value signals
- By default, all messages are included without size limits
- Optional `--max-chars` and `--max-per-message` flags to cap output size if needed (prioritizes recent messages — oldest are dropped first; newest message is always kept even if partially truncated)
- Outputting in chronological order with `=== {role} ===` delimiters

**Cleanup:** Delete the output file after reading it to avoid leaving conversation data on disk:

```bash
rm /tmp/session_messages_<session-id>.txt
```

### 2. Analyze the extracted conversation

From the extracted messages, identify coding style discussions, preferences, and corrections:

- **User corrections are the highest-value signal** — look for patterns where:
  - The user rejected Claude's approach and redirected (e.g., "no, we do X instead", "don't use Y here")
  - The user modified Claude's generated code in a way that reveals a convention
  - The user explained why a particular approach is preferred in this project
- Focus on user instructions, code review feedback, and explicit style preferences

## Step C4: Extract Principles and Patterns

Read `references/extraction-criteria.md` before proceeding.

Look for user preferences and classify them:

**1. General best practice feedback** → Skip (do NOT extract):
   - "Use const" "No magic numbers" "DRY" "Early returns" → General knowledge, AI already knows
   Only extract if the project/team has made a specific choice beyond general best practices:
   - "We use FP only, no classes" → Team-specific paradigm choice

**2. Project-specific patterns** → Extract with concrete examples:
   - "Use `RefOrNull<T>` for nullable refs" → Include type definition
   - "Always use `pathFor()` with `url()`" → Include usage pattern

**3. Code review feedback**: Identify underlying philosophy or specific patterns

**4. Routine re-application of existing patterns** → Skip (do NOT extract):
   - Code added by following an established codebase pattern without user guidance or correction — symmetric code duplication, template expansion, mechanical extension of an existing structure
   - Extract only when a new design decision was made, an exceptional case was handled, or the user explicitly corrected or redirected the approach

## Step C5: Append Principles and Patterns

1. **Read existing rule files**: read the rule files to understand current rules. The dedup logic operates over two separately-tagged file-sets: `canonical_files` (rule files under `output_dir` plus `.examples.md` files under `examples_output_dir` — the existing dedup target) and `staging_files` (the project-level staging file under `staging_output_dir` — for the staging-match branch added in the "Check for duplicates and route per category" step below). In Conversation mode these are passed via the Step C2 subagent prompt boundary; in PR Review mode and Update Mode (both defer to this Step C5 for the staging-match criterion) the main agent reads both file-sets directly with no prompt boundary — the tagging is conceptual in those cases.

2. Categorize each extracted item (rule files written under `output_dir`):
   - Language-specific → `<output_dir>/languages/<lang>.md`
   - Framework-specific → `<output_dir>/frameworks/<framework>.md`
   - Integration-specific → `<output_dir>/integrations/<framework>-<integration>.md`
   - Project-level → `<output_dir>/project.md`

   **By default** (`split_output: true`): Conversation-extracted **project-specific patterns** always go to `.local.md` files. Principles may be added to shared files. `project.md` is always a single file — project-level items go there regardless of `split_output`. Promoting patterns to shared files should be done manually or via organization-level merge.

3. **Check for duplicates and route per category:**
   - **Project-level patterns** (routing target: `<output_dir>/project.md` — the single hybrid file for project-level patterns, per Step C5 item 2): 3-branch decision —
     - (i) **Canonical match**: if the pattern exact / semantic matches an entry in `<output_dir>/project.md` (or any `<output_dir>/<name>.md` Principles section, cross-format), skip. Increment `canonical_skip_count`. Cross-format example: `` `useAuth()` - auth hook interface `` matches `Auth hook interface (useAuth)` in `## Principles` — promoted via merge-rules, so already covered.
     - (ii) **Staging match**: if the pattern matches an entry in `<staging_output_dir>/project.staging.local.md` per the **staging-match criterion** — (a) inline code signature byte-equal **or** semantic-equivalent (same symbol / same API combination, ignoring whitespace and trivial reordering), **and** (b) context phrase semantically aligned — schedule a **promote** in item 4 (append the new observation to `<output_dir>/project.md`) and item 5 (delete the matched staging entry). Default case ((a)+(b) both hold): the canonical bullet uses the **current observation's** context phrase (the re-observation is the authoritative refresh — staging-side phrasing is treated as the older draft); the staging entry is removed in item 5 regardless of which context phrase was previously held. Edge cases: (a)-only (signature matches, context differs) → same-observation promote with overwritten context (current observation's context wins, same as default); (b)-only (context similar, signature differs) → not a match, fall through to branch (iii) (new staging append). Increment `promoted_count`.
     - (iii) **New**: append to `<staging_output_dir>/project.staging.local.md` `## Project-specific patterns` section in item 4. Increment `staged_count`.
   - **Principles / Language / framework / integration patterns**: existing behavior unchanged — canonical match → skip (also increments `canonical_skip_count`); new → append to the routed target file immediately (staging bypassed).

4. **Append:**
   - **Canonical writes** (existing items + items promoted from staging in 3 (ii)): use the same format as Step 6 in the main SKILL.md (see Format guidelines).
   - **Staging writes** (new project-level items per 3 (iii)): append to `<staging_output_dir>/project.staging.local.md`'s `## Project-specific patterns` section. Create the file (and any missing parent directories under `staging_output_dir`) when absent — the file body uses the template under § Staging file body template below.

   **Move atomicity** (for promoted items): the order is (a) canonical append, (b) verify canonical write succeeded, (c) staging delete in item 5. Failures past (a) leave the canonical entry intact and either retry or leave a duplicate (next session's canonical-match skip resolves it).

5. **Delete promoted staging entries**: for each item promoted in 3 (ii), `Edit` `<staging_output_dir>/project.staging.local.md` to remove the matched bullet. Construct `old_string` to include the target bullet line plus 1 surrounding line above and 1 below for uniqueness (same convention as subagent-returned `mechanical_edits`). If `Edit` fails because the resulting `old_string` is still not unique due to a concurrent edit or near-identical neighbors, leave the duplicate — next session's canonical-match skip resolves it. Staging file is never deleted as a whole even if the last entry is promoted (empty `## Project-specific patterns` section is acceptable; next session's 1st-observation append re-populates it).

6. **Update `.examples.md`**: only for entries that landed in canonical files in item 4 (new items in non-project categories — principles / language / framework / integration; plus project-level items promoted from staging). Staging-only items (3 (iii)) do **not** receive `.examples.md` entries — the 1st observation's code site is intentionally not anchored to avoid bloating `.examples.md` with 1-shot samples; the 2nd observation's site is used as the example source on promote. Resolve the target path via `examples_output_dir` (`<examples_output_dir>/<name>.examples.md`). Create the file and any missing parent directories under `examples_output_dir` when absent. Follow the common generation procedure in `references/examples-format.md` to add examples for each new rule.

7. Run Security Self-Check (same as Step 6.5 in the main SKILL.md) on updated files, **including the staging file** if any new staging append landed in item 4 OR any staging-delete edit landed in item 5 (the staging file was rewritten by either path). Also read `references/security.md`.

8. Return a summary including `canonical_skip_count`, `promoted_count`, `staged_count`. See `references/report-templates.md` § Conversation Extraction Mode for format.

## Staging file body template

When item 4 creates `<staging_output_dir>/project.staging.local.md` for the first time, render the file body in the resolved `language`. Paired bilingual samples (the file body is rendered, not the section heading itself):

- `language: ja`:

  ```markdown
  # Project Rules - Staging

  1 回観測のみの候補ルール。次回 incremental 抽出走行（incremental extraction run — `--from-conversation` / `--from-pr` / `--update`）で再観測されたら canonical へ promote されます。手動で `.local.md` へ移動することも可能（promote 待たずに採用する場合）。

  ## Project-specific patterns
  ```

- `language: en`:

  ```markdown
  # Project Rules - Staging

  1st-observation candidates awaiting re-observation before promotion to canonical. The next incremental extraction run (`--from-conversation` / `--from-pr` / `--update`) promotes a matched entry to canonical and removes it from this file. Manual move to `.local.md` is also acceptable if you want to adopt without waiting for re-observation.

  ## Project-specific patterns
  ```

## Mode interaction summary

For the per-mode read / write / promote behavior on the staging file, see the main SKILL.md § Update Mode "Staging awareness" paragraph (Update reads + promotes but does not write; Conversation / PR Review read + write + promote; Full Extraction / Restructure / Compaction leave staging untouched).

**Edge case — Full Extraction over a pre-populated staging directory**: Full Extraction (`/extract-rules` without flags) errors out when `<output_dir>` already exists, so the realistic Full Extraction trajectory is greenfield. If a user has previously run `--from-conversation` (populating staging) and then manually deletes `<output_dir>` before re-running Full Extraction, the staging file persists outside `<output_dir>` and Full Extraction silently ignores it — the next `--from-conversation` / `--from-pr` / `--update` run can still promote those staged candidates against the freshly rebuilt canonical. If the staged candidates are no longer relevant after the rebuild, delete the staging directory manually before re-running incremental modes.
