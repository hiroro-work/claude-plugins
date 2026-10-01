---
name: inbox-add
description: Read .claude/inbox-add.local.md and append one task line to the Obsidian Vault's inbox.md. Use when the user requests "add to inbox", "inboxに追加", "これをinboxに入れて", or any equivalent task-capture intent.
allowed-tools: Read, Write
---

# inbox-add

Append a single task line to an Obsidian Vault's `inbox.md` so the vault-side `inbox-process` skill can later route it to a project.

The companion vault-side skill `inbox-process` reads `#<project>` as a `#project-hint` and dispatches the task into `projects/<project>/tasks/`.

## Configuration

Per-repository config file:

- Path: `.claude/inbox-add.local.md` (relative to the current working directory)
- Gitignored via the project's `.claude/*.local.*` pattern
- YAML frontmatter only

```markdown
---
vault: ~/Sources/github.com/hiroro-work/vault
project: <project-name>
---
```

- `vault`: absolute path (tilde `~` expansion supported) to the Obsidian Vault root. Required (no default — vault location differs per user)
- `project`: project hint string. Required. Used verbatim as `#<project>` in the appended task line. May refer to a project that does not yet exist on the vault side; `inbox-process` offers to create it on dispatch

## Process

1. **Read the config**. `Read` `.claude/inbox-add.local.md` from the current working directory.
   - On Read error: enter § Setup mode (config missing) **only** when the file does not exist. For any other Read error (permission, encoding, etc.) stop with an error reporting the path — do not enter Setup mode, since the existing file would be clobbered. If the `Read` tool's error does not distinguish missing-vs-other reliably, default to stop-with-error
   - On success: parse YAML frontmatter and extract `vault` and `project`
   - Missing or empty `vault` / `project`: stop with an error naming the missing key, show the template above as a fix hint
   - Tilde expansion in `vault`:
     - Exactly `~` or starting with `~/` → replace the leading `~` with the value of `$HOME` (string replacement only, no shell invocation)
     - Any other use of `~` (e.g. `~user/…`) is treated as a literal character with no expansion — for other-user expansion, write the absolute path explicitly

   ### 1a. Setup mode (config missing)

   - Tell the user the config file is missing
   - Ask for `vault` and `project` values
   - Before writing: re-confirm `.claude/inbox-add.local.md` does not exist (defensive guard against a race where it appeared between Step 1 and here). If it now exists, abort Setup mode and report the conflict — never overwrite
   - `Write` a template file at `.claude/inbox-add.local.md` using the YAML format above
   - Report the path written and ask the user to re-issue the task-capture request

2. **Append the task line**. `Read` `<vault>/inbox.md`.
   - On Read error (vault dir or `inbox.md` missing): stop with an error (vault setup is outside this skill's scope; do not auto-create)
   - On success: compose `- [ ] <task> #<project>`. If the file ends with `\n`, append `- [ ] <task> #<project>\n`; otherwise append `\n- [ ] <task> #<project>\n` so the new entry starts on its own line
   - Multi-line task: collapse the user-supplied content into a single line by replacing internal newlines with single spaces. If the resulting line is unwieldy, summarize the intent into one line yourself — do not ask the user to rephrase
   - `Write` the new content back to `<vault>/inbox.md`

3. **Report**. Show the appended line verbatim and the absolute path of the modified `inbox.md`. Example:

   ```text
   Appended to /Users/.../vault/inbox.md:
     - [ ] 請求書を送る #work
   ```

## Edge cases

- **`inbox.md` is empty (zero-length)**: append `- [ ] <task> #<project>\n` directly (no leading newline needed)
- **`project` value contains a leading `#`**: strip exactly one leading `#` before composing the line to avoid `##project` double-hash. Two or more leading `#` indicate user error and are left as-is so the malformed value surfaces visibly in the appended line
