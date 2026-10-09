# Capture prompt

Read from `SKILL.md` § Procedure step 6 (Capture). The text after the rule below is the `--- TASK ---` section of the capture agent's prompt; `{{session}}`, `{{out_dir}}`, `{{url}}`, `{{chapters}}`, `{{t0}}`, `{{video}}` and `{{language}}` are filled in by the caller. Unqualified `§` references in this file point into `SKILL.md`.

---

You drive a browser through the steps listed under `--- STEPS ---` and take one screenshot per step. The browser is already open at `{{url}}` and signed in when the app needs it: every command is `playwright-cli -s={{session}} <command>`. Recording is already running; `{{t0}}` is the `Date.now()` value taken right after it started. Screenshots go to `{{out_dir}}`.

`--- STEPS ---` holds `features` (each with `name` and `description`) and `steps` (each with `n`, `feature`, `kind`, `path`, `action`, `expected`, `data`, `script`). A step's `feature` is the 1-based position of its feature; the feature's letter is `A` for position 1, `B` for 2, and so on. The steps are listed with every `normal` step first, then every `error` step.

**Positions.** At each card position below, run `eval "() => Math.floor((Date.now() - {{t0}}) / 1000)"` before the card and keep the integer: it is the step's `at` at a step card, the feature's `at` at its normal-case feature card, and the feature's `error_at` at its error-case feature card. Take the position whether or not `{{chapters}}` is `true`; the card itself is shown only when `{{chapters}}` is `true`.

**Cards**, each a `video-chapter` command, using the fixed words in the table below:

- Opening, before anything else: `video-chapter "<every feature name, joined by the separator>" --duration 3000`.
- Normal cases, right after the opening: `video-chapter "<normal cases>" --duration 1500`.
- Feature, before the first step of each feature, once among the normal steps and once among the error steps: `video-chapter "<letter>. <name>" --description "<description>" --duration 2500`.
- Error cases, before the first `error` step: `video-chapter "<error cases>" --duration 1500`.
- Step, before every step: `video-chapter "<n>. <action>" --duration 1200`.
- Closing, after the last step: `video-chapter "<the end>" --duration 2000`.

| Word | `ja` | `en` |
|---|---|---|
| normal cases | 正常系 | Normal cases |
| error cases | 異常系 | Error cases |
| the end | 以上です | The end |
| separator | `、` | a comma and a space |

**Stopping early.** When `{{video}}` is `normal` and the steps include an `error` step, the recording ends where the error cases begin: in place of the error-cases card, show the closing card and run `video-stop` (`video-stop --filename {{out_dir}}/demo.webm` when `{{chapters}}` is `false`). After that, show no card and take no position: the error steps carry no `at`, and every feature's `error_at` is `null`.

For each step, in the listed order, after its cards:

1. When the step's `path` differs from the page you are on, run `goto <url>` with the origin of `{{url}}` followed by the path.
2. Find the element references the action needs in the latest snapshot; run `snapshot` first when there is none yet or a `goto` ran since.
3. Perform the action with `click`, `fill`, `type`, `select`, `check`, `press` or `goto`. A step whose `script` is set runs it first, as one shell command line through Bash. When the action or the script fails (no matching element, a non-zero exit), the step's `status` is `failed`, `note` says why, the screenshot is still taken, and the next step follows.
4. Run `snapshot` again. Write `result`: one sentence on what the page showed after the action (a message, a value, a count, an error text), on every step, `ok` or not, in words a reader can set beside `expected`. Then check `expected` against the page. When you cannot confirm it, the step's `status` is `failed` and `note` says what differed; still take the screenshot. On every `failed` step, set `cause`: `data` when the page points to a missing or malformed record (not found, an empty list, a missing field, a validation message about stored data), `app` otherwise.
5. Run `screenshot --filename {{out_dir}}/step-NN.png`, where `NN` is the step number, two digits, zero-padded.

`result` and `note` are written in `{{language}}`.

Rules: keep the listed order; add no step and no action the table does not name; do not run `open`, `close` or `video-start`; run `video-stop` only as the **Stopping early** paragraph says; do not dispatch any `Skill()` or `Agent`; do not read files outside `{{out_dir}}` and `.playwright-cli/`.

When every step is done, reply with one fenced JSON block and nothing after it:

```json
{ "steps": [ { "n": 1, "status": "ok" | "failed", "screenshot": "step-01.png", "result": "<one sentence>", "note": "<one line, optional>", "cause": "data" | "app", "at": 12 } ],
  "features": [ { "feature": 1, "at": 3, "error_at": 41 } ] }
```

`screenshot` is the bare file name, not a path. `cause` appears only on `failed` steps. `at` is left out on steps taken after the recording stopped early. One entry per step, in order; one entry per feature, `error_at` `null` when the feature has no error step or the recording had stopped.
