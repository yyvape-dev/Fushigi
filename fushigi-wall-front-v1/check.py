"""Exercise the baked kit in the actual game, including all neighbor topologies."""
from pathlib import Path
import json, hashlib
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent
manifest=json.loads((OUT/'manifest.json').read_text())
assert len(manifest['files'])==48
for entry in manifest['files']:
 assert hashlib.sha256((OUT/entry['file']).read_bytes()).hexdigest()==entry['sha256'],entry['file']
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium');page=b.new_page(viewport={'width':1100,'height':850});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000/')
 page.evaluate("localStorage.setItem('wall-kit-sentinel','keep')");storage=page.evaluate('JSON.stringify(localStorage)')
 page.goto('http://127.0.0.1:8000/fushigi-wall-front-v1/');page.wait_for_function("!document.getElementById('next').disabled",timeout=60000)
 f=page.frames[1];page.click('#layout');page.wait_for_timeout(200)
 state=f.evaluate('JSON.stringify({map,rooms,player,enemies,floorItems,traps})')
 page.select_option('#boundary','generic');f.locator('body').screenshot(path=str(OUT/'before-room.jpg'),quality=94)
 page.select_option('#boundary','shaped')
 f.locator('body').screenshot(path=str(OUT/'room-slate.jpg'),quality=92)
 page.select_option('#material','ruins');f.locator('body').screenshot(path=str(OUT/'room-ruins.jpg'),quality=92)
 assert state==f.evaluate('JSON.stringify({map,rooms,player,enemies,floorItems,traps})'),'material changed gameplay'
 page.select_option('#material','slate')
 # All cardinal/diagonal contexts and all world phases, using rendered alpha.
 checks=f.evaluate('''() => {
  const c=document.createElement('canvas');c.width=c.height=320;const g=c.getContext('2d'),size=32,pitch=.94;
  const offsets=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  let checked=0;
  for(const material of ['slate','ruins']){
   WallKit.material=material;
   for(let phase=0;phase<4;phase++)for(let mask=0;mask<256;mask++){
    const m=Array.from({length:7},()=>Array(7).fill(0));const cx=2+phase%2,cy=2+(phase>>1);
    offsets.forEach(([dx,dy],i)=>m[cy+dy][cx+dx]=(mask>>i)&1);
    g.clearRect(0,0,320,320);
    for(let y=0;y<7;y++)for(let x=0;x<7;x++)CaveTerrain.draw(g,m[y][x]?'floor0':'wallT',32+x*size,32+y*size*pitch,size,{map:m,x,y,seed:0,theme:OvergrownGarden.theme});
    const d=g.getImageData(Math.ceil(32+cx*size+2),Math.ceil(32+cy*size*pitch+2),size-4,Math.floor(size*pitch-4)).data;
    for(let i=3;i<d.length;i+=4)if(d[i]<250)throw Error(`transparent hole ${material}/${phase}/${mask}`);
    checked++;
   }
  }
  WallKit.material='slate';return checked;
 }''')
 f.evaluate('zoomPref=2;resize();render()');f.locator('body').screenshot(path=str(OUT/'overview.jpg'),quality=92)
 f.evaluate('zoomPref=5;resize();player.x=player.vx=7;player.y=player.vy=9;updateVis();render()')
 page.select_option('#boundary','generic');f.locator('body').screenshot(path=str(OUT/'before-front.jpg'),quality=94)
 page.select_option('#boundary','shaped');f.locator('body').screenshot(path=str(OUT/'foreground.jpg'),quality=94)
 # Real pixels: compare actual approved hero versus a temporarily hidden hero.
 occlusion=f.evaluate('''() => {
  const hero=ApprovedHero.draw,img=()=>ctx.getImageData(0,0,innerWidth,innerHeight).data;
  function visible(mode){OvergrownGarden.configureView({occlusion:mode});draw();const yes=img();let no;try{ApprovedHero.draw=()=>{};draw();no=img();}finally{ApprovedHero.draw=hero;}
   let n=0;for(let i=0;i<yes.length;i+=4)if(Math.abs(yes[i]-no[i])+Math.abs(yes[i+1]-no[i+1])+Math.abs(yes[i+2]-no[i+2])>25)n++;return n;}
  const result={off:visible('off'),natural:visible('natural'),fade:visible('fade')};OvergrownGarden.configureView({occlusion:'natural'});draw();return result;
 }''')
 assert 100<occlusion['natural']<occlusion['fade']<occlusion['off'],occlusion
 page.select_option('#overlap','fade');f.locator('body').screenshot(path=str(OUT/'foreground-fade.jpg'),quality=92)
 page.select_option('#overlap','natural')
 for name,x in [('left',4),('right',10)]:
  f.evaluate(f'player.x=player.vx={x};player.y=player.vy=8;updateVis();render()')
  page.select_option('#boundary','generic');f.locator('body').screenshot(path=str(OUT/f'before-{name}.jpg'),quality=94)
  page.select_option('#boundary','shaped');f.locator('body').screenshot(path=str(OUT/f'corner-{name}.jpg'),quality=94)
 f.evaluate('player.x=player.vx=7;player.y=player.vy=9;updateVis();render()')
 old_mask=f.evaluate('WallKit.mask(map,7,10)');page.click('#break');assert f.evaluate('map[10][7]')==1
 f.locator('body').screenshot(path=str(OUT/'destroyed.jpg'),quality=92)
 # Observe actual movement along the room wall and through the bent corridor.
 page.click('#layout');page.click('#walk');page.wait_for_function("document.getElementById('game').contentWindow.eval('player.x===16&&player.y===11')",timeout=15000)
 page.wait_for_timeout(400)
 assert f.evaluate('Math.abs(player.vx-player.x)+Math.abs(player.vy-player.y)')<.1
 f.locator('body').screenshot(path=str(OUT/'corridor.jpg'),quality=92)
 page.set_viewport_size({'width':430,'height':940});page.click('#layout');f.evaluate('zoomPref=2;resize();render()')
 f.locator('body').screenshot(path=str(OUT/'portrait.jpg'),quality=92)
 assert storage==page.evaluate('JSON.stringify(localStorage)'),'real save changed'
 assert not errors,errors
 result=dict(status='passed',renderedAssets=48,topologyChecks=checks,materialSwitchPreservesState=True,foregroundPixels=occlusion,liveWallDestruction=True,walkedBentCorridor=True,portrait=True,realStorageUnchanged=True,jsErrors=errors)
 (OUT/'validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));b.close()
