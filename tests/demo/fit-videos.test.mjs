// fit-videos.mjs: a recording under the limit, one a compressor shrinks, one that stays over, no
// compressor, a failing compressor, Playwright's bundled ffmpeg, avconvert on macOS, the files that are
// not case recordings, and the usage errors. Fake compressors write a file of the size the test asks for.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "demo", "scripts", "fit-videos.mjs");

// Stage 1 and stage 2 are told apart by an argument only that stage passes.
const fake = `#!${process.execPath}
const a = process.argv.slice(2);
if (a[0] === "-version" || a[0] === "--help") process.exit(0);
if (process.env.FAKE_EXIT) { process.stderr.write("encoder missing\\n"); process.exit(Number(process.env.FAKE_EXIT)); }
const out = a.includes("--output") ? a[a.indexOf("--output") + 1] : a[a.length - 1];
const second = a.some((x) => x === "250k" || x === "Preset960x540" || x.includes("min(960"));
require("fs").writeFileSync(out, Buffer.alloc(Number(second ? process.env.FAKE_SIZE_2 : process.env.FAKE_SIZE_1)));
`;

const setup = (t, { tools = [], bundled = false } = {}) => {
  const root = mkdtempSync(join(tmpdir(), "fit-videos-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, "out");
  const bin = join(root, "bin");
  const browsers = join(root, "browsers");
  mkdirSync(dir);
  mkdirSync(bin);
  mkdirSync(browsers);
  for (const name of tools) {
    writeFileSync(join(bin, name), fake);
    chmodSync(join(bin, name), 0o755);
  }
  if (bundled) {
    const file = { darwin: "ffmpeg-mac", win32: "ffmpeg-win64.exe" }[process.platform] ?? "ffmpeg-linux";
    mkdirSync(join(browsers, "ffmpeg-1011"));
    writeFileSync(join(browsers, "ffmpeg-1011", file), fake);
    chmodSync(join(browsers, "ffmpeg-1011", file), 0o755);
    // A lower-numbered build that cannot run: picking it would end in `failed`.
    mkdirSync(join(browsers, "ffmpeg-1000"));
    writeFileSync(join(browsers, "ffmpeg-1000", file), "");
  }
  return { dir, bin, browsers };
};

// PATH holds only the fake tools, so neither a real ffmpeg nor /usr/bin/avconvert is found.
const run = (env, args, extra = {}) => {
  const r = spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: { PATH: env.bin, PLAYWRIGHT_BROWSERS_PATH: env.browsers, ...extra },
  });
  return { ...r, json: r.status === 0 ? JSON.parse(r.stdout) : null };
};

const video = (dir, name, size) => writeFileSync(join(dir, name), Buffer.alloc(size));

describe("fit-videos", { concurrency: true }, () => {

test("a recording at or under the limit is kept as it is", (t) => {
  const env = setup(t);
  video(env.dir, "A-1.mp4", 1000);
  const r = run(env, ["--dir", env.dir, "--ext", "mp4", "--limit", "1000"]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.json, [{ id: "A-1", video: "A-1.mp4", bytes: 1000, video_bytes: 1000, tool: null, outcome: "fits", error: null }]);
});

test("ffmpeg on PATH shrinks a recording into <id>.small.<ext> and leaves the original alone", (t) => {
  const env = setup(t, { tools: ["ffmpeg"] });
  video(env.dir, "A-1.webm", 5000);
  const r = run(env, ["--dir", env.dir, "--ext", "webm", "--limit", "1000"], { FAKE_SIZE_1: "800" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.json, [{ id: "A-1", video: "A-1.small.webm", bytes: 5000, video_bytes: 800, tool: "ffmpeg", outcome: "compressed", error: null }]);
  assert.equal(readFileSync(join(env.dir, "A-1.webm")).length, 5000);
});

test("the second stage runs when the first stays over the limit", (t) => {
  const env = setup(t, { tools: ["ffmpeg"] });
  video(env.dir, "A-1.mp4", 5000);
  const r = run(env, ["--dir", env.dir, "--ext", "mp4", "--limit", "1000"], { FAKE_SIZE_1: "2000", FAKE_SIZE_2: "900" });
  assert.equal(r.json[0].outcome, "compressed");
  assert.equal(r.json[0].video_bytes, 900);
});

test("a recording still over the limit after both stages is left off and its small file removed", (t) => {
  const env = setup(t, { tools: ["ffmpeg"] });
  video(env.dir, "A-1.mp4", 5000);
  const r = run(env, ["--dir", env.dir, "--ext", "mp4", "--limit", "1000"], { FAKE_SIZE_1: "3000", FAKE_SIZE_2: "2000" });
  assert.deepEqual(r.json, [{ id: "A-1", video: null, bytes: 5000, video_bytes: null, tool: "ffmpeg", outcome: "over", error: null }]);
  assert.equal(existsSync(join(env.dir, "A-1.small.mp4")), false);
});

test("no compressor leaves the recording off as no-tool", (t) => {
  const env = setup(t);
  video(env.dir, "A-1.mp4", 5000);
  video(env.dir, "B-1.webm", 5000);
  for (const ext of ["mp4", "webm"]) {
    const r = run(env, ["--dir", env.dir, "--ext", ext, "--limit", "1000"]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.json[0].outcome, "no-tool");
    assert.equal(r.json[0].video, null);
  }
});

test("a compressor that fails is reported as failed with its last stderr line", (t) => {
  const env = setup(t, { tools: ["ffmpeg"] });
  video(env.dir, "A-1.webm", 5000);
  const r = run(env, ["--dir", env.dir, "--ext", "webm", "--limit", "1000"], { FAKE_EXIT: "1" });
  assert.deepEqual(r.json, [{ id: "A-1", video: null, bytes: 5000, video_bytes: null, tool: null, outcome: "failed", error: "encoder missing" }]);
  assert.equal(existsSync(join(env.dir, "A-1.small.webm")), false);
});

test("without ffmpeg on PATH a webm goes to the newest bundled Playwright ffmpeg", (t) => {
  const env = setup(t, { bundled: true });
  video(env.dir, "A-1.webm", 5000);
  const r = run(env, ["--dir", env.dir, "--ext", "webm", "--limit", "1000"], { FAKE_SIZE_1: "700" });
  assert.equal(r.json[0].tool, "playwright-ffmpeg");
  assert.equal(r.json[0].outcome, "compressed");
});

test("an mp4 never goes to the bundled ffmpeg, which cannot read H.264", (t) => {
  const env = setup(t, { bundled: true });
  video(env.dir, "A-1.mp4", 5000);
  const r = run(env, ["--dir", env.dir, "--ext", "mp4", "--limit", "1000"], { FAKE_SIZE_1: "700" });
  assert.equal(r.json[0].outcome, "no-tool");
});

test("on macOS an mp4 goes to avconvert when ffmpeg is absent", { skip: process.platform !== "darwin" }, (t) => {
  const env = setup(t, { tools: ["avconvert"] });
  video(env.dir, "A-1.mp4", 5000);
  const r = run(env, ["--dir", env.dir, "--ext", "mp4", "--limit", "1000"], { FAKE_SIZE_1: "2000", FAKE_SIZE_2: "600" });
  assert.deepEqual(r.json, [{ id: "A-1", video: "A-1.small.mp4", bytes: 5000, video_bytes: 600, tool: "avconvert", outcome: "compressed", error: null }]);
});

test("ffmpeg that cannot run its first stage hands over to avconvert", { skip: process.platform !== "darwin" }, (t) => {
  const env = setup(t, { tools: ["avconvert"] });
  writeFileSync(join(env.bin, "ffmpeg"), `#!${process.execPath}\nif (process.argv[2] === "-version") process.exit(0);\nprocess.exit(1);\n`);
  chmodSync(join(env.bin, "ffmpeg"), 0o755);
  video(env.dir, "A-1.mp4", 5000);
  const r = run(env, ["--dir", env.dir, "--ext", "mp4", "--limit", "1000"], { FAKE_SIZE_1: "600" });
  assert.equal(r.json[0].tool, "avconvert");
  assert.equal(r.json[0].outcome, "compressed");
});

test("only <id>.<ext> files count as case recordings", (t) => {
  const env = setup(t);
  for (const name of ["B-1.mp4", "A-1.mp4", "A-1.part-002.mp4", "A-1.small.mp4", "A-1.webm", "A-1.gesture-telemetry.json"]) video(env.dir, name, 10);
  mkdirSync(join(env.dir, "C-1.mp4"));
  const r = run(env, ["--dir", env.dir, "--ext", "mp4", "--limit", "1000"]);
  assert.deepEqual(r.json.map((e) => e.id), ["A-1", "B-1"]);
});

test("usage errors and an unreadable directory exit 2", (t) => {
  const env = setup(t);
  for (const args of [[], ["--dir", env.dir], ["--dir", env.dir, "--ext", "mov"], ["--dir", env.dir, "--ext", "mp4", "--limit", "0"], ["--dir", join(env.dir, "missing"), "--ext", "mp4"]]) {
    assert.equal(run(env, args).status, 2, JSON.stringify(args));
  }
});

});
