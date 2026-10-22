"""Rebuild the isolated shop review page from the current game."""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
html = (root / 'index.html').read_text()
html = html.replace('<head>', '<head>\n<base href="../">', 1)
html = html.replace("const SAVE_KEY = 'fushigi_core_save_v1';", "const SAVE_KEY = 'fushigi_shops_review_v1';", 1)
style = '''<style>
#shopReviewTools{position:fixed;z-index:9;right:8px;top:112px;display:flex;gap:4px;max-width:94vw;flex-wrap:wrap}
#shopReviewTools button{background:#241d16ed;color:#eed3a2;border:1px solid #b39157;padding:7px;min-height:36px}
body.shop-dialog-open #shopReviewTools,body.menu-visible #shopReviewTools{visibility:hidden}
@media(orientation:landscape){#shopReviewTools{top:45px}}
</style>'''
html = html.replace('</head>', style + '\n</head>', 1)
html = html.replace('</body>', '<script src="fushigi-shops-v1/stage.js?v=ground-v3"></script></body>', 1)
(root / 'fushigi-shops-v1/game-review.html').write_text(html)
