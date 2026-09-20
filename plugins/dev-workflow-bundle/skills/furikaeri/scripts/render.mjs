#!/usr/bin/env node
// Render the retrospective page from a digest (digest.mjs) and the analysis JSON the agent returned.
//
// Usage: node render.mjs --digest <digest.json> --analysis <analysis.json> --out <page.html> [--lang ja|en]
// Every number on the page is computed here from the digest: the analysis only names phases and
// findings by turn index. The analysis is validated first; on a violation nothing is written and
// the violations are printed one per line on stderr with exit 3, so the caller can hand them back
// to the agent for one more attempt.
//
// Analysis shape:
// { title, dek, eyebrow,
//   phases:   [{ name, from, to, group?, severity?: "crit"|"warn", note? }]   — contiguous, covering every turn
//   findings: [{ title, severity?: "crit", from, to, tags?: [string], body: [markdown], quote?: string }]
//   aside?:   { heading, paragraphs: [string] } }
// A quote must be a verbatim passage of a message inside the finding's turn range (whitespace-insensitive).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = parseArgs(process.argv.slice(2));
for (const k of ["digest", "analysis", "out"]) if (!args[k]) { process.stderr.write(`--${k} is required\n`); process.exit(1); }
const lang = args.lang === "en" ? "en" : "ja";
const digest = JSON.parse(readFileSync(args.digest, "utf8"));
const analysis = JSON.parse(readFileSync(args.analysis, "utf8"));
const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "page.css"), "utf8");

const L = {
  ja: { retro: "セッションふりかえり", target: "対象", turns: "人の発話", source: "出典", lines: "行", wall: "実時間", wallSub: "最初の発話から最後の応答まで、中断を除く", ai: "AI 稼働", human: "人の時間", humanSub: "読む・考える・打つ", whole: "全体の", longest: "最長フェーズ", phases: "フェーズ別の時間", legendAi: "AI が動いていた時間", legendHu: "人の時間（読む・考える・打つ）", total: "合計", turnUnit: "ターン", chartNote: "AI 稼働は人の送信から、次の発話までの間で AI が最後に応答した時刻までを積んだ値。残りが人の時間。バーは各フェーズの長さで描き、合計行だけは全体比。", breakNote: (d) => `中断 ${d}（集計から除外）`, breaks: (n) => `（中断 ${n} 回）`, findings: "発生していた問題 ／ 影響の大きい順", transcript: "やり取りの全文 ／ フェーズごと", openAll: "すべて開く", closeAll: "すべて閉じる", you: "人", ai_: "AI", declined: "（ツール実行を拒否）", answered: "（質問への回答）", footer: (n, a, id) => `${n} ターン ／ ${a} AI メッセージ ／ セッション ${id} ／ ツール呼び出しは名前のみ、結果は省略` },
  en: { retro: "Session retrospective", target: "Span", turns: "Human turns", source: "Source", lines: "lines", wall: "Wall time", wallSub: "first turn to last reply, breaks excluded", ai: "AI active", human: "Human time", humanSub: "reading, thinking, typing", whole: "of total", longest: "Longest phase", phases: "Time per phase", legendAi: "time the AI was working", legendHu: "the person's time (reading, thinking, typing)", total: "Total", turnUnit: "turns", chartNote: "AI active runs from the person's send to the AI's last reply before the next turn; the rest is the person's. Bars are scaled to the longest phase; only the total row shows shares of the whole.", breakNote: (d) => `break ${d} (excluded from totals)`, breaks: (n) => `(${n} break${n === 1 ? "" : "s"})`, findings: "What went wrong, by impact", transcript: "Full exchange, by phase", openAll: "Open all", closeAll: "Close all", you: "Person", ai_: "AI", declined: "(declined a tool call)", answered: "(answered a question)", footer: (n, a, id) => `${n} turns / ${a} AI messages / session ${id} / tool calls by name only, results omitted` },
}[lang];

const turns = digest.turns;
const N = turns.length;
const errors = validate(analysis, turns);
if (errors.length) { process.stderr.write(errors.join("\n") + "\n"); process.exit(3); }

const phases = analysis.phases.map((p) => {
  const ts = turns.slice(p.from - 1, p.to);
  const ai = sum(ts, "ai_ms"), hu = sum(ts, "human_ms"), span = sum(ts, "span_ms");
  const breakAfter = ts.at(-1).break ? breakMs(p.to) : 0;
  return { ...p, ts, ai, hu, span, breakAfter, start: ts[0].t };
});
const maxSpan = Math.max(...phases.map((p) => p.span), 1);
const tot = digest.totals;
const longest = phases.reduce((a, b) => (b.span > a.span ? b : a));
const breakCount = turns.filter((t) => t.break).length;
const assistantCount = turns.reduce((n, t) => n + t.messages.filter((m) => m.role === "assistant").length, 0);

const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(analysis.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
${css}
</style>
</head>
<body>
<div class="wrap">
<header>
  <div class="eyebrow">${esc(L.retro)} ／ ${esc(analysis.eyebrow)}</div>
  <h1>${esc(analysis.title)}</h1>
  <p class="dek">${esc(analysis.dek)}</p>
  <div class="meta">
    <span>${L.target} <b>${stampFull(turns[0].t)} → ${stampFull(lastReply())} UTC</b>${breakCount ? esc(L.breaks(breakCount)) : ""}</span>
    <span>${L.turns} <b>${N} ${L.turnUnit}</b></span>
    <span>${L.source} <b>${esc(digest.session.id.slice(0, 8))} session jsonl（${digest.session.lines.toLocaleString()} ${L.lines}）</b></span>
  </div>
</header>

<div class="stats">
  <div class="stat"><div class="k">${L.wall}</div><div class="v">${fmt(tot.wall_ms)}</div><div class="s">${L.wallSub}</div></div>
  <div class="stat ai"><div class="k">${L.ai}</div><div class="v">${fmt(tot.ai_ms)}</div><div class="s">${L.whole} ${pct(tot.ai_ms, tot.wall_ms)}</div></div>
  <div class="stat hu"><div class="k">${L.human}</div><div class="v">${fmt(tot.human_ms)}</div><div class="s">${L.humanSub}</div></div>
  <div class="stat"><div class="k">${L.longest}</div><div class="v">${fmt(longest.span)}</div><div class="s">${esc(longest.name)} ／ ${L.whole} ${pct(longest.span, tot.wall_ms)}</div></div>
</div>

<section>
  <h2 class="sec">${L.phases}</h2>
  <div class="legend"><span><i style="background:var(--ai)"></i>${L.legendAi}</span><span><i style="background:var(--hu-soft);border:1px solid var(--hu)"></i>${L.legendHu}</span></div>
  <div class="chart">
${chart()}
    <div class="total"><div class="rt"></div><div class="rn">${L.total}</div><div class="rb"><span class="seg ai" style="width:${w(tot.ai_ms, tot.wall_ms)}"></span><span class="seg hu" style="width:${w(tot.human_ms, tot.wall_ms)}"></span></div><div class="rd">${fmt(tot.wall_ms)}</div></div>
  </div>
  <p style="font-size:12.5px;color:var(--muted);margin-top:14px;max-width:66ch">${L.chartNote}</p>
</section>

<section>
  <h2 class="sec">${L.findings}</h2>
${analysis.findings.map(finding).join("\n")}
</section>
${analysis.aside ? aside(analysis.aside) : ""}
<section>
  <h2 class="sec">${L.transcript}</h2>
  <div class="tcontrols"><button type="button" data-all="1">${L.openAll}</button><button type="button" data-all="0">${L.closeAll}</button></div>
${phases.map(phaseDetails).join("\n")}
</section>

<footer>${esc(L.footer(N, assistantCount, digest.session.id))}</footer>
</div>
<script>
document.querySelectorAll('button[data-all]').forEach(function(b){
  b.addEventListener('click',function(){
    var open=b.dataset.all==='1';
    document.querySelectorAll('details.ph').forEach(function(d){d.open=open});
  });
});
</script>
</body>
</html>
`;
writeFileSync(args.out, html);
process.stdout.write(`${args.out}\n`);

// ---- sections

function chart() {
  const out = [];
  let i = 0;
  while (i < phases.length) {
    const p = phases[i];
    if (p.group) {
      let j = i;
      while (j < phases.length && phases[j].group === p.group) j++;
      const grp = phases.slice(i, j);
      const gAi = grp.reduce((n, x) => n + x.ai, 0), gHu = grp.reduce((n, x) => n + x.hu, 0), gSpan = grp.reduce((n, x) => n + x.span, 0);
      out.push(`<div class="grp"><span class="gname">${esc(p.group)}</span><span class="gnum">${fmt(gSpan)} — ${L.whole} ${pct(gSpan, tot.wall_ms)}　${L.ai_} ${fmt(gAi)} / ${L.you} ${fmt(gHu)}</span></div>`);
      for (const x of grp) out.push(row(x, true));
      i = j;
    } else { out.push(row(p, false)); i++; }
  }
  return out.join("\n");
}
function row(p, child) {
  const cls = ["row", child ? "child" : "", p.severity ? `sev-${p.severity}` : ""].filter(Boolean).join(" ");
  const note = p.note ? `<em>${esc(p.note)}</em>` : "";
  const r = `<div class="${cls}">
  <div class="rt">${hm(p.start)}</div>
  <div class="rn">${esc(p.name)}${note}</div>
  <div class="rb"><span class="seg ai" style="width:${w(p.ai, maxSpan)}"></span><span class="seg hu" style="width:${w(p.hu, maxSpan)}"></span></div>
  <div class="rd">${fmt(p.span)}</div>
</div>`;
  return p.breakAfter ? r + `\n<div class="brk">${esc(L.breakNote(fmt(p.breakAfter)))}</div>` : r;
}
function finding(f, idx) {
  const ts = turns.slice(f.from - 1, f.to);
  const span = sum(ts, "span_ms");
  const range = f.from === f.to ? hm(ts[0].t) : `${hm(ts[0].t)} → ${hm(ts.at(-1).t)}`;
  const meta = [range, fmt(span), `${ts.length} ${L.turnUnit}`, ...(f.tags ?? [])].map((x) => `<span>${esc(x)}</span>`).join("");
  const body = f.body.map((p) => `<p>${inline(p)}</p>`).join("\n    ");
  const quote = f.quote ? `\n    <blockquote><p>${esc(f.quote)}</p></blockquote>` : "";
  return `  <div class="find${f.severity === "crit" ? " crit" : ""}">
    <div class="fh"><div class="fn">${idx + 1}</div><div><h3 class="ft">${inline(f.title)}</h3>
    <div class="fmeta">${meta}</div></div></div>
    <div class="fb">${body}</div>${quote}
  </div>`;
}
function aside(a) {
  return `<section>
  <h2 class="sec">${esc(a.heading)}</h2>
  <div class="note">
    ${a.paragraphs.map((p) => `<p>${inline(p)}</p>`).join("\n    ")}
  </div>
</section>`;
}
function phaseDetails(p) {
  const msgs = [];
  for (const t of p.ts) {
    const tag = t.kind === "prompt" ? "" : ` <span style="color:var(--faint)">${t.kind === "decline" ? L.declined : L.answered}</span>`;
    msgs.push(`<div class="msg u"><div class="who"><span class="tag tag-u">${L.you}</span><time>${stampFull(t.t)}</time>${tag}</div><div class="body">${md(t.text)}</div></div>`);
    for (const m of t.messages) {
      if (m.role === "tools") msgs.push(`<div class="toolrun">${Object.entries(m.items).map(([k, v]) => `<span class="tool">${esc(k)}${v > 1 ? `<b>×${v}</b>` : ""}</span>`).join("")}</div>`);
      else msgs.push(`<div class="msg a"><div class="who"><span class="tag tag-a">${L.ai_}</span><time>${hm(m.t)}</time></div><div class="body">${md(m.text)}</div></div>`);
    }
  }
  return `<details class="ph">
  <summary><span class="ps">${hm(p.start)}</span><span class="pn">${esc(p.name)}</span><span class="pd">${fmt(p.span)}</span><span class="pc">${p.ts.length} ${L.turnUnit}</span></summary>
  <div class="phbody">${msgs.join("\n")}</div>
</details>`;
}

// ---- validation

function validate(a, turns) {
  const e = [];
  const n = turns.length;
  const str = (v) => typeof v === "string" && v.trim();
  if (!str(a.title)) e.push("title: non-empty string required");
  if (!str(a.dek)) e.push("dek: non-empty string required");
  if (!str(a.eyebrow)) e.push("eyebrow: non-empty string required");
  if (!Array.isArray(a.phases) || !a.phases.length) { e.push("phases: non-empty array required"); return e; }
  let expect = 1;
  a.phases.forEach((p, i) => {
    if (!str(p.name)) e.push(`phases[${i}].name: non-empty string required`);
    if (!Number.isInteger(p.from) || !Number.isInteger(p.to)) e.push(`phases[${i}]: from/to must be integers`);
    else {
      if (p.from !== expect) e.push(`phases[${i}].from is ${p.from}; expected ${expect} (phases must be contiguous and cover every turn 1..${n})`);
      if (p.to < p.from) e.push(`phases[${i}]: to (${p.to}) < from (${p.from})`);
      expect = p.to + 1;
    }
    if (p.severity != null && !["crit", "warn"].includes(p.severity)) e.push(`phases[${i}].severity: "crit" | "warn" | null`);
    if (p.group != null && typeof p.group !== "string") e.push(`phases[${i}].group: string | null`);
    if (p.note != null && typeof p.note !== "string") e.push(`phases[${i}].note: string | null`);
  });
  if (expect !== n + 1) e.push(`phases end at turn ${expect - 1}; the log has ${n} turns — cover every turn`);
  if (!Array.isArray(a.findings)) { e.push("findings: array required"); return e; }
  a.findings.forEach((f, i) => {
    if (!str(f.title)) e.push(`findings[${i}].title: non-empty string required`);
    if (f.severity != null && f.severity !== "crit") e.push(`findings[${i}].severity: "crit" | null`);
    if (!Number.isInteger(f.from) || !Number.isInteger(f.to) || f.from < 1 || f.to > n || f.to < f.from) e.push(`findings[${i}]: from/to must be integers within 1..${n}, from <= to`);
    if (!Array.isArray(f.body) || !f.body.length || !f.body.every(str)) e.push(`findings[${i}].body: non-empty array of strings required`);
    if (f.tags != null && (!Array.isArray(f.tags) || !f.tags.every(str))) e.push(`findings[${i}].tags: array of strings`);
    if (f.quote != null) {
      if (!str(f.quote)) e.push(`findings[${i}].quote: string | null`);
      else if (Number.isInteger(f.from) && Number.isInteger(f.to)) {
        const hay = norm(turns.slice(Math.max(f.from, 1) - 1, Math.min(f.to, n)).flatMap((t) => [t.text, ...t.messages.filter((m) => m.role === "assistant").map((m) => m.text)]).join("\n"));
        if (!hay.includes(norm(f.quote))) e.push(`findings[${i}].quote is not a verbatim passage of turns ${f.from}..${f.to}; copy the words exactly or set quote to null`);
      }
    }
  });
  if (a.aside != null) {
    if (!str(a.aside.heading) || !Array.isArray(a.aside.paragraphs) || !a.aside.paragraphs.every(str)) e.push("aside: { heading: string, paragraphs: string[] } | null");
  }
  return e;
}
function norm(s) { return String(s).replace(/\s+/g, ""); }

// ---- markdown subset → HTML (escaped first; tool results never pass through here)

function md(src) {
  const lines = src.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }
    if (!line.trim()) { i++; continue; }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push("<p>---</p>"); i++; continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { out.push(`<h${Math.min(h[1].length + 2, 6)} class="mh">${inline(h[2])}</h${Math.min(h[1].length + 2, 6)}>`); i++; continue; }
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(`<div class="tw"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push(`<blockquote>${md(buf.join("\n"))}</blockquote>`);
      continue;
    }
    const li = line.match(/^\s*([-*+]|\d+[.)])\s+/);
    if (li) {
      const ordered = /\d/.test(li[1]);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*([-*+]|\d+[.)])\s+(.*)$/);
        if (m && /\d/.test(m[1]) === ordered) { items.push(m[2]); i++; }
        else if (items.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) { items[items.length - 1] += " " + lines[i].trim(); i++; }
        else break;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</${tag}>`);
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,6}\s|\s*>|\s*([-*+]|\d+[.)])\s+|\|)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${buf.map(inline).join("<br>")}</p>`);
  }
  return out.join("\n");
}
function cells(line) { return line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()); }
function inline(s) {
  let t = esc(s);
  t = t.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => (/^https?:\/\//.test(href) ? `<a class="lnk" href="${href}" rel="noopener">${label}</a>` : `<span class="lnk">${label}</span>`));
  return t;
}
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

// ---- helpers

function sum(ts, k) { return ts.reduce((n, t) => n + t[k], 0); }
function breakMs(turnIndex) { const t = turns[turnIndex - 1], next = turns[turnIndex]; return next ? next.t - (t.t + t.ai_ms) : 0; }
function lastReply() { const last = turns.at(-1); return last.t + last.ai_ms; }
function w(part, whole) { return `${whole ? ((part / whole) * 100).toFixed(2) : 0}%`; }
function pct(part, whole) { return `${whole ? Math.round((part / whole) * 100) : 0}%`; }
function fmt(ms) {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : m ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
}
function hm(ms) { return new Date(ms).toISOString().slice(11, 16); }
function stampFull(ms) { return new Date(ms).toISOString().slice(0, 16).replace("T", " "); }
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) out[a.slice(2)] = argv[i + 1] != null && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return out;
}
