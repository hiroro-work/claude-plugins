# kabeuchi

壁打ち (*kabeuchi*, "hitting a ball against a wall") is a sounding-board session. This one is for a reader who cannot yet picture something — a task they were handed, a question they want answered, a choice they need to talk through — in this codebase or outside it. A junior engineer handed a task they cannot read the plan for is the typical reader, but not the only one.

## What it does

```text
/kabeuchi <subject>
/kabeuchi --resume <slug>
```

The AI reads the code the subject touches, or fetches the sources it rests on, and publishes one page: big pictures, few words, one card per idea. The reader asks questions in the chat; every answer lands on the page, and the page is republished to the same URL each turn, so the reader reads the page rather than the chat. The page sharpens in two stages — first roles and analogies with no real names at all, then the real names of the pieces. A fact from outside the repository carries its source beside it. A collapsed log at the bottom keeps every question verbatim, so someone who opens the page later can see how the understanding was built.

The session wraps up when the reader says it has come together — in their own words, what they now understand or what they will be able to do. Nobody is quizzed; the invitation at the end of each turn just says that this is how it wraps up. The skill then asks one question: whether to hand the page off to a `/mobpro` or `/dev-workflow` run and start building.

- **No**: the page is published one last time and the session ends with its URL. No file is written.
- **Yes**: the page gains the names of the pieces, the words the plan will use and one sentence naming the work to build; the skill writes a text version of the page to `.claude/plans/<slug>.kabeuchi.md`, and the chat ends with two lines:

```text
/mobpro --resume .claude/plans/<slug>.kabeuchi.md
/dev-workflow --resume .claude/plans/<slug>.kabeuchi.md
```

Copy one of them. The first runs the build with the reader navigating and learning from it; the second runs it without that. `dev-workflow` reads a file without frontmatter as an inherited specification and takes its first heading as the task, so the handoff file opens with the page's sentence naming the work, and either run starts from it with no change on its side. Whoever leads the build can read the same file for the detail the pictures leave out.

## When to use it

Whenever a walk-through should leave a page behind: understanding a task before building it, investigating how something works, or talking a choice through. It is not a phase of `dev-workflow` or `mobpro` and nothing there depends on it; a reader who can already read the plan should go straight to `/mobpro <task>` or `/dev-workflow <task>`.

## Requirements

- The `Artifact` tool for publishing. Without it the skill keeps writing `.claude/plans/<slug>.kabeuchi.html` and the reader opens that file in a browser from disk. Pictures are inline SVG only, so the page looks the same either way.
- `WebFetch` / `WebSearch` for facts from outside the repository.
- `dev-workflow` and `mobpro` installed when the handoff is used (the bundle carries all three).
- `.claude/plans/` is expected to be gitignored, as it already is for `dev-workflow`'s plans.

The output language follows `dev-workflow`'s `language` setting.

## Design notes

- **Why a separate skill.** The session is needed only sometimes, and often by a reader below the level `mobpro`'s plan is written for. Keeping it opt-in and outside the workflow lets a team try it without changing how `mobpro` runs, and lets the two artifacts stay different: this page holds the outline, the plan holds the decisions.
- **Why the handoff question is asked every time.** Deciding for the reader whether the session leads to a build would rest on the AI's judgment, and a wrong "no" would silently drop the handoff. A wrong "yes" costs one extra question. The losses are not symmetric, so the question is always asked.
- **"Explain like I'm five" is about what to leave out**, not about tone. The page still speaks in complete sentences to an adult who is new to the subject; it leaves out design choices, alternatives and build order, and lets each picture carry what a paragraph would otherwise say.
- **Some of `dev-workflow`'s definitions are written out again in this skill's own `SKILL.md`** — the `language` resolution and the slug rule (from `SKILL.md`) — because bundle members install independently and cannot locate a sibling's files at run time. When either changes in `dev-workflow`, align this skill by hand. The register started from `references/mob-mode.md` and is now this skill's own.
