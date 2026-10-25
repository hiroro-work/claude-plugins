// Full absorb path (references/snapshots.md § Absorb review fixes): attribute, fixup in a worktree,
// autosquash, trailing commit, land. Must run no hooks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, chmodSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "dev-workflow", "scripts", "absorb", "attribute.mjs");
const ENV = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_SEQUENCE_EDITOR: "true", GIT_EDITOR: "true" };

function git(cwd, args, input, extraEnv = {}) {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", input, env: { ...ENV, ...extraEnv } }).replace(/\n$/, "");
}

function snapshot(cwd, prev, paths, message) {
  const idx = { GIT_INDEX_FILE: join(cwd, ".git", "dev-workflow.index") };
  git(cwd, ["read-tree", prev], undefined, idx);
  git(cwd, ["add", "--", ...paths], undefined, idx);
  const tree = git(cwd, ["write-tree"], undefined, idx);
  return git(cwd, ["commit-tree", tree, "-p", prev], message);
}

function initRepo(prefix, content) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["config", "user.email", "t@t"]);
  git(dir, ["config", "user.name", "t"]);
  git(dir, ["config", "commit.gpgsign", "false"]);
  writeFileSync(join(dir, "a.txt"), content);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-qm", "base"]);
  return { dir, base: git(dir, ["rev-parse", "HEAD"]) };
}

// a pre-commit hook that would fail: fixups and the rebase must never run it
function installFailingHook(dir) {
  mkdirSync(join(dir, ".git", "hooks"), { recursive: true });
  writeFileSync(join(dir, ".git", "hooks", "pre-commit"), "#!/bin/sh\necho HOOK >&2; exit 1\n");
  chmodSync(join(dir, ".git", "hooks", "pre-commit"), 0o755);
}

test("absorb folds review fixes into their steps and lands a clean chain", () => {
  const { dir, base } = initRepo("absorb-fold-", "a1\na2\na3\na4\na5\na6\na7\na8\n");
  try {
    // two Build order steps
    writeFileSync(join(dir, "a.txt"), "A1\na2\na3\na4\na5\na6\na7\na8\n");
    const c1 = snapshot(dir, base, ["a.txt"], "step 1");
    writeFileSync(join(dir, "a.txt"), "A1\na2\na3\na4\na5\na6\na7\nA8\n");
    writeFileSync(join(dir, "b.txt"), "b\n");
    git(dir, ["add", "-N", "--", "b.txt"]);
    const c2 = snapshot(dir, c1, ["a.txt", "b.txt"], "step 2");
    git(dir, ["update-ref", "refs/dev-workflow/t", c2]);

    installFailingHook(dir);

    // review fixes: one owned by step 1, one by step 2, one new unowned file
    writeFileSync(join(dir, "a.txt"), "A1-fixed\na2\na3\na4\na5\na6\na7\nA8-fixed\n");
    writeFileSync(join(dir, "new-test.txt"), "t\n");
    git(dir, ["add", "-N", "--", "new-test.txt"]);

    const out = mkdtempSync(join(tmpdir(), "absorb-patches-")); // the workflow uses .claude/plans/<slug>.absorb, a gitignored artifact
    const json = JSON.parse(execFileSync("node", [script, "--repo", dir, "--base", base, "--tip", c2, "--out", out], { encoding: "utf8" }));

    const wt = join(dir, ".git", "dev-workflow-wt");
    git(dir, ["worktree", "add", "--detach", wt, c2]);
    for (const t of json.targets) {
      git(wt, ["apply", "--unidiff-zero", t.patch]);
      git(wt, ["add", "-A"]);
      git(wt, ["commit", "--no-verify", "--no-gpg-sign", `--fixup=${t.commit}`]);
    }
    git(wt, ["-c", "commit.gpgsign=false", "rebase", "-i", "--autosquash", base]);
    git(wt, ["apply", "--unidiff-zero", json.trailing.patch]);
    git(wt, ["add", "-A"]);
    git(wt, ["commit", "--no-verify", "--no-gpg-sign", "-m", "review fixes"]);
    const newTip = git(wt, ["rev-parse", "HEAD"]);
    git(dir, ["update-ref", "refs/dev-workflow/t", newTip]);
    git(dir, ["worktree", "remove", "--force", wt]);
    assert.equal(git(dir, ["branch", "--format=%(refname:short)"]), "main");

    // the chain: step 1 carries its fix, step 2 its fix, trailing the new file
    const chain = git(dir, ["rev-list", "--reverse", `${base}..${newTip}`]).split("\n");
    assert.equal(chain.length, 3);
    assert.equal(git(dir, ["show", `${chain[0]}:a.txt`]), "A1-fixed\na2\na3\na4\na5\na6\na7\na8");
    assert.equal(git(dir, ["show", `${chain[1]}:a.txt`]), "A1-fixed\na2\na3\na4\na5\na6\na7\nA8-fixed");
    assert.equal(git(dir, ["log", "-1", "--format=%s", chain[2]]), "review fixes");
    assert.equal(git(dir, ["show", `${chain[2]}:new-test.txt`]), "t");
    // residue against the new tip is empty
    assert.equal(git(dir, ["diff", newTip, "--stat"]), "");

    // land sequentially (hook removed: landing runs hooks by design)
    rmSync(join(dir, ".git", "hooks", "pre-commit"));
    for (const c of chain) {
      git(dir, ["read-tree", `${c}^{tree}`]);
      git(dir, ["commit", "-q", "-m", git(dir, ["log", "-1", "--format=%s", c])]);
    }
    assert.equal(git(dir, ["status", "--porcelain"]), "");
    assert.equal(git(dir, ["log", "--format=%s"]), "review fixes\nstep 2\nstep 1\nbase");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// references/snapshots.md § Fold the trailing commit, on a chain of two steps plus a trailing commit
function foldFixture() {
  const { dir, base } = initRepo("absorb-trailing-", "a1\na2\na3\na4\na5\na6\n");
  writeFileSync(join(dir, "a.txt"), "A1\na2\na3\na4\na5\na6\n");
  const c1 = snapshot(dir, base, ["a.txt"], "step 1");
  writeFileSync(join(dir, "a.txt"), "A1\na2\na3\nA4\na5\na6\n");
  const c2 = snapshot(dir, c1, ["a.txt"], "step 2");
  installFailingHook(dir);
  return { dir, base, c1, c2 };
}

function fold(dir, base, t, k) {
  const f = git(dir, ["commit-tree", `${t}^{tree}`, "-p", `${t}^`], `fixup! ${k}`);
  const wt = join(dir, ".git", "dev-workflow-wt");
  git(dir, ["worktree", "add", "--detach", wt, f]);
  try {
    git(wt, ["-c", "commit.gpgsign=false", "rebase", "-i", "--autosquash", base]);
    const head = git(wt, ["rev-parse", "HEAD"]);
    git(dir, ["diff", "--quiet", t, head]);
    assert.equal(git(dir, ["rev-list", "--count", `${base}..${head}`]), String(Number(git(dir, ["rev-list", "--count", `${base}..${t}`])) - 1));
    git(dir, ["update-ref", "refs/dev-workflow/t", head]);
    return true;
  } catch {
    try { git(wt, ["rebase", "--abort"]); } catch {}
    return false;
  } finally {
    git(dir, ["worktree", "remove", "--force", wt]);
  }
}

test("the trailing commit folds into a named earlier step", () => {
  const { dir, base, c1, c2 } = foldFixture();
  try {
    writeFileSync(join(dir, "helper.txt"), "h\n");
    git(dir, ["add", "-N", "--", "helper.txt"]);
    const t = snapshot(dir, c2, ["helper.txt"], "review fixes");

    assert.equal(fold(dir, base, t, c1), true);
    const tip = git(dir, ["rev-parse", "refs/dev-workflow/t"]);
    const chain = git(dir, ["rev-list", "--reverse", `${base}..${tip}`]).split("\n");
    assert.equal(chain.length, 2);
    assert.equal(git(dir, ["log", "-1", "--format=%s", chain[0]]), "step 1");
    assert.equal(git(dir, ["show", `${chain[0]}:helper.txt`]), "h");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a trailing commit that conflicts with a later step leaves the chain as it was", () => {
  const { dir, base, c1, c2 } = foldFixture();
  try {
    // the trailing edit sits next to step 2's line, so replaying it onto step 1 conflicts
    writeFileSync(join(dir, "a.txt"), "A1\na2\na3\nA4\nA5\na6\n");
    const t = snapshot(dir, c2, ["a.txt"], "review fixes");
    git(dir, ["update-ref", "refs/dev-workflow/t", t]);

    assert.equal(fold(dir, base, t, c1), false);
    assert.equal(git(dir, ["rev-parse", "refs/dev-workflow/t"]), t);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a fold that rebases cleanly but changes the tree leaves the chain as it was", () => {
  const { dir, base, c1, c2 } = foldFixture();
  try {
    // step 2 adds h.txt and the trailing commit deletes it; replayed after step 1, step 2 brings it back
    writeFileSync(join(dir, "h.txt"), "h\n");
    git(dir, ["add", "-N", "--", "h.txt"]);
    const c3 = snapshot(dir, c2, ["h.txt"], "step 3");
    rmSync(join(dir, "h.txt"));
    const t = snapshot(dir, c3, ["h.txt"], "review fixes");
    git(dir, ["update-ref", "refs/dev-workflow/t", t]);

    assert.equal(fold(dir, base, t, c1), false);
    assert.equal(git(dir, ["rev-parse", "refs/dev-workflow/t"]), t);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
