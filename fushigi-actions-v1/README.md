# 歩行・食事／草・巻物・杖のモーション v1

8方向比較: https://yyvape-dev.github.io/Fushigi/fushigi-actions-v1/preview.html

実ゲーム確認: https://yyvape-dev.github.io/Fushigi/fushigi-dungeon-v1/random-review.html

承認済みv3の各方向基準絵と、同じ方向の3Dポーズガイドを必ず参照して画像生成。8方向×4動作×4生成コマ＝128コマ。食事と草は口へ運ぶ身体動作を共有し、手持ち画像を替える。歩行は実際の膝・足の踏み替えを描いたループ。全体の上下動やパーツ回転だけで歩いたように見せていない。

## 構成

- `source-art/{方向}.png`：生成原画。別方向や既生成結果だけから連鎖していない。
- `guides/{方向}-sheet.png`：生成時に使った同方向の4×4ポーズガイド。
- `make_guides.py` / `build_guides.py` / `action-mannequin.blend`：ガイド再現用。
- `generation-record.json`：生成プロンプトと各方向の参照元。
- `build.py`：アトラス切出し、透明域の浮遊ノイズ除去、方向ごとの共通倍率・画像全体の移動による接地合わせ。関節やコマの局所変形はしない。
- `calibration.json`：登録後の実画像を見て合わせた左右の握り位置。ガイド座標を無検証で流用しない。
- `actions.json`：各コマの表示時間・握り・描画順・原画／承認基準のSHA256。
- `../assets/hero-actions-v1/`：32枚の本番WebPアトラス。配信時は高品質WebP、原画はPNGで保持。
- `../assets/hero-actions.js`：描画。武器0.66、盾0.59、NWは盾を身体の後ろ、SEは専用quarter-seと前側描画を維持。

## 本編への接続

歩行は実移動の開始で220msループを開始し、連続移動では継続、停止で承認済み待機絵へ戻る。食事／草520ms、巻物560ms、杖380ms。道具使用に成功した時に再生し、使用不能や装備着脱には流用しない。杖は回数切れでも振る。使用中は武器・盾から道具へ持ち替え、開始・終了の表示は承認済み待機絵と一致する。方向は使用開始時の向きに固定。次の移動・攻撃は前のモーションを中断できる。

元のターン処理とアイテム効果は即時のまま、動作を同時に再生する。効果の発生を中間コマまで遅延する変更は行っていない。後ろ向きの食事・巻物は身体の向こうで道具を持つため、小物が隠れるのが正しい。杖の長さは画面奥行きに応じて短縮する。

初期固定部屋とランダム生成確認にも最新本編を使用。「動作確認」で実際に道具使用処理を呼べる。確認ページは本編のセーブを読み書きしない。

## 再現と検証

`blender -b -t 4 --python fushigi-actions-v1/make_guides.py` → `python fushigi-actions-v1/build_guides.py`。生成原画がある状態で `python fushigi-actions-v1/build.py`。

`python -m http.server 8001 --bind 127.0.0.1` → `python fushigi-actions-v1/check.py`。

- 歩行3,840装備描画（12武器×10盾×8方向×4コマ）。
- 使用動作144表示、開始・終了48表示が承認済み待機絵と画素一致。
- NW全4コマ×10盾で元の不透明な身体画素を保存。SE専用視点を検証。
- 本編入力から歩行が描画され、食事・草・巻物・杖の実使用が正しい動作へ接続。
- 縦横表示、ブラウザ例外なし。`validation.json` と `*-preview.png` / `game-*.png` を保存。
- `node tests/harness.js index.html tests/test_hero_actions.js`、既存MVP一式、200階の生成・取引検証。

回帰確認で、店を後から配置すると通常敵が減る場合と、小さい魔物部屋で通常配置が特殊部屋の枠を食う場合を確認。店を通常配置前に確保し、魔物部屋は必要な空き床を持つ部屋を選んで通常配置を置換するよう修正した。
