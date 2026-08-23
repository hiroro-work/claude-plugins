# Project Rules - Staging

1 回観測のみの候補ルール。次回 incremental 抽出走行（incremental extraction run — `--from-conversation` / `--from-pr` / `--update`）で再観測されたら canonical へ promote されます。手動で `.local.md` へ移動することも可能（promote 待たずに採用する場合）。

## Project-specific patterns

- 検知プローブの網羅性を配布物の散文で断定せず、そのプローブが実際に検査するものだけを述べる。`git rev-parse --git-path hooks/pre-commit` + `test -f` は `core.hooksPath` を解決するが、git config のイベント登録だけで発火する設定駆動の hook ランナーは取りこぼす
- 文書を項目へ分割するパーサが認める形は、実際に踏んだ形だけに限る（`ITEM_HEAD_RE` の類）。分割の判定は内容の行き先を決めるので、誤検知は前の項目の本文を切り落として末尾を次の項目へ運ぶ。`Routing-identifier permissive / content strict layering` が言う「照合は緩める側へ寄せる」は、取りこぼしても対象から漏れるだけで済む絞り込み用の照合を対象にしたものであり、分割の判定には及ばない
- 出力がパーサで分割されるテンプレートには、項目ごとの書式の列挙に加えて、何が項目を分けるかを明記する（`**Question**` 行が Decisions 項目の境界、の類）。境界を書かないと、項目の間に見出しや導入段落を挟んだ書き方が誤りとして扱われず、前の項目の末尾フィールドへ黙って吸い込まれる
