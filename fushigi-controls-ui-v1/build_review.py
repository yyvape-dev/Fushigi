"""Same production game plus a deterministic scene picker, with an isolated save."""
from pathlib import Path
P=Path(__file__).resolve().parent
s=(P.parent/'index.html').read_text().replace('<head>','<head>\n<base href="../">',1).replace("const SAVE_KEY = 'fushigi_core_save_v1';","const SAVE_KEY = 'fushigi_controls_review_v1';")
css='''<style>#reviewTools{position:fixed;z-index:9;right:12px;top:48px;display:flex;gap:5px;max-width:95vw;padding:5px;background:#140f23bd;border:1px solid #b99751;box-sizing:border-box;overflow-x:auto}#reviewTools select,#reviewTools button{font:12px monospace;color:#f6e9c8;background:#2a2038;border:1px solid #a68b56;padding:7px 5px;touch-action:manipulation}body.menu-visible #reviewTools,body.bag-visible #reviewTools{display:none}@media(orientation:portrait){#reviewTools{top:74px;left:10px;right:10px}}</style>'''
s=s.replace('</head>',css+'</head>').replace('</body>','<script src="fushigi-experience-v1/review-tools.js"></script></body>')
(P/'review.html').write_text(s)
print('Built review.html from current index.html; review save is isolated.')
