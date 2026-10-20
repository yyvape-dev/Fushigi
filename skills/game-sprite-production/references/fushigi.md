# Fushigi の採用済み設定と引き継ぎ

2026-10-20 時点。ユーザーはマネキンから生成絵を作る方式と、方向別基準絵・攻撃モーションを承認済み。

- 元リポジトリ: `<repo>`（GitHub: yyvape-dev/Fushigi）。ローカル試作を GitHub に push したとは扱わない。
- キャラクター: 金髪ボブ、赤い短いマント、黒金の鎧。大きい金の肩当てはキャラクター自身の左。右手に武器、左手に盾。
- 方向順: S, SW, W, NW, N, NE, E, SE。非対称なのでミラーで代用しない。
- 基準画像: `<repo>/fushigi-direction-base/assets/hero-base/{方向}.png`。256×256 RGBA、足元原点 (128,224)、頭頂から足元192px。
- 通常のゲーム表示: 頭頂から足元96px（タイル64px・倍率1.5）。詳細は `<repo>/fushigi-direction-base/BASE_CONTRACT.md` と `assets/hero-base/base.json`。
- 攻撃: `<repo>/fushigi-attack/assets/hero-attack/`。6コマ、35/70/40/55/60/40ms、合計300ms。最初と最後は基準絵そのもの。
- 方向ごとの基準絵とガイドを個別に参照して生成済み。参照記録は `reference-manifest.json`、`generation-record.json`。
- 握り調整の再現元: `<repo>/fushigi-attack/calibrate_attack.py`。描画: `hero-attack-renderer.js`。
- 装備付き見本: `<repo>/fushigi-attack/SW-attack-with-sword.gif`、`SW-weapon-check.png`、`attack-8directions.gif`。
- 実ゲーム試作: `<repo>/fushigi-attack/game-attack.html?testWeapon=1`。確認画面: `<repo>/fushigi-attack/preview.html`。

## 現在の承認済み装備基準（v3）

ユーザーが「パーフェクトだ」と承認した最新版は `<repo>/fushigi-equipment-v3/`。以後の装備追加はここを基準にする。v1/v2は過去の試作であり、そこから再開しない。

- 銀の剣と鉄の丸盾のデザインを承認済み。剣の描画倍率0.66（初版から20%増）、盾0.59（18%増）。握りを中心に拡大する。
- 盾は正面・斜め・側面・裏面を別画像で切り替える。
- NWは盾をキャラクター全体の後ろに描き、肩・前腕・手首・拳を連続して見せる。基準絵と全攻撃コマの `left.layer=back`、`left.handOverShield=false`。
- SEは手より盾が前。`left.layer=front`、`left.handOverShield=false`。武器の握りを描き直した後に盾を描く。
- 再現元は `fix_nw_occlusion.py`、調整済み設定は `assets/hero-base/base.json` と `assets/hero-attack/attack.json`。
- 確認画面 `preview.html`、比較画像 `NW-SE-depth-check.png`、ゲーム試作 `game-equipment.html`。
- `check_equipment.py` は全方向の表示に加え、NW全6コマの不透明な元キャラクター画素が盾で覆われないことを検証する。

## 同じ失敗を避ける

v2では盾を前に描き、小さな拳のマスクだけを後から重ねた。描画順のテストは通ったが、前腕が盾に隠れて手が浮き、ユーザーから全コマで逆に見えると指摘された。順番のログと小さい拳の表示だけで合格にしない。腕全体がつながる実画像を全コマ・実ゲームサイズで確認する。

## 未実装の範囲

12種類の装備への展開、所持品に応じた装備画像の切り替え、武器の視点追加、攻撃判定とVFXのタイミング調整、歩行など他のアニメーション。現状はローカル試作で、GitHubへpush・公開URL発行はしていない。
