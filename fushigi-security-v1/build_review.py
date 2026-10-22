from pathlib import Path
P=Path(__file__).resolve().parent
s=(P.parent/'fushigi-shops-v1/game-review.html').read_text().replace('fushigi_shops_review_v1','fushigi_security_review_v1')
(P/'game-review.html').write_text(s)
