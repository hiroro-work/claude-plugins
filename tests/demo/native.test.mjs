// native.mjs: every subcommand against a fake agent-desktop placed first on PATH. The fake answers from a
// scenario (a list of { args: <prefix>, replies: [<envelope>, ...] }, each reply consumed in order) and logs
// every call it receives, so a test can check which flags the script passed.
// A Windows host runs no script as an executable, so there the fake is a link to node.exe that loads the
// script through NODE_OPTIONS, and PATH holds nothing else, so the real agent-desktop is never reached.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { chmodSync, copyFileSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, delimiter } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "demo", "scripts", "native.mjs");
const WIN_HOST = process.platform === "win32";

const FAKE = `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
// Loaded through NODE_OPTIONS, it also runs inside native.mjs's own node, where it must stay out of the way.
if (require.main !== module && !/^(ad|agent-desktop)\\.exe$/i.test(path.basename(process.execPath))) return;
// node takes the first argument for its script and resolves it, so the subcommand is its base name.
const args = require.main === module ? process.argv.slice(2) : [path.basename(process.argv[1]), ...process.argv.slice(2)];
fs.appendFileSync(process.env.FAKE_AGENT_DESKTOP_LOG, JSON.stringify(args) + "\\n");
const scenario = JSON.parse(fs.readFileSync(process.env.FAKE_AGENT_DESKTOP, "utf8"));
const state = JSON.parse(fs.readFileSync(process.env.FAKE_AGENT_DESKTOP + ".state", "utf8"));
const i = scenario.findIndex((s) => s.args.every((a, k) => args[k] === a));
if (i < 0) { console.log(JSON.stringify({ ok: false, error: { code: "FAKE_UNMATCHED", message: args.join(" ") } })); process.exit(0); }
const n = state[i] ?? 0;
const replies = scenario[i].replies;
state[i] = n + 1;
fs.writeFileSync(process.env.FAKE_AGENT_DESKTOP + ".state", JSON.stringify(state));
console.log(JSON.stringify(replies[Math.min(n, replies.length - 1)]));
`;

const ok = (data) => ({ ok: true, data });
const err = (code, delivery = "not_delivered") => ({ ok: false, error: { code, message: code, disposition: { delivery } } });
const button = (name, e) => ({ ref_id: `@s1:e${e}`, role: "button", name });
const parse = (s) => { try { return JSON.parse(s.trim().split("\n").pop()); } catch { return null; } };
// A Windows menu item as the menu snapshot shows it, row `row` from the top; a 0×0 item is one the menu hides.
const item = (name, row, states = [], role = "menuitem") => ({ role, name, states, ref_id: `@s9:e${row}`, bounds: row ? { x: 100, y: 100 + 40 * row, width: 200, height: 40 } : { x: 0, y: 0, width: 0, height: 0 } });
const menu = (items) => ({ role: "menu", children: items });

// The Windows fake, made once per process: bin/agent-desktop.exe and ad.exe link node.exe, and env loads the script.
let windowsFakeMade = null;
function windowsFake() {
  if (windowsFakeMade) return windowsFakeMade;
  const dir = mkdtempSync(join(tmpdir(), "native-fake-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  const exe = join(bin, "agent-desktop.exe");
  try { linkSync(process.execPath, exe); } catch { copyFileSync(process.execPath, exe); }
  linkSync(exe, join(dir, "ad.exe"));
  writeFileSync(join(dir, "fake.cjs"), FAKE);
  process.on("exit", () => rmSync(dir, { recursive: true, force: true }));
  // NODE_OPTIONS reads a backslash inside quotes as an escape.
  return (windowsFakeMade = { bin, ad: join(dir, "ad.exe"), env: { NODE_OPTIONS: `--require "${join(dir, "fake.cjs").replaceAll("\\", "/")}"` } });
}

// Runs the script with the fake first on PATH (or absent, with `installed: false`); returns stdout, status and the calls logged.
// `shim` puts the fake behind a Windows agent-desktop.cmd instead: "linked" calls it as an exe, "unlinked" does not.
function run(args, scenario, { installed = true, env = {}, files = {}, shim = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "native-"));
  try {
    const bin = join(dir, "bin");
    const scenarioPath = join(dir, "scenario.json");
    const log = join(dir, "calls.log");
    writeFileSync(scenarioPath, JSON.stringify(scenario));
    writeFileSync(scenarioPath + ".state", "{}");
    writeFileSync(log, "");
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
    let PATH = join(dir, "empty");
    const fake = WIN_HOST ? windowsFake() : null;
    const place = (file) => {
      writeFileSync(file, FAKE.replace("/usr/bin/env node", process.execPath));
      chmodSync(file, 0o755);
    };
    if (shim) {
      mkdirSync(bin, { recursive: true });
      const ad = fake?.ad ?? join(bin, "ad.exe");
      if (!fake) place(ad);
      writeFileSync(join(bin, "agent-desktop.cmd"), shim === "linked" ? `@echo off\r\n"${ad}" %*\r\nexit /b %errorlevel%\r\n` : `@ECHO off\r\n"%_prog%" "%dp0%\\node_modules\\agent-desktop\\bin\\agent-desktop" %*\r\n`);
      PATH = bin;
    } else if (installed && fake) {
      PATH = fake.bin;
    } else if (installed) {
      mkdirSync(bin, { recursive: true });
      place(join(bin, "agent-desktop"));
      PATH = bin + delimiter + process.env.PATH;
    }
    let stdout = "", status = 0, stderr = "";
    try {
      const inherited = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^path$/i.test(k)));
      stdout = execFileSync(process.execPath, [script, ...args.map((a) => a.replace("<dir>", dir))], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...inherited, PATH, DEMO_NATIVE_SETTLE_MS: "0", DEMO_PLATFORM: "darwin", ...env, ...fake?.env, FAKE_AGENT_DESKTOP: scenarioPath, FAKE_AGENT_DESKTOP_LOG: log } });
    } catch (e) { status = e.status; stdout = e.stdout ?? ""; stderr = e.stderr ?? ""; }
    const calls = readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    return { stdout, stderr, status, calls, json: parse(stdout) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

describe("native", { concurrency: true }, () => {

test("permissions: granted, one denied, a crash, and agent-desktop absent", () => {
  const granted = { accessibility: { state: "granted" }, screen_recording: { state: "granted" }, automation: { state: "unknown" } };
  assert.deepEqual(run(["permissions"], [{ args: ["permissions"], replies: [ok(granted)] }]).json, { ok: true });
  const denied = run(["permissions"], [{ args: ["permissions"], replies: [ok({ ...granted, screen_recording: { state: "denied" } })] }]).json;
  assert.equal(denied.reason, "agent-desktop permission not granted: screen_recording");
  assert.match(denied.hint, /permissions --guide/);
  const crashed = run(["permissions"], [{ args: ["permissions"], replies: [err("APP_UNRESPONSIVE")] }]).json;
  assert.deepEqual(crashed, { ok: false, reason: "permissions: APP_UNRESPONSIVE APP_UNRESPONSIVE", hint: null });
  const absent = run(["permissions"], [], { installed: false }).json;
  assert.equal(absent.reason, "agent-desktop not installed");
  assert.match(absent.hint, /npm i -g agent-desktop/);
});

test("apps lists the names list-apps reports, one per line, minus those in --since", () => {
  const scenario = [{ args: ["list-apps"], replies: [ok({ apps: [{ name: "Electron", pid: 1 }, { name: "Finder", pid: 2 }] })] }];
  const r = run(["apps"], scenario);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, "Electron\nFinder\n");
  assert.equal(run(["apps", "--since", "<dir>/before.txt"], scenario, { files: { "before.txt": "Finder\n" } }).stdout, "Electron\n");
  const absent = run(["apps"], [], { installed: false });
  assert.equal(absent.status, 1);
  assert.match(absent.stderr, /not installed/);
});

test("dismiss clicks the declining button of an open alert and reports what is left", () => {
  const scenario = [
    { args: ["find", "--app", "Electron", "--surface", "alert"], replies: [ok({ matches: [button("Yes", 1), button("いいえ", 2)] }), ok({ matches: [] })] },
    { args: ["find", "--app", "Electron", "--surface", "sheet"], replies: [err("WINDOW_NOT_FOUND")] },
    { args: ["click"], replies: [ok({ disposition: { delivery: "delivered_unverified" } })] },
  ];
  const r = run(["dismiss", "--app", "Electron"], scenario);
  assert.deepEqual(r.json, { dismissed: 1, open: 0 });
  assert.deepEqual(r.calls.find((c) => c[0] === "click"), ["click", "@s1:e2"]);

  const none = run(["dismiss", "--app", "Electron"], [{ args: ["find"], replies: [err("WINDOW_NOT_FOUND")] }]);
  assert.deepEqual(none.json, { dismissed: 0, open: 0 });
  assert.equal(none.calls.length, 2, "alert and sheet are read once each when nothing is open");

  const unknown = run(["dismiss", "--app", "Electron"], [{ args: ["find", "--app", "Electron", "--surface", "alert"], replies: [ok({ matches: [button("Delete", 1), button("Keep", 2)] })] }, { args: ["find"], replies: [err("WINDOW_NOT_FOUND")] }]);
  assert.deepEqual(unknown.json, { dismissed: 0, open: 1 });
  assert.ok(!unknown.calls.some((c) => c[0] === "click"), "a dialog without a declining button is left alone");
});

test("step clicks the named item, screenshots the window that appeared and reads the surface again", () => {
  const main = { id: "w-1", title: "Main", app_name: "Electron" };
  const dialog = { id: "w-2", title: "Electron", app_name: "Electron" };
  const scenario = [
    { args: ["list-windows", "--app", "Electron"], replies: [ok([main]), ok([main, dialog])] },
    { args: ["find", "--app", "Electron", "--surface", "menu-bar-extras", "--name", "Use proxy", "--exact", "--limit", "1"], replies: [ok({ matches: [{ ref_id: "@s1:e7", role: "menuitem", name: "Use proxy" }] })] },
    { args: ["click", "@s1:e7"], replies: [ok({ disposition: { delivery: "delivered_unverified" }, surfaces: [{ type: "alert" }] })] },
    { args: ["screenshot"], replies: [ok({ path: "step-01.png" })] },
    { args: ["find", "--app", "Electron", "--surface", "menu-bar-extras", "--limit", "0"], replies: [ok({ matches: [{ ref_id: "@s2:e1", role: "menuitem", name: "Use proxy", states: ["checked"] }, { role: "textfield", value: "secret" }] })] },
  ];
  const r = run(["--app", "Electron", "step", "--surface", "menu-bar-extras", "--name", "Use proxy", "--action", "click", "--window-title", "Main", "--out", "/tmp/x/step-01.png"], scenario);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.json, { carried_out: true, note: null, screenshot: "step-01.png", window: "Electron", surface: ["Use proxy"], opened: null });
  assert.deepEqual(r.calls.find((c) => c[0] === "screenshot"), ["screenshot", "--window-id", "w-2", "/tmp/x/step-01.png"]);
  assert.ok(r.calls.every((c) => !c.includes("--headed") && !c.includes("--force")), "never headed or forced");
});

test("step keeps polling the window list until it changes", () => {
  const main = { id: "w-1", title: "Main" }, dialog = { id: "w-2", title: "Electron" };
  const scenario = [
    { args: ["list-windows"], replies: [ok([main]), ok([main]), ok([main]), ok([main, dialog])] },
    { args: ["find", "--app", "Electron", "--surface", "menu-bar-extras", "--name"], replies: [ok({ matches: [button("Toggle", 1)] })] },
    { args: ["click"], replies: [ok({})] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find"], replies: [ok({ matches: [] })] },
  ];
  const r = run(["step", "--app", "Electron", "--surface", "menu-bar-extras", "--name", "Toggle", "--action", "click", "--out", "s.png"], scenario, { env: { DEMO_NATIVE_SETTLE_MS: "10000" } });
  assert.equal(r.calls.filter((c) => c[0] === "list-windows").length, 4);
  assert.equal(r.json.window, "Electron");
  assert.equal(r.json.surface, null);
});

test("step falls back to the window named by --window-title, and still screenshots a missing element", () => {
  const main = { id: "w-1", title: "Main" }, other = { id: "w-0", title: "Electron" };
  const scenario = [
    { args: ["list-windows"], replies: [ok([other, main])] },
    { args: ["find", "--app", "Electron", "--surface", "alert", "--name", "No", "--exact"], replies: [ok({ matches: [button("No", 3)] })] },
    { args: ["click"], replies: [ok({ disposition: { delivery: "delivered" } })] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find", "--app", "Electron", "--surface", "alert", "--limit"], replies: [err("ELEMENT_NOT_FOUND")] },
  ];
  const r = run(["step", "--app", "Electron", "--surface", "alert", "--name", "No", "--action", "click", "--window-title", "Main", "--out", "s.png"], scenario);
  assert.deepEqual(r.json, { carried_out: true, note: null, screenshot: "s.png", window: "Main", surface: null, opened: null });

  const missing = run(["step", "--app", "Electron", "--surface", "alert", "--name", "Maybe", "--action", "click", "--out", "s.png"], [
    { args: ["list-windows"], replies: [ok([main])] },
    { args: ["find", "--app", "Electron", "--surface", "alert", "--name"], replies: [err("ELEMENT_NOT_FOUND")] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find"], replies: [err("TIMEOUT")] },
  ]);
  assert.equal(missing.json.carried_out, false);
  assert.match(missing.json.note, /find: ELEMENT_NOT_FOUND.*find: TIMEOUT/);
  assert.equal(missing.json.screenshot, "s.png");
  assert.ok(!missing.calls.some((c) => c[0] === "click"), "no action on a missing element");
  assert.deepEqual(missing.calls.find((c) => c[0] === "screenshot"), ["screenshot", "--window-id", "w-1", "s.png"]);
});

test("step: an action agent-desktop did not deliver fails the step; a press needs no element and names the app", () => {
  const undelivered = run(["step", "--app", "Electron", "--surface", "alert", "--name", "No", "--action", "click", "--out", "s.png"], [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["find", "--app", "Electron", "--surface", "alert", "--name"], replies: [ok({ matches: [button("No", 1)] })] },
    { args: ["click"], replies: [err("STALE_REF")] },
    { args: ["screenshot"], replies: [err("PERM_DENIED")] },
    { args: ["find"], replies: [err("ELEMENT_NOT_FOUND")] },
  ]);
  assert.equal(undelivered.json.carried_out, false);
  assert.match(undelivered.json.note, /click: STALE_REF.*screenshot: PERM_DENIED/);
  assert.equal(undelivered.json.screenshot, null);

  const pressed = run(["step", "--app", "Electron", "--surface", "alert", "--action", "press", "--value", "escape", "--out", "s.png"], [
    { args: ["list-windows"], replies: [ok([{ id: "w-1", title: "Electron" }])] },
    { args: ["press", "escape", "--app", "Electron"], replies: [ok({ disposition: { delivery: "delivered" } })] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find"], replies: [err("ELEMENT_NOT_FOUND")] },
  ]);
  assert.equal(pressed.json.carried_out, true);
  assert.ok(!pressed.calls.some((c) => c[0] === "find" && c.includes("--name")), "press looks nothing up first");
});

// A DevTools endpoint in its own process: the script runs synchronously, so this process could not answer.
async function devtools(pages) {
  const body = JSON.stringify(pages);
  const child = spawn(process.execPath, ["-e", `const s=require("http").createServer((q,r)=>r.end(${JSON.stringify(body)})).listen(0,"127.0.0.1",()=>console.log(s.address().port))`], { stdio: ["ignore", "pipe", "ignore"] });
  const port = await new Promise((resolve) => child.stdout.once("data", (d) => resolve(String(d).trim())));
  return { origin: `http://127.0.0.1:${port}`, close: () => child.kill() };
}

test("linux and win32 accept the states their platform reports, with their own hint", () => {
  const states = (sr) => [{ args: ["permissions"], replies: [ok({ accessibility: { state: "granted" }, screen_recording: { state: sr }, automation: { state: "not_required" } })] }];
  assert.deepEqual(run(["permissions"], states("unknown"), { env: { DEMO_PLATFORM: "linux" } }).json, { ok: true });
  assert.deepEqual(run(["permissions"], states("not_required"), { env: { DEMO_PLATFORM: "linux" } }).json, { ok: true });
  assert.deepEqual(run(["permissions"], states("not_required"), { shim: "linked", env: { DEMO_PLATFORM: "win32" } }).json, { ok: true });
  assert.equal(run(["permissions"], states("unknown"), { env: { DEMO_PLATFORM: "darwin" } }).json.ok, false);
  assert.match(run(["permissions"], states("denied"), { env: { DEMO_PLATFORM: "linux" } }).json.hint, /AT-SPI/);
});

test("win32 runs the exe the linked agent-desktop.cmd names, and stops on one that is not linked", () => {
  const scenario = [{ args: ["permissions"], replies: [ok({ accessibility: { state: "granted" }, screen_recording: { state: "granted" } })] }];
  const linked = run(["permissions"], scenario, { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.deepEqual(linked.json, { ok: true });
  assert.deepEqual(linked.calls, [["permissions"]]);
  const unlinked = run(["permissions"], scenario, { shim: "unlinked", env: { DEMO_PLATFORM: "win32" } });
  assert.equal(unlinked.json.reason, "agent-desktop.cmd does not call the native binary");
  assert.match(unlinked.json.hint, /--allow-scripts=agent-desktop/);
  assert.match(unlinked.json.hint, /node scripts\/postinstall\.js/);
  assert.deepEqual(unlinked.calls, []);
});

test("logical surfaces map per OS: dialog searches alert then sheet; tray is the app's own menu on win32 and unreachable on linux", () => {
  for (const platform of ["darwin", "linux"]) {
    const r = run(["step", "--app", "Electron", "--surface", "dialog", "--name", "OK", "--action", "click", "--out", "s.png"], [
      { args: ["list-windows"], replies: [ok([])] },
      { args: ["find", "--app", "Electron", "--surface", "alert", "--name"], replies: [err("ELEMENT_NOT_FOUND")] },
      { args: ["find", "--app", "Electron", "--surface", "sheet", "--name"], replies: [ok({ matches: [button("OK", 4)] })] },
      { args: ["click"], replies: [ok({})] },
      { args: ["screenshot"], replies: [ok({})] },
      { args: ["find"], replies: [err("ELEMENT_NOT_FOUND")] },
    ], { env: { DEMO_PLATFORM: platform } });
    assert.equal(r.json.carried_out, true, platform);
    assert.deepEqual(r.calls.find((c) => c[0] === "click"), ["click", "@s1:e4"]);
  }
  const trayArgs = ["step", "--app", "Electron", "--surface", "tray", "--name", "Quit", "--action", "click", "--out", "s.png"];
  const tray = run(trayArgs, [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["snapshot", "--app", "Electron", "--surface", "menu"], replies: [ok({ tree: menu([item("Quit", 5)]) })] },
    { args: ["mouse-click"], replies: [ok({})] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find"], replies: [ok({ matches: [] })] },
  ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.equal(tray.json.carried_out, true);
  assert.ok(!tray.calls.some((c) => c.includes("system-tray") || c.includes("taskbar")), "an open menu is used as it is; the shell is never searched");
  const linux = run(trayArgs, [{ args: ["list-windows"], replies: [ok([])] }, { args: ["screenshot"], replies: [ok({})] }], { env: { DEMO_PLATFORM: "linux" } });
  assert.equal(linux.json.carried_out, false);
  assert.equal(linux.json.note, "tray is not reachable on linux");
  assert.ok(!linux.calls.some((c) => c[0] === "find"));
});

test("a surface that is not open does not hide that the name was not found", () => {
  const r = run(["step", "--app", "Electron", "--surface", "dialog", "--name", "Maybe", "--action", "click", "--out", "s.png"], [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["find", "--app", "Electron", "--surface", "alert"], replies: [err("ELEMENT_NOT_FOUND")] },
    { args: ["find", "--app", "Electron", "--surface", "sheet"], replies: [ok({ matches: [] })] },
    { args: ["find", "--app", "Electron", "--surface", "focused"], replies: [ok({ matches: [] })] },
    { args: ["screenshot"], replies: [ok({})] },
  ]);
  assert.equal(r.json.carried_out, false);
  assert.equal(r.json.note, 'find: no element named "Maybe" on dialog');
});

test("a window that cannot be captured alone falls back to the whole display", () => {
  const scenario = (fallback) => [
    { args: ["list-windows"], replies: [ok([{ id: "w-1", title: "Main" }])] },
    { args: ["press"], replies: [ok({})] },
    { args: ["screenshot", "--window-id"], replies: [err("PLATFORM_NOT_SUPPORTED")] },
    { args: ["screenshot"], replies: [fallback] },
    { args: ["find"], replies: [err("ELEMENT_NOT_FOUND")] },
  ];
  const args = ["step", "--app", "Electron", "--surface", "dialog", "--action", "press", "--value", "escape", "--out", "s.png"];
  const r = run(args, scenario(ok({})), { env: { DEMO_PLATFORM: "linux" } });
  assert.equal(r.json.screenshot, "s.png");
  assert.match(r.json.note, /whole display/);
  assert.deepEqual(r.calls.filter((c) => c[0] === "screenshot").pop(), ["screenshot", "s.png"]);
  const failed = run(args, scenario(err("PERM_DENIED")), { env: { DEMO_PLATFORM: "linux" } });
  assert.equal(failed.json.screenshot, null);
  assert.equal(failed.json.note, "screenshot: PERM_DENIED PERM_DENIED");
});

test("win32: type goes as set-value", () => {
  const typed = run(["step", "--app", "Electron", "--surface", "sheet", "--name", "Name", "--action", "type", "--value", "Ada", "--out", "s.png"], [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["find"], replies: [ok({ matches: [{ ref_id: "@s1:e9", role: "textfield", name: "Name" }] })] },
    { args: ["set-value"], replies: [ok({})] },
    { args: ["screenshot"], replies: [ok({})] },
  ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.deepEqual(typed.calls.find((c) => c[0] === "set-value"), ["set-value", "@s1:e9", "Ada"]);
});

test("win32: a step's dialog is a visible, titled app window the DevTools endpoint does not list; dismiss leaves such windows alone", async () => {
  const cdp = await devtools([{ type: "page", title: "Main", url: "app://index.html" }, { type: "service_worker", title: "Confirm" }]);
  try {
    const wins = [{ id: "w-1", title: "Main" }, { id: "w-2", title: "Confirm" }, { id: "w-3", title: "Helper", visible: false }, { id: "w-4", title: "" }, { id: "w-5", title: "app://index.html" }];
    const r = run(["step", "--app", "Electron", "--surface", "dialog", "--name", "OK", "--action", "click", "--cdp", cdp.origin + "/", "--out", "s.png"], [
      { args: ["list-windows", "--app", "Electron"], replies: [ok(wins)] },
      { args: ["find", "--app", "Electron", "--surface", "sheet"], replies: [err("ELEMENT_NOT_FOUND")] },
      { args: ["find", "--window-id", "w-2", "--name"], replies: [ok({ matches: [button("OK", 1)] })] },
      { args: ["click"], replies: [ok({})] },
      { args: ["screenshot"], replies: [ok({})] },
      { args: ["find"], replies: [err("WINDOW_NOT_FOUND")] },
    ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
    assert.equal(r.json.carried_out, true);
    assert.deepEqual(r.calls.find((c) => c[0] === "click"), ["click", "@s1:e1"]);
    for (const id of ["w-1", "w-3", "w-4", "w-5"]) assert.ok(!r.calls.some((c) => c[0] === "find" && c.includes(id) && c.includes("--name")), `${id} is not searched`);

    const missing = run(["step", "--app", "Electron", "--surface", "dialog", "--name", "Maybe", "--action", "click", "--cdp", cdp.origin, "--out", "s.png"], [
      { args: ["list-windows", "--app", "Electron"], replies: [ok(wins)] },
      { args: ["find", "--app", "Electron", "--surface", "sheet"], replies: [ok({ matches: [] })] },
      { args: ["find", "--window-id", "w-2"], replies: [err("WINDOW_NOT_FOUND")] },
      { args: ["screenshot"], replies: [ok({})] },
    ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
    assert.equal(missing.json.note, 'find: no element named "Maybe" on dialog', "an open sheet outweighs a dialog window that closed");

    const dismissed = run(["dismiss", "--app", "Electron"], [
      { args: ["find", "--app", "Electron", "--surface", "sheet"], replies: [err("ELEMENT_NOT_FOUND")] },
    ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
    assert.deepEqual(dismissed.json, { dismissed: 0, open: 0 });
    assert.deepEqual(dismissed.calls, [["find", "--app", "Electron", "--surface", "sheet", "--role", "button"]]);
  } finally {
    cdp.close();
  }
});

test("win32: an unreachable DevTools endpoint leaves no window counted as a dialog", () => {
  const r = run(["step", "--app", "Electron", "--surface", "dialog", "--name", "OK", "--action", "click", "--cdp", "http://127.0.0.1:1", "--out", "s.png"], [
    { args: ["list-windows"], replies: [ok([{ id: "w-2", title: "Confirm" }])] },
    { args: ["find", "--app", "Electron", "--surface", "sheet"], replies: [err("ELEMENT_NOT_FOUND")] },
    { args: ["screenshot"], replies: [ok({})] },
  ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.equal(r.json.carried_out, false);
  assert.ok(!r.calls.some((c) => c.includes("--window-id") && c[0] === "find"));
});

test("an action not delivered is sent once more, and the surface is read from the first one that shows anything", () => {
  const sheet = { matches: [{ role: "statictext", name: "Sit down?" }, button("Yes", 1)] };
  const r = run(["step", "--app", "Electron", "--surface", "dialog", "--name", "Yes", "--action", "click", "--out", "s.png"], [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["find", "--app", "Electron", "--surface", "alert", "--name"], replies: [ok({ matches: [button("Yes", 1)] })] },
    { args: ["click"], replies: [err("ACTION_FAILED"), ok({})] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find", "--app", "Electron", "--surface", "alert", "--limit"], replies: [ok(sheet)] },
    { args: ["find", "--app", "Electron", "--surface", "sheet", "--limit"], replies: [ok(sheet)] },
  ]);
  assert.equal(r.json.carried_out, true);
  assert.equal(r.json.note, null);
  assert.equal(r.calls.filter((c) => c[0] === "click").length, 2);
  assert.deepEqual(r.json.surface, ["Sit down?", "Yes"]);
  assert.ok(!r.calls.some((c) => c.join(" ") === "find --app Electron --surface sheet --limit 0"));
});

test("darwin: a parentless alert is found through focused by name, but never read or dismissed through it", () => {
  const r = run(["step", "--app", "Electron", "--surface", "dialog", "--name", "OK", "--action", "click", "--out", "s.png"], [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["find", "--app", "Electron", "--surface", "alert"], replies: [err("ELEMENT_NOT_FOUND")] },
    { args: ["find", "--app", "Electron", "--surface", "sheet"], replies: [err("ELEMENT_NOT_FOUND")] },
    { args: ["find", "--app", "Electron", "--surface", "focused", "--name"], replies: [ok({ matches: [{ ...button("OK", 6), path: ["dialog:alert"] }] })] },
    { args: ["click"], replies: [ok({})] },
    { args: ["screenshot"], replies: [ok({})] },
  ]);
  assert.equal(r.json.carried_out, true);
  assert.deepEqual(r.calls.find((c) => c[0] === "click"), ["click", "@s1:e6"]);
  assert.ok(!r.calls.some((c) => c.includes("focused") && c.includes("--limit") && c.includes("0")), "the read after the action leaves focused alone");

  const dismissed = run(["dismiss", "--app", "Electron"], [{ args: ["find"], replies: [err("ELEMENT_NOT_FOUND")] }]);
  assert.ok(!dismissed.calls.some((c) => c.includes("focused")), "dismiss never searches focused, which holds a plain window's Close button");
});

test("darwin: under focused only a dialog's elements count, so a missing dialog never reaches the main window", () => {
  const r = run(["step", "--app", "Electron", "--surface", "dialog", "--name", "Close", "--action", "click", "--out", "s.png"], [
    { args: ["list-windows"], replies: [ok([{ id: "w-1", title: "Main" }])] },
    { args: ["find", "--app", "Electron", "--surface", "alert"], replies: [err("ELEMENT_NOT_FOUND")] },
    { args: ["find", "--app", "Electron", "--surface", "sheet"], replies: [err("ELEMENT_NOT_FOUND")] },
    { args: ["find", "--app", "Electron", "--surface", "focused"], replies: [ok({ matches: [{ ...button("Close", 1), path: ["window", "toolbar"] }, button("Close", 2)] })] },
    { args: ["screenshot"], replies: [ok({})] },
  ]);
  assert.equal(r.json.carried_out, false);
  assert.equal(r.json.note, 'find: no element named "Close" on dialog');
  assert.ok(!r.calls.some((c) => c[0] === "click"));
});

test("step reports what the action opened, reading a parentless macOS alert through focused", () => {
  const scenario = (platform) => [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["find", "--app", "Electron", "--surface", platform === "darwin" ? "menu-bar-extras" : "menu", "--name"], replies: [ok({ matches: [button("About", 2)] })] },
    { args: ["click"], replies: [ok({ surfaces: [{ type: "alert" }, { type: "menu" }, { type: "window" }] })] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find", "--app", "Electron", "--surface", "alert"], replies: [err("ELEMENT_NOT_FOUND")] },
    { args: ["find", "--app", "Electron", "--surface", "focused"], replies: [ok({ matches: [{ role: "statictext", name: "Version 1.2.3", path: ["dialog"] }, { ...button("OK", 3), path: ["dialog"] }, { ...button("Close", 9), path: ["window"] }] })] },
    { args: ["find"], replies: [ok({ matches: [] })] },
  ];
  const args = ["step", "--app", "Electron", "--surface", "tray", "--name", "About", "--action", "click", "--out", "s.png"];
  const mac = run(args, scenario("darwin"));
  assert.deepEqual(mac.json.opened, ["Version 1.2.3", "OK"]);
  assert.ok(mac.calls.some((c) => c.join(" ") === "find --app Electron --surface menu --limit 0"), "an opened menu is read too");
  assert.ok(!mac.calls.some((c) => c.join(" ") === "find --app Electron --surface window --limit 0"), "the app window the action left focused is not an opened surface");
  const win = run(args, scenario("win32"), { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.equal(win.json.opened, null, "off macOS a missing alert is not looked for through focused");
  assert.ok(!win.calls.some((c) => c.includes("focused")));
});

test("a failed window screenshot is taken again of the whole display, whatever the reason", () => {
  const r = run(["step", "--app", "Electron", "--surface", "dialog", "--action", "press", "--value", "escape", "--out", "s.png"], [
    { args: ["list-windows"], replies: [ok([{ id: "w-1", title: "Main" }])] },
    { args: ["press"], replies: [ok({})] },
    { args: ["screenshot", "--window-id"], replies: [err("TIMEOUT")] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find"], replies: [err("ELEMENT_NOT_FOUND")] },
  ]);
  assert.equal(r.json.screenshot, "s.png");
  assert.match(r.json.note, /whole display/);
});

test("access keys: dismiss prefers いいえ(N) over the title bar's 閉じる, and step finds はい(Y) by はい", () => {
  const dismissed = run(["dismiss", "--app", "Electron"], [
    { args: ["find", "--app", "Electron", "--surface", "alert"], replies: [ok({ matches: [button("はい(Y)", 1), button("閉じる", 2), button("いいえ(N)", 3)] }), ok({ matches: [] })] },
    { args: ["find", "--app", "Electron", "--surface", "sheet"], replies: [err("WINDOW_NOT_FOUND")] },
    { args: ["click"], replies: [ok({})] },
  ]);
  assert.deepEqual(dismissed.json, { dismissed: 1, open: 0 });
  assert.deepEqual(dismissed.calls.find((c) => c[0] === "click"), ["click", "@s1:e3"]);

  const r = run(["step", "--app", "Electron", "--surface", "alert", "--name", "はい", "--action", "click", "--out", "s.png"], [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["find", "--app", "Electron", "--surface", "alert", "--name", "はい", "--exact"], replies: [ok({ matches: [] })] },
    { args: ["find", "--app", "Electron", "--surface", "alert", "--name", "はい", "--limit", "0"], replies: [ok({ matches: [button("はいはい", 4), button("はい(Y)", 5)] })] },
    { args: ["click"], replies: [ok({})] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find"], replies: [err("ELEMENT_NOT_FOUND")] },
  ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.equal(r.json.carried_out, true);
  assert.deepEqual(r.calls.find((c) => c[0] === "click"), ["click", "@s1:e5"]);
});

test("win32: a window titled like a page counts as a dialog when it shows no page but a button", async () => {
  const cdp = await devtools([{ type: "page", title: "Sample App", url: "app://index.html" }]);
  try {
    const wins = [{ id: "w-1", title: "Sample App" }, { id: "w-2", title: "Sample App", is_focused: true }];
    const r = run(["step", "--app", "Electron", "--surface", "dialog", "--name", "いいえ", "--action", "click", "--cdp", cdp.origin, "--out", "s.png"], [
      { args: ["list-windows", "--app", "Electron"], replies: [ok(wins)] },
      { args: ["find", "--app", "Electron", "--surface", "sheet"], replies: [err("WINDOW_NOT_FOUND")] },
      { args: ["find", "--window-id", "w-1", "--role", "document"], replies: [ok({ matches: [{ role: "document", name: "Sample App" }] })] },
      { args: ["find", "--window-id", "w-2", "--role", "document"], replies: [ok({ matches: [] })] },
      { args: ["find", "--window-id", "w-2", "--role", "button"], replies: [ok({ matches: [button("はい(Y)", 1)] })] },
      { args: ["find", "--window-id", "w-2", "--name", "いいえ", "--exact"], replies: [ok({ matches: [] })] },
      { args: ["find", "--window-id", "w-2", "--name", "いいえ", "--limit", "0"], replies: [ok({ matches: [button("いいえ(N)", 2)] })] },
      { args: ["click"], replies: [ok({})] },
      { args: ["screenshot"], replies: [ok({})] },
      { args: ["find"], replies: [err("WINDOW_NOT_FOUND")] },
    ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
    assert.equal(r.json.carried_out, true, r.json.note);
    assert.deepEqual(r.calls.find((c) => c[0] === "click"), ["click", "@s1:e2"]);
    assert.ok(!r.calls.some((c) => c[0] === "find" && c.includes("w-1") && c.includes("--name")), "the window showing a page is not searched");
  } finally {
    cdp.close();
  }
});

test("win32 tray: with no menu open, the icon the taskbar names is right-clicked, then the item is clicked where it sits", () => {
  const args = ["step", "--app", "Electron", "--surface", "tray", "--name", "Reset", "--action", "click", "--tray-name", "Sample App", "--out", "s.png"];
  const taskbar = ok({ tree: { role: "toolbar", children: [{ role: "button", name: "Sample App - 1 running window", bounds: { x: 900, y: 1128, width: 66, height: 72 } }, { role: "button", name: "Sample App", bounds: { x: 1505, y: 1128, width: 47, height: 72 } }] } });
  const r = run(args, [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["snapshot", "--app", "Electron", "--surface", "menu"], replies: [err("WINDOW_NOT_FOUND"), ok({ tree: menu([item("Reset", 0), item("Reset\tCtrl+R", 3)]) })] },
    { args: ["snapshot", "--surface", "taskbar"], replies: [taskbar] },
    { args: ["mouse-click"], replies: [ok({})] },
    { args: ["wait", "--menu", "--app", "Electron"], replies: [ok({ found: true })] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find"], replies: [err("WINDOW_NOT_FOUND")] },
  ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.equal(r.json.carried_out, true, r.json.note);
  const clicks = r.calls.filter((c) => c[0] === "mouse-click");
  assert.deepEqual(clicks, [["mouse-click", "--button", "right", "--xy", "1529,1164", "--headed"], ["mouse-click", "--xy", "200,240", "--headed"]], "the hidden 0×0 twin is passed over");
  assert.ok(!r.calls.some((c) => c[0] === "click" || c[0] === "right-click"), "no ref action on the taskbar or the menu");

  const absent = run(args, [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["snapshot", "--app", "Electron", "--surface", "menu"], replies: [err("WINDOW_NOT_FOUND")] },
    { args: ["snapshot", "--surface", "taskbar"], replies: [ok({ tree: { role: "toolbar", children: [] } })] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find"], replies: [err("WINDOW_NOT_FOUND")] },
  ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.equal(absent.json.carried_out, false);
  assert.match(absent.json.note, /no icon named "Sample App" on the taskbar/);
  assert.ok(!absent.calls.some((c) => c[0] === "mouse-click"));

  const unopened = run(args, [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["snapshot", "--app", "Electron", "--surface", "menu"], replies: [err("WINDOW_NOT_FOUND")] },
    { args: ["snapshot", "--surface", "taskbar"], replies: [taskbar] },
    { args: ["mouse-click"], replies: [ok({})] },
    { args: ["wait"], replies: [err("TIMEOUT")] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find"], replies: [err("WINDOW_NOT_FOUND")] },
  ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.equal(unopened.json.carried_out, false);
  assert.match(unopened.json.note, /^wait: TIMEOUT/);
  assert.equal(unopened.calls.filter((c) => c[0] === "mouse-click").length, 1, "nothing is clicked in a menu that did not open");

  const unread = run(args, [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["snapshot", "--app", "Electron", "--surface", "menu"], replies: [err("WINDOW_NOT_FOUND"), err("WINDOW_NOT_FOUND")] },
    { args: ["snapshot", "--surface", "taskbar"], replies: [taskbar] },
    { args: ["mouse-click"], replies: [ok({})] },
    { args: ["wait"], replies: [ok({ found: true })] },
    { args: ["press"], replies: [ok({})] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find"], replies: [err("WINDOW_NOT_FOUND")] },
  ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.match(unread.json.note, /^snapshot: WINDOW_NOT_FOUND/, "a menu that opened but cannot be read says so");
  assert.deepEqual(unread.calls.find((c) => c[0] === "press"), ["press", "escape", "--app", "Electron"], "the menu it opened is closed");
});

test("win32 menu: a disabled item is not clicked, a check already in place is not clicked again, and the menu is closed", () => {
  const scenario = (states) => [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["snapshot", "--app", "Electron", "--surface", "menu"], replies: [ok({ tree: menu([item("Use proxy", 2, states, "checkbox")]) })] },
    { args: ["mouse-click"], replies: [ok({})] },
    { args: ["press"], replies: [ok({})] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find"], replies: [err("WINDOW_NOT_FOUND")] },
  ];
  const step = (action, states) => run(["step", "--app", "Electron", "--surface", "menu", "--name", "Use proxy", "--action", action, "--out", "s.png"], scenario(states), { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  const escape = ["press", "escape", "--app", "Electron"];

  const disabled = step("click", ["disabled"]);
  assert.equal(disabled.json.carried_out, false);
  assert.equal(disabled.json.note, '"Use proxy" is disabled on menu');
  assert.ok(!disabled.calls.some((c) => c[0] === "mouse-click"));
  assert.deepEqual(disabled.calls.find((c) => c[0] === "press"), escape);

  const kept = step("check", ["checked"]);
  assert.equal(kept.json.carried_out, true);
  assert.ok(!kept.calls.some((c) => c[0] === "mouse-click"));
  assert.deepEqual(kept.calls.find((c) => c[0] === "press"), escape);
  assert.equal(kept.calls.filter((c) => c[0] === "list-windows").length, 1, "nothing was sent, so no window change is waited for");

  const lost = run(["step", "--app", "Electron", "--surface", "menu", "--name", "Use proxy", "--action", "click", "--out", "s.png"], [
    { args: ["list-windows"], replies: [ok([])] },
    { args: ["snapshot", "--app", "Electron", "--surface", "menu"], replies: [ok({ tree: menu([item("Use proxy", 2)]) })] },
    { args: ["mouse-click"], replies: [err("ACTION_FAILED")] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find"], replies: [err("WINDOW_NOT_FOUND")] },
  ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.equal(lost.json.carried_out, false);
  assert.equal(lost.calls.filter((c) => c[0] === "mouse-click").length, 1, "a pointer click is not sent again where the menu may be gone");

  const opening = run(["step", "--app", "Electron", "--surface", "menu", "--name", "Use proxy", "--action", "click", "--out", "s.png"], [
    { args: ["list-windows"], replies: [ok([]), ok([{ id: "w-9", title: "Sample App" }])] },
    { args: ["snapshot", "--app", "Electron", "--surface", "menu"], replies: [ok({ tree: menu([item("Use proxy", 2)]) })] },
    { args: ["mouse-click"], replies: [ok({})] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find", "--window-id", "w-9"], replies: [ok({ matches: [{ role: "statictext", name: "Restart now?" }, button("Yes(Y)", 1)] })] },
    { args: ["find"], replies: [err("WINDOW_NOT_FOUND")] },
  ], { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.deepEqual(opening.json.opened, ["Restart now?", "Yes(Y)"], "the window a pointer click opened is read as what it opened");

  const flipped = step("uncheck", ["checked"]);
  assert.deepEqual(flipped.calls.find((c) => c[0] === "mouse-click"), ["mouse-click", "--xy", "200,200", "--headed"]);
  assert.ok(!flipped.calls.some((c) => c[0] === "press"), "a clicked menu closes itself");

  const typed = run(["step", "--app", "Electron", "--surface", "menu", "--name", "Use proxy", "--action", "type", "--value", "x", "--out", "s.png"], scenario([]), { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.equal(typed.json.carried_out, false);
  assert.ok(!typed.calls.some((c) => c[0] === "snapshot"));
});

test("press not delivered: win32 sends it again headed at the focused window; elsewhere the same press again", () => {
  const scenario = [
    { args: ["list-windows"], replies: [ok([{ id: "w-1", title: "Main" }, { id: "w-2", title: "Sample App", is_focused: true }])] },
    { args: ["press"], replies: [err("NOT_FOREGROUND"), ok({})] },
    { args: ["screenshot"], replies: [ok({})] },
    { args: ["find"], replies: [err("WINDOW_NOT_FOUND")] },
  ];
  const args = ["step", "--app", "Electron", "--surface", "dialog", "--action", "press", "--value", "escape", "--window-title", "Main", "--out", "s.png"];
  const win = run(args, scenario, { shim: "linked", env: { DEMO_PLATFORM: "win32" } });
  assert.equal(win.json.carried_out, true);
  assert.deepEqual(win.calls.filter((c) => c[0] === "press"), [["press", "escape", "--app", "Electron"], ["press", "escape", "--window-id", "w-2", "--headed"]]);
  const mac = run(args, scenario);
  assert.deepEqual(mac.calls.filter((c) => c[0] === "press"), [["press", "escape", "--app", "Electron"], ["press", "escape", "--app", "Electron"]]);
});

test("usage errors exit 2", () => {
  for (const args of [[], ["nope"], ["dismiss"], ["step", "--app", "A", "--surface", "alert", "--action", "click", "--out", "s.png"], ["step", "--app", "A", "--surface", "alert", "--action", "hover", "--name", "x", "--out", "s.png"], ["permissions", "--nope", "x"]]) {
    const r = run(args, []);
    assert.equal(r.status, 2, JSON.stringify(args));
  }
});

});
