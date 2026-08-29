// Plan parsing for the plan-review viewer.
//
// Everything here is free of the DOM, of `window`, and of module-level mutable
// state, so both browser surfaces import it and the Node tests import the same
// file. Rendering lives in `plan-render.mjs`; `collectBlockTexts` and
// `attachElementComments` stay in `index.html`, needing `marked` or a document to
// walk.

export const stripMd = (t) => (t || "").replace(/[*`]/g, "").trim();
export const normText = (t) => (t || "").replace(/\s+/g, " ").trim();
export const excerptOf = (t) => normText(t).slice(0, 40);

// One normal form for both sides of an anchor comparison. The browser's excerpt comes from
// rendered DOM text while the caller writes an anchor from Markdown source, so the markup
// the renderer already consumed has to come off before the two can be compared at all.
export const anchorNorm = (t) =>
  normText(String(t || "").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`~]/g, "")).toLowerCase();
// Tolerant on length: an anchor is a prefix of the block, or the block of the anchor once an
// edit shortened it. The floor keeps a near-empty block from matching everything.
export const anchorMatches = (a, b) => {
  if (!a || !b) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 8 && long.startsWith(short);
};
// The section a block id names. Both id forms encode it, so nothing has to be threaded
// through the comment-state calls; `decision-<n>` resolves against the Decisions section
// id the caller found in init.
export const sectionOfBlockId = (id, decisionsSectionId) => {
  const b = String(id || "");
  if (b.includes("::")) return b.slice(0, b.indexOf("::"));
  return b.startsWith("decision-") ? (decisionsSectionId || "") : "";
};

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
export const escapeHtml = (t) => (t || "").replace(/[&<>"]/g, (c) => HTML_ESCAPES[c]);

// Exported because plan-render.mjs scans a section body for its first line of prose and
// has to skip fences by the same rule the parser uses.
export const FENCE_RE = /^\s*(`{3,}|~{3,})/;

// What the viewer knows about each plan section, in match-priority order: `match` lists title
// prefixes (lowercased) that map to the type; `open` opens the section by default;
// `collapseSteps` collapses each of the section's numbered steps to its bold heading. The
// Decisions/Risks render paths key off `type` below.
// Both skills' plan formats share the `Build order` heading; the remaining alternate prefixes
// in each list are mobpro's own heading names. Source of truth for the shared prefix:
// dev-workflow's `references/plan-authoring.md` § Template (mobpro's references/plan-shape.md follows it);
// mobpro's own headings are defined in that file. Keep in sync either way — a
// heading renamed upstream and not here silently returns that plan to all-collapsed. Those
// prefixes stop short of an apostrophe so straight vs. curly quotes cannot break the match.
// mobpro's `Why this order` takes its own type rather than riding along with buildorder: it
// wants the same open-by-default treatment but must not have its reasoning collapsed away.
const SECTION_TYPES = [
  { type: "overview", match: ["overview", "what we"], open: true },
  { type: "decisions", match: ["decision", "choices i made"], open: true },
  { type: "buildorder", match: ["build order"], open: true, collapseSteps: true },
  { type: "whyorder", match: ["why this"], open: true },
  { type: "test", match: ["test plan", "test", "how we"] },
  { type: "risks", match: ["risk", "unknown", "watch-out"] },
  { type: "context", match: ["context"], open: true },
];
export const OPEN_TYPES = new Set(SECTION_TYPES.filter((s) => s.open).map((s) => s.type));
export const STEP_COLLAPSE_TYPES = new Set(SECTION_TYPES.filter((s) => s.collapseSteps).map((s) => s.type));

export function classify(title) {
  const t = title.toLowerCase().replace(/\s+/g, " ").trim();
  const hit = SECTION_TYPES.find((s) => s.match.some((m) => t.startsWith(m)));
  return hit ? hit.type : "other";
}

export function slugify(title) {
  return (title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")) || "section";
}

// Split the plan into level-3 (###) sections, tracking fenced code so a ### inside a
// code block is not mistaken for a heading. Content before the first ### is the preamble.
export function parseSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  const preamble = [];
  let cur = null;
  let inFence = false;
  const seen = {};
  for (const line of lines) {
    if (FENCE_RE.test(line)) inFence = !inFence;
    const h = !inFence && /^###\s+(.+?)\s*$/.exec(line);
    if (h) {
      const title = h[1];
      const base = slugify(title);
      let id = base, n = 1;
      while (seen[id]) id = `${base}-${++n}`; // probe until unused so "Build order 2" can't collide with a 2nd "Build order"
      seen[id] = 1;
      cur = { title, type: classify(title), id, lines: [] };
      sections.push(cur);
      continue;
    }
    if (cur) cur.lines.push(line);
    else preamble.push(line);
  }
  for (const s of sections) s.body = s.lines.join("\n").trim();
  return { preamble: preamble.join("\n").trim(), sections };
}

export function fieldValue(body, label) {
  const re = new RegExp("\\*\\*" + label + "\\*\\*\\s*[:：]\\s*(.*)");
  for (const line of body.split("\n")) {
    const m = re.exec(line);
    if (m) return m[1].trim();
  }
  return "";
}

export function parseOverview(body) {
  return {
    goal: fieldValue(body, "Goal"),
    difficulty: fieldValue(body, "Difficulty"),
    scope: fieldValue(body, "Scope"),
  };
}

export function countListItems(body) {
  let inFence = false, n = 0;
  for (const line of (body || "").split("\n")) {
    if (FENCE_RE.test(line)) inFence = !inFence;
    if (!inFence && /^\s{0,1}(?:[-*]|\d+\.)\s+\S/.test(line)) n++;
  }
  return n;
}

// Split the Decisions body into items by the **Question** marker; capture each item's
// question / recommendation / alternative raw text for card rendering.
export function parseDecisions(body) {
  const FIELD_RE = /^\s*(?:[-*]\s+)?\*\*(Question|Recommendation|Alternative)\*\*\s*[:：]?\s*(.*)$/;
  // An unindented numbered bold-only line ("**1. title**") starts an item, but only when a
  // **Question** is the next non-blank line after it. Both guards keep the rule from ever splitting
  // a field body: an indented or unnumbered bold line, any ATX heading, and a bold line followed by
  // prose all stay body text, because splitting there truncates a Recommendation and carries its
  // tail onto the next card. Everything outside that one shape keeps the old fold — the template
  // statement is the real fix; this is only the net under it.
  const ITEM_HEAD_RE = /^\*\*(\d+[.)]\s*\S.*?)\*\*\s*$/;
  const items = [];
  const preamble = [];
  const lines = body.split("\n");
  // Fence state after each line, so the lookahead reads it instead of re-scanning.
  const fenced = [];
  for (let i = 0, f = false; i < lines.length; i++) {
    if (FENCE_RE.test(lines[i])) f = !f;
    fenced.push(f);
  }
  const headStartsItem = (i) => {
    for (let j = i + 1; j < lines.length; j++) {
      if (fenced[j] || !lines[j].trim()) continue;
      const fm = FIELD_RE.exec(lines[j]);
      return !!fm && fm[1].toLowerCase() === "question";
    }
    return false;
  };
  let cur = null, field = null, curFromHead = false;
  const open = (question, fromHead) => {
    cur = { question, recommendation: "", alternative: "" };
    items.push(cur);
    field = "question";
    curFromHead = !!fromHead;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const inFence = fenced[i];
    const m = inFence ? null : FIELD_RE.exec(line);
    if (m) {
      const f = m[1].toLowerCase();
      if (f === "question") {
        // Fold into an item the heading rule just opened, so both shapes yield one item. Only
        // then — two consecutive **Question** lines still open two items, as they always did.
        if (curFromHead && !cur.recommendation && !cur.alternative) {
          cur.question += (cur.question ? "\n\n" : "") + (m[2] || "");
          field = "question";
        } else {
          open(m[2] || "", false);
        }
      } else if (cur) {
        field = f;
        cur[f] = m[2] || "";
      } else {
        preamble.push(line); // stray Recommendation/Alternative before any Question — keep, don't drop
      }
      continue;
    }
    const h = inFence ? null : ITEM_HEAD_RE.exec(line);
    if (h && headStartsItem(i)) {
      open(h[1], true);
      continue;
    }
    if (cur && field) cur[field] += "\n" + line;
    else if (!cur) preamble.push(line);
  }
  for (const it of items) {
    it.question = it.question.trim();
    it.recommendation = it.recommendation.trim();
    it.alternative = it.alternative.trim();
  }
  return { items, preamble: preamble.join("\n").trim() };
}

const GIST_MAX = 120;

// The one-line gist a collapsed section shows beside its title. Read from the section's
// own Markdown rather than from its rendered body: the source has one unambiguous first
// line of prose, where a card section's body holds several candidates. The viewer hides
// this copy while the section is open, so nothing has to move out of the body.
export function sectionGist(body) {
  let inFence = false;
  for (const raw of String(body || "").split("\n")) {
    if (FENCE_RE.test(raw)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith(">") || line.startsWith("<")) continue;
    const text = stripMd(line.replace(/^(?:[-*+]|\d+[.)])\s+/, "")).replace(/\s+/g, " ").trim();
    if (!text) continue;
    return text.length > GIST_MAX ? text.slice(0, GIST_MAX - 1) + "…" : text;
  }
  return "";
}

// Everything the renderer needs about a plan, derived in one place. Both surfaces call
// this rather than repeating the sequence: the empty-plan fallback section and the
// itemCount the Risks badge reads are easy to get subtly different, and a second copy
// would only be found by rendering both surfaces side by side.
export function preparePlan(markdown, id) {
  const { preamble: parsedPreamble, sections: parsed } = parseSections(markdown);
  // With no headings at all, parseSections puts the whole document in the preamble and the
  // fallback section below repeats it — so one of the two has to give, and it is the preamble.
  const preamble = parsed.length ? parsedPreamble : "";
  const sections = parsed.length
    ? parsed
    : [{ title: "Plan", type: "other", id: "plan", body: markdown }];
  const overviewSection = sections.find((s) => s.type === "overview");
  const overview = parseOverview(overviewSection ? overviewSection.body : "");
  const risksSection = sections.find((s) => s.type === "risks");
  const riskCount = risksSection ? countListItems(risksSection.body) : 0;
  if (risksSection) risksSection.itemCount = riskCount; // the section badge reads it back
  return { id, preamble, sections, overview, riskCount };
}

// The preamble is everything before the plan's first section heading, and the figures
// layer's `## Hero` block lands there (visual-plan-review.md § Figures layer). Split it so
// the viewer can put that block in its own slot: `hero` is the Hero block's Markdown, and
// `prose` is everything else with the block headings taken off — the shape the preamble had
// before Hero existed, so a heading naming anything else keeps its old disposition.
export function splitPreamble(preamble) {
  const lines = String(preamble || "").split("\n");
  const prose = [];
  const hero = [];
  const skipped = []; // a repeated Hero block's lines go here and are dropped
  let target = prose;
  let inFence = false;
  let heroSeen = false;
  for (const line of lines) {
    if (FENCE_RE.test(line)) inFence = !inFence;
    const h = !inFence && /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      // A repeated heading keeps the first block and skips the rest — the disposition
      // visual-plan-review.md § Figures layer's File format gives. Skipped means dropped,
      // not demoted to prose: a second hero rendered as preamble text is the same figure
      // twice on the page, which is what the first-wins rule exists to prevent.
      const isHero = h[1].trim() === "Hero";
      if (isHero && heroSeen) { target = skipped; continue; }
      if (isHero) { heroSeen = true; target = hero; continue; }
      target = prose;
      continue;
    }
    target.push(line);
  }
  return { prose: prose.join("\n").trim(), hero: hero.join("\n").trim() };
}

export const decisionSig = (it) => normText(`${it.question} ${it.recommendation} ${it.alternative}`);
const collectDecisionSigs = (body) => new Set(parseDecisions(body).items.map(decisionSig));

// The diff-mode state, in its pre-revise form. index.html holds one of these
// until buildDiff replaces it, so the shape is written here alone.
//   sectionStatus:    id -> "new" | "changed" | "unchanged"
//   prevBlockTexts:   id -> Set<normalized block text>         (changed sections only)
//   prevDecisionSigs: id -> Set<normalized decision signature> (changed Decisions sections only)
export function emptyDiff() {
  return {
    active: false,
    sectionStatus: new Map(),
    prevBlockTexts: new Map(),
    prevDecisionSigs: new Map(),
    changedCount: 0,
    removedCount: 0,
  };
}

// Compare current sections against the previous-launch plan; classify each
// current section new/changed/unchanged and precompute per-section prev block
// sets for the changed ones. Section identity is the slug id from parseSections.
// `collectBlockTexts` is passed in because collecting a section's block texts
// needs a document and a Markdown renderer, which this module deliberately has
// neither of.
export function buildDiff(prevMarkdown, sections, collectBlockTexts) {
  const diff = emptyDiff();
  const prev = parseSections(prevMarkdown);
  const prevById = new Map(prev.sections.map((s) => [s.id, s]));
  let matched = 0; // current sections that map to a prev section (ids are unique)
  for (const s of sections) {
    const p = prevById.get(s.id);
    if (!p) { diff.sectionStatus.set(s.id, "new"); diff.changedCount++; continue; }
    matched++;
    const changed = normText(s.body) !== normText(p.body);
    diff.sectionStatus.set(s.id, changed ? "changed" : "unchanged");
    if (changed) {
      diff.changedCount++;
      if (s.type === "decisions") diff.prevDecisionSigs.set(s.id, collectDecisionSigs(p.body));
      else diff.prevBlockTexts.set(s.id, collectBlockTexts(p.body));
    }
  }
  diff.removedCount = prev.sections.length - matched; // prev sections with no current counterpart
  diff.active = true;
  return diff;
}
