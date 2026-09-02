// attribute.mjs must send each review-fix hunk to the snapshot commit that last wrote
// the lines it touches, and everything else to the trailing patch. The scenario is the
// one the workflow produces: a two-step snapshot chain, then edits that belong to step 1,
// to step 2, to a new file nobody in the chain touched, and to a line from the base commit.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "dev-workflow-lite", "scripts", "absorb", "attribute.mjs");

function git(cwd, args, input) {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", input, env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" } }).replace(/\n$/, "");
}

function snapshot(cwd, prev, paths, message) {
  const env = { ...process.env, GIT_INDEX_FILE: join(cwd, ".git", "x.index"), GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  const run = (args) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", env }).replace(/\n$/, "");
  run(["read-tree", prev]);
  run(["add", "--", ...paths]);
  const tree = run(["write-tree"]);
  return git(cwd, ["commit-tree", tree, "-p", prev], message);
}

test("attributes hunks to the owning snapshot and the rest to trailing", () => {
  const dir = mkdtempSync(join(tmpdir(), "absorb-"));
  try {
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["config", "user.email", "t@t"]);
    git(dir, ["config", "user.name", "t"]);
    git(dir, ["config", "commit.gpgsign", "false"]);
    writeFileSync(join(dir, "a.txt"), "a1\na2\na3\na4\na5\na6\na7\na8\n");
    writeFileSync(join(dir, "keep.txt"), "k1\nk2\nk3\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "base"]);
    const base = git(dir, ["rev-parse", "HEAD"]);

    writeFileSync(join(dir, "a.txt"), "A1\na2\na3\na4\na5\na6\na7\na8\n");
    const c1 = snapshot(dir, base, ["a.txt"], "step 1");
    writeFileSync(join(dir, "a.txt"), "A1\na2\na3\na4\na5\na6\na7\nA8\n");
    writeFileSync(join(dir, "b.txt"), "b\n");
    git(dir, ["add", "-N", "--", "b.txt"]); // as Implement does for every new file
    const c2 = snapshot(dir, c1, ["a.txt", "b.txt"], "step 2");

    // review fixes: line 1 (step 1), line 8 (step 2), a new file nobody owns, a base line in keep.txt
    writeFileSync(join(dir, "a.txt"), "A1-fixed\na2\na3\na4\na5\na6\na7\nA8-fixed\n");
    writeFileSync(join(dir, "new-test.txt"), "t\n");
    git(dir, ["add", "-N", "--", "new-test.txt"]);
    writeFileSync(join(dir, "keep.txt"), "k1\nk2-fixed\nk3\n");

    const out = join(dir, "absorb-out");
    const json = JSON.parse(execFileSync("node", [script, "--repo", dir, "--base", base, "--tip", c2, "--out", out], { encoding: "utf8" }));

    assert.equal(json.residue_files, 3);
    assert.deepEqual(json.targets.map((t) => [t.commit, t.hunks]), [[c1, 1], [c2, 1]]);
    assert.match(readFileSync(json.targets[0].patch, "utf8"), /-A1\n\+A1-fixed/);
    assert.match(readFileSync(json.targets[1].patch, "utf8"), /-A8\n\+A8-fixed/);
    assert.ok(json.trailing, "trailing patch expected");
    const trailing = readFileSync(json.trailing.patch, "utf8");
    assert.match(trailing, /\+\+\+ b\/new-test\.txt/);
    assert.match(trailing, /-k2\n\+k2-fixed/);
    assert.equal(json.trailing.hunks, 2);

    // the patches apply cleanly in a worktree at the tip
    const wt = join(dir, ".git", "wt");
    git(dir, ["worktree", "add", "--detach", wt, c2]);
    for (const t of json.targets) git(wt, ["apply", "--unidiff-zero", t.patch]);
    git(wt, ["apply", "--unidiff-zero", json.trailing.patch]);
    assert.equal(readFileSync(join(wt, "a.txt"), "utf8"), "A1-fixed\na2\na3\na4\na5\na6\na7\nA8-fixed\n");
    assert.ok(existsSync(join(wt, "new-test.txt")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("empty residue yields no targets and no trailing", () => {
  const dir = mkdtempSync(join(tmpdir(), "absorb-"));
  try {
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["config", "user.email", "t@t"]);
    git(dir, ["config", "user.name", "t"]);
    writeFileSync(join(dir, "a.txt"), "a\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "base"]);
    const base = git(dir, ["rev-parse", "HEAD"]);
    writeFileSync(join(dir, "a.txt"), "A\n");
    const c1 = snapshot(dir, base, ["a.txt"], "step 1");
    const json = JSON.parse(execFileSync("node", [script, "--repo", dir, "--base", base, "--tip", c1, "--out", join(dir, "o")], { encoding: "utf8" }));
    assert.deepEqual(json, { targets: [], trailing: null, residue_files: 0 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
