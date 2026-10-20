#!/usr/bin/env node
// Fit each case recording under the artifact file limit, compressing the ones over it.
//
// Usage: node fit-videos.mjs --dir <dir> --ext <webm|mp4> [--limit <bytes>]
// Reads every `<id>.<ext>` directly under <dir>, not `<id>.part-NNN.<ext>` or `<id>.small.<ext>`.
// A recording over --limit (default 15000000) is written again as `<id>.small.<ext>` by the first
// compressor found: `ffmpeg` on PATH, then Playwright's bundled ffmpeg for webm, or `avconvert` for mp4
// on macOS. The original is never changed.
//
// stdout: a JSON array, one entry per recording: { id, video, bytes, video_bytes, tool, outcome, error }.
// outcome: fits | compressed | over | no-tool | failed; `video` is the file to put on the page, or null.
// Exit 0 once the array is printed; exit 2 on a usage error or an unreadable <dir>.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

const usage = () => {
  process.stderr.write("usage: fit-videos.mjs --dir <dir> --ext <webm|mp4> [--limit <bytes>]\n");
  process.exit(2);
};
let args;
try {
  ({ values: args } = parseArgs({ options: { dir: { type: "string" }, ext: { type: "string" }, limit: { type: "string" } }, strict: true }));
} catch {
  usage();
}
if (!args.dir || !["webm", "mp4"].includes(args.ext)) usage();
const limit = args.limit === undefined ? 15_000_000 : Number(args.limit);
if (!Number.isInteger(limit) || limit <= 0) usage();

let names;
try {
  names = readdirSync(args.dir, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name);
} catch (err) {
  process.stderr.write(`cannot read ${args.dir}: ${err.message}\n`);
  process.exit(2);
}

const deadline = Date.now() + 540_000;
let tools = null;
const pattern = new RegExp(`^([^.]+)\\.${args.ext}$`);
const recordings = names.sort().map((n) => pattern.exec(n)).filter(Boolean);
process.stdout.write(`${JSON.stringify(recordings.map(([name, id]) => fit(name, id)))}\n`);

function fit(name, id) {
  const src = join(args.dir, name);
  const bytes = statSync(src).size;
  const entry = { id, video: name, bytes, video_bytes: bytes, tool: null, outcome: "fits", error: null };
  if (bytes <= limit) return entry;
  const off = { ...entry, video: null, video_bytes: null };
  tools ??= compressors();
  if (tools.length === 0) return { ...off, outcome: "no-tool" };
  const small = `${id}.small.${args.ext}`;
  const out = join(args.dir, small);
  let error = null;
  for (const tool of tools) {
    let ran = false;
    for (const argv of tool.stages(src, out)) {
      const r = run(tool.bin, argv, out);
      if (r.error) {
        if (!ran) error = r.error;
        break;
      }
      ran = true;
      if (r.size <= limit) return { ...entry, video: small, video_bytes: r.size, tool: tool.name, outcome: "compressed" };
    }
    // A compressor that cannot run its first stage (no encoder, no decoder) hands over to the next one.
    if (ran) {
      rmSync(out, { force: true });
      return { ...off, tool: tool.name, outcome: "over" };
    }
  }
  rmSync(out, { force: true });
  return { ...off, outcome: "failed", error };
}

function compressors() {
  const list = [];
  if (runs("ffmpeg", "-version")) list.push({ name: "ffmpeg", bin: "ffmpeg", stages: ffmpegStages });
  if (args.ext === "webm") {
    const bundled = bundledFfmpeg();
    if (bundled) list.push({ name: "playwright-ffmpeg", bin: bundled, stages: ffmpegStages });
  }
  if (args.ext === "mp4" && process.platform === "darwin" && runs("avconvert", "--help")) {
    list.push({ name: "avconvert", bin: "avconvert", stages: avconvertStages });
  }
  return list;
}

function runs(bin, probe) {
  return !spawnSync(bin, [probe], { stdio: "ignore", timeout: 10_000 }).error;
}

function ffmpegStages(src, out) {
  const head = ["-hide_banner", "-loglevel", "error", "-y", "-i", src];
  const tail = ["-an", out];
  if (args.ext === "webm") {
    return [["30", "500k"], ["40", "250k"]].map(([crf, rate]) => [...head, "-c:v", "libvpx", "-crf", crf, "-b:v", rate, ...tail]);
  }
  return [1280, 960].map((side) => [
    ...head,
    "-vf", `scale='min(${side},iw)':'min(${side},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    ...tail,
  ]);
}

function avconvertStages(src, out) {
  return ["Preset1280x720", "Preset960x540"].map((preset) => ["--source", src, "--preset", preset, "--output", out, "--replace"]);
}

// Playwright downloads this ffmpeg to record video, so a machine that recorded a webm has it.
function bundledFfmpeg() {
  const env = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const root = env && env !== "0" ? env
    : process.platform === "darwin" ? join(homedir(), "Library", "Caches", "ms-playwright")
    : process.platform === "win32" ? join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "ms-playwright")
    : join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "ms-playwright");
  const file = { darwin: "ffmpeg-mac", win32: "ffmpeg-win64.exe" }[process.platform] ?? "ffmpeg-linux";
  let dirs;
  try {
    dirs = readdirSync(root);
  } catch {
    return null;
  }
  return dirs
    .map((d) => /^ffmpeg-(\d+)$/.exec(d))
    .filter(Boolean)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map((m) => join(root, m[0], file))
    .find((p) => existsSync(p)) ?? null;
}

// The output is removed first, so a file an earlier stage left is never measured as this stage's.
function run(bin, argv, out) {
  rmSync(out, { force: true });
  const left = Math.min(120_000, deadline - Date.now());
  if (left <= 0) return { error: "time budget spent" };
  const r = spawnSync(bin, argv, { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"], timeout: left, killSignal: "SIGKILL" });
  if (r.error) return { error: (r.error.code ?? r.error.message).slice(0, 80) };
  const size = existsSync(out) ? statSync(out).size : 0;
  if (r.status === 0 && size > 0) return { size };
  const line = (r.stderr ?? "").split("\n").map((l) => l.trim()).filter(Boolean).pop();
  return { error: line ? line.slice(0, 80) : "(no stderr)" };
}
