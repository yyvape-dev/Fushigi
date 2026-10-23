from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 for label,w,h in [('mobile',390,844),('landscape',844,390),('small',320,640)]:
  page=browser.new_page(viewport={'width':w,'height':h},has_touch=True);errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8000/fushigi-monster-house-v2/game-review.html')
  page.wait_for_function('ApprovedHero.ready&&MonsterSprites.ready&&MonsterHouseVfx.state.images.title&&MonsterHouseVfx.state.images.mist')
  page.wait_for_load_state('networkidle')
  state=page.evaluate('''()=>{reviewMonsterHouse();const blocked=EventVfx.busy(),t=turn;playerMove(1,0);openBag();checkHouse();return {blocked,t,after:turn,bag:bagOpen,events:EventVfx.state.events.filter(e=>e.kind==='house').length};}''')
  assert state['blocked'] and state['t']==state['after'] and not state['bag'] and state['events']==1,state
  page.wait_for_function('!EventVfx.busy()',timeout=8000);assert page.evaluate('turn')==state['t']+1
  page.evaluate('reviewMonsterHouse();cancelAnimationFrame(raf);raf=0;document.getElementById("monsterHouseReview").style.visibility="hidden";EventVfx.state.events.find(e=>e.kind==="house").start=performance.now()-850;draw()')
  page.screenshot(path=str(root/(label+'.png')))
  if label=='mobile':
   frames=root/'frames';frames.mkdir(exist_ok=True)
   # Freeze the world and export only the generated overlay's progression.
   for i in range(75):
    page.evaluate('(elapsed)=>{EventVfx.state.events.find(e=>e.kind==="house").start=performance.now()-elapsed;draw();}',i*40)
    page.screenshot(path=str(frames/('%03d.png'%i)))
   page.evaluate('EventVfx.reset();draw()');page.screenshot(path=str(root/'background.png'))
  assert not errors,errors
  print('ALL OK:',label,'transparent generated title/mist, one event, input stop and one enemy turn')
  page.close()
 page=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
 page.goto('http://127.0.0.1:8000/fushigi-monster-house-v2/game-review.html');page.wait_for_function('ApprovedHero.ready');page.evaluate('reviewMonsterHouse()');page.wait_for_function('!EventVfx.busy()',timeout=8000)
 print('ALL OK: reduced motion releases input')
 browser.close()
