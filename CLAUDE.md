# Fushigi（不思議のダンジョン系・個人用）

作業の前に必ず `docs/HANDOVER.md` を読むこと（現状・次にやること・注意点）。ユーザーに貼り付けを求めない。

- 回答の順序：結論 → 詳細 → 必要ならより詳細 → 要約結論。事実と仮説は分けて明記。
- 迎合せず、より良い案は短く提案。Skill/Project化すべき場面は Yes/No を確認してから実装。
- 絵は外部AI前提で、最短のプロンプトを提案（`docs/art_prompts.md`）。
- コードは省略禁止。変更後は `node tests/harness.js index.html tests/test_mvp.js` で `ALL OK` を確認してから push。
- 作業を終えたら `docs/HANDOVER.md` の「現状」「次にやること」を更新して push する。

## トークンを節約するルール（2026-10-24 追加）
- `assets/vendor/*`（three.js など同梱ライブラリ）は読まない・編集しない。
- `index.html` は約230KB。全文を読まない。`grep -n` で関数名を探し、`Read` は offset/limit で必要な範囲だけ読む（描画の入口は `function draw()`）。
- 3D描画は `assets/render3d.js` に隔離する（本編のロジックは「座標と向き」を渡すだけ）。計画と段階は `docs/3D_INTEGRATION_PLAN.md`。参照実装は `experiment3d.html`（本編からは使わない）。
- 作業は段階ごとに別の会話で完結させ、引き継ぎは `docs/HANDOVER.md` に書く。
