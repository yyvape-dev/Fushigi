from pathlib import Path
P=Path(__file__).resolve().parent
s=(P.parent/'fushigi-controls-ui-v1/review.html').read_text().replace("fushigi_controls_review_v1","fushigi_monster_families_review_v2").replace('</body>','<script src="fushigi-monsters-v2/stage.js"></script></body>')
(P/'game-review.html').write_text(s)
