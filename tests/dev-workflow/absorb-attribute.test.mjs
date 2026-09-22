// attribute.mjs sends each review-fix hunk to the snapshot commit that last wrote its lines, everything else to the trailing patch.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "dev-workflow", "scripts", "absorb", "attribute.mjs");

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

function startTree(cwd) {
  // the same three commands SKILL.md Phase 1 (Load Settings) runs
  const env = { ...process.env, GIT_INDEX_FILE: join(cwd, ".git", "start.index"), GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  const run = (args) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", env }).replace(/\n$/, "");
  run(["read-tree", "HEAD"]);
  run(["add", "-A"]);
  return run(["write-tree"]);
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
    assert.deepEqual(json, { targets: [], trailing: null, excluded: [], residue_files: 0 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--start-tree excludes files unchanged since the run began", () => {
  const dir = mkdtempSync(join(tmpdir(), "absorb-"));
  try {
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["config", "user.email", "t@t"]);
    git(dir, ["config", "user.name", "t"]);
    writeFileSync(join(dir, "a.txt"), "a1\na2\n");
    writeFileSync(join(dir, "other.txt"), "o1\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "base"]);
    const base = git(dir, ["rev-parse", "HEAD"]);

    // the run begins on a dirty tree: a tracked file edited by other work, plus an untracked file
    writeFileSync(join(dir, "other.txt"), "o1-other-work\n");
    writeFileSync(join(dir, "left-behind.txt"), "l\n");
    const t0 = startTree(dir);

    // the task itself
    writeFileSync(join(dir, "a.txt"), "A1\na2\n");
    const c1 = snapshot(dir, base, ["a.txt"], "step 1");

    // review fixes, plus absorb step 1 making the untracked file visible to the diff
    writeFileSync(join(dir, "a.txt"), "A1-fixed\na2\n");
    git(dir, ["add", "-N", "--", "left-behind.txt"]);

    const out = join(dir, "absorb-out");
    const argv = [script, "--repo", dir, "--base", base, "--tip", c1, "--out", out, "--start-tree", t0];
    const json = JSON.parse(execFileSync("node", argv, { encoding: "utf8" }));

    assert.deepEqual(json.excluded.sort(), ["left-behind.txt", "other.txt"]);
    assert.equal(json.residue_files, 1);
    assert.deepEqual(json.targets.map((t) => [t.commit, t.hunks]), [[c1, 1]]);
    assert.equal(json.trailing, null);
    assert.doesNotMatch(readFileSync(json.targets[0].patch, "utf8"), /other\.txt|left-behind\.txt/);

    // without --start-tree the same residue still reaches the trailing patch
    const plain = JSON.parse(execFileSync("node", [script, "--repo", dir, "--base", base, "--tip", c1, "--out", join(dir, "plain")], { encoding: "utf8" }));
    assert.deepEqual(plain.excluded, []);
    assert.equal(plain.residue_files, 3);
    assert.ok(plain.trailing, "trailing patch expected without --start-tree");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--start-tree keeps files the chain wrote, even when a review fix restored them", () => {
  const dir = mkdtempSync(join(tmpdir(), "absorb-"));
  try {
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["config", "user.email", "t@t"]);
    git(dir, ["config", "user.name", "t"]);
    writeFileSync(join(dir, "a.txt"), "a1\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "base"]);
    const base = git(dir, ["rev-parse", "HEAD"]);
    const t0 = startTree(dir);

    // the task edits a.txt and creates new.txt
    writeFileSync(join(dir, "a.txt"), "A1\n");
    writeFileSync(join(dir, "new.txt"), "n\n");
    git(dir, ["add", "-N", "--", "new.txt"]);
    const c1 = snapshot(dir, base, ["a.txt", "new.txt"], "step 1");

    // a review round undoes both: a.txt back to its original content, new.txt deleted
    writeFileSync(join(dir, "a.txt"), "a1\n");
    rmSync(join(dir, "new.txt"));

    const argv = [script, "--repo", dir, "--base", base, "--tip", c1, "--out", join(dir, "o"), "--start-tree", t0];
    const json = JSON.parse(execFileSync("node", argv, { encoding: "utf8" }));

    assert.deepEqual(json.excluded, [], "a path the chain wrote is never excluded");
    assert.equal(json.residue_files, 2);
    const patches = json.targets.map((t) => readFileSync(t.patch, "utf8")).join("") + (json.trailing ? readFileSync(json.trailing.patch, "utf8") : "");
    assert.match(patches, /a\.txt/);
    assert.match(patches, /new\.txt/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--start-tree handles paths holding a space", () => {
  const dir = mkdtempSync(join(tmpdir(), "absorb-"));
  try {
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["config", "user.email", "t@t"]);
    git(dir, ["config", "user.name", "t"]);
    writeFileSync(join(dir, "my file.txt"), "m1\n");
    writeFileSync(join(dir, "other file.txt"), "o1\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "base"]);
    const base = git(dir, ["rev-parse", "HEAD"]);

    writeFileSync(join(dir, "other file.txt"), "o1-other-work\n"); // dirt predating the run
    const t0 = startTree(dir);

    writeFileSync(join(dir, "my file.txt"), "M1\n");
    const c1 = snapshot(dir, base, ["my file.txt"], "step 1");
    writeFileSync(join(dir, "my file.txt"), "M1-fixed\n"); // the run's own review fix

    const argv = [script, "--repo", dir, "--base", base, "--tip", c1, "--out", join(dir, "o"), "--start-tree", t0];
    const json = JSON.parse(execFileSync("node", argv, { encoding: "utf8" }));

    assert.deepEqual(json.excluded, ["other file.txt"]);
    assert.equal(json.residue_files, 1);
    assert.deepEqual(json.targets.map((t) => [t.commit, t.hunks]), [[c1, 1]]);
    assert.match(readFileSync(json.targets[0].patch, "utf8"), /-M1\n\+M1-fixed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--start-tree with no value is an error, not a silent no-op", () => {
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

    assert.throws(
      () => execFileSync("node", [script, "--repo", dir, "--base", base, "--tip", c1, "--out", join(dir, "o"), "--start-tree"], { encoding: "utf8", stdio: "pipe" }),
      (err) => err.status === 2,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--start-tree keeps both sides of a rename a review round made", () => {
  const dir = mkdtempSync(join(tmpdir(), "absorb-"));
  try {
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["config", "user.email", "t@t"]);
    git(dir, ["config", "user.name", "t"]);
    writeFileSync(join(dir, "a.txt"), "a1\n");
    writeFileSync(join(dir, "z.txt"), "z1\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "base"]);
    const base = git(dir, ["rev-parse", "HEAD"]);
    const t0 = startTree(dir);

    writeFileSync(join(dir, "z.txt"), "Z1\n"); // the chain touches z.txt only
    const c1 = snapshot(dir, base, ["z.txt"], "step 1");

    // a review round renames a.txt to b.txt; rename detection must not pair them away
    rmSync(join(dir, "a.txt"));
    writeFileSync(join(dir, "b.txt"), "a1\n");
    git(dir, ["add", "-N", "--", "b.txt"]);

    const argv = [script, "--repo", dir, "--base", base, "--tip", c1, "--out", join(dir, "o"), "--start-tree", t0];
    const json = JSON.parse(execFileSync("node", argv, { encoding: "utf8" }));

    assert.deepEqual(json.excluded, [], "neither side of the rename predates the run");
    const patches = (json.targets.map((t) => readFileSync(t.patch, "utf8")).join("")) + (json.trailing ? readFileSync(json.trailing.patch, "utf8") : "");
    assert.match(patches, /a\.txt/, "the deletion must survive");
    assert.match(patches, /b\.txt/, "the addition must survive");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("patches for paths holding a space apply at the tip", () => {
  const dir = mkdtempSync(join(tmpdir(), "absorb-"));
  try {
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["config", "user.email", "t@t"]);
    git(dir, ["config", "user.name", "t"]);
    writeFileSync(join(dir, "my file.txt"), "m1\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "base"]);
    const base = git(dir, ["rev-parse", "HEAD"]);
    const t0 = startTree(dir);
    writeFileSync(join(dir, "my file.txt"), "M1\n");
    const c1 = snapshot(dir, base, ["my file.txt"], "step 1");
    writeFileSync(join(dir, "my file.txt"), "M1-fixed\n");

    const out = join(dir, "o");
    const argv = [script, "--repo", dir, "--base", base, "--tip", c1, "--out", out, "--start-tree", t0];
    const json = JSON.parse(execFileSync("node", argv, { encoding: "utf8" }));

    const wt = join(dir, ".git", "wt-apply");
    git(dir, ["worktree", "add", "--detach", wt, c1]);
    for (const target of json.targets) git(wt, ["apply", "--check", "--unidiff-zero", target.patch]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--start-tree excludes a binary file dirtied before the run began", () => {
  const dir = mkdtempSync(join(tmpdir(), "absorb-"));
  try {
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["config", "user.email", "t@t"]);
    git(dir, ["config", "user.name", "t"]);
    writeFileSync(join(dir, "img.bin"), Buffer.from([0, 1, 2, 0, 3]));
    writeFileSync(join(dir, "a.txt"), "a1\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "base"]);
    const base = git(dir, ["rev-parse", "HEAD"]);

    writeFileSync(join(dir, "img.bin"), Buffer.from([9, 9, 9, 0, 9])); // other work, before the run
    const t0 = startTree(dir);

    writeFileSync(join(dir, "a.txt"), "A1\n");
    const c1 = snapshot(dir, base, ["a.txt"], "step 1");
    writeFileSync(join(dir, "a.txt"), "A1-fixed\n");

    const argv = [script, "--repo", dir, "--base", base, "--tip", c1, "--out", join(dir, "o"), "--start-tree", t0];
    const json = JSON.parse(execFileSync("node", argv, { encoding: "utf8" }));

    assert.deepEqual(json.excluded, ["img.bin"], "a binary with no +++ line must still be excluded");
    assert.equal(json.trailing, null, "nothing unattributable is left, so no trailing patch");
    assert.deepEqual(json.targets.map((t) => [t.commit, t.hunks]), [[c1, 1]]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
