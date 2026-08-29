#!/usr/bin/env node
/**
 * Local plan-review viewer for dev-workflow's visual plan-review gate.
 *
 * Transport only: serves the raw Markdown plan to a self-contained browser UI
 * on 127.0.0.1, then collects the browser's submit (block-level review comments
 * plus an approve/revise decision), writes it to <plan-basename>.comments.json,
 * appends it as a round to the conversation thread <plan-basename>.thread.json,
 * writes the viewer URL to <plan-basename>.url at listen time (the port is
 * random, so a caller that backgrounded this process reads the URL from there),
 * and (in --wait mode) prints that same JSON to stdout and exits so the caller
 * can parse it as the gate's return value.
 *
 * Plan structure is parsed and rendered entirely browser-side: public/plan-parse.mjs
 * splits and classifies the markdown, public/plan-render.mjs draws it (summary header,
 * hero slot, collapsible sections, Decision cards) with public/plan-view.css, and
 * public/index.html adds the interactive layer (per-element comment affordances,
 * conversation thread, submit bar, mermaid). This server does not segment the plan;
 * it ships the raw markdown and is agnostic to the plan schema.
 *
 * Node built-ins only (no node_modules). The browser-side renderers
 * (marked / highlight.js / mermaid) and the web fonts load from pinned CDNs, declared in
 * public/index.html.
 *
 * Usage:
 *   node serve.mjs --plan <path> [--prev <path>] [--lang <ja|en>] [--wait] [--port <n>] [--no-open] [--timeout <sec>]
 *
 * --prev is the plan version the user reviewed on the previous launch; when
 * supplied and readable, /api/plan ships it as prevMarkdown so the browser can
 * highlight what changed since then (omitted / unreadable → no diff). --lang
 * controls only the language of browser-generated text (the "switch to
 * alternative" comment body, the diff banner, the keyboard-shortcut hint, the
 * note saying what "request changes" does, the conversation-thread labels, and
 * the message shown while the page waits for the re-launch); UI chrome stays
 * English; default en.
 *
 * stdout contract: in --wait mode the ONLY bytes written to stdout are the final
 * submit JSON (one line). Every progress / error message goes to stderr, so the
 * caller can `JSON.parse` the whole stdout.
 *
 * Exit codes: 0 submit, 124 timeout (default 24h; --timeout 0 disables), 130 SIGINT/SIGTERM, 1 startup error.
 */

import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { spawn } from "node:child_process";

const log = (...args) => console.error(...args); // all progress → stderr

// 24h default: long enough never to fire during a real review, but still an eventual
// fallback. Keep under setTimeout's ~24.8-day (2^31-1 ms) ceiling or it fires immediately.
const DEFAULT_TIMEOUT_SEC = 86400;
const MAX_BODY_BYTES = 5_000_000;

// --- parse args ---
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
  planSource = readFileSync(planPath, "utf8");
} catch (err) {
  log(`error: cannot read plan file ${planPath}: ${err.message}`);
  process.exit(1);
}

// --prev (optional): the plan version the user reviewed on the previous launch.
// Shipped as prevMarkdown so the browser can diff current-vs-prev. An unreadable
// --prev is non-fatal — the viewer simply renders without a diff (prevMarkdown null).
let prevSource = null;
if (opts.prev) {
  try {
    prevSource = readFileSync(resolve(opts.prev), "utf8");
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
const lang = opts.lang === "ja" ? "ja" : "en"; // only "ja" / "en"; default en

// id token = plan basename with the .md extension stripped; the /api/plan `id`
// and the comments.json `plan` field both use this exact token.
const planId = basename(planPath).replace(/\.md$/i, "");
const commentsPath = join(dirname(planPath), `${planId}.comments.json`);
const urlPath = join(dirname(planPath), `${planId}.url`);
const threadPath = join(dirname(planPath), `${planId}.thread.json`);

// Conversation log: the browser's comments plus the replies the caller writes back.
// Absent on a first launch and non-fatal when unreadable or malformed — the viewer
// simply renders no thread rather than the run losing its gate.
const DISPOSITIONS = new Set(["answered", "revised", "both"]);
const str = (v) => (typeof v === "string" ? v : "");

// Normalized on the way in, the way handleSubmit normalizes on the way out: the caller
// rewrites this file between launches, so a malformed round must not reach the browser.
function normalizeRound(r, i) {
  if (!r || !Array.isArray(r.entries)) return null;
  return {
    round: Number.isInteger(r.round) ? r.round : i + 1,
    submitted_at: str(r.submitted_at),
    entries: r.entries.filter(Boolean).map((e, j) => ({
      id: str(e.id) || `r${i + 1}-c${j + 1}`,
      block: str(e.block),
      anchor: { section: str(e.anchor?.section), excerpt: str(e.anchor?.excerpt) },
      kind: e.kind === "figure" ? "figure" : "prose",
      body: str(e.body),
      reply: typeof e.reply === "string" ? e.reply : null,
      disposition: DISPOSITIONS.has(e.disposition) ? e.disposition : null,
    })),
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

// The browser parses the plan into review blocks and assigns each comment a
// semantic block id (e.g. `decision-1`, `overview::2`); the server does not
// enumerate those ids, so /api/plan ships the raw markdown verbatim.
// prevMarkdown is the previous-launch plan (or null) for the browser-side diff.
// `instance` is the reload signal: it changes on every process start, so a page that
// polls across a restart sees a different value and reloads, while polling the same
// (still-shutting-down) process never triggers one.
const instance = `${process.pid}-${Date.now()}`;
const planPayload = {
  id: planId,
  markdown: planSource,
  lang,
  prevMarkdown: prevSource,
  thread: thread.rounds,
  instance,
};

// --- HTTP server ---
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
          // kind is normalized here rather than passed through: the caller routes on it, so a
          // stale browser cache or a hand-rolled POST must not widen a two-value field.
          .map((c) => ({
            block: c.block,
            section: typeof c.section === "string" ? c.section : "",
            excerpt: typeof c.excerpt === "string" ? c.excerpt : "",
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

    // Append the round to the conversation thread. Only a revise carries work forward, and an
    // approve's comments are advisory (§ Decision mapping), so neither an approve nor an
    // empty revise opens a round. `reply` / `disposition` / `anchor` are the caller's to fill.
    if (decision === "revise" && comments.length) {
      const roundNo = thread.rounds.length + 1;
      thread.rounds.push({
        round: roundNo,
        submitted_at,
        entries: comments.map((c, i) => ({
          id: `r${roundNo}-c${i + 1}`,
          block: c.block,
          anchor: { section: c.section, excerpt: c.excerpt },
          kind: c.kind,
          body: c.body,
          reply: null,
          disposition: null,
        })),
      });
      try {
        writeFileSync(threadPath, JSON.stringify(thread, null, 2) + "\n");
      } catch (err) {
        // Non-fatal: the submit itself is the gate's return value, and the comments file
        // already holds this round verbatim.
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
  // The post-revise poll reads this rather than /api/plan: it runs every couple of seconds for
  // as long as the caller takes, and the plan payload carries the whole document and thread.
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
let openAnyway = false;
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
    openAnyway = true;
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
  // Sidecar URL file: the port is random, so a caller that launched this in the
  // background cannot know the URL. Written before the browser launch is even
  // attempted, so the URL is readable whether or not the browser opens. Failing
  // to write it is non-fatal — the server stays up.
  try {
    writeFileSync(urlPath, `${urlStr}\n`, "utf8");
  } catch (err) {
    log(`could not write ${urlPath}: ${err.message}`);
  }
  log(opts.wait ? "waiting for submit… (Ctrl-C to cancel)" : "running without --wait; will not auto-exit on submit");
  if (opts["no-open"] && !openAnyway) log(`open ${urlStr} in your browser`);
  else openBrowser(urlStr);
});

server.listen(port, "127.0.0.1");

// timer arms only in --wait mode and when timeoutMs > 0 (0 = wait forever, no timer);
// without --wait the process stays up until a signal.
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
