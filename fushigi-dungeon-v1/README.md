# ダンジョン：1部屋＋通路 v1

**最新：** [ランダム生成＋承認済みキャラ・装備の確認](https://yyvape-dev.github.io/Fushigi/fushigi-dungeon-v1/random-review.html)。本編統合と生成モジュールの仕様は [DUNGEON_GENERATION.md](../docs/DUNGEON_GENERATION.md)。以下は初回の固定部屋制作記録。

確認: https://yyvape-dev.github.io/Fushigi/fushigi-dungeon-v1/preview.html

本編のCanvas描画・入力・衝突・視界・カメラを複製した独立プレビュー。7×5マスの部屋から幅1マスのL字通路へ歩ける。マス線、元絵との比較、開始位置への復帰に対応。本編とセーブを共有せず、書き込みも無効化した。

## 調査結果

調査対象main: 8371630377ba8210159bc471ab5503b29e16635a。
`index.html` の `genMap()` は40×25を壁で初期化し、最大80回試行で最大9部屋（幅4〜9・高さ3〜6）を配置。部屋間に2マスの余裕を要求し、3部屋未満なら再試行する。配置順の部屋中心同士を、水平先行か垂直先行の幅1マスのL字通路で接続する。通路が別の部屋・通路と交差することはある。

本編に3Dカメラや透視投影はない。タイルを正方形で描く2D Canvas。`tileKey()` は南隣が床の壁をwallF、それ以外をwallTにする。`shadeTile()` は壁際の影を追加する。キャラの足元を基準に追従し、横持ちは画面高の50%、縦持ちは40%へ配置する。自動サイズは16px単位。844×390では64px、390×844では32px。

## 制作物

- `room.blend`：編集可能な原モデル。1マス=1モデル単位、壁高0.9。物理的なメートル指定ではなく制作上の単位。
- `room.glb`：同じ部屋＋通路の交換用モデル。石材ノイズ・バンプはBlender手続き型のためGLBでは完全再現されない。
- `model-overview.png`：立体の確認用斜視図。本編カメラではない。
- `room-overhead.png`：真上からの寸法確認図。
- `floor0..3.png` / `wallF.png` / `wallT.png`：Blender Cyclesによる256pxのベイク画像。床は真上、壁正面は別撮影して正方形タイルへ収める。本編の擬似立体表現に合わせた方式。
- `preview.html`：生成洞窟画像を標準とする実ゲームカメラでの確認画面（旧石室の比較切替あり）。既存キャラは本編の素材を参照。
- `game-landscape.png` / `game-portrait.png` / `validation.json`：ブラウザ確認結果。

## 再現

リポジトリルートで `blender -b -t 4 --python fushigi-dungeon-v1/build.py`、続いて `python fushigi-dungeon-v1/build_preview.py`。`python -m http.server 8000` で配信し `python fushigi-dungeon-v1/check.py` で検証。PythonのPlaywright、システムChromium、Blenderが必要。

## 次の制作

この初版は寸法・遮蔽・接続確認用の石造モデル。自然洞窟の岩の形状や装飾、AI原画による仕上げはまだ制作していない。4床画像の差は微小な凹凸で、模様の大きな差分ではない。本編の自動生成は変更していない。次はこのカメラと寸法を基準に素材を仕上げ、内外角・通路接続の画像を追加してから、ランダム生成マップで継ぎ目を確認する。
