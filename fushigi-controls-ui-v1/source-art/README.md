# 採用デザイン：Aの素材感＋Bの円形操作盤

2026-10-21、ユーザーが比較画像 `directions-ab.png` のA（漆・真鍮）とB（8方向の円形操作盤）の組合せを採用。続いて半透明の提案を受け、素材レイヤーを不透明度0.72へ調整。矢印・文字・押下の灯りは別レイヤー。

実素材は `assets/ui-art/lacquer-compass.png`。画像生成で制作した透過PNGを加工せず保存し、CSSで22.5度回転して方向セクターへ合わせる。比較モックの主人公・道具は実素材として流用せず、既存の承認済みゲーム素材を継続使用。

生成モデルの出力は完全な再現性を持たないため、原画PNG自体を正とする。プロンプトは `compass-prompt.txt`、参照は比較画像。接続と8方向ヒット領域は `assets/compass-ui.css`。素材の透過率だけを変え、操作全体のopacityは下げない。円形に合わせた扇形ヒット領域＋独立した中央待機を使用。手の配置とキー操作・移動ロジックは既存通り。

検証：`check_compass.py` は3画面サイズ×3配置の72実タップで8方向それぞれのヒット対象と0ターンの向き変更を確認。中央待機との分離も確認。`check_hands.py` は配置・メニューのタッチ遷移、`check.py` は既存移動・ダッシュ停止などを検証。

## 矢印位置の修正・最新版

旧素材への追加矢印はユーザー指摘により廃止。`compass-geometry.svg` を正確な8方向ガイドとしてPNG化し、質感のみ画像生成で制作。最新版は `assets/ui-art/lacquer-compass-v3.png`（回転なし・追加矢印なし）。プロンプトは `compass-v3-prompt.txt`。攻撃は `attack-medallion.png` の生成一枚絵へ変更。押下中の実画面は `../compass-844-pressed.png` など。旧記述の22.5度回転・別レイヤー矢印は廃止。ガイドのPNG化はInkscapeのSVG書出し。生成PNGそのものは加工なし。

## 宝石液体HUD

`assets/ui-art/gem-liquid-atlas.png` は上半分エメラルド・下半分琥珀の画像生成原画（加工なし）。CSSで上下を選び、ゲーム値で幅を変更。プロンプトは `gem-liquid-prompt.txt`。検証 `../check_gem_bars.py`、画面 `../gem-bars-844-50.png` など。
