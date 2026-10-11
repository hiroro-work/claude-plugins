#!/usr/bin/env node
// Render the demo page from steps.json.
//
// Usage: node render.mjs --steps <steps.json> --out <index.html> [--lang ja|en]
// On a validation failure nothing is written, violations go to stderr one per line, exit 3.
//
// steps.json shape:
// { title, dek?, url?,
//   features: [{ letter, name, description? }],
//   cases: [{ id, feature, kind: "normal"|"error", title, precondition?, video? }],
//   steps: [{ n, case, path?, action, expected, result, data?, script?, status: "ok"|"failed", note?, screenshot }] }
// `feature` is a 1-based position; a case's `id` starts with its feature's `letter` and a hyphen; a step's
// `case` is its case's `id`. Screenshots and videos are referenced by
// bare file name, next to the page.

import { readFileSync, writeFileSync } from "node:fs";

const args = parseArgs(process.argv.slice(2));
for (const k of ["steps", "out"]) if (!args[k]) { process.stderr.write(`--${k} is required\n`); process.exit(1); }
const lang = args.lang === "en" ? "en" : "ja";
let doc;
try { doc = JSON.parse(readFileSync(args.steps, "utf8")); } catch (err) { process.stderr.write(`steps.json cannot be read: ${err.message}\n`); process.exit(3); }

const L = {
  ja: { eyebrow: "デモ", cases: (n) => `${n} テスト項目`, notConfirmed: (n) => `未確認 ${n}`, toc: "目次", precondition: "前提", expected: "期待する結果", result: "結果", data: "前提データ", script: "投入スクリプト", ok: "確認済み", ng: "未確認", note: "メモ", normal: "正常系", error: "異常系" },
  en: { eyebrow: "Demo", cases: (n) => `${n} test case${n === 1 ? "" : "s"}`, notConfirmed: (n) => `${n} not confirmed`, toc: "Contents", precondition: "Precondition", expected: "Expected", result: "Result", data: "Data", script: "Script", ok: "confirmed", ng: "not confirmed", note: "Note", normal: "Normal case", error: "Error case" },
}[lang];

const errors = validate(doc);
if (errors.length) { process.stderr.write(errors.join("\n") + "\n"); process.exit(3); }

const cases = doc.cases.map((c) => {
  const steps = doc.steps.filter((s) => s.case === c.id).sort((a, b) => a.n - b.n);
  return { ...c, steps, ok: steps.every((s) => s.status === "ok") };
});
const features = doc.features.map((f, i) => ({ ...f, cases: cases.filter((c) => c.feature === i + 1) }));
const initiallyOpen = features[0].cases.find((c) => c.kind === "normal");
const notConfirmed = cases.filter((c) => !c.ok).length;

const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(doc.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root { --bg: #fbfaf7; --fg: #1f1d1a; --muted: #6b665e; --line: #e3dfd6; --card: #ffffff; --accent: #2d5f8a; --ok: #2b7a4b; --ng: #b23b3b; --ng-bg: #fbe9e9; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #17161a; --fg: #ece9e3; --muted: #a39d93; --line: #2f2d33; --card: #201f24; --accent: #7fb0dc; --ok: #6cc08a; --ng: #ea8a8a; --ng-bg: #3a2325; } }
:root[data-theme="dark"] { --bg: #17161a; --fg: #ece9e3; --muted: #a39d93; --line: #2f2d33; --card: #201f24; --accent: #7fb0dc; --ok: #6cc08a; --ng: #ea8a8a; --ng-bg: #3a2325; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font-family: "IBM Plex Sans JP", system-ui, sans-serif; line-height: 1.6; }
main { max-width: 880px; margin: 0 auto; padding: 32px 16px 64px; }
.eyebrow { color: var(--accent); font-weight: 600; letter-spacing: .08em; text-transform: uppercase; font-size: .8rem; }
h1 { font-size: 1.8rem; margin: 4px 0 8px; }
.dek { color: var(--muted); margin: 0 0 8px; }
.meta { color: var(--muted); font-size: .9rem; display: flex; gap: 16px; flex-wrap: wrap; margin: 0 0 24px; }
.meta a { color: var(--accent); word-break: break-all; }
nav.toc { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin: 0 0 32px; }
nav.toc h2 { font-size: .9rem; color: var(--muted); margin: 0 0 8px; }
nav.toc h3 { font-size: 1rem; margin: 12px 0 4px; }
nav.toc ol { list-style: none; margin: 0; padding: 0; }
nav.toc li { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; padding: 4px 0; border-top: 1px solid var(--line); }
nav.toc li:first-child { border-top: 0; }
nav.toc a { text-decoration: none; }
.letter, .case-id, nav.toc a { color: var(--accent); font-family: "IBM Plex Mono", monospace; }
.kind { font-size: .78rem; color: var(--muted); white-space: nowrap; }
section.feature { margin: 0 0 40px; }
section.feature > h2 { font-size: 1.4rem; margin: 0 0 4px; display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.desc { color: var(--muted); margin: 0 0 12px; }
details.case { background: var(--card); border: 1px solid var(--line); border-radius: 12px; margin: 0 0 16px; }
details.case > summary { list-style: none; padding: 12px 16px; cursor: pointer; display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; font-weight: 600; }
details.case > summary::-webkit-details-marker { display: none; }
details.case > summary::before { content: "▸"; color: var(--muted); }
details.case[open] > summary::before { content: "▾"; }
.case-body { padding: 0 16px 16px; }
.precondition { color: var(--muted); font-size: .9rem; margin: 0 0 12px; }
.case-body video { width: 100%; border: 1px solid var(--line); border-radius: 8px; background: #000; margin: 0 0 16px; }
ol.steps { list-style: none; margin: 0; padding: 0; }
li.step { border-top: 1px solid var(--line); padding: 16px 0 0; margin: 16px 0 0; }
li.step h4 { font-size: 1.05rem; margin: 0 0 8px; display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
.n { color: var(--accent); font-family: "IBM Plex Mono", monospace; font-weight: 500; }
.path { color: var(--muted); font-family: "IBM Plex Mono", monospace; font-size: .85rem; margin: 0 0 8px; word-break: break-all; }
.row { display: flex; gap: 8px; margin: 4px 0; }
.row .k { color: var(--muted); min-width: 7em; flex-shrink: 0; font-size: .9rem; }
.badge { display: inline-block; font-size: .78rem; padding: 2px 8px; border-radius: 999px; border: 1px solid; margin-left: auto; white-space: nowrap; font-weight: 400; }
.badge.ok { color: var(--ok); border-color: var(--ok); }
.badge.ng { color: var(--ng); border-color: var(--ng); background: var(--ng-bg); }
.note { color: var(--ng); margin: 6px 0 0; }
pre { background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; overflow-x: auto; font-family: "IBM Plex Mono", monospace; font-size: .85rem; }
figure { margin: 12px 0 0; }
figure img { width: 100%; height: auto; border: 1px solid var(--line); border-radius: 8px; display: block; }
</style>
</head>
<body>
<main>
<div class="eyebrow">${esc(L.eyebrow)}</div>
<h1>${esc(doc.title)}</h1>
${doc.dek ? `<p class="dek">${esc(doc.dek)}</p>` : ""}
<p class="meta"><span>${esc(L.cases(cases.length))}</span>${notConfirmed ? `<span>${esc(L.notConfirmed(notConfirmed))}</span>` : ""}${doc.url ? `<a href="${esc(doc.url)}">${esc(doc.url)}</a>` : ""}</p>
${toc()}
${features.map(renderFeature).join("\n")}
</main>
<script>
function openCase(hash) {
  var target = hash && document.getElementById(hash.slice(1));
  if (!target || target.tagName !== 'DETAILS') return;
  target.open = true;
  target.scrollIntoView({ block: 'start' });
}
document.querySelectorAll('a[href^="#case-"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    e.preventDefault();
    history.replaceState(null, '', a.getAttribute('href'));
    openCase(a.getAttribute('href'));
  });
});
window.addEventListener('hashchange', function () { openCase(location.hash); });
openCase(location.hash);
</script>
</body>
</html>
`;

writeFileSync(args.out, html);
process.stdout.write(`${args.out}\n`);

function toc() {
  return `<nav class="toc"><h2>${esc(L.toc)}</h2>
${features.map((f) => `<h3><span class="letter">${esc(f.letter)}.</span> ${esc(f.name)}</h3>
<ol>
${f.cases.map((c) => `<li><a href="#case-${esc(c.id)}">${esc(c.id)}</a>${caseLine(c)}</li>`).join("\n")}
</ol>`).join("\n")}
</nav>`;
}

function renderFeature(f) {
  return `<section class="feature">
<h2><span class="letter">${esc(f.letter)}.</span><span>${esc(f.name)}</span></h2>
${f.description ? `<p class="desc">${esc(f.description)}</p>` : ""}
${f.cases.map(renderCase).join("\n")}
</section>`;
}

function renderCase(c) {
  return `<details class="case" id="case-${esc(c.id)}"${c === initiallyOpen ? " open" : ""}>
<summary><span class="case-id">${esc(c.id)}</span>${caseLine(c)}</summary>
<div class="case-body">
${c.precondition ? `<p class="precondition">${esc(L.precondition)}: ${esc(c.precondition)}</p>` : ""}
${c.video ? `<video controls preload="metadata" src="${esc(c.video)}"></video>` : ""}
<ol class="steps">
${c.steps.map(renderStep).join("\n")}
</ol>
</div>
</details>`;
}

function renderStep(s, i) {
  const ok = s.status === "ok";
  return `<li class="step" id="step-${s.n}">
<h4><span class="n">${i + 1}</span><span>${esc(s.action)}</span>${badge(ok)}</h4>
${s.path ? `<p class="path">${esc(s.path)}</p>` : ""}
<div class="row"><span class="k">${esc(L.expected)}</span><span>${esc(s.expected)}</span></div>
<div class="row"><span class="k">${esc(L.result)}</span><span>${esc(s.result)}</span></div>
${s.data ? `<div class="row"><span class="k">${esc(L.data)}</span><span>${esc(s.data)}</span></div>` : ""}
${s.script ? `<div class="row"><span class="k">${esc(L.script)}</span></div><pre>${esc(s.script)}</pre>` : ""}
${!ok && s.note ? `<p class="note">${esc(L.note)}: ${esc(s.note)}</p>` : ""}
<figure><img src="${esc(s.screenshot)}" alt="${esc(s.action)}" loading="lazy"></figure>
</li>`;
}

function caseLine(c) {
  return `<span class="kind">${esc(L[c.kind])}</span><span>${esc(c.title)}</span>${badge(c.ok)}`;
}

function badge(ok) {
  return `<span class="badge ${ok ? "ok" : "ng"}">${esc(ok ? L.ok : L.ng)}</span>`;
}

function validate(d) {
  const e = [];
  if (!d || typeof d !== "object") return ["steps.json is not an object"];
  const nonEmpty = (v) => typeof v === "string" && v.trim();
  const optString = (o, keys, at) => { for (const k of keys) if (o?.[k] != null && typeof o[k] !== "string") e.push(`${at}${k} must be a string when present`); };
  if (!nonEmpty(d.title)) e.push("title must be a non-empty string");
  optString(d, ["dek", "url"], "");
  if (!Array.isArray(d.features) || d.features.length === 0) { e.push("features must be a non-empty array"); return e; }
  d.features.forEach((f, i) => {
    for (const k of ["letter", "name"]) if (!nonEmpty(f?.[k])) e.push(`features[${i}].${k} must be a non-empty string`);
    optString(f, ["description"], `features[${i}].`);
  });
  if (!Array.isArray(d.cases) || d.cases.length === 0) { e.push("cases must be a non-empty array"); return e; }
  const ids = new Set();
  d.cases.forEach((c, i) => {
    const at = `cases[${i}]`;
    if (!nonEmpty(c?.id)) e.push(`${at}.id must be a non-empty string`);
    else if (ids.has(c.id)) e.push(`${at}.id "${c.id}" is used twice`);
    else ids.add(c.id);
    if (!(Number.isInteger(c?.feature) && c.feature >= 1 && c.feature <= d.features.length)) e.push(`${at}.feature must be an integer from 1 to ${d.features.length}`);
    else if (nonEmpty(c?.id) && nonEmpty(d.features[c.feature - 1]?.letter) && !c.id.startsWith(`${d.features[c.feature - 1].letter}-`)) e.push(`${at}.id must start with "${d.features[c.feature - 1].letter}-"`);
    if (c?.kind !== "normal" && c?.kind !== "error") e.push(`${at}.kind must be "normal" or "error"`);
    if (!nonEmpty(c?.title)) e.push(`${at}.title must be a non-empty string`);
    optString(c, ["precondition", "video"], `${at}.`);
  });
  if (!Array.isArray(d.steps) || d.steps.length === 0) { e.push("steps must be a non-empty array"); return e; }
  d.steps.forEach((s, i) => {
    const at = `steps[${i}]`;
    if (!Number.isInteger(s?.n)) e.push(`${at}.n must be an integer`);
    if (!ids.has(s?.case)) e.push(`${at}.case must be the id of a case`);
    for (const k of ["action", "expected", "result", "screenshot"]) if (!nonEmpty(s?.[k])) e.push(`${at}.${k} must be a non-empty string`);
    if (s?.status !== "ok" && s?.status !== "failed") e.push(`${at}.status must be "ok" or "failed"`);
    optString(s, ["path", "data", "script", "note"], `${at}.`);
  });
  d.features.forEach((_, i) => { if (!d.cases.some((c) => c?.feature === i + 1)) e.push(`features[${i}] has no case`); });
  d.cases.forEach((c, i) => { if (!d.steps.some((s) => s?.case === c?.id)) e.push(`cases[${i}] has no step`); });
  return e;
}

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) out[a.slice(2)] = argv[i + 1] != null && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return out;
}
