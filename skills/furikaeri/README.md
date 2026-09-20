# furikaeri

Turns one Claude Code session log into a retrospective page: how long the session took and how the time split between the AI working and the person reading, thinking and typing; which phases it moved through; what went wrong, ranked by impact; and the full exchange, collapsed by phase.

```text
/furikaeri ~/.claude/projects/<encoded cwd>/<session id>.jsonl
/furikaeri                       # newest log for the current directory
/furikaeri <log> --lang en --model opus --gap-cap 30
```

## How it works

1. `scripts/digest.mjs` reads the log and writes `digest.json` and `transcript.md`. A human turn is a `user` record a person wrote: a prompt (harness-injected text such as slash-command expansions and reminders is dropped), an answer to a question the AI asked, or a declined tool call. For each turn, AI time runs from the send to the AI's last record before the next turn; the rest is the person's. A pause longer than `--gap-cap` minutes (default 60) is a break and leaves every total.
2. A subagent (`sonnet` by default) reads the transcript and returns the analysis as JSON: phase boundaries, findings and an optional aside, all by turn index. It writes no numbers.
3. `scripts/render.mjs` validates the analysis — phases must cover every turn, quotes must be verbatim — computes every duration and share from the digest, and renders the page.
4. The page is published as an artifact.

## Sharing

Tool results never appear on the page; tool names and counts do. Everything the person and the AI wrote does, so treat the page as having the same sensitivity as the log's conversation.

## Where session logs live

`~/.claude/projects/<cwd with every character outside [A-Za-z0-9] replaced by "-">/<session id>.jsonl`. The session id is the UUID Claude Code shows for a session and the name of its scratchpad directory. Logs are kept for a limited time (30 days by default), so copy one you want to keep.

## Language

`--lang`, else the `language` key of `~/.claude/dev-workflow.local.md`, `.claude/dev-workflow.md`, `.claude/dev-workflow.local.md`, else `language` in `~/.claude/settings.json`, else `ja`.
