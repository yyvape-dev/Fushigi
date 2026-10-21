"""Verify actual browser hit testing for every circular sector, not synthetic events."""
from pathlib import Path
import json, math
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(844,390),(390,844),(320,568)]:
  page=b.new_page(viewport={'width':w,'height':h},has_touch=True)
  page.goto('http://127.0.0.1:8000/fushigi-controls-ui-v1/review.html')
  page.wait_for_function('window.ExperienceReview && typeof chooseHandLayout==="function"')
  for hand in ['both','right','left']:
   page.evaluate("ExperienceReview.setup('room');controlMode='turn'")
   page.evaluate('(h)=>chooseHandLayout(h)',hand)
   rect=page.locator('#pad').bounding_box()
   before=page.evaluate('[player.x,player.y,turn]')
   for dx,dy in [(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1)]:
    a=math.atan2(dy,dx)
    x=rect['x']+rect['width']*(.5+.35*math.cos(a))
    y=rect['y']+rect['height']*(.5+.35*math.sin(a))
    hit=page.evaluate('([x,y])=>document.elementFromPoint(x,y)?.closest("[data-d]")?.dataset.d',[x,y])
    assert hit==f'{dx},{dy}',(w,h,hand,hit,dx,dy)
    page.touchscreen.tap(x,y)
    assert page.evaluate('[player.x,player.y,turn]')==before
   center=page.evaluate('([x,y])=>document.elementFromPoint(x,y)?.dataset.d',[rect['x']+rect['width']/2,rect['y']+rect['height']/2])
   assert center=='0,0'
   assert page.evaluate('getComputedStyle(document.getElementById("pad"),"::before").opacity')=='.72' or page.evaluate('getComputedStyle(document.getElementById("pad"),"::before").opacity')=='0.72'
   report.append({'size':[w,h],'hand':hand,'eightRealTouchTargets':True,'centerSeparate':True,'zeroTurnFacing':True})
  page.close()
 b.close()
(P/'compass-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('ALL OK: 72 real direction taps across 3 sizes x 3 layouts; center and facing')
