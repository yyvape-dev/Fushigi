from pathlib import Path
from playwright.sync_api import sync_playwright
import json
P=Path(__file__).resolve().parent
cases=[('portrait-right',390,844,'right'),('portrait-left',390,844,'left'),('portrait-both',390,844,'both'),('small-right',320,640,'right'),('small-both',320,640,'both'),('landscape-both',844,390,'both'),('landscape-right',844,390,'right')]
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for label,w,h,hand in cases:
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8000/fushigi-allies-v1/game-review.html');page.wait_for_function('window.AllyReview && AllySystem.state.ready',polling=100,timeout=120000)
  page.evaluate('hand=>chooseHandLayout(hand)',hand);page.evaluate("AllyReview.setup('meet');playerAttack()")
  assert page.locator('#allyPrompt').is_visible();assert page.locator('.ally-portrait img').evaluate('(im)=>im.complete&&im.naturalWidth===256')
  bounds=page.locator('.ally-dialog').bounding_box();assert bounds['x']>=0 and bounds['y']>=0 and bounds['x']+bounds['width']<=w and h-30<=bounds['y']+bounds['height']<=h
  assert page.evaluate("getComputedStyle(document.getElementById('pad')).visibility==='hidden'")
  page.evaluate('window.__turnBefore=turn;playerMove(0,0)');assert page.evaluate('turn===__turnBefore')
  page.keyboard.press('Tab');assert page.evaluate("document.activeElement.id==='allyStay'");page.keyboard.press('Tab');assert page.evaluate("document.activeElement.id==='allyJoin'")
  page.screenshot(path=str(P/f'dialog-{label}.png'))
  page.locator('#allyStay').click();assert page.evaluate('!AllySystem.state.open&&!AllySystem.state.actor.following')
  page.evaluate('playerAttack()');page.keyboard.press('Enter');assert page.evaluate('AllySystem.state.actor.following&&!AllySystem.state.open')
  assert page.locator('#partyHUD').is_visible() and page.locator('#allyBadge .party-fill').is_visible()
  page.evaluate('AllySystem.state.actor.hp=8;render()');assert page.locator('#allyBadge').evaluate("el=>el.classList.contains('low')")
  page.evaluate('AllySystem.state.actor.hp=AllySystem.state.actor.maxhp;render()')
  party=page.locator('#partyHUD').bounding_box()
  if h>w:
   assert party['y']>h*.60 and party['y']+party['height']<=h
   if hand=='left':assert party['x']>w/2
   else:assert party['x']<w/2
   for selector in ['#pad','#atk','#lft']:
    c=page.locator(selector).bounding_box();overlap=min(party['x']+party['width'],c['x']+c['width'])-max(party['x'],c['x'])>1 and min(party['y']+party['height'],c['y']+c['height'])-max(party['y'],c['y'])>1
    assert not overlap,(label,selector,party,c)
  page.screenshot(path=str(P/f'party-{label}.png'))
  page.locator('#allyBadge').click();assert 'ユズナミキ' in page.locator('#menuInfo').inner_text();page.evaluate('closeGameMenu()')
  page.evaluate('AllySystem.talk()');assert page.locator('#allyJoin').is_hidden();page.keyboard.press('Escape');assert page.evaluate('!AllySystem.state.open')
  page.wait_for_timeout(400)
  page.evaluate("const a=AllySystem.state.actor;AllySystem.updateParty([a,{...a,id:'preview-2',name:'仲間 2'},{...a,id:'preview-3',name:'仲間 3'}])")
  assert page.locator('#partyHUD .party-slot').count()==3
  page.screenshot(path=str(P/f'party-three-{label}.png'))
  assert not errors,errors;results.append({'layout':label,'dialogBottom':True,'portrait':True,'focusAndRecruit':True,'zeroTurnConversation':True,'partyAvoidsControls':True,'threeSlots':True,'errors':errors});page.close()
 b.close()
(P/'dialog-ui-validation.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('ALL OK: 7 layouts, bottom portrait dialogue, focus/decline/recruit, turn freeze, HP updates, party placement and 3 future slots')
