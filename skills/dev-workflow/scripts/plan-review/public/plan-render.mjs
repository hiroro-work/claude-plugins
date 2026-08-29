// Plan rendering for the plan-review viewer.
//
// Everything here turns a parsed plan into DOM and nothing here reads or writes
// review state, so both surfaces render from this one file: `index.html` builds
// the interactive gate on top of it, and `export-plan-html.mjs` inlines it into a
// viewer-only page. Interaction is supplied by the caller as `hooks` — a caller
// that passes none gets the same structure with no affordances in it.
//
// What deliberately stays in `index.html`: block-id assignment and excerpt
// capture (`attachElementComments`), the comment and thread widgets, the submit
// bar, the relaunch poll, and the mermaid library call. Those hold the comment
// anchoring contract that `references/visual-plan-review.md` specifies, and
// moving them here would put the contract in two places.
//
// `export-plan-html.mjs` inlines this file by deleting one leading named-braces
// import of `./plan-parse.mjs`. Keep the imports in that one shape — a second
// import statement, a namespace form, or one further down the file breaks the
// export with no signal on this side.

import {
  FENCE_RE, OPEN_TYPES, STEP_COLLAPSE_TYPES,
  anchorNorm, decisionSig, emptyDiff, escapeHtml, excerptOf, parseDecisions,
  sectionGist, splitPreamble, stripMd,
} from "./plan-parse.mjs";

// The strings this file localizes, in one place, so neither surface keeps a copy of the
// text. A surface passes `labels: LABELS[lang]`.
export const LABELS = {
  en: { foldLabel: "Read the text" },
  ja: { foldLabel: "文章を読む" },
};

// Exported so a caller that renders Markdown of its own — a conversation reply, say —
// parses it with the same options as the plan body.
export const md = (t) => window.marked.parse(t || "");
export const mdInline = (t) => window.marked.parseInline(t || "");

// The shell both surfaces render into. Held here rather than in each surface's
// markup because `renderHeader` writes to these ids by name, so a surface whose
// shell drifted would silently render a plan with no header.
// The section id the hero slot's comments carry. Leading underscore on purpose: `slugify`
// strips every character outside [a-z0-9-], so no plan section can ever mint this id and
// collide with the slot. visual-plan-review.md § Figures layer pins it as the contract.
export const HERO_SECTION_ID = "_hero";

export const PLAN_SHELL_HTML = `<header class="plan-head">
  <div class="eyebrow">Plan Review — <span id="plan-id">…</span></div>
  <h1 id="plan-title">…</h1>
  <div id="plan-chips"></div>
  <div id="plan-scope" class="meta-scope" hidden></div>
  <div id="diff-banner" hidden></div>
</header>
<section id="hero" hidden></section>
<nav id="toc"><div class="toc-title">Sections</div></nav>
<main id="plan"></main>`;

// The step separator in `N. **<heading>** — <detail>`; dropped once the heading
// and the detail are split apart, where it reads as a stray dash.
const STEP_SEP_RE = /^\s*[—–-]\s*/;

// A caller stamps this on anything it appends *to a commentable block*, so
// collapseBuildOrderSteps can leave those elements outside the disclosure it builds without
// this file knowing what any particular caller's widgets are called. Exported because a
// rename on only one side drains the affordances into the disclosure — a collapsed Build
// order step would hide its own comment box, with no error and no failing test.
export const AFFORDANCE_ATTR = "affordance";

function chip(label, value, cls) {
  return `<span class="chip ${cls || ""}"><b>${escapeHtml(label)}</b> ${escapeHtml(value)}</span>`;
}

/**
 * @param {object} [env]
 * @param {{foldLabel?: string, diffBanner?: (n: number, removed: number) => string, diffBannerNone?: string}} [env.labels]
 *   Localized strings. Everything else this file writes is UI chrome and stays English.
 * @param {object} [env.diff] plan-parse.mjs' diff state; an inactive one renders no diff chrome.
 * @param {boolean} [env.forceOpen] Open every disclosure. The viewer-only page has no
 *   diff to mark what changed, so nothing there may start folded away.
 * @param {{decorateSection?: Function, decorateDecisionCard?: Function}} [env.hooks]
 * @param {string} env.mermaidTag Tag to hold a mermaid diagram's source: `div` where a
 *   library renders it, `pre` where the host renders `<pre class="mermaid">` itself. Required —
 *   the wrong one here shows the reader a diagram's source instead of the diagram.
 */
export function createRenderer(env = {}) {
  const labels = env.labels || {};
  const foldLabel = labels.foldLabel || LABELS.en.foldLabel;
  const diffBanner = labels.diffBanner || ((n, removed) => `🔍 ${n} section${n === 1 ? "" : "s"} changed or added since your last review${removed ? `, ${removed} removed` : ""} — changes highlighted below`);
  const diffBannerNone = labels.diffBannerNone || "🔍 No section changes since your last review";
  const diff = env.diff || emptyDiff();
  const forceOpen = Boolean(env.forceOpen);
  const hooks = env.hooks || {};
  const mermaidTag = env.mermaidTag;
  if (!mermaidTag) throw new Error("createRenderer: env.mermaidTag is required (\"div\" or \"pre\")");

  function renderHeader(ov, planId, riskCount) {
    document.getElementById("plan-id").textContent = planId;
    document.getElementById("plan-title").innerHTML = ov.goal ? mdInline(ov.goal) : escapeHtml(planId);
    const chips = [];
    if (ov.difficulty) chips.push(chip("Difficulty", stripMd(ov.difficulty)));
    if (riskCount) chips.push(chip("Risks", String(riskCount), "risk"));
    document.getElementById("plan-chips").innerHTML = chips.join("");
    // Scope is descriptive (often a file list), so render it as a labeled meta row that wraps
    // rather than a fixed-shape pill alongside the short enum chips above.
    const scopeEl = document.getElementById("plan-scope");
    if (ov.scope) {
      scopeEl.innerHTML = `<span class="meta-label">Scope</span><span class="meta-val">${escapeHtml(stripMd(ov.scope))}</span>`;
      scopeEl.hidden = false;
    }
  }

  function renderDiffBanner() {
    if (!diff.active) return;
    const el = document.getElementById("diff-banner");
    el.textContent = diff.changedCount ? diffBanner(diff.changedCount, diff.removedCount) : diffBannerNone;
    el.hidden = false;
  }

  function renderNav(sections) {
    const toc = document.getElementById("toc");
    if (!sections.length) { toc.hidden = true; return; }
    for (const s of sections) {
      const a = document.createElement("a");
      a.href = `#sec-${s.id}`;
      a.textContent = s.title;
      a.addEventListener("click", () => {
        const det = document.getElementById(`sec-${s.id}`);
        if (det) det.open = true;
      });
      toc.appendChild(a);
    }
  }

  function renderPreamble(prose, planEl) {
    if (!prose) return;
    const div = document.createElement("div");
    div.className = "preamble";
    div.innerHTML = md(prose);
    planEl.appendChild(div);
  }

  // The figures layer's `## Hero` block, in the slot above the plan — the whole-change
  // picture, keyed on that block rather than on where a figure happened to sit, so a
  // heading naming anything else keeps the disposition it always had. A plan with no such
  // block leaves the slot hidden and taking no space: the figure is required of mobpro and
  // optional for dev-workflow.
  function renderHero(heroMarkdown) {
    const hero = document.getElementById("hero");
    if (!hero || !heroMarkdown) return null;
    hero.innerHTML = md(heroMarkdown);
    if (!hero.childElementCount) return null;
    hero.hidden = false;
    return hero;
  }

  // A Decision item as question + recommendation + alternative panels. The
  // Alternative toggle and the comment affordance are the caller's, added through
  // `hooks.decorateDecisionCard` — the card renders complete without them.
  function renderDecisionCard(it, n) {
    const id = `decision-${n}`;
    const excerpt = excerptOf(it.question);
    const card = document.createElement("div");
    card.className = "decision-card";
    card.dataset.blockId = id;
    card.dataset.anchorKey = anchorNorm(it.question);

    const q = document.createElement("div");
    q.className = "dc-q";
    q.innerHTML = `<span class="dc-tag">Decision ${n}</span>${mdInline(it.question)}`;
    card.appendChild(q);

    const rec = document.createElement("div");
    rec.className = "dc-rec";
    rec.innerHTML = `<span class="dc-label">Recommendation</span>${md(it.recommendation)}`;
    card.appendChild(rec);

    if (it.alternative) {
      const alt = document.createElement("div");
      alt.className = "dc-alt";
      alt.innerHTML = `<span class="dc-label">Alternative</span>${md(it.alternative)}`;
      card.appendChild(alt);
    }

    if (hooks.decorateDecisionCard) {
      hooks.decorateDecisionCard({ card, id, n, excerpt, hasAlternative: Boolean(it.alternative) });
    }
    return card;
  }

  function renderSection(section) {
    const det = document.createElement("details");
    det.className = "section" + (section.type === "context" ? " is-context" : "");
    det.id = `sec-${section.id}`;
    // The section's classified type, so the stylesheet can give each kind its own visual
    // form (the Build order a sequence, Risks a list of cards) without any of them needing
    // a wrapper element around the blocks a comment anchors on.
    det.dataset.sectionType = section.type;
    // status is null outside diff mode, else "new" | "changed" | "unchanged"
    const status = diff.active ? (diff.sectionStatus.get(section.id) || "unchanged") : null;
    // diff mode overrides the default-open set: open changed/new, collapse unchanged
    if (forceOpen) det.open = true;
    else if (status) det.open = (status === "new" || status === "changed");
    else if (OPEN_TYPES.has(section.type)) det.open = true;

    const sum = document.createElement("summary");
    const head = [`<span class="sec-title">${escapeHtml(section.title)}</span>`];
    if (status === "new" || status === "changed") {
      head.push(` <span class="badge badge-diff">${status === "new" ? "New" : "Changed"}</span>`);
    }
    if (section.type === "risks" && section.itemCount) {
      head.push(` <span class="badge badge-risk">${section.itemCount}</span>`);
    }
    const gist = sectionGist(section.body);
    if (gist) head.push(`<span class="sec-gist">${escapeHtml(gist)}</span>`);
    sum.innerHTML = head.join("");
    det.appendChild(sum);

    const body = document.createElement("div");
    body.className = "sec-body";
    let isCards = false;
    let preEl = null;

    if (section.type === "decisions") {
      const { items, preamble } = parseDecisions(section.body);
      if (items.length) {
        isCards = true;
        if (preamble) {
          const pre = document.createElement("div");
          pre.innerHTML = md(preamble);
          body.appendChild(pre);
          preEl = pre;
        }
        // changed Decisions section: highlight cards whose signature is absent from prev
        const prevSigs = status === "changed" ? diff.prevDecisionSigs.get(section.id) : null;
        items.forEach((it, i) => {
          const card = renderDecisionCard(it, i + 1);
          if (prevSigs && !prevSigs.has(decisionSig(it))) card.classList.add("card-changed");
          body.appendChild(card);
        });
      }
    }
    if (!isCards) {
      body.innerHTML = md(section.body); // shape-detection fallback: render as markdown
    }
    det.appendChild(body);
    return { det, bodyEl: body, isCards, preEl };
  }

  function highlightCode(root) {
    root.querySelectorAll("pre code").forEach((el) => {
      if (el.classList.contains("language-mermaid")) return; // rendered as a diagram instead
      window.hljs.highlightElement(el);
    });
  }

  // Turn each mermaid fence into a <figure> holding the diagram source, lifting the
  // paragraph right after the fence into its caption — so a mermaid figure is the same
  // commentable unit as an inline-SVG one and its comment carries kind:"figure" rather
  // than routing as prose. Returns the source nodes, which a caller that loads a mermaid
  // library then renders; a host that renders `<pre class="mermaid">` itself needs nothing
  // further.
  function wrapMermaidFigures(root) {
    const nodes = [];
    root.querySelectorAll("pre code.language-mermaid").forEach((code) => {
      const holder = document.createElement(mermaidTag);
      holder.className = "mermaid";
      holder.textContent = code.textContent;
      const pre = code.closest("pre");
      const fig = document.createElement("figure");
      // The prev-plan side of the diff holds this figure as its fence source (a PRE), while the
      // live side is this FIGURE carrying mermaid's injected CSS — they can never compare equal,
      // so the block-changed test skips a figure carrying this flag.
      fig.dataset.mermaidFigure = "1";
      pre.replaceWith(fig);
      fig.appendChild(holder);
      const cap = fig.nextElementSibling;
      if (cap && cap.tagName === "P") {
        const fc = document.createElement("figcaption");
        while (cap.firstChild) fc.appendChild(cap.firstChild);
        cap.remove();
        fig.appendChild(fc);
      }
      nodes.push(holder);
    });
    return nodes;
  }

  // Collapse each Build order step to its bold heading, opening the detail on click — what lets
  // the section sit in the must-review tier without opening at full length. The step shape is
  // `N. **<heading>** — <detail>` (plan-authoring.md § Template); markdown puts that heading
  // directly under the <li> in a tight list and inside a wrapping <p> in a loose one (blank
  // lines between steps), and both are handled. A step that does not open with a bold heading,
  // or carries nothing behind one, is left alone — graceful degradation for plans predating the
  // shape.
  //
  // Must run *after* the caller's `decorateSection`, for two reasons. The comment affordances
  // are by then direct children of the <li>, so draining the <li> up to the first affordance
  // leaves them outside the nested <details> and a collapsed step stays commentable. And
  // stripping the separator below rewrites a text node inside the <li>, which the caller reads
  // for the comment excerpt and for block-changed diff matching — run it first and every step
  // reads as changed on a revise re-launch.
  function collapseBuildOrderSteps(bodyEl) {
    // First element child, but only when nothing except whitespace precedes it.
    const leadEl = (el) => {
      for (let n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { if (n.data.trim()) return null; continue; }
        return n.nodeType === 1 ? n : null;
      }
      return null;
    };
    const isAffordance = (n) => n.nodeType === 1 && n.dataset[AFFORDANCE_ATTR] !== undefined;

    // Safe to iterate the live collection: the loop only rearranges each <li>'s own children.
    for (const ol of bodyEl.querySelectorAll(":scope > ol")) {
      for (const li of ol.children) {
        if (li.tagName !== "LI") continue;
        const head = leadEl(li); // the <strong> in a tight list, the wrapping <p> in a loose one
        const strong = head && head.tagName === "P" ? leadEl(head) : head;
        if (!strong || strong.tagName !== "STRONG") continue;

        const owner = strong.parentNode; // only needed to put the heading back on the skip path
        const sep = strong.nextSibling; // the "— " between heading and detail, in either shape
        const sum = document.createElement("summary");
        sum.appendChild(strong); // detaching it leaves the <li> holding detail + affordances only
        let hasDetail = false;
        for (let n = li.firstChild; n && !isAffordance(n); n = n.nextSibling) {
          if (n.textContent.replace(STEP_SEP_RE, "").trim()) { hasDetail = true; break; }
        }
        if (!hasDetail) { owner.insertBefore(strong, owner.firstChild); continue; }

        const inner = document.createElement("div");
        inner.className = "step-body";
        while (li.firstChild && !isAffordance(li.firstChild)) inner.appendChild(li.firstChild);
        // Drop the separator; it reads as a stray dash once heading and detail are split apart.
        if (sep && sep.nodeType === 3) sep.data = sep.data.replace(STEP_SEP_RE, "");
        const det = document.createElement("details");
        det.className = "step";
        if (forceOpen) det.open = true;
        det.appendChild(sum);
        det.appendChild(inner);
        li.insertBefore(det, li.firstChild);
      }
    }
  }

  // Fold a figure-bearing container's prose into a disclosure beneath the figure, so it opens on
  // the figure alone — plan-figures.md § How the page shows a figure holds what that buys and
  // what it leaves untouched.
  //
  // Must run *after* the caller's `decorateSection`, for the same two reasons
  // collapseBuildOrderSteps gives: a block's comment input is by then its own child or its next
  // sibling, so moving the block's run of children carries the input with it, and the text a
  // thread entry matches against was captured before the affordances joined the element.
  //
  // Build order is excluded by the caller (STEP_COLLAPSE_TYPES) — its steps already open at
  // their headings, and folding the list on top of that buries the section twice. A decisions
  // section is excluded by its type, not by the shape it rendered as: the caller hands this its
  // preamble container, where a figure targeting it lands, so the preamble's prose folds while
  // the cards — which carry the Alternative toggle — stay outside and visible. Keying on the
  // type matters because a decisions body that fails card detection renders as plain prose, and
  // folding *that* would put every Question / Recommendation / Alternative behind one click.
  function foldProseUnderFigure(bodyEl, open) {
    // Bail before allocating: most sections carry no figure, three per plan being the cap.
    if (!bodyEl.querySelector(":scope > figure")) return;
    // Every figure stays out — one per section is the rule, and a second one buried behind a
    // text label would be invisible, where left in place it merely reads as unfolded.
    // A figure's own textarea is placed inside it (AREA_INSIDE), so every other child is prose.
    const rest = Array.from(bodyEl.children).filter((c) => c.tagName !== "FIGURE");
    if (!rest.length) return;
    const det = document.createElement("details");
    det.className = "fold";
    det.open = forceOpen || open;
    const sum = document.createElement("summary");
    sum.textContent = foldLabel;
    det.appendChild(sum);
    for (const c of rest) det.appendChild(c);
    bodyEl.appendChild(det); // after the figures, now the body's only other children
  }

  // The whole render walk, in the one order that holds. Both surfaces call this
  // rather than sequencing the pieces themselves: the ordering constraints
  // collapseBuildOrderSteps and foldProseUnderFigure document are what a
  // second copy of this loop would drift away from.
  async function renderPlan({ id, preamble, sections, overview, riskCount }) {
    renderHeader(overview, id, riskCount);
    renderDiffBanner();
    renderNav(sections);

    const planEl = document.getElementById("plan");
    const { prose, hero } = splitPreamble(preamble);
    renderPreamble(prose, planEl);
    const heroEl = renderHero(hero);

    const bodyRefs = [];
    for (const s of sections) {
      const r = renderSection(s);
      planEl.appendChild(r.det);
      bodyRefs.push({ ...r, section: s });
    }

    // Highlight and diagram-wrap first (a mermaid fence becomes a figure), then decorate, so
    // the caller's affordances land on stable rendered blocks. The hero is in scope here and
    // not walked separately: mermaid is the figures layer's default notation, so a hero
    // written as a fence is only a figure once this pass has run.
    const drawn = [planEl, heroEl].filter(Boolean);
    const mermaidNodes = [];
    for (const root of drawn) {
      highlightCode(root);
      mermaidNodes.push(...wrapMermaidFigures(root));
    }
    if (hooks.renderDiagrams) await hooks.renderDiagrams(mermaidNodes);
    // The hero is a commentable figure like any other, so the caller decorates it too — the
    // gate's staleness contract rests on a revise comment being able to land on a figure.
    if (heroEl && hooks.decorateSection) hooks.decorateSection({ bodyEl: heroEl, section: { id: HERO_SECTION_ID, type: "hero" } });

    // Both passes stay inside the one section body they are handed, so the collapse's
    // must-run-after-decorate ordering is per-section and needs no document-wide barrier.
    for (const r of bodyRefs) {
      // Folds start closed; a section the diff marks new or changed opens, so nothing edited
      // since the previous round is read past folded.
      const status = diff.sectionStatus.get(r.section.id);
      const edited = status === "new" || status === "changed";
      if (r.isCards) {
        // A card section's cards carry their own affordances and stay visible; its preamble
        // does not, and that is where a figure targeting this section lands — so the preamble
        // is both what to walk and the only prose there is to fold.
        if (r.preEl) {
          if (hooks.decorateSection) hooks.decorateSection({ bodyEl: r.preEl, section: r.section });
          foldProseUnderFigure(r.preEl, edited);
        }
        continue;
      }
      if (hooks.decorateSection) hooks.decorateSection({ bodyEl: r.bodyEl, section: r.section });
      if (STEP_COLLAPSE_TYPES.has(r.section.type)) collapseBuildOrderSteps(r.bodyEl);
      // A decisions section that did not resolve into cards renders as plain prose; folding it
      // would hide the very items the gate exists to have judged.
      else if (r.section.type !== "decisions") foldProseUnderFigure(r.bodyEl, edited);
    }
    return { planEl, heroEl };
  }

  return { renderPlan };
}
