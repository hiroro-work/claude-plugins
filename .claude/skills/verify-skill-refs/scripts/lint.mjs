#!/usr/bin/env node
/**
 * Deterministic mechanical stage of verify-skill-refs.
 *
 * Implements the mechanical stage of `references/check-rules.md` § Executor
 * pipeline, which is the specification: extraction, indexing, class (a)
 * resolution, class (e) judgment, class (c) pre-filtering, and the `checked`
 * counts. Everything emitted here is a pure function of the target files (plus
 * the `--base-commit` diff for class (c)), so repeated runs against one tree
 * return byte-identical output — `SKILL.md` § Return contract states which
 * fields callers may therefore gate on.
 *
 * Judgment-only work — class (b) divergence, class (d) enumeration gaps, and the
 * class (c) residue — is handed to the caller in `judgment_payload`.
 *
 * Usage:
 *   node lint.mjs [--target-dir <path>] [--base-commit <sha>]
 *
 * Options:
 *   --target-dir   Lint this one root instead of every § Target roots entry
 *   --base-commit  Scope class (c) to the lines this ref's diff reports as changed
 *
 * Output: one JSON object on stdout.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

// --- Configuration ----------------------------------------------------------

const DEFAULT_ROOTS = ["skills/dev-workflow", "skills/mobpro"];

// Each shape's identifier pattern, and the placeholder form that stands in for a
// number in a template reference (`§ Step N`, which every reference file's own
// header paragraph cites while documenting the convention).
const SHAPES = {
  step: { identifier: String.raw`\bStep\s+\d+(?:\.\d+)?\b`, placeholder: /\bStep\s+[A-Z]\b/ },
  m: { identifier: String.raw`\bM\d+(?:-\d+)?\b`, placeholder: /\bM[A-Z]\b/ },
};

// Extraction and truncation bounds. The rules in `references/check-rules.md` state
// no numeric value of their own — they describe the shapes and leave every bound
// open — so these live here rather than in the hot path that file injects into
// every judgment dispatch. Some do decide verdicts (an over-long key demotes; a
// key under the minimum resolves; the hit count decides whether a root has a
// shape at all), so treat them as tuning, not as free parameters.
const SHAPE_MIN_IDENTIFIER_HITS = 10; // identifier hits a SKILL.md needs before its shape is inferred
const MIN_ANCHOR_CHARS = 3; // shortest key or anchor worth comparing
const MAX_ANCHOR_CHARS = 120; // longest key or quoted label treated as cleanly extracted
const MAX_BLOCKQUOTE_CHARS = 200; // longest blockquote line still read as an output literal
const BLOCKQUOTE_CONTEXT_LINES = 4; // lines before a blockquote scanned for an emit verb
const EMIT_VERB_WINDOW_CHARS = 100; // prose tail before a code span scanned for an emit verb
const CLASS_C_WINDOW_CHARS = 60; // prose on each side of an identifier scanned for a descriptor
const MAX_DETAIL_CHARS = 120; // literal prefix quoted into a class (e) detail
const MAX_FRAGMENT_CHARS = 200; // sentence prefix carried into a class (c) residue entry
const MAX_REASON_CHARS = 80; // `reason` cap, per `SKILL.md` § Return contract

// A quoted or bold label, and the `"<label>" paragraph` reference form built from
// the first. Shared so the class (a) label bound is written once; class (c)'s own
// descriptor test matches unbounded, since a descriptor may exceed this bound.
const QUOTED_LABEL = String.raw`["“]([^"”]{2,${MAX_ANCHOR_CHARS}})["”]`;
const QUOTED_LABEL_RE = new RegExp(QUOTED_LABEL);
const BOLD_LABEL_RE = new RegExp(String.raw`\*\*([^*]{2,${MAX_ANCHOR_CHARS}})\*\*`);
const LABEL_PARAGRAPH_RE = new RegExp(QUOTED_LABEL + String.raw`\s+paragraph\b`, "g");

// Exemplar contexts: places where an unresolvable reference or a bare-identifier
// literal is intentional, because the passage documents the convention by quoting
// it. `references/check-rules.md` § Class (a)'s "Demotion rule (violation vs
// warning)" paragraph declares this cause and § Class (e)'s "Demotion rule"
// paragraph reuses it. Each entry is the narrowest form that still selects
// the case — a file plus a verbatim fragment — and an entry matching nothing is
// reported as stale, mirroring § Manifest discipline's "Anchor staleness" bullet.
//
// Empty today: every exemplar currently in the two trees is already absorbed by a
// structural rule (an external-owner qualifier, a sub-item anchor, or a
// placeholder). Add an entry when a genuine exemplar reports as a violation.
const EXEMPLAR_ALLOWLIST = [];

// The emit-verb set `references/check-rules.md` § Class (e) step 2 names, each in
// its base, -s, and past form. Inflecting every verb alike is what matters: a
// missing form drops every literal the prose introduces with it, silently.
const EMIT_VERBS = /\b(?:render(?:s|ed)?|emit(?:s|ted)?|warn(?:s|ed)?|present(?:s|ed)?|report(?:s|ed)?|surface(?:s|d)?|note(?:s|d)?|append(?:s|ed)?)\b/i;

// Words that mark an extracted key as cut mid-phrase, so failing to resolve it is
// an extraction artifact rather than evidence of a broken reference.
const TRAILING_STOPWORDS = new Set(["of", "in", "for", "to", "and", "or", "the", "a", "an", "as", "at", "by", "on", "with", "that", "which", "per", "from", "is", "are"]);

const ZERO_COUNTS = () => ({ roots: 0, files: 0, refs_extracted: 0, refs_unresolved: 0, manifest_pairs: 0, step_candidates: 0, output_literals: 0 });
const EMPTY_JUDGMENT = () => ({ manifest_b: [], manifest_d: [], class_c_residue: [] });

// --- Helpers ----------------------------------------------------------------

const norm = (s) => s.replace(/`/g, "").replace(/\s+/g, " ").trim().toLowerCase();

const countOf = (s, re) => (s.match(re) || []).length;

function fail(reason) {
  process.stdout.write(JSON.stringify({
    status: "error",
    violation_entries: [],
    warning_entries: [],
    checked: ZERO_COUNTS(),
    judgment_payload: EMPTY_JUDGMENT(),
    reason: reason.slice(0, MAX_REASON_CHARS),
  }) + "\n");
  process.exit(0);
}

// The stable part of a heading or bold label: its subject, before the em-dash
// gloss, the parenthetical qualifier, or the colon title. References cite this
// part and continue into their own trailing prose, so matching on it is what
// makes those resolve.
function anchorSegment(text) {
  const t = text.replace(/^§\s*/, "");
  let end = t.length;
  for (const cut of [" — ", " – ", " (", ":"]) {
    const i = t.indexOf(cut);
    if (i > 0) end = Math.min(end, i);
  }
  return t.slice(0, end);
}

// --- File loading -----------------------------------------------------------

// Line-indexed mask of the lines fenced code blocks cover. Delimiters pair in
// document order; an unclosed final fence runs to end of file. A fence inside a
// blockquote still opens and closes a block, so the blockquote marker is stripped
// before testing — missing one desynchronizes every later pair and swallows the
// rest of the file. `unclosedFence` is that last fence's line, or `null` when the
// delimiters paired — the caller reports it rather than narrowing silently.
function fenceMask(lines) {
  const mask = new Uint8Array(lines.length + 2);
  let open = null;
  lines.forEach((line, i) => {
    if (!/^\s*(?:>\s?)*```/.test(line)) return;
    if (open === null) open = i + 1;
    else { mask.fill(1, open, i + 2); open = null; }
  });
  if (open !== null) mask.fill(1, open, lines.length + 1);
  return { mask, unclosedFence: open };
}

// `requireReferences` marks a lint target, which `SKILL.md` § Invocation contract
// requires to carry `SKILL.md` plus `references/*.md`. A target missing the
// references tree is a wiring defect — the same class as a missing root — so it
// halts rather than linting a partial tree whose cross-file references would then
// all resolve nowhere. A tree loaded only so that references naming it resolve is
// not a target: it is tolerated as-is, matching its caller's own `SKILL.md`-only
// pre-check.
function loadRoot(rootPath, requireReferences = false) {
  const skillMd = join(rootPath, "SKILL.md");
  if (!existsSync(skillMd)) fail(`target root missing: ${rootPath}`);

  const paths = [skillMd];
  const refDir = join(rootPath, "references");
  if (existsSync(refDir)) {
    for (const name of readdirSync(refDir).sort()) {
      if (name.endsWith(".md")) paths.push(join(refDir, name));
    }
  }
  if (requireReferences && paths.length === 1) fail(`target root has no references/*.md: ${rootPath}`);

  const files = new Map();
  for (const p of paths) {
    let text;
    try {
      text = readFileSync(p, "utf8");
    } catch {
      fail(`unreadable target file: ${relative(process.cwd(), p)}`);
    }
    const lines = text.split("\n");
    const { mask: fenced, unclosedFence } = fenceMask(lines);
    // One traversal builds both anchor indexes and collects the narrowings, so the
    // fence-skip predicate — the pass's most load-bearing invariant — is stated
    // once. Anchors carry their normalized forms, computed here: resolution
    // compares every candidate against every anchor in scope, so deriving them
    // per comparison would make the pass quadratic in the trees' size. Bold spans
    // skip fenced lines for the same reason headings do: a bold span inside a code
    // sample is quoted syntax, not an anchor, and admitting it would resolve a
    // genuinely dangling pointer.
    const headings = [];
    const boldNames = new Set();
    const narrowings = [];
    lines.forEach((line, i) => {
      if (fenced[i + 1]) return;
      const m = /^(#{1,4})\s+(.+?)\s*$/.exec(line);
      if (m) {
        const bare = m[2].replace(/^§\s*/, "");
        headings.push({ text: m[2], level: m[1].length, line: i + 1, n: norm(m[2]), anchorN: norm(anchorSegment(m[2])), bareN: norm(bare) });
      }
      for (const b of line.matchAll(/\*\*([^*]+)\*\*/g)) boldNames.add(norm(b[1]));
      if (countOf(line, /`/g) % 2 === 1) {
        narrowings.push(`unbalanced code-span backticks at line ${i + 1} — no backticked literal was extracted from it`);
      }
    });
    if (unclosedFence !== null) {
      narrowings.push(`unclosed code fence opened at line ${unclosedFence} — extraction skipped the rest of the file`);
    }
    const bolds = [...boldNames].map((n) => ({ n, anchorN: norm(anchorSegment(n)) }));
    const rootRelative = relative(rootPath, p);
    files.set(rootRelative, { rootRelative, reported: `${rootPath}/${rootRelative}`, text, lines, fenced, headings, bolds, narrowings });
  }
  return files;
}

// A root's shape decides which identifier pattern and name authority apply, read
// from the identifier that dominates its `SKILL.md`. Inferring it for every root
// (not only a `--target-dir` override) keeps `DEFAULT_ROOTS` carrying paths only,
// so a root appended there gets the right shape without a second edit.
function resolveShape(files) {
  const text = files.get("SKILL.md").text;
  const stepHits = countOf(text, new RegExp(SHAPES.step.identifier, "g"));
  const mHits = countOf(text, new RegExp(SHAPES.m.identifier, "g"));
  if (stepHits < SHAPE_MIN_IDENTIFIER_HITS && mHits < SHAPE_MIN_IDENTIFIER_HITS) return "none";
  return stepHits >= mHits ? "step" : "m";
}

// The phase names the root's own authority declares — `SKILL.md` § Target roots
// names the authority per shape. Bounded on purpose: harvesting `Step <n>: <name>`
// from running prose would let a violating literal supply its own phase name and
// pass class (e).
function nameAuthority(files, shape) {
  const names = new Set();
  const add = (raw) => {
    const n = raw.replace(/\s*\[[^\]]*\]\s*$/, "").replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/[`*]/g, "").replace(/\s*[—–-]\s*$/, "").trim();
    if (n.length >= MIN_ANCHOR_CHARS) names.add(norm(n));
  };

  if (shape === "step") {
    // The phase registration list, plus the `###` phase headings for any phase
    // the list omits. Only level 3: a `##` heading names a section of the skill
    // (`## Configuration`, `## Mode Detection`), not a phase, and admitting those
    // would let a literal like `Step 1 configuration failed` supply its own
    // "phase name" and pass class (e).
    for (const line of files.get("SKILL.md").lines) {
      const m = /^\s*[-*]\s+\*{0,2}Step\s+\d+(?:\.\d+)?\s*:\s*(.+)$/.exec(line);
      if (m) add(m[1]);
    }
    for (const h of files.get("SKILL.md").headings) {
      if (h.level !== 3) continue;
      const name = h.text.replace(/^Step\s+\d+(?:\.\d+)?\s*:?\s*/, "");
      // A phase heading either carries the identifier or names the phase in one
      // word (`### Completion`). A multi-word level-3 heading that carries no
      // identifier is a section of the skill, not a phase, and admitting it would
      // let a literal borrow its words as a "phase name".
      if (name !== h.text || !/\s/.test(name.replace(/\s*\([^)]*\)\s*$/, "").trim())) add(name);
    }
  } else if (shape === "m") {
    // Only headings that actually carry the `M<n> — <Name>` form; a heading that
    // does not would otherwise enter the authority set whole.
    for (const f of files.values()) {
      for (const m of f.text.matchAll(/^##+\s+M\d+(?:-\d+)?\s*(?:—|-|:)\s*(.+)$/gm)) add(m[1]);
    }
  }
  return names;
}

// --- Class (a): cross-reference resolution ----------------------------------

// Terminators that end a heading key. A backtick ends it because references are
// conventionally written inside a code span, so the next backtick is the
// reference's own closing one; a second `§` starts the next reference; `**` ends
// the emphasis the key sits in. `.` only counts when followed by a space, so
// `Step 7.5` survives; `(`/`)` are balanced so `Class (a)` survives.
function cutKey(rest) {
  let depth = 0;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if (c === "`" || c === "§") return rest.slice(0, i);
    if (rest.startsWith("**", i)) return rest.slice(0, i);
    if (c === "(") depth++;
    else if (c === ")") { if (depth === 0) return rest.slice(0, i); depth--; }
    else if (c === "," || c === ";" || c === "|") return rest.slice(0, i);
    else if (c === "." && (i + 1 >= rest.length || rest[i + 1] === " ")) return rest.slice(0, i);
    else if (rest.startsWith(" — ", i) || rest.startsWith(" – ", i)) return rest.slice(0, i);
  }
  return rest;
}

// Whether a word preceding a file qualifier names a skill rather than being an
// ordinary connective. An unbackticked word must be a root this lint knows;
// hyphenated skill names qualify only when backticked, so prose like "see
// well-known plan-format.md" cannot route a reference out of scope.
const KNOWN_ROOT_NAMES = new Set(DEFAULT_ROOTS.map((p) => p.split("/").pop()));
const POSSESSIVE_OWNERS = new Set(["its", "their", "the caller's"]);

function extractReferences(files, shape) {
  const placeholder = shape === "none" ? null : SHAPES[shape].placeholder;
  const cands = [];
  for (const f of files.values()) {
    f.lines.forEach((line, i) => {
      const lineNo = i + 1;
      if (f.fenced[lineNo]) return;

      for (const m of line.matchAll(/§\s*/g)) {
        const before = line.slice(0, m.index);
        const rest = line.slice(m.index + m[0].length);
        if (!rest.trim()) continue;

        const qual = /([A-Za-z0-9._/-]+\.md)`?\s*$/.exec(before);
        // A qualifier introduced by a skill name or a possessive ("mobpro
        // references/configuration.md", "`rules-review` SKILL.md", "its
        // SKILL.md") names that skill's file, not this root's; the owner decides
        // the scope and is classified against the loaded roots downstream.
        const backticked = /`([A-Za-z][A-Za-z0-9_-]*)`\s+[A-Za-z0-9._/-]+\.md`?\s*$/.exec(before);
        const bare = /(?:^|[\s(])([A-Za-z][A-Za-z0-9_-]*)\s+[A-Za-z0-9._/-]+\.md`?\s*$/.exec(before);
        const possessiveFile = /(its|their|the caller's)\s+[A-Za-z0-9._/-]+\.md`?\s*$/.exec(before);
        const ownerAlone = /`([a-z][a-z0-9]*(?:-[a-z0-9]+)+)`\s*$/.exec(before);
        const ownerWord = backticked ? backticked[1]
          : (possessiveFile ? possessiveFile[1]
            : (bare && KNOWN_ROOT_NAMES.has(bare[1]) ? bare[1]
              : (ownerAlone ? ownerAlone[1] : null)));
        // A possessive naming a skill ("dev-workflow's `§ No-Stall Principle`")
        // points into that skill without naming a file.
        const poss = /([A-Za-z][A-Za-z0-9_-]*)['’]s\s+`?$/.exec(before);
        const possessiveOwner = poss && (KNOWN_ROOT_NAMES.has(poss[1]) || poss[1].includes("-")) ? poss[1] : null;
        // Prose commonly names a file once and then lists several sections
        // ("`interactive-commits.md` … § Propose commit plan / § …"), so the last
        // file named earlier on the line is a fallback scope.
        let lineQualifier = null;
        for (const q of before.matchAll(/([A-Za-z0-9._/-]+\.md)/g)) lineQualifier = q[1];

        let raw = cutKey(rest);

        // A possessive tail, or a quoted label anywhere in the key, splits the
        // heading key from the bold-prose label it points at.
        let labelKey = null;
        const tail = /['’]s\s+(.*)$/.exec(raw);
        if (tail) {
          const q = QUOTED_LABEL_RE.exec(tail[1]) || BOLD_LABEL_RE.exec(tail[1]);
          if (q) labelKey = q[1];
          raw = raw.slice(0, tail.index);
        } else {
          const q = QUOTED_LABEL_RE.exec(raw);
          if (q) { labelKey = q[1]; raw = raw.slice(0, q.index); }
          const plural = /['’](?=\s)/.exec(raw);
          if (plural) raw = raw.slice(0, plural.index);
        }

        // Sentence punctuation trailing the key is not part of the anchor.
        const key = raw.replace(/^[`"'“]+/, "").replace(/[`"'”.,\s]+$/, "").trim();
        if (!key) continue;
        // Template forms document the convention rather than referring: an
        // angle-bracket placeholder, or the root's identifier with a letter in
        // the number slot.
        if (/[<>]/.test(key)) continue;
        if (labelKey && /[<>]/.test(labelKey)) continue;
        if (placeholder && placeholder.test(key)) continue;

        cands.push({ file: f.rootRelative, line: lineNo, key, labelKey, raw: line.trim(), qualifier: qual ? qual[1] : null, qualifierOwner: ownerWord, possessiveOwner, lineQualifier });
      }

      // Bold-prose-label references that carry no `§`.
      if (!line.includes("§")) {
        for (const m of line.matchAll(LABEL_PARAGRAPH_RE)) {
          cands.push({ file: f.rootRelative, line: lineNo, key: null, labelKey: m[1], raw: line.trim(), qualifier: null, qualifierOwner: null, possessiveOwner: null, lineQualifier: null });
        }
      }
    });
  }
  return cands;
}

// Resolution scope, per `references/check-rules.md` § Class (a)'s "Resolution
// scope model" paragraph. `null` means the reference points outside what this run loaded,
// which is out of scope rather than dangling.
function scopeFor(files, cand, rootsByName, byBasename) {
  const named = () => {
    // Prefer this root's own file, so a filename both roots carry
    // (`references/configuration.md`) is not silently resolved against the
    // sibling. Only when this root has no such file does the lookup widen — a
    // path may address a sibling root explicitly, as `../dev-workflow/references/
    // <file>.md` does.
    for (const f of files.values()) {
      if (f.rootRelative === cand.qualifier || f.rootRelative.endsWith("/" + cand.qualifier)) return [f];
    }
    const hits = filesNamed(byBasename, cand.qualifier);
    return hits.length ? hits : null;
  };
  if (cand.qualifierOwner) {
    if (POSSESSIVE_OWNERS.has(cand.qualifierOwner)) return null;
    const owner = rootsByName.get(cand.qualifierOwner);
    if (!owner) return null;
    if (!cand.qualifier) return [...owner.values()];
    for (const f of owner.values()) {
      if (f.rootRelative === cand.qualifier || f.rootRelative.endsWith("/" + cand.qualifier)) return [f];
    }
    return named();
  }
  if (cand.qualifier) return named();
  const own = files.get(cand.file);
  const skill = files.get("SKILL.md");
  const rest = [...files.values()].filter((f) => f !== own && f !== skill);
  return [own, skill, ...rest].filter(Boolean);
}

const filesNamed = (byBasename, path) => byBasename.get(path.split("/").pop()) ?? [];

// Bidirectional prefix match: a reference may cite a stable prefix of a longer
// heading, and a generously-cut key may run past the heading it names.
const prefixMatch = (a, b) => a.length >= MIN_ANCHOR_CHARS && b.length >= MIN_ANCHOR_CHARS && (a.startsWith(b) || b.startsWith(a));

const anchored = (k, a) => a.length >= MIN_ANCHOR_CHARS && (k === a || k.startsWith(a + " "));

// A numbered or lettered section anchor (`§ 2.2`, `§ 3`, `§ A step 5`), which the
// tree uses for sub-sections whose headings carry the same token.
const sectionToken = (key) => {
  const m = /^\(?([0-9]+(?:\.[0-9]+)*|[A-Za-z](?:\.[0-9A-Za-z]+)*)\)?(?:[.,)]|\s|$)/.exec(key.trim());
  return m ? m[1] : null;
};

const tokenResolves = (scope, token) => {
  const t = token.toLowerCase();
  return scope.some((f) => f.headings.some((h) => h.bareN === t || (h.bareN.startsWith(t) && !/[0-9a-z]/.test(h.bareN[t.length]))));
};

// A `§` key names either a heading or a bold-prose label — both anchor forms are
// in class (a)'s scope, so both indexes are tried.
function headingResolves(scope, key) {
  const k = norm(key);
  if (k.length < MIN_ANCHOR_CHARS) return true;
  const hit = scope.some((f) =>
    f.headings.some((h) => prefixMatch(k, h.n) || anchored(k, h.anchorN))
    || f.bolds.some((b) => prefixMatch(k, b.n) || anchored(k, b.anchorN)));
  if (hit) return true;
  const token = sectionToken(key);
  return token !== null && tokenResolves(scope, token);
}

const labelResolves = (scope, label) => {
  const l = norm(label);
  return scope.some((f) => f.bolds.some((b) => prefixMatch(l, b.n)) || f.headings.some((h) => prefixMatch(l, h.n)));
};

// A lettered sub-step (`§ (e)`), a dotted anchor whose parent section resolves
// (`§ 1.3` under a `1.` heading), or a step inside a section that resolves
// (`§ Procedure step 4`) — all name something below heading level, which no index
// reaches, so failing to find it is not evidence of a broken reference.
function subItemAnchor(key, scopes) {
  const stepOf = /^(.*?)\s+(?:sub-)?steps?\s+\d/i.exec(key);
  if (stepOf && stepOf[1].trim().length >= MIN_ANCHOR_CHARS && scopes.some((s) => s && headingResolves(s, stepOf[1].trim()))) return true;
  const token = sectionToken(key);
  if (token === null) return false;
  if (/^\(/.test(key.trim())) return true;
  const parts = token.split(".");
  for (let n = parts.length - 1; n >= 1; n--) {
    const ancestor = parts.slice(0, n).join(".");
    if (scopes.some((s) => s && tokenResolves(s, ancestor))) return true;
  }
  return false;
}

// Either delimiter left unbalanced marks the same cut-mid-phrase case: `cutKey`
// never stops at a lone backtick, and stops at a `)` only when it closes one it
// opened, so a key carrying either ran past the anchor into the surrounding
// sentence.
const unbalancedDelimiters = (key) =>
  countOf(key, /`/g) % 2 === 1 || countOf(key, /\(/g) !== countOf(key, /\)/g);

function extractionUncertain(key) {
  if (!key) return false;
  if (key.length > MAX_ANCHOR_CHARS) return true;
  if (unbalancedDelimiters(key)) return true;
  return TRAILING_STOPWORDS.has(norm(key).split(" ").pop());
}

// Shared by classes (a) and (e): the index of the allowlist entry a candidate
// matches, or -1. Tracking the index is what lets an entry that matches nothing
// report as stale.
const allowlistHit = (file, text) => EXEMPLAR_ALLOWLIST.findIndex((e) => file.endsWith(e.file) && norm(text).includes(norm(e.contains)));

// --- Class (e): bare identifier in a user-facing output literal -------------

// Code spans, split rather than matched: a length-bounded regex silently skips
// one-character spans and every later pair on the line shifts by one, turning
// ordinary prose between two spans into a candidate. An unbalanced line yields
// nothing, since its pairing cannot be trusted — `loadRoot` reports that line as
// a narrowing, so the empty result is not silent. `before` is the tail of the
// prose preceding the span, which is all the emit-verb test reads.
function codeSpans(line) {
  const parts = line.split("`");
  if (parts.length % 2 === 0) return [];
  const spans = [];
  let prefix = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) spans.push({ text: parts[i], before: prefix.slice(-EMIT_VERB_WINDOW_CHARS) });
    prefix += parts[i] + "`";
  }
  return spans;
}

function extractOutputLiterals(files) {
  const cands = [];
  for (const f of files.values()) {
    f.lines.forEach((line, i) => {
      const lineNo = i + 1;
      if (f.fenced[lineNo]) return;

      // Form 1: a paired `language:` sample line.
      const paired = /^\s*[-*]\s*`language:\s*\w+`\s*:\s*(.+)$/.exec(line);
      if (paired) {
        const spans = codeSpans(paired[1]).map((s) => s.text);
        if (spans.length) {
          cands.push({ file: f.rootRelative, line: lineNo, text: spans.sort((a, b) => b.length - a.length)[0] });
          return;
        }
      }

      // Form 2: a quoted sentence in a blockquote whose nearby prose marks it as
      // shown verbatim. A blockquote carrying bold labels or Markdown links is
      // commentary about the procedure, not a string shown to the user.
      if (/^\s*>/.test(line)) {
        const body = line.replace(/^\s*>\s?/, "").trim();
        const context = f.lines.slice(Math.max(0, i - BLOCKQUOTE_CONTEXT_LINES), i).join(" ");
        if (body && body.length <= MAX_BLOCKQUOTE_CHARS && !body.includes("**") && !body.includes("](") && EMIT_VERBS.test(context)) {
          cands.push({ file: f.rootRelative, line: lineNo, text: body });
        }
        return;
      }

      // Form 3: a backticked literal whose surrounding prose marks it as emitted.
      // The verb has to sit in the run of prose immediately before the span, not
      // merely somewhere on the line — a long paragraph mentioning "report" once
      // would otherwise nominate every code span it contains. Only multi-word
      // spans qualify: a short one is a cross-reference, which belongs to class
      // (a)/(c), not here.
      for (const span of codeSpans(line)) {
        const text = span.text.trim();
        if (text.startsWith("§") || !/\s/.test(text)) continue;
        if (EMIT_VERBS.test(span.before)) cands.push({ file: f.rootRelative, line: lineNo, text: span.text });
      }
    });
  }
  return cands;
}

// A literal that is entirely an angle-bracket placeholder describes what to write
// rather than being the written string — the same structural exclusion class (a)
// applies to template references. A placeholder standing in for the phase-name
// list renders compliantly for the same reason.
const isPlaceholder = (text) => /^<[^<>]*>$/.test(text.trim())
  || [...text.matchAll(/<([^>]*)>/g)].some((m) => /name|工程名/i.test(m[1]));

// --- Class (c): bare-number identifier references ---------------------------

// Allowed forms a regex can settle. The residue goes to judgment.
function classCAllowed(line, matchIndex, matchEnd, names) {
  if (/^\s*#{1,6}\s/.test(line)) return true;
  const after = line.slice(matchEnd);
  if (/^\s*:/.test(after) || /^\s*\(/.test(after)) return true;
  if (/^['’]s\s+["“*]/.test(after) || /^\s+sub-step\b/.test(after)) return true;
  const before = line.slice(0, matchIndex);
  if (/§\s*$/.test(before)) return true;
  // A stable descriptor bound in the same sentence, on either side of the number:
  // the pair form reads both ways (`Step 3 Plan Review`, `Plan Review (Step 3)`).
  const afterWindow = after.slice(0, CLASS_C_WINDOW_CHARS).replace(/^\s+/, "");
  if (/^["“][^"”]{2,}["”]/.test(afterWindow) || /^\*\*[^*]{2,}\*\*/.test(afterWindow)) return true;
  const afterN = norm(afterWindow);
  const trailing = norm(before.slice(-CLASS_C_WINDOW_CHARS)).replace(/[\s(—–:,[]+$/, "");
  for (const n of names) {
    if (afterN.startsWith(n) || trailing.endsWith(n)) return true;
  }
  return false;
}

// Changed / added line numbers per file, from the diff plus untracked files.
// `'error'` distinguishes an unresolvable base ref from the flag being absent —
// silently reporting class (c) as not applicable would leave a caller with a
// mis-wired base ref permanently green.
function changedLines(baseCommit, roots) {
  const map = new Map();
  let diff;
  try {
    diff = execFileSync("git", ["diff", "--unified=0", baseCommit, "--", ...roots], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "error";
  }
  let current = null;
  for (const line of diff.split("\n")) {
    const plus = /^\+\+\+ b\/(.+)$/.exec(line);
    if (plus) { current = plus[1]; if (!map.has(current)) map.set(current, new Set()); continue; }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunk && current) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      for (let n = start; n < start + count; n++) map.get(current).add(n);
    }
  }
  try {
    const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "--", ...roots], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    for (const p of untracked.split("\n").filter(Boolean)) map.set(p, "all");
  } catch {
    // A failing untracked probe only narrows class (c); the diff still applies.
  }
  return map;
}

// --- Manifest tables (classes (b) and (d)) ----------------------------------

// The tables in check-rules.md are the single source of truth, so the count and
// the judgment payload are read from them rather than restated here. Rows are
// matched to a run by root **directory name**, so a `--target-dir` copy of a root
// still gets its rows.
function readManifests(skillDir, activeNames) {
  const path = join(skillDir, "references", "check-rules.md");
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return { b: [], d: [], stale: ["check-rules.md unreadable — manifest classes (b) / (d) not enumerated"] };
  }
  const section = (heading) => {
    const start = text.indexOf(heading);
    if (start === -1) return "";
    const next = text.indexOf("\n## ", start + heading.length);
    return text.slice(start, next === -1 ? text.length : next);
  };
  const rowsOf = (body) => {
    // The section's own root declaration — one per section, per
    // `references/check-rules.md` § Per-root resolution — so rows are never
    // individually scoped and the first match governs the whole table.
    const declared = /root:\s*`?([\w./-]+)`?/.exec(body);
    const root = declared ? declared[1] : null;
    if (root && !activeNames.has(root.split("/").pop())) return [];
    return body.split("\n")
      .filter((l) => l.trim().startsWith("|") && !/^\|\s*-+/.test(l.trim()) && !/^\|\s*id\s*\|/.test(l.trim()))
      .map((l) => ({ root, row: l.trim() }));
  };
  return { b: rowsOf(section("## Class (b)")), d: rowsOf(section("## Class (d)")), stale: [] };
}

// --- Main -------------------------------------------------------------------

let args;
try {
  args = parseArgs({ options: { "target-dir": { type: "string" }, "base-commit": { type: "string" } }, allowPositionals: false }).values;
} catch (e) {
  fail(`bad arguments: ${e.message}`);
}
const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Every path is resolved against the repo root, never the working directory: the
// default roots and the sibling loaded for resolution are repo-relative, so a run
// from elsewhere would silently fail to load them and turn legitimate cross-root
// references into violations — the same tree would then gate differently
// depending on where the run started.
const repoRoot = resolve(skillDir, "..", "..", "..");
process.chdir(repoRoot);
const skillPrefix = relative(repoRoot, skillDir);
// One normalized, repo-relative form per root, used for both the reported `file`
// prefix and the git-diff key. A trailing separator or an absolute argument would
// otherwise produce a prefix git never matches, silently emptying class (c).
// A `--target-dir` outside the repository is the documented scratch-copy case, so
// it keeps its resolved absolute form; class (c) then finds no diff key for it and
// reports as not applicable, which is the honest outcome rather than an error.
const normalizeRoot = (p) => {
  const rel = relative(repoRoot, resolve(repoRoot, p)).replace(/\/+$/, "");
  return rel && !rel.startsWith("..") ? rel : resolve(repoRoot, p).replace(/\/+$/, "");
};
const rootPaths = (args["target-dir"] ? [args["target-dir"]] : DEFAULT_ROOTS).map(normalizeRoot);

const violations = [];
const warnings = [];
const judgment = EMPTY_JUDGMENT();
const counts = ZERO_COUNTS();
const allowlistHits = new Set();

const diffScope = args["base-commit"] ? changedLines(args["base-commit"], rootPaths) : null;
if (diffScope === "error") fail(`base-commit unresolvable: ${args["base-commit"]}`);

const loaded = rootPaths.map((rootPath) => {
  const files = loadRoot(rootPath, true);
  const shape = resolveShape(files);
  return { rootPath, files, shape, names: shape === "none" ? new Set() : nameAuthority(files, shape) };
});

// Roots addressable by name, so a reference that names another skill can resolve
// there. Under a `--target-dir` override only the target is linted, but the
// sibling default root is still loaded here — otherwise every reference naming it
// would report as dangling. A target whose directory name matches a default root
// shadows it, which keeps the override usable for its documented purpose: a
// scratch copy keeping the skill's own directory name is resolved against itself,
// so a defect injected into the copy surfaces.
const rootsByName = new Map(loaded.map((r) => [r.rootPath.replace(/\/+$/, "").split("/").pop(), r.files]));
if (args["target-dir"]) {
  for (const p of DEFAULT_ROOTS) {
    const name = p.split("/").pop();
    if (!rootsByName.has(name) && existsSync(join(p, "SKILL.md"))) rootsByName.set(name, loadRoot(p));
  }
}
const everyLoaded = [...rootsByName.values()].flatMap((m) => [...m.values()]);

// Drained over every loaded tree, not only the linted ones: a swallowed sibling
// loses the heading index that demotes a cross-root reference, so the reference
// escalates to a class (a) violation with nothing naming the cause.
for (const f of everyLoaded) {
  for (const detail of f.narrowings) warnings.push({ class: "scope-narrowed", file: f.reported, detail });
}

const byBasename = new Map();
for (const f of everyLoaded) {
  const base = f.rootRelative.split("/").pop();
  if (!byBasename.has(base)) byBasename.set(base, []);
  byBasename.get(base).push(f);
}

for (const { rootPath, files, shape, names } of loaded) {
  counts.roots++;
  counts.files += files.size;

  // Class (a)
  for (const cand of extractReferences(files, shape)) {
    counts.refs_extracted++;
    const scope = scopeFor(files, cand, rootsByName, byBasename);
    if (scope === null) continue;
    const resolvesIn = (s) => (cand.key === null || headingResolves(s, cand.key)) && (cand.labelKey === null || labelResolves(s, cand.labelKey));
    // Widening fallbacks, in order: the reference's own scope, then the file
    // named earlier on the line, then the skill a possessive named.
    const fallbacks = [scope];
    if (cand.lineQualifier) fallbacks.push(filesNamed(byBasename, cand.lineQualifier));
    if (cand.possessiveOwner && rootsByName.has(cand.possessiveOwner)) fallbacks.push([...rootsByName.get(cand.possessiveOwner).values()]);
    if (fallbacks.some((s) => s && s.length && resolvesIn(s))) continue;
    counts.refs_unresolved++;

    const file = `${rootPath}/${cand.file}`;
    const detail = `${cand.key ? `§ ${cand.key}` : ""}${cand.labelKey ? ` "${cand.labelKey}"` : ""}`.trim();
    // Recorded before the branch, not inside the exemplar arm below: an earlier
    // cause outranking the allowlist must still mark the entry matched, or the
    // entry would report as stale while genuinely selecting this candidate.
    const hit = allowlistHit(cand.file, cand.raw);
    if (hit !== -1) allowlistHits.add(hit);
    const demote = (why) => warnings.push({ class: "a-demoted", file, detail: `${detail} — ${why} (line ${cand.line})` });
    // Causes in the order `references/check-rules.md` § Class (a)'s "Demotion rule
    // (violation vs warning)" paragraph lists them, first match wins.
    if (resolvesIn(everyLoaded)) {
      // The key resolves in a sibling root the reference never names. A real but
      // weaker finding — the target exists, the pointer just omits which tree it
      // lives in — and not a violation, or the two trees' heavy mutual
      // referencing would fail the gate. A renamed heading resolves in no root at
      // all and still reports below.
      demote("resolves only in a sibling root this reference does not name");
    } else if (cand.key !== null && subItemAnchor(cand.key, fallbacks)) {
      demote("sub-item anchor inside an existing section, not indexable");
    } else if (extractionUncertain(cand.key)) {
      demote("extraction uncertain");
    } else if (hit !== -1) {
      demote("unresolved in an exemplar context, allowlisted");
    } else {
      violations.push({ class: "a", file, detail: `${detail} — resolves to no heading or bold label in this root (line ${cand.line})` });
    }
  }

  // Class (e)
  if (shape !== "none") {
    const identifier = new RegExp(SHAPES[shape].identifier);
    for (const lit of extractOutputLiterals(files)) {
      counts.output_literals++;
      if (!identifier.test(lit.text)) continue;
      if (isPlaceholder(lit.text)) continue;
      const n = norm(lit.text);
      let named = false;
      for (const name of names) {
        if (n.includes(name)) { named = true; break; }
      }
      if (named) continue;

      const file = `${rootPath}/${lit.file}`;
      const hit = allowlistHit(lit.file, lit.text);
      if (hit !== -1) {
        allowlistHits.add(hit);
        warnings.push({ class: "e-demoted", file, detail: `${lit.text.slice(0, MAX_DETAIL_CHARS)} — identifier quoted in an exemplar context (allowlisted)` });
      } else {
        violations.push({ class: "e", file, detail: `${lit.text.slice(0, MAX_DETAIL_CHARS)} — carries the root identifier with no phase name (line ${lit.line})` });
      }
    }
  }

  // Class (c)
  if (shape !== "none" && diffScope) {
    const identifier = new RegExp(SHAPES[shape].identifier, "g");
    for (const f of files.values()) {
      const key = `${rootPath}/${f.rootRelative}`;
      const inDiff = diffScope.get(key);
      if (!inDiff) continue;
      f.lines.forEach((line, i) => {
        const lineNo = i + 1;
        if (f.fenced[lineNo]) return;
        if (inDiff !== "all" && !inDiff.has(lineNo)) return;
        // One residue entry per identifier per line: repeated occurrences share
        // the sentence a judge would read, so they are one judgment, not several.
        const seen = new Set();
        for (const m of line.matchAll(identifier)) {
          counts.step_candidates++;
          if (classCAllowed(line, m.index, m.index + m[0].length, names)) continue;
          if (seen.has(m[0])) continue;
          seen.add(m[0]);
          judgment.class_c_residue.push({ file: key, line: lineNo, identifier: m[0], fragment: line.trim().slice(0, MAX_FRAGMENT_CHARS) });
        }
      });
    }
  }
}

// Classes (b) and (d) are judgment-only; the script counts the manifest and
// forwards the rows.
// Only the linted roots select manifest rows — a sibling loaded purely so that
// references naming it resolve is not a root this run checks.
const manifests = readManifests(skillDir, new Set(loaded.map((r) => r.rootPath.split("/").pop())));
judgment.manifest_b = manifests.b;
judgment.manifest_d = manifests.d;
counts.manifest_pairs = manifests.b.length + manifests.d.length;
for (const s of manifests.stale) warnings.push({ class: "stale-manifest", file: `${skillPrefix}/references/check-rules.md`, detail: s });

EXEMPLAR_ALLOWLIST.forEach((e, i) => {
  if (!allowlistHits.has(i)) {
    warnings.push({ class: "stale-manifest", file: `${skillPrefix}/scripts/lint.mjs`, detail: `exemplar allowlist entry matches nothing: ${e.file} — "${e.contains}"` });
  }
});

// Code-unit comparison, not `localeCompare`: collation is locale-dependent, and
// the output has to be a pure function of the inputs alone.
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byKey = (a, b) => cmp(a.class + a.file + a.detail, b.class + b.file + b.detail);
violations.sort(byKey);
warnings.sort(byKey);
judgment.class_c_residue.sort((a, b) => cmp(a.file, b.file) || a.line - b.line || cmp(a.identifier, b.identifier));

process.stdout.write(JSON.stringify({
  status: violations.length ? "violations" : "ok",
  violation_entries: violations,
  warning_entries: warnings,
  checked: counts,
  judgment_payload: judgment,
}, null, 2) + "\n");
