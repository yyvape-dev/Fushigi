# 街の通行判定・縮尺の構造修正

ユーザーの指摘：v2の歩ける場所と縮尺が合っていない。旧版の通行ポリゴンは実際に屋根や家の上まで通しており、接続テストだけでは検出できていなかった。

## 今回の方式

- 屋外は一枚絵を拡大する方式を廃止。建物、城門、洞窟、木、噴水、掲示板、露店を独立した生成画像として登録し、60×48マスへ配置する。
- **描画・占有範囲・入口・窓口・地図を同じ配置データから作る。** `assets/castle-town-layout.js` が唯一の配置定義。描画・施設は `assets/castle-town-v3.js`。旧HTMLのキャッシュを壊さないため、v2の `assets/castle-town.js` は保持する。後から背景に通れるポリゴンを重ねない。
- 一般建物の入口は高さ1.65マスへ登録。標準のラナは高さ1.5マス。窓口と宿の入口は画像内の位置へ合わせてオフセットを登録する。
- 建物の地上の占有範囲・木の幹・噴水・掲示板は通れない。石畳と芝生は歩ける。屋根の後ろにいる人物は建物より先に描き、屋根の上に立つ見え方を防ぐ。
- 屋内は細かい移動格子を維持し、格子の表示倍率とキャラ倍率を逆補正する。屋内外でラナの画面上の高さを揃える。カメラはマップ端に収める。
- 旧版の街中の座標は新しい宿の前へ移す。倉庫・預金・装備・冒険途中のセーブは維持。宿のベッド復帰と、布団の上で全身を見せる寝姿も維持。
- 住民は既存3色店主、傭兵は既存仲間3人の待機・歩行を共有。住民の新しい画像／モーション・傭兵雇用は追加しない。

## 画像・再現

`source-art/modular-town.png` は採用モックを参照し、image_genで12個の独立した部品を生成した原画。`build.py` はアルファの連結成分で12部品を抽出し、元の色・透過の縁を保存する。隣の部品の矩形と重なる部分も成分で分離し、別の建物を混入させない。

生成プロンプトの要点：採用モックの画風、4列3行、宿・鍛冶屋・預け屋・酒場・赤屋根民家・青屋根民家・城門・洞窟・石像の噴水・木・掲示板・露店。共通カメラ、入口を揃える、背景透過、人物・床台座・UI・文字なし。住民は描かない。

```
python fushigi-town-v3/build.py
```

Pillow・NumPy・SciPy使用。本番は `assets/town-v3/`。元の宿屋と寝姿はv2画像を引き続き利用し、屋外はv3部品へ置換。古いv2の原画・検証画面は制作履歴で、本番の屋外配置ではない。

## 検証

```
node tests/harness.js index.html tests/test_town_spatial_contract.js
node tests/harness.js index.html tests/test_castle_town.js
node tests/harness.js index.html tests/test_mvp.js
node tests/harness.js index.html tests/test_run_save.js
node tests/harness.js index.html tests/test_alternate_attack.js
node tests/harness.js index.html tests/test_rest_regen.js
python fushigi-town-v3/check_runtime.py
```

空間テスト：歩ける全2164マスの接続、39部品の占有範囲と実描画アンカー、全入口・窓口、木の幹、民家前面の通行禁止、入口とラナの比率、屋内外の表示サイズ、屋根と人物の前後関係、旧街座標の移行。

実ブラウザ：全施設への130歩超を実際に歩行し、各歩が占有範囲へ侵入しないことを確認。民家9軒の正面まで歩いて壁で止まること、宿の実際の扉からの入場、屋内外でラナの高さ96pxが一致、縦横画面、再読み込み、画像読込、例外なし。再現と歩いた座標は `check_runtime.py` / `runtime-validation.json`。画像は `*-front.webp` / `overview.webp`。
