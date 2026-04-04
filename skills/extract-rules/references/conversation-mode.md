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

## Step C5: Append Principles and Patterns

1. Read existing rule files (paths provided by main agent) to understand current rules

2. Categorize each extracted item:
   - Language-specific → `languages/<lang>.md`
   - Framework-specific → `frameworks/<framework>.md`
   - Integration-specific → `integrations/<framework>-<integration>.md`
   - Project-level → `project.md`

   **By default** (`split_output: true`): Conversation-extracted **project-specific patterns** always go to `.local.md` files. Principles may be added to shared files. `project.md` is always a single file — project-level items go there regardless of `split_output`. Promoting patterns to shared files should be done manually or via organization-level merge.

3. Check for duplicates: Skip if already exists or covered. Also check cross-format duplicates: a project-specific pattern whose description semantically matches an existing principle name (use AI judgment: case-insensitive, synonyms). For example, `` `useAuth()` - auth hook interface `` matches `Auth hook interface (useAuth)` in `## Principles`. Skip such patterns — they have already been promoted to Principles via merge-rules

4. Append using the same format as Step 6 in the main SKILL.md (see Format guidelines)

5. **Update `.examples.md`**: Follow the common generation procedure in `references/examples-format.md` to add examples for each new rule.

6. Run Security Self-Check (same as Step 6.5 in the main SKILL.md) on updated files. Also read `references/security.md`.

7. Return a summary of what was added. See `references/report-templates.md` for format.
