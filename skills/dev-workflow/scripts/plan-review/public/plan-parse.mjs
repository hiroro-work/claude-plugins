// Plan parsing for the plan-review viewer. DOM-free with no module-level mutable state: the browser
// surfaces and the Node tests share it.

export const stripMd = (t) => (t || "").replace(/[*`]/g, "").trim();
export const normText = (t) => (t || "").replace(/\s+/g, " ").trim();
export const excerptOf = (t) => normText(t).slice(0, 40);

export const anchorNorm = (t) =>
  normText(String(t || "").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`~]/g, "")).toLowerCase();
// An anchor may be a prefix of the block or vice versa; the floor keeps a near-empty block from matching everything.
export const anchorMatches = (a, b) => {
  if (!a || !b) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 8 && long.startsWith(short);
};
// Decision card id; the digest's in-page link and sectionOfBlockId both depend on this scheme.
const DECISION_ID_PREFIX = "decision-";
export const decisionBlockId = (n) => `${DECISION_ID_PREFIX}${n}`;

export const sectionOfBlockId = (id, decisionsSectionId) => {
  const b = String(id || "");
  if (b.includes("::")) return b.slice(0, b.indexOf("::"));
  return b.startsWith(DECISION_ID_PREFIX) ? (decisionsSectionId || "") : "";
};

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
export const escapeHtml = (t) => (t || "").replace(/[&<>"]/g, (c) => HTML_ESCAPES[c]);

export const FENCE_RE = /^\s*(`{3,}|~{3,})/;

// Title of the section export-plan-html.mjs appends; SECTION_TYPES' dialogue entry matches it.
export const DIALOGUE_TITLE = "Conversation history";

// Match-priority order. Prefixes come from plan-format.md and mob-mode.md § Plan shape; a heading renamed
// upstream silently all-collapses that plan. Each prefix stops short of an apostrophe.
const SECTION_TYPES = [
  { type: "overview", match: ["overview", "what we"], open: true },
  { type: "decisions", match: ["decision", "choices i made"], open: true },
  { type: "buildorder", match: ["build order"], open: true, collapseSteps: true },
  { type: "whyorder", match: ["why this"], open: true },
  { type: "test", match: ["test plan", "test", "how we"] },
  { type: "risks", match: ["risk", "unknown", "watch-out"] },
  { type: "context", match: ["context"], open: true },
  { type: "dialogue", match: [DIALOGUE_TITLE.toLowerCase()] },
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

// The lookahead demands a YAML key on line 1: without it, a plan opening on a `---`
// thematic break loses everything up to the next one.
const FRONTMATTER_RE = /^---\r?\n(?=[A-Za-z_][\w.-]*[ \t]*:)[\s\S]*?\r?\n---[ \t]*\r?\n/;
export const stripFrontmatter = (t) => String(t || "").replace(FRONTMATTER_RE, "");

// Section heading level is inferred: score each level by the distinct section *types* classify recognizes
// (not heading count), shallowest wins a tie. A plan written one level shallow would otherwise collapse
// into one section.
const LEVELLED_HEADING_RE = /^(#{2,4})\s+(.+?)\s*$/;
const SECTION_LEVELS = [2, 3, 4];
const DEFAULT_SECTION_LEVEL = 3;
// Hero and the `## Plan` wrapper belong to the preamble at any level.
const RESERVED_HEADINGS = new Set(["plan", "hero"]);

export function inferSectionLevel(lines) {
  const types = new Map(); // level -> the set of section types recognized at it
  let inFence = false;
  for (const line of lines) {
    if (FENCE_RE.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const h = LEVELLED_HEADING_RE.exec(line);
    if (!h) continue;
    const type = classify(h[2]);
    if (type === "other") continue;
    const lv = h[1].length;
    if (!types.has(lv)) types.set(lv, new Set());
    types.get(lv).add(type);
  }
  let level = DEFAULT_SECTION_LEVEL, best = 0;
  for (const lv of SECTION_LEVELS) {
    const n = types.has(lv) ? types.get(lv).size : 0;
    if (n > best) { level = lv; best = n; } // strict, so the shallowest level wins a tie
  }
  return level;
}

export function parseSections(markdown) {
  const body = stripFrontmatter(markdown);
  const lines = body.split(/\r?\n/);
  const headingRe = new RegExp(`^#{${inferSectionLevel(lines)}}\\s+(.+?)\\s*$`);
  const sections = [];
  const preamble = [];
  let cur = null;
  let inFence = false;
  const seen = {};
  for (const line of lines) {
    if (FENCE_RE.test(line)) inFence = !inFence;
    const h = !inFence && headingRe.exec(line);
    if (h && !RESERVED_HEADINGS.has(h[1].trim().toLowerCase())) {
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
  // Returned so a caller does not strip twice — a second pass eats the span between two `---`.
  return { preamble: preamble.join("\n").trim(), sections, body };
}

export function fieldValue(body, label) {
  const re = new RegExp("\\*\\*" + label + "\\*\\*\\s*[:：]\\s*(.*)");
  for (const line of body.split("\n")) {
    const m = re.exec(line);
    if (m) return m[1].trim();
  }
  return "";
}

// Scope kind tokens (plan-format.md § Overview). English on purpose: a localized token would parse as part of the path.
const SCOPE_KINDS = ["new", "edit", "delete"];
const SCOPE_LINE_RE = new RegExp("^\\s{2,}[-*]\\s+(?:(" + SCOPE_KINDS.join("|") + ")\\s+)?(.+?)\\s*$");
// `<path> — <summary> (step N)`; the step tag is optional and may hold a range or list.
const SCOPE_STEP_RE = /\s*\((?:steps?\s*)?(\d[\d\s,–-]*)\)\s*$/i;
const OVERVIEW_FIELDS = ["Goal", "Now", "After", "Not changing", "Approach", "Highlights", "Difficulty", "Scope"];
const FIELD_LINE_RE = /^\s{0,1}[-*]\s+\*\*([^*]+)\*\*\s*[:：]/;

export function parseOverview(body) {
  const ov = { scopeFiles: [], rest: "" };
  for (const f of OVERVIEW_FIELDS) ov[f === "Not changing" ? "notChanging" : f.toLowerCase()] = fieldValue(body, f);
  const rest = [];
  let inFence = false, inScope = false;
  for (const line of (body || "").split("\n")) {
    if (FENCE_RE.test(line)) inFence = !inFence;
    if (inFence) { rest.push(line); continue; }
    const fm = FIELD_LINE_RE.exec(line);
    if (fm) {
      const known = OVERVIEW_FIELDS.some((f) => f.toLowerCase() === fm[1].trim().toLowerCase());
      inScope = known && fm[1].trim().toLowerCase() === "scope";
      if (!known) rest.push(line);
      continue;
    }
    const sm = inScope ? SCOPE_LINE_RE.exec(line) : null;
    if (sm) {
      let text = sm[2];
      let steps = "";
      const st = SCOPE_STEP_RE.exec(text);
      if (st) { steps = st[1].replace(/\s+/g, ""); text = text.slice(0, st.index); }
      const sep = text.search(/\s[—–-]\s/);
      const file = stripMd(sep >= 0 ? text.slice(0, sep) : text);
      const summary = sep >= 0 ? text.slice(sep).replace(/^\s[—–-]\s/, "").trim() : "";
      ov.scopeFiles.push({ kind: sm[1] || "", file, summary, steps });
      continue;
    }
    if (line.trim()) inScope = false;
    rest.push(line);
  }
  ov.rest = rest.join("\n").trim();
  const m = /(\d+)/.exec(ov.scope);
  ov.fileCount = ov.scopeFiles.length || (m ? Number(m[1]) : 0);
  return ov;
}

export function countListItems(body) {
  let inFence = false, n = 0;
  for (const line of (body || "").split("\n")) {
    if (FENCE_RE.test(line)) inFence = !inFence;
    if (!inFence && /^\s{0,1}(?:[-*]|\d+\.)\s+\S/.test(line)) n++;
  }
  return n;
}

export function parseDecisions(body) {
  // Plans drift into `1. **Question**`, `**Question:**` and `**Alternative 2**`; the label group stays bare.
  const FIELD_RE = /^\s*(?:(?:[-*]|\d+[.)])\s+)?\*\*(Question|Recommendation|Alternative)(?:\s+\d+)?\s*[:：]?\*\*\s*[:：]?\s*(.*)$/;
  // Only a following **Question** opens an item; splitting elsewhere truncates a Recommendation.
  const ITEM_HEAD_RE = /^\*\*(\d+[.)]\s*\S.*?)\*\*\s*$/;
  // A sub-heading right above a **Question** is that item's title.
  const HEADING_HEAD_RE = /^#{2,6}\s+(.+?)\s*$/;
  const items = [];
  const preamble = [];
  const lines = body.split("\n");
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
    cur = { question: [question], recommendation: [], alternative: [] };
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
        if (curFromHead && !cur.recommendation.length && !cur.alternative.length) {
          cur.question.push(m[2] || "");
          field = "question";
        } else {
          open(m[2] || "", false);
        }
      } else if (cur) {
        field = f;
        cur[f].push(m[2] || ""); // a second Alternative must not replace the first
      } else {
        preamble.push(line); // stray Recommendation/Alternative before any Question — keep, don't drop
      }
      continue;
    }
    const h = inFence ? null : (ITEM_HEAD_RE.exec(line) || HEADING_HEAD_RE.exec(line));
    if (h && headStartsItem(i)) {
      open(h[1], true);
      continue;
    }
    if (cur && field) cur[field][cur[field].length - 1] += "\n" + line;
    else if (!cur) preamble.push(line);
  }
  for (const it of items) {
    for (const k of ["question", "recommendation", "alternative"]) {
      it[k] = it[k].map((seg) => dedentTail(seg).trim()).filter(Boolean).join("\n\n");
    }
  }
  return { items, preamble: preamble.join("\n").trim() };
}

// Under a numbered item the rationale bullets sit 4+ columns in, which markdown reads as paragraph text.
function dedentTail(text) {
  const [first, ...rest] = text.split("\n");
  const indents = rest.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
  if (!indents.length) return text;
  const cut = Math.min(...indents);
  return [first, ...rest.map((l) => l.slice(Math.min(cut, l.match(/^ */)[0].length)))].join("\n");
}

const GIST_MAX = 120;
const capGist = (t) => (t.length > GIST_MAX ? t.slice(0, GIST_MAX - 1) + "…" : t);

// Read from Markdown, not the rendered body: the source has one unambiguous first prose line.
export function sectionGist(body) {
  let inFence = false;
  for (const raw of String(body || "").split("\n")) {
    if (FENCE_RE.test(raw)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith(">") || line.startsWith("<")) continue;
    const text = stripMd(line.replace(/^(?:[-*+]|\d+[.)])\s+/, "")).replace(/\s+/g, " ").trim();
    if (!text) continue;
    return capGist(text);
  }
  return "";
}

// Row n is card n of the first decisions section; every section numbers from 1.
export function buildDecisionDigest(sections) {
  const sec = (sections || []).find((s) => s.type === "decisions");
  if (!sec) return null;
  const { items } = parseDecisions(sec.body || "");
  if (!items.length) return null;
  return {
    items: items.map((it, i) => ({
      n: i + 1,
      question: sectionGist(it.question) || capGist(normText(it.question)),
      recommendation: sectionGist(it.recommendation) || capGist(normText(it.recommendation)),
    })),
  };
}

export function preparePlan(markdown, id) {
  const { preamble: parsedPreamble, sections: parsed, body } = parseSections(markdown);
  const preamble = parsed.length ? parsedPreamble : "";
  const sections = parsed.length
    ? parsed
    : [{ title: "Plan", type: "other", id: "plan", body }];
  const overviewSection = sections.find((s) => s.type === "overview");
  const overview = parseOverview(overviewSection ? overviewSection.body : "");
  const risksSection = sections.find((s) => s.type === "risks");
  const riskCount = risksSection ? countListItems(risksSection.body) : 0;
  if (risksSection) risksSection.itemCount = riskCount; // the section badge reads it back
  const buildSection = sections.find((s) => s.type === "buildorder");
  const stepCount = buildSection ? countListItems(buildSection.body) : 0;
  const decisionsSection = sections.find((s) => s.type === "decisions");
  const decisionCount = decisionsSection ? parseDecisions(decisionsSection.body).items.length : 0;
  return { id, preamble, sections, overview, riskCount, stepCount, decisionCount };
}

// Split the figures layer's `## Hero` block out of the preamble (visual-plan-review.md § Figures layer).
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
      // First Hero wins; a repeat is dropped, not demoted to prose.
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

// Diff state shape; index.html's emptyDiff() mirrors it.
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

// `collectBlockTexts` is injected: it needs a document and a Markdown renderer.
export function buildDiff(prevMarkdown, sections, collectBlockTexts) {
  const diff = emptyDiff();
  const prev = parseSections(prevMarkdown);
  const prevById = new Map(prev.sections.map((s) => [s.id, s]));
  let matched = 0;
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
