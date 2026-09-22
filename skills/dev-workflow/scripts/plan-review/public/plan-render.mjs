// Plan rendering for the plan-review viewer; index.html and export-plan-html.mjs both render from here.
// export-plan-html.mjs inlines this file by deleting its single leading `import {...} from "./plan-parse.mjs"`;
// a second import, a namespace form, or one further down the file breaks the export with no signal here.

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

export const md = (t) => window.marked.parse(t || "");
const mdInline = (t) => window.marked.parseInline(t || "");

// Hero slot comment id. The leading underscore keeps it outside slugify's [a-z0-9-] output, so no plan section can collide with it.
export const HERO_SECTION_ID = "_hero";

// Loaded here so both surfaces stay on one pinned version. cdnjs ships mermaid as a classic script assigning globalThis.mermaid, not a module.
const MERMAID_SRC = "https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.15.0/mermaid.min.js";
const MERMAID_SRI = "sha512-HH52omhHpZF6RfVnGiQwYgYm4H/ya2xsZYLl5xJ4+tLfX+rN4+8zF7V/H/KLeicPrKZYi1g6iBmVkk2AhXTGlg==";

export async function renderMermaidDiagrams(nodes) {
  if (!nodes.length) return;
  try {
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
    // Read once: mermaid bakes its theme at initialize.
    const stamped = document.documentElement.dataset.theme;
    const darkScheme = stamped === "dark"
      || (stamped !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const style = getComputedStyle(document.documentElement);
    const token = (name) => style.getPropertyValue(name).trim();
    const fg = token("--fg"), bg = token("--bg"), soft = token("--bg-soft"), border = token("--border");
    const accent = token("--accent"), accentSoft = token("--accent-soft");
    globalThis.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      themeVariables: {
        darkMode: darkScheme,
        fontFamily: token("--font-body"),
        background: bg,
        textColor: fg,
        lineColor: accent,
        primaryColor: accentSoft, primaryTextColor: fg, primaryBorderColor: accent,
        secondaryColor: soft, secondaryTextColor: fg, secondaryBorderColor: border,
        tertiaryColor: bg, tertiaryTextColor: fg, tertiaryBorderColor: border,
        mainBkg: accentSoft, nodeBorder: accent, nodeTextColor: fg,
        clusterBkg: soft, clusterBorder: border, titleColor: fg, edgeLabelBackground: bg,
        noteBkgColor: token("--revise-bg"), noteTextColor: fg, noteBorderColor: token("--revise-border"),
        actorBkg: accentSoft, actorBorder: accent, actorTextColor: fg, actorLineColor: border,
        signalColor: fg, signalTextColor: fg,
        labelBoxBkgColor: soft, labelBoxBorderColor: border, labelTextColor: fg, loopTextColor: fg,
        activationBkgColor: soft, activationBorderColor: accent, sequenceNumberColor: token("--on-accent"),
      },
    });
    // suppressErrors keeps one bad fence from aborting the batch.
    await globalThis.mermaid.run({ nodes, suppressErrors: true });
  } catch (err) {
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

// Stamped on anything appended to a commentable block; collapseBuildOrderSteps leaves those outside its
// disclosure. index.html uses the same name — rename both.
export const AFFORDANCE_ATTR = "affordance";

function chip(label, value, cls) {
  return `<span class="chip ${cls || ""}"><b>${escapeHtml(label)}</b> ${escapeHtml(value)}</span>`;
}

/**
 * @param {object} [env]
 * @param {{foldLabel?: string, atAGlanceTitle?: string, diffBanner?: (n: number, removed: number) => string, diffBannerNone?: string}} [env.labels] merged over `LABELS.en`
 * @param {object} [env.diff] plan-parse.mjs' diff state
 * @param {boolean} [env.atAGlance]
 * @param {{decorateSection?: Function, decorateDecisionCard?: Function, renderDiagrams?: Function}} [env.hooks]
 *   `renderDiagrams` also selects the mermaid holder (`div` with a library, `<pre class="mermaid">` without).
 */
export function createRenderer(env = {}) {
  const labels = { ...LABELS.en, ...(env.labels || {}) };
  const { foldLabel, atAGlanceTitle, diffBanner, diffBannerNone } = labels;
  const diff = env.diff || emptyDiff();
  const atAGlance = Boolean(env.atAGlance);
  const hooks = env.hooks || {};
  const decorateSection = hooks.decorateSection || (() => {});
  const mermaidTag = hooks.renderDiagrams ? "div" : "pre";

  const isStructuredOverview = (ov) => Boolean(ov.now || ov.after || ov.scopeFiles.length);

  function renderHeader(ov, planId, counts) {
    document.getElementById("plan-id").textContent = planId;
    const title = ov.after || ov.goal;
    document.getElementById("plan-title").innerHTML = title ? mdInline(title) : escapeHtml(planId);
    const chips = [];
    if (ov.difficulty) chips.push(chip("Difficulty", stripMd(ov.difficulty)));
    if (ov.fileCount) chips.push(chip("Files", String(ov.fileCount)));
    if (counts.stepCount) chips.push(chip("Steps", String(counts.stepCount)));
    if (counts.decisionCount) chips.push(chip("Decisions", String(counts.decisionCount)));
    if (counts.riskCount) chips.push(chip("Risks", String(counts.riskCount), "risk"));
    document.getElementById("plan-chips").innerHTML = chips.join("");
    const scopeEl = document.getElementById("plan-scope");
    if (ov.scope && !ov.scopeFiles.length) {
      scopeEl.innerHTML = `<span class="meta-label">Scope</span><span class="meta-val">${escapeHtml(stripMd(ov.scope))}</span>`;
      scopeEl.hidden = false;
    }
  }

  // Each block must be a direct <p> or <table> child of the body: the gate's comment walk keys on that.
  function renderOverviewBody(ov, body) {
    const field = (cls, label, value) => {
      if (!value) return;
      const p = document.createElement("p");
      p.className = `ov-field ${cls}`;
      p.innerHTML = `<span class="ov-k">${label}</span>${mdInline(value)}`;
      body.appendChild(p);
    };
    field("ov-now", "Now", ov.now);
    field("ov-after", "After", ov.after);
    field("ov-highlights", "Highlights", ov.highlights);
    field("ov-keep", "Not changing", ov.notChanging);
    field("ov-approach", "Approach", ov.approach);
    if (ov.scopeFiles.length) {
      const rows = ov.scopeFiles.map((f) => {
        const kind = f.kind ? `<span class="ov-kind ov-kind-${f.kind}">${f.kind}</span>` : "";
        const at = / \/ /.test(f.file) ? -1 : f.file.lastIndexOf("/");
        const file = at >= 0
          ? `<span class="ov-dir">${escapeHtml(f.file.slice(0, at + 1))}</span>${escapeHtml(f.file.slice(at + 1))}`
          : escapeHtml(f.file);
        const step = f.steps ? `<span class="ov-step">${escapeHtml(f.steps)}</span>` : "";
        return `<tr><td class="ov-kind-cell">${kind}</td><td class="ov-file">${file}</td>`
          + `<td class="ov-sum">${mdInline(f.summary)}</td><td class="ov-step-cell">${step}</td></tr>`;
      }).join("");
      const table = document.createElement("table");
      table.className = "ov-scope";
      table.innerHTML = `<caption><span class="ov-k">Scope</span>${escapeHtml(stripMd(ov.scope))}</caption><tbody>${rows}</tbody>`;
      body.appendChild(table);
    } else if (ov.scope) {
      field("ov-scope-line", "Scope", ov.scope);
    }
    if (ov.rest) body.insertAdjacentHTML("beforeend", md(ov.rest));
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

  function renderHero(heroMarkdown) {
    const hero = document.getElementById("hero");
    if (!hero || !heroMarkdown) return null;
    hero.innerHTML = md(heroMarkdown);
    if (!hero.childElementCount) return null;
    hero.hidden = false;
    return hero;
  }

  // Only the first decisions section's cards carry `decision-<n>` ids; every section numbers from 1.
  let idClaimingSectionId = null;
  let overviewModel = null;

  function renderDecisionCard(it, n, claimId) {
    const id = decisionBlockId(n);
    const excerpt = excerptOf(it.question);
    const card = document.createElement("div");
    card.className = "decision-card";
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
    det.dataset.sectionType = section.type;
    const status = diff.active ? (diff.sectionStatus.get(section.id) || "unchanged") : null;
    if (status) det.open = (status === "new" || status === "changed");
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
    if (section.type === "overview" && overviewModel && isStructuredOverview(overviewModel)) {
      renderOverviewBody(overviewModel, body);
    } else if (!isCards) {
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

  // Each mermaid fence becomes a <figure> with the following paragraph as caption, so its comment carries kind:"figure".
  function wrapMermaidFigures(root) {
    const nodes = [];
    root.querySelectorAll("pre code.language-mermaid").forEach((code) => {
      const holder = document.createElement(mermaidTag);
      holder.className = "mermaid";
      holder.textContent = code.textContent;
      const pre = code.closest("pre");
      const fig = document.createElement("figure");
      // A figure never compares equal to its prev-side fence source, so the block-changed test skips it.
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

  // Collapse each `N. **<heading>** — <detail>` Build order step to its heading.
  // Must run after the caller's `decorateSection`: affordances must already be <li> children to stay outside
  // the nested <details>, and stripping the separator rewrites text the caller read for excerpts.
  function collapseBuildOrderSteps(bodyEl) {
    const leadEl = (el) => {
      for (let n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { if (n.data.trim()) return null; continue; }
        return n.nodeType === 1 ? n : null;
      }
      return null;
    };
    const isAffordance = (n) => n.nodeType === 1 && n.dataset[AFFORDANCE_ATTR] !== undefined;

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
        det.appendChild(sum);
        det.appendChild(inner);
        li.insertBefore(det, li.firstChild);
      }
    }
  }

  // Fold a figure-bearing container's prose beneath the figure. Must run after `decorateSection`, as collapseBuildOrderSteps must.
  function foldProseUnderFigure(bodyEl, open) {
    if (!bodyEl.querySelector(":scope > figure")) return;
    const rest = Array.from(bodyEl.children).filter((c) => c.tagName !== "FIGURE");
    if (!rest.length) return;
    const det = document.createElement("details");
    det.className = "fold";
    det.open = open;
    const sum = document.createElement("summary");
    sum.textContent = foldLabel;
    det.appendChild(sum);
    // Layout goes on this div, not the <details>, whose children a browser wraps in one box.
    const inner = document.createElement("div");
    inner.className = "fold-body";
    for (const c of rest) inner.appendChild(c);
    det.appendChild(inner);
    bodyEl.appendChild(det);
  }

  // Both surfaces call this rather than sequencing the pieces, so the collapse passes' ordering can't drift.
  async function renderPlan({ id, preamble, sections, overview, riskCount, stepCount, decisionCount }) {
    idClaimingSectionId = (sections.find((s) => s.type === "decisions") || {}).id ?? null;
    overviewModel = overview;
    renderHeader(overview, id, { riskCount, stepCount, decisionCount });
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

    // Highlight and diagram-wrap before decorating; a hero mermaid fence is only a figure after this pass.
    const drawn = [planEl, heroEl].filter(Boolean);
    const mermaidNodes = [];
    for (const root of drawn) {
      highlightCode(root);
      mermaidNodes.push(...wrapMermaidFigures(root));
    }
    // Started here, awaited at the end: the hook runs synchronously up to its library fetch, so the collapse
    // passes finish before a diagram is drawn.
    const diagrams = hooks.renderDiagrams ? hooks.renderDiagrams(mermaidNodes) : null;
    if (heroEl) decorateSection({ bodyEl: heroEl, section: { id: HERO_SECTION_ID, type: "hero" } });

    for (const r of bodyRefs) {
      const status = diff.sectionStatus.get(r.section.id);
      const edited = status === "new" || status === "changed";
      if (r.isCards) {
        if (r.preEl) {
          decorateSection({ bodyEl: r.preEl, section: r.section });
          foldProseUnderFigure(r.preEl, edited);
        }
        continue;
      }
      decorateSection({ bodyEl: r.bodyEl, section: r.section });
      if (STEP_COLLAPSE_TYPES.has(r.section.type)) collapseBuildOrderSteps(r.bodyEl);
      // A decisions section that did not resolve into cards renders as prose; folding it would hide the items.
      else if (r.section.type !== "decisions") foldProseUnderFigure(r.bodyEl, edited);
    }
    if (diagrams) await diagrams;
    return { planEl, heroEl };
  }

  return { renderPlan };
}
