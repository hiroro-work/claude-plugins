// mark.mjs / report.mjs give the supervisor a per-phase wall / waiting / active table without
// parsing session logs. The report must subtract gate waits from wall time, list phases in
// start order, and close an unterminated phase at the last event.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mark = join(repoRoot, "skills", "dev-workflow", "scripts", "timing", "mark.mjs");
const report = join(repoRoot, "skills", "dev-workflow", "scripts", "timing", "report.mjs");

test("mark creates a log on start and appends to the newest afterwards", () => {
  const dir = mkdtempSync(join(tmpdir(), "timing-"));
  try {
    const file = execFileSync("node", [mark, "--dir", dir, "--phase", "Load Settings", "--event", "start"], { encoding: "utf8" }).trim();
    assert.match(file, /timing-\d{8}-\d{6}\.jsonl$/);
    const again = execFileSync("node", [mark, "--dir", dir, "--phase", "Load Settings", "--event", "end"], { encoding: "utf8" }).trim();
    assert.equal(again, file);
    const lines = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(lines.map((l) => [l.phase, l.event]), [["Load Settings", "start"], ["Load Settings", "end"]]);
    assert.equal(readdirSync(dir).length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("report subtracts waits, orders by start, closes unterminated phases", () => {
  const dir = mkdtempSync(join(tmpdir(), "timing-"));
  try {
    const file = join(dir, "timing-x.jsonl");
    const ev = (phase, event, sec) => JSON.stringify({ phase, event, t: new Date(Date.UTC(2026, 8, 2, 0, 0, sec)).toISOString() });
    writeFileSync(file, [
      ev("Create Plan", "start", 0), ev("Create Plan", "end", 60),
      ev("Plan Approval", "start", 60), ev("Plan Approval", "wait", 65), ev("Plan Approval", "resume", 305), ev("Plan Approval", "end", 310),
      ev("Implement", "start", 310), ev("Implement", "wait", 400),
    ].join("\n") + "\n");
    const out = execFileSync("node", [report, "--file", file], { encoding: "utf8" });
    const rows = out.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| Phase") && !l.startsWith("| **Total"));
    assert.deepEqual(rows, [
      "| Create Plan | 1m 00s | 0s | 1m 00s |",
      "| Plan Approval | 4m 10s | 4m 00s | 10s |",
      "| Implement (not ended) | 1m 30s | 0s | 1m 30s |",
    ]);
    assert.match(out, /\| \*\*Total\*\* \| 6m 40s \| 4m 00s \| 2m 40s \|/);
    const written = execFileSync("node", [report, "--file", file, "--out", join(dir, "reports")], { encoding: "utf8" }).trim();
    assert.match(written, /reports\/2026-09-02-timing-x\.md$/);
    assert.match(readFileSync(written, "utf8"), /^## Timing — timing-x/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
