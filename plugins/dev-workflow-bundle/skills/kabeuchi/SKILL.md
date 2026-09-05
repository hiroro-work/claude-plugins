---
name: kabeuchi
description: A sounding-board session before mobpro. Grows a picture-first, one-page HTML artifact with a junior who cannot yet read the task, republishing the same page every turn, until the junior can say in their own words what they will be able to do once the task is done; then writes a text handoff file and ends with a one-line `/mobpro --resume <path>`. Use before mobpro when the junior does not understand the task yet; optional, not a workflow phase.
allowed-tools: Read, Glob, Grep, Write, Edit, Artifact, Skill(artifact-design), Bash(mkdir -p .claude/*)
---

# kabeuchi

```text
/kabeuchi <task>
/kabeuchi --resume <slug or path>
```

A junior who cannot yet read a plan asks about the task in the chat; every answer goes onto one page — big pictures, few words — republished to the same URL.

## Register

Write for a junior who has never seen this codebase and may not know the framework or the language; assume they know nothing about the topic yet. In stage (a), each card explains through an everyday analogy before it names any part of the system. Complete sentences; the conclusion first, then the reason; a plain word over a technical one when both are exact. Whatever the picture already says is not repeated in words. Leaving things out is the method; a childish tone is not.

## Language

Read only the `language` key from the YAML frontmatter of `~/.claude/dev-workflow.local.md`, `.claude/dev-workflow.md` and `.claude/dev-workflow.local.md`, in that order, later files overriding earlier ones; a `null` or empty value clears it, and a missing file, or one without frontmatter, contributes nothing. If none sets it, take `language` from `~/.claude/settings.json`; otherwise use `ja`. Section headings stay English; every other sentence follows the resolved language.

## The page

Path `.claude/plans/<slug>.kabeuchi.html`, where `<slug>` is the ASCII kebab-case of the task. It is the single source: the artifact is this file, published as is. It follows the `Artifact` tool's page contract for the skeleton and the theme tokens. Its first line is an HTML comment holding `task: <the request verbatim, any "--" written "- -">` and, once published, `artifact_url: <url>`.

The body is a column of `<section>` cards with fixed English headings, in this order:

1. **The problem** — what is wrong or missing today, as the person affected feels it.
2. **What you'll be able to do after** — what the junior will have when the task is done.
3. **The pieces** — the parts of the system involved, each named by its role (what it does), and one picture of how they talk to each other.
4. **Names for the pieces** — each role beside the real file, class or module that plays it.
5. **Words you'll meet in the plan** — the words mobpro's plan and reviews use, and the task's own terms, each in one sentence.
6. **Your questions** — every question the junior asked, with its answer as a picture and a few sentences, newest last.
7. **In your words** — the junior's own statement of what they will be able to do.
8. **Next** — the one line `/mobpro --resume .claude/plans/<slug>.kabeuchi.md`.
9. **How this page was built** — a `<details>` element, closed by default, holding one entry per turn: the junior's message verbatim and one line naming what changed on the page.

Every card except the last is a picture first: one large inline SVG spanning the card's width, with at most three sentences beneath it. Inline SVG only: a `viewBox`, colours as `var(--token, #fallback)`, no `<style>` element. Nothing on the page states a design decision, an alternative or a build step.

## Stages

The page sharpens in three stages; announce each move in one chat sentence. A stage's card appears when the junior's questions start to need it, never before.

- **(a) Roles and analogies.** The first three cards (The problem, What you'll be able to do after, The pieces). No file, class or function name in them.
- **(b) Names.** The Names for the pieces card appears, once the questions stop being about the outline.
- **(c) Vocabulary.** The Words you'll meet in the plan card appears, once an answer needs the plan's words.

Every fact on the page comes from the code: before writing what a piece does, find it with Glob or Grep and read it.

## Dispatch authorization

This skill's procedure dispatches subagents, so invoking the skill **is** the request to use that mechanism: an ambient instruction allowing subagent dispatch only when the user asked for it — a **permission-shaped restriction** — is already satisfied by this invocation. Do not ask the user to re-confirm the dispatch, and do not silently substitute inline execution for a dispatch this procedure specifies. Only two things justify that substitution: **technical availability** (the dispatch tool is not present and callable on the current tool surface), and an **explicit contract term from the caller** bounding this skill to its own thread. A permission-shaped restriction is neither.

## Procedure

1. **Arguments.** `--resume <arg>`: resolve an existing path, else `.claude/plans/<arg>.kabeuchi.html`; `Read` the page, and when its first-line comment carries `artifact_url`, call `Artifact` with `action: "read"` on that URL before any publish, then publish with `url` set to it; resolve the language (§ Language) and continue at step 5. Otherwise the argument is the task: derive `<slug>` and run `mkdir -p .claude/plans`. If a page with that slug exists and its `task:` line matches, stop and point to `--resume <slug>`; if it belongs to another task, take the next free suffix (`-2`, `-3`).
2. **Language.** Resolve per § Language.
3. **Design pass.** `Skill(artifact-design)` once, before the page's first write.
4. **Orientation.** Read the code the task touches. Write the first three cards and the first entry of the How this page was built card, then publish: `file_path` the page, a one-sentence `description`, and `favicon` 🧱 only on a publish that carries no `url`. Write the returned URL into the first-line comment. Show the URL in one chat line, followed by the invitation of step 5.
5. **Every turn.** Read the junior's message. Research on the main thread when the answer needs it. `Edit` the page: the answer as a new entry in the Your questions card (or a correction to an earlier card when the question shows it was unclear), the stage cards as § Stages allows, and the turn's entry in the How this page was built card. Publish to the same path; when only the How this page was built card changed, skip the publish and let the entry ride the next one. The chat carries one line saying what changed on the page and, as its last line, an open invitation: ask whether anything is still unclear, and say that once the junior can state in their own words what they will be able to do when the task is done, they should say so and the session wraps up. Never quiz, and never demand the statement.
6. **Wrap-up.** When the junior gives that statement, compare it with the What you'll be able to do after card. A mismatch is corrected on the page (that card, or the Your questions card) and the turn continues as step 5. A match: add the Names for the pieces and Words you'll meet in the plan cards when either is still missing, write the In your words card with the statement verbatim, the Next card with the handoff line and the final entry of the How this page was built card, then publish. Write the handoff file (§ Handoff file). End the chat with the handoff line alone as its last line.

## Handoff file

`.claude/plans/<slug>.kabeuchi.md`, written at wrap-up; a later wrap-up of the same page overwrites it. No frontmatter. Line 1 is `# ` followed by the junior's statement as one sentence (shortened when the In your words card holds more). Then the request verbatim, and the first seven cards in page order as text — prose and tables (roles to names, the vocabulary, each question with its answer) — with no pictures and without the How this page was built card.

## Fallback

When the `Artifact` tool is not on the tool surface, or a publish fails and its one retry in the same turn fails too, say so in one line and keep editing the page every turn without publishing for the rest of the session; the junior opens the page from disk. Everything else, including the wrap-up and the handoff file, is unchanged.
