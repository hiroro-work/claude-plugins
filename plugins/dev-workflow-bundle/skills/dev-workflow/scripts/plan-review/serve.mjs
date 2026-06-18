#!/usr/bin/env node
/**
 * Local plan-review viewer for dev-workflow's visual plan-review gate.
 *
 * Transport only: serves the raw Markdown plan to a self-contained browser UI
 * on 127.0.0.1, then collects the browser's submit (block-level review comments
 * plus an approve/revise decision), writes it to <plan-basename>.comments.json,
 * and (in --wait mode) prints that same JSON to stdout and exits so the caller
 * can parse it as the gate's return value.
 *
 * Plan structure is parsed and rendered entirely browser-side (public/index.html
 * builds the summary header, collapsible sections, Decision cards, per-element
 * comment affordances, and mermaid diagrams). This server does not segment the
 * plan; it ships the raw markdown and is agnostic to the plan schema.
 *
 * Node built-ins only (no node_modules). The browser-side renderers
 * (marked / highlight.js / mermaid) load from CDN inside public/index.html.
 *
 * Usage:
 *   node serve.mjs --plan <path> [--lang <ja|en>] [--wait] [--port <n>] [--no-open] [--timeout <sec>]
 *
 * --lang controls only the language of the browser-generated "switch to
 * alternative" comment body (UI chrome stays English); default en.
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
      lang: { type: "string" },
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
const lang = opts.lang === "ja" ? "ja" : "en"; // only "ja" / "en"; default en

// id token = plan basename with the .md extension stripped; the /api/plan `id`
// and the comments.json `plan` field both use this exact token.
const planId = basename(planPath).replace(/\.md$/i, "");
const commentsPath = join(dirname(planPath), `${planId}.comments.json`);

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "public");

// The browser parses the plan into review blocks and assigns each comment a
// semantic block id (e.g. `decision-1`, `overview::2`); the server does not
// enumerate those ids, so /api/plan ships the raw markdown verbatim.
const planPayload = { id: planId, markdown: planSource, lang };

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

    // Keep comments with a non-empty block id and body. Block ids are
    // browser-assigned semantic ids (the server does not enumerate them), so
    // any non-empty string is accepted; the caller resolves the id + excerpt.
    const comments = Array.isArray(body.comments)
      ? body.comments
          .filter(
            (c) =>
              c &&
              typeof c.block === "string" &&
              c.block.trim() !== "" &&
              typeof c.body === "string" &&
              c.body.trim() !== "",
          )
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
  log(`plan-review viewer listening on ${urlStr} (plan: ${planId})`);
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
