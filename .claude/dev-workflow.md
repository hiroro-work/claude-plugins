---
reviewer: "ask-peer"
review_iterations:
  plan: 1
  code: 1
custom_instructions: |
  自分で判断できない、難易度が高いと思った場合はask-peerをmodelにfableを指定して相談して
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
self_retrospective:
  feedback: "SonicGarden/dev-workflow-issues"
compact_rules: false
workability_retrospective:
  enabled: true
polish_prose: true
confirm_remaining_steps: true
plan_review_gate: "visual"
commit_review_gate: "crit"
---
