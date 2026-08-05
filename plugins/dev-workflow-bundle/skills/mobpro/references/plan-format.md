# mobpro Plan Format

The shape `mobpro` writes its plan document in (§ Template, read at M3), and the lens M4's reviewer judges it by (§ Review lens). Why the shape looks like this is in [`README.md`](../README.md) § Usage's "**The plan is written for the junior to read**" paragraph.

**Read this file once**, at M3; M4's substitution and M5's swap-dependent sweep name § Template and § Review lens of that same copy.

## Template

`This section's heading names are the source of truth for every site that names them verbatim — outside this file: the SECTION_TYPES prefix table in dev-workflow's scripts/plan-review/public/index.html (which M5's visual gate classifies plans with), SKILL.md M5 sub-step 1, SKILL.md M5 sub-step 4's swap-dependent sweep list, and SKILL.md M6 sub-step 1's unit segmentation; inside it: the paragraph below this template block, § Review lens' opening paragraph, and every § Review lens bullet. Keep them in sync when renaming a heading. One carve-out: Build order and its step shape are owned upstream by ../dev-workflow/references/plan-authoring.md § Template — this file follows that section rather than defining it, so a rename of that heading starts there — and sweeps that section's closed list together with this one, since the sites listed above name Build order too.` Heading tokens stay verbatim English on every `language`; the body prose is written in the resolved `language`. The translate / preserve / first-use-pairing discipline for that prose follows `../dev-workflow/references/localization.md` § Localization granularity — this file owns only which tokens are verbatim here, because that section's verbatim-heading list enumerates dev-workflow's own headings — of which `Build order` is the only one shared with the list below, and it is already deferred upstream by the carve-out above.

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

M4's reviewer uses this in place of `dev-workflow`'s `references/plan-authoring.md` § Step 3 (f) content-quality rubric. The `Decisions` (a)+(b) criterion that same substitution displaces is deliberately not carried over — a `mobpro` plan explains every fork rather than filtering which ones are worth surfacing. The rest of the payload keeps its own wording, so read all of it — `review-categories.md` § Plan review categories, the `simplicity-self-audit*.md` remedies (`simplicity-self-audit-express.md` holds the (i)/(ii) remedy pair and its precedence rule; `simplicity-self-audit.md` holds the rest of the checklist), `.claude/rules/`, and anything else it carries — through one mapping rule: wherever it prescribes surfacing something as a `Decisions` item, or points at `Overview`, `Test plan`, or `Risks`, substitute — respectively — `Choices I made`, `What we're building`, `How we'll check it works`, and `Watch-outs`. `Build order` needs no substitution — both plan formats name that section identically. A `mobpro` plan has none of those four sections. The absence of the first three is never a finding and no finding may ask for one to be added; a remedy that would land in `Risks` lands in `Watch-outs`, which is created when a remedy needs it. `Choices I made` borrows `Decisions`' `**Question**` / `**Recommendation**` / `**Alternative**` field shape so M5's browser gate can render each fork as a Decision card the junior can switch; only the shape is borrowed.

- **Structure** — are `What we're building` / `Build order` / `Why this order` / `Choices I made` / `How we'll check it works` all present under those exact headings; is every `Build order` step written as `N. **<heading>** — <detail>` (§ Template — a step without a bold heading renders uncollapsed at M5's visual gate); and does every `Choices I made` item carry `**Question**` and `**Recommendation**` (with `**Alternative**` only where a real second option existed)?
- **Hidden choices** — does a `Build order` step or a `Why this order` line rest on a fork that `Choices I made` never names?
- **Coverage** — does `How we'll check it works` reach every `Build order` step, and does each check name the step it verifies?
- **Plain enough to follow** — could someone new to this codebase read `What we're building` and `Build order` and predict what each unit's diff will contain?
- **Cross-file consistency** (multi-file plans only) — do parallel concepts carry the same names and headings across the files the plan edits?
