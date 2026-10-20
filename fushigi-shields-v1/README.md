# 盾10種類・5視点 SE傾斜修正版

承認済み `../fushigi-equipment-v3/` の主人公・待機・攻撃・描画処理を使用する盾10種類の候補。
武器は承認済み銀の剣、または `../fushigi-weapons-v1/` の12種類と組み合わせられる。

## 確認

- [盾・武器の切替、8方向、コマ送り](preview.html)
- [盾10種類の正面](shields-catalog.png)
- [全50枚の視点一覧](shield-views-catalog.png)
- [NW・10種類×6コマ](NW-all-frames.png)
- [SE・10種類×6コマ](SE-all-frames.png)
- [SE傾斜の修正前後](SE-yaw-before-after.png)
- [実ゲーム96px・8方向](game-size.png)
- [全盾・8方向の攻撃GIF](shields-8directions.gif)
- [検証結果](validation.json)

公開先: https://yyvape-dev.github.io/Fushigi/fushigi-shields-v1/preview.html
`?shield=minoshield&weapon=firesword` のように装備指定も可能。

|キー|盾|
|---|---|
|bronzeshield|青銅甲の盾|
|tekkoshield|鉄甲の盾|
|onioookami|おにおおかみ|
|battlecounter|バトルカウンター|
|mikiri|見切りの盾|
|konjo|根性の盾|
|zekkocho|絶好調の盾|
|haramochi|ハラモチの盾|
|steakplate|ステーキプレート|
|minoshield|ミノタウロスの盾|

## 維持した仕様

- 剣renderScale=0.66、盾=0.59。盾は160×192 RGBA、握りは(80,96)。
- NWは盾をキャラクター全体の後ろに描く。全6コマの元の不透明な体・腕の画素が保存される。
- SEは手の再描画後に盾を描く。小さい拳のマスクを足す方式に戻さない。
- v3の基準画像・攻撃コマ・ソケット・描画順・タイミングは変更していない。
- 正面・SW斜め・SE斜め・側面・裏面は実際に生成した別原画。正面の横つぶし・ミラーは使っていない。
- 元の4視点は共通の見かけ高さに揃え、縦横比を保持。v3相当の幅上限（正面/裏144px、斜め112px）と高さ152pxに収める。側面の実際の突起は64px幅まで許容。
- 裏面は原画の革の握り位置を個別指定して登録。正面・斜め・側面は盾の中心をソケットへ合わせる。

## 再現と検証

リポジトリルートで `python fushigi-shields-v1/build.py`、続けて `python fushigi-shields-v1/check.py`。
Pillow・NumPy・SciPy・Playwright・`/usr/bin/chromium` を使用する。
ローカル配信はリポジトリルートから `python -m http.server 8000`。

`build.py` が原画の大きな透過連結成分20個を各シートから抽出し、行と列を並べて各盾の4視点へ割り当てる。
`source-art/` に生成原画、`generation-record.json` に参照画像と生成概要、`shields.json` に原画・切り出しのハッシュ、枠、握り、倍率を保存する。

検証は50画像のRGBA・サイズ・透過境界・握り・ハッシュ、10×8×6=480コマの読み込み/空描画/端の欠け、全13武器（銀の剣＋12種類）との6,240描画における視点切替とNW/SE描画順、NWの60通りの不透明画素保存、モバイル横幅、UIの装備切替を実施。
v3の基準JSON2ファイルと描画JS2ファイルのハッシュも照合する。
NW/SE比較とゲームサイズ画像を目視確認。数値検証はユーザーの視覚品質承認とは区別する。

## 状態

武器12種類はユーザーがGOを出しGitHubに反映済み。盾10種類は今回の初版で、ユーザー確認待ち。
本編 `index.html` への統合・所持品との連動・歩行・VFXタイミングはまだ実装していない。
4視点は方向ごとの3D回転ではなく描き分け原画の切替。幅の広い盾や突起がある盾の輪郭は各方向・攻撃中に確認する。

## SE傾斜の修正

ユーザーから「SEの盾の左右の傾斜が逆」と指摘。初版はSWとSEで同じquarter画像を共有していたため、SEを独立したquarter-seに変更した。
SEの基準キャラクターと元の盾原画2枚を参照して、左側の厚みが見え、表面が画面右へ向く10枚を個別に描き直した。文字・模様・光源を単純反転していない。
SEの新画像は元のquarter表示範囲に等比で収め、握り(80,96)とrenderScale=0.59を維持。元の40スプライトとv3フォルダは変更していない。
待機と攻撃全6コマでSE専用画像を選択すること、SWは元のquarterのままであることを検証する。描画順・画素保存も再検証済み。
修正前画像はSE-before-correction.png、待機・振り抜きの比較はSE-yaw-before-after.png。mainへの盾のpushはまだ未承認・未実施。
