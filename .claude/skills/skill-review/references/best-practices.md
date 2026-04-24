# Skill Best Practices Checklist

> **Snapshot**: this checklist was distilled from upstream `document-skills:skill-creator`. It does not auto-update. When skill-creator evolves meaningfully, refresh this file and ship the refresh as its own commit (see SKILL.md § Keeping the checklist fresh).

Reviewer checklist for uncommitted changes to `SKILL.md`, `README.md`, and `references/*.md`. Treat each item as a question: if the answer is "no" and the diff affects that area, flag it as a finding.

Project conventions under `.claude/rules/` and `CLAUDE.md` override these generic rules when they conflict — this file captures the upstream skill-creator guidance, not project-specific rules.

## Frontmatter (SKILL.md)

- [ ] `name` is present and matches the directory name (kebab-case).
- [ ] `name` is 1–64 characters and matches `^[a-z0-9]+(-[a-z0-9]+)*$` (no consecutive hyphens, no leading/trailing hyphen).
- [ ] `description` is present.
- [ ] `description` is ≤ 1024 characters. If it overflows, suspect duplicated triggering cues or over-explanation.
- [ ] `description` states **what the skill does** AND **when to use it** (trigger contexts). "When to use" lives in the description, not the body.
- [ ] `description` includes concrete triggering cues — specific user phrasings, file types, domains, or contexts. Pushy phrasing is fine to combat under-triggering ("Use this whenever the user mentions ...").
- [ ] For skills that are easy to mis-trigger, `description` also names negative triggers / exclusion criteria ("Don't use for ...", "Skip when ...") so the router can avoid false positives.
- [ ] `description` avoids being abstract or generic ("A helpful skill" is too vague to route on).
- [ ] `allowed-tools` (if present) lists only the tools the skill actually needs — no `Bash(*)` wildcards unless a concrete narrower pattern is impossible.
- [ ] `compatibility` is set only when real tool / dependency requirements exist (rarely needed).

## SKILL.md body — structure & length

- [ ] Body uses clear Markdown headings (`#`, `##`, ...) for navigation.
- [ ] Body length is under ~500 lines. If it approaches the limit, the skill has added a layer of hierarchy (pointers into `references/`).
- [ ] When the skill delegates detail to a `references/` file, the SKILL.md clearly states **when** the reader should open that reference and **what** it contains.
- [ ] If the skill supports multiple domains / variants (e.g., cloud providers, runtimes), the body contains the selection workflow and delegates per-variant detail to `references/<variant>.md`.
- [ ] "How to use" information is not duplicated between description and body — the description triggers, the body instructs.

## Writing style

- [ ] Instructions use **imperative form** ("Do X", "Write Y"), not third-person narration.
- [ ] The skill explains **why** load-bearing instructions matter, rather than leaning on heavy-handed `MUST` / `NEVER` / all-caps.
- [ ] Rigid structures (mandatory ALL-CAPS musts, brittle templates) are used only where the rigidity carries real weight; otherwise the skill reframes the guidance to explain reasoning.
- [ ] Language is specific and concrete — names the tool, step, or artifact rather than gesturing vaguely ("the file", "some output").
- [ ] Terminology is consistent across SKILL.md and `references/` — the same concept uses the same word, not swapped synonyms (e.g., don't mix "template" / "view" / "layout" for the same thing).
- [ ] The skill is written to generalize beyond the examples it was iterated on (not overfit to a single scenario).

## Output formats & examples

- [ ] When the skill dictates an output shape (report structure, commit message format, file layout), it provides an explicit template or example rather than just describing it in prose.
- [ ] Templates are presented in fenced code blocks with a clear label ("Use this exact template").
- [ ] Examples follow a consistent shape (e.g., `Input:` / `Output:` pairs) and cover at least one realistic case the reader might hit.

## Bundled resources

- [ ] `references/` files are linked from SKILL.md with a one-line statement of when to read them.
- [ ] `references/` is a flat directory — no nested subdirectories. Use filename suffixes (`references/<variant>.md`) to separate domains instead.
- [ ] A large reference file (>300 lines) includes a short table of contents at the top.
- [ ] `scripts/` contain deterministic, reusable code — not prose (prose belongs in `references/`).
- [ ] `scripts/` write success output to stdout and failure output to stderr; failure messages name the specific cause (missing file, wrong format, etc.) so the calling agent can self-correct.
- [ ] `assets/` are only the templates / icons / fonts the skill's output actually consumes. Not a dumping ground for stale artifacts.
- [ ] Directory layout uses the canonical names (`references/`, `scripts/`, `assets/`, `agents/`) so tooling and readers know where to look.

## Scope discipline (lean prompt)

- [ ] The skill body does not contain instructions that aren't pulling their weight — every paragraph has a clear role in producing the documented outcome.
- [ ] Speculative guidance ("in case X happens in the future", "you might want to also ...") is absent unless it's genuinely load-bearing for correctness.
- [ ] Repeated long explanations / multiple paraphrases of the same rule are consolidated.
- [ ] The skill does not bundle unrelated workflows under one name — if it did, it should be two skills.

## Safety & trust

- [ ] The skill does nothing that would surprise a user who only read the name + description (no hidden side effects, no unrelated actions).
- [ ] No malware, exploit code, or instructions designed to facilitate unauthorized access, data exfiltration, or similar.
- [ ] External side effects (commits, pushes, issue closes, messages sent) are clearly enumerated in the description or an explicit section of the body.

## Maintenance hygiene

- [ ] When SKILL.md and README.md both exist, they serve distinct audiences (`README.md` = user-facing usage docs, `SKILL.md` = Claude-facing instructions) and don't contradict each other.
- [ ] When internal cross-references are used (section X refers to section Y), they use stable section headings rather than brittle numeric sub-step labels that churn as the skill evolves.
- [ ] When the skill has been modified recently, the change set is coherent — not a mix of unrelated edits that should have been separate commits.
