# mobpro Plan Shape

**Read this file once**, at M3; M4's substitution and M5's swap-dependent sweep name § Template and § Review lens of that same copy.

## Template

Heading tokens stay verbatim English on every `language`; the body prose is written in the resolved `language`. The translate / preserve / first-use-pairing discipline for that prose follows `../dev-workflow/references/localization.md` § Localization granularity.

```markdown
## Plan

### What we're building
<1–2 plain sentences: what the junior will have at the end. Then one line naming the files this touches.>

### Build order
<Numbered list — the only thing M6 segments on. One step = one meaningful change the junior can follow in a single diff review; typically 3–10 steps. Write each step as `N. **<heading>** — <detail>`: a verb-first bold heading naming the file(s) it touches, then the detail. **The bold heading is what splits summary from detail** — M5's visual gate collapses each step to it and expands the rest on click, so a step that does not open with one renders uncollapsed. Detail belongs here, next to the change it describes.>

### Why this order
<2–4 lines: what each step depends on, and what would go wrong in a different order.>

### Choices I made
<One item per fork the build actually faced — no filtering by how consequential it was. Each item:>

- **Question**: <what had to be decided>
- **Recommendation**: <the side taken, and why>
- **Alternative**: <the other side and what it would have meant — omit this line entirely when there was no real second option; never invent one to fill the slot>

<When no fork qualifies, say so in one sentence rather than omitting the section.>

### How we'll check it works
<One line per check, each naming the Build order step(s) it verifies.>

### Watch-outs
<Optional. Risks and open questions. Omit the section entirely when there are none.>
```

M3 sub-step 2's **Design-approach narration** states the chosen approach and its alternative before this document is written, so that fork is usually `Choices I made`'s first item.

## Review lens

This stands in for `dev-workflow`'s `references/plan-authoring.md` § Step 3 (d) content-quality rubric. The `Decisions` (a)+(b) criterion that same substitution displaces is deliberately not carried over. **The mapping rule below binds whichever group you are reviewing**, not only the one holding category (d). The rest of the payload keeps its own wording, so read whatever your group's Reads column names through one mapping rule: wherever it prescribes surfacing something as a `Decisions` item, or points at `Overview`, `Test plan`, or `Risks`, substitute — respectively — `Choices I made`, `What we're building`, `How we'll check it works`, and `Watch-outs`. `Build order` needs no substitution. A `mobpro` plan has none of those four sections. The absence of the first three is never a finding and no finding may ask for one to be added; a remedy that would land in `Risks` lands in `Watch-outs`, which is created when a remedy needs it. `Choices I made` borrows `Decisions`' `**Question**` / `**Recommendation**` / `**Alternative**` field shape; only the shape is borrowed.

- **Structure** — are `What we're building` / `Build order` / `Why this order` / `Choices I made` / `How we'll check it works` all present under those exact headings; is every `Build order` step written as `N. **<heading>** — <detail>` (§ Template); and does every `Choices I made` item carry `**Question**` and `**Recommendation**` (with `**Alternative**` only where a real second option existed)?
- **Hidden choices** — does a `Build order` step or a `Why this order` line rest on a fork that `Choices I made` never names?
- **Coverage** — does `How we'll check it works` reach every `Build order` step, and does each check name the step it verifies?
- **Plain enough to follow** — could someone new to this codebase read `What we're building` and `Build order` and predict what each unit's diff will contain?
- **Cross-file consistency** (multi-file plans only) — do parallel concepts carry the same names and headings across the files the plan edits?
