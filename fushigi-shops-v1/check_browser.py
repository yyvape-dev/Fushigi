from pathlib import Path
import json
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent;results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for name,w,h in [('portrait',390,844),('landscape',844,390),('small',320,640)]:
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8000/fushigi-shops-v1/preview.html');page.wait_for_function('window.ShopPreviewState?.ready',timeout=45000);assert page.locator('figure').count()==8;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.select_option('#action','walk');page.select_option('#direction','SE');page.screenshot(path=str(P/f'preview-{name}.png'),full_page=True)
  page.goto('http://127.0.0.1:8000/fushigi-shops-v1/game-review.html');page.wait_for_function('window.ShopReview?.ready',timeout=45000);page.wait_for_timeout(350)
  page.screenshot(path=str(P/f'game-{name}.png'));assert page.evaluate('Object.values(ShopSystem.state.images).length===72&&Object.values(ShopSystem.state.images).every(im=>im.complete&&im.naturalWidth===256)')
  values=page.evaluate('''()=>{const f=floorItems.find(f=>ShopSystem.lot(f.item));player.x=f.x;player.y=f.y;player.vx=f.x;player.vy=f.y;const gold0=gold;playerPickUp();return {gold0,debt:ShopSystem.debt(),turn};}''');assert values['debt']>0
  page.locator('[data-talk]').click();assert page.locator('#shopPrompt').is_visible();rect=page.locator('#shopPrompt').bounding_box();assert rect['x']>=0 and rect['y']>=0 and rect['x']+rect['width']<=w+1 and rect['y']+rect['height']<=h+1
  page.screenshot(path=str(P/f'dialog-{name}.png'));page.keyboard.press('ArrowRight');assert page.evaluate('turn')==values['turn'];page.locator('[data-shop="pay"]').click();assert page.evaluate('ShopSystem.debt()===0');assert page.evaluate('gold')==values['gold0']-values['debt'];page.keyboard.press('Escape');assert not page.locator('#shopPrompt').is_visible()
  for tier in [1,2]:
   page.locator(f'[data-tier="{tier}"]').click();assert page.evaluate('floorShop.tier')==tier;page.screenshot(path=str(P/f'tier-{tier}-{name}.png'))
  itemid=page.evaluate('''()=>{const it=inv.find(i=>i.type==='potion');floorItems=floorItems.filter(f=>f.x!==player.x||f.y!==player.y);dropType(ikey(it));return it.id;}''');g0=page.evaluate('gold');page.locator('[data-talk]').click();page.locator(f'[data-shop="sell"][data-id="{itemid}"]').click();assert page.evaluate('gold')>g0;page.keyboard.press('Escape')
  assert page.evaluate('''()=>{const f=floorItems.find(f=>ShopSystem.lot(f.item));takeFloor(f);const r=rooms[floorShop.room];player.x=r.x+r.w+1;player.y=r.cy;endTurn();return floorShop.hostile&&ShopSystem.state.wanted;}''')
  assert not errors,errors
  results.append({'viewport':name,'size':[w,h],'loadedPoses':72,'preview':True,'pickupPayment':True,'dialogFits':True,'inputFrozen':True,'sale':True,'theft':True,'errors':errors});page.close()
 b.close()
(P/'browser-validation.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print('ALL OK shop browser: 3 viewports, 72 images, purchase/sale/theft/dialogue')
