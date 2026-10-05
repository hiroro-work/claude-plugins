---
name: demo
description: Generate a demo of a web feature developed in this session — a page of numbered steps with a screenshot each, published as an artifact, plus a screen recording with chapters, driven by playwright-cli against the app the skill starts and stops itself. Use from dev-workflow's Update Rules gate (demo / no-demo) or standalone with /demo.
allowed-tools: Read, Write, Edit, Glob, Grep, Agent, Artifact, AskUserQuestion, Bash(playwright-cli *), Bash(node *), Bash(mkdir -p .demo/*), Bash(git check-ignore *), Bash(git diff *), Bash(git ls-files *), Bash(lsof -ti tcp:*), Bash(kill *), Bash(DEMO_PORT=* pnpm *), Bash(DEMO_PORT=* npm *), Bash(DEMO_PORT=* yarn *), Bash(DEMO_PORT=* bun *), Bash(DEMO_PORT=* make *), Bash(DEMO_PORT=* bundle exec *), Bash(DEMO_PORT=* rails *), Bash(DEMO_PORT=* python *), Bash(DEMO_PORT=* uv run *), Bash(DEMO_PORT=* docker compose *), Bash(DEMO_PORT=* go run *), Bash(DEMO_PORT=* cargo run *), Bash(DEMO_PORT=* node *)
---

# demo

```text
/demo [--plan <path>] [--base <ref>] [--lang ja|en] [--model <id>]
```

Invocation contract, as fields in the invocation text (a field counts as provided when its value is non-empty): `Plan:` (the plan document the feature was built from; optional), `Base ref:` (git ref the diff is taken against; default `HEAD`), `Language:` (optional, see § Language), `Model:` (optional, see § Model). The command-line flags map onto the same fields.

Everything the run produces goes under `.demo/<slug>/` at the repository root: the screenshots, the recording, `steps.json`, `server.log` and `index.html`. The directory is meant to be gitignored and is never committed by this skill.

## No-Stall Principle

The only paths that do not reach § Return contract with `status: "ok"`, each ending with the contract's JSON block: `playwright-cli --help video-chapter` exiting non-zero (`playwright-cli not installed`); a settings file that exists but cannot be read (`settings unreadable`); no `start_command` after the merge (`start_command unset`); `cancel` at the Setup gate (`setup declined`); `.claude/demo.md` appearing between the Setup gate and its write (`setup conflict`); neither a readable plan nor a diff (`nothing to demo`); `skip` at the start-failure gate (`dev server not ready`); `skip` at the step-table gate (`declined at step table`); the capture agent's second unparseable reply (`no parseable capture result`); a capture result that fails the schema check (`capture schema violation`); the renderer rejecting `steps.json` (`page rejected`). Once the app has been started, every one of these runs § Procedure step 7 (Stop the app) before emitting the block.

The capture agent's reply is a return value: judge it and issue the next tool call at once. Non-fatal outcomes are recorded and the run continues: a step marked `failed`, a missing recording, a missing or failing `Artifact` tool, `.demo/` or `.playwright-cli/` not gitignored, a process still listening after the stop.

## Settings

Two files, YAML frontmatter only: `.claude/demo.md` (shared by the team, committed) and `.claude/demo.local.md` (personal, gitignored). The local file overrides the shared one key by key; a `null` or empty value in the local file clears the key.

| Key | Default | Meaning |
|---|---|---|
| `start_command` | required | Starts the app. Runs as `DEMO_PORT=<port> <start_command>` in the background; the app is expected to listen on `DEMO_PORT` |
| `reset_command` | none | Runs once, in the foreground, before `start_command`, as `DEMO_PORT=<port> <reset_command>`. Resets a throwaway environment |
| `url` | none | Starting with `http://` or `https://`: the URL itself, with `${VAR}` expanded from the environment plus `DEMO_PORT`. Otherwise a command run after the start as `DEMO_PORT=<port> <url>`; the first line of its stdout is the URL |
| `ready_timeout` | `120` | Seconds to wait for the URL to answer, at most 590 |
| `port` | none | When set, used as `DEMO_PORT` instead of a free port found at run time |
| `auth_state` | none | Storage state file passed to `playwright-cli state-load` after the browser opens |

When neither file exists, read `references/setup-mode.md` and follow it. When a file exists but `Read` fails for any other reason, or when it cannot be told whether the file is missing or unreadable, stop with `status: "error"`, `reason: "settings unreadable: <path>"` rather than entering Setup mode. When the merge leaves no `start_command`, stop with `status: "error"`, `reason: "start_command unset"`.

## Language

`Language:` or `--lang`, when given, is the language and nothing is read. Otherwise resolve it by reading only the `language` key from the YAML frontmatter of `~/.claude/dev-workflow.local.md`, `.claude/dev-workflow.md` and `.claude/dev-workflow.local.md`, in that order, later files overriding earlier ones; a `null` or empty value clears it, and a missing file, or one without frontmatter, contributes nothing. If none sets it, take `language` from `~/.claude/settings.json`; otherwise use `ja`. The page's fixed labels, the step table and every line written for the user follow the resolved language.

## Model

`Model:` or `--model` is applied as the `model` parameter of the capture `Agent` dispatch. It is valid only if it is one of the ids the current `Agent` tool's `model` parameter accepts; check the tool's live schema in this session. A full `claude-*` id is not among its aliases and is invalid. An absent or invalid value is treated as `sonnet`.

## Dispatch authorization

This skill's procedure dispatches subagents, so invoking the skill **is** the request to use that mechanism: an ambient instruction allowing subagent dispatch only when the user asked for it — a **permission-shaped restriction** — is already satisfied by this invocation. Do not ask the user to re-confirm the dispatch, and do not silently substitute inline execution for a dispatch this procedure specifies. Only two things justify that substitution: **technical availability** (the dispatch tool is not present and callable on the current tool surface), and an **explicit contract term from the caller** bounding this skill to its own thread. A permission-shaped restriction is neither.

## Procedure

`<base dir>` is this skill's directory as the harness reported it when the skill loaded.

1. **Preconditions.** Run `playwright-cli --help video-chapter`. A non-zero exit stops with `status: "error"`, `reason: "playwright-cli not installed"`. When its output starts with `playwright-cli video-chapter`, `<chapters>` = `true`; otherwise `<chapters>` = `false` and say in one line that this version records without chapters, cursor or action callouts. Then resolve the settings per § Settings (Setup mode when neither file exists), the language per § Language and the model per § Model.

2. **Inputs.** With `Plan:`, `<slug>` is the file name without `.md`; `Read` the plan. When that `Read` fails, use the plan text when it is already in this conversation; otherwise say in one line that the steps come from the diff alone and continue. Without `Plan:`, `<slug>` is `<YYYYMMDD-HHMMSS>` of now. Read the change set against `Base ref` (default `HEAD`): `git diff <base>` and the content of files `git ls-files --others --exclude-standard` lists. No readable plan and an empty change set → `status: "error"`, `reason: "nothing to demo"`. Run `mkdir -p .demo/<slug>`.

3. **Derive the steps.** From the plan's After, Scope and Test plan and from the diff, write 3–10 steps in order. Each step holds: `n`, the page path, the action (one imperative sentence), the expected result (one sentence), and the data it needs — covered by the project's fixtures or seed, created on screen by an earlier step, or inserted by a script written here, in that order of preference. A script's full text goes into the step table so the gate shows it. Nothing is cleaned up afterwards.

4. **Start the app.** `<port>` is the `port` key or, when unset, the output of
   `node -e 'const s=require("net").createServer();s.listen(0,()=>{console.log(s.address().port);s.close()})'`.
   Say in one line which `reset_command` and `start_command` are about to run. When `reset_command` is set, run `DEMO_PORT=<port> <reset_command>` in the foreground; a non-zero exit goes to the start-failure gate below, which then shows the reset output instead of `server.log`. Run `DEMO_PORT=<port> <start_command> > .demo/<slug>/server.log 2>&1` with `run_in_background: true`. Resolve `<url>`: the `url` key (as § Settings says), else the first `http://` or `https://` URL in `server.log`, else `http://localhost:<port>`. Wait for it with
   `node -e 'const u=process.argv[1],t=Date.now()+Number(process.argv[2])*1000;(async()=>{for(;;){try{await fetch(u);console.log("ready");process.exit(0)}catch{}if(Date.now()>t){console.log("timeout");process.exit(1)}await new Promise(r=>setTimeout(r,2000))}})()' "<url>" <ready_timeout>`
   passing `timeout: (ready_timeout + 10) * 1000` on that Bash call. Any HTTP response counts as ready. On `timeout`, the **start-failure gate** (USER GATE): show the last 20 lines of `server.log` and `<port>`, and ask `retry` / `skip`. `retry` runs step 7 (Stop the app), then this step again from `reset_command`; there is no retry limit. `skip` runs step 7 and stops with `status: "skipped"`, `reason: "dev server not ready"`.

5. **Step-table gate** (USER GATE). Show `<url>`, whether `reset_command` ran, the step table (number, path, action, expected result, data), and every data script in full, in the resolved language. Ask `approve` / `revise` / `skip`. `revise` takes the user's corrections to the URL, the steps, the data or a script, applies them and shows the table again. `skip` runs step 7 and stops with `status: "skipped"`, `reason: "declined at step table"`. After `approve` nothing else asks the user a question.

6. **Capture.** `<session>` = `demo-<slug>`. Run `playwright-cli -s=<session> open`, then `playwright-cli -s=<session> state-load <auth_state>` when `auth_state` is set, then `playwright-cli -s=<session> goto <url>`. When `<chapters>` is `true`: `playwright-cli -s=<session> video-start .demo/<slug>/demo.webm --cursor`, then `playwright-cli -s=<session> video-show-actions`; otherwise only `playwright-cli -s=<session> video-start` (that version takes no path). Dispatch one `Agent` (`subagent_type: general-purpose`, `model` per § Model, `run_in_background: false`). The prompt is three fenced sections: `--- TASK ---` holds the text of `references/capture-prompt.md` § Capture prompt after its `---` rule, verbatim, with `{{session}}`, `{{out_dir}}` (`.demo/<slug>`), `{{url}}` and `{{chapters}}` filled in; `--- STEPS ---` holds the approved step table as a JSON array of `{ "n", "path", "action", "expected", "data", "script" }`; `--- RETURN ---` holds one sentence: the reply ends with a single fenced JSON block and nothing after it.

   **Pre-invocation reminder**: the agent's reply is a return value, not a turn boundary. The next tool call after it returns is `playwright-cli -s=<session> video-stop`, issued by this same thread. See § No-Stall Principle.

   When the agent returns: run `playwright-cli -s=<session> video-stop` (`video-stop --filename .demo/<slug>/demo.webm` when `<chapters>` is `false`) and `playwright-cli -s=<session> close`. Take the last fenced JSON block of the reply and parse it. No block, or a block that does not parse → repeat the browser commands of this step (`open`, `state-load`, `goto`, `video-start`, `video-show-actions`) and dispatch once more, on whatever state the first attempt left in the app, with the sentence `Your previous reply carried no parseable JSON block.` appended to `--- RETURN ---`; a second failure runs step 7 and stops with `status: "error"`, `reason: "no parseable capture result"`. Schema check, before anything is written: `steps` is an array whose `n` values are exactly those of the approved steps; each entry has a `status` of `ok` or `failed`, a non-empty string `screenshot` (a bare `step-NN.png` file name; a path is reduced to its base name) and an optional string `note`. A violation runs step 7 and stops with `status: "error"`, `reason: "capture schema violation"`.

   **Return-point no-stall reminder**: regardless of outcome — every step `ok`, some `failed`, any non-error result — the next action, `playwright-cli -s=<session> video-stop`, is issued in the next tool call. See § No-Stall Principle.

7. **Stop the app.** `<stop port>` is the port named in `<url>` when its host is `localhost`, `127.0.0.1` or `::1`, else `<port>`. Read the PIDs from `lsof -ti tcp:<stop port>`; when there are none, skip the kill. Otherwise run `kill <pids>`. Wait with `node -e "setTimeout(()=>{},2000)"`, read `lsof -ti tcp:<stop port>` again and `kill -9` what is left. If a PID still listens after that, keep one line for the report.

8. **Render and publish.** `Write` `.demo/<slug>/steps.json`: `title` (the feature in two to four words), `dek` (the plan's After sentence, or one sentence from the diff), `url`, `steps` (each approved step merged with the agent's `status`, `note` and `screenshot`), and `video: "demo.webm"` when `.demo/<slug>/demo.webm` exists (checked, with its size, through `node -e` and `fs.statSync`). Run
   `node "<base dir>/scripts/render.mjs" --steps .demo/<slug>/steps.json --out .demo/<slug>/index.html --lang <language>`.
   A non-zero exit stops with `status: "error"`, `reason: "page rejected: <first stderr line>"` (the app is already stopped). Call `Artifact` with `file_path` `.demo/<slug>/index.html`, `files` mapping each `step-NN.png` to `.demo/<slug>/step-NN.png` and `demo.webm` to `.demo/<slug>/demo.webm` when that file is 15MB or smaller, `icon` `camera`, and `description` one sentence naming the feature. Do not load the design skills: the page's layout and theming are fixed in the renderer. A missing or failing `Artifact` leaves `url` null; the page path still reports. Run `git check-ignore .demo .playwright-cli`; when its output lacks either path, keep one line for the report asking to add `.demo/` and `.playwright-cli/` to `.gitignore` (this skill does not edit it outside Setup mode).

9. **Report.** In the resolved language: the artifact URL (or the page path), the step count and the failed count, whether the recording exists, the stop result, and the gitignore line when there is one. Then the return contract's JSON block.

## Return contract

Emit a single fenced JSON block at the end of the response, matching:

```json
{ "status": "ok" | "skipped" | "error", "reason": null | "<why>", "url": null | "<artifact url>", "page": null | "<path to index.html>", "video": null | "<path to demo.webm>", "steps": <n>, "failed": <n> }
```

`steps` and `failed` are `0` when the capture did not run. Only one fenced JSON block appears in the response.

## Sub-skill caller directive

When invoked as a sub-skill (i.e. via `Skill(demo)` from an orchestrator), the fenced JSON verdict block this skill emits is the **structured return value** of the skill's procedure — it is **not** a deliverable to the user, and emitting it does **not** terminate the orchestrator's turn. The same agent that ran this skill must immediately issue the next tool call dictated by the orchestrator's flow. Do not insert a prose summary, an acknowledgment, or a "shall I proceed?" sentence between the JSON verdict and the next tool call. Only one fenced JSON block — the verdict block — appears in the response, so callers can locate it unambiguously. The skill's own procedure is over; the orchestrator's procedure continues without pause.

## Fallback

When the `Agent` tool is not on the tool surface, this thread runs the step loop of `references/capture-prompt.md` itself, between the same `video-start` and `video-stop` calls of step 6, builds the same `steps` array, and continues at the schema check.
