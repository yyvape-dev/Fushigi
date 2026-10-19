# 実ブラウザ(Chromium)で横持ち/縦持ちのスクリーンショットを撮る。HUDやCSSの確認用。
# 使い方: python3 tests/tools/shot_playwright.py  → /tmp/pw_land.png, /tmp/pw_port.png ほか
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, w, h in [('land', 844, 390), ('port', 390, 844)]:
        pg = b.new_page(viewport={'width': w, 'height': h}, has_touch=True)
        pg.goto('file://' + __import__('os').path.abspath('index.html')); pg.wait_for_timeout(1500)
        pg.screenshot(path=f'/tmp/pw_{name}_town.png')
        pg.evaluate('enterDungeon()'); pg.wait_for_timeout(1200)
        pg.screenshot(path=f'/tmp/pw_{name}.png')
        pg.close()
    b.close()
