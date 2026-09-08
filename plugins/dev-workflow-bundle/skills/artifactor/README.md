# artifactor

A drawing hand for a one-page, picture-first HTML artifact that grows while you talk. One background agent draws the page; the main conversation sends it what happened each turn and publishes the page to the same URL whenever a section changes. The chat never waits for the drawing, and the design guidance the agent needs never enters the main conversation.

## What it does

```text
/artifactor [<subject>]
/artifactor --resume <slug or path>
/artifactor stop
```

Start it with a subject, or with nothing — `/artifactor` alone opens a page titled "Session notes" that takes its real title from the first turn that shows what the conversation is about. Then talk to Claude Code as usual. After each answer, the skill sends the agent what came up, what was decided, what is open and what is next, each fact beside where it came from; the agent decides which sections that changes, redraws them, and the page is republished when the redraw lands, with one line in the chat giving the URL. Nothing else about the conversation changes.

`/artifactor stop` publishes one last time and ends with the URL. Forgetting it costs nothing: the page on disk and the published artifact are the state, the agent goes away with the session, and `--resume <slug>` picks the page up with a fresh agent.

The default sections are **What came up**, **Decided**, **Open** and **Next**, followed by a collapsed **How this page was built** log that every artifactor page ends with. Say in your first message what sections you want instead and the page uses those. Every section is a picture first — one inline SVG and at most three sentences, the conclusion in bold — unless the definition marks it text-only.

## Using it from another skill

A skill that grows a page of its own loads this one with `Skill(artifactor) --caller` and then drives the agent itself, following `SKILL.md` § Agent: it supplies the page definition (path, first-line keys, sections with what each holds and when it changes, reader, register, language, favicon) and sends a message per turn, naming the section changes when it has decided them. `kabeuchi` is the first such caller; its cards are this skill's sections.

## When to use it, and when not

Use it when a page should keep growing over a session — notes that outlive the chat, a map of a long investigation, a record of a decision as it is made, a page a calling skill maintains. A one-time "make me an artifact of this" is cheaper and just as good with the `Artifact` tool directly: artifactor pays for an agent run every turn, which is worth it from about the third update onwards.

## Requirements

- The `Artifact` tool for publishing. Without it the page is still written to `.claude/plans/<slug>.artifactor.html` and opened from disk.
- The `Agent` and `SendMessage` tools. With `Agent` alone, each turn is a fresh dispatch; without either, the main thread draws the page itself, in the same turn as the answer.
- `.claude/plans/` is expected to be gitignored, as it already is for `dev-workflow`'s plans.

The output language follows `dev-workflow`'s `language` setting.

## Design notes

- **Why one agent for the whole session.** Knowing how to draw — the design and diagramming guidance — is several thousand tokens, and loaded on the main thread it slows every later answer. One agent loads it once and keeps it; each turn's material reaches it as a message. Messages sent while it is busy queue in order, so the single file has one writer without the main thread holding anything back. The agent reads its own contract from this skill's `references/`, so the main thread never carries that either.
- **Why publishing stays on the main thread.** The agent never publishes; it edits the file and reports. Publishing when the report lands keeps the artifact's publish history in one conversation and gives the main thread one place to decide whether the page is worth republishing. Every message carries a sequence number and each run reports the highest one it worked, so a publish never snapshots a page with edits still queued.
- **Why the look is fixed.** `references/page-head.html` is the page's only stylesheet, copied in verbatim. Left to the agent, each session invented its own palette and typography; a fixed stylesheet keeps every page from every caller recognisably the same, and lets the agent spend its output on the pictures.
- **Why the caller may leave the judgment to the agent.** Given each section's definition — what it holds and when it changes — the agent can decide from a turn's material which sections change, so a caller that does not want to think about the page every turn need not. A caller that knows better, like `kabeuchi`, names the changes and the agent follows them as written. One contract serves both.
