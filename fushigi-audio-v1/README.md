# Fushigi 音の試聴室 v1

2026-10-21。ユーザーが町の方向を「洋風の油絵絵本ファンタジーの城下町、少し祭り感、笛と弦楽器のアイリッシュ」と指定。ダンジョンは草木の軽さ／コミカルな重厚感／不気味さと緊張を、愛嬌を残した3パターン。強化は金属のきらめき、レベルアップは笛と太鼓の祭囃子。まず候補を試聴する段階。

## 試聴

`index.html`。本編にはまだ音を接続しない独立ページ。4 BGMはPeriTuneの既存フリー素材、2 SEはオリジナル合成音の方向確認用試作。SEは生楽器録音ではない。選曲の意図は配布元の楽器・曲説明に基づく候補であり、音の最終判断はユーザーの試聴で行う。

| 用途 | 曲 | 配布元 |
| --- | --- | --- |
| 町 | Harvest5 | https://peritune.com/blog/2018/10/26/harvest5/ |
| 草木の探索 | Breeze | https://peritune.com/blog/2017/03/02/breeze/ |
| 軽快な地下探索 | Labyrinth | https://peritune.com/blog/2015/11/01/labyrinth/ |
| 愛嬌のあるホラー | Spook | https://peritune.com/blog/2015/09/30/spook/ |

BGM同士は排他再生、SE中はBGMを35%へ減音して終了後に復帰。自動再生なし。画面を離れたら停止し、自動復帰しない。BGM/SE音量とミュートの保存キーは `fushigi_audio_audition_v1`、本編のセーブには触れない。ループのつなぎ目ボタンで末尾5秒へ移動。

## 権利と出典

BGM：PeriTune / むつき醒。4曲とも2026年2月以前に公開された **CC BY 4.0** 曲。各曲ページの表示と [2026-10-21に確認した公式条件](https://peritune.com/about/) により旧曲への同ライセンス継続適用を確認。新曲の独自条件とは混同しない。

ライセンス：https://creativecommons.org/licenses/by/4.0/ 。公式ループ版MP3をzipから取り出すか単体MP3から取得し、音声ファイルの加工なし。曲名・作者・元ページ・ライセンスを画面内にも表示。取得URL・zip内パス・SHA-256は `sources/bgm.json`。クレジットは本編接続時にも引き継ぐ。

SE：本プロジェクト向けの手続き的な合成音。既存ゲームの旋律・録音・サンプルは不使用。`render_se.py` は固定乱数で金属の非整数倍音、息成分付き笛の音色、減衰する打楽器を合成。`sources/se.json` に出力ハッシュを記録。

## 再構築・検証

```sh
python fushigi-audio-v1/fetch_bgm.py
python fushigi-audio-v1/render_se.py
python -m http.server 8000
# 別端末
python fushigi-audio-v1/check.py
```

SE生成はnumpy、検証はPlaywrightとChromiumを使用。3画面サイズで6音源を実ブラウザでデコードし非無音を確認。再生切替、SE減音と復帰、ミュート、ループ設定、停止、音量設定保存、初回自動再生なしと画面内収容を検証。`validation.json` と `audition-*.png` に保存。デコード成功は音色・曲調の聴感評価とは区別する。

保留：ユーザーの選曲・音色確認後の本編接続、通常操作／戦闘のSE、場面切替と音量設定の本編メニュー統合。旧装備サイズ修正PR #9は別件のまま。
