# Fushigi（不思議のダンジョン系・個人用）

単一ファイル `index.html`（HTML5 / Vanilla JS）で動く、シレン風ローグライク。

- 遊ぶ：GitHub Pages の URL を開く（スマホ向け）
- 絵の差し替え：`assets/<キー>.png` を置くと自動で読み込まれる（https のときのみ）。キーは `player goblin floor wall stairs ground tree roof hwall door gate pillar town` と各アイテム名（`potion onigiri`）。キャラとアイテムは背景を単色マゼンタ(#FF00FF)にすると自動で透明になる。
- 町の一枚絵：`assets/town.png`（22:15）。判定は内部の22×15の格子。設定の「町の判定を表示」でズレを確認できる。
- 絵のプロンプト：`docs/art_prompts.md` / 町の配置ガイド：`docs/town_layout_guide.png`
- 保存：ブラウザの localStorage（URLごとに別）。

## テスト（画面なしで動かす自動テスト）
`npm i @napi-rs/canvas` のあと `node tests/harness.js index.html tests/test_mvp.js`（`ALL OK` が出れば成功）。

## パーツで動く主人公（切り絵リグ）
- `assets/rig/*.png`（頭・胴・マント・腕4種・脚2種）を回転させて、歩き・攻撃・装備（剣と盾が手に付く）を描く。
- 主人公の取り込み画像（設定→素材）がある場合は、そちらを優先して1枚絵で表示する。
- 支点・倍率・姿勢は `index.html` の `RIG` と `rigPose()`。
- 表情差分の頭：`head_hurt`（被ダメージ約0.45秒）・`head_atk`（攻撃中）・`head_dead`（力尽きたとき。体も後ろへ倒れる）。無ければ通常の頭で代用。
