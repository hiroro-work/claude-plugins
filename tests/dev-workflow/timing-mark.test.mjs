// The timing log's location must not depend on where the caller happens to stand.
//
// mark.mjs is invoked once per phase transition, between arbitrary other commands, so the shell's
// directory is whatever the previous command left. When the default log directory was relative, a
// mark issued from inside the skill tree created a second log there and every later mark appended
// to a different file — the run reported a wrong table rather than no table, and the stray log sat
// in the distributed skill tree.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mark = join(repoRoot, "skills", "dev-workflow", "scripts", "timing", "mark.mjs");

function run(cwd, args) {
  return execFileSync("node", [mark, ...args], { cwd, encoding: "utf8" }).trim();
}

test("a mark issued from a subdirectory lands in the repository root's log", () => {
  const root = mkdtempSync(join(tmpdir(), "timing-mark-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    const deep = join(root, "skills", "some-skill", "scripts");
    mkdirSync(deep, { recursive: true });

    // Against the root git itself resolves, so a symlinked temp dir (macOS /var) still compares.
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: deep, encoding: "utf8" }).trim();
    const created = run(deep, ["--phase", "Load Settings", "--event", "start", "--new"]);
    assert.equal(dirname(created), join(top, ".claude", "plans"));
    assert.ok(!existsSync(join(deep, ".claude")), "a log was created under the subdirectory");

    // A later mark from a third directory must extend the same log, not start a rival one.
    const appended = run(join(root, "skills"), ["--phase", "Load Settings", "--event", "end"]);
    assert.equal(appended, created);

    const lines = readFileSync(created, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(lines.map((l) => l.event), ["start", "end"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("outside a repository the log still lands under the working directory", () => {
  const dir = mkdtempSync(join(tmpdir(), "timing-nogit-"));
  try {
    const created = run(dir, ["--phase", "Load Settings", "--event", "start", "--new"]);
    assert.ok(existsSync(join(dir, created)), `log went to ${created}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
