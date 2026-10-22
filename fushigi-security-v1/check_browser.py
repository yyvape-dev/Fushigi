from pathlib import Path
import json
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent;results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for name,w,h in [('portrait',390,844),('landscape',844,390),('small',320,640)]:
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8000/fushigi-security-v1/preview.html');page.wait_for_function('window.ShopSecurityPreview?.ready',timeout=45000);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('figure').count()==8
  for kind in ['guard','dog']:
   page.select_option('#kind',kind)
   for action in ['walk','attack','idle']:
    page.select_option('#action',action)
    for d in ['S','SW','W','NW','N','NE','E','SE']:page.select_option('#direction',d)
   page.select_option('#direction','S');page.screenshot(path=str(P/f'preview-{kind}-{name}.png'),full_page=True)
  page.goto('http://127.0.0.1:8000/fushigi-security-v1/game-review.html');page.wait_for_function('window.ShopReview?.ready&&ShopSecurity.state.ready',timeout=45000);page.wait_for_timeout(350)
  assert page.evaluate('Object.keys(ShopSecurity.state.images).length===48')
  assert page.evaluate('ShopSystem.keepers().length===floorShop.doors.length&&ShopSystem.keepers().every(k=>Math.max(Math.abs(k.x-k.door.x),Math.abs(k.y-k.door.y))<=1)')
  page.screenshot(path=str(P/f'shop-{name}.png'))
  assert page.evaluate('''()=>{const f=floorItems.find(f=>ShopSystem.lot(f.item));player.x=f.x;player.y=f.y;player.vx=f.x;player.vy=f.y;playerPickUp();return ShopSystem.keepers().every(k=>k.x===k.door.x&&k.y===k.door.y);}''')
  page.screenshot(path=str(P/f'exits-blocked-{name}.png'));page.locator('[data-talk]').click();page.locator('[data-shop="pay"]').click();page.keyboard.press('Escape')
  assert page.evaluate('ShopSystem.keepers().every(k=>k.x===k.home.x&&k.y===k.home.y)')
  page.locator('[data-theft]').click();assert page.evaluate('floorShop.hostile&&ShopSecurity.state.active&&enemies.some(e=>e.kind==="shop_dog")');page.wait_for_timeout(350);page.screenshot(path=str(P/f'theft-{name}.png'))
  # Draw each real actor/direction/action in the actual game renderer at game size.
  assert page.evaluate('''()=>{const canvas=document.createElement('canvas');canvas.width=1728;canvas.height=640;const g=canvas.getContext('2d'),old=TS;TS=64;g.fillStyle='#302a34';g.fillRect(0,0,1728,640);const dirs=[[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]];for(const [row,kind]of ['shop_guard','shop_dog'].entries())for(let i=0;i<8;i++){const t=now(),e={kind,x:i*3,y:row*4+2,vx:i*3,vy:row*4+2,monsterFace:dirs[i],monsterAttackFace:dirs[i],monsterAttackStart:t-60,st:{}};ShopSecurity.draw(g,e,t,64,0);}TS=old;window.poseCanvas=canvas;return true;}''')
  data=page.evaluate('poseCanvas.toDataURL().split(",")[1]');import base64;(P/f'game-poses-{name}.png').write_bytes(base64.b64decode(data))
  page.locator('[data-next]').click();assert page.evaluate('!ShopSecurity.state.active&&!ShopSystem.state.wanted&&!enemies.some(ShopSecurity.isSecurity)');page.screenshot(path=str(P/f'next-floor-{name}.png'))
  assert not errors,errors
  results.append({'viewport':name,'size':[w,h],'loadedPoses':48,'allDirectionsAndActions':True,'oneKeeperPerEntrance':True,'unpaidBlocksAllExits':True,'paidClearsExits':True,'theftSpawn':True,'floorChangeEndsPursuit':True,'errors':errors});page.close()
 b.close()
(P/'browser-validation.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print('ALL OK: guard/black dog, 48 poses, 3 viewports, physical entrances, theft and next-floor reset')
