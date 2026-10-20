# Setup mode

Read from `SKILL.md` § Settings when neither `.claude/demo.md` nor `.claude/demo.local.md` exists, or when `--init` was given. With `--init` and a settings file present, stop before reading the project: `status: "skipped"`, `reason: "settings exist"`. Unqualified `§` references point into this file.

## Read the project

Look for how the project is started and seeded, reading only what exists:

- the package manifest's scripts (dev, start, seed, reset, emulator-style entries)
- the end-to-end test runner's configuration, where a web-server block names a start command, a URL, a port or a timeout
- scripts that compute or print ports
- emulator or container configurations that expose ports
- seed or reset tasks, and the seed or fixture files they load: read the parts that name accounts and records
- the package manifest's dependency on a Chromium-based desktop shell, and the launcher its scripts start it with
- a native mobile layout: an `ios/` directory holding a `*.xcodeproj`, an `android/app/build.gradle` (or `.gradle.kts`), a `pubspec.yaml`, an `app.json` with an `expo` key, a `*.xcodeproj` at the root (a native iOS app), an `app/build.gradle` at the root (a native Android app)
- the end-to-end runner's device and app configuration (a `.detoxrc.*` file or a `detox` key: each app's `binaryPath` and `build`, each device's `type` or `avdName`)
- the configuration that decides which server each build or environment talks to (a config module's server URL and the condition that switches it), in files `git ls-files` lists: take only the server URLs and the conditions that switch them, never any other value (a key, a token)

From these, propose `start_command` and, when the project gives them, `url`, `reset_command`, `port`, `ready_timeout` and `stop_command` (only when the project names a stop or teardown command). When a script prints the port, propose it as the `port` command rather than wrapping it in a `url` command; `url` can then stay unset. Prefer a command that already takes its port from the environment; otherwise note in the proposal that the app may ignore `DEMO_PORT`.

A desktop shell gets `target: cdp`, and a `start_command` that hands the app `--remote-debugging-port=${DEMO_PORT}` the way its launcher passes arguments through (after a `--` when the launcher takes one, directly when the shell is started by itself). When the end-to-end tests start the app with a throwaway user data directory, propose the same argument with a path under `.demo/`. When the source the app's windows load has a `beforeunload` listener that cancels the unload (`Grep` for it and read the hit), propose `case_reset: none` together with the throwaway user data directory, and say in the proposal that a reload would be cancelled or would close the window, so each test case starts where the previous one left the app.

A native mobile layout gets a mobile target:

- `target`: `ios` when an iOS layout is among those found, otherwise `android`. When both layouts exist, the proposal names the other platform's `target` and `app` in one line, so `edit` can switch.
- `app`, by layout: an iOS layout — the `PRODUCT_BUNDLE_IDENTIFIER` of the app target's build configuration the candidate uses (`Debug` when it names none) in `project.pbxproj` (not a `Tests`, `tvOS` or extension target); an `app.json` with an `expo` key — its `expo.ios.bundleIdentifier` or `expo.android.package` (`app.config.*` when `app.json` lacks them); a `pubspec.yaml` layout — `ios/Runner.xcodeproj` the iOS way, `android/app/build.gradle` the Android way; an Android layout — `applicationId` in `android/app/build.gradle` (or `app/build.gradle` at the root), with the `applicationIdSuffix` of the candidate's build type (`debug` when it names none) appended when one is set. A value that holds `$(` or cannot be found is shown as `<write the bundle identifier>` and said in the proposal.
- `device`: `--device "<name>"` when the end-to-end runner names a simulator `type` or an `avdName` for the proposed platform, otherwise unset.
- `reset_command`: `(<build>) && agent-device install "$PWD/<binaryPath>" --platform <target> <device>`. `<build>` and `<binaryPath>` are the candidate's build command and binary path for the proposed platform, the first that applies:
  - the mock candidate (§ Connection candidates): the end-to-end runner's build command and binary path.
  - a real-server candidate: a manifest script that builds the candidate's configuration into a fixed output path, and that path; otherwise the end-to-end runner's build command and binary path, when both name the end-to-end configuration and the command builds nothing only the end-to-end tests use (a test package), with that name switched to the candidate's configuration in both and the environment assignments that point the build at the mock removed.

  Say in the proposal that a first build longer than `ready_timeout` is run by hand once before `--init`. When none applies, leave it unset and say in the proposal that the candidate's build has to be installed on the device before a run, naming the project's build-and-install script when there is one.
- `start_command`, for the candidate: the mock server the end-to-end setup starts, when the candidate is the mock (a global setup, a server module), in the closest one-line form the project offers (its own script when it has one; otherwise a `node -e` or `pnpm dlx tsx -e` line that imports the module and calls its start function); the manifest's `start` script when the candidate's build is a `Debug` configuration (`-configuration Debug`, `assembleDebug`, or a run script of the platform's own tooling); both joined with `&` when both apply; unset when neither applies.
- `port`: when that server listens on a fixed port built into the app, that number, so the stop finds it.
- `ready_timeout`: `300`.

## Connection candidates

A candidate is one server the app talks to during a run: the mock server the end-to-end setup starts, and each non-production server the configuration read above names (the staging server a development build uses by default). A production server is never a candidate. With a mobile target, a candidate also fixes the build: the end-to-end build for the mock, otherwise the build that uses that server. Each candidate's keys follow § Read the project for its build and its server, from what it already read.

For each candidate whose server URL is remote, run `node "<base dir>/scripts/wait-ready.mjs" --timeout 10 --url <server URL>` as its own Bash call. `ready` counts as reachable. On `timeout`, keep the reason: the last non-empty line of its stderr, cut to 80 characters, or `(no stderr)` when there is none. A local server counts as reachable.

The recommendation is the first that applies: a reachable real-server candidate (the one the development build uses by default, when several are reachable); the mock, when there is one; the real-server candidate the development build uses by default. Whether the project names an account for a server does not change it.

With no candidate (no mock and no non-production server configuration), skip this section and § Candidate gate; § Read the project alone gives the keys. With one candidate, take it without § Candidate gate.

## Candidate gate

USER GATE. For each candidate, show its name, its main keys (with a mobile target, `app` and its build; `start_command`), whether its server was reachable (with the reason when not), one line on what it shows well and one on what it cannot show, and mark the recommendation. The mock's lines say that its data is fixed and resets, and that only what the mock implements can be shown. A real server's lines say that the app's real behavior shows, that it needs the network and an account, and that what a run changes stays on that server. Ask for a candidate's name or `cancel`. `cancel` stops with `status: "skipped"`, `reason: "setup declined"`. Any other reply shows the candidates again and asks again. From here on, the proposed keys are the chosen candidate's.

## Draft the data guide

From the seed or fixture files, draft the body of `.claude/demo.md` as `SKILL.md` § Settings defines the data guide, in the resolved language. For the insertion command, use the project's own seeding mechanism when it takes a record from the command line, otherwise the closest one-line form the project offers. When the project has neither seed nor fixtures, the body is one line saying so and that a seed would let demo reuse records across runs; this skill neither chooses nor creates a seeding mechanism.

When the chosen candidate is a real server and the project names no account for it, draft an account section as the body of `.claude/demo.local.md`, and add one line to the shared body saying the account is in the local body. The section is one heading and two lines whose values are placeholders, in the resolved language: `## Sign-in account`, `- Identifier: <write the account identifier>`, `- Password: <write the password>` for `en`; `## サインイン用のアカウント`, `- 識別子: <識別子を書く>`, `- パスワード: <パスワードを書く>` for `ja`.

## Driver check

Before the trial, with `--init` too, run the driver check of `SKILL.md` § Procedure step 1 (Preconditions) for the proposed `<target>`; a failure stops before anything is written.

## Trial run

`<slug>` is `setup` here: run `mkdir -p .demo/setup`. Then run `SKILL.md` § Procedure step 4 (Start the app) once with the proposed keys, `Base ref` `HEAD`, and the change set read as `SKILL.md` § Procedure step 2 (Inputs) reads it. Check that readiness succeeds, then run `SKILL.md` § Procedure step 7 (Stop the app), which runs `stop_command` when proposed. The trial opens no start-failure gate: a timeout or any other wait failure is recorded as the outcome. Keep the outcome: whether the app was ready and, if not, the output the start-failure gate of `SKILL.md` § Procedure step 4 (Start the app) would show for the stage that failed.

## Setup gate

USER GATE. Show the file that would be written as one block, the YAML frontmatter of the proposed keys followed by the data guide body, then, when an account section was drafted, `.claude/demo.local.md` as a second block, then the trial's outcome, and ask `approve` / `edit` / `cancel`. With an account section, say that a password given through `edit` stays in the conversation, and that the placeholder can be approved and the password written into the file by hand afterwards; without `--init`, add that it has to be written before the step-table gate's `approve`, because a placeholder makes the capture's sign-in fail. `edit` takes the user's changes to the keys or to either body and shows the blocks again (the trial is not repeated). `cancel` stops with `status: "skipped"`, `reason: "setup declined"`.

## Write

On `approve`: `Read` `.claude/demo.md` once more, and `.claude/demo.local.md` too when an account section was drafted. If either now exists, stop with `status: "error"`, `reason: "setup conflict"`; never overwrite. Otherwise `Write` the file: the frontmatter, then the data guide body. With an account section, `Write` `.claude/demo.local.md`: an empty frontmatter (a `---` line followed by another `---` line), then that section. Then run `git check-ignore .demo .playwright-cli .claude/demo.local.md`; for each path missing from its output, append the line `.demo/`, `.playwright-cli/` or `.claude/demo.local.md` to `.gitignore` (`Edit`, or `Write` when there is no `.gitignore`). With `--init`, report the written files, and with an account section that its placeholders have to be filled before a run, and stop with `status: "ok"`, `cases` / `steps` / `failed` at `0` and `edited` at `[]`. Otherwise continue at `SKILL.md` § Procedure step 1 (Preconditions), at its driver check, with the written file as the settings and the guide.
