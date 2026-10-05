#!/usr/bin/env node
// Render the demo page from steps.json.
//
// Usage: node render.mjs --steps <steps.json> --out <index.html> [--lang ja|en]
// On a validation failure nothing is written, violations go to stderr one per line, exit 3.
//
// steps.json shape:
// { title, dek?, url?, video?,
//   steps: [{ n, path?, action, expected, data?, script?, status: "ok"|"failed", note?, screenshot }] }
// Screenshots and the video are referenced by bare file name, next to the page.

import { readFileSync, writeFileSync } from "node:fs";

const args = parseArgs(process.argv.slice(2));
for (const k of ["steps", "out"]) if (!args[k]) { process.stderr.write(`--${k} is required\n`); process.exit(1); }
const lang = args.lang === "en" ? "en" : "ja";
let doc;
try { doc = JSON.parse(readFileSync(args.steps, "utf8")); } catch (err) { process.stderr.write(`steps.json cannot be read: ${err.message}\n`); process.exit(3); }

const L = {
  ja: { eyebrow: "デモ", steps: (n) => `${n} 手順`, failed: (n) => `失敗 ${n}`, video: "操作の録画", step: "手順", expected: "期待する結果", data: "前提データ", script: "投入スクリプト", ok: "確認済み", ng: "未確認", note: "メモ", open: "開く" },
  en: { eyebrow: "Demo", steps: (n) => `${n} step${n === 1 ? "" : "s"}`, failed: (n) => `${n} failed`, video: "Recording", step: "Step", expected: "Expected", data: "Data", script: "Script", ok: "confirmed", ng: "not confirmed", note: "Note", open: "open" },
}[lang];

const errors = validate(doc);
if (errors.length) { process.stderr.write(errors.join("\n") + "\n"); process.exit(3); }

const failed = doc.steps.filter((s) => s.status === "failed").length;

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
.video { margin: 0 0 32px; }
.video video { width: 100%; max-width: 880px; border: 1px solid var(--line); border-radius: 8px; background: #000; }
.video h2 { font-size: 1rem; margin: 0 0 8px; color: var(--muted); }
section.step { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 20px 16px; margin: 0 0 20px; }
section.step h2 { font-size: 1.15rem; margin: 0 0 8px; display: flex; gap: 12px; align-items: baseline; }
.n { color: var(--accent); font-family: "IBM Plex Mono", monospace; font-weight: 500; }
.path { color: var(--muted); font-family: "IBM Plex Mono", monospace; font-size: .85rem; margin: 0 0 8px; }
.row { display: flex; gap: 8px; margin: 4px 0; }
.row .k { color: var(--muted); min-width: 7em; font-size: .9rem; }
.badge { display: inline-block; font-size: .78rem; padding: 2px 8px; border-radius: 999px; border: 1px solid; margin-left: auto; white-space: nowrap; }
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
${doc.video ? `<div class="video"><h2>${esc(L.video)}</h2><video controls src="${esc(doc.video)}"></video></div>` : ""}
${doc.steps.map(renderStep).join("\n")}
</main>
</body>
</html>
`;

writeFileSync(args.out, html);
process.stdout.write(`${args.out}\n`);

function renderStep(s) {
  const ok = s.status === "ok";
  return `<section class="step" id="step-${s.n}">
<h2><span class="n">${s.n}</span><span>${esc(s.action)}</span><span class="badge ${ok ? "ok" : "ng"}">${esc(ok ? L.ok : L.ng)}</span></h2>
${s.path ? `<p class="path">${esc(s.path)}</p>` : ""}
<div class="row"><span class="k">${esc(L.expected)}</span><span>${esc(s.expected)}</span></div>
${s.data ? `<div class="row"><span class="k">${esc(L.data)}</span><span>${esc(s.data)}</span></div>` : ""}
${s.script ? `<div class="row"><span class="k">${esc(L.script)}</span></div><pre>${esc(s.script)}</pre>` : ""}
${!ok && s.note ? `<p class="note">${esc(L.note)}: ${esc(s.note)}</p>` : ""}
<figure><img src="${esc(s.screenshot)}" alt="${esc(s.action)}" loading="lazy"></figure>
</section>`;
}

function validate(d) {
  const e = [];
  if (!d || typeof d !== "object") return ["steps.json is not an object"];
  if (typeof d.title !== "string" || !d.title.trim()) e.push("title must be a non-empty string");
  for (const k of ["dek", "url", "video"]) if (d[k] != null && typeof d[k] !== "string") e.push(`${k} must be a string when present`);
  if (!Array.isArray(d.steps) || d.steps.length === 0) { e.push("steps must be a non-empty array"); return e; }
  d.steps.forEach((s, i) => {
    const at = `steps[${i}]`;
    if (!Number.isInteger(s?.n)) e.push(`${at}.n must be an integer`);
    for (const k of ["action", "expected", "screenshot"]) if (typeof s?.[k] !== "string" || !s[k].trim()) e.push(`${at}.${k} must be a non-empty string`);
    if (s?.status !== "ok" && s?.status !== "failed") e.push(`${at}.status must be "ok" or "failed"`);
    for (const k of ["path", "data", "script", "note"]) if (s?.[k] != null && typeof s[k] !== "string") e.push(`${at}.${k} must be a string when present`);
  });
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
