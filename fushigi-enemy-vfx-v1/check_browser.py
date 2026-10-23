from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
origin=os.environ.get('FUSHIGI_REVIEW_ORIGIN','http://127.0.0.1:8016')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':844});errors=[];bad=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:bad.append(r.url) if r.status>=400 and '/assets/vfx/' in r.url else None)
 page.goto(origin+'/fushigi-enemy-vfx-v1/game-review.html');page.wait_for_function('window.EnemyFxReview&&MonsterSprites.ready&&ApprovedHero.ready&&EventVfx.state.images.lightning',timeout=90000)
 assert page.evaluate("SAVE_KEY==='fushigi_enemy_fx_review_core'&&RunSave.KEY==='fushigi_enemy_fx_review_run'")
 cases=page.evaluate('Object.keys(EnemyFxReview.cases)');results={}
 for case in cases:
  report=page.evaluate('''k=>{const r=Math.random;Math.random=()=>.25;try{EnemyFxReview.play(k);}finally{Math.random=r;}cancelAnimationFrame(raf);raf=0;const events=EventVfx.state.events.filter(e=>e.kind.startsWith('enemy-'));if(!events.length)throw Error('no event '+k);const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1400;const g=canvas.getContext('2d');const count=()=>{const a=g.getImageData(0,0,canvas.width,canvas.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n;};const t=events[0].start+events[0].duration*.32,random=Math.random;Math.random=()=>{throw Error('VFX consumes gameplay RNG');};try{EnemyVfx.draw(g,t,0,0,64,48,()=>false);if(count())throw Error('hidden effects leaked');EnemyVfx.draw(g,t,0,0,64,48,()=>true);}finally{Math.random=random;}const visible=count();if(!visible)throw Error('empty visual '+k);g.clearRect(0,0,canvas.width,canvas.height);EnemyVfx.draw(g,t,0,0,64,48,x=>x!==13);const hidden=g.getImageData(13*64,0,64,canvas.height).data;for(let i=3;i<hidden.length;i+=4)if(hidden[i])throw Error('effect crossed a hidden tile '+k);for(const e of events)e.start=performance.now()-e.duration*.3;draw();return{types:events.map(e=>e.kind),visiblePixels:visible,turn,locked:EventVfx.busy()};}''',case)
  assert not report['locked'],case
  results[case]=report
  page.screenshot(path=str(P/(case+'-portrait.webp')))
 page.set_viewport_size({'width':844,'height':390})
 for case in ['cannon','lightning','bell','abyss']:
  page.evaluate('''k=>{EnemyFxReview.play(k);cancelAnimationFrame(raf);raf=0;for(const e of EventVfx.state.events)e.start=performance.now()-e.duration*.65;draw();}''',case)
  page.screenshot(path=str(P/(case+'-landscape.webp')))
 # A projectile addressed to an ally must use that actor's position.
 ally=page.evaluate('''()=>{const e=EnemyFxReview.setup('cannon');player.x=player.vx=20;const a=AllySystem.make(15,10);a.following=true;AllySystem.state.actor=a;const random=Math.random;Math.random=()=>.25;try{AllySystem.enemyAction(e,eT(e));}finally{Math.random=random;}return EventVfx.state.events.some(e=>e.kind==='enemy-cannon'&&e.to.x===15&&e.to.x!==player.x);}''')
 assert ally
 # Flushing for persistence only removes visuals and never repeats damage.
 saved=page.evaluate('''()=>{EnemyFxReview.play('cannon');const before={hp:player.hp,turn,x:player.x,y:player.y};RunSave.save();return{before,after:{hp:player.hp,turn,x:player.x,y:player.y},busy:EventVfx.busy(),events:EventVfx.state.events.length};}''')
 assert saved['before']==saved['after'] and not saved['busy'] and not saved['events']
 page.reload();page.wait_for_function('MonsterSprites.ready&&ApprovedHero.ready',timeout=90000);assert not page.evaluate('EventVfx.busy()')
 reduced=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');reduced.on('pageerror',lambda e:errors.append(str(e)));reduced.goto(origin+'/fushigi-enemy-vfx-v1/game-review.html');reduced.wait_for_function('window.EnemyFxReview&&MonsterSprites.ready&&EventVfx.state.images.lightning',timeout=90000)
 reduced.evaluate("EnemyFxReview.play('cannon');cancelAnimationFrame(raf);raf=0;for(const e of EventVfx.state.events)e.start=performance.now()-e.duration*.6;vfxPref=0;draw();")
 reduced.screenshot(path=str(P/'reduced-motion.webp'))
 assert not errors,errors;assert not bad,bad
 result={'cases':results,'allyTarget':ally,'saveUnchanged':True,'reducedMotion':True,'javascriptErrors':errors,'failedVfxAssets':bad}
 (P/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print('ALL OK: 11 real effects, visible pixels/no hidden leakage, RNG-free drawing, ally targeting, save flush, reduced motion, portrait/landscape and all VFX assets.');browser.close()
