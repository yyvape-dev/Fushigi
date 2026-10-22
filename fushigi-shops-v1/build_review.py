from pathlib import Path
P=Path(__file__).resolve().parent
s=(P.parent/'index.html').read_text().replace('<head>','<head>\n<base href="../">',1).replace("const SAVE_KEY = 'fushigi_core_save_v1';","const SAVE_KEY = 'fushigi_shops_review_v1';")
s=s.replace('</head>','<style>#shopReviewTools{position:fixed;z-index:9;right:8px;top:112px;display:flex;gap:4px;max-width:94vw;flex-wrap:wrap}#shopReviewTools button{background:#241d16ed;color:#eed3a2;border:1px solid #b39157;padding:7px}body.shop-dialog-open #shopReviewTools,body.menu-visible #shopReviewTools{visibility:hidden}@media(orientation:landscape){#shopReviewTools{top:45px}}</style></head>').replace('</body>','<script src="fushigi-shops-v1/stage.js?v=entrances-v2"></script></body>')
(P/'game-review.html').write_text(s)
