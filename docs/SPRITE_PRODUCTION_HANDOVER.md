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

武器12種類の一覧確認と量産、盾の種類展開、所持品に連動する装備交換。現在のゲーム試作は制作開始時点のゲームを複製したもので、最新版index.htmlへの統合は未実施。ルートの本編は変更していません。古い制作資料の絶対パスや画像生成パスは制作履歴です。次の制作ではリポジトリ内の実ファイルと承認済みv3を参照してください。
