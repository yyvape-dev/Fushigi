from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json,hashlib,base64
from PIL import Image
from playwright.sync_api import sync_playwright

R=Path(__file__).parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def run():
 manifest=json.loads((R/'weapons.json').read_text())
 for p,h in manifest['baselineHashes'].items():assert hashlib.sha256((R.parent/'fushigi-equipment-v3'/p).read_bytes()).hexdigest()==h
 for w in manifest['weapons']:
  im=Image.open(R/w['path']);assert im.mode=='RGBA' and list(im.size)==w['size'];assert im.getbbox()[1]>=2 and im.getbbox()[3]<255
  assert im.getpixel(tuple(w['grip']))[3]>200,w['key']
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(R.parent)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   page=browser.new_page(viewport={'width':1100,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{server.server_address[1]}/fushigi-weapons-v1/preview.html');page.wait_for_function('window.previewReady || window.previewError');assert not page.evaluate('window.previewError')
   result=page.evaluate('''() => {
    const r=window.review,checks=[];
    for(const w of r.catalog.weapons){r.selectWeapon(w.key);
     const cv=document.createElement('canvas');cv.width=cv.height=640;const g=cv.getContext('2d');
     for(const d of r.baseMeta.directions)for(const [i,ms] of r.MIDS.entries()){
      g.clearRect(0,0,640,640);const seq=[],native=g.drawImage.bind(g);g.drawImage=function(im,...a){seq.push(im===r.equipment['shield-back']?'shield-back':im===r.equipment['shield-quarter']?'shield-quarter':im===r.weapons[w.key]?'weapon':'body');native(im,...a)};
      r.renderer.draw(g,d.id,320,380,192,ms,{weapon:true,shield:true});g.drawImage=native;
      const px=g.getImageData(0,0,640,640).data;let visible=0;for(let z=3;z<px.length;z+=4)if(px[z])visible++;
      if(!visible)throw Error('Empty frame '+w.key+d.id+i);
      for(let x=0;x<640;x++)if(px[x*4+3]||px[((639*640)+x)*4+3])throw Error('vertical clip');
      for(let y=0;y<640;y++)if(px[y*640*4+3]||px[(y*640+639)*4+3])throw Error('horizontal clip');
      if(d.id==='NW'&&(seq.indexOf('shield-back')<0||seq.at(-1)!=='body'))throw Error('NW depth '+w.key+i);
      if(d.id==='SE'&&seq.at(-1)!=='shield-quarter')throw Error('SE depth '+w.key+i);
      checks.push({weapon:w.key,direction:d.id,frame:i,drawOrder:seq,visiblePixels:visible});
     }
    }
    const pixels=[];r.selectWeapon('woodsword');
    const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=256;a.height=b.height=256;
    const x=a.getContext('2d'),y=b.getContext('2d');
    for(const ms of r.MIDS){x.clearRect(0,0,256,256);y.clearRect(0,0,256,256);r.renderer.draw(x,'NW',128,224,192,ms,{weapon:false,shield:false});r.renderer.draw(y,'NW',128,224,192,ms,{weapon:false,shield:true});const p=x.getImageData(0,0,256,256).data,q=y.getImageData(0,0,256,256).data;let n=0;for(let z=0;z<p.length;z+=4)if(p[z+3]===255){n++;if(p[z]!==q[z]||p[z+1]!==q[z+1]||p[z+2]!==q[z+2])throw Error('NW body obscured')}pixels.push({ms,opaqueBodyPixelsPreserved:n})}
    return {checks,pixels};
   }''')
   for direction in ['NW','SE']:
    data=page.evaluate('''direction => {const r=window.review,c=document.createElement('canvas');c.width=1536;c.height=12*256;const g=c.getContext('2d');g.fillStyle='#e8e3d9';g.fillRect(0,0,c.width,c.height);for(const [row,w] of r.catalog.weapons.entries()){r.selectWeapon(w.key);for(const [i,ms]of r.MIDS.entries()){r.renderer.draw(g,direction,i*256+128,row*256+222,144,ms,{weapon:true,shield:true});g.fillStyle='#273536';g.font='14px system-ui';g.fillText(w.key+' / '+direction+' / '+i,i*256+8,row*256+20)}}return c.toDataURL().split(',')[1]}''',direction)
    (R/f'{direction}-all-frames.png').write_bytes(base64.b64decode(data))
   data=page.evaluate('''() => {const r=window.review,c=document.createElement('canvas');c.width=1280;c.height=12*170;const g=c.getContext('2d');g.fillStyle='#e8e3d9';g.fillRect(0,0,c.width,c.height);for(const [row,w]of r.catalog.weapons.entries()){r.selectWeapon(w.key);for(const [i,d]of r.baseMeta.directions.entries()){r.renderer.draw(g,d.id,i*160+80,row*170+135,96,170,{weapon:true,shield:true});g.fillStyle='#273536';g.font='12px system-ui';g.fillText(w.key+' / '+d.id,i*160+6,row*170+16)}}return c.toDataURL().split(',')[1]}''')
   (R/'game-size.png').write_bytes(base64.b64decode(data))
   page.select_option('#weaponSelect','minoaxe');page.select_option('#direction','NW');page.evaluate('previewAt(170)');page.screenshot(path=str(R/'preview.png'),full_page=True)
   page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert len(result['checks'])==576 and not errors,errors
   (R/'validation.json').write_text(json.dumps(dict(directionFrameChecks=576,pageErrors=errors,mobileLayout=True,approvedBaselineUnchanged=True,**result),indent=2)+'\n')
   browser.close()
 finally:server.shutdown()
 print('PASS: 576 weapon/direction/frame renders, NW opaque body pixels, NW/SE draw order, grips, alpha, mobile layout; approved v3 unchanged')
if __name__=='__main__':run()
