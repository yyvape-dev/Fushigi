from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text().replace('<head>','<head>\n<base href="../">',1)
html=html.replace('fushigi_core_save_v1','fushigi_monster_house_v2_review_core')
html=html.replace('<script src="assets/run-save.js?v=event-vfx-v1"></script>',
 '<script>'+(root/'assets/run-save.js').read_text().replace('fushigi_run_save_v1','fushigi_monster_house_v2_review_run')+'</script>')
html=html.replace('</body>','<script src="fushigi-monster-house-v2/stage.js"></script></body>',1)
(root/'fushigi-monster-house-v2/game-review.html').write_text(html)
