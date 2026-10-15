# demo

Turns a web feature built in this session into a demo: a page of test cases grouped by feature, published as an artifact. Each test case says in one sentence what it checks, and carries its precondition, its own screen recording and its steps — the action, the expected result, what the page showed and a screenshot. The skill starts the app itself, shows the test cases for approval, drives the browser with `playwright-cli` in one subagent, and stops the app when it is done.

The page opens with a contents list: per feature, its test cases with confirmed / not confirmed. Choosing one opens that test case. Only the first feature's main normal case starts open, so someone who wants the gist reads that one, and someone who wants everything walks the list.

```text
/demo                                   # steps from the uncommitted diff
/demo --plan .claude/plans/<slug>.md    # steps from the plan and the diff
/demo --base main --lang en --model opus
/demo --init                            # Setup mode only: propose and write the settings
```

From a dev-workflow run, the Update Rules gate asks `demo` / `no-demo` only in a project that has `.claude/demo.md` or `.claude/demo.local.md`, and `demo` runs this skill with the run's plan and base commit. Run `/demo --init` once to set a project up; a project without settings never sees the question. A direct `/demo` run without settings still enters Setup mode by itself and continues into the demo (see § Setup mode).

## How it works

1. Reads `.claude/demo.md` and `.claude/demo.local.md` (Setup mode proposes them when neither exists, see below), including their body, the data guide, and the seed or fixture files it names.
2. Groups the change into features, the actions a checker performs in a row for one purpose, and derives test cases from the plan's After, Scope and Test plan and from the diff: each feature's main normal flow (3–10 normal steps in all), and one error case per branch the diff implements (input validation, permissions, behavior that depends on state). Each test case has a precondition and the setup actions that reach it from a fresh, signed-out browser. Data comes from the seed or fixtures the guide names where it can, from the screen where an earlier step creates it, and from a one-line insertion script written the way the guide says otherwise. A value that can be taken only once, such as a confirmation code, is saved by the step that takes it and reused by later steps. Records created on screen get unique values (a timestamp in the email address, for example), so a second capture does not collide with the first.
3. Starts the app: picks a free port (or the configured one), runs `reset_command`, runs `start_command` with `DEMO_PORT`, `DEMO_BASE_REF` and `DEMO_CHANGED_FILES` in the environment, resolves the URL (re-running a `url` command until it prints one), and waits until it answers. A start that times out shows the log and asks `retry` / `skip`. Before the app is opened, it checks the records the steps rely on against the seed or fixture files the guide names. Once the app answers, it opens each step's page once, tries each kind of setup once, and adds an insertion script for any data the page shows to be missing.
4. Shows the URL, the features, the test cases, the step table, each step whose path carries a state no on-screen operation could produce, every data script and what the data check found, and asks `approve` / `revise` / `skip`. `revise` can drop error cases; more than 10 of them come with a count and a time estimate. It also asks whether a test case that fails for missing data or for how its steps were written may be corrected and captured again.
5. Hands the test cases to one subagent. For each case it opens a fresh browser, performs the setup, starts that case's recording with a title card, then per step takes a snapshot, performs the action, writes what the page showed, checks it against the expected result and takes a screenshot, and finally stops the recording and closes the browser. A failed step is marked as missing data, a problem with how the steps were written, or the app behaving differently from the expected result.
6. When re-capture was allowed, corrects the test cases that failed for missing data or for how their steps were written and captures only those again, at most twice. If any step still fails, it shows those steps with their screenshots before publishing and asks `publish` (as not confirmed) / `revise` (correct and capture those cases again) / `stop`. Then it stops the app: `stop_command` first when it is set, then the process listening on the port.
7. Renders `index.html` and publishes it with the screenshots and each case's recording (when it is 15MB or smaller, the artifact file limit; a larger recording stays out of the page) as an artifact. `confirmed` / `not confirmed` say whether the page matched the expected result; whether that result is right is the reader's call.
8. Offers to grow the data guide: what this run used that the guide does not state yet, as one or two lines each, appended to the settings file on `yes`; and, when the guide names a seed file, a diff adding the records the normal cases' scripts inserted, applied on `apply` (`decline` leaves the seed alone). A credential-like value is replaced by where it comes from. Neither edit is committed; the report and the return value name the files touched. A run with nothing new to offer asks nothing.

## Settings

`.claude/demo.md` is shared by the team and committed; `.claude/demo.local.md` is personal and gitignored. Both hold YAML frontmatter and, after it, an optional Markdown body. For the keys, the local file overrides the shared one key by key, and a `null` or empty value in it clears the key.

The bodies, shared then local, form the **data guide**: prose saying where the seed or fixture files are, which accounts and main records they hold, and how one shell command line inserts a record the seed lacks. The skill reads it before deriving the test cases and before checking data, so it does not search the project for this on every run. Name where a credential comes from (a seed file, the local body, `auth_state`) rather than writing it in the shared file; a personal credential or a personal insertion command belongs in the local body.

| Key | Default | Meaning |
|---|---|---|
| `start_command` | required | Starts the app, with the environment below. A local app listens on `DEMO_PORT`; a remote target names its URL in `url` |
| `reset_command` | none | Runs once before the start, with the same environment. Resets a throwaway environment |
| `stop_command` | none | Runs once, in the foreground, when the demo is done, before the port kill, with the same environment. Stops or cleans up what `start_command` created. Bounded by `ready_timeout` |
| `url` | none | A URL (`http://` / `https://`, `${VAR}` expanded from the environment plus `DEMO_PORT`), or a command re-run until it exits zero and prints the URL on its first non-empty stdout line, within `ready_timeout` |
| `ready_timeout` | `120` | Seconds to wait for the URL to resolve and answer, at most 590 (the Bash tool's 600 s limit minus the 10 s the wait call adds) |
| `port` | none | Use this port as `DEMO_PORT` instead of a free one: a number (`${VAR}` expanded), or a command whose first stdout line is the port, run before the start with `DEMO_PORT=0` |
| `auth_state` | none | Storage state file loaded into the browser (`playwright-cli state-load`) |
| `error_cases` | `true` | `false` leaves the error test cases out |
| `video` | `full` | `normal` records only the normal test cases; the error cases still get their screenshots |

Every configured command sees three variables: `DEMO_PORT` (the port; `0` for the `port` command), `DEMO_BASE_REF` (the git ref the change is taken against, `HEAD` by default and in Setup mode's trial run) and `DEMO_CHANGED_FILES` (the path of a file under `.demo/<slug>/` listing the changed and new files, one per line). A start command in a monorepo can read the list to decide which package to serve.

```yaml
---
start_command: "pnpm dev"
reset_command: "pnpm db:seed"
url: "http://localhost:${DEMO_PORT}"
ready_timeout: 180
---
The seed is `db/seed.ts`; `pnpm db:seed` loads it. It holds the admin `admin@example.com` (password in the seed file) and three sample projects.
A missing record: `pnpm tsx scripts/insert.ts '<json>'` inserts one row from a JSON object.
```

Without `url`, the first `http(s)://` URL printed by the app is used, then `http://localhost:<port>`. A wrong URL can be corrected at the step-table gate with `revise`.

When the project has a script that prints its port, a `port` command is usually enough and `url` can stay unset:

```yaml
---
start_command: "pnpm dev"
port: "node scripts/print-port.mjs --web"
---
```

### Remote targets

When the app does not listen on a local port (a throwaway environment created for the run, a preview deployment), `start_command` creates it, a `url` command prints its URL once it exists, and `stop_command` removes it. The URL may carry a base path; each step's path is appended to it.

```yaml
---
start_command: "pnpm run demo:up"
url: "cat .demo/url.txt"
stop_command: "pnpm run demo:down"
ready_timeout: 300
auth_state: ".demo/auth.json"
---
```

The `url` command runs through `sh -c`, so write it in POSIX shell. Without `stop_command`, the process `start_command` started is left running when the target is remote, and the report says so. Browser settings such as HTTP credentials or a locale go in `.playwright/cli.config.json` at the project root, which `playwright-cli open` reads by itself.

### Setup mode

`/demo --init`, or a run when neither settings file exists, reads the project's package scripts, the end-to-end runner's web-server configuration, port scripts, emulator or container configurations, seed tasks and the seed or fixture files they load, proposes the keys and drafts the data guide, tries the keys once, and shows the proposal for `approve` / `edit` / `cancel`. On `approve` it writes `.claude/demo.md` and adds `.demo/` and `.playwright-cli/` to `.gitignore` when they are not ignored yet. `--init` stops there; a plain run continues into the demo. With `--init` and a settings file already present, nothing is written. Outside Setup mode the skill never edits `.gitignore`; it only reports when those paths are not ignored.

## Output

Everything goes under `.demo/<slug>/` at the repository root: `step-NN.png`, one `<case id>.webm` per recorded test case, values saved by steps under `values/`, `steps.json`, `server.log`, `index.html`. `<slug>` is the plan file's name, or a timestamp without a plan. `steps.json` holds the features, the test cases (id, feature, kind, title, precondition, video) and the steps (test case, action, expected result, what the page showed, status, screenshot). The directory is meant to be gitignored; the skill never commits it. `playwright-cli` also writes its snapshots to `.playwright-cli/` in the working directory.

## Requirements

- `@playwright/cli` 0.1.21 or newer on `PATH` as `playwright-cli` (`npm i -g @playwright/cli@latest`, or the Homebrew formula). Verified with 0.1.21 and 0.1.22. An older version (such as 0.1.1, whose `--version` prints a `1.59.0-alpha…` string) still works, but records without title cards, cursor or action callouts (the file name is given at `video-stop` there). Check with `which -a playwright-cli`: an old global install earlier on `PATH` hides a newer one.
- The `Artifact` tool for publishing. Without it the page stays at `.demo/<slug>/index.html` and its path is reported.
- The `Agent` tool. Without it the main thread drives the browser itself.

## Permissions

The configured commands run as `DEMO_PORT=<port> DEMO_BASE_REF=<ref> DEMO_CHANGED_FILES=<path> <command>`. The skill pre-authorizes that shape for common runners: pnpm, npm, yarn, bun, make, bundle exec, rails, python, uv run, docker compose, go run, cargo run, node. Any other command asks for permission once per run. `lsof` and `kill` are authorized so the skill can stop the server it started; a security scan may flag them for that reason. A `url` command runs inside `scripts/wait-ready.mjs`, under the `node` permission, so it is not asked for.

## Language

`--lang` or `Language:`, else the `language` key of `~/.claude/dev-workflow.local.md`, `.claude/dev-workflow.md`, `.claude/dev-workflow.local.md`, else `language` in `~/.claude/settings.json`, else `ja`.
