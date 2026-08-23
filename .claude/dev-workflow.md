---
reviewer: "ask-peer"
plan_review: "rules-only"
check_commands:
  - "jq empty .claude-plugin/marketplace.json plugins/*/.claude-plugin/plugin.json"
  - "! git ls-files --others --exclude-standard 'skills/**/*.stdout' 'skills/**/*.stderr' 'plugins/dev-workflow-bundle/skills/**/*.stdout' 'plugins/dev-workflow-bundle/skills/**/*.stderr' | grep -q ."
test_commands:
  - "Skill(run-tests)"
  - "Skill(verify-bundle-sync)"
  - "Skill(verify-skill-refs)"
hooks:
  on_complete:
    - "Skill(skill-review)"
    - "Skill(verify-diff)"
    - "Skill(publicity-review)"
    - "Skill(work-complete)"
# self_retrospective:
#   feedback: "SonicGarden/dev-workflow-issues"
workability_retrospective:
  enabled: true
polish_prose: true
commit_review_gate: "crit"
---
