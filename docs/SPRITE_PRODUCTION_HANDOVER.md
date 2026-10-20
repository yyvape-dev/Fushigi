# 承認済みキャラクター・武器・盾の制作引き継ぎ

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

### 武器12種類の初版（2026-10-20）

[`fushigi-weapons-v1/`](../fushigi-weapons-v1/) に12種類の候補原画・登録済み装備画像・装備切替プレビューを追加した。
一覧は本編 `ITEMS` およびシート `weapon` と照合済み。銀の剣の承認原画を参照して生成し、ハリセンのみ扇子状の初回出力を折り紙の束状に修正した。
v3の基準絵・攻撃・盾・描画処理を相対参照し、承認済みフォルダは変更していない。
武器倍率0.66、盾0.59、NW/SEの重なりを維持。全576描画・NW全コマ不透明画素・握り・モバイル横幅を検証済み。本編MVPテストも `ALL OK`。
確認画面: https://yyvape-dev.github.io/Fushigi/fushigi-weapons-v1/preview.html
原画の参照記録とハッシュは同フォルダの `generation-record.json` / `weapons.json`、再現は `build.py` / `check.py`。
初版のユーザー確認待ち。武器は正面1視点で、斧のSE戻りが髪・顔に近づく点は視点追加・姿勢調整の検討対象。
次は12武器の見た目の確認・修正。その後に盾10種類と所持品連動。本編統合はまだ行っていない。

盾の種類展開、所持品に連動する装備交換が今後の範囲です。現在のゲーム試作は制作開始時点のゲームを複製したもので、最新版index.htmlへの統合は未実施。ルートの本編は変更していません。古い制作資料の絶対パスや画像生成パスは制作履歴です。次の制作ではリポジトリ内の実ファイルと承認済みv3を参照してください。
