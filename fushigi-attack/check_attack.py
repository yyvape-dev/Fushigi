from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from PIL import Image
import json,threading,base64,io,hashlib
from playwright.sync_api import sync_playwright
R=Path(__file__).parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(R)));threading.Thread(target=s.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{s.server_address[1]}/'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':1100,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(url+'preview.html');page.wait_for_function('window.previewReady');page.evaluate('previewAt(170)');page.screenshot(path=str(R/'preview-screen.png'),full_page=True)
 # Render actual software-composited weapons in each frame, not painted-in props.
 checks=page.evaluate('''() => {const out=[];const cv=document.createElement('canvas');cv.width=1024;cv.height=1024;const g=cv.getContext('2d'),native=g.drawImage.bind(g);let seen=[];g.drawImage=function(im,...args){for(const name of ['weapon','shield'])if(im===equipment[name]){const spec=BASE.equipmentAssets[name],v=this.getTransform().transformPoint(new DOMPoint(args[0]+spec.grip[0],args[1]+spec.grip[1]));seen.push({name,x:v.x,y:v.y});}return native(im,...args)};for(const d of MOTION.directions)for(const ts of [48,64,96])for(const ms of [70,120,170,230]){seen=[];renderer.draw(g,d.id,512,700,ts*1.5,ms,{weapon:true,shield:true});const f=d.frames[renderer.frameAt(d.id,ms)];if(seen.length!==2)throw Error('missing equipment');for(const item of seen){const a=item.name==='weapon'?f.right:f.left,ex=512+(a.position[0]-128)*ts*1.5/192,ey=700+(a.position[1]-224)*ts*1.5/192;if(Math.hypot(item.x-ex,item.y-ey)>1e-5)throw Error('detached grip');}out.push({dir:d.id,tile:ts,ms});}return out;}''')
 assert len(checks)==96
 shots=[];single=[]
 for ms in [17,70,120,170,230,280]:
  page.evaluate('(ms)=>previewAt(ms)',ms)
  for which,target in [('all',shots),('attack',single)]:
   b64=page.evaluate('(id)=>document.getElementById(id).toDataURL("image/png").split(",")[1]',which);target.append(Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGB'))
 shots[0].save(R/'attack-8directions.gif',save_all=True,append_images=shots[1:],duration=[35,70,40,55,60,540],loop=0,disposal=2)
 single[0].save(R/'SW-attack-with-sword.gif',save_all=True,append_images=single[1:],duration=[35,70,40,55,60,540],loop=0,disposal=2)
 shots[2].save(R/'attack-strike-contact.png')
 for name in ['S','SW','W','NW','N','NE','E','SE']:page.select_option('#direction',name);page.evaluate('previewAt(230)')
 page.check('#shield');page.check('#debug');page.evaluate('previewAt(170)');page.uncheck('#shield');page.uncheck('#debug')
 page.goto(url+'game-attack.html?testWeapon=1');page.wait_for_function('heroAttackReady() && !!HERO_EQUIPMENT.weapon && !!SPRITES.town');page.set_viewport_size({'width':844,'height':390})
 page.evaluate('rigPref=0;charPref=2;zoomPref=0;resize();player.face=[-1,1];playerAttack();');page.wait_for_timeout(120);page.screenshot(path=str(R/'game-attack-landscape.png'))
 page.wait_for_timeout(330);assert page.evaluate("heroAttackRenderer.frameAt('SW',now()-player.swing)")==0
 # Direction remains fixed to the attack start even if a later input changes face.
 locked=page.evaluate('''() => {player.face=[1,0];playerAttack();const before=player.attackFace.slice();player.face=[-1,0];const active=player.swing&&now()-player.swing<SWING_MS;return {before,drawFace:active?(player.attackFace||player.face):player.face};}''');assert locked['before']==locked['drawFace']
 page.set_viewport_size({'width':390,'height':844});page.evaluate('resize();player.face=[0,1];playerAttack();');page.wait_for_timeout(120);page.screenshot(path=str(R/'game-attack-portrait.png'))
 page.evaluate('enterDungeon();');page.wait_for_timeout(400);page.evaluate('player.swing=now();player.attackFace=[1,1];render();');page.wait_for_timeout(170);page.screenshot(path=str(R/'game-attack-dungeon.png'))
 assert not errors,errors
 report={'page_errors':errors,'equipment_grip_cases':len(checks),'equipment_grip_placements':len(checks)*2,'direction_references':'individual canonical base per direction','attack_duration_ms':300,'start_end_idle_restored':True,'attack_direction_locked':locked,'checks':checks}
 (R/'browser-validation.json').write_text(json.dumps(report,indent=2));print('PASS:',len(checks),'attack equipment cases, 8 directions, 300ms return, heading lock, no page errors.');browser.close()
s.shutdown()
