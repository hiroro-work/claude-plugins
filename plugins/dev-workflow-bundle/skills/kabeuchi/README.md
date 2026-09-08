# kabeuchi

壁打ち (*kabeuchi*, "hitting a ball against a wall") is a sounding-board session. This one is for a reader who cannot yet picture something — a task they were handed, a question they want answered, a choice they need to talk through — in this codebase or outside it. A junior engineer handed a task they cannot read the plan for is the typical reader, but not the only one.

## What it does

```text
/kabeuchi [--reader "<who the reader is>"] <subject>
/kabeuchi --resume <slug> [--reader "<who the reader is>"]
```

The AI reads the code the subject touches, or fetches the sources it rests on, and publishes one page: big pictures, few words, one card per idea. For a reader who does not already know, the first card says what the subject is — what it is, who uses it, what it does for them — before any card says what is wrong with it. The reader asks questions in the chat and is answered there, right away. The page holds the picture of the subject, not the conversation: a card changes only when an answer shows it was wrong or incomplete, when it brings a term the vocabulary card does not yet carry, when the page is ready for its next stage, or when the reader says who they are or that the subject is or is not a choice, and the page is republished to the same URL only then. The drawing happens off the chat: the answer arrives at once, one background agent — the same one for the whole session — redraws the cards, and one line with the URL follows when the new page is up. The first publish, too, comes early — the first two cards go up before the rest of the picture is drawn. The page sharpens in two stages — first roles, then the real names of the pieces and the words of the subject. How far the first stage leans on analogies, and whether a piece is named there at all, follows the reader: a newcomer gets analogies and no real names; a practitioner of the subject gets the names from the start. A subject that asks which of two or more courses to take gets a different card set: a **Verdict** card comes first, after What this is when that card is present, naming the course and the one constraint deciding it, then the evidence, the scope of each course, the pitfalls and the open questions. A fact from outside the repository carries its source beside it, and any term the reader is meeting for the first time gets one sentence saying what it is, in the chat answer or on the page wherever it first appears. A collapsed log at the bottom keeps every question verbatim with its answer in one line, so someone who opens the page later can see how the understanding was built.

The session wraps up when the reader says it has come together — in their own words, what they now understand or what they will be able to do. Nobody is quizzed; the invitation at the end of each turn just says that this is how it wraps up. If the questions never took the page to its second stage, the wrap-up brings it there, so no page ends without the real names and the subject's words the reader did not already have. The skill then asks one question: whether to hand the page off to a `/mobpro` or `/dev-workflow` run and start building.

- **No**: the page is published one last time and the session ends with its URL. No file is written.
- **Yes**: the words the plan will use are added to the page's vocabulary card (written now if the reader had none) and one sentence names the work to build; the skill writes a text version of the page to `.claude/plans/<slug>.kabeuchi.md`, and the chat ends with two lines:

```text
/mobpro --resume .claude/plans/<slug>.kabeuchi.md
/dev-workflow --resume .claude/plans/<slug>.kabeuchi.md
```

Copy one of them. The first runs the build with the reader navigating and learning from it; the second runs it without that. `dev-workflow` reads a file without frontmatter as an inherited specification and takes its first heading as the task, so the handoff file opens with the page's sentence naming the work, and either run starts from it with no change on its side. Whoever leads the build can read the same file for the detail the pictures leave out.

## Who it is written for

Unset, `--reader` means someone new to the subject who may not know the codebase, the framework or the language. Pass `--reader "a first-year engineer, three months in"` or `--reader "a middle-schooler who has written some Python"` and every sentence — on the page and in the chat — is written for that reader instead.

What the flag moves is how much prior knowledge is assumed. It does not move the tone: every reader gets the same complete sentences, and no reader is talked down to. Nothing about the subject moves it either — a mature codebase or a sophisticated framework says nothing about who is reading, and the skill is told not to revise the reader upward from what the subject looks like.

`--reader`'s value, or `default` when it was not given, is recorded on the page as `reader:` in its first line, so `--resume` keeps it and you can tell afterwards which setting produced which page. Passing `--reader` on a resume replaces it.

The reader can also be changed mid-session: say who you are in the chat, and the page is rewritten for that reader on the same turn. Cards that teach what a reader already knows — what the subject is, its pieces, their names, its words — are left out for that reader.

## When to use it

Whenever a walk-through should leave a page behind: understanding a task before building it, investigating how something works, or talking a choice through. It is not a phase of `dev-workflow` or `mobpro` and nothing there depends on it; a reader who can already read the plan should go straight to `/mobpro <task>` or `/dev-workflow <task>`.

## Requirements

- The `Artifact` tool for publishing. Without it the skill keeps writing `.claude/plans/<slug>.kabeuchi.html` and the reader opens that file in a browser from disk. Pictures are inline SVG only, so the page looks the same either way.
- The `Agent` and `SendMessage` tools for the page agent that draws in the background. With `Agent` alone, each change is a fresh dispatch; without either, the skill draws on the main thread, in the same turn as the answer, as it did before.
- `WebFetch` / `WebSearch` for facts from outside the repository.
- `dev-workflow` and `mobpro` installed when the handoff is used (the bundle carries all three).
- `.claude/plans/` is expected to be gitignored, as it already is for `dev-workflow`'s plans.

The output language follows `dev-workflow`'s `language` setting.

## Design notes

- **Why a separate skill.** The session is needed only sometimes, and often by a reader below the level `mobpro`'s plan is written for. Keeping it opt-in and outside the workflow lets a team try it without changing how `mobpro` runs, and lets the two artifacts stay different: this page holds the outline — and, for a choice, the verdict the reader asked for — while the plan holds the build decisions.
- **Why the handoff question is asked every time.** Deciding for the reader whether the session leads to a build would rest on the AI's judgment, and a wrong "no" would silently drop the handoff. A wrong "yes" costs one extra question. The losses are not symmetric, so the question is always asked.
- **Answers live in the chat, the page keeps the picture.** Putting every answer on the page as a new picture made each turn wait for an edit and a publish, and most answers only explained what the page already showed. Now the chat answers first, the log keeps the exchange, and the page changes only when the answer changes what it says about the subject.
- **Why the page is drawn by a background agent.** Even with fewer page changes, a turn that did change a card made the reader wait for a large inline SVG to be written before they could ask the next question, and the first publish waited for every first-stage card. The main thread still does all the research and decides what each card claims, with its sources; only the drawing and the file edit go to the agent, which never publishes. Publishing stays on the main thread — it runs when the agent reports back — so the artifact's publish history stays in one conversation. Orientation publishes the first two cards before sending the rest for the same reason: the reader gets a URL early.
- **Why one agent for the whole session, and why the main thread never draws.** Knowing how to draw — the design and diagramming guidance — is several thousand tokens. Loaded on the main thread it sits in the context for every later turn and slows each answer, which is what the reader feels most. So the main thread never loads it: one page agent loads it once, keeps it, and receives each turn's changes as a message. Messages sent while it is busy queue in order, so the single file has one writer without the main thread holding anything back. The agent reads its own instructions from the skill's `references/`, so the main thread does not carry those either. Replacing the agent is cheap when its id is lost — the page on disk is the state — so nothing is pinned to it.
- **Why "What this is" is its own card.** Naming the subject could have been one or two extra sentences on The problem card. But every card leads with one large picture and allows at most three sentences under it, so that card's picture would have had to carry both what the thing is and what is wrong with it. A newcomer's first picture — who uses this, what it does for them — earns a card of its own.
- **Why the vocabulary card moved out of the handoff.** Names arrive with the second stage, so that is when the words are needed; tying the card to the handoff meant a session that ended with "no" left no vocabulary at all. Moving it does not make it arrive on time by itself — a reader whose questions stay at the outline level for a long time reaches the second stage late — so the wrap-up also adds the names and the words when the session ended before that stage brought them, for a reader who does not already have them. The stage trigger decides when the cards appear; whether they appear at all follows the reader.
- **Why two card sets.** A page that answers "A or B?" with the cards written for "what is this?" buries the answer under orientation the asker did not need. The choice set puts the verdict first and gives the evidence, the scope, the pitfalls and the open questions a card each; those were the four pictures that made a real decision page useful, and the explaining set has no place for them. Which set a page uses is read from the request, recorded on the page, and can be changed by the reader mid-session.
- **Why naming follows the reader instead of a rule.** The old rule kept every real name out of the first stage for the life of the page, whoever was reading. That is right for a newcomer and wrong for a practitioner, who is slowed by analogies for things they work with daily. The card layout already separates roles from names, so the ban was carrying only the reader-dependent part — which now reads the reader directly.
- **Why `--reader` is a flag and not a setting.** Which reader the page should be written for is still a question being explored, so the cheapest loop wins: a flag can be different on every run, and a free-text value avoids fixing a list of profiles before we know what the useful ones are. If a project settles on one reader, the same value can later be read from a settings file without changing anything else.
- **"Explain like I'm five" is about what to leave out**, not about tone. The page still speaks in complete sentences to whoever the reader is; it leaves out design choices, alternatives and build order — except the choice the subject itself poses — and lets each picture carry what a paragraph would otherwise say.
- **Some of `dev-workflow`'s definitions are written out again in this skill's own `SKILL.md`** — the `language` resolution and the slug rule (from `SKILL.md`) — because bundle members install independently and cannot locate a sibling's files at run time. When either changes in `dev-workflow`, align this skill by hand. The register started from `references/mob-mode.md` and is now this skill's own.
