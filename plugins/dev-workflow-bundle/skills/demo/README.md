# demo

Turns a feature built in this session, in a web app, in a Chromium-based desktop app (Electron), or in a native mobile app on an iOS simulator or Android emulator, into a demo: a page of test cases grouped by feature, published as an artifact. Each test case says in one sentence what it checks, and carries its precondition, its own screen recording and its steps — the action, the expected result, what the page showed and a screenshot. The skill starts the app itself, shows the test cases for approval, drives the browser with `playwright-cli` (or the app with `agent-device`) in one subagent, and stops the app when it is done.

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
2. Groups the change into features, the actions a checker performs in a row for one purpose, and derives test cases from the plan's After, Scope and Test plan and from the diff: each feature's main normal flow (3–10 normal steps in all), and one error case per branch the diff implements (input validation, permissions, behavior that depends on state). Each test case has a precondition and the setup actions that reach it from where the case reset leaves the app (a fresh, signed-out browser, the reset windows or the restarted app, unless `case_reset` says otherwise). Data comes from the seed or fixtures the guide names where it can, from the screen where an earlier step creates it, and from a one-line insertion script written the way the guide says otherwise. A value that can be taken only once, such as a confirmation code, is saved by the step that takes it and reused by later steps. Records created on screen get unique values (a timestamp in the email address, for example), so a second capture does not collide with the first.
3. Starts the app: picks a free port (or the configured one), runs `reset_command`, runs `start_command` with `DEMO_PORT`, `DEMO_BASE_REF` and `DEMO_CHANGED_FILES` in the environment and its stdin held open (some launchers, electron-forge among them, exit before starting the app once stdin is closed), resolves the URL (re-running a `url` command until it prints one), and waits until it answers. A start that times out shows the log and asks `retry` / `skip`. Before the app is opened, it checks the records the steps rely on against the seed or fixture files the guide names. Once the app answers (with `target: ios` / `android`, it opens the app with `agent-device` instead, booting the simulator or emulator when needed, and reads the first screen only), it opens each step's page once, tries each kind of setup once (with `target: cdp`, it attaches and reads the windows the steps name, performing no setup), and adds an insertion script for any data the page shows to be missing.
4. Shows the URL, the features, the test cases, the step table, each step whose path carries a state no on-screen operation could produce, every data script and what the data check found, and asks `approve` / `revise` / `skip`. `revise` can drop error cases; more than 10 of them come with a count and a time estimate. It also asks whether a test case that fails for missing data or for how its steps were written may be corrected and captured again.
5. Hands the test cases to one subagent. For each case it opens a fresh browser (with `target: cdp`, it attaches to the running app; with `target: ios` / `android`, it opens the app with `agent-device`), runs the case reset (`case_reset`; the built-in one clears and reloads the windows with `target: cdp`, and restarts the app with `--relaunch` with `target: ios` / `android`), performs the setup, starts that case's recording with a title card (none with `ios` / `android`, where the recording is `.mp4`), then per step takes a snapshot, performs the action and takes a screenshot in the same command line, writes what the page showed, checks it against the expected result (from the screenshot when the snapshot does not show it), and finally stops the recording and closes the browser (with `ios` / `android`, the skill closes the `agent-device` session after the last case). A message shown only briefly may still be missed: a `playwright-cli` click can take several seconds to return, and a message gone by then is not in the screenshot. A failed step is marked as missing data, a problem with how the steps were written, or the app behaving differently from the expected result.
6. When re-capture was allowed, corrects the test cases that failed for missing data or for how their steps were written and captures only those again, at most twice. If any step still fails, it shows those steps with their screenshots before publishing and asks `publish` (as not confirmed) / `revise` (correct and capture those cases again) / `stop`. Then it stops the app: `stop_command` first when it is set, then everything `start_command` started, then whatever still listens on the port.
7. Renders `index.html` and publishes it with the screenshots and each case's recording (when it is 15MB or smaller, the artifact file limit; a larger recording stays out of the page) as an artifact. `confirmed` / `not confirmed` say whether the page matched the expected result; whether that result is right is the reader's call.
8. Offers to grow the data guide: what this run used that the guide does not state yet, as one or two lines each, appended to the settings file on `yes`; and, when the guide names a seed file, a diff adding the records the normal cases' scripts inserted, applied on `apply` (`decline` leaves the seed alone). A credential-like value is replaced by where it comes from. Neither edit is committed; the report and the return value name the files touched. A run with nothing new to offer asks nothing.

## Settings

`.claude/demo.md` is shared by the team and committed; `.claude/demo.local.md` is personal and gitignored. Both hold YAML frontmatter and, after it, an optional Markdown body. For the keys, the local file overrides the shared one key by key, and a `null` or empty value in it clears the key.

The bodies, shared then local, form the **data guide**: prose saying where the seed or fixture files are, which accounts and main records they hold, and how one shell command line inserts a record the seed lacks. The skill reads it before deriving the test cases and before checking data, so it does not search the project for this on every run. Name where a credential comes from (a seed file, the local body, `auth_state`) rather than writing it in the shared file; a personal credential or a personal insertion command belongs in the local body.

| Key | Default | Meaning |
|---|---|---|
| `target` | `web` | `web`: a browser the skill opens. `cdp`: a Chromium-based desktop app that exposes a DevTools endpoint on `DEMO_PORT`; the skill attaches to it instead of opening a browser (see § Desktop apps over CDP (Electron)). `ios` / `android`: a native app on a simulator or emulator, driven with `agent-device` (see § Native mobile apps (iOS simulator / Android emulator)). Any other value counts as `web` |
| `attach` | none | `cdp`, with `target` unset: the same as `target: cdp` (settings written for 1.3.0 need no change). Otherwise ignored |
| `app` | none | With `ios` / `android`: the bundle identifier or package name `agent-device open` takes (required). No meaning with `web` / `cdp` |
| `device` | none | With `ios` / `android`: the device selector `agent-device` takes, verbatim (`--udid <id>`, `--device <name>` or `--serial <id>`). Unset: the booted device of that platform; several booted ones fail the start. No meaning with `web` / `cdp` |
| `start_command` | required with `web` / `cdp` | Starts the app, under `sh -c` with the environment below and its stdin held open, with `${DEMO_PORT}` in the command text replaced by the port first. A local app listens on `DEMO_PORT`; a remote target names its URL in `url`. Optional with `ios` / `android` |
| `reset_command` | none | Runs once before the start, with the same environment and the same replacement. Resets a throwaway environment |
| `stop_command` | none | Runs once, in the foreground, when the demo is done, before the process group and port kills, with the same environment. Stops or cleans up what `start_command` created, with the same replacement. Bounded by `ready_timeout` |
| `case_reset` | unset | What runs before each test case's setup. Unset: the built-in reset (`web`: a fresh browser; `cdp`: every window's storage and cookies cleared and reloaded; `ios` / `android`: the app restarted with its data kept). `none`: nothing (with `web` the same as unset; with `ios` / `android` the app opened again without `--relaunch`). Anything else: a shell command line run with the environment below and `DEMO_SESSION` (the `playwright-cli` or `agent-device` session the command can drive) exported; a non-zero exit fails the case like a failed setup action |
| `url` | none | A URL (`http://` / `https://`, `${VAR}` expanded from the environment plus `DEMO_PORT`), or a command re-run until it exits zero and prints the URL on its first non-empty stdout line, within `ready_timeout`. With `target: cdp`, only a URL: the endpoint's origin. No meaning with `ios` / `android` |
| `ready_timeout` | `120` | Seconds to wait for the URL to resolve and answer, or for `agent-device open` to return, at most 590 (the Bash tool's 600 s limit minus the 10 s the wait call adds) |
| `port` | none | Use this port as `DEMO_PORT` instead of a free one: a number (`${VAR}` expanded), or a command whose first stdout line is the port, run before the start with `DEMO_PORT=0`. With `ios` / `android` it only expands `${DEMO_PORT}` and names what to stop |
| `auth_state` | none | Storage state file loaded with `playwright-cli state-load` after the browser opens or, with `target: cdp`, right after attaching and before the case's setup (over CDP its cookies are loaded, not its localStorage). No meaning with `ios` / `android` |
| `error_cases` | `true` | `false` leaves the error test cases out |
| `video` | `full` | `normal` records only the normal test cases; the error cases still get their screenshots |

Every configured command sees three variables: `DEMO_PORT` (the port; `0` for the `port` command), `DEMO_BASE_REF` (the git ref the change is taken against, `HEAD` by default and in Setup mode's trial run) and `DEMO_CHANGED_FILES` (the path of a file under `.demo/<slug>/` listing the changed and new files, one per line). With `ios` / `android` they also see `DEMO_APP` (the `app` value) and `DEMO_TARGET` (`ios` or `android`). A start command in a monorepo can read the list to decide which package to serve.

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

### Desktop apps over CDP (Electron)

A Chromium-based desktop app (Electron, or another shell that accepts `--remote-debugging-port`) is driven through its DevTools endpoint instead of a browser the skill opens. Set `target: cdp` and start the app with `--remote-debugging-port=${DEMO_PORT}`; the skill waits until the endpoint's `/json/list` shows a window, attaches with `playwright-cli attach --cdp`, and stops the app by killing the process group `start_command` runs in and the process that holds the port. `url`, when set, is the endpoint's origin. One example, for a project started through electron-forge, which passes everything after `--` to the app:

```yaml
---
target: cdp
start_command: "pnpm start -- --remote-debugging-port=${DEMO_PORT} --user-data-dir=.demo/userdata"
---
The app keeps its sign-in and settings under `.demo/userdata`; delete the directory for a signed-out run.
```

What differs from a web app:

- A step's path names the **window** instead: a string the window's title or URL shows in `playwright-cli tab-list`. The capture agent switches windows with `tab-select`, and a window the previous action opened appears in that list.
- Each test case starts after the capture agent has cleared every window's localStorage, sessionStorage and cookies and reloaded it, unless `case_reset` says otherwise. State the app keeps outside its windows (its user data directory, a local database) is not cleared: it carries over between test cases like data an earlier case created, so the first case that needs it brings it about, and later cases say so in their precondition. The data guide says where that state lives and how a run starts with it fresh (a throwaway user data directory, a `reset_command` that deletes it), or that it is kept on purpose.
- An app whose `beforeunload` handler cancels the unload or closes the window cannot be reloaded. Set `case_reset: none` and give every run its fresh start as above, or write a `case_reset` command that resets through the app's own means.
- The data check after the start attaches, reads the windows the steps name, and performs no `setup`, so it does not change the running app's state. Data visible only after a `setup` is found at capture, and re-capture corrects it.
- `video-start` records every window, one file per window. The page shows the recording of the window the test case ran in.
- Under a strict Content Security Policy (`style-src 'self'`), the chapter cards and action callouts render as plain text; the cursor still shows. Relax the policy in development builds for full recordings.
- When the app exits at once and `server.log` holds a Node.js stack with `Cannot find module 'electron'`, the environment carries `ELECTRON_RUN_AS_NODE=1` (VS Code's extension host sets it). electron-forge removes it itself; a `start_command` that runs the shell directly needs to unset it, for example through the project's own start script.

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

The `url` command runs through `sh -c`, so write it in POSIX shell. Without `stop_command`, the stop kills what `start_command` started but leaves the environment it created in place. Browser settings such as HTTP credentials or a locale go in `.playwright/cli.config.json` at the project root, which `playwright-cli open` reads by itself.

### Native mobile apps (iOS simulator / Android emulator)

A native app (Swift, Kotlin, React Native, Expo, Flutter) on an iOS simulator or Android emulator is driven with `agent-device` instead of a browser. Set `target: ios` or `target: android` and `app` to the bundle identifier or package name; `device` picks the simulator or emulator when more than one is booted or bootable. `start_command` is optional: use it for Metro or a mock server the app talks to, or leave it out for an installed app. The skill opens the app with `agent-device open <app> --platform <target> <device> --relaunch` (booting the device when needed), reads the first screen, and hands the test cases to the capture agent. One example, for a React Native project whose debug build is already installed on the simulator:

```yaml
---
target: ios
app: jp.example.app.debug
device: "--udid <simulator udid>"
start_command: "yarn start"
ready_timeout: 300
---
Sign-in state stays in the app's own storage across test cases; a `case_reset` command such as `xcrun simctl` or `adb shell pm clear` clears it. The seed accounts are listed in `e2e/mockServer/`.
```

What differs from a web app:

- A step's path names the **screen** instead: a heading or a label `agent-device snapshot -i` shows on it. A screen is reached only through the case's setup actions and its earlier steps, never opened by hand; a deep link is an action like any other.
- Each test case starts after the app is restarted (`agent-device open --relaunch`); its data is kept. State the app keeps on the device (a signed-in session, local records) carries over between test cases like data an earlier case created, so the first case that needs it brings it about, and later cases say so in their precondition. A `case_reset` command can clear the app's storage before each case.
- The data check after the start reads the first screen only and performs no setup. Data visible only after a setup is found at capture, and re-capture corrects it.
- Recordings are `.mp4`, without title cards, cursor or action callouts; agent-device burns the taps in. On Android, `adb screenrecord` stops at 180 seconds and the recording comes back in several files; only the first is on the page, and the report says so. agent-device writes a `<id>.gesture-telemetry.json` beside each recording.
- The stop closes the agent-device sessions but leaves the simulator or emulator running. The first `open` that boots a simulator can take a minute or two; `ready_timeout: 300` leaves room for it.

### Setup mode

`/demo --init`, or a run when neither settings file exists, reads the project's package scripts, the end-to-end runner's web-server configuration, port scripts, emulator or container configurations, a desktop shell dependency and its launcher, seed tasks and the seed or fixture files they load, proposes the keys (including `target: cdp` for a desktop app, and `case_reset: none` when its windows cancel the unload) and drafts the data guide, tries the keys once, and shows the proposal for `approve` / `edit` / `cancel`. On `approve` it writes `.claude/demo.md` and adds `.demo/` and `.playwright-cli/` to `.gitignore` when they are not ignored yet. `--init` stops there; a plain run continues into the demo. With `--init` and a settings file already present, nothing is written. Outside Setup mode the skill never edits `.gitignore`; it only reports when those paths are not ignored.

## Output

Everything goes under `.demo/<slug>/` at the repository root: `step-NN.png`, one `<case id>.webm` (`.mp4` with `ios` / `android`) per recorded test case, values saved by steps under `values/`, `steps.json`, `start-command` (the `start_command` text the run started, with `start-command.pgid` naming its process group while it runs), `server.log`, `index.html`. `<slug>` is the plan file's name, or a timestamp without a plan. `steps.json` holds the features, the test cases (id, feature, kind, title, precondition, video) and the steps (test case, action, expected result, what the page showed, status, screenshot). The directory is meant to be gitignored; the skill never commits it. `playwright-cli` also writes its snapshots to `.playwright-cli/` in the working directory.

## Requirements

- `@playwright/cli` 0.1.21 or newer on `PATH` as `playwright-cli` (`npm i -g @playwright/cli@latest`, or the Homebrew formula). Verified with 0.1.21 and 0.1.22. An older version (such as 0.1.1, whose `--version` prints a `1.59.0-alpha…` string) still works, but records without title cards, cursor or action callouts (the file name is given at `video-stop` there). Check with `which -a playwright-cli`: an old global install earlier on `PATH` hides a newer one.
- `agent-device` 0.21.25 or newer on `PATH` for `ios` / `android` (`npm i -g agent-device@latest`; Node.js 22.12 or newer), with Xcode for iOS simulators and the Android SDK with `adb` for emulators. `agent-device doctor` checks them. Verified with 0.21.25.
- The `Artifact` tool for publishing. Without it the page stays at `.demo/<slug>/index.html` and its path is reported.
- The `Agent` tool. Without it the main thread drives the browser (or the app) itself.

## Permissions

The configured commands run as `DEMO_PORT=<port> DEMO_BASE_REF=<ref> DEMO_CHANGED_FILES=<path> <command>` (with `ios` / `android`, `DEMO_APP` and `DEMO_TARGET` follow). `start_command` runs through the skill's own `node` script in that shape, so it asks for no permission of its own, whatever it contains. For the other commands the skill pre-authorizes that shape for common runners: pnpm, npm, yarn, bun, make, bundle exec, rails, python, uv run, docker compose, go run, cargo run, node. Any other command asks for permission once per run. `lsof` and `kill` are authorized so the skill can stop the server it started; a security scan may flag them for that reason. A `url` command runs inside `scripts/wait-ready.mjs`, under the `node` permission, so it is not asked for. A `case_reset` command runs inside the capture agent and may ask for permission once per run. `playwright-cli` and `agent-device` are authorized for the main thread (the start, the data check and the stop); the capture agent runs them inside the subagent.

## Language

`--lang` or `Language:`, else the `language` key of `~/.claude/dev-workflow.local.md`, `.claude/dev-workflow.md`, `.claude/dev-workflow.local.md`, else `language` in `~/.claude/settings.json`, else `ja`.
