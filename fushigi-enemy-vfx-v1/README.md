# 深層の敵の特殊行動VFX

ユーザーの「エフェクト必要なら追加を」を受け、enemyCで追加した敵の発動元・対象・結果を見分ける演出を追加。本編で収集済みのCC0素材を再利用し、Kenneyの `spark_01.png` を稲妻の画像として追加採用した。

|行動|演出|
|---|---|
|ニンジャの手裏剣|回転する銀の手裏剣、画像の光の尾、着弾の光。はずれは土ぼこり|
|まじゅつ師の魔弾|効果別の色の光球と尾、混乱の?・くちなしの×・レベル低下のLv↓。防いだときは適用マークなし|
|魔弾による転移|旧位置の消失煙、新位置の出現煙|
|ミミック|近づいたときと攻撃で見破ったときに紫の煙。正体露見は1回。噛みつきは接触位置の輪と光|
|すず坊主|鈴から金色の波紋、実際に出現した魔物ごとに煙と光|
|いかずち岩|反撃の発生元から相手へ稲妻の線、CC0の稲妻画像と発光|
|おおづつ兵|砲口の光、砲弾と煙の尾、命中時の16コマの画像爆発。はずれは土ぼこり|
|アビスロード|赤紫の炎の流れ、着弾の光と輪|

## 実装

`assets/enemy-vfx.js` が `EventVfx` の視覚イベントに、発動時の始点・終点の座標を記録する。主人公だけでなく実際に狙った仲間の位置も使用。古い弾が新しい移動先を追尾しない。実時間420〜720msで再生するが、ダメージ・状態・ターン・乱数・保存ルールの処理タイミングは変更しない。追加の入力停止や効果確定コールバックは持たない。

既存の床/罠VFXとは別の前景描画。描画時に始点と終点の可視判定をし、さらに視界のマスで描画範囲を切り抜く。見えていない場所を照らしたり、敵の位置を漏らしたりしない。床移動・町帰還・保存時は既存のイベント破棄と一緒に消え、ダメージを再実行しない。動きを減らすOS設定、戦闘の演出「なし」では回転・尾・爆発・粒子数を抑え、必要な目印だけ残す。

`fushigi-enemy-vfx-v1/game-review.html` は最新本編から生成。別セーブ・高HP、11シーン・はずれ・混乱よけを切替可能。本編の数値には試験条件を持ち込まない。画像確認は `*-portrait.webp` / `*-landscape.webp` / `reduced-motion.webp`。

## 素材と出典

- Kenney Particle Pack — Kenney Vleugels、CC0。既存のring/star/smoke/dirtと、今回採用のspark_01を使用。https://kenney.nl/assets/particle-pack
- Lots of game effects — Soluna Software、CC0。既存のExplosion25、16コマの画像爆発。https://opengameart.org/content/lots-of-game-effects
- 2D Spell Effects — Martin Jelinek、CC0。既存の22コマの転送光を召喚/転移先へ使用。https://opengameart.org/content/2d-spell-effects
- 既存素材の原画・利用説明・取得URL・ハッシュは `fushigi-vfx-v1/source-art/manifest.json` と同フォルダ。クレジットは本編設定→出典。追加の稲妻画像は `assets/vfx/lightning.png`（spark_01を変更せず複製）、対応とSHA256は `asset-source.json`。

## 検証と再現

```sh
python3 fushigi-enemy-vfx-v1/build_review.py
python3 -m http.server 8016 --bind 127.0.0.1 > /tmp/fushigi-vfx-http.log 2>&1
# 別ターミナル。Playwright/Chromiumが必要
python3 fushigi-enemy-vfx-v1/check_browser.py
node tests/harness.js index.html tests/test_enemy_vfx.js
node tests/harness.js index.html tests/test_deep_enemies.js
node tests/harness.js index.html tests/test_event_vfx.js
node tests/harness.js index.html tests/test_allies.js
node tests/harness.js index.html tests/test_run_save.js
node tests/harness.js index.html tests/test_mvp.js
```

53項目で命中/はずれ・座標固定・演出有無の乱数/ダメージ/ターン一致・変身の重複なし・召喚・雷・防御・最低Lv・転移・仲間の狙い・保存の無作用を確認。ブラウザで11演出の非空画像/視界外への漏れなし、描画が乱数を消費しないこと、セーブ分離・保存でダメージ不変、縮小動作、縦横の読み込み/JS例外なしを確認。深層373・仲間47・保存31・既存VFX・MVPも ALL OK。

既存の深層テストがニンジャの8%のはずれを失敗扱いしていたため、射程確認の命中だけ固定し、命中/はずれ両方の仕様は新テストで別々に確認。大砲テストの横10マスがマップ右端を越えないよう試験位置を補正した。ゲームの命中率・射程・地形は変更していない。
