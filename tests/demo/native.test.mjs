// native.mjs: every subcommand against a fake agent-desktop placed first on PATH. The fake answers from a
// scenario (a list of { args: <prefix>, replies: [<envelope>, ...] }, each reply consumed in order) and logs
// every call it receives, so a test can check which flags the script passed.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, delimiter } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "demo", "scripts", "native.mjs");

const FAKE = `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
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

// Runs the script with the fake first on PATH (or absent, with `installed: false`); returns stdout, status and the calls logged.
function run(args, scenario, { installed = true, env = {}, files = {} } = {}) {
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
    if (installed) {
      mkdirSync(bin, { recursive: true });
      writeFileSync(join(bin, "agent-desktop"), FAKE);
      chmodSync(join(bin, "agent-desktop"), 0o755);
      PATH = bin + delimiter + process.env.PATH;
    }
    let stdout = "", status = 0, stderr = "";
    try {
      stdout = execFileSync(process.execPath, [script, ...args.map((a) => a.replace("<dir>", dir))], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PATH, DEMO_NATIVE_SETTLE_MS: "0", ...env, FAKE_AGENT_DESKTOP: scenarioPath, FAKE_AGENT_DESKTOP_LOG: log } });
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
  assert.deepEqual(r.json, { carried_out: true, note: null, screenshot: "step-01.png", window: "Electron", surface: ["Use proxy"] });
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
  assert.deepEqual(r.json, { carried_out: true, note: null, screenshot: "s.png", window: "Main", surface: null });

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

test("usage errors exit 2", () => {
  for (const args of [[], ["nope"], ["dismiss"], ["step", "--app", "A", "--surface", "alert", "--action", "click", "--out", "s.png"], ["step", "--app", "A", "--surface", "alert", "--action", "hover", "--name", "x", "--out", "s.png"], ["permissions", "--nope", "x"]]) {
    const r = run(args, []);
    assert.equal(r.status, 2, JSON.stringify(args));
  }
});

});
