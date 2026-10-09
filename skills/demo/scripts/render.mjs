#!/usr/bin/env node
// Render the demo page from steps.json.
//
// Usage: node render.mjs --steps <steps.json> --out <index.html> [--lang ja|en]
// On a validation failure nothing is written, violations go to stderr one per line, exit 3.
//
// steps.json shape:
// { title, dek?, url?, video?,
//   features: [{ name, description?, at?, error_at? }],
//   steps: [{ n, feature, kind: "normal"|"error", path?, action, expected, result, data?, script?,
//             status: "ok"|"failed", note?, screenshot, at? }] }
// `feature` is the 1-based index into features; `at` / `error_at` are seconds from the start of the recording.
// Screenshots and the video are referenced by bare file name, next to the page.

import { readFileSync, writeFileSync } from "node:fs";

const args = parseArgs(process.argv.slice(2));
for (const k of ["steps", "out"]) if (!args[k]) { process.stderr.write(`--${k} is required\n`); process.exit(1); }
const lang = args.lang === "en" ? "en" : "ja";
let doc;
try { doc = JSON.parse(readFileSync(args.steps, "utf8")); } catch (err) { process.stderr.write(`steps.json cannot be read: ${err.message}\n`); process.exit(3); }

const L = {
  ja: { eyebrow: "デモ", steps: (n) => `${n} 手順`, failed: (n) => `失敗 ${n}`, video: "操作の録画", expected: "期待する結果", result: "結果", data: "前提データ", script: "投入スクリプト", ok: "確認済み", ng: "未確認", note: "メモ", feature: "機能", normal: "正常系", error: "異常系", none: "なし", openAll: "すべて開く", closeAll: "すべて閉じる", errorHead: (ok, ng) => `異常系 ${ok + ng} 件 — 確認済み ${ok} / 未確認 ${ng}` },
  en: { eyebrow: "Demo", steps: (n) => `${n} step${n === 1 ? "" : "s"}`, failed: (n) => `${n} failed`, video: "Recording", expected: "Expected", result: "Result", data: "Data", script: "Script", ok: "confirmed", ng: "not confirmed", note: "Note", feature: "Feature", normal: "Normal cases", error: "Error cases", none: "none", openAll: "Open all", closeAll: "Close all", errorHead: (ok, ng) => `Error cases ${ok + ng} — confirmed ${ok} / not confirmed ${ng}` },
}[lang];

const errors = validate(doc);
if (errors.length) { process.stderr.write(errors.join("\n") + "\n"); process.exit(3); }

const failed = doc.steps.filter((s) => s.status === "failed").length;
const groups = doc.features.map((f, i) => {
  const mine = doc.steps.filter((s) => s.feature === i + 1).sort((a, b) => a.n - b.n);
  const error = mine.filter((s) => s.kind === "error");
  const ok = mine.filter((s) => s.status === "ok").length;
  return { ...f, i, letter: letter(i), normal: mine.filter((s) => s.kind === "normal"), error, ok, failed: mine.length - ok, failedErrors: error.filter((s) => s.status === "failed").length };
});
const anyErrors = groups.some((g) => g.error.length);

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
.meta { color: var(--muted); font-size: .9rem; display: flex; gap: 16px; flex-wrap: wrap; margin: 0 0 16px; }
.meta a { color: var(--accent); word-break: break-all; }
.tablewrap { overflow-x: auto; margin: 0 0 12px; }
table.summary { width: 100%; border-collapse: collapse; font-size: .9rem; }
table.summary th { color: var(--muted); font-weight: 500; text-align: left; border-bottom: 1px solid var(--line); padding: 6px 8px; white-space: nowrap; }
table.summary td { border-bottom: 1px solid var(--line); padding: 6px 8px; }
table.summary a { color: var(--accent); text-decoration: none; }
a.at { color: var(--accent); text-decoration: none; font-family: "IBM Plex Mono", monospace; font-size: .85rem; white-space: nowrap; }
.tcontrols { display: flex; gap: 8px; margin: 0 0 24px; }
.tcontrols button { font: inherit; font-size: .85rem; color: var(--fg); background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 4px 10px; cursor: pointer; }
.video { margin: 0 0 32px; }
.video video { width: 100%; max-width: 880px; border: 1px solid var(--line); border-radius: 8px; background: #000; }
.video h2 { font-size: 1rem; margin: 0 0 8px; color: var(--muted); }
section.feature { margin: 0 0 40px; }
section.feature > h2 { font-size: 1.4rem; margin: 0 0 4px; display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.letter { color: var(--accent); font-family: "IBM Plex Mono", monospace; }
.desc { color: var(--muted); margin: 0 0 8px; }
section.feature h3 { font-size: 1rem; color: var(--muted); margin: 16px 0 8px; }
details.errors { margin: 16px 0 0; }
details.errors > summary { list-style: none; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 10px 16px; margin: 0 0 16px; cursor: pointer; display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; font-weight: 600; }
details.errors > summary::-webkit-details-marker { display: none; }
details.errors > summary::before { content: "▸"; color: var(--muted); }
details.errors[open] > summary::before { content: "▾"; }
section.step { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 20px 16px; margin: 0 0 20px; }
section.step h4 { font-size: 1.1rem; margin: 0 0 8px; display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
.n { color: var(--accent); font-family: "IBM Plex Mono", monospace; font-weight: 500; }
.path { color: var(--muted); font-family: "IBM Plex Mono", monospace; font-size: .85rem; margin: 0 0 8px; }
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
<p class="meta"><span>${esc(L.steps(doc.steps.length))}</span>${failed ? `<span>${esc(L.failed(failed))}</span>` : ""}${doc.url ? `<a href="${esc(doc.url)}">${esc(doc.url)}</a>` : ""}</p>
${summary()}
${anyErrors ? `<div class="tcontrols"><button type="button" data-all="1">${esc(L.openAll)}</button><button type="button" data-all="0">${esc(L.closeAll)}</button></div>` : ""}
${doc.video ? `<div class="video"><h2>${esc(L.video)}</h2><video id="video" controls src="${esc(doc.video)}"></video></div>` : ""}
${groups.map(renderFeature).join("\n")}
</main>
<script>
var video = document.getElementById('video');
document.querySelectorAll('a.at').forEach(function (a) {
  a.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    video.currentTime = Number(a.dataset.at);
    video.scrollIntoView({ block: 'start' });
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  });
});
document.querySelectorAll('button[data-all]').forEach(function (b) {
  b.addEventListener('click', function () {
    var open = b.dataset.all === '1';
    document.querySelectorAll('details.errors').forEach(function (d) { d.open = open; });
  });
});
</script>
</body>
</html>
`;

writeFileSync(args.out, html);
process.stdout.write(`${args.out}\n`);

function summary() {
  const rows = groups.map((g) => {
    return `<tr><td><a href="#feature-${g.i + 1}">${g.letter}. ${esc(g.name)}</a></td><td>${esc(L.steps(g.normal.length))}</td><td>${g.error.length ? esc(L.steps(g.error.length)) : esc(L.none)}</td><td>${g.ok} / ${g.failed}</td>${doc.video ? `<td>${chapter(g.at)}</td>` : ""}</tr>`;
  });
  return `<div class="tablewrap"><table class="summary"><thead><tr><th>${esc(L.feature)}</th><th>${esc(L.normal)}</th><th>${esc(L.error)}</th><th>${esc(L.ok)} / ${esc(L.ng)}</th>${doc.video ? "<th></th>" : ""}</tr></thead><tbody>
${rows.join("\n")}
</tbody></table></div>`;
}

function renderFeature(g) {
  return `<section class="feature" id="feature-${g.i + 1}">
<h2><span class="letter">${g.letter}.</span><span>${esc(g.name)}</span>${chapter(g.at)}</h2>
${g.description ? `<p class="desc">${esc(g.description)}</p>` : ""}
${g.normal.length ? `<h3>${esc(L.normal)}</h3>\n${g.normal.map(renderStep).join("\n")}` : ""}
${g.error.length ? `<details class="errors"${g.failedErrors ? " open" : ""}><summary><span>${esc(L.errorHead(g.error.length - g.failedErrors, g.failedErrors))}</span>${chapter(g.error_at)}</summary>
${g.error.map(renderStep).join("\n")}
</details>` : ""}
</section>`;
}

function renderStep(s) {
  const ok = s.status === "ok";
  return `<section class="step" id="step-${s.n}">
<h4><span class="n">${s.n}</span><span>${esc(s.action)}</span>${chapter(s.at)}<span class="badge ${ok ? "ok" : "ng"}">${esc(ok ? L.ok : L.ng)}</span></h4>
${s.path ? `<p class="path">${esc(s.path)}</p>` : ""}
<div class="row"><span class="k">${esc(L.expected)}</span><span>${esc(s.expected)}</span></div>
<div class="row"><span class="k">${esc(L.result)}</span><span>${esc(s.result)}</span></div>
${s.data ? `<div class="row"><span class="k">${esc(L.data)}</span><span>${esc(s.data)}</span></div>` : ""}
${s.script ? `<div class="row"><span class="k">${esc(L.script)}</span></div><pre>${esc(s.script)}</pre>` : ""}
${!ok && s.note ? `<p class="note">${esc(L.note)}: ${esc(s.note)}</p>` : ""}
<figure><img src="${esc(s.screenshot)}" alt="${esc(s.action)}" loading="lazy"></figure>
</section>`;
}

function chapter(at) {
  if (!doc.video || !Number.isInteger(at)) return "";
  return `<a class="at" href="#video" data-at="${at}">🎬 ${Math.floor(at / 60)}:${String(at % 60).padStart(2, "0")}</a>`;
}

function letter(i) {
  return i < 26 ? String.fromCharCode(65 + i) : `${letter(Math.floor(i / 26) - 1)}${letter(i % 26)}`;
}

function validate(d) {
  const e = [];
  if (!d || typeof d !== "object") return ["steps.json is not an object"];
  if (typeof d.title !== "string" || !d.title.trim()) e.push("title must be a non-empty string");
  for (const k of ["dek", "url", "video"]) if (d[k] != null && typeof d[k] !== "string") e.push(`${k} must be a string when present`);
  const seconds = (v) => v == null || (Number.isInteger(v) && v >= 0);
  if (!Array.isArray(d.features) || d.features.length === 0) e.push("features must be a non-empty array");
  else d.features.forEach((f, i) => {
    const at = `features[${i}]`;
    if (typeof f?.name !== "string" || !f.name.trim()) e.push(`${at}.name must be a non-empty string`);
    if (f?.description != null && typeof f.description !== "string") e.push(`${at}.description must be a string when present`);
    for (const k of ["at", "error_at"]) if (!seconds(f?.[k])) e.push(`${at}.${k} must be a non-negative integer when present`);
  });
  if (!Array.isArray(d.steps) || d.steps.length === 0) { e.push("steps must be a non-empty array"); return e; }
  const nFeatures = Array.isArray(d.features) ? d.features.length : 0;
  d.steps.forEach((s, i) => {
    const at = `steps[${i}]`;
    if (!Number.isInteger(s?.n)) e.push(`${at}.n must be an integer`);
    if (!Number.isInteger(s?.feature) || s.feature < 1 || s.feature > nFeatures) e.push(`${at}.feature must be an integer from 1 to ${nFeatures}`);
    if (s?.kind !== "normal" && s?.kind !== "error") e.push(`${at}.kind must be "normal" or "error"`);
    for (const k of ["action", "expected", "result", "screenshot"]) if (typeof s?.[k] !== "string" || !s[k].trim()) e.push(`${at}.${k} must be a non-empty string`);
    if (s?.status !== "ok" && s?.status !== "failed") e.push(`${at}.status must be "ok" or "failed"`);
    for (const k of ["path", "data", "script", "note"]) if (s?.[k] != null && typeof s[k] !== "string") e.push(`${at}.${k} must be a string when present`);
    if (!seconds(s?.at)) e.push(`${at}.at must be a non-negative integer when present`);
  });
  for (let i = 0; i < nFeatures; i++) if (!d.steps.some((s) => s?.feature === i + 1)) e.push(`features[${i}] has no step`);
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
