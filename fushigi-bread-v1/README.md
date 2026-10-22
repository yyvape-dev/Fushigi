# パン4種（2026-10-22）

ラナの採用済み `fushigi-equipment-v3/assets/hero-base/S.png` を目視確認し、
丸みのある立体造形、柔らかな照明、落ち着いた金茶色へ合わせた。
小さな丸い白パン／コッペパン／大きなカンパーニュ／青緑のカビのあるパン。
床・持ち物は既存の種類別キーで自動読込。食べる動作も使用した種類を渡す。
キャラクター原画・動作の身体・食料効果・旧セーブの読み替えは維持。

生成: Canva media `MAHYxuHlx8A`。
https://www.canva.com/M/MAHYxuHlx8A

画像生成ツールは `Unknown parameter: reasoning` で2回失敗したためCanvaを使用。
Canvaの原画像メタデータは1264×1264だが、接続ツールが取得できる画像は200×200。
保存したシートはこの取得画像。各100pxセルから256px PNGを作成しており、
高解像度原画からの書き出しではない。ゲーム内32px用。拡大表示には限界がある。

再生成: `node fushigi-bread-v1/build.js`（@napi-rs/canvasが必要）。
マゼンタ除去は既存の `sheets.js`。4種を共通倍率で切り出し、大小差を維持する。
確認: `preview.html`（ラナ・拡大・32px比較）。

検証済み: 本編MVP、hero_actions（パン4種の使用動作）、shop_ground（36項目）、
run_save（31項目）がすべてALL OK。4画像の256px/RGBA・透明背景・マゼンタ残留なし、
`comparison.png` のラナとの比較と32px表示を確認。

プロンプト: `source-art/prompt.txt`。PNGのSHA256: `source-art/SHA256SUMS`。
