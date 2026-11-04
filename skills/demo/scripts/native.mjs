#!/usr/bin/env node
// Drive a desktop app's native UI (tray menu, dialogs, app menu) through agent-desktop.
//
// Usage: node native.mjs <subcommand> [--key value ...]   (flags may come in any order)
//   permissions                       → {"ok":true} | {"ok":false,"reason":"<why>","hint":"<what to do>"|null}
//   apps [--since <file>]             → one app name per line (list-apps), minus the names listed in <file>; exit 1 with one stderr line on failure
//   dismiss --app <name>              → {"dismissed":<n>,"open":<n>}
//   step --app <name> --surface <s> --action <click|check|uncheck|type|press> [--name <n>] [--value <v>]
//        [--window-title <t>] [--cdp <origin>] --out <png>
//                                     → {"carried_out","note","screenshot","window","surface","opened"}
// --surface takes tray, menu, dialog or app-menu, mapped per OS below; any other value is an agent-desktop surface name.
// --cdp is the app's DevTools origin: on win32 a dialog is an app window its /json/list does not show.
// Every subcommand but apps exits 0 with its JSON on stdout. A usage error prints one stderr line and exits 2.
// DEMO_NATIVE_SETTLE_MS overrides how long step waits for the window list to change after the action;
// DEMO_PLATFORM overrides process.platform (tests).

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, delimiter, join } from "node:path";
import { parseArgs } from "node:util";

const DECLINE = /^(cancel|no|close|dismiss|キャンセル|いいえ|閉じる)$/i;
const SETTLE_MS = Number.isFinite(Number(process.env.DEMO_NATIVE_SETTLE_MS)) ? Number(process.env.DEMO_NATIVE_SETTLE_MS) : 2000;
const POLL_MS = 250;
const ACTIONS = ["click", "check", "uncheck", "type", "press"];
const GONE = new Set(["ELEMENT_NOT_FOUND", "WINDOW_NOT_FOUND"]);
const PLATFORM = process.env.DEMO_PLATFORM || process.platform;
const UNDECLARED = Symbol("app windows the DevTools endpoint does not list");
const SURFACES = {
  darwin: { tray: ["menu-bar-extras"], menu: ["menu"], dialog: ["alert", "sheet", "focused"], "app-menu": ["menubar"] },
  linux: { tray: [], menu: ["menu"], dialog: ["alert", "sheet"], "app-menu": ["window"] },
  win32: { tray: ["menu"], menu: ["menu"], dialog: ["sheet", UNDECLARED], "app-menu": ["window"] },
}[PLATFORM] ?? {};
// Wayland reports screen_recording as unknown until a screenshot asks.
const USABLE = new Set(["granted", "not_required", ...(PLATFORM === "linux" ? ["unknown"] : [])]);
const HINT = {
  darwin: "`agent-desktop permissions --guide` opens the settings to grant them",
  linux: "run Claude Code inside the graphical session, with the AT-SPI bus running (`agent-desktop status` shows it)",
  win32: "run Claude Code at the app's integrity level (elevated only when the app is)",
}[PLATFORM] ?? null;
const BIN = binary();

const { command, flags } = parse();
const handlers = { permissions, apps, dismiss, step };
if (!handlers[command]) usage(`unknown subcommand: ${command ?? "(none)"}`);
await handlers[command]();

function permissions() {
  const r = run(["permissions"]);
  if (r.error?.code === "ENOENT") return out({ ok: false, reason: "agent-desktop not installed", hint: "install it with `npm i -g agent-desktop@latest`" });
  if (r.error?.code === "NOT_LINKED") return out({ ok: false, reason: r.error.message, hint: "reinstall it with its install script allowed: `npm install -g agent-desktop --allow-scripts=agent-desktop` (npm 11), or `npm install-scripts approve agent-desktop` (npm 12)" });
  if (!r.ok) return out({ ok: false, reason: describe("permissions", r), hint: null });
  const missing = ["accessibility", "screen_recording"].filter((k) => !USABLE.has(r.data?.[k]?.state));
  if (missing.length) return out({ ok: false, reason: `agent-desktop permission not granted: ${missing.join(", ")}`, hint: HINT });
  out({ ok: true });
}

function apps() {
  const r = run(["list-apps"]);
  if (!r.ok) fail(describe("list-apps", r), 1);
  const seen = new Set(flags.since && existsSync(flags.since) ? readFileSync(flags.since, "utf8").split("\n") : []);
  const names = (r.data?.apps ?? []).map((a) => a.name).filter((n) => n && !seen.has(n));
  process.stdout.write(names.map((n) => n + "\n").join(""));
}

async function dismiss() {
  const app = need("app");
  let dismissed = 0;
  const touched = [];
  for (const scope of await scopes(app, "dialog", [])) {
    const found = find(scope, ["--role", "button"]).list;
    if (!found.length) continue;
    touched.push(scope);
    const target = found.find((b) => DECLINE.test(b.name ?? ""));
    if (target?.ref_id && run(["click", target.ref_id]).ok) dismissed++;
  }
  out({ dismissed, open: touched.filter((scope) => find(scope, ["--role", "button"]).list.length).length });
}

async function step() {
  const app = need("app"), surface = need("surface"), action = need("action"), outPath = need("out");
  if (!ACTIONS.includes(action)) usage(`unknown --action: ${action}`);
  if (action !== "press" && !flags.name) usage("--name is required unless --action is press");
  if ((action === "type" || action === "press") && flags.value === undefined) usage(`--value is required with --action ${action}`);
  const notes = [];
  let carriedOut = true;

  const before = windows(app);
  let ref = null;
  if (action !== "press") {
    const list = await scopes(app, surface, before, { byName: true });
    let error = null, open = false, closed = null;
    for (const scope of list) {
      const found = find(scope, ["--name", flags.name, "--exact", "--limit", "1"]);
      ref = found.list[0]?.ref_id ?? null;
      if (ref) break;
      if (!found.error) open = true;
      else if (GONE.has(found.error.code)) closed ??= found.error;
      else error ??= found.error;
    }
    error ??= open ? null : closed;
    if (!ref) {
      carriedOut = false;
      notes.push(!list.length ? `${surface} is not reachable on ${PLATFORM}` : error ? describe("find", { error }) : `find: no element named "${flags.name}" on ${surface}`);
    }
  }
  let acted = null;
  if (carriedOut) {
    // A headless type is refused on Windows, where set-value writes the field without taking the keyboard.
    const args = action === "press" ? ["press", flags.value, "--app", app] : action === "type" ? [PLATFORM === "win32" ? "set-value" : "type", ref, flags.value] : [action, ref];
    const undelivered = (r) => !r.ok && (r.error?.disposition?.delivery ?? "not_delivered") === "not_delivered";
    acted = run(args);
    // A sheet replacing another can leave its button offscreen for a moment; nothing was delivered, so trying again is safe.
    if (undelivered(acted)) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, SETTLE_MS);
      acted = run(args);
    }
    if (!acted.ok) {
      notes.push(describe(action, acted));
      if (undelivered(acted)) carriedOut = false;
    }
  }

  const after = carriedOut ? settle(app, before) : before;
  const beforeIds = new Set(before.map((w) => w.id));
  const target = after.find((w) => !beforeIds.has(w.id)) ?? (flags["window-title"] ? after.find((w) => w.title === flags["window-title"]) : null) ?? after[0] ?? null;
  let shot = run(target ? ["screenshot", "--window-id", target.id, outPath] : ["screenshot", "--app", app, outPath]);
  // Wayland, and macOS while a parentless alert is up, capture no single window, only the whole display.
  if (!shot.ok) {
    shot = run(["screenshot", outPath], 35000);
    if (shot.ok) notes.push("screenshot: the window could not be captured alone, so the whole display was");
  }
  if (!shot.ok) notes.push(describe("screenshot", shot));

  const read = { list: [], error: null };
  for (const scope of await scopes(app, surface, after)) {
    const found = find(scope, ["--limit", "0"]);
    if (found.error && !GONE.has(found.error.code)) read.error ??= found.error;
    // alert and sheet can both answer with the same sheet, so the first surface that shows anything is the one read.
    if (found.list.length) {
      read.list.push(...found.list);
      break;
    }
  }
  if (read.error) notes.push(describe("find", read));
  const own = new Set(SURFACES[surface] ?? [surface]);
  const opened = [];
  for (const kind of new Set((acted?.data?.surfaces ?? []).map((o) => o?.type).filter((t) => typeof t === "string" && !own.has(t)))) {
    let found = find(["--app", app, "--surface", kind], ["--limit", "0"]);
    // A parentless macOS alert is not under the alert surface; the action just focused it.
    if (PLATFORM === "darwin" && kind === "alert" && GONE.has(found.error?.code)) found = find(["--app", app, "--surface", "focused"], ["--limit", "0"]);
    opened.push(...found.list.map((m) => m.name).filter(Boolean));
  }
  out({
    carried_out: carriedOut,
    note: notes.length ? notes.join("; ") : null,
    screenshot: shot.ok ? basename(outPath) : null,
    window: shot.ok ? target?.title ?? null : null,
    surface: read.list.length ? read.list.map((m) => m.name).filter(Boolean) : null,
    opened: opened.length ? opened : null,
  });
}

// The find scopes a surface name stands for on this OS.
// focused also holds a plain window's Close button, so only a lookup by name uses it.
async function scopes(app, surface, wins, { byName = false } = {}) {
  const list = [];
  for (const s of SURFACES[surface] ?? [surface]) {
    if (s === UNDECLARED) list.push(...(await undeclared(wins)).map((w) => ["--window-id", w.id]));
    else if (s !== "focused" || byName) list.push(["--app", app, "--surface", s]);
  }
  return list;
}

async function undeclared(wins) {
  if (!flags.cdp || !wins.length) return [];
  try {
    const res = await fetch(`${flags.cdp.replace(/\/+$/, "")}/json/list`, { signal: AbortSignal.timeout(5000) });
    const known = new Set((await res.json()).filter((t) => t.type === "page").flatMap((t) => [t.title, t.url]));
    return wins.filter((w) => w.title && w.visible !== false && !known.has(w.title)).sort((a, b) => Number(Boolean(b.is_focused)) - Number(Boolean(a.is_focused)));
  } catch {
    return [];
  }
}

function find(scope, extra) {
  const r = run(["find", ...scope, ...extra]);
  const list = r.ok ? r.data?.matches ?? [] : [];
  return { list: scope.at(-1) === "focused" ? list.filter((m) => /^dialog/.test(m.path?.[0] ?? "")) : list, error: r.ok ? null : r.error };
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

function run(args, timeout = 15000) {
  if (BIN.error) return { ok: false, error: BIN.error };
  const r = spawnSync(BIN.path, args, { encoding: "utf8", timeout, windowsHide: true });
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

// On win32 npm puts agent-desktop.cmd on PATH, which spawnSync cannot run without a shell; the install
// script rewrites it to call the native exe, so that exe is taken from it.
function binary() {
  if (PLATFORM !== "win32") return { path: "agent-desktop" };
  for (const dir of (process.env.PATH ?? "").split(delimiter).filter(Boolean)) {
    const exe = join(dir, "agent-desktop.exe");
    if (existsSync(exe)) return { path: exe };
    const cmd = join(dir, "agent-desktop.cmd");
    if (!existsSync(cmd)) continue;
    const linked = /"([^"]+\.exe)"\s+%\*/i.exec(readFileSync(cmd, "utf8"))?.[1];
    if (linked && existsSync(linked)) return { path: linked };
    return { error: { code: "NOT_LINKED", message: "agent-desktop.cmd does not call the native binary" } };
  }
  return { error: { code: "ENOENT", message: "agent-desktop not installed" } };
}

function parse() {
  const string = { type: "string" };
  try {
    const { values, positionals } = parseArgs({ options: { app: string, surface: string, action: string, name: string, value: string, "window-title": string, out: string, since: string, cdp: string }, allowPositionals: true, strict: true });
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
