from pathlib import Path
from playwright.sync_api import sync_playwright
import json
P=Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1040,'height':850});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8001/fushigi-actions-v1/preview.html');page.wait_for_function('window.previewReady',timeout=30000)
 result=page.evaluate('''()=>{
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),c2=document.createElement('canvas');c2.width=c2.height=256;const h=c2.getContext('2d');let walk=0,uses=0,nw=0,endpoints=0;
 for(const w of ApprovedHero.weaponCatalog)for(const sh of ApprovedHero.shieldCatalog)for(const d of ApprovedHero.base.directions){const r=ApprovedHero.renderer(w.key,sh.key);if(r.baseMeta.directions.find(v=>v.id==='SE').shieldView!=='quarter-se')throw Error('SE');for(const t of [27,82,137,192]){g.clearRect(0,0,256,256);HeroActions.draw(g,d.id,128,224,192,'walk',t,{renderer:r,weapon:true,shield:true});walk++;}}
 for(const d of ApprovedHero.base.directions)for(const action of ['consume','scroll','staff']){const row=HeroActions.meta.directions[d.id].actions[action],r=ApprovedHero.renderer('katana','bronzeshield');let elapsed=0;for(let i=0;i<row.frameMs.length;i++){g.clearRect(0,0,256,256);HeroActions.draw(g,d.id,128,224,192,action,elapsed+row.frameMs[i]/2,{renderer:r,prop:action==='consume'?'food':action,weapon:true,shield:true,face:[0,1]});uses++;if(i===0||i===row.frameMs.length-1){h.clearRect(0,0,256,256);r.base.draw(h,d.id,128,224,192,{weapon:true,shield:true});const a=g.getImageData(0,0,256,256).data,b=h.getImageData(0,0,256,256).data;if(a.some((v,k)=>v!==b[k]))throw Error('idle endpoint '+d.id);endpoints++;}elapsed+=row.frameMs[i];}}
 for(const sh of ApprovedHero.shieldCatalog){const r=ApprovedHero.renderer('katana',sh.key);for(const t of [27,82,137,192]){g.clearRect(0,0,256,256);h.clearRect(0,0,256,256);HeroActions.draw(g,'NW',128,224,192,'walk',t,{renderer:r});HeroActions.draw(h,'NW',128,224,192,'walk',t,{renderer:r,shield:true});const a=g.getImageData(0,0,256,256).data,b=h.getImageData(0,0,256,256).data;for(let i=0;i<a.length;i+=4)if(a[i+3]===255&&[0,1,2,3].some(k=>a[i+k]!==b[i+k]))throw Error('NW covered');nw++;}}
 return {walkRenders:walk,useFrames:uses,idleEndpoints:endpoints,nwPreservation:nw};
 }''')
 page.locator('#pause').click()
 for action in ['walk','food','herb','scroll','staff']:
  page.select_option('#action',action);page.locator('#scrub').fill('500');page.locator('#scrub').dispatch_event('input');page.screenshot(path=str(P/(action+'-preview.png')))
 page.goto('http://127.0.0.1:8001/fushigi-dungeon-v1/random-review.html');page.wait_for_function('document.getElementById("status").textContent.includes("seed ")');f=page.frames[1];f.wait_for_function('HeroActions.ready && CaveTerrain.ready');f.evaluate('enemies=[];traps=[];player.hp=player.maxhp;render()')
 walk=f.evaluate('''()=>{const old=HeroActions.draw,calls=[];HeroActions.draw=function(...args){calls.push(args[5]);return old.apply(this,args);};const d=DIRS.find(([dx,dy])=>geomOK(player.x,player.y,dx,dy));playerMove(...d);render();HeroActions.draw=old;return calls.includes('walk');}''');assert walk
 result['actualUseActions']={}
 for action,kind in [('food','consume'),('herb','consume'),('scroll','scroll'),('staff','staff')]:
  page.select_option('#motion',action);page.click('#demo');assert f.evaluate('player.action.kind')==kind
  page.wait_for_timeout(150);page.screenshot(path=str(P/('game-'+action+'.png')));page.wait_for_timeout(500)
  result['actualUseActions'][action]=kind
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200);page.screenshot(path=str(P/'game-portrait.png'))
 assert not errors,errors;result['browserErrors']=errors
 (P/'validation.json').write_text(json.dumps(result,indent=2));b.close()
print('ALL OK: walk equipment, NW/SE, exact idle endpoints, actual game use dispatch and UI')
