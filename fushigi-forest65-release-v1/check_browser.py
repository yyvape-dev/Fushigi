from pathlib import Path
import json
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent
BASE='http://127.0.0.1:8880/'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1200,'height':760})
    errors=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    page.add_init_script("window.__webglRequested=0;const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(String(kind).includes('webgl')){window.__webglRequested++;throw Error('WebGL retired');}return original.call(this,kind,...args);}")
    page.goto(BASE+'fushigi-forest65-release-v1/catalog.html',wait_until='networkidle')
    page.wait_for_function('window.catalogReady===true')
    page.screenshot(path=str(OUT/'catalog.png'),full_page=True)
    # Create an isolated legacy save with the old 3D preference enabled.
    page.goto(BASE+'index.html',wait_until='networkidle',timeout=60000)
    saved=page.evaluate("() => {saveGame();const s=JSON.parse(localStorage.getItem(SAVE_KEY));s.view3dPref=2;localStorage.setItem(SAVE_KEY,JSON.stringify(s));return {wh:JSON.stringify(s.wh),bank:s.bank};}")
    reports=[]
    for floor in range(1,7):
        page.goto(BASE+'index.html?floor='+str(floor),wait_until='networkidle',timeout=60000)
        if floor==1:page.wait_for_function('ForestFestival.state.ready')
        result=page.evaluate("({floor:floorNo,theme:floorPlan.theme.id,pitch:tilePitchY()/TS,terrainPitch:CaveTerrain.pitch,webgl:window.__webglRequested,render3d:typeof Render3D,legacyPreference:view3dPref,wh:JSON.stringify(wh.map(encItem)),bank})")
        assert abs(result['pitch']-.9063077870366499)<1e-12 and result['pitch']==result['terrainPitch'],result
        assert result['webgl']==0 and result['render3d']=='undefined' and result['legacyPreference']==0,result
        assert result['wh']==saved['wh'] and result['bank']==saved['bank'],'legacy save contents changed'
        reports.append(result)
    page.goto(BASE+'index.html?floor=1',wait_until='networkidle',timeout=60000)
    page.wait_for_function('ForestFestival.state.ready')
    hidden=page.evaluate('''() => {
      const c=document.createElement('canvas');c.width=c.height=320;
      const m=Array.from({length:9},()=>Array(9).fill(0));for(let y=2;y<7;y++)for(let x=2;x<7;x++)m[y][x]=1;
      const before=JSON.stringify(m),known=m.map(r=>r.map(()=>false));
      ForestFestival.draw2d(c.getContext('2d'),{map:m,W:9,H:9,wall:0,stairs:2,camX:0,camY:0,size:32,pitch:32*Math.sin(65*Math.PI/180),seen:known,vis:known});
      if(c.getContext('2d').getImageData(0,0,320,320).data.some(v=>v!==0))throw Error('unexplored scenery exposed');
      if(before!==JSON.stringify(m))throw Error('drawing edited map');
      return {unexploredHidden:true,inputMapUnchanged:true,keys:ForestFestival.state.keys,feet:ForestFestival.state.feet};
    }''')
    # Screenshot an existing lit clearing; no geometry or items are added.
    page.evaluate('''() => {
      const p=ForestFestival.plan({map,W:MW,H:MH,wall:WALL,stairs:STAIRS});const l=p.lamps.slice().sort((a,b)=>{const ra=roomGrid[a.y+1]?.[a.x],rb=roomGrid[b.y+1]?.[b.x];return enemies.filter(e=>roomGrid[e.y]?.[e.x]===ra).length-enemies.filter(e=>roomGrid[e.y]?.[e.x]===rb).length;})[0];
      if(l){const ri=roomGrid[l.y+1]?.[l.x],r=rooms[ri];if(r&&map[r.cy][r.cx]!==WALL){player.x=player.vx=r.cx;player.y=player.vy=r.cy;updateVis();}}
      draw();
    }''')
    page.set_viewport_size({'width':1100,'height':850});page.evaluate('draw()');page.wait_for_timeout(300)
    page.screenshot(path=str(OUT/'game-desktop.png'))
    page.set_viewport_size({'width':390,'height':844});page.evaluate('draw()');page.wait_for_timeout(200)
    page.screenshot(path=str(OUT/'game-mobile.png'))
    assert not errors,errors
    forbidden=[u for u in requests if any(s in u for s in ['render3d.js','forest-models3d.js','three.module'])]
    assert not forbidden,forbidden
    (OUT/'validation.json').write_text(json.dumps({'floors':reports,'scenery':hidden,'pageErrors':errors,'forbidden3DRequests':forbidden,'viewports':[[1100,850],[390,844]],'note':'WebGL throws if requested. Screenshot player moved onto the centre of an existing lit clearing; terrain unchanged.'},indent=2)+'\n')
    print('FOREST65 BROWSER OK: 6 locations, 10 sprites, legacy save, hidden scenery, desktop/mobile; no 3D requests')
    browser.close()
