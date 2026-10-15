#!/usr/bin/env node
// Resolve the app URL and wait until it answers.
//
// Usage: node wait-ready.mjs --timeout <seconds> (--url <url> | --url-command <command>)
// --url: the URL to poll. --url-command: a command run through `sh -c` every 2 seconds, inheriting
// this process's environment, until it exits zero with a non-empty first stdout line that parses as a
// URL. Any HTTP response counts as ready.
//
// stdout: `ready <url>` (exit 0) or `timeout` (exit 1); exit 2 on a usage error.
// On timeout, stderr carries the last output of the URL command and the last fetch error, so a
// caller can show why.

import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const usage = () => {
  process.stderr.write("usage: wait-ready.mjs --timeout <seconds> (--url <url> | --url-command <command>)\n");
  process.exit(2);
};
let args;
try {
  ({ values: args } = parseArgs({ options: { timeout: { type: "string" }, url: { type: "string" }, "url-command": { type: "string" } }, strict: true }));
} catch {
  usage();
}
const timeout = Number(args.timeout);
if (!Number.isInteger(timeout) || timeout < 0 || Boolean(args.url) === Boolean(args["url-command"])) usage();
if (args.url && !URL.canParse(args.url)) usage();

const deadline = Date.now() + timeout * 1000;
let url = args.url ?? null;
let lastOutput = "";
let lastError = "";
for (;;) {
  // Resolved again on every try, so a stale URL left by an earlier run does not pin the wait.
  if (!args.url) ({ url, output: lastOutput } = resolveUrl(args["url-command"], remaining()));
  if (url && (await answers(url, Math.max(1000, Math.min(5000, remaining()))))) {
    process.stdout.write(`ready ${url}\n`);
    process.exit(0);
  }
  const left = remaining();
  if (left <= 0) {
    process.stdout.write("timeout\n");
    if (lastOutput) process.stderr.write(lastOutput.split("\n").slice(-20).join("\n") + "\n");
    if (lastError) process.stderr.write(`${lastError}\n`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, Math.min(2000, left)));
}

function remaining() {
  return deadline - Date.now();
}

// A command that never returns would otherwise hold the loop past the deadline.
function resolveUrl(command, ms) {
  const run = spawnSync("sh", ["-c", command], { env: process.env, encoding: "utf8", timeout: Math.max(1000, ms), killSignal: "SIGKILL" });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim();
  if (run.status !== 0) return { url: null, output };
  const line = (run.stdout ?? "").split("\n").map((l) => l.trim()).find((l) => l !== "");
  return { url: line && URL.canParse(line) ? line : null, output };
}

// A connection the app accepts but never answers would otherwise hold the loop past the deadline.
async function answers(url, ms) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(ms) });
    return true;
  } catch (err) {
    lastError = `${err?.cause?.code ?? err?.name ?? "error"}: ${err?.cause?.message ?? err?.message ?? ""}`.trim();
    return false;
  }
}
