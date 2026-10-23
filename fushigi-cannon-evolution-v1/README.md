# 大砲の爆風・地形破壊・敵の進化

着弾点＋周囲8マスの3×3へ同時ダメージ。斜めも含み、主人公・助っ人・他の敵・同種・店主・砲手自身に当たる。射線上で先に当たった壁/生物が爆心地になり、主人公の隣の壁への砲撃でも巻き込める。

- 砲撃はランク別の固定20 / 30 / 40 / 50ダメージ。防御力・通常攻撃の命中率では軽減/回避しない。主人公の無敵は有効。
- 範囲内の壁を歩ける床へ変更し、地形キャッシュと視界を更新。マップ外周と階段を保持。砲撃後の再装填は従来どおり。
- 別のモンスター/助っ人を倒したモンスターは、倒した1体につき同系統の次ランクへ進化。21系統すべてに適用し、上限は第4ランク。姿・名前・能力を既存の上位種へ切り替える。
- 同時撃破でも爆風の威力は発射時のランクで固定。全員へのダメージを先に確定してから進化するため、同じ爆風で死んだ砲手が進化で復活することはない。
- 進化時HPは上位種の最大値へ回復（本作の実装判断。本家の回復量は今回の参照資料では未確認）。状態異常・召喚/分裂由来・盗品・再装填を保持する。
- 敵同士の撃破で主人公/助っ人へ経験値を与えない。盗品・通常ドロップ・主撃破の階段解放は既存処理を使う。店主の巻き添えを主人公の泥棒扱いにしない。
- 壁の形・進化後の種類/HP・再装填を途中保存へ記録。致死時も爆風の全結果を先に確定する。

## 画像による演出

既存CC0画像を再利用し、砲弾→3マス幅の爆発と範囲表示、破壊時の土ぼこり、進化時の橙色の光柱・輪・光粒を追加。複数段階の進化名は最終名1つにまとめ、各段階はログに残す。動きを減らす設定と視界マスクに対応し、描画は戦闘乱数・ターンを消費しない。

出典・原画・加工履歴：[`../fushigi-vfx-v1/README.md`](../fushigi-vfx-v1/README.md)、同フォルダの `source-art/manifest.json`。

|画像|作者・元ページ|ライセンス|
|---|---|---|
|爆発16コマ|Soluna Software, [Lots of game effects](https://opengameart.org/content/lots-of-game-effects)|CC0|
|光柱22コマ|Martin Jelinek (Mikodrak / Nyrthos), [2D Spell Effects](https://opengameart.org/content/2d-spell-effects)|CC0|
|土ぼこり・光粒・輪・煙|Kenney Vleugels, [Particle Pack](https://kenney.nl/assets/particle-pack)|CC0|

## 参照した本家仕様

- [シレン6：オヤジ戦車種](https://gamers-high.com/shiren6/data/monster/oyaji.html)：周囲1マスへの爆風、地形破壊、20/30/40/50の固定ダメージ。
- [シレン6：ダンジョン攻略のコツ](https://gamers-high.com/shiren6/dungeon/tips.html)：モンスターが他のモンスターを倒すとランクアップ。
- [シレン6：旅仲間](https://gamers-high.com/shiren6/data/buddy.html)：旅仲間を倒したモンスターのレベルアップ。
- [オヤジ戦車の特徴と対策](https://appmedia.jp/shiren6/77496109)：隣の壁等への着弾による爆風と、巻き込んだ敵の撃破によるレベルアップ。

移動速度・射程・既存ステータスは本作のもの。全挙動をシレン6と同一にする変更ではない。

## 確認

`game-review.html` は本編から作る別セーブ・主人公HP999の確認用。3×3・壁・敵への着弾・複数撃破・助っ人撃破・砲手の自滅の6場面。「配置」→「発射」、「保存・再開」で操作できる。

```sh
python3 fushigi-cannon-evolution-v1/build_review.py
node tests/harness.js index.html tests/test_cannon_evolution.js
node tests/harness.js index.html tests/test_mvp.js
PLAYWRIGHT_BROWSERS_PATH=/tmp/fushigi-playwright python3 fushigi-cannon-evolution-v1/check_browser.py
```

82機能チェック。既存の深層373・仲間47・敵VFX53・保存31・警備30・成長/罠VFX・MVPもALL OK。実ブラウザで6場面、縦横、実際の画像描画・視界漏れなし・描画時乱数消費なし・再装填・保存/再開・動きを減らす設定を確認。結果は `validation.json`、スクリーンショットは同フォルダ。
