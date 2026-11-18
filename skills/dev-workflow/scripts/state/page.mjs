#!/usr/bin/env node
// Builds the state artifact's page from the decomposition state text.
// Usage: node page.mjs --state <state text file> --out <page file>
// Contract with other publishers: the state is the text of <pre id="dev-workflow-state">,
// with & < > encoded. Everything else on the page is presentation.

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s) => esc(s).replace(/"/g, "&quot;");

function scalar(raw) {
  const quoted = /^\s*("(?:[^"\\]|\\.)*")/.exec(raw);
  if (quoted) {
    try {
      return String(JSON.parse(quoted[1]));
    } catch {
      return quoted[1].slice(1, -1);
    }
  }
  const v = raw.replace(/\s+#.*$/, "").trim();
  return /^(null|~|[|>][+-]?)$/.test(v) ? "" : v.replace(/^'|'$/g, "");
}

const TEXT_FIELDS = ["title", "description", "verification_hint", "status", "pr", "branch"];
const STATUSES = ["pending", "in_progress", "completed"];
const FIELD = new RegExp(`^(\\s+)(${TEXT_FIELDS.join("|")}|depends_on):\\s*(.*)$`);

// Line-based read of the fixed state shape; a file it cannot read yields no subtasks, and the page
// then shows the state text alone. A subtask's fields are the lines indented like its `id:`, so a
// line inside a multi-line value is never taken for one.
function summarize(state) {
  const fm = /^---\n([\s\S]*?)\n---/.exec(state);
  const lines = (fm ? fm[1] : "").split("\n");
  const top = { slug: "", parent_task: "" };
  const subtasks = [];
  let indent = -1;
  for (const line of lines) {
    const key = /^(slug|parent_task):\s*(.*)$/.exec(line);
    if (key) {
      top[key[1]] = scalar(key[2]);
      continue;
    }
    const start = /^\s*-\s+id:\s*(\d+)\s*(?:#.*)?$/.exec(line);
    if (start) {
      indent = line.indexOf("id:");
      subtasks.push({ id: Number(start[1]), depends_on: [], ...Object.fromEntries(TEXT_FIELDS.map((f) => [f, ""])) });
      continue;
    }
    const field = FIELD.exec(line);
    if (!field || field[1].length !== indent) continue;
    const subtask = subtasks[subtasks.length - 1];
    if (field[2] === "depends_on") {
      const list = /^\[([^\]]*)\]/.exec(field[3]);
      subtask.depends_on = list ? (list[1].match(/\d+/g) ?? []).map(Number) : [];
    } else {
      subtask[field[2]] = scalar(field[3]);
    }
  }
  return { slug: top.slug, parent: top.parent_task, subtasks };
}

const DARK = "color-scheme:dark;--bg:#17181a;--card:#1f2023;--fg:#e9e9e6;--dim:#a2a5ab;--line:#33353a;--done:#6fcf9b;--doing:#e6ad55";
const STYLE = `<style>
:root{--bg:#fbfbf9;--card:#fff;--fg:#1c1d1f;--dim:#5d6066;--line:#dcdcd6;--done:#1f7a4d;--doing:#9a5b00}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${DARK}}}
:root[data-theme="dark"]{${DARK}}
body{background:var(--bg);color:var(--fg);font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:760px;margin:0 auto;padding-block:28px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:20px}
h1{font-size:20px;line-height:1.3;margin:0;text-wrap:balance}
p{margin:0}
.slug,code{font:12px ui-monospace,Menlo,Consolas,monospace}
.slug,.sum,.m,summary{color:var(--dim)}
.sum{font-variant-numeric:tabular-nums}
.bar{height:6px;border-radius:3px;background:var(--line);overflow:hidden;margin-top:8px}
.bar i{display:block;height:100%;background:var(--done)}
ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
li{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;overflow-wrap:anywhere}
.h{display:flex;gap:8px;align-items:baseline}
.n{color:var(--dim);font-variant-numeric:tabular-nums}
.t{font-weight:600;flex:1}
.b{font-size:12px;white-space:nowrap;border:1px solid currentColor;border-radius:999px;padding:0 8px;color:var(--dim)}
.completed .b{color:var(--done)}.in_progress .b{color:var(--doing)}
.completed .t{color:var(--dim)}
.in_progress{border-color:var(--doing)}
.v b{font-weight:600}
.m{font-size:13px;display:flex;flex-wrap:wrap;gap:4px 14px}
a{color:inherit}
summary{cursor:pointer}
pre{font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0 0}
</style>`;

function item(s) {
  const meta = [];
  if (s.depends_on.length) meta.push(`<span>Depends on ${s.depends_on.map((d) => `#${d}`).join(", ")}</span>`);
  if (s.branch) meta.push(`<code>${esc(s.branch)}</code>`);
  if (s.pr) meta.push(/^https?:\/\//.test(s.pr) ? `<a href="${attr(s.pr)}">${esc(s.pr)}</a>` : `<span>${esc(s.pr)}</span>`);
  return [
    `<li class="${STATUSES.includes(s.status) ? s.status : ""}">`,
    `<div class="h"><span class="n">#${s.id}</span><span class="t">${esc(s.title)}</span>${s.status ? `<span class="b">${esc(s.status)}</span>` : ""}</div>`,
    s.description && `<p>${esc(s.description)}</p>`,
    s.verification_hint && `<p class="v"><b>Done when</b> ${esc(s.verification_hint)}</p>`,
    meta.length && `<div class="m">${meta.join("")}</div>`,
    "</li>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPage(raw, now = new Date()) {
  const state = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/^\n+/, "");
  const { slug, parent, subtasks } = summarize(state);
  if (!slug) throw new Error("no slug: line in the state text");
  const count = (status) => subtasks.filter((s) => s.status === status).length;
  const done = count("completed");
  const doing = count("in_progress");
  const list = subtasks.length
    ? `<div><p class="sum">${done} of ${subtasks.length} completed${doing ? ` · ${doing} in progress` : ""} · updated ${now.toISOString().slice(0, 16).replace("T", " ")} UTC</p><div class="bar" aria-hidden="true"><i style="width:${Math.round((done / subtasks.length) * 100)}%"></i></div></div>
<ol>
${subtasks.map(item).join("\n")}
</ol>
`
    : "";
  return `<title>dev-workflow.${esc(slug)}</title>
${STYLE}
<main>
<div><h1>${esc(parent || slug)}</h1><div class="slug">dev-workflow.${esc(slug)}</div></div>
${list}<details${subtasks.length ? "" : " open"}><summary>State</summary>
<pre id="dev-workflow-state">
${esc(state.replace(/\n+$/, ""))}
</pre>
</details>
</main>
`;
}

function main(argv) {
  let opts;
  try {
    ({ values: opts } = parseArgs({ args: argv, options: { state: { type: "string" }, out: { type: "string" } }, strict: true }));
    if (!opts.state || !opts.out) throw new Error("usage: page.mjs --state <state text file> --out <page file>");
    writeFileSync(opts.out, buildPage(readFileSync(opts.state, "utf8")));
  } catch (e) {
    process.stderr.write(`page.mjs: ${e.message}\n`);
    return 1;
  }
  return 0;
}

// Compared as real paths: the skill may be reached through a symlink, and the ESM loader resolves the module's own path.
function isMain() {
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (isMain()) process.exit(main(process.argv.slice(2)));
