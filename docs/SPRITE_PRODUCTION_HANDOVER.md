# 承認済みキャラクター・武器・盾の制作引き継ぎ

## 本編統合（2026-10-20・最新）

ユーザーが前回制作物を正として本編統合を明示承認。`assets/approved-hero.js` でv3基準絵・攻撃・12武器・10盾を読み、本編の所持品に連動。SE専用quarter-seとNW/SE描画順を維持。キャラを左右反転しない。原画とv3レンダラーは未変更。旧版キャラを使ってしまった最初の部屋プレビューも最新本編から再生成した。歩行専用コマは未制作。カタログ外初期装備の扱いは `docs/DUNGEON_GENERATION.md` を参照。以下の「本編未統合」「盾確認待ち」は過去の記録。

ユーザー承認済みの基準は [fushigi-equipment-v3](../fushigi-equipment-v3/) です。この資料と成果物はリポジトリに収録しています。記載中の `<repo>` はこのリポジトリのルートです。

- [制作スキル](../skills/game-sprite-production/SKILL.md)
- [採用設定・失敗と修正の記録](../skills/game-sprite-production/references/fushigi.md)
- [NW・SE全コマ比較](../fushigi-equipment-v3/NW-SE-depth-check.png)
- [装備付き攻撃GIF](../fushigi-equipment-v3/equipment-8directions.gif)
- [方向別基準絵と契約](../fushigi-direction-base/BASE_CONTRACT.md)
- [攻撃制作資料](../fushigi-attack/README.md)

## 維持する仕様

NWの盾はキャラクター全体より後ろ。拳だけを後から重ねる方式は前腕を隠すため不採用。SEの盾は手より前。待機と攻撃の全コマで維持する。剣のrenderScaleは0.66、盾は0.59。修正設定はv3のbase.jsonとattack.json、再現用はfix_nw_occlusion.py。

## 画面の確認

リポジトリルートで `python -m http.server 8000` を実行し、`http://localhost:8000/fushigi-equipment-v3/preview.html` を開く。ゲーム試作は同フォルダの `game-equipment.html`。GitHub上のHTMLはソース表示になるため、直接プレイする公開URLとは別です。

## 再現と検証

v3のprepare_equipment.pyは同梱source-artから装備画像を切り出す。再切り出し後はapply_equipment_revision.pyとfix_nw_occlusion.pyを実行して承認済み設定を戻す。build_attack_preview.py、integrate_attack.pyで確認画面とゲーム統合試作を再生成できる。integrate_attack.pyの出力はgame-attack.htmlで、装備表示はURLに `?testWeapon=1&testShield=1` を付ける。

check_equipment.pyはPillowとPlaywright、システムChromiumを使用する。NWの元キャラ不透明画素を盾が覆わないことを全6コマで検証する。既存の検証結果と比較画像も同梱済み。

## 今後の範囲

### 盾10種類の初版（2026-10-20・武器へのGOの後）

**最新修正：SEの左右傾斜。** ユーザーからSEの盾の傾きが逆との指摘を受け、SE専用の `quarter-se.png` を10種類追加した。SWは元のquarterを維持。左側の厚みが見え、表面が画面右へ向く原画を、元の盾デザインとSE基準絵を参照して描き直した。文字・模様の単純反転は使わない。合計50枚。倍率0.59・握り・NW/SEの描画順は維持。元40画像はハッシュ比較で不変を確認。`SE-yaw-before-after.png` と `SE-all-frames.png` で確認する。その後ユーザーが「終わったらmainに反映しといて」と明示承認し、盾一式とSE修正をコミットca13709までmainへpush済み。

ユーザーが武器12種類の制作とmainへのpushにGOを出した。武器はコミット `db936b8` で反映し、PagesのHTTP 200を確認済み。
続く依頼「次は盾」に対して [`fushigi-shields-v1/`](../fushigi-shields-v1/) を制作。10種類×正面・斜め・側面・裏面=40枚を原画から切り出し、盾と武器を切替できるプレビューを用意した。
倍率は剣0.66・盾0.59。v3の基準・ソケット・NW/SE重なりは変更していない。裏の革の握りは個別登録し、4視点の見かけ高さは盾ごとに統一。
480コマ、銀の剣＋12武器との6,240描画、10盾×6コマのNW不透明画素保存、40画像読み込み、視点切替、モバイルUIを検証済み。比較画像・攻撃GIF・原画・再現スクリプト・ハッシュを同梱。
確認画面: https://yyvape-dev.github.io/Fushigi/fushigi-shields-v1/preview.html
盾は初版のユーザー確認待ち。次は盾の見た目の修正、その後に所持品連動と最新版本編への統合。歩行・VFX調整は未実施。

### 武器12種類の初版（2026-10-20）

[`fushigi-weapons-v1/`](../fushigi-weapons-v1/) に12種類の候補原画・登録済み装備画像・装備切替プレビューを追加した。
一覧は本編 `ITEMS` およびシート `weapon` と照合済み。銀の剣の承認原画を参照して生成し、ハリセンのみ扇子状の初回出力を折り紙の束状に修正した。
v3の基準絵・攻撃・盾・描画処理を相対参照し、承認済みフォルダは変更していない。
武器倍率0.66、盾0.59、NW/SEの重なりを維持。全576描画・NW全コマ不透明画素・握り・モバイル横幅を検証済み。本編MVPテストも `ALL OK`。
確認画面: https://yyvape-dev.github.io/Fushigi/fushigi-weapons-v1/preview.html
原画の参照記録とハッシュは同フォルダの `generation-record.json` / `weapons.json`、再現は `build.py` / `check.py`。
この初版にはその後ユーザーからGOを受けた。武器は正面1視点で、斧のSE戻りが髪・顔に近づく点は視点追加・姿勢調整の検討対象。
武器を公開後、上記の盾10種類へ進んだ。本編統合はまだ行っていない。

盾の種類展開、所持品に連動する装備交換が今後の範囲です。現在のゲーム試作は制作開始時点のゲームを複製したもので、最新版index.htmlへの統合は未実施。ルートの本編は変更していません。古い制作資料の絶対パスや画像生成パスは制作履歴です。次の制作ではリポジトリ内の実ファイルと承認済みv3を参照してください。
