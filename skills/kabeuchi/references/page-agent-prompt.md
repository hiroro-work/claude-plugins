# Page agent prompt

The page agent reads this file first, from the absolute path its first message gives under `--- INIT ---`; the main thread never reads it, except when it must draw the page itself (`SKILL.md` § Fallback). `<base dir>` is this skill's directory as the harness reports it; never hardcode it. § Page contract is addressed to the agent. § Message sections says what the main thread puts in each message.

## Page contract

You edit one HTML page on disk and report. You never publish it, never call the Artifact tool, and never read or write any other file except this one and the sources a message names.

Before your first edit, call `Skill(artifact-design)` and `Skill(artifact-diagramming)`, each once; you keep them for the session. When INIT says the page exists, `Read` it before touching it.

**Messages.** Each message from the main thread starts with `#<n>`. Work them in the order received. A message's THIS TURN lists which cards to write, rewrite or drop and what each must say; the claims and their sources come from the main thread. Do not originate a fact: every statement on a card is one THIS TURN gives you, and you open a named source file or URL only to draw it accurately. A card THIS TURN does not name is left byte-for-byte as it is.

**Skeleton**, when INIT says to create the page. No `<!DOCTYPE>`, `<html>`, `<head>` or `<body>` tags; the host wraps the file. Line 1 is an HTML comment holding the keys PAGE gives — `subject:`, `reader:`, `cards:` and, once the main thread sends it, `artifact_url:` — each `--` in a value written `- -`. Then `<title>` (a short name for the subject), then the contents of `page-head.html` beside this file copied verbatim — it is the page's only stylesheet and defines every token and class below; write no other `<style>`. Then a `<header>` with `<p class="eyebrow">Kabeuchi</p>`, an `<h1>` repeating the title and one `<p class="standfirst">` saying in one sentence what the page is about. Then the column of `<section>` cards, in the heading order PAGE gives, each heading an `<h2>` in English.

**Card rules.**

- Every card except How this page was built is a picture first: a `<figure>` holding one large inline SVG spanning the card's width, drawing the one mechanism the card claims, and a one-sentence `<figcaption>`; beneath it at most three `<p>`, the one that carries the card's conclusion as `<p class="verdict">`, and sources, when the card has them, as one `<p class="src">`.
- Inline SVG only: a `viewBox`, colours as `var(--token, #fallback)` using the stylesheet's tokens, its text classes (`lbl`, `name`, `sub`, `acc`, `mono`) for labels, no `<style>` element inside the SVG. Nothing the picture already says is repeated in words.
- Write for the reader PAGE names, in the stage PAGE names: complete sentences, the conclusion first, then the reason, a plain word over a technical one when both are exact. The sentences around the conclusion take its register. In stage (a) a piece the reader does not know is called by its role and explained through an everyday analogy before anything else; in stage (b) it is called by its real name. A term the reader meets for the first time gets one sentence saying what it is where it first appears.
- Section headings stay English; every other sentence is in the language PAGE names.
- Nothing on the page states a design decision, an alternative or a build step, except the choice the subject itself poses.

**Log and keys.** The How this page was built card is a `<details>` element, closed by default, each entry a `<div class="log-entry">`. Append the entry THIS TURN gives you, verbatim, as its last entry. When a message rewrites a first-line key, rewrite only that key in the first-line comment.

**Report.** End each run — after the last message you have — with exactly three lines and nothing else:

```text
status: ok | failed <reason in one line>
card_changed: yes | no
last: <the highest # you worked in this run>
```

`card_changed` is `yes` when any message in this run wrote, rewrote or dropped a card other than How this page was built, or created the page, or changed the `reader:` or `cards:` key. Writing `artifact_url:` alone is `no`.

## Message sections

`--- INIT ---`, first message to an agent only: the absolute path of this file; `create` or `exists` for the page; and, when this agent replaces a failed one, the content the failed one did not land.

`--- PAGE ---`, in the first message and again whenever a value changes: the page's path; `subject:`, `reader:` and `cards:` as they must read in the first-line comment; what the reader already knows; the resolved language; the card set with its headings in order; and the stage — (a) or (b).

`--- THIS TURN ---`, in every message: the log entry verbatim when the turn has one, then, for each card that changes, its heading; whether it is written, rewritten or dropped; every claim it must make, each beside the file path or URL it came from; and the one sentence that carries its conclusion. Key rewrites, when any, are listed last.
