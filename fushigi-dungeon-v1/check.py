from playwright.sync_api import sync_playwright
from pathlib import Path
import json
P=Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':844,'height':390}); errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000/fushigi-dungeon-v1/preview.html');page.wait_for_timeout(1200)
 assert not errors,errors
 assert page.evaluate('TS===64 && scene==="dungeon" && Object.values(previewImages).every(i=>i.naturalWidth===256)')
 page.screenshot(path=str(P/'game-landscape.png'))
 # Follow room, doorway, narrow passage, corner and end; then collide with wall.
 for key,n in [('ArrowRight',8),('ArrowDown',4)]:
  for _ in range(n): page.keyboard.press(key)
 page.wait_for_timeout(250)
 assert page.evaluate('player.x===14 && player.y===9')
 page.keyboard.press('ArrowRight');assert page.evaluate('player.x===14 && player.y===9')
 page.get_by_text('マス線',exact=True).click()
 page.get_by_text('元絵と比較',exact=True).click();assert page.evaluate('blit===originalBlit')
 page.get_by_text('元絵と比較',exact=True).click();assert page.evaluate('blit===previewBlit')
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(250)
 assert page.evaluate('TS===32')
 page.screenshot(path=str(P/'game-portrait.png'))
 assert not errors,errors
 (P/'validation.json').write_text(json.dumps({'browserErrors':errors,'landscape':[844,390,64],'portrait':[390,844,32],'route':'room → doorway → corridor → corner → end; wall collision passed','artToggle':True,'gridToggle':True},indent=2))
 b.close()
print('ALL OK')
