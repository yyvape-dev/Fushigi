# 成長・強化・罠VFX

ラナ・装備・地形の採用済み画像へ、収集した無料VFX画像を重ねる。キャラクターの描き直しはなし。

|出来事|演出|入力停止|
|---|---|---|
|レベルアップ（主人公・仲間）|金色の光柱、輪、光粒、LEVEL UP|850ms|
|天の恵み|巻物→武器側の発光→武器の絵と強化値。+3は光を増量|180ms後に900ms|
|地の恵み|巻物→足元と盾側の発光→盾の絵と強化値|180ms後に900ms|
|落とし穴|穴・既存の罠画像・土ぼこり・沈下/消失→次階|120ms後に950ms|
|地雷|点火→16コマ爆発→被弾・揺れ|120ms後に850ms|
|睡眠ガス|青紫の煙・Zzz／防いだ表示|120ms後に850ms|
|空腹|抜ける粒子・満腹度−10|120ms後に850ms|
|ワープ|出発地点で消失→到着地点で光柱・再出現|120ms後に900ms|
|魔物の罠|罠の発光→現れた3体の足元に煙・光柱|120ms後に850ms|

時間は本家の実測値ではなく初期調整値。動きを減らす設定では回転・粒子数・光を抑える。
既存の「戦闘の演出：なし」でも出来事の画像は残し、粒子を減らす。
強化・レベルアップの既存SEを使用。罠専用SEは未追加。

## 収集した無料素材

- [Kenney Particle Pack](https://kenney.nl/assets/particle-pack) — Kenney Vleugels。CC0。
  star_06・circle_03・smoke_03・dirt_01を128pxへ縮小・色変更。spark_01も候補として収集し、光粒には輪郭の明瞭なstar_06を採用。
- [2D Spell Effects](https://opengameart.org/content/2d-spell-effects) — Martin Jelinek（Mikodrak / Nyrthos）。CC0。
  fx1_blue_topEffectの22コマを横シートへ。強化用は金色へ変更。
- [Lots of game effects](https://opengameart.org/content/lots-of-game-effects) — Soluna Software。CC0。
  Explosion25.png（512px、4×4、128px×16コマ）を地雷に使用。

本編の設定→クレジットから作者・元ページ・ライセンス・加工内容を参照可能。
無料で収集、有料版・寄付・アカウント登録は使用しない。
元画像と同梱の利用説明は `source-art/`。ダウンロードURL・SHA256は `source-art/manifest.json`。

## 実装

`assets/event-vfx.js` が実時間の描画と効果確定を管理。罠は発見→120msで足元へ移動完了→作動→結果→残りの世界ターンを1回。
ダッシュ・押しっぱなし・メニュー・アイテム使用を停止。終了時刻だけでなく、保留中のターンが完了してから入力を戻す。
途中保存前に `EventVfx.flush()` で罠と残りターンを確定。演出の時計・コールバックはセーブせず、再開時の取り消し/再発を防ぐ。
画像が読めなくても時間で停止解除し、ゲームのルールは進める。

## 再構築・確認

```
node fushigi-vfx-v1/build.js
python3 fushigi-vfx-v1/build_review.py
node tests/harness.js index.html tests/test_event_vfx.js
node tests/harness.js index.html tests/test_mvp.js
```

preview.html / game-review.html は9種の再生ボタン付き。町・途中保存は fushigi_vfx_review_* に分離し、HP999などの試験条件は本編に適用しない。
localhostでサーバーを起動して `python3 fushigi-vfx-v1/check_browser.py` で実ブラウザの縦横・入力・ターン・保存・画像読込を検証。

検証済み：本編MVP、event_vfx、hero_actions、experience、allies（47項目）、shop_ground（36項目）、run_save（31項目）がALL OK。
Chromiumで390×844・844×390・320×640の全9種の実処理、演出中の入力停止、正確なターン数、落下途中の保存/再開、全7画像の読込・JavaScript例外なし、動きを減らす設定での停止解除を検証。
比較：`overview.webp`。

モンスターハウスの旧案は不採用。生成版は別途制作・承認待ちで、本編は従来の文字と揺れのまま。
