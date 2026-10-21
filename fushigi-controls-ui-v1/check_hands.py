from pathlib import Path
import json
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for name,w,h in [('portrait',390,844),('landscape',844,390),('small',320,568)]:
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8000/fushigi-controls-ui-v1/review.html');page.wait_for_function('window.ExperienceReview && scene==="dungeon" && typeof chooseHandLayout==="function"')
  for hand in ['both','right','left']:
   page.evaluate("ExperienceReview.setup('room')");page.evaluate('(h)=>chooseHandLayout(h)',hand)
   boxes=page.evaluate("""()=>{const ids=['pad','atk','lft','moveModes'];return Object.fromEntries(ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,{x:r.x,y:r.y,w:r.width,h:r.height}]}));}""")
   for k,r in boxes.items():assert r['x']>=0 and r['y']>=0 and r['x']+r['w']<=w+1 and r['y']+r['h']<=h+1,(name,hand,k,r)
   assert (boxes['pad']['x']<w/2) if hand in ['left','both'] else (boxes['pad']['x']>w/2-30)
   page.screenshot(path=str(P/f'{name}-{hand}-layout.png'))
   page.locator('#menubtn').click();assert page.locator('#gameMenu').is_visible()
   page.locator('#menuDock [data-nav="ArrowDown"]').click();assert page.evaluate('menuIndex')==1
   page.locator('#menuDock [data-nav="Enter"]').click();assert page.locator('#menuInfo').is_visible()
   page.locator('#touchBack').click();page.locator('#menuDock [data-nav="ArrowUp"]').click();page.locator('#menuDock [data-nav="Enter"]').click();assert page.locator('#bag').is_visible()
   page.screenshot(path=str(P/f'{name}-{hand}-bag.png'))
   page.locator('#touchBack').click();assert page.locator('#gameMenu').is_visible();page.screenshot(path=str(P/f'{name}-{hand}-menu.png'))
   page.locator('#touchBack').click();assert not page.evaluate('menuOpen')
   page.evaluate('menuIndex=0')
   assert not errors,errors
   report.append({'viewport':name,'hand':hand,'onScreen':True,'touchMenuFlow':True})
  page.reload();page.wait_for_function('typeof chooseHandLayout==="function"');assert page.evaluate('handPreference')=='left'
  page.evaluate("chooseHandLayout('auto')");assert page.locator('body').get_attribute('data-hand')==('both' if w>h else 'right')
  page.close()
 b.close()
(P/'hands-validation.json').write_text(json.dumps(report,indent=2)+'\n');print('ALL OK: 3 sizes x 3 hand layouts, touch menu flow, persistence, auto orientation')
