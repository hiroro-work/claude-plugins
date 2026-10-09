# demo

Turns a web feature built in this session into a demo: a page of normal and error cases grouped by feature, each step with the action, the expected result, what the page showed and a screenshot, published as an artifact, plus a screen recording with chapter cards. The skill starts the app itself, shows the steps for approval, drives the browser with `playwright-cli` in one subagent, and stops the app when it is done.

The page serves two readers. Someone who wants the gist reads the summary at the top and the normal cases. Someone who wants everything sees, per feature, how many error cases were not confirmed and opens those. A `🎬 m:ss` link beside each feature and step moves the recording on the page to that moment.

```text
/demo                                   # steps from the uncommitted diff
/demo --plan .claude/plans/<slug>.md    # steps from the plan and the diff
/demo --base main --lang en --model opus
/demo --init                            # Setup mode only: propose and write the settings
```

From a dev-workflow run, the Update Rules gate asks `demo` / `no-demo` only in a project that has `.claude/demo.md` or `.claude/demo.local.md`, and `demo` runs this skill with the run's plan and base commit. Run `/demo --init` once to set a project up; a project without settings never sees the question. A direct `/demo` run without settings still enters Setup mode by itself and continues into the demo (see § Setup mode).

## How it works

1. Reads `.claude/demo.md` and `.claude/demo.local.md` (Setup mode proposes them when neither exists, see below).
2. Groups the change into features, the actions a checker performs in a row for one purpose, and derives from the plan's After, Scope and Test plan and from the diff 3–10 normal-case steps plus one error-case step per branch the diff implements (input validation, permissions, behavior that depends on state). The steps run every normal case first, then every error case. Each step names the data it needs. Records created on screen get unique values (a timestamp in the email address, for example), so a second capture does not collide with the first. Sign-in is a step only when the diff changes sign-in; otherwise it happens before the capture.
3. Starts the app: picks a free port (or the configured one), runs `reset_command`, runs `start_command` with `DEMO_PORT` in the environment, resolves the URL, and waits until it answers. A start that times out shows the log and asks `retry` / `skip`. Once the app answers, it signs in when the pages need it (keeping the session for the capture), opens each step's page once and adds an insertion script for any data the page shows to be missing.
4. Shows the URL, the features, the step table with normal and error cases, every data script and what the data check found, and asks `approve` / `revise` / `skip`. `revise` can drop error cases; more than 10 of them come with a count and a time estimate. It also asks whether a step that fails for missing data may get an extra insertion script and the flow be captured once more. After that nothing else asks a question.
5. Opens the browser, starts the recording, and hands the steps to one subagent. It shows an opening card, a normal-cases card, a card per feature and per step, an error-cases card and a closing card, and records each card's position in seconds. Per step it takes a snapshot, performs the action, writes what the page showed, checks it against the expected result and takes a screenshot, and marks each failed step as a data or an app problem.
6. Stops the recording and the browser. When re-capture was allowed and a step failed for missing data, it writes an insertion script for that step and captures the whole flow once more, with the app still running. Then it stops the app.
7. Renders `index.html`: a summary table with one row per feature, then per feature its normal cases and its error cases folded away (open when one is not confirmed), with open-all / close-all buttons and the chapter links. Publishes it with the screenshots (and the recording when it is 15MB or smaller, the artifact file limit; a larger recording stays out of the page) as an artifact. `confirmed` / `not confirmed` say whether the page matched the expected result; whether that result is right is the reader's call.

## Settings

`.claude/demo.md` is shared by the team and committed; `.claude/demo.local.md` is personal and gitignored. Both hold YAML frontmatter only. The local file overrides the shared one key by key, and a `null` or empty value in it clears the key.

| Key | Default | Meaning |
|---|---|---|
| `start_command` | required | Starts the app. Runs as `DEMO_PORT=<port> <start_command>`; the app should listen on `DEMO_PORT` |
| `reset_command` | none | Runs once before the start, with the same `DEMO_PORT`. Resets a throwaway environment |
| `url` | none | A URL (`http://` / `https://`, `${VAR}` expanded from the environment plus `DEMO_PORT`), or a command whose first stdout line is the URL |
| `ready_timeout` | `120` | Seconds to wait for the URL to answer, at most 590 (the Bash tool's 600 s limit minus the 10 s the wait call adds) |
| `port` | none | Use this port as `DEMO_PORT` instead of a free one: a number (`${VAR}` expanded), or a command whose first stdout line is the port, run before the start as `DEMO_PORT=0 <port>` |
| `auth_state` | none | Storage state file loaded into the browser (`playwright-cli state-load`) |
| `error_cases` | `true` | `false` leaves the error-case steps out |
| `video` | `full` | `normal` stops the recording after the normal cases; the error cases are still captured and shown on the page |

```yaml
---
start_command: "pnpm dev"
reset_command: "pnpm db:seed"
url: "http://localhost:${DEMO_PORT}"
ready_timeout: 180
---
```

Without `url`, the first `http(s)://` URL printed by the app is used, then `http://localhost:<port>`. A wrong URL can be corrected at the step-table gate with `revise`.

When the project has a script that prints its port, a `port` command is usually enough and `url` can stay unset:

```yaml
---
start_command: "pnpm dev"
port: "node scripts/print-port.mjs --web"
---
```

### Setup mode

`/demo --init`, or a run when neither settings file exists, reads the project's package scripts, the end-to-end runner's web-server configuration, port scripts, emulator or container configurations and seed tasks, proposes the keys, tries them once, and shows the proposal for `approve` / `edit` / `cancel`. On `approve` it writes `.claude/demo.md` and adds `.demo/` and `.playwright-cli/` to `.gitignore` when they are not ignored yet. `--init` stops there; a plain run continues into the demo. With `--init` and a settings file already present, nothing is written. Outside Setup mode the skill never edits `.gitignore`; it only reports when those paths are not ignored.

## Output

Everything goes under `.demo/<slug>/` at the repository root: `step-NN.png`, `demo.webm`, `steps.json`, `server.log`, `index.html`. `<slug>` is the plan file's name, or a timestamp without a plan. `steps.json` holds the features (name, description, chapter positions) and, per step, its feature, its kind (`normal` / `error`), what the page showed (`result`) and its position in the recording in seconds (`at`). When the skill signs in itself, `auth.json` keeps that session for the capture; it holds cookies. The directory is meant to be gitignored; the skill never commits it. `playwright-cli` also writes its snapshots to `.playwright-cli/` in the working directory.

## Requirements

- `@playwright/cli` 0.1.21 or newer on `PATH` as `playwright-cli` (`npm i -g @playwright/cli@latest`, or the Homebrew formula). Verified with 0.1.21 and 0.1.22. An older version (such as 0.1.1, whose `--version` prints a `1.59.0-alpha…` string) still works, but records without chapters, cursor or action callouts (the file name is given at `video-stop` there). Check with `which -a playwright-cli`: an old global install earlier on `PATH` hides a newer one.
- The `Artifact` tool for publishing. Without it the page stays at `.demo/<slug>/index.html` and its path is reported.
- The `Agent` tool. Without it the main thread drives the browser itself.

## Permissions

The configured commands run as `DEMO_PORT=<port> <command>`. The skill pre-authorizes that shape for common runners: pnpm, npm, yarn, bun, make, bundle exec, rails, python, uv run, docker compose, go run, cargo run, node. Any other command (for example a `url` command starting with `echo`) asks for permission once per run. `lsof` and `kill` are authorized so the skill can stop the server it started; a security scan may flag them for that reason.

## Language

`--lang` or `Language:`, else the `language` key of `~/.claude/dev-workflow.local.md`, `.claude/dev-workflow.md`, `.claude/dev-workflow.local.md`, else `language` in `~/.claude/settings.json`, else `ja`.
