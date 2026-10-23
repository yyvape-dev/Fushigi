# 根絡みの古庭：追加ロケーションの試作

`index.html` が確認画面。リポジトリを HTTP 配信してこのフォルダを開く。
本編と同じ地形・操作・キャラを使い、同じ階で「新しい古庭」と「従来の遺跡」を切り替えられる。「別の部屋」「別の階」「マス境界」で配置と判定を確認する。

既存5ロケーションの自動巡回にはまだ加えていない。追加候補は `DungeonGenerator.locations`、既存巡回は従来の `DungeonGenerator.themes`。新ロケーションの描画だけ `assets/overgrown-garden.js` に分離し、既存の描画へはそのまま委譲する。

## 今回試したルール

- 部屋の座標・地形の描画シードから、根／苔／崩れ石の主題と主役になる壁を選ぶ。
- 一部屋を一つの連続した絵として合成し、壁際から広がる濃淡と群生を作る。タイルごとの独立抽選はしない。
- 中央、出入口、階段、通路、店舗床を空ける。保護する部分へ近づくにつれ装飾を薄くし、マス境界で絵が突然切れないようにする。
- 根は壁側から室内へ伸びる曲線。苔と小石も同じ部屋のまとまりに従う。すべて平面の装飾で、障害物・取得アイテムにはしない。
- 壁は奥0.32マス／手前0.12マスの一定高。露出した境界の縁取り・側面の陰影で段差を示す。移動・角抜け・視界のルールは変更しない。
- 地形・役割の変化で合成キャッシュを無効化する。大砲で床になったマスはライブの地形と部屋所属から描画し直す。
- 床の模様は3マス単位でつなぎ、一マスごとの繰り返しを弱める。

新規の生成画像ではなく、既存のオリジナル遺跡素材 `assets/dungeon/locations-v1/ruins/` とCanvasによる装飾を使った配置ロジックの試作。素材自体の制作履歴は `fushigi-locations-v1/`。植物の専用原画は未制作。

確認画面では全localStorageをフレーム内のメモリへ差し替える。本編の冒険保存、町の保存、設定やページ離脱時の保存に触れない。確認画面を再読込すると初期状態へ戻る。

## 確認

```sh
node tests/harness.js index.html tests/test_overgrown_garden.js
node tests/harness.js index.html tests/test_mvp.js
node tests/harness.js index.html tests/test_dungeon_modules.js
node tests/harness.js index.html tests/test_run_save.js
# 別のセッションで python3 -m http.server 8000 --bind 127.0.0.1 を起動
python3 fushigi-overgrown-garden-v1/check_browser.py
```

ブラウザ検証はシステムChromiumとPython Playwrightを使用。根・苔・小石、縦横画面、比較切替でのゲーム状態維持、保存復元、大砲による壁破壊後の描画、本編localStorageが不変であることを確認する。現在の結果は `validation.json`。同時に比較用JPEGを出力する。

- [根・横画面](roots-landscape.jpg)
- [苔・横画面](moss-landscape.jpg)
- [崩れ石・横画面](rubble-landscape.jpg)
- [根・縦画面](roots-portrait.jpg)
- [従来の遺跡・同じ地形](previous-ruins.jpg)

今後はスマホでの判読性と、根の描画密度・壁の四角さを見て調整する。専用原画の制作や通常階への出現はこの試作の確認後に判断する。
