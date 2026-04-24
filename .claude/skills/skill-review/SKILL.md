---
name: skill-review
description: Review uncommitted skill changes against an internal checklist of skill-creator best practices and apply improvements. Use this whenever the user asks to "review skills", "check best practices", "improve SKILL.md", or wants a quality check on skill files before committing. Use this when there are uncommitted diffs in SKILL.md, README.md, or references/ files under skills/ or .claude/skills/. This is for reviewing existing skill changes, not creating new skills from scratch. Runs standalone — no external skill dependencies.
allowed-tools: Read, Edit, Glob, Grep, Bash(git diff *)
---

# Skill Review

## Process

1. **Detect changed skill files**: run `git diff --name-only` and `git diff --name-only --cached` to find uncommitted changes. Filter to files matching `skills/*/SKILL.md`, `skills/*/README.md`, `skills/*/references/*`, `.claude/skills/*/SKILL.md`, `.claude/skills/*/references/*`. If no skill files changed, tell the user and stop
2. **Read changed files**: for each changed skill, read the full `SKILL.md` and any changed `references/` or `README.md`
3. **Review against the internal checklist**: read `references/best-practices.md`. Walk the checklist and flag items the changed content fails. Only the modified sections of changed files are in-scope (frontmatter fields the diff touched, paragraphs replaced, lines added). Don't audit sibling sections or other files the diff didn't touch. Also flag "hallucination gaps" — points in the changed content where the executing agent would have to guess (ambiguous filenames, unstated success criteria, missing decision rules between branches); these are not on the checklist but are a common failure mode
4. **Apply improvements**: fix the issues identified. Mechanical fixes — rewording a vague description, swapping a `Bash(*)` wildcard for a narrow pattern, trimming heavy-handed MUST phrasing, fixing a broken link — can be applied directly. Confirm with the user first before structural changes: moving content between files, deleting sections, or rewriting large portions of a section
5. **Verify**: re-read changed files to confirm fixes landed correctly

## Scope

- Only review files that have uncommitted changes — diff-scoped, not a full audit
- Project conventions (`.claude/rules/`, `CLAUDE.md`) override the checklist where they conflict
- Don't chase perfection — fix real issues, note minor ones, move on

## Keeping the checklist fresh

`references/best-practices.md` is a snapshot of upstream `document-skills:skill-creator` guidance — it does not auto-update when the upstream plugin changes. When a meaningful divergence is noticed, refresh this file from the latest skill-creator and ship the refresh as its own commit.
