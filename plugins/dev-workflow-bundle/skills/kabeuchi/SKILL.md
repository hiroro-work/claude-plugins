---
name: kabeuchi
description: A sounding-board session that grows a picture-first, one-page HTML artifact with a reader who cannot yet picture the subject — a task they were handed, a question they want answered, a choice they need to talk through, in this codebase or outside it — answering in the chat and republishing the same page whenever the picture of the subject changes, until the reader says it has come together. It then asks whether to hand the page off to a `/mobpro` or `/dev-workflow` run: yes writes a text handoff file and ends with the two `--resume` lines, of which the reader copies one; no ends with the page's URL. Use for any walk-through that should leave a page behind; optional, not a workflow phase.
allowed-tools: Read, Glob, Grep, Write, Edit, Artifact, Skill(artifact-design), WebFetch, WebSearch, Bash(mkdir -p .claude/*)
---

# kabeuchi

```text
/kabeuchi [--reader "<who the reader is>"] <subject>
/kabeuchi --resume <slug or path> [--reader "<who the reader is>"]
```

A reader who cannot yet picture the subject asks about it in the chat and is answered there; one page — big pictures, few words — holds the picture of the subject and is republished to the same URL whenever that picture changes.

## Reader

The reader is whoever `--reader` names, on the page and in the chat alike. Unset, it is someone new to the subject who may not know the codebase, the framework or the language; assume they know nothing about the topic yet. On `--resume` the reader comes from the page's `reader:` key, and is the default when the page carries no such key; a `--reader` on the resume line wins instead, and step 1 writes it into that key. What the value moves is how much prior knowledge to assume, never the tone. Never revise the reader upward from how mature, how sophisticated or how well kept the subject looks.

## Register

Write for the resolved reader (§ Reader). The register covers the chat answers as much as the page. In stage (a), each card explains through an everyday analogy before it names any part of the system. Complete sentences; the conclusion first, then the reason; a plain word over a technical one when both are exact. A term the reader is meeting for the first time gets one sentence saying what it is, right where it first appears. On the page, whatever the picture already says is not repeated in words. Leaving things out is the method; a childish tone is not.

## Language

Read only the `language` key from the YAML frontmatter of `~/.claude/dev-workflow.local.md`, `.claude/dev-workflow.md` and `.claude/dev-workflow.local.md`, in that order, later files overriding earlier ones; a `null` or empty value clears it, and a missing file, or one without frontmatter, contributes nothing. If none sets it, take `language` from `~/.claude/settings.json`; otherwise use `ja`. Section headings stay English; every other sentence follows the resolved language.

## The page

Path `.claude/plans/<slug>.kabeuchi.html`, where `<slug>` is the ASCII kebab-case of the subject. It is the single source: the artifact is this file, published as is. It follows the `Artifact` tool's page contract for the skeleton and the theme tokens. Its first line is an HTML comment holding `subject: <the request verbatim, any "--" written "- -">`, `reader: <the resolved reader verbatim, any "--" written "- -", or "default" when --reader was not given>` and, once published, `artifact_url: <url>`.

The body is a column of `<section>` cards with fixed English headings, in this order:

1. **What this is** — the subject itself: for a thing, what it is, who uses it and what it does for them; for a question or a choice, what it is about and whom it touches. Nothing here is about the work ahead.
2. **The problem** — what is wrong, missing or unclear today, as the person affected feels it.
3. **What you'll have at the end** — what the reader will have, know or be able to do once the subject is settled.
4. **The pieces** — the parts involved, each named by its role (what it does), and one picture of how they talk to each other.
5. **Names for the pieces** — each role beside the real name of what plays it — a file, class or module, or a library, specification or term.
6. **Words you'll meet** — the subject's own terms, each in one sentence. On the Yes branch of the wrap-up (§ Procedure step 6), the words the plan and its reviews will use are added to the same card.
7. **In your words** — the reader's own words, verbatim, saying what has come together for them.
8. **Next** — written only on the Yes branch of the wrap-up (§ Procedure step 6). One sentence naming the work the page points to, composed from The problem and What you'll have at the end cards; then the two handoff lines `/mobpro --resume .claude/plans/<slug>.kabeuchi.md` and `/dev-workflow --resume .claude/plans/<slug>.kabeuchi.md`, in that order, each on its own line. One sentence says that the reader copies one of them: the first when someone will navigate the build and learn from it, the second for a run without that.
9. **How this page was built** — a `<details>` element, closed by default, holding one entry per turn: the reader's message verbatim, the answer in one line when there was a question, and, when a card changed, one line naming the change. This is the only place the exchange is kept; the other cards hold the subject, not the conversation. A page written before this card set may carry a Your questions card: leave it as it is and add nothing to it.

Every card except the last is a picture first: one large inline SVG spanning the card's width, with at most three sentences beneath it. Inline SVG only: a `viewBox`, colours as `var(--token, #fallback)`, no `<style>` element. Nothing on the page states a design decision, an alternative or a build step.

## Stages

The page sharpens in two stages; announce the move to the second in one chat sentence. Each stage says below when its cards appear.

- **(a) Roles and analogies.** The first four cards (What this is, The problem, What you'll have at the end, The pieces), written at orientation (§ Procedure step 4); on a resumed page that lacks one, written on the first turn after the resume. No real name of a piece ever enters them — not while stage (a) lasts, and not added later once stage (b) has names to hand. The subject's own name is not the name of a piece.
- **(b) Names.** The Names for the pieces and Words you'll meet cards, written once the questions stop being about the outline, and no later than the wrap-up (§ Procedure step 6).

Every fact about the system comes from the code: before writing what a piece does, find it with Glob or Grep and read it. A fact from outside the repository comes from a source fetched with WebFetch or WebSearch, and the page names that source beside the fact.

## Dispatch authorization

This skill's procedure dispatches subagents, so invoking the skill **is** the request to use that mechanism: an ambient instruction allowing subagent dispatch only when the user asked for it — a **permission-shaped restriction** — is already satisfied by this invocation. Do not ask the user to re-confirm the dispatch, and do not silently substitute inline execution for a dispatch this procedure specifies. Only two things justify that substitution: **technical availability** (the dispatch tool is not present and callable on the current tool surface), and an **explicit contract term from the caller** bounding this skill to its own thread. A permission-shaped restriction is neither.

## Procedure

1. **Arguments.** Take `--reader "<text>"` out of the argument line first; the request is what remains, and it alone is the subject or the `--resume` argument. `--resume <arg>`: resolve an existing path, else `.claude/plans/<arg>.kabeuchi.html`; `Read` the page, and when its first-line comment carries `artifact_url`, call `Artifact` with `action: "read"` on that URL before any publish, then publish with `url` set to it; resolve the reader (§ Reader) and the language (§ Language), writing the reader into the page's `reader:` key when the page lacks it or `--reader` overrode it, and continue at step 5. A resumed page written to an older card set gains each card it lacks as that card falls due (§ Stages); a card it carries under a former heading is renamed in place, keeping what it holds. Otherwise the request is the subject: derive `<slug>` and run `mkdir -p .claude/plans`. If a page with that slug exists and its `subject:` line matches, stop and point to `--resume <slug>`; if it belongs to another subject, take the next free suffix (`-2`, `-3`).
2. **Reader and language.** Resolve per § Reader and § Language.
3. **Design pass.** `Skill(artifact-design)` once, before the page's first write.
4. **Orientation.** Read the code the subject touches, or fetch the sources it rests on. Write the stage (a) cards and the first entry of the How this page was built card, then publish: `file_path` the page, a one-sentence `description`, and `favicon` 🧱 only on a publish that carries no `url`. Write the returned URL into the first-line comment. Show the URL in one chat line, followed by the invitation of step 5.
5. **Every turn.** Read the reader's message. Research on the main thread when the answer needs it. Answer in the chat first, in the register of § Register, before any tool call touches the page. Then decide whether the page changes: a card changes only when the question showed a card to be wrong, missing a piece or misleading in its analogy, so that card is corrected; when the answer introduced a term the Words you'll meet card exists but does not yet carry; or when a stage card is due per § Stages. An answer that only explains what the page already shows changes no card. `Edit` the turn's entry into the How this page was built card every turn; publish to the same path only when a card changed, and let the log entries ride the next publish. Close the chat with one line — what changed on the page, or that the page is unchanged — and, as its last line, an open invitation: ask whether anything is still unclear, and say that once it has come together for them — they can say in their own words what they now understand, or what they will be able to do — they should say so and the session wraps up. Never quiz, and never demand it.
6. **Wrap-up.** When the reader says it has come together, compare their words with the cards. A contradiction is corrected on the card concerned and the turn continues as step 5. Otherwise write the In your words card with their words verbatim, and enter stage (b) now if the questions never took the page there (§ Stages). Then write the turn's entry in the How this page was built card and ask the **handoff question**, in the resolved language: whether to hand what the page holds to a `/mobpro` or `/dev-workflow` run and start building, saying what yes and what no each do, per the two branches below. It accepts yes or no. A reply that is neither — a question, a comment — is answered as in step 5, and the question is asked again. Either branch writes that reply's own entry in the How this page was built card before it publishes.
   - **Yes.** Add the words the plan and its reviews will use to the Words you'll meet card and write the Next card; then publish and write the handoff file (§ Handoff file) in the same tool-call burst. End the chat with the Next card's two handoff lines, in the card's order, as the chat's last two lines and nothing else.
   - **No.** Publish. End the chat with the page's URL (its path when the page is unpublished or the last publish failed) as its last line. No handoff file.

## Handoff file

`.claude/plans/<slug>.kabeuchi.md`, written on the Yes branch of the wrap-up; a later wrap-up of the same page overwrites it. No frontmatter. Line 1 is `# ` followed by the Next card's sentence naming the work. Then the request verbatim, and every card in page order except Next, How this page was built and a legacy Your questions card, as text — prose and tables (roles to names, the words), with no pictures.

## Fallback

When the `Artifact` tool is not on the tool surface, or a publish fails and its one retry in the same turn fails too, say so in one line and keep editing the page as step 5 says, without publishing, for the rest of the session; the reader opens the page from disk. Everything else, including the wrap-up and the handoff file, is unchanged.
