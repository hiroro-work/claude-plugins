# Completion (extracted cleanup + reminder render bodies)

Deep reference for `SKILL.md` **Completion**. The heading, the Report-summary line, the **Step 11 extract-rules output reminders** partition paragraph (which produces the `uncommitted_*` sets the Step 11 reminders read), the decomposition subtask-resume routing (the completion-logic source of truth), the **Execution-time deferral/exclusion gate** (USER GATE), and the subtask PR-URL prompt stay inline in `SKILL.md`. This file holds the derived-staging-artifact cleanup procedure and the eight Completion reminder render bodies; `SKILL.md` Completion delegates here. All bodies are verbatim-extracted, retaining their original formatting.

## Derived staging artifact cleanup

**Derived staging artifact cleanup**: before reporting summary, delete any per-agent staging documents under `.claude/plans/` that dispatched review subagents generated this run (files matching `<slug>-agent-*.md`, where `<slug>` is the run's plan slug — on the `visual` / `crit` paths, the slug established at Step 4 sub-step 2 path (b); on the `plan_review_gate: "plan-mode"` path, the Plan Mode plan file's basename), plus the Step 4 visual-gate served plan file, its comments file, and its prev snapshot (`<slug>.plan-review.md` / `<slug>.plan-review.comments.json` / `<slug>.plan-review.prev.md`) when the visual gate ran this session, plus the Step 11 rule-extraction candidate file (`<slug>.rule-candidates.md`) when rule-extraction ran this session — all are commit-excluded but, unlike the Web-routine staging artifacts whose workspace is torn down, the visual gate is local-only (persistent working tree) so they would otherwise accumulate as untracked noise. Delete the staging files in **two separate `rm -f` commands** — fixed-name files first, the agent-staging glob last: `rm -f .claude/plans/<slug>.plan-review.md .claude/plans/<slug>.plan-review.comments.json .claude/plans/<slug>.plan-review.prev.md .claude/plans/<slug>.rule-candidates.md` then `rm -f .claude/plans/<slug>-agent-*.md || true`. Isolating the glob in its own trailing command is load-bearing: under zsh's `nomatch` an unmatched glob aborts the command it sits in — and `-f` suppresses only `rm`'s own missing-file error, not the shell's expansion failure — so a single combined `rm -f <glob> <fixed-names>` would skip every fixed-name deletion whenever no agent file matches. The `|| true` keeps the exit clean when nothing matches (zsh still prints a harmless `no matches found`; bash passes the unmatched glob through literally). Both commands stay covered by the existing `Bash(rm -f .claude/plans/*)` permission, so no new tool grant is needed. Do not delete the main plan document (`<slug>.md`) or any decomposition state file — those are canonical workflow artifacts that Step 1.5 / `--resume` depend on.

## Completion reminders

Emit each reminder whose condition holds, in the resolved `language`, in the order below. The Step 11 rule-update / examples-dir / staging-dir / compaction reminders read the `uncommitted_*` partitioned sets produced by `SKILL.md` Completion's inline **Step 11 extract-rules output reminders** partition paragraph (kept inline there as the source of truth), plus `compaction_applied_count` / `below_threshold_failed_files` from Step 11 / Step 2.

**Difficulty-skip reminder** (per [`references/plan-format.md`](plan-format.md) § Localization granularity): when `difficulty_skipped_steps` (initialized at Step 2 entry, populated by Step 2's Adjust N by difficulty) is non-empty, surface a line in the resolved `language` naming the steps the difficulty-skip matrix skipped, so the skip is never silent. Render the recorded steps with their tier; the example below pairs the two `language` values:

- `language: ja`: `難易度判定（<tier> tier）により <steps> を skip しました` — 例: `難易度判定（Trivial tier）により Step 6 Tidy / Step 6.5 Polish Prose / Step 7.5 Rules Compliance Review を skip しました`
- `language: en`: `Skipped <steps> per the difficulty-skip matrix (<tier> tier)` — e.g. `Skipped Step 6 Tidy / Step 6.5 Polish Prose / Step 7.5 Rules Compliance Review per the difficulty-skip matrix (Trivial tier)`

The reminder is omitted when `difficulty_skipped_steps` is empty (Moderate / Complex tasks, or `-i`-skipped Adjust N runs — see the Step 2-entry init). The step names (`Step 6 Tidy` / `Step 6.5 Polish Prose` / `Step 7.5 Rules Compliance Review`) stay verbatim regardless of `language`. Trivial and Simple skip the same three steps (see Step 2's Adjust N by difficulty) — the example above applies to both, substituting the assessed tier.

**Fast-mode-skip reminder** (paired with the difficulty-skip reminder above, per the warning-string differentiation rule — a separate ledger keeps a fast-mode-caused skip from being misread as a difficulty-driven one): when `fast_mode_skipped_steps` (initialized at Step 2 entry, populated by `--fast`'s N-forcing and Step 6.5-only skip paragraphs) is non-empty, surface a line in the resolved `language` naming the steps `--fast` skipped:

- `language: ja`: `fast モードにより <steps> を skip しました` — 例: `fast モードにより Step 3 Plan Review / Step 6.5 Polish Prose を skip しました`
- `language: en`: `Skipped <steps> per fast mode` — e.g. `Skipped Step 3 Plan Review / Step 6.5 Polish Prose per fast mode`

The reminder is omitted when `fast_mode_skipped_steps` is empty (`--fast` not passed, or a Trivial-tier run where fast mode had nothing left to force). The step names stay verbatim regardless of `language`.

**Bundle-skill availability reminder** (per [`references/plan-format.md`](plan-format.md) § Localization granularity): when `bundle_skills_unavailable` (declared at Step 1 sub-step 3's "Initialize the bundle-unavailability ledger here" bullet, appended at the sites named there) is non-empty, surface a line in the resolved `language` naming which `dev-workflow-bundle` sibling skills were unavailable this run, so a partially-installed bundle is never silently missed run after run:

- `language: ja`: `dev-workflow-bundle の一部スキルが今回の実行で利用できませんでした: <list>。\`dev-workflow-bundle\` プラグインが完全にインストールされているか確認してください。`
- `language: en`: `Some dev-workflow-bundle sibling skills were unavailable this run: <list>. Check whether the \`dev-workflow-bundle\` plugin is fully installed.`

Render `<list>` as the ledger's recorded entries verbatim, comma-separated (the skill names and step labels stay verbatim per § Localization granularity's "file-internal identifiers" rule; only the surrounding connective sentence is localized). The reminder is omitted entirely when `bundle_skills_unavailable` is empty — the common case where the bundle is fully installed.

**Step 10 partial-state line**: if Step 10 ended via its `Mid-loop cancel` branch (see `references/interactive-commits.md` § Mid-loop cancel), emit the localized partial-completion token defined at § Step 10's "Localized summary tokens" paragraph. On a normal completion path, omit this line.

**Step 11 rule-update reminder** (per [`references/plan-format.md`](plan-format.md) § Localization granularity): `uncommitted_rule_changes` is the partitioned set for output_dir (default `.claude/rules/`); it is also read by the compaction reminder and the decomposition-resume note below. When `uncommitted_rule_changes` is non-empty, surface a manual-commit reminder in the resolved `language` (`<N>` = number of uncommitted rule files):

- `language: ja`: `\`.claude/rules/\` に未コミットの変更が <N> 件あります — PR を開く前に手動で commit してください`
- `language: en`: `<N> uncommitted change(s) under \`.claude/rules/\` remain — please commit manually before opening a PR`

The reminder is omitted when `uncommitted_rule_changes` is empty — including the case where Step 11's "Commit rule updates" gate already committed the rule changes (`interactive_commits: true`, gate accepted). When `interactive_commits: false` the gate never ran, so the rule changes stay uncommitted and the reminder fires as before (backward-compatible).

**Step 11 examples-dir reminder**: when `uncommitted_examples_changes` (the partitioned set for `examples_output_dir`, default `.claude/rules-extras/`) is non-empty, surface a reminder in the resolved `language` (`<N>` = number of uncommitted example files, `<examples_dir>` = the resolved directory):

- `language: ja`: `\`<examples_dir>\` に未コミットの extract-rules examples が <N> 件あります — PR を開く前に手動で commit してください`
- `language: en`: `<N> uncommitted extract-rules example file(s) under \`<examples_dir>\` remain — please commit manually before opening a PR`

The reminder is omitted when `uncommitted_examples_changes` is empty.

**Step 11 staging-dir reminder**: when `uncommitted_staging_changes` (the partitioned set for `staging_output_dir`, default `.claude/rules-staging/`) is non-empty, surface a reminder in the resolved `language` (`<N>` = number of uncommitted staging files, `<staging_dir>` = the resolved directory). The message keeps the promote-review framing — staged entries are 1st-observation candidates normally promoted to `.claude/rules/` on a later re-observation rather than adopted as-is, and the localized suffix notes they were also committable at the gate:

- `language: ja`: `\`<staging_dir>\` に未レビューの extract-rules 候補が <N> 件あります — 手動で確認し、採用するものを \`.claude/rules/\` へ promote してください（またはゲートで commit 可能でした）`
- `language: en`: `<N> extract-rules candidate(s) under \`<staging_dir>\` await review — inspect and promote accepted files to \`.claude/rules/\` manually (or commit them at the Step 11 gate)`

The reminder is omitted when `uncommitted_staging_changes` is empty.

**Step 11 compaction reminder** (per [`references/plan-format.md`](plan-format.md) § Localization granularity): this block has two independent clauses.

**(i) Commit clause** — when `compaction_applied_count > 0` (the Step 11 sub-step 3 char-count compaction gate landed user-accepted edits) **and** `uncommitted_rule_changes` (the output_dir partition from § Step 11 extract-rules output reminders) is non-empty — i.e. the compaction edits were **not** committed by Step 11's "Commit rule updates" gate (compaction edits live under `.claude/rules/`, so an accepted rule-update commit stages them along with the other rule changes) — surface a separate manual-commit reminder in the resolved `language` (rendered in file-unit count, distinct from the rule-update reminder above which counts uncommitted rule files):

- `language: ja`: `Step 11 で <N> 件のルールファイルを圧縮しました — PR を開く前に手動で commit してください`
- `language: en`: `Step 11 compacted <N> rule files — please commit manually before opening a PR`

This commit clause is omitted when `compaction_applied_count == 0` OR `uncommitted_rule_changes` is empty (the latter means the compaction edits are already committed). The `uncommitted_rule_changes`-non-empty test is a **coarse proxy** for "the compaction edits are still uncommitted": a partial `adjust` at the rule-update gate that committed the compacted files but left other rule files uncommitted can over-fire this clause — a harmless redundant nudge, not a data-loss path.

**(ii) Below-threshold follow-up** — **unconditional on commit state** (it concerns re-running compaction, not committing): when `below_threshold_failed_files` is non-empty, surface a follow-up reminder naming the files that remain over threshold. `<files>` always renders at the sentence tail so the block-level list never appears mid-sentence:

- `language: ja`: `<M> 件のファイルが閾値を超えています。手動で再度 \`Skill(extract-rules) --compact\` を実行するか、当該ファイルを直接編集してください:` followed by `<files>` on the next line
- `language: en`: `<M> files still exceed the threshold. Re-run \`Skill(extract-rules) --compact\` manually or edit the files directly:` followed by `<files>` on the next line

Render `<files>` as one path per line — verbatim from `files_processed[].path` (repo-root-relative, e.g. `.claude/rules/project.rules.local.md`; never rewritten to user-absolute `/Users/...` form) — each prefixed with `- ` (hyphen + space, no leading indent) directly below the reminder sentence as a top-level markdown bullet list. This applies for any `M ≥ 1` — single-element lists render as a one-bullet list, not inline, so the layout is identical across runs and the trailing prose clause never floats after the bullet list.

The compaction reminder block is omitted entirely when both clauses are omitted — i.e. when the commit clause does not fire (`compaction_applied_count == 0` OR `uncommitted_rule_changes` empty) AND `below_threshold_failed_files` is empty.
