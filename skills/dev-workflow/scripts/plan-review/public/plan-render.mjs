// Plan rendering for the plan-review viewer.
//
// Reads no review state, so both surfaces render from here; interaction arrives as `hooks`.
//
// The comment-anchoring contract `references/visual-plan-review.md` specifies stays in
// `index.html` (block ids, excerpt capture, the widgets); moving any of it here would put
// that contract in two places. The mermaid loader is the opposite case and lives here:
// both surfaces draw diagrams at runtime, and one copy is what keeps them on one pinned
// version. The static marked / highlight.js tags stay duplicated: a test guards that pair.
//
// `export-plan-html.mjs` inlines this file by deleting one leading named-braces import
// of `./plan-parse.mjs`. Keep the imports in that shape — a second import statement, a
// namespace form, or one further down the file breaks the export with no signal here.

import {
  OPEN_TYPES, STEP_COLLAPSE_TYPES,
  anchorNorm, buildDecisionDigest, decisionBlockId, decisionSig, emptyDiff, escapeHtml,
  excerptOf, parseDecisions,
  sectionGist, splitPreamble, stripMd,
} from "./plan-parse.mjs";

// Every string this file localizes, so neither surface keeps a copy. Pass `LABELS[lang]`.
export const LABELS = {
  en: {
    foldLabel: "Read the text",
    atAGlanceTitle: "Decisions at a glance",
    diffBanner: (n, removed) => `🔍 ${n} section${n === 1 ? "" : "s"} changed or added since your last review${removed ? `, ${removed} removed` : ""} — changes highlighted below`,
    diffBannerNone: "🔍 No section changes since your last review",
  },
  ja: {
    foldLabel: "文章を読む",
    atAGlanceTitle: "決定事項の一覧",
    diffBanner: (n, removed) => `🔍 前回レビューから ${n} 個のセクションが変更・追加されました${removed ? `（削除 ${removed} 件）` : ""} — 変更箇所を以下にハイライト`,
    diffBannerNone: "🔍 前回レビューからセクションの変更はありません",
  },
};

// Exported so a caller rendering Markdown of its own uses the plan body's options.
export const md = (t) => window.marked.parse(t || "");
const mdInline = (t) => window.marked.parseInline(t || "");

// The section id the hero slot's comments carry. The leading underscore is load-bearing:
// `slugify` strips every character outside [a-z0-9-], so no plan section can mint this id
// and collide with the slot. visual-plan-review.md § Figures layer pins it as the contract.
export const HERO_SECTION_ID = "_hero";

// Held here rather than in either page, so the two surfaces cannot land on different
// versions. cdnjs ships this build as a classic script assigning globalThis.mermaid, not as
// a module, hence the tag below rather than an import().
const MERMAID_SRC = "https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.15.0/mermaid.min.js";
const MERMAID_SRI = "sha512-HH52omhHpZF6RfVnGiQwYgYm4H/ya2xsZYLl5xJ4+tLfX+rN4+8zF7V/H/KLeicPrKZYi1g6iBmVkk2AhXTGlg==";

// Left to an artifact host, a diagram is drawn in the host's own theme, which knows nothing
// of this page's palette.
export async function renderMermaidDiagrams(nodes) {
  if (!nodes.length) return;
  try {
    // Lazy, inside both the guard and the try: no diagram means no fetch, and a dead CDN
    // leaves fences un-rendered rather than taking the page.
    await new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = MERMAID_SRC;
      tag.integrity = MERMAID_SRI;
      tag.crossOrigin = "anonymous";
      tag.referrerPolicy = "no-referrer";
      tag.onload = resolve;
      tag.onerror = () => reject(new Error("mermaid did not load"));
      document.head.appendChild(tag);
    });
    // The three states the stylesheet answers: an explicit choice is stamped on the root, and
    // only an unstamped page follows the OS. Read once — mermaid bakes its theme at
    // initialize, so a flip mid-read leaves diagrams in the previous theme.
    const stamped = document.documentElement.dataset.theme;
    const darkScheme = stamped === "dark"
      || (stamped !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    globalThis.mermaid.initialize({ startOnLoad: false, theme: darkScheme ? "dark" : "default", securityLevel: "strict" });
    // suppressErrors keeps one bad fence from aborting the batch.
    await globalThis.mermaid.run({ nodes, suppressErrors: true });
  } catch (err) {
    // The stylesheet gives the holder no `white-space`, so the un-rendered fence would
    // otherwise collapse into one centred run-on line.
    for (const node of nodes) node.style.whiteSpace = "pre-wrap";
    console.error("mermaid render error", err);
  }
}

export const PLAN_SHELL_HTML = `<header class="plan-head">
  <div class="eyebrow">Plan Review — <span id="plan-id">…</span></div>
  <h1 id="plan-title">…</h1>
  <div id="plan-chips"></div>
  <div id="plan-scope" class="meta-scope" hidden></div>
  <div id="diff-banner" hidden></div>
</header>
<section id="hero" hidden></section>
<section id="at-a-glance" hidden></section>
<nav id="toc"><div class="toc-title">Sections</div></nav>
<main id="plan"></main>`;

// The separator in `N. **<heading>** — <detail>`, a stray dash once the two are split.
const STEP_SEP_RE = /^\s*[—–-]\s*/;

// Stamped by callers on anything appended to a commentable block; collapseBuildOrderSteps
// leaves those outside its disclosure. Rename on one side only and a collapsed Build order
// step hides its own comment box, with no error and no failing test.
export const AFFORDANCE_ATTR = "affordance";

function chip(label, value, cls) {
  return `<span class="chip ${cls || ""}"><b>${escapeHtml(label)}</b> ${escapeHtml(value)}</span>`;
}

/**
 * @param {object} [env]
 * @param {{foldLabel?: string, atAGlanceTitle?: string, diffBanner?: (n: number, removed: number) => string, diffBannerNone?: string}} [env.labels]
 *   Normally `LABELS[lang]`; merged over `LABELS.en`. Everything else here is English UI chrome.
 * @param {object} [env.diff] plan-parse.mjs' diff state; an inactive one renders no diff chrome.
 * @param {true|"sections"} [env.forceOpen] Which disclosures open regardless of the diff:
 *   `true` every one, `"sections"` the sections alone. Any other value, absent included,
 *   forces nothing open.
 * @param {boolean} [env.atAGlance] One-line-per-Decision digest above the plan. Off on the gate.
 * @param {{decorateSection?: Function, decorateDecisionCard?: Function, renderDiagrams?: Function}} [env.hooks]
 *   `renderDiagrams` also picks the mermaid holder — `div` with a library, `<pre class="mermaid">`
 *   without. Derived, not passed: a mismatched pair silently shows a diagram's source.
 */
export function createRenderer(env = {}) {
  const labels = { ...LABELS.en, ...(env.labels || {}) };
  const { foldLabel, atAGlanceTitle, diffBanner, diffBannerNone } = labels;
  const diff = env.diff || emptyDiff();
  const forceOpenSections = env.forceOpen === true || env.forceOpen === "sections";
  const forceOpenAll = env.forceOpen === true;
  const atAGlance = Boolean(env.atAGlance);
  const hooks = env.hooks || {};
  const decorateSection = hooks.decorateSection || (() => {});
  const mermaidTag = hooks.renderDiagrams ? "div" : "pre";

  function renderHeader(ov, planId, riskCount) {
    document.getElementById("plan-id").textContent = planId;
    document.getElementById("plan-title").innerHTML = ov.goal ? mdInline(ov.goal) : escapeHtml(planId);
    const chips = [];
    if (ov.difficulty) chips.push(chip("Difficulty", stripMd(ov.difficulty)));
    if (riskCount) chips.push(chip("Risks", String(riskCount), "risk"));
    document.getElementById("plan-chips").innerHTML = chips.join("");
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

  // Keyed on the figures layer's `## Hero` block, not on where a figure happened to sit.
  // A plan with none leaves the slot hidden and taking no space.
  function renderHero(heroMarkdown) {
    const hero = document.getElementById("hero");
    if (!hero || !heroMarkdown) return null;
    hero.innerHTML = md(heroMarkdown);
    if (!hero.childElementCount) return null;
    hero.hidden = false;
    return hero;
  }

  // Only one decisions section's cards may carry `decision-<n>` as an element id — every such
  // section numbers from 1. The first, so the digest's links land on the cards it listed.
  let idClaimingSectionId = null;

  // Toggle and comment affordance are the caller's, via `hooks.decorateDecisionCard`.
  function renderDecisionCard(it, n, claimId) {
    const id = decisionBlockId(n);
    const excerpt = excerptOf(it.question);
    const card = document.createElement("div");
    card.className = "decision-card";
    // An id so the digest's `href="#decision-N"` lands; comment anchoring compares block text
    // and never reads it. data-block-id is the routing key and goes on every card regardless.
    if (claimId) card.id = id;
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

  // Every Decision on one line, linking into its card.
  function renderAtAGlance(sections) {
    if (!atAGlance) return;
    const el = document.getElementById("at-a-glance");
    if (!el) return;
    const digest = buildDecisionDigest(sections);
    if (!digest) return;
    const rows = digest.items.map((it) => {
      const rec = it.recommendation
        ? `<span class="ag-rec">${escapeHtml(it.recommendation)}</span>`
        : "";
      // Escaped text, not inline markdown: a question carrying a link would nest an anchor.
      return `<li class="ag-row"><a class="ag-link" href="#${decisionBlockId(it.n)}">`
        + `<span class="ag-tag">Decision ${it.n}</span>`
        + `<span class="ag-q">${escapeHtml(it.question)}</span></a>${rec}</li>`;
    }).join("");
    el.innerHTML = `<div class="ag-title">${escapeHtml(atAGlanceTitle)}</div><ol class="ag-list">${rows}</ol>`;
    el.hidden = false;
  }

  function renderSection(section) {
    const det = document.createElement("details");
    det.className = "section" + (section.type === "context" ? " is-context" : "");
    det.id = `sec-${section.id}`;
    // The classified type, so the stylesheet can give each kind its own form without a
    // wrapper element around the blocks a comment anchors on.
    det.dataset.sectionType = section.type;
    const status = diff.active ? (diff.sectionStatus.get(section.id) || "unchanged") : null;
    // diff mode overrides the default-open set: open changed/new, collapse unchanged
    if (forceOpenSections) det.open = true;
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
        const prevSigs = status === "changed" ? diff.prevDecisionSigs.get(section.id) : null;
        const claimIds = section.id === idClaimingSectionId;
        items.forEach((it, i) => {
          const card = renderDecisionCard(it, i + 1, claimIds);
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

  // Each mermaid fence becomes a <figure>, the paragraph after it becoming the caption, so
  // a mermaid figure is the same commentable unit as an inline-SVG one and its comment
  // carries kind:"figure". Returns the source nodes for a caller with a library to render.
  function wrapMermaidFigures(root) {
    const nodes = [];
    root.querySelectorAll("pre code.language-mermaid").forEach((code) => {
      const holder = document.createElement(mermaidTag);
      holder.className = "mermaid";
      holder.textContent = code.textContent;
      const pre = code.closest("pre");
      const fig = document.createElement("figure");
      // The prev-plan side of the diff holds this figure as its fence source (a PRE), while the
      // live side is this FIGURE, which also carries the caption — they can never compare equal,
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

  // Collapse each Build order step to its bold heading. Shape is `N. **<heading>** — <detail>`
  // (plan-authoring.md § Template); the heading sits under the <li> in a tight list and in a <p>
  // in a loose one. A step without a bold heading is left alone.
  //
  // Must run *after* the caller's `decorateSection`, for two reasons. The affordances are by
  // then children of the <li>, so draining it up to the first affordance leaves them outside
  // the nested <details> and a collapsed step stays commentable. And stripping the separator
  // rewrites a text node the caller already read for the excerpt and for block-changed
  // matching — run it first and every step reads as changed on a revise re-launch.
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
        if (sep && sep.nodeType === 3) sep.data = sep.data.replace(STEP_SEP_RE, "");
        const det = document.createElement("details");
        det.className = "step";
        if (forceOpenAll) det.open = true;
        det.appendChild(sum);
        det.appendChild(inner);
        li.insertBefore(det, li.firstChild);
      }
    }
  }

  // Fold a figure-bearing container's prose beneath the figure, so the section opens on the
  // figure alone (plan-figures.md § How the page shows a figure).
  //
  // Must run *after* the caller's `decorateSection`, for the same two reasons
  // collapseBuildOrderSteps gives.
  //
  // Two exclusions, both the caller's: Build order (its steps already open at headings) and
  // decisions, excluded by *type*, not by rendered shape.
  function foldProseUnderFigure(bodyEl, open) {
    if (!bodyEl.querySelector(":scope > figure")) return;
    // Every figure stays out: one per section is the rule, and a second buried behind a text
    // label would be invisible. A figure's own textarea sits inside it (AREA_INSIDE).
    const rest = Array.from(bodyEl.children).filter((c) => c.tagName !== "FIGURE");
    if (!rest.length) return;
    const det = document.createElement("details");
    det.className = "fold";
    det.open = forceOpenAll || open;
    const sum = document.createElement("summary");
    sum.textContent = foldLabel;
    det.appendChild(sum);
    for (const c of rest) det.appendChild(c);
    bodyEl.appendChild(det);
  }

  // The whole walk, in the one order that holds — both surfaces call this rather than
  // sequencing the pieces, so the two collapse passes' ordering constraints can't drift.
  async function renderPlan({ id, preamble, sections, overview, riskCount }) {
    idClaimingSectionId = (sections.find((s) => s.type === "decisions") || {}).id ?? null;
    renderHeader(overview, id, riskCount);
    renderAtAGlance(sections);
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

    // Highlight and diagram-wrap before decorating, so the caller's affordances land on
    // stable blocks. The hero is in scope here and not walked separately: a hero written as
    // a mermaid fence is only a figure once this pass has run.
    const drawn = [planEl, heroEl].filter(Boolean);
    const mermaidNodes = [];
    for (const root of drawn) {
      highlightCode(root);
      mermaidNodes.push(...wrapMermaidFigures(root));
    }
    // Started here but awaited at the end: the hook runs synchronously up to its own first
    // await (the library fetch), so the collapse passes below complete before a diagram is
    // drawn — while a multi-megabyte fetch overlaps them instead of holding the page open
    // and unfolded until it lands.
    const diagrams = hooks.renderDiagrams ? hooks.renderDiagrams(mermaidNodes) : null;
    // The hero is a commentable figure like any other, so the caller decorates it too — the
    // gate's staleness contract rests on a revise comment being able to land on a figure.
    if (heroEl) decorateSection({ bodyEl: heroEl, section: { id: HERO_SECTION_ID, type: "hero" } });

    // Both passes stay inside one section body, so the ordering is per-section — no barrier
    // needed.
    for (const r of bodyRefs) {
      // Folds start closed; a section the diff marks new or changed opens, so nothing edited
      // since the previous round is read past folded.
      const status = diff.sectionStatus.get(r.section.id);
      const edited = status === "new" || status === "changed";
      if (r.isCards) {
        // Cards carry their own affordances; the preamble does not, and is where a section's
        // figure lands — so it is both what to walk and the only prose to fold.
        if (r.preEl) {
          decorateSection({ bodyEl: r.preEl, section: r.section });
          foldProseUnderFigure(r.preEl, edited);
        }
        continue;
      }
      decorateSection({ bodyEl: r.bodyEl, section: r.section });
      if (STEP_COLLAPSE_TYPES.has(r.section.type)) collapseBuildOrderSteps(r.bodyEl);
      // A decisions section that did not resolve into cards renders as plain prose; folding it
      // would hide the very items the gate exists to have judged.
      else if (r.section.type !== "decisions") foldProseUnderFigure(r.bodyEl, edited);
    }
    if (diagrams) await diagrams;
    return { planEl, heroEl };
  }

  return { renderPlan };
}
