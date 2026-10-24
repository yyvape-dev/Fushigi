"""Walk the real registered roads; do not teleport between outdoor facilities."""
from pathlib import Path
import base64,json,os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
URL=os.environ.get('FUSHIGI_TEST_URL','http://127.0.0.1:8765/')
WALK='''([tx,ty])=>{
 const q=[{x:player.x,y:player.y,path:[]}],seen=new Set([player.x+','+player.y]);
 for(let i=0;i<q.length;i++){
  const c=q[i];if(c.x===tx&&c.y===ty){const trace=[];for(const [dx,dy]of c.path){playerMove(dx,dy);trace.push([player.x,player.y]);}snapVis();render();return {x:player.x,y:player.y,area:CastleTown.state.area,trace};}
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=c.x+dx,y=c.y+dy,k=x+','+y;
   if(seen.has(k)||!geomOK(c.x,c.y,dx,dy)||CastleTown.state.npcs.some(n=>!n.fixed&&n.x===x&&n.y===y))continue;
   if(CastleTown.state.area==='outside'&&x===CastleTown.door.x&&y===CastleTown.door.y&&!(tx===x&&ty===y))continue;
   seen.add(k);q.push({x,y,path:[...c.path,[dx,dy]]});
  }
 }throw Error('No real path to '+tx+','+ty);
}'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1000,'height':660},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL,wait_until='load',timeout=120000)
 page.wait_for_function("CastleTown.ready()&&CastleTown.state.images['rana-rest']&&ApprovedHero.ready&&AllySystem.state.ready",timeout=90000)
 page.wait_for_timeout(500);page.screenshot(path=str(ROOT/'bed.png'))
 page.keyboard.press('ArrowRight');page.wait_for_timeout(120)
 assert not page.evaluate('CastleTown.state.waking')
 result=page.evaluate(WALK,[10,21]);assert result['area']=='outside'
 page.wait_for_function('CastleTown.ready()')
 heights=[page.evaluate('TS*CHAR_K[charPref]')]
 ports={p['id']:p for p in page.evaluate('CastleTown.facilities')}
 traces={}
 page.wait_for_timeout(500);page.screenshot(path=str(ROOT/'inn-front.png'))
 for service in ['smith','deposit','market','mercenary','dungeon']:
  f=ports[service];r=page.evaluate(WALK,[f['x'],f['y']]);assert r['area']=='outside' and (r['x'],r['y'])==(f['x'],f['y']),r
  traces[service]=r['trace']
  assert page.evaluate('(trace)=>trace.every(([x,y])=>!CastleTown.layout.items.some(o=>CastleTown.layout.contains(o,x,y)))',r['trace'])
  page.screenshot(path=str(ROOT/(service+'-front.png')))
  page.evaluate('doCtx()')
  if service=='deposit':
   assert page.evaluate("whOpen&&CastleTown.state.service==='deposit'");page.evaluate('closeWh();render()')
  elif service=='market':
   assert page.evaluate("whOpen&&CastleTown.state.service==='market'");page.evaluate('closeWh();render()')
  else:
   assert page.evaluate('CastleTown.state.open');page.keyboard.press('Escape')
 # Verify closed houses with actual movement against the front wall.
 houses=page.evaluate('CastleTown.layout.items.filter(o=>o.private).map(o=>({id:o.id,x:o.x,y:o.y}))')
 for house in houses:
  r=page.evaluate(WALK,[house['x'],house['y']]);assert r['x']==house['x'] and r['y']==house['y'],(house,r)
  page.evaluate('playerMove(0,-1)');assert page.evaluate('[player.x,player.y]')==[house['x'],house['y']]
 f=ports['inn'];page.evaluate(WALK,[f['x'],f['y']]);page.evaluate('CastleTown.show("map")')
 data=page.locator('#townMapCanvas').evaluate('c=>c.toDataURL("image/png")')
 (ROOT/'overview.png').write_bytes(base64.b64decode(data.split(',')[1]))
 page.screenshot(path=str(ROOT/'map.png'));page.keyboard.press('Escape')
 before=page.evaluate('CastleTown.state.npcs.map(n=>[n.x,n.y])');page.wait_for_timeout(2000)
 assert page.evaluate('(p)=>CastleTown.state.npcs.some((n,i)=>n.x!==p[i][0]||n.y!==p[i][1])',before)
 # Enter through the actual aligned door tile, then preserve apparent body height.
 page.evaluate(WALK,[page.evaluate('CastleTown.door.x'),page.evaluate('CastleTown.door.y')])
 assert page.evaluate("CastleTown.state.area==='inn'")
 heights.append(page.evaluate('TS*CHAR_K[charPref]*CastleTown.characterScale()'));assert heights[0]==heights[1],heights
 page.screenshot(path=str(ROOT/'inn-inside.png'))
 page.set_viewport_size({'width':390,'height':844});page.evaluate('CastleTown.rest()');page.wait_for_timeout(400)
 page.screenshot(path=str(ROOT/'bed-portrait.png'))
 page.keyboard.press('ArrowRight');page.wait_for_timeout(100);page.evaluate(WALK,[10,21]);page.wait_for_timeout(400)
 page.screenshot(path=str(ROOT/'inn-front-portrait.png'))
 f=ports['smith'];page.evaluate(WALK,[f['x'],f['y']]);page.screenshot(path=str(ROOT/'smith-portrait.png'))
 page.evaluate('saveGame()');location=page.evaluate('[CastleTown.state.area,player.x,player.y]')
 page.reload(wait_until='load');page.wait_for_function('CastleTown.ready()&&ApprovedHero.ready')
 assert page.evaluate('[CastleTown.state.area,player.x,player.y]')==location
 page.evaluate('enterDungeon();RunSave.save();saveGame()')
 dungeonSize=page.evaluate('TS')
 page.reload(wait_until='load');page.wait_for_function("scene==='dungeon'&&ApprovedHero.ready")
 assert page.evaluate('TS')==dungeonSize,'dungeon reload must restore its own zoom, not indoor zoom'
 assert not errors,errors
 output={'pageErrors':errors,'actualOutdoorRoutes':traces,'closedHousesChecked':[x['id'] for x in houses],'sameCharacterHeightInAndOut':heights,'portraitAndLandscape':True,'reload':True,'dungeonZoomAfterReload':dungeonSize}
 (ROOT/'runtime-validation.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'pageErrors':errors,'walkedOutdoorSteps':sum(map(len,traces.values())),'closedHouses':len(houses),'characterHeights':heights}),flush=True)
 browser.close()
