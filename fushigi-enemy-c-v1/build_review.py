from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text().replace('<head>','<head>\n<base href="../">',1)
html=html.replace('fushigi_core_save_v1','fushigi_enemy_c_review_core')
import re
html=re.sub(r'<script src="assets/run-save.js[^\"]*"></script>',lambda m:'<script>'+(root/'assets/run-save.js').read_text().replace('fushigi_run_save_v1','fushigi_enemy_c_review_run')+'</script>',html)
html=html.replace('</body>','<script src="fushigi-enemy-c-v1/stage.js"></script></body>',1)
(root/'fushigi-enemy-c-v1/game-review.html').write_text(html)
