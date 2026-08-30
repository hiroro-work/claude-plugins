#!/usr/bin/env node
/**
 * Local plan-review viewer for dev-workflow's visual plan-review gate.
 *
 * Transport only: serves the raw Markdown plan on 127.0.0.1, collects the browser's
 * submit into <plan-basename>.comments.json, appends it as a round to
 * <plan-basename>.thread.json, and writes the viewer URL to <plan-basename>.url at
 * listen time (the port is random, so a caller that backgrounded this reads it there).
 * Node built-ins only (no node_modules).
 *
 * Usage:
 *   node serve.mjs --plan <path> [--prev <path>] [--lang <ja|en>] [--wait] [--port <n>] [--no-open] [--timeout <sec>]
 *
 * --prev is the plan version reviewed on the previous launch; shipped as prevMarkdown
 * so the browser can highlight what changed. --lang controls only browser-generated
 * text, not UI chrome.
 *
 * stdout contract: in --wait mode the ONLY bytes on stdout are the final submit JSON
 * (one line), so the caller can `JSON.parse` the whole stream. Everything else → stderr.
 *
 * Exit codes: 0 submit, 124 timeout (default 24h; --timeout 0 disables), 130 SIGINT/SIGTERM, 1 startup error.
 */

import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { spawn } from "node:child_process";
// The viewer drops frontmatter anyway; stripping here keeps it out of the response body too.
import { stripFrontmatter } from "./public/plan-parse.mjs";

const log = (...args) => console.error(...args); // all progress → stderr

// Keep under setTimeout's ~24.8-day (2^31-1 ms) ceiling or the timer fires immediately.
const DEFAULT_TIMEOUT_SEC = 86400;
const MAX_BODY_BYTES = 5_000_000;

let opts;
try {
  ({ values: opts } = parseArgs({
    options: {
      plan: { type: "string" },
      prev: { type: "string" },
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
  planSource = stripFrontmatter(readFileSync(planPath, "utf8"));
} catch (err) {
  log(`error: cannot read plan file ${planPath}: ${err.message}`);
  process.exit(1);
}

// An unreadable --prev is non-fatal: the viewer renders without a diff.
let prevSource = null;
if (opts.prev) {
  try {
    prevSource = stripFrontmatter(readFileSync(resolve(opts.prev), "utf8"));
  } catch (err) {
    log(`warning: cannot read --prev file ${opts.prev}: ${err.message} (diff disabled)`);
  }
}

const intOrDefault = (raw, def, min) => {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= min ? n : def;
};
const timeoutMs = intOrDefault(opts.timeout, DEFAULT_TIMEOUT_SEC, 0) * 1000; // 0 = no timeout (wait indefinitely)
const port = intOrDefault(opts.port, 0, 0); // 0 = random free port
const lang = opts.lang === "ja" ? "ja" : "en";

// This exact token is both /api/plan's `id` and comments.json's `plan` field.
const planId = basename(planPath).replace(/\.md$/i, "");
const commentsPath = join(dirname(planPath), `${planId}.comments.json`);
const urlPath = join(dirname(planPath), `${planId}.url`);
const threadPath = join(dirname(planPath), `${planId}.thread.json`);

// An absent or malformed thread file is non-fatal: the viewer renders no thread rather
// than the run losing its gate.
const DISPOSITIONS = new Set(["answered", "revised", "both"]);
const str = (v) => (typeof v === "string" ? v : "");

// Rounds read off disk and rounds appended here must be one shape, or a rename reaches
// only half. The caller rewrites this file between launches — trust nothing in it.
function makeEntry(e, fallbackId) {
  return {
    id: str(e.id) || fallbackId,
    block: str(e.block),
    anchor: { section: str(e.anchor?.section), excerpt: str(e.anchor?.excerpt) },
    kind: e.kind === "figure" ? "figure" : "prose",
    body: str(e.body),
    reply: typeof e.reply === "string" ? e.reply : null,
    disposition: DISPOSITIONS.has(e.disposition) ? e.disposition : null,
  };
}

function normalizeRound(r, i) {
  if (!r || !Array.isArray(r.entries)) return null;
  return {
    round: Number.isInteger(r.round) ? r.round : i + 1,
    submitted_at: str(r.submitted_at),
    entries: r.entries.filter(Boolean).map((e, j) => makeEntry(e, `r${i + 1}-c${j + 1}`)),
  };
}

let thread = { plan: planId, rounds: [] };
if (existsSync(threadPath)) {
  try {
    const parsed = JSON.parse(readFileSync(threadPath, "utf8"));
    if (Array.isArray(parsed?.rounds)) {
      const rounds = parsed.rounds.map(normalizeRound).filter(Boolean);
      if (rounds.length !== parsed.rounds.length) log(`warning: ${threadPath} had ${parsed.rounds.length - rounds.length} malformed round(s) (dropped)`);
      thread = { plan: planId, rounds };
    } else log(`warning: ${threadPath} has no rounds array (thread ignored)`);
  } catch (err) {
    log(`warning: cannot read ${threadPath}: ${err.message} (thread ignored)`);
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "public");

// Reload signal: changes per process start, so a page polling across a restart reloads
// and one polling the still-shutting-down process does not.
const instance = `${process.pid}-${Date.now()}`;
const planPayload = {
  id: planId,
  markdown: planSource,
  lang,
  prevMarkdown: prevSource,
  thread: thread.rounds,
  instance,
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
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
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
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

    // Block ids are browser-assigned and not enumerable here, so any non-empty string passes.
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
          // Normalized, not passed through: the caller routes on `kind`, so keep it two-valued.
          .map((c) => ({
            block: c.block,
            section: str(c.section),
            excerpt: str(c.excerpt),
            kind: c.kind === "figure" ? "figure" : "prose",
            body: c.body,
          }))
      : [];

    const submitted_at = new Date().toISOString();
    const payload = { plan: planId, decision, submitted_at, comments };
    try {
      writeFileSync(commentsPath, JSON.stringify(payload, null, 2) + "\n");
    } catch (err) {
      log(`error: cannot write ${commentsPath}: ${err.message}`);
      return sendJson(res, 500, { error: "write failed" });
    }

    // An approve's comments are advisory (§ Decision mapping), so only a non-empty revise
    // opens a round. `reply` / `disposition` are the caller's to fill.
    if (decision === "revise" && comments.length) {
      const roundNo = thread.rounds.length + 1;
      thread.rounds.push({
        round: roundNo,
        submitted_at,
        entries: comments.map((c, i) => makeEntry(
          { ...c, anchor: { section: c.section, excerpt: c.excerpt } },
          `r${roundNo}-c${i + 1}`,
        )),
      });
      try {
        writeFileSync(threadPath, JSON.stringify(thread, null, 2) + "\n");
      } catch (err) {
        // Non-fatal: the submit is the gate's return value and comments.json already holds
        // this round.
        log(`warning: cannot write ${threadPath}: ${err.message}`);
      }
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
  // The post-revise poll hits this, not /api/plan: it runs for as long as the caller takes.
  if (req.method === "GET" && url.pathname === "/api/instance") return sendJson(res, 200, { instance });
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

// Set when a busy --port forced a random one: the caller's already-open tab points at the
// old port, so it can no longer reach this process and a browser has to open regardless.
let bindRetried = false;
let portFellBack = false;

server.on("error", (err) => {
  if (err.code === "EADDRINUSE" && port !== 0 && !portFellBack) {
    // A relaunch reuses the previous port, which that process may still be releasing.
    // Exiting here would read to the caller as a startup failure and misfire its fallback.
    if (!bindRetried) {
      bindRetried = true;
      log(`warning: port ${port} is busy — retrying once in 1s`);
      setTimeout(() => server.listen(port, "127.0.0.1"), 1000);
      return;
    }
    portFellBack = true;
    log(`warning: port ${port} still busy — falling back to a random port`);
    server.listen(0, "127.0.0.1");
    return;
  }
  log(`error: server failed: ${err.message}`);
  process.exit(1);
});

server.on("listening", () => {
  const urlStr = `http://127.0.0.1:${server.address().port}/`;
  log(`plan-review viewer listening on ${urlStr} (plan: ${planId})`);
  // Written before the browser launch so a backgrounded caller can read it either way;
  // failing to write is non-fatal.
  try {
    writeFileSync(urlPath, `${urlStr}\n`, "utf8");
  } catch (err) {
    log(`could not write ${urlPath}: ${err.message}`);
  }
  log(opts.wait ? "waiting for submit… (Ctrl-C to cancel)" : "running without --wait; will not auto-exit on submit");
  if (opts["no-open"] && !portFellBack) log(`open ${urlStr} in your browser`);
  else openBrowser(urlStr);
});

server.listen(port, "127.0.0.1");

if (opts.wait && timeoutMs > 0) {
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
