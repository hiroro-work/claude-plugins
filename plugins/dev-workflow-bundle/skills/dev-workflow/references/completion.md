# Completion (extracted cleanup + reminder render bodies)

Deep reference for the workflow's **Completion** phase, whose body lives in [`finish-phase.md`](finish-phase.md) (`SKILL.md` keeps the `### Completion` label and points there). That file keeps: the Report-summary line, the **Step 11 extract-rules output reminders** set names + single-scan instruction + a pointer to § Partition (this file now owns the partition mechanics), the decomposition subtask-resume routing (the completion-logic source of truth), the **Execution-time deferral/exclusion gate** (USER GATE), and the subtask PR-URL prompt. This file holds the derived-staging-artifact cleanup procedure, the Completion reminder render bodies, and the **§ Partition — Step 11 extract-rules output sets** procedure (the source of truth the reminders read); [`finish-phase.md`](finish-phase.md) § Completion delegates here. The cleanup procedure and the reminder render bodies are verbatim-extracted, retaining their original formatting; the § Partition mechanics were restructured for standalone reading.

## Derived staging artifact cleanup

**Derived staging artifact cleanup**: before reporting summary, delete any per-agent staging documents under `.claude/plans/` that dispatched review subagents generated this run (files matching `<slug>-agent-*.md`, where `<slug>` is the run's plan slug, established at Step 4 sub-step 2), plus the Step 4 visual-gate served plan file, its comments file, its URL file, and its prev snapshot (`<slug>.plan-review.md` / `<slug>.plan-review.comments.json` / `<slug>.plan-review.url` / `<slug>.plan-review.prev.md`) when the visual gate ran this session, plus the Step 11 rule-extraction candidate file (`<slug>.rule-candidates.md`) when rule-extraction ran this session — all are commit-excluded, but a local run's working tree outlives the session, so they would otherwise accumulate as untracked noise. Delete the staging files in **two separate `rm -f` commands** — fixed-name files first, the agent-staging glob last: `rm -f .claude/plans/<slug>.plan-review.md .claude/plans/<slug>.plan-review.comments.json .claude/plans/<slug>.plan-review.url .claude/plans/<slug>.plan-review.prev.md .claude/plans/<slug>.rule-candidates.md` then `rm -f .claude/plans/<slug>-agent-*.md || true`. Isolating the glob in its own trailing command is load-bearing: under zsh's `nomatch` an unmatched glob aborts the command it sits in — and `-f` suppresses only `rm`'s own missing-file error, not the shell's expansion failure — so a single combined `rm -f <glob> <fixed-names>` would skip every fixed-name deletion whenever no agent file matches. The `|| true` keeps the exit clean when nothing matches. Both commands stay covered by the existing `Bash(rm -f .claude/plans/*)` permission. Do not delete the main plan document (`<slug>.md`) or any decomposition state file — those are canonical workflow artifacts that Step 1.5 / `--resume` depend on.

## Completion reminders

Emit each reminder whose condition holds, in the resolved `language`, in the order below. The Step 11 rule-update / examples-dir / staging-dir reminders read the `uncommitted_*` partitioned sets produced by § Partition — Step 11 extract-rules output sets (below).

**Difficulty-skip reminder** (per [`references/localization.md`](localization.md) § Localization granularity): when `difficulty_skipped_steps` (initialized at Step 1 sub-step 6's cross-step variable init table, populated by the tier resolution, at whichever of [`tier-escalation.md`](tier-escalation.md) § Tier-change sites' sites last ran it — each run rebuilds this ledger from scratch) is non-empty, surface a line in the resolved `language` naming the steps the difficulty-skip matrix skipped, so the skip is never silent. Render the recorded steps with their tier; the example below pairs the two `language` values:

- `language: ja`: `難易度判定（<tier> tier）により <steps> を skip しました` — 例: `難易度判定（Trivial tier）により Step 6 Tidy / Step 6.5 Polish Prose / Step 7.5 Rules Compliance Review / Step 11 Update Rules を skip しました`
- `language: en`: `Skipped <steps> per the difficulty-skip matrix (<tier> tier)` — e.g. `Skipped Step 6 Tidy / Step 6.5 Polish Prose / Step 7.5 Rules Compliance Review / Step 11 Update Rules per the difficulty-skip matrix (Trivial tier)`

The reminder is omitted when `difficulty_skipped_steps` is empty (Moderate / Complex tasks — see Step 1 sub-step 6's cross-step variable init table). The step names (`Step 6 Tidy` / `Step 6.5 Polish Prose` / `Step 7.5 Rules Compliance Review` / `Step 11 Update Rules`) stay verbatim regardless of `language`. Trivial and Simple skip the same four steps (`references/tier-assessment.md` § Difficulty-skip matrix) — the example above applies to both, substituting the assessed tier.

**Fast-mode-skip reminder** (paired with the difficulty-skip reminder above, per the warning-string differentiation rule — a separate ledger keeps a fast-mode-caused skip from being misread as a difficulty-driven one): when `fast_mode_skipped_steps` (initialized at Step 1 sub-step 6's cross-step variable init table, populated by the run's `--fast` skip/cap sites — the tier resolution's plan-phase forcing / Step 6.5-only skip (same rebuild-from-scratch lifecycle as the difficulty-skip ledger above), plus the shared 1-pass cap) is non-empty, surface a line in the resolved `language` naming the steps `--fast` skipped:

- `language: ja`: `fast モードにより <steps> を skip しました` — 例: `fast モードにより Step 3 Plan Review / Step 6.5 Polish Prose を skip しました`
- `language: en`: `Skipped <steps> per fast mode` — e.g. `Skipped Step 3 Plan Review / Step 6.5 Polish Prose per fast mode`

The reminder is omitted when `fast_mode_skipped_steps` is empty. Three ways that happens: `--fast` was not passed; a Trivial-tier run left fast mode nothing to force; or every site that would have recorded was already off — e.g. a Simple-tier run whose plan phase is configured `false` (the plan-phase forcing site appends only when `plan_review_enabled` was `true` beforehand) and whose Step 6.5 / Step 7.5 rows the difficulty-skip matrix had already completed. The step names stay verbatim regardless of `language`.

**The populating sites named above are this skill's own**, as are the tier-shaped omission causes — none of Trivial, Simple, or the difficulty-skip matrix exists outside this skill, and `mobpro`'s `SKILL.md` § M ↔ Step remap directive remaps phase identifiers, not tier vocabulary. A caller from another workflow reads its own populating sites from its own fast-mode section; the render body and the omit-when-empty rule above apply unchanged. `mobpro` reuses this reminder and mirrors this skill's `--fast` skip set at its own `SKILL.md` § Fast mode, which claims parity with it. Adding or dropping a `--fast` skip site in this skill therefore sweeps that table in the same commit.

**Bundle-skill availability reminder** (per [`references/localization.md`](localization.md) § Localization granularity): when `bundle_skills_unavailable` (declared at Step 1 sub-step 3's "Initialize the bundle-unavailability ledger here" bullet, appended at the sites named there) is non-empty, surface a line in the resolved `language` naming which `dev-workflow-bundle` sibling skills were unavailable this run, so a partially-installed bundle is never silently missed run after run:

- `language: ja`: `dev-workflow-bundle の一部スキルが今回の実行で利用できませんでした: <list>。\`dev-workflow-bundle\` プラグインが完全にインストールされているか確認してください。`
- `language: en`: `Some dev-workflow-bundle sibling skills were unavailable this run: <list>. Check whether the \`dev-workflow-bundle\` plugin is fully installed.`

Render `<list>` as the ledger's recorded entries verbatim, comma-separated (the skill names and the recorded `<context>` phase descriptions stay verbatim per § Localization granularity's "Preserve verbatim" rule; only the surrounding connective sentence is localized). The reminder is omitted entirely when `bundle_skills_unavailable` is empty — the common case where the bundle is fully installed.

**Step 10 partial-state line**: if Step 10 ended via its `Mid-loop cancel` branch (see `references/interactive-commits.md` § Mid-loop cancel), emit the localized partial-completion token defined at [`finish-phase.md`](finish-phase.md) § Step 10's "Localized summary tokens" paragraph. On a normal completion path, omit this line.

**Step 11 rule-update reminder** (per [`references/localization.md`](localization.md) § Localization granularity): `uncommitted_rule_changes` is the partitioned set for output_dir (default `.claude/rules/`). When `uncommitted_rule_changes` is non-empty, surface a manual-commit reminder in the resolved `language` (`<N>` = number of uncommitted rule files):

- `language: ja`: `\`.claude/rules/\` に未コミットの変更が <N> 件あります — PR を開く前に手動で commit してください`
- `language: en`: `<N> uncommitted change(s) under \`.claude/rules/\` remain — please commit manually before opening a PR`

The reminder is omitted when `uncommitted_rule_changes` is empty — including the case where Step 11's "Commit rule updates" gate already committed the rule changes (`interactive_commits: true`, gate accepted). When `interactive_commits: false` the gate never ran, so the rule changes stay uncommitted and the reminder fires.

**Step 11 examples-dir reminder**: when `uncommitted_examples_changes` (the partitioned set for `examples_output_dir`, default `.claude/rules-extras/`) is non-empty, surface a reminder in the resolved `language` (`<N>` = number of uncommitted example files, `<examples_dir>` = the resolved directory):

- `language: ja`: `\`<examples_dir>\` に未コミットの extract-rules examples が <N> 件あります — PR を開く前に手動で commit してください`
- `language: en`: `<N> uncommitted extract-rules example file(s) under \`<examples_dir>\` remain — please commit manually before opening a PR`

The reminder is omitted when `uncommitted_examples_changes` is empty.

**Step 11 staging-dir reminder**: when `uncommitted_staging_changes` (the partitioned set for `staging_output_dir`, default `.claude/rules-staging/`) is non-empty, surface a reminder in the resolved `language` (`<N>` = number of uncommitted staging files, `<staging_dir>` = the resolved directory). The message keeps the promote-review framing — staged entries are 1st-observation candidates normally promoted to `.claude/rules/` on a later re-observation rather than adopted as-is, and the localized suffix notes they were also committable at the gate:

- `language: ja`: `\`<staging_dir>\` に未レビューの extract-rules 候補が <N> 件あります — 手動で確認し、採用するものを \`.claude/rules/\` へ promote してください（ルール更新コミットゲートで commit することも可能でした）`
- `language: en`: `<N> extract-rules candidate(s) under \`<staging_dir>\` await review — inspect and promote accepted files to \`.claude/rules/\` manually (or commit them at the rule-update commit gate)`

The reminder is omitted when `uncommitted_staging_changes` is empty.

## Partition — Step 11 extract-rules output sets

This section holds the two-stage partition mechanics that assign each changed path to exactly one set. **Source of truth for the partition logic; the § Completion reminders read the resulting sets.**

The three-dir resolution and the single `git status` scan are performed in [`finish-phase.md`](finish-phase.md) § Completion (§ Step 11 extract-rules output reminders — the source of truth for the scan command); this section assigns each changed path from that scan. The scan's scope is the three-dir union (a coarse filter — paths under none of the three resolved dirs are ignored). Within that scope, assign each changed path to **exactly one** set in two stages:

- **(1) By directory membership** — a path under exactly one of the three resolved dirs goes to that dir's set (`output_dir` → `uncommitted_rule_changes`, `examples_output_dir` → `uncommitted_examples_changes`, `staging_output_dir` → `uncommitted_staging_changes`); the default (disjoint) config resolves entirely here.
- **(2) Filename-class tie-break, applied only when a path matches more than one resolved dir** — possible when two dirs resolve to the same path or one nests under another (extract-rules permits `examples_output_dir` / `staging_output_dir` to be set to `output_dir` to opt into auto-load) — classify by extract-rules' output-class filename suffix, not by directory order: a basename ending in `.examples.md` → `uncommitted_examples_changes`; the staging file `project.staging.local.md` (`.staging.local.md` suffix — test this before the general `.md` fallback, since it also ends in `.local.md`) → `uncommitted_staging_changes`; every other `.md` → `uncommitted_rule_changes`. Filename-class decides the tie because once two dirs collapse to one path the directory can no longer tell a rule file from an example / staging file. (extract-rules' examples files always end `.examples.md` with no `.local.md` variant, so the three suffixes stay mutually exclusive under this ordering.)

Either stage lands every path in exactly one set (no double-count, no doubled reminder). The § Completion reminders that read these sets own their own fire/omit conditions (each fires only for uncommitted residue in its own directory; an accepted gate commit clears the corresponding reminder).
