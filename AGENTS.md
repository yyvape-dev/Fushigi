# Character sprite production

ゲーム用キャラクター・別画像の武器と盾を制作する際は `skills/game-sprite-production/SKILL.md` を読み、`skills/game-sprite-production/references/fushigi.md` の承認済み設定を適用する。

承認済み基準は `fushigi-equipment-v3/`。NWは盾を腕全体の後ろ、SEは盾を手の前に描く。剣のrenderScale=0.66、盾=0.59。古い試作から再開しない。

引き継ぎは `docs/SPRITE_PRODUCTION_HANDOVER.md` を参照する。

# 絵の制作（地形・キャラ・小物）

絵を作る・直すときは、最初に `docs/ART_SPEC.md`（規格書）を読み、数値・命名・背景色を守る。ブランチ名は `art/<内容>`、PRはドラフトにしない。絵とテストが通ると自動でマージされる（`.github/workflows/auto-merge.yml`）。完了条件は `node tests/check_art.js` と `bash tests/run_all.sh`。

**3D表示は外さない**：設定「3D表示（洞窟）」と `assets/render3d.js` を消さない・無効化しない（`tests/test_fixed65.js` が検査）。小物は立体モデルでなく、マゼンタ背景の切り抜き絵（`docs/ART_SPEC.md` 6〜7章）。
