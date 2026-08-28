# Plan Figures

How a figure for the visual plan-review gate is authored. Read this **only** when writing `.claude/plans/<slug>.figures.md` — the point [`visual-plan-review.md`](visual-plan-review.md) § Figures layer names, immediately before the gate's first compose. That section owns the file format, the insertion positions, and the artifact's lifecycle; this file owns what goes inside a block.

## What a figure is for

**Every section that may carry a figure gets one by default.** The served page opens on the figure and folds the prose behind it (§ How the page shows a figure), so a section that arrives without one opens on prose alone — the reader is back to assembling the flow, the branching, or the count in their head. Author one per targetable section unless it would only restate a list, decorate the section, or illustrate something the reader never has to judge; a section that trips one of those ships without one.

Two rules follow from the figures layer being invisible to every non-browser reader:

- **Take every label, number, and relation from the canonical plan document.** A figure introduces no fact of its own. It is the one artifact in the plan that no reviewer and no self-check reads, so an invented number in a figure reaches the user unchallenged.
- **Duplicating prose is fine here.** The canonical document has to stand without the figure, so the prose the figure re-expresses stays where it is. This inverts the cut rule the plan body follows ([`plan-authoring.md`](plan-authoring.md) § Sizing guidance).

## How the page shows a figure

The viewer folds a figure's own prose into a disclosure directly beneath it, closed to start, so the reader meets the figure first and clicks to read on. A section changed since the previous round opens on its own, so nothing edited is read past folded. The prose it folds is still carried in full, here and in the canonical document, which § What a figure is for's **Duplicating prose is fine here** bullet requires to stand on its own.

Which prose folds follows the position the figure took ([`visual-plan-review.md`](visual-plan-review.md) § Figures layer's **Insertion position**): in a field-bullet section, the prose the figure sits among; in a decision-item section, the prose before the first item, the items themselves staying out so their toggles remain reachable; in any other prose section, all of its prose; in the **Build order**, none — its steps already open at their headings.

## Budget

- **Which sections may carry a figure** is the calling skill's own closed list, in its plan-template file's § Figures. It holds the sections a reviewer has to judge; a section that is only skimmed does not repay a figure's cost.
- **What each figure claims**, by what the section holds rather than by its name — keyed as [`visual-plan-review.md`](visual-plan-review.md) § Figures layer's **Insertion position** keys, over the shapes a targetable section takes, because the calling skills name these sections differently:
  - a **field-bullet** section (dev-workflow's `Overview`) — the whole change in one picture: what stands now, what this plan moves, what the reader ends up with.
  - a **decision-item** section — the fork: the options side by side and the one thing that separates them.
  - the **Build order** — the sequence: which step rests on which, and where the work crosses from one file or layer to the next.
  - any other **prose** section — what that section is there to settle. Where it is the plan's overview written as prose rather than field bullets (mobpro's `What we're building`), the field-bullet claim above is the one to write to.
- **One figure per section, three per plan.** Both caps are hard. When one section looks like it needs a second figure, the plan's Approach is doing too much at once.
- **A caption is required**, one sentence, stating what the figure claims — not what it depicts. The caption is what a reader gets when the figure fails to render, and it is also what stands beside the figure while the folded prose is still closed (§ How the page shows a figure), so write it to stand alone. In an inline SVG it is the `<figcaption>`; under a mermaid fence it is the line directly below the closing fence — and omitting it there is not free, since the viewer takes whatever paragraph follows the fence as the caption and styles it as one.

## Wording

A figure is read before the prose it sits above, by someone who has not yet read that prose. Write it to be understood on its own.

- **Labels are short plain-language phrases** — around five words, a working ceiling rather than a measured one. A label that needs a clause belongs in the caption.
- **Spell the thing, not its identifier.** A path, a config key, or a function name earns a place only where that name is itself what the figure is about; everywhere else, name what it does.
- **Plain wording, sourced facts.** Rephrasing relaxes the vocabulary, never the provenance (§ What a figure is for's **Take every label, number, and relation from the canonical plan document** bullet).

## Notation

**mermaid is the default.** It lays itself out, so it cannot overflow its box or overlap its own labels — the failure modes of a hand-placed diagram, none of which any check in this workflow can see. Sequence diagrams stay mermaid always: nothing is gained by placing those arrows by hand.

**Inline SVG** is for what mermaid cannot express — position along an axis, a table-like grid of records, a comparison of two rows against each other. Start from a skeleton in § Skeletons; freehand SVG is allowed where neither fits, on the same terms (a `viewBox`, tokens for colour, a caption).

Keep an SVG under 900 units wide, always with a `viewBox` and never a fixed `width` / `height`, so it scales to the browser's column.

## Colour

The served page is the figure's only host, so a figure takes its colours from the viewer's own tokens: **`var(--token, #fallback)` and nothing else — no bare hex.** The `var()` keeps the figure readable in both light and dark; the fallback keeps it visible when `.figures.md` is opened somewhere the viewer's stylesheet does not reach (an editor preview), where an unresolved `var()` would blank every shape.

Tokens available to a figure (closed list — `Source of truth: scripts/plan-review/public/index.html`'s `:root` block; keep in sync, and add a token here only after it exists there in both the light and the dark definition):

| Token | Fallback | Use |
| --- | --- | --- |
| `--bg` | `#ffffff` | a shape's fill — the surface a box sits on |
| `--bg-soft` | `#e7ece8` | a secondary fill, for a box that is context rather than subject |
| `--fg` | `#1a231f` | body text inside a figure |
| `--muted` | `#5c6b64` | secondary text — units, annotations, an aside |
| `--border` | `#c8d3cd` | a neutral stroke |
| `--accent` | `#0d6b5f` | the subject: the path being explained, its stroke and its arrowheads |
| `--accent-soft` | `#d3e5df` | a filled emphasis behind accent text |
| `--accent-ink` | `#08453d` | text on `--accent-soft` |
| `--on-accent` | `#ffffff` | text on an `--accent` fill |
| `--revise` | `#8a5a12` | the excluded / stopped / rejected case |

mermaid needs none of this — its own theme follows the viewer's light / dark state. Do not style mermaid nodes with `classDef` colours.

## Skeletons

Two shapes cover most plan figures. Both are starting points: keep the structure, replace the labels, extend the row.

**No blank line inside a `<figure>`.** A blank line ends an HTML block in Markdown, so anything after it in the same figure is escaped into the page as literal markup. Keep every figure's markup contiguous — the skeletons below are written that way.

**Pipeline** — boxes and arrows, for "this becomes that, then that". Use it for a data path, a transformation chain, or a before / after pair of rows.

```html
<figure>
<svg viewBox="0 0 880 120" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">
  <rect x="8" y="20" width="240" height="80" rx="10" fill="var(--bg, #ffffff)" stroke="var(--border, #c8d3cd)"/>
  <text x="128" y="52" font-size="14" text-anchor="middle" fill="var(--fg, #1a231f)">first stage</text>
  <text x="128" y="74" font-size="12" text-anchor="middle" fill="var(--muted, #5c6b64)">what it holds</text>
  <path d="M262 60 H320" stroke="var(--accent, #0d6b5f)" stroke-width="2"/>
  <path d="M320 60 l-10 -5 v10 z" fill="var(--accent, #0d6b5f)"/>
  <rect x="334" y="20" width="240" height="80" rx="10" fill="var(--bg, #ffffff)" stroke="var(--accent, #0d6b5f)" stroke-dasharray="6 4"/>
  <text x="454" y="52" font-size="14" text-anchor="middle" fill="var(--fg, #1a231f)">second stage</text>
  <text x="454" y="74" font-size="12" text-anchor="middle" fill="var(--accent, #0d6b5f)">why it is the subject</text>
  <path d="M588 60 H646" stroke="var(--accent, #0d6b5f)" stroke-width="2"/>
  <path d="M646 60 l-10 -5 v10 z" fill="var(--accent, #0d6b5f)"/>
  <rect x="660" y="20" width="212" height="80" rx="10" fill="var(--bg-soft, #e7ece8)" stroke="var(--border, #c8d3cd)"/>
  <text x="766" y="65" font-size="14" text-anchor="middle" fill="var(--fg, #1a231f)">result</text>
</svg>
<figcaption>One sentence saying what the figure claims.</figcaption>
</figure>
```

A dashed stroke marks the stage the plan is actually about; a `--bg-soft` fill marks a stage that is only context.

**Axis** — a line with marked points, for "how many" and "where it stops". Use it for a range, a schedule, a boundary condition, or an off-by-one the reader has to check.

```html
<figure>
<svg viewBox="0 0 880 150" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">
  <line x1="60" y1="60" x2="800" y2="60" stroke="var(--border, #c8d3cd)" stroke-width="2"/>
  <g font-size="12" text-anchor="middle">
    <circle cx="80" cy="60" r="9" fill="var(--accent, #0d6b5f)"/><text x="80" y="88" fill="var(--fg, #1a231f)">first</text>
    <circle cx="260" cy="60" r="9" fill="var(--accent, #0d6b5f)"/><text x="260" y="88" fill="var(--fg, #1a231f)">next</text>
    <circle cx="440" cy="60" r="9" fill="var(--accent, #0d6b5f)"/><text x="440" y="88" fill="var(--fg, #1a231f)">next</text>
    <circle cx="620" cy="60" r="9" fill="var(--accent, #0d6b5f)"/><text x="620" y="88" fill="var(--fg, #1a231f)">last included</text>
    <circle cx="780" cy="60" r="9" fill="var(--bg, #ffffff)" stroke="var(--revise, #8a5a12)" stroke-width="2"/><text x="780" y="88" fill="var(--revise, #8a5a12)">excluded</text>
  </g>
  <line x1="700" y1="30" x2="700" y2="100" stroke="var(--revise, #8a5a12)" stroke-dasharray="4 3"/>
  <text x="700" y="24" font-size="11" text-anchor="middle" fill="var(--revise, #8a5a12)">the boundary</text>
  <rect x="60" y="112" width="120" height="28" rx="14" fill="var(--accent-soft, #d3e5df)"/>
  <text x="120" y="131" font-size="13" text-anchor="middle" fill="var(--accent-ink, #08453d)">4 in total</text>
</svg>
<figcaption>One sentence saying what the figure claims.</figcaption>
</figure>
```

The hollow point past the dashed boundary is the case that does **not** count — the thing a count figure exists to settle.
