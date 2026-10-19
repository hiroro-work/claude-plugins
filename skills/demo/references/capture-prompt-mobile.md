# Capture prompt

Read from `SKILL.md` § Procedure step 6 (Capture) when `<target>` is `ios` or `android`. The text after the rule below is the `--- TASK ---` section of the capture agent's prompt; `{{session}}`, `{{out_dir}}`, `{{app}}`, `{{target}}`, `{{device}}`, `{{video}}`, `{{language}}` and `{{case_reset}}` are filled in by the caller, the last with one paragraph of § Case reset. That text goes to a subagent that sees nothing else, so it carries no reference to this file or to `SKILL.md`.

## Case reset

**default**: Run the open line with `--relaunch` appended.

**none**: Run the open line (the app stays as the previous case left it).

**command**: Run `<reset line>` as one shell command line through Bash; a non-zero exit is a failed `setup` action whose `note` names the case reset command. Then run the open line with `--relaunch` appended.

---

You run each test case listed under `--- STEPS ---` against a native app on a simulator or emulator and take one screenshot per step. Every command is `agent-device --session {{session}} <command>`; chain consecutive commands with `&&` in one command line where nothing has to be read in between. An action run with `--settle` prints the diff of the screen once it is quiet; `snapshot -i` prints the interactive elements of the current screen with their refs (`@e12`). Screenshots and recordings go to `{{out_dir}}`.

Settings for this run:

- App: `{{app}}` on `{{target}}`; the **open line** is `open {{app}} --platform {{target}} {{device}}` (the device selector is empty when the booted device is meant)
- Recording scope: `{{video}}` (`full` records every test case; `normal` records only the normal cases)
- Language: `{{language}}`

In `--- STEPS ---`, a step's `case` is the `id` of its test case, and a step's `path` names the screen it runs on: a heading or a label `snapshot -i` shows there. A screen is reached only through the case's `setup` actions and its earlier steps, never opened by hand. Run the cases in the listed order, and each case's steps in the listed order.

For each test case:

1. {{case_reset}}
2. Perform the case's `setup` actions in order, finding elements in the latest `snapshot -i` or in the last `--settle` diff. When a `setup` action fails, every step of the case is `failed` with `cause: "steps"`, a `note` saying which action failed and a `result` saying what the screen showed; take one screenshot per step of the screen as it is, then go to item 6.
3. Record the case when the recording scope is `full`, or when it is `normal` and the case's `kind` is `normal`: `record start {{out_dir}}/<id>.mp4 --scope app`. When `record start` fails, note it once in the first step's `note` and go on without a recording.
4. For each step of the case:
   1. When the step's `path` names a screen other than the one shown, say so in the step's `note` and go on; the action itself reaches it.
   2. Find the element refs the action needs in the latest `snapshot -i` or in the last `--settle` diff; run `snapshot -i` again when the diff reported that it did not settle, or when it lacks the element you need.
   3. When the step has a `script`, run it first, as one shell command line through Bash; when the step's `data` says to save the output as `<name>`, also write the output to `{{out_dir}}/values/<name>.txt`, creating `values/` the first time. When the step's `data` says to use `<name>`, with or without a script, read that file and use its content in the action. Then perform the action with `press`, `fill`, `type`, `scroll` or `back`, with `--settle` where the command accepts it (`type` does not); `press <x> <y>` on coordinates only when no ref or selector matches.
   4. Run `screenshot {{out_dir}}/step-NN.png`, where `NN` is the step's `n`, two digits, zero-padded, in the same command line as the action, joined with `;` rather than `&&` so that it runs even when the action fails.
   5. From the snapshot the action printed, write `result`: one sentence on what the page showed after the action (a message, a value, a count, an error text), on every step, `ok` or not, in words a reader can set beside `expected`. Then check `expected` against the page. When the snapshot does not show what `expected` names, `Read` `{{out_dir}}/step-NN.png` and judge from the image instead, writing `result` from it too. When it holds, `status` is `ok`; otherwise `failed`, with a `note` saying what differed. When the action or its script fails, the step is `failed` with a `note` saying why; its screenshot is still taken, and the next step follows.
5. When the case was recorded: `record stop`. When it names several files, keep the first as `{{out_dir}}/<id>.mp4` — when it is not already that file, run `node -e "require('fs').renameSync(process.argv[1], process.argv[2])" <first file> {{out_dir}}/<id>.mp4` through Bash — and leave the rest.
6. Run `close`.

On every `failed` step, set `cause`:

- `data`: a record the step needs is missing or malformed (a not-found page, an empty list, a missing field, a validation message about stored data).
- `steps`: the step could not be carried out as written (no matching element, a screen the `path` names is not shown, a precondition not in place, a saved value missing, a script that failed).
- `app`: the step was carried out as written, but the page differed from the expected result.

`result` and `note` are written in the language above.

Rules: keep the listed order; add no step and no action the table does not name; run `open`, `close`, `record start` and `record stop` only where the flow above says; reach a screen only through the listed actions; do not dispatch any `Skill()` or `Agent`; do not read files outside `{{out_dir}}`.

When every case is done, reply with one fenced JSON block and nothing after it:

```json
{ "steps": [ { "n": 1, "status": "ok" | "failed", "screenshot": "step-01.png", "result": "<one sentence>", "note": "<one line, optional>", "cause": "data" | "steps" | "app" } ] }
```

`screenshot` is the bare file name, not a path. `cause` appears only on `failed` steps. One entry per step, in order.
