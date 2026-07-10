---
reviewer: "ask-peer"
review_iterations: 2
check_commands:
  - "jq empty .claude-plugin/marketplace.json plugins/*/.claude-plugin/plugin.json"
  - "! git ls-files --others --exclude-standard 'skills/**/*.stdout' 'skills/**/*.stderr' 'plugins/dev-workflow-bundle/skills/**/*.stdout' 'plugins/dev-workflow-bundle/skills/**/*.stderr' | grep -q ."
test_commands:
  - "Skill(run-tests)"
  - "Skill(verify-bundle-sync)"
hooks:
  on_complete:
    - "Skill(skill-review)"
    - "Skill(verify-diff)"
    - "Skill(publicity-review)"
    - "Skill(work-complete)"
self_retrospective:
  feedback: "SonicGarden/dev-workflow-issues"
compact_rules: true
workability_retrospective:
  enabled: true
polish_prose: true
confirm_remaining_steps: true
plan_review_gate: "visual"
---
