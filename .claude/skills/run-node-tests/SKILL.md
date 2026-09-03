---
name: run-node-tests
description: Run the repository's Node test suite under tests/ via `node --test` and report a structured verdict. Project-local routine — not for marketplace distribution.
allowed-tools: Bash(node --test *), Bash(test *)
---

# Run Node Tests

Runs the repository's own test suite — the `*.test.mjs` files under `tests/` — and reports a
structured verdict. Nothing needs installing: the suite uses `node:test` / `node:assert` only.

This is a **project-local** skill (it lives under `.claude/skills/run-node-tests/` and is not
registered in `.claude-plugin/marketplace.json`), invoked as a `test_commands` entry from
`.claude/dev-workflow.md`.

## Sub-skill caller directive

When invoked as a sub-skill (i.e. via `Skill(run-node-tests)` from an orchestrator), the fenced
JSON verdict block this skill emits is the **structured return value** of the skill's procedure —
it is **not** a deliverable to the user, and emitting it does **not** terminate the orchestrator's
turn. The same agent that ran this skill must immediately issue the next tool call dictated by the
orchestrator's flow (see the orchestrator's `§ No-Stall Principle`; orchestrators that surface a
per-callee guidance bullet name the specific next action there). Do not insert a prose summary, an
acknowledgment, or a "shall I proceed?" sentence between the JSON verdict and the next tool call.
The JSON verdict block and the next tool call MUST be emitted in the same assistant turn. Closing
the turn after emitting the JSON block — even with no prose between them — is the same violation
as inserting prose. Only one fenced JSON block — the verdict block — appears in the response, so
callers can locate it unambiguously. The skill's own procedure is over; the orchestrator's
procedure continues without pause.

## Process

Accepts an optional `--base-commit <sha>` argument (ignored — the suite always runs in full).

Run everything below directly in the main thread — do not dispatch a subagent.

1. **Check the suite exists**: `test -d tests`. When the directory is absent there is nothing to
   run — report `SUCCESS` with `skipped: true`.

2. **Run it**: `node --test 'tests/**/*.test.mjs'`.

   Keep the glob quoted, and do not pass a directory argument (`tests` / `tests/`).

3. **Read the result** from the exit code and the TAP summary lines (`# tests`, `# pass`,
   `# fail`):

   - Exit `0` with `# tests` greater than `0` → `SUCCESS`. Report the counts.
   - Exit `0` with `# tests 0` → `EXECUTION_ERROR`, `reason: "glob matched no test files"`. Keep
     it distinct from step 1's `skipped: true`: that one means there is nothing to run here, this
     one means the tree that should be here is gone.
   - Exit non-zero with a parseable summary → `TEST_FAILED`. For each `not ok` subtest, report
     its name, its `location`, and the assertion message, keeping enough detail that the failure
     can be fixed without re-running.
   - `node` missing, or a non-zero exit with no parseable summary (a loader crash, an import
     failure that takes the whole run down) → `EXECUTION_ERROR`, naming what failed.

## Return contract

Emit both layers in a single response, so prose-reading callers (`dev-workflow` Phase 9 (Check /
Test)) and JSON-parsing callers both get the verdict mechanically.

**Layer 1 — Prose summary** (first, at the top of the response):

```
Status: SUCCESS | TEST_FAILED | EXECUTION_ERROR

<one-paragraph human-readable summary>
<if TEST_FAILED: per-failure name, location, and assertion message>
<if EXECUTION_ERROR: what failed and at which step>
```

**Layer 2 — Fenced JSON verdict** (last, at the end of the response), matching this schema:

````
```json
{
  "status": "ok" | "failed" | "error",
  "skipped": <bool>,
  "tests": <int>,
  "passed": <int>,
  "failed": <int>,
  "failures": [{"name": "<subtest name>", "location": "<file:line>", "message": "<assertion message>"}],
  "reason": "<optional, required when status=error>"
}
```
````

Mapping between the prose status token and the JSON `status` field:

| Prose `Status:` | JSON `status` |
|---|---|
| `SUCCESS` | `ok` |
| `TEST_FAILED` | `failed` |
| `EXECUTION_ERROR` | `error` |

- `skipped`: `true` only on Process step 1's short-circuit (`tests/` is absent). `false` whenever
  the suite ran.
- `tests` / `passed` / `failed`: taken from the TAP summary. All `0` when `skipped` is `true` or
  on `status: "error"`.
- `failures[]`: populated only on `status: "failed"`. Empty array otherwise.
- `reason`: required on `status: "error"`. Short, ≤ 80 characters. Examples: `node not in PATH`,
  `glob matched no test files`, `import failure took down the run`.
