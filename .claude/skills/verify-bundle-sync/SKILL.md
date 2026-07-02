---
name: verify-bundle-sync
description: Verify the dev-workflow-bundle canonical and bundle copy directories are in sync. Workaround for upstream symlink bug; delete this skill and its callers when symlinks are restored.
allowed-tools: Bash(jq *), Bash(diff *), Bash(test *)
---

# Verify Bundle Sync

This skill exists solely to work around an upstream Claude Code symlink bug ([anthropics/claude-code#53948](https://github.com/anthropics/claude-code/issues/53948)) that requires `plugins/dev-workflow-bundle/skills/<name>/` to be a real directory copy of `skills/<name>/` rather than a symlink. It is a **project-local** skill (lives under `.claude/skills/verify-bundle-sync/`, not registered in `.claude-plugin/marketplace.json`). When the bug is fixed and the bundle layout returns to symlinks, **delete this skill directory, the `.claude/dev-workflow.md` `test_commands` entry, the `dev-workflow-triage` (d4) sub-step, the `.claude/rules/project.rules.md` bullet, and `verify-skill-refs` SKILL.md's Process step 2 (bundle-copy identity check, with its `bundle_copy` verdict field)** that document this workaround.

The skill compares each bundle member's canonical directory against its bundle copy and reports drift. It is detect-only — it never modifies any files.

## Process

Accepts an optional `--base-commit <sha>` argument (ignored — the scope is structural, not changeset-dependent). Running with no arguments behaves identically.

Run the following directly in the main thread (no subagent dispatch is needed — the check is lightweight: one `jq` invocation plus one `diff -rq` per bundle member).

1. **Load the bundle membership list** from `.claude-plugin/marketplace.json`:

   ```bash
   bundle_skills=$(jq -r '(.plugins[] | select(.name == "dev-workflow-bundle") | .skills[]) // empty' .claude-plugin/marketplace.json 2>/dev/null)
   # If $bundle_skills is empty after this guard, halt and emit the Return contract response
   # (Layer 1 prose `Status: EXECUTION_ERROR` + Layer 2 fenced JSON with `status: "error"`,
   # `reason: "marketplace.json missing, malformed, or dev-workflow-bundle plugin entry absent"`)
   # immediately — see § Return contract.
   ```

   The `// empty` is the array-enumeration null-fallback idiom: when the entry / array is absent, it yields a zero-length stream (no literal `null\n` leaking to stdout). This is a different concern from the canonical scalar `// "unknown"` pattern documented in `.claude/rules/project.rules.local.md` § `jq` の `null` 文字列フォールバック, which targets scalar values. The post-pipeline `[ -z "$output" ]` guard catches array absence, `jq` non-zero exit, and file-not-found uniformly.

2. **For each bundle member entry** `./skills/<name>`:

   - Resolve `canonical=skills/<name>/`
   - Resolve `bundle_copy=plugins/dev-workflow-bundle/skills/<name>/`
   - Verify both directories exist with `test -d "$canonical" && test -d "$bundle_copy"`. If either is missing, exit immediately with `EXECUTION_ERROR` and report which path was missing.
   - Run `diff -rq "$canonical" "$bundle_copy"`. Capture stdout. If exit code is non-zero AND stdout is empty, treat as `EXECUTION_ERROR` (tool failure). If stdout is non-empty, treat every output line as a drift entry — each line is one of:
     - `Files <canonical-path> and <bundle-copy-path> differ` → `type: "differ"`
     - `Only in <canonical-dir>: <file>` → `type: "only_in_canonical"`
     - `Only in <bundle-copy-dir>: <file>` → `type: "only_in_copy"`

3. **Aggregate the result**:
   - All entries drift-free → `SUCCESS` (e.g. `6 bundle skills verified, 0 drift`)
   - Any entry has drift → `TEST_FAILED`. Include the per-entry drift list and a remediation hint of the form `cp -R skills/<name>/. plugins/dev-workflow-bundle/skills/<name>/` for each affected member
   - `jq` failed / `diff` missing / `marketplace.json` unreadable / per-entry path missing → `EXECUTION_ERROR`

**EXECUTION_ERROR is deterministic** within a run: `marketplace.json` absence, missing tooling (`jq` / `diff`), and missing path entries do not become resolved during the same run, so retrying the same invocation will not change the outcome. Callers that retry on EXECUTION_ERROR (such as `dev-workflow` Step 7's retry handler) will simply burn through their retry budget producing the same error each time — that wastes a few extra invocations but is harmless.

## Return contract

The skill emits its result in **two layers** in a single response so that both prose-reading callers (such as `dev-workflow` Step 7) and JSON-parsing callers (such as `dev-workflow-triage` (d4)) can extract the verdict mechanically.

**Layer 1 — Prose summary** (first, at the top of the response):

```
Status: SUCCESS | TEST_FAILED | EXECUTION_ERROR

<one-paragraph human-readable summary>
<if TEST_FAILED: per-entry drift list with remediation hint lines>
<if EXECUTION_ERROR: reason and which step failed>
```

**Layer 2 — Fenced JSON verdict** (last, at the end of the response):

````
```json
{
  "status": "ok" | "drift" | "error",
  "checked_count": <int>,
  "drift_files": [{"skill": "<name>", "path": "<relative-path>", "type": "differ|only_in_canonical|only_in_copy"}],
  "reason": "<optional, required when status=error>"
}
```
````

Mapping between the prose status token and the JSON `status` field:

| Prose `Status:` | JSON `status` |
|---|---|
| `SUCCESS` | `ok` |
| `TEST_FAILED` | `drift` |
| `EXECUTION_ERROR` | `error` |

- `checked_count`: number of bundle member entries actually inspected (6 at the time of writing — `ask-peer`, `dev-workflow`, `extract-rules`, `rules-review`, `tidy`, `prose-polish`). If the list could not be loaded (`EXECUTION_ERROR` from Step 1), set this to `0`.
- `drift_files[]`: drift / one-sided-presence entries, populated only for `status: "drift"`. Empty array for `ok` and `error`. The `path` value preserves the raw line as it appeared in `diff -rq` output so that downstream rendering does not need to re-derive it.
- `reason`: required on `status: "error"`. Short, ≤ 80 characters. Examples: `marketplace.json missing`, `dev-workflow-bundle plugin entry absent`, `jq not in PATH`, `canonical missing: skills/ask-peer`.
