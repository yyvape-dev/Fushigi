# enemyC：深層6系統＋アビスロード

ユーザー採用の7体を本編へ実装。ニンジャ・まじゅつ師・ミミック・すず坊主・いかずち岩・おおづつ兵の4ランク24種と、専用デザインの主アビスロード。全8方向の待機・歩行・攻撃を用意し、ゴブリンの仮表示と主の通常ドラゴンの色替えを置換した。

すず坊主はユーザー指定の「人ではなくモンスターモチーフ」を反映した一つ目妖怪。灰青色の釣鐘形の頭、牙・爪、黄色い法衣・数珠・金の鈴。人型の味方顔に見えた初稿は履歴に残し、他の人型3種も鋭い目・陰・険しい表情へ修正済み。

## 表示と本編接続

- `runtime/`：7体×8方向、256px待機PNGと512×256pxの歩行/攻撃アトラス。足元原点(128,224)。左右反転は使用しない。
- `runtime.json`：本編読込表。既存の `assets/monster-families.js` が以前の15系統と合わせて読み、上位ランクは既存の輝度を保つ色変換を使う。主はfamily=`lord`、tier=1で王冠・黒紫の鱗・翼の原色を保つ。
- 待機＋描いた歩行1姿勢＋攻撃1姿勢を既存の300ms攻撃／320ms歩行のタイミングで再生。開始・終了は待機の実画像へ戻る。拡縮や回転でモーションを作らない。
- 鈴での召喚と、同室への岩の雷反撃時にも方向を固定した攻撃ポーズを開始する。能力値・出現表・ターン数・ダメージ・保存仕様は変更しない。
- `runtime-preview.html`：本編と同じ描画処理による、向き・動作・ランク・自動向き切替の図鑑。
- `game-review.html`：最新indexから生成した別セーブ・高HPの本編確認。種類とランクを選び配置、歩行/攻撃確認ボタンあり。本編のセーブは使わない。
- `art/` と `enemyC.png` / `preview.html`：採用デザインの基準絵とラナとの縮小比較。基準絵制作の時点の画面として保持。

## 原画と再現

`source-art/` に原画・修正前の試作・生成時に参照した方向別待機シートを保存。原画から連鎖で別方向を作らず、採用基準絵と方向別3Dガイドから8方向を描き、その確定方向の絵とポーズガイドから各動作を生成した。

最初の指定は `node tests/tools/sheets.js prompt enemyC`。ラナv3のSE絵を画風参照。敵の顔と妖怪坊主の修正は同ツールの今後のプロンプトにも反映済み。初期指示は `initial-prompt.txt` / `prompts.json`、顔の修正は `enemy-face-prompts.json`、坊主の妖怪化は `summoner-monster-prompt.json`。8方向は `directional-generation.json`、動作は `motion-generation.json`、個別修正は `caster-direction-fix.json` / `cannon-direction-fix.json` / `summoner-motion-fixes.json`。左斜め前・大砲の正面/背面/左右の狙い・鈴の光の軌跡のセル混入と正面の手を修正した。

`guides/` はBlenderの簡易3Dガイド。採用済みカメラ26度を再利用。形の装飾は原画を優先する。`make_guides.py` / `compose_guides.js` で再生成できる。

`build.js` は採用された1方向の基準絵の切り出し、`build_runtime.js` は方向・動作の登録。原画の透明な隙間で分割、シート間は共通比率で解像度を合わせ、全方向/動作に共通の種別倍率を適用する。個別修正原画は元シートの単位へ登録する。コマごとの体の変形や隠れた倍率補正は使わない。`manifest.json` は基準絵情報、`runtime-source-hashes.json` / `runtime-reference-hashes.json` は原画と参照のSHA256。

```sh
node fushigi-enemy-c-v1/build_runtime.js
python3 fushigi-enemy-c-v1/build_review.py
python3 -m http.server 8014 --bind 127.0.0.1 > /tmp/fushigi-http.log 2>&1
# 別ターミナル。環境に応じてChromiumのパスを指定する
python3 fushigi-enemy-c-v1/check_runtime.py
node tests/harness.js index.html tests/test_deep_enemies.js
node tests/harness.js index.html tests/test_monster_families.js
node tests/harness.js index.html tests/test_run_save.js
node tests/harness.js index.html tests/test_mvp.js
```

## 確認

600通り（25種×8方向×3動作）の非空描画・端の欠けなし、112通りの基本種歩行/攻撃の変化、432通りの上位色変換と透過不変、攻撃の開始・終了の待機復帰を実ブラウザで確認。全7体の基本/最上位を本編に配置し、方向付き攻撃とセーブ分離、縦横画面、JS例外なしを確認。`runtime-validation.json` と `*-runtime-contact.png` / `game-portrait.webp` / `game-landscape.webp` に保存。深層373項目・既存84種・保存31項目・MVPが ALL OK。

深層テストの大砲の射撃は一度ランダムな地形で失敗し再実行で通過。ゲーム側の射撃条件や命中率は変更していない。バランスの実機の感触は引き続き未計測。
