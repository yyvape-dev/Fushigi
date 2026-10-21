from pathlib import Path
P=Path(__file__).resolve().parent
s=(P.parent/'index.html').read_text().replace('<head>','<head>\n<base href="../">',1).replace("const SAVE_KEY = 'fushigi_core_save_v1';","const SAVE_KEY = 'fushigi_yuzunamiki_review_v1';")
s=s.replace('</head>','<style>#reviewTools{display:none}#allyReviewTools{position:fixed;z-index:9;left:8px;top:110px;background:#231b2bed;border:1px solid #a58b62;padding:6px;display:flex;gap:6px;flex-wrap:wrap;max-width:95vw}#allyReviewTools button,#allyReviewTools select{min-height:36px;color:#f4e3c8;background:#443047;border:1px solid #a58b62}body.menu-visible #allyReviewTools{display:none}@media(orientation:landscape){#allyReviewTools{top:46px}}</style></head>').replace('</body>','<script src="fushigi-experience-v1/review-tools.js"></script><script src="fushigi-allies-v1/stage.js?v=ground-v3"></script></body>')
(P/'game-review.html').write_text(s)
