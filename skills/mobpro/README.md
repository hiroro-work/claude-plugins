# mobpro

A thin entry point: `/mobpro <task>` runs `/dev-workflow --mob <task>`. Everything about the run — phases, gates, settings, the junior-facing stops and narration — is defined by `dev-workflow` and its `references/mob-mode.md`. Install both plugins.

Why a separate skill at all: teams keep the `mobpro` name, and if the mob mode ever grows apart from the solo workflow it can become its own skill by moving `mob-mode.md` here without changing how people invoke it. Until then there is one implementation and two names.
