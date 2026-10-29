---
reviewer: "ask-peer"
check_commands:
  - "jq empty .claude-plugin/marketplace.json plugins/*/.claude-plugin/plugin.json"
  - "! git ls-files --others --exclude-standard 'skills/**/*.stdout' 'skills/**/*.stderr' 'plugins/dev-workflow-bundle/skills/**/*.stdout' 'plugins/dev-workflow-bundle/skills/**/*.stderr' | grep -q ."
test_commands:
  - "Skill(run-tests)"
  - "Skill(run-node-tests)"
  - "Skill(verify-bundle-sync)"
hooks:
  on_complete:
    - "Skill(skill-review)"
    - "Skill(verify-diff)"
    - "Skill(publicity-review)"
    - "Skill(work-complete)"
# self_retrospective:
#   feedback: "SonicGarden/dev-workflow-issues"
polish_prose: true
commit_review_gate: "crit"
custom_instructions: |
  配布スキルの SKILL.md / references/*.md を変えるプランは、Create Plan の時点で各 Build order 手順を
  .claude/rules/project.rules.local.md の次の 4 規則に照らして点検し、外れる案は採らない。
  「ツールの契約や例外処理はスクリプトに置き、散文には判断だけを書く」
  「既存の規則を狭める一文は隣に置かず置き換える」
  「実行時に参照されない散文をスキルに書かない」
  「サイズ予算を上げるのは feat コミットだけにし、本文に払えなかった理由を書く」
  スクリプトを置く場合は、呼び出し先のスキルに解釈を持たせずに済む配置（呼び出し元が整形済みの入力を渡す形）を先に検討する。
---
