# Fushigi（不思議のダンジョン系・個人用）

単一ファイル `index.html`（HTML5 / Vanilla JS）で動く、シレン風ローグライク。

- 遊ぶ：GitHub Pages の URL を開く（スマホ向け）
- 絵の差し替え：`assets/<キー>.png` を置くと自動で読み込まれる（https のときのみ）。キーは `player goblin floor wall stairs ground tree roof hwall door gate pillar town` と各アイテム名（`potion onigiri`）。キャラとアイテムは背景を単色マゼンタ(#FF00FF)にすると自動で透明になる。
- 町の一枚絵：`assets/town.png`（22:15）。判定は内部の22×15の格子。設定の「町の判定を表示」でズレを確認できる。
- 絵のプロンプト：`docs/art_prompts.md` / 町の配置ガイド：`docs/town_layout_guide.png`
- 保存：ブラウザの localStorage（URLごとに別）。
