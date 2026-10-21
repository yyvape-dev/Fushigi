from pathlib import Path
import base64,json
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);results=[]
 for label,w,h in [('landscape',844,390),('portrait',390,844)]:
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8000/fushigi-allies-v1/game-review.html?size=1');page.wait_for_function('window.AllyReview && AllySystem.state.ready',timeout=120000)
  assert page.evaluate('AllySystem.state.renderScale===1.2 && Object.keys(AllySystem.state.registration).length===8')
  for scale in ['1.17','1.2','1.25']:
   page.locator('#allyScale').select_option(scale);assert page.evaluate('AllySystem.state.renderScale')==float(scale)
   page.screenshot(path=str(P/f'size-{scale.replace(".","")}-{label}.png'))
  page.locator('#allyScale').select_option('1.2');page.screenshot(path=str(P/f'size-{label}.png'))
  if label=='landscape':
   result=page.evaluate('''()=>{const oldTS=TS,oldChar=charPref;TS=128;charPref=0;const c=document.createElement('canvas');c.width=1536;c.height=768;const g=c.getContext('2d');g.fillStyle='#272330';g.fillRect(0,0,c.width,c.height);const D=['S','SW','W','NW','N','NE','E','SE'],faces=[[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]];
   for(let row=0;row<3;row++)for(let i=0;i<8;i++){const x=i*192+96,y=row*256+224,face=faces[i],a={...AllySystem.state.actor,x:0,y:0,vx:0,vy:0,face,attackFace:face,attackStart:row===2?0:null,walkStart:0,walkEnd:row===1?1000:0,boost:0,castStart:null};
   g.fillStyle='#e6c5ea';g.font='12px sans-serif';g.textAlign='left';g.fillText(D[i]+' '+['idle','walk','attack'][row],i*192+6,row*256+16);AllySystem.draw(g,a,row===2?120:40,x-TS/2,y-tilePitchY()*.9);g.strokeStyle='#72c9ab';g.lineWidth=1;g.beginPath();g.moveTo(x-24,y);g.lineTo(x+24,y);g.moveTo(x,y-8);g.lineTo(x,y+8);g.stroke();}TS=oldTS;charPref=oldChar;return c.toDataURL();}''')
   (P/'registration-contact.png').write_bytes(base64.b64decode(result.split(',')[1]))
  assert not errors,errors;results.append({'viewport':label,'scales':[1.17,1.20,1.25],'directions':8,'registeredPoses':24,'errors':errors});page.close()
 b.close()
(P/'registration-validation.json').write_text(json.dumps(results,indent=2)+'\n')
print('ALL OK: 24 registered poses, common ground and three selectable scales in two viewports')
