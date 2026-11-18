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
  return v === "null" || v === "~" ? "" : v.replace(/^'|'$/g, "");
}

// Line-based read of the fixed state shape; a file it cannot read yields no rows, and the page
// then shows the state text alone.
function summarize(state) {
  const fm = /^---\n([\s\S]*?)\n---/.exec(state);
  const lines = (fm ? fm[1] : "").split("\n");
  const top = { slug: "", parent_task: "" };
  const subtasks = [];
  for (const line of lines) {
    const key = /^(slug|parent_task):\s*(.*)$/.exec(line);
    if (key) {
      top[key[1]] = scalar(key[2]);
      continue;
    }
    const start = /^\s*-\s+id:\s*(\d+)\s*(?:#.*)?$/.exec(line);
    if (start) {
      subtasks.push({ id: Number(start[1]), title: "", status: "", pr: "" });
      continue;
    }
    const field = /^\s+(title|status|pr):\s*(.*)$/.exec(line);
    if (field && subtasks.length) subtasks[subtasks.length - 1][field[1]] = scalar(field[2]);
  }
  return { slug: top.slug, parent: top.parent_task, subtasks };
}

const DARK = "color-scheme:dark;--bg:#17181a;--fg:#e9e9e6;--dim:#a2a5ab;--line:#33353a;--done:#6fcf9b;--doing:#e6ad55";
const STYLE = `<style>
:root{--bg:#fbfbf9;--fg:#1c1d1f;--dim:#5d6066;--line:#dcdcd6;--done:#1f7a4d;--doing:#9a5b00}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${DARK}}}
:root[data-theme="dark"]{${DARK}}
body{background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:860px;margin:0 auto;padding-block:28px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:20px}
h1{font-size:20px;line-height:1.3;margin:0;text-wrap:balance}
.slug{color:var(--dim);font:12px ui-monospace,Menlo,Consolas,monospace}
.wrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th,td{text-align:left;vertical-align:top;padding:8px 12px 8px 0;border-bottom:1px solid var(--line)}
th{color:var(--dim);font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.s{white-space:nowrap;color:var(--dim)}.s.completed{color:var(--done)}.s.in_progress{color:var(--doing);font-weight:600}
a{color:inherit}
summary{cursor:pointer;color:var(--dim)}
pre{font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0 0}
</style>`;

export function buildPage(raw) {
  const state = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/^\n+/, "");
  const { slug, parent, subtasks } = summarize(state);
  if (!slug) throw new Error("no slug: line in the state text");
  const rows = subtasks
    .map((s) => {
      const pr = /^https?:\/\//.test(s.pr) ? `<a href="${attr(s.pr)}">${esc(s.pr)}</a>` : esc(s.pr);
      return `<tr><td>${s.id}</td><td>${esc(s.title)}</td><td class="s ${attr(s.status)}">${esc(s.status)}</td><td>${pr}</td></tr>`;
    })
    .join("\n");
  const table = subtasks.length
    ? `<div class="wrap"><table>
<thead><tr><th>#</th><th>Subtask</th><th>Status</th><th>PR</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>
`
    : "";
  return `<title>dev-workflow.${esc(slug)}</title>
${STYLE}
<main>
<div><h1>${esc(parent || slug)}</h1><div class="slug">dev-workflow.${esc(slug)}</div></div>
${table}<details${subtasks.length ? "" : " open"}><summary>State</summary>
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
