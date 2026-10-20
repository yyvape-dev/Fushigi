# 装備 v3：NWの盾を腕全体の後ろへ

preview.html：全8方向の装備と攻撃を確認。
NW-SE-depth-check.png：NW/SE全コマ。equipment-8directions.gif：8方向連続再生。
game-equipment.html：剣・盾を表示するローカルゲーム試作。フォルダ全体をHTTP配信して利用。

v2では拳の小さなマスクだけを盾に重ねており、前腕が盾に隠れて不自然だった。
v3はNWのleft.layerをback、handOverShieldをfalseとし、盾の後にキャラクター全体を描く。肩・前腕・拳が連続して見える。
SEと装備倍率（剣+20%、盾+18%）は変更していない。

再現：fix_nw_occlusion.py はNWの基準と全攻撃コマの前後設定を適用する。apply_equipment_revision.py も今回の設定に更新済み。build_attack_preview.py / integrate_attack.py で再生成できる。

check_equipment.py は表示と読み込みに加え、NW全6コマについて、盾ありの合成画像が元キャラクターの全不透明画素をそのまま保持していることを確認。結果はNW-pixel-validation.json。描画順だけの検証で済ませない。

ローカル成果物。GitHubへpush・公開URL発行は未実施。所持品連動・12種類の装備展開は未実装。
