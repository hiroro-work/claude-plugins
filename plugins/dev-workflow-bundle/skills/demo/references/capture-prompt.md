# Capture prompt

Read from `SKILL.md` § Procedure step 6 (Capture). The text after the rule below is the `--- TASK ---` section of the capture agent's prompt; `{{session}}`, `{{out_dir}}`, `{{url}}`, `{{chapters}}`, `{{video}}`, `{{auth_state}}`, `{{language}}` and `{{case_reset}}` are filled in by the caller, the last with one paragraph of § Case reset. That text goes to a subagent that sees nothing else, so it carries no reference to this file or to `SKILL.md`.

## Case reset

**default**: When the signed-in state file is not `none`, run `state-load` with it. Run `goto` with the app URL.

**command**: Run `<reset line>` as one shell command line through Bash; a non-zero exit is a failed `setup` action whose `note` names the case reset command. When the signed-in state file is not `none`, run `state-load` with it. Run `goto` with the app URL.

---

You run each test case listed under `--- STEPS ---` in a fresh browser and take one screenshot per step. Every command is `playwright-cli -s={{session}} <command>`; chain consecutive commands with `&&` in one command line where nothing has to be read in between. Every command prints a snapshot of the page, or names the `.playwright-cli/` file that holds it. Screenshots and recordings go to `{{out_dir}}`.

Settings for this run:

- App URL: `{{url}}` (ends with `/`). A step's URL is the app URL followed by the step's `path` without its leading `/`
- Chapter cards: `{{chapters}}` (`true`: this playwright-cli shows the cards below, a cursor and action callouts; `false`: none of them, and a recording's file name is given when it stops)
- Recording scope: `{{video}}` (`full` records every test case; `normal` records only the normal cases)
- Signed-in state file: `{{auth_state}}` (`none` means no file)
- Language: `{{language}}`

In `--- STEPS ---`, a step's `case` is the `id` of its test case. Run the cases in the listed order, and each case's steps in the listed order.

For each test case:

1. Run `open`. {{case_reset}}
2. Perform the case's `setup` actions in order, finding elements in the latest snapshot. When a `setup` action fails, every step of the case is `failed` with `cause: "steps"`, a `note` saying which action failed and a `result` saying what the page showed; take one screenshot per step of the page as it is, then go to item 6.
3. Bring the browser to where the first step starts: when the first step's action opens a page or a link, `goto about:blank`; otherwise `goto` the first step's URL. Then record the case when the recording scope is `full`, or when it is `normal` and the case's `kind` is `normal`. To record with chapter cards on: `video-start {{out_dir}}/<id>.webm --cursor`, then `video-show-actions`, then `video-chapter "<id> <title>" --description "<precondition>" --duration 2500`. With chapter cards off: `video-start`.
4. For each step of the case, with chapter cards on and the case recorded, first run `video-chapter "<position of the step within the case>. <action>" --duration 1200`. Then:
   1. When the step's `path` differs from the path of the page you are on (its query and fragment aside, so a filter or a selection an earlier step made is kept), run `goto` with the step's URL.
   2. Find the element references the action needs in the latest snapshot; run `snapshot` only when no command since the last page change has printed one.
   3. When the step has a `script`, run it first, as one shell command line through Bash; when the step's `data` says to save the output as `<name>`, also write the output to `{{out_dir}}/values/<name>.txt`, creating `values/` the first time. When the step's `data` says to use `<name>`, with or without a script, read that file and use its content in the action. Then perform the action with `click`, `fill`, `type`, `select`, `check`, `press` or `goto`.
   4. Run `screenshot --filename {{out_dir}}/step-NN.png`, where `NN` is the step's `n`, two digits, zero-padded, in the same command line as the action, joined with `;` rather than `&&` so that it runs even when the action fails.
   5. From the snapshot the action printed, write `result`: one sentence on what the page showed after the action (a message, a value, a count, an error text), on every step, `ok` or not, in words a reader can set beside `expected`. Then check `expected` against the page. When the snapshot does not show what `expected` names, `Read` `{{out_dir}}/step-NN.png` and judge from the image instead, writing `result` from it too. When it holds, `status` is `ok`; otherwise `failed`, with a `note` saying what differed. When the action or its script fails, the step is `failed` with a `note` saying why; its screenshot is still taken, and the next step follows.
5. When the case was recorded: with chapter cards on, `video-stop`; with them off, `video-stop --filename {{out_dir}}/<id>.webm`.
6. Run `close`.

On every `failed` step, set `cause`:

- `data`: a record the step needs is missing or malformed (a not-found page, an empty list, a missing field, a validation message about stored data).
- `steps`: the step could not be carried out as written (no matching element, a precondition not in place, a saved value missing, a script that failed).
- `app`: the step was carried out as written, but the page differed from the expected result.

`result` and `note` are written in the language above.

Rules: keep the listed order; add no step and no action the table does not name; run `open`, `close`, `video-start` and `video-stop` only where the flow above says; do not dispatch any `Skill()` or `Agent`; do not read files outside `{{out_dir}}` and `.playwright-cli/`.

When every case is done, reply with one fenced JSON block and nothing after it:

```json
{ "steps": [ { "n": 1, "status": "ok" | "failed", "screenshot": "step-01.png", "result": "<one sentence>", "note": "<one line, optional>", "cause": "data" | "steps" | "app" } ] }
```

`screenshot` is the bare file name, not a path. `cause` appears only on `failed` steps. One entry per step, in order.
