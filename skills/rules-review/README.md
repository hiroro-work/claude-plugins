# rules-review

Checks a code diff against the rules documented under `.claude/rules/`, one reviewer per rule category, and reports each violation with the rule line it breaks. With no argument the diff is taken from `HEAD~1`; `--base-commit <sha>` takes it from a given commit instead.

## What the check covers

Only rules written into a file under `.claude/rules/`. Project-specific vocabulary, naming, or style conventions that nobody has written down yet are out of scope — the review has nothing to check them against. When an unwritten convention may apply to the changed code, verify it manually, or run `Skill(extract-rules)` to capture the pattern as a rule first.

Hard rules (naming, imports, placement, explicit prohibitions) are the strongest case. Intent rules are judged on a best-effort basis, and a borderline call is reported with a `low-confidence` marker rather than silently passed.

## Rule examples

A rule file may have a companion `<name>.examples.md` under `.claude/rules-extras/` (or beside the rule file, in the pre-split layout). When one exists, the reviewer reads it alongside the rule.

## When the rule is the stale one

A finding classified `rule-doc-drift` means the code looks intentional and consistent while the rule's text describes something else. Those are reported, never auto-fixed: route them to `Skill(extract-rules)` to update the rule document, or fix the code — the decision is yours.

## Optional arguments

- `Model:` — the model to run the reviewer subagents on. Only effective where subagent dispatch is available.
- `Files:` — a comma- or newline-separated list of repo-relative paths that narrows the review to those files.
