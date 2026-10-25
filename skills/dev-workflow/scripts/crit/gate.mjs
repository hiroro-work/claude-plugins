#!/usr/bin/env node
// Drive the crit browser reviewer for one commit range and report the outcome as one JSON line on stdout.
//
// Usage: node gate.mjs prep   --range <a>..<b>
//        node gate.mjs story  --range <a>..<b> --story-file <path|->
//        node gate.mjs review --range <a>..<b> [--no-open]
// `prep` prints crit's story guide, a `--- hunks ---` line, then the range's hunk listing (plain text).
// `story` ingests a hand-authored story with --no-open: {"status":"ingested"|"rejected","ok","auto_repaired","error","daemon_url"}.
// `review` launches `crit --range` and waits for the browser verdict: {"status":"approved"|"changes"|"broken","comments","exit","reason","url"}.
// Every subcommand answers {"status":"unavailable","reason"} when crit is missing or the session is remote.
// crit's stderr is echoed live so a background caller can read the review URL. Exit 0 once a result line was
// printed; 1 on a usage error.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const USAGE = "usage: gate.mjs prep|story|review --range <a>..<b> [--story-file <path|->] [--no-open]";

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = { cmd, range: null, storyFile: null, noOpen: false };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--range") opts.range = rest[++i];
    else if (a === "--story-file") opts.storyFile = rest[++i];
    else if (a === "--no-open") opts.noOpen = true;
    else return null;
  }
  if (!["prep", "story", "review"].includes(cmd) || !opts.range || !/\.\./.test(opts.range)) return null;
  if (cmd === "story" && !opts.storyFile) return null;
  return opts;
}

// Resolves on `close`, after both streams drained; `error` (crit missing) resolves with code null.
function run(args, { stdin = null, echoStderr = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn("crit", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let error = null;
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => {
      stderr += d;
      if (echoStderr) process.stderr.write(d);
    });
    child.on("error", (e) => { error = e; });
    child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr, error }));
    if (stdin !== null) child.stdin.end(stdin);
    else child.stdin.end();
  });
}

const lastLine = (text) => {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1].slice(0, 80) : "(no stderr)";
};

const daemonUrl = (text) => /(?:Started|Restarted) crit daemon at (\S+)/.exec(text)?.[1] ?? null;

function emit(result) {
  process.stdout.write(JSON.stringify(result) + "\n");
}

async function unavailable() {
  if (process.env.CLAUDE_CODE_REMOTE === "true") return "no local browser (CLAUDE_CODE_REMOTE=true)";
  const probe = await run(["--version"]);
  if (probe.error || probe.code !== 0) return "crit is not installed: https://github.com/tomasz-tomczyk/crit";
  return null;
}

async function prep(opts) {
  const guide = await run(["story", "--guide", "--range", opts.range]);
  const hunks = await run(["story", "--range", opts.range, "--prep", "/dev/stdout"]);
  if (hunks.code !== 0) {
    emit({ status: "broken", reason: lastLine(hunks.stderr) });
    return;
  }
  process.stdout.write(`${guide.stdout.trimEnd()}\n--- hunks ---\n${hunks.stdout}`);
}

async function story(opts) {
  const fromStdin = opts.storyFile === "-";
  const body = fromStdin ? readFileSync(0, "utf8") : null;
  const args = ["story", "--range", opts.range, "--story-file", fromStdin ? "-" : opts.storyFile, "--refresh", "--no-open"];
  const r = await run(args, { stdin: body });
  let report = null;
  for (const line of r.stdout.split("\n")) {
    if (/^\s*\{/.test(line)) {
      try { report = JSON.parse(line); break; } catch { /* not the report line */ }
    }
  }
  const ok = r.code === 0 && report?.ok !== false;
  const autoRepaired = report?.auto_repaired === true;
  emit({
    status: ok || autoRepaired ? "ingested" : "rejected",
    ok: report?.ok ?? (r.code === 0),
    auto_repaired: autoRepaired,
    indexed: report?.indexed ?? null,
    placed: report?.placed ?? null,
    error: ok || autoRepaired ? null : lastLine(r.stderr),
    daemon_url: daemonUrl(r.stdout + "\n" + r.stderr),
  });
}

function parseArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// The verdict line may sit on either stream; the comment array is looked for after it, then on the other stream.
function readVerdict(stdout, stderr) {
  for (const [text, other] of [[stderr, stdout], [stdout, stderr]]) {
    const m = /^approved: (true|false)\s*$/m.exec(text);
    if (!m) continue;
    if (m[1] === "true") return { status: "approved", comments: [] };
    const after = text.slice(m.index + m[0].length);
    const comments = parseArray(after) ?? parseArray(other);
    if (comments) return { status: "changes", comments };
    return { status: "changes", comments: [], comments_raw: (after.trim() || other.trim()).slice(0, 2000) };
  }
  return null;
}

async function review(opts) {
  const args = ["--range", opts.range];
  if (opts.noOpen) args.push("--no-open");
  const r = await run(args, { echoStderr: true });
  const verdict = readVerdict(r.stdout, r.stderr);
  const url = daemonUrl(r.stdout + "\n" + r.stderr);
  if (verdict) {
    emit({ ...verdict, exit: r.code, url });
    return;
  }
  emit({
    status: "broken",
    comments: [],
    exit: r.code,
    reason: r.code === 0 ? "no approved: line in crit's output" : lastLine(r.stderr),
    url,
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts) {
    process.stderr.write(USAGE + "\n");
    process.exit(1);
  }
  const reason = await unavailable();
  if (reason) {
    emit({ status: "unavailable", reason });
    return;
  }
  if (opts.cmd === "prep") await prep(opts);
  else if (opts.cmd === "story") await story(opts);
  else await review(opts);
}

main();
