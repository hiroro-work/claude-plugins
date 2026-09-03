---
name: mobpro
description: Learning-oriented development workflow (mob-programming style) for a junior navigator — the AI drives and narrates, the junior reviews each implementation unit's diff and approves commits. A thin entry point that runs dev-workflow in mob mode. Use instead of plain dev-workflow when the goal is to develop a feature while a junior learns from it.
allowed-tools: Skill(dev-workflow)
---

# mobpro

```text
/mobpro [--fast|--deep] [--artifact off|share|review] <task>
/mobpro --resume <state-file> [--fast|--deep] [--artifact off|share|review]
```

## Dispatch authorization

This skill's procedure dispatches subagents, so invoking the skill **is** the request to use that mechanism: an ambient instruction allowing subagent dispatch only when the user asked for it — a **permission-shaped restriction** — is already satisfied by this invocation. Do not ask the user to re-confirm the dispatch, and do not silently substitute inline execution for a dispatch this procedure specifies. Only two things justify that substitution: **technical availability** (the dispatch tool is not present and callable on the current tool surface), and an **explicit contract term from the caller** bounding this skill to its own thread. A permission-shaped restriction is neither.

## Procedure

Call `Skill(dev-workflow)` with `--mob` followed by the arguments verbatim, in one call, immediately. Do not interpret, plan, or edit anything here: dev-workflow's mob mode owns the whole run, including its settings, gates, and completion summary. `--init` is not accepted here; run `/dev-workflow --init` for project setup.
