#!/usr/bin/env node
/**
 * Local plan-review viewer for dev-workflow's visual plan-review gate.
 *
 * Serves a Markdown plan to a self-contained browser UI on 127.0.0.1, collects
 * block-level review comments plus an approve/revise decision, writes them to
 * <plan-basename>.comments.json, and (in --wait mode) prints that same JSON to
 * stdout and exits so the caller can parse it as the gate's return value.
 *
 * Node built-ins only (no node_modules). The browser-side renderers
 * (marked / highlight.js / mermaid) load from CDN inside public/index.html.
 *
 * Usage:
 *   node serve.mjs --plan <path> [--wait] [--port <n>] [--no-open] [--timeout <sec>]
 *
 * stdout contract: in --wait mode the ONLY bytes written to stdout are the final
 * submit JSON (one line). Every progress / error message goes to stderr, so the
 * caller can `JSON.parse` the whole stdout.
 *
 * Exit codes: 0 submit, 124 timeout, 130 SIGINT/SIGTERM, 1 startup error.
 */

import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { spawn } from "node:child_process";

const log = (...args) => console.error(...args); // all progress → stderr

const DEFAULT_TIMEOUT_SEC = 1800;
const MAX_BODY_BYTES = 5_000_000;

// --- parse args ---
let opts;
try {
  ({ values: opts } = parseArgs({
    options: {
      plan: { type: "string" },
      wait: { type: "boolean", default: false },
      port: { type: "string" },
      "no-open": { type: "boolean", default: false },
      timeout: { type: "string", default: String(DEFAULT_TIMEOUT_SEC) },
    },
  }));
} catch (err) {
  log(`error: ${err.message}`);
  process.exit(1);
}

if (!opts.plan) {
  log("error: --plan <path> is required");
  process.exit(1);
}

const planPath = resolve(opts.plan);
let planSource;
try {
  planSource = readFileSync(planPath, "utf8");
} catch (err) {
  log(`error: cannot read plan file ${planPath}: ${err.message}`);
  process.exit(1);
}

const intOrDefault = (raw, def, min) => {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= min ? n : def;
};
const timeoutMs = intOrDefault(opts.timeout, DEFAULT_TIMEOUT_SEC, 1) * 1000;
const port = intOrDefault(opts.port, 0, 0); // 0 = random free port

// id token = plan basename with the .md extension stripped; the /api/plan `id`
// and the comments.json `plan` field both use this exact token (subtask-2 contract).
const planId = basename(planPath).replace(/\.md$/i, "");
const commentsPath = join(dirname(planPath), `${planId}.comments.json`);

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "public");

// --- block segmentation ---
// Explicit <!-- block:bN --> markers are authoritative when present (the wired
// gate relies on them for revise stability). Otherwise fall back to deterministic
// per-render numbering, splitting on ATX headings outside fenced code.
const MARKER_RE = /^<!--\s*block:([A-Za-z0-9_-]+)\s*-->\s*$/;
const ATX_RE = /^#{1,6}\s/;
// Naive toggle on any fence line: it does not track delimiter type/length, so a
// block mixing ``` and ~~~ fences can mis-toggle. Harmless for the fallback path
// (block ids are advisory there); the marker path bypasses segmentation entirely.
const FENCE_RE = /^\s*(`{3,}|~{3,})/;

// Walk lines once, tracking fenced-code state so the segmenters below share a
// single fence rule. `visit` receives (line, inFence-after-this-line's-toggle, isFence) —
// so a closing fence line reports inFence=false; consumers must gate on isFence first
// if they care about the fence line itself.
function walkLines(lines, visit) {
  let inFence = false;
  for (const line of lines) {
    const isFence = FENCE_RE.test(line);
    if (isFence) inFence = !inFence;
    visit(line, inFence, isFence);
  }
}

function hasMarkers(lines) {
  let found = false;
  walkLines(lines, (line, inFence, isFence) => {
    if (!isFence && !inFence && MARKER_RE.test(line)) found = true;
  });
  return found;
}

function segmentByMarkers(lines) {
  const blocks = [];
  let current = null;
  walkLines(lines, (line, inFence, isFence) => {
    if (!isFence && !inFence) {
      const m = line.match(MARKER_RE);
      if (m) {
        if (current) blocks.push(current);
        current = { id: m[1], lines: [] };
        return;
      }
    }
    if (!current) {
      if (line.trim() === "") return; // skip blank content before the first marker
      current = { id: "b0", lines: [] }; // content before the first marker
    }
    current.lines.push(line);
  });
  if (current) blocks.push(current);
  return finalizeBlocks(blocks);
}

function segmentByHeadings(lines) {
  const blocks = [];
  let current = null;
  let counter = 0;
  const startBlock = () => {
    counter += 1;
    current = { id: `b${counter}`, lines: [] };
    blocks.push(current);
  };
  walkLines(lines, (line, inFence) => {
    const isHeading = !inFence && ATX_RE.test(line);
    if (current === null) startBlock();
    else if (isHeading && current.lines.some((l) => l.trim() !== "")) startBlock();
    current.lines.push(line);
  });
  return finalizeBlocks(blocks);
}

function finalizeBlocks(blocks) {
  return blocks
    .map((b) => ({ id: b.id, markdown: b.lines.join("\n").replace(/^\n+|\n+$/g, "") }))
    .filter((b) => b.markdown.trim() !== "");
}

function segmentBlocks(source) {
  const lines = source.split(/\r?\n/);
  return hasMarkers(lines) ? segmentByMarkers(lines) : segmentByHeadings(lines);
}

const blocks = segmentBlocks(planSource);
const planPayload = { id: planId, blocks };
const validBlockIds = new Set(blocks.map((b) => b.id));

// --- HTTP server ---
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

let server;
let timer;

function shutdown(code) {
  if (timer) clearTimeout(timer);
  if (server) {
    server.close(() => process.exit(code));
    setTimeout(() => process.exit(code), 500).unref(); // force-exit if close hangs on a live socket
  } else {
    process.exit(code);
  }
}

function sendJson(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function serveStatic(res, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = resolve(join(publicDir, rel));
  if (filePath !== publicDir && !filePath.startsWith(publicDir + "/")) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(filePath)] || "application/octet-stream" });
  res.end(readFileSync(filePath));
}

function handleSubmit(req, res) {
  let raw = "";
  let aborted = false;
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > MAX_BODY_BYTES) {
      aborted = true;
      sendJson(res, 413, { error: "payload too large" });
      req.destroy();
    }
  });
  req.on("end", () => {
    if (aborted) return;
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return sendJson(res, 400, { error: "invalid JSON" });
    }
    const { decision } = body;
    if (decision !== "approve" && decision !== "revise") {
      return sendJson(res, 400, { error: "decision must be 'approve' or 'revise'" });
    }

    // keep only comments whose block matches a real block id (no client-invented ids)
    const comments = Array.isArray(body.comments)
      ? body.comments
          .filter((c) => c && validBlockIds.has(c.block) && typeof c.body === "string" && c.body.trim() !== "")
          .map((c) => ({ block: c.block, excerpt: typeof c.excerpt === "string" ? c.excerpt : "", body: c.body }))
      : [];

    const payload = { plan: planId, decision, submitted_at: new Date().toISOString(), comments };
    try {
      writeFileSync(commentsPath, JSON.stringify(payload, null, 2) + "\n");
    } catch (err) {
      log(`error: cannot write ${commentsPath}: ${err.message}`);
      return sendJson(res, 500, { error: "write failed" });
    }
    sendJson(res, 200, { ok: true });
    process.stdout.write(JSON.stringify(payload) + "\n"); // the gate's return value
    log(`submitted: decision=${decision}, comments=${comments.length}, written to ${commentsPath}`);
    if (opts.wait) shutdown(0);
  });
}

function handle(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  if (req.method === "GET" && url.pathname === "/api/plan") return sendJson(res, 200, planPayload);
  if (req.method === "POST" && url.pathname === "/api/submit") return handleSubmit(req, res);
  if (req.method === "GET") return serveStatic(res, url.pathname);
  res.writeHead(405);
  res.end("Method not allowed");
}

function openBrowser(urlStr) {
  const isWin = process.platform === "win32";
  const opener = process.platform === "darwin" ? "open" : isWin ? "start" : "xdg-open";
  const args = isWin ? ["", urlStr] : [urlStr];
  try {
    // browser-open failure is non-fatal: stay up, exit code unaffected, nothing to stdout
    const child = spawn(opener, args, { stdio: "ignore", detached: true, shell: isWin });
    child.on("error", () => log(`could not launch a browser; open ${urlStr} manually`));
    child.unref();
  } catch {
    log(`could not launch a browser; open ${urlStr} manually`);
  }
}

server = createServer(handle);
server.on("error", (err) => {
  log(`error: server failed: ${err.message}`);
  process.exit(1);
});
server.listen(port, "127.0.0.1", () => {
  const urlStr = `http://127.0.0.1:${server.address().port}/`;
  log(`plan-review viewer listening on ${urlStr} (plan: ${planId}, ${blocks.length} blocks)`);
  log(opts.wait ? "waiting for submit… (Ctrl-C to cancel)" : "running without --wait; will not auto-exit on submit");
  if (opts["no-open"]) log(`open ${urlStr} in your browser`);
  else openBrowser(urlStr);
});

// timeout arms only in --wait mode; without --wait the process stays up until a signal
if (opts.wait) {
  timer = setTimeout(() => {
    log(`error: timed out after ${timeoutMs / 1000}s with no submit`);
    shutdown(124);
  }, timeoutMs);
}

const onSignal = (msg) => () => {
  log(msg);
  shutdown(130);
};
process.on("SIGINT", onSignal("interrupted"));
process.on("SIGTERM", onSignal("terminated"));
