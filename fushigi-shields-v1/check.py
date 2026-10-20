from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json,hashlib,base64,io
from PIL import Image
from playwright.sync_api import sync_playwright

R=Path(__file__).parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def run():
 manifest=json.loads((R/'shields.json').read_text())
 for p,h in manifest['baselineHashes'].items():assert hashlib.sha256((R.parent/'fushigi-equipment-v3'/p).read_bytes()).hexdigest()==h
 for s in manifest['shields']:
  assert s['renderScale']==.59
  for view,a in s['views'].items():
   im=Image.open(R/a['path']);assert im.mode=='RGBA' and im.size==(160,192);b=im.getbbox();assert b[0]>0 and b[1]>0 and b[2]<160 and b[3]<192
   assert im.getpixel((80,96))[3]>200,(s['key'],view)
   assert hashlib.sha256((R/a['path']).read_bytes()).hexdigest()==a['sha256']
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(R.parent)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   page=browser.new_page(viewport={'width':1100,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{server.server_address[1]}/fushigi-shields-v1/preview.html');page.wait_for_function('window.previewReady || window.previewError');assert not page.evaluate('window.previewError')
   results=page.evaluate('''() => {
    const r=window.review,checks=[],pixels=[],combinations=[];
    const cv=document.createElement('canvas');cv.width=cv.height=512;const g=cv.getContext('2d');
    const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=256;a.height=b.height=256;const x=a.getContext('2d'),y=b.getContext('2d');
    for(const shield of r.catalog.shields){
     for(const weapon of ['approved',...r.weaponCatalog.weapons.map(w=>w.key)]){
      r.selectEquipment(shield.key,weapon);let count=0;
      for(const d of r.baseMeta.directions)for(const [i,ms]of r.MIDS.entries()){
       const seq=[],native=g.drawImage.bind(g);g.drawImage=function(im,...args){seq.push(im===r.equipment['shield-back']?'shield-back':im===r.equipment['shield-quarter']?'shield-quarter':im===r.equipment['shield-side']?'shield-side':im===r.equipment.shield?'shield-front':im===r.equipment.weapon?'weapon':'body');native(im,...args)};
       g.clearRect(0,0,512,512);r.renderer.draw(g,d.id,256,310,192,ms,{weapon:true,shield:true});g.drawImage=native;
       if(d.id==='NW'&&(seq.indexOf('shield-back')<0||seq.at(-1)!=='body'))throw Error('NW depth '+shield.key+weapon+i);
       if(d.id==='SE'&&seq.at(-1)!=='shield-quarter')throw Error('SE depth '+shield.key+weapon+i);
       if(!seq.includes('shield-'+d.shieldView))throw Error('Wrong view '+d.id);
       count++;
       if(weapon==='approved'){
        const p=g.getImageData(0,0,512,512).data;let visible=0;for(let z=3;z<p.length;z+=4)if(p[z])visible++;
        if(!visible)throw Error('Empty frame');for(let j=0;j<512;j++)if(p[j*4+3]||p[(511*512+j)*4+3]||p[j*512*4+3]||p[(j*512+511)*4+3])throw Error('Clipped frame');
        checks.push({shield:shield.key,direction:d.id,frame:i,view:d.shieldView,drawOrder:seq});
       }
      }
      combinations.push({shield:shield.key,weapon,frames:count});
     }
     r.selectEquipment(shield.key,'approved');
     for(const ms of r.MIDS){x.clearRect(0,0,256,256);y.clearRect(0,0,256,256);r.renderer.draw(x,'NW',128,224,192,ms,{weapon:false,shield:false});r.renderer.draw(y,'NW',128,224,192,ms,{weapon:false,shield:true});const p=x.getImageData(0,0,256,256).data,q=y.getImageData(0,0,256,256).data;let preserved=0;for(let z=0;z<p.length;z+=4)if(p[z+3]===255){preserved++;if(p[z]!==q[z]||p[z+1]!==q[z+1]||p[z+2]!==q[z+2]||q[z+3]!==255)throw Error('NW shield obscures body '+shield.key+ms)}pixels.push({shield:shield.key,ms,opaqueBodyPixelsPreserved:preserved})}
    }
    return {checks,pixels,combinations};
   }''')
   for direction in ['NW','SE']:
    data=page.evaluate('''direction => {const r=window.review,c=document.createElement('canvas');c.width=1536;c.height=10*256;const g=c.getContext('2d');g.fillStyle='#e8e3d9';g.fillRect(0,0,c.width,c.height);for(const [row,s]of r.catalog.shields.entries()){r.selectEquipment(s.key,'approved');for(const [i,ms]of r.MIDS.entries()){r.renderer.draw(g,direction,i*256+128,row*256+222,144,ms,{weapon:true,shield:true});g.fillStyle='#273536';g.font='14px system-ui';g.fillText(s.key+' / '+direction+' / '+i,i*256+8,row*256+20)}}return c.toDataURL().split(',')[1]}''',direction)
    (R/f'{direction}-all-frames.png').write_bytes(base64.b64decode(data))
   page.evaluate('''window.contactAt = ms => {const r=window.review,c=document.createElement('canvas');c.width=1280;c.height=10*170;const g=c.getContext('2d');g.fillStyle='#e8e3d9';g.fillRect(0,0,c.width,c.height);for(const [row,s]of r.catalog.shields.entries()){r.selectEquipment(s.key,'approved');for(const [i,d]of r.baseMeta.directions.entries()){r.renderer.draw(g,d.id,i*160+80,row*170+135,96,ms,{weapon:true,shield:true});g.fillStyle='#273536';g.font='12px system-ui';g.fillText(s.key+' / '+d.id,i*160+6,row*170+16)}}return c.toDataURL().split(',')[1]}''')
   data=page.evaluate('contactAt(170)');(R/'game-size.png').write_bytes(base64.b64decode(data))
   frames=[]
   for ms in [17,70,120,170,230,280]:
    frames.append(Image.open(io.BytesIO(base64.b64decode(page.evaluate('(ms)=>contactAt(ms)',ms)))).convert('RGB'))
   frames[0].save(R/'shields-8directions.gif',save_all=True,append_images=frames[1:],duration=[35,70,40,55,60,540],loop=0)
   page.select_option('#shieldSelect','haramochi');page.select_option('#direction','SE');page.evaluate('previewAt(170)');page.screenshot(path=str(R/'preview.png'),full_page=True)
   page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(R/'preview-mobile.png'),full_page=True)
   # Confirm the public UI can switch both pieces and return to v3 art.
   page.select_option('#weaponSelect','firesword');page.select_option('#shieldSelect','minoshield');page.select_option('#direction','NW');page.evaluate('previewAt(230)');assert page.evaluate('review.weaponKey==="firesword"&&review.shieldKey==="minoshield"')
   page.select_option('#shieldSelect','approved');assert page.evaluate('review.equipment.shield===review.approvedEquipment.shield')
   assert len(results['checks'])==480 and sum(x['frames'] for x in results['combinations'])==6240 and len(results['pixels'])==60
   assert not errors,errors
   (R/'validation.json').write_text(json.dumps(dict(shieldDirectionFrameChecks=480,equipmentCombinationFrameChecks=6240,shieldImagesLoaded=40,NWPixelChecks=60,pageErrors=errors,mobileLayout=True,approvedBaselineUnchanged=True,**results),indent=2)+'\n')
   browser.close()
 finally:server.shutdown()
 print('PASS: 40 sprites, 480 shield frames, 6240 equipment combination frames, 60 NW pixel checks, view mapping, NW/SE draw order, mobile UI; v3 unchanged')
if __name__=='__main__':run()
