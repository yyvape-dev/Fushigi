from pathlib import Path
import re
P=Path(__file__).resolve().parent;root=P.parent
s=(root/'index.html').read_text().replace('<head>','<head>\n<base href="../">',1).replace('fushigi_core_save_v1','fushigi_enemy_fx_review_core')
s=re.sub(r'<script src="assets/run-save.js[^\"]*"></script>',lambda m:'<script>'+(root/'assets/run-save.js').read_text().replace('fushigi_run_save_v1','fushigi_enemy_fx_review_run')+'</script>',s)
s=s.replace('</body>','<script src="fushigi-enemy-vfx-v1/stage.js"></script></body>',1)
(P/'game-review.html').write_text(s)
