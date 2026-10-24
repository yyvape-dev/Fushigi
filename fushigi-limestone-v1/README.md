# 鍾乳洞・採用イメージからの素材実装 v1

ユーザーが会話で採用した `source-art/approved-reference.png` を画風の基準とする。
規格：`docs/ART_SPEC.md`。キャラクター・装備は変更しない。

## 反映先

- `assets/dungeon/locations-v1/limestone/` の床4種・壁側面2種・上面2種・階段を256×256、不透明、lossless WebPで更新。
- 本編2Dは広域床 `floorW.webp` を優先するため、同じ床素材でこれも更新。
- 2Dの天面と天井は同じ素材・周期を使うため、`assets/dungeon/experience-v1/ceiling-limestone.webp` を `wallT0.webp` と同一にする。
- 3Dは既存の読み込み先から新しい素材を使用する。地形生成、当たり判定、乱数、セーブ形式、キャラクター描画は変更しない。
- `props/` は石筍・岩・苔・松明の単体512×512 PNG、背景は単色マゼンタ。規格書で小物配置は未実装なので、本編には接続していない。素材を追加しただけで出現すると扱わない。

## ランダム生成への対応

見本の部屋形状を固定マップや一枚背景として組み込まない。既存のグリッドから任意形状の部屋・通路・壁を描画する。
床4種は共通の24px外周を持ち、中央の模様だけ変える。壁2種も同じ方式。四辺が一致するように原画を縮小・鏡像配置した共通シートを使い、中央の差分は内側48pxで接続する。losslessで書き出すので圧縮で境界の色が変わらない。
`verify.py` は復号した画素で、床16組・側面4組・上面4組の左右／上下の一致、差分の存在、寸法、不透明性、床と階段の境界、天面と天井の一致、PNG背景色を確認する。

これは色画像の実装であり、ノーマルマップや壁の立体形状を追加するものではない。既存の箱形壁の輪郭は残る。採用見本のような岩の輪郭・鍾乳石の立体配置を完全再現したとは扱わない。

## 再出力

Python 3 + Pillow。リポジトリルートで：

```sh
python fushigi-limestone-v1/export.py
python fushigi-limestone-v1/verify.py
node tests/check_art.js
bash tests/run_all.sh
```

生成原画は変更せず `source-art/` に保存。寸法・境界・背景色の機械的な正規化は `export.py`、出力のSHA256は `manifest.json`。

## 生成記録

生成機能：image_gen。全素材の参照画像は採用済み `approved-reference.png`。地形は背景不透明で生成。
日付：2026-10-24。ツール出力は1254×1254。原画はそのまま保存し、配布用寸法は書き出し時に合わせた。

共通プロンプト：

> Use the attached approved limestone cavern image as the exact art direction reference: stylized substantial rounded limestone, restrained painted material detail, muted warm gray beige and cool slate, Japanese 3D mystery dungeon game. Produce a production texture, NOT a scene or mockup. Square image, full bleed, no text, labels, borders, characters, objects or UI. Neutral diffuse lighting, no torch glow, no baked directional cast shadows, no vignette, no perspective.

床の追加指定：

> Extract/reinterpret only the calm walkable floor material. Perfect orthographic top-down view of flat continuous limestone, broad quiet softly irregular mineral areas, sparse shallow thin cracks, low contrast, matte desaturated gray beige. Almost no small stones or grain, no moss, no cobblestone pattern. Seamless tileable on all four sides, edge colors and details match. One single continuous texture filling the entire square; no panels.

壁側面の追加指定：

> Extract/reinterpret only the vertical limestone wall side material. Orthographic straight-on front view of chunky fused flowstone with broad vertical softened flutes, short embedded stalactite-like mineral ridges and softly layered limestone. Continuous solid rock across the whole square, no cave openings, ground plane, free-standing silhouette or black gaps. Neutral gray beige with restrained blue gray crevices. Texture repeats horizontally with matching edges; no distinctive top cap or bottom ledge. Large readable relief, not noisy.

上面の追加指定：

> Extract/reinterpret only the upper rock cap material. Perfect orthographic top-down view of a continuous solid natural limestone rock surface, large softly rounded interlocking rock masses with subtle shallow fissures and muted gray beige slate colors. Broader slightly stronger forms than the floor but no deep black cracks, no ground plane, no stalactites or silhouettes. Seamlessly tileable all four edges. One single uninterrupted square texture.

小物（共通文なし）：

> Using attached approved cavern as exact reference, create a square game environment prop sprite sheet on perfectly flat pure magenta #FF00FF background, no cast ground shadows, no text or labels. 2 by 2 equal cells, generous margin around each isolated object, no grid lines. Top left: one cluster of three thick rounded limestone stalagmites. Top right: a small pile of 4 chunky rounded gray beige limestone rocks. Bottom left: a low clump of muted teal cave moss growing between 2 tiny gray rocks. Bottom right: a small wall mounted dark iron torch bracket with stylized amber flame, isolated with no wall behind it and no broad glow spilling onto background. Match the chunky softly painted 3D aesthetic of the reference. All objects seen from the SAME steep overhead 65 degree camera as the reference, bottom centered within respective cell, fully visible and separated. These are billboard props, not texture samples.

階段（共通文なし）：

> Create a single square opaque game ground tile: a descending limestone stairwell set flush within a limestone floor, seen from PERFECT ORTHOGRAPHIC TOP DOWN, no perspective, no exterior walls or doorway arch. Match the attached approved cavern's stylized softly painted limestone material in muted warm gray beige. Five broad stone steps lead down from lower edge toward upper edge into a rectangular opening, centered, with quiet broad flat floor margin covering outer 20% on every side. Neutral uniform diffuse lighting, no torch or flame, no colored glow, no directional cast shadows, no vignette, no dramatic highlights. Only the inherent darker color of the interior opening indicates depth. Crisp simple readable forms for a small dungeon tile. Full bleed square image, no characters, text, symbols, frames or UI.
