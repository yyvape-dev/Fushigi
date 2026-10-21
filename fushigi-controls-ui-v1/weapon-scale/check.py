from pathlib import Path
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parents[2]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1536,'height':960});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000/fushigi-controls-ui-v1/review.html');page.wait_for_function('window.ApprovedHero?.ready')
 for phase,elapsed in [('idle',-1),('attack',115)]:
  result=page.evaluate('''({elapsed})=>{const a=ApprovedHero;for(const w of a.weaponCatalog){const r=a.renderer(w.key,null);if(r.baseMeta.equipmentAssets.weapon.renderScale!==w.renderScale)throw Error('catalog changed '+w.key);}const c=document.createElement('canvas');c.width=1536;c.height=960;const g=c.getContext('2d');g.fillStyle='#26322b';g.fillRect(0,0,c.width,c.height);g.font='16px sans-serif';let row=0;for(const key of ['stick','axe']){const r=a.renderer(key,null),spec=r.baseMeta.equipmentAssets.weapon,expected=.66*256/a.legacy[key].height;if(spec.renderScale!==expected)throw Error('legacy scale');if(r.base.meta.equipmentAssets.weapon!==spec)throw Error('idle mismatch');for(const before of [true,false]){spec.renderScale=before?.66:expected;for(let i=0;i<8;i++){g.fillStyle='#fff1cb';g.fillText(key+' '+(before?'BEFORE':'AFTER')+' '+a.base.directions[i].id,i*192+10,row*240+24);r.draw(g,a.base.directions[i].id,i*192+96,row*240+216,96,elapsed,{weapon:true,shield:false});}row++;}spec.renderScale=expected;}return c.toDataURL();}''',{'elapsed':elapsed})
  import base64
  (P/f'fushigi-controls-ui-v1/weapon-scale/{phase}-before-after.png').write_bytes(base64.b64decode(result.split(',')[1]))
 assert not errors,errors
 print('ALL OK: 12 approved scales unchanged; legacy normalized in idle and attack, 8 directions');b.close()
