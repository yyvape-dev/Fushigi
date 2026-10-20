from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from PIL import Image
from playwright.sync_api import sync_playwright
import threading,base64,io,json
R=Path(__file__).parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_address[1]}/'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1100,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url+'preview.html');page.wait_for_function('window.previewReady');page.evaluate('previewAt(170)');page.screenshot(path=str(R/'equipment-preview.png'),full_page=True)

 trace=page.evaluate("""() => {const cv=document.createElement('canvas');cv.width=1536;cv.height=512;const g=cv.getContext('2d'),native=g.drawImage.bind(g);let seq=[];g.drawImage=function(im,...args){seq.push(im===equipment['shield-back']?'shield-back':im===equipment['shield-quarter']?'shield-quarter':Object.values(equipment).includes(im)?'item':'body');return native(im,...args)};const results=[];for(const [row,id] of ['NW','SE'].entries())for(const [i,ms]of [17,70,120,170,230,280].entries()){seq=[];g.fillStyle='#e8e3d9';g.fillRect(i*256,row*256,256,256);renderer.draw(g,id,i*256+128,row*256+223,144,ms,{weapon:true,shield:true});const last=seq.slice(-2);if(id==='NW'&&JSON.stringify(last)!==JSON.stringify(['shield-back','body']))throw Error('NW hand must cover shield');if(id==='SE'&&seq.at(-1)!=='shield-quarter')throw Error('SE shield must cover hand');results.push({id,ms,last});g.fillStyle='#273536';g.font='16px sans-serif';g.fillText(id+' / '+i,i*256+8,row*256+22)}window.depthContact=cv.toDataURL();return results;}""")

 pixels=page.evaluate("""() => {const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=256;a.height=b.height=256;const x=a.getContext('2d'),y=b.getContext('2d');const checks=[];for(const ms of [17,70,120,170,230,280]){x.clearRect(0,0,256,256);y.clearRect(0,0,256,256);renderer.draw(x,'NW',128,224,192,ms,{weapon:false,shield:false});renderer.draw(y,'NW',128,224,192,ms,{weapon:false,shield:true});const p=x.getImageData(0,0,256,256).data,q=y.getImageData(0,0,256,256).data;let tested=0;for(let i=0;i<p.length;i+=4){if(p[i+3]!==255)continue;tested++;if(p[i]!==q[i]||p[i+1]!==q[i+1]||p[i+2]!==q[i+2]||q[i+3]!==255)throw Error('NW shield obscures original body/arm at pixel '+i/4+' ms '+ms)}checks.push({ms,opaqueBodyPixelsPreserved:tested})}return checks;}""")
 (R/'NW-pixel-validation.json').write_text(json.dumps(pixels,indent=2))
 (R/'depth-validation.json').write_text(json.dumps(trace,indent=2));(R/'NW-SE-depth-check.png').write_bytes(base64.b64decode(page.evaluate('window.depthContact.split(",")[1]')))

 frames=[]
 for ms in [17,70,120,170,230,280]:
  page.evaluate('(ms)=>previewAt(ms)',ms);data=page.evaluate('document.getElementById("all").toDataURL().split(",")[1]');frames.append(Image.open(io.BytesIO(base64.b64decode(data))).convert('RGB'))
 frames[0].save(R/'equipment-8directions.gif',save_all=True,append_images=frames[1:],duration=[35,70,40,55,60,540],loop=0)
 for d in ['S','SW','W','NW','N','NE','E','SE']:
  page.select_option('#direction',d)
  for ms in [17,70,120,170,230,280]:page.evaluate('(ms)=>previewAt(ms)',ms)
 assert page.evaluate('Object.values(equipment).every(i=>i.complete&&i.naturalWidth>0)')
 page.goto(url+'game-attack.html?testWeapon=1&testShield=1');page.wait_for_function('heroAttackReady() && Object.keys(HERO_EQUIPMENT).length===5 && !!SPRITES.town');page.set_viewport_size({'width':844,'height':390});page.evaluate('rigPref=0;charPref=2;zoomPref=0;resize();player.face=[-1,1];playerAttack()');page.wait_for_timeout(120);page.screenshot(path=str(R/'game-equipment.png'))
 assert page.evaluate('heroAttackPreview.weapon && heroAttackPreview.shield');assert not errors,errors
 (R/'validation.json').write_text(json.dumps({'pageErrors':errors,'directions':8,'framesPerDirection':6,'equipmentImagesLoaded':5,'gameEquipmentEnabled':True},indent=2));b.close()
server.shutdown();print('PASS: 48 direction/frame checks, five equipment images, game enabled, no page errors')
