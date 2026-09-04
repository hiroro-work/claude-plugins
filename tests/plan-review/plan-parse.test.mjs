// Unit tests for the plan-review viewer's plan parsing.
//
// public/plan-parse.mjs is the browser's own module, imported here unchanged.
// Everything it holds is free of the DOM, so collectBlockTexts — which stayed in
// index.html and which buildDiff calls — is passed in as a stub.

import assert from "node:assert/strict";
import test from "node:test";

import {
  OPEN_TYPES,
  STEP_COLLAPSE_TYPES,
  anchorMatches,
  anchorNorm,
  buildDecisionDigest,
  buildDiff,
  decisionBlockId,
  classify,
  countListItems,
  decisionSig,
  emptyDiff,
  preparePlan,
  sectionGist,
  splitPreamble,
  escapeHtml,
  excerptOf,
  fieldValue,
  parseDecisions,
  parseOverview,
  parseSections,
  inferSectionLevel,
  sectionOfBlockId,
  slugify,
} from "../../skills/dev-workflow/scripts/plan-review/public/plan-parse.mjs";

// buildDiff's block collector, stubbed: one "block" per non-blank line. Enough
// to tell which section the collector was called for, which is all buildDiff
// does with the result.
const blocksByLine = (body) => new Set(body.split("\n").map((l) => l.trim()).filter(Boolean));

test("parseSections keeps everything before the first ### as the preamble", () => {
  const { preamble, sections } = parseSections("## Plan\n\nintro\n\n### Overview\n\nbody\n");
  assert.equal(preamble, "## Plan\n\nintro");
  assert.deepEqual(sections.map((s) => s.title), ["Overview"]);
  assert.equal(sections[0].body, "body");
});

test("parseSections does not treat a ### inside a code fence as a heading", () => {
  const { sections } = parseSections("### Overview\n\n```md\n### Not a heading\n```\n\ntail\n");
  assert.deepEqual(sections.map((s) => s.title), ["Overview"]);
  assert.match(sections[0].body, /### Not a heading/);
});

test("parseSections gives repeated headings distinct ids", () => {
  const { sections } = parseSections("### Build order\n\na\n\n### Build order\n\nb\n");
  assert.deepEqual(sections.map((s) => s.id), ["build-order", "build-order-2"]);
});

// --- the section heading level is inferred, so a plan written one level shallow still splits ---

test("inferSectionLevel picks ### for a canonical plan, past the ## wrapper and Hero block", () => {
  const md = "## Plan\n\n## Hero\n<figure></figure>\n\n### Overview\n\nb\n\n### Build order\n\n1. x\n";
  assert.equal(inferSectionLevel(md.split("\n")), 3);
  assert.deepEqual(parseSections(md).sections.map((s) => s.title), ["Overview", "Build order"]);
});

test("inferSectionLevel picks ## when the plan puts its sections there", () => {
  const md = "# Subtask 5\n\n## Overview\n\nb\n\n## Decisions\n\n### Decision 1: naming\n\n"
    + "**Question**: q\n\n**Recommendation**: r\n\n**Alternative**: a\n\n## Build order\n\n1. x\n";
  assert.equal(inferSectionLevel(md.split("\n")), 2);
  const { sections } = parseSections(md);
  assert.deepEqual(sections.map((s) => s.type), ["overview", "decisions", "buildorder"]);
  // The bug this guards: with the level fixed at ###, Build order landed inside the
  // Decisions section and its Alternative field swallowed the whole numbered list.
  const [item] = parseDecisions(sections[1].body).items;
  assert.equal(item.alternative, "a");
});

test("inferSectionLevel counts distinct section types, so per-decision sub-headings cannot win", () => {
  const decisions = [1, 2, 3, 4, 5]
    .map((n) => `### Decision ${n}: choice ${n}\n\n**Question**: q${n}\n\n**Recommendation**: r${n}\n`)
    .join("\n");
  const md = `## Overview\n\nb\n\n## Decisions\n\n${decisions}\n## Build order\n\n1. x\n\n## Test plan\n\n- t\n`;
  // Five ### headings against four ## ones: by heading count level 3 would win and swallow
  // Build order into the last Alternative again. Level 3 carries one type, level 2 carries four.
  assert.equal(inferSectionLevel(md.split("\n")), 2);
  const { sections } = parseSections(md);
  assert.deepEqual(sections.map((s) => s.type), ["overview", "decisions", "buildorder", "test"]);
  assert.equal(parseDecisions(sections[1].body).items.length, 5);
});

test("inferSectionLevel leaves a heading inside a fence out of the count", () => {
  const md = "### Overview\n\n```md\n## Decisions\n## Build order\n## Test plan\n```\n";
  assert.equal(inferSectionLevel(md.split("\n")), 3);
});

test("parseSections keeps the Plan wrapper and the Hero block in the preamble at ## level", () => {
  const md = "## Plan\n\n## Hero\n<figure>H</figure>\n\n## Overview\n\nb\n\n## Risks\n\n- r\n";
  const { preamble, sections } = parseSections(md);
  assert.deepEqual(sections.map((s) => s.title), ["Overview", "Risks"]);
  // Reserved for the preamble, where splitPreamble gives the figure its own slot.
  assert.equal(splitPreamble(preamble).hero, "<figure>H</figure>");
});

test("inferSectionLevel falls back to ### when no heading is a known section", () => {
  const md = "## Notes\n\nprose\n\n#### Appendix\n\nmore\n";
  assert.equal(inferSectionLevel(md.split("\n")), 3);
  assert.deepEqual(preparePlan(md, "p").sections.map((s) => s.title), ["Plan"]);
});

test("classify maps known title prefixes and falls back to other", () => {
  assert.equal(classify("Overview"), "overview");
  assert.equal(classify("Decisions"), "decisions");
  assert.equal(classify("Build order"), "buildorder");
  assert.equal(classify("Why this order"), "whyorder");
  assert.equal(classify("Test plan"), "test");
  assert.equal(classify("Risks / Unknowns"), "risks");
  assert.equal(classify("Context"), "context");
  assert.equal(classify("Appendix"), "other");
});

test("slugify falls back to `section` when a title has nothing to slug", () => {
  assert.equal(slugify("Build order"), "build-order");
  assert.equal(slugify("---"), "section");
});

test("fieldValue accepts both colon widths and returns empty on a miss", () => {
  assert.equal(fieldValue("- **Goal**: ship it", "Goal"), "ship it");
  assert.equal(fieldValue("- **Goal**：出荷する", "Goal"), "出荷する");
  assert.equal(fieldValue("- **Goal**: ship it", "Scope"), "");
});

test("parseOverview still reads the Goal shape, with the file count taken from the Scope line", () => {
  const ov = parseOverview("- **Goal**: g\n- **Difficulty**: Moderate\n- **Scope**: 3 files\n");
  assert.equal(ov.goal, "g");
  assert.equal(ov.difficulty, "Moderate");
  assert.equal(ov.scope, "3 files");
  assert.equal(ov.now, "");
  assert.deepEqual(ov.scopeFiles, []);
  assert.equal(ov.fileCount, 3);
  assert.equal(ov.rest, "");
});

test("parseOverview reads the Now / After shape and its per-file Scope lines", () => {
  const body = [
    "- **Now**: today",
    "- **After**: tomorrow",
    "- **Not changing**: headings",
    "- **Approach**: small steps",
    "- **Scope**: 4 files",
    "  - edit `references/plan-format.md` — add the caps (step 1)",
    "  - new `tests/plan-review/x.test.mjs` — cover it (steps 4–6)",
    "  - `CHANGELOG.md` / `marketplace.json` — bump",
    "  - delete `old.md`",
    "",
    "<figure><svg></svg><figcaption>cap</figcaption></figure>",
  ].join("\n");
  const ov = parseOverview(body);
  assert.equal(ov.now, "today");
  assert.equal(ov.after, "tomorrow");
  assert.equal(ov.notChanging, "headings");
  assert.equal(ov.approach, "small steps");
  assert.deepEqual(ov.scopeFiles, [
    { kind: "edit", file: "references/plan-format.md", summary: "add the caps", steps: "1" },
    { kind: "new", file: "tests/plan-review/x.test.mjs", summary: "cover it", steps: "4–6" },
    { kind: "", file: "CHANGELOG.md / marketplace.json", summary: "bump", steps: "" },
    { kind: "delete", file: "old.md", summary: "", steps: "" },
  ]);
  // The per-file lines win over the `N files` figure, so a miscount in prose cannot show.
  assert.equal(ov.fileCount, 4);
  // What is neither a field nor a Scope line survives for the structured render to place.
  assert.equal(ov.rest, "<figure><svg></svg><figcaption>cap</figcaption></figure>");
});

test("parseOverview closes the Scope block at the next non-blank line that is not a Scope line", () => {
  const ov = parseOverview("- **Scope**: 1 file\n  - edit `a.md` — x\n\nA paragraph.\n  - not a scope line\n");
  assert.equal(ov.scopeFiles.length, 1);
  assert.match(ov.rest, /A paragraph\./);
  assert.match(ov.rest, /not a scope line/);
});

test("preparePlan counts the first Build order's steps and the first Decisions' items", () => {
  const model = preparePlan(
    "### Decisions\n\n- **Question**: q\n- **Recommendation**: r\n\n### Build order\n\n1. **a** — x\n   - how\n2. **b**\n",
    "p",
  );
  assert.equal(model.stepCount, 2);
  assert.equal(model.decisionCount, 1);
});

test("countListItems skips fenced lines and deeply indented ones", () => {
  const body = ["- one", "* two", "3. three", "```", "- fenced", "```", "  - indented"].join("\n");
  assert.equal(countListItems(body), 3);
});

test("parseDecisions splits on **Question** and trims each field", () => {
  const { items, preamble } = parseDecisions(
    "- **Question**: q1\n- **Recommendation**: r1\n- **Alternative**: a1\n" +
      "- **Question**: q2\n- **Recommendation**: r2\n",
  );
  assert.equal(preamble, "");
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { question: "q1", recommendation: "r1", alternative: "a1" });
  assert.deepEqual(items[1], { question: "q2", recommendation: "r2", alternative: "" });
});

test("parseDecisions folds a numbered bold heading into the Question that follows it", () => {
  const { items } = parseDecisions("**1. naming**\n\n- **Question**: q\n- **Recommendation**: r\n");
  assert.equal(items.length, 1);
  // How many blank lines the fold leaves between the two is incidental; that both
  // ended up in one question is the contract.
  assert.match(items[0].question, /^1\. naming\s+q$/);
});

test("parseDecisions folds a sub-heading into the Question that follows it", () => {
  const { items, preamble } = parseDecisions(
    "### Decision 1: naming\n\n**Question**: q1\n\n**Recommendation**: r1\n\n**Alternative**: a1\n\n"
    + "### Decision 2: layout\n\n**Question**: q2\n\n**Recommendation**: r2\n");
  assert.equal(preamble, "");
  assert.equal(items.length, 2);
  assert.match(items[0].question, /^Decision 1: naming\s+q1$/); // the # marks come off with the head
  // The heading of the item that follows must not trail into this Alternative.
  assert.equal(items[0].alternative, "a1");
  assert.match(items[1].question, /Decision 2: layout/);
});

test("parseDecisions leaves a numbered bold line alone when prose follows it", () => {
  const { items } = parseDecisions("- **Question**: q\n\n**2. still body**\n\nprose\n");
  assert.equal(items.length, 1);
  assert.match(items[0].question, /2\. still body/);
});

test("parseDecisions keeps a stray Recommendation ahead of any Question in the preamble", () => {
  const { items, preamble } = parseDecisions("- **Recommendation**: orphan\n\n- **Question**: q\n");
  assert.equal(items.length, 1);
  assert.equal(items[0].question, "q");
  assert.match(preamble, /orphan/);
});

test("parseDecisions ignores field lines inside a code fence", () => {
  const { items } = parseDecisions("- **Question**: q\n\n```md\n- **Question**: not an item\n```\n");
  assert.equal(items.length, 1);
});

test("anchorNorm strips links and emphasis and lowercases", () => {
  assert.equal(anchorNorm("**Bold** and [a link](http://x/) and `code`"), "bold and a link and code");
  assert.equal(anchorNorm("  Two   spaces  "), "two spaces");
});

test("anchorMatches needs 8 characters and a prefix, either way round", () => {
  assert.equal(anchorMatches("short", "shorter than eight"), false);
  assert.equal(anchorMatches("a longer anchor", "a longer anchor and more"), true);
  assert.equal(anchorMatches("a longer anchor and more", "a longer anchor"), true);
  assert.equal(anchorMatches("a longer anchor", "different text entirely"), false);
  assert.equal(anchorMatches("", "a longer anchor"), false);
});

test("excerptOf normalizes whitespace and cuts at 40 characters", () => {
  assert.equal(excerptOf("  a\n\nb  "), "a b");
  assert.equal(excerptOf("x".repeat(60)), "x".repeat(40));
});

test("escapeHtml escapes the four characters it names", () => {
  assert.equal(escapeHtml(`&<>"`), "&amp;&lt;&gt;&quot;");
  assert.equal(escapeHtml(""), "");
});

test("sectionOfBlockId reads the section out of either id form", () => {
  assert.equal(sectionOfBlockId("build-order::3"), "build-order");
  assert.equal(sectionOfBlockId("decision-2", "decisions"), "decisions");
  // A plan with no Decisions section leaves the caller's id empty.
  assert.equal(sectionOfBlockId("decision-2", ""), "");
  assert.equal(sectionOfBlockId("loose"), "");
});

test("emptyDiff is the pre-revise shape index.html holds until buildDiff replaces it", () => {
  const diff = emptyDiff();
  assert.equal(diff.active, false);
  assert.equal(diff.changedCount, 0);
  assert.equal(diff.removedCount, 0);
  for (const key of ["sectionStatus", "prevBlockTexts", "prevDecisionSigs"]) {
    assert.ok(diff[key] instanceof Map, `${key} is a Map`);
    assert.equal(diff[key].size, 0);
  }
});

// The rename sweep lists in both READMEs name SECTION_TYPES as the site a renamed
// plan heading has to reach. These two Sets are what a missed rename would break.
test("OPEN_TYPES and STEP_COLLAPSE_TYPES follow the SECTION_TYPES flags", () => {
  assert.deepEqual([...OPEN_TYPES].sort(), ["buildorder", "context", "decisions", "overview", "whyorder"]);
  assert.deepEqual([...STEP_COLLAPSE_TYPES], ["buildorder"]);
});

test("buildDiff classifies each current section against the previous plan", () => {
  const prev = "### Overview\n\nsame\n\n### Test plan\n\nold\n\n### Gone\n\nx\n";
  const { sections } = parseSections("### Overview\n\nsame\n\n### Test plan\n\nnew\n\n### Risks\n\nfresh\n");
  const diff = buildDiff(prev, sections, blocksByLine);

  assert.equal(diff.active, true);
  assert.equal(diff.sectionStatus.get("overview"), "unchanged");
  assert.equal(diff.sectionStatus.get("test-plan"), "changed");
  assert.equal(diff.sectionStatus.get("risks"), "new");
  assert.equal(diff.changedCount, 2);
  assert.equal(diff.removedCount, 1);
  assert.deepEqual(diff.prevBlockTexts.get("test-plan"), new Set(["old"]));
  assert.equal(diff.prevBlockTexts.has("overview"), false);
});

test("buildDiff sends a changed Decisions section to prevDecisionSigs, not prevBlockTexts", () => {
  const prev = "### Decisions\n\n- **Question**: q\n- **Recommendation**: old\n";
  const { sections } = parseSections("### Decisions\n\n- **Question**: q\n- **Recommendation**: new\n");
  const diff = buildDiff(prev, sections, blocksByLine);

  assert.equal(diff.sectionStatus.get("decisions"), "changed");
  assert.equal(diff.prevBlockTexts.has("decisions"), false);
  // The signature's own spelling is opaque — what matters is that the recorded
  // one is the previous item's, so the current item reads as changed.
  const sigs = diff.prevDecisionSigs.get("decisions");
  assert.equal(sigs.size, 1);
  assert.equal(sigs.has(decisionSig(parseDecisions(sections[0].body).items[0])), false);
});

// --- sectionGist: the one line a collapsed section shows beside its title ---

test("buildDecisionDigest gives one row per Decision, numbered as the cards are", () => {
  const { sections } = parseSections(
    "### Decisions\n\n- **Question**: どちらの `env` にするか\n- **Recommendation**: artifact だけに出す。理由はこう\n\n- **Question**: 2 問目\n- **Recommendation**: 2 つ目の答え\n");
  const digest = buildDecisionDigest(sections);
  // The row's number is what names the card it links to, through the shared id helper.
  assert.deepEqual(digest.items.map((it) => decisionBlockId(it.n)), ["decision-1", "decision-2"]);
  // stripped of markup and normalized, the way sectionGist leaves a section's first line
  assert.equal(digest.items[0].question, "どちらの env にするか");
  assert.equal(digest.items[0].recommendation, "artifact だけに出す。理由はこう");
});

test("buildDecisionDigest returns null when the plan has no Decisions section", () => {
  const { sections } = parseSections("### Overview\n\n- **Goal**: something\n");
  assert.equal(buildDecisionDigest(sections), null);
});

// A Decisions section whose body never resolves into cards renders as plain prose, and the
// digest has nothing to link to — the same disposition as having no section at all.
test("buildDecisionDigest returns null when card detection finds no items", () => {
  const { sections } = parseSections("### Decisions\n\nNo user decisions were required.\n");
  assert.equal(sections[0].type, "decisions");
  assert.equal(buildDecisionDigest(sections), null);
});

// sectionGist skips a line opening on `#`, `>`, or `<`, which would leave the row showing a
// bare number. excerptOf takes the line as it stands instead.
test("buildDecisionDigest falls back to a raw excerpt when the gist comes out empty", () => {
  const { sections } = parseSections(
    "### Decisions\n\n- **Question**: > quoted question\n- **Recommendation**: # heading-shaped answer\n");
  const [row] = buildDecisionDigest(sections).items;
  assert.equal(row.question, "> quoted question");
  assert.equal(row.recommendation, "# heading-shaped answer");
});

// The renderer numbers each decisions section's cards from 1 of its own, so a second section
// offers no unambiguous card for a row to link to. The digest covers the first alone.
test("buildDecisionDigest digests the first Decisions section only", () => {
  const { sections } = parseSections(
    "### Decisions\n\n- **Question**: first\n- **Recommendation**: a\n\n"
    + "### Decisions again\n\n- **Question**: second\n- **Recommendation**: b\n");
  assert.deepEqual(sections.map((s) => s.type), ["decisions", "decisions"]);
  assert.deepEqual(buildDecisionDigest(sections).items.map((it) => it.question), ["first"]);
});

test("sectionGist takes the first line of prose, list marker and markup stripped", () => {
  assert.equal(sectionGist("- **Goal**: `x` を作る\n- more"), "Goal: x を作る");
  assert.equal(sectionGist("1. **Step** — detail"), "Step — detail");
});

test("sectionGist skips headings, quotes, raw HTML, and anything inside a fence", () => {
  assert.equal(sectionGist("#### sub\n> quoted\n<figure>x</figure>\nreal prose"), "real prose");
  assert.equal(sectionGist("```\nnot prose\n```\nreal prose"), "real prose");
  assert.equal(sectionGist("```\nonly a fence\n```"), "");
  assert.equal(sectionGist(""), "");
});

test("sectionGist truncates with an ellipsis rather than wrapping the header", () => {
  const gist = sectionGist("あ".repeat(400));
  assert.equal(gist.length, 120);
  assert.ok(gist.endsWith("…"));
});

// --- splitPreamble: the Hero block gets its own slot, everything else stays prose ---

test("splitPreamble separates the Hero block from the rest of the preamble", () => {
  const { prose, hero } = splitPreamble("lead\n\n## Hero\n<figure>H</figure>\n\n## Other\nkept");
  assert.equal(hero, "<figure>H</figure>");
  assert.ok(prose.includes("lead") && prose.includes("kept"));
  assert.ok(!prose.includes("<figure>H</figure>"));
});

test("splitPreamble leaves hero empty when no such block exists, and ignores a fenced lookalike", () => {
  assert.equal(splitPreamble("just prose").hero, "");
  assert.equal(splitPreamble("just prose").prose, "just prose");
  // A "## Hero" inside a fence is code the plan is quoting, not a figures block.
  assert.equal(splitPreamble("```\n## Hero\nnot a hero\n```").hero, "");
});

// --- preparePlan: the one derivation both surfaces render from ---

test("preparePlan derives the overview, the risk count, and the badge's itemCount", () => {
  const model = preparePlan("### Overview\n- **Goal**: g\n- **Scope**: s\n\n### Risks\n- a\n- b\n- c\n", "slug-1");
  assert.equal(model.id, "slug-1");
  assert.equal(model.overview.goal, "g");
  assert.equal(model.overview.scope, "s");
  assert.equal(model.riskCount, 3);
  assert.equal(model.sections.find((x) => x.type === "risks").itemCount, 3);
});

test("preparePlan falls back to one section for a plan with no headings", () => {
  const model = preparePlan("no headings at all", "slug-2");
  assert.deepEqual(model.sections.map((x) => x.id), ["plan"]);
  assert.equal(model.sections[0].body, "no headings at all");
  assert.equal(model.riskCount, 0);
  // The fallback section already carries the whole document; leaving it in the preamble too
  // would draw every word twice.
  assert.equal(model.preamble, "");
});

test("splitPreamble keeps the first Hero block and drops a repeated one", () => {
  const { prose, hero } = splitPreamble("lead\n\n## Hero\nfirst\n\n## Hero\nsecond");
  assert.equal(hero, "first");
  // Skipped means dropped, not demoted to prose — a second hero rendered as preamble text
  // would put the same figure on the page twice.
  assert.ok(!prose.includes("second"), "the repeated block leaked into the preamble");
  assert.ok(prose.includes("lead"), "the leading prose was lost");
});

test("YAML frontmatter is dropped, so its bookkeeping reaches no rendering surface", () => {
  const md = "---\nartifact_url: https://claude.ai/code/artifact/abc\n---\n## Plan\n\n### Overview\n- **Goal**: g\n";
  const { preamble, sections, body } = parseSections(md);
  assert.ok(!preamble.includes("artifact_url"), "frontmatter leaked into the preamble");
  assert.ok(!body.includes("artifact_url"), "frontmatter leaked into the returned body");
  assert.deepEqual(sections.map((s) => s.title), ["Overview"]);
});

// The strip is start-anchored and non-greedy, so a plan opening on a thematic break must keep
// everything between it and the next one.
test("a leading thematic break is not mistaken for frontmatter", () => {
  const md = "---\n\n### Overview\n- **Goal**: g\n\n---\n\n### Test plan\n- t\n";
  const { sections } = parseSections(md);
  assert.deepEqual(sections.map((s) => s.title), ["Overview", "Test plan"]);
});
