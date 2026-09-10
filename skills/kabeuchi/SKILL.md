---
name: kabeuchi
description: A sounding-board session that grows a picture-first, one-page HTML artifact with a reader who cannot yet picture the subject — a task they were handed, a question they want answered, a choice they need to talk through, in this codebase or outside it — answering in the chat and republishing the same page whenever the picture of the subject changes, until the reader says it has come together. It then asks whether to hand the page off to a `/mobpro` or `/dev-workflow` run: yes writes a text handoff file and ends with the two `--resume` lines, of which the reader copies one; no ends with the page's URL. Use for any walk-through that should leave a page behind; optional, not a workflow phase.
allowed-tools: Read, Glob, Grep, Write, Edit, Agent, SendMessage, TaskOutput, ToolSearch, Artifact, Skill(artifactor), Skill(artifact-design), Skill(artifact-diagramming), WebFetch, WebSearch, Bash(mkdir -p .claude/*)
---

# kabeuchi

```text
/kabeuchi [--reader "<who the reader is>"] <subject>
/kabeuchi --resume <slug or path> [--reader "<who the reader is>"]
```

## Reader

The reader is whoever `--reader` names, on the page and in the chat alike. Unset, it is someone new to the subject; assume they know nothing about it yet. On `--resume` the reader comes from the page's `reader:` key, and is the default when the page carries no such key; a `--reader` on the resume line wins instead, and step 1's first message to the page agent writes it into that key. What the value moves is how much prior knowledge to assume, never the tone. Never revise the reader upward from how the subject looks; the reader changes mid-session only on a reframing turn (§ Procedure step 5).

## Register

Write for the resolved reader (§ Reader). The register covers the chat answers as much as the page. Complete sentences; the conclusion first, then the reason; a plain word over a technical one when both are exact. A term the reader is meeting for the first time gets one sentence saying what it is, right where it first appears. Leaving things out is the method, not a childish tone.

## Language

Resolve `language` per artifactor `SKILL.md` § Language, loaded at § Procedure step 2 (Artifactor).

## The page

Path `.claude/plans/<slug>.kabeuchi.html`, where `<slug>` is the ASCII kebab-case of the subject. Its first-line keys beyond artifactor's own are `reader:` — the resolved reader verbatim, or `default` when `--reader` was not given — and `cards: explaining` or `cards: choice` (`explaining` when the key is absent).

The body is a column of cards. The page's `cards:` key names which of two sets it uses. The **explaining set**, for a subject to be understood, in this order:

1. **What this is** — the subject itself: for a thing, what it is, who uses it and what it does for them; for a question or a choice, what it is about and whom it touches. Nothing here is about the work ahead.
2. **The problem** — what is wrong, missing or unclear today, as the person affected feels it, and the one constraint that makes it so.
3. **What you'll have at the end** — what the reader will have, know or be able to do once the subject is settled.
4. **The pieces** — the parts involved, each named by its role (what it does), and one picture of how they talk to each other.
5. **Names for the pieces** — each role beside the real name of what plays it — a file, class or module, or a library, specification or term. On a choice page the roles are the parts Evidence and Scope name.
6. **Words you'll meet** — the subject's own terms, each in one sentence.
7. **In your words** — the reader's own words, verbatim, saying what has come together for them.
8. **Next** — written only on the Yes branch of the wrap-up (§ Procedure step 6). One sentence naming the work the page points to, composed from The problem and What you'll have at the end cards (Verdict and Scope on a choice page); then the two handoff lines `/mobpro --resume .claude/plans/<slug>.kabeuchi.md` and `/dev-workflow --resume .claude/plans/<slug>.kabeuchi.md`, in that order, each on its own line. One sentence says that the reader copies one of them: the first when someone will navigate the build and learn from it, the second for a run without that.
9. **How this page was built** — artifactor's log section; kabeuchi supplies only the entry, one per turn: the reader's message verbatim, the answer in one line when there was a question, and, when a card changed, one line naming the change. This is the only place the exchange is kept. A page written before this card set may carry a Your questions card: leave it as it is and add nothing to it.

The **choice set**, for a subject that asks which of two or more courses to take, is What this is, then these five in this order, then Names for the pieces onward as in the explaining set:

1. **Verdict** — which course to take, and the one constraint that decides it.
2. **Evidence** — what was read or fetched to reach the verdict, and what it showed; each fact beside the place it came from.
3. **Scope** — what each course touches, side by side.
4. **Pitfalls** — what goes wrong on the way, on any course, and what averts it.
5. **Open questions** — what the verdict still rests on that nobody has settled, and who or what settles each.

Four cards teach: What this is, The pieces, Names for the pieces, Words you'll meet. Each is left out when the reader already knows it (§ Reader); a card left out is neither written nor announced later, except on a reframing turn (§ Procedure step 5) or at the wrap-up (§ Procedure step 6).

A card here is a section in artifactor, which draws and words it (§ Page agent).

## Stages

The page sharpens in two stages; announce the move to the second in one chat sentence.

- **(a) Roles and analogies.** Every card before Names for the pieces, written at orientation (§ Procedure step 4); on a page that lacks one the reader needs, written on the next turn. A piece the reader does not yet know is called by its role here, explained through an everyday analogy, and gets its real name only on the Names for the pieces card; the subject's own name is not the name of a piece, and Evidence names its sources whatever the reader knows.
- **(b) Names.** Those of the Names for the pieces and Words you'll meet cards the reader needs (§ The page), written once the questions stop being about the outline, and no later than the wrap-up (§ Procedure step 6).

## Page agent

The page is drawn by artifactor's agent; this skill follows artifactor `SKILL.md` § Agent for every send, landing, wait and publish. Kabeuchi's page definition (artifactor `SKILL.md` § The page): path and keys (§ The page); eyebrow `Kabeuchi`; the card set's headings in order, each with what it holds (§ The page) and when it changes (§ Procedure step 5); the reader and what they already know (§ Reader); as the register, § Register's rules together with the current stage's naming rule (§ Stages) — entering stage (b) changes this value, so that message carries `--- PAGE ---` again; the language (§ Language); favicon 🧱. Every message names the card changes explicitly. A **spec** is a message's THIS TURN section (artifactor `SKILL.md` § Agent, "Messages").

## Dispatch authorization

This skill's procedure dispatches subagents, so invoking the skill **is** the request to use that mechanism: an ambient instruction allowing subagent dispatch only when the user asked for it — a **permission-shaped restriction** — is already satisfied by this invocation. Do not ask the user to re-confirm the dispatch, and do not silently substitute inline execution for a dispatch this procedure specifies. Only two things justify that substitution: **technical availability** (the dispatch tool is not present and callable on the current tool surface), and an **explicit contract term from the caller** bounding this skill to its own thread. A permission-shaped restriction is neither.

## Procedure

1. **Arguments.** Take `--reader "<text>"` out of the argument line first; the request is what remains, and it alone is the subject or the `--resume` argument. `--resume <arg>`: resolve an existing path, else `.claude/plans/<arg>.kabeuchi.html`; `Read` the page; run steps 2 and 3, take the card set from the page's `cards:` key; dispatch the page agent (§ Page agent) with INIT `exists` and a first message whose `--- THIS TURN ---` writes the `reader:` key when the page lacks it or `--reader` overrode it and the `cards:` key when the page lacks it, and continue at step 5. A resumed page written to an older card set gains each card it lacks and the reader needs as that card falls due (§ Stages); a card it carries under a former heading is renamed in place, keeping what it holds. Otherwise the request is the subject: derive `<slug>` and run `mkdir -p .claude/plans`. Decide the card set: `choice` when the subject is a choice (§ The page), else `explaining`; step 4's first message writes it into the first-line comment. If a page with that slug exists and its `subject:` line matches, stop and point to `--resume <slug>`; if it belongs to another subject, take the next free suffix (`-2`, `-3`).
2. **Artifactor.** Load `Skill(artifactor)` with the argument `--caller`, once. Do not load the design skills: artifactor's agent does (§ Page agent).
3. **Reader and language.** Resolve per § Reader and § Language.
4. **Orientation.** Read the code the subject touches, or fetch the sources it rests on. Find the one constraint the subject turns on and put it on The problem, or on Verdict for a choice. Say in the chat, in one or two sentences, what the subject is and what it turns on. Dispatch the page agent (§ Page agent) with INIT `create` and a first message whose spec creates the page with What this is when the reader needs it, The problem (Verdict on a choice page) and the first entry of the How this page was built card, and say in one sentence that the page is being drawn, followed by the invitation of step 5. On the landing turn that first publishes, send the next message: the `artifact_url` key and the remaining stage (a) cards as one spec.
5. **Every turn.** Read the reader's message. Research on the main thread when the answer needs it. Answer in the chat first, in the register of § Register, before any tool call touches the page. Then decide whether the page changes: a card changes only when the question showed a card to be wrong, missing a piece or misleading in its analogy, so that card is corrected; when the answer introduced a term the Words you'll meet card exists but does not yet carry; or when a stage card is due per § Stages. An answer that only explains what the page already shows changes no card. A message in which the reader says who they are, or says the subject is or is not a choice, is a **reframing turn**: the spec rewrites the `reader:` or `cards:` key and redoes orientation under the new framing — writes the cards now due, drops the cards no longer due, rewrites the rest, keeps In your words and How this page was built — and counts as a card change. Every turn has a log entry for the How this page was built card, and every turn sends one message to the page agent (§ Page agent): the entry, with the card changes when there are any. Close the chat with one line — what is being redrawn on the page, or that the page is unchanged — and, as its last line, an open invitation: ask whether anything is still unclear, and say that once it has come together for them — in their own words, what they now understand or what they will be able to do — they should say so, and the session wraps up. Never quiz, and never demand it.
6. **Wrap-up.** When the reader says it has come together, compare their words with the cards. A contradiction is corrected on the card concerned and the turn continues as step 5. Otherwise this turn's spec writes the In your words card with their words verbatim, the stage (b) cards if the questions never took the page there and the reader needs them (§ Stages), and the turn's log entry; send it to the page agent (§ Page agent) and, in the same turn, ask the **handoff question**, in the resolved language: whether to hand what the page holds to a `/mobpro` or `/dev-workflow` run and start building, saying what yes and what no each do. It accepts yes or no. A reply that is neither — a question, a comment — is answered as in step 5, and the question is asked again. Either branch sends a **wrap-up message** that carries that reply's own log entry, then waits for the run in the same turn (artifactor `SKILL.md` § Agent, "Waiting") and lands it there (artifactor § Agent, "Landing"); the reply's turn is the session's last. When the landing sent the `artifact_url` message, wait for that run too before the branch's `Read` or closing line.
   - **Yes.** The wrap-up message also adds the words the plan and its reviews will use to the Words you'll meet card, writing the card if the reader had none, and writes the Next card. After the landing: `Read` the page and write the handoff file (§ Handoff file) from it, and end the chat with the Next card's two handoff lines, in the card's order, as the chat's last two lines, with nothing after them.
   - **No.** The wrap-up message carries the log entry alone. After the landing, end the chat with the page's URL (its path when the page is unpublished or the last publish failed) as its last line. No handoff file.

## Handoff file

`.claude/plans/<slug>.kabeuchi.md`, written on the Yes branch of the wrap-up; a later wrap-up of the same page overwrites it. No frontmatter. Line 1 is `# ` followed by the Next card's sentence naming the work. Then the request verbatim, and every card in page order except Next, How this page was built and a legacy Your questions card, as text — prose and, where the page has those cards, tables (roles to names, the words), with no pictures.

## Fallback

A missing `Artifact`, `SendMessage` or `Agent` is handled as artifactor `SKILL.md` § Fallback says. When `Skill(artifactor)` itself is not available, say so in one line and stop: this skill needs the artifactor plugin.
