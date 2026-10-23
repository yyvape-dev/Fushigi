from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
origin=os.environ.get('FUSHIGI_REVIEW_ORIGIN','http://127.0.0.1:8765')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':844});errors=[];bad=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('response',lambda r:bad.append(r.url) if r.status>=400 and any(s in r.url for s in ['/assets/vfx/','monster-combat.js','stage.js']) else None)
 page.goto(origin+'/fushigi-cannon-evolution-v1/game-review.html')
 page.wait_for_function('window.BlastReview&&MonsterSprites.ready&&ApprovedHero.ready&&EventVfx.state.images.blessing&&CaveTerrain.ready',timeout=90000)
 assert page.evaluate("SAVE_KEY==='fushigi_blast_review_core'&&RunSave.KEY==='fushigi_blast_review_run'")
 results={}
 for case in page.evaluate('Object.keys(BlastReview.cases)'):
  report=page.evaluate('''k=>{BlastReview.setup(k);const before=player.hp,random=Math.random;Math.random=()=>.99;let result;try{result=BlastReview.fire();}finally{Math.random=random;}cancelAnimationFrame(raf);raf=0;const events=EventVfx.state.events.filter(e=>e.kind.startsWith('enemy-')),canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1400;const g=canvas.getContext('2d'),count=()=>{const a=g.getImageData(0,0,canvas.width,canvas.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n;},t=events[0].start+events[0].duration*.65;Math.random=()=>{throw Error('drawing consumes game RNG');};try{EnemyVfx.draw(g,t,0,0,64,48,()=>false);if(count())throw Error('hidden visual leaked');EnemyVfx.draw(g,t,0,0,64,48,()=>true);if(!count())throw Error('empty visual');}finally{Math.random=random;}const pixels=count();g.clearRect(0,0,canvas.width,canvas.height);EnemyVfx.draw(g,t,0,0,64,48,x=>x!==15);const hidden=g.getImageData(15*64,0,64,canvas.height).data;for(let i=3;i<hidden.length;i+=4)if(hidden[i])throw Error('crossed hidden tile');for(const e of events)e.start=performance.now()-e.duration*.65;draw();return{damage:before-player.hp,impact:result.impact,walls:result.walls.length,kinds:enemies.map(e=>e.kind),ally:!!AllySystem.state.actor,types:events.map(e=>e.kind),visiblePixels:pixels,locked:EventVfx.busy(),turn};}''',case)
  assert not report['locked'] and report['turn']==0,report
  if case=='wall':assert report['walls']==5 and report['damage']==20,report
  if case=='intercept':assert report['impact']['x']==13 and report['damage']==0,report
  if case=='evolve':assert report['kinds']==['cannon_4'] and report['types'].count('enemy-evolve')==3,report
  if case=='ally':assert not report['ally'] and report['kinds']==['cannon_2'],report
  if case=='self':assert not report['kinds'],report
  results[case]=report;page.screenshot(path=str(P/(case+'-portrait.webp')))
 page.set_viewport_size({'width':844,'height':390})
 for case in ['wall','evolve']:
  page.evaluate('''k=>{BlastReview.setup(k);BlastReview.fire();cancelAnimationFrame(raf);raf=0;for(const e of EventVfx.state.events)e.start=performance.now()-e.duration*.65;draw();}''',case)
  page.screenshot(path=str(P/(case+'-landscape.webp')))
 saved=page.evaluate('''()=>{BlastReview.setup('evolve');BlastReview.fire();const state=()=>JSON.stringify([map,enemies.map(e=>[e.kind,e.hp,e.st.cool]),player.hp,turn]),before=state();BlastReview.resume();return{equal:before===state(),events:EventVfx.state.events.length};}''')
 assert saved['equal'] and saved['events']==0,saved
 # Real game loop: cannon fires, waits one world turn, then fires again.
 reload=page.evaluate('''()=>{BlastReview.setup('wall');enemyTurn();const hp=player.hp;enemyTurn();const waited=player.hp===hp;enemyTurn();return{waited,second:hp-player.hp};}''')
 assert reload['waited'] and reload['second']==20,reload
 reduced=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce');reduced.on('pageerror',lambda e:errors.append(str(e)));reduced.goto(origin+'/fushigi-cannon-evolution-v1/game-review.html');reduced.wait_for_function('window.BlastReview&&MonsterSprites.ready&&EventVfx.state.images.blessing',timeout=90000)
 reduced.evaluate("BlastReview.setup('evolve');BlastReview.fire();cancelAnimationFrame(raf);raf=0;vfxPref=0;for(const e of EventVfx.state.events)e.start=performance.now()-e.duration*.6;draw();")
 reduced.screenshot(path=str(P/'reduced-motion.webp'))
 assert not errors,errors;assert not bad,bad
 (P/'validation.json').write_text(json.dumps({'cases':results,'saveResume':saved,'reload':reload,'reducedMotion':True,'javascriptErrors':errors,'failedAssets':bad},ensure_ascii=False,indent=2)+'\n')
 print('ALL OK: 6 real game scenarios, visible/hidden/RNG-free visuals, save/resume, reload timing, portrait/landscape and reduced motion.');browser.close()
