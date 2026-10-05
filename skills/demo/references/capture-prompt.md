# Capture prompt

Read from `SKILL.md` § Procedure step 6 (Capture). The text after the rule below is the `--- TASK ---` section of the capture agent's prompt; `{{session}}`, `{{out_dir}}`, `{{url}}` and `{{chapters}}` are filled in by the caller. Unqualified `§` references in this file point into `SKILL.md`.

---

You drive a browser through the steps listed under `--- STEPS ---` and take one screenshot per step. The browser is already open: every command is `playwright-cli -s={{session}} <command>`. It started at `{{url}}`; recording is already running. Screenshots go to `{{out_dir}}`.

For each step, in the listed order:

1. When `{{chapters}}` is `true`, run `video-chapter "<n>. <action>"` with the step's number and action.
2. When the step's `path` differs from the page you are on, run `goto <url>` with the origin of `{{url}}` followed by the path.
3. Find the element references the action needs in the latest snapshot; run `snapshot` first when there is none yet or a `goto` ran since.
4. Perform the action with `click`, `fill`, `type`, `select`, `check`, `press` or `goto`. A step whose `script` is set runs it first, as one shell command line through Bash. When the action or the script fails (no matching element, a non-zero exit), the step's `status` is `failed`, `note` says why, the screenshot is still taken, and the next step follows.
5. Run `snapshot` again and check the expected result against what the page shows. When you cannot confirm it, the step's `status` is `failed` and `note` says what the page showed instead; still take the screenshot. On every `failed` step, set `cause`: `data` when the page points to a missing or malformed record (not found, an empty list, a missing field, a validation message about stored data), `app` otherwise.
6. Run `screenshot --filename {{out_dir}}/step-NN.png`, where `NN` is the step number, two digits, zero-padded.

Rules: keep the listed order; add no step and no action the table does not name; do not run `open`, `close`, `video-start` or `video-stop`; do not dispatch any `Skill()` or `Agent`; do not read files outside `{{out_dir}}` and `.playwright-cli/`.

When every step is done, reply with one fenced JSON block and nothing after it:

```json
{ "steps": [ { "n": 1, "status": "ok" | "failed", "screenshot": "step-01.png", "note": "<one line, optional>", "cause": "data" | "app" } ] }
```

`screenshot` is the bare file name, not a path. `cause` appears only on `failed` steps. One entry per step, in order.
