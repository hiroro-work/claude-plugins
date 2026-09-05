# kabeuchi

壁打ち (*kabeuchi*, "hitting a ball against a wall") is a sounding-board session. This one is for a junior engineer who has been handed a task they cannot yet picture — not even well enough to read the plan that `mobpro` would produce.

## What it does

```text
/kabeuchi <task>
/kabeuchi --resume <slug>
```

The AI reads the code the task touches and publishes one page: big pictures, few words, one card per idea. The junior asks questions in the chat; every answer lands on the page, and the page is republished to the same URL each turn, so the junior reads the page rather than the chat. The page sharpens in three stages — first roles and analogies with no file names at all, then the real names of the pieces, then the words the junior will meet in mobpro's plan and reviews. A collapsed log at the bottom keeps every question verbatim, so a lead who opens the page later can see how the understanding was built.

The session ends when the junior can say in their own words what they will be able to do once the task is done. Nobody is quizzed; the invitation at the end of each turn just says that this is how it wraps up. At that point the skill writes a text version of the page to `.claude/plans/<slug>.kabeuchi.md` and ends with two lines:

```text
/mobpro --resume .claude/plans/<slug>.kabeuchi.md
/dev-workflow --resume .claude/plans/<slug>.kabeuchi.md
```

Copy one of them. The first runs the build with the junior navigating and learning from it; the second runs it without that. `dev-workflow` reads a file without frontmatter as an inherited specification and takes its first heading as the task, so either run starts from the junior's own restatement with no change on its side. The lead can read the same file for the detail the pictures leave out.

## When to use it

Only when the junior does not understand the task yet. It is not a phase of `dev-workflow` or `mobpro` and nothing there depends on it; a junior who can already read the plan should go straight to `/mobpro <task>` or `/dev-workflow <task>`.

## Requirements

- `dev-workflow` and `mobpro` installed (the bundle carries all three).
- The `Artifact` tool for publishing. Without it the skill keeps writing `.claude/plans/<slug>.kabeuchi.html` and the junior opens that file in a browser from disk. Pictures are inline SVG only, so the page looks the same either way.
- `.claude/plans/` is expected to be gitignored, as it already is for `dev-workflow`'s plans.

The output language follows `dev-workflow`'s `language` setting.

## Design notes

- **Why a separate skill.** The session is needed only sometimes, and by a reader below the level `mobpro`'s plan is written for. Keeping it opt-in and outside the workflow lets a team try it without changing how `mobpro` runs, and lets the two artifacts stay different: this page holds the outline, the plan holds the decisions.
- **"Explain like I'm five" is about what to leave out**, not about tone. The page still speaks in complete sentences to an adult who is new to the codebase; it leaves out design choices, alternatives and build order, and lets each picture carry what a paragraph would otherwise say.
- **Some of `dev-workflow`'s definitions are written out again in this skill's own `SKILL.md`** — the register (from `references/mob-mode.md`), and the `language` resolution and the slug rule (from `SKILL.md`) — because bundle members install independently and cannot locate a sibling's files at run time. When any of those change in `dev-workflow`, align this skill by hand.
