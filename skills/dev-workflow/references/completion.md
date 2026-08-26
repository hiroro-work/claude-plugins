# Completion (extracted cleanup + reminder render bodies)

## Derived staging artifact cleanup

**Derived staging artifact cleanup**: before reporting summary, delete any per-agent staging documents under `.claude/plans/` that dispatched review subagents generated this run (files matching `<slug>-agent-*.md`, where `<slug>` is the run's plan slug, established at Step 4 sub-step 2), plus the Step 4 visual-gate served plan file, its comments file, its URL file, its conversation thread, its prev snapshot, and its figures file (`<slug>.plan-review.md` / `<slug>.plan-review.comments.json` / `<slug>.plan-review.url` / `<slug>.plan-review.thread.json` / `<slug>.plan-review.prev.md` / `<slug>.figures.md`) when the visual gate ran this session, plus the Step 11 rule-extraction candidate file (`<slug>.rule-candidates.md`) when rule-extraction ran this session. Delete the staging files in **two separate `rm -f` commands** — fixed-name files first, the agent-staging glob last: `rm -f .claude/plans/<slug>.plan-review.md .claude/plans/<slug>.plan-review.comments.json .claude/plans/<slug>.plan-review.url .claude/plans/<slug>.plan-review.thread.json .claude/plans/<slug>.plan-review.prev.md .claude/plans/<slug>.figures.md .claude/plans/<slug>.rule-candidates.md` then `rm -f .claude/plans/<slug>-agent-*.md || true`. Under zsh's `nomatch` an unmatched glob aborts the command it sits in, so a single combined `rm -f <glob> <fixed-names>` would skip every fixed-name deletion whenever no agent file matches — keep the glob in its own trailing command. Do not delete the main plan document (`<slug>.md`) or any decomposition state file — those are canonical workflow artifacts that Step 1.5 (Task Decomposition) and `--resume` depend on.

## Completion reminders

Emit each reminder whose condition holds, in the resolved `language`, in the order below. The Step 11 rule-update / examples-dir / staging-dir reminders read the `uncommitted_*` partitioned sets produced by § Partition — Step 11 extract-rules output sets (below).

**Difficulty-skip reminder** (per [`references/localization.md`](localization.md) § Localization granularity): when `difficulty_skipped_steps` is non-empty, surface a line in the resolved `language` naming the steps the difficulty-skip matrix skipped. Render the recorded steps with their tier; the example below pairs the two `language` values:

- `language: ja`: `難易度判定（<tier> tier）により <steps> を skip しました` — 例: `難易度判定（Trivial tier）により Step 6 Tidy / Step 6.5 Polish Prose / Step 7.5 Rules Compliance Review / Step 11 Update Rules を skip しました`
- `language: en`: `Skipped <steps> per the difficulty-skip matrix (<tier> tier)` — e.g. `Skipped Step 6 Tidy / Step 6.5 Polish Prose / Step 7.5 Rules Compliance Review / Step 11 Update Rules per the difficulty-skip matrix (Trivial tier)`

The reminder is omitted when `difficulty_skipped_steps` is empty. The step names (`Step 6 Tidy` / `Step 6.5 Polish Prose` / `Step 7.5 Rules Compliance Review` / `Step 11 Update Rules`) stay verbatim regardless of `language`.

**Fast-mode-skip reminder**: when `fast_mode_skipped_steps` is non-empty, surface a line in the resolved `language` naming the steps the `fast` run mode skipped:

- `language: ja`: `fast モードにより <steps> を skip しました` — 例: `fast モードにより Step 3 Plan Review / Step 6.5 Polish Prose を skip しました`
- `language: en`: `Skipped <steps> per fast mode` — e.g. `Skipped Step 3 Plan Review / Step 6.5 Polish Prose per fast mode`

The reminder is omitted when `fast_mode_skipped_steps` is empty. The step names stay verbatim regardless of `language`.

**Bundle-skill availability reminder** (per [`references/localization.md`](localization.md) § Localization granularity): when `bundle_skills_unavailable` (declared at Step 1 sub-step 3's "Initialize the bundle-unavailability ledger here" bullet, appended at the sites named there) is non-empty, surface a line in the resolved `language` naming which `dev-workflow-bundle` sibling skills were unavailable this run:

- `language: ja`: `dev-workflow-bundle の一部スキルが今回の実行で利用できませんでした: <list>。\`dev-workflow-bundle\` プラグインが完全にインストールされているか確認してください。`
- `language: en`: `Some dev-workflow-bundle sibling skills were unavailable this run: <list>. Check whether the \`dev-workflow-bundle\` plugin is fully installed.`

Render `<list>` as the ledger's recorded entries verbatim, comma-separated (the skill names and the recorded `<context>` phase descriptions stay verbatim per § Localization granularity's "Preserve verbatim" rule; only the surrounding connective sentence is localized). The reminder is omitted entirely when `bundle_skills_unavailable` is empty.

**Step 10 partial-state line**: if Step 10 ended via its `Mid-loop cancel` branch (see `references/interactive-commits.md` § Mid-loop cancel), emit the localized partial-completion token defined at [`finish-phase.md`](finish-phase.md) § Step 10's "Localized summary tokens" paragraph. On a normal completion path, omit this line.

**Step 11 rule-update reminder** (per [`references/localization.md`](localization.md) § Localization granularity): `uncommitted_rule_changes` is the partitioned set for output_dir (default `.claude/rules/`). When `uncommitted_rule_changes` is non-empty, surface a manual-commit reminder in the resolved `language` (`<N>` = number of uncommitted rule files):

- `language: ja`: `\`.claude/rules/\` に未コミットの変更が <N> 件あります — PR を開く前に手動で commit してください`
- `language: en`: `<N> uncommitted change(s) under \`.claude/rules/\` remain — please commit manually before opening a PR`

The reminder is omitted when `uncommitted_rule_changes` is empty.

**Step 11 examples-dir reminder**: when `uncommitted_examples_changes` (the partitioned set for `examples_output_dir`, default `.claude/rules-extras/`) is non-empty, surface a reminder in the resolved `language` (`<N>` = number of uncommitted example files, `<examples_dir>` = the resolved directory):

- `language: ja`: `\`<examples_dir>\` に未コミットの extract-rules examples が <N> 件あります — PR を開く前に手動で commit してください`
- `language: en`: `<N> uncommitted extract-rules example file(s) under \`<examples_dir>\` remain — please commit manually before opening a PR`

The reminder is omitted when `uncommitted_examples_changes` is empty.

**Step 11 staging-dir reminder**: when `uncommitted_staging_changes` (the partitioned set for `staging_output_dir`, default `.claude/rules-staging/`) is non-empty, surface a reminder in the resolved `language` (`<N>` = number of uncommitted staging files, `<staging_dir>` = the resolved directory):

- `language: ja`: `\`<staging_dir>\` に未レビューの extract-rules 候補が <N> 件あります — 手動で確認し、採用するものを \`.claude/rules/\` へ promote してください（ルール更新コミットゲートで commit することも可能でした）`
- `language: en`: `<N> extract-rules candidate(s) under \`<staging_dir>\` await review — inspect and promote accepted files to \`.claude/rules/\` manually (or commit them at the rule-update commit gate)`

The reminder is omitted when `uncommitted_staging_changes` is empty.

## Partition — Step 11 extract-rules output sets

The three-dir resolution and the single `git status` scan are performed in [`finish-phase.md`](finish-phase.md) § Completion (§ Step 11 extract-rules output reminders); this section assigns each changed path from that scan. The scan's scope is the three-dir union (a coarse filter — paths under none of the three resolved dirs are ignored). Within that scope, assign each changed path to **exactly one** set in two stages:

- **(1) By directory membership** — a path under exactly one of the three resolved dirs goes to that dir's set (`output_dir` → `uncommitted_rule_changes`, `examples_output_dir` → `uncommitted_examples_changes`, `staging_output_dir` → `uncommitted_staging_changes`).
- **(2) Filename-class tie-break, applied only when a path matches more than one resolved dir** — classify by extract-rules' output-class filename suffix, not by directory order: a basename ending in `.examples.md` → `uncommitted_examples_changes`; the staging file `project.staging.local.md` (`.staging.local.md` suffix — test this before the general `.md` fallback, since it also ends in `.local.md`) → `uncommitted_staging_changes`; every other `.md` → `uncommitted_rule_changes`.
