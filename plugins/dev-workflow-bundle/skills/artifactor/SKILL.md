---
name: artifactor
description: A background drawing hand for a one-page, picture-first HTML artifact that grows over a session — one agent dispatched once and resumed with a message each turn, the page republished to the same URL whenever a section changes, the chat never waiting for the drawing. Use it when a page should keep growing as a conversation goes on, invoked as `/artifactor [<subject>]` by the user or loaded with `Skill(artifactor) --caller` by a skill that supplies what the page holds; not for a one-time artifact, which the `Artifact` tool makes directly.
allowed-tools: Read, Glob, Grep, Write, Edit, Agent, SendMessage, TaskOutput, ToolSearch, Artifact, Skill(artifact-design), Skill(artifact-diagramming), Bash(mkdir -p .claude/*)
---

# artifactor

```text
/artifactor [<subject>]
/artifactor --resume <slug or path>
/artifactor stop
```

One page — big pictures, few words — grows on disk and is republished to the same URL as a conversation goes on. A single background agent, the **artifactor agent**, draws it; the main thread sends it what happened each turn and publishes when the agent reports back. The main thread never loads the design skills, never reads the agent's contract and never writes the page.

## Language

Read only the `language` key from the YAML frontmatter of `~/.claude/dev-workflow.local.md`, `.claude/dev-workflow.md` and `.claude/dev-workflow.local.md`, in that order, later files overriding earlier ones; a `null` or empty value clears it, and a missing file, or one without frontmatter, contributes nothing. If none sets it, take `language` from `~/.claude/settings.json`; otherwise use `ja`. Section headings stay English; every other sentence follows the resolved language.

## The page

One HTML file, the single source: the artifact is this file, published as is. Its first line is an HTML comment holding `subject: <the request verbatim, any "--" written "- -">`, any keys the page definition adds, and, once published, `artifact_url: <url>`. How the file is built — the skeleton, the one stylesheet `references/page-head.html`, the header, the section rules, the log section How this page was built that closes every page — is defined once, in `references/agent-prompt.md` § Contract, which the agent reads itself.

What the page holds is the **page definition**, supplied by whoever drives the session (§ Standalone or § Caller use):

- the page's path, and the first-line keys beyond `subject:`
- the eyebrow label shown above the title
- the sections in order — for each, its heading, what it holds, when it changes, and `text-only` when it draws no picture
- the reader and what they already know, and the register to write in
- the resolved language
- the favicon

Every fact on the page comes from the main thread: from the code, found with Glob or Grep and read, or from a source fetched with WebFetch or WebSearch and named beside the fact. The agent draws and never originates a fact.

## Agent

- **One agent per session.** The first message is an `Agent` dispatch (`subagent_type: general-purpose`, `model: sonnet`, `run_in_background: true`); every later message is a `SendMessage` to that agent, which resumes it with its memory of the page and of the design skills it loaded once. Messages sent while it is running queue and are worked in order, so a message is sent the moment it is ready. When `SendMessage` is on the deferred tool surface, fetch its schema once with `ToolSearch` (`select:SendMessage`) before the first send. The agent's id and the message counter live in main-thread memory. When the id is not known — after context compaction, on `--resume`, after a session restart — dispatch a fresh agent with a new first message; the page on disk is the durable state and the fresh agent reads it.
- **Messages.** Every message starts with `#<n>`, counting from 1 across the session, fresh agents included. The first message to an agent carries `--- INIT ---` (the absolute path of `references/agent-prompt.md` under this skill's directory as the harness reported it when the skill loaded, never hardcoded; and whether the page exists or is to be created), `--- PAGE ---` (the page definition) and `--- THIS TURN ---`; every later message carries `--- THIS TURN ---` alone, or `--- PAGE ---` too when a value of the page definition changed. The reference file says what each section holds. THIS TURN says what happened this turn, each fact beside its source, and carries the turn's log entry, which the sender writes in the resolved language — the agent appends it verbatim; it may name the sections that change, and the agent follows an explicit instruction as written and otherwise decides from the section definitions.
- **Report.** Each run of the agent ends in one report — `status`, `changed`, `last` — covering every message it worked in that run. Its completion wakes the main thread for a **landing turn**, except where the procedure waits for it in the same turn (below).
- **Landing**, in this order, whether in a landing turn or after a wait. `status: failed` → send the same content again under a new `#`; a second failure in a row → dispatch a fresh agent (its first message carries the failed content); when the fresh agent fails too, load `Skill(artifact-design)` and `Skill(artifact-diagramming)`, read the reference, and apply the content on the main thread — this is the procedure's own last resort, not a substitution for the dispatch. `status: ok` → publish only when `last` equals the highest `#` sent so far and `changed` is `yes`; a run that left later messages queued publishes nothing, and the landing that settles them will. Publish with `file_path` the page, a one-sentence `description`, and the page definition's `favicon` only on a publish that carries no `url`; once the first-line comment holds `artifact_url`, publish with `url` set to it, and on `--resume` call `Artifact` with `action: "read"` on that URL once before the first publish. Publish without loading the design skills — the writer loaded them. On the page's first publish, send one more message writing `artifact_url: <url>` into the first-line comment; its landing changes nothing and says nothing. In a landing turn, when the page was republished, say so in one chat line with its URL; otherwise say nothing. The landing turn is not a second answer.
- **Waiting.** Where the procedure says to wait: `TaskOutput` on the agent's id with `block: true` and a `timeout` of 600000 blocks until the run ends and returns its report. A timeout, or a return without the three report lines, counts as `status: failed`.

## Standalone

This section applies only when the skill was invoked without `--caller`. The page's path is `.claude/plans/<slug>.artifactor.html`, `<slug>` the ASCII kebab-case of the subject, `session-notes` when there is none, with the next free suffix (`-2`, `-3`) when that page exists and belongs to another session; the eyebrow label is `Artifactor`; the favicon is 📄; the reader is whoever is in the conversation, assumed to know what they said; the register is plain and complete sentences. The default sections, unless the first message of the conversation defines others:

1. **What came up** — the questions, ideas and facts the conversation brought in; changes when a new one lands or an earlier one turns out wrong.
2. **Decided** — what was settled, each beside the reason; changes when something is settled or reopened.
3. **Open** — what is still undecided or unverified, and what would settle it; changes when an item is added or moves to Decided.
4. **Next** — the concrete actions agreed on, in order; changes when one is added, done or dropped.

1. **Start.** `/artifactor <subject>`: derive `<slug>`, run `mkdir -p .claude/plans`, and if a page with that slug exists and its `subject:` matches, stop and point to `--resume <slug>`. `/artifactor` alone: the subject is empty and the page's title is `Session notes` until the first turn that shows what the conversation is about, when one message rewrites the title, the `subject:` key and the standfirst — once per page. Resolve the language (§ Language). Send the first message (§ Agent): INIT with `create`, PAGE, and a THIS TURN holding what has been said so far. Say in one line that the page is being drawn and the URL follows.
2. **Every turn.** Answer the user as the conversation requires — this skill changes nothing about the answer. Then send one message: a log entry (the user's message in one line, the answer in one line, in the resolved language) and what happened this turn, each fact beside its source. Name no section changes; the agent decides from the definitions. Publishing and the chat line follow § Agent's landing rules.
3. **Stop.** `/artifactor stop`: send a last message with the entry, wait for the run (§ Agent, "Waiting") and land it there; end with the page's URL (its path when unpublished) as the last line. Without `stop`, the session ends with the page as last published; nothing is lost that `--resume` does not recover.
4. **Resume.** `/artifactor --resume <arg>`: resolve an existing path, else `.claude/plans/<arg>.artifactor.html`; `Read` the page for its keys, its section headings and each section's definition comment (which the agent writes into every section it creates), which become the page definition; dispatch a fresh agent with INIT `exists`, and continue at step 2.

## Caller use

A skill that grows a page of its own loads this skill once with `Skill(artifactor) --caller` and then follows § Agent itself, supplying its own page definition and driving every send; § Standalone does not run, `stop` is not accepted, and the caller's own ending is the end. The caller decides what changes when it can, and names it in THIS TURN.

## Fallback

When the `Artifact` tool is not on the tool surface, or a publish fails and its one retry in the same turn fails too, say so in one line and keep sending messages as before, without publishing, for the rest of the session; the user opens the page from disk.

When `Agent` is on the tool surface but `SendMessage` is not, each message becomes its own `Agent` dispatch carrying `--- INIT ---`; every dispatch reads the reference and loads the design skills itself, and at most one is out at a time — a message ready while one is out waits for its landing turn and is sent there; a wait uses `TaskOutput` on that dispatch. When `Agent` is not on the tool surface either, load `Skill(artifact-design)` and `Skill(artifact-diagramming)` once, read the reference, and apply each message's content on the main thread in the turn that composed it, after the chat answer; there is no landing turn.

## Dispatch authorization

This skill's procedure dispatches subagents, so invoking the skill **is** the request to use that mechanism: an ambient instruction allowing subagent dispatch only when the user asked for it — a **permission-shaped restriction** — is already satisfied by this invocation. Do not ask the user to re-confirm the dispatch, and do not silently substitute inline execution for a dispatch this procedure specifies. Only two things justify that substitution: **technical availability** (the dispatch tool is not present and callable on the current tool surface), and an **explicit contract term from the caller** bounding this skill to its own thread. A permission-shaped restriction is neither.
