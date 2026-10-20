# 武器12種類・装備確認 初版

承認済み `../fushigi-equipment-v3/` を変更せずに使用する、12種類の武器候補。
主人公・盾・待機と攻撃のソケット・描画順はv3のもの。剣renderScale=0.66、盾=0.59。
武器の先端から握りまで175px、握りを中心に拡大する。幅は原画の縦横比を維持する。

## 確認リンク

- [装備切替・8方向・コマ送り](preview.html)
- [武器12種類](weapons-catalog.png)
- [NW・12種類×6コマ](NW-all-frames.png)
- [SE・12種類×6コマ](SE-all-frames.png)
- [ゲーム内96px・全武器8方向](game-size.png)
- [検証結果](validation.json)

GitHub Pages: https://yyvape-dev.github.io/Fushigi/fushigi-weapons-v1/preview.html

## 一覧

|キー|武器|
|---|---|
|woodsword|木刀|
|bronzesword|青銅の太刀|
|katana|カタナ|
|dotanuki|どうたぬき|
|minoaxe|ミノタウロスの斧|
|renkentou|連撃刀|
|kamaitachi|妖刀かまいたち|
|healsword|回復の剣|
|steakknife|ステーキナイフ|
|harisen|巨大ハリセン|
|skyblade|空の刃|
|firesword|火迅風魔刀|

## 再現

リポジトリルートから `python fushigi-weapons-v1/build.py`、続けて `python fushigi-weapons-v1/check.py`。
Pillow・NumPy・Playwrightと `/usr/bin/chromium` を使用する。
確認画面の配信はリポジトリルートから `python -m http.server 8000`。
http://localhost:8000/fushigi-weapons-v1/preview.html を開く。

原画は `source-art/`。参照画像・生成履歴は `generation-record.json`、原画とスプライトのハッシュ・手で合わせた握り座標は `weapons.json`。
最初のシートでハリセンが扇子の形だったため、折り畳み紙の原画を個別生成して置換した。
切り出し・透過処理は `build.py` で再現可能。v3の4ファイルのハッシュを照合し、基準の不変性も検証する。

## 確認状況と残る範囲

- 12×8×6=576描画の読み込み・空画像・出力端の欠け・NW/SEの描画順を検証。
- NW全6コマについて、盾が元キャラクターの不透明画素を覆わないことを比較。
- 握りの不透明画素、RGBA、モバイル画面の横はみ出しを検証。
- NW/SE全武器全コマの比較画像を目視確認。数値検証は視覚品質の承認とは区別する。
- 武器は正面1視点。方向別の原画追加は未実施。斧・ハリセンも片手用として今回のモーションに載せた候補で、専用モーションは未制作。
- 幅のある武器は戻りなどで顔・髪に近づく。特に斧のSE戻りは視点追加や姿勢調整の検討対象。
- 本編 `index.html` への装備切替統合、所持品連動、盾10種類、歩行、VFXタイミングは未実施。
- この初版はユーザー確認待ち。v3自体の承認を12武器の承認として扱わない。
