---
name: mobpro-lite
description: Learning-oriented development workflow (mob-programming style) for a junior navigator — the AI drives and narrates, the junior reviews each implementation unit's diff and approves commits. A thin entry point that runs dev-workflow-lite in mob mode. Use instead of dev-workflow-lite when the goal is to develop a feature while a junior learns from it.
allowed-tools: Skill(dev-workflow-lite)
---

# mobpro-lite

```text
/mobpro-lite [--fast|--deep] [--artifact off|share|review] <task>
/mobpro-lite --resume <state-file> [--fast|--deep] [--artifact off|share|review]
```

Call `Skill(dev-workflow-lite)` with `--mob` followed by the arguments verbatim, in one call, immediately. Do not interpret, plan, or edit anything here: dev-workflow-lite's mob mode owns the whole run, including its settings, gates, and completion summary. `--init` is not accepted here; run `/dev-workflow-lite --init` for project setup.
