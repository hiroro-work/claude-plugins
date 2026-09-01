# Changelog

## 2026-09-01

### dev-workflow v1.139.0 / mobpro v1.48.0 / dev-workflow-bundle v1.163.0

- feat(dev-workflow, mobpro)!: remove the `interactive_commits` config key — the commit phase always runs
  - **Breaking.** `interactive_commits` is no longer read. Step 10 (Interactive Commits), Step 10.5 (Post-Commit Verification), Step 5's Build-order boundary chain, and the Step 11 / Step 11.7 rule-update commit gates are now unconditional, as are `mobpro`'s M11 (Commit) and M11.5 (Post-commit verification) and its M12 rule-update gate. A project that set `interactive_commits: false` gets the commit phase back; a run that should end without commits declines each commit gate instead.
  - Grounds: the commit phase is where both workflows put their per-commit diff review and the gates around it, so opting out of it removes the review layer along with the commits. Nothing else in either skill offers that layer, and no documented demand for the opt-out surfaced on the observation channels the config-flag lifecycle names.
  - Skipping the deprecation notice and the calendar-anchored waiting period is a **deliberate deviation** from this repo's config-flag lifecycle. The CHANGELOG is the only notice: no tombstone warns a project whose config still carries the key.

- chore(dev-workflow, mobpro): drop the two expired config-key tombstones
  - Both carried a documented removal condition of four weeks without a report of a project depending on the keys, and both dates (2026-08-24 and 2026-08-25) have passed, so this is the scheduled removal rather than an exception. Gone with them are the warnings for `diff_verbatim_line_threshold` / `diff_verbatim_threshold` / `diff_condensed_threshold` in both skills, for `checkpoint` / `quiz` / `error_reading_practice`, and for a leftover `.claude/mobpro*.md`.

## 2026-08-31

### dev-workflow v1.138.0 / mobpro v1.47.0 / dev-workflow-bundle v1.162.0

- refactor(dev-workflow, mobpro): state what each localized output must convey, not its wording
  - Sites whose paired `language: ja` / `language: en` sample only demonstrated phrasing now state what their output has to carry, with the wording written per run — the difficulty log line, the completion reminders, the remaining-steps and PR-extraction gates, the plan-artifact notices, the queued-comment note, and the browser-URL line. A fixed sample pins a register the surrounding output is then pulled toward.
  - Samples carrying content rather than phrasing stay: fixed output strings, the parenthesis form that changes with the language, the `<N>/<total>` shape, and the worked examples in the two files that define the localization conventions themselves.
  - **Every choice a gate offers is preserved.** The two sites whose sample was the only record of an option set — the remaining-steps gate and the PR-spec prompt — now name their options and accepted input forms in prose. `mobpro`'s transcriptions of both follow.
  - `.claude/rules/` § ドキュメント言語 gains the criterion this applied, so a sample is added only where it carries something the adjacent prose does not.
  - 4,601 characters off `dev-workflow`'s hot path, twice that counting the bundle copy.

### dev-workflow v1.137.0 / mobpro v1.46.0 / dev-workflow-bundle v1.161.0

- feat(dev-workflow, mobpro): extract rules from a reviewed PR's comments as the run's last step
  - A reviewer's comments on a pull request are the one rule source neither workflow ever read: the existing rule update takes the session's conversation, and the two retrospectives take their own axes of it. **Step 11.7 (PR Rule Extraction)** in `dev-workflow`, and a fourth sub-phase of **M12 (Rule update / retrospective)** in `mobpro`, ask which reviewed PR to extract from and hand the answer to `extract-rules --from-pr` unchanged — a bare number, `owner/repo#N`, a range, or a URL. An empty answer ends the run as before.
  - It runs last, is registered on every run, and is never dropped by the assessed difficulty.
  - **The entry gate that asks whether to run the remaining steps now has a third option.** Answering "PR only" declines the conversation-derived rule update and both retrospectives while still running the PR extraction — the case a reviewer's comments are worth keeping but the session itself yielded nothing. It appears only where the step set holds something besides the PR step; otherwise the gate keeps its two options.
  - The guard that stops one session being extracted twice deliberately does **not** apply here.
  - **Behavior change** — every run now ends with one more question, and there is no setting to turn it off. Declining costs an empty reply, and a run that answers "skip" at the entry gate never reaches it.

### dev-workflow v1.136.0 / mobpro v1.45.0 / dev-workflow-bundle v1.160.0

- feat(dev-workflow, mobpro): verify the commit phase once at the end instead of once per `crit` round
  - A `crit` diff-review round used to re-run the checks, the tests, and the rules-compliance walk every time it applied a fix. On a long review that repetition dominated the run's wall-clock and output. A round now runs `check_commands` alone — enough to keep a broken tree from being committed, and a few seconds — and the rest moves to a new phase, **Step 10.5 (Post-Commit Verification)** in `dev-workflow` and **M11.5** in `mobpro`, which runs the tests and the scoped rules-review once over every file the rounds touched.
  - **Comments that cannot be answered in the commit under review are now queued rather than refused.** A request landing on a file an already-landed commit carries, or on another commit's group, goes to a queue; the new phase applies the whole queue after the last commit and offers the result as one additional commit. A request to change a landed commit's message, or to move a file between landed commits, is still refused — an extra commit cannot express either — with the guidance to use `git rebase -i` outside the workflow.
  - **Behavior change** — a fix that a round used to land inside its own commit can now arrive one commit later. The commit that carries it names what it fixes, and the queue is reported in full if the commit phase is cancelled before it runs.
  - The per-round metadata-only / actual-code classification is gone.

## 2026-08-30

### mobpro v1.44.0 / dev-workflow-bundle v1.159.0

- feat(mobpro): assess the task's difficulty and scale the quality gates to it, the way `dev-workflow` already does
  - **Behavior change** — a trivial or simple task no longer runs every gate. `mobpro` now resolves a difficulty tier at M2 (Kickoff), the same judgement `dev-workflow` makes, and an express-lane task skips M7 (Tidy + prose polish), M9's rules-compliance half, and M12's rule-update sub-phase; a Trivial one additionally skips M4 (Plan review) and M9's code-review half. There is no setting to turn this off, matching `dev-workflow`.
  - **Nothing a junior takes part in scales down.** The M3 plan-building checkpoints, every M6 per-unit diff review, the M5 plan approval — browser gate included, at every tier — the M8 checks and tests, and the M11 commit approvals all fire whatever the tier. That boundary is the whole point of the change: a small task now gets a shorter session, not a thinner one, which is what lets `mobpro` stay the right tool for a small change in code the junior has not read before.
  - The tier only ever rises. Two checkpoints re-assess it — M3 once the plan is drafted, M6 once every unit has landed — and a strictly higher assessment returns the skipped steps to the run.

### dev-workflow v1.135.0 / mobpro v1.43.0 / dev-workflow-bundle v1.158.0

- fix(dev-workflow, mobpro): stop review findings from growing code comments, and default implementation to writing none
  - Code review now runs comment findings in one direction only. The reviewer rubric forbids proposing a comment be added, expanded, or restored after an earlier pass deleted it — such a finding is not actionable at any severity — and asks instead for verbose, narrating, or over-long comments to be flagged for deletion. Correcting a comment that says something untrue about the code is not an addition and still applies.
  - The main thread rejects a comment-growing fix at every review layer — `dev-workflow` from Step 6 onward, `mobpro` across its whole run — so a finding from a callee that never read that rubric, such as `rules-review` or a `hooks.on_complete` reviewer, is turned down too.
  - Implementation now starts from "no comment" rather than auditing comments after the fact: `dev-workflow` Step 5, a delegated executor under `implementation_executor`, and `mobpro`'s implementation loop each write a comment only where the *why* is non-obvious, and hold it to one line.

### dev-workflow v1.134.0 / dev-workflow-bundle v1.157.0

- fix(dev-workflow): open a published plan page on the sections that need judgment
  - A plan published through `plan_artifact` arrived with every section unfolded, so the page opened at its full length and the reader met the reference material before deciding they wanted it. `dev-workflow`'s Test plan and Risks — and their `mobpro` counterparts, How we'll check it works and Watch-outs — now start collapsed, each keeping its heading and its first line of prose, and the risk section its count badge, so they say what they hold and open on a click.
  - The page now inherits the same open/close default the local approval gate has always rendered under, rather than carrying an override of its own. The gate's own rendering is unchanged. Every section the plan template names apart from those two is unaffected and still open on arrival; a section under a heading the template does not name now arrives collapsed as well, as it already did at the gate.
  - Text inside a collapsed section is out of reach of browser find-in-page on some browsers, so a reader searching the published page for a term will not match on the two collapsed sections until they open them.

### dev-workflow v1.133.0 / dev-workflow-bundle v1.156.0

- fix(dev-workflow): draw a published plan page's mermaid diagrams on the page itself
  - A diagram on a page published through `plan_artifact` was left to the artifact host to render, and the host knows nothing of the page's palette — dark grey nodes on a light ground, unreadable either way. The page now loads mermaid itself, from a version-pinned cdnjs build with an integrity hash, and draws in the theme the reader is actually looking at: the choice they made, or their OS preference when they made none. Inline-SVG figures were never affected.
  - The library is fetched only on a page that has a diagram, its download overlaps the rest of the render rather than holding the page open and unfolded, and a failed fetch leaves each diagram's caption and source text in place rather than taking the page down.
  - The local approval gate now loads the same pinned build instead of its own copy from another host. Its rendering is unchanged — same version, same theme call — but the two surfaces can no longer drift onto different mermaid versions.

### dev-workflow v1.132.0 / mobpro v1.42.0 / dev-workflow-bundle v1.155.0

- fix(dev-workflow): keep the figures on a plan page republished after a team review
  - Plan changes a team's comments call for now go back through the browser approval gate, whichever surface the original approval ended on. The gate stays the only writer of the served copy and the figures layer, so the republished page keeps its figures instead of falling back to the figure-free plan document.
  - The figures layer is re-checked on that return, since edits applied to the plan outside the gate can leave a figure showing a label or a count that has changed.
  - The figures are still dropped where the gate cannot run at all — a cloud session, a launch failure. That case now says so in one line rather than dropping them silently.

### dev-workflow v1.131.0 / dev-workflow-bundle v1.154.0

- feat(dev-workflow): open the published plan page on an at-a-glance digest of the Decisions
  - The viewer-only page exported for a `plan_artifact` publish now opens on one line per Decision — the question and the head of its recommendation — each linking to that decision's card. Every line is cut from the plan's own text, so the page stays a rendering of the plan document.
  - A plan with no Decisions section, or one whose Decisions do not resolve into cards, shows no block at all.
  - The local approval gate is unchanged.
- feat(dev-workflow): fold Build order steps on the published plan page
  - The published page now opens each section, while a Build order step and a figure's prose fold stay closed at their own headings, one click away. It previously held every disclosure open.
- fix(dev-workflow): keep a wide table inside its own scroll box on both plan-review surfaces
  - A table wider than the column used to scroll the whole page sideways. It now scrolls within itself, and a narrow table is no longer stretched to fill the width.

### dev-workflow v1.130.0 / mobpro v1.41.0 / dev-workflow-bundle v1.153.0

- feat(dev-workflow, mobpro): override `plan_artifact` per run with `--artifact <value>`
  - `--artifact off` holds the plan back on a project configured for `share` or `review`, and `--artifact share` / `--artifact review` publishes on a project that normally does not, with `review` additionally holding the run for the team's review before implementation. The flag takes the same three values as the config key and applies to that run alone; nothing is written back to the config files.
  - It is an invocation modifier on the same terms as `--executor`. It is ignored under `--init`, and an invalid or unsupported value warns and leaves the config-resolved value in effect.
  - `mobpro` takes it too. Its fallback-key list and defaults are unchanged, since the flag is not a config layer.

## 2026-08-29

### dev-workflow v1.129.0 / mobpro v1.40.0 / dev-workflow-bundle v1.152.0

- feat(dev-workflow, mobpro): publish an approved plan as a claude.ai artifact for the team to read
  - **Default: disabled** — set `plan_artifact: "share"` (or `"review"`) in `.claude/dev-workflow.md` / `.claude/dev-workflow.local.md` to opt in per project. Publishing sends the plan's content outside the project, so nothing is published until a project asks for it.
  - `share` publishes the approved plan once the approval settles — on every approval route, the ones that never open a browser included — and hands back the page's URL. The page is the viewer-only export of the same renderer the review gate uses, so what the team reads matches what the plan was approved on, figures included.
  - `review` adds a gate after that publish: the workflow holds until you say the team has finished, reads the page's comment threads, takes what they ask for through the plan's existing revise loop, and republishes to the same URL. It waits on your word alone — no polling, no notification subscription.
  - The page's URL is recorded in the plan document's YAML frontmatter, which survives the archive move at completion, so a later session updates the same page instead of opening a second one. A plan's frontmatter is stripped before the plan reaches either surface, so it is neither rendered nor carried in the published page's source.
  - A failed export or publish is non-fatal: the run notes it and carries on to implementation. On `review` the note also says the team-review gate is being skipped, since there is nothing published to review.

### dev-workflow v1.128.1 / dev-workflow-bundle v1.151.1

- refactor(dev-workflow): tidy the plan-review scripts and cut their comments back to what a future edit needs
  - The mermaid library now loads only once a plan turns out to have a diagram. It was a static import, which a module fetches and evaluates before any of its own code runs, so every launch — and every post-revise reload — waited on it even with no diagram on the page. It is also loaded inside the failure handler now, so a CDN that does not answer leaves the fences un-rendered instead of taking the whole render down.
  - `plan-render.mjs` holds every localized string it writes, both languages, rather than the English defaults sitting inline and the Japanese ones two files away in `index.html`. Both surfaces now pass `LABELS[lang]` the same way.
  - Which elements are review blocks is defined once in `index.html`, where the comment layer and the diff layer had each walked the rendered body with their own copy of the rule. A change to one could silently stop `block-changed` marks landing on the blocks that are actually commentable.
  - `createRenderer` derives how a mermaid fence is held from whether the caller supplied a diagram hook, instead of taking that as a second option the caller had to keep in agreement with the first. A mismatched pair used to show the reader a diagram's source with nothing said about it.
  - Smaller cleanups: one factory for a thread entry in `serve.mjs` (a round read off disk and one appended in-process must be the same record), the two flags carrying the port-fallback bit collapsed into one, the hero element taken from what `renderPlan` returns rather than re-found by the renderer's own shell id, and two duplicated CSS blocks merged.
  - Comments across the five js/html files are cut roughly a quarter, keeping the ones whose loss would let an edit break something silently — ordering constraints, cross-file contracts, rename hazards, the artifact CSP's silent failures — and dropping restatements of the code and arguments against roads not taken.
  - Category: `ambiguity`

### dev-workflow v1.128.0 / mobpro v1.39.0 / dev-workflow-bundle v1.151.0

- feat(dev-workflow, mobpro): rebuild the plan-review page around a whole-change picture, and give the same renderer a viewer-only output
  - The page a plan is approved on now opens on one figure of the whole change, gives each section the visual form its content calls for (the Build order a numbered sequence, the Decisions its two options side by side, the Risks a list of cards), and says what a collapsed section is about on its own header line. The plan body is untouched by all of it: every paragraph stays reachable and stays commentable, and the comment anchoring the gate depends on is unchanged.
  - New reserved figures heading `## Hero` carries that opening figure. It names no plan section, sits outside the three-per-plan cap, and is required of a mobpro plan and optional for dev-workflow — a plan without one simply opens on its header.
  - The view splits into `public/plan-view.css` (styling) and `public/plan-render.mjs` (rendering), with the comment affordances, conversation thread, submit bar, and relaunch poll staying in `public/index.html`. `serve.mjs` is unchanged apart from its docblock.
  - Syntax colours are now written from the page's own palette rather than loaded as a highlight.js theme stylesheet, and the three web fonts come from Google Fonts. Both are what an artifact host's content policy admits, which the next change needs.
  - New `scripts/plan-review/export-plan-html.mjs` writes a plan out as a single self-contained viewer-only page from those same three files — no comment affordances, no submit bar, no request of its own, the plan's Markdown embedded, and every disclosure open. Nothing invokes it yet; its contract is in its own file header. `--standalone` wraps the output for opening locally.
  - Category: `missing-branch`

## 2026-08-28

### dev-workflow v1.127.0 / mobpro v1.38.0 / dev-workflow-bundle v1.150.0

- feat(dev-workflow, mobpro): stop the commit gate showing content the quality gates already fixed
  - Step 10 proposes one commit per Build order step from the snapshot Step 5 recorded when that step landed. Everything Steps 6–9 fixed afterwards went into the final commit, so reviewing an earlier commit meant reviewing code that was already corrected — and a comment on it could only be answered "already fixed in a later commit".
  - The commit plan now runs a **Quality-gate supersession test**: it derives the paths those gates wrote after the chain was recorded, and the first commit whose own paths intersect them — plus every commit after it — is **refreshed**, built from that step's recorded tree with the gates' edits to its own paths folded in. The plan says which step the refresh starts at and which paths caused it.
  - A refreshed commit still holds only the paths its Build order step wrote, so the per-step commit sequence survives. The residual blur is a path a gate **and** a later step both edited: that later edit rides into the earlier commit.
  - The frozen-snapshot notice now covers every commit whose tree is fixed before the approving starts, refreshed ones included — a comment on one of those cannot be answered in place either. The stashing-`pre-commit`-hook gate no longer borrows that notice's trigger: its own risk applies to any plan holding two or more commits, on either grouping path.
  - `mobpro`: a commit whose content the later gates changed is no longer offered under the already-reviewed skip, since the junior's per-unit approval no longer covers it.

### dev-workflow v1.126.1 / dev-workflow-bundle v1.149.1

- fix(dev-workflow): say on the Step 11 pointer that the step opens on a user gate
  - `SKILL.md`'s Step 9 through Completion are one-line pointers into `references/finish-phase.md`, so a run that reaches them without that file in context has nothing telling it a gate exists. Step 11's **Confirm remaining steps** gate was the exposed one: it is the finish phase's only entry gate — every other gate there fires part-way through a procedure, which cannot be reached without reading it — and the only place `SKILL.md` named it was the Pre-completed row guard, a paragraph that applies on the express lane alone. Its pointer now says so on every lane.
  - The Step 9 pointer's re-read backstop no longer reads as compaction-only. It names the skipped `Read` as the other cause and says to judge on whether the file is in context rather than on whether a cause is known.

### dev-workflow v1.126.0 / mobpro v1.37.0 / dev-workflow-bundle v1.149.0

- feat(dev-workflow, mobpro): open a plan section on its figure, with the prose folded beneath it
  - A figure is now expected in every section that may carry one, rather than only where prose could not hold the flow. The caps are unchanged — one per section, three per plan — so what changed is the bar for drawing one.
  - The plan-review viewer folds a figure-bearing section's prose into a disclosure under the figure, closed to start, so the section opens on the picture and the text is one click away. A section the diff marks new or changed opens instead, as does one replaying an exchange from an earlier round. Build order is left alone — its steps already open at their headings — and a Decisions section's cards stay visible, so the Alternative toggle is never folded away.
  - Nothing is removed anywhere. The canonical plan document and the served markdown both keep every word, so the readers who never open a browser — the implementation walk, the plan reviewer, the chat approval — are unaffected.
  - Figure authoring gains a wording rule — short plain-language labels, names of things rather than their identifiers — and a per-section statement of what each figure should claim, keyed on what the section holds so mobpro's differently-named sections are covered by the same list. Facts still come from the plan document; only the vocabulary is relaxed.

### dev-workflow v1.125.2 / dev-workflow-bundle v1.148.2

- fix(dev-workflow): put the plan-review comment box below the block’s history
  - In the visual plan-review gate, a block’s comment input was drawn above the conversation thread replayed under it, so reading a round and then replying meant scrolling down through the history and back up to the box. The thread is now inserted above the input, and the history reads downward with the box last.
  - The ordering had been split by placement: blocks whose input is a sibling (paragraphs, code blocks) already drew the thread first, while blocks that hold the input inside them (list items, decision cards, figures, tables) drew it after. Both now go through the same rule.

### dev-workflow v1.125.1 / dev-workflow-bundle v1.148.1

- docs(dev-workflow): give `references/interactive-commits.md` section headings
  - The file held its whole Step 10 procedure as one numbered list with no headings, so a reader building a section map from it got nothing back and was left to sample the top of a 46k-character file. Its preamble and its nine procedure steps are now headings, and the bodies are de-indented now that they are no longer list items. The instructions are unchanged; a step opener was re-headed wherever the bold label had been its grammatical subject, and the previously unnamed final step is now named.
  - Each step heading reads `<name> (Procedure N)`: the name is what the rest of the tree cites the step by (`§ Collect changes`, `§ Propose commit plan`, `§ Per-commit loop`, and the rest), while the number is what the file's own prose cites. The number has to follow the name — a `N. ` prefix stops every one of those `§` references resolving.
  - The preamble is under a heading too, so the deferred-bookkeeping step it carries — which has to run before the procedure collects the working tree — is reachable from the section map instead of only by reading past the title.

### dev-workflow v1.125.0 / mobpro v1.36.0 / dev-workflow-bundle v1.148.0

- refactor(dev-workflow): move the plan viewer's plan parsing into its own module and cover it with tests
  - The plan-review viewer's parsing — section splitting, heading classification, Decisions item parsing, anchor normalization, and the revise-round diff — now lives in `scripts/plan-review/public/plan-parse.mjs` instead of inline in `index.html`. The page imports it, and the repository's Node test suite imports the same file, so the parsing the browser runs is the parsing under test. Rendering stays in `index.html`, and so do the two functions that need a document or a Markdown renderer to walk.
  - `buildDiff` now returns a diff rather than writing into a module-level object, and takes its block collector as an argument; `sectionOfBlockId` takes the Decisions section id as its second argument instead of reading it from module scope. Both changes are confined to the viewer. `serve.mjs` now names `.mjs` as JavaScript, without which the browser refuses to run the module.
  - The `SECTION_TYPES` prefix table moved with the parsing, so the plan-section rename sweep lists in dev-workflow's and mobpro's `README.md` now point at `plan-parse.mjs`.

## 2026-08-26

### dev-workflow v1.124.0 / mobpro v1.35.0 / dev-workflow-bundle v1.147.0

- feat(dev-workflow, mobpro): keep the plan-review exchange on the page, and answer questions without editing the plan
  - The browser plan-approval gate now carries a conversation log, `.claude/plans/<slug>.plan-review.thread.json`. Each round the viewer submits is appended there by the viewer itself, so your wording reaches the file without being transcribed; the gate fills in the reply and what it did with the comment. The next launch replays each exchange under the block it was anchored on, and replays every exchange again in a log panel at the end of the plan — so a reply is read where the comment was made instead of only in the terminal. An entry is placed by text rather than by position, and the gate re-points it when it edits the anchored block; one that no longer resolves appears in the log panel alone, marked as unanchored.
  - A comment is now triaged before anything is applied: when the comment's own wording determines what to change and to what, the plan is edited; when it asks what something means or what a choice costs, it is answered and the plan is left alone. A comment doing both gets both, and an open reading is answered rather than guessed at. There is no comment type to pick in the viewer. A round that only answered still re-launches the gate, since the page is where the replies are read.
  - A revise re-launch reuses the previous port and suppresses the browser launch, and the tab already open polls until the new process appears and reloads itself. Re-review therefore stays in one tab instead of opening a new one each round, and the gate URL is announced only on the first launch or when the port actually changes. A busy port is no longer a startup failure: it is retried once, then a random one is taken and a browser opened, since the open tab can no longer be reached.

## 2026-08-24

### dev-workflow v1.123.0 / mobpro v1.34.0 / dev-workflow-bundle v1.146.0

- feat(dev-workflow, mobpro): show figures in the browser plan review, and keep the plan document prose-only
  - The plan-approval gate now serves a **composed** copy: the canonical plan document plus a separate figures file, `.claude/plans/<slug>.figures.md`, whose blocks are merged into the sections they name. Figures therefore reach the browser without entering the document that Step 5's implementation walk, the plan reviewer, and the chat approval all read — so a diagram costs nothing on those paths. mermaid stays the default notation and inline SVG is available where automatic layout cannot express the point (position along an axis, a record grid); `references/plan-figures.md` holds the conventions and two skeletons, and is read only when figures are being written. A figure takes its colours from the viewer's tokens in `var(--token, #fallback)` form, is capped at one per section and three per plan, and must carry a one-sentence caption stating what it claims.
  - **Behavior change**: the gate no longer writes the served copy back over the plan document. A revise round's comments are applied to the plan document itself the moment they arrive — figure comments to the figures file — so the document is current throughout the loop instead of only at approval, and a timeout mid-loop now degrades to a chat approval showing the applied comments rather than the pre-revise plan. The gate's approval surface says so before you choose.
  - The plan viewer is retinted: a warm page ground distinct from the card surface, a green accent, and a full dark theme following `prefers-color-scheme` (highlight.js and mermaid included). Every colour it paints now comes from a token, so figures and chrome stay legible in both themes.

### dev-workflow v1.122.0 / mobpro v1.33.0 / dev-workflow-bundle v1.145.0

- feat(dev-workflow, mobpro): run configured commands as each implementation step's boundary is recorded
  - **Default: disabled** — set `boundary_check_commands` in `.claude/dev-workflow.md` to opt in per project. The new list key names shell commands that run at the moment a Build order step's boundary object is built, while that step's paths are staged; whatever they rewrite is re-staged and carried into that step's own tree. The motivating case is a project's pre-commit hook runner, which until now first ran at the commit step, long after the implementation it would have corrected. `dev-workflow` runs them only where boundary objects exist, so `interactive_commits: false` leaves the key unread. `mobpro` builds a per-unit object on every run and always runs them, so the diff its per-unit review shows is the content that will be committed. A non-zero exit does not stop the run: it is recorded as a one-line note, the command is re-run once, and the object is then built from the index as it stands — the check/test gate stays the one that stops the run. Commands outside the skills' `Bash(...)` grants may need a one-time permission approval. This narrows but does not remove the commit step's own hook handling: the final group has no boundary, anything a command touches outside the step's own paths stays uncommitted, and files a quality gate touches after their boundary are still unformatted when they land.
  - Category: `missing-branch`

## 2026-08-23

### dev-workflow v1.121.0 / mobpro v1.32.0 / dev-workflow-bundle v1.144.0

- feat(dev-workflow, mobpro)!: choose the plan review's shape per invocation, and retire the `plan_review` key
  - **Default: rules-only** — the plan review now runs narrowed to `.claude/rules/` compliance unless you ask for more, and the way to get the full pass back is the new `--deep` flag on that invocation. There is no config equivalent: `plan_review` is removed and simply no longer read — a settings file that still carries it is ignored silently. `--fast` and `--deep` are the two ends of one run-mode axis (`fast` / `normal` / `deep`) replacing the former `fast_mode_active` boolean; passing both is a fatal error. Everything `--fast` skipped before it skips still, and the axis is expected to pick up further differences over time — a run mode names a general preference, not a fixed pair of skips. On a Trivial task the tier keeps turning the plan phase off, so `--deep` does not bring it back there; `code_review` stays a config key and no run mode touches it. Removing the key skips the usual deprecation-notice-and-wait lifecycle deliberately, at the maintainer's decision taken before the change was planned. **Downstream automation that syncs settings files does not read this file** — drop `plan_review` from any generated `dev-workflow` config alongside this upgrade.
  - Category: `wrong-default`

### dev-workflow v1.120.0 / mobpro v1.31.0 / dev-workflow-bundle v1.143.0

- fix(dev-workflow): report the Step 10 recovery point on every path, never by silence
  - § Propose commit plan named `<step10_entry_snapshot>` only "when § Collect changes set it", so a failed snapshot and a § Collect changes that never ran both rendered as nothing, and the run that hit the second one proposed a commit plan with no recovery point and nothing amiss. The report is now three branches with no silent one: the SHA and its restore command, or the failure line § Collect changes recorded — which that section now holds as `<step10_entry_snapshot_failure>` rather than only emitting once — or, when neither is available, a return to § Collect changes with the gate left unopened. Sub-step `d`'s survival-check skip says what an unset SHA now means, since it can no longer mean a skipped step.
  - Category: `missing-branch`
- feat(dev-workflow, mobpro): ask before committing frozen trees through a stashing pre-commit hook
  - A boundary group's tree is frozen at what Step 5 recorded, so landing it leaves the rest of the working tree unstaged — and a hook that shelves that delta to reformat the staged content can fail to reapply its shelf and take the content with it. Nothing warned before the commits started; the existing Frozen-tree notice covers a different consequence. A gate now fires on the chain-present path with two or more groups when `git rev-parse --git-path hooks/pre-commit` resolves to an existing file — one probe covering every manager that installs a hook file there, since it honors `core.hooksPath`. A runner that fires hooks from git config alone leaves no file to find and does not open the gate; that miss leaves the run behaving as it did before, so it errs toward silence rather than toward a wrong answer. It offers keeping the frozen trees with that manager suppressed (a marker-to-prefix lookup, or the prefix the user supplies; only the named manager stands down, so hooks it does not own still run), dropping the chain so every hook runs against final content, or proceeding unchanged. Nothing is defaulted, and the third road is there because the probe also finds hooks that shelve nothing.
  - Category: `missing-branch`
- fix(mobpro): make the already-reviewed skip option skip what its name says
  - Choosing it suppressed the crit round alone, leaving the full diff rendered in chat and the per-commit accept gate in place — heavier than not choosing it. It now suppresses both for the commits it covers: each renders its subject, body, files, and check/test line — the diff element alone is dropped — and lands with the commit-plan approval as the only confirmation. The carve-out in `interactive-commits.md` § Per-commit loop widened to match and stays bounded to groups taking the boundary-object derivation, so the tree skipped is the tree the junior already accepted at M6.
  - Category: `wrong-default`
- fix(dev-workflow, mobpro): state what separates one Decisions item from the next
  - Both plan templates gave the per-item field shape without saying that the `**Question**` line is the item boundary the Step 4 / M5 visual gate splits on. A plan written with per-item headings therefore had each item's opening text folded into the previous item's `Alternative`, with no error anywhere. Both templates now say it, both self-checks check it, and the viewer's `parseDecisions` treats an unindented numbered bold-only line as an item start when a `**Question**` is the next non-blank line after it, so a plan written that way still renders as separate cards. Every other shape — an indented or unnumbered bold line, an ATX heading, a bold line followed by prose — keeps the old fold on purpose: splitting there truncates a Recommendation and carries its tail onto the next card, which is worse than the fold.
  - Category: `missing-branch`

### dev-workflow v1.119.0 / mobpro v1.30.0 / dev-workflow-bundle v1.142.0

- feat(dev-workflow, mobpro): let `plan_review` narrow Plan Review to project-rule compliance
  - `plan_review` now takes `true` / `false` / `"rules-only"` instead of a boolean; the default `true` is unchanged, so existing projects behave as before. `"rules-only"` runs the same single pass with one reviewer covering the `.claude/rules/` compliance leg alone, its inputs enumerated up front and every other tool barred, so it does no exploratory reading — substantially faster and cheaper than the full pass. Design, approach, and completeness go unreviewed in that shape, so the Step 4 approval line says so and that approval becomes the only judgment they get. Choose it where a project's rules are the part of review that pays, and leave the default where plan design still needs a second reader.
  - `mobpro` honors the value on the same terms — M4 composes the narrowed request and M5's narration tells the junior what the pass covered.

## 2026-08-22

### dev-workflow v1.118.19 / dev-workflow-bundle v1.141.2

- fix(dev-workflow): bind the localization rules to the skill's own prose from the definition site
  - `references/localization.md`'s self-application paragraph only reaches steps that open that file, and the file is first read at Step 4. The difficulty log line and the tier-escalation notice both emit before then, and the post-fix natural-language quality self-check and the crit gate's own output carried no pointer to it at all. The **Self-application** paragraph in that section now states that a site emitting user-facing output with no language note of its own is not exempt, so both skills that read the file receive it. The `language` bullet in § Configuration — in context from the first turn, which is what the pre-Step-4 emitters need — points at that paragraph and repeats the not-exempt half; `references/configuration.md` carries the same pointer as its keep-in-sync pair.
  - Category: `missing-branch`
- fix(dev-workflow): point the language citations mobpro can reach at a file mobpro reads
  - `references/crit-commit-review.md` and `references/interactive-commits.md` are both on mobpro's runtime-read list, and five places in them cited "`SKILL.md` § Configuration's `language` bullet" — a file mobpro declares it never reads, so the citation resolved for one of the two readers. All of them point at the translate-versus-verbatim boundary rather than at how `language` resolves, so they now cite `references/localization.md` § Localization granularity, which dev-workflow reads at Step 4 and mobpro at M3. The remaining three point at how `language` resolves rather than at that boundary, so they lose the `SKILL.md` prefix instead of being repointed and now resolve against whichever skill is reading — `references/update-rules.md`'s already had that shape, and `references/plan-format.md` and `references/localization.md` take it here.
  - Category: `missing-branch`
- fix(dev-workflow): describe the self-application check at the granularity it actually has
  - The 2026-08-22 entry for that paragraph said every line in the section's output set is read back. The shipped paragraph reads back every output block once, before that block goes out. The entry now says block.
  - Category: `ambiguity`

### dev-workflow v1.118.18 / mobpro v1.29.1 / dev-workflow-bundle v1.141.1

- fix(dev-workflow): state the output language once for the whole commit-gate procedure
  - `references/interactive-commits.md` carried the `in the resolved language` instruction at 5 of the 17 places it puts something in front of the user, and the commit-plan presentation and each commit's presentation were not among them. An agent reading the file could take the absence of that note as putting those places outside the rule — `references/configuration.md`'s `language` bullet already names Step 10 gate output and its verbatim carve-outs, but nothing in the presenting file pointed there. A preamble paragraph now covers every line the Step presents, defers the verbatim side to whatever each step below already specifies, and says not to read a missing per-site note as an exemption.
  - Category: `ambiguity`
- fix(dev-workflow): require the localization rules to be applied to self-authored output
  - `references/localization.md` said which prose it governs but named no point at which that prose gets checked, and the only such check in the workflow was Step 4's plan-body self-audit — so gate prompts, log lines, finding lists, and the Completion summary had no checkpoint at all. § Localization granularity now carries a self-application paragraph after its opening sentence: the rules govern prose the skill writes itself and not only prose handed to a callee, every output block in the section's output set is read back against the section once before that block goes out, and the check runs even when the section is already in context. `mobpro` reads this file at M3 and inherits it.
  - Category: `missing-branch`
- fix(mobpro): read the commit reference's preamble, not only its Procedure
  - M11 delegates the whole commit gate to `dev-workflow references/interactive-commits.md`, but both places that declare how much of that file to read named its Procedure alone — the runtime-read row and M11's own body. Two cross-cutting paragraphs sit above the Procedure and bind anything the file drives, including the new output-language rule and the deferred-bookkeeping step, so M11 was declaring a read range narrower than what governs it. Both declarations now name the preamble.
  - Category: `missing-branch`

### dev-workflow v1.118.17 / mobpro v1.29.0 / dev-workflow-bundle v1.141.0

- fix(mobpro, dev-workflow): say what to do when neither the Task tools nor `TodoWrite` are on the tool surface
  - Both skills described a two-step fallback and stopped there, so a session exposing neither had no instruction at all. Each now names a third step: register nothing, name the phase being entered in prose at every step boundary, and treat the later "mark the row" / "resolve the row by subject" instructions as satisfied by that prose. dev-workflow additionally names the two mechanisms that lose their backing on this path — the Phase-boundary self-audit's `TaskList` check and the Pre-completed row guard — and says to recognize each skip from the condition that caused it instead.
  - Category: `missing-branch`
- fix(mobpro, dev-workflow): define what makes the reviewer availability probe pass
  - Both probe the resolved reviewer with a one-word request and branch on "failure" without saying what failure is, leaving it open whether a returning `Skill()` call is enough or a review has to actually run. Both now point at the criterion `references/prerequisites.md` already states for every callee — availability is the observable call outcome — so the probe stops at the call.
  - Category: `ambiguity`
- fix(mobpro): re-share a plan-building checkpoint when the reply says it never arrived
  - `references/learning-gates.md` § E sorted replies into four buckets, and a reply doubting the output arrived fit only `not an answer`, whose disposition is to neither advance nor re-share — leaving the run with nothing it was allowed to do. That bucket now carries a carve-out: re-share the checkpoint, shortened. The four buckets are unchanged.
  - Category: `missing-branch`
- fix(mobpro): name both halves of the check/test re-run in M9's post-pass verification
  - `references/m9-rules-code-review.md` sub-step 5 gate 1 said "re-run check/test once (reuse M8)", which reads as satisfiable by `check_commands` alone or by part of `test_commands`. It now says both halves in full, matching the write-out `references/crit-commit-review.md` § Round re-verification weight already uses for the same distinction.
  - Category: `ambiguity`
- fix(dev-workflow): wait for the background capture to finish before reading a decision from it
  - Both gates that route on a `run_in_background` capture read it on the process's exit notification, which can arrive before the output is written. A capture holding only the startup lines then matched "no parseable result" and downgraded the approval surface the user had chosen — an approved commit to the chat-fallback gate at `references/crit-commit-review.md` § Procedure step 4, an approved plan to `fallback` at `references/visual-plan-review.md` § Procedure step 5. Both now decide immediately when the expected line **is** present, and only when it is absent re-read until the host's termination marker appears (`[exited with code N]`), for up to 5 further reads. Both a marker with no result and 5 reads without a marker take the outcome a genuinely absent result takes, so a host that emits no marker cannot hang either gate.
  - Category: `missing-branch`
- fix(mobpro, dev-workflow): point at the already-reviewed crit skip from the commit-plan gate itself
  - The option to skip crit for commits already reviewed earlier in the run is defined in mobpro's `references/m11-commit.md`, which the run reads well before it reaches the gate that offers it. `references/interactive-commits.md` § Propose commit plan now names the extension directly after the paragraph that presents the gate, with a keep-in-sync directive and membership rule; the mobpro paragraph's now-redundant claim about that section is dropped.
  - Category: `ambiguity`
- fix(mobpro): list what M4 does not inherit from the plan-review payload it borrows
  - M4 borrows `dev-workflow references/step3-plan-review.md` sub-step 1's payload definition, and reading that file also surfaces its sub-step 3 approach-reconsideration self-audit, which rewrites the plan and re-runs the review. M4 now scopes the borrow explicitly — nothing beyond sub-step 1's payload definition is adopted — and names that self-audit as the case in point.
  - Category: `ambiguity`
- refactor(mobpro): rename `references/plan-format.md` to `references/plan-shape.md`
  - mobpro's own plan-shape reference and dev-workflow's `references/plan-format.md` — both read at runtime, for different things — shared a basename, and resolving a `§` reference against the wrong one reads as a dangling reference. The rename removes the collision, so M4's "resolve that path under mobpro's skill directory rather than dev-workflow's same-named file" qualifier is gone. The sweep covers both trees — mobpro's own references plus two sites in the dev-workflow tree that named mobpro's file by the old basename. The two references to dev-workflow's file are unchanged by design.

## 2026-08-21

### security-scanner v1.3.0

- fix(security-scanner): identify the scanner itself by install path instead of by marketplace name
  - Self-exclusion previously matched the literal string `security-scanner@hiropon-plugins`, so a user who added this marketplace under any other name silently lost it: the scan then found the skill's own threat-pattern list and reported it as a finding, with nothing to distinguish that from a real one. Self-exclusion now matches on **path**: a collected target is the scanner itself when its directory equals — or is a `/`-boundary prefix of — the directory the harness reports as the running skill's base directory, compared both as collected and symlink-resolved. Neither a marketplace name nor a plugin name appears in the path match.
  - The rule moved up to apply to **every target type** rather than only to user-level plugin records. It now also covers a project-level plugin directory and a skill directory, so scanning a project that vendors this skill under `.claude/skills/` no longer reports that copy's own threat-pattern list. A matched plugin install record additionally skips every other record sharing its plugin ID.
  - Self-exclusion covers the copy that is actually running. A **second** copy installed elsewhere on the same host — a plugin install alongside a vendored `.claude/skills/security-scanner`, say — is still scanned, and reports the threat-pattern list it contains. List the second copy in `trusted_plugins` or `trusted_skills`; the README documents this.
  - The name-match fallback fires only when the harness reports no base directory, so the path match cannot run. That is the one case where a same-named impostor is also skipped, which is why the report names the basis each skip rested on. `trusted_plugins`, `trusted_skills` and `trusted_marketplaces` still exclude the scanner explicitly on any host, and `--all` still disables all filtering.
  - Category: `wrong-default`
- fix(security-scanner): read every install record per plugin ID
  - `.plugins` in `installed_plugins.json` maps each plugin ID to an **array** of install records — one per scope, and one per cached version. Step 3 described a single `installPath`, so the new path match would have skipped only the running generation and left same-content siblings in the scan. Step 3 now keeps every record's `installPath` and deduplicates scan targets by it.
  - Category: `ambiguity`
- fix(security-scanner): close the unterminated code fence in the English report template
  - The fence opened after `**English (en):**` was never closed, placing `#### For GitHub URL Scans`, `## Analysis Guidelines` and `## Important Notes` inside a code block.
  - Category: `ambiguity`
- refactor(security-scanner): drop prose that does not change agent behavior
  - `SKILL.md` goes from 18,327 to 15,086 chars (-17.7%), net of the self-exclusion rewrite this release also lands. Each removal below names where the surviving copy is, so you can confirm nothing was lost.
  - Removed `## Scan Targets`; Step 3 holds its agent path table and its `agents` two-path note. Its `**Symlink note**:` paragraph had no downstream copy and moved to the new README.
  - Removed `## Important Notes`; its four lines are held by `## Analysis Guidelines`, Step 6, and the configuration reference.
  - Removed `### URL Format` and the URL `**Note**` line; Step 2-URL-1's `**URL Patterns**` block, `## Usage`, Step 2-URL-2 and Step 2-URL-4 hold the grammar, the public-repo limit and the branch default.
  - Removed the intro line under `# Security Scanner`; the frontmatter `description` holds it.
  - Removed Step 2-URL-1's `**Examples**` block; steps 4-5 of that same sub-step hold the parse rules. It also carried a hardcoded repository name.
  - Removed the four malicious-natural-language examples; the seven-category list above them is the detection spec.
  - Removed Step 3's `agents` two-path item and the repeated default values in Step 1 and Step 7; the Agent path mapping table and Step 1's **Default values** block hold them.
  - Removed five parentheticals and trailing clauses that justified a rule stated unconditionally.
  - New `skills/security-scanner/README.md` takes `## Configuration` and its three subsections, and lands at the plugin source root under the direct-skill layout.
  - The README names `SKILL.md` as the source of truth for the accepted keys, the valid `target_agents` values and the defaults — Step 1's **Default values** and **Validation** blocks and Step 3's **Agent path mapping** table — and states that adding a value sweeps both files in one commit.
  - The README also documents self-exclusion for users. It names Step 4 as the source of truth for the matching rule and restates only the fallback and the second-copy case, with a keep-in-sync directive covering both.
  - No author-specific identifier remains in `SKILL.md`: its `trusted_plugins` judgment line now uses the `<plugin>@<marketplace>` placeholder form.
  - The configuration sample moved to `README.md`, where its `trusted_marketplaces` entry `hiropon-plugins` became `my-marketplace`. Real public marketplace names (`claude-plugins-official` and the like) are kept.

### mobpro v1.28.4 / dev-workflow-bundle v1.140.29

- refactor(mobpro): drop prose that does not change agent behavior (chunk 3 of 3)
  - Scope is the four remaining M-step reference files: `references/m5-plan-approval.md` (7,972 to 6,649 chars, -16.6%), `references/m9-rules-code-review.md` (7,421 to 6,005 chars, -19.1%), `references/m11-commit.md` (8,404 to 5,940 chars, -29.3%) and `references/plan-format.md` (6,221 to 4,128 chars, -33.6%). The chunk totals 30,018 to 22,722 chars (-24.3%), completing the three-chunk pass over this skill.
  - Reference-file preamble meta removed from all four files: each file's inverse enumeration of what its `SKILL.md` step kept inline (the M5 heading and USER GATE designation, M9's entry-condition paragraph, M11's entry condition / delegation / point-of-this-diff note) and `references/plan-format.md`'s self-description plus its pointer to the README paragraph explaining the plan shape. Every read-once sentence and every `§` resolution rule is kept.
  - Duplicates removed against the file that owns the definition: `references/m11-commit.md`'s **Boundary chain input** paragraph and its inventory of the Step 10 definitions, both held by `references/inline-defs.md` § (e) -- the collapsed pointer additionally states that § (e) resolves the Approval-token pointer `crit-commit-review.md` makes to `finish-phase.md`, which `mobpro` does not read; the plan-body polish overlap note against `references/inline-defs.md` § (b); the `code-review-payload.md` and `crit-commit-review.md` contents lists, keeping the escalation-pass-only carve-out that narrows the first; and the `Reads` column enumeration in § Review lens, defined by `dev-workflow references/step3-plan-review.md`.
  - Reasons attached to unconditional rules removed across all four files -- the `since` / `so` / `because` tails on the payload prerequisite, the `subagent_model` non-adoption, the fast-mode ledger substitution, the crit probe timing, the skip-option coverage cut-off, the M9 continuation into (b)-(d), and the two `Deliberately not adopted` items in `references/m9-rules-code-review.md` sub-step 6 (both prohibitions kept). Sibling-comparison clauses removed likewise (`the same routing dev-workflow Step 4 uses`, `same shape as dev-workflow Step 8 sub-step 4`, `the same 2-gate structure as dev-workflow's Step 8.5`, `like the m6_* variables diff-review.md declares`), keeping every substantive cap and boundary they carried.
  - The one keep-in-sync directive on the authority side is dropped rather than restated: `references/learning-gates.md` § E already carries the reciprocal pointer to M5's **adjust** bucket, so M5's own source-of-truth sentence was pure double bookkeeping.
  - `references/plan-format.md` § Template's heading-name sweep list moves to `README.md` § Renaming a plan-section heading, joining the two coordinated-sweep sections added in chunks 1 and 2. The README is not read at runtime, so the coordinated-sweep rule is satisfied at no per-run cost.

### mobpro v1.28.3 / dev-workflow-bundle v1.140.28

- refactor(mobpro): drop prose that does not change agent behavior (chunk 2 of 3)
  - Scope is `SKILL.md` lines 148-253 -- the M1-M13 procedure body -- plus `references/diff-review.md` (9,528 to 7,695 chars, -19.2%), `references/crit-diff-review.md` (3,824 to 3,423 chars, -10.5%) and `references/learning-gates.md` (8,640 to 6,768 chars, -21.7%). The chunk totals 46,519 to 39,399 chars (-15.3%). The `SKILL.md` preamble was covered by chunk 1; `references/m5-plan-approval.md`, `references/m9-rules-code-review.md`, `references/m11-commit.md` and `references/plan-format.md` are untouched and are covered by chunk 3.
  - Reference-file preamble meta removed from all three files: `references/diff-review.md`'s contents list and its "SKILL.md M6 sub-step 2 (d) delegates here" backpointer, `references/learning-gates.md`'s contents list plus its division-of-labour and file-provenance sentences, and `references/crit-diff-review.md`'s self-description. Each file's read-once sentence is kept -- `SKILL.md` § Constraint scope requires a reference reached from more than one M-step to name its read point.
  - `SKILL.md`: removed the step-ordering rationale that the numbering already guarantees (M1's "Resolution must complete before sub-step 4's registration burst", the `fast_mode_skipped_steps` init's "ahead of sub-step 3's own append"), the table-of-contents parentheticals into a reference file (M1's removed-config tombstone preview, M11's inventory of what `references/m11-commit.md` holds), and the reasons attached to unconditional rules (M4's "mobpro has no difficulty assessment, so nothing else lowers the flag" against the surviving "Two causes, and no others"; M2's reset rationale; M3's "the junior has not read this codebase"; M8's "there is no failure output to read out").
  - `references/diff-review.md`: removed the downstream-consumption claims already stated where they are consumed -- the boundary chain's shape and M11's chain-absent path, both defined in `references/inline-defs.md` § (d) -- and the duplicate "not a § Cross-step state variables member" on two loop-local variables, which `SKILL.md` M6 sub-step 1 states for all three at once. Also removed the `references/step5-implement.md` citation that declared itself provenance-only for a file this skill never reads.
  - `references/crit-diff-review.md`: removed the reasons for each substitution against `references/crit-commit-review.md` (the `accept` / `adjust` / `cancel` dispositions having nothing to act on, the re-verification drop's timing argument) and the restatement of the "No machine iteration cap" note that file carries verbatim.
  - Editor-facing duplication of a sync directive removed on one side only: the `SKILL.md` M3 sub-step 2.5 bullet keeps `Keep it in sync with § E's ... paragraph`, which is the reference side the coordinated-multi-site-sweep convention requires; § E's reciprocal declaration and the SKILL.md sentence explaining that the bullet is a deliberate restatement both went.
  - Kept: every consequence whose breakage would pass undetected (`git write-tree` snapshotting the whole index, the `m6_crit_available` / `crit_commit_review_available` name collision, M13's roll-up-before-deletion ordering, a chain missing one unit folding into the next), and M3 sub-step 2.5's explicit override of dev-workflow Step 2's prohibition on "shall I go on?" questions.
  - One editor-facing sweep trigger moved to `README.md`, which is tracked but not read at runtime: `references/learning-gates.md` § D's source-of-truth declaration and its closed list of inline cap sites became `### Adding an inline explanation-length cap`, matching the `### Adding or dropping a --fast skip site` subsection chunk 1 created. § D's caps themselves are unchanged.

### mobpro v1.28.2 / dev-workflow-bundle v1.140.27

- refactor(mobpro): drop prose that does not change agent behavior (chunk 1 of 3)
  - Scope is `SKILL.md` lines 1-147 -- the preamble through § Dispatch authorization (23,976 to 21,183 chars, -11.6%) -- plus `references/inline-defs.md` (12,317 to 11,017 chars, -10.6%) and `references/configuration.md` (4,762 to 3,987 chars, -16.3%). The M1-M13 procedure body and the remaining `references/*.md` files are untouched and are covered by chunks 2 and 3.
  - Reference-file preamble meta removed from both files: `references/inline-defs.md`'s account of why the definitions are transcribed, where each upstream lives, and how the (a)-(g) ids are referenced; `references/configuration.md`'s opening line, which restated `SKILL.md` § Configuration in full. Each section's own `Keep in sync with ...` note names its upstream, and the H1 carries file identity. The read-once sentences are kept in both files -- `SKILL.md` § Constraint scope requires a reference reached from more than one M-step to name its read point.
  - `SKILL.md`: removed the table-of-contents parentheticals into `references/configuration.md` and § (b), the reasons attached to unconditional rules (the sibling-relative path's install layout, the `scripts/` absence, the accept-token requirement), the sibling-equivalence and sibling-contrast clauses (`landed_count`'s init site versus dev-workflow's, the No-Stall scoping mirror, "Unlike the other two"), and the editor-facing aggregation notes (the re-entry-site ownership claim, the § (b) reference plumbing, the § Workflow artifacts anchor note, the § Fast mode table's completeness claim).
  - `references/configuration.md`: reframed the tombstone step to the present tense, dropping which mobpro version last read the three removed threshold keys. Removed the reason for substituting a Default on an invalid value and the contrast with dev-workflow's `--init` prompt on an absent config.
  - Authority-side source-of-truth declarations removed where the reference side already names them: § Fast mode's "Source of truth: this section" (`README.md` § Usage carries the pointer) and the duplicate `Keep in sync ...` at `SKILL.md`'s § (a) pointer.
  - Kept: the § Learning-Stop Principle <-> § No-Stall Principle analogy, which is the only mapping a dev-workflow reference file's no-stall reminder resolves through; the `landed_count` retry / amend symmetry; the `fast_mode_skipped_steps` init-pass no-clear rule; the stale-base-commit and prose-only-item consequences in § (g); and § Fast mode's parity claim, which dev-workflow's `README.md` asserts.
  - Two editor-facing sweep triggers moved to `README.md`, which is tracked but not read at runtime: § Fast mode's skip-site append instruction became `### Adding or dropping a --fast skip site`, matching dev-workflow's same-named section, and § Not-adopted keys' sync directive moved to the reference side in § Configuration.

### dev-workflow v1.118.16 / dev-workflow-bundle v1.140.26

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 16 of 16)
  - Scope is `references/workability-retrospective.md` (18,923 to 17,021 chars, -10.1%), `references/update-rules.md` (8,703 to 6,077 chars, -30.2%) and `references/rule-extraction-axis.md` (12,885 to 10,442 chars, -19.0%) -- the Step 11.6 axis spec, the Step 11 procedure bodies, and the Step 11 rule-extraction axis spec. `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the other chunks. This is the last of the 16 chunks.
  - `references/update-rules.md`: removed the preamble's and both sub-step preambles' inventories of what `references/finish-phase.md` keeps inline. That file's § Step 11 already enumerates each sub-step's control surface and points here per sub-step. The reference-resolution sentence -- unqualified `sub-step N` and `§ Completion` resolve to `finish-phase.md`, `§ No-Stall Principle` to `SKILL.md` -- is kept.
  - `references/update-rules.md`: removed the first-dispatch-point aside, the reasons behind the no-fallback and skip-after-extraction rules, the retrospective-axis asymmetry comparison, the attribution of the major-bump signal to `references/tier-assessment.md`, the derivation of what the restricted pathspec leaves in the working tree, the output-class label's purpose sentence, and the bullet explaining why this gate sits in Step 11. Each rule's operative half is kept, including the `landed_count` mis-routing consequence and the `git checkout HEAD -- <path>` exclusion ban with its reason.
  - `references/rule-extraction-axis.md`: removed the Purpose line's producer/consumer framing and the producer-spec paragraph. `references/finish-phase.md` § Step 11 names the consumer, its mode and the Step-C5-only scope; § 2.1 states this file is the axis spec. Also removed § 1's sibling-axis comparisons and § 3's extract-rules destination clause.
  - `references/rule-extraction-axis.md`: aligned the two spots that had drifted more verbose than their canonical in `extract-rules` -- rule 9's permanent-cost preamble and § 2.2's general-knowledge restatement. Neither is in `extract-rules` `references/extraction-criteria.md` any more. The `Source of truth` directives in § 2.2 and § 2.3 are kept.
  - `references/workability-retrospective.md`: removed the third axis bullet (a restatement of the Purpose line), the Step 11.5 mirror aside, the provenance of a non-`true` `enabled` value, the consequence of deferring `backlog_dir` creation, the reassurance beside the collapse-near-duplicates rule, § 2.4's parseable-but-empty derivation, the sanitization-preview purpose sentence, and the reason behind the no-retry rule.
  - `references/workability-retrospective.md`: § 4's preamble slot list and single-candidate omission rule are re-renders of `references/plan-format.md` § User-gate summary preamble, which names this gate in its Applies to list, its Content slots and its Omission condition. Removed both; the pointer to that section stays.
  - No heading changed in any of the three files. The bold spans that disappeared were all inside removed paragraphs.

### dev-workflow v1.118.15 / dev-workflow-bundle v1.140.25

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 15 of 16)
  - Scope is `references/self-retrospective.md` (27,356 to 22,948 chars, -16.1%) and `references/session-scan.md` (15,888 to 12,233 chars, -23.0%) -- the Step 11.5 axis spec and the shared scan dispatch it consumes. `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the other chunks.
  - Removed `references/session-scan.md`'s preamble. Its H1 carries the file's identity, § When it runs maps each axis to its owning step and gate, § Subagent instructions step 2 states the single parse, and step 6 states the single delimited return. The read condition -- read this file when a participating step reaches its dispatch point -- is kept.
  - Removed derivations of rules the same section already states: the Step 11-abstains walkthrough after the "never dispatches purely to serve Step 11.5 / Step 11.6" prohibition, the Step 11.5 and Step 11.6 bullets' re-derivations of their own still-active sets, and § Consuming a block's re-render of the per-axis sanitization tags that step 4 tags in place. The prohibition, the dispatcher rule, the three-cause closed list, and the `(rule-extraction is **not** in this set)` exclusion are unchanged.
  - Removed rationale clauses attached to rules stated unconditionally: where the run-scoped state lives and why, what routes a later step to the dispatch branch, why the speculative self-retrospective block costs little, why a `Status: ERROR` couples every axis, and why the rule-extraction axis alone falls back rather than skipping. Each rule's operative half is kept, including the no-retry directive and the per-axis routing table.
  - `references/self-retrospective.md`: removed the tier-independence restatement (`references/configuration.md` and `SKILL.md` § Step 11.5 both state it), the `mkdir` approval-gate rationale, the multi-instance heuristic caveat around the still-required "inform the user which file was selected", the `gh api`-over-`gh issue create` permissions rationale, the destination-header hijack rationale, the Producer-version consumer rationale, and the terminal-summary purpose sentence. The tilde-expansion reason is kept, since an unexpanded `~` silently writes to a literal directory.
  - `references/self-retrospective.md`: kept the sentence sanctioning `unknown` as the Producer version, since a consumer repo without `.claude-plugin/marketplace.json` reaches it on every run; removed the `jq` exit-code explanation beside it, as the resolution command is verbatim in its own fenced block.
  - `references/self-retrospective.md`: the `Target skill` placeholder and the § 2.3 candidate schema said "one of the four bundle skills" while the § 5 rejection list and the Purpose header both enumerate five. Dropped the stale count from both.
  - No heading or bold label changed in either file.

### dev-workflow v1.118.14 / dev-workflow-bundle v1.140.24

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 14 of 16)
  - Scope is `references/finish-phase.md` (33,652 to 28,956 chars, -14.0%) and `references/completion.md` (13,191 to 7,973 chars, -39.6%) -- the finish phase, § Step 9 through § Completion. `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the other chunks.
  - Removed both files' preambles. `SKILL.md`'s Step 8.5 exit already states that the whole finish phase is defined in `references/finish-phase.md`, its five following section labels each carry a `Defined in references/finish-phase.md` pointer, and it holds the finish phase's **Input contract** inline at its own § Step 9; `references/finish-phase.md` § Completion names all three of `references/completion.md`'s sections at their points of use. Each file's H1 carries its identity.
  - Kept, from `references/finish-phase.md`'s opening paragraph, the load-once fact, the `no step re-reads this file automatically` clause, and the post-compaction re-read imperative, and kept the reference-resolution rules in full (unqualified `§` resolving to `SKILL.md`, the bold-label carve-out, `sub-step N`, and the § No-Stall Principle named-bullet narrowing). Removed that paragraph's verbatim-extraction provenance, its link-rebase-on-add directive, and the **Residual risk** enumeration of what a compaction can drop.
  - Removed § Gates' restatement that the two halves form one closed list and that the per-bullet convention governs its bullets: `SKILL.md` § No-Stall Principle's aggregate bullet carries the membership criterion and its "Each bullet names the gate" paragraph carries the convention. All nine gate bullets, their definition-site pointers, and every `USER APPROVAL GATE` marker are unchanged.
  - Removed justifying clauses attached to rules stated unconditionally: the **Task-derived-change gate**'s whole-list-skip justification and warning-line rationale, sub-step 3's silent-loss clause, sub-step 4's workflow-artifact subtraction rationale and skip-is-covered note, the apply-half-of-a-scan/apply-split aside, and Step 11.6's `mirrors Step 11.5` sibling-equivalence note. Where `mobpro`'s `references/inline-defs.md` already transcribes the same definition, this skill now matches its leaner form.
  - Removed the Step 10 delegation pointer's canonical-home clause (`README.md`'s hooks section holds that record) and § Step 10's restatement of the **Step 10 partial-state line**'s fire/omit condition, which `references/completion.md` § Completion reminders owns.
  - `references/completion.md`: removed the ledger-provenance parentheticals on the difficulty-skip and fast-mode-skip reminders, their omission-cause enumerations, the § Partition role declaration and tie-break rationale, and the paragraph addressing a caller from another workflow -- `mobpro` `SKILL.md` M13 names which six of the seven reminders it renders and which ledgers it reads. That paragraph's dev-workflow-to-`mobpro` sweep trigger moved to `README.md` § Adding or dropping a `--fast` skip site.
  - `references/completion.md`: kept the zsh `nomatch` mechanism as an imperative, since a combined `rm -f` silently skips the fixed-name deletions on the no-match path, and kept the `.staging.local.md`-before-`.md` suffix ordering with its reason. Removed the `is load-bearing` label, the `-f`-semantics aside, the `|| true` gloss, and the allowed-tools-coverage sentence.
  - No heading, bold label, or gate bullet changed in either file.

### dev-workflow v1.118.13 / dev-workflow-bundle v1.140.23

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 13 of 16)
  - Scope is `references/crit-commit-review.md`, the `commit_review_gate: "crit"` gate: 31,024 to 22,095 chars (-28.8%). `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the other chunks.
  - Removed the four verification-provenance paragraphs -- the two **Empirically verified** blocks, **Not verified in a completed live round**, and **Verification provenance** -- together with the three in-text pointers into them. Every fact they carried that an executing agent acts on is stated imperatively where it is acted on: the dangling-object range in the **Scoping mechanism** bullet, the read-both-streams rule in **Decision output**, the optional `quote` field in **Comment JSON shape**, the coverage threshold and the `auto_repaired` carve-out in § Story prologue, and the two story commands returning immediately in that section's own lead-in.
  - Removed the preamble's entry-condition restatement and canonical-home declaration, and the **Two callers, not one.** paragraph. `references/interactive-commits.md`'s **Diff-review mode branch** owns the entry condition and the per-commit crit-suppression carve-out; `mobpro` `references/crit-diff-review.md` § Reused parts and `references/m11-commit.md`'s **Diff surface (`commit_review_gate` branch)** paragraph each enumerate the sections that caller reuses and carry their own `Keep ... in sync` directive.
  - Removed the **Browser-side scope-toggle caveat** paragraph: it describes what a human reviewer may switch inside crit's browser UI, which changes nothing the agent does or passes.
  - Removed justifying subordinate clauses attached to rules stated unconditionally: why both probes run unconditionally, why the crit probe is independent of Step 4's, why the install URL wins when both probes fail, why `HEAD` is not re-resolved per round, why the story ingest repeats each round, why the metadata-only branch appends no `fast_mode_skipped_steps` string, why the chat presentation is the floor, and the `Agent`-dispatch-site accounting for the background launch, which `SKILL.md` § Configuration's `Agent` tool usage bullet states.
  - Removed the restatements that another passage already carried: the candidate-build failure routing in § Procedure step 3 (§ Fallback contract owns it), the story ingest's read-both-streams and `--no-open` carve-out clauses (§ crit CLI contract states both), and the dirty-working-tree sentence duplicated between the **Scoping mechanism** and **Scope** bullets.
  - Kept the statements a removal would silently break: the file/dir-mode prohibition with its no-diff consequence, the `command -v crit` grant guard, "This gate synthesizes no object of its own" with its no-unstage consequence, the heredoc terminator rule, the `scope: "line"` re-verification ordering, the `cancel` > `adjust` > `accept` priority resolution, the branch **c**/**d** normal-completion carve-out, the re-enter-`a`-only instruction, and the actual-code tie-break.
  - No heading, bold label, or § Procedure step number changed, so every inbound reference from `SKILL.md`, `references/interactive-commits.md`, `references/step7.5-rules-compliance.md`, `references/finish-phase.md`, and the three `mobpro` reference files still resolves.
  - Category: `ambiguity`

## 2026-08-20

### dev-workflow v1.118.12 / dev-workflow-bundle v1.140.22

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 12 of 16)
  - Scope is `references/interactive-commits.md`, the Step 10 procedure body: 45,640 to 40,157 chars (-12.0%). `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the other chunks.
  - Removed the preamble's canonical-home sentence and its list of what `references/finish-phase.md` § Step 10 keeps inline. That file's own delegation pointer already declares the canonical home, and each listed element -- the entry conditions, the `landed_count` contract, the **Approval token closed list**, the **Localized summary tokens** -- is declared at its own site there. The reference-resolution sentence naming the four `§` pointers that resolve outside this file stays, since that is the rule by which they resolve.
  - Removed justifying subordinate clauses attached to rules stated unconditionally, across every Procedure: why the rename field pair matters (`git add` fails loudly on a rename's old path), why the entry snapshot is recorded, why release bookkeeping takes its own group, why an empty group is omitted, why boundary groups are not merged by default, why the default-branch guard resolves locally first, why the frozen-tree notice needs no extra test, why both crit probes run, why per-commit staging is reset on each early exit, and why the failure tokens and rendering blocks take the shape they do.
  - Removed statements describing what sibling files and other steps do internally: how `diff-presentation.md` § Detached review object scopes its own snapshot, what obligation Step 5's exit unstage carries, what `crit-commit-review.md` § Procedure step 1 re-runs for a caller that ran none, and the "same shape as `step4-finalize-plan.md`'s **Browser-reachability probe**" comparison. The `Source of truth` / `Membership` directives on the probe pair and the crit-suppression carve-out stay -- `mobpro` `references/m11-commit.md` and `references/diff-review.md` both point at them for the owning sections.
  - Removed the editor-facing note that the sites reaching the **Stale boundary -> pathspec derivation** conditions point there rather than restating them, and the note that no cross-step variable is declared for `<step10_entry_snapshot>`.
  - Removed the duplicate roster prohibition in § Collect changes; the same prohibition sits on § Post-commit auto-modify cycle bound's own comparison rule, where the decision is made.
  - Kept the statements a removal would silently break: the porcelain flag guards (`=v1`, `--untracked-files=all`, `-z`) and `--no-renames`, every consequence clause naming a silently-wrong tree (a cumulative boundary tree dropping later steps, `git write-tree` reading the whole index, `git diff --name-only` never listing an untracked path, a bare `git diff` reading the index on its right-hand side), the prohibitions on `git checkout HEAD --` for exclusion and on `git switch` to the candidate, the reconciliation between the entry snapshot and the no-per-file-diff rule, the "not auto-recovery" carve-out, and the closed failure-token set.
  - Category: `ambiguity`

### dev-workflow v1.118.11 / dev-workflow-bundle v1.140.21

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 11 of 16)
  - Scope is the Step 7 / Step 7.5 verification layer -- `references/step7-check-test.md` and `references/step7.5-rules-compliance.md`: 43,581 to 33,358 chars (-23.5%). `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the other chunks.
  - Removed both files' preambles. Each enumerated what stays inline in `SKILL.md` and what the file holds, which `SKILL.md` Step 7 sub-steps 1 / 2, its **Flag lifecycle contract** paragraph, and its Step 7.5 delegation pointer already name in full. `step7.5-rules-compliance.md` keeps its reference-resolution sentence, which is the rule by which unqualified `§` pointers resolve. This clears the last `Content is verbatim-extracted, retaining its original numbering and indentation.` instance from the dev-workflow tree.
  - Removed `step7-check-test.md`'s "Cross-boundary positional note", which existed to tell the reader that one bullet's "the bullet above" pointed outside the file. That bullet now names `SKILL.md` Step 7 sub-step 1's "On failure, fix and retry" action directly, so the pointer resolves without the note.
  - Removed the duplicate No-Stall reconciliation in § check_commands scope-narrowing / scope-drift stops. The same declaration sits on the scope-drift stop directive itself, where the temptation to exit lives; the section intro's copy restated it.
  - Removed justifying subordinate clauses attached to rules stated unconditionally, across the `test_commands` self-check suite and both concurrent-launch paragraphs: why a diagnostic pass exists, why scoped test invocation is preferred, why `git stash` is the last resort, why re-initializing the launch flags on a non-pass entry is harmless, why "default to parallel" is the common case, why the nesting bound must not be phrased as an availability claim, and why a stale set on a no-launch path is safe. `SKILL.md`'s **Flag lifecycle contract** is the source of truth for the flag lifecycle, so the two set-site index sentences and the two no-op safety notes were restating it.
  - Removed descriptions of what other steps and callee skills do internally: `rules-review`'s per-category `Agent` dispatch, `ask-peer`'s and `rules-review`'s fallback triggers, `run-tests` lacking an inline fallback, Step 8 sub-step 1's discard-and-re-dispatch, and Step 6.5's retry-once handling. Also removed the "General principle:" summary closing the pre-existing-vs-regression bullet, the "second safety net" reassurance pointing at the scope-drift guard, and the sibling-mechanics summary opening the code-review launch paragraph.
  - Kept the statements a removal would silently break: every consequence clause naming a green-but-wrong test outcome (representative-suite coverage, downstream artifacts, headless automation bypassing real input layers, stale build artifacts, workflow-self-contaminated failures), the **Responsibility scope** purpose clause and the Step 7.5 / Step 6 / Step 8 / Step 11 boundaries, the "Who continues into (b)-(d)" dispositions with their unverified-fix consequences, the `mobpro` routing parenthetical that skill's M9 sub-step 2 relies on, the `<site>`-slot clause `SKILL.md` quotes verbatim, and the No-Stall reconciliation on the pre-declared degraded procedure.
  - Category: `ambiguity`

### dev-workflow v1.118.10 / dev-workflow-bundle v1.140.20

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 10 of 16)
  - Scope is Step 5's implementation layer -- `references/step5-implement.md` and `references/diff-presentation.md`: 35,425 to 28,125 chars (-20.6%). `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the other chunks.
  - Removed both files' preambles. `diff-presentation.md`'s restated what each section already says its caller supplies, plus a "single canonical home ... a caller points here rather than restating the steps" note addressed to future editors. `step5-implement.md`'s enumerated which sub-steps stay inline in `SKILL.md`, which `SKILL.md` Step 5 already lists in full -- including sub-step 9 and sub-step 2.5's placement between 2 and 3.
  - Removed `diff-presentation.md`'s two "use only part of the five-step shape" bullets. The `interactive-commits.md` step subset and its no-unstage-on-landing rule live in the § Caller endpoints table and in `interactive-commits.md`'s own § Per-commit loop sub-step `a`; the `step5-implement.md` subset folded into its table row; "Step 10's `crit` path is not a caller here" is stated by `crit-commit-review.md`'s **Scoping mechanism** bullet. The table cell that read "see the note below" now names that closed list directly.
  - Removed justifying subordinate clauses attached to rules stated unconditionally, across sub-steps 2-8, 10, 11 and § Sub-step 2.5: why the main thread is the default executor, why secondary descriptions of a cross-reference target are not trusted, why a missing blank line between Markdown blocks matters, why narrative prose escapes an enumerated sweep list, why an alias sweep is needed, why the index must not be reset between boundary builds, and what an unchanged tier assessment leaves untouched.
  - Removed descriptions of what sibling files hold: what `tier-escalation.md` does on escalation, the other two sanctioned `Agent` exceptions (`SKILL.md` § Configuration's `Agent` tool usage bullet holds that closed list), `mobpro`'s matching `step5_staged_paths` append placement, and the `interactive-commits.md` `git read-tree HEAD` guard comparison. Also removed the "General principle:" summary closing the `AskUserQuestion` option-design item and the "permissive guidance (no config flag)" meta-note.
  - Kept the statements a removal would silently break: that the rendering-ladder thresholds are fixed internal constants and not configurable, sub-step 7's three probe-trigger examples (they decide whether the gate fires), and five sentences naming a breakage that raises no error -- leftover staged paths with no record for the exit unstage, a partial boundary chain folding steps into the wrong Step 10 group, grep prefix/anchor errors dropping matches, the `allowed-tools` grant not preventing parent-directory landing, and a probe artifact overwritten before observation.
  - Category: `ambiguity`

### dev-workflow v1.118.9 / dev-workflow-bundle v1.140.19

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 9 of 16)
  - Scope is the Step 1.5 decomposition layer plus `--init` -- `references/task-decomposition.md`, `references/task-decomposition-normal.md`, `references/task-decomposition-resume.md`, and `references/init-mode.md`: 38,742 to 33,535 chars (-13.4%). `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the other chunks.
  - Removed both extracted-reference preambles ("Section A / B of `task-decomposition.md` ... Read that file first") and the shared core's own reader map. Every caller sequences the two reads already: `SKILL.md` Step 1.5's Resume and Normal sub-mode bullets, `mobpro` `SKILL.md`'s M2 procedure, and `references/workability-retrospective.md`'s state-file creation branch. The `## A.` / `## B.` pointer headings a few lines below the removed index carry the same routing with their read conditions.
  - Removed the two `Source of truth: ...; this heading stays as the stable anchor for bare § A / § B references` sentences. The headings themselves are untouched and every live cross-reference to them is file-qualified.
  - Removed rationale clauses attached to rules stated unconditionally: why a malformed state file must stop the run (the identical silent-corruption consequence stays on the single-writer prohibition five lines below), why the progress row never takes the `in_progress` slot, why no completion logic is duplicated into the shared core, what the decompose chat line is an audit trail for, why mixed signals favour decomposition, why the primary signal overrides the vetoes and the axes override the overhead veto, why a shared-dominant unit set collapses into one subtask, why the skeleton subtask records its stubs, why `verification_hint` is advisory, why frontier precondition prose goes to the user, why a missing runnable frontier implies a hand-edited file, why the parent task's text is kept as context, and why the mid-execution note is surfaced.
  - Removed situational descriptions that name no branch criterion: that an all-completed state file means the previous run died before cleanup, and that leftover `in_progress` rows come from an interrupted session or a hand edit. Also removed the planning-draft condition restated verbatim one line below its own branch point -- step 3 now carries the "no `---` block at the top" gloss that 3a had, and 3a opens on its disposition.
  - In `--init`: removed the allowed-tools half of the `tsc --showConfig` prohibition (the `grep`-false-hits half stays, since that failure is silent), the restatement of step 6's confirmation gate, why Solution-Style roots fail `tsc -p`, the provenance of the `model: sonnet` surgical directive, the equivalence claim about extract-before-remove, why a regenerate subsumes a surgical patch, the parenthetical arguing the two dispositions do not conflict, four Template-conformance-backstop rationale clauses, the authority-side `single source of truth` self-description on the Adaptive regions list, and `(config is already saved)`.
  - Removed two editor-facing list-maintenance instructions from step 4a: the known-gaps append / drop note and the backstop's "promote a recurring hit to a known-gap entry" pointer at it. Neither is reachable from an `--init` run.
  - **Propagates to generated skills**: the embedded run-tests template no longer carries the cost-choice justification for `model: sonnet`, so a `run-tests` skill generated by `--init` no longer receives that sentence. The `model: sonnet` directive itself -- the anchor step 4a's known-gap detection and the backstop both read -- is unchanged, so an existing skill's conformance verdict does not move.
  - Kept: the single-writer prohibition with its failure mechanism and the canonical-path rule with its orphan / mis-delete clause, both of which break silently; every decompose / veto criterion and the Precedence rules; the incremental-depth axis's in-kind distinction from the recognizing signals and its label discriminator, which `mobpro` cites; the known-gaps list's declaration that it is not the completeness boundary; step 4's schema-violation versus planning-draft distinction; and, in step 8, that newly created skills are not registered in the current session and that init verification needs no subagent.

### dev-workflow v1.118.8 / dev-workflow-bundle v1.140.18

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 8 of 16)
  - Scope is the Step 2 simplicity-audit layer -- `references/simplicity-self-audit.md` and `references/simplicity-self-audit-express.md`: 38,007 to 32,679 chars (-14.0%). `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the other chunks.
  - Removed the express file's reader map -- which lane reads which file. Every caller already names it: `references/step2-create-plan.md` sub-step 4, the `references/tier-assessment.md` § Lanes table row, and `references/tier-escalation.md` step 3. The file keeps its identity sentence and the instruction to audit against every item.
  - Removed the full-lane file's restatement that its items fire only on a design judgment, which is why the express lane defers them. `README.md` § Express lane carries the same claim, and `references/step2-create-plan.md` sub-step 4 already routes a lower-tier trigger to the express file's escalation-signal paragraph.
  - Removed rationale clauses attached to rules stated unconditionally: why mismatched domain premises survive plan reviews, what an uncompared `diverge` decision costs at the Step 4 gate, why the deferral vocabulary is named, why the deferred-work record must be navigable, that relegating a blocked primary objective to Risks orphans it, what an unresolved commit-split conflict permits, why a structural fix is not scoped to one component, why the consistency cost is recorded, why experimental behavior yields to opt-in, what a missing platform-capability audit costs at Step 10, why the peer-dependency check is answered one step earlier, why a hidden state composition fails at integration time, the prompt-injection mechanism behind sub-skill argument minimalism, what an implicit convention tension resurfaces as, why a mitigation-only plan is recorded, why the contract-preserving option is evaluated first, what a missing sibling-extension enumeration hides, why gating config-dependent steps is non-deterministic, why the internal-lever path stays visible, and what inconsistency debt a single-instance structural change creates.
  - Removed three `(Why ... is in dev-workflow's README.md § ...)` pointers into the README's maintenance sections. A relocation leaves no pointer behind; keeping one returns editor-facing prose to the hot path.
  - Moved the canonical-home statement, the `Step 2 § Simplicity self-audit` anchor resolution, and the closed list of sites citing that anchor to `README.md` as § Renaming the Simplicity self-audit label. The list had no other home, and `README.md` is tracked but never read at runtime. Its four sites were re-derived by grep: `references/review-categories.md` (Step 3 reviewer category (a)), `references/step5-implement.md`, `references/plan-authoring.md` § Step 2 self-check, and `references/task-decomposition-normal.md`.
  - Kept: § Experimental feature gating's rule text byte-intact, including its literal marker enumeration (`experimental`, `recently added`, `still in trial`) and the graduation clause -- this file reads those markers out of `SKILL.md` prose to pick a new config flag's default, so the words are its own input; every `Distinct from <sibling item>` boundary sentence and the reviewer-versus-self-check boundaries; the reinforcements that close a plausible shortcut in a self-check nothing enforces; and every bold item label plus the **What the express lane defers, and why noticing it is an escalation signal** paragraph label, which `references/step2-create-plan.md` sub-step 4 cites by name.

### dev-workflow v1.118.7 / dev-workflow-bundle v1.140.17

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 7 of 16)
  - Scope is the tier / plan-approval-gate layer -- `references/visual-plan-review.md`, `references/tier-assessment.md`, and `references/tier-escalation.md`: 42,752 to 33,030 chars (-22.7%). `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the other chunks.
  - Removed both reference preambles' reader map -- which step reads the file and which section it runs. Every caller already names the section it reads: `SKILL.md` Step 1.5 names `references/tier-assessment.md` § Resolution procedure, and that file's § Escalation names `references/tier-escalation.md` with its read condition.
  - Removed the rationale clauses attached to rules stated unconditionally: why the escalation re-runs § Resolution procedure steps 2-5 in full and leaves step 6 out, why the unmarked-row test is the clean one, why a subtask keeps its parent's tier, why the express lane skips its four steps while the three config-driven ones are never skipped, why the fast-mode ledger append is conditional, why the escalation note names the tier, why the served plan file needs no block markers, why the URL file exists and the stale one is cleared, why background dispatch is required, and why the revise loop needs no iteration cap.
  - Removed viewer-side description that an executing agent never acts on: the review surface's UI affordances, the transport-only split between `serve.mjs` and `public/index.html` (§ serve.mjs contract's `GET /api/plan` bullet already states the server does not segment the plan or enumerate block ids), the browser's diff rendering, and the caveat that the rendered diff is a guide rather than an authoritative one.
  - Removed reassurances that state no rule: that judging on thin evidence is bounded by the one-way invariant, that a `fallback` never stalls the workflow, that the plan-approval gate and `check_commands` / `test_commands` remain the safety net (§ Difficulty-skip matrix states this already), and that block ids need not stay stable across renders.
  - Relocated two editor-facing closed lists to `README.md`, which is not read at runtime: the visual gate's return-contract coordinated-sweep list to § Changing the plan-approval gate's return contract, and § Lanes' lane-difference membership sentence to § Changing the express / full lane difference set. Both moved rather than being dropped, because neither had another home.

### dev-workflow v1.118.6 / dev-workflow-bundle v1.140.16

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 6 of 16)
  - Scope is the Step 3 / Step 4 review-and-approval layer -- `references/step3-plan-review.md`, `references/review-categories.md`, and `references/step4-finalize-plan.md`: 46,557 to 37,505 chars (-19.4%). `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the other chunks.
  - Removed the two extracted-reference preambles' enumeration of what `SKILL.md` keeps inline and what the file itself holds. `SKILL.md`'s Step 3 and Step 4 delegation pointers already name every sub-step and section. `references/step4-finalize-plan.md` keeps a one-clause orienting sentence in its place, because its leading body is sub-step 2 while sub-steps 1 and 1.5 follow it in the file.
  - Removed rationale clauses attached to rules stated unconditionally: why the per-group Reads / Covers instruction is needed, how the three review groups were drawn, why the reference links are resolved to concrete paths, why the express lane hands `references/simplicity-self-audit-express.md` alone, what a wrongly-skipped sub-check costs, why the reviewer's verdict is judged semantically, why the plan-body polish skip emits no note, why the polish runs after the prose-language self-audit, why a Trivial plan skips the browser gate, why the Step 3-completion check matters, why the prose-language audit re-runs on re-entry, why the lane rather than the tier keys the express-lane re-activation, and why the whole tier-resolution procedure is re-run rather than just the two review flags.
  - Removed the four `General principle:` restatements in `references/review-categories.md`, each of which generalized a sub-check whose own text already enumerates the full procedure, plus the symmetric-lifecycle restatement and three consequence clauses.
  - Removed negative safety claims about the design: that the two `prose-polish` call sites never overlap, that Step 3 has no background-launch path to double-apply against, and the `Why the exception is safe` bullet. These are design-time conclusions the executing reviewer never consults. That bullet's one behavioral sentence -- when the `--fast` Step 6.5-only skip is re-evaluated -- moved into the Exception bullet it qualifies.
  - Removed the authority-side `source of truth ... edit the two together` declaration for the review-phase row-clearing condition. `references/tier-escalation.md` step 2 already carries the reference-side `Source of truth: ...; keep this condition in sync with it`.
  - Moved `references/review-categories.md`'s rename-sweep enumeration -- which files cite the bold sub-check labels verbatim -- to `README.md` as `Renaming a review-category label`. It is an editor-facing sweep record with no other home, and `README.md` is tracked but never read at runtime.
  - Kept: both Anti-skip guards; the `Key this on the assessed tier` prohibitions; `Simple stays on the visual gate -- only Trivial takes this route`; the two code-review self-checks that close a plausible shortcut (green-before-the-fix consumer suites, apparent group co-location); the Tidy-revival consequence clause, whose breakage passes undetected; the non-boolean fall-back-to-`true` clause on `polish_prose`; and the rule that an `error` verdict appends nothing to `bundle_skills_unavailable`.

### dev-workflow v1.118.5 / dev-workflow-bundle v1.140.15

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 5 of 16)
  - Scope is the plan specification layer -- `references/plan-authoring.md`, `references/plan-format.md`, and `references/step2-create-plan.md`: 46,028 to 38,758 chars (-15.8%). `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the other chunks.
  - Removed the extracted-reference preambles' table of contents -- `references/step2-create-plan.md`'s enumeration of which sub-steps stay inline in `SKILL.md` and of what the file itself holds, the two companion files' `Read this reference when executing` routing lists, and the framing that explains how the specification is split between them. `SKILL.md` Step 2's delegation pointer names each sub-step, and the section pointers inside both files already route the reader. `references/step2-create-plan.md` keeps the substantive half of its preamble: that Step 2 initializes no cross-step variable, and where the initialization table lives.
  - Removed rationale clauses attached to rules stated unconditionally: why the difficulty-confirmation sub-step stays inline, why `§ Subtask / Resume handling` is full-lane only, why the TDD-loop-external declaration resolves the apparent conflict, why making task-relevant skill use explicit is worth it, why the express lane cites the empty-Decisions sentences rather than copying them, why `Build order` keeps its step shape at a single step, why the express lane omits the `> Review guide` line, why a carry-over document needs the template skeleton first, why the disabled-plan-phase causes are evaluated in the order given, how the affected-files promotion threshold is derived, why a single-item gate omits its preamble, and why the Step 4 chat approval is a two-tier presentation.
  - Removed sibling-equivalence and cross-file restatements: `like every other Agent dispatch site`, `an intentional divergence from Step 5`, `exactly as on the full lane`, the note that `references/step4-finalize-plan.md` keys on the same discriminator, the pointer noting that `references/plan-format.md` carries the matching express-lane omission, and `§ Traceability`'s `single source of truth` paragraph (`§ Step 2 self-check` carries the pointer and `§ Sizing guidance` the padding-rule exemption).
  - Removed text addressed to a future editor rather than to the executing agent: `state this inversion so it does not read as a contradiction of Step 5`, `the sentences are cited, never copied`, `don't extend those other two sections to this multi-line form`, and the label marking the paired bilingual sample as a rendering demonstration.
  - Moved rather than removed: `references/plan-authoring.md` § Template's sweep list for the `Build order` heading name and step shape now lives in `README.md` § Sections, re-anchored to name the section it governs. The coordinated-sweep requirement is that the enumeration exist, and `README.md` is tracked but never read at runtime.
  - Unchanged: every section heading and bold label, `§ Localization granularity`'s heading and delegating pointer, and `§ User-gate summary preamble`'s Applies-to list, Content slots, and closed list of gates that emit no preamble -- a `verify-skill-refs` manifest pair and a project rule example anchor on those. Kept as load-bearing are the two statements bounding `§ Step 2 self-check` against the Step 3 content-quality rubric, the contrast marking the `> Review guide` bullets as rendered output rather than blockquote formatting to strip, the prohibition on keying the skipped-review sentence to `code_review_enabled` instead of the assessed tier, the independence of each gate's Optional preamble slots, and the reminder that an explicit `no decisions` does not discharge the buried-decisions scan.

### dev-workflow v1.118.4 / dev-workflow-bundle v1.140.14

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 4 of 16)
  - Scope is the settings layer -- `references/configuration.md`, `references/step1-load-settings.md`, `references/prerequisites.md`, and `references/localization.md`: 44,455 to 36,859 chars (-17.1%). `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the other chunks.
  - Removed the extracted-reference preambles' table of contents -- each file's enumeration of what stayed inline in `SKILL.md` and of what the file itself holds, plus the `Content is verbatim-extracted` provenance sentence. `SKILL.md` carries a delegation pointer per sub-step that already names each section. `references/configuration.md` keeps the substantive half of its preamble: that the `Agent` tool usage bullet stays inline in `SKILL.md` and is therefore not detailed there.
  - Removed the authority-side sweep directives -- `references/configuration.md`'s `this file is the source of truth -- keep the two in sync` and `references/prerequisites.md`'s `single source of truth` declaration for the `simplify` to `tidy` resolution. Both reference sides carry the directive already (`SKILL.md` § Prerequisites and § Configuration; `references/step6-tidy.md`'s pointer at the Cleanup skill bullet).
  - Removed rationale clauses attached to rules stated unconditionally: why a configured `plan_review: false` lands in neither skip ledger, why the concurrent code-review launch is suppressed when `code_review` is off, why `--fast` leaves `code_review_enabled` alone, why `prose-polish` keeps its own model default, why the resolved reviewer is probed even when it is the default, why the registration burst is a single batch, and why the value-shape overlay rules are evaluated before the type-class rules.
  - Removed version history that the CHANGELOG and `README.md` hold: `polish_prose`'s `Behavior change from v1.78.0` note and its history trailer (`README.md` keeps the same paragraph), the removal release of the three diff-threshold tombstone keys, and the release that made the Task tools the default (the same sentence's fallback condition keeps the version number).
  - Removed `allowed-tools`-explaining prose and sibling-equivalence restatements, including the two clauses restating what the difficulty tier gates when explaining that it does not gate the retrospective steps.
  - Removed `test_commands`' illustrative list of appendable structural checks. It named this repository's own checks inside a distributed skill, so the deletion also settles the distribution rule against application-context-fixed vocabulary in shipped skill prose.
  - Unchanged: every section heading and bold label, the `language` bullet's exhaustive enumeration of localized outputs, the `subagent_model` governance enumeration with its declared exclusions, the per-class overlay merge semantics, and `workability_retrospective`'s `Like self_retrospective` classification phrase -- `verify-skill-refs` manifest pairs and `mobpro` anchor on those. Kept as load-bearing are the experimental markers on `implementation_executor`, `commit_review_gate: crit`, and `workability_retrospective.enabled` (`references/simplicity-self-audit.md` reads them to pick a new sibling flag's default, and their removal would read as the feature having graduated), the over-preservation failure mode in the localization Negative-direction rule, and the note that `prose-polish`'s style guide covers only two of the four sentence-construction sub-rules.

### dev-workflow v1.118.3 / dev-workflow-bundle v1.140.13

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 3 of 16)
  - Scope is `SKILL.md` from `Step 8: Code Review` to the end of the file plus `references/step8-code-review.md`, `references/code-review-payload.md`, `references/step9-completion-hooks.md`, `references/step6-tidy.md`, and `references/step6.5-polish-prose.md`: 44,146 to 34,727 chars (-21.3%). The rest of `SKILL.md` and the remaining `references/*.md` files are untouched and are covered by the later chunks.
  - Removed the extracted-reference preambles' provenance text -- `Content is verbatim-extracted, retaining its original numbering and indentation` and each file's enumeration of what stayed inline in `SKILL.md`. `SKILL.md`'s delegation pointer for each of those files already enumerates its sub-steps. `references/step6-tidy.md` keeps its enumeration sentence, because `verify-skill-refs` anchors a manifest example on that file carrying `Cross-layer review handoff ledger` as a bold span.
  - Removed rationale clauses attached to instructions stated unconditionally: why the escalation pass exists, why the finish phase loads at the `Step 8.5: Deferred Verification` exit, why gate 2 carries a tier leg, why `Step 6.5: Polish Prose` computes its own changed-file set, and why re-executing an inspection-class cleanup skill is safe.
  - Removed editor-facing text: `append here when another is introduced` on the disabled-phase cause list, the `Source of truth` note on `## Sub-step 1 -- reviewer report payload`, `this contract deliberately does not re-list them` on the finish-phase input contract, and the note scoping the `Base ref` asymmetry rationale to the `tidy` path.
  - Removed table-of-contents restatements of a pointed-at file: sub-step 1's inline summary of the reviewer payload's items, which `references/step7-check-test.md` already names the single parametric source and instructs not to restate, and the gate-2 detail enumeration.
  - Removed the `Coverage tradeoff` bullet from `references/step8-code-review.md` and its citations in `SKILL.md` and that file's preamble. It carried no imperative, and the scope note in the gate-2 invocation bullet is what suppresses paired-change flags.
  - Unchanged: every section heading, the `Step 8` unresolved-findings gate declaration, both `Return-point no-stall reminder` blocks, the `## Dispatch authorization` section held byte-identical across bundle members, and every task-row subject literal and cross-step variable name. Kept as load-bearing are the silent-failure consequences (passing `Base ref` to `tidy` drops untracked files from the cleanup scope; skipping `Step 8.5: Deferred Verification` leaves `review_fix_files` unverified), the sibling-consistency guard on that same asymmetry, the `mobpro`-facing omission rule in `references/code-review-payload.md`, and the reason the rubric link must be resolved to a concrete path before the reviewer sees it.

### dev-workflow v1.118.2 / dev-workflow-bundle v1.140.12

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 2 of 16)
  - Scope is `SKILL.md` `Step 1.5: Task Decomposition` through `Step 7.5: Rules Compliance Review` plus `references/executor-prompt.md`: 40,328 to 36,929 chars (-8.4%). `Step 8` onward and the remaining `references/*.md` files are untouched and are covered by the later chunks.
  - Removed rationale clauses attached to instructions stated unconditionally: why the two Step 1.5 sub-modes resolve the tier in different orders, why the express lane skips decomposition, why an unreviewed plan must not reach the user, why Step 3 is an internal review, why Step 6 exists as a dedicated pass, why Step 6.5 sits between Step 6 and Step 7, why Step 7.5 is kept separate from Step 8, why a stale background result is discarded whole, why the read-back sub-step catches partial-coverage instructions, and why `test_commands` is never backgrounded.
  - Removed provenance and history framing: where and when `plan_review_enabled` was resolved for each of its three causes, which site marked the row `completed`, the derivation that both Step 7 launches are initial-pass-only, the `no longer` framing on the Step 7.5 re-verification pointer, and the naming history of the Step 6 cleanup phase.
  - Removed editor-facing text: `append here when another is introduced` on the Step 3 closed list, `because other steps read them` on the Step 5 inline-retention note, the `Single canonical home; do not duplicate this prompt body` note in `references/executor-prompt.md`, and the pointer to the design rationale in `README.md` for the Step 7 background launches. Also dropped are the table-of-contents restatements of what `references/tier-escalation.md` does and of the `Post-hook attribution check` consumer.
  - Swept across the tree in the same commit: the `intentionally duplicated here so the rule fires at the decision moment` tail on all four **Return-point no-stall reminder** sites (three in `SKILL.md`, one in `references/step3-plan-review.md`), so the sibling reminders stay structurally aligned. Each reminder's instruction and its closed list of non-fatal outcomes are unchanged.
  - Unchanged: every gate declaration, closed list of causes, cross-step variable contract, and flag-lifecycle rule in the touched range; the `Cross-layer review handoff ledger`, `Flag lifecycle contract`, `Build-order boundary chain`, and `Where the re-verification went` labels that other files and `skills/mobpro` cite; and the sanctioned-`Agent`-exception enumeration. Kept as load-bearing are the nested-dispatch synchronicity constraint in `references/executor-prompt.md`, the `it leaves code_review_enabled alone` carve-out on the `--fast` cause, the prohibition on salvaging a subset of a stale report, and the tier-never-falls rule.

### dev-workflow v1.118.1 / dev-workflow-bundle v1.140.11

- refactor(dev-workflow): drop prose that does not change agent behavior (chunk 1 of 16)
  - Scope is `SKILL.md` lines 1-205 -- the preamble, `§ Usage`, `§ Prerequisites`, `§ Configuration`, `§ Phase naming in user-facing output`, `§ Mode Detection`, `§ Init Mode`, `§ No-Stall Principle`, `§ Progress Visibility`, `§ Workflow artifacts`, and `Step 1: Load Settings`: 44,008 to 41,642 chars (-5.4%). Lines 206 onward and every `references/*.md` file are untouched and are covered by the remaining chunks.
  - Removed: the table-of-contents parentheticals listing what each reference file holds (`§ Prerequisites`, `§ Configuration`, Step 1 sub-steps 4 and 8), the pointer to the design rationale in `README.md` for where cross-step variables are initialized, and the duplicate `single source of truth` assertion on the Cleanup-skill bullet that `references/prerequisites.md` already carries. Also removed are rationale clauses attached to instructions stated unconditionally: the reason the phase registration list is the single authority, the reason a `bundle_skills_unavailable` record's `<context>` never carries a step number, the reason the `<context>` stays English, the reason external-CLI reviewers take no propagated model, the placement rationale and sibling-mechanism attribution on the ledger initialization, the reason for the upfront `TaskCreate` burst, the reason a `check_commands`-era fix needs no re-verification, the reason the space form is used inside a parenthetical, the reason the pre-call status line exists, and the coverage-gap preamble to the mid-chain visibility rule. Dropped restatements: the sentence re-bounding the No-Stall Principle to successful outcomes, the sentence relating the callee-verdict-transcription rule to the no-summary-turn rule, the analogy between the pre-completed row guard and the Trivial-tier skips, the `Agent`-over-`Skill()` rationale pointer, the `hooks.on_complete` carve-out citation, and the Task-tools version provenance the fallback condition already states.
  - Unchanged: every gate in `§ No-Stall Principle`'s closed enumeration and the fatal-error carve-out list; the `## Dispatch authorization` section, held byte-identical across bundle members; every task-row subject literal, `bundle_skills_unavailable` record format, and configuration key name, so Step 1's registration burst and every later string-matched `TaskUpdate` still agree; the three fixed `Agent` dispatch sites and their boundaries; and the `Workflow artifacts` exclusion list with its append instruction. Kept as load-bearing are the reviewer-availability probe's independently-installable-sibling clause, the task-row-subject string-matching consequence, and the phase-boundary self-audit's silent-skip consequence.

## 2026-08-19

### extract-rules v1.28.6 / dev-workflow-bundle v1.140.10

- refactor(extract-rules): drop prose that does not change agent behavior (chunk 5 of 5)
  - Scope is `references/conversation-mode.md` and `references/pr-review-mode.md`: 29,691 to 26,514 chars (-10.7%). This completes the five-chunk pass over the skill.
  - Removed from `conversation-mode.md`: the producer-facing half of the `§ Rule-candidate contract` intro -- which orchestrator emits the block, and the sync direction that `dev-workflow`'s `references/rule-extraction-axis.md` already declares on its own side; per-field justifications for required-ness the same bullets already carry (`Name`'s stem role, `Signature`'s bullet-format and dedup-key roles, the prose-arrival clause on `Rule`); rationale attached to instructions stated unconditionally (the cleanup privacy clause, the promote-enabling parenthetical, the `Expect this test to reject` tail, the older-draft framing on the context phrase, the intentional non-anchoring of a 1st observation's code site, the staging-file-rewritten-by-either-path clause); `existing behavior unchanged` and other history framing; the `same convention as subagent-returned mechanical_edits` attribution; and restatements of neighbouring text (the edge-case gloss in branch (iii), the merge-rules provenance on the cross-format example, the note that the bilingual samples render the body and not the heading).
  - Removed from `pr-review-mode.md`: the itemized list of what `conversation-mode.md` is the single source of truth for, the pointer itself staying; the conceptual-tagging parenthetical in Step P1, which `§ Step C5`'s "Read existing rule files" step defines; the restatement of Step C5's `Edit` semantics in step 5; and rationale clauses (the 3-API-calls figure, `ranges often contain issues or gaps`, `useful for detecting organization-wide principles`, `existing behavior`, the general-knowledge-filter preamble whose examples the bullet list below it repeats, and the organizational-emphasis gloss).
  - Unchanged: every field name and enum value of `§ Rule-candidate contract`, so Step A1's fail-loud validation and the producer schema in `rule-extraction-axis.md` still agree; every section heading and bold label other files cite. Also kept are `## Mode interaction summary` and its pre-populated-staging edge case, now trimmed to the mechanism and the remedy -- Full Extraction ignores an existing staging file silently, so delete the staging directory manually once the staged candidates no longer apply; the execution-responsibility prohibition on returning proposals instead of performing the writes; the override in item 6 that exempts the Principles-format hints from the incident-parenthetical cap; the manual-promotion boundary in item 2; the exclusion of staging-only items from `.examples.md`; and the sentence in Step P4 that zero extractable rules is an expected outcome.

### extract-rules v1.28.5 / dev-workflow-bundle v1.140.9

- refactor(extract-rules): drop prose that does not change agent behavior (chunk 4 of 5)
  - Scope is `references/compaction-mode.md` and `references/realign-mode.md`: 46,816 to 36,330 chars (-22.4%). Compaction mode accounts for most of it, since `SKILL.md` Step CP2 (a) injects that file's whole body as the compactor prompt and every sentence in it is therefore paid twice per iteration. One chunk remains.
  - Removed: the layer narration that restated "the subagent emits detection-only output, the main thread synthesizes the `Edit` calls" in five places and defended it against itself in two more; main-thread enforcement descriptions `SKILL.md` Step CP2 already carries (the two scope-rail narrations, the divergence-multiset mechanics, the iter-2 cluster-drift reason); both `Per-iter vs aggregated shape asymmetry` blockquotes, whose aggregated shape the Step CP4 schema defines; editor- and sibling-facing notes (the class-wide cross-reference invitation in `§ Forbidden tool calls`, realign's account of why it restates that section, six sibling-equivalence asides, the two compaction-vs-realign report-format comparisons); and the derivations behind the soft wording targets in `§ Compact cross_ref wording guidance`, including the whole "Why these targets are not strict" bullet -- the numbers and their soft status stay, and that section itself exempts them from the threshold-anchor rule.
  - Also drops a reference that did not resolve for installers: `§ Compact cross_ref wording guidance` named a rule that lives in this repository's `.claude/rules/`, which the plugin does not distribute. Deletion is the fix on both grounds, so it lands in the same commit.
  - Unchanged: every enum token, field label, and output literal both files' contracts expose, including the `See pattern:` literal anchor and the `per_file_status` / `reason` sets. Also kept are the `§ Forbidden tool calls` self-recognition paragraphs in both files, the Heuristic 2 / consolidation-gate boundary with its no-workaround-channel clause, the one-shot-dropout "highest-risk operation" line, the overlap-tolerance sentence that licenses emitting several edits from one snapshot, the silent-normalization warning on `old_string`, and realign's silent-failure consequences (duplicate labels, label correspondence both directions, the examples path resolved from the target's relative path, `git grep -F`, an untracked `output_dir` reading 0).

### extract-rules v1.28.4 / dev-workflow-bundle v1.140.8

- refactor(extract-rules): drop prose that does not change agent behavior (chunk 3 of 5)
  - Scope is `references/extraction-criteria.md`, `references/examples-format.md`, and `references/report-templates.md`: 33,264 to 29,377 chars (-11.7%). Two chunks remain.
  - Removed: the auto-load mechanics in `examples-format.md`, which the `examples_output_dir` row of the Configuration table and the Output Structure paragraph both carry and which `SKILL.md` is always read ahead of; purpose clauses on instructions already stated unconditionally (the 1:1-mapping justification, the two relative-path "so that" clauses, the staging-skip rationale, the Gray-zone `Rationale:` bullet, the two rationale clauses on the Realign report's exclusion line); provenance and sibling-file comparison (the "shape conversation extraction produces most often" attribution, the compaction-mode figure cited for the 400-char target, the Compaction heuristic-4 counterpart paragraph); motivational preambles in front of self-contained tests (the Durability and Reach openers); and restatements of neighbouring text (the `### Example classification` table, the `Rule of thumb` line, the code-signature elaboration, the per-section-invariant parenthetical in the PR Review template, and the duplicated all-modes list on the Portability check).
  - Two rewrites rather than deletions: the already-enforced-elsewhere signal in `§ Reach` now states its disposition directly ("skip the candidate"), and that section's closing sentence names "this test" now that its antecedent paragraph is gone.
  - Unchanged: every section heading, so the judge dispatch in `references/realign-mode.md` and the pointers from `SKILL.md`, `references/pr-review-mode.md`, and `references/conversation-mode.md` all still resolve. Also kept are the Compaction Mode rendering examples and the `per_file_status` caller sentence (nothing invokes `--compact` programmatically, so these decide user-facing output), the bold-label stability rule (renaming a label orphans its `.examples.md` entry silently), `§ Relationship with merge-rules`, the Good/Bad contrast table that `examples-format.md` cites by name, and the "settled convention" and "a linter could but this project does not" carve-outs.

### extract-rules v1.28.3 / dev-workflow-bundle v1.140.7

- refactor(extract-rules): drop prose that does not change agent behavior (chunk 2 of 5)
  - Scope is `SKILL.md` from `## Compaction Mode` to the end, plus `references/integration-criteria.md` and `references/resolve-references.md`: 33,044 to 29,748 chars (-10.0%). `references/security.md` was in scope and left as is. Three chunks remain.
  - Removed: six sibling-equivalence attributions to `verify-diff` / `publicity-review` / `skill-review`, which were also dangling references in the distributed copy since none of the three is a marketplace plugin; the rationale attached to rules already stated unconditionally (the `max_iterations = 2` justification, the entry-shape validation motive, the forward-compat lead-in, the `(d)` status derivation, the realign-first efficiency clause, the `--compact` gate-asymmetry explanation); the "widened" / "it now means" history framing on `skipped-below-threshold`; four restatements of neighbouring text; the "This asymmetry is intentional" / Trade-off / Rationale framing in Step CP1; and the 40k anchor duplicated from the `compaction_threshold` row of the Configuration table.
  - Unchanged: every enum token, field label, and output literal of the `--compact` return contract, so callers parsing the verdict are unaffected. Also kept are the `Bash(wc -m)` prohibition, the no-op fallback for an unmatched `old_string`, the bullet-extraction tie-breaker, the missing-key-to-empty-array rule, the Task-tools-unavailable fallback, `## Sub-skill caller directive`, and `## Stop hook structural conflict`.

### extract-rules v1.28.2 / dev-workflow-bundle v1.140.6

- fix(extract-rules): replace the maintainer's own path in the Step C1 session-path example
  - The encoding example in Conversation Extraction Mode used the maintainer's own home-directory path, putting a personal identifier into a distributed skill. It now reads `/Users/alice/src/github.com/acme/widget`, following the generic-user convention `dev-workflow`'s `references/self-retrospective.md` already uses for the same encoding step.
  - The example is kept rather than dropped: it is the only demonstration of the rule stated one line above it, and the replacement keeps a dot in the path because that rule replaces `/` **and** `.`.

### extract-rules v1.28.1 / dev-workflow-bundle v1.140.5

- refactor(extract-rules): drop prose that does not change agent behavior (chunk 1 of 5)
  - `SKILL.md` from the top through the section before `## Compaction Mode` goes from 40,446 to 35,781 chars (-11.5%); the whole file from 68,423 to 63,758. The remaining four chunks (the rest of `SKILL.md` and the ten `references/*.md`) are separate passes.
  - Removed: six restatements of the same `.claude/rules/**` auto-load fact, two descriptions of what `dev-workflow` does on its own side, the prior `compaction_threshold: 32000` default (the opt-out instruction lives in this file's v1.18.0 entry), the 26-line "Example output with integrations" tree whose every naming rule is already specified in prose, and the trailing `because` / `so` clauses on instructions stated unconditionally.
  - Unchanged: the `**Change-origin flags**` contract, the Update Mode operational note that `dev-workflow` references by name, the `examples_output_dir` / `staging_output_dir` opt-in instructions and the `paths:` auto-load guard, and every counter name in the mode reports.
  - Two sentences were restored during review: the Restructure-intro sentence saying which of `--restructure` / `--realign` a given change calls for, which `## Realign Mode` cross-references by phrase; and the rule that staging promotes in Step U5 item 8 also get an `.examples.md` entry.

### tidy v1.5.1 / dev-workflow-bundle v1.140.4

- refactor(tidy): drop prose that is never consulted at runtime
  - `SKILL.md` goes from 31,627 to 29,122 chars and `references/cleanup-checklist.md` from 12,180 to 11,618 (-7% together). The checklist is injected verbatim into every reviewer dispatch, so its share comes off each dispatch too.
  - Removed: `## Keeping the checklist fresh` whole (an editor-facing maintenance note), the "No divergence detection" paragraph that justified an absent feature by comparison with a sibling skill, the duplicate pointer to `§ Sub-skill caller directive`, the checklist preamble restated in the reviewer prompt, and the rationale tails on rules stated imperatively.
  - Unchanged: all four optional fields' semantics, defaults and validity rules including the `Model` field's "not part of a fixed-arity mode gate" marker; the whole return contract; the `Source of truth ... keep this enumeration in sync` sentence on `reverted_paths`; and two rationales whose breakage is silent — the untracked-file scope asymmetry under `Base ref`, and why iteration tasks are pre-registered.

### prose-polish v1.8.1 / dev-workflow-bundle v1.140.3

- refactor(prose-polish): drop prose that is never consulted at runtime
  - `SKILL.md` goes from 23,293 to 20,679 chars and `references/prose-style-guide.md` from 12,523 to 11,520 (-10% together). The style guide is injected verbatim into every refactor dispatch, so its share comes off each dispatch too.
  - Removed: `## Keeping the style guide fresh` whole (an editor-facing maintenance note), the opening paragraph's re-render of the `description`, the mode-gate summary that re-rendered the four determination bullets, the style guide's "canonical home" ownership declaration, and the rationale tails on rules stated imperatively.
  - Unchanged: the `## Invocation contract` field set, the style guide's `§ Preserve` section and every qualification criterion in `## Cross-file duplicate comments`, the whole return contract, and two rationales whose breakage is silent — why a shifted indent breaks an indentation-sensitive file, and why numbered list items are exempt from splitting.

### rules-review v1.8.1 / dev-workflow-bundle v1.140.2

- refactor(rules-review): drop prose that is never consulted at runtime
  - `SKILL.md` goes from 30,673 to 28,996 chars (-5.5%). The embedded reviewer prompt is injected verbatim into every reviewer this skill dispatches, so the trimmed clauses inside it come off each dispatch too.
  - Removed: the body intro re-rendering the `description`, the caller-usage examples and backward-compatibility labels around the optional `Model:` / `Files:` fields, two of the four narrations of the silent-clean risk, the `examples_output_dir` interop clause, and several rationale tails on rules that are stated imperatively.
  - Unchanged: every output literal and enum token callers parse — `No rule violations found`, the `status` / `reason` enums, `violations_count`, `(review failed)`, `(rule not evaluated — ...)` — plus both optional fields' semantics and defaults, their "not part of a fixed-arity mode gate" marker, the `Source of truth ... keep in sync` sentence naming the two `.claude/rules-extras/` hardcode sites, and the pointer-resolution bullet's warning that embedding a bare pointer returns a false clean.

### ask-peer v2.6.1 / dev-workflow-bundle v1.140.1

- refactor(ask-peer): drop prose that is never consulted at runtime
  - `SKILL.md` goes from 30,605 to 27,095 chars (-11%). The whole file is hot path — the Peer Agent Personality block is injected verbatim into every reviewer this skill dispatches — so the reclaim lands on each dispatch as well as each invocation.
  - Most of it is one shape: the "why this audit matters / what happens if you skip it" tail on thirteen Review Focus Areas bullets. Each bullet's instruction is an unconditional imperative, so the tail explained the rule rather than deciding anything. No audit trigger, severity rule or output requirement changed.
  - Retained: the three "This is distinct from <sibling clause>" paragraphs that stop a reviewer collapsing two similar audits into one, the negative trigger condition on the high cost-of-change audit, the informational-only constraint on the self-audit tag, and the unrecoverable-state warning under Verification safety. `## Dispatch authorization` is untouched.

### merge-rules v2.1.1

- refactor(merge-rules): drop prose that is never consulted at runtime
  - `SKILL.md` goes from 15,122 to 13,263 chars (-12%). No behavior change: each removed sentence was a rationale for a rule stated imperatively beside it, a re-render of the frontmatter `description` or of a sibling step, or a cross-file consistency note.
  - `## Conflict Handling` keeps only **Contradicting principles**. The other three rows — union hints, same name with different meaning, union paths — are stated as concrete actions in Step 4, which is where the procedure reads them.
  - Retained: the `-extras` derivation rule with its trailing-slash warning and `Source of truth` directive, the worked promotion-threshold examples, and every prohibition and scope boundary — including that demoting a promoted Principle is a manual edit rather than something a run performs.

### apply-rules v2.1.1

- refactor(apply-rules): drop prose that is never consulted at runtime
  - `SKILL.md` and `references/detection-heuristics.md` go from 26,363 to 21,327 chars (-19%), so every invocation loads that much less. No behavior change: each removed sentence was a rationale for a rule stated imperatively beside it, a re-render of the frontmatter `description` or of a sibling step, a cross-file consistency note, or a note addressed to a future editor.
  - `## Conflict Handling` is gone. All twelve of its rows are stated as concrete actions in Steps 4, 5.5, 6a, 6b, 6c and 7 — where the procedure actually reads them — so the table only re-rendered decisions defined elsewhere.
  - Retained: the `-extras` derivation rule and its `Source of truth` directive, every prohibition and scope boundary, the guard against hardcoding the three valid categories, and the glosses telling the agent that a `**/*.md` glob picks up co-located `.examples.md`.

## 2026-08-18

### dev-workflow v1.118.0 / mobpro v1.28.1 / dev-workflow-bundle v1.140.0

- refactor(dev-workflow): move the finish phase into `references/finish-phase.md`
  - `SKILL.md` drops from 124,292 to 97,025 chars, so a review subagent can now read the orchestrator whole in one pass — it could not before.
  - Step 9 through Completion — the completion hooks, interactive commits, rule update, both retrospectives, and Completion itself — move verbatim into the new reference. `SKILL.md` keeps all six section labels, so every `§ Step 9`–`§ Completion` cross-reference in the repo still resolves. The `Read` that loads the file sits at **Step 8.5 (Deferred Verification)'s exit**, not inside § Step 9 — Step 8.5 is arrived at on every path, whereas the `Step 9: Completion Hooks` task row is registered only when `hooks.on_complete` is configured. § Step 9 carries the input contract naming the cross-step state the phase consumes.
  - The nine user-gate bullets that can only fire after that boundary move with it, into the reference's § Gates. § No-Stall Principle keeps the other nine plus one aggregate bullet naming where the rest live; the two halves remain one closed list.
  - **Per-run reads go up, not down**: a run now loads `SKILL.md` plus the new reference — 130,677 chars against 124,292 before, +6,385. That increase is accepted deliberately: the goal was one-pass reviewability, which only the split delivers, and the finish phase is loaded once at a boundary every run crosses.
  - **Residual risk**: the phase is loaded once, so a context compaction landing mid-phase can drop its definitions — the nine USER APPROVAL GATE declarations and its half of the pause-point closed list included. There is no automatic re-read; the reference says to re-read it on resuming a compacted run.
  - No behavior change — the bodies are byte-identical to what they replaced, except that 16 markdown-link URLs were rebased from `references/<file>.md` to `<file>.md` so they still resolve from inside `references/`.
- refactor(mobpro): re-target the transcription pointers at `finish-phase.md`
  - The `Keep in sync with ...` notes on `references/inline-defs.md`'s Task-derived-change gate, Step 10, Step 11, and Completion transcriptions, plus `references/m11-commit.md`'s Step 10 note, named `dev-workflow`'s `SKILL.md` as their upstream. The transcribed content is unchanged; only the `Keep in sync with ...` targets move.

### dev-workflow v1.117.0 / extract-rules v1.28.0 / dev-workflow-bundle v1.139.0

- fix(extract-rules): keep the conventions a project has actually settled on
  - **Behavior change** — the next `--realign` run, and every new extraction, judges convention rules differently. A rule carrying a convention the project has settled on now survives Durability; it previously read as "only different" and was dropped.
  - § Durability's fourth record signal is restated: removing the rule leaves a future change *equally consistent with what the project already does* — different, not wrong. Departing from a settled convention is therefore wrong here, and a convention counts as settled on either of two grounds — conformance visible across existing artifacts, or an explicit user decision establishing it — never on the candidate's own assertion. § Reach's question half gains one clause — reach is the class's, not each artifact's.
  - The bar v1.26.0 raised is otherwise intact: an account of one piece of work still fails Durability, and a general best practice still fails the knowledge-gap test.
- fix(dev-workflow): restore the narrow-reach qualifier the shared session scan's Reach rule had lost
  - `references/rule-extraction-axis.md` rule 9 read "skip it when a rerun or an ordinary review would absorb the consequence", dropping the canonical "a narrow reach pairs with". Taken literally that let a wide-reach convention be skipped — the same defect as above, on the new-extraction path rather than the realign one.
  - Rule 9 also regains canonical's carve-out for a convention a linter *could* enforce but this project does not, along with canonical's "reach is the class's, not each artifact's" clause; rule 7 takes the matching Durability wording and routes an unverifiable settledness call into the staging path it already carries. Other long-standing gaps between the axis summary and `extract-rules` `references/extraction-criteria.md` are untouched.

### extract-rules v1.27.0 / dev-workflow-bundle v1.138.0

- feat(extract-rules): let Realign Mode discover its own targets
  - `--realign` with no paths now judges every `*.md` under `output_dir` recursively, in lexicographic order, excluding `*.examples.md`. Naming paths still restricts the run to those files.
  - v1.26.0 required explicit paths on the grounds that naming a file was itself the safeguard. It is not: Step RA3's approval gate is, and it presents every non-`keep` verdict with its reason and referrer count before anything is written. Requiring the paths only made a project-wide re-judgement impractical, since a slash command performs no glob expansion.
  - Discovery does sweep in shared `.md` files the operator never named, and realign cannot see a Principle that merge-rules promoted to another project. The gate therefore names which targets are shared `.md`.
- docs(extract-rules): restate how `--realign` and `--compact` divide
  - The two were separated on where each starts from — a char count versus a criteria change — and on `--compact` being orchestrator-driven. Nothing invokes `--compact` programmatically, so in practice both are run by hand and that distinction predicted nothing.
  - The invariant that does hold: `--compact` preserves the set of norms a file states, merging near-duplicates and dropping an entry only where another already subsumes it, while `--realign` can take a norm away outright. That is also what settles which mode needs an approval gate.
  - It now sits in `SKILL.md` § Realign Mode, beside the realign-versus-restructure guidance it belongs with. `references/realign-mode.md` is read only once `--realign` is already running, so mode-choice guidance was costing every run a read it could not act on.

## 2026-08-17

### dev-workflow v1.116.0 / extract-rules v1.26.0 / dev-workflow-bundle v1.137.0

- feat(extract-rules): raise the bar on what counts as an extractable rule
  - Three criteria join `references/extraction-criteria.md`. **What a Rule Is Made Of** keeps the norm, its trigger, and its discriminator, and names what to leave out — the account of how the situation came up, a record that it recurred, names belonging to one piece of work. **Durability** asks whether the rule would change what gets written in a related but different task. **Reach** asks whether it earns permanent context: rule files load every session, so a norm firing in one narrow configuration is durable and still not worth carrying unless its absence breaks something quietly or expensively, and anything a linter, type checker, test, or verification step already catches is dropped.
  - Reach rejects rules that are correct, so expect it to remove more than the other two combined.
  - Step C4 gains rules 7, 8, and 9 for these. An uncertain durability call stages rather than skips only where a staging path exists (`Type: pattern` with `Category: project`); every other combination skips, which a later re-observation can still reverse.
  - `Format guidelines` gains the prose-rule shape conversation extraction actually produces, with a ≤400-char soft target. All three shapes are a signal to split, not a gate that rejects a durable rule.
- feat(extract-rules): add Realign Mode (`--realign <path> ...`)
  - Re-judges already-written rules against the current criteria, then drops, splits, or trims them. Criteria change over time while the rules written under an older version do not; this closes that gap without the file-layout re-derivation `--restructure` performs.
  - Explicit paths under `output_dir` only, with no discovery pass — an unbounded content judgement would otherwise put shared rule files in scope, including Principles that merge-rules promoted organization-wide.
  - Nothing is written before an approval gate, and each non-`keep` rule is reported with the number of other files citing its label, since dropping or renaming a cited rule breaks those citations silently.
  - An applied `drop` or `split` removes the rule's now-orphaned `.examples.md` entry.
- refactor(dev-workflow): sync the shared session scan's extraction criteria
  - `references/rule-extraction-axis.md` §2.2 carries the same three rules, so candidates produced through the shared scan are judged the same way as those from a standalone `--from-conversation` run.

### dev-workflow v1.115.1 / mobpro v1.28.0 / dev-workflow-bundle v1.136.0

- feat(mobpro): let the commit-plan approval skip crit for diffs the junior already reviewed
  - Under `commit_review_gate: "crit"`, accepting the commit plan now offers a second form — approve, and skip the crit browser view for the commits that correspond to implementation units already reviewed at the per-unit diff review. Those commits render their diff in chat and take the ordinary accept gate instead.
  - The final commit carrying the quality gates' changes, and any commit regrouped off the implementation chain, still open crit: nobody reviewed their content during implementation.
  - No new stop point and no new approval bucket — the option is a variant of the existing accept, so the commit gates stay as they were.
- docs(dev-workflow): admit a caller-supplied crit skip in the per-commit diff-review branch
  - `references/interactive-commits.md`'s diff-review mode branch now admits a caller-supplied crit skip as a third cause routing a commit to the chat presentation.

## 2026-08-14

### mobpro v1.27.1 / dev-workflow-bundle v1.135.1

- fix(mobpro): keep an M3 plan-building checkpoint open until the junior has no question left
  - A checkpoint closed once a single question was answered, so a junior with more to ask had to raise the rest at a later gate. Only a reply saying nothing was left open closes one now.
  - M6's per-unit diff review reads the same way, so neither learning gate caps how many questions it takes.

### mobpro v1.27.0 / dev-workflow-bundle v1.135.0

- feat(mobpro): close each M3 plan-building checkpoint with a chat question instead of an `AskUserQuestion` modal
  - The modal covered enough of the editor panel to hide the checkpoint's own explanation — the text the junior has to read before answering. The closing question is now plain chat prose placed on the turn's last line, and `AskUserQuestion` is dropped from `allowed-tools` so the modal cannot come back by accident.
  - Reply handling is unchanged: the same four buckets, and a question still never counts as approval.

## 2026-08-13

### dev-workflow v1.115.0 / extract-rules v1.25.0 / dev-workflow-bundle v1.134.0

- refactor(extract-rules): drop the incident detail during abstraction normalization instead of relocating it
  - Step C4's normalization required the main sentence to generalize and the incident-specific identifiers — a filename, a UI element, a one-time symptom — to move into a parenthetical suffix. They are now dropped, and a parenthetical is retained only where the main sentence alone does not say where the rule applies. The rule-candidate contract's `Rule` sample line drops its inline form description and defers to that rule.
  - Concrete code anchors for canonical entries are unaffected: `references/examples-format.md` still mines them into `.examples.md`, keyed on the candidate's signature.
  - `references/compaction-mode.md`'s merged-principle guidance and schema sample take the same form, and `dev-workflow`'s `references/rule-extraction-axis.md` was synced in the same change.
- refactor(dev-workflow): write a retrospective's suggested fix direction as an abstract principle with no example list
  - `references/self-retrospective.md` § Distribution-aware fix direction asked for "abstract principle first, with skill-development examples in parens". The parenthesized list is the part an applier transcribes verbatim into a distributed SKILL.md, so it is now omitted by default and kept only where the abstract sentence does not identify the fix site. The Good / Bad contrast block demonstrates the example-free form.

### mobpro v1.26.2 / dev-workflow-bundle v1.133.2

- refactor(mobpro): cut non-operative prose from `SKILL.md` and the reference files
  - The skill tree is 4,588 characters lighter (−3.9%), so every `/mobpro` run reads less. Removed the "because …" clauses that restated the directive their own sentence had just given, and the illustrative asides beside a rule that already stated its own scope.
  - No heading and no referenced bold label was removed, so every cross-reference still resolves and behaviour is unchanged.

## 2026-08-10

### mobpro v1.26.1 / dev-workflow-bundle v1.133.1

- refactor(mobpro): state what each learning-gate prompt must convey instead of fixing its wording
  - The seven prompt samples that only demonstrated phrasing — the M3 design-approach narration and checkpoint opener, the M3 checkpoint modal, the M6 diff-review opener, the M8 error narration, the M9 prediction, and the M5 approval question — are gone. Each site's English prose now names what the prompt has to carry, and the wording is written per run in the resolved `language`.
  - A fixed sample pins a register the surrounding conversation then has to fight, which is what made the checkpoint question read in a different voice from the rest of the session. Dropping it removes the cause; the register rule added alongside it in v1.26.0 is removed too, since there is no longer a sample to correct.
  - The four samples that carry content rather than phrasing stay: the phase-name render, the missing-test-skill note, M13's two resume commands, and M11's partial-completion token.

### dev-workflow v1.114.3 / mobpro v1.26.0 / dev-workflow-bundle v1.133.0

- feat(mobpro): add `--fast`, trading the same passes `dev-workflow`'s `--fast` trades
  - `/mobpro [--fast] <task>` and `/mobpro --resume <state-file> [--fast]`. It drops M4 (Plan review), M5's plan-body prose polish, and M7's `prose-polish` pass, and caps M9's rules re-verification at one cycle. An invocation modifier, not a config key — nothing in `dev-workflow`'s config layers turns it on.
  - Every learning stop stays: the M3 plan-building checkpoints and each per-unit diff review fire exactly as before.
  - `SKILL.md` § Fast mode is the closed list of what is skipped and which site skips it. The skips land in a new `fast_mode_skipped_steps` ledger that M13 renders, so the wrap-up says what was traded.
- fix(mobpro): speak the Japanese prompts in polite form throughout
  - The M3 design-approach narration and checkpoint question, the M6 diff-review opener, the M8 error narration, the M9 prediction, the M5 approval question, and the M13 resume guidance were written in plain form, so the voice changed at the moments the junior was addressed. `references/learning-gates.md` now carries the register as a rule covering every Japanese sample in the skill.
- feat(mobpro): close each M3 plan-building checkpoint with an `AskUserQuestion` modal
  - The modal offers one option per advancing bucket — go on / question / look elsewhere — and the tool's free-text option still carries anything else, so nothing the junior could previously say is lost. It is not a comprehension check. Where `AskUserQuestion` is not exposed, the question falls back to chat prose.
  - The modal is confined to the M3 checkpoints; the per-unit diff review and the plan-approval question stay prose.
- chore(dev-workflow): let the shared `--fast` 1-pass cap serve a caller from another workflow
  - `references/step7.5-rules-compliance.md` now states its ledger record per caller instead of as one literal, since `mobpro` renders the same ledger under its own phase names. dev-workflow's own two records are unchanged. `references/completion.md` gained the matching sweep note, so a new `--fast` skip site here reaches `mobpro`'s mirrored table.

### dev-workflow v1.114.2 / mobpro v1.25.2 / dev-workflow-bundle v1.132.2

- refactor(dev-workflow): cut non-operative prose from the `references/*.md` set
  - The reference files are 16,270 characters lighter (−4.5%), so every run that reads them pays less. Removed the illustrative "for skill development this includes …" lists, the cost-of-skipping clauses a neighbouring sentence already implied, and the "previously X, now Y" framing around behavior that is simply current. Version-tagged History notes are untouched.
  - No heading and no referenced bold label was removed, so every cross-reference still resolves and behavior is unchanged.
  - Two placement rationales moved out of `references/simplicity-self-audit-express.md` into `README.md` § Why two Step 2 audit items sit in the express core, and `references/localization.md` now points at `references/configuration.md` for the exhaustive `language` category enumeration rather than carrying a second copy.
  - `mobpro`: dropped the one clause in `references/m5-plan-approval.md` that its own keep-in-sync directive had left behind when the upstream paragraph lost it.

## 2026-08-09

### dev-workflow v1.114.1 / mobpro v1.25.1 / dev-workflow-bundle v1.132.1

- refactor(dev-workflow): cut non-operative prose from `SKILL.md` and the six largest references
  - `SKILL.md` and `references/interactive-commits.md` / `simplicity-self-audit.md` / `step5-implement.md` / `step7-check-test.md` / `crit-commit-review.md` / `self-retrospective.md` are the seven largest runtime-read files in the skill, and every character of them is a read cost on the runs that reach them. Removed the illustrative "for skill development this includes …" example lists and passages restating a point another passage already made, plus a few cost-of-skipping clauses where a neighbouring sentence already carried the weight. Together the seven files are 22,819 characters lighter (−6.7%).
  - No heading and no referenced bold label was removed, so no cross-reference moved and behavior is unchanged. One prohibition sentence went, in `references/crit-commit-review.md`, where it restated a parenthetical two clauses earlier. The primary-source evidence for the crit `--range` requirement moved to `README.md` § Why the crit gate uses commit-range mode rather than being dropped.
  - The duplicated callee enumerations in `§ No-Stall Principle` are now one list; the two paragraphs that repeated it name the callee set generically instead. The reminders that are deliberately repeated at decision moments were left alone.
  - Files outside the seven — including `references/simplicity-self-audit-express.md`, which both lanes read — keep their example lists for now.
- refactor(mobpro): match the upstream compression in the transcribed `§ (b) Workflow artifacts` block
  - `references/inline-defs.md` carries a `Keep in sync with dev-workflow SKILL.md § Workflow artifacts.` directive, so its copy of that paragraph tracked the upstream edit.

## 2026-08-08

### ask-peer v2.6.0 / dev-workflow v1.114.0 / mobpro v1.25.0 / dev-workflow-bundle v1.132.0

- feat(dev-workflow): cut plan review to four categories and run them as three parallel reviewers
  - **Behavior change**: Step 3 (and `mobpro`'s M4) now request categories (a)–(d) instead of (a)–(f), split across three independent groups the reviewer runs at once rather than one reviewer working through everything in sequence. There is no opt-out — the previous shape is not reachable by configuration.
  - Dropped `Incrementality`: Step 1.5's split judgment and the Step 2 self-audit's **Plan-level incrementality** item ask the same question. That item moved from the full-lane audit file into the tier-independent core both lanes read, so a Simple task is still asked it. Folded `External library primary-source verification` into (a), which already ran two primary-source checks and cited it by name. Renumbered the surviving `Presentation & attention allocation` from (f) to (d).
  - Dropped `Plan-vs-allowed-tools 1:1 alignment`, whose main clause was specific to authoring Claude Code skills (`allowed-tools` is a SKILL.md frontmatter field) rather than to plans in general. Merged the two closed-list sub-checks into one. No other sub-check was removed.
  - Reviewers are now told to settle each sub-check's firing condition before reasoning about it: the rubric accumulates checks for every plan class, and any one plan trips a minority of them.
  - The reviewer covering `.claude/rules/` now reads every file directly under it but only the subdirectories whose domain the plan touches — the same **project** / **{subdirectory}** split `rules-review` uses. Projects keeping all rules in one or two top-level files read the same as before.
- feat(ask-peer): let a consultation request declare its own review units
  - `Parallelism` spawned one reviewer per category, which would have re-split dev-workflow's new three groups back into four. It now spawns one per declared unit and takes the request's own grouping — a unit may be one category, several, or a slice of one — while a request that lists categories without grouping still gets one reviewer each.
  - Reviewers receive the request whole, so `Process` step 2 now says a per-unit instruction reaches reviewers it was not addressed to, and each follows only its own. The merge rule gained the case where several units feed one category.

### mobpro v1.24.1 / dev-workflow v1.113.1 / dev-workflow-bundle v1.131.1

- refactor(mobpro): move M5 / M9 / M11's procedure bodies into `references/`
  - `SKILL.md` carried all three procedures inline, and that file is loaded in full the moment the skill activates — well before any of the three steps is reached. Each body now lives in its own reference (`m5-plan-approval.md` / `m9-rules-code-review.md` / `m11-commit.md`), read at the step that owns it, and `SKILL.md` keeps each heading, its gate designation, and a delegation pointer. The moved text is verbatim apart from relative links and two cross-references that had to name their file once they left `SKILL.md`, so behavior is unchanged.
  - This is a trade, not a pure saving: a run that reaches all three steps now reads slightly more in total than before. It is accepted because the file that shrinks is the one loaded unconditionally.
  - What stays in `SKILL.md` is what other steps read there: M9's entry condition, and M11's entry condition together with its "point of this diff" note.
- refactor(dev-workflow): repoint the two cross-references into mobpro that the move invalidated
  - `visual-plan-review.md`'s keep-in-sync list and `interactive-commits.md`'s crit-probe membership list both named paragraphs of `mobpro`'s `SKILL.md` that now live in its `references/`.

### mobpro v1.24.0 / dev-workflow-bundle v1.131.0

- feat(mobpro): build the plan with the junior instead of handing them a finished one
  - M3 now walks the junior through the code a plan touches in 2–5 installments, each closing with a partial approval, before the plan document is written. A junior who has not read the codebase cannot judge a finished plan, but can judge one piece at a time; M5 still approves the plan as a whole.
  - Each installment explains what the code does today first and what follows from it second, then asks what is still unclear — a gap the junior reports, not a question they have to answer correctly. No setting changes that.
  - That reading runs on the main thread, so the junior sees what was consulted.

## 2026-08-07

### prose-polish v1.8.0 / dev-workflow v1.113.0 / mobpro v1.23.0 / dev-workflow-bundle v1.130.0

- feat(prose-polish): judge a target-language word by whether it decodes without the original
  - Tokens already written in the target language's own script are no longer exempt from the litmus test. They are judged by one question: can a reader who does not know the source-language original recover the meaning from this word alone? `キャッシュ` and `レスポンス` still pass; `セマンティクス` and `タイブレーク` no longer do.
  - General rule 6 now covers the mirror-image failure — a word-for-word rendering of an English figure of speech, which reads as the target language but only decodes back through the English (`着地する` for `land`, `〜に倒す` for `fall back to`, `走行` for a `run`, `閉じたリスト` for a `closed list`). Name what the thing does instead.
  - "One idea per sentence" covers list items too: a bullet carrying three or more claims — typically an inline `(i)/(ii)/(iii)` enumeration closed by a trailing verb — gets split.
  - Leading whitespace joins the Preserve list. Indentation carries structure in YAML block scalars, Python, and nested Markdown lists, so a rewrite that shifts it breaks the file even when every word is right.
- feat(dev-workflow): polish the decomposition state file alongside the plan document
  - Step 4's plan-body polish took the plan document alone, so a decomposed run's subtask `description` / `verification_hint` prose — written for the user to read — was polished by no pass at all. The state file now joins the plan document in that call, on the run that creates it. A `--resume` run does not repeat it: the creating run covers every subtask's prose at once, and those files reach tens of thousands of characters.
- feat(dev-workflow): rule out sentence shapes that stay hard to read after the words are right
  - `localization.md` governed vocabulary only. Four sub-rules now govern construction: one claim per sentence and per bullet, references at the end of an output sentence rather than the front, no nested parentheticals, and no word that only decodes back through the source language. They carry the most weight in chat output, which no later polish pass can reach.
- feat(mobpro): polish the plan document before the approval gate
  - **New behavior — set `polish_prose: false` to opt out.** mobpro polished implementation files at M7 but never the plan document, the artifact a junior reads most carefully. M5 now calls `prose-polish` before the approval surface, covering the plan document plus the state file when one is active. The same key turns off both call sites.

### dev-workflow v1.112.0 / mobpro v1.22.0 / dev-workflow-bundle v1.129.0

- feat(dev-workflow,mobpro): scale a `crit` round's re-verification to what the round's edits changed
  - **Behavior change with no opt-out**: under `commit_review_gate: "crit"`, a round that applied `scope: "line"` edits re-ran the full check/test phase and the rules-compliance walk every time, however small the edit. It now classifies the round's edits first and takes one of two branches — `actual-code` keeps that full re-verification, `metadata-only` (comment rewording, documentation text, non-functional spacing) runs `check_commands` alone. A rename of an identifier or a path counts as `actual-code`, and an unclear classification takes that branch too.
  - The `metadata-only` branch is a trade, not a deferral: those edits reach the commit without passing `test_commands` or the rules walk, and no later pass in the run picks them up.
  - The classification and both branches live in `crit-commit-review.md` § Round re-verification weight; the sites that used to quote the old mandate now point at it.

### dev-workflow v1.111.0 / mobpro v1.21.0 / dev-workflow-bundle v1.128.0

- feat(dev-workflow): print the visual plan-review gate's URL in chat
  - The gate serves on a random port and opens the browser itself, so when that open fails — or the tab is closed — the plan is unreachable and the run looks stalled with nothing to click. `serve.mjs` now writes the viewer URL to a `<planId>.url` sidecar next to the plan file at listen time, before the browser launch is attempted, and the gate reads it in the turn after the background launch and emits the URL as a one-line chat message. Re-launches in the revise loop re-emit on their new port.
  - The URL goes to a sidecar file rather than stdout because `--wait` mode's stdout contract is the submit JSON alone, and a caller that backgrounded the server cannot portably read its stderr mid-run.
  - The sidecar joins the served / comments / prev files in the workflow-artifact exclusion list and in the Completion cleanup, so it is never committed and does not accumulate.

### apply-rules v2.1.0

- feat(apply-rules): read and write `.examples.md` under the sibling `-extras` directory
  - extract-rules has written examples to a directory outside `.claude/rules/**` since it gained `examples_output_dir`, so apply-rules saw none of them in a project on that layout and wrote its merged examples back into the auto-load scope. Both sides now derive the examples directory as the rules directory path with `-extras` appended — `<source>-extras` for the source (fetched over `gh api` for a GitHub source, skipped silently on `404`) and `<output_dir>-extras` for the target. There is no configuration key; apply-rules resolves extract-rules' default and its `examples_output_dir: <output_dir>` opt-back-in, but not a directory set anywhere else.
  - Reading falls back to the rule file's own directory, so a project still on the pre-split layout keeps working. Writing always targets the derived directory. Step 7 completes the migration: an `.examples.md` still under `output_dir` whose name already conforms becomes a relocation into `<output_dir>-extras`, since the merge step only covers rules that survived the tech-stack filter and never covers `project.examples.md`. One whose name does not conform keeps going through the existing migrate-then-delete flow.
  - The `## Examples` reference line is now computed from the rule file's directory to the examples file (`.claude/rules/languages/typescript.md` → `../../rules-extras/languages/typescript.examples.md`) instead of the fixed `./<name>.examples.md`.
  - The `output_dir` default in the config sample loses its trailing slash (`.claude/rules`, matching extract-rules), so appending `-extras` cannot produce `.claude/rules/-extras`.

### merge-rules v2.1.0

- feat(merge-rules): write merged `.examples.md` to `<output_dir>-extras` instead of alongside the rules
  - **Behavior change with no opt-out**: examples previously landed under `output_dir` and now land in the sibling directory formed by appending `-extras` to it (the default `.claude/rules` gives `.claude/rules-extras`). No configuration key restores the old location, and files at the old path are left in place rather than removed. This matches where extract-rules and apply-rules now expect examples to be, so the org rule set merge-rules produces stays consumable by apply-rules without extra setup.
  - Collection resolves examples per rule file rather than per directory — `{path}/{rules_dir}-extras` wins over the rule directory at the same relative sub-path — so a project part-way through migration contributes both its moved and its still-co-located examples, and a missing `-extras` directory is an empty listing rather than an error.
  - The generated `## Examples` reference line is computed from the rule file's directory to the examples file rather than the fixed `./<name>.examples.md`.
  - The `output_dir` and `rules_dir` defaults in the config sample lose their trailing slashes (`.claude/rules`, matching extract-rules), so appending `-extras` cannot produce `.claude/rules/-extras`.

### rules-review v1.8.0 / dev-workflow-bundle v1.127.0

- feat(rules-review): resolve `.examples.md` from `.claude/rules-extras/`
  - The reviewer prompt's `## Reference: Code Examples` section looked for the examples file beside the rule file, which finds nothing once extract-rules writes them outside `.claude/rules/**`. Reviews on a project using that layout silently ran without their reference examples. The lookup now mirrors the rule file's sub-path under `.claude/rules-extras/` (`languages/ruby.md` and `languages/ruby.local.md` both resolving to `languages/ruby.examples.md`) and falls back to the co-located file for projects on the pre-split layout.
  - § 2. Collect Rules gained a second glob over `.claude/rules-extras/`, so the lookup is an index over two up-front path lists rather than a filesystem probe per rule file.

### dev-workflow v1.110.0 / mobpro v1.20.0 / dev-workflow-bundle v1.126.0

- feat(dev-workflow): protect the working tree across Step 10 (Interactive Commits)
  - **Entry snapshot**: § Collect changes now records the whole working tree — tracked changes and untracked files alike — as a dangling commit, and § Propose commit plan reports its SHA together with the command that would restore from it. Step 10 keeps the un-landed commits' content unstaged while it lands one commit at a time, so a failure part-way through had no object to recover from.
  - **Commit-failure survival check**: when a hook-running commit fails, Step 10 now compares the tree against the entry snapshot **before retrying**, reports paths that went missing separately from paths that merely diverged, and stops instead of retrying when anything changed. Previously the retry could succeed against the damaged tree and carry the run onward with the loss never reported.
  - **Frozen-tree notice**: on the chain-present path with two or more commit groups, the commit-plan gate now states up front that a review comment on an earlier commit cannot be answered in place — that commit's tree was frozen when its Build order step landed.
- fix(mobpro): M11 enters `interactive-commits.md` at § Collect changes instead of § Propose commit plan
  - The previous pointer skipped the roster that § Propose commit plan reads, and would have skipped the new entry snapshot along with it.

## 2026-08-06

### dev-workflow v1.109.1 / mobpro v1.19.1 / dev-workflow-bundle v1.125.1

- refactor(dev-workflow): make `references/step7.5-rules-compliance.md`'s reused sub-steps name no exit target, and drop the three exit remap lists
  - Sub-steps 2 / (c) / (d) and the `--fast` 1-pass cap no longer name a next step or a task row: a new **Caller-neutral exits** paragraph binds all four to one exit — "complete this pass and return control to the caller's continuation point" — and each caller states only where that point is. The three lists that translated the old Step 8 vocabulary go with them: Step 8.5's `Exit-target remap`, the Step 10 `crit` re-entry's inline reading, and `mobpro` M9 sub-step 5's `Exit remap`. Adding an exit no longer obliges a three-site sync.
  - The initial pass is no longer a special case in the reference: like every other caller it states its own exit at its own site, so `SKILL.md` § Step 7.5 now names both of its paths (sub-step 2's nothing-actionable judgment and sub-step 3(a)'s applied fixes) and the reference carries no exit of its own.
  - § Step 7.5's `Reuse note` is dropped — the sync obligation it existed to carry is what this change removed, and its remaining content was already stated twice in the same section.
  - Runtime behavior is unchanged: each caller resolves to the same continuation point it did before.
- chore(mobpro): follow the exit-vocabulary change — M9 sub-step 5 states its own continuation point, and M11's `crit`-round sentence drops its continuation clause, which `crit-commit-review.md` now states itself.

### dev-workflow v1.109.0 / mobpro v1.19.0 / dev-workflow-bundle v1.125.0

- feat(dev-workflow)!: promote the deferred post-fix verification into its own phase, `Step 8.5: Deferred Verification`
  - The run's single post-fix cycle — check/test over both review layers' fixes, then a rules-review scoped to the files they touched — used to be a tail of Step 8. A run with `code_review_enabled: false` skips Step 8 entirely, so Step 7.5 kept an in-place escape hatch to re-verify its own fixes, and that hatch had to be named in roughly a dozen places. Step 8.5 is registered unconditionally, runs when `review_fix_files` is non-empty, and completes immediately when it is empty — so the hatch is gone and Step 7.5's initial pass now stops after applying fixes on **every** path. `mobpro`'s M9 sub-step 5 already had this shape; upstream and downstream now match.
  - **Behavior change on `code_review: false`**: that path's rules re-verification now runs scoped to `Files: <review_fix_files>` with paired-change invariants suppressed, the same as every other path, instead of re-walking the full base-commit diff. The check/test gate still covers the whole tree, and the Step 10 commit gate remains the backstop for paired-change obligations.
  - The `--fast` 1-pass cap's `<site>` ledger value set becomes `Step 8.5 Deferred Verification` / `Step 10 crit round`. The second value is new: a `crit` commit round's Step 7.5 re-entry could already reach the cap but had no token to name itself with, so its ledger line was unrenderable.
- fix(dev-workflow): six defects in the tier-escalation procedure
  - Escalation reversed a review-phase row that configuration had turned off, because the "left unmarked by the re-run" test cannot see that a config-`false` phase has nothing to mark. It now reverses those rows only when the re-derived flag is `true` — the condition `references/step4-finalize-plan.md`'s express-lane re-activation owns and this site mirrors.
  - Escalation's resume step documented only the `plan_review_enabled == true` branch; the `false` branch (skip Step 3, resume at Step 4) was left to inference.
  - The `--fast` Step 6.5-only skip's condition read ambiguously on an escalation re-run, where the row is still `completed` from the pre-escalation marking. Misread, it skipped both the re-mark and the ledger append, after which escalation reopened the row and ran Step 6.5 under `--fast`.
  - Three smaller corrections: the escalation note now carries the re-derived review phases and supersedes the standing difficulty log line; the two Completion ledger reminders and Step 3's disabled-phase list no longer credit escalation's writes to Step 1.5; and escalation's row-reversal claim about `Step 8` / `Step 8-1` is scoped to the Trivial origin that is the only tier marking them.
- chore(mobpro): follow the upstream phase split — M9's aggregate now cites Step 8.5, and an M11 `crit` round's rules re-run continues into `step7.5-rules-compliance.md`'s sub-steps (b)–(d) instead of stopping after (a), which nothing downstream would have verified.

## 2026-08-05

### dev-workflow v1.108.0 / mobpro v1.18.0 / dev-workflow-bundle v1.124.0

- perf(dev-workflow): split three shared references so a caller reads only the section it needs
  - `references/plan-format.md` § Localization granularity moves to a new `references/localization.md`; `references/step8-code-review.md` § Sub-step 1 — reviewer report payload moves to `references/code-review-payload.md`; and `references/task-decomposition.md` splits into a shared core plus `references/task-decomposition-normal.md` (§ B) and `references/task-decomposition-resume.md` (§ A). Each original heading stays as a delegating pointer, so existing cross-references still resolve.
  - **The decomposition split cuts dev-workflow's own reads**: a Normal run reads 3,483 fewer chars and a Resume run 10,278 fewer, because one of § A / § B was always dead weight. **Express-lane runs read more instead** — 649 chars on Trivial and 1,428 on Simple — since they skip that split and still carry the other two.
- perf(mobpro): cut the per-run read budget
  - `references/diff-review.md` § crit path's procedure moves to a new `references/crit-diff-review.md`, read only once both crit probes clear — so a run on the default `commit_review_gate: "diff"` never pays for it. The probe itself stays where it was. A `crit` run reads 845 more chars than before, the price of the conditional read.
  - M3 and M9 now read the three new dev-workflow references above instead of the whole files they were carved out of.
  - Every `mobpro` reference read from more than one M-step now declares that it is read once and reused, so the read count no longer depends on interpretation.
  - Net for a default-configuration run: 247,263 chars on a Normal run (down from 271,590, −9.0%) and 240,468 on a Resume run (−11.5%).
- feat(mobpro): run M9's two reviews concurrently
  - `rules-review` and the code reviewer now launch together when background dispatch is available, and are judged in order afterwards. **A rules fix landing between launch and collect does not re-dispatch the code review** — `mobpro` deliberately does not adopt dev-workflow's `code_review_stale` discard-and-re-dispatch here; the fix is still covered by M9's aggregate re-verification and the M11 commit gate. Falls back to sequential dispatch when background dispatch is unavailable.
- fix(mobpro): correct four read-contract statements
  - "M12's session scan is `mobpro`'s only direct `Agent` use" was already false on any project with review-class `hooks.on_complete` entries, which `step9-completion-hooks.md` dispatches concurrently. A new § Direct Agent dispatch sites section carries the closed list, and the four sites that asserted the old invariant point at it.
  - `update-rules.md` resolves the session jsonl through `self-retrospective.md` / `workability-retrospective.md`, so a project with rule extraction active but neither retrospective configured reads one of them — a read the closed list did not admit. It now does.
  - The `prerequisites.md` row listed M4 / M9 as read points on callee failure, which neither step's body asks for; the row now says those steps apply the protocol from M1's read.
  - M12 sub-step 3 now states that `session-scan.md` § Inputs' `subagent_model` parameter is omitted, since `mobpro` does not adopt that key.

## 2026-08-03

### dev-workflow v1.107.0 / mobpro v1.17.0 / dev-workflow-bundle v1.123.0

- feat(dev-workflow): collapse the two post-fix verification cascades into one
  - Step 7.5 (Rules Compliance Review) used to apply its fixes and then re-verify them itself — re-running Step 7 (Check / Test) and dispatching a 2nd-cycle `rules-review` — after which Step 8 (Code Review) ran the same cycle again over its own fixes. A run with findings in both layers therefore paid up to four check/test runs and three `rules-review` dispatches. Step 7.5's initial pass now applies its fixes and stops; Step 8's deferred verification runs that cycle **once**, over the union of both layers' fixes.
  - `step8_fix_files` is renamed **`review_fix_files`** and its accumulation window opens earlier — at Step 7.5's fix sub-step rather than after that pass completes — so the aggregate pass covers both layers.
  - **The persistent-violations user gate is unchanged in kind, but fires from one place**: the deferred verification pass. The one exception is `code_review_enabled: false`, where Step 8 never runs and no aggregate pass would follow — there Step 7.5 keeps re-verifying its own fixes in place.
  - The two differentiated `--fast` ledger strings collapse to one, since the two sites that emit it are mutually exclusive within a run. Step 8's reviewer payload now says unconditionally that Step 7.5's fixes are not yet re-verified, replacing a note that fired only under `--fast`.
- perf(dev-workflow): read the tier-escalation procedure only when an escalation fires
  - `references/tier-assessment.md` is read at Step 1.5 on every run, but its § Escalation body — the three tier-change sites and the five-step procedure — only matters once a checkpoint actually raises the tier. That body moves to a new `references/tier-escalation.md`; the section keeps the two invariants every run relies on (the tier never falls, the decomposition decision is never reopened) plus a pointer.
  - The four per-step **Difficulty exception** paragraphs (Step 6 / 6.5 / 7.5 / 11) collapse into one **Pre-completed row guard** paragraph beside the Phase-boundary self-audit, with each step keeping a one-line pointer. Every cross-step variable is now initialized in one table at Step 1 sub-step 6 instead of being split across Step 1 and Step 2 entry.
  - **Measured**: an express-lane run reads **−3,975 chars**, a full-lane run **−665**; the 5,764-char escalation reference loads only when an escalation fires. The corpus is 761,944 chars (dev-workflow 670,722 + mobpro 91,222).
- chore(mobpro): follow the verification-cascade change
  - M9 sub-step 2 (rules compliance) appends its fixes to `m9_fix_files` and defers its 2nd cycle and persistent-violations gate to sub-step 5's aggregate re-verification, which already had that shape for code-review fixes. The upstream `code_review_enabled: false` exception does not apply to `mobpro`, whose sub-step 5 runs regardless of that flag.

### dev-workflow v1.106.0 / mobpro v1.16.0 / dev-workflow-bundle v1.122.0

- feat(dev-workflow): resolve the difficulty tier before the plan exists, and give Trivial / Simple tasks an express lane
  - The tier used to be assessed at the end of Step 2 (Create Plan), by which point the run had already read the two largest references in the tree. It is now resolved at Step 1.5 (Task Decomposition) from the task text plus cheap probes, and the new `references/tier-assessment.md` is its single home — criteria, lanes, the difficulty-skip matrix, row marking, and escalation. Step 2's old `Assess difficulty` sub-step becomes `Confirm difficulty`, a checkpoint that only ever raises the tier.
  - **Express lane** (Trivial / Simple): the Step 1.5 decomposition proposal is skipped along with its reference, the plan is authored from a compact template instead of `references/plan-authoring.md`, the Simplicity self-audit runs from a new tier-independent core file, and Step 11 (Update Rules) joins Step 6 (Tidy) / Step 6.5 (Polish Prose) / Step 7.5 (Rules Compliance Review) in the skip matrix. A Trivial task's Step 4 approval is the chat surface directly, so the browser gate's reference is never read. Step 11.5 (Self-Retrospective) and Step 11.6 (Workability Retrospective) are **not** matrix-skipped — each is governed by per-project configuration, which tier-gating would make non-deterministic across projects.
  - **Measured**: a Trivial run on shipped defaults reads 464,525 → 368,364 chars, **−96,161 (−20.7%)**. A Moderate / Complex run reads 23,952 chars **more** (+4.7%) — accepted, because the express core of the self-audit is read on both lanes and the tier reference is new to both.
  - **Escalation is one-way, at two fixed checkpoints** — Step 2's Confirm difficulty and Step 5 (Implement) completion. Raising the tier re-derives `plan_review_enabled` / `code_review_enabled`, re-resolves `subagent_model`, returns the skipped rows to `pending`, and reads the references the express lane deferred. There is no de-escalation: a task judged harder than it turned out to be simply pays what the workflow charged before.
  - **Behavior change**: `subagent_model` now also governs the conditional Step 2 codebase-research delegation, which used to be excluded because the tier was unknown when it fired.
  - `references/plan-format.md` splits in two. The authoring half (§ Template, § Sizing guidance, § Traceability, the Decisions criterion, § Empty-Decisions fixed sentences, § Subtask / Resume handling, § Step 2 self-check) moves to `references/plan-authoring.md`, read on the full lane only; the presentation half keeps the filename and is read on every lane. `references/simplicity-self-audit.md` splits the same way, with the tier-independent core in `references/simplicity-self-audit-express.md`. An item held back from the express core fires only when the plan makes a design judgment, so noticing one at a low tier is an escalation signal rather than a reason to read the deferred file.
- perf(dev-workflow): probe crit availability before reading the crit commit-review reference
  - Under `commit_review_gate: "crit"`, `references/interactive-commits.md` now runs `crit --version` and `printenv CLAUDE_CODE_REMOTE` before reading `references/crit-commit-review.md` (28,253 chars). A project that opted into crit but has it uninstalled, or runs where no local browser is reachable, previously paid that read on every run only to fall back from the reference's own first step. Same shape as the plan gate's reachability probe, hoisted in v1.105.0.
- chore(mobpro): follow the dev-workflow changes above
  - M11 and `references/diff-review.md` § crit path probe before reading the crit reference, and § Runtime reads records the added condition. `mobpro` still has no tier assessment and no express lane by design, so only the read-cost changes carry over.

### dev-workflow v1.105.1 / dev-workflow-bundle v1.121.1

- fix(dev-workflow): resolve the five dangling bold-prose-label cross-references `verify-skill-refs` reports
  - Category: ambiguity; four references written as `§ No-Stall Principle's "do not rely on exact-phrase matching" rule` — three in `SKILL.md`, one in `references/workability-retrospective.md` — pointed at a clause that was never a bold label, and `references/completion.md` cited `§ Localization granularity`'s identifier-verbatim rule by an unbolded phrase inside the bullet rather than by the bullet's own label. The clause is now `**Do not rely on exact-phrase matching**`, and `completion.md` cites `Preserve verbatim`.
  - The lint stage of `Skill(verify-skill-refs)` had reported these five as class-(a) violations since before this series started, so every run of a project that lists it in `test_commands` failed Step 7 (Check / Test) on them. A standing failure hides new ones.

## 2026-08-02

### dev-workflow v1.105.0 / mobpro v1.15.0 / dev-workflow-bundle v1.121.0

- feat(dev-workflow)!: reduce the plan-approval gate to one browser surface plus a chat fallback
  - **Breaking change**: `plan_review_gate` is removed, and with it the `plan-mode` and `crit` plan-approval surfaces. Step 4 now always runs the bundled `visual` browser gate and degrades to a chat approval when no local browser is reachable. A leftover `plan_review_gate` in a config layer is ignored. Projects that set `"plan-mode"` to keep the approval in chat lose that opt-out: the chat approval still exists, but it is now reached only by the automatic reachability degradation rather than by configuration. Removed without a deprecation window on the user's explicit pre-plan decision — a deliberate departure from the standard config-flag lifecycle.
  - **Plan Mode is never entered.** `EnterPlanMode` / `ExitPlanMode` leave `allowed-tools`, the `plan_mode_active` variable is gone, and `references/step4-finalize-plan.md` collapses to a single presentation path. Step 2's "No code changes in this phase" rule was already enforced by agent discipline under the `visual` default; it now always is.
  - `references/crit-plan-review.md` is deleted. `commit_review_gate: "crit"` is **unaffected** — the crit commit-review gate stays, and the shared crit CLI facts it used to delegate to the plan-gate reference are now stated in `references/crit-commit-review.md` itself.
- perf(dev-workflow): probe browser reachability before reading the visual-gate procedure
  - Step 4's routing table now runs `printenv CLAUDE_CODE_REMOTE` itself and skips reading `references/visual-plan-review.md` (17.4k chars) when the browser is unreachable. On Claude Code on the Web that read happened on every run only for the reference's own first steps to return `fallback`. The reference still re-probes as a self-contained guard, and the anti-skip guard is retained in a narrowed form: a `true` probe result is the only thing that licenses skipping the read.
- feat(dev-workflow): show Test plan and Risks in the chat approval
  - They previously appeared only in the plan document; the condensed chat view now carries each one's heading plus a one-line gist, which narrows the gap left by dropping the `ExitPlanMode` modal.
- chore(mobpro): follow the dev-workflow changes above
  - M5's approval surface is the visual gate degrading to chat, with the same hoisted reachability probe; `plan_review_gate` leaves the fallback-key table and the scalar-merge list; and `crit-plan-review.md` leaves § Runtime reads. `commit_review_gate: "crit"` still drives M6's per-unit review and M11's per-commit review.

### dev-workflow v1.104.0 / extract-rules v1.24.0 / mobpro v1.14.0 / dev-workflow-bundle v1.120.0

- feat(dev-workflow)!: replace the review-iteration loops with a single pass per review phase
  - **Breaking change**: `review_iterations` and the `-i` / `--iterations` flags are removed. Step 3 (Plan Review) now runs exactly one reviewer pass, and Step 8 (Code Review) runs one review pass plus **one** escalation pass taken only when that pass reported a Critical finding. Two booleans replace the count: `plan_review` and `code_review` (both default `true`), so the "`0` turns that phase off" capability survives under names that match what they now do. A project that had `review_iterations: {plan: 0}` should set `plan_review: false`; one that had `{code: 0}` should set `code_review: false`. A leftover `review_iterations` is ignored — the phases fall back to their `true` defaults. Removed without a deprecation window on the user's explicit pre-plan decision — a deliberate departure from the standard config-flag lifecycle, justified here because the replacement booleans preserve the only capability the key carried, so a waiting period would gate a behavior-preserving rename.
  - **Behavior change**: a run that previously took up to 3 plan-review and 3 code-review passes now takes 1 and 1 (+ the conditional escalation). `--fast` keeps skipping Plan Review but no longer touches Code Review, so a `--fast` run that hits a Critical finding now takes the escalation pass it would previously have been capped out of.
  - The Step 2 sub-step formerly labelled `Adjust N by difficulty` is now `Assess difficulty`: it resolves the two booleans, `subagent_model`, and the difficulty-skip matrix. Trivial turns both phases off; Simple applies the skip matrix only; Moderate and Complex change nothing.
- feat(dev-workflow)!: remove `compact_rules` and Step 11's char-count compaction gate
  - **Breaking change**: the gate and its state (`compaction_applied_count` / `below_threshold_failed_files`) are gone, Step 11's sub-steps renumber 1–5, and the Completion compaction reminder is dropped (7 reminders remain). `Skill(extract-rules) --compact` is unaffected and stays available to run manually when a rule file grows past the threshold.
  - Removed on the user's explicit pre-plan decision — a deliberate departure from the standard config-flag lifecycle, which would have required a deprecation notice and a waiting period first. Justification: compaction is functionally redundant with the standalone `--compact` mode.
- feat(dev-workflow)!: remove `confirm_remaining_steps` and make its gate unconditional
  - **Breaking change**: the Step 11 entry gate asking whether to run the rule-maintenance and retrospective steps (Step 11 / 11.5 / 11.6) now fires on **every** run. Projects that left the key unset previously saw no gate, so each run gains one user interaction; in exchange the heaviest tail of the run — the shared session scan and `extract-rules` — can be declined per run.
  - **Downstream automation note**: a non-interactive caller that drives `dev-workflow` end to end now meets a gate it must answer. Same explicit-decision departure from the config-flag lifecycle as above; unlike `compact_rules` this key had no functional redundancy, so the removal rests on the user's instruction alone.
- feat(dev-workflow)!: remove the deprecated `visual_plan_review` boolean
  - **Breaking change**: only `plan_review_gate` is read now. `visual_plan_review: true` should become `plan_review_gate: "visual"`, `false` should become `"plan-mode"`. v1.88.0 promised a deprecation notice before removal; that notice was never issued, so this removal is the same explicit-decision departure as the two above.
- chore(dev-workflow): drop the mandatory-tombstone clause from this repo's config-flag lifecycle rule
  - Placing a tombstone for every removed key is now a judgment call reserved for keys whose silent absence would cause real harm, because accumulating one per removal works against the corpus-size reduction this series is pursuing. When a tombstone *is* placed, the existing obligation to put it in every skill that resolves the key still holds. None of the four keys removed above carries one.
- chore(mobpro): follow the dev-workflow changes above
  - `-i` / `--iterations` and `review_iterations` are gone from M1's resolution, M4 runs a single plan-review pass, M9 runs a single code-review pass, and M12's confirm-remaining-steps gate is unconditional with the compaction gate removed.
- chore(extract-rules): stop naming `dev-workflow` Step 11 as the `--compact` caller
  - Those mentions became false once dev-workflow dropped its compaction gate; the prose is caller-neutral now. The `--apply-conversation-candidates` and `--update` caller descriptions are unchanged.

## 2026-08-01

### dev-workflow v1.103.0 / dev-workflow-bundle v1.119.0

- feat(dev-workflow): count independently deployable units as a decomposition trigger in Step 1.5's `references/task-decomposition.md` § B. Normal sub-mode
  - The `Workproduct-independence axis` now opens with a count that runs before its judgment prose: count the request's independently deployable or publishable units (cloud functions, plugins, packages, services, jobs, endpoints, CLI commands) and treat 2 or more as a decompose signal even when the verification path is single. Migration and bulk-port tasks are named as the case this misses — the request reads as one unit while holding N deployable artifacts. Where the count is inconclusive the axis stays the judgment call its examples illustrate
- feat(dev-workflow): add a shared-code boundary heuristic to the subtask-drafting step of the same reference
  - When candidate units share files, count each unit's exclusive files against the shared set (per file, not per symbol). Ample exclusive files mean the unit boundary is a clean subtask boundary; tiny exclusive counts against a dominant shared set mean the units are proposed as one subtask, which records in its `description` and `verification_hint` that its Build order runs shared base first, then one thin step per unit; anything in between is a judgment call. The heuristic decides where the split lines fall, not whether to decompose — it never reverses the count trigger, and an undecomposed outcome stays the user's call at the proposal gate. Scoped to the subtask (PR) layer — the commit shape follows from the Build order

### dev-workflow v1.102.2 / dev-workflow-bundle v1.118.2

- fix(dev-workflow): name the phase in Step 7's dispatch-failure fallback note
  - Category: ambiguity; the `Skill()` call-failure bullet's example note rendered `Step 7:` with no phase name, so a reader could not recover what the line was about from the line alone — it now carries the `Step 7 (Check / Test):` form § Phase naming in user-facing output requires

## 2026-07-30

### dev-workflow v1.102.1 / dev-workflow-bundle v1.118.1

- fix(dev-workflow): add test-behavior discrimination self-audit to Step 5 (auto-triage #184)
  - Category: missing-branch; Step 5 lacked a check that a newly added test for interactive/dynamic behavior actually discriminates the fix — added sub-check (x) directing a revert-would-fail mutation test before review
- fix(dev-workflow): say what happens to a Build order step whose write Step 5 sub-step 6 aborts
  - Category: missing-branch; the path scope check specified the refusal but not the aborted step's disposition, leaving an executor free to substitute a path or open a second wait state — it now reports the step unresolved and continues, with sub-step 7's gate named as the only permitted wait
- fix(dev-workflow): move Step 5 sub-check (x)'s example into the parenthetical its siblings use
  - Category: ambiguity; the web-UI example sat in the main clause behind an em dash while every sibling sub-check in the same list keeps concrete material in a "for general software development … / for skill development …" parenthetical
- fix(dev-workflow): make Step 5 sub-check (x) reachable on the diffs it targets
  - Category: ambiguity; (x) is gated on a "new structural element" whose enumeration did not cover an added test, and its own trigger read as a property of what the new assertion inspects — so a non-discriminating test suppressed its own detector. The gate now names a newly added test or other new block, and (x) keys on what the implementation changed
- fix(dev-workflow): document the Step 7 concurrent-launch nesting-bound cost (auto-triage #180)
  - Category: wrong-default; the "do not nest a further Agent" bound makes the callee run its review inline-sequentially instead of dispatching its own parallel reviewers — documented the cost in `README.md` § Step 7 background launches so intended-design vs regression is distinguishable, with SKILL.md keeping the operative clause plus a pointer rather than the rationale itself
- fix(dev-workflow): declare the evaluation order of Step 1's settings-overlay rules
  - Category: ambiguity; the six rules were a flat list mixing value-shape branches with type-class branches, so a `null` under a List key matched both "explicitly clears" and "append" — opposite outcomes with nothing to arbitrate. The list is now first-match-wins with the value-shape rules first, which is the order the clear rule's `[]` / `{}` forms already implied
- fix(dev-workflow): drop "optionally" from the Step 7 concurrent-launch instruction
  - Category: ambiguity; the paragraph read as agent discretion while § Configuration counts the same two launches among the three fixed dispatch sites and the paragraph itself says to default to parallel — the sentence now carries only the availability condition it already stated, and the delegated procedure in `references/step7-check-test.md` is swept to match at both launch bullets

### mobpro v1.13.1 / dev-workflow-bundle v1.118.1

- fix(mobpro): order M9 prediction narration with this-run text first (auto-triage #182)
  - Category: wrong-default; M9 § C left prediction ordering unspecified, so predictions pointed outward while findings concentrate on freshly-written prose — fixed the ordering to lead with this-run text
- fix(mobpro): make the M9 prediction ordering rule applicable to the sample it sits above
  - Category: ambiguity; the ordering rule spans several predicted spots while the bilingual sample offers one slot in a single sentence, and it did not say what to do when no pre-existing asset is worth predicting — § C now states the multi-spot expansion and the omit-rather-than-negate case

### dev-workflow v1.102.0 / mobpro v1.13.0 / dev-workflow-bundle v1.118.0

- **Behavior change**: Step 10 (Interactive Commits) now proposes **one commit per approved `Build order` step** instead of grouping the finished working tree from scratch. Step 5 records each step's landing point as a dangling git object (new sub-step 2.5), and Step 10 builds each commit's tree from that object, plus a final commit for whatever Steps 6–9 changed. Because a commit's content comes from its recorded step rather than from a file list, **two commits may now touch the same file** — a sequence that revisits a file no longer collapses into one commit, which is what "build small, then flesh it out" normally does
  - The commit mechanism changed with it: each commit is built as a `git commit-tree` candidate, presented as its own diff against the parent, then landed by setting the index to that candidate's tree (`git read-tree`) and committing it. Hooks keep their veto — they run on the `git commit`, before the ref moves — and the working tree is never touched, so unstaged files (this workflow's own plan documents among them) stay exactly where they were
  - `interactive_commits: false` is unaffected: no landing points are recorded and Step 10 stays unregistered. Runs that have none recorded — the key enabled only after implementation, an interrupted session, a failed recording — fall back to the previous cohesion-based grouping and say so in one line
  - `interactive_commits` now also gates Step 5: when `true`, Step 5 stages each Build order step's edited paths to record its landing point, so the key governs index activity during implementation as well as the commit phase. Setting it `false` records nothing, exactly as before
  - `allowed-tools` gains `Bash(git read-tree *)` in both skills
- feat(mobpro): M11's commit plan now comes out as one commit per implementation unit the junior reviewed, in review order. M6 already recorded each unit as a chained object, so the diffs approved during the loop and the commits approved at the end are the same slices
- The `crit` commit-review path no longer builds a review object of its own — it ranges against the per-commit candidate, so its per-round object build and its unstage step are gone
- `Step 2 § Simplicity self-audit`'s **Commit-split boundary alignment with file-level staging** item is now skipped whenever `interactive_commits` is `true` — the audit runs at plan time, so it keys on the config flag

### dev-workflow v1.101.0 / mobpro v1.12.0 / ask-peer v2.5.1 / dev-workflow-bundle v1.117.0

- **Behavior change**: `dev-workflow`'s plan section `Design` is now `Build order`, and it is always an ordered, numbered list — the "structure by file when the changes are non-sequential" alternative is gone. The order is the order the work lands in, and Step 5 executes it step by step, so approving a plan approves that sequence. Work with no inherent order is still numbered, with one line saying the order is free. Both workflows now name this section identically, so `mobpro`'s § Review lens no longer maps between them
  - Write each step as `N. **<heading>** — <detail>`: a verb-first bold heading naming the file(s) it touches, then the detail. The bold heading is what splits summary from detail in the browser gate below; the em dash is only the conventional separator
  - `Build order` moved from the `Review guide` line's `reference` tier to `must-review`, alongside `Overview` and `Decisions`. In chat, Step 4's condensed view now shows the step headings in place of the former file list; the headings name the files, so the file-level orientation is unchanged
  - Anything matching the old section name needs updating: plan templates, plan-authoring prompts, and tooling that greps for `### Design`
- feat(dev-workflow): collapse Build order steps in the browser plan-review gate
  - Each step opens showing only its bold heading and expands on click, which is what lets `Build order` sit in the must-review tier without the section opening at full length; a step written without a bold heading renders uncollapsed. Commenting on a step works while it is collapsed. This is the `visual` gate only — the `plan-mode` approval modal and the `crit` gate render the plan as written, which is why each heading has to carry its step on one line. The viewer's classifier no longer carries a `Design` entry, so a pre-rename plan document classifies as an ordinary section and opens collapsed
- fix(ask-peer): rename the stale `Design` references in the plan-review payload
  - Category: ambiguity; the parallel-fan-out atomicity audit pointed the reviewer twice at "the plan's Design", a section no plan format produces any more

## 2026-07-29

### dev-workflow v1.100.0 / mobpro v1.11.0 / dev-workflow-bundle v1.116.0

- `review_iterations` now accepts `0`, which turns that review phase off for the project. `review_iterations: {plan: 0}` runs without Plan Review, `{code: 0}` without Code Review and a scalar `0` without either. Previously `0` was rejected as invalid and silently replaced by the default `3` with a warning. A phase turned off this way is skipped exactly as the Trivial tier skips it, and — because it is your own declaration rather than the workflow's decision — it raises no Completion-summary skip reminder, unlike the difficulty-skip and `--fast` skips. Negative and non-integer values are still invalid and still fall back to `3`
  - `mobpro` honors a configured `0` too, rather than clamping to `1`: the two skills read the same config file, so they must resolve the same counts. With `{code: 0}` `mobpro`'s M9 (Rules + code review) narrows to its rules-compliance half rather than being skipped, since that half reads no iteration count
- fix(dev-workflow): stop three difficulty / mode caps from *raising* an iteration count
  - Category: wrong-default; the Simple tier assigned `N_plan = N_code = 1` and `--fast` assigned `N_code = 1` unconditionally rather than as a `min` against the resolved value, so either could push a count up. This was unobservable while `0` was rejected at parse time and becomes reachable now. All caps are `min` forms, and Adjust N states that every tier only lowers
- fix(dev-workflow): key the Step 4 Trivial re-activation on the assessed tier instead of `N_code = 0`
  - Category: wrong-default; that re-activation (which re-derives difficulty when an approach-level change lands on a task assessed Trivial) identified Trivial by `N_code = 0`, on the documented premise that no other path produced that value. A configured code-phase `0` breaks the premise, so a project that merely turned Code Review off would have had its difficulty assessment re-derived

## 2026-07-28

### dev-workflow v1.99.0 / mobpro v1.10.0 / dev-workflow-bundle v1.115.0

- **Behavior change**: with `commit_review_gate: "crit"`, each diff the browser opens now carries a story — a prologue naming what the change does, its key changes and its risks, plus chapters grouping the diff's hunks — in place of a bare file-by-file diff. The prologue comes from the commit message, whose body crit otherwise drops on the way to the browser. This covers `dev-workflow` Step 10 (Interactive Commits) and `mobpro`'s M11 (Commit), plus `mobpro`'s M6 (Implementation loop) per-unit review — M6 lands no commit, so its prologue comes from the unit's stated point instead
  - Needs a crit build carrying the `story` subcommand (verified against 0.18.1). On an older build, or when crit rejects the story, the round falls through to the previous behavior — the diff opens without a story and nothing else changes

### dev-workflow v1.98.1 / dev-workflow-bundle v1.114.1

- fix(dev-workflow): make four cross-reference anchors resolvable
  - Category: ambiguity; `§ Step 1 registration mechanics` was cited from six sites while the bold label actually read `**Registration mechanics**`, `Merge strategy per key type` was cited as a bold-prose label while its target was plain prose, and `see Step 1.5` carried no descriptor. The label is renamed, the paragraph bolded, and the step named. Separately, § Localization granularity's `Applies to` sentence now lists the same output categories as `references/configuration.md`'s `language` bullet, which it claims to mirror

### dev-workflow v1.98.0 / mobpro v1.9.0 / dev-workflow-bundle v1.114.0

- **Behavior change**: `mobpro` no longer asks at kickoff what the junior wants to learn. The AI explains as it works, so what the junior takes away comes out of the narration and the per-unit diff reviews rather than from goals declared before any code exists. The wrap-up learning summary stays, now drawn from what the session actually built and explained instead of measured against pre-declared goals; the state-file body no longer carries a learning-goal line
- **Behavior change**: both workflows now say what a phase does wherever an internal step identifier reaches user-facing output. A bare `Step 10` or `M11` forced the reader back through earlier output to recover its meaning, so gate prompts, skip notes, ledger records, and completion reminders either pair the number with the phase name (`Step 10 (Interactive Commits)` / `M11 (Commit)`) or drop the number and name the phase. The identifiers themselves are unchanged — the new `§ Phase naming in user-facing output` section in each SKILL.md governs output only
  - Ledger and gate strings changed — anything matching them exactly needs updating. `fast_mode_skipped_steps`: `Step 7.5 re-verification skipped (fast mode)` → `Step 7.5 Rules Compliance Review re-verification skipped (fast mode)`. `bundle_skills_unavailable`: `rules-review unavailable (Step 7.5)` → `rules-review unavailable (rules compliance review)`, and likewise for the `ask-peer` / `extract-rules` / `tidy` / `prose-polish` records. The commit gate's verification line is now `Check / Test:` (was `Step 7:`), and the compaction reminder names the rule-update phase

### dev-workflow v1.97.0 / mobpro v1.8.0 / dev-workflow-bundle v1.113.0

- **Behavior change**: `mobpro` now honors `plan_review_gate`. M5's plan approval opens the bundled browser gate (`visual`, the default) or crit (`crit`) instead of always running in chat. **To keep the chat approval, set `plan_review_gate: "plan-mode"`** in `.claude/dev-workflow.md` — `mobpro` never enters Plan Mode, so for it that value simply means chat. Either browser gate falls back to the chat approval when no local browser is reachable. The deprecated `visual_plan_review` boolean maps the same way it does for `dev-workflow`
- feat(mobpro): render `Choices I made` as switchable Decision cards in the plan-review gate
  - `references/plan-format.md` § Template now uses `Decisions`' `**Question**` / `**Recommendation**` / `**Alternative**` field shape, so a junior can flip a fork to its alternative from the browser and see what that would have meant. `**Alternative**` is omitted where a fork had no real second option. The "surface every fork, no (a)+(b) filtering" rule is unchanged — only the field shape is
- feat(dev-workflow): classify `mobpro`'s plan headings in the browser plan-review viewer
  - `scripts/plan-review/public/index.html` matched only `dev-workflow`'s own heading names, so a `mobpro` plan opened with every section collapsed. `What we're building` / `Build order` / `Why this order` / `Choices I made` now open by default, and `How we'll check it works` / `Watch-outs` classify as test / risks
- fix(mobpro): pin `<slug>` resolution at M3
  - Category: ambiguity; M3 wrote the plan to `.claude/plans/<slug>.md` without saying how `<slug>` is chosen. The visual gate derives three more paths from the same slug, so it is now resolved once per run (the state file's slug, else derived from the effective task) and reused verbatim on any M5 re-entry

### dev-workflow v1.96.0 / mobpro v1.7.0 / dev-workflow-bundle v1.112.0

- **Behavior change**: the diff-size thresholds `diff_verbatim_line_threshold` / `diff_verbatim_threshold` / `diff_condensed_threshold` are no longer read from `.claude/dev-workflow.local.md` — they are fixed internal constants (100 lines / 4000 chars / 20000 chars) in the new `references/diff-presentation.md`. Any value set for them is now ignored, so **the guidance in the dev-workflow v1.74.6 and v1.59.0 entries below — "set to `99999999` in `.claude/dev-workflow.local.md`" — is revoked**. Both skills warn once at settings load if a config layer still sets one of the three (`mobpro` honored them at its M6 diff review, so it carries its own tombstone). Grounds: overriding the ladder yields near-zero value — every setting of it produces the same commit-gate decision from the same diff, changing only how many lines of that diff are printed on the way to it, and the untruncated diff stays one `git diff` away in every mode. Skipping the deprecation notice and the calendar-anchored waiting period is a **deliberate deviation** from the config-flag lifecycle: that rule protects downstream projects whose config depends on a documented opt-out, and the user's removal decision came at the plan-approval gate rather than before planning, so the exception path's precondition is not met literally. The protection it offers is nonetheless met here — these keys appeared on no configuration surface to depend on, and the tombstone warns loudly on any layer that still sets one
- fix(dev-workflow): resolve the Step 10 default-branch guard from a local ref before querying the remote
  - Category: missing-branch; `references/interactive-commits.md`'s Default-branch guard resolved the default branch only via `git remote show origin`, which reaches the network — on an offline or unauthenticated host it returned no `HEAD branch` line, the guard silently skipped, and commits landed on the default branch. It now tries `git symbolic-ref -q --short refs/remotes/origin/HEAD` first and falls back to the remote query only when that ref is unset
- fix(dev-workflow, mobpro): declare the git subcommands the commit step actually invokes
  - Category: missing-branch; both skills' `allowed-tools` omitted `git symbolic-ref` / `git merge-base` / `git remote show` / `git switch -c`, which the default-branch guard and the branch-ancestry guard require. The gap only surfaced outside auto-approve permission modes
- refactor(dev-workflow, mobpro): extract the shared diff-scoping and diff-rendering procedures into `references/diff-presentation.md`
  - The detached-review-object technique (stage → `write-tree` → `commit-tree` → `reset --`, plus the verified fact that crit accepts the resulting dangling object as `--range`'s head) and the verbatim / condensed / skeleton rendering ladder now live once each, in `<base>` / `<head>` vocabulary with a per-caller endpoint table. Step 10's commit gate, its crit path, and mobpro M6 supply their own endpoints and point here instead of restating the steps
- docs(dev-workflow): scope `commit_review_gate` to code-diff review rather than Step 10 alone
  - The key also governs mobpro's M6 per-unit review, so both descriptions now present Step 10 as one consumer, and `references/configuration.md` is the stated source of truth for the key's semantics

## 2026-07-27

### dev-workflow v1.95.1 / dev-workflow-bundle v1.111.1

- fix(dev-workflow): drop the repo-specific gitignore assertion from the Step 2 audit's external-reference check (follow-up to auto-triage #178)
  - Category: ambiguity; the example asserted a concrete plan-document path is gitignored — a per-project fact the workflow's own § Workflow artifacts deliberately does not rely on, and one that reads as a broken pointer in a distributed skill. It now names the class of location instead of the path
- refactor(dev-workflow): move the Step 7.5 deferred-bookkeeping rationale out of the hot-path reference
  - `references/step7.5-rules-compliance.md` is read on every non-skipped Step 7.5 run, and its sub-step 1 carried a sentence explaining why the scope note exists rather than what to do. The explanation now lives in `README.md`'s Step 7.5 row, which ships inside the plugin source; the reference keeps the directive alone
- fix(dev-workflow): make Step 7's concurrent-launch deferred-bookkeeping scope note conditional (follow-up to auto-triage #169)
  - Category: missing-branch; the background-launch path injected the note unconditionally, which would suppress a genuine paired-bump violation on runs that defer nothing — it now carries the same condition as the direct-invoke path
- fix(dev-workflow): resolve the option-order contradiction in Step 7's base-commit comparison (follow-up to auto-triage #175)
  - Category: ambiguity; the preference clause was appended after a sentence that still listed `git stash` first, so a top-to-bottom reader stashes before reaching it — path (ii) is now one ordered fallback chain
- fix(dev-workflow): give Step 5 sub-step 8's same-class grep a searchable anchor (follow-up to auto-triage #179)
  - Category: ambiguity; "grep the edited scope for the same-class values" named neither a scope nor a pattern, and an un-marked value is a bare numeral — it now names the touched files and the class's unit token
- fix(dev-workflow): consolidate the duplicated form in Step 5 sub-step 4 (vi) (follow-up to auto-triage #177)
  - Category: ambiguity; enumerated form (a) restated the umbrella clause it hung off, leaving two distinct forms after absorption
- fix(dev-workflow): prohibit partial salvage of a stale background-review report (auto-triage #179)
  - Category: ambiguity; Step 7's Flag lifecycle contract now discards a stale result whole instead of allowing a subset of its findings to be reused
- fix(dev-workflow): apply the derived-value provisional marker to all same-class values in one edit (auto-triage #179)
  - Category: ambiguity; Step 5 sub-step 8 requires all-or-none marking across same-class figures plus a grep-verify step
- fix(dev-workflow): add a plan self-audit for a delete/no-dup justified by an external reference (auto-triage #178)
  - Category: missing-branch; verify the cited location is recipient-visible / version-controlled before accepting the justification (holds under `--fast`)
- fix(dev-workflow): sharpen the comment-conciseness self-check with concrete failure modes (auto-triage #177)
  - Category: ambiguity; Step 5 sub-step 4 (vi) names the recurring comment smells and adds a same-change sweep
- fix(dev-workflow): add a stale-cache phantom-violation diagnostic to Step 7 check discrimination (auto-triage #175)
  - Category: wrong-default; re-run with the cache invalidated before treating an unchanged-file violation as real
- fix(dev-workflow): prefer non-tree-mutating base-commit comparison over `git stash` in Step 7 (auto-triage #175)
  - Category: wrong-default; `stash pop` can fail to restore — prefer the `--base-commit` arg or a scratch `git worktree`
- fix(dev-workflow): pass a deferred-bookkeeping scope note to the in-run Step 7.5 rules-review (auto-triage #169)
  - Category: missing-branch; suppress the deterministic false-flag of version-bump / CHANGELOG deferred to the Step 10 bookkeeping point

### extract-rules v1.23.1 / dev-workflow-bundle v1.111.1

- fix(extract-rules): document that there is no diff-base / sha change-origin argument (auto-triage #176)
  - Category: missing-branch; a usage note distinguishing `--from-conversation` / `--from-pr` from `--base-commit`-style args

### mobpro v1.6.0 / dev-workflow-bundle v1.111.0

- feat(mobpro): write the plan in a shape the junior can read, and drop the `Difficulty` field it could never fill
  - **User-visible**: the plan presented at M5 no longer uses dev-workflow's `Overview` / `Decisions` / `Design` / `Test plan` / `Risks` structure, which is built for peer review between seniors. It is now `What we're building` / `Build order` / `Why this order` / `Choices I made` / `How we'll check it works`, plus an optional `Watch-outs` — plain wording, the build order first, and each fork in the road explained rather than handed to the junior as a decision to arbitrate. M5 only ever asked for approval, so the plan no longer carries a section implying otherwise
  - `Build order` is now the only input to M6's unit segmentation: each step is one implementation unit, so the plan doubles as the list of diffs the junior will review. The "3–10 units" sizing rule moved from M6 to the template, where those steps are authored
  - `Difficulty` is gone. dev-workflow's template requires it, but `mobpro` runs no difficulty assessment and had nothing to put there — runs so far omitted the field by hand
  - M4's reviewer now reads the new `references/plan-format.md` § Template + § Review lens in place of dev-workflow's `Decisions` (a)+(b) criterion and § Step 3 (f) content-quality rubric — a `mobpro` plan has no `Decisions` section. § Review lens carries one mapping rule covering the rest of the review payload, so a `Decisions` / `Design` / `Test plan` remedy prescribed anywhere in it reads as `Choices I made` / `Build order` / `How we'll check it works`, and no finding can ask for a section back. It also owns the structural check that the plan carries all five required sections
  - Size: new `references/plan-format.md` is 3,630 chars, read once per run at M3; `SKILL.md` 35,829 → 36,524, still over the repo's 32k guideline. dev-workflow's `plan-format.md` is still read at M3, now for § Localization granularity alone

### mobpro v1.5.0 / dev-workflow-bundle v1.110.0

- refactor(mobpro): retire two names left over from the removed checkpoint mechanism, and settle how M6 renders an oversized diff
  - **New**: M6's chat diff surface now states how to render an oversized unit diff instead of leaving each run to decide. It uses the verbatim / condensed / skeleton ladder, the three threshold keys, and the defaults the commit gate at M11 already uses — including any override set in the dev-workflow config layers — so both diff surfaces in one session render the same way. The `crit` surface is unaffected, since crit renders the diff itself. `references/configuration.md` § Fallback keys stays a closed list of 14: its membership rule now carves out keys a procedure reference resolves in place, which is how M11 has always read these three
  - Two internal renames, no behavior change. `§ Checkpoint Principle` → `§ Learning-Stop Principle`: v1.4.0 removed the `checkpoint` mechanism the name pointed at, and what the section holds is the stop discipline — `mobpro`'s counterpart to dev-workflow's `§ No-Stall Principle`. `references/walkthrough-review.md` → `references/diff-review.md`: the file only ever described the diff review, while "walkthrough" names a different step (M6 sub-step 2 (c), whose length cap is now labelled **Per-file walkthrough**)
  - `README.md` now documents that the M6 diff review stages each unit's paths with `git add` and unstages them at loop exit, so a reader can predict what `mobpro` does to the git index before running it
  - Size: `references/diff-review.md` 9,422 → 11,377 chars, the growth being the rendering ladder on a file read once per M6 loop; `SKILL.md` 35,884 → 35,829, unchanged in substance and still over the repo's 32k guideline

### mobpro v1.4.0 / dev-workflow-bundle v1.109.0

- feat(mobpro): re-aim the teaching model from measuring comprehension to narrating the work, and put a diff review where the per-unit checkpoint used to be
  - **Breaking — `mobpro` no longer has configuration of its own.** `.claude/mobpro.md` and `.claude/mobpro.local.md` are no longer read, and the three keys they carried (`checkpoint` / `quiz` / `error_reading_practice`) are gone with no replacement — the behavior they gated is now fixed, so there is nothing to opt out of. M1 warns once if either file is still present, so a project that relied on them sees the change rather than absorbing it silently. This is a deliberate departure from this repo's config-flag lifecycle (deprecation notice, then a calendar-anchored wait): the keys were removed in the same change that removed the behavior, at the user's explicit decision taken before implementation started. The tombstone itself follows the standard lifecycle — drop all three of its sites (`SKILL.md` M1, `references/configuration.md` § Resolution procedure step 3, `README.md` § Configuration) once ≥ 4 weeks have passed since this release with no report of a project relying on the removed keys
  - **User-visible**: the junior is no longer asked to answer anything. The M5 teach-back, the M6 checkpoint's three question forms, the M8 first-failure error-reading practice, the M9 pre-review prediction quiz, and M3's Socratic prompt are all replaced by AI narration — M3 states the approach it chose and why, M8 states which part of the error it read and what that says, M9 states where it expects findings before running the reviews and cross-checks afterward. Narration asks nothing, so it never pauses the run
  - **The one recurring stop is now a diff review after every M6 implementation unit**, and that is where the junior's questions land. Units are segmented finer (3–10 rather than 3–7 — one meaningful change per review), and the review's display surface follows `commit_review_gate`: setting it to `crit` now opens crit during implementation as well as at the commit gate. M6 and M11 determine crit availability independently
  - M6 still commits nothing: each unit's review shows that unit's own delta rather than everything since the base commit, and no ref or working-tree state moves. The commit gate at M11 is unchanged
  - New `references/walkthrough-review.md` holds the diff-review surface and its range mechanics; `references/learning-gates.md` is rewritten around the narration model, with the walkthrough and narration length caps widened to carry explanation rather than a one-line summary
  - Size: `references/configuration.md` 5,589 → 4,506 chars and `references/learning-gates.md` 5,802 → 4,910, but `SKILL.md` 34,017 → 35,884 — this change widens `SKILL.md`'s overage against the repo's 32k guideline rather than narrowing it. The new `references/walkthrough-review.md` adds 9,422, read once per M6 loop

## 2026-07-26

### mobpro v1.3.2 / dev-workflow-bundle v1.108.2

- refactor(mobpro): stop explaining `run-tests` in the runtime path — the missing-test-skill branch never needed to know which skill is absent
  - **User-visible**: M8's missing-test-skill note no longer points at `dev-workflow --init` / `run-tests`. It asks the user to point `test_commands` at a skill that exists in the project and sends them to `README.md` § Configuration, which now carries the `--init` instructions (both `language: ja` and `language: en` forms)
  - `references/configuration.md`'s `test_commands` / `run-tests` paragraph and `SKILL.md` M8's matching explanation are both gone — neither changed M8's decision, which is the same whichever skill is absent. `test_commands`' **Default** column entry stays; that value is read at resolution time
  - M8 sub-step 1 now states the `test_commands` entry shape (`each entry must be of the form Skill(<name>)`) at the point it runs, mirroring `dev-workflow` § Step 7 — without it, a project setting a shell command there diverges from `dev-workflow` silently
  - Also dropped from `references/configuration.md`: the `runs on defaults alone` line, and § Fallback keys' provenance sentence — replaced by a shorter clause inside that section's existing sync note: the **Default** column is the only runtime source for those values
  - `references/configuration.md` 6,185 → 5,589 chars, `SKILL.md` 34,219 → 34,017; the `references/configuration.md` pointers in `SKILL.md` go 6 → 5. Canonical and bundle copy synced

### mobpro v1.3.1 / dev-workflow-bundle v1.108.1

- refactor(mobpro): trim design rationale out of `references/configuration.md`, which M1 reads on every run
  - Removed: the two-group opening paragraph, the per-key reasoning in § Not-adopted keys, the `commit_review_gate` asymmetry section, and the closed list's completeness argument. § Not-adopted keys now gives each key's resolved behavior in one line, while the key table and § Resolution procedure are untouched, so M1 still resolves entirely from this file. 7,536 → 6,185 chars
  - `README.md`'s **Deliberately ignored** paragraph picks up the reasoning a user would actually ask for — chiefly why `commit_review_gate: crit` is honored while `plan_review_gate` is not: `crit` swaps only the diff-*viewing* surface, whereas `plan_review_gate` would move the *approval* surface out of chat, and the plan approval is where the M5 teach-back happens. A new `references/config-rationale.md` was considered and rejected — it would ship to every consuming project as a third site to keep in sync
  - § Fallback keys' sync note now also states the membership criterion (a key belongs there when it governs a step `mobpro` also runs), so "closed list of 14 is complete" stays checkable as `dev-workflow` gains keys. `SKILL.md` needed no edit; canonical and bundle copy synced byte-identical

### ask-peer v2.5.0 / dev-workflow v1.95.0 / extract-rules v1.23.0 / mobpro v1.3.0 / prose-polish v1.7.0 / rules-review v1.7.0 / tidy v1.5.0 / dev-workflow-bundle v1.108.0

- feat(bundle): declare that invoking a skill authorizes its subagent dispatches, so a permission-shaped restriction in the surrounding session can no longer silently degrade a dispatch into inline execution
  - **New `## Dispatch authorization` section in all 7 bundle skills** (`ask-peer` / `dev-workflow` / `extract-rules` / `mobpro` / `prose-polish` / `rules-review` / `tidy`) — byte-identical in each, placed at the end of the preamble immediately before the procedural body (it has to be in context before any route decision, so this placement is load-bearing and the rules bullet records it), and narrowing what may substitute inline execution for a specified dispatch to technical availability alone. Each skill carries its own copy because each is independently installable and invocable, so a pointer to a sibling skill's write-up would dangle on a standalone install
  - **Both branches of every dispatch-route decision now test capability, not permission.** The positive `**Claude Code path**` predicate in `ask-peer` / `rules-review` / `tidy` read "the `Agent` tool is exposed and nested dispatch **is not blocked**" — a permission instruction satisfies that by reading itself as the block — and now reuses each file's own existing vocabulary, "exposed **and callable**". Symmetrically, the fallback trigger in those three read "or the host indicates before dispatch that reviewer dispatch cannot recurse", which the same instruction satisfies by reading itself as the host's indication; its first disjunct now reuses `prose-polish`'s already-established wording, "the `Agent` tool is absent from the tool surface (e.g. this skill runs inside a nested subagent context where nested `Agent` is not surfaced)", and its second is re-expressed as a contract term (next bullet). Each of the 4 fallback paragraphs' invocation-lineage sentence additionally rules out permission-shaped restrictions, pointing at the new section (with a one-line rationale marking the restatement as intentional, so a cleanup pass does not strip the one sentence that fires at the decision moment); `rules-review` § 5. Review keeps its `**Fallback path**` label and its "Detect availability by inspecting the current tool surface" sentence unchanged, since `verify-skill-refs` cites both verbatim
  - **A second fallback trigger is restored, as a contract term rather than a permission.** Collapsing the old two-disjunct trigger to one turned out to drop a route that `references/step7-check-test.md` itself still produces: Step 7's background launches instruct their callee to run inline. That producer note asserted "nested `Agent` is unavailable in this subagent context" — which a `general-purpose` subagent can observe to be **false** (it has `Agent` on its own tool surface), so the note put the callee's capability check in conflict with its payload. Both halves are fixed: the note now states its actual intent — the callee must run the callee skill on its own thread and must not wrap it in a further `Agent` dispatch, phrased as a caller-imposed nesting bound and explicitly **not** as an availability claim, matching the wording `run-tests` already uses — and the 4 fallback paragraphs regain that bound as an explicit second trigger. A nesting bound arriving through the invocation contract is not the permission-shaped restriction the new section excludes
  - **The two dispatch sites where the failure was actually observed are now reinforced at the decision point**, not only in the preamble: `references/session-scan.md` § Inputs (the shared session scan — the site the collapse-into-inline was seen at, and `mobpro`'s only direct `Agent` use) and `extract-rules` Step C2. Both previously carried an unconditional "dispatch" instruction with no statement about what may change it, and both sit far enough from the new section that an agent deciding there had nothing local to check its reasoning against
  - Observed failure mode this addresses: with the `Agent` tool present and callable, a session-level instruction permitting subagent dispatch only on explicit user request was read narrowly enough that Step 6 cleanup, Step 7.5 rules-review, Step 8 code review, and Step 11's extract-rules session scan all ran inline — Step 8 in particular collapsing into the implementer reviewing their own code. `ask-peer`'s own rule already covered the case, so the gap was a missing authorization axis rather than a missing availability rule
  - Deliberately **not** a user-confirmation gate: the user invoking the skill already expects it to behave as written, so a confirmation prompt is another form of not following the skill's own instructions
  - Availability remains a separate axis and is unchanged here: `dev-workflow` / `extract-rules` / `mobpro` still document no inline path for a technically-absent `Agent` (`extract-rules` Conversation Extraction Mode Step C2 has no alternative route at all) — tracked as dev-workflow-issues #177 Finding 2. Project-local dispatching skills under `.claude/skills/` are out of scope for this change
  - **The invariant is now mechanically checked** rather than left to prose: `run-tests` gains Check 7 (every bundle member's `SKILL.md` carries the section, and the bodies hash identically), reusing the bundle-`skills`-array iteration Check 3 already performs — `verify-bundle-sync` compares only canonical↔bundle-copy, so nothing previously compared skill to skill. `.claude/rules/project.rules.md` records the invariant, the required placement (preamble end, before the procedural body), and the enumerated member list; `.claude/rules/project.rules.local.md`'s Coordinated multi-site sweep instance (3) gains the `+1` leg, since its "closed list bound = 4" otherwise contradicted the new obligation. The bullet cites `## Sub-skill caller directive` (4 of 7 members) and `## Stop hook structural conflict (caller-side note)` (3 of 7) as precedents for *replicated* sections only — neither is all-members or byte-identical, the latter deliberately so
  - canonical `skills/<name>/` and the `dev-workflow-bundle` copies synced byte-identical for all 7

### mobpro v1.2.0 / dev-workflow-bundle v1.107.0

- feat(mobpro): wire config-file reading, Resume sub-mode, the `commit_review_gate: crit` diff surface, and the full state-file lifecycle (subtask 4 of 4 from `.claude/plans/dev-workflow.mobpro.md`) — `mobpro` is no longer a walking skeleton
  - **Config-file reading**: M1 resolves the three mobpro-specific keys (`checkpoint` / `quiz` / `error_reading_practice`) from `.claude/mobpro.md` → `.claude/mobpro.local.md`, and the 14-key fallback closed list from dev-workflow's three config layers, silently ignoring the not-adopted keys (`plan_review_gate` and its deprecated predecessor `visual_plan_review`, `implementation_executor`, `subagent_model`). A missing config file is skipped rather than treated as an error, and having no config file anywhere still runs on defaults — the deliberate difference from `dev-workflow`, which stops and prompts `--init`. The procedure lives in `references/configuration.md` § Resolution procedure rather than inline in SKILL.md, mirroring dev-workflow's own § Step 1 → `references/step1-load-settings.md` split and keeping SKILL.md within its char budget
  - The fallback closed list was re-derived against its membership criterion as the design required: `dev-workflow` exposes 17 configuration keys, and 14 adopted + 3 not-adopted accounts for all of them. `references/configuration.md` § Fallback keys now carries each key's **Default** in a table (`Keep the Default column in sync with dev-workflow references/configuration.md`) — load-bearing because `mobpro` may not read dev-workflow's own config documentation at runtime, so without it a no-config project could not resolve `interactive_commits` / `hooks.on_complete` and M1's conditional task-row omissions would be undecidable. `self_retrospective` / `workability_retrospective` — previously absent from both skills' merge-class lists — are now classified in `references/inline-defs.md` § (a) as **map-valued scalars** that replace wholesale across layers with no per-key cross-layer merge, matching what `dev-workflow`'s own `references/configuration.md` documents for them; each absent leaf falls to its default at resolution time, and the merged map's leaves are read individually (leaf-level reading of the merged result, not leaf-level merging). `.claude/rules/project.rules.md`'s mobpro transcription-sweep bullet gains the new Default-column dependency on both sides — `skills/dev-workflow/references/configuration.md` as an upstream trigger and `skills/mobpro/references/configuration.md` as a sweep target — so a future dev-workflow default flip cannot drift the transcribed table silently
  - **M2 Resume sub-mode**: follows `task-decomposition.md` § A plus the preamble sections it depends on (§ State file schema, § Canonical state-file path, § Parent-task progress row) and re-surfaces the state-file body's learning-goal line (ja/en pair). Two notes accompany it: § A step 5's all-subtasks-completed branch routes to M13's lifecycle rather than M3, and § A step 3a's planning-draft recovery continues in Normal sub-mode so the learning-goal confirmation still fires
  - **`state_file_path` cross-step variable**: the resolved absolute state-file path is now declared in § Cross-step state variables — set at M2 in **both** sub-modes, read by M4's subtask scope and M13's lifecycle, `null` on an undecomposed run. Previously the canonical-path discipline was only prose inside the Resume branch, so M13 had nothing bound to read on the Normal path
  - **M11 `commit_review_gate: crit`**: `diff` (the default) keeps the chat diff; `crit` follows `crit-commit-review.md` for the once-per-run availability determination, the launch, the outcome mapping, and the chat fallback. The "point of this diff" note is emitted in the same turn as the crit launch, before the junior opens the browser. crit launches via background Bash, so M12 sub-step 3's only-direct-`Agent`-use invariant holds. § Runtime reads gains a `crit-plan-review.md` row, since `crit-commit-review.md` delegates the shared crit CLI contract (comment JSON shape, probe rationale) there rather than restating it — a transitive read the closed list previously did not cover
  - **§ Checkpoint Principle's "Primary-pass rule" paragraph**: learning stops now fire only on a step's primary pass — re-entering M8 / M9 as a verification pass (M9's loop-exit aggregate re-verification, and the per-round re-runs the M11 `crit` path mandates) does not re-fire the error-reading practice or the prediction quiz. Stated once at the closed list that owns the learning stops instead of as a per-site carve-out, so a new re-entry site cannot silently miss it
  - **M13 state-file lifecycle**: the ordered chain now surfaces in the step itself — deferral/exclusion gate, `completed` write-back, PR-URL prompt, progress-row refresh, next-subtask guidance, then progress-row removal and state-file deletion once every subtask is `completed` — with `references/inline-defs.md` § (g) supplying each item's discipline (canonical-path rule, the `landed_count == 0` reason, the extract-rules residue warning, the single-writer constraint) rather than SKILL.md re-rendering it
  - **README**: adds a typical-sessions section (onboarding / junior-senior handoff / review literacy on a bug fix) and a full configuration reference — config-file paths, a per-key table with defaults, the inherited keys including `commit_review_gate: "crit"`, and the deliberately-ignored keys
  - `references/configuration.md`'s two section headings lost their parenthetical suffixes (`## Fallback keys`, `## Not-adopted keys`) so the new cross-references resolve on an exact heading match; both parentheticals were already restated in their sections' bodies
  - Every walking-skeleton placeholder is gone across `SKILL.md` / `README.md` / `references/configuration.md` / `references/inline-defs.md`; canonical `skills/mobpro/` and the `dev-workflow-bundle` copy synced byte-identical
  - Still unverified end to end: `mobpro`'s M1–M13 has never been run live (deferred to the user's first `/mobpro` invocation since v1.0.0), and the `crit` branch needs a crit-installed environment. Structural verification (`run-tests` / `verify-bundle-sync` / `/verify-plugins`) passes

## 2026-07-23

### mobpro v1.1.0 / dev-workflow-bundle v1.106.0

- feat(mobpro): implement the learning gates on the M1–M13 walking skeleton (subtask 3 of 4 from `.claude/plans/dev-workflow.mobpro.md`)
  - Adds the M5 teach-back (fires when `checkpoint` is not `off`), the M6 three-form checkpoint dispatch — (a) teach-back / (b) lightweight quiz (`AskUserQuestion`, dropped from the pool when `quiz: false`) / (c) open question — with `checkpoint` tempo control (`unit` / `subtask` / `off`) and least-recently-used form rotation, the M8 first-failure error-reading practice (`error_reading_practice: true`), and the M9 pre-review prediction quiz + result cross-check (`quiz: true`)
  - Operational detail and the ja/en prompt pairs live in a new `skills/mobpro/references/learning-gates.md` (a mobpro-own reference, not a `dev-workflow` transcription); the SKILL.md M-steps carry each gate's firing condition and delegate the detail, and the explanation-length discipline (preview ≤ 6 lines / walkthrough 1–2 lines per file / finding 1–2 lines) is consolidated there as its single source of truth
  - The three gate-driving keys (`checkpoint` / `quiz` / `error_reading_practice`) resolve to their built-in defaults (`unit` / `true` / `true`); config-file reading to override them is deferred to subtask 4, so the `off` / `false` / `subtask` branches are written but not config-reachable until then
  - canonical `skills/mobpro/` and the `dev-workflow-bundle` copy synced byte-identical

## 2026-07-19

### mobpro v1.0.0 / dev-workflow-bundle v1.105.0

- feat(mobpro): add a new learning-oriented development-workflow skill and register it as a `dev-workflow-bundle` member (subtask 2 of 4 from `.claude/plans/dev-workflow.mobpro.md`)
  - `mobpro` is a mob-programming-style workflow that runs the same quality gates as `dev-workflow` (plan review, checks/tests, rules-compliance review, code review, interactive commits, rule maintenance) by calling the same bundle sibling skills, while pausing at learning checkpoints so a junior engineer can follow what is being built and why; the AI always drives, the junior navigates (reads diffs, predicts findings, approves commits)
  - This release is the **walking skeleton**: M1–M13 run once with built-in defaults (no config-file reading), the checkpoint reduced to a single "any questions?" form; the deeper learning gates (teach-back / prediction quiz / error-reading practice / configurable checkpoint tempo), config-file reading, the `commit_review_gate: crit` branch, session resume, and the full state-file lifecycle are deferred to follow-up subtasks
  - Files: `skills/mobpro/{SKILL.md, README.md, references/configuration.md, references/inline-defs.md}`; the design's §5.10 dev-workflow inline-definition transcriptions (a)–(g) are collected in `references/inline-defs.md`, each with a `Keep in sync with dev-workflow SKILL.md § <section>` note. `mobpro` reads `dev-workflow`'s reference files as install-time siblings (`../dev-workflow/references/*.md`), verified for the installed-cache layout by a Step 0 smoke test — so it must be installed via the bundle
  - Registration: `mobpro` plugin entry (`source: ./skills/mobpro`, `skills: ["./"]`, v1.0.0) + `dev-workflow-bundle` `skills` array / description / version bump; canonical `skills/mobpro/` and the `dev-workflow-bundle` copy synced byte-identical; governed bundle-member enumerations swept (`project.rules.md`, `dev-workflow-triage` triage-scope, `verify-bundle-sync` prose count)

### dev-workflow v1.94.0 / dev-workflow-bundle v1.105.0

- chore(dev-workflow): add `mobpro` to `references/self-retrospective.md`'s bundle-skill enumeration so `mobpro` improvement signals are in scope for the self-retrospective (all five sites — Purpose / Scope / keep-as-is skill names / Distribution-aware header / Target-skill-validation gate)
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical

### dev-workflow v1.93.0 / dev-workflow-bundle v1.104.0

- feat(dev-workflow): add the incremental-depth (walking-skeleton) decomposition axis to Step 1.5's `references/task-decomposition.md` § B. Normal sub-mode
  - New decompose signal: for a new feature whose minimal end-to-end happy path can be verified on its own, propose subtask 1 = a walking skeleton (happy path only, hardcoding / stubs allowed but wired for real so the E2E passes) and the rest = fleshing-out subtasks (validation → error handling → edge cases → polish), each carrying its own verification path in `verification_hint`
  - Unlike the existing axes, which *recognize* a split line already present in the request, this axis *manufactures* a split line along the depth dimension as a proposal strategy; a discriminator resolves the overlap with the primary distinct-verification-path signal (pre-existing line → first-signal label; manufactured line → `incremental-depth` label, with pre-existing recognition taking precedence in the judgment order), and the skeleton subtask records which parts are stubbed so reviewers do not re-raise known stubs
  - Coordinated 3-site sweep in one diff: (i) the § B.1 signal list, (ii) the precedence paragraph (both the "subtask too small" veto-override enumeration and the "Multi-axis disagreement default" enumeration), (iii) a skeleton→fleshing-out example under B.3.c; the axis stays subordinate to the absolute atomicity veto by its own "must pass E2E through real wiring" definition
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical

### dev-workflow v1.92.5 / dev-workflow-bundle v1.103.5

- refactor(dev-workflow): semantically compress the remaining out-of-scope `SKILL.md` sections (Step 1 / 4 / 10 / 11 / 11.5 / 11.6 / Configuration / Completion / Workflow artifacts) under the same inline-retention discipline as subtask 3 (subtask 5 of 5 from `.claude/plans/dev-workflow.shrink-skill-md.md`)
  - Moved still-inline **procedure bodies** into the corresponding `references/*.md` while keeping every **runtime-referenced definition inline** (variable inits/lifecycles, USER-GATE declarations, gate closed lists, cross-step re-entry pointers, stable anchors): **Step 4**'s sub-step 1 (Step 3-completion verification), sub-step 1.5 (Prose-language self-audit), and sub-step 3's rewrite-approach Trivial-re-activation runtime → `references/step4-finalize-plan.md`; **Step 1**'s sub-step 3 reviewer-availability probe + sub-step 7 Tool-availability/burst registration mechanics → `references/step1-load-settings.md` (the **Phase-boundary self-audit** operative sentences + the **Task-handle resolution convention** + the **Reviewer-family classification** + the `bundle_skills_unavailable` ledger init/append stay inline); **Completion**'s two-stage extract-rules-output partition mechanics → `references/completion.md` § Partition (the `uncommitted_*` set names + single-scan instruction stay inline)
  - Tightened in place (no delegation — closed-list / USER-GATE / always-active contracts that must stay inline): the Configuration `Agent`-tool-usage bullet (3 fixed dispatch sites + 2 conditional delegations preserved), the Merge-strategy Scalar bullet, Step 11's confirm-remaining-steps skip branch + `rule-extraction-active` gate rationale (the `compaction_applied_count` / `below_threshold_failed_files` establishment kept inline per the "keep runtime-referenced definitions inline" rule — a peer-review-flagged correction), Step 11.5 / 11.6 dispatch-once coordination, Step 10's unexpected-branch + post-hook-attribution prose, and the Workflow-artifacts exclusion paragraph
  - Result: `SKILL.md` → 119,422 chars (from 130,074 — an 8.2% reduction). No runtime behavior change (structural refactor + prose compression, patch bump)
  - **Parent-goal status — the `<100KB` subagent-full-read target (goal 2) is NOT reached and requires a re-architecture**: under the inline-retention discipline the achievable floor is well above 100KB (maximal safe compression reaches only ~114–116KB) — subtasks 1–3 already extracted the heavy procedure bodies, so what remains inline is predominantly runtime contracts, USER-GATE closed lists, and always-active behavioral rules (the No-Stall Principle) that must stay inline. Crossing the ~25k-token (~100KB) subagent single-Read threshold requires the same multi-skill re-architecture the 40k Large-file-warning goal needs (splitting `SKILL.md` into multiple skills), which is out of this subtask's scope — surfaced at this run's Completion deferral gate as a candidate re-architecture subtask rather than left in untracked prose
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical

## 2026-07-18

### dev-workflow v1.92.4 / dev-workflow-bundle v1.103.4

- refactor(dev-workflow): extract the residual Step 2 / 5 / 7 / 8 procedure bodies and Prerequisites out of `SKILL.md` into `references/*.md`, and semantically compress the No-Stall gate enumeration, Progress Visibility, and the Step 2 variable-init block (subtask 3 of 4 from `.claude/plans/dev-workflow.shrink-skill-md.md`)
  - Verbatim-extracted: **Prerequisites** into new `references/prerequisites.md` (leaving a `§ Configuration`-style per-bullet bold-label index inline so inbound `§ Prerequisites' "<label>" bullet` anchors keep resolving); **Step 2**'s Adjust N by difficulty + the sub-step 1 init hoist-rationale narration into `references/step2-create-plan.md` (the init block re-expressed inline as a variable table that keeps `step8_fix_files`' accumulation-window rule inline as its single source of truth); **Step 5**'s sub-step 2 executor-delegation body into `references/step5-implement.md`; **Step 7**'s `check_commands` scope-narrowing/drift full procedure + both concurrent-launch dispatch procedures into `references/step7-check-test.md` (keeping the launch labels + the `rules_review_*` / `code_review_*` flag lifecycle contract + the pass definition inline); **Step 8**'s sub-step 1 reviewer-report payload + the Deferred-verification gate-2 detail into `references/step8-code-review.md` (keeping the iteration-loop skeleton + `step8_fix_files` reads + the Exit-target remap closed list inline). Result: `SKILL.md` → 130,074 chars / 131.6KB (from 168,683 chars / 170.5KB — a 23% reduction), no runtime behavior change (structural refactor + prose compression, patch bump)
  - Semantically compressed **in place** (no delegation — always-active behavior rules): the No-Stall Principle's explicit-user-gate enumeration (each bullet reduced to gate name + one-line trigger + definition-site pointer; the closed list and each gate's classifier pointer kept inline) and the Progress Visibility base + mid-chain paragraphs
  - **Parent-goal status (Decision 1 — two goals split)**: the parent task's 40k-char target has two functional bases. (1) The Large-file (40k chars) warning is **not reachable without a re-architecture** (e.g. splitting `SKILL.md` into multiple skills) — even compressing the remaining sections under the same inline-retention discipline floors at ~90–105KB. (2) The subagent full-read goal (~25k tokens ≈ ~100KB) **is** reachable via a follow-up subtask compressing the out-of-scope sections (Step 1 / 4 / 11 / Completion / Configuration / Step 10) under the same discipline; surfaced at this run's Completion deferral gate as a candidate new subtask rather than left in untracked prose
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical

### dev-workflow v1.92.3 / dev-workflow-bundle v1.103.3

- refactor(dev-workflow): extract the remaining Step procedure bodies and the Configuration per-key detail out of `SKILL.md` into `references/*.md` (subtask 2 of 4 from `.claude/plans/dev-workflow.shrink-skill-md.md`)
  - Verbatim-extracted the procedure bodies of Step 1 (Load Settings sub-steps 1/5/8/9), Step 3 (Plan Review per-iteration procedure), Step 4 (Finalize Plan sub-step 2 presentation body), Step 6 (Tidy sub-steps 1–4), Step 6.5 (Polish Prose sub-steps 1–4), Step 7.5 (Rules Compliance sub-steps 1–3 + the `--fast` 1-pass cap), Step 9 (Completion Hooks sub-steps 1–4), Step 11 (Update Rules sub-steps 1/2/5), and Completion (the derived-artifact cleanup + the eight reminder render bodies) into new `references/step1-load-settings.md` / `step3-plan-review.md` / `step4-finalize-plan.md` / `step6-tidy.md` / `step6.5-polish-prose.md` / `step7.5-rules-compliance.md` / `step9-completion-hooks.md` / `completion.md` (Step 11 extended the existing `references/update-rules.md`); moved the Configuration per-key detail into a new `references/configuration.md`, leaving one-line bold-label summary bullets inline as the index. Result: `SKILL.md` → ~169KB (from ~242KB); no runtime behavior change (structural refactor, patch bump)
  - Kept inline per the "keep runtime-referenced definitions inline" rule: every USER APPROVAL GATE declaration, closed list, and cross-step runtime variable / contract — Step 1's reviewer-family classification + `bundle_skills_unavailable` init + N_plan/N_code resolution + phase-registration list, Step 4's four-bucket response closed list + Trivial re-activation runtime, Step 6's Cross-layer review handoff ledger, Step 7.5's persistent-violations gate declaration + the `code_review_stale` / `fast_mode_skipped_steps` contract note, Step 11's confirm-remaining-steps gate + `rule-extraction-active` gate + state-variable contract, Completion's partition paragraph + subtask-resume routing + execution-time deferral gate, and the Configuration `Agent` tool-usage bullet
  - Cross-references to relocated content updated (Step 8's Deferred-verification reuse pointer → `references/step7.5-rules-compliance.md`; the Configuration Merge-strategy summary → `references/step1-load-settings.md`; the `Agent`-bullet back-reference inside `references/configuration.md`); verified with `verify-skill-refs` (zero cross-reference violations)
  - Realistic floor: this subtask's enumerated scope floors `SKILL.md` at ~169KB because Step 2 / 5 / 7 / 8, the No-Stall Principle, and Prerequisites stay inline (out of scope for subtask 2); the parent plan's 55KB / 40KB targets require a further subtask covering those — recorded in `.claude/plans/dev-workflow.shrink-skill-md.md`
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical

## 2026-07-17

### dev-workflow v1.92.2 / dev-workflow-bundle v1.103.2

- refactor(dev-workflow): extract the four largest Step procedure bodies out of `SKILL.md` into `references/step*.md` to bring it under Claude Code's 256KB single-Read cap
  - `SKILL.md` had grown to 280.8KB (284,339 chars), exceeding the main-thread Read tool's 256KB hard cap (Claude Code reported it as unreadable in one Read). Verbatim-extracted the bulky procedure bodies of Step 2 (Create Plan sub-steps 3–5), Step 5 (Implement sub-steps 1, 3–8, 10), Step 7 (Check / Test — the `check_commands` pre-existing-vs-regression bullet + the `test_commands` self-check suite), and Step 8 (Code Review — sub-step 3's fix-time self-checks) into new `references/step2-create-plan.md` / `step5-implement.md` / `step7-check-test.md` / `step8-code-review.md`, leaving each Step's section label, entry/skip/gate declarations, runtime cross-step variable inits, and a delegation pointer inline. Result: `SKILL.md` → ~236KB (~20KB under the cap), no runtime behavior change (structural refactor, patch bump)
  - Cross-step runtime state kept inline (per the "keep runtime-referenced definitions inline" rule): Step 2's variable-init block + Adjust N by difficulty, Step 5's sub-step 2 delegation guidance + sub-step 9 `implementation_diff_paths` snapshot, Step 7's two concurrent-launch paragraphs (launch-state variables), and Step 8's iteration-loop skeleton + Deferred verification pass. Inbound cross-references to the moved labels resolve via the delegation pointers (which name each cross-referenced label verbatim and enumerate the remaining moved sub-steps by unambiguous shortened form); verified with `verify-skill-refs`
  - This is subtask 1 of 3 from `.claude/plans/dev-workflow.shrink-skill-md.md`: this subtask clears the 256KB hard-rejection; the single-un-paginated-Read goal (< ~25k tokens per page) and the 40k-char Large-file warning are addressed by the follow-up subtasks
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md` + 4 new `references/step*.md` + the `references/simplicity-self-audit.md` cross-reference-note update)

### dev-workflow v1.92.1 / dev-workflow-bundle v1.103.1

- chore(dev-workflow): consolidate the duplicated session-file-identification procedure in `references/workability-retrospective.md` §1.3 (monthly-consolidation 2026-07-17)
  - §1.3 already labeled its procedure "identical to `references/self-retrospective.md` §1.4" yet restated all six `pwd` → encode → `Glob` newest-`.jsonl` steps verbatim; replaced the restatement with a pointer to the canonical §1.4 procedure plus only the Step 11.6-specific deltas (the no-match exit wording and the §4-preview reject-all-candidates affordance), matching the sibling `references/rule-extraction-axis.md` §1 pointer-only pattern. −395 chars, no behavior change (G2b monthly consolidation)
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`references/workability-retrospective.md`)

### dev-workflow v1.92.0 / dev-workflow-bundle v1.103.0

- feat(dev-workflow): defer Step 8 code-review verification to a single loop-exit pass
  - Step 8's code-review loop no longer re-runs Step 7 (Check / Test) + Step 7.5 (Rules Compliance Review) after every fix iteration. Instead each iteration's fixed files accumulate into a new `step8_fix_files` cross-step variable, and a single loop-exit "Deferred verification (Step 8 fix aggregate)" pass runs check/test once (when any fix landed) plus a `Files:`-scoped `rules-review` over just those files (the rules-review gate is skipped on Simple tier, matching Step 7.5's own difficulty-skip; the check/test gate always runs). Both Step 7 concurrent background launches (rules-review, code review) become initial-pass-only, and the previous per-iteration "re-run pass" machinery is removed. This wires up the `Files:` scope argument added to `rules-review` in v1.6.0
  - **Behavior change / tradeoff**: the "Always re-run Step 7/Step 7.5 — no exceptions" green-tree invariant is intentionally relaxed — a Step 8 fix's breakage is now caught at loop exit rather than between iterations (bounded by the loop-exit check/test 3-retry loop + the Step 10 commit gate). No config flag; applies to every run

### rules-review v1.6.0 / dev-workflow-bundle v1.102.0

- feat(rules-review): add optional `Files:` scope argument
  - Narrows the reviewed changed-file set to a caller-specified subset (intersection of the diff's changed files and the listed paths); an empty intersection folds into the existing `No changed files` early-exit, and a `Files:`-scoped review adds a reviewer-prompt note to flag suspected rule-relevant ripple to out-of-scope files. Backward-compatible — an absent/invalid `Files:` reviews all changed files as before. This is the scoping mechanism `dev-workflow` will use to avoid re-scanning the full base-commit diff on review-finding re-runs (follow-up subtask)

## 2026-07-16

### ask-peer v2.4.6 / dev-workflow-bundle v1.101.1

- fix(ask-peer): add error-handling structure & message-safety audit to code review focus (auto-triage #164)
  - Category: other; code review missed a nested try/catch that deviated from the plan and a one-time-use link leaked into a user-facing error message

### dev-workflow v1.91.1 / dev-workflow-bundle v1.101.1

- fix(dev-workflow): self-sweep pattern-class rule violations in Step 7.5 (auto-triage #161)
  - Category: missing-branch; pattern-class rule violations took multiple review round-trips to fully resolve; Step 7.5 now greps the whole file for the same violation token right after the first fix
- fix(dev-workflow): clarify Step 7.5's 2-cycle cap is count-based, not identity-based (auto-triage #161)
  - Category: ambiguity; "violations still persist" could be misread as requiring the same violations to recur across cycles
- fix(dev-workflow): re-run check_commands after Step 9 hooks write to the tree (auto-triage #161)
  - Category: missing-branch; Post-hook attribution check verifies write attribution, not content-level invariants like mirrored-file-pair sync
- fix(dev-workflow): propose layer-based commit split for cross-layer changes (auto-triage #164)
  - Category: missing-branch; commit grouping bundled a multi-layer change set into one commit with no alternative offered

### rules-review v1.5.3 / dev-workflow-bundle v1.101.1

- fix(rules-review): add no-stall reminder after reviewer Agent dispatch (auto-triage #162)
  - Category: missing-branch; sessions observed the skill ending its turn with a "dispatched, will report" stall message instead of continuing to aggregate results

### ask-codex v1.2.2

- docs(ask-codex): note in the "Resume a session" section that `exec`-level flags (`-C`, `--full-auto`) are not accepted by `codex exec resume`
  - Observed failure: composing the Common-options flags onto the resume subcommand fails with `error: unexpected argument '-C' found` (codex-cli 0.144.4). The note documents that the resumed session inherits the original session's working directory, that the sandbox can be adjusted via `-c sandbox_mode="workspace-write"`, and that `-m MODEL` remains available on resume

### dev-workflow v1.91.0 / dev-workflow-bundle v1.101.0

- feat(dev-workflow): add experimental opt-in `implementation_executor` config key + `--executor` invocation flag for delegating Step 5 implementation work units
  - **Default: `main` (current behavior)** — set `implementation_executor: <value>` in `.claude/dev-workflow.md` / `.claude/dev-workflow.local.md`, or pass `--executor <value>` on a single invocation, to opt in. The key selects who executes Step 5 implementation work units — `main` (main thread, unchanged), `subagent` (the existing settled-unit delegation path becomes the default route per unit via the `Agent` tool), or one of the external-CLI skills `ask-claude` / `ask-codex` / `ask-gemini` / `ask-copilot` / `ask-agy` (per-unit dispatch via the named `Skill()` driving the CLI in workspace-write mode)
  - The spec-completeness and not-judgment-heavy guards still decide per unit, so hybrid execution (some units delegated, some main-thread) is the expected outcome; the main thread always retains user gates, the Step 5 self-audit sub-steps (run as post-delegation verification), Step 7+ verification, and Step 10 commits
  - `ask-peer` is intentionally not a supported executor value (reviewer-persona skill returning feedback, not edits), and executor unavailability falls back to `main` for the run with a one-line note and no user gate
  - New `skills/dev-workflow/references/executor-prompt.md` (canonical dispatch payload: work-unit spec template with `--- LABEL ---` fences, executor discipline closed list, per-executor dispatch mechanics, post-return orchestrator duties) keeps the resident SKILL.md footprint small
  - Coordinated multi-site sweep: `SKILL.md` (§ Usage command lines, § Mode Detection modifier note, § Configuration scalar-key list + default YAML example + new `implementation_executor` bullet + the `Agent` tool usage bullet, Step 1 sub-step 5's config-parse enumeration, Step 5 sub-step 2's delegation paragraph), new `references/executor-prompt.md`, and `README.md` (usage block, settings-reference table row, new `#### implementation_executor` subsection, invalid-value error-table row)
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`, `README.md`, new `references/executor-prompt.md`)

## 2026-07-13

### dev-workflow v1.90.1 / dev-workflow-bundle v1.100.1

- fix(dev-workflow): make `commit_review_gate: "crit"` actually show a diff instead of only the final code
  - **Category: wrong-default**; the `commit_review_gate: "crit"` gate added in the previous version invoked crit's file/dir mode (`crit <file-1> <file-2> ...`), which crit's own runtime output says is for reviewing "a small set of documents or plans" and explicitly is not code-diff review ("To review code changes, run `crit` with no arguments"). The gate never entered crit's git-diff-aware code path, so the browser showed only the current file content on every commit — the previous version's live-tested "correct file-scoping" verification confirmed the wrong property (which files were included) without confirming the more basic one (that a diff was shown at all)
  - **Fix**: switched the invocation to crit's commit-range mode (`crit --range <base>..<head>`). Since this mode diffs exactly the named commit range and ignores the working tree outside it, but takes no file-list argument to further narrow scope, each crit round now synthesizes a **detached commit object** scoped to just the commit under review: stage its files, `git write-tree` to snapshot the index (untouched by other pending commits' files, which never entered it), `git commit-tree` to wrap that tree as a standalone object with no ref update and no hooks, launch `crit --range <pre_round_head>..<round_commit>`, then unstage (`git reset --`, index-only) once crit's process ends, regardless of the verdict. `<pre_round_head>` is `git rev-parse HEAD` resolved once per commit (not re-resolved every round, since no other commit can land while this one's review is open) — not the Step 2 `<base-commit>` fixed at workflow start, which would have re-shown already-landed earlier commits' content once more than one commit was reviewed in the same run (caught during Plan Review, not in production)
  - **Design iterated twice before shipping**: an initial fix scoped the diff by `git stash`-isolating other pending commits' files around a bare `crit --base-branch <HEAD SHA>` call; a live re-consultation (model: `fable`) with fresh empirical verification moved the plan to a real provisional commit reviewed via `crit --range` and reset away afterward — `git reset` is structurally conflict-free where `git stash pop` can conflict, and `--range` is a documented crit feature where the stash design's `--base-branch <SHA>` acceptance was undocumented. A subsequent Tidy-phase cleanup review (four parallel angles: reuse / simplification / efficiency / altitude) found the provisional-commit design was itself still a bandaid: moving `HEAD` for a throwaway review commit forced three new failure-handling paragraphs (a stranded-commit-at-HEAD detector, session-interruption `HEAD`-tracking, and a "stop Step 10 outright" reset-failure path) that only exist because a ref was mutated. Verified empirically that `git commit-tree` accepts a dangling, non-ref-reachable object as `--range`'s `<head>` and that `git write-tree` scopes to the index alone — so the final design never touches `HEAD` at all, and all three of those failure-handling paragraphs disappear along with the risk they existed to cover
  - `SKILL.md`'s `allowed-tools` gained `Bash(git reset -- *)`, `Bash(git write-tree)`, and `Bash(git commit-tree *)` (the stash-based draft's `Bash(git stash *)` was never landed, having been superseded before implementation)
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`, `references/crit-commit-review.md`)

### dev-workflow v1.90.0 / dev-workflow-bundle v1.100.0

- feat(dev-workflow): add opt-in `commit_review_gate: "crit"` for per-commit code review in Step 10 (Interactive Commits)
  - **New capability (opt-in, experimental)**: setting `commit_review_gate: "crit"` launches the external `crit` CLI (<https://github.com/tomasz-tomczyk/crit>, the same separately-installed local review tool `plan_review_gate: "crit"` already drives) scoped to each commit's own file set at Step 10's per-commit accept gate, so the diff review happens as an actual browser-based code review (inline comments, approve / request-changes) rather than only a chat-rendered diff. The default remains `diff` — the workflow's existing chat-text Subject/Body/Files/Verification/Diff presentation — so this is purely additive; no default changed
  - **Independent of `plan_review_gate`**: a new, separate config key rather than an extension of `plan_review_gate`, since the two gates' non-`crit` defaults differ in kind (Step 4's is a rich bundled browser gate; Step 10's is plain chat text) — availability and local-browser-reachability are checked and cached once per run, independently between the two gates
  - **Fallback design**: consulted a separate peer review (model: `fable`) on how best to present the diff when `crit` is unavailable — concluded (and Plan Review confirmed) that no new intermediate browser-based viewer is warranted; it would either be dominated by `crit` (worse reviewability) or by the existing chat presentation (fragmented, stale-render risk), and the existing chat gate already serves as the floor for Claude Code on the Web / remote sandboxes where no browser gate can launch. Unavailability falls back to `diff` for the whole run (one-line note); a single commit's `crit` interruption falls back to `diff` for just that commit, leaving `crit` in use for the rest of the run
  - **Verified via live testing during Plan Review, not deferred**: launched `crit <files>` through the harness's own background-Bash mechanism and queried the daemon's `/api/session` endpoint directly, confirming reliable daemonization, correct file-scoping (other uncommitted files are excluded), and native pickup of untracked new files (no `git add -N` workaround needed, simplifying the design from its original draft). Also found — via `crit`'s own source and its published Claude Code integration skill — that the `approved:` decision line is written to **stderr**, not stdout as `crit-plan-review.md` (the existing Step 4 gate) assumes; the new Step 10 procedure reads both streams defensively. `crit-plan-review.md` potentially carrying the same stdout-only assumption is flagged as an out-of-scope follow-up, not fixed here
  - New `skills/dev-workflow/references/crit-commit-review.md` (mirrors `references/crit-plan-review.md`'s structure) holds the full contract and procedure; `SKILL.md` and `references/interactive-commits.md` gained only a Configuration bullet, two No-Stall/Progress-Visibility notes, and a two-sentence branch in the Per-commit loop's Present / accept-gate sub-steps, keeping the resident SKILL.md footprint small
  - Coordinated multi-site sweep: `SKILL.md` (§ Configuration scalar-key list, default YAML example, the new `commit_review_gate` bullet, Step 1 sub-step 5's config-parse enumeration, the § No-Stall Principle Step 10 per-commit accept gate bullet, § Progress Visibility's background-boundary paragraph), `references/interactive-commits.md` (Per-commit loop sub-steps **a** and **b**), and README.md (Settings-reference table row, new `#### commit_review_gate` subsection, the Workflow Steps Step 10 row, the invalid-value error-table row)
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`, `README.md`, `references/interactive-commits.md`, new `references/crit-commit-review.md`)

## 2026-07-10

### dev-workflow v1.89.1 / dev-workflow-bundle v1.99.1

- fix(dev-workflow): warn before side-effecting external-tool launches in Step 5 (auto-triage #159)
  - Category: other; Step 5 could launch an external process with a real-world side effect (e.g. opening an actual browser window during background CLI verification) with no warning, leaving the user unable to attribute the resulting artifact to the correct launch. Step 5 gained a new sub-step requiring a pre-launch warning in the resolved `language` and a distinguishable per-launch identifier.
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`)

### dev-workflow v1.89.0 / dev-workflow-bundle v1.99.0

- feat(dev-workflow): add an experimental opt-in `--fast` invocation flag for lower-thoroughness, faster runs
  - **Default: disabled** — only active when `--fast` is passed on the invocation (`/dev-workflow --fast <task>`, combinable with `--resume`); no config-key equivalent, so existing runs are completely unaffected
  - On any non-Trivial task, `--fast` forces `N_plan=0` (Step 3 Plan Review skipped entirely) and `N_code=1` (Step 8 Code Review capped at one iteration), overriding the configured `review_iterations`. Step 6 Tidy and Step 7.5 Rules Compliance Review keep running unchanged; only Step 6.5 Polish Prose and the Step 4 plan-body prose-polish pass are skipped. Step 7.5's own internal fix → re-verify loop runs a single pass under `--fast` (the 2nd-cycle re-verification and the persistent-violations gate are skipped; the fix is trusted unverified, with Step 8's review as the remaining backstop). The `confirm_remaining_steps` proceed/skip gate at Step 11 entry now also fires whenever `--fast` is active, regardless of that setting, so rule extraction / retrospectives are a per-run choice rather than a silent skip. `subagent_model` is unaffected — it always resolves from the task's real assessed difficulty. `hooks.on_complete` is unaffected (Decision 4 — project-owned hooks stay outside any difficulty- or mode-based skip). `-i` / `--iterations`, when explicit, overrides only `--fast`'s iteration-count forcing; every other `--fast` effect (the Step 6.5-only skip, the Step 4 plan-body prose-polish skip, the Step 7.5 1-pass cap, the Step 11 `confirm_remaining_steps` gate) still applies regardless of `-i`
  - Since forcing `N_plan=0` without also zeroing `N_code` breaks the prior "N=0 only happens for Trivial, and Trivial always zeroes both" invariant, generalized every SKILL.md / `references/plan-format.md` / README.md passage that assumed that coupling (9 sites total) to recognize `--fast` as a second, independent cause of `N_plan=0` — including the plan-approval sentence `references/plan-format.md` substitutes for a skipped Plan Review, which now branches on cause so a fast-mode run is never told it was "assessed Trivial"
  - Coordinated multi-site sweep: `SKILL.md` (§ Usage, § Mode Detection, Step 1, Step 2's Adjust N by difficulty and its N_plan=0/N_code=0 coupling comment, Step 3's and Step 6.5's Difficulty exception paragraphs, Step 4's plan-body prose-polish paragraph and its rewrite-approach Trivial-reactivation paragraph, Step 7.5 sub-step 3, the `confirm_remaining_steps` gate definition and its two other firing-condition sites, § Completion's new fast-mode-skip reminder), `references/plan-format.md` (the Trivial-task conditional), and `README.md` (Usage, a new `--fast` section, the Workflow Steps table, the "How to review a plan quickly" exception note)
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`, `README.md`, `references/plan-format.md`, `references/visual-plan-review.md`, `references/crit-plan-review.md`)

### dev-workflow v1.88.3 / dev-workflow-bundle v1.98.3

- fix(dev-workflow): recognize non-shared per-platform/per-screen implementations as a distinct-verification-path decompose signal
  - Category: ambiguity; Step 1.5's primary decompose signal (distinct verification paths) did not spell out that implementing the same feature as 2+ non-shared per-platform / per-screen implementations (e.g. independent PC-screen and mobile-screen controller/view code) is itself an instance of that signal — a real run treated exactly this pattern as a single task instead of proposing a PC-first/mobile-second split. Extended the primary signal bullet's parenthetical with this case and an explicit carve-out for a single shared responsive implementation (which does not qualify, since it has one verification path)
  - Considered adding a fourth named axis (alongside workproduct-independence / dead-on-arrival / upper-design-document-input), but Step 3 plan review found this would misrepresent the established pattern: those three axes each exist specifically for cases the primary signal does *not* cover, whereas this case is a direct instance of the primary signal itself. Folded into the existing bullet instead, keeping the precedence paragraph unchanged
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`references/task-decomposition.md`)

### dev-workflow v1.88.2 / dev-workflow-bundle v1.98.2

- fix(dev-workflow): notice users when a `dev-workflow-bundle` sibling skill is unavailable, instead of leaving detection scattered across silent per-step skip messages
  - Category: wrong-default; Step 1 assumed the default reviewer `ask-peer` is "always available when dev-workflow is installed" and skipped probing it — but `ask-peer` (like `rules-review` / `extract-rules` / `tidy` / `prose-polish`) is registered as its own independent plugin in `marketplace.json` in addition to being a `dev-workflow-bundle` member, so installing `dev-workflow` alone does not guarantee any of them are present. A user could go many runs without ever connecting several small, scattered per-step skip messages into "the bundle isn't installed"
  - Step 1 now always probes the resolved reviewer regardless of which one is configured. A new cross-step `bundle_skills_unavailable` ledger (same hoist pattern as the existing `difficulty_skipped_steps`) is appended at each of the five existing skill-unavailability fallback sites — reviewer (`ask-peer` only; the other five supported reviewer values are unrelated independent plugins), `rules-review` (Step 7.5), `extract-rules` (Step 11), the Step 6 cleanup skill's `tidy` fallback, and `prose-polish` (Step 4 / Step 6.5, recorded independently per call site) — and rendered as one aggregated Completion reminder, so a partially-installed bundle is never silently missed run after run
  - Also defines the previously-undefined behavior when both `simplify` and its `tidy` fallback are unavailable in Step 6: the cleanup pass is skipped entirely with a note, folding into Step 6's existing completion path rather than leaving the case unhandled
  - Coordinated multi-site sweep: `SKILL.md` (Step 1 sub-step 3's reviewer-probe fix + ledger declaration, the Prerequisites `rules-review skill` / `extract-rules skill` / `Cleanup skill` bullets, Step 6 sub-step 2's `tidy` fallback bullet and sub-step 3's completion path, Step 4's "Plan-body prose polish" paragraph, Step 6.5 sub-step 3, and a new Completion "Bundle-skill availability reminder" paragraph) and README.md (a new Prerequisites note + two new Error/edge-case table rows)
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`, `README.md`)

### dev-workflow v1.88.1 / ask-peer v2.4.5 / rules-review v1.5.2 / tidy v1.4.2 / prose-polish v1.6.1 / dev-workflow-bundle v1.98.1

- fix(dev-workflow): re-anchor the `Model:` / `subagent_model` validity check on the `Agent` tool's live `model` schema instead of a hardcoded closed set
  - Category: missing-branch; `ask-peer` / `tidy` / `prose-polish` / `rules-review` and dev-workflow's `subagent_model` all validated the `Model:` argument against a fixed closed set (`sonnet` / `opus` / `haiku`), so newly-shipped model families such as `fable` had no branch to be accepted — the check silently fell back to the pre-fix default instead of applying the requested model. The validity predicate now points at whichever model ids the current `Agent` tool's `model` parameter actually accepts (checked live against the session's loaded tool schema — the same primary-source-verification convention `ask-peer` already documents — rather than a fixed list), so future model families no longer require a repeat of this same multi-file edit. Each skill's own fallback target is unchanged (`sonnet` for `prose-polish`; `inherit` for `tidy` / `rules-review` / `ask-peer`; dev-workflow's tiered built-in default for `subagent_model`)
  - Also fixed the identical pattern in the project-local `.claude/skills/publicity-review/SKILL.md` (not version-bumped — project-local, not registered in `marketplace.json`)
  - canonical `skills/{ask-peer,dev-workflow,rules-review,tidy,prose-polish}/` and their `dev-workflow-bundle` copies synced byte-identical (`SKILL.md`)

## 2026-07-09

### dev-workflow v1.88.0 / dev-workflow-bundle v1.98.0

- feat(dev-workflow): re-enumerate the Step 4 plan-review gate setting from a boolean into a `plan_review_gate` enum (`plan-mode` / `visual` / `crit`) and add an opt-in **`crit`** gate (<https://github.com/tomasz-tomczyk/crit>)
  - **Deprecation notice**: `visual_plan_review` (boolean) is deprecated in favor of `plan_review_gate` (string enum) — the old key keeps working via a compat mapping (`true → visual`, `false → plan-mode`; the new key wins when both are set), but projects should migrate at their convenience. Removal follows `.claude/rules/project.rules.local.md`'s Config-flag lifecycle (experimental → graduate → deprecation notice → tombstoned removal); no removal is scheduled yet
  - **New capability (opt-in, experimental)**: setting `plan_review_gate: "crit"` runs the external `crit` CLI (a separately-installed local review tool, not bundled with this skill) as Step 4's review surface instead of the bundled visual gate. crit returns the same three-value contract (`approve` / `rewrite-approach` / `fallback`) the visual gate already uses. Availability is detected via the `crit --version` exit code; when crit is unavailable, its launch fails, or the local browser is unreachable, Step 4 falls back to the bundled **`visual`** gate rather than straight to chat (`crit` → `visual` → chat), so a `crit`-selecting user still gets a browser review. The default remains `visual` — this is purely additive, no default changed. **Removal risk**: because this depends on an externally-maintained CLI tool rather than internal skill logic, removal is a real possibility if it does not prove out in practice — a different risk profile from `dev-workflow`'s own internal experimental flags (`compact_rules`, `workability_retrospective`, etc.), which have no such external-maintenance exposure
  - **Verified against crit 0.17.1** (Homebrew, 2026-07-09) via real launches, not against the initial handoff document's WebFetch-derived assumptions alone — several of which turned out stale (must use `crit plan --name <slug> <file>`, not bare `crit <file>`; exit code doesn't distinguish approve/revise; no `--timeout` flag). Full contract and rationale: `references/crit-plan-review.md`
  - New `skills/dev-workflow/references/crit-plan-review.md` (mirrors `references/visual-plan-review.md`'s structure) holds the crit gate's full procedure; `SKILL.md` gained only a Configuration bullet rewrite and a short Step 4 branch, keeping the resident footprint small
  - Coordinated multi-site sweep: SKILL.md (§ Configuration scalar-key list, default YAML example, the `plan_review_gate` bullet, the `Agent` tool usage bullet, the `subagent_model` bullet and Step 2's cross-step-variable init note, the § No-Stall Principle Step 4 gate bullet and its background-boundary restatement, Step 1 sub-step 5's config-parse enumeration, the `EnterPlanMode` reservation note, Step 2's `plan_mode_active` resolution, the Codebase-research delegation guard, Step 4 sub-step 2's path (b) branch and routing table, the Completion staging-artifact-cleanup paragraph), `references/plan-format.md` (§ Path scope), `references/task-decomposition.md` (`EnterPlanMode` reservation note), `references/visual-plan-review.md` (self-referential `plan_review_gate` conditions + a sibling cross-reference to the new crit reference), and README.md (Settings-reference table row, the `#### plan_review_gate` subsection, the Step 2 / Step 4 workflow-table rows, the invalid-value error-table row)
  - `allowed-tools` gains `Bash(crit *)`
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`, `README.md`, `references/plan-format.md`, `references/task-decomposition.md`, `references/visual-plan-review.md`, new `references/crit-plan-review.md`)

## 2026-07-08

### dev-workflow v1.87.0 / dev-workflow-bundle v1.97.0

- feat(dev-workflow): loosen Trivial/Simple difficulty-classification criteria and extend the difficulty-skip matrix to skip Step 7.5 on Simple
  - **Behavior change**: the Trivial tie-break no longer escalates a change to Simple or above merely for spanning several lines, files, or modules — it stays Trivial as long as the fix is mechanical and uniform across every site (e.g. a version bump or an unambiguous rename, even one touching manifests in several modules), escalating only when the change requires an actual judgment call. Simple no longer requires the change to be a bug fix — a small feature addition that fully follows an existing pattern with no new design decisions now qualifies, regardless of file count **within a single module** (a uniform edit spanning multiple modules still escalates to Moderate). Simple also now skips Step 7.5 (Rules Compliance Review) in addition to Step 6 Tidy and Step 6.5 Polish Prose, matching Trivial's skip set; Step 8's single code-review iteration becomes the run's primary rules-compliance defense at this tier (its reviewer prompt already flags obvious `.claude/rules/` violations as a safety net)
  - **Prompt-tuning fix**: empirical verification (`/prompt-tuning`, scoped to this diff) surfaced a genuine textual ambiguity — the new Moderate "or spans multiple modules" clause didn't state whether it also narrowed Trivial's own mechanical-uniform-edit tie-break (which already tolerated multi-site spread), so a mechanical multi-module edit like a version bump could read as either Trivial or Moderate. Fixed by making the Trivial tie-break explicitly include "modules" in its non-escalation list and by scoping the Moderate clause explicitly to the Simple↔Moderate boundary; re-verified clean (no hedging) across 2 fresh-subagent iterations
  - **Downstream automation note**: non-interactive / routine `dev-workflow` runs will now classify more tasks as Trivial or Simple than before, running fewer Step 3 / Step 8 review iterations and skipping Step 7.5 on Simple. Automated runners do not read this CHANGELOG, so review any routine config that assumes the previous, more conservative classification
  - Coordinated multi-site sweep: SKILL.md (Step 2's Adjust N by difficulty tier definitions and marking logic, Step 7's "Concurrent rules-review launch" `If available` guard, the Step 7.5 GATE line, the Step 7.5 "Difficulty exception" paragraph and "Responsibility scope" Step 8 note, Step 8 sub-step 1's reviewer-payload line, the Completion difficulty-skip reminder note) and README.md (the difficulty table, the Trivial/Simple classification paragraph, the workflow-steps table's Step 7.5 row)
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`, `README.md`)

## 2026-07-07

### dev-workflow v1.86.7 / dev-workflow-bundle v1.96.7

- fix(dev-workflow): note that a branch change from session start is normal when it points to the recorded base-commit (auto-triage #157)
  - Category: missing-branch; Step 10 had no guidance distinguishing a harness-initiated branch pre-switch from a genuine anomaly, causing wasted root-cause investigation
- fix(dev-workflow): add pre-existing vs regression discrimination for check_commands (auto-triage #155)
  - Category: wrong-default; check_commands ran against the full working tree with no way to distinguish pre-existing linter violations from regressions, wasting effort triaging unrelated existing issues

## 2026-07-06

### dev-workflow v1.86.6 / dev-workflow-bundle v1.96.6

- fix(dev-workflow): compact `references/plan-format.md` and `references/simplicity-self-audit.md`
  - Structural-only change, no behavior change. This is subtask 2 of 3 from `.claude/plans/dev-workflow-improvement-ideas.md` § 着手順 item 5 (A1 第2弾) — `plan-format.md` shrinks from 40,246 to 39,783 chars (−463, −1.2%) and `simplicity-self-audit.md` shrinks from 45,165 to 44,839 chars (−326, −0.7%)
  - `plan-format.md`: consolidated the near-duplicate "blockquote rendering convention" bullets that appeared separately under § Empty-Decisions fixed sentences and § Step 4 guidance lines into one shared definition with a cross-reference; tightened wordy prose in § Review guide line and § Localization granularity's closing rationale
  - `simplicity-self-audit.md`: trimmed a redundant trailing "General principle" restatement and two verbose trailing rationale sentences that duplicated content already stated earlier in the same checklist item
  - All runtime-referenced definitions were verified byte-identical before/after (Empty-Decisions fixed sentences, the 3 Step 4 guidance-line variants + Trivial conditional, the `## Plan` template fenced block, all bilingual paired samples, and all 33 bold-prose labels in `simplicity-self-audit.md`), and `Skill(verify-skill-refs)` reported zero unambiguous dangling references
  - The achieved reduction is smaller than the plan's own estimate (high-single-digit to low-double-digit percent): a full pass over all 33 `simplicity-self-audit.md` checklist items found that genuinely redundant or prunable prose is rare — each item is already tightly incident-driven, consistent with the plan's own Risk entry citing a prior compaction-limit precedent (`prose-polish`'s compression-boundary retrospective)
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`references/plan-format.md`, `references/simplicity-self-audit.md`)

### dev-workflow v1.86.5 / dev-workflow-bundle v1.96.5

- fix(dev-workflow): remove duplicated config-default prose from Step 1 and consolidate the duplicated "Prose-integrity self-check (post-fix)" bullet
  - Structural-only change, no behavior change. Step 1 sub-step 5's restatement of `interactive_commits` / `compact_rules` / `visual_plan_review` / `polish_prose` / `confirm_remaining_steps` / `subagent_model`'s default values and warn-and-fall-back-on-invalid-value behavior is replaced with a pointer to each key's own § Configuration bullet, which remains the single canonical source
  - Step 3 sub-step 3's "Prose-integrity self-check (post-fix)" bullet (near-duplicate of Step 8 sub-step 3's bullet of the same name) is replaced with a short cross-reference to Step 8's paragraph, applied to plan prose instead of code / doc prose; Step 8's bullet is unchanged and remains canonical
  - This is subtask 1 of 3 from `.claude/plans/dev-workflow-improvement-ideas.md` § 着手順 item 5 (A1 第2弾) — the SKILL.md itself shrinks from 244,592 to 243,685 chars (−907 chars); an initially-planned extraction of Step 8's post-fix self-check bullets into a new `references/post-fix-self-checks.md` was dropped from scope after Step 3 plan review found it would not meaningfully reduce total per-run read chars (the extraction target fires too frequently on Moderate/Complex tasks to be genuinely "cold")
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`)

## 2026-07-03

### dev-workflow v1.86.4 / dev-workflow-bundle v1.96.4

- fix(dev-workflow): add a Step 2 self-audit check for scope expansion against a task-input-declared project priority
  - Category: missing-branch; the plan author had no checklist item prompting a check of whether scope added beyond the literal task request conflicts with an active resource-constraint initiative (a size / growth budget, a deprecation timeline) that the task's own input material (a roadmap catalog, a rules file, a handoff doc) already documents — a real instance shipped an unrequested SKILL.md addition during an active char-budget-reduction effort documented in the same catalog the task was drawn from, and neither the author's self-audit nor the Step 3 reviewer (which reads this same checklist under category (a) Scope & feasibility) flagged the tension before landing
  - `references/simplicity-self-audit.md` gains a new "Task-input-declared priority conflict check" item; no `SKILL.md` change needed since Step 3's category (a) already delegates to this checklist
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`references/simplicity-self-audit.md`)

### dev-workflow v1.86.3 / dev-workflow-bundle v1.96.3

- fix(dev-workflow): grant `Bash(git ls-files *)` and `Bash(grep -q *)` for a new project-level `check_commands` stray-output guard
  - Category: missing-branch; a new project `check_commands` entry shells out to `git ls-files` piped into `grep -q` (e.g. to detect stray `*.stdout` / `*.stderr` files left in the distributed skill tree) — without matching `allowed-tools` grants for both commands, the entry would stall every `/dev-workflow` run on a permission dialog. `allowed-tools` now includes `Bash(git ls-files *)` and `Bash(grep -q *)` alongside the other already-granted `git` subcommands

## 2026-07-02

### dev-workflow v1.86.2 / dev-workflow-bundle v1.96.2

- fix(dev-workflow): add explicit no-prose handling for no-new-signal harness restarts (auto-triage #151)
  - Category: other; `§ No-Stall Principle`'s "No standalone waiting turns at async dispatch boundaries" paragraph did not address scheduled keep-alive restarts that fire before a background dispatch's completion notification arrives — the paragraph now requires reissuing the same wait/monitor tool call while omitting any acknowledgment or status prose when no new information has arrived
- fix(dev-workflow): add retry-then-fallback handling for stalled `test_commands` nested dispatch (auto-triage #151, #150)
  - Category: other; `test_commands` invocations whose own internal subagent dispatch stalls without returning any structured summary had no explicit retry/fallback procedure — Step 7 sub-step 2 now retries once and falls back to direct main-thread execution
- fix(dev-workflow): require live existence check for newly introduced cross-file references (auto-triage #154)
  - Category: missing-branch; Step 5 sub-step 4's "Late-stage scaffolding self-audit" item (iv) now requires a live `Grep`/`Read` confirmation that a newly introduced or changed cross-file reference's target label actually exists before landing, instead of relying on a secondary description that may be stale

### rules-review v1.5.1 / dev-workflow-bundle v1.96.2

- fix(rules-review): pin citation matching strictness for reference/label compliance checks (auto-triage #154)
  - Category: ambiguity; the embedded reviewer prompt now judges a reference/citation's compliance against whichever form the citing rule's own text or an established sibling convention documents as canonical, instead of drifting between a permissive prefix/pair-form reading and a stricter verbatim-only reading across review cycles for the same diff text

### dev-workflow v1.86.1 / dev-workflow-bundle v1.96.1

- fix(dev-workflow): consolidate the duplicated `subagent_model` read-site enumeration into one canonical bullet
  - Structural-only change, no behavior change. Step 2 sub-step 1's near-verbatim restatement of the `subagent_model` read-site list (Step 7's background launches, the shared session scan, the conditional Step 5 delegation, Step 7.5 `rules-review`, Step 6's `tidy` fallback, the Step 3 / Step 8 inline reviewer) is replaced with a cross-reference to the Configuration `subagent_model` bullet, which remains the single canonical list
  - The `self_retrospective` "`Agent` tool usage" bullet is unrelated content — it documents which sites spawn the `Agent` tool directly, not `subagent_model`'s read sites — and is left untouched; it is cross-referenced from 4 other locations, including `references/simplicity-self-audit.md`'s invariant-audit example
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`)

### dev-workflow v1.86.0 / dev-workflow-bundle v1.96.0

- feat(dev-workflow)!: remove the `task_decomposition` config key — Step 1.5 (task decomposition check) now always runs unconditionally in Normal sub-mode
  - **Breaking change, deliberate deviation from the standard flag-removal lifecycle**: `.claude/plans/dev-workflow-improvement-ideas.md` item B6 / G4 normally prescribes a staged removal (stage 2.5 deprecation notice → wait period → stage 3 removal) for exactly this kind of behavior-changing key deletion. This run instead removes the key immediately, per an explicit user decision made before planning began (recorded as Decision 1 in the run's plan) — B6's per-key table already recorded `task_decomposition` as headed for eventual deletion via the G4 pipeline, so only the staging (not the end state) was skipped
  - **Behavior change**: projects that set `task_decomposition: false` to treat every `/dev-workflow <task>` request as a single task (skipping the Step 1.5 decomposition proposal) will now see Step 1.5 run unconditionally in Normal sub-mode, with no deprecation-notice period. `--resume <state-file>` is unaffected — it never depended on this key
  - **Downstream automation note**: non-interactive / routine dev-workflow runs that previously relied on `task_decomposition: false` to avoid the decomposition proposal dialogue will now be presented with it (a `yes / adjust / no` chat dialogue) whenever the lightweight decomposition assessment recommends splitting the task; Automated runners do not read this CHANGELOG, so review any routine config that sets this key
  - Coordinated multi-site sweep: SKILL.md (Configuration Scalar-key list, YAML example, the `task_decomposition` Configuration bullet, Step 1 sub-step 5 parse, Step 1 sub-step 7 task-registration condition, Step 1.5 dispatch section), `references/task-decomposition.md` (the flag-conditional intro and § B prerequisite paragraph), `references/init-mode.md` (the preserved-unmanaged-keys example list), and README.md (config table row, `#### task_decomposition` subsection, YAML examples, the "Disabling the auto check" callout, the Step 1.5 workflow-table row, the non-boolean error-table row)
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`, `README.md`, `references/task-decomposition.md`, `references/init-mode.md`)

### dev-workflow v1.85.0 / dev-workflow-bundle v1.95.0

- feat(dev-workflow): flip the `visual_plan_review` default from `false` (opt-in) to `true`, graduating the browser-based plan-review gate to default-on
  - **Default: enabled** — set `visual_plan_review: false` in `.claude/dev-workflow.md` or `.claude/dev-workflow.local.md` to opt out
  - **Behavior change**: projects that leave `visual_plan_review` unset now skip Plan Mode at Step 2 and present the plan through the browser-based structured review gate at Step 4 by default (falling back to a no-Plan-Mode chat approval when the local browser is unreachable, e.g. Claude Code on the Web). As under v1.72.0's original opt-in introduction, the planning-phase "no code changes" rule is now enforced by agent discipline rather than Plan Mode's read-only lock for every project that leaves the flag unset. This applies uniformly regardless of environment; Claude Code on the Web still falls back to the chat-approval surface, since no browser is reachable there. The wiring (introduced v1.70.0 as experimental opt-in, made Step 2 skip Plan Mode in v1.72.0, marked stable in v1.81.0) is no longer opt-in. Non-boolean values now fall back to `true` (was `false`)
  - **Downstream automation note**: non-interactive / routine dev-workflow runs (e.g. Claude Code on the Web) that do not set `visual_plan_review` will now skip Plan Mode by default; the review surface itself always falls back to chat there since no browser is reachable, so the practical difference is limited to that Plan Mode lock. Automated runners do not read this CHANGELOG, so set `visual_plan_review: false` in project config wherever the Plan Mode lock is wanted
  - Coordinated multi-site sweep: SKILL.md (Configuration YAML example, the `visual_plan_review` Configuration bullet, Step 1 settings-parse, Step 2 sub-step 2's `plan_mode_active` resolution, Step 4 sub-step 2 paths (a) and (b), the Completion "Derived staging artifact cleanup" paragraph), `references/visual-plan-review.md` (the default-path residue in the Decision mapping step), and README.md (config table row, the `#### visual_plan_review` subsection, the Step 2 / Step 4 workflow-table rows, the non-boolean error-table row). The sibling experimental flags (`compact_rules` / `confirm_remaining_steps` / `workability_retrospective`) keep their opt-in defaults
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`, `README.md`, `references/visual-plan-review.md`)

## 2026-07-01

### dev-workflow v1.84.0 / dev-workflow-bundle v1.94.0

- feat(dev-workflow): flip the `polish_prose` default from `false` (opt-in) to `true`, graduating the prose-polish wiring to default-on
  - **Default: enabled** — set `polish_prose: false` in `.claude/dev-workflow.md` or `.claude/dev-workflow.local.md` to opt out. The two `prose-polish` passes (Step 4 plan-body polish + Step 6.5 Polish Prose) now run by default; Step 6.5 is still gated by the difficulty-skip matrix (Moderate / Complex only)
  - **Behavior change**: projects that leave `polish_prose` unset now run both prose-polish passes by default — previously (v1.78.0–v1.83.x) both were skipped unless `polish_prose: true` was set explicitly. The wiring (added v1.77.0, gated behind the flag in v1.78.0) is no longer marked experimental. Non-boolean values now fall back to `true` (was `false`)
  - **Downstream automation note**: non-interactive / routine dev-workflow runs (e.g. Claude Code on the Web) that do not set `polish_prose` will now invoke `prose-polish` (a `sonnet` subagent dispatch) on Moderate / Complex tasks by default. Automated runners do not read this CHANGELOG, so set `polish_prose: false` in project config wherever that cost is unwanted
  - Coordinated multi-site sweep: SKILL.md (Prerequisites prose-polish bullet, Configuration YAML example, the `polish_prose` Configuration bullet, Step 1 settings-parse, the shared Step 4 / Step 6.5 skip-condition parenthetical, the Step 6.5 skip-note ja/en strings) and README.md (config table row, the `#### polish_prose` subsection, the Prerequisites bullet, the non-boolean error-table row). The sibling experimental flags (`compact_rules` / `visual_plan_review` / `confirm_remaining_steps` / `workability_retrospective`) keep their opt-in defaults
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`, `README.md`)

## 2026-06-30

### dev-workflow v1.83.1 / dev-workflow-bundle v1.93.1

- fix(dev-workflow): add Phrase-duplication sweep self-check to Step 8 (auto-triage #147)
  - Category: missing-branch; Step 8 reviewer fixes (Code Review)
- fix(dev-workflow): forbid standalone waiting turns at async dispatch boundaries (auto-triage #149)
  - Category: wrong-default; No-Stall Principle

### prose-polish v1.6.0 / dev-workflow-bundle v1.93.0

- feat(prose-polish): detect definition-restatement comments and shorten kept *why* comments more aggressively
  - **Behavior change**: prose-polish now auto-deletes a comment that merely restates the definition of the construct it annotates — even when it names a specific subject (e.g. a `.gitignore` entry commented "excludes `<file>`", a type annotation repeating the declared type) — and compresses a kept *why* comment to its essential reason in one sentence, trimming mechanism / causal-chain detail a competent reader can infer. Comments that previously survived may now be deleted or shortened. Deletions stay on the existing auto-applied `edits` path, so the return contract / verdict schema is unchanged
  - Implemented entirely in `references/prose-style-guide.md`: General rule 2 gains the definition-restatement sub-case plus a "state the *why* concisely" clause, and the Japanese section's Restatement removal item gains a multi-line-*why* compression example. `SKILL.md` is unchanged — its refactor prompt already deletes fully-redundant comments via `edits` and delegates "what counts as redundant" to the style guide's "say what the code does not" rule, so widening that rule is picked up with no prompt edit
  - canonical `skills/prose-polish/` and the `dev-workflow-bundle` copy synced byte-identical (`references/prose-style-guide.md`)

### dev-workflow v1.83.0 / dev-workflow-bundle v1.92.0

- feat(dev-workflow): consolidate the Step 11.5 self-retrospective issue-submission approval into a single gate
  - Previously, repo-mode submission used a two-stage approval: the `approve` response to the body preview, then a separate explicit confirmation that `<owner/repo>` was the intended target before the `gh api` POST ran. The second confirmation is removed — a single `approve` now covers **both** the body and the resolved destination
  - The destination-disclosure security property is preserved: the destination header (mode / resolved value / settings-layer source) still defends against a settings-layer hijack, and the single approval prompt names the resolved destination (`<owner/repo>` in repo mode, the absolute path in path mode) so the response stays an explicit destination acknowledgment rather than an autopilot wave-through
  - Edits: `references/self-retrospective.md` §4 "User preview and approval loop" `approve` bullet, and the `README.md` self-retrospective approval description
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`references/self-retrospective.md`, `README.md`)

### dev-workflow v1.82.0 / dev-workflow-bundle v1.91.0

- feat(dev-workflow): add a `confirm_remaining_steps` gate to skip the post-commit rule / retrospective steps
  - **Default: disabled** — set `confirm_remaining_steps: true` in `.claude/dev-workflow.md` or `.claude/dev-workflow.local.md` to opt in per project. New experimental opt-in config flag (boolean, default `false`); non-boolean values warn and fall back to `false`. When `false` (the default) the workflow is unchanged — Step 11 / 11.5 / 11.6 run unconditionally as before
  - When `true`, a USER APPROVAL GATE fires at the **entry to Step 11 (Update Rules)** — i.e. after the commit phase (after Step 10, or after Step 9 when `interactive_commits: false`) — asking whether to run the remaining rule-maintenance and retrospective steps (Step 11 Update Rules / Step 11.5 Self-Retrospective / Step 11.6 Workability Retrospective, whichever are registered) or skip them and go straight to Completion. Lets a user skip the post-deliverable steps that are unrelated to a given task. The gate is folded into Step 11's entry (not a standalone step), so the `interactive_commits: false` routing and the "Step 9 → Step 11" transition prose are unchanged
  - On **skip** the gate marks Step 11 / 11.5 / 11.6 (whichever are registered) `completed` without running them — an intended skip the Phase-boundary self-audit treats like the difficulty-skip matrix's pre-completed rows — establishes Step 11's cross-step variables (`compaction_applied_count` / `below_threshold_failed_files`) at their init values so § Completion's reads stay well-defined, leaves `landed_count` to Step 10's lifecycle, never dispatches the shared session scan, and emits a one-line skip note at the gate so the skip is never silent. It emits no § User-gate summary preamble (a binary proceed / skip prompt with no structured content)
  - Coordinated multi-site sweep: example YAML block, Scalar-key list, Configuration bullet, Step 1 settings-parse + context-compaction-recovery list, § No-Stall Principle gate enumeration, the Step 11 entry gate definition, and `references/plan-format.md` § User-gate summary preamble's "do not emit" list
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical (`SKILL.md`, `references/plan-format.md`)

## 2026-06-29

### dev-workflow v1.81.1 / dev-workflow-bundle v1.90.1

- fix(dev-workflow): add coordinated prose-invariant multi-surface sweep to Step 5 item 5 (auto-triage #144)
  - Category: ambiguity; Step 5 item 5's coordinated-multi-site sweep guidance applied to literal token replacements but lacked a complementary rule for design-rule / behavioral-invariant changes that propagate across multiple documentation surfaces as prose rather than as a single swappable literal. Added sub-clause (iv) "Coordinated prose-invariant multi-surface sweep": enumerate all known surfaces where the invariant appears (SKILL.md sub-step paragraphs, `references/*.md` table rows, `references/*.md` prose body, README examples) as a closed list before starting edits; after all edits land, grep for the old description's key phrases and synonyms across the enumerated surfaces; for each hit, apply the same two-option disposition as the full-repo grep pass
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical
- fix(visual-plan-review): add "zero applied changes" first-match branch to revise handler (auto-triage #145)
  - Category: missing-branch; the `decision: "revise"` handler in `visual-plan-review.md` branched on "Approach-level material change" vs "Localized edits" but had no branch for the case where `comments` was empty (revise submit with no comments). In that case zero edits would land, neither "Approach-level" nor "Localized" is meaningful, yet the handler would fall through to one of those branches anyway. Added a "Zero applied changes (revise with no comments)" branch as first-match: cp served file to `.plan-review.prev.md` then re-launch the gate (loop back to step 4)

### prose-polish v1.5.0 / extract-rules v1.22.0 / rules-review v1.5.0 / dev-workflow-bundle v1.90.0

- feat(bundle): set a static default `effort` frontmatter on the difficulty-independent bundle skills
  - Claude Code SKILL.md frontmatter supports an `effort` field (`low`/`medium`/`high`/`xhigh`/`max`) that overrides the session effort level while the skill is active (per the official skills / sub-agents docs). Added a static default to the bundle skills whose appropriate effort does not vary with the parent task's difficulty: **prose-polish → `low`**, **extract-rules → `high`**, **rules-review → `medium`**. Each level is chosen by where the skill's real work runs
  - **prose-polish → `low`**: dev-workflow deliberately runs prose-polish on `sonnet` and refuses to propagate `subagent_model` to it (smaller-is-better for concise prose), so `low` matches that design thesis; its main thread is mechanical (parse + apply) and the prose work is in the sonnet subagent, so `low` fits whether or not frontmatter effort propagates to that subagent
  - **extract-rules → `high`**: its primary dev-workflow modes — `--apply-conversation-candidates` (runs Step C5 in the main agent, no subagent) and `--update` (main-thread category analysis) — do the real extraction on the main thread, so frontmatter effort reliably governs extraction quality (the one propagation-immune case); it already pins `model: opus` and the extracted rules persist across sessions, so quality is prioritized over the per-completion cost
  - **rules-review → `medium`**: a bounded compliance check against a fixed rule set, treated as difficulty-independent by dev-workflow (it runs even on Simple tasks). `xhigh` is intentionally not used because rules-review runs on the unpinned session model, where `xhigh` availability is model-dependent
  - **Excluded**: `tidy` (cleanup depth scales with code complexity — borderline difficulty-dependent; left to inherit the session effort), `ask-peer` (review depth is actively difficulty-coupled — dev-workflow already varies its model and iteration count by difficulty), and `dev-workflow` itself (the orchestrator; a frontmatter effort there would override the whole session effort)
  - Only `low`/`medium`/`high` are used (`xhigh`/`max` avoided for portability — available levels are model-dependent). **Subagent-effort propagation is undocumented and path-dependent**: frontmatter effort reliably governs the real work only on the main-thread modes above and on the inline-fallback path (nested `Agent` unavailable, e.g. dev-workflow's Step 7 background launch); on the foreground nested-dispatch path it is observational. `dev-workflow`'s "per-subagent effort is out of scope" note (dynamic per-dispatch effort via the `Agent` tool) is unaffected — this is a separate static-frontmatter mechanism
  - canonical `skills/<name>/` and the `dev-workflow-bundle` copies synced byte-identical (prose-polish / extract-rules / rules-review)

### dev-workflow v1.81.0 / dev-workflow-bundle v1.89.0

- feat(dev-workflow): add a Step 2 codebase-research delegation on the `visual_plan_review: true` path
  - On the no-Plan-Mode visual path, Step 2 MAY now delegate read-only codebase research to a subagent (default `Explore`), reproducing the research-context isolation that Plan Mode's built-in read-only `Plan` subagent provides on the `visual_plan_review: false` path — so research no longer accumulates in the main context. Plan authoring stays in the main thread (plan-format template, Simplicity self-audit, Decisions criterion, task-relevant skill annotation). It is permissive guidance (a `MAY`, gated on `plan_mode_active == false` plus a non-trivial-research judgment); when `Agent` is unavailable it falls back to inline main-thread research
  - Extended the "three fixed `Agent` dispatch sites plus a conditional Step 5 delegation" invariant to "conditional Step 2 and Step 5 delegations" across every site (§Configuration's Agent-usage bullet and `subagent_model` bullet, Step 2 sub-step 1, and `references/simplicity-self-audit.md`). The Step 2 research delegation is **excluded** from `subagent_model` governance: it dispatches before Step 2's Adjust N resolves the tier, so it always runs on the session model. `references/visual-plan-review.md` now notes the visual path actively restores research isolation via this delegation
  - Softened the `visual_plan_review` "experimental" marker in §Configuration (the feature is stable; default stays `false`)
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical

## 2026-06-26

### dev-workflow v1.80.0 / dev-workflow-bundle v1.88.0

- fix(dev-workflow): add scope-awareness filter to Step 6.5 sub-step 1 (auto-triage #143)
  - Category: missing-branch; Step 6.5 sub-step 1 lacked a scope filter and could queue large, mostly-unchanged files for prose-polish when only a few lines were touched. Added a **Scope-awareness filter** that excludes any file where changed lines ÷ total lines < 10% AND total lines > 100 — operationalized with `git diff <base-commit> --stat` for changed-line count and `wc -l` for total lines
  - canonical `skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical
- fix(dev-workflow): add default-branch guard to interactive-commits Procedure 3 (auto-triage #142)
  - Category: missing-branch; Procedure 3 committed directly to whatever branch was active — including the repository's default branch — with no guard. Added a **Default-branch guard** that detects the default branch via `git remote show origin | grep 'HEAD branch' | awk '{print $NF}'`, compares it against the current branch, and creates a new feature branch (`git switch -c <slug>`) before the commit-plan presentation when they match; detached HEAD and missing origin are treated as skip-guard and proceed. Rationale: in PR-based workflows, committing directly on the default branch requires post-commit branch surgery to recover a clean base
  - canonical `skills/dev-workflow/references/interactive-commits.md` and the `dev-workflow-bundle` copy synced byte-identical

### dev-workflow v1.79.1 / ask-peer v2.4.4 / extract-rules v1.21.2 / rules-review v1.4.4 / tidy v1.4.1 / prose-polish v1.4.1 / dev-workflow-bundle v1.87.1

- chore(plugins): revert the #57570 nested-layout workaround and restore the flat direct-skill layout
  - [anthropics/claude-code#57570](https://github.com/anthropics/claude-code/issues/57570) — the v2.1.136 regression that rejected a marketplace entry's `"skills": ["./"]` with `Path escapes plugin directory` — is now CLOSED/COMPLETED. Verified the fix on the installed CLI 2.1.183 with a scratch-marketplace probe: a one-plugin marketplace using the flat `source: "./skills/probe"` + `skills: ["./"]` layout installed via `plugin install ... --scope local` with **no** `Path escapes plugin directory` error, so the prior nested-layout workaround (introduced for #57570) is no longer needed
  - Flattened all 14 direct-skill plugins from the workaround's nested `skills/<name>/skills/<name>/` back to `skills/<name>/` (via `git mv` — byte-identical content), restored `skills: ["./"]` to the 14 direct-skill entries in `marketplace.json`, and repointed the 14 `.claude/skills/<name>` dev/test symlinks to `../../skills/<name>`
  - Followed the bundle-copy **source** path from `skills/<name>/skills/<name>/` to `skills/<name>/` across `verify-bundle-sync`, `dev-workflow-triage` (+ `references/triage-criteria.md`), `triage-review`, `skill-review`, `.claude/rules/project.rules.md`, `.claude/rules/project.rules.local.md`, and `.claude/rules-extras/project.rules.examples.md`; flipped the sibling-symmetry rule from "`skills: ["./"]` omission" to "presence"; and removed the now-obsolete `project.staging.local.md` candidate that flagged the run-tests-flat-vs-nested drift this revert resolves
  - The bump is **layout-only — no bundle-skill behavior changed**. Versions move because `git mv` renders as a changed bundle `SKILL.md` to rules-review's path-scoped diff (`git diff <base> -- <file>` breaks rename pairing → new-file add), which trips the diff-level version-bump rule; a patch bump is the honest "internal restructure" signal. The #53948 bundle-copy real-directory mechanism (`verify-bundle-sync`) is **unchanged** — only the path it copies from flattened
  - canonical `skills/<name>/` and the `dev-workflow-bundle` copies synced byte-identical (0 drift across all 6 members)

### prose-polish v1.4.0 / dev-workflow-bundle v1.87.0

- feat(prose-polish): detect cross-file duplicate comments in file mode and surface them as advisory `recommendations` instead of polishing each copy
  - When file mode receives multiple files, the refactor subagent now flags non-obvious knowledge (a *why* / rationale / workaround / constraint note) that recurs as a comment across two or more of the target files: rather than polishing each copy in place, it emits a single `recommendations` entry (`{summary, files, suggestion}`) advising consolidation into one canonical location and removal of the inline copies. Deletion is **not** automated — the finding is advisory only, since the *why* would be lost if the consolidation destination is not guaranteed
  - New return-contract field `recommendations` is additive and backward-compatible: the `status` enum is unchanged and stays orthogonal to `recommendations` (a `no-change` verdict may carry a non-empty `recommendations`, so callers read it independently of `status`), an absent field parses leniently as `[]`, and it is `[]` in text mode, on single-file or no-duplicate file-mode input, and on any error. Existing `edits`-based callers that do not read the field are unaffected
  - The detection criteria (non-obvious-knowledge only, ≥ 2 distinct files, normalized near-match, exclusion list, conservative judgment) live in a single new `## Cross-file duplicate comments` section of `references/prose-style-guide.md`; the SKILL.md file-mode dispatch references that section by name and owns only the output action plus the `recommendations` schema and parse-time shape validation (`files` must be ≥ 2 distinct non-empty strings; advisory, never scope-checked against `target_files`). A `## Invocation contract` note records that detection requires related files passed together in one invocation. The optional consolidation-target deletion extension is deferred as an additive follow-up
  - canonical `skills/prose-polish/skills/prose-polish/` and the `dev-workflow-bundle` copy synced byte-identical

### prose-polish v1.3.0 / dev-workflow-bundle v1.86.0

- feat(prose-polish): make the refactor subagent translate ordinary technical vocabulary instead of leaving it as code-mixing
  - Category: ambiguity; the style guide had said "translate ordinary technical vocabulary" since 2026-06-23, but `SKILL.md` told the refactor subagent to preserve "English technical terms" wholesale at four sites (frontmatter `description`, the File-mode bullet, and both the file-mode and text-mode refactor prompts). The injected prompt is the dominant instruction, so the subagent resolved the contradiction toward preservation and left code-mixed Japanese (e.g. 「dispatch する」「stale だった」) intact — the dogfooding signal observed during a prior run. Narrowed all four sites to "preserve only proper-noun product / API / library / tool names and code symbols" and added an explicit clause that an ordinary source-language word inside target-language prose is translatable prose, not a preserved token
  - Added a canonical `### Preserve-vs-translate litmus test` to the style guide's Preserve section (preserve-test → translate-test → translate-default, first match wins; recognized proper nouns like `git` / `Promise` / `API` outrank the translate-default regardless of backticking), folding in the prior Preserve-bullet prose; General rule 6 and Japanese rule 4 now cross-reference the litmus test rather than each restating the boundary (token-defined-once)
  - Sharpened the litmus test's translate side after a prompt-tuning round surfaced two under-specified edges: (i) example glosses (`dispatch`→「呼び出す」, …) now state they are illustrative of the translate-vs-code-mix contrast, not a fixed dictionary — a polysemous source word picks the contextually natural target (`dispatch`→「振り分ける」 when distributing work); (ii) the test now scopes itself to source-script tokens and exempts established target-script loanwords (`ja` katakana such as `キャッシュ` / `レスポンス`) as already-native prose
  - canonical `skills/prose-polish/skills/prose-polish/` and the `dev-workflow-bundle` copy synced byte-identical

### dev-workflow v1.79.0 / dev-workflow-bundle v1.85.0

- feat(dev-workflow): add Step 5 guidance for delegating a settled, task-effective work unit to a subagent (issue #138)
  - Category: ambiguity; Step 5 was silent on when/how to delegate a unit of implementation work to a subagent, and the §Configuration `Agent` tool usage invariant ("exactly three dispatch sites ... must not invoke `Agent` directly") implicitly prohibited it. Added a guard-forward delegation paragraph to Step 5 sub-step 2 — default is main-thread implementation; delegation is the opt-in exception, allowed only when the unit is spec-complete (a context-less executor can be handed a complete spec), an effective subagent exists for it, and the unit is not judgment-heavy or small. The subagent type is selected by capability first (exclude read-only `Explore` / `Plan`-class agents) then task-fit, falling back to `general-purpose`; the delegation propagates `subagent_model` like the fixed sites. The clearest case is a settled bulk-mechanical subtask (e.g. one pattern across dozens of files, a bulk test-suite migration)
  - Reconciled the load-bearing `Agent`-dispatch invariant across all 5 sites in one sweep: `SKILL.md` §Configuration `subagent_model` bullet, the `Agent` tool usage bullet ("exactly three dispatch sites" → "three fixed infrastructure dispatch sites ... plus a conditional Step 5 delegation", with the two negative count-references and the "must not invoke `Agent` directly" carve-out adjusted), the Step 2 sub-step 1 Read-sites list, `references/simplicity-self-audit.md`'s Target-file constraint example, and `references/visual-plan-review.md`'s live cross-reference
  - canonical `skills/dev-workflow/skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical

## 2026-06-25

### dev-workflow v1.78.2 / dev-workflow-bundle v1.84.1

- fix(dev-workflow): add anti-skip guard for prose-polish dispatch when `polish_prose: true` (auto-triage #140)
  - Category: missing-branch; when `polish_prose: true` and sub-step 1.5's Prose-language self-audit returned clean, an implicit skip path allowed the prose-polish dispatch to be omitted. Added `**Anti-skip guard**` to foreclose that path, clarifying that the self-audit corrects language-translation errors while prose-polish refines naturalness and fluency — the two roles are distinct so the dispatch is required even when the self-audit passes
  - canonical `skills/dev-workflow/skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical

### tidy v1.4.0 / dev-workflow-bundle v1.84.0

- feat(tidy): open behavior-preserving structural improvements to `mechanical_edit` so tidy's apply rate approaches the built-in `simplify`
  - Category: missing-branch; tidy's reviewer recalled structural improvements (existing-helper reuse, pure imperative-to-declarative loop rewrites, behavior-preserving special-case generalizations) but over-downgraded them to `structural_note`, where `simplify` applies them — an empirical bench comparison showed near-parity recall but an apply-rate gap. A new `§ Behavior-preserving structural improvements` positive gate in `cleanup-checklist.md` enumerates the eligible improvements as a closed list, reached only **after** the negative gate (`§ Preserve functionality` + `§ Balance rails`); a loop rewrite stays a `mechanical_edit` only when the body has no early-exit / `throw` / external side effect (the over-simplification guard). The `default to structural_note` wording was tightened to "behavior-preservation-clear → mechanical, genuine-risk → note" across all four sites (`cleanup-checklist.md` ×2 + `SKILL.md` reviewer prompt ×2); a new item 10 (Altitude) flags shallow special-casing layered on shared infrastructure, with overlap-handling rows separating it from item 1 (helper reuse) and item 3 (which removes an unused abstraction — the opposite direction)
  - the positive gate guards multi-site fixes: a single generalization spanning non-adjacent sites is emitted as multiple `mechanical_edits` sharing one rationale (still one finding), but because the apply loop is non-atomic (it skips edits whose `old_string` no longer matches), such a fix is mechanical only when every proper subset of its edits preserves behavior on its own — otherwise it downgrades to a single `structural_note`, preventing a partially-applied generalization from silently violating `§ Preserve functionality`
  - canonical `skills/tidy/skills/tidy/` and the `dev-workflow-bundle` copy synced byte-identical

### rules-review v1.4.3 / dev-workflow-bundle v1.83.2

- fix(rules-review): close the coverage-gap status/reason mapping gap when a clean reviewer group coexists with dropped pointer rules (triage-review follow-up to auto-triage #134)
  - Category: missing-branch; the `coverage gap only` machinery added in #134 left the verdict undefined when some reviewer groups ran clean (contributing no list entry) while the only consolidated entries were `(rule not evaluated — ...)` coverage gaps — the `error` bullet required "every group failed" and `coverage gap only` required "no group ran", so the § 6 all-clean branch could silently swallow the gap as `no-issues`. The status mapping is now keyed on "consolidated list non-empty with no real finding" → `error`; a synthetic entry blocks the all-clean branch (§ 6 prose is the rendering authority the Return contract mirrors against the same list); and a reason-selection order routes ≥ 1 `(review failed)` → `verdict parse failure`, else → `coverage gap only`. The semantics of both `verdict parse failure` (now "≥ 1 `(review failed)` + no real finding", was "every group failed") and `coverage gap only` (now "all synthetic entries are coverage gaps, clean sibling groups allowed", was "no group ran") are widened accordingly; the closed-enum token strings are unchanged, so downstream verbatim-preserve consumers (dev-workflow-triage / triage-review) are unaffected
  - canonical `skills/rules-review/skills/rules-review/` and the `dev-workflow-bundle` copy synced byte-identical

### dev-workflow v1.78.1 / dev-workflow-bundle v1.83.1

- fix(dev-workflow): surface review-class hook write divergence at the Step 9 boundary (auto-triage #133)
  - Category: missing-branch; Step 9 now reconciles each review-class entry's reported `applied_edits_count` against the actual working-tree change it produced and records a non-fatal `review-class write divergence` warning at the hook boundary, so a findings-only reviewer that silently self-applies an edit is surfaced before the Step 10 commit gate (Step 10's Post-hook attribution check still owns resolution)
  - canonical `skills/dev-workflow/skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical

### rules-review v1.4.2 / dev-workflow-bundle v1.83.1

- fix(rules-review): resolve out-of-tree pointer rules before review; surface unresolvable pointers as coverage gaps (auto-triage #134)
  - Category: missing-branch; a rule file that defers its body to an out-of-tree `@`-reference was embedded as an empty stub, so the reviewer judged against empty rules and returned clean. Data prep now resolves the reference and embeds the actual rule text, or — when the reference is unresolvable — drops the rule and records an explicit `(rule not evaluated — unresolved pointer to <ref>)` coverage-gap synthetic entry instead of a silent pass (a `coverage gap only` reason token was added to the Return contract enum)
  - canonical `skills/rules-review/skills/rules-review/` and the `dev-workflow-bundle` copy synced byte-identical

## 2026-06-24

### dev-workflow v1.78.0 / dev-workflow-bundle v1.83.0

- feat(dev-workflow): add a `polish_prose` config key (default `false`) gating the two `prose-polish` passes wired in v1.77.0 — Step 6.5 (Polish Prose) and the Step 4 plan-body polish. **Default: disabled** — set `polish_prose: true` in `.claude/dev-workflow.md` (or `.claude/dev-workflow.local.md`) to opt in per project. **Behavior change from v1.77.0**: v1.77.0 ran both passes unconditionally (no config flag); from v1.78.0 they are gated behind `polish_prose: true`. Consuming projects pick up the new default at the next session (the skill loads at session boot, which does not surface this CHANGELOG), so a project that adopted the v1.77.0 prose-polish behavior must explicitly set `polish_prose: true` to retain it
  - Modeled on the experimental opt-in flags `compact_rules` / `visual_plan_review` (both default `false`): parsed in Step 1 (boolean, warn + fall back to `false`), added to the Step 1 context-compaction-recovery skip-condition list, the § Configuration scalar-keys list + YAML example, and the README Settings-reference table + a dedicated `#### polish_prose` subsection + the Error / edge-case table
  - **Step 6.5 gate** is an entry-guard internal skip (not a task-registration omission), leaving the difficulty-skip matrix untouched: on Moderate / Complex with `polish_prose: false`, Step 6.5 marks itself `completed` and emits a localized one-line note; the guard is a no-op when the row is already pre-completed by the difficulty-skip matrix (Trivial / Simple), so the note never double-fires
  - **Step 4 plan-body polish** skips silently when `polish_prose` is not `true` — the user gate immediately follows, so a skip note would only clutter the presentation (unlike Step 6.5, whose note is its only run-signal)
  - canonical `skills/dev-workflow/skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical

### dev-workflow v1.77.0 / dev-workflow-bundle v1.82.0

- feat(dev-workflow): wire the bundled `prose-polish` skill into the workflow at two points so resolved-language prose is refined by a `sonnet` subagent (Subtask 2 of the prose-polish integration; Subtask 1 added the skill in v1.79.0)
  - **New Step 6.5: Polish Prose** — after Step 6 Tidy and before Step 7, dispatches `Skill(prose-polish)` in file mode over the changed-file set (tracked + untracked new, minus § Workflow artifacts) to rewrite resolved-language comments / descriptions in place. Runs **unconditionally** (no config flag), coupled to the difficulty-skip matrix exactly like Step 6 Tidy: skipped on Trivial / Simple, runs on Moderate / Complex. **Behavior change** — Moderate / Complex runs now invoke `prose-polish` on changed files by default
  - **Step 4 plan-body polish** — before the plan is presented at the Step 4 gate, the plan document is run through `Skill(prose-polish)` in file mode (resolved-language prose only, headings / identifiers / code blocks preserved), so the user reviews polished prose. Runs on every tier
  - Both call sites use `prose-polish`'s own `sonnet` default and do **not** receive a propagated `subagent_model` (sonnet is the deliberate skill-side default; propagating the workflow's Moderate / Complex `inherit` = opus would defeat the purpose) — recorded in the `subagent_model` and `Agent`-tool-usage Configuration bullets
  - difficulty-skip-matrix member set extended to `{Step 6 Tidy, Step 6.5 Polish Prose, Step 7.5 Rules Compliance}` across every naming site (Step 2 Adjust N, the Step 9-note scope line, the rewrite-approach re-derivation, § Completion's difficulty-skip reminder, the README matrix table + prose + self-retrospective section); § No-Stall Principle and § Progress Visibility callee lists add `Skill(prose-polish)`
  - canonical `skills/dev-workflow/skills/dev-workflow/` and the `dev-workflow-bundle` copy synced byte-identical

## 2026-06-23

### dev-workflow v1.76.1 / dev-workflow-bundle v1.81.1

- fix(dev-workflow): make the Step 4 visual plan-review gate the unconditional default action on the `visual_plan_review: true` path, instead of a surface the agent pre-branches on guessed browser reachability
  - Category: ambiguity; on path (b) the agent was told to "choose the approval surface" between a `Local browser reachable → visual gate` bullet and a `Browser unreachable → chat` bullet, but reachability is determined only inside `references/visual-plan-review.md` (its step 2 `printenv CLAUDE_CODE_REMOTE` check) — the very bullet the agent had to read to learn reachability. Under No-Stall pressure the agent resolved the circular precondition by guessing the cheaper branch (chat), never read the reference, never launched `serve.mjs`, so the plan was never displayed in the browser
  - Step 4 sub-step 2 path (b) now makes "read and follow `references/visual-plan-review.md`" the unconditional default action; the reference owns the reachability determination and returns `fallback` when the browser is unreachable, and the chat-approval path is entered only on that `fallback` return. An anti-skip guard flags skipping-the-reference-under-No-Stall as a defect that silently disables the gate
  - synced the same de-triggered framing across the other reachability-mentioning sites: the Configuration `visual_plan_review` bullet ("only if the local browser is reachable" → "always runs the gate via the reference, which detects reachability itself"); the § No-Stall Principle gate enumeration and the `Agent` tool-usage bullet (both reframed so an unreachable browser surfaces as the reference's `fallback` rather than an up-front-tested condition); and the `references/visual-plan-review.md` intro (dropped the "and the local browser is reachable" precondition; the reference now states it owns the reachability determination)
  - canonical and `dev-workflow-bundle` copy synced byte-identical

### prose-polish v1.2.0 / dev-workflow-bundle v1.81.0

- refactor(prose-polish): remove all before/after samples from `prose-style-guide.md`; rely on the rules alone so the subagent exercises its own judgment rather than pattern-matching to the examples

### prose-polish v1.1.0 / dev-workflow-bundle v1.80.0

- feat(prose-polish): expand Japanese rules in `prose-style-guide.md` to cover patterns that large verbose models commonly produce
  - **Rule 6 — Verbose politeness forms (丁寧語の過剰形)**: shorten 「〜となります」（static state only）→「〜です」, 「〜させていただく」（when extra courtesy is unnecessary）→「〜します」, filler 「〜のほう」→ delete, and chained 「〜ということ」→ omit. Each pattern includes a "do not apply when meaning changes" guard so the refactor subagent does not alter genuine state-change constructions or deliberate courtesy contexts
  - **Rule 7 — Register consistency (敬体/常体の統一)**: instruct the subagent to identify and maintain the register (敬体 or 常体) established by the surrounding prose, and not to mix the two within the same document or section
  - **Two new before/after samples**: an AI-generated explanation (説明文) and an over-polite instruction (指示文), complementing the existing code-comment and test-description samples so the style guide covers non-code prose that the skill's text mode polishes
  - canonical `references/prose-style-guide.md` and the `dev-workflow-bundle` copy synced byte-identical

### prose-polish v1.0.0 / dev-workflow-bundle v1.79.0

- feat(prose-polish): new bundled skill that refactors verbose / unnatural natural-language prose into concise, native-sounding text in a configured target language (default `ja`) using a sonnet subagent by default
  - **Two modes** (mutually exclusive; Pattern A — `Skill` wrapper + internal `Agent` dispatch + main-thread apply, single-pass with no iteration loop): **file mode** (`File:` / `Files:`) rewrites a file's target-language prose in place via `edits`, preserving code / identifiers / English technical terms / logic-bearing string literals; **text mode** (`Text:`) returns the refactored text. Both inputs present → `error` (`ambiguous args`); both absent → `error` (`incomplete args`) — the fixed mode gate mirrors `verify-diff`'s `## Invocation contract`
  - `Language:` (optional, default `ja`) selects the target language whose prose is rewritten; `Model:` (optional, default `sonnet`, closed set `{sonnet, opus, haiku}`) overrides the `Agent` dispatch model. Returns a single fenced JSON verdict (`status` / `mode` / `language` / `applied_edits_count` / `files_modified` / `refactored_text` / `reason`)
  - Registered both as a standalone plugin (`source: "./skills/prose-polish"`) and as a `dev-workflow-bundle` member; `dev-workflow-bundle` bumped `1.78.0` → `1.79.0`. Not yet wired into `dev-workflow` — the caller wiring lands in a follow-up subtask
  - canonical `skills/prose-polish/skills/prose-polish/` and the `dev-workflow-bundle` copy synced byte-identical

### dev-workflow v1.76.0 / dev-workflow-bundle v1.78.0

- fix(dev-workflow): remove the default visual plan-review gate timeout — wait up to 24h (effectively no timeout) instead of 300 s
  - **Behavior change** — the visual plan-review gate (`visual_plan_review`) no longer falls back to chat after 300 s; it waits for the browser submit up to a 24h cap. Waiting costs no tokens (the caller blocks on a harness-tracked background process), so the long wait has no runtime cost
  - Category: wrong-default; reverses auto-triage #131 (which had cut the timeout 1800 s → 300 s). `references/visual-plan-review.md` no longer passes `--timeout 300`; `serve.mjs`'s `DEFAULT_TIMEOUT_SEC` is now `86400` (24h, kept under `setTimeout`'s ~24.8-day ceiling) and the timer arms only when `timeoutMs > 0`, so `--timeout 0` now means "no timeout (wait indefinitely)" via a `0` sentinel (sibling of the existing `--port 0` sentinel). The 24h finite default keeps an automatic chat-fallback escape hatch for an abandoned gate, since manual cancellation of the background wait is surface-dependent
  - **Opt-out**: pass `--timeout 0` for truly no timeout, or `--timeout <sec>` for a custom cap (not exposed via YAML config; set on the `serve.mjs` launch in `references/visual-plan-review.md`)
  - canonical `serve.mjs` / `references/visual-plan-review.md` and the `dev-workflow-bundle` copy synced byte-identical

## 2026-06-22

### dev-workflow v1.75.1 / dev-workflow-bundle v1.77.1

- fix(dev-workflow): add Decomposed-run state-file guard item to Step 9 Completion Hooks (auto-triage #130)
  - Category: missing-branch; a new pre-call check item instructs the agent to verify that hook post-processing actions (move / archive) will not touch active decomposed-run state files before invoking the hook; if they would, the agent suppresses that hook step and records why — replacing ad-hoc reasoning with a defined branch
  - canonical `SKILL.md` and the `dev-workflow-bundle` copy synced byte-identical

- fix(dev-workflow): add language checkpoint after Step 1 sub-step 5 language resolution (auto-triage #128)
  - Category: missing-branch; a one-line informational note (e.g. "Output language: ja") is emitted after `language` is resolved so the orchestrator and user can confirm the resolved value without having to re-read Step 1
  - canonical `SKILL.md` and the `dev-workflow-bundle` copy synced byte-identical

- fix(dev-workflow): add Verification slot as the fourth element in the per-commit accept gate presentation (auto-triage #128)
  - Category: missing-branch; `references/interactive-commits.md` § Per-commit loop `a. Present` now renders a one-line Step 7 outcome summary (checks / tests result) as the fourth of five closed-list elements (Subject / Body / Files / Verification / Diff), so the user sees test status before approving each commit
  - canonical `references/interactive-commits.md` and the `dev-workflow-bundle` copy synced byte-identical

- fix(dev-workflow): reduce default visual plan-review gate timeout from 1800 s to 300 s (auto-triage #131)
  - Category: wrong-default; `references/visual-plan-review.md` Step 4 launch now passes `--timeout 300` to `serve.mjs`, capping the gate at 5 minutes so an unattended run falls back to the chat-approval path promptly instead of blocking for up to 30 minutes

- fix(dev-workflow): add block placement hierarchy check sub-check (ix) to Step 5 sub-step 4 (auto-triage #127)
  - Category: missing-branch; when adding a new structural element (test block, list item, section) inside an existing file, sub-check (ix) now requires the agent to confirm whether the new element is nested inside a parent scope and, if so, whether the parent's setup / preconditions are intentionally applicable; if they are not, the agent must relocate the element before proceeding
  - canonical `SKILL.md` and the `dev-workflow-bundle` copy synced byte-identical

### dev-workflow v1.75.0 / dev-workflow-bundle v1.77.0

- feat(dev-workflow): **Behavior change** — Step 11 rule extraction now runs via the shared session scan + `extract-rules --apply-conversation-candidates` (apply-only) instead of a direct `extract-rules --from-conversation` call, folding the prose coding-rule axis into the shared conversation scan and cutting large-text subagent ingestion per run from 2 to 1 (jsonl-scan-unification subtask 2)
  - `references/session-scan.md` is generalized from 2 axes to 3 (rule-extraction / self-retrospective / workability). The dispatch-once contract generalizes to "the first participating step in execution order (Step 11 → 11.5 → 11.6) with an active axis of its own to consume dispatches the shared scan"; Step 11 is the new earliest dispatcher when `rule-extraction-active`, and it includes the self-retrospective axis **speculatively** (gated on Step-1 registration, validated at consume time by Step 11.5's own pre-flight). The session jsonl is resolved once by the dispatcher, so every axis describes the same session.
  - New `references/rule-extraction-axis.md` is the self-contained producer spec the shared scan's subagent reads (extraction criteria + the `--- RULE-CANDIDATES ---` block shape with discriminator-conditioned field required-ness + sanitization). Its field-schema source of truth is `extract-rules` `references/conversation-mode.md` § Rule-candidate contract, which `extract-rules` Conversation Candidate Apply Mode (Step A1) validates fail-loud.
  - Failure routing: a whole-scan `Status: ERROR` (unreadable jsonl) skips rule-extraction like the sibling axes; a per-axis malformed / missing rule block (jsonl parsed fine) falls back to standalone `extract-rules --from-conversation` — the one axis with a standalone fallback worker. The `rule-extraction-active` gate (the existing `--from-conversation` skip conditions) suppresses both the apply-only path and its fallback, preserving the staging double-count defense.
  - The `Agent`-tool dispatch-site accounting (still three sites), the `subagent_model` / `session_scan_dispatched` / `session_scan_result` read / set sites, the § Workflow artifacts list (`.claude/plans/<slug>.rule-candidates.md`), and the Completion cleanup were extended to include Step 11.
  - canonical `SKILL.md` / `references/` and the `dev-workflow-bundle` copy synced byte-identical.

### extract-rules v1.21.1 / dev-workflow-bundle v1.77.0

- docs(extract-rules): point `references/conversation-mode.md` § Rule-candidate contract's forward-reference at the now-existing producer — `dev-workflow`'s rule-extraction axis (`references/rule-extraction-axis.md`) — completing the bidirectional cross-skill contract reference (jsonl-scan-unification subtask 2)
  - No behavior change: the contract itself (field set, conditional required-ness, staging routing) is unchanged; only the "a future shared-scan rule-extraction axis would define the fields" forward-reference now names the concrete producer.
  - canonical `SKILL.md` / `references/` and the `dev-workflow-bundle` copy synced byte-identical.

## 2026-06-21

### extract-rules v1.21.0 / dev-workflow-bundle v1.76.0

- feat(extract-rules): add Conversation Candidate Apply Mode (`--apply-conversation-candidates <path>`) — the apply half of a scan/apply split for `--from-conversation` (jsonl-scan-unification subtask 1)
  - The new mode runs **only Step C5** (dedup / route / write / promote / `.examples.md` / Security Self-Check) against a pre-scanned rule-candidate block, skipping the jsonl parse + analysis (C3/C4). It runs in the main agent with no subagent spawn, mirroring how Update Mode / PR Review Mode invoke Step C5 directly (the input is already sanitized, so the context-isolation rationale for Conversation Mode's Step C2 subagent does not apply). Intended caller: a shared conversation scan in an orchestrator such as `dev-workflow` (the wiring lands in a follow-up subtask); usable standalone with a hand-authored candidate file.
  - New `references/conversation-mode.md` § Rule-candidate contract formalizes the C4 → C5 interface as a serializable block reusing the shared session-scan's `### Candidate <N>` … `Candidates: <N>` **envelope** (only the envelope is shared — the field set is specific to this rule-extraction axis, not the workability axis's schema): `Type` (principle / pattern) + `Category` (language / framework / integration / project) + `Name` / `Signature` / `Context` / `Rule`, with per-field conditional required-ness and a written-bullet mapping. The staging 3-branch fires exactly when `Type == pattern` AND `Category == project`; every other combination writes canonical directly, reproducing Step C5 item 3's existing routing.
  - **No behavior change to standalone modes**: the existing C1–C5 `--from-conversation` path is untouched (the contract is conceptual there), and Step C5's routing / dedup / write body is unchanged — apply-only framing was added additively. Mode-enumeration lists across `SKILL.md` and `references/{conversation-mode,examples-format,extraction-criteria}.md` were extended to include the new mode.
  - canonical `SKILL.md` / `references/` and the `dev-workflow-bundle` copy synced byte-identical.

## 2026-06-20

### dev-workflow v1.74.7 / dev-workflow-bundle v1.75.7

- fix(dev-workflow): add line-count pre-filter to verbatim diff display mode in Step 10 interactive commits (auto-triage #125)
  - Category: wrong-default; `references/interactive-commits.md` § Per-commit loop `a. Present` now evaluates `diff_verbatim_line_threshold` (default 100 lines) before the character-count test, so prose diffs with a small line count are shown verbatim even when their total character count exceeds `diff_verbatim_threshold`. Set to `99999999` in `.claude/dev-workflow.local.md` to always pass the line-count gate.

### dev-workflow v1.74.6 / dev-workflow-bundle v1.75.6

- refactor(dev-workflow): consolidate the Step 11.5 (self-retrospective) and Step 11.6 (workability) session-jsonl scans into a single shared session-scan subagent dispatch (issue #123 Finding 1)
  - The two retrospective steps previously each spawned their own `general-purpose` subagent to parse the same session jsonl. A new `references/session-scan.md` houses one shared dispatch that parses the jsonl once and returns each enabled axis's block (`### Finding …` / `### Candidate …`) in a single delimited return; each axis's `§2.1` is reframed into the axis spec the shared scan reads (instruction-list numbering and stable anchors preserved). The first enabled retrospective step past its pre-flight dispatches once — cross-step state `session_scan_dispatched` / `session_scan_result` is hoisted to Step 2 init — and the other consumes its block from the held return. This drops the workflow's direct `Agent` dispatch count from four sites to three.
  - **No behavior change**: each axis's output block shape is preserved byte-for-byte (so `dev-workflow-triage`'s consumer is unaffected), the per-axis sanitization regimes stay separate, and raw conversation still never reaches the main thread. A whole-scan fatal parse error now skips both active axes together (they share one jsonl parse); a per-axis malformed block skips only that axis.
  - Out of scope: `extract-rules --from-conversation` (a separate distributed skill with write side-effects and standalone use) is not folded in — this reduces the run's jsonl parses from three to two.
  - canonical `SKILL.md` / `references/` and the `dev-workflow-bundle` copy synced byte-identical.

### dev-workflow v1.74.5 / dev-workflow-bundle v1.75.5

- fix(dev-workflow): the Step 11 rule-update commit gate now covers all of extract-rules' output directories (rules / examples / staging), not just `output_dir` (issue #123 Finding 3)
  - Category: missing-branch; the gate previously proposed only `output_dir` (default `.claude/rules/`) changes, so `examples_output_dir` / `staging_output_dir` writes from the same run were left to reminder-only. It now resolves all three dirs from `.claude/extract-rules.local.md` (defaults when unset) and proposes their uncommitted changes in a single commit.
  - **Behavior change**: the gate stays a USER APPROVAL GATE (accept / adjust(exclude) / cancel), so nothing auto-commits; `staging_output_dir` files are labeled as unreviewed 1st-observation candidates so the user can exclude them. Added a Completion examples-dir reminder (mirrors the staging-dir reminder) and widened the decomposition-resume leak warning to all three output dirs. The `output_dir`-scoped compaction reminder is unchanged.
  - Completion partition now resolves a path that matches more than one output dir (when `examples_output_dir` / `staging_output_dir` are set equal to or nested under `output_dir`) by extract-rules' output-class filename suffix (`.examples.md` / `.staging.local.md` / other `.md`) rather than directory-precedence order, which had misrouted a rule file under a collapsed `examples_output_dir == output_dir` into the examples set and suppressed the rule-update (and `output_dir`-scoped compaction) reminder; the default disjoint config is unaffected.

### dev-workflow v1.74.4 / dev-workflow-bundle v1.75.4

- fix(dev-workflow): require empirical verification to confirm its tool reproduces the real-environment factors the verified behavior depends on before trusting an automated PASS (auto-triage #122)
  - Category: wrong-default; synthetic-event automation can bypass OS filter / platform-specific layers, so the check now self-questions whether the verification means reproduces those factors and treats real-environment / user observation as ground truth over an apparent automated PASS

### extract-rules v1.20.5 / dev-workflow-bundle v1.75.4

- fix(extract-rules): normalize conversation-extracted candidates to an abstract-principle main clause with incident-specific details demoted to parenthetical examples (auto-triage #123)
  - Category: wrong-default; added abstraction-normalization guidance to `references/conversation-mode.md` § Step C4 so candidates re-match on second observation instead of stalling in staging as long incident-specific records

### dev-workflow v1.74.3 / dev-workflow-bundle v1.75.3

- fix(dev-workflow): the visual plan-review gate is now keyboard-operable when macOS Full Keyboard Access is off
  - **Bug**: the gate's decision controls (Approve / Request changes radios, Send button) live in a fixed bottom bar. On macOS with Full Keyboard Access off (the default), Chrome excludes native form controls and links from Tab order, so a keyboard user could not Tab to the Approve radio — or any control — at all. Renaming the radios alone would not help, since under that setting no native control is Tab-reachable.
  - **Fix**: added focus-independent document-level keyboard shortcuts to `scripts/plan-review/public/index.html` — `a` selects Approve, `r` selects Request changes, and `⌘/Ctrl+Enter` sends (works anywhere, including inside a comment field) — with a localized hint in the bar. Bare `Enter` is intentionally left unbound so it still toggles `<details>` sections and activates focused buttons/links natively. Guards skip IME composition (`isComposing`), text-field focus, and the post-submit state. Independently, the two decision radios were given distinct `name`s (plus a `role="radiogroup"` wrapper and JS-enforced mutual exclusivity) so both stay Tab-reachable for users who do have Full Keyboard Access on (previously, once a comment auto-selected "revise", the "approve" radio dropped out of Tab order).
  - canonical `scripts/` asset and the `dev-workflow-bundle` copy synced byte-identical.

## 2026-06-19

### dev-workflow v1.74.2 / extract-rules v1.20.4 / dev-workflow-bundle v1.75.2

- fix(dev-workflow): missing-branch fixes across Step 2, Step 9, and Step 10 interactive-commits procedures (auto-triage 2026-06-19)
  - Category: missing-branch (issues #117–#121)
  - **Step 2 self-check** (issues #118–#120): added early reviewer availability probe; added numerical-constant origin disambiguation; added permission and capability assumption verification; added codebase impact cross-check; added behavior semantics verification to plan review category (c)
  - **Step 10 interactive-commits** (issue #117): diff rendering extended from 2-mode to 3-mode (verbatim / condensed / skeleton) for large diffs; Mid-loop adjust branch g added (actual-code edits made during per-commit accept gate, with explicit (1) continue / (2) stop-for-re-verification choices)
  - canonical `SKILL.md` / `references/` and the `dev-workflow-bundle` copy synced byte-identical
- fix(extract-rules): staging_output_dir config description now includes downstream automation note (auto-triage 2026-06-19)
  - Category: missing-branch (issue #121)

### dev-workflow v1.74.1 / dev-workflow-bundle v1.75.1

- fix(dev-workflow): the Step 11 "Commit rule updates" gate now frames its user-facing output in the resolved `language` (was English-only)
  - **Bug**: the rule-update commit gate added in v1.74.0 reuses the Step 10 interactive-commits presentation mechanics, but the § Configuration `language` bullet's localized-surface list named only the *Step 10* commit gate output — so the Step 11 gate's commit presentation and accept / adjust / cancel prompt rendered in English regardless of the resolved `language`, unlike every other user-facing step.
  - **Fix**: added the Step 11 "Commit rule updates" gate to the `language` bullet's localized-surface list (subjects / body / diff framed in the resolved language; verbatim `git` output and file paths stay English — same contract as the Step 10 commit gates), and added an explicit cross-reference in the Step 11 sub-step so the framing language is stated at the point of use.
  - canonical `SKILL.md` and the `dev-workflow-bundle` copy synced byte-identical.

### dev-workflow v1.74.0 / dev-workflow-bundle v1.75.0

- feat(dev-workflow): Step 11 (Update Rules) now **proposes committing** the `.claude/rules/` changes that `extract-rules` writes, instead of only emitting a manual-commit reminder
  - **New gate**: a "Commit rule updates" sub-step (USER APPROVAL GATE) runs after `extract-rules`, when `interactive_commits: true` and `.claude/rules/` has uncommitted changes. It proposes a single commit of those changes (diff base `HEAD`, since Step 10 already committed the production code), reusing `references/interactive-commits.md`'s Present / Stage / Commit / retry / post-commit-auto-modify mechanics; `adjust` narrows the file set by pathspec omission, `cancel` leaves them uncommitted. Order is now: production-code commit (Step 10) → rule extraction (Step 11) → rule commit (new). The gate renders `git`-shaped output and emits no § User-gate summary preamble (like the Step 10 commit gates).
  - **Default: enabled under `interactive_commits: true`** — set `interactive_commits: false` in `.claude/dev-workflow.md` or `~/.claude/dev-workflow.local.md` to opt out of both the Step 10 production commits and the Step 11 rule commit. **Behavior change**: existing `interactive_commits: true` users now get the rule-commit proposal where they previously got a manual-commit reminder; declining the gate keeps the manual-commit behavior, and the Completion reminder then fires only for whatever `.claude/rules/` changes remain uncommitted.
  - **Completion reminders conditioned**: the rule-update reminder and the compaction reminder's commit clause now recompute `uncommitted_rule_changes` (uncommitted `.claude/rules/` paths at Completion) and fire only when changes remain; the compaction below-threshold follow-up stays unconditional. The decomposition-resume manual-commit note is conditioned the same way. The rule-update reminder's `<N>` now counts uncommitted rule files at Completion (previously: the `extract-rules` write count).
  - **Docs**: `references/update-rules.md` § Step 10 / Step 11 ordering note, `references/plan-format.md` § User-gate summary preamble enumeration, and `README.md` (`interactive_commits` detail + Step 11 table row) updated.
  - canonical `SKILL.md` / `references/` and the `dev-workflow-bundle` copy synced byte-identical.

### dev-workflow v1.73.1 / dev-workflow-bundle v1.74.1

- fix(dev-workflow): § Completion's "Derived staging artifact cleanup" no longer aborts under zsh's `nomatch`, so the staging files are reliably deleted
  - **Bug**: the cleanup ran one combined `rm -f .claude/plans/<slug>-agent-*.md` plus the three fixed-name plan-review files. Under zsh (the macOS default shell), when the leading `<slug>-agent-*.md` glob matched nothing the shell aborted the whole command at expansion time (`no matches found`) — `-f` suppresses only `rm`'s own missing-file error, not the shell's expansion failure — so the fixed-name files were left behind as untracked noise. bash was unaffected (it passes an unmatched glob through literally).
  - **Fix**: § Completion now uses **two separate `rm -f` commands** — the three fixed-name files first, then `rm -f .claude/plans/<slug>-agent-*.md || true`. zsh's `nomatch` aborts only the single command it sits in, so isolating the glob in a trailing command protects the fixed-name deletions, and `|| true` keeps the exit clean when nothing matches. Both commands stay covered by the existing `Bash(rm -f .claude/plans/*)` grant — no new tool permission and no `allowed-tools` change.
  - canonical `SKILL.md` and the `dev-workflow-bundle` copy synced byte-identical.

### dev-workflow v1.73.0 / dev-workflow-bundle v1.74.0

- feat(dev-workflow): the **visual plan-review gate** now shows a **diff on revise re-launch** so the user can focus on what changed instead of re-reading the whole plan
  - **`scripts/plan-review/serve.mjs`**: new optional `--prev <path>` arg; when supplied and readable, `/api/plan` ships its content as `prevMarkdown` (else `null`). An unreadable `--prev` is non-fatal (warning + no diff). `--lang` now also localizes the diff banner.
  - **`scripts/plan-review/public/index.html`**: when `prevMarkdown` is present, the viewer diffs current-vs-prev section by section — changed / new sections get a `Changed` / `New` badge and auto-open, unchanged sections collapse, and changed blocks (paragraphs / list items / Decision cards) are highlighted; a localized banner reports the changed-section count. First launch (no `prevMarkdown`) renders exactly as before. Diffing reuses `parseSections` plus a read-only `collectBlockTexts` helper (no DOM mutation); the commentable block-tag set is shared with `attachElementComments` via a new `COMMENT_BLOCK_TAGS` constant.
  - **`references/visual-plan-review.md`**: new § Prev snapshot documents the `.plan-review.prev.md` snapshot discipline (closed list of two sites — before the localized-revise `Edit`, and before the served-file `Write` on non-first launches), the `--prev` launch wiring, and the `{ id, markdown, lang, prevMarkdown }` `/api/plan` contract.
  - **`SKILL.md`**: `.plan-review.prev.md` added to § Workflow artifacts (cross-step fixed exclusion) and § Completion's cleanup `rm -f`. **`README.md`**: the `visual_plan_review` docs note the revise diff.
  - **Investigation note (no code change)**: the Decision-card Recommendation/Alternative toggle was already present (added in the v1.71.0 visual-gate overhaul) and renders whenever a Decision carries an `**Alternative**` line — confirmed working as intended, so the "selection UI not shown" feedback needed no code change.
  - **Verification**: this run verified `serve.mjs --prev` over `/api/plan` (curl) and the browser diff rendering (badges / auto-open / collapse / block highlight / prev-absent fallback) via Playwright; the end-to-end revise→re-launch diff activates only in a session that re-launches the viewer, so it is confirmed in a fresh local session with `visual_plan_review: true`.

## 2026-06-18

### dev-workflow v1.72.1 / dev-workflow-bundle v1.73.1

- fix(dev-workflow): add pre-existing-artifact existence verification to Step 2 self-audit (auto-triage #114)
  - Category: `missing-branch`
- fix(dev-workflow): add stable-anchor form sub-check to Step 5 scaffolding self-audit (auto-triage #114)
  - Category: `missing-branch`
- fix(dev-workflow): add closed-list sibling-set stale-value sweep sub-check to Step 5 scaffolding self-audit (auto-triage #114)
  - Category: `missing-branch`
- fix(dev-workflow): add downstream-artifact invalidation self-check to Step 7 (auto-triage #110)
  - Category: `missing-branch`
- fix(dev-workflow): surface untracked new files in Step 8 code review dispatch (auto-triage #109)
  - Category: `missing-branch`
- fix(dev-workflow): add Red-before/Green-after verification to Step 7 test loop (auto-triage #108)
  - Category: `missing-branch`
- fix(dev-workflow): add environment sanity check to Step 7 test loop (auto-triage #108)
  - Category: `missing-branch`

### rules-review v1.4.1 / dev-workflow-bundle v1.73.1

- fix(rules-review): add constructive resolution guidance for low-confidence intent-rule findings (auto-triage #108)
  - Category: `missing-branch`

### dev-workflow v1.72.0 / dev-workflow-bundle v1.73.0

- fix(dev-workflow): make the **visual plan-review gate** (`visual_plan_review`) actually fire by taking Step 2 out of Plan Mode when the gate is enabled
  - **Problem**: Step 2 unconditionally called `EnterPlanMode`, and the workflow stayed in Plan Mode through Step 4's `ExitPlanMode`. Plan Mode forbids non-read-only operations, but the gate must write a served file and launch `node serve.mjs` (server + browser + `comments.json`) — all non-read-only. So the gate could never fire inside Plan Mode and always fell back to text; it had no real-workflow launch record since it was introduced.
  - **Fix (approach D)**: when `visual_plan_review: true`, Step 2 sets `plan_mode_active = false` and **does not enter Plan Mode**, so Step 4's gate runs outside Plan Mode and its non-read-only operations are permitted. The default (`visual_plan_review: false`) keeps the unchanged `EnterPlanMode → ExitPlanMode` flow — every Step 4 `ExitPlanMode` site is gated on `plan_mode_active == true`, so default behavior is byte-identical.
  - **Behavior change (opt-in only)**: enabling `visual_plan_review: true` now **skips Plan Mode during planning** — approval comes from the browser submit (or, when the browser is unreachable / on fallback, a chat reply pointing to `.claude/plans/<slug>.md`) rather than the `ExitPlanMode` modal. On this path the canonical plan document is `.claude/plans/<slug>.md` (the no-Plan-Mode path establishes the slug — reusing the decomposition state-file slug when one is active, else deriving it from the effective task), and the planning-phase "no code changes" rule is enforced by agent discipline rather than Plan Mode's read-only lock.
  - **`SKILL.md`**: Step 2 sub-step 2 conditionalizes `EnterPlanMode` on `plan_mode_active`; Step 4 sub-step 2 branches into path (a) Plan-Mode (unchanged) / path (b) no-Plan-Mode (visual gate or chat approval, no `ExitPlanMode`); sub-steps 1 / 1.5 / 3, the Step 1.5 + § Configuration + § No-Stall gate bullet, and the § Completion slug reference are generalized accordingly. **`references/visual-plan-review.md`** / **`references/plan-format.md`** / **`references/task-decomposition.md`** / **`README.md`**: `Plan Mode plan file` / `ExitPlanMode` references scoped to path (a); no-Plan-Mode behavior documented.
  - **Verification (pre-push, manual)**: the no-Plan-Mode Step 4 behavior activates only in a session that loads this updated `SKILL.md`, so the end-to-end browser launch is verified by restarting Claude Code and running `/dev-workflow` with `visual_plan_review: true` before pushing (this run's own planning was done outside Plan Mode as a partial live proof).

### dev-workflow v1.71.0 / dev-workflow-bundle v1.72.0

- feat(dev-workflow): overhaul the **visual plan-review gate** (`visual_plan_review`) into a structured, review-optimized browser surface
  - **Problem**: the prior gate rendered the plan markdown as-is, so it offered no differentiation from the `ExitPlanMode` approval modal (which renders the same markdown), and its only distinguishing affordance — block comments — was at coarse top-level-section granularity. It was reported as providing no benefit over the text path.
  - **`scripts/plan-review/serve.mjs`** is simplified to a **transport**: `/api/plan` returns `{ id, markdown, lang }` (raw plan markdown), the block-segmentation code is removed, and `/api/submit` accepts any non-empty browser-assigned semantic block id. A new `--lang <ja|en>` arg controls only the generated "switch to alternative" comment body (default `en`).
  - **`scripts/plan-review/public/index.html`** is rebuilt into a structured review surface: a **summary header** (Goal title + Difficulty / Scope / Risks-count chips), **collapsible sections** (`<details>`; must-review Overview / Decisions / Context open, reference sections collapsed, Risks badged), **Decision cards** (Question / Recommendation / Alternative with a one-click Keep/Switch-to-alternative toggle that submits as a Recommendation↔Alternative swap), **per-element comments** (comment an individual Decision / Design step / list item / paragraph), and **mermaid diagrams** rendered as SVG with per-fence failure isolation (`mermaid.run({ suppressErrors: true })`). Plan structure is parsed client-side with per-section **shape detection** (non-conforming sections — empty-Decisions, by-file Design — degrade to plain markdown rendering, keeping element-level comments).
  - **`references/visual-plan-review.md`**: `/api/plan` contract updated to `{ id, markdown, lang }`; the served-file block-marker insertion step removed (block ids are now per-render ephemeral semantic ids — comments are consumed on each `revise` submit, so cross-render id stability is unnecessary); `--lang` documented; the "switch to alternative" comment is applied as a bounded R/A swap (the browser toggle is the confirmation, so the text-path read-back is intentionally omitted).
  - **`references/plan-format.md`**: Design guidance now permits an **optional mermaid diagram** (flowchart / sequence) when a complex flow / state transition / branching is hard to follow in prose — the diagram must replace that prose (a diagram restating the numbered steps is padding, cut per § Sizing guidance). The visual gate renders it; the text path / modal shows the raw fenced block (acceptable degradation).
  - **`SKILL.md`** Step 4: dropped the stale "with block markers" phrasing. **`README.md`**: the `visual_plan_review` docs now advertise the new capabilities and the differentiation from the modal.
  - **Manual verification (next session)**: the workflow-integrated Step 4 gate activates only in a session that loads this updated `SKILL.md`, so the end-to-end browser flow is verified manually in a fresh local session with `visual_plan_review: true` (this run's own Step 4 used the text path under plan-mode restrictions). The viewer's rendering itself was verified this run via `webapp-testing` (Playwright).

## 2026-06-17

### dev-workflow v1.70.0 / dev-workflow-bundle v1.71.0

- feat(dev-workflow): add an opt-in browser-based **visual plan-review gate** at Step 4 (wires the previously-unwired `scripts/plan-review/serve.mjs` viewer)
  - **Default: disabled** — set `visual_plan_review: true` in `.claude/dev-workflow.md` (or `~/.claude/dev-workflow.local.md` / `.claude/dev-workflow.local.md`) to opt in per project. Experimental.
  - When enabled **and the local browser is reachable** (local CLI / Remote Control), Step 4 presents the plan through a browser block-level review gate instead of the text approval: the bundled `scripts/plan-review/serve.mjs` viewer serves the plan on `127.0.0.1`, the user comments per block and chooses **approve** (→ implementation via `ExitPlanMode`) or **revise** (comments applied to the plan, gate re-runs). Approach-level revise comments route to the text path's `rewrite-approach` (Step 3 re-review) so review quality stays symmetric.
  - **Local-only with transparent fallback**: on Claude Code on the Web (detected via `CLAUDE_CODE_REMOTE="true"` — a remote headless sandbox with no port-forwarding and no display) and on any launch failure (non-zero `serve.mjs` exit, blocked Bash call), Step 4 falls back to the unchanged text approval. The web UI offers no rich review surface beyond chat, so the text path is the appropriate web experience.
  - The gate launches `serve.mjs` via **background Bash** (`run_in_background`), not the `Agent` tool, so the "exactly three subagent-dispatch steps" invariant is unaffected.
  - **`SKILL.md`**: `allowed-tools` gains `Bash(node *)` / `Bash(printenv CLAUDE_CODE_REMOTE)`; new `visual_plan_review` Configuration bullet + scalar-key list / Step 1 parse wiring; Step 4 sub-step 2 gains the visual/text branch; § No-Stall Principle lists the gate as an explicit user-gate (harness-tracked background submit boundary, no preamble). New **`references/visual-plan-review.md`** holds the gate procedure. **`README.md`** documents the setting.
  - **Manual verification (next session)**: the new Step 4 behavior activates only in a session that loads this updated `SKILL.md`, so the end-to-end browser flow is verified manually in a fresh local session with `visual_plan_review: true` (this run's own Step 4 used the prior text path).

### dev-workflow v1.69.3 / dev-workflow-bundle v1.70.5

- fix(dev-workflow): clarify Simplicity self-audit consistency-with-siblings remedy precedence (recovered from an orphaned stash left by the prior triage run)
  - **`references/simplicity-self-audit.md`** traceability bullet now notes that, for the intra-project "align with sibling implementations" rationale specifically, the **Consistency-with-siblings as primary rationale** item's remedy (surface lighter alternatives in Decisions) supersedes a plain drop. Category: `ambiguity`

### peer v2.4.3 / dev-workflow-bundle v1.70.5

- fix(ask-peer): clarify that the Peer Agent Personality block doubles as dispatch-path system instructions and fallback-path self-adopted persona (recovered from an orphaned stash left by the prior triage run)
  - Peer Agent Personality intro now reads "the reviewer's operating instructions — supplied as system instructions to a spawned reviewer on the Claude Code / Codex dispatch paths, or self-adopted on the main thread under the fallback path", reconciling the second-person voice across both execution paths. Category: `ambiguity`

### extract-rules v1.20.3 / dev-workflow-bundle v1.70.5

- fix(extract-rules): define the `<name>` slot in the `.examples.md` output path (recovered from an orphaned stash left by the prior triage run)
  - **`references/conversation-mode.md`** Step C5 item 6 now resolves `<name>` in `<examples_output_dir>/<name>.examples.md` to the routing category's file stem from Step C5 item 2 (`project` for project-level items, the `<lang>` / `<framework>` / `<framework>-<integration>` name otherwise). Category: `ambiguity`

## 2026-06-16

### dev-workflow v1.69.2 / dev-workflow-bundle v1.70.4

- fix(dev-workflow): add domain-assumption verification, interruption re-anchoring, mock/replay-only coverage self-check, destination reachability pre-flight check, knowledge-preservation fallback for extract-rules, and comment-conciseness sub-check (vi) (auto-triage #107, #105, #104)
  - **`references/simplicity-self-audit.md`** gains **Domain-assumption verification**: claims of uniqueness or universality ("X is the only option", "X is always required") must be verified against primary sources before a plan commits to them. Category: `missing-branch`
  - **Step 1** gains **Interruption re-anchoring sub-step**: on resumption after an interruption, re-read the plan and confirm current state before continuing. Category: `missing-branch`
  - **Step 7 sub-step 2** gains **Mock/replay-only coverage self-check**: when new tests pass only via mocks, stubs, or replay fixtures, verify the coverage is not bypassing the real behavior being tested. Category: `missing-branch`
  - **Step 11 self-retrospective pre-flight** gains **Destination reachability check**: verify the issue-filing destination is reachable before starting the retrospective write phase. Category: `missing-branch`
  - **Step 11 sub-step 4** gains **Knowledge-preservation fallback**: when `extract-rules` is unavailable, save reusable patterns discovered during the workflow to `.claude/plans/rules-candidates-<date>.md` instead of silently skipping. Category: `missing-branch`
  - **Step 5 item 4** gains **Comment-conciseness sub-check (vi)**: apply a rule-of-need test to every inline comment in the diff — only why-comments are justified; what-comments and multi-line background explanations are deletion candidates. Fire condition for sub-checks (v) and (vi) extended to all diff edits (previously `.md`-only). Category: `missing-branch`

### peer v2.4.2 / dev-workflow-bundle v1.70.4

- fix(ask-peer): add domain-assumption verification to Planning Review Focus Areas (auto-triage #107)
  - New bullet instructs the peer reviewer to treat uniqueness or universality claims ("this is the only viable approach", "X is universally required") as hypotheses and verify them against primary sources before confirming or echoing them in feedback. Category: `missing-branch`

## 2026-06-15

### dev-workflow v1.69.1 / dev-workflow-bundle v1.70.3

- fix(dev-workflow): add new guidance bullets to Step 7 sub-step 2 and Step 8 sub-step 3, plus a new simplicity-self-audit checklist item (auto-triage #101, #100)
  - **Step 8 sub-step 3** gains **Comment-verbosity self-check** (post-fix): scan all inline code comments visible in the diff — both newly-added (`+` lines) and pre-existing context lines — for over-explanation; remove what-comments and keep only why-comments. Category: `missing-branch`
  - **Step 7 sub-step 2** gains **Cheap-diagnostic first pass**: read raw error output before taking any edit action to identify failure class and error source — no retry budget consumed, no file edits — avoiding misdirected first-fix attempts. Category: `missing-branch`
  - **Step 7 sub-step 2** gains **Self-contamination discrimination**: when tests pass on one Step 7 entry but fail after a workflow-applied fix (tidy/rules-review/code-review), check whether the workflow's own changes caused the regression before applying new implementation edits. Category: `missing-branch`
  - **`references/simplicity-self-audit.md`** gains **Structural-pattern class enumeration before scope finalization**: enumerate the full class of instances of a recurring structural pattern before finalizing plan scope; record the closed list in Decisions. Category: `missing-branch`

### peer v2.4.1 / dev-workflow-bundle v1.70.2

- fix(ask-peer): add negative-existence-claim verification to Planning review focus areas (auto-triage #101)
  - New sub-bullet instructs the reviewer to treat claims like "X is the only way" or "no alternative exists" as hypotheses and verify them against primary sources before confirming or echoing them in feedback. Category: `missing-branch`

### extract-rules v1.20.2 / dev-workflow-bundle v1.70.1

- fix(extract-rules): add execution-responsibility statement to Step C5 (auto-triage #102)
  - New "Execution responsibility" preamble paragraph in Step C5 explicitly states that write operations (rule-file appends, staging-file creates/deletes, `.examples.md` updates) are performed directly by the subagent — returning a list of proposed changes without materializing the writes is a contract violation. Category: `missing-branch`

### rules-review v1.4.0 / dev-workflow-bundle v1.70.0

- feat(rules-review): add a trailing single fenced JSON return contract so orchestrators can mechanically parse the rules-compliance verdict — additive and backward-compatible
  - A new `## Return contract` section emits one fenced JSON block at the end of **every** exit path: `{ "status": "no-issues|violations|error", "violations_count": <int>, "reason": <enum|null> }`. The status enum mirrors the same-domain `rules-review-codex` sibling (`no-issues|violations|error`); the prose `## Output Format` stays the single source of truth for violation detail (the JSON carries status + count only, not the full violation list).
  - `error`'s `reason` is a closed enum (`"diff collection failed"` / `"rule loading failed"` / `"verdict parse failure"`). A single reviewer group failing while others parse stays a `§ 6` `(review failed)` synthetic entry counted under `violations`; only an all-groups-failed review raises top-level `error` — no change to the existing `§ 6` per-group behavior.
  - A new `## Sub-skill caller directive` section (adapted from the `skill-review` sibling) tells sub-skill callers the verdict is a structured return value, not a turn boundary. Its orchestrator reference is kept generic rather than naming a project-local skill, so the distributed bundle skill carries no dangling cross-skill reference.
  - Backward-compatible: the compliant path still emits the prose line `No rule violations found` (substring-matching callers keep working); the `## Output Format` "When compliant" note is updated to reflect the appended verdict block. dev-workflow Step 7.5 judges the result semantically and is unaffected.

### dev-workflow v1.69.0 / dev-workflow-bundle v1.69.0

- feat(dev-workflow): track post-implementation working-tree changes per review hook, so any change no review hook claims responsibility for surfaces before commit grouping (auto-triage #99)
  - **Step 5** gains sub-step 9 (**Implementation diff snapshot**): at the end of Step 5, after all planned edits and the derived-value deferral sub-step land, `git diff <base-commit> --name-only` is captured as `implementation_diff_paths` — the tracked paths the implementation changed, recorded before any review hook (Steps 6–9) runs.
  - **Step 10** gains a **Post-hook attribution check**: it derives `hook_introduced_paths = step10_diff_paths − implementation_diff_paths`, cross-references those against the Step 6 cross-layer review handoff ledger's applied sites, and surfaces any path no review hook claimed as **unattributed** — requiring confirm-as-side-effect or revert before commit grouping.
  - The attribution check first **subtracts the § Workflow artifacts (cross-step fixed exclusion) set**, so workflow-owned in-session state (e.g. a plan file the ledger wrote a leftover into) is never falsely flagged as unattributed — honoring the skill's canonical exclusion that every changed-file-set-building step must apply.
  - **Version alignment**: dev-workflow jumps 1.66.0 → 1.69.0 to match dev-workflow-bundle (both now 1.69.0), closing the prior plugin-version skew.

## 2026-06-14

### dev-workflow v1.66.0 / dev-workflow-bundle v1.68.0

- feat(dev-workflow): make skills more likely to actually be invoked when next needed — two improvements that close the create→use loop, anchored on the fact that Claude Code skill triggering is `description`-driven (CLAUDE.md / `.claude/rules/` are context injection, not a trigger index)
  - **Step 2 plan creation** now enumerates task-relevant available skills and annotates the Design step(s) where each applies. A new **Task-relevant skill annotation** sub-bullet (Step 2 sub-step 3, unconditional — runs on every plan) tells the planner to scan the session's available-skills context for skills that help the task's own work and record them on the Design steps that use them, so skill use is explicit in the plan the workflow executes rather than relying on the model to recall a skill mid-implementation. Scoped to **task-domain skills only** (the workflow's own fixed-step callees — reviewer / cleanup / rules-review / tests / extract-rules — are excluded), recommendation-not-contract (Step 5 may drop a suggestion that does not fit), and annotate-only-where-it-applies to avoid plan bloat. `references/plan-format.md` § Template gains the invoked skill as an optional Design-step grammar element.
  - **Step 11.6 Workability Retrospective** now requires a `skill-candidate`'s `proposed_action` to include a draft `description` that leads with the skill's action and carries explicit `Use when ...` trigger conditions — the creation-side complement, so a proposed skill is born with the trigger signal it needs to fire. Synced verbatim across the §2.1 return-schema template and the §2.3 candidate schema, scoped to the `skill-candidate` branch so it does not collide with the `lint-rule-candidate` / `prose-rule` framing, and additive (the §6 failure-disposition check parses enums + structural tokens only, never `Proposed action` prose).

### dev-workflow v1.65.0 / dev-workflow-bundle v1.67.0

- feat(dev-workflow): add **Step 11.6 Workability Retrospective**, a third retrospective axis that detects this session's project-tooling improvements and offers a per-candidate disposition gate
  - **Default: disabled** — set `workability_retrospective.enabled: true` in `.claude/dev-workflow.md` to opt in per project. The detection + 4-way disposition feature is **experimental**, following the `compact_rules` / `self_retrospective` opt-in precedent; an unconfigured user sees no behavior change.
  - A subagent scans the session jsonl (same architecture as Step 11.5 §2.1) for **skill-candidate** signals (reusable multi-step manual procedures that could become a `.claude/skills/<name>/` skill) and **lint-rule-candidate** signals (mechanically-enforceable conventions that could be added to an existing linter config or to `check_commands`). The prose-rule axis stays delegated to Step 11 `extract-rules` (this step never writes `.claude/rules/`); the bundle-skill axis stays with Step 11.5 self-retrospective.
  - Each candidate gets a 4-way disposition gate (a new explicit user-gate in `§ No-Stall Principle`): **act now** (start a fresh `/dev-workflow <candidate>` run, keeping commit boundaries clean), **make a subtask** (add to a decomposition state file — created fresh on a normal run — for later `--resume`), **save to backlog** (append to a markdown file under `workability_retrospective.backlog_dir`, default `.claude/improvements`), or **reject**. Runs regardless of the Step 2 difficulty assessment (mirrors Step 11.5).
  - The procedure lives in `references/workability-retrospective.md`; `references/plan-format.md` § User-gate summary preamble gains the new gate; and the SKILL.md Agent-dispatch count moves from "two steps / three dispatch sites" to "three steps / four dispatch sites".

## 2026-06-13

### dev-workflow v1.64.0 / dev-workflow-bundle v1.66.0

- feat(dev-workflow): `--init` step 4a adds a **Template-conformance backstop** so an existing `run-tests` skill is checked for completeness against the template, not only against a closed gap list
  - The v1.63.0 entry below added a `model: sonnet` surgical-patch entry to step 4a's known-gaps list, but documented that list as the completeness boundary ("closed list of known template features … rather than a full-file diff"). That left the root failure unaddressed: any load-bearing template directive **not yet enumerated** as a known gap is silently skipped — exactly how the `model: sonnet` drift went undetected until it was added by hand. The hand-addition itself is the evidence of the gap class.
  - Step 4a (`references/init-mode.md`) now runs a **Template-conformance backstop** after the known-gaps checks: it compares the existing skill against the embedded template across every **non-adaptive span** and surfaces any load-bearing instruction / named contract that is absent or contradicted (judged by meaning, not literal lines). A small, stable **Adaptive regions** closed list — `description` / the `Bash(...)` command entries / Prerequisites / the test-command enumeration / the Subagent Instructions' project-specific checks body (but **not** the three-status Return Format contract, which stays compared) — is excluded so the per-project content `--init` adapts never false-positives. Excluding the adaptive regions is what distinguishes this from the literal full-file diff the prior entry declined on false-positive grounds. Backstop-detected gaps are offered as a regenerate.
  - The maintenance burden inverts: the known-gaps list now supplies tailored surgical patches for common drift (maintained bidirectionally — promote recurring backstop hits, drop entries the template no longer carries), while completeness rests on the small adaptive-region exclusion rather than on enumerating every load-bearing feature.

### dev-workflow v1.63.0 / dev-workflow-bundle v1.65.0

- feat(dev-workflow): `--init` now detects template-feature drift in an existing `run-tests` skill and offers to fix it
  - Step 4a's existing-`run-tests` detection (`references/init-mode.md`) previously hit "Current format → use as-is, skip generation" whenever the skill satisfied the four structural predicates (Agent tool / subagent pattern / three-status contract / `--base-commit` input). The gap-detection list checked only Prerequisites / Docker readiness, so the `model: sonnet` subagent directive added to the template in v1.62.0 was never proposed on re-run.
  - The control sentence is rewritten so a detected gap **overrides** the skip, and the gap list is restructured into two disposition classes: **surgical in-place patch** (add only the missing directive via an `Edit`, preserving the project's detected test commands / prerequisites / description / allowed-tools) and **regenerate** (the existing Prerequisites / Docker structural gaps). The missing `model: sonnet` directive is the first surgical-patch entry. The list is documented as a **closed list of known template features** (append on a new load-bearing template feature) rather than a full-file diff, which would false-positive on the per-project content `--init` intentionally adapts.
  - This makes the v1.62.0 CHANGELOG's promised adoption path ("re-run `/dev-workflow --init` … to adopt it") actually work — re-running `--init` now proposes the `model: sonnet` addition instead of silently skipping the Current-format skill.

### dev-workflow v1.62.0 / dev-workflow-bundle v1.64.0

- feat(dev-workflow): give the generated `run-tests` skill a skill-side default model (`sonnet`) on its verification subagent dispatch
  - The `run-tests` SKILL.md template in `references/init-mode.md` (and this repo's own project-local `.claude/skills/run-tests/SKILL.md`) now dispatches its verification subagent with `model: sonnet` explicitly passed as the `Agent` tool's `model` parameter. Running the listed test commands / structural checks (jq / readlink / frontmatter validation) is mechanical, so `sonnet` is sufficient — a deliberate skill-side cost choice. `subagent_model` is **not** propagated from `dev-workflow` and there is no caller override: `run-tests` verification is tier-independent and always lightweight, and `test_commands` is an open list where passing unknown args would be problematic.
  - **No behavior change for existing users**: the new default reaches only the generated template and this repo's own `run-tests`. An unconfigured user sees no change, and existing projects' already-generated `run-tests` skills are not auto-updated — re-run `/dev-workflow --init` or add `model: sonnet` to the subagent dispatch by hand to adopt it.

### tidy v1.3.0 / dev-workflow v1.61.0 / dev-workflow-bundle v1.63.0

- feat(tidy): add an optional `Model:` argument and propagate `subagent_model` from dev-workflow Step 6's tidy fallback dispatch
  - `tidy` gains an optional `Model:` field (`sonnet` / `opus` / `haiku`) — an independent optional argument applied as the `model` parameter on its per-iteration reviewer `Agent` dispatch (the same value on every iteration). Absent / invalid → inherit the session model (backward-compatible). Effective only on the Claude Code `Agent`-dispatch path; moot on the reviewer-dispatch-unavailable inline fallback. Ported from the `rules-review` v1.3.0 `Model:` pattern (§ Usage / §1 parse / §5 dispatch), adapted to tidy's iteration loop.
  - `dev-workflow` adds Step 6's `tidy` fallback as a fourth `subagent_model` propagation site via a one-commit coordinated sweep of the four governed-site enumerations: the § Configuration `subagent_model` bullet's `Model:`-propagated clause, the opening `Agent` tool usage bullet's trailing parenthetical (the "two steps / three dispatch sites" count is unchanged — the `Skill(tidy)` `Model:` propagation is not a direct `Agent` spawn), Step 2's Read-sites list, and the Step 6 dispatch body.
  - **No default behavior change**: Step 6 Tidy runs only on Moderate / Complex tasks (the difficulty-skip matrix skips it on Trivial / Simple), whose built-in `subagent_model` default is `inherit`, and the propagation reaches `tidy` only when `simplify` is unavailable and the workflow falls back. An unconfigured user sees no change — this is plumbing for users who set a model id on the `moderate` / `complex` tiers. The built-in `simplify` primary path takes no model (built-in skills expose no argument contract); the simplify→tidy resolution is unchanged.

## 2026-06-12

### dev-workflow v1.60.0 / dev-workflow-bundle v1.62.0

- fix(dev-workflow): add upper-design-document input axis to Step 1.5 task decomposition (auto-triage #92)
  - Category: ambiguity — added new decompose signal for task inputs that are upper-level design documents explicitly enumerating independent work units; updated Precedence paragraph to include the new axis
- fix(dev-workflow): add upfront diff size measurement to Step 10 per-commit Present step (auto-triage #91)
  - Category: ambiguity — Present step now performs a single character-count measurement before rendering, decides verbatim (≤4000 chars) vs condensed (>4000 chars) once, and holds that decision for all files; configurable via `diff_verbatim_threshold` in `.claude/dev-workflow.local.md`
- fix(dev-workflow): clarify simplicity self-audit procedure (auto-triage #93)
  - Category: ambiguity — two Findings improving precision of the Simplicity self-audit reference

## 2026-06-12

### dev-workflow v1.59.0 / rules-review v1.3.0 / peer v2.4.0 / dev-workflow-bundle v1.61.0

- feat(dev-workflow): difficulty-tier-based subagent model selection — **behavior change, opt-out via config**: Trivial and Simple tasks now run the workflow's subagent dispatches on `sonnet` by default (previously the session model). Set `subagent_model: {trivial: inherit, simple: inherit}` in `.claude/dev-workflow.md` or `~/.claude/dev-workflow.local.md` to restore the prior all-inherit behavior on those tiers; Moderate / Complex are unchanged (inherit). The automated rule-update CI does not read this CHANGELOG, so the opt-out path is documented here as the signal complement (handoff measure M7).
  - New `subagent_model` config key — a difficulty-tier → model map (keys `trivial` / `simple` / `moderate` / `complex`; values `sonnet` / `opus` / `haiku` / `inherit`), in the Scalar merge class like the `review_iterations` map. Resolved once in Step 2 from the assessed tier (built-in default `{trivial: sonnet, simple: sonnet}`); initialized to `inherit` before tier assessment, so the `-i` / `--iterations` path (which skips Adjust N) carries no model override — backward-compatible.
  - The resolved value is carried as the `Agent` `model` on the workflow's three direct `Agent` dispatch sites (Step 7's two background launches + Step 11.5), and propagated via a `Model:` argument to the named callees the workflow dispatches: Step 7.5 `rules-review`, and the Step 3 / Step 8 inline reviewer when the resolved reviewer is Claude-family (`ask-peer` / `ask-claude`; external-CLI reviewers `ask-codex` / `ask-gemini` / `ask-copilot` / `ask-agy` use their own models and are excluded).
  - `rules-review` and `ask-peer` gain an optional `Model:` argument (absent = inherit, backward-compatible); `ask-claude` is steered via its existing `claude -p --model` flag (no file change). `publicity-review` gains an optional `Model:` argument and **defaults skill-side to `sonnet`** (its detection task is mechanical secret/path/URL matching) — this applies to every caller, including `dev-workflow-triage`. Per-subagent `effort` control is out of scope (the `Agent` tool exposes only `model`).

## 2026-06-11

### dev-workflow v1.58.0 / dev-workflow-bundle v1.60.0

- feat(dev-workflow): skip low-yield quality steps on low-difficulty tasks via a difficulty-skip matrix — **behavior change**: Trivial tasks now also skip Step 6 Tidy and Step 7.5 Rules Compliance Review, and Simple tasks skip Step 6 Tidy, where previously every difficulty tier ran these steps (handoff measure M6)
  - Extends the Step 2 difficulty assessment's gate from the review-iteration counts (N_plan / N_code) to a step-set matrix, reusing the existing Trivial N=0 skip mechanism (Step 2 pre-marks the row `completed`; the step's entry-point guard recognizes the pre-completed state and passes through, as does the Phase-boundary self-audit). Keyed on the assessed tier alone — no config flag, unconditional — consistent with the v1.45.0 Trivial Step 3 / Step 8 skip; the matrix content is the tuning knob if a tier proves too aggressive. Step 9 (`hooks.on_complete`) is **never** skipped at any tier, since it is a project-configured open list whose callee set varies per project. Skipped steps are recorded in the new `difficulty_skipped_steps` ledger (initialized at Step 2 entry, so it stays well-defined on the `-i` / Adjust-N-skipped path) and surfaced in the Completion summary, so a skip is never silent. The Step 4 rewrite-approach difficulty re-derivation re-marks pre-completed Step 6 / Step 7.5 rows back to `pending` when a higher tier no longer skips them.

### dev-workflow v1.57.0 / dev-workflow-bundle v1.59.0

- feat(dev-workflow): accept a `review_iterations` map form `{plan, code}` to set the Plan Review (Step 3) and Code Review (Step 8) iteration caps independently (handoff measure M5)
  - The scalar form, an absent key, and `-i` / `--iterations` remain fully backward-compatible — each sets both phases to the same value, so the default behavior is unchanged (quality-neutral by construction); adopting the map form is an explicit opt-in. Internally the single review count `N` is split into `N_plan` (Step 3) and `N_code` (Step 8); the Step 2 difficulty cap applies independently to each, and Trivial still zeroes both together. A map value stays in the Scalar merge class (whole-value replace, no per-key cross-layer merge); an absent / non-positive / wrong-type `plan` or `code` key warns and falls back to default `3` for that phase only.

## 2026-06-10

### dev-workflow v1.56.1 / dev-workflow-bundle v1.58.1

- fix(dev-workflow): add Step 5 derived-value claim deferral item (auto-triage #85)
  - Category: wrong-default; body-derived numeric claims (size/step counts) were finalized early and chased through later phases — new Step 5 item 8 defers the figure to the Step 10 entry settledness gate (with an `interactive_commits: false` fallback) behind a grep-able provisional marker.
- fix(dev-workflow): add cross-layer review handoff ledger across Step 6-9 review layers (auto-triage #85)
  - Category: ambiguity; sequential review layers shared no state, so deferred/partially-applied structural findings were re-raised and re-applied per layer — the ledger carries dispositions into each subsequent dispatch (Step 7 background launch, Step 7.5, Step 8 payload, Step 9 review-class hooks) with a resolve-once rule.
- fix(dev-workflow): add iteration-scope instruction to Step 3 / Step 8 review dispatch payloads (auto-triage #83)
  - Category: other; iter 2+ reviewers re-verified the whole deliverable from scratch — the instruction scopes their primary verification to the since-prior-iteration changes with an explicit escalation path (coverage reordered, not reduced).
- fix(dev-workflow): add task-derived-change gate before Step 9 completion hooks (auto-triage #83)
  - Category: missing-branch; hooks.on_complete fired against unrelated pre-existing tracked diffs when all task deliverables were untracked/gitignored — the gate skips the hook list with a skip-reason line, surfaces the unrelated diff as a warning, and fails safe (run hooks on doubt).

### dev-workflow v1.56.0 / dev-workflow-bundle v1.58.0

- feat(dev-workflow): fire the Step 7 code-review background launch per pass — **behavior change**: each Step 8 post-fix re-run (the full Step 7 → Step 7.5 re-entry) now also launches the background code-review dispatch that overlaps the re-run's test phase, where these re-runs previously always dispatched the reviewer sequentially at Step 8
  - Generalizes the "Concurrent first-pass code review launch (first pass only)" paragraph to "Concurrent code review launch (per pass)", sharing the rules-review paragraph's pass definition, and renames the flag pair `first_pass_review_launched` / `first_pass_review_stale` to `code_review_launched` / `code_review_stale` (sibling symmetry with `rules_review_*`) with the same documented init / set / read lifecycle. The launch payload is now composed from Step 8 sub-step 1's review-payload definition as the single parametric source: sub-step 1 gains a conditional continuation item (fixes/rejections summary including any class-level sweep record) so re-run passes hand the reviewer the same context a fresh dispatch would, and sub-step 3's trailing payload list is replaced by a cross-reference to that definition. A re-run launch fires only when a pending Step 8 iteration item remains to collect it (a re-run from the final iteration would be an orphan dispatch); the Step 7-only re-run inside Step 7.5's fix flow still does not re-fire either launch. Both collect points (Step 7.5 sub-step 1 and Step 8 sub-step 1) also gain an explicit error-completion route — an errored background result is treated as not-launched and falls back to a fresh sequential dispatch. Same analysis, payload, and collect points as before — re-run passes only reorder the analysis relative to the test phase; fix-churn runs may discard more speculative dispatches (token cost, no wall-clock regression), the same accepted trade-off as v1.55.0 (handoff measure M1b).

### dev-workflow v1.55.0 / dev-workflow-bundle v1.57.0

- feat(dev-workflow): fire the Step 7 rules-review background launch per pass — **behavior change**: each Step 8 post-fix re-run (the full Step 7 → Step 7.5 re-entry) now launches a background `rules-review` dispatch that overlaps the re-run's test phase, where these re-runs previously always dispatched `Skill(rules-review)` sequentially
  - Generalizes the "Concurrent rules-review launch (first pass only)" paragraph to "(per pass)" with a single pass definition (a Step 7 entry that a Step 7.5 sub-step 1 collect will follow), introduces the explicit flag pair `rules_review_launched` / `rules_review_stale` with a documented init / set / read lifecycle mirroring the sibling code-review launch's discipline, and rewrites the Step 7.5 sub-step 1 collect condition from pass-number-based prose to the state-based `rules_review_launched == true && rules_review_stale == false` check. The Step 7-only re-run inside Step 7.5's fix flow intentionally does not re-fire the launch (no collect point follows it; overlapping that path stays out of scope). The sibling first-pass code-review launch is unchanged (handoff measure M1a; measure M1b covers the code-review side). Same analysis, payload, and collect point as before — the re-run passes only reorder the analysis relative to the test phase.

### dev-workflow v1.54.2 / dev-workflow-bundle v1.56.2

- refactor(dev-workflow): extract Step 3 / Step 8 review-category rubrics into an on-demand reference (no behavior change)
  - Moves the Step 3 plan-review category bodies (a)–(f) and the Step 8 code-review category bodies (a)–(c) verbatim to the new `references/review-categories.md` (§ Plan review categories / § Code review categories). SKILL.md keeps label-only enumerations at both dispatch sub-steps plus an instruction for the reviewer to read the matching section; all bold sub-check labels (`Runtime/language major version upgrades`, `Internal convention citation verification`, `Cross-component sibling coverage`, etc.) are preserved verbatim so external citations (`references/simplicity-self-audit.md`, `references/plan-format.md`) keep resolving. The only non-verbatim change is rebasing the two relative link targets `](references/plan-format.md)` → `](plan-format.md)` inside the moved Step 3 body. Resident SKILL.md size drops from 144,481 to 127,343 chars (−17,138); the rubric loads on demand in the reviewer's context and is never loaded on Trivial (N=0) runs. Same extraction + stable-anchor pattern as v1.54.1 (handoff measure M2; the realized reduction is below the handoff's 20–25k estimate because the actual rubric bodies measure 18.3k).

### extract-rules v1.20.1 / dev-workflow-bundle v1.56.1

- fix(extract-rules): retarget the § Sub-skill caller directive's locator for dev-workflow's Pre-invocation reminder
  - Category: ambiguity; the dev-workflow v1.54.1 extraction moved the `**Pre-invocation reminder**` paragraph from SKILL.md § Step 11 into `references/update-rules.md` § Char-count compaction gate, leaving the cross-skill locator pointing at the old direct location (still resolvable in 2 hops via the retained sub-step skeleton, but no longer literal). Updated the locator to name the reference file.

### dev-workflow v1.54.1 / dev-workflow-bundle v1.56.1

- refactor(dev-workflow): extract Step 10 / Step 11 procedure bodies into on-demand references (no behavior change)
  - Moves the Step 10 (Interactive Commits) procedure body (Procedures 1–9 plus the deferred-bookkeeping pass) to the new `references/interactive-commits.md`, and the Step 11 sub-step 3 (Char-count compaction gate) procedure body to the new `references/update-rules.md`, both verbatim. SKILL.md keeps the runtime-referenced definitions inline: section headings, entry / skip conditions, the `landed_count` / `compaction_applied_count` / `below_threshold_failed_files` cross-step contracts, the § Approval token closed list, and the § Localized summary tokens. Resident SKILL.md size drops from 164,911 to 144,481 chars (−20,430); the two new reference files (23,766 chars total) load on demand only when Step 10 / Step 11 execute. Same extraction + stable-anchor pattern as v1.48.5 (handoff measure M3; the realized reduction is below the handoff's 24–26k estimate because Step 11 sub-steps 1 / 2 stay inline per the agreed criterion).

## 2026-06-08

### peer v2.3.0 / dev-workflow-bundle v1.56.0

- feat(ask-peer): make peer consultation host-aware for Claude Code and Codex
  - Replaces the Claude-subagent-only framing with a host-aware dispatch contract: use Claude Code `Agent` when available, use Codex subagent / delegation surfaces when exposed, and retain the existing inline fallback when reviewer dispatch is unavailable or nested dispatch cannot recurse. The peer personality, review rubric, parallel category merge behavior, and failure-surfacing policy are unchanged.

### rules-review v1.2.0 / dev-workflow-bundle v1.56.0

- feat(rules-review): support host-aware reviewer dispatch while preserving output compatibility
  - Generalizes the Review phase from Claude `Agent`-only dispatch to the current host's reviewer-dispatch mechanism, covering Claude Code `Agent`, Codex subagent / delegation surfaces, and the existing inline sequential fallback. The Markdown report format and exact `No rule violations found` compliant verdict remain unchanged for existing callers.

### tidy v1.2.0 / dev-workflow-bundle v1.56.0

- feat(tidy): make cleanup reviewer dispatch and progress tracking host-aware
  - Reframes the iteration loop around a host-provided reviewer instead of a Claude-only subagent, while keeping main-thread `Edit` application and the fenced JSON return contract unchanged. The task-tracking prose now allows Claude Code Task tools, compatible Codex task tracking, `TodoWrite`, or in-memory iteration state when no progress tools are surfaced.

### dev-workflow v1.54.0 / dev-workflow-bundle v1.55.0

- feat(dev-workflow): wire timestamp/usage measurement into the Step 11.5 self-retrospective subagent
  - Extends `references/self-retrospective.md` §2.1 step 2 to extract `timestamp` and `message.usage` from session jsonl entries (entries missing these fields are skipped for interval computation). Adds §2.1 step 2a interval computation: wall-clock intervals between consecutive assistant entries, user-gate idle exclusion (assistant→user gap), and cumulative `output_tokens` per phase. Minimum data requirement: fewer than 2 valid-timestamp assistant entries skips interval computation gracefully. Measured evidence (approximate seconds, token counts) is embedded in Finding `description` prose — the return schema is unchanged, so the downstream `dev-workflow-triage` consumer needs no coordinated change. Updates §2.2 signal definitions for Token-consumption inefficiency and Development-speed friction to reference measured data. Adds §3 sanitization rule: absolute timestamps → relative intervals only (session timing not leaked). The `Category` enum is deliberately **not** extended (prior Decision from v1.51.0).

### dev-workflow v1.53.0 / dev-workflow-bundle v1.54.0

- feat(dev-workflow): optimize the plan format for review load and in-progress followability
  - Redefined the must-review tier in `references/plan-format.md` § Review guide line from `Highlights + Decisions` to `Overview + Decisions` (Highlights is one Overview bullet, so Overview subsumes it). This fixes a pre-existing inconsistency with § Step 4 presentation order, which already renders Overview-in-full + Decisions-in-full, and gives empty-`Decisions` plans a substantive review anchor (Goal / Approach). Removed the now-stale "When Highlights is omitted, name Decisions alone" special-case; synced the localized ja/en samples, the Template block, the Sizing-guidance wording, and README's "Two-tier presentation" line.
  - § Template now lets Design be an ordered, numbered list of implementation steps when the work is sequential (preferred-when-sequential; by-file otherwise), so the implementer can follow it top-to-bottom. SKILL.md Step 5 may register each Design step as an implementation sub-task (permissive `MAY`, consistent with Step 1's "additions, not replacements" rule); Step 2 gains a one-line pointer.
  - Added a lightweight, one-directional traceability convention (new § Traceability, single source of truth): Test → Design step (recommended), Design → Decision (optional), and the must-review tier carries no back-references. Added a must-review low-load rule paragraph, three § Step 2 self-check items, and a § Step 3 (f) traceability-resolution clause.

## 2026-06-07

### extract-rules v1.20.0 / dev-workflow-bundle v1.53.0

- fix(extract-rules): add ordering/sequencing self-check to Step C4 classification (auto-triage #77)
  - Category: wrong-default; Step C4 lacked a classifier for ordering/sequencing rules derived from incidental session execution order, causing the skill to stage directional rules without checking whether the observed order was intentional. Added item 5 with a self-check, guidance to prefer underlying invariants over directional rules, and an annotation convention (`[NEEDS DIRECTION CONFIRMATION]` prefix) for unconfirmed directional patterns.

### dev-workflow v1.52.0 / dev-workflow-bundle v1.52.0

- fix(dev-workflow): add plan-scope cross-reference to Step 10 commit-plan proposal (auto-triage #78)
  - Category: missing-branch; the commit-plan proposal lacked a cross-reference against declared no-change areas in the approved plan. Added a plan-scope cross-reference that surfaces any collected change overlapping a declared no-change area as "unplanned changes" above the numbered commit list, routed through the existing commit-plan approval gate.
- fix(dev-workflow): extend Resume subtask selection to check per-subtask precondition prose (auto-triage #77)
  - Category: missing-branch; Resume sub-mode treated `depends_on` completion as the only runnability gate, ignoring per-subtask precondition/readiness-gate prose. Extended the no-leftover branch to check each frontier candidate's description for explicit gating prose and ask the user to choose when machine-unverifiable gates exist.

### dev-workflow v1.51.0 / dev-workflow-bundle v1.51.0

- feat(dev-workflow): add token-consumption and development-speed perspectives to the Step 11.5 self-retrospective
  - Extends `references/self-retrospective.md` §2.2 with two new signal types — **Token-consumption inefficiency** (wasteful token spend: cross-turn re-reads, re-derivation of in-context values, unnecessary subagent dispatch, redundant prose) and **Development-speed friction** (disproportionate wall-clock time / round-trips, carrying a "never by dropping review or verification coverage" quality guardrail). §2.3 gains an imperative categorization rule that routes efficiency-class findings to the existing enum values (`wrong-default` when the inefficiency stems from a default-behavior choice, otherwise `other`). The `Category` enum is deliberately **not** extended, so the downstream `dev-workflow-triage` consumer (its 5-value `Category` validator and comment template) needs no coordinated change.

### dev-workflow v1.50.2 / dev-workflow-bundle v1.50.2

- fix(dev-workflow): give Step 7 background-dispatch availability detection a positive criterion (default to parallel)
  - Category: missing-branch; the Step 7 "Availability detection" bullet stated only a negative constraint ("do not let detection collapse to the base `Agent` tool exists") without a positive, checkable criterion for confirming `run_in_background` support, so an orchestrator in a parallel-capable main-thread session could resolve the uncertainty to "unavailable" and silently serialize the Step 7.5 rules-review and Step 8 first-pass code-review background launches. Rewrote the canonical "Availability detection" bullet to add a positive criterion (background dispatch is **available** when `Agent` is exposed AND a `run_in_background` / async-dispatch capability is present → the common interactive-session case, so default to parallel) plus a two-item closed list defining "unavailable" (`Agent` absent — which also covers the non-recursing-subagent case — or `Agent` present but no background/detached dispatch capability, e.g. an older Claude Code), and converted the two "If unavailable" parentheticals to back-references so the closed list is the single definition of "unavailable". Backward-compatible — genuinely background-dispatch-incapable environments still take the sequential path.

## 2026-06-06

### dev-workflow v1.50.1 / dev-workflow-bundle v1.50.1

- fix(dev-workflow): add target-file constraint/invariant audit to simplicity-self-audit (auto-triage #76)
  - Category: missing-branch; the Step 2 Simplicity self-audit had no prompt to read the explicit constraints and invariants declared in target files before finalizing the implementation approach. Added a "Target-file constraint-and-invariant audit" checklist item with an unconditional per-file scan trigger.
- fix(dev-workflow): add Markdown block-element structural integrity audit to Step 5 (auto-triage #76)
  - Category: missing-branch; the Step 5 late-stage scaffolding self-audit had no check for adjacent block elements in Markdown files missing blank-line separators. Added sub-check (v) to scan all edited .md files and fix inline before proceeding.
- fix(dev-workflow): add alias/derived-form sweep to Step 5 full-repo grep (auto-triage #75)
  - Category: missing-branch; the Step 5 full-repo grep used a two-stage structure (exact + fuzzy) with no stage for alias and derived-form variants, so rename/migration tasks could miss same-concept usages under alternate spellings. Extended to a multi-stage structure with a new stage (iii) for alias/derived-form sweep.

### dev-workflow v1.50.0 / dev-workflow-bundle v1.50.0

- feat(dev-workflow): parallelize the Step 8 first-pass code review via a background `Agent` (first pass only)
  - **Backward compatible** — when background `Agent` dispatch is unavailable, when N=0 (Trivial), or on any re-run, Step 8 dispatches the reviewer sequentially exactly as before. Building on v1.49.0's concurrent rules-review launch, Step 7 now also optionally launches the Step 8 first-pass `reviewer` skill (e.g. `Skill(ask-peer)`) as a background subagent (`run_in_background`) so its read-only analysis overlaps the `test_commands` phase. Step 8 sub-step 1 collects that result when it is still fresh and dispatches fresh otherwise. Two tracking variables govern the decision: `first_pass_review_launched` (set on a successful dispatch, gated `run_in_background` available ∧ N≥1 ∧ first pass) and `first_pass_review_stale` (set when an intervening edit changes the analyzed diff before the collect point — a `test_commands` failure fix in Step 7, or any fix Step 7.5 applies; both initialized unconditionally before the availability branch). The discard decision is owned by Step 8 sub-step 1, which reuses the background result only when `first_pass_review_launched` is true and `first_pass_review_stale` is false. Extends the line-81 invariant from "Step 7's concurrent rules-review launch" to "Step 7's two concurrent background launches" (the step count stays two: Step 11.5 + Step 7). Re-runs of Step 8 (sub-step 3) stay sequential. Validated via a Step 0 smoke test confirming the configured reviewer (default `ask-peer`, via its SKILL.md § Process 1 inline fallback) runs in a background general-purpose subagent.

### dev-workflow v1.49.0 / dev-workflow-bundle v1.49.0

- feat(dev-workflow): parallelize Step 7 tests and Step 7.5 rules-review via a background `Agent` (first pass only)
  - **Backward compatible** — when background `Agent` dispatch is unavailable in the environment, Step 7.5 invokes `Skill(rules-review)` sequentially exactly as before. After `check_commands` pass, Step 7 now optionally launches the first-pass `Skill(rules-review)` as a background subagent (`run_in_background`) so its read-only analysis overlaps the `test_commands` phase; Step 7.5 sub-step 1 collects that result (or invokes directly on re-runs, or after the background result was discarded following a test failure). Only `rules-review` is backgrounded — `run-tests` has no inline fallback for the nested-`Agent`-unavailable case (`rules-review` does, per its SKILL.md § 5). Relaxes the line-81 invariant from "only Step 11.5 directly spawns `Agent`" to the two-step set (Step 11.5 + Step 7's concurrent rules-review launch). Re-runs (Step 7.5 sub-step 3.b, Step 8 sub-step 3) stay sequential. Validated via a Step 0 smoke test of the background-`Agent` mechanism.

### dev-workflow v1.48.7 / dev-workflow-bundle v1.48.7

- fix(dev-workflow): reformat the Step 4 plan Review guide directive into a multi-line blockquote for readability
  - Category: ambiguity; the `> Review guide` directive at the top of the Step 4 plan crammed the must-review and reference section groups onto one line with a `|` separator, making it hard to tell at a glance which sections need the user's judgment versus which are reference detail. Reformatted it in `references/plan-format.md` (§ Template sample, § Review guide line defining sentence, and the paired bilingual en/ja samples) into a multi-line blockquote — a heading line followed by one bullet per category.

## 2026-06-05

### dev-workflow v1.48.6 / dev-workflow-bundle v1.48.6

- fix(dev-workflow): extend Step 4 prose-language audit to check concept word density (auto-triage #72)
  - Category: ambiguity; Step 4's pre-presentation language self-audit only verified that prose body and headings used the target language, missing the case where many English concept words remained embedded in Japanese prose (when localization specifies a native-language output). Extended the audit to also flag excessive untranslated concept words, distinguishing allowed identifiers (type/function/config-key names, API/flag names) from concept words that must be translated.
- fix(dev-workflow): add candidate-list implementation boundary to Step 4 presentation (auto-triage #72)
  - Category: ambiguity; when Step 4 presents a multi-candidate proposal menu with a recommended first item, the execution model — only the recommended item is implemented this run, the rest are record-only candidates — was not clear from the presentation. Added a Step 4 presentation rule requiring candidate-list plans to state explicitly what is implemented this run, what is record-only, and that sequential execution of multiple items needs separate task decomposition.
- fix(dev-workflow): add Step 7 branch for EXECUTION_ERROR + pre-declared degraded procedure (auto-triage #71)
  - Category: missing-branch; Step 7's enumerated pause gates covered only "failure after 3 retries" and "scope violation", with no branch for an execution-environment error (external resource contention) when the plan had pre-declared a degraded procedure. Added a Step 7 branch that auto-applies a plan-agreed degraded path with a one-line note and only falls to a user gate when no degraded path was declared.
- fix(dev-workflow): broaden Step 11 skip guard for transitive wrapper hooks (auto-triage #71)
  - Category: missing-branch; Step 11's extract-rules skip guard keyed on a literal name match against hook entries, so a wrapper hook entry that transitively invokes extract-rules would not be recognized and the guard would silently fail to fire. Broadened the guard to detect the conversation scan via output-based evidence (output contains `staged_count` or `promoted_count`) rather than literal name matching.
- fix(dev-workflow): add same-session re-invocation continuation branch to --resume (auto-triage #69)
  - Category: ambiguity; the Resume sub-mode did not state how a `--resume` re-invocation should behave when the named subtask is already `in_progress` and mid-execution in the current session — a literal reading could destructively restart from the planning step. Added a "Same-session re-invocation" branch to route to the current pause point (preserving in-session progress) when in-context evidence of prior progress exists.
- fix(dev-workflow): add peer-dependency compatibility self-audit for major version bumps (auto-triage #66)
  - Category: missing-branch; Step 2's author-side Simplicity self-audit had a primary-source check for an updated library's API/config but no check that a major-bumped dependency's declared peer range is compatible with the already-resolved version of a co-existing core dependency — the equivalent compatibility check existed only in the Step 3 reviewer, creating a one-step detection-lag asymmetry. Added a symmetric author-side self-audit bullet.

### dev-workflow v1.48.5 / dev-workflow-bundle v1.48.5

- refactor(dev-workflow): extract the Step 2 Simplicity self-audit checklist into a dedicated reference to cut SKILL.md resident size
  - Moved the full Step 2 Simplicity self-audit checklist out of `SKILL.md` into a new `references/simplicity-self-audit.md`, replacing the inline block with a one-line delegation pointer that keeps the `Simplicity self-audit` label intact — the stable phrase anchor used by Step 3 reviewer category (a), Step 5 late-stage scaffolding self-audit, `references/plan-format.md`, and `references/task-decomposition.md` still resolves. `SKILL.md` shrinks from ~176k to ~149k chars, lowering the per-turn resident-context cost on every run; the checklist now loads on demand at Step 2. Step 3 reviewer instruction updated to read the new reference. No runtime behavior change.

### dev-workflow v1.48.4 / dev-workflow-bundle v1.48.4

- feat(dev-workflow): two-tier Step 4 plan presentation + Overview Highlights slot + readability-first sizing guidance
  - Step 4 now presents a condensed plan in chat (the `> Review guide` line + Overview, Decisions, and Design as a file-list) while the full plan body is written to the Plan Mode file that the `ExitPlanMode` approval modal renders — so the review surface stays scannable without losing detail. Added an omittable `Highlights` Overview slot that surfaces high-impact items (DB migrations, destructive operations, breaking changes) at the top of every plan, a `> Review guide` line convention (must-review = Highlights/Decisions, reference = Design/Test plan/Risks) with a localization rule + paired bilingual sample, and rewrote `references/plan-format.md` § Sizing guidance to be readability-first (cut only redundancy/padding, never review-load-bearing detail, with an operational padding test). `SKILL.md` Step 4 sub-step 2 and `README.md` updated to match.

## 2026-06-04

### dev-workflow v1.48.3 / dev-workflow-bundle v1.48.3

- fix(dev-workflow): add authoritative-tool cross-check sub-clause to Step 5 item 5 (auto-triage #65)
  - Category: wrong-default; Step 5's implementation self-check had no clause directing the agent to back up load-bearing enumeration claims with the authoritative tool that consumes the result (e.g. type checker, language server) rather than treating hand-written search results alone as definitive. New sub-clause added to Step 5 item 5.
- fix(dev-workflow): add externally-blocked primary objective tracking to Step 2 Simplicity self-audit (auto-triage #64)
  - Category: wrong-default; when a subtask's primary objective is blocked by an external dependency, the plan's default was to record the deferral in prose only rather than promoting it to a tracked, first-class follow-up subtask. New bullet in Step 2 Simplicity self-audit directs the agent to treat externally-blocked primary objectives as first-class tracked deferrals.
- fix(dev-workflow): add skip guard for already-run extract-rules conversation extraction in Step 11 (auto-triage #64)
  - Category: missing-branch; Step 11's conversation-based rule-extraction sub-step had no check for whether the same extraction had already run via the on_complete hook earlier in the session — double-extraction could advance the staged-promotion counter by two observations for a single session. New guard directs the agent to skip Step 11 extraction when the hook already ran it this session.
- fix(dev-workflow): add execution-time deferral/exclusion gate to Completion subtask flow (auto-triage #63)
  - Category: missing-branch; the subtask Completion flow had no mandatory gate checking whether in-scope work items were excluded, deferred, or discovered as unassigned during implementation/testing — items recorded only in prose were invisible to --resume and would be permanently skipped. New "Execution-time deferral/exclusion gate" paragraph added before the numbered subtask-completion steps.
- fix(dev-workflow): add cleanup step for per-agent staging documents in Completion section (auto-triage #62)
  - Category: missing-branch; Completion had no branch to delete per-agent staging files generated by dispatched review subagents during the run — these accumulated as untracked noise in the working tree. New "Derived staging artifact cleanup" paragraph added at the top of the Completion section, using `rm -f .claude/plans/<slug>-agent-*.md`.

## 2026-06-03

### dev-workflow v1.48.2 / dev-workflow-bundle v1.48.2

- fix(dev-workflow): add generated-artifact regeneration check for major upgrades (auto-triage #61)
  - Category: missing-branch; Step 3 Focus area (a) had no check for generated artifacts (lock files, config snapshots, derived fixed files) whose non-regeneration rationale rests solely on format compatibility — new major versions may embed additional metadata into those artifacts even when the format-version integer is unchanged, making format compatibility and regeneration necessity orthogonal concerns. New bullet directs plan reviewers to verify both axes independently and to require an empirical validation step when the non-regeneration rationale rests solely on format compatibility.

### ask-peer v2.2.10 / dev-workflow-bundle v1.48.2

- fix(ask-peer): add verification-safety principle to peer agent personality (auto-triage #61)
  - Category: missing-branch; Core Principles had no guidance for when a peer reviewer suggests or performs verification steps requiring state changes (VCS checkouts, package installs, build artifacts) — uncommitted working-tree changes could be silently destroyed mid-verification. New Verification safety bullet directs the peer to prefer non-destructive read-only verification by default, and when state-mutating steps are unavoidable to snapshot affected state (e.g. `git stash -u` for VCS working trees), perform the verification, then restore.

## 2026-06-02

### dev-workflow v1.48.1 / dev-workflow-bundle v1.48.1

- fix(dev-workflow): add commit-split boundary alignment check to Step 2 self-audit (auto-triage #60)
  - Category: ambiguity; Step 2 self-audit had no check confirming that a proposed commit-split boundary aligns with the file-level granularity of the staging mechanism — splits planned across changes within the same file could not be realized at staging time. New bullet directs plan authors to confirm commit boundaries fall on file boundaries before finalizing split proposals.
- fix(dev-workflow): add blast-radius classification primary-source verification to Step 2 self-audit (auto-triage #59)
  - Category: ambiguity; Step 2 had no audit item requiring primary-source confirmation before using scope classifications (distributed vs. internal-only) as Decisions rationale — an unverified claim led to an incorrect plan boundary that required user correction at the Step 4 gate. New bullet directs plan authors to verify distribution-status and blast-radius classifications against actual registration or placement before citing them.
- fix(dev-workflow): add deferred-work tracking vocabulary to Step 2 self-audit (auto-triage #59)
  - Category: ambiguity; when presenting deferred scope as an option, the term "delegate to a separate task" conflated "tracked subtask split" (state preserved, resumable) and "untracked separation" (memo-only, no follow-up obligation), causing the user to ask for clarification. New bullet requires the plan to distinguish these two paths and state their tracking implications when deferring scope.
- fix(dev-workflow): add deferred-work surfacing in fixed location to Step 2 self-audit (auto-triage #59)
  - Category: missing-branch; deferred scope decisions were buried in rationale prose with no fixed, user-reachable location capturing what was deferred, why, and the intended follow-up flow — two successive clarification requests from the user were needed to locate the decision. New bullet requires deferral records to appear at a dedicated, reachable anchor (follow-up notes, Risks/Context section, or equivalent).
- fix(dev-workflow): add pathspec to Step 10 d. Commit templates to prevent hook scope expansion (auto-triage #58)
  - Category: wrong-default; the Commit sub-step command templates (`git commit -m` / `git commit -F - <<EOF`) lacked `-- "<path-1>" "<path-2>" ...` pathspec, so any auto-staging hook running between Stage and Commit could widen the commit beyond the staged scope, requiring a reset and re-commit. Templates now include the pathspec-scoped form and a one-line note explaining that this is a defense against inter-step re-staging.
- fix(dev-workflow): add plan-deferred edits application point before Step 10 Procedure 1 (auto-triage #57)
  - Category: ambiguity; neither Step 5 nor Step 10 specified where to apply edits the plan explicitly deferred to commit time (e.g. CHANGELOG entries, version-bump lines) — the executing agent had to infer the application timing ad-hoc. New paragraph at Step 10 entry directs the agent to apply plan-deferred bookkeeping edits before Procedure 1 collects the working tree, with no user gate, so they are captured in the commit grouping.

### dev-workflow v1.48.0 / dev-workflow-bundle v1.48.0

- feat(dev-workflow): **Behavior change — Step 11.5 (Self-Retrospective) now runs regardless of task difficulty** — Step 11.5 fires on every run where `self_retrospective.feedback` is configured, including Simple/Trivial tasks that previously hard-skipped it. The Step 2 difficulty assessment now gates only the review-iteration count N (Step 3 / Step 8); it no longer gates the self-retrospective. Resolves dev-workflow-issues #55 (remove the Simple/Trivial hard-skip rather than add an opt-out flag) and #56 (separate the two concerns the difficulty assessment was gating). Removed the now-dead "Manual re-run (same-session only)" path — its only trigger, recovery from an auto-skip, no longer exists — while preserving the multi-instance jsonl-mismatch safeguard in `references/self-retrospective.md` §1.4. Swept all 11 difficulty-gating sites across SKILL.md / README.md / `references/self-retrospective.md` (canonical + dev-workflow-bundle copy). **For existing users**: a project with `self_retrospective.feedback` set will now see the Step 11.5 preview + approval gate at the end of Simple/Trivial runs.

## 2026-06-01

### ask-peer v2.2.9 / dev-workflow-bundle v1.47.1

- fix(ask-peer): add session-loaded primary-source verification clause to Planning Focus (auto-triage #54)
  - Category: other; Reviewer's Planning audit list had no clause directing the reviewer to consult session-available primary sources (loaded tool schemas, the run's own successful invocations, file declarations the reviewer can read) before reporting absence as a hypothesis to challenge — false-positive findings cost an orchestrator round-trip to re-cite the same source already in scope. New clause inserted before `internal reference-doc sample-code verification` with explicit boundary disambiguation; principle abstract + skill-development examples in parentheses per distribution rule.
- refactor(ask-peer): split Planning / Code Review-Focus run-on bullets into nested lists (behavior unchanged, clause wording verbatim)
  - Readability / diff-reviewability: the Planning Review-Focus bullet was a single semicolon-joined run-on of ~15 named audit clauses (and the Code bullet appended one more); split each clause into its own nested bullet so diffs no longer collapse to a one-line replacement and clause coverage is scannable. Verified verbatim-preserving (rejoining the nested bullets with `; ` reproduces the prior lines byte-for-byte); the canonical and dev-workflow-bundle copies were updated in sync.
- fix(ask-peer): add dispatch-unavailable inline fallback to Process + single-shot review degenerate-case handling (CHANGELOG backfill for the commit "enhance process description for subagent dispatch and feedback handling")
  - Category: missing-branch; Process step 1 assumed subagent dispatch is always available — added a fallback directing the main thread to adopt the Peer Agent Personality inline when the `Agent` tool is absent or nested dispatch is blocked.
  - Category: ambiguity; the "confirm Issue / Goal / Constraints first" checklist read as a blocking gate with no single-shot guidance — added a bullet directing the reviewer to state working assumptions inline and proceed when no round-trip channel exists.

### dev-workflow v1.47.1 / dev-workflow-bundle v1.47.1

- fix(dev-workflow): add platform-capability-dependent default change audit to Step 2 Simplicity self-audit (auto-triage #53)
  - Category: missing-branch; Step 2 Simplicity self-audit had no audit item for default-behavior changes that depend on a specific execution-environment capability not uniformly available across the target deployment / runtime environment set, so environment-specific absence surfaced only at Step 10 commit-approval and forced a full rewind. New bullet directs plan authors to enumerate target environments and confirm uniform availability before adopting an exclusive switch as Recommendation, and to surface a conditional-fallback design as a co-equal Decisions Alternative when uniform availability cannot be confirmed.

### dev-workflow v1.47.0 / dev-workflow-bundle v1.47.0

- feat(dev-workflow): **Prefer the Task tools (`TaskCreate` / `TaskUpdate` / `TaskList`) for session task tracking, with `TodoWrite` as the fallback** — Claude Code v2.1.142 made the Task tools the default (disabling `TodoWrite` by default), so the workflow now registers phases via one `TaskCreate` per phase (issued in a single upfront burst to preserve the "register all phases upfront / don't drop steps" guarantee), marks status via `TaskUpdate`, and reads task status at GATE / phase-boundary self-audit checkpoints via `TaskList` (resolving by subject, since `taskId` is auto-numbered). Where the Task tools are unavailable (e.g. the VSCode extension, or Claude Code before v2.1.142), the workflow uses the equivalent `TodoWrite` operations instead — a new "Tool availability" note in Step 1 documents the equivalence and `allowed-tools` retains `TodoWrite` alongside the Task tools, so behavior is preserved across environments (no breakage). The status enum (`pending` / `in_progress` / `completed`) is unchanged. The `Parent-task TodoWrite row` (references/task-decomposition.md) is renamed `Parent-task progress row`, and its single-`in_progress` rationale is rewritten as an operational convention rather than asserting the Task tools hard-enforce a single `in_progress` (that enforcement is unverified from primary source).

### extract-rules v1.19.0 / dev-workflow-bundle v1.47.0

- feat(extract-rules): **Prefer the Task tools for `--compact` per-file progress tracking, with `TodoWrite` as the fallback** — Step CP2's per-file pre-register pass now uses `TaskCreate` / `TaskUpdate` (status enum unchanged; per-file outcome continues to be carried in the per-file record, not the task status), and falls back to the equivalent `TodoWrite` operations where the Task tools are unavailable (e.g. the VSCode extension). `allowed-tools` gains `TaskCreate, TaskUpdate` and retains `TodoWrite`. Tracks the Claude Code v2.1.142 default task-tool change; no change to compaction logic.

### tidy v1.1.0 / dev-workflow-bundle v1.47.0

- feat(tidy): **Prefer the Task tools for iteration progress tracking, with `TodoWrite` as the fallback** — Step 3's iteration pre-register pass now uses `TaskCreate` / `TaskUpdate` (status enum unchanged; the early-convergence skip note moves to the task `description` field). The fallback paragraph (renamed `Task tools unavailable fallback`) now covers both cases: use `TodoWrite` where the Task tools are unavailable but `TodoWrite` is present (e.g. the VSCode extension), and hold iteration state in main-thread context only where neither is surfaced (the nested-subagent case). `allowed-tools` gains `TaskCreate, TaskUpdate` and retains `TodoWrite`. Tracks the Claude Code v2.1.142 default task-tool change.

### dev-workflow v1.46.0 / dev-workflow-bundle v1.46.0

- feat(dev-workflow): **Step 6 (Tidy) now prefers the built-in `simplify` skill** — Step 6 invokes `Skill(simplify)` first and falls back to the bundled in-house `Skill(tidy)` (after a one-line fallback note) only on Claude Code versions that lack the built-in `simplify`. The Step 6 phase name "Tidy" and related labels (Tidy-revival check, etc.) are intentionally kept — only the invoked callee and the callee-enumeration cross-references (frontmatter `allowed-tools`, § No-Stall Principle, § Progress Visibility, § Step 11.5 Agent-usage, § Step 7.5) gain the `simplify` / `tidy` pairing. **Behavior change**: on Claude Code with built-in `simplify`, the Step 6 cleanup pass is now performed by `simplify` rather than `tidy`. Note: `simplify` is a built-in with no on-disk SKILL.md, so its argument interface is unverified — the `simplify` path passes no scope argument and only an optional best-effort `custom_instructions` hint; should a future upstream re-scope `simplify`, Step 6 behavior could shift silently (revisit on the next Claude Code update).

## 2026-05-27

### dev-workflow v1.45.0 / dev-workflow-bundle v1.45.0

- feat(dev-workflow): **Add `Trivial` difficulty tier** (below Simple) to Step 2's difficulty assessment — Trivial tasks (typo, one-line edit, config value change with a single unambiguous solution) now skip Step 3 (Plan Review) and Step 8 (Code Review) entirely (`N = 0`). Simple stays at `N = 1`, Moderate at `N = min(2, N)`, Complex unchanged — the new tier is purely additive, so Simple/Moderate/Complex tasks behave exactly as before. Trivial classification is gated conservatively: only a genuinely self-evident change qualifies, and any doubt (multi-part edit, non-unique fix, approach uncertainty) falls to Simple or above so internal review is retained. Even for Trivial tasks the Step 4 plan-approval gate, Step 7 / 7.5 checks, and `hooks.on_complete` still run, so review is reduced — not eliminated. Step 3 / Step 8 entry points, the Step 7.5→8 GATE, the Step 4 completed-row verification, and the "reviewed in Step 3" prose (SKILL.md / `references/plan-format.md` / README) are all made `N=0`-aware; Step 11.5 (Self-Retrospective) hard-skip and the plan `Difficulty` enum are extended from Simple to Simple/Trivial. Opt out per invocation by passing `-i N` (explicit iteration counts bypass difficulty auto-adjustment as before).

### dev-workflow v1.44.0 / dev-workflow-bundle v1.44.0

- chore(release): synchronize dev-workflow and dev-workflow-bundle plugin versions to v1.44.0 (dev-workflow +39 patch jump from v1.40.1, dev-workflow-bundle unchanged — resolve accumulated version skew)

## 2026-05-24

### extract-rules v1.18.0 / dev-workflow-bundle v1.44.0

- feat(extract-rules): **Default change — `compaction_threshold: 40000`** — set `compaction_threshold: 32000` in `.claude/extract-rules.local.md` or `~/.claude/extract-rules.local.md` to opt out and restore the prior 80% buffer. The new default matches Claude Code's per-file warning threshold (40k chars, observed in Claude Code 2.1.x) exactly — `--compact` now fires the gate at the same point the user sees the warning, rather than 8k chars earlier. **Behavior change — `consolidation_proposals` auto-apply** — to restore v1.17.0 detection-only behavior (the only available opt-out path, coarse-grained), set `min_cluster_size: 99999999` in `.claude/extract-rules.local.md` to disable consolidation detection entirely. There is intentionally **no fine-grained flag** for "keep detection, skip auto-apply" — Step CP2 (c2)'s main-thread synthesis is wired directly into the apply phase, and the caller (e.g. `dev-workflow` Step 11 with `compact_rules: true`) provides the user-gate layer for per-file accept/reject. Also changes the `--compact` mode's apply behavior: `consolidation_proposals` are now **auto-applied via main-thread synthesis** (new Step CP2 (c2) phase) — the main thread reads each cluster's `cluster_bullets[].snippet` as a byte-level prefix seed, extracts the verbatim full bullet, and synthesizes the corresponding `Edit` calls (insertion of `merged_principle.text` above `cluster_bullets[0]` + per-replacement `delete` / `cross_ref` edits, with `cross_ref` preferred on ambiguous emission). The subagent contract (analysis-only, `Forbidden tool calls`, `merged_principle.text` is detection output only) is **preserved** — the auto-apply layer lives entirely in the main thread, so the subagent never emits `Edit` calls. `applied_edits_count` is now the sum of compaction-mechanical edits + consolidation-synthesized edits, and the `(d) Per-iter convergence check` uses this widened counter uniformly. **Behavior change from v1.17.0**: v1.17.0 established `consolidation_proposals` as detection-only with no auto-apply (sibling to `structural_notes` as caller-judgment output). This release adds the main-thread auto-apply layer, so a caller invoking `--compact` directly (without an outer user-gate like `dev-workflow` Step 11) no longer sees the consolidation cluster as a "proposal to act on" — the file is mutated in-place. The `dev-workflow` Step 11 compaction approval gate (`compact_rules: true`) still surfaces the per-file diff and accepts/rejects atomically; `structural_notes` remain caller-judgment as before. New `Compact cross_ref wording guidance` subsection in `references/compaction-mode.md` documents the soft wording targets (≤150 chars per `cross_ref_text`, ≤400 chars per `merged_principle.text`) the subagent should aim for, with anchors and explicit non-enforcement labeling. **Downstream automation note**: automated runs that invoke `extract-rules --compact` from CI / scheduled jobs and do not pin `compaction_threshold` explicitly will see the threshold raised from 32000 to 40000 on first run after upgrading — files in the 32001–39999 range that previously triggered will no longer trigger. Pin `compaction_threshold` explicitly in `.claude/extract-rules.local.md` if a stable threshold is required. The auto-apply default cannot be pinned to v1.17.0 detection-only behavior without disabling consolidation entirely via `min_cluster_size` (see above).

### extract-rules v1.17.0 / dev-workflow-bundle v1.43.0

- feat(extract-rules): extend `--compact` mode with consolidation detection — the dispatched subagent now additionally identifies clusters of ≥`min_cluster_size` related bullets (default 3) per the new consolidation heuristics in `references/compaction-mode.md` § Consolidation heuristics, and emits cluster proposals (`cluster_bullets` + `merged_principle` + `replacements` with `delete` / `cross_ref` strategy) in the new `consolidation_proposals[]` field of each per-file record. Detection-only — proposals are not auto-applied (sibling to existing `structural_notes` as caller-judgment output). Top-level `status: "compacted"` mapping extended to a 3-way OR (`applied_edits_count > 0` OR non-empty `consolidation_proposals[]` OR non-empty `structural_notes[]`) — the `structural_notes` arm incidentally fixes a latent bug where `structural_notes`-only files previously fell into `no-actionable` and were silently dropped by callers branching on `compacted`. Explicit-paths mode now runs through per-file dispatch for under-threshold paths as well (the `skipped-below-threshold` enum value's semantic widens from "CP2 skipped entirely" to "compaction skipped because already below threshold, but CP2 still ran for the consolidation pass"); discovery mode threshold filter is unchanged — to scan small files for clusters, pass them explicitly via `--compact <path>`. New `min_cluster_size` configuration (default 3, set to a very large value such as `99999999` to disable consolidation while keeping compaction — matches the `compaction_threshold` opt-out sentinel convention). Caller wiring for `consolidation_proposals` user-gate display (`dev-workflow` Step 11 sub-step 3 gate expansion) is intentionally deferred to a follow-up subtask; existing callers see `consolidation_proposals` as an additive optional field they may safely ignore. Top-level `reason` token `"no files exceed threshold"` is renamed to `"no targets resolved"` to reflect the broadened Step CP1 step 4 semantics (an empty target set now also covers the "no explicit paths passed" case, not just the discovery-no-hits case).

## 2026-05-23

### extract-rules v1.16.0 / dev-workflow-bundle v1.42.0

- feat(extract-rules): **Behavior change — observation-count gating for project-level patterns in incremental modes**. 1st observation of a project-level pattern via `--from-conversation` / `--from-pr` now lands in `staging_output_dir` (default `.claude/rules-staging`, outside Claude Code's `.claude/rules/**` auto-load scope) instead of `<output_dir>/project.md` (the single hybrid file for project-level patterns). Promotion to canonical occurs on the 2nd observation in a later incremental run, or when matched by a subsequent `--update`. Language / framework / integration patterns bypass staging and land directly as before. To opt staging back into auto-load, set `staging_output_dir` to `output_dir` (or any path under `output_dir`). **Downstream automation note**: automated runs that grep `<output_dir>/project.md` for new entries immediately after `--from-pr` will see fewer entries on first run — set `staging_output_dir: <output_dir>/staging` to keep entries inside the auto-load scope, or query the staging file path explicitly.

### extract-rules v1.15.0 / dev-workflow-bundle v1.41.0

- feat(extract-rules): **Default change — `examples_output_dir: .claude/rules-extras`** — set `examples_output_dir: .claude/rules` (or any path under `output_dir`) in `.claude/extract-rules.local.md` or `~/.claude/extract-rules.local.md` to opt out and keep `.examples.md` co-located with rule files under `output_dir`. The new default routes `.examples.md` writes outside Claude Code's `.claude/rules/**` auto-load scope so examples no longer consume context on session start. Existing projects keep their already-written examples in place — run `Skill(extract-rules) --restructure` to migrate them to the new default location. Also fixes the SKILL.md / examples-format.md annotation that previously claimed `.examples.md` is "not auto-loaded" — that claim was based on an unverified `paths:` frontmatter assumption; the actual auto-load scope is directory-based. **Downstream automation note**: automated runs that invoke `extract-rules --update` from CI / scheduled jobs do not read CHANGELOG; on the first run after upgrading they will silently start writing examples to the new default path. Pin `examples_output_dir` explicitly in `.claude/extract-rules.local.md` if those pipelines need stable output locations.

## 2026-05-22

### dev-workflow v1.40.1 / dev-workflow-bundle v1.40.1

- fix(dev-workflow): state custom_instructions absent-key behavior inline on Step 6 Tidy dispatch line (auto-triage #40)
  - Category: missing-branch; Step 6 Tidy dispatch line passed custom_instructions through tidy's natural-language field without specifying the absent-key behavior, forcing a blank-slate executor to cross-reference Configuration to infer the omit-path. Added inline absent-key clause (omit field on unset/empty; forbid (none) / empty string / fabricated default) plus a general principle for caller-skill dispatch fields driven by optional config keys.
- fix(dev-workflow): forbid Base ref / --base-commit pass-through on Step 6 Tidy dispatch line (auto-triage #40)
  - Category: ambiguity; Step 6 Tidy relied on tidy's default working-tree mode (untracked-included) for scope correctness but the dispatch line did not name that dependency. Sibling Steps 7 / 7.5 invoke their callees with --base-commit <sha>, creating an extrapolation pull that would silently switch tidy to committed-history mode and drop untracked files. Added load-bearing "Do not pass Base ref / --base-commit <sha>" clause + sibling-asymmetry rationale + general principle (ii) on default-mode-vs-sibling-convention asymmetry.
- fix(dev-workflow): add Step 6 pre-dispatch rename-sweep self-audit for synonym / derived-form residue (auto-triage #39)
  - Category: missing-branch; Completion-time integrity check caught rename target synonyms / derived forms (gerunds, nominalizations, conceptual paraphrases) left behind by mechanical search-and-replace even though Step 6 cleanup terminated with "no actionable findings". Step 6 had no rename-aware self-audit. Added new sub-step 1 (Pre-dispatch rename-sweep self-audit) firing on rename diffs; positions Step 6 as primary detection point with later integrity checks as backstop.
- fix(dev-workflow): add Callee verdict transcription is not a turn boundary clause to No-Stall Principle (auto-triage #39)
  - Category: ambiguity; § No-Stall Principle's existing rules did not cover the specific stall pattern where the orchestrator re-transcribes a callee's actionable verdict at the end of its response and stops. New clause adjacent to the no-summary-turn paragraph forbids verdict-transcription-as-turn-end, enumerates the next-action options, lists forbidden patterns ("shall I proceed?", "ここまでで一区切り" prose summaries, wait-for-"続けて"), and extends to sub-step completion prose.
- fix(dev-workflow): restructure Step 11 compaction-gate preamble with why-fired + decision-axes prefix slots (auto-triage #38)
  - Category: ambiguity; Step 11 compaction approval gate preamble previously rendered 4 mechanical metrics only; empirical observation showed users misread the gate as "compaction failure report" because the reason for opening the gate was implicit. Restructured Step 11 Required slots from 4 metric items to 6 slots: slot 1 "Why this gate fired" + slot 2 "Decision axes" precede the 4 mechanical metrics. 3-5 items format constraint explicitly relaxed to 6 for Step 11. Slots 1-2 carry class-level extensibility notes for future multi-root-cause gates.
- fix(dev-workflow): add workproduct-independence + dead-on-arrival axes to Step 1.5 decomposition criteria (auto-triage #38)
  - Category: missing-branch; Step 1.5 Normal sub-mode decomposition criteria were heavily weighted on the verification-path primary signal alone. Tasks with a single verification surface but independently shippable units (new skill + caller switch, foundational refactor + consuming feature) were incorrectly classified as no-decompose, requiring user pushback. Added two positive-signal axes: workproduct-independence and dead-on-arrival acceptability. Precedence section expanded with: new axes override the subtask-too-small overhead veto, atomicity veto remains absolute, multi-axis disagreement defaults to decompose-favoring.

### extract-rules v1.14.1 / dev-workflow-bundle v1.40.1

- fix(extract-rules): add explicit Forbidden tool calls section to --compact subagent prompt (auto-triage #38)
  - Category: missing-branch; --compact subagent prompt previously had only a soft 1-sentence contract bullet ("subagent does not call Edit directly") which the analysis subagent could ignore. Promoted to a top-level § Forbidden tool calls section with a closed enumeration of forbidden tools (Edit / Write / NotebookEdit / Bash file-write patterns), 2-layer Pattern A rationale, anti-pattern self-recognition prompt ("If you find yourself reasoning..."), and class-wide extension hook for Pattern A sibling subagents.
- fix(extract-rules): require verbatim character-class preservation in --compact mechanical_edits old_string (auto-triage #38)
  - Category: other; --compact subagent unconsciously normalized lookalike characters (fullwidth vs halfwidth parens, em-dash vs ASCII hyphen, ideographic space, ellipsis variants) during old_string extraction, producing strings that visually match but byte-mismatch the source. Edit silently skipped via no-op fallback, was misread as overlap-skip. Added a load-bearing bullet to mechanical_edits schema enumerating the character classes to preserve verbatim, the failure-mode signature (low applied_edits_count), and a self-recognition prompt.

### dev-workflow v1.40.0 / dev-workflow-bundle v1.40.0

- feat(dev-workflow): switch Step 6 callee from `Skill(simplify)` to `Skill(tidy)` — completes the `local-simplify-replacement` migration (paired with `tidy v1.0.0` published in `dev-workflow-bundle v1.39.3`). Step heading renamed to `Step 6: Tidy`; all SKILL.md / README.md prose references aligned with the `tidy` name. **Behavior change**: runs that previously resolved `Skill(simplify)` to upstream's renamed `code-review` skill (correctness-only since claude-code v2.1.147) now resolve to the bundle-provided `tidy` cleanup-and-fix behavior, restoring v2.1.146-era semantics. No opt-out — re-pin to `dev-workflow-bundle v1.39.x` to keep the prior callee.

### tidy v1.0.0 / dev-workflow-bundle v1.39.3

- feat(tidy): introduce new bundle skill that replicates the cleanup-and-fix behavior dropped from upstream simplify in claude-code v2.1.147. Pattern A (Skill wrapper + Agent dispatch + main-thread Edit + iteration loop + fenced JSON return contract); siblings with `verify-diff` / `skill-review`. Scope expands beyond `skill-review`'s `skills/<name>/` filter to cover all changed files (tracked + untracked, with cross-ecosystem lockfile / build-artifact / binary exclusion). Step 6 of `dev-workflow` will be wired to `Skill(tidy)` in a follow-up subtask.

## 2026-05-21

### ask-peer v2.2.8 / dev-workflow-bundle v1.39.2

- fix(ask-peer): extend state-variable lifecycle audit to persistence-layer state and add mitigation-vs-root-cause discrimination (auto-triage #36)
  - Category: missing-branch; Planning bullet's (iii) state-variable lifecycle clause covered counter / flag / accumulator but did not name persistence-layer state records whose add / start write must be symmetrically matched by completion / failure / empty-state-arrival writes — reviewers thus surfaced symptom-mitigation fixes (discard stale entries on read) without flagging the underlying save-on-completion asymmetry. (iii) extended to include "persistent state record" + persistence-layer write asymmetry example, and new (iv) clause added requiring reviewers to flag mitigation-only fixes as partial and demand identifying the state-machine asymmetry that produced the symptom.

### dev-workflow v1.39.2 / dev-workflow-bundle v1.39.2

- fix(dev-workflow): add Sub-skill natural-language argument minimalism bullet to Step 2 Simplicity self-audit (auto-triage #37)
  - Category: ambiguity; Step 2 § Simplicity self-audit had no bullet warning that long contextualized natural-language preambles passed to a sub-skill can override the callee's procedural fallbacks and cause empty-input early-termination — a non-obvious property the existing guidance did not name. New bullet establishes short scope-only sentence as the default, names the three sub-rules (minimum scope only / extra context only when strictly required / state preparation as the fallback), and explains the prompt-injection-weight mechanism.
- fix(dev-workflow): extend § Progress Visibility with Mid-chain visibility rule for chained sub-skill dispatches (auto-triage #37)
  - Category: missing-branch; § Progress Visibility covered only single pre-dispatch status messages, leaving the user-visibility window during chained sub-skill phases (feasibility checks, routine dispatch loops, multi-call interpretation) unhandled — the gap between dispatches could span multiple silent turns. New Mid-chain visibility clause requires a one-line current-location report at semantic checkpoints between dispatches, bound by three stall-preventing constraints (same-turn prose / phase-name+next-action only / not applied to short same-turn chains).
- fix(dev-workflow): add Negative-direction rule to plan-format.md § Localization granularity (auto-triage #37)
  - Category: ambiguity; § Localization granularity stated only positive-direction rules (Two-way rule + First-use pairing) without explicitly bounding what happens outside those categories, so defensive over-preservation could sprinkle source-language vocabulary across connective prose. New Negative-direction subsection establishes connective prose stays in the resolved language only, with three sub-rules: (a) verbatim scope is closed (machine-readable tokens / code / paths / commands / headings), (b) first-use pairing gated on translation-gap need, (c) function-word connectives stay in the resolved language only.
- fix(dev-workflow): add Symptom-mitigation vs root-cause-fix discrimination bullet to Step 2 Simplicity self-audit (auto-triage #36)
  - Category: ambiguity; Step 2 § Simplicity self-audit had no audit item for bug-fix tasks to discriminate symptom-mitigation changes (suppress the firing condition of the observed failure) from root-cause-fix changes (correct the state-machine asymmetry that produces it), so all-mitigation plans could pass author review and surface as "but why does the symptom happen?" pushback only at Step 3 reviewer iteration or Step 4 user-gate. New bullet defines the two classes with concrete examples, mandates explicit Decisions surfacing when the plan is all-mitigation (Recommendation vs Alternative + rationale), and requires the structural cause to appear in Risks even when not fixed in this scope.

## 2026-05-20

### dev-workflow v1.39.1 / dev-workflow-bundle v1.39.1

- fix(dev-workflow): add Experimental feature gating override bullet to Step 2 Simplicity self-audit (auto-triage #35)
  - Category: wrong-default; Step 2 § Simplicity self-audit had no bullet directing plan authors to prefer opt-in defaults when the gated feature is experimental, so sibling-consistency would push a default-enabled rollout even for unproven features. New bullet sets opt-in as the override, names experimental-marker detection signals, and states the graduation condition.
- fix(dev-workflow): add Self-application live validation bullet to Step 2 Simplicity self-audit (auto-triage #35)
  - Category: missing-branch; Step 2 § Simplicity self-audit had no audit item for the self-application case (target = running skill or same-run callee), so live-validation Test plan items were ad-hoc. New bullet defines self-application, requires identifying the immediate-exercise path, and mandates a "live validation" Test plan item citing the specific Step / sub-step / hook.
- fix(dev-workflow): add Plan-vs-allowed-tools 1:1 alignment sub-check to Step 3 (a) Scope & feasibility (auto-triage #34)
  - Category: missing-branch; Step 3 (a) had no audit cross-referencing concrete external commands cited in the plan body against the plan's allowed-tools enumeration, so missing entries surfaced as Critical rules-review violations only at Step 7.5, forcing a mid-implementation allowed-tools rewrite. New sub-check directs the reviewer to enumerate cited commands and verify 1:1 alignment.
- fix(dev-workflow): require verbatim fenced rendering of commit body / subject / files / diff at Step 10 per-commit accept gate (auto-triage #33)
  - Category: ambiguity; Step 10 sub-step 4.a (Present) listed the 4 elements but did not require each to render in a dedicated fenced code block, leaving room for prose-only "body 含め" summaries that hid material content from the user's approval decision. New closed-list sub-bullets specify Subject / Body / Files / Diff rendering rules (with `(no body)` placeholder for empty body) and explicitly forbid prose-only summaries.
- fix(dev-workflow): extend Closed-list reference sweep to entire distribution surface (auto-triage #33)
  - Category: missing-branch; Step 3 (a) "Closed-list reference sweep" only swept SKILL.md and references/*.md, missing README user-facing guides, mirrored bundle copy directories, manifest/marketplace.json plugin entries, and test/config fixtures. Sub-check now enumerates the full distribution surface with skill-development examples (README, plugins/<bundle>/skills/<name>/, .claude-plugin/marketplace.json) in parenthesized form.
- fix(dev-workflow): add Domain-state composition explicit decomposition bullet to Step 2 Simplicity self-audit (auto-triage #32)
  - Category: missing-branch; Step 2 § Simplicity self-audit had no audit item for feature requirements defined as composition (boolean AND/OR) of multiple independent state values; plans hid the composition behind a single derived predicate and gated on one constituent only. New bullet requires explicit enumeration of constituent values in Decisions and a state-space combination table in the Test plan.

### peer v2.2.7 / dev-workflow-bundle v1.39.1

- fix(ask-peer): add structural-level deep audit to Planning focus first-dispatch priority (auto-triage #34)
  - Category: ambiguity; ask-peer's Planning focus did not require cross-reference precision, disposition vocabulary integrity, or state-variable lifecycle 4-point symmetric specification on the first review dispatch, so Critical-class structural findings surfaced at iter 2 forcing a plan rewrite and iter-count bump. New clause names the three audit items and explicitly requires them on the first dispatch.
- fix(ask-peer): add sibling-symmetry grep audit to Planning + Code Review Focus Areas (auto-triage #32)
  - Category: missing-branch; ask-peer's focus areas didn't require active grep + tabulation across existing components sharing label / identifier / surface text / domain concept with the new addition, so plans and diffs passed surface-level review while same-text-different-side-effect asymmetry surfaced only at integration / live-environment time. New clause directs reviewer to grep + tabulate firing conditions and side effects (mirrored to Code bullet via short cross-reference).

### dev-workflow v1.39.0 / dev-workflow-bundle v1.39.0

- feat(dev-workflow): add `compact_rules` config (default `false`) gating Step 11 sub-step 3 (Char-count compaction gate). **Default: disabled** — the compaction mode added in v1.38.0 is currently experimental; set `compact_rules: true` in `.claude/dev-workflow.md` or `.claude/dev-workflow.local.md` to opt in per project. When disabled (default), `Skill(extract-rules) --compact` is never invoked, the compaction approval gate never opens, and § Completion's compaction reminder is automatically omitted. **Behavior change from v1.38.0**: users who adopted v1.38.0 compaction must explicitly set `compact_rules: true` to retain that behavior.

### extract-rules v1.14.0 / dev-workflow-bundle v1.38.0

- feat(extract-rules): add Compaction Mode (`--compact`) — compacts `<output_dir>/**/*.md` files that exceed `compaction_threshold` (default `32000` chars, 80% of Claude Code's 40k per-file warning observed in 2.1.x). Pattern A iteration loop (max_iterations=2 default) with subagent-side `mechanical_edits` / `structural_notes` schema and main-thread `Edit` application. Heuristics: class-level extension merge / similar-entry merge / example reference extraction / one-shot incident dropout. Fenced JSON return contract emitted for sub-skill caller dispatch (used by `dev-workflow` Step 11 char-count compaction gate).
- feat(extract-rules): add `compaction_threshold` setting to `extract-rules.local.md` (default `32000`). Set to a very large number (e.g. `99999999`) to opt out of compaction.

### dev-workflow v1.38.0 / dev-workflow-bundle v1.38.0

- feat(dev-workflow): add Step 11 char-count compaction gate — invokes `Skill(extract-rules) --compact` (no file arguments; extract-rules resolves the target set internally). **Default: enabled** — set `compaction_threshold: 99999999` in `.claude/extract-rules.local.md` (or `~/.claude/extract-rules.local.md`) to opt out. The gate presents per-file diff under a new user-approval gate (`Step 11 compaction approval gate`); accept keeps working-tree changes (file count surfaced via the new Completion-summary "Step 11 compaction reminder" line), reject reverts via `git checkout HEAD --`, `cancel` leaves the working tree as-is per Step 10's `Mid-loop cancel` semantic, and `adjust` follows Step 11's own three-case closed list (per-file disposition / clarification / other) rather than Step 10's Mid-loop adjust branches.
- feat(dev-workflow): add Step 11 compaction approval gate to the `§ No-Stall Principle` explicit-user-gates closed list. `references/plan-format.md` § User-gate summary preamble's `Applies to:` list extended to include this gate with its own Required / Optional content slots (file count with `applied_edits_count > 0`, total chars saved, `per_file_status` breakdown, over-threshold count; structural_notes count and self-application warning are Optional).

### dev-workflow v1.37.0 / dev-workflow-bundle v1.37.0

- feat(dev-workflow): add `ask-agy` to the supported reviewer closed list.

### ask-agy v1.0.0

- New skill: `ask-agy` wraps the `agy` (Antigravity) CLI for getting a second opinion.

## 2026-05-19

### dev-workflow v1.36.2 / dev-workflow-bundle v1.36.2

- fix(dev-workflow): add Phase-boundary self-audit to Step 1 TodoWrite registration (auto-triage #31)
  - Category: wrong-default; Step 1 sub-step 7 registered all phases in TodoWrite but did not enforce phase-completion audit at each top-level Step boundary, so phases like Step 6 Simplify could be silently skipped. Added a Phase-boundary self-audit clause: name the entering Step number and verify the prior Step's TodoWrite row is `completed` before advancing.
- fix(dev-workflow): add Rejection self-question to Step 8 to override Minor-label rejections on readability findings (auto-triage #30)
  - Category: missing-branch; Step 8 sub-step 3 allowed rejecting Minor-label findings on the label alone, even for code-intent / readability / placement-consistency findings users typically re-raise at the commit gate. Added a Rejection self-question sub-bullet: apply on yes/ambiguous, reject only on confident-no.
- fix(dev-workflow): add Natural-language quality self-check to Step 8 post-fix hooks (auto-triage #30)
  - Category: ambiguity; Step 8 fix loops added natural-language content (comments, config annotations, error messages) without any quality self-check. Step 7 / Step 7.5 cannot evaluate NL quality, so awkward additions slipped to the commit gate. Added a Natural-language quality self-check sub-bullet after Prose-integrity self-check.
- fix(dev-workflow): forbid inline substitution of Step 7.5 Skill(rules-review) on subjective scope judgment (auto-triage #30)
  - Category: wrong-default; Step 7.5 step 1 did not prohibit the agent self-judging "minimum scope, do inline" and replacing the external `Skill(rules-review)` call. Tightened step 1 to "Always invoke" + explicit ban on scope / size / complexity substitution, with the Prerequisites fallback preserved for objective skill unavailability only.
- fix(dev-workflow): enforce always-run Step 3 with closed-list handling for user-provided analysis (auto-triage #29)
  - Category: missing-branch; Step 3 had no branch for "user task prompt already contained design analysis" and the agent skipped Step 3 unilaterally. Added an Always-run preamble + closed-list of 3 handling rules: (i) reviewer skill always invoked, (ii) user analysis fed into dispatch payload as additional context, (iii) explicit user override is the only skip path with a Completion-summary warning.
- fix(dev-workflow): explicit Responsibility scope for Step 7.5 rules-review vs Step 6 / Step 8 (auto-triage #29)
  - Category: ambiguity; Step 7.5 / Step 6 Simplify / Step 8 Code Review responsibility boundary for rule compliance was implicit. Added a Responsibility scope section to Step 7.5 preamble naming Step 7.5 as owner of the `.claude/rules/` mechanical walk (hard rule strict / intent-style best-effort), Step 6 / Step 8 carve-outs, and Step 7.5 as authoritative on duplicate flags.

### peer v2.2.6 / dev-workflow-bundle v1.36.2

- fix(ask-peer): require a recommended default for functionally-equivalent style alternatives (auto-triage #31)
  - Category: missing-branch; Core Principles "Provide concrete alternatives" did not require the reviewer to name a recommended default when the alternatives are functionally equivalent (same observable behavior, differing only in placement / ordering / style), so callers round-tripped on coin-flip decisions. Extended the bullet to require a recommended default (including "keep as-is").
- fix(ask-peer): require surfacing at least one upper-level design alternative during plan review (auto-triage #31)
  - Category: missing-branch; Planning review focus area covered scope / risks / simpler approaches / numerical / operational reality but did not require the reviewer to surface upper-level design alternatives at the structural layer. Added an "upper-level design alternatives" clause naming concrete categories (firing-point selection, responsibility split, suppression-flag necessity, lifecycle boundary choices).
- fix(ask-peer): mark reviewer sample artifacts as discussion templates rather than finished output (auto-triage #30)
  - Category: other; Reviewer-provided code / comment / wording examples calibrated for the consultation dialogue were copy-pasted verbatim into code where they read as too verbose or off-tone. Added a Communication Style bullet directing the reviewer to mark sample artifacts as discussion templates with hedge phrasing, register-mismatch reminder, and defer-final-wording-to-implementer disposition.

### rules-review v1.1.4 / dev-workflow-bundle v1.36.2

- fix(rules-review): add scope-note to compliant Output Format to remind users about unwritten conventions (auto-triage #31)
  - Category: ambiguity; When rules-review concluded "No rule violations found", users had no signal that the check covers only documented `.claude/rules/` rules; unwritten project-specific vocabulary / style conventions remained invisible. Added a Scope note blockquote outside the fenced output template so the literal `No rule violations found` runtime string stays unchanged (preserves exact-match contract per § 6. Aggregate Results) while reader-facing documentation surfaces the limitation and guides to `Skill(extract-rules)`.

## 2026-05-18

### dev-workflow v1.36.1 / dev-workflow-bundle v1.36.1

- fix(dev-workflow): add Upstream-handoff agreement override audit to Step 2 Simplicity self-audit (auto-triage #27)
  - Category: missing-branch; Step 2 § Simplicity self-audit had no branch to surface plan-vs-prior-session-agreed-upstream-document overrides as Decisions items, so reviewer-driven overrides reached Step 4 user gate without explicit user-decision opportunity. New bullet enumerates the diff in Decisions with uphold/overwrite Recommendation/Alternative and an explicit override marker.
- fix(dev-workflow): add Temporary-workaround minimal coupling audit to Step 2 Simplicity self-audit (auto-triage #27)
  - Category: wrong-default; Step 2 § Simplicity self-audit had no audit item for declared-temporary plan elements, so initial drafts defaulted to permanent-element-depth integration and triggered user pushback. New bullet sets minimal coupling as first-class Recommendation, deep integration as Alternative with explicit removal-cost rationale, and requires Removability as a Risks evaluation axis.
- fix(dev-workflow): add Pre-existing vs regression discrimination to Step 7 test_commands loop (auto-triage #27)
  - Category: missing-branch; Step 7 retry path had no formal sub-step to discriminate test-skill TEST_FAILED reports as regression vs pre-existing. New sub-bullet names the two paths (trust test-skill's own classification if present; otherwise re-run at base-commit), defines the informational disposition for pre-existing failures (not counted toward retry budget, not auto-fixed), and recommends the regression-vs-pre-existing return contract as a verification-class skill convention.
- fix(dev-workflow): add Late-stage scaffolding self-audit to Step 5 Implement (auto-triage #27)
  - Category: ambiguity; Step 5 had no explicit guidance to re-apply Step 2 § Simplicity self-audit rigor to structural elements newly added during implementation. Late-stage scaffolding correctness gaps surfaced first at Step 8 iter 1. New item 3 names 4 audit legs (sibling symmetry, error-path symmetry, boundary-value coverage, reference-site sweep) for newly introduced elements.
- fix(dev-workflow): add Cross-file closed-list extension audit to Step 3 (a) (auto-triage #26)
  - Category: missing-branch; Step 3 (a) review had no explicit sub-check for closed lists mirrored across SKILL.md + references/*.md sibling files. Mirror copies drifted past Step 3 review. New sub-check requires Test plan to enumerate every reference site as a sweep target.
- fix(dev-workflow): add State-variable lifecycle completeness to Step 3 (c) Completeness (auto-triage #26)
  - Category: missing-branch; Step 3 (c) had no explicit sub-check requiring Design to symmetrically specify init / advance / non-advance / reference-sites for new state variables. Counter increment semantics surfaced only at Step 8 iter 2 as Major findings. New sub-check enumerates the 4 lifecycle points with symmetric success/failure path specification as the general principle.
- fix(dev-workflow): add Internal convention citation verification to Step 3 (a) (auto-triage #26)
  - Category: wrong-default; Step 3 (a) Premise challenge required verification only for external requirements / known bugs / project rules — internal-convention citations could pass through without primary-source verification. New sub-check requires reviewer to verify via grep/Read; if not found, treat as new convention requiring full justification.
- fix(dev-workflow): add Internal cross-reference stability to Step 3 (a) (auto-triage #26)
  - Category: ambiguity; Step 3 (a) did not actively check for raw sub-step number references in cross-ref prose. Rules-compliance violation surfaced only at Step 7.5. New sub-check requires references to use stable phrase anchors (section headings, bold-prose labels, quoted phrases) — refactor-resilient anchoring as general principle.
- fix(dev-workflow): add CHANGELOG signal placement check to Step 3 (c) (auto-triage #26)
  - Category: missing-branch; Step 3 had no self-audit for CHANGELOG signal placement when plan flips a distributed default. Behavior-change signals could end up buried in late bullets. New sub-check verifies first-line visibility, opt-out colocation, and bump-strength alignment on three axes.
- fix(dev-workflow): add External CLI behavior verification to Step 3 (a) (auto-triage #26)
  - Category: missing-branch; Shell content portability check covered shell-level concerns but not CLI sub-command semantics (git diff omits untracked, porcelain C-quoting, amend pre-staging, gh list truncation). New sub-check extends External library primary-source verification (category (e)) to CLI/shell domain. Unverified items lift to Risks as stale-CLI-assumption.
- fix(dev-workflow): add Closed-list reference sweep to Step 3 (c) (auto-triage #26)
  - Category: ambiguity; Closed-list modifications (enum / branch set / gate count / status token) needed an explicit sweep across reference sites (count claims, sibling enum fields, disposition mapping tables, render rules). New sub-check requires class-level extension audit across all reference sites; canonical change is necessary but not sufficient.

### dev-workflow v1.36.0 / dev-workflow-bundle v1.36.0

- feat(dev-workflow): relax `test_commands` from fixed `["Skill(run-tests)"]` to a list-replace key (default unchanged; higher-priority config layer's list replaces lower as a whole — no item-level merge or dedup). Project config can append additional structural-check skills. Step 7 iterates the list in order; any TEST_FAILED / EXECUTION_ERROR halts the loop immediately.

## 2026-05-17

### dev-workflow v1.35.0 / dev-workflow-bundle v1.35.0

- feat(dev-workflow): introduce Step 10 Interactive Commits and reorder post-Step-8 phases. **Default: enabled** — set `interactive_commits: false` in `.claude/dev-workflow.md` or `~/.claude/dev-workflow.local.md` to opt out. The new step runs after `hooks.on_complete` and proposes commit groupings + messages for user approval, then iterates per-commit. `extract-rules` and `self-retrospective` now run after the commit phase. If your downstream automation relies on `/dev-workflow` ending with an uncommitted tree (e.g. an external CI that commits and pushes for you), set `interactive_commits: false`.
- feat(dev-workflow): `hooks.on_complete` now executes as Step 9 (before extract-rules), shifted from its former post-Update-Rules timing. Hook entries that assumed rules had already been updated at hook-run time may need to be revisited.
- feat(dev-workflow): renumber post-Step-8 phases to monotonic execution order — old `Step 9` (Update Rules) → `Step 11`, old `Step 9.5` (Self-Retrospective) → `Step 11.5`, old `Step 10` (Completion Hooks) → `Step 9`. All cross-references in SKILL.md and `references/self-retrospective.md` updated.

## 2026-05-15

### dev-workflow v1.34.19 / dev-workflow-bundle v1.34.19

- fix(dev-workflow): add harmless-class bypass to Step 7 scope-drift guard (auto-triage #25)
  - Category: missing-branch; Scope-drift guard blocked on all out-of-scope changes without classifying whether they were harmless (whitespace/comment-only, ≤5 lines, formatter-attributable). Added 3-condition bypass so trivial formatting drift proceeds automatically with a one-line note.
- fix(dev-workflow): pass subtask scope boundaries to Step 3 / Step 8 reviewer (auto-triage #25)
  - Category: missing-branch; When a state file was active, plan reviewer and code reviewer were not informed of the current subtask's scope or what other subtasks covered, causing false-positive findings about missing out-of-scope functionality. Added subtask scope instruction to both reviewer dispatch steps.
- fix(dev-workflow): add TDD-conflict resolution for characterization test subtasks (auto-triage #25)
  - Category: missing-branch; When custom_instructions included a TDD-style requirement, subtasks adding characterization/coverage tests for existing behavior triggered a TDD-loop conflict. Added keyword-based detection and explicit TDD-loop-external declaration to Step 2 plan creation.
- fix(dev-workflow): add e2e coverage check to Step 3 Plan Review category (c) (auto-triage #25)
  - Category: missing-branch; Plan Review completeness check lacked an e2e/integration coverage verification item. Changes affecting user-visible interactions or role-based authorization flows could pass review without an e2e test plan.
- fix(dev-workflow): add no-summary-turn constraint at review-return boundaries (auto-triage #24)
  - Category: missing-branch; No-Stall Principle did not explicitly prohibit summary-only turns when a reviewer or sub-skill returned a semantically-empty result. Added paragraph banning verdict lists, conclusion paragraphs, and "shall I proceed?" sentences at review-return transition boundaries.
- fix(dev-workflow): add structural compliance as first Step 2 self-check item (auto-triage #24)
  - Category: missing-branch; Structural compliance (required sections, heading levels, no extra sections) was not the first self-check item and lacked a "stop here and restructure" gate. Also added template-skeleton-first guidance for plans seeded from carry-over documents.
- fix(dev-workflow): add planning-draft recovery branch to Resume sub-mode schema validation (auto-triage #23)
  - Category: missing-branch; --resume with a file lacking YAML frontmatter or missing required keys would fatal-stop instead of treating the file as an inherited planning draft. Added step 3a planning-draft recovery that continues to Normal sub-mode with the document as background context.

### peer v2.2.5

- fix(ask-peer): respect explicit scope boundaries in subtask review (auto-triage #23)
  - Category: missing-branch; Peer reviewer had no instruction to honor explicit in-scope boundaries from consultation requests, causing out-of-scope subtask functionality to be reported as Critical/Major findings. Added Scope boundary discipline to the Peer Agent Personality.

### rules-review v1.1.3

- fix(rules-review): add rule-doc-drift classification for stale rule documents (auto-triage #23)
  - Category: missing-branch; When code followed a consistent pattern across 3+ diff locations but the rule document described different behavior, the reviewer classified it as a code violation rather than a rule-doc-drift finding. Added classification field and route-to-extract-rules recommendation for the drift case.

## 2026-05-14

### dev-workflow v1.34.18 / dev-workflow-bundle v1.34.18

- fix(dev-workflow): add prerequisites fallback branch to Step 7.5 (auto-triage #22)
  - Category: missing-branch; Step 7.5 lacked a defined fallback branch when `check_commands` is undefined or empty, leaving executor behavior unspecified. Added explicit continuation flow so the skill proceeds deterministically when no check commands are configured.
- fix(dev-workflow): clarify bulk-vs-split execution strategy default in Step 7.5 (auto-triage #22)
  - Category: wrong-default; Step 7.5 execution strategy defaulted to bulk-run without documenting the rationale or the conditions under which split execution is appropriate. Added bulk-first default with split-on-error fallback and explicit criteria for when split-first is the better choice.
- fix(dev-workflow): add progress visibility instructions to Step 7.5 (auto-triage #22)
  - Category: ambiguity; Step 7.5 provided no guidance on what to output during command execution, leaving executor choice between silent execution and verbose logging undefined. Added explicit progress display instructions covering command number, result, and error details.
- fix(dev-workflow): add Cross-component sibling coverage check to Step 3 Plan Review (auto-triage #22)
  - Category: missing-branch; Step 3 scope & feasibility category lacked a sub-check for structural patterns shared across sibling components, leaving reviewers without guidance to flag plans that fix one component while leaving affected siblings unchanged. Added Cross-component sibling coverage sub-check with three directions: structural-fix propagation, new-component alignment, and intra-patch uniformity.

### peer v2.2.4 / dev-workflow-bundle v1.34.18

- fix(ask-peer): add error handling section for subagent dispatch failures (auto-triage #22)
  - Category: missing-branch; ask-peer had no defined behavior when subagent dispatch fails due to transient errors (HTTP 5xx, timeout, or empty response). Added `## Error Handling` section specifying retry-once policy, failure surfacing to the caller, and prohibition on autonomous skill rerouting.

## 2026-05-12

### dev-workflow v1.34.17 / dev-workflow-bundle v1.34.17

- fix(dev-workflow): add prose-language self-audit step in Step 4 before ExitPlanMode (auto-triage #21)
  - Category: missing-branch; Step 4 lacked an explicit self-audit step to verify that prose output language conforms to the resolved `language` setting before calling `ExitPlanMode`. Added the self-audit requirement so the plan author catches language mismatches before the approval gate.
- fix(dev-workflow): record class-level sweep outcome in next-iteration summary (auto-triage #21)
  - Category: missing-branch; The next-iteration summary in Step 8 Code Review did not record the outcome of the class-level sweep, leaving the reviewer unable to distinguish "sweep ran and found nothing" from "sweep was skipped". Added explicit recording of class-level sweep result so subsequent iters have an auditable trace.
- fix(dev-workflow): Add user-visible diagnostic when Plan Review incomplete (auto-triage #21)
  - Category: missing-branch; When Plan Review (Step 3) ended without all findings resolved, no user-visible diagnostic was emitted — the workflow could silently advance with unresolved findings. Added a diagnostic summary when the Plan Review exits with outstanding items.
- fix(dev-workflow): Add Premise challenge clause to Step 3 (a) Scope & feasibility (auto-triage #20)
  - Category: missing-branch; Step 3 reviewer category (a) Scope & feasibility lacked a lens for challenging unsupported constraints, scope boundaries, and strictness levels in the Recommendation. Any constraint whose origin cannot be identified in an external requirement, known bug, or existing project rule must now be surfaced as a finding with at least one relaxed or eliminated alternative, so the plan author can populate the relevant Decisions `Alternative` field.
- fix(dev-workflow): Add Collection-predicate boundary cases to Step 3 (c) Completeness (auto-triage #20)
  - Category: missing-branch; Step 3 reviewer category (c) Completeness had no guidance for checking all/every and any/some predicates over per-element classification results. Vacuous-truth gaps (empty set, all-same-classification, mixed-classification) silently passed plan review. Added Collection-predicate boundary cases check requiring reviewers to trace predicates through all three boundary scenarios.
- fix(dev-workflow): Add context-compaction recovery step to Step 1 (auto-triage #19)
  - Category: missing-branch; When session context is compacted before Step 1 runs in the current turn, skip-condition judgments (e.g. whether `self_retrospective.feedback` is set, whether `hooks.on_complete` is configured) relied on stale cached values from the compaction summary rather than the actual merged config. Added item 8 instructing re-read of all configuration files from disk after context compaction to ensure skip conditions are evaluated against the actual config state.

### extract-rules v1.13.3 / dev-workflow-bundle v1.34.17

- fix(extract-rules): Add item 4 to Step C4 to skip routine pattern re-application (auto-triage #19)
  - Category: missing-branch; Step C4 lacked guidance to distinguish user-directed design decisions from mechanical code following (symmetric duplication, template expansion, mechanical extension of an existing structure). Subagents were over-extracting patterns added without user guidance or correction. Added item 4 instructing the subagent to skip routine re-application and extract only when a new design decision was made, an exceptional case was handled, or the user explicitly corrected or redirected the approach.

## 2026-05-09

### dev-workflow v1.34.16 / dev-workflow-bundle v1.34.16

- fix(dev-workflow): semantic judgment of reviewer return at Step 3 / Step 8 (auto-triage #16 followup)
  - Category: ambiguity; Step 3 / Step 8 reviewer-return handlers used exact-string matching (`"No actionable findings"`), which stalled the orchestrator when `Skill(ask-peer)` or other free-form-prose reviewers returned natural-language Markdown verdicts that did not contain that exact phrase. Replaced with semantic judgment matching Step 7.5's existing pattern (trust the orchestrator's natural-language interpretation, do not rely on exact-phrase matching since reviewer phrasing varies). Caller-side fix for the original auto-triage #16 F5 stall problem; the earlier callee-side fix (ask-peer return contract) was reverted because forcing a review-specific JSON schema onto a general-purpose consultation skill was the wrong layer of abstraction.

### dev-workflow v1.34.15 / dev-workflow-bundle v1.34.15

- fix(dev-workflow): add result-recovery branch to Step 6 for unobservable Simplify output (auto-triage #17)
  - Category: ambiguity; Step 6 lacked a recovery branch when context compaction occurred during/after `Skill(simplify)`, making the result unobservable. Added bullet 3 instructing inspection of `git diff <base-commit>`: if changes attributable to a simplification pass are visible, treat simplify as completed and proceed; otherwise re-execute `Skill(simplify)` once (inspection-and-fix-class skills are idempotent) before Step 7.
- fix(dev-workflow): extend class-level extension audit to Critical/Major-severity findings (auto-triage #16)
  - Category: missing-branch; Step 8 class-level extension audit only triggered after Critical-severity fixes, so Major-severity findings whose fix addresses a structural pattern (e.g. negation-style branch description) escaped class-level scan and re-surfaced in subsequent iters as the same defect at a sibling location. Extended the trigger to include Major-severity findings whose fix addresses a structural pattern (closed enums, shared safety-rail callers, parallel handlers, etc.) so iter-1 sibling instances are caught in the same iter as the named instance.
- fix(dev-workflow): extend Simplify-revival check to iter 1 when Step 6 ran (auto-triage #16)
  - Category: missing-branch; Simplify-revival check fired only at iter k≥2, but iter-1 fixes can already re-introduce narration / preamble / redundant prose that an earlier Step 6 Simplify pass deliberately removed (fix patches see only the line-level diff). Extended to iter k≥1 when Step 6 ran earlier in this session (iter k≥2 otherwise) so first-iter fixes are also audited against Simplify deletions.

### rules-review v1.1.2 / dev-workflow-bundle v1.34.15

- fix(rules-review): add cross-file scope expansion to reviewer prompt (auto-triage #15)
  - Category: wrong-default; Reviewer prompt's `**Scope**` statement implicitly framed checks as same-file, causing cross-file references / imports / shared-contract violations to be missed in cycle 1 and only caught in cycle 2 as low-confidence findings. Added an explicit cross-file scope clause: when a rule's text doesn't restrict to a single file (no "in this file" / "within this file" / equivalent limiting phrase), apply it across all changed files in the diff including cross-file references, imports, and shared contracts. Also added an explicit cycle 1 requirement — deferring cross-file rule application to a later cycle is a defect, not expected behavior.

### dev-workflow v1.34.14 / dev-workflow-bundle v1.34.14

- fix(dev-workflow): add empty-Decisions buried-decisions self-check gate (auto-triage #16)
  - Category: missing-branch; Step 2 self-check lacked an explicit branch for the case where Decisions renders a no-decisions fixed sentence, leaving buried (a)+(b)-criterion items in Design undetected before advancing to Step 3.

## 2026-05-08

### dev-workflow v1.34.13 / dev-workflow-bundle v1.34.13

- fix(dev-workflow): replace progressive disclosure with full-plan + approval-summary presentation order in Step 4
  - Category: wrong-default; Step 4 used a progressive disclosure protocol (section inventory with on-demand expansion) that relied on HTML `<details>` tags in the VSCode extension environment, where they rendered as plain text. Additionally, the `ExitPlanMode` call was not mandated in the same turn as the plan text output, causing the approval modal to not appear — making the workflow look stalled with no visible way to approve. Replaced `§ Progressive disclosure at user-gates` with `§ Step 4 presentation order`: plan body renders in full in natural reading order (Overview → Decisions → Design → Test plan → Risks), followed by a `---` separator and an approval summary (preamble + guidance line) at the bottom where the chat viewport lands. Added explicit mandate that `ExitPlanMode` must be called in the same turn as the plan output. Updated guidance lines to remove "expand" references, removed stale "section inventory" mentions from `§ Localization granularity` and the `language` config description, and updated `§ User-gate summary preamble` to describe per-gate preamble positioning.

## 2026-05-07

### dev-workflow v1.34.12 / dev-workflow-bundle v1.34.12

- feat(dev-workflow): add progressive disclosure protocol for Step 4 and localization granularity for all user-facing prose
  - Category: missing-branch; Step 4 plan approval presented the full plan body by default, requiring users to scan the entire content before forming a decision. Added `§ Progressive disclosure at user-gates` to `references/plan-format.md` defining a default output sequence (summary preamble → guidance line → section inventory) with on-demand section expansion for Step 4. Step 7.5 and Step 8 retain direct presentation (preamble + content) since violation/finding lists are typically short. Also added `§ Localization granularity` codifying the two-way translate/preserve-verbatim boundary for all user-facing prose with first-use pairing and paired bilingual samples. Updated Step 4.1 in `SKILL.md` to reference the new protocol, Step 7.5.d and Step 8.4 to reference § Localization granularity directly, and Completion to output in the resolved language. Expanded the `language` config bullet to cover preambles, section inventory, and Completion summary.

## 2026-05-06

### dev-workflow v1.34.11 / dev-workflow-bundle v1.34.11

- fix(dev-workflow): add shell content portability check to Step 3 Plan Review category (a) (auto-triage #14)
  - Category: missing-branch; Step 3 reviewer categories had no explicit lens for shell portability / quoting / expansion / shell-flavor differences on plans containing shell content, surfacing such issues only at iter 2. New clause in category (a) Scope & feasibility names quoting / expansion / special-character handling / shell-flavor differences with concrete examples (zsh `nomatch` on unquoted globs, bash vs. POSIX drift) so iter-1 reviewers have a checkable signal at plan time rather than at Step 7.
- fix(dev-workflow): add intra-patch self-duplication audit direction (iii) to Step 2 Cross-component pattern alignment (auto-triage #14)
  - Category: wrong-default; Step 2 Simplicity self-audit's Cross-component pattern alignment bullet covered (i) propagating a fix outward and (ii) aligning a new component inward but had no explicit lens for "this very change itself lands the same processing pattern at multiple call sites within one patch". Same-class defects within a patch slipped past Step 2 and surfaced only as Step 8 class-level extension findings. New (iii) Intra-patch self-duplication direction names shared validators / common error handling / mirrored formatting-serialization logic at multiple call sites within one change and links back to (i)'s blast-radius treatment, with skill-development examples (producer / consumer JSON parse pattern, return-contract across callees) in parentheses.
- fix(dev-workflow): add prose-integrity self-check to Step 8 per-iteration discipline (auto-triage #14)
  - Category: ambiguity; Step 8 per-iteration discipline only mandated mechanical re-runs (Step 7 / Step 7.5) after a fix; prose semantic breakage (mid-word sentence cuts, broken logical connectives, paragraph-logic breakage) introduced by line-level fix patches surfaced only at iter k+1 as Major findings, costing an extra iter. New Prose-integrity self-check (post-fix) bullet names the three failure modes with concrete connective examples (`however` / `therefore` / `because` / `but`) so iter-1 agents catch breakage before the next reviewer dispatch.

### dev-workflow v1.34.10 / dev-workflow-bundle v1.34.10

- feat(dev-workflow): emit Producer version line in self-retrospective issue body
  - Category: missing-branch; Retrospective issue bodies carried no record of which `dev-workflow` version produced them, leaving the triage routine unable to distinguish stale issues (already-fixed in a later release) from current ones. Added a `**Producer version:** dev-workflow v<X.Y.Z>` line directly under the body header in `references/self-retrospective.md` § 4 Assemble — resolved from `.claude-plugin/marketplace.json` via `jq` with a literal `unknown` fallback when the file or entry is missing. Consumer-side stale-issue handling (regex extract, version-aware reject path with `(i)` CHANGELOG entry + `(ii)` SKILL.md cite gates and either-leg doubt fall-through to standard checklist) lives in the project-local `dev-workflow-triage` skill, where it can evolve independently of the bundle.

## 2026-05-05

### dev-workflow v1.34.9 / dev-workflow-bundle v1.34.9

- fix(dev-workflow): add Step 3 Plan Review return-point no-stall reminder mirroring Step 8 (auto-triage #13)
  - Category: missing-branch; Step 3's iteration loop lacked the inline `Return-point no-stall reminder` bullet that Step 8 already carries, so the no-stall discipline only fired via the abstract `§ No-Stall Principle` section, not at the decision moment. Added a sibling-mirrored reminder that enumerates reviewer outcomes as a closed-list and names case-specific next actions, with stable cross-reference to `§ No-Stall Principle`.

### dev-workflow v1.34.8 / dev-workflow-bundle v1.34.8

- feat(dev-workflow): add user-gate summary preamble convention to Step 4 / Step 7.5 / Step 8
  - Category: ambiguity; The three user-judgment gates presented structured content without a TL;DR layer, leaving users to scan the full structured content before forming an overall picture. Added a `§ User-gate summary preamble` section to `references/plan-format.md` and one-line references from each of the three gate steps in `SKILL.md`.

## 2026-05-03

### dev-workflow v1.34.7 / dev-workflow-bundle v1.34.7

- fix(dev-workflow): add post-Critical-fix class-level extension audit to Step 8 iteration loop (auto-triage #12)
  - Category: ambiguity; Step 8 step 3 had no explicit instruction to scan the rest of the diff for instances of the same defect class after a Critical-severity fix, leaving fixes scoped to the single named instance even when the class spanned the diff. Added an inline self-audit bullet sequenced before the modified-vs-rejected branches, with same-defect-class characterization (same operation / broken assumption / side-effect pattern) and concrete examples in parentheses.
- fix(dev-workflow): augment plan-format Step 2 self-check with promotion cues for buried Decisions (auto-triage #12)
  - Category: wrong-default; The buried-decisions checkbox previously gave no concrete cue for spotting a Design-buried judgment, so author self-check rarely caught what Step 3 external review later flagged. Added a closed-list of three promotion cues (why-X-over-Y / fixed-value-or-timing rationale, new enum without per-member necessity, (a)+(b)-passing choice missing an Alternative line) that operationalize the (a)+(b) criterion at detection time.

## 2026-05-02

### dev-workflow v1.34.6 / dev-workflow-bundle v1.34.6

- fix(dev-workflow): cover new-component alignment direction in Step 2 Simplicity self-audit (auto-triage #11)
  - Category: missing-branch; The Step 2 Simplicity self-audit's `Cross-component structural-blast-radius` bullet only covered the "propagate fix outward" direction; the symmetric "align new component inward" branch was absent, surfacing late as Step 3 reviewer or Step 4 user pushback. Renamed to `Cross-component pattern alignment` and rewrote to audit both alignment directions explicitly, with skill-development examples kept in parentheses.
- fix(dev-workflow): add consistency-with-siblings rationale check to Step 2 Simplicity self-audit (auto-triage #11)
  - Category: wrong-default; Step 2 Simplicity self-audit had no branch for plan elements whose primary rationale is "align with existing sibling implementations / for consistency" alone, leaving lighter alternatives unsurfaced and divergence-cost notes implicit. Added a new bullet that triggers on this rationale, requires lighter alternatives in parallel in Decisions, and requires a one-line cost-of-divergence record when consistency is chosen.

## 2026-05-01

### dev-workflow v1.34.5 / dev-workflow-bundle v1.34.5

- fix(dev-workflow): add Distribution-aware fix direction guidance to retrospective producer §3 Sanitization to prevent skill-development vocabulary leak into bundle skills' SKILL.md prose (subtask 2 of meta-scope-leak)
  - Category: wrong-default; The producer's §3 "Keep as-is" line allowed `suggested fix directions expressed in skill-level vocabulary` by default. The triage applier transcribes those directions mostly verbatim into target SKILL.md prose, so skill-development vocabulary leaked into bundle skills' user-visible distribution surface. Added a `§ Distribution-aware fix direction (bundle skill targets)` sub-section requiring abstract-principle-first phrasing with skill-development examples in parens when the target is one of the bundle skills and the fix lands in SKILL.md / references prose. The corresponding source-of-truth rule was added to `.claude/rules/project.rules.md` § SKILL.md の配布性 with a Good/Bad example in `.claude/rules/project.rules.examples.md`.
- chore(release): synchronize dev-workflow and dev-workflow-bundle plugin versions to v1.34.5 (dev-workflow +2 jump from v1.34.3, dev-workflow-bundle +1 from v1.34.4 — pair-bump alignment)

### ask-peer v2.2.3 / dev-workflow-bundle v1.34.4

- fix(ask-peer): generalize peer reviewer "operational reality" prompt to remove skill-bundle internal vocabulary (subtask 1 of meta-scope-leak)
  - Category: wrong-default; The peer personality "Planning" focus area inherited `subagent dispatch and time budgets` / `sub-dispatches` from auto-triage #6, which defaulted to skill-bundle internal vocabulary instead of language-agnostic wording. These tokens confuse general-purpose project reviewers. Replaced with `compute and time budgets` / `operations`; the `N × M` sanity-check example survives.

## 2026-04-30

### ask-peer v2.2.2 / dev-workflow-bundle v1.34.3

- fix(ask-peer): add numerical self-consistency and operational-reality observations to plan review (auto-triage #6)
  - Category: missing-branch; Plan reviews missed (i) numerical off-by-one between plan body counts and TodoWrite reality, and (ii) the operational feasibility of upper-bound limits given subagent dispatch overhead. Extended the Planning focus area in the peer-personality block to enumerate both observations.

### dev-workflow v1.34.3 / dev-workflow-bundle v1.34.3

- fix(dev-workflow): make ExitPlanMode precondition explicit at Step 4 step 3 (auto-triage #7)
  - Category: ambiguity; Step 3 → Step 4 ordering invariant was implicit; agent could issue `ExitPlanMode` mid-Step-3. Step 4 step 3 now names the TodoWrite precondition and the remediation when it trips.
- fix(dev-workflow): add cross-skill structural-blast-radius bullet to Step 2 Simplicity self-audit (auto-triage #7)
  - Category: missing-branch; Step 2 self-audit only covered intra-plan incrementality. New bullet requires explicit scope expansion or a Risks-entry deferral when sibling skills share the same structural pattern.
- fix(dev-workflow): add cross-file consistency check to Step 3 (f) rubric (auto-triage #7)
  - Category: ambiguity; Step 3 (f) covered cross-section consistency within a single plan but not cross-file consistency across multiple SKILL.md / references files. New bullet sits beside the existing cross-section check, gated on multi-file plans.
- fix(dev-workflow): add inline no-stall reminder at Step 8 iteration boundary (auto-triage #6)
  - Category: missing-branch; Step 8 iteration boundaries had no inline no-stall reminder, so the agent stalled between iter k and iter k+1. Reminder enumerates reviewer outcomes in closed-list form and names the three possible next actions, all gated to "next tool call".
- fix(dev-workflow): add Simplify-revival check to Step 8 reviewer category c (auto-triage #5)
  - Category: missing-branch; Step 8 review fix cycle could silently re-introduce narration that Step 6 Simplify deliberately removed. New clause in category c. (iter k ≥ 2 only) tells the reviewer to flag that regression class.
- fix(dev-workflow): require recording cycle-to-cycle judgment drift in Step 7.5 (auto-triage #5)
  - Category: ambiguity; Step 7.5 1st/2nd cycle verdicts could legitimately differ on the same location, but the SKILL.md never required recording the reason. New clause in step 3.c covers both drift directions and requires the reason in the audit trail before completion.

### extract-rules v1.13.2 / dev-workflow-bundle v1.34.3

- fix(extract-rules): clarify examples-format reference direction is one-way (auto-triage #5)
  - Category: wrong-default; Examples-file generation defaulted to emitting a self-reference link at the end because the format spec did not state the reference direction explicitly. New clause forbids self-links and binds templates / subagent prompts to omit the section.

### rules-review v1.1.1 / dev-workflow-bundle v1.34.3

- fix(rules-review): add explicit scope policy to reviewer prompt (auto-triage #5)
  - Category: ambiguity; Reviewer prompt did not state whether rules apply diff-only or file-wide. New "Scope" clause makes diff-only the default, with an explicit escape when the rule text demands file-wide consistency.

### extract-rules v1.13.1

- docs(extract-rules): Translate remaining Japanese comments in the Usage block to English
  - The `/extract-rules --from-pr` examples in `## Usage` carried Japanese comments (`カレントリポのPR指定`, `他リポのPR指定（URL形式も可）`, `範囲指定（カレントリポ）`, `範囲指定（他リポ）`, `複数指定可（スペース区切り）→ 横断分析で組織重視の原則を検出`). Project rules require distributed artifacts (SKILL.md included) to be in English; the comments now read `PR in current repo`, `PR in another repo (URL form also accepted)`, `PR range (current repo)`, `PR range (another repo)`, and `Multiple specs allowed (space-separated) → cross-analysis detects org-wide principles`. No behavioral change

## 2026-04-25

### dev-workflow v1.34.2 / dev-workflow-bundle v1.34.2

- fix(dev-workflow): Require repo-wide grep before drafting plans for version/identifier string replacement tasks
  - Step 2 sub-step 3 gains a new bullet: when the core operation is replacing a specific version string, identifier, or constant across the project (e.g. version bump, rename, migration), grep the entire repository for the old value before drafting the plan and enumerate the complete list of affected files in the Design section. Missing even one location is the primary regression source for this task class — surfacing the full target set at plan time blocks the "we forgot a place" failure mode rather than catching it at Step 7
- fix(dev-workflow): Require pinned-dependency compatibility verification on runtime/language major-version upgrades
  - Step 3 sub-step 1 (a) Scope & feasibility gains: when the plan proposes upgrading the base runtime or language major version, the reviewer must verify that all pinned dependencies (runtime and dev) explicitly cover the new version. Any dependency whose supported range does not include the new version must be flagged, and the plan must adopt the most conservative version all pinned dependencies safely support rather than leaving compatibility gaps for the user to catch at Step 4
- fix(dev-workflow): Add a Scope-drift guard around `check_commands` so auto-fix writes outside the task scope are surfaced instead of silently accepted
  - Step 7 sub-step 1 gains a "Scope-drift guard" bullet: before each command, record `git diff --name-only <base-commit>` as the task-scope snapshot. After the command, re-check the diff — any file newly appearing outside that snapshot was written by the command (auto-fix/write behavior sweeping unrelated drift). On detection, warn the user (listing both the in-scope files and the newly-appeared out-of-scope files), do **not** auto-revert / `git checkout` / delete the out-of-scope changes (leave the working tree as the command left it for user inspection), leave `Step 7: Check / Test` as `in_progress`, and wait for user direction. Positioned as the only allowed non-completing exit from the check_commands phase
  - The `## No-Stall Principle` enumeration adds **Step 7 scope-drift stop** as a new permissible pause point alongside the existing entries (Step 1.5 dialogues, Step 4 plan approval, Step 7 fail-stop, Step 7.5 persisting violations, Step 8 unresolved findings, Completion subtask PR URL prompt). Required by the section's own "update the enumeration and the definition together" invariant — a pause point introduced only in the Step 7 definition would have left the closed-list claim false

## 2026-04-24

### dev-workflow v1.34.1 / dev-workflow-bundle v1.34.1

- fix(dev-workflow): Extend the `language` config scope to cover all user-facing prose the skill produces, not just Step 9.5
  - `language` now governs the Step 4 plan body (Overview / Decisions / Design / Test plan / Risks / Unknowns content) and the Step 2 difficulty-assessment log in addition to the Step 9.5 finding `Description` / `Suggested fix direction` paragraphs. Previously a Japanese user still received an English plan in Step 4 even though the rest of the conversation was Japanese
  - Plan section headings (`Overview` / `Decisions` / `Design` / `Test plan` / `Risks` / `Unknowns`), the Step 4 literal guidance line, and the Step 9.5 schema tokens / terminal summary / destination header remain English regardless of the setting so the template-contract and machine-checkable strings stay load-bearing
  - `## Configuration` entry rewritten to enumerate the three covered surfaces; Step 2 sub-step 7 and Step 4 sub-step 1 explicitly instruct writing the difficulty log and plan body prose in the resolved language
- fix(dev-workflow): Forbid non-template sections in the plan via a new Step 2 self-check bullet
  - `references/plan-format.md` § Step 2 self-check gains: "No section appears outside the enumerated template (Overview, Decisions, Design, Test plan, optionally Risks / Unknowns) — added 'meta' sections such as introductions, methodology notes, or recap blocks belong inside Design or should be dropped entirely". Header wording updated from "run this check on the Decisions section" to "run this check on the plan" to reflect the expanded scope; the trailing paragraph restates the template's required-headings list as the closed set of sections and the only structural property checked here
- fix(dev-workflow): Close Step 2 sub-step 8 against confirmation-seeking transition phrases
  - Step 2 sub-step 8 now explicitly forbids confirmation-seeking transition sentences such as "if this design looks good, I'll proceed to Step 3 (Plan Review)" or "shall I move on to Plan Review?" — they superficially read as natural conversation but constitute the same approval gate the step already prohibits and waste user attention on an unreviewed plan. The moment Step 2 ends, the workflow must advance to Step 3 without emitting any user-facing message about the plan or the transition
- fix(dev-workflow): Close Step 8 short-circuit rationalizations when re-running Step 7 / Step 7.5 after a fix
  - Step 8 iteration-loop sub-step 3 now mandates "Always re-run Step 7 and Step 7.5 — no exceptions" and explicitly disallows the common rationalizations: confidence in the fix, small diff size, modified paths that appear out of scope for the configured `check_commands` / `test_commands` (e.g. edits landing entirely under a local-skill directory or a docs-only path), or the re-run "would be a no-op". A genuine no-op outcome is the audit trail; skipping the re-run removes the trail. The only permissible skip remains the separate branch where no code was modified in the iteration

### dev-workflow v1.34.0 / dev-workflow-bundle v1.34.0

- feat(dev-workflow): Submit Step 9.5 repo-mode retrospectives via `gh api` instead of `gh issue create` to run with the minimum GitHub token permissions
  - `references/self-retrospective.md` § 4 Submit repo mode step 2 now invokes `gh api --method POST /repos/<feedback>/issues -f title=... -F body=@<staging-file>`. `gh api` only needs a token with `Issues: write` on the target repo, whereas `gh issue create` additionally requires broader read scopes for label/assignee metadata lookups — switching narrows the blast radius of a leaked token
  - `allowed-tools` in `SKILL.md` replaces `Bash(gh issue create *)` with `Bash(gh api --method POST /repos/*/issues *)` — pinned to the issue-creation endpoint so other `POST /repos/{o}/{r}/...` paths that carry higher blast radius (webhooks, deploy keys, `dispatches`, git refs/commits, repo transfer, releases) are NOT pre-approved. The two wildcards cover `<owner>/<repo>` in the URL and the trailing `-f title=... -F body=@<file>` flags. The § 5 "gh submission failure" retry hint and the README destination table / prerequisites entry are updated to the new invocation and call out the reduced token-scope requirement
- feat(dev-workflow): Delete the Step 9.5 repo-mode staging file after a successful submission, preserve it on failure
  - `references/self-retrospective.md` § 4 Submit repo mode gains sub-step 3: after the `gh api` POST returns exit 0, `rm` the staging file `.claude/plans/retrospective-<slug>.md`. On non-zero exit the file is left in place as a retry affordance — § 5 "gh submission failure" now surfaces the preserved path and a full `gh api` retry command
  - Path mode unchanged (the written file is the user-facing deliverable in that mode). The path-mode bullet now explicitly notes the no-delete behavior so the mode asymmetry is visible at a glance

## 2026-04-23

### dev-workflow v1.33.0 / dev-workflow-bundle v1.33.0

- feat(dev-workflow): Add configurable output language for Step 9.5 finding prose
  - New top-level scalar config key `language` (e.g. `ja`, `en`), merged across the three settings layers like other scalars. Resolution: merged skill config → `~/.claude/settings.json` `language` field → default `ja`. `null` / empty string / non-string values fall through to the next step. Reading `~/.claude/settings.json` warns only on malformed JSON or an invalid `language` value; a missing file or missing key silently falls through to `ja`
  - Scope: only the `Description` / `Suggested fix direction` paragraphs of Step 9.5 findings honor the setting. Everything else — schema tokens (`### Finding <N>`, labels, enum values, `Findings: <N>`, `Status: ERROR`), terminal summary, destination header — stays English regardless of the setting
  - Step 9.5 threads the resolved language into `references/self-retrospective.md` §2.1 subagent prompt (new `Language` input + new "Language handling" instruction step). §3 sanitization applies to the localized prose regardless of language
  - §5 Machine-checkable rejection contract pinned to English so string/enum matching stays load-bearing. Added a **Contract note — do not relax for i18n** to prevent future editors from "fixing" §5 to accept translated tokens and silently break the main ↔ subagent contract

### dev-workflow v1.32.1 / dev-workflow-bundle v1.32.1

- fix(dev-workflow): Introduce No-Stall Principle so the workflow never pauses except at explicit user-gate points
  - New `## No-Stall Principle` section placed at the top of `## Execution Mode`. Enumerates the exhaustive list of permissible pause points (Step 1.5 decomposition dialogue, Step 1.5 Resume picker, Step 4 plan approval, Step 7 after 3 retries, Step 7.5 step 3.d persisting violations, Step 8 step 4 unresolved findings, Completion subtask PR URL prompt). At every other point the agent must treat skill results semantically and proceed automatically — no reliance on exact-phrase matching
  - Step 6 (Simplify): add an explicit completion clause — regardless of whether `Skill(simplify)` applied fixes or returned any other non-error result, mark the step `completed` and proceed to Step 7 automatically. Previously the step had a single sub-step (the skill invocation) with no guidance on handling a no-op return, so the workflow paused until the user said "continue"
  - Step 7.5 (Rules Compliance Review) step 2: replace the exact-phrase list ("No rule violations found", "All rules compliant", …) with a semantic-judgment instruction. The list was fragile because (i) `"All rules compliant"` was never emitted by the current rules-review implementation, and (ii) any future wording change in rules-review would silently break the match. Semantic judgment plus the No-Stall Principle is robust to output-format drift
  - Step 7.5 step 3.c (2nd-cycle re-run after violation fix): make the clean-2nd-cycle branch explicit — reuse the same semantic judgment as step 2 and proceed to Step 8 automatically. Previously only the "violations persist" branch was written, leaving the clean-re-run case without an explicit progress instruction
  - Step 9 (Update Rules): add a closing sub-step — after `Skill(extract-rules)` invocations return, mark the step `completed` and proceed automatically regardless of whether new rules were added or the skill reported nothing changed. Pre-emptive alignment with the No-Stall Principle so Step 9 stays consistent with Steps 6 and 7.5

## 2026-04-22

### dev-workflow v1.32.0 / dev-workflow-bundle v1.32.0

- feat(dev-workflow): Structured plan format with a mandatory Decisions section to cut Step 4 user-review fatigue
  - New file `references/plan-format.md` — single source of truth for plan structure (Overview / Decisions / Design / Test plan / Risks), the (a)+(b) Decisions criterion, Subtask / Resume handling, the Step 2 self-check, the Step 3 (f) content-quality rubric, and the three literal Step 4 guidance lines
  - Step 2 Create Plan: sub-step 3 now instructs authors to follow the template in `references/plan-format.md`; new sub-step 5 **Plan presentation format self-check** runs the author's first-pass judgment on the (a)+(b) Decisions criterion, and subsequent sub-steps shift forward by one (the difficulty-based N adjustment and "do not present" now sit at sub-steps 7 and 8)
  - Step 3 Plan Review: adds review category **(f) Presentation & attention allocation (content quality)** — external re-check of the Decisions section's content (does each item genuinely pass (a)+(b), is there a judgment call buried in Design, are Overview/Design/Test plan/Decisions mutually consistent). Format compliance is not re-checked here — the Step 2 self-check is authoritative for structure, keeping the division of labor clean and preventing the "No actionable findings" short-circuit from bypassing format validation
  - Step 4 Finalize Plan: sub-step 1 leads with one of three literal English guidance lines (Decisions present / empty-Normal / empty-Resume) drawn verbatim from `references/plan-format.md`. The "Decisions present" variant tells the user where their judgment is actually needed; the empty variants turn "no decisions" into a strong skim-and-approve signal rather than a mistakenly-dropped section
  - README `## Plan format` section: user-facing summary of the template, the Decisions gate, and the recommended review procedure

### dev-workflow v1.31.0 / dev-workflow-bundle v1.31.0

- feat(dev-workflow): Address plan self-audit and code-review rubric gaps from retrospective-2026-04-22 (findings F1 / F2 code-review-side / F3 planning-side / F4 / F5 code-review-side; see Explicit defers below for what each finding did not cover in this release)
  - Step 2 Simplicity self-audit: added **Root-cause provenance check** — if the plan leans on a root-cause claim from an AI-authored prior-session artifact (inherited spec file, decomposition state file's AI-authored description), re-derive the root cause from the user's original ask before treating it as load-bearing. Previously the audit only flagged inherited design elements; root-cause claims embedded in those drafts could be adopted wholesale and later discovered to be wrong only after the implementation had been built on them
  - Step 2 Simplicity self-audit: added **Plan-level incrementality** as an author-side check. Previously incrementality was only asked at the reviewer level in Step 3.d; concrete plans that bundle independent work (e.g. a new retry primitive + unrelated control-flow refactor) could slip past the author and rely on the reviewer to catch them. Author-side check lets the split be proposed before peer review, reducing rework
  - Step 5 Implement: added a **Respect prior in-session edits** self-discipline — content the user explicitly removed earlier in this session (comments, guards, logs) must not reappear when applying plan steps, Step 6 simplify output, or Step 8 review fixes. Placed on the implementing agent (main) because reviewers/simplify subagents only see `git diff <base-commit>` and cannot detect a user-delete-then-agent-readd cycle whose net diff is zero. Previously the rubric treated "missing rationale" as something to add; that framing caused agents to silently resurrect comments and guards the user had already removed
  - Step 8 Code Review rubric: category **(b) Conventions & consistency** now explicitly treats **comment narration** (line-by-line paraphrase of the code) and **comment preamble** (restating information obvious from the surrounding function/file) as delete-candidates — the default action is removal, not asking the author to expand the rationale. The prior binary "does this comment explain why?" check was too permissive; long narration with one sentence of intent still passed
  - Step 8 Code Review rubric: category **(c) Simplicity & maintainability** now specifically enumerates the speculative-addition patterns that kept resurfacing across review iterations — **defensive hardening of already-safe paths, future-proofing for hypothetical double-calls, and double-coverage over paths already protected elsewhere** — with explicit "default to removal" framing. The prior generic "speculative features without explicit trigger" wording was read as a soft suggestion and routinely ignored in favor of "noting for later"
  - Step 7.5 literal-string match list: added `"No rule violations found"` to the e.g. list so the revised rules-review output (see below) is recognized as a compliant response

- Explicit defers (not implemented in this release):
  - **Finding 2 — Step 6 simplify-side application**: the retrospective's F2 fix direction named both code-review and simplify. This release strengthens Step 8 (code-review) only; the Step 6 simplify invocation is unchanged. Peer review during planning flagged that propagating the same rubric to Step 6 would duplicate responsibility without a distinct enforcement mechanism — `Skill(simplify)` already receives `custom_instructions` as its generic constraint channel. Users who want the speculative-addition / narration-preamble rubric at simplify time should surface it via `custom_instructions`. Revisit if future retrospectives show simplify-stage regressions
  - **Finding 3 — skill self-version staleness warning**: the retrospective's F3 also asked for a startup-time warning when the skill runs with a version older than what's available locally. Deferred as a separate task — dev-workflow itself has no version-read mechanism today, and "is a newer version available?" needs upstream-check infrastructure that's out of scope for a text-level rubric update
  - **Finding 5 — commit-message body scope**: the retrospective's F5 also asked that the same narration/preamble rubric apply to commit-message bodies. Commit authoring is not dev-workflow's responsibility (dev-workflow never stages, commits, or pushes); the Completion step delegates commit creation to the user (or to `hooks.on_complete` skills like `skill-review` / `work-complete`). The rubric should live in whichever skill owns commit authoring, not here

### extract-rules v1.13.0

- feat(extract-rules): Add post-generation Portability check to examples-format reference (retrospective-2026-04-22 finding F6)
  - `references/examples-format.md`: appended a new `## Portability check (post-generation)` section — after writing each example + description, re-read the pair and ask whether the description holds for every call site of the pattern, or leaks assumptions from the specific site it was mined from. Flags two common leaks: (i) **test-file origin** (unit-test samples that describe the pattern in test-isolation terms, which diverge from production semantics when the same pattern appears in production code) and (ii) **specific-site framing** (descriptions that reference local variables / fixture names that don't generalize). Fallback is to add a `test-only` qualifier to the rule title so downstream readers do not apply the rule outside its mined context
  - Applies to all modes (Full Extraction, Update, Restructure, Conversation, PR Review)
  - Also corrected the `## Common Generation Procedure` opening line to list `Restructure` alongside the other modes — the section already has a `### For Full Extraction / Restructure` subheading, but the parenthetical mode list at the top omitted Restructure

### rules-review v1.1.0

- feat(rules-review): Clarify hard-rule vs intent-rule coverage and align output string (retrospective-2026-04-22 finding F7)
  - `description`: appended "Best suited for hard rules (naming, imports, placement, explicit prohibitions); intent-style rules are checked on a best-effort basis." Previously the skill advertised a uniform "rule compliance check" which could be read as full coverage; in practice intent-style rules (comment taste, speculative-addition avoidance) are judgment calls that benefit from dev-workflow's Step 8 code-review in addition to this skill's structural scan
  - Agent prompt (Step 5): tells reviewers that rules may include **hard rules (binary compliance)** and **intent rules (judgment-based)**, to evaluate both, and that low-confidence intent-rule cases must be reported in the violation list with an explicit `low-confidence` marker — the exact "No rule violations found" response is reserved for confidently-clean cases. This preserves the aggregator's exact-string contract (Step 6) while routing borderline intent-rule cases out of the clean path, where the user would otherwise miss them
  - Output string change: `All rules compliant` → `No rule violations found` (single line, both the Step 6 aggregation branch and the Output Format template). Synced with dev-workflow Step 7.5's literal-string match list in the same release so the new string is recognized as compliant by the workflow

Note: `merge-rules` and `apply-rules` are **not** bumped. The output format of extract-rules is unchanged (the new Portability check is a pre-write guideline, not a format change), and rules-review's output string change has no downstream consumer beyond dev-workflow (updated in the same release).

## 2026-04-21

### dev-workflow v1.30.1 / dev-workflow-bundle v1.30.1

- fix(dev-workflow): Exclude Solution-Style root tsconfig from per-tsconfig type-check registration in `--init`
  - `references/init-mode.md`: when the root `tsconfig.json` has a non-empty `references` array (Solution-Style), the root itself is now excluded from `check_commands`. `tsc -p tsconfig.json --noEmit` typically fails on Solution-Style roots because emit is disabled at the root; only the referenced leaf tsconfigs and other non-root tsconfigs that survive the name-based exclusion get registered. This closes a gap in v1.30.0's multi-tsconfig auto-registration where the generated command list could include a root entry that always errored
- docs(dev-workflow): Clarify Step 1.5 decomposition rationale is a chat message to the user
  - `references/task-decomposition.md`: the one-line rationale is now explicitly a **chat message to the user** — not a TodoWrite note or state-file field. This is the only visible audit trail for the "do NOT decompose" path, since the yes/adjust/no dialogue only fires on the "decompose" path. Without the chat line, negative decomposition decisions left no externally visible record

### extract-rules v1.12.1

- docs(extract-rules): Propagate `paths:` frontmatter from `<name>.md` to `<name>.local.md`, add `## Examples` link in project-specific templates
  - `SKILL.md` Step 6 output structure: `<name>.local.md` now carries the **same `paths:` frontmatter** as its `<name>.md` counterpart, so local project-specific patterns auto-load under the same scope as the portable Principles. Previously only `<name>.md` was documented as having `paths:`, which left `<name>.local.md` effectively unscoped despite being the more context-sensitive of the pair
  - Layer-specific and cross-layer rules about `paths:` now apply uniformly to both `.md` and `.local.md`
  - `## Project-specific patterns` template gains a trailing `## Examples` section pointing to the co-located `.examples.md` file (e.g. `./typescript.examples.md`), so reviewers can jump from a pattern note to runnable Good/Bad samples without guessing the filename

### apply-rules v2.0.2

- fix(apply-rules): Sync `paths:` frontmatter from `.md` to `.local.md` during Step 6b cleanup
  - `.local.md` files generated by extract-rules before v1.12.1 lack `paths:` frontmatter and are effectively unscoped. apply-rules Step 6b now retrofits the scope by copying (union + dedup) the sibling `.md`'s `paths:` onto any `.local.md` that survives the promoted-pattern cleanup. This aligns existing projects with the v1.12.1 contract without requiring a full extract-rules re-run
  - `.local.md` files deleted by the cleanup (emptied) are unaffected — no frontmatter sync is performed on deleted files

Note: `merge-rules` is **not** bumped. merge-rules output contains no `.local.md` (patterns are promoted to Principles), and input `.local.md` frontmatter is already parsed gracefully regardless of whether `paths:` is present.

## 2026-04-20

### dev-workflow v1.30.0 / dev-workflow-bundle v1.30.0

- feat(dev-workflow): Strengthen Simple classification, add external-library primary-source verification, close multi-tsconfig coverage gap, and open a runtime trigger for examples.md staleness review (retrospective-2026-04-20 findings F1/F2/F3/F4)
  - Step 2.6: Simple escalates to at least Moderate when the change touches an external library's configuration file or type-level API AND that library has had a recent major-version bump. The check is a quick `git diff <base-commit>` on the project's package manifest looking for major version changes. Similar qualitative risks (external config-DSL rewrites, etc.) follow the same rule. Mechanical check + qualitative trigger are combined so stale-config failures after a major upgrade cannot slip through the Simple path
  - Step 3 Plan Review: added a new category (e) **External library primary-source verification** (independent of category (a) so it gets its own reviewer checklist slot). When the plan touches an external library's API, configuration DSL, configuration file, enabled options, or type-level behavior — interpreted broadly so plugin activation and option tweaks count — reviewers must treat in-project references (`.examples.md`, `.local.md`, existing implementations) as secondary and require the plan to cite at least one primary source (installed type definitions, package source, or official reference docs). If the primary source cannot be consulted in the current environment (missing installed deps, no web access), the item is flagged in the plan as a stale-API concern instead of being trusted silently. Step 8 is not changed — the check is scoped to the planning gate to avoid noise at code review
  - Step 7: notes that TypeScript Project References / multi-tsconfig setups can leave changed files uncovered by `check_commands`. `--init` now auto-registers per-tsconfig `tsc -p <path> --noEmit` when 2+ tsconfigs or `references: [...]` are detected. The per-tsconfig form was chosen over `tsc -b --noEmit` because the latter is only supported on TypeScript ≥ 5.6; per-tsconfig `-p` is universally compatible and needs no version probing
  - Step 9: `--update` now additionally triggers when a dependency's major-version bump is detected via `git diff <base-commit>` on the package manifest (same signal as Step 2.6). This opens the runtime path for finding F3 — without this trigger the extract-rules Update Mode operational note was documented but never read in practice, because `--update` only ran on "significant structural/pattern changes"
  - Step 9.5: Simple hard-skip is now overridable by an explicit user request **within the same session** (e.g. "run the retrospective for this run anyway"). The manual re-run runs the `references/self-retrospective.md` procedure from §1 without updating TodoWrite (the Step 9.5 row stays `completed`) and prompts the user to re-verify the session jsonl selection at §1.4. Cross-session re-runs are not supported — once the workflow session has ended, the Step 2.6 difficulty assessment cannot be recovered. `references/self-retrospective.md`:7 was rewritten to define both the normal read path and the manual-re-run read path consistently
  - README.md sync: the Simple row now carries the major-bump exception as a footnote, and the Hard-skip-on-Simple section is retitled "overridable on explicit request" with invocation example
  - Out of scope (deferred): a lightweight coverage-check sub-step that warns when a changed file is not covered by any `check_command`. Out of scope for this release — the `--init` improvement closes the most common TypeScript instance, and a generic coverage-check step needs more design

### extract-rules v1.12.0

- docs(extract-rules): Operational note for post-major-version updates (retrospective-2026-04-20 finding F3)
  - Update Mode now opens with an operational note: after a dependency's major-version bump, run `--update` so the staleness check (Step U3) can flag removed symbols. The note also makes explicit that the current Step U3 check only inspects inline `` `symbol` `` patterns in `## Project-specific patterns` sections (`.local.md`) — code samples inside `.examples.md` are **not** auto-scanned. Manual review of `.examples.md` is required after a major bump; otherwise stale configuration samples there can silently propagate into future plans via reviewers treating project examples as authoritative
  - `--restructure` is not recommended for post-major-bump sync (it does not run a staleness check)
  - Out of scope: Restructure / Conversation / PR-Review mode ripple of the staleness check, fenced-code-block parser for `.examples.md`. Not addressed in this release

Note: `apply-rules` and `merge-rules` are **not** bumped. The `extract-rules` output format is unchanged by this release, and neither SKILL.md references dev-workflow / extract-rules content directly, so their behavior is unaffected.

## 2026-04-18

### dev-workflow v1.29.0 / dev-workflow-bundle v1.29.0

- feat(dev-workflow): Add Step 9.5 Self-Retrospective (Phase 1 — bundle-skill improvement signal)
  - New optional config key `self_retrospective.feedback` (string). When set, a new Step 9.5 runs between Step 9 (Update Rules) and Step 10 (Completion Hooks), scanning the current conversation for improvement signals about the bundled skills (`dev-workflow`, `ask-peer`, `extract-rules`, `rules-review`), sanitizing them, and submitting to a user-configured destination
  - Destination is auto-detected from the `feedback` string: `owner/repo` pattern → GitHub issue via `gh issue create`; paths starting with `/`, `~/`, `./`, `../` → a markdown file under that directory; any other value → warn and skip
  - Raw conversation (jsonl) stays in-session — only abstracted, project-agnostic text leaves. Explicit sanitization rules cover absolute paths, project/repo/product/user names, project-specific code identifiers, and dates/IDs/URLs. User preview + approve/edit/skip loop is always shown before submission
  - Skipped entirely when `self_retrospective.feedback` is unset or invalid (Step 9.5 not registered in TodoWrite). Also hard-skipped when Step 2 assesses the task as Simple difficulty (typo fix, config tweak), regardless of config — Simple tasks rarely exercise the bundled skills enough to produce meaningful signal
  - Repo-mode runs an early `gh auth status` check at Step 1 as a warning only, so the user is alerted up front that Step 9.5 will abort later; Step 9.5 re-checks and aborts with an actionable message as a backstop
  - Issue title is fixed as `[auto-retrospective] dev-workflow-bundle: <N> findings (<YYYY-MM-DD>)` so downstream automation can filter reliably; no default label
  - Full procedure (pre-flight, extraction, sanitization, submission, error handling) lives in `references/self-retrospective.md` (mirrors the Step 1.5 → `task-decomposition.md` deep-reference pattern)
  - Phase 2 (local skill-ification candidates from conversation scan, with create/edit/skip approval UX that writes directly under `.claude/skills/`) is intentionally deferred to a follow-up release (planned 1.30.0). Phase 1 ships the retrospective infrastructure; Phase 2 adds the higher-risk file-creation flow with name validation, allowed-tools constraints, and SKILL.md syntax validation

### dev-workflow v1.28.0 / dev-workflow-bundle v1.28.0

- feat(dev-workflow): Refine Step 1.5 decomposition heuristic toward independently-verifiable units
  - `references/task-decomposition.md` section B step 1 criteria reordered and rewritten. "The task splits into 2+ units where each unit has a distinct verification path" is now the strongest decompose signal, elevated above cross-module / and-list / staged-refactor heuristics
  - When decomposition signals are mixed, the workflow now biases toward proposing decomposition (the yes/adjust/no dialogue is cheap, smaller shippable PRs cut review load). "Feature looks singular" is no longer sufficient grounds on its own
  - Do NOT decompose criteria reframed around single verification path, atomicity-breaking splits, and a new guardrail against over-splitting (subtasks so small that per-PR overhead exceeds the benefit)
  - Rationale log now names the **primary signal** that drove the decision (e.g. `decompose: 2 distinct verification paths — admin CRUD + chat insertion`), so decomposition bias can be audited after the fact
  - Section B step 3.c decomposition-proposal dialogue now lists each subtask with its `verification_hint` (and `depends_on`), so the user can judge the breakdown at a glance before answering yes/adjust/no
  - Clarified decompose vs. veto precedence: atomicity / over-split vetoes and the single-verification-path case override non-primary positive signals (and-list, cross-layer, staged refactor). Only the primary signal — genuinely distinct verification paths — overrides these vetoes. Resolves the ambiguity where a light "X and Y" request could decompose despite PR overhead outweighing benefit
  - Clarified that `verification_hint` shown in the Step 1.5 proposal is advisory context for the split decision, not a user-approved completion contract — consistent with Step 2's existing treatment of `verification_hint` as AI-authored draft within otherwise-approved state files, so Step 2 can still refine hints without violating the yes the user gave in Step 1.5
  - Addresses a failure mode where features with 2 distinct verification units (e.g. admin CRUD + chat insertion) were classified as "feature contained in one module" and shipped as a single oversized PR, requiring post-hoc splitting
  - README.md "Decomposition judgment" section synced with the new criteria

### dev-workflow v1.27.0 / dev-workflow-bundle v1.27.0

- feat(dev-workflow): Add simplicity-first audit to Step 2 / Plan Review / Code Review
  - Step 2 gains a new `Simplicity self-audit` sub-step. Right after drafting the plan, each element must be traceable to an explicit user requirement, a known bug/constraint, or a documented `.claude/rules/` rule; elements without such a trigger must be dropped or annotated with an explicit rationale
  - Inherited spec files under `.claude/plans/*.md` are treated as prior-session drafts, not confirmed requirements. Task-decomposition state files are the exception: user-approved subtask boundaries, order, `depends_on`, and purposes are honored as-is, while AI-authored descriptions within each subtask remain draft
  - Step 3 category (a) Scope & feasibility is reframed to verify the author's self-audit, so the reviewer focuses on elements with weak or missing rationale rather than re-running the same traceability check
  - Step 8 category (c) Simplicity & maintainability now explicitly flags speculative features without an explicit trigger, catching scope creep that slipped past earlier gates
  - Addresses a failure mode where prior-session plan files were treated as confirmed requirements and carried forward unvetted elaboration into implementation

## 2026-04-13

### dev-workflow v1.26.0 / dev-workflow-bundle v1.26.0

- feat(dev-workflow): Add `Incrementality` category to Step 3 Plan Review
  - Reviewer is now asked whether the plan can be split into smaller, independently verifiable units (hotfix vs refactor, behavior change vs structural change)
  - Catches cases where a task-level "single concern" still bundles independent work at the plan level, where Step 1.5 decomposition correctly passed
  - Regression attribution concerns ("which change caused this?") are called out as a strong splittability signal

## 2026-04-11

### dev-workflow v1.25.1 / dev-workflow-bundle v1.25.1

- fix(dev-workflow): Explicitly instruct autonomous judgment on review findings
  - Step 3 (Plan Review) and Step 8 (Code Review) now explicitly state "autonomously ... do not ask the user for judgment on individual review findings"
  - Addresses issue where the model deferred to the user on every review finding instead of autonomously applying fixes or rejecting inapplicable points
  - Final fallback to user (Step 3.4 / Step 8.4 for unresolved points after all iterations) remains unchanged

## 2026-04-10

### dev-workflow v1.25.0 / dev-workflow-bundle v1.25.0

- refactor(dev-workflow): Remove completion hooks prompt from `--init`
  - `--init` no longer asks about hooks — hooks are left unconfigured by default
  - Users can still configure `hooks.on_complete` manually in settings files (execution mode Step 10 unchanged)

### dev-workflow v1.24.0 / dev-workflow-bundle v1.24.0

- feat(dev-workflow): Add 3-layer configuration with type-aware merge
  - New project shared settings file: `.claude/dev-workflow.md` (git tracked, team-shared)
  - Settings are merged across three layers: user global (`~/.claude/dev-workflow.local.md`) → project shared (`.claude/dev-workflow.md`) → personal override (`.claude/dev-workflow.local.md`)
  - Merge strategy: scalar keys are replaced by higher layer; list keys (`check_commands`) are appended and deduplicated; `hooks` is deep-merged (`on_complete` list is appended). `null`/empty explicitly clears the key
  - `--init` now saves to `.claude/dev-workflow.md` (project shared) instead of `.claude/dev-workflow.local.md`
  - Existing `.claude/dev-workflow.local.md` continues to work as the highest-priority personal override layer — no migration needed
  - Personal overrides (`.claude/dev-workflow.local.md`) are created manually with only the keys to override

### dev-workflow v1.23.0 / dev-workflow-bundle v1.23.0

- feat(dev-workflow): Add `task_decomposition` setting to disable auto-decomposition in Normal sub-mode
  - Default `true` — existing behavior unchanged
  - Set to `false` to skip Step 1.5's auto-decomposition check entirely — Normal sub-mode requests (`/dev-workflow <task>`) are treated as single tasks. Step 1.5 is omitted from TodoWrite in this mode
  - `--resume <state-file>` is unaffected — existing state files can still be resumed explicitly
  - Non-boolean values fall back to `true` with a warning
- docs(dev-workflow): Refactor SKILL.md for skill-creator best practices
  - Step 1.5 Task Decomposition detail extracted to `references/task-decomposition.md` — SKILL.md drops from 306 to 254 lines (~17% reduction), and simple single-concern runs no longer load state-file semantics they don't need (progressive disclosure)
  - Step 3 / Step 8 `MUST continue re-review` reframed with the *why* (plan modifications often introduce fresh ripple effects; code fixes routinely introduce new bugs) so the instruction persuades instead of insisting
  - No runtime behavior change — all semantics preserved, just documented differently

## 2026-04-09

### dev-workflow v1.22.0 / dev-workflow-bundle v1.22.0

- feat(dev-workflow): Add task decomposition for splitting large tasks into PR-sized subtasks
  - New **Step 1.5: Task Decomposition** runs between Step 1 (Load Settings) and Step 2 (Create Plan)
  - In Normal sub-mode, the workflow lightweightly judges whether the request should be split and proposes a decomposition to the user for approval. Simple, single-concern tasks pass through unchanged
  - Approved decompositions are persisted to `.claude/plans/dev-workflow.<slug>.md` — one state file per parent task, so multiple parent tasks can proceed in parallel
  - Each subtask runs through the existing Step 2–10 flow as an independent PR-sized unit
  - New `--resume <state-file>` flag picks up the next runnable subtask in a fresh session. Accepts full path, filename, or bare slug
  - On subtask completion, the workflow instructs the user to commit + open a PR before resuming the next subtask. The workflow itself never stages, commits, or pushes
  - Parent-task progress is surfaced as a TodoWrite top-level row (`Parent task: N/TOTAL subtasks done — <slug>`)
  - Edge cases handled: YAML parse errors on state files, `depends_on` cycles, missing `--resume` targets, and leftover `in_progress` subtasks from interrupted sessions
  - Step 1.5 is intentionally separate from Plan Mode (which is still reserved for Step 2) so the decomposition proposal is a plain yes/no dialogue

## 2026-04-07

### dev-workflow v1.21.0 / dev-workflow-bundle v1.21.0

- feat(dev-workflow): Add automatic review iteration adjustment based on task difficulty
  - Assesses task difficulty (Simple/Moderate/Complex) after plan creation in Step 2
  - Reduces review iteration count (N) for simpler tasks — configured value acts as ceiling, not target
  - Simple tasks (typo fix, config tweak): N=1, Moderate (single-module multi-file): N=min(2,N), Complex: keep N
  - Explicit `-i N` / `--iterations N` CLI flag skips difficulty assessment (user override)
  - Excess TodoWrite iteration items (Step 3-x, Step 8-x) marked as completed when N is reduced

### All plugins (patch version bump)

- fix: Isolate plugin source directories to prevent duplicate skill registration
  - Each plugin now has its own `plugins/<name>/` source directory with symlinks to `skills/`
  - Previously all plugins shared `source: "./"`, causing Claude Code to auto-discover all skills for every plugin
  - Workaround for [anthropics/claude-code#13344](https://github.com/anthropics/claude-code/issues/13344)
- docs: Update CLAUDE.md to reflect new plugin structure and skill addition flow

## 2026-04-06

### dev-workflow v1.20.0 / dev-workflow-bundle v1.20.0

- feat(dev-workflow): Add `custom_instructions` configuration for injecting user-defined development instructions
  - Free-form string applied to planning (Step 2), plan review (Step 3), implementation (Step 5), simplify (Step 6), and code review (Step 8)
  - Configured via `dev-workflow.local.md` YAML frontmatter
  - `.claude/rules/` and explicit user requests take precedence over `custom_instructions`

### dev-workflow v1.19.0 / dev-workflow-bundle v1.19.0

- feat(dev-workflow): Add hooks configuration for executing skills/commands at workflow timing points
  - `hooks.on_complete`: runs after Step 9 (Update Rules), before completion report
  - Entry format: `Skill(<name>)` for skill invocation, or shell command string
  - Non-blocking: hook failures are reported as warnings in completion summary
  - Configured via `dev-workflow.local.md` YAML frontmatter
- feat(dev-workflow): Add Step 10 (Completion Hooks) to workflow execution
- feat(dev-workflow --init): Add hooks configuration step to project setup flow

## 2026-04-04

### merge-rules v2.0.0 / apply-rules v2.0.0 / extract-rules v1.11.0 / dev-workflow-bundle v1.18.3

**Breaking change**: Promoted patterns are now converted to Principles format and integrated into `## Principles`. The `## Project-specific patterns` section is no longer produced by merge-rules. Existing merge-rules output with `## Project-specific patterns` must be regenerated by re-running merge-rules.

- feat(merge-rules): Promote .local.md patterns to Principles format (`Description (signature)`) instead of separate `## Project-specific patterns` section
- feat(merge-rules): Add deduplication against existing Principles to prevent self-amplification from previously promoted patterns in `.local.md`
- feat(merge-rules): Promoted pattern examples are included under `## Principles Examples` (no more `## Project-specific Examples` in output)
- feat(merge-rules): Design note clarifying promoted Principles are permanent org-level rules
- feat(apply-rules): Clean up promoted patterns from `.local.md` files (cross-format duplicate removal)
- feat(apply-rules): Remove corresponding `## Project-specific Examples` entries for cleaned-up patterns
- feat(apply-rules): Delete `.local.md` files that become empty after cleanup
- remove(apply-rules): Remove promoted→`.local.md` routing (promoted patterns are now regular Principles)
- feat(extract-rules): Add cross-format duplicate check in Update mode (Step U4) and Conversation mode to prevent re-adding patterns already promoted to Principles
- refactor: Simplify skill descriptions for merge-rules, apply-rules, and extract-rules to reduce context overhead

### extract-rules v1.10.1 / dev-workflow-bundle v1.18.2 (earlier today)

- feat: Remove default size limits from `extract_session_messages.mjs` — all messages included by default
  - `--max-chars` and `--max-per-message` are now optional (default: no limit)
  - Previously defaulted to 100K chars / 2000 chars per message

## 2026-04-03

### extract-rules v1.10.0 / dev-workflow-bundle v1.18.1

- feat: `--from-conversation` mode reads full session history from `.jsonl` files on disk
  - No longer limited to context window — captures all messages including those lost to compaction
  - Session file located via encoded project path under `~/.claude/projects/`
  - Supports `<session-id>` argument to target a specific session (default: latest by mtime)
- feat: Delegate heavy processing to subagent to keep main context clean
  - Main agent handles settings + session file resolution (C1-C2)
  - Subagent handles jsonl parsing, analysis, rule extraction, and file writing (C3-C5)
  - Subagent instructions moved to `references/conversation-mode.md` (progressive disclosure)
- feat: Bundle Node.js script `scripts/extract_session_messages.mjs` for jsonl parsing
  - Filters user/assistant text messages, skips tool_use/thinking blocks
  - Recovers `AskUserQuestion` responses via interactive tool ID whitelist
  - Latest-first processing with configurable size limits (100K chars default)
  - Input validation, malformed JSON line diagnostics
- refactor: Replace `Bash(python3 *)` with `Bash(node *)` in allowed-tools (node is guaranteed by Claude Code)
- fix: Update `references/pr-review-mode.md` Step C4 → C5 reference

### dev-workflow v1.18.0 / dev-workflow-bundle v1.18.0

- feat: Improve init-mode run-tests generation for autonomous test execution
  - Add Docker daemon readiness check as prerequisite when docker-compose is detected (daemon → services, two-step)
  - Detect existing run-tests skills lacking Docker daemon check and offer regeneration
  - Support `.yaml` extension variants for docker-compose detection
  - Generalize run-tests template: category-based prerequisites, technology-agnostic allowed-tools
  - Add async service retry rule in Process section (re-check with retries for up to 30 seconds)
  - Align pseudo-execute flow with async retry rule

## 2026-04-02

### rules-review v1.0.0

- feat: New skill for `.claude/rules/` compliance checking
  - Match rule files to changed files via `paths:` frontmatter globs
  - Group rules by category (project, languages, frameworks, integrations, custom)
  - Parallel review via sub-agents per group
  - Standalone usage: `/rules-review --base-commit <sha>`

### dev-workflow v1.17.0 / dev-workflow-bundle v1.17.0

- feat: Add Step 7.5 (Rules Compliance Review) as dedicated rules enforcement step
  - Runs `Skill(rules-review)` between Check/Test (Step 7) and Code Review (Step 8)
  - 2-cycle max: fix violations → re-verify → escalate to user if unresolved
  - Step 8 re-run after code modifications includes Step 7.5
  - Step 8 retains lightweight rules check as safety net
- feat: Bundle `rules-review` skill with `dev-workflow-bundle` plugin

## 2026-04-01

### dev-workflow v1.16.0

- feat: Strengthen rules compliance checking and test coverage verification
  - Step 2: Require specific test files (existing to update or new to create) in test plan, not just abstract descriptions
  - Step 3: Plan reviewer verifies specific test files are identified and existing related tests are covered for update; read all files under `.claude/rules/`
  - Step 8: Reviewer must read all files under `.claude/rules/` and verify compliance against the diff, citing rule file path and violated rule text
  - Step 8: Verify planned test files from Step 2 are present in the diff

### dev-workflow v1.15.1

- fix: Ensure re-review after modifications in Plan Review (Step 3) and Code Review (Step 8)
  - If plan/code was modified based on review feedback, MUST continue to next iteration for re-review
  - If all points were rejected (no modifications), remaining iterations can be skipped
  - Step 8: Consolidate "Re-run Step 7" and "re-review required" under single "code was modified" branch

### dev-workflow v1.15.0

- fix: Strengthen plan approval flow to prevent premature user approval before plan review
  - Step 2: Explicitly forbid presenting plan or asking for approval/confirmation (bold + caps emphasis)
  - Step 3: Add internal review declaration — do not present plan to user during review iterations
  - Step 4: Add `(USER APPROVAL GATE)` to heading, mark as first time user sees the plan
  - Step 4: Add re-review condition — return to Step 3 with new iteration item if user requests material scope/approach changes
  - Step 4: Require explicit user acceptance before proceeding

### apply-rules v1.1.0

- feat: Add `AskUserQuestion` to `allowed-tools` for explicit user confirmation at decision points
  - Step 4 (Integration proposals): batched list with `all / none / number` selection
  - Step 5.5 (File name normalization): confirm renames before applying
  - Step 6 (Principle conflicts): collect all conflicts, present together with `1a, 2c` format
  - Step 7 (Non-conforming files): migration plan as single list, `project.*` excluded from "all"
- feat: Update Conflict Handling table to reflect all `AskUserQuestion` usage points

## 2026-03-31

### apply-rules v1.0.0

- feat: New skill to apply organization-wide rules (merge-rules output) to any project
  - Source specification via GitHub URL or local path (direct path to rules directory)
  - Auto-detect project tech stack (languages, frameworks, integrations) to filter relevant rules
  - Intelligent merge: `.md` (Principles) merged, `.local.md` preserved, promoted patterns routed to `.local.md`
  - Integration proposal: suggest unused but related integration rules for user approval
  - Structure conformance check: migrate non-conforming rule files with user confirmation
  - Fetch from GitHub via `gh api` (no git clone authentication issues)
  - Dry-run mode for previewing changes

## 2026-03-30

### dev-workflow v1.14.0 / dev-workflow-bundle v1.14.0

- fix: Embed check_commands/test_commands values in TodoWrite Step 7 description to prevent context loss
  - Step 7 registered as `Step 7: Check / Test [check: {check_commands} | test: {test_commands}]`
  - Settings values stay visible through TodoWrite progress checks, reducing risk of AI forgetting commands mid-workflow

### dev-workflow v1.13.0 / dev-workflow-bundle v1.13.0

- feat: Add test prerequisites check & setup to `run-tests` skill template
  - Auto-detect prerequisites from project files (docker-compose.yml, database.yml, .env.example, bin/setup)
  - Prerequisites section added to generated `run-tests` only when detected
  - Check prerequisites → setup if needed → spawn subagent for test execution; setup failure reports EXECUTION_ERROR with remediation
  - `allowed-tools` in generated skill dynamically includes prerequisite commands
- fix: Use pseudo-execution for `--init` verification step (resolves unregistered skill issue in same session)
  - Read generated SKILL.md and execute test commands directly instead of calling `Skill(run-tests)`
  - Prerequisites checks also run during pseudo-execution
- docs: Add session note — skills generated by `--init` are recognized from the next session onward

### dev-workflow v1.12.0 / dev-workflow-bundle v1.12.0

- feat: Subagent-based test execution to reduce main context consumption
  - `--init` generates canonical `run-tests` skill with Agent-based subagent execution
  - All test execution goes through `Skill(run-tests)` — no more direct shell commands or arbitrary skill names
  - Subagent returns structured summary (SUCCESS / TEST_FAILED / EXECUTION_ERROR) instead of raw test output
  - Includes stack trace excerpts and code locations for failures — enough to fix without re-running
  - Scope decision delegated to `run-tests` skill via `--base-commit <sha>` argument
  - Existing `run-tests` in current format is reused; outdated format is automatically regenerated (test commands are preserved)
- docs: Add `run-tests` SKILL.md template to `references/init-mode.md`

### dev-workflow v1.11.0 / dev-workflow-bundle v1.11.0

- feat: Add `review_iterations` default value (3) to `--init` generated config file
- feat: Add verification step after `--init` config creation
  - Run check_commands and test_commands to verify they work
  - `Skill()` entries: select a test file and invoke the skill, or run minimum test scope
  - Report pass/fail summary; failures suggest fixes but do not block

## 2026-03-28

### dev-workflow v1.10.0 / dev-workflow-bundle v1.10.0

- feat: Enhance `--init` test_commands detection with test skill auto-detection and generation
  - Detect existing test skills in `.claude/skills/` (e.g., `test-file`, `run-tests`) and propose `Skill(<name>)`
  - Auto-generate `run-tests` skill when 3+ distinct test scopes detected (with overwrite protection)
  - Fall back to direct commands for 1-2 test scopes, or project-type standard commands
- refactor: Extract Init Mode instructions to `references/init-mode.md` for progressive disclosure

### dev-workflow v1.9.0 / dev-workflow-bundle v1.9.0

- feat: Make review iteration count configurable (default: 3, positive integer)
  - Add `review_iterations` setting to `dev-workflow.local.md` configuration
  - Add `-i N` / `--iterations N` command option for per-invocation override
  - Priority: `-i` / `--iterations` option > config `review_iterations` > default `3`
  - Step 1: Dynamically generate N iteration sub-items for TodoWrite registration
  - Steps 3/8: Process N pending iteration items instead of hardcoded 3

### dev-workflow v1.8.0 / dev-workflow-bundle v1.8.0

- feat: Improve plan approval flow — reviewer reviews the plan before user approval
  - Step 2: Add instruction to proceed directly to Step 3 without asking user for approval
  - Step 4: Add explicit user approval flow (present → collaborate → accept → ExitPlanMode)
  - Step 3: Carry unresolved review points forward to Step 4 instead of asking user mid-review

### peer v2.2.0 / dev-workflow-bundle v1.7.1

- feat: Add autonomous parallel review — when a review request contains multiple independent categories, ask-peer spawns one subagent per category in parallel and merges results

## 2026-03-27

### dev-workflow v1.7.0 / dev-workflow-bundle v1.7.0

- feat: Add test review perspectives to plan creation, plan review, and code review
  - Step 2: Require test plan in implementation plan (what to test, test types, scope — or why no tests are needed)
  - Step 3: Change review category from "test strategy" to "test plan adequacy" for explicit presence/scope check
  - Step 8: Add "missing or insufficient tests for changes" to Correctness & edge cases category

### dev-workflow v1.6.0 / dev-workflow-bundle v1.6.0

- feat: Pre-register review iterations in Step 1 TodoWrite checklist as sub-items (Step 3-1/3-2/3-3, Step 8-1/8-2/8-3)
  - Iterations visible from workflow start, making skipping structurally harder
  - Step 3/8 rewritten as "process each pending iteration item" instead of loop description
  - Eliminates natural-language loop that AI tends to short-circuit after 1 pass
  - Skip remaining only when reviewer returns "No actionable findings"

### dev-workflow v1.5.0 / dev-workflow-bundle v1.5.0

- feat: Pre-register 3 review iterations as TodoWrite items in Step 3/8
  - Default is "run 3 times"; skip remaining only when reviewer returns "No actionable findings"
  - Prevents short-circuiting reviews after a single iteration

### dev-workflow v1.4.0 / dev-workflow-bundle v1.4.0

- feat: Strengthen code review (Step 8) enforcement to prevent skipping
  - Add TodoWrite-based workflow phase tracking in Step 1 (all phases registered upfront, phase items must remain)
  - Add GATE check between Step 7 and Step 8 (verify prior steps completed)
  - Add `MANDATORY, DO NOT SKIP` marker to Step 8 header
  - Structure review request into 3 categories (Correctness, Conventions, Simplicity)
  - Add iteration status tracking via TodoWrite in Step 8
- fix: Change review loop condition from "code modified" to "actionable feedback remains"
- fix: Use base-commit (`git rev-parse HEAD` at Step 2) instead of `HEAD` for accurate diff across intermediate commits
- feat: Require reviewer to explicitly state "No actionable findings" when no issues found
- feat: Strengthen plan review (Step 3) with same improvements
  - Structure review request into 3 categories (Scope & feasibility, Approach & alternatives, Completeness)
  - Include `.claude/rules/` compliance as explicit review dimension
  - Fix review loop condition from "plan modified" to "actionable feedback remains"
  - Require reviewer to explicitly state "No actionable findings" when no issues found
- chore: Add `Bash(git rev-parse *)` to allowed-tools

## 2026-03-26

### dev-workflow v1.3.0 / dev-workflow-bundle v1.3.0

- feat: Make reviewer skill configurable via `reviewer` setting in `dev-workflow.local.md`
  - Supported: ask-peer, ask-claude, ask-codex, ask-gemini, ask-copilot (default: ask-peer)
  - Unsupported or unspecified values fall back to ask-peer
  - Init Mode now includes reviewer selection step
  - All ask-* skills added to allowed-tools
- refactor: Generalize "peer" references in Step 3/8 headings and descriptions
  - `Peer Plan Review` → `Plan Review`, `Peer Code Review` → `Code Review`
  - `Skill({reviewer})` template replaced with natural language instructions

### peer v2.1.0 / dev-workflow-bundle v1.2.1

- feat: Add "Implementation discussion → Structured tradeoff analysis" to Output Format

### dev-workflow v1.2.0 / dev-workflow-bundle v1.2.0

- fix: Make peer re-review loop explicit (Step 3, Step 8)
  - Explicitly specify `Skill(ask-peer)` re-invocation after modifications
  - Require both updated artifact (plan/git diff) and change summary on re-review
  - Clarify iteration counting (max 3 including initial review)
  - Separate success exit (no feedback → next step) from max iterations reached (user decision)

### dev-workflow v1.1.0 / dev-workflow-bundle v1.1.0 (BREAKING)

- **BREAKING**: Remove `lint_command`/`format_command`/`test_command`. Re-run `/dev-workflow --init` required
- feat: Replace single command config with array-based categories
  - `lint_command`/`format_command`/`test_command` → `check_commands`/`test_commands`
  - `check_commands`: Multiple static checks (lint, format, typecheck, etc.) as array
  - `test_commands`: Multiple test commands (unit, e2e, integration, etc.) as array
- feat: Support `Skill()` entries in test_commands for skill-based test execution
- feat: Improve Init Mode to detect multiple check/test commands
- fix: Clarify Step 7 flow (check failure blocks test execution, fallback to run all tests when uncertain)
- chore: Expand allowed-tools (`bun run`, `pnpm exec`, `uv run`, `make typecheck`, `make check`)

### translate v1.1.1

- fix: Strengthen agent prompts to prevent chat mode on short inputs
  - tr (haiku): Change role to "translation engine", explicitly prohibit greetings/questions/self-introduction
  - tr-hq (sonnet): Add task boundary constraint while preserving expert role definition
  - Add short English input example (`hello` → `こんにちは`) to both agents

### peer v2.0.0 (BREAKING)

- refactor: Convert from plugin to standalone skill
  - Embed peer agent personality directly in SKILL.md
  - Remove `plugins/peer/` directory (agent file + plugin.json)
  - Spawn peer subagent via Agent tool instead of dedicated agent type
  - **Breaking**: `subagent_type: "peer"` is no longer available. Use `/ask-peer` skill instead.

### dev-workflow v1.0.0 / dev-workflow-bundle v1.0.0

- feat: Add guided development workflow skill
  - Orchestrates: plan → peer review → implement → lint/format/test → code review → rules update
  - `--init` mode for project setup (auto-detect lint/format/test commands)
  - Peer plan review and code review with `.claude/rules/` reference
  - Review loops with max 3 iterations
  - Automatic rule extraction via extract-rules `--from-conversation`
- feat: Add dev-workflow-bundle (skills-only)
  - All-in-one install: dev-workflow + ask-peer + extract-rules

## 2026-03-25

### ask-codex v1.2.0 / ask-gemini v1.2.0 / ask-copilot v1.0.2

- feat: Add conversation continuation support
  - ask-codex: `codex exec resume --last "prompt"` to resume the most recent session (dedicated section)
  - ask-gemini: `gemini --resume latest -p "prompt"` to resume the most recent session
- fix(ask-gemini): Use `-p` flag consistently for non-interactive mode
  - Quick start, all examples, and notes updated to use `-p` instead of positional args
  - Added `-p` to common options table
- fix(ask-copilot): Add follow-up prompt to continuation example (consistent with other ask-* skills)

## 2026-03-16

### extract-rules v1.9.1 / merge-rules v1.1.1

- fix: Standardize all section headings (`#`, `##`, `###`) and reference labels to English regardless of `language` setting
  - Remove i18n heading tables and language-aware label switching (`判断に迷った場合` / `When in doubt` → `When in doubt` fixed)
  - `language` setting now only affects rule content (Good/Bad examples, descriptions) and reports
- refactor: Unify `## Common patterns` into `## Project-specific patterns` in merge-rules output
  - Eliminates separate section for promoted patterns — input/output section names now match
  - Simplifies re-merging of merge-rules output
- fix: Add explicit `###` title matching rule (must match rule file names exactly, no translation/rephrasing)
  - extract-rules: Added to SKILL.md and examples-format.md with concrete examples
  - merge-rules: Added to Step 5.5 output constraints

### ask-codex v1.1.3 / ask-gemini v1.1.2

- fix: Update outdated model names in SKILL.md examples
  - ask-codex: `o4-mini` → `gpt-5.3-codex` (Codex CLI flagship model)
  - ask-gemini: `gemini-2.5-pro` → `gemini-3.1-pro-preview` (gemini-3-pro-preview was deprecated on 2026-03-09)

### extract-rules v1.9.0

- feat: Add `.examples.md` generation for Good/Bad code examples per rule category
  - Separate from rule files (no `paths:` frontmatter) — not auto-loaded into context
  - Good/Bad contrast for principles, usage examples for project-specific patterns
  - All modes support `.examples.md` (Full Extraction, Update, Restructure, Conversation, PR Review)
  - Format specification externalized to `references/examples-format.md`
  - Quality criteria added to `references/extraction-criteria.md`
- feat: Add `language` resolution chain: skill config → Claude Code settings → default `ja`
  - **Note**: Default changed from `(none)` (English) to `ja`. To keep English output, set `language: en` in config
- fix: `language` description updated to reflect usage in both reports and generated labels

### merge-rules v1.1.0

- feat: Add `.examples.md` merge support
  - Merge Principles Examples by section heading (adopt most detailed or merge Good/Bad)
  - Project-specific Examples linked to promoted patterns via semantic matching
  - Output under `## Common patterns Examples` section
- feat: Add hybrid format (`split_output: false`) input support
  - Detect `## Project-specific patterns` in `.md` files and treat as promotion candidates
- feat: Add `language` resolution chain: skill config → Claude Code settings → default `ja`
- fix: `promote_threshold` example corrected (`4 projects → 3/4`, not `2/4`)
- fix: Report template switched to English base with `language` setting support

## 2026-03-14

### extract-rules v1.8.0

- feat: Add `resolve_references` setting for `--restructure` mode
  - Scan existing rule files for references (Markdown links, text references, `@path`) and resolve them
  - Extract rules from referenced files and merge into the restructure pipeline
  - Referenced rules treated as existing rules (take priority on conflict)
  - Detailed processing steps externalized to `references/resolve-references.md`

### extract-rules v1.7.0

- feat: Reframe extraction criteria around "Claude's knowledge gap"
  - Core question changed from "Is this project-specific?" to "Would Claude produce something different without this rule?"
  - Anti-pattern extraction added (things Claude would naturally do that the team has rejected)
- feat: Add staleness check in `--update` mode
  - Verifies referenced symbols in `.local.md` still exist in codebase
  - Reports potentially stale rules for user review (no auto-deletion)
- feat: Add deduplication check against existing CLAUDE.md and `.claude/rules/`
  - Prevents extracting rules already documented elsewhere
- improve: Enhance `--from-conversation` mode
  - User corrections explicitly identified as highest-value signal
  - Guidance to run soon after corrections (before context compaction)

## 2026-03-13

### extract-rules v1.6.0

- feat: Add `--from-pr` mode to extract coding rules from PR review comments
  - Fetches inline review comments, general PR comments, and review bodies via `gh` CLI
  - Filters out bot comments automatically
  - Uses PR diff context for better pattern understanding
  - Supports both PR number (current repo) and GitHub URL (any repo)

## 2026-03-06

### extract-rules v1.5.0

- feat: Add integration library detection and separation
  - Detect integration libraries (Inertia, Pundit, Devise, Turbo, etc.) from dependency files
  - Separate integration-specific rules into `integrations/` directory (e.g., `integrations/rails-inertia.md`)
  - Distinguish between framework layers (inherent architecture) and integrations (optional libraries)
  - Framework name included in integration file names (rules differ by host framework)
  - Works with all modes: Full Extraction, Update, Restructure, Conversation Extraction

### merge-rules v1.0.0

- feat: New skill to merge extract-rules output from multiple projects
  - YAML config file for specifying source projects
  - Merges portable principles (.md) across projects with deduplication
  - Promotes .local.md patterns shared across 2/3+ of projects to common patterns
  - Outputs .md files only (no .local.md)
  - `--dry-run` option for preview without writing
  - Conflict detection and reporting

## 2026-03-03

### extract-rules v1.4.0

- feat: Add `--restructure` option for file structure reorganization with content merge
  - Re-analyzes codebase to determine optimal file structure
  - Merges existing rules into new structure (preserves manual edits and conversation-extracted rules)
  - Existing rules take priority over fresh extraction on conflict (respects manual edits)
  - Shows restructure plan for user confirmation before execution
  - Handles split_output mode transitions (hybrid ↔ split)
  - Unmatched rules fall back to project.md
- **breaking**: Change `split_output` default from `false` to `true` (Principles and Project-specific patterns are now separated by default)
- remove: `--force` option (use `rm -rf .claude/rules/ && /extract-rules` or `--restructure` instead)
- refactor: Extract report templates to `references/report-templates.md` (progressive disclosure)
- refactor: Simplify Restructure Mode steps (R1-R6 → R1-R5, concise descriptions)

## 2026-03-02

### extract-rules v1.3.0

- feat: Add `split_output` option for `.local.md` file separation (opt-in)
  - `split_output: false` (default): Single hybrid file per category (backwards compatible)
  - `split_output: true`: Principles → `<name>.md` (portable), Project-specific patterns → `<name>.local.md` (local)
  - Classification is mechanical: `## Principles` → shared file, `## Project-specific patterns` → local file
  - `project.md` is never split (inherently project-specific)
- feat: Add layered framework support (Rails, Django, Spring, etc.)
  - Detect architectural layers (e.g., models, controllers, views) when directories exist
  - Generate layer-specific files with scoped `paths:` (e.g., `rails-model.md`)
  - Cross-layer rules in `<framework>.md` (no `paths:` or broad scope)
- feat: Handle orphaned `.local.md` files when switching split modes
  - `--force`: Warns and deletes orphaned `.local.md` files
  - `--update`: Warns and recommends running `--force` to clean up
- refactor: Extract classification criteria to `references/extraction-criteria.md`
  - Progressive disclosure: metadata → SKILL.md body → bundled references
- refactor: Remove `Bash(grep *)` from allowed-tools (use Grep tool instead)
- docs: Enhanced skill description for better trigger matching

## 2026-02-25

### caffeinate v1.0.0

- feat: macOS caffeinate management plugin
  - Prevent idle/system sleep with `caffeinate -is`
  - PID file-based process management (unique per project)
  - start/stop/status modes (`/caffeinate`, `/caffeinate stop`)
  - Auto-stop on session end via SessionEnd hook

## 2026-02-21

### extract-rules v1.2.0

- feat: Add scope criterion to Concrete Example Criteria (Symbol + Scope dual filter)
  - Project-wide usage or convention-defining patterns only — skip local utilities
- feat: Change Decision criterion to inconsistency-based approach
  - "Would AI produce inconsistent results without knowing this pattern?"
- feat: Change Fallback rule from "include when uncertain" to "apply the scope criterion"
  - Rules should answer "how to write new code" not "what utilities exist"

## 2026-02-02

### ask-claude v1.1.2, ask-codex v1.1.2, ask-gemini v1.1.1, ask-copilot v1.0.1, security-scanner v1.2.1, extract-rules v1.1.1

- refactor: Update `allowed-tools` Bash syntax from legacy colon format to space format
  - Changed: `Bash(command:*)` → `Bash(command *)`
  - This follows the current recommended syntax per Claude Code official documentation
  - Affected skill files and command files
  - Updated documentation examples in `CLAUDE.md`, `.claude/rules/project.rules.md`, `docs/article-peer-plugin.md`

## 2026-01-29

### extract-rules v1.1.0

- feat: Add `--update` option to re-scan and add new patterns while preserving existing rules
- feat: Hybrid output format (Principles + Project-specific patterns)
- feat: Abstract principles with implementation hints for general style choices
- feat: Compact one-line format for project-specific patterns
- remove: `--dry-run` option (use git to revert if needed)
- docs: Add extraction criteria sections

## 2026-01-28

### extract-rules v1.0.0

- Initial release: Extract project-specific coding rules from codebase for AI agents
- `/extract-rules` command to analyze codebase and generate rule documentation
- `--force` option to overwrite existing rule files
- `--dry-run` option for analysis without file output
- `--from-conversation` option to extract rules from conversation history
- 11 extraction categories: naming, types, testing, error-handling, structure, imports, comments, architecture, domain, async-patterns, logging
- Language/framework-based organization for rule portability
- Configurable via `.claude/extract-rules.local.md`
- Output structure:
  - `languages/` - Language-specific rules (portable)
  - `frameworks/` - Framework-specific rules (portable)
  - `project/` - Project-specific rules (domain, architecture)

## 2026-01-26

### security-scanner v1.2.0

**Multi-agent support for skills scanning**

- feat: Add `target_agents` configuration to scan skills from multiple AI agents
- Supported agents: `claude`, `codex`, `gemini`, `agents` (Skills.sh/Amp)
- Default: `claude` only (backward compatible)
- note: For Skills.sh, configure `target_agents` appropriately to avoid redundant scanning
- feat: Add Agent column to report summary and findings
- feat: Add `report_language` configuration (default: `ja`)
- fix: Add `Bash(ls:*)` to allowed-tools for symlink directory listing
- Agent-specific skill paths:
  - claude: `.claude/skills/`, `~/.claude/skills/`
  - codex: `.codex/skills/`, `~/.codex/skills/`
  - gemini: `.gemini/skills/`, `~/.gemini/skills/`
  - agents: `.agents/skills/`, `~/.config/agents/skills/`, `~/.agents/skills/`

### translate v1.1.0

- feat: Add user-level configuration support (`~/.claude/translate.local.md`)
- Project-level settings take precedence over user-level
- Aligns with security-scanner configuration pattern

## 2026-01-25

### ask-copilot v1.0.0

- Initial release: Copilot CLI integration for getting a second opinion
- `/ask-copilot` skill to invoke `copilot` CLI

## 2026-01-24

### Repository restructure (anthropics/skills pattern)

- Adopt anthropics/skills pattern for skill-only items
- `skills/` is now canonical location (no duplication)
- Skill-only plugins use `source: "./"` + `skills` array to reference `skills/` directory
- Agent-dependent plugins (peer, translate) remain in `plugins/`
- Delete redundant `plugins/` directories: ask-claude, ask-codex, ask-gemini, security-scanner

**For existing users:** Refresh the marketplace to update to the new structure.

### Skills.sh support

- Add `skills/` directory for Skills.sh distribution
- Available skills: `ask-claude`, `ask-codex`, `ask-gemini`, `security-scanner`
- Install via: `npx skills add hiroro-work/claude-plugins`
- Note: Agent features (peer, translate) are only available via Claude Code Plugin Marketplace

### security-scanner v1.1.2

- feat: Add URL auto-detection for GitHub URLs (`--url` flag is now optional)

### security-scanner v1.1.1

- Remove `--plugins` and `--skills` options to simplify the skill (always scans both)

### security-scanner v1.1.0

**Renamed from plugin-security to security-scanner** to reflect expanded scope and clearer purpose.

- feat: Add `--url` option for scanning plugins from GitHub public repositories
- feat: Add skills scanning (`~/.claude/skills/`, `.claude/skills/`)
- Supports full GitHub URLs (e.g., `https://github.com/owner/repo/tree/main/plugins/my-plugin`)
- Supports non-plugin content: skill directories without plugin.json, single SKILL.md files
- Uses GitHub Contents API via WebFetch (no authentication required for public repos)
- Error handling for private repos, rate limits, and invalid paths
- Renamed: `/plugin-security` → `/security-scanner`
- Renamed: `.claude/plugin-security.local.md` → `.claude/security-scanner.local.md`
- Remove security-scanner agent (skill is self-contained with `allowed-tools`)

## 2026-01-20

### security-scanner v1.0.0 (formerly plugin-security)

- Initial release: Security scanner for Claude Code plugins
- `/security-scanner` command to scan all installed plugins
- `--user` option for user-level plugins only (`~/.claude/plugins/`)
- `--project` option for project-level plugins only (`.claude/plugins/`)
- `--all` option for full audit (ignore trusted sources and self-exclusion)
- AI semantic analysis to detect malicious code AND natural language instructions
- Detects: remote code execution, reverse shells, credential theft, data exfiltration, etc.
- Trusted sources configuration via `.claude/security-scanner.local.md`
- Self-exclusion with impersonation protection (`security-scanner@hiropon-plugins` only)
- Uses only Read, Glob, Grep tools (no command execution)

## 2026-01-15

### translate v1.0.0

- Initial release: AI-powered translation plugin using Claude subagents
- `/tr` command with haiku model (default)
- `--hq` option for high-quality translation using sonnet model
- `--fast` option to force standard translation using haiku model
- `--to` option for specifying target language
- `--from` option for specifying source language (skip auto-detection)
- Auto-detects Japanese/English translation direction
- Configurable defaults via `.claude/translate.local.md` (quality, languages)

## 2026-01-13

### ask-claude v1.1.1

- Update description to clarify it's for non-Claude AI agents (Codex, Gemini, etc.)

## 2025-12-28

### ask-codex v1.1.1

- Fix `allowed-tools` pattern from `Bash(codex exec:*)` to `Bash(codex:*)`

### ask-claude, ask-codex, ask-gemini v1.1.0

- Add `allowed-tools` to eliminate double permission prompts when using skills

## 2025-12-25

### Initial release v1.0.0

- `ask-claude` plugin: Claude CLI integration for getting a second opinion
- `ask-codex` plugin: Codex CLI integration for getting a second opinion
- `ask-gemini` plugin: Gemini CLI integration for getting a second opinion
- `peer` plugin: Claude subagent for peer review, planning discussions, and brainstorming
