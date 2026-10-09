# Capture prompt

Read from `SKILL.md` § Procedure step 6 (Capture). The text after the rule below is the `--- TASK ---` section of the capture agent's prompt; `{{session}}`, `{{out_dir}}`, `{{url}}`, `{{chapters}}`, `{{t0}}`, `{{video}}`, `{{video_stop}}` and `{{language}}` are filled in by the caller. That text goes to a subagent that sees nothing else, so it carries no reference to this file or to `SKILL.md`.

---

You drive a browser through the steps listed under `--- STEPS ---` and take one screenshot per step. The browser is already open at `{{url}}` and signed in when the app needs it: every command is `playwright-cli -s={{session}} <command>`. Recording is already running; `{{t0}}` is the `Date.now()` value taken right after it started. Screenshots go to `{{out_dir}}`.

Settings for this run:

- Chapter cards: `{{chapters}}` (`true` shows the cards below; `false` shows none)
- Recording scope: `{{video}}` (`full` records through the error cases; `normal` stops before them)
- Language: `{{language}}`

In `--- STEPS ---`, a step's `feature` is the 1-based position of its feature in `features`; the feature's letter is `A` for position 1, `B` for 2, and so on. Every `normal` step comes before every `error` step.

**Positions.** At each step card and feature card position below, run `eval "() => Math.floor((Date.now() - {{t0}}) / 1000)"` before the card and keep the integer: it is the step's `at` at a step card, the feature's `at` at its normal-case feature card, and the feature's `error_at` at its error-case feature card. Take the position whether or not chapter cards are on; the card itself is shown only when they are on, chained onto the position read in the same command line with `&&`.

**Cards**, each a `video-chapter` command, using the fixed words in the table below (the `en` column for any language other than `ja`):

- Opening, before anything else: `video-chapter "<every feature name, joined by the separator>" --duration 3000`.
- Normal cases, right after the opening: `video-chapter "<normal cases>" --duration 1500`.
- Feature, before the first step of each feature, once among the normal steps and once among the error steps: `video-chapter "<letter>. <name>" --description "<description>" --duration 2500`.
- Error cases, before the first `error` step: `video-chapter "<error cases>" --duration 1500`.
- Step, before every step: `video-chapter "<n>. <action>" --duration 1200`.
- Closing, after the last step: `video-chapter "<the end>" --duration 2000`.

When several cards fall before the same step, they run in this order: normal cases or error cases, then feature, then step.

| Word | `ja` | `en` |
|---|---|---|
| normal cases | 正常系 | Normal cases |
| error cases | 異常系 | Error cases |
| the end | 以上です | The end |
| separator | `、` | a comma and a space |

**Stopping early.** When the recording scope is `normal` and the steps include an `error` step, the recording ends where the error cases begin: in place of the error-cases card, show the closing card (when chapter cards are on) and run `{{video_stop}}`. After that, show no card and take no position.

For each step, in the listed order, after its cards:

1. When the step's `path` differs from the page you are on, run `goto <url>` with the origin of `{{url}}` followed by the path.
2. Find the element references the action needs in the latest snapshot; run `snapshot` first when there is none yet or a `goto` ran since.
3. Perform the action with `click`, `fill`, `type`, `select`, `check`, `press` or `goto`. A step whose `script` is set runs it first, as one shell command line through Bash. When the action or the script fails (no matching element, a non-zero exit), the step's `status` is `failed`, `note` says why, the screenshot is still taken, and the next step follows.
4. Run `snapshot` again. Write `result`: one sentence on what the page showed after the action (a message, a value, a count, an error text), on every step, `ok` or not, in words a reader can set beside `expected`. Then check `expected` against the page. When you cannot confirm it, the step's `status` is `failed` and `note` says what differed; still take the screenshot. On every `failed` step, set `cause`: `data` when the page points to a missing or malformed record (not found, an empty list, a missing field, a validation message about stored data), `app` otherwise.
5. Run `screenshot --filename {{out_dir}}/step-NN.png`, where `NN` is the step number, two digits, zero-padded.

`result` and `note` are written in the language above.

Rules: keep the listed order; add no step and no action the table does not name; do not run `open`, `close` or `video-start`; run `{{video_stop}}` only where the error cases begin and only when the recording scope is `normal`; do not dispatch any `Skill()` or `Agent`; do not read files outside `{{out_dir}}` and `.playwright-cli/`.

When every step is done, reply with one fenced JSON block and nothing after it:

```json
{ "steps": [ { "n": 1, "status": "ok" | "failed", "screenshot": "step-01.png", "result": "<one sentence>", "note": "<one line, optional>", "cause": "data" | "app", "at": 12 } ],
  "features": [ { "feature": 1, "at": 3, "error_at": 41 } ] }
```

`screenshot` is the bare file name, not a path. `cause` appears only on `failed` steps. `at` is left out on steps taken after the recording stopped early. One entry per step, in order; one entry per feature, `error_at` `null` when the feature has no error step or the recording had stopped.
