// The full absorb path from references/snapshots.md § Absorb review fixes: attribute the
// residue, apply each patch as a fixup in a throwaway worktree, autosquash, add the trailing
// commit, and land the chain with read-tree + commit. The landed history must carry each
// review fix in the step that owns its lines, end with a clean tree, and run no hooks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, chmodSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "dev-workflow-lite", "scripts", "absorb", "attribute.mjs");
const ENV = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_SEQUENCE_EDITOR: "true", GIT_EDITOR: "true" };

function git(cwd, args, input, extraEnv = {}) {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", input, env: { ...ENV, ...extraEnv } }).replace(/\n$/, "");
}

function snapshot(cwd, prev, paths, message) {
  const idx = { GIT_INDEX_FILE: join(cwd, ".git", "dev-workflow-lite.index") };
  git(cwd, ["read-tree", prev], undefined, idx);
  git(cwd, ["add", "--", ...paths], undefined, idx);
  const tree = git(cwd, ["write-tree"], undefined, idx);
  return git(cwd, ["commit-tree", tree, "-p", prev], message);
}

test("absorb folds review fixes into their steps and lands a clean chain", () => {
  const dir = mkdtempSync(join(tmpdir(), "absorb-fold-"));
  try {
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["config", "user.email", "t@t"]);
    git(dir, ["config", "user.name", "t"]);
    git(dir, ["config", "commit.gpgsign", "false"]);
    writeFileSync(join(dir, "a.txt"), "a1\na2\na3\na4\na5\na6\na7\na8\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "base"]);
    const base = git(dir, ["rev-parse", "HEAD"]);

    // two Build order steps
    writeFileSync(join(dir, "a.txt"), "A1\na2\na3\na4\na5\na6\na7\na8\n");
    const c1 = snapshot(dir, base, ["a.txt"], "step 1");
    writeFileSync(join(dir, "a.txt"), "A1\na2\na3\na4\na5\na6\na7\nA8\n");
    writeFileSync(join(dir, "b.txt"), "b\n");
    git(dir, ["add", "-N", "--", "b.txt"]);
    const c2 = snapshot(dir, c1, ["a.txt", "b.txt"], "step 2");
    git(dir, ["update-ref", "refs/dev-workflow-lite/t", c2]);

    // a pre-commit hook that would fail: fixups and the rebase must never run it
    mkdirSync(join(dir, ".git", "hooks"), { recursive: true });
    writeFileSync(join(dir, ".git", "hooks", "pre-commit"), "#!/bin/sh\necho HOOK >&2; exit 1\n");
    chmodSync(join(dir, ".git", "hooks", "pre-commit"), 0o755);

    // review fixes: one owned by step 1, one by step 2, one new unowned file
    writeFileSync(join(dir, "a.txt"), "A1-fixed\na2\na3\na4\na5\na6\na7\nA8-fixed\n");
    writeFileSync(join(dir, "new-test.txt"), "t\n");
    git(dir, ["add", "-N", "--", "new-test.txt"]);

    const out = mkdtempSync(join(tmpdir(), "absorb-patches-")); // the workflow uses .claude/plans/<slug>.absorb, a gitignored artifact
    const json = JSON.parse(execFileSync("node", [script, "--repo", dir, "--base", base, "--tip", c2, "--out", out], { encoding: "utf8" }));

    const wt = join(dir, ".git", "dev-workflow-lite-wt");
    git(dir, ["worktree", "add", "--detach", wt, c2]);
    git(wt, ["switch", "-c", "dev-workflow-lite/t"]);
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
    git(dir, ["update-ref", "refs/dev-workflow-lite/t", newTip]);
    git(dir, ["worktree", "remove", "--force", wt]);
    git(dir, ["branch", "-D", "dev-workflow-lite/t"]);

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
