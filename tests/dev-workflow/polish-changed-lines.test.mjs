// changed-lines.mjs prints the changed files and excerpts of the changed lines as prose-polish inputs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = join(repoRoot, "skills", "dev-workflow", "scripts", "polish", "changed-lines.mjs");

function git(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" } }).replace(/\n$/, "");
}

function repoWith(t, files) {
  const dir = mkdtempSync(join(tmpdir(), "changed-lines-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["config", "user.email", "t@t"]);
  git(dir, ["config", "user.name", "t"]);
  git(dir, ["config", "commit.gpgsign", "false"]);
  for (const [path, text] of Object.entries(files)) write(dir, path, text);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-qm", "base"]);
  return { dir, base: git(dir, ["rev-parse", "HEAD"]) };
}

function write(dir, path, text) {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), text);
}

function run(dir, base) {
  return execFileSync("node", [script, "--base", base, "--repo", dir], { encoding: "utf8" });
}

test("prints an excerpt per changed hunk", (t) => {
  const { dir, base } = repoWith(t, { "a.md": "l1\nl2\nl3\nl4\nl5\nl6\n" });
  write(dir, "a.md", "l1\nL2\nL3\nl4\nl5\nL6\n");
  assert.equal(run(dir, base), "File:\na.md\nChanged lines:\n@@ a.md 2-3 @@\nL2\nL3\n@@ a.md 6-6 @@\nL6\n");
});

test("keeps spaces in the path of the excerpt header", (t) => {
  const { dir, base } = repoWith(t, { "my notes.md": "a\nb\nc\n" });
  write(dir, "my notes.md", "a\nB\nc\n");
  assert.equal(run(dir, base), "File:\nmy notes.md\nChanged lines:\n@@ my notes.md 2-2 @@\nB\n");
});

test("reads a glob-like path literally", (t) => {
  const { dir, base } = repoWith(t, { "[id].md": "a\nb\n", "i.md": "x\ny\n" });
  write(dir, "[id].md", "a\nB\n");
  write(dir, "i.md", "X\ny\n");
  assert.equal(run(dir, base), "File:\n[id].md\ni.md\nChanged lines:\n@@ [id].md 2-2 @@\nB\n@@ i.md 1-1 @@\nX\n");
});

test("skips an untracked directory link without failing", (t) => {
  const { dir, base } = repoWith(t, { "a.md": "a\nb\n" });
  write(dir, "a.md", "a\nB\n");
  symlinkSync(".", join(dir, "loop"));
  assert.equal(run(dir, base), "File:\na.md\nChanged lines:\n@@ a.md 2-2 @@\nB\n");
});

test("lists a new untracked file without an excerpt", (t) => {
  const { dir, base } = repoWith(t, { "a.md": "a\n" });
  write(dir, "new.md", "x\ny\n");
  assert.equal(run(dir, base), "File:\nnew.md\n");
});

test("leaves out a file with deletions only", (t) => {
  const { dir, base } = repoWith(t, { "a.md": "a\nb\nc\n" });
  write(dir, "a.md", "a\nc\n");
  assert.equal(run(dir, base), "");
});

test("leaves out paths under .claude/plans/", (t) => {
  const { dir, base } = repoWith(t, { ".claude/plans/p.md": "a\nb\n" });
  write(dir, ".claude/plans/p.md", "a\nB\n");
  write(dir, ".claude/plans/new.md", "x\n");
  assert.equal(run(dir, base), "");
});

test("prints nothing when nothing changed", (t) => {
  const { dir, base } = repoWith(t, { "a.md": "a\n" });
  assert.equal(run(dir, base), "");
});
