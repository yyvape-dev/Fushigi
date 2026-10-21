from pathlib import Path
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(844,390),(390,844)]:
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8000/')
  page.wait_for_function('window.GameAudio && scene==="town"')
  assert not page.evaluate('GameAudio.snapshot().unlocked')
  page.locator('#menubtn').click();page.wait_for_function('GameAudio.snapshot().playing.includes("town")')
  page.locator('[data-menu="5"]').click();page.locator('[data-cfg=audio-mute]').click()
  assert page.evaluate('GameAudio.settings.muted && !GameAudio.snapshot().playing.length')
  page.locator('[data-cfg=audio-mute]').click();page.wait_for_function('GameAudio.snapshot().playing.includes("town")')
  page.locator('[data-cfg=audio-bgm]').click();assert page.evaluate('GameAudio.settings.bgm')==.5
  page.reload();page.wait_for_function('window.GameAudio');assert page.evaluate('GameAudio.settings.bgm')==.5
  assert not page.evaluate('GameAudio.snapshot().unlocked')
  page.locator('#menubtn').click();page.wait_for_function('GameAudio.snapshot().playing.includes("town")')
  page.evaluate("scene='dungeon';floorNo=1;newFloor()")
  for theme,key in [('forest','green'),('limestone','depth'),('ruins','depth'),('ice','spooky'),('volcano','spooky')]:
   page.evaluate('([t])=>{floorPlan.theme={...floorPlan.theme,id:t};refreshUI();}',[theme])
   page.wait_for_function('(k)=>GameAudio.snapshot().playing.length===1 && GameAudio.snapshot().playing[0]===k',arg=key)
  # Events must be emitted by the actual gameplay functions, including failed scrolls.
  page.evaluate('''()=>{scene='dungeon';floorNo=1;newFloor();window.audioEvents=[];const original=GameAudio.effect;GameAudio.effect=k=>{audioEvents.push(k);original(k);};eqWeapon=null;ITEMS.scroll.use();eqWeapon=mkItem('sword',0);ITEMS.scroll.use();eqShield=mkItem('ironshield',0);ITEMS.shieldscroll.use();player.lv=1;player.exp=0;gainExp(expNeed(1));}''')
  assert page.evaluate('audioEvents')==['enhance','enhance','levelup']
  page.wait_for_function('GameAudio.snapshot().effects.includes("levelup")')
  page.evaluate('Object.defineProperty(document,"hidden",{value:true,configurable:true});document.dispatchEvent(new Event("visibilitychange"))')
  assert page.evaluate('!GameAudio.snapshot().unlocked && !GameAudio.snapshot().playing.length && !GameAudio.snapshot().effects.length')
  page.evaluate('Object.defineProperty(document,"hidden",{value:false,configurable:true});document.dispatchEvent(new Event("visibilitychange"))')
  assert not page.evaluate('GameAudio.snapshot().playing.length')
  page.mouse.click(5,5);page.wait_for_function('GameAudio.snapshot().playing.length===1')
  page.evaluate('GameAudio.sync("dungeon","forest",true)');assert not page.evaluate('GameAudio.snapshot().playing.length')
  assert not errors,errors;page.close()
 b.close()
print('ALL OK: gesture unlock, 5 themes, saved volumes, mute, real enhance/levelup hooks, hidden pause, gesture resume and death')
