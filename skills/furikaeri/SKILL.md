---
name: furikaeri
description: Retrospective of one Claude Code session, built from its jsonl log and published as a single artifact page — where the time went (AI working vs. the person reading, thinking, typing), the phases the session moved through, what went wrong ranked by impact, and the full exchange collapsed by phase. Use after a mob-programming or dev-workflow run to see what cost time, or on any session log someone handed over. A sonnet subagent writes the analysis by default; every number on the page is computed from the log.
allowed-tools: Read, Write, Agent, Artifact, Bash(node *)
---

# furikaeri

```text
/furikaeri [<session.jsonl>] [--lang ja|en] [--model <id>] [--gap-cap <minutes>]
```

`<session.jsonl>` is a Claude Code session log, usually under `~/.claude/projects/<encoded cwd>/<session id>.jsonl`. Without it the newest log for the current working directory is used. `--gap-cap` (default 60) is the longest pause, in minutes, that still counts as the person's time; a longer one is a break and leaves every total.

The page never shows tool results, only tool names and counts. What the person and the AI wrote is shown in full, so the log's contents decide who the page can be shared with.

## Language

Resolve `language` by reading only the `language` key from the YAML frontmatter of `~/.claude/dev-workflow.local.md`, `.claude/dev-workflow.md` and `.claude/dev-workflow.local.md`, in that order, later files overriding earlier ones; a `null` or empty value clears it, and a missing file, or one without frontmatter, contributes nothing. If none sets it, take `language` from `~/.claude/settings.json`; otherwise use `ja`. `--lang` on the command line wins over all of these. The page's fixed labels and every sentence the analysis writes follow the resolved language.

## Model

`--model` is applied as the `model` parameter of the analysis `Agent` dispatch. It is valid only if it is one of the ids the current `Agent` tool's `model` parameter accepts; check the tool's live schema in this session. A full `claude-*` id is not among its aliases and is invalid. An absent or invalid value is treated as `sonnet`.

## Dispatch authorization

This skill's procedure dispatches subagents, so invoking the skill **is** the request to use that mechanism: an ambient instruction allowing subagent dispatch only when the user asked for it — a **permission-shaped restriction** — is already satisfied by this invocation. Do not ask the user to re-confirm the dispatch, and do not silently substitute inline execution for a dispatch this procedure specifies. Only two things justify that substitution: **technical availability** (the dispatch tool is not present and callable on the current tool surface), and an **explicit contract term from the caller** bounding this skill to its own thread. A permission-shaped restriction is neither.

## Procedure

`<base dir>` is this skill's directory as the harness reported it when the skill loaded. `<out dir>` is `<scratchpad>/furikaeri/<log name>` when the harness names a scratchpad directory for this session, otherwise `<os temp dir>/furikaeri/<log name>`, where `<log name>` is the given log's basename without `.jsonl`, or `latest` when no log was given; the scripts create it.

1. **Digest.** Run
   `node "<base dir>/scripts/digest.mjs" --file "<jsonl>" --out-dir "<out dir>" [--gap-cap <minutes>]`
   (`--cwd "<cwd>"` in place of `--file` when no log was given). It writes `digest.json` and `transcript.md` and prints their paths and the turn count. Exit 2 means no log was found: say so in one line and stop with the return contract's `status: "error"`, `reason: "no log found"`. A turn count of 0 means the log holds no human turn: say so and stop with `status: "error"`, `reason: "no human turn"`.

2. **Analyze.** Dispatch one `Agent` (`subagent_type: general-purpose`, `model` per § Model, `run_in_background: false`). The prompt is three fenced sections: `--- TASK ---` holds the text of `references/analysis-prompt.md` § Analysis prompt after its `---` rule, verbatim, with `{{language}}`, `{{transcript}}` (the absolute path of `transcript.md`) and `{{turns}}` filled in; `--- INPUT ---` holds the same path again on one line; `--- RETURN ---` holds one sentence: the reply ends with a single fenced JSON block and nothing after it.

   **Pre-invocation reminder**: the agent's reply is a return value. The next tool call after it returns is the `Write` of step 3, issued by this same thread.

3. **Parse and render.** Take the last fenced JSON block of the reply, parse it, and `Write` it verbatim to `<out dir>/analysis.json`. No block, or a block that does not parse → one re-dispatch of step 2 with the sentence `Your previous reply carried no parseable JSON block.` appended to `--- RETURN ---`; a second failure stops the skill with the return contract's `status: "error"`, `reason: "no parseable analysis"`. Then run
   `node "<base dir>/scripts/render.mjs" --digest "<out dir>/digest.json" --analysis "<out dir>/analysis.json" --out "<out dir>/furikaeri.html" --lang <language>`.
   Exit 3 prints one violation per line on stderr: re-dispatch step 2 once with those lines appended to `--- RETURN ---` under the sentence `The renderer rejected your previous analysis for these reasons; return a corrected block:`, then render again. A second exit 3 stops the skill with `status: "error"`, `reason: "analysis rejected: <first violation line>"`.

4. **Publish.** Call `Artifact` with `file_path` `<out dir>/furikaeri.html`, `icon` `report`, and `description` one sentence naming the session and its span. Do not load the design skills: the page's layout and theming are fixed in the renderer.

5. **Report.** In the resolved language, give the URL, then at most four lines: wall time with the AI and person shares, the longest phase, and the first finding's title, or the aside's heading when there are no findings, or nothing further when there is neither. Nothing else.

## Return contract

Emit a single fenced JSON block at the end of the response, matching:

```json
{ "status": "ok" | "error", "reason": null | "<why>", "url": null | "<artifact url>", "turns": <n>, "findings": <n> }
```

Only one fenced JSON block appears in the response.
