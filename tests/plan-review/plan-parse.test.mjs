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
  buildDiff,
  classify,
  countListItems,
  decisionSig,
  emptyDiff,
  escapeHtml,
  excerptOf,
  fieldValue,
  parseDecisions,
  parseOverview,
  parseSections,
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

test("parseOverview picks up the three fields it names", () => {
  const ov = parseOverview("- **Goal**: g\n- **Difficulty**: Moderate\n- **Scope**: 3 files\n");
  assert.deepEqual(ov, { goal: "g", difficulty: "Moderate", scope: "3 files" });
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
