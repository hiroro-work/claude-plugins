# Setup mode

Read from `SKILL.md` § Settings when neither `.claude/demo.md` nor `.claude/demo.local.md` exists, or when `--init` was given. With `--init` and a settings file present, stop before reading the project: `status: "skipped"`, `reason: "settings exist"`. Unqualified `§` references point into this file.

## Read the project

Look for how the project is started and seeded, reading only what exists:

- the package manifest's scripts (dev, start, seed, reset, emulator-style entries)
- the end-to-end test runner's configuration, where a web-server block names a start command, a URL, a port or a timeout
- scripts that compute or print ports
- emulator or container configurations that expose ports
- seed or reset tasks, and the seed or fixture files they load: read the parts that name accounts and records

From these, propose `start_command` and, when the project gives them, `url`, `reset_command`, `port` and `ready_timeout`. When a script prints the port, propose it as the `port` command rather than wrapping it in a `url` command; `url` can then stay unset. Prefer a command that already takes its port from the environment; otherwise note in the proposal that the app may ignore `DEMO_PORT`.

## Draft the data guide

From the seed or fixture files, draft the body of `.claude/demo.md` as `SKILL.md` § Settings defines the data guide, in the resolved language. For the insertion command, use the project's own seeding mechanism when it takes a record from the command line, otherwise the closest one-line form the project offers. When the project has neither seed nor fixtures, the body is one line saying so and that a seed would let demo reuse records across runs; this skill neither chooses nor creates a seeding mechanism.

## Trial run

`<slug>` is `setup` here: run `mkdir -p .demo/setup`, then run `SKILL.md` § Procedure step 4 (Start the app) once with the proposed keys and check that the resolved URL answers, then run `SKILL.md` § Procedure step 7 (Stop the app). The trial opens no start-failure gate: a timeout is recorded as the outcome. Keep the outcome: whether the URL answered, and the last 20 lines of `server.log` when it did not.

## Setup gate

USER GATE. Show the file that would be written as one block, the YAML frontmatter of the proposed keys followed by the data guide body, then the trial's outcome, and ask `approve` / `edit` / `cancel`. `edit` takes the user's changes to the keys or to the body and shows the block again (the trial is not repeated). `cancel` stops with `status: "skipped"`, `reason: "setup declined"`.

## Write

On `approve`: `Read` `.claude/demo.md` once more. If it now exists, stop with `status: "error"`, `reason: "setup conflict"`; never overwrite. Otherwise `Write` the file: the frontmatter, then the data guide body. Then run `git check-ignore .demo .playwright-cli`; for each path missing from its output, append the line `.demo/` or `.playwright-cli/` to `.gitignore` (`Edit`, or `Write` when there is no `.gitignore`). `.claude/demo.local.md` is not created. With `--init`, report the written file and stop with `status: "ok"`, `cases` / `steps` / `failed` at `0` and `edited` at `[]`. Otherwise continue at `SKILL.md` § Procedure step 2 (Inputs) with the written file as the settings and the guide.
