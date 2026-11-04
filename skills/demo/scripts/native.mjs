#!/usr/bin/env node
// Drive a desktop app's native UI (tray menu, dialogs, app menu) through agent-desktop.
//
// Usage: node native.mjs <subcommand> [--key value ...]   (flags may come in any order)
//   permissions                       → {"ok":true} | {"ok":false,"reason":"<why>","hint":"<what to do>"|null}
//   apps [--since <file>]             → one app name per line (list-apps), minus the names listed in <file>; exit 1 with one stderr line on failure
//   dismiss --app <name>              → {"dismissed":<n>,"open":<n>}
//   step --app <name> --surface <s> --action <click|check|uncheck|type|press> [--name <n>] [--value <v>]
//        [--window-title <t>] --out <png>
//                                     → {"carried_out","note","screenshot","window","surface"}
// Every subcommand but apps exits 0 with its JSON on stdout. A usage error prints one stderr line and exits 2.
// DEMO_NATIVE_SETTLE_MS overrides how long step waits for the window list to change after the action.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { parseArgs } from "node:util";

const DECLINE = /^(cancel|no|close|dismiss|キャンセル|いいえ|閉じる)$/i;
const SETTLE_MS = Number.isFinite(Number(process.env.DEMO_NATIVE_SETTLE_MS)) ? Number(process.env.DEMO_NATIVE_SETTLE_MS) : 2000;
const POLL_MS = 250;
const ACTIONS = ["click", "check", "uncheck", "type", "press"];
const GONE = new Set(["ELEMENT_NOT_FOUND", "WINDOW_NOT_FOUND"]);

const { command, flags } = parse();
const handlers = { permissions, apps, dismiss, step };
if (!handlers[command]) usage(`unknown subcommand: ${command ?? "(none)"}`);
handlers[command]();

function permissions() {
  const r = run(["permissions"]);
  if (r.error?.code === "ENOENT") return out({ ok: false, reason: "agent-desktop not installed", hint: "install it with `npm i -g agent-desktop@latest`" });
  if (!r.ok) return out({ ok: false, reason: describe("permissions", r), hint: null });
  const missing = ["accessibility", "screen_recording"].filter((k) => r.data?.[k]?.state !== "granted");
  if (missing.length) return out({ ok: false, reason: `agent-desktop permission not granted: ${missing.join(", ")}`, hint: "`agent-desktop permissions --guide` opens the settings to grant them" });
  out({ ok: true });
}

function apps() {
  const r = run(["list-apps"]);
  if (!r.ok) fail(describe("list-apps", r), 1);
  const seen = new Set(flags.since && existsSync(flags.since) ? readFileSync(flags.since, "utf8").split("\n") : []);
  const names = (r.data?.apps ?? []).map((a) => a.name).filter((n) => n && !seen.has(n));
  process.stdout.write(names.map((n) => n + "\n").join(""));
}

function dismiss() {
  const app = need("app");
  let dismissed = 0;
  const touched = [];
  for (const surface of ["alert", "sheet"]) {
    const found = matches(app, surface, ["--role", "button"]).list;
    if (!found.length) continue;
    touched.push(surface);
    const target = found.find((b) => DECLINE.test(b.name ?? ""));
    if (target?.ref_id && run(["click", target.ref_id]).ok) dismissed++;
  }
  out({ dismissed, open: touched.filter((s) => matches(app, s, ["--role", "button"]).list.length).length });
}

function step() {
  const app = need("app"), surface = need("surface"), action = need("action"), outPath = need("out");
  if (!ACTIONS.includes(action)) usage(`unknown --action: ${action}`);
  if (action !== "press" && !flags.name) usage("--name is required unless --action is press");
  if ((action === "type" || action === "press") && flags.value === undefined) usage(`--value is required with --action ${action}`);
  const notes = [];
  let carriedOut = true;

  const before = windows(app);
  let ref = null;
  if (action !== "press") {
    const found = matches(app, surface, ["--name", flags.name, "--exact", "--limit", "1"]);
    ref = found.list[0]?.ref_id ?? null;
    if (!ref) {
      carriedOut = false;
      notes.push(found.error ? describe("find", found) : `find: no element named "${flags.name}" on ${surface}`);
    }
  }
  if (carriedOut) {
    const r = run(action === "press" ? ["press", flags.value, "--app", app] : action === "type" ? ["type", ref, flags.value] : [action, ref]);
    if (!r.ok) {
      notes.push(describe(action, r));
      if ((r.error?.disposition?.delivery ?? "not_delivered") === "not_delivered") carriedOut = false;
    }
  }

  const after = carriedOut ? settle(app, before) : before;
  const beforeIds = new Set(before.map((w) => w.id));
  const target = after.find((w) => !beforeIds.has(w.id)) ?? (flags["window-title"] ? after.find((w) => w.title === flags["window-title"]) : null) ?? after[0] ?? null;
  const shot = run(target ? ["screenshot", "--window-id", target.id, outPath] : ["screenshot", "--app", app, outPath]);
  if (!shot.ok) notes.push(describe("screenshot", shot));

  const read = matches(app, surface, ["--limit", "0"]);
  if (read.error && !GONE.has(read.error.code)) notes.push(describe("find", read));
  out({
    carried_out: carriedOut,
    note: notes.length ? notes.join("; ") : null,
    screenshot: shot.ok ? basename(outPath) : null,
    window: shot.ok ? target?.title ?? null : null,
    surface: read.list.length ? read.list.map((m) => m.name).filter(Boolean) : null,
  });
}

function matches(app, surface, extra) {
  const r = run(["find", "--app", app, "--surface", surface, ...extra]);
  return { list: r.ok ? r.data?.matches ?? [] : [], error: r.ok ? null : r.error };
}

function windows(app) {
  const r = run(["list-windows", "--app", app]);
  return r.ok && Array.isArray(r.data) ? r.data : [];
}

function settle(app, before) {
  const key = (list) => list.map((w) => w.id).sort().join(",");
  const start = Date.now();
  let now = windows(app);
  while (key(now) === key(before) && Date.now() - start < SETTLE_MS) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, POLL_MS);
    now = windows(app);
  }
  return now;
}

function describe(what, r) {
  const code = r.error?.code ?? "unknown error";
  const message = r.error?.message ? ` ${r.error.message}` : "";
  return `${what}: ${code}${message}`.slice(0, 200);
}

function run(args) {
  const r = spawnSync("agent-desktop", args, { encoding: "utf8", timeout: 15000 });
  if (r.error) return { ok: false, error: { code: r.error.code ?? "SPAWN_FAILED", message: r.error.code === "ENOENT" ? "agent-desktop not installed" : r.error.message } };
  const line = (r.stdout ?? "").trim().split("\n").filter(Boolean).pop() ?? "";
  try {
    const parsed = JSON.parse(line);
    return { ok: parsed.ok === true, data: parsed.data, error: parsed.error };
  } catch {
    const last = (r.stderr ?? "").split("\n").map((l) => l.trim()).filter(Boolean).pop();
    return { ok: false, error: { code: "UNPARSEABLE", message: last ? last.slice(0, 80) : "(no stderr)" } };
  }
}

function parse() {
  const string = { type: "string" };
  try {
    const { values, positionals } = parseArgs({ options: { app: string, surface: string, action: string, name: string, value: string, "window-title": string, out: string, since: string }, allowPositionals: true, strict: true });
    if (positionals.length > 1) usage(`unexpected argument: ${positionals[1]}`);
    return { command: positionals[0] ?? null, flags: values };
  } catch (e) {
    return usage(e.message);
  }
}

function need(key) {
  if (!flags[key]) usage(`--${key} is required`);
  return flags[key];
}

function out(obj) { process.stdout.write(JSON.stringify(obj) + "\n"); }
function fail(message, code) { process.stderr.write(message + "\n"); process.exit(code); }
function usage(message) { fail(`${message}\nusage: node native.mjs <permissions|apps|dismiss|step> [--key value ...]`, 2); }
