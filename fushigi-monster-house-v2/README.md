# Monster House 生成版 v2（未承認・未公開）

ユーザー指定：透過、少し暗めの赤のドクロの顔・MONSTER HOUSE・赤い下線。ドクロと文字を覆う赤い霧が炎のように揺らめく。
既存の単色モンスターアイコン・コードの文字・黒い帯は使わない。

image_genで透過原画を生成。初稿の骨色を深紅へ変更した修正版と、別生成の8コマ霧を使用。
最終タイトルは1536×1024 RGBA、霧は2124×740 RGBA。両方ともアルファ0の画素が存在し、背景は透過。
`source-art/` は生成結果をそのまま保持。`build.js` はタイトルを1152×768へ縮小し、霧を8コマの共通サイズへ切り出す。
描画は前後の霧コマを補間し、ドクロ/文字の上を薄く覆って上下に揺らす。黒背景板は描かない。

`monster-house-vfx.js` を本編の魔物部屋判定へ接続。表示2200ms。敵の応答・連続入力を止め、終了後に1ターンだけ再開。
`prefers-reduced-motion` では拡縮・漂い・コマ送りを停止し、透過画像と静かなフェードだけ表示。
ゲームルール/出現率/敵能力/主人公原画は変更しない。

確認：`game-review.html`（本編と別セーブ、HP999、再生ボタン）。`preview.html` は背景を切り替えられるループ再生。
本編には未反映。承認された成長・強化・罠9種は別のPR #36で反映。

検証済み：390×844・844×390・320×640で原画/霧の読込、1部屋1回の発動、演出中の入力停止、終了後の敵1ターン、JavaScript例外なし。
途中保存と動きを減らす設定でも停止解除。RGBAのアルファ0画素と、コマ間で霧の画素が変化することを確認。
`preview.mp4` はゲーム画面へ重ねた3秒・25fpsの確認動画。`mobile.webp` / `landscape.webp` / `small.webp` は画面比較。

```
node fushigi-monster-house-v2/build.js
python3 fushigi-monster-house-v2/build_review.py
node tests/harness.js index.html tests/test_monster_house_vfx.js
```
