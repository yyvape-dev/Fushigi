from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
r=Path(__file__).parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(r)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_address[1]}/'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1120,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'preview.html');page.wait_for_function('!!renderer')
 page.screenshot(path=str(r/'preview-body.png'),full_page=True)
 page.check('#weapon');page.check('#shield');page.check('#debug');page.select_option('#dir','SW');page.screenshot(path=str(r/'preview-equipment.png'),full_page=True)
 # Verify each separate equipment image's defined grip lands on its socket.
 measurements=page.evaluate('''() => {
   const results=[];const c=document.createElement('canvas');c.width=1024;c.height=1024;const g=c.getContext('2d'),native=g.drawImage.bind(g);let captured=[];
   g.drawImage=function(im,...args){for(const name of ['weapon','shield'])if(im===equipment[name]){const spec=META.equipmentAssets[name],pt=this.getTransform().transformPoint(new DOMPoint(spec.grip[0]+args[0],spec.grip[1]+args[1]));captured.push({name,x:pt.x,y:pt.y});}return native(im,...args)};
   for(const ts of [48,64,96])for(const row of META.directions){captured=[];const x=512,y=700,h=ts*1.5;renderer.draw(g,row.id,x,y,h,{weapon:true,shield:true});for(const item of captured){const socket=item.name==='weapon'?row.right:row.left;const ex=x+(socket.position[0]-128)*h/192,ey=y+(socket.position[1]-224)*h/192;if(Math.hypot(item.x-ex,item.y-ey)>1e-5)throw Error('grip mismatch '+row.id); }if(captured.length!==2)throw Error('equipment not drawn');results.push({dir:row.id,tile:ts,items:captured.length});}return results;
 }''')
 assert len(measurements)==24
 for name in ['S','SW','W','NW','N','NE','E','SE']:page.select_option('#dir',name)
 page.goto(base+'game-base.html');page.wait_for_function('heroBaseReady() && !!SPRITES.town')
 page.evaluate('''() => {rigPref=0;charPref=2;zoomPref=3;resize();player.face=[0,1];heroBasePreview.debug=false;render();}''');page.wait_for_timeout(300)
 page.screenshot(path=str(r/'game-town.png'))
 page.evaluate('''() => {heroBasePreview.weapon=true;heroBasePreview.shield=true;heroBasePreview.debug=true;player.face=[-1,1];render();}''');page.screenshot(path=str(r/'game-equipment.png'))
 directions=page.evaluate('''() => [[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]].map(heroBaseDirection)''');assert directions==['S','SW','W','NW','N','NE','E','SE']
 # Inspect the canonical bases against the same actual game background.
 page.evaluate('heroBasePreview.weapon=false;heroBasePreview.shield=false;heroBasePreview.debug=false')
 captures=[]
 for face in [[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]]:
  page.evaluate('(face)=>{player.face=face;render();}',face)
  anchor=page.evaluate('({x:innerWidth/2,y:focusY()+TS*.4})')
  captures.append(page.screenshot(clip={'x':anchor['x']-128,'y':anchor['y']-192,'width':256,'height':256}))
 from PIL import Image,ImageDraw
 import io
 board=Image.new('RGB',(1024,560));bd=ImageDraw.Draw(board)
 for i,blob in enumerate(captures):
  x=i%4*256;y=i//4*280;board.paste(Image.open(io.BytesIO(blob)).convert('RGB'),(x,y));bd.text((x+110,y+261),directions[i],fill='#e9e1c9')
 board.save(r/'in-game-directions.png')
 page.set_viewport_size({'width':844,'height':390});page.evaluate('zoomPref=0;resize();render();');page.wait_for_timeout(200);page.screenshot(path=str(r/'game-landscape.png'))
 page.evaluate('enterDungeon()');page.wait_for_timeout(400);page.screenshot(path=str(r/'game-dungeon.png'))
 page.set_viewport_size({'width':390,'height':844});page.evaluate('resize();render();');page.wait_for_timeout(200);page.screenshot(path=str(r/'game-portrait.png'))
 assert not errors,errors
 report={'page_errors':errors,'direction_mapping':directions,'equipment_socket_checks':measurements,'context':'actual Fushigi HTML and repository town asset, local only'}
 (r/'browser-validation.json').write_text(json.dumps(report,indent=2));print('PASS:',len(measurements),'equipment grip placements, all eight directions, no JavaScript page errors.')
 b.close()
server.shutdown()
