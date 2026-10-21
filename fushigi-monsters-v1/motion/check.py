"""Real-renderer endpoint pixels, atlas bounds/reflections and gameplay dispatch."""
import json
from pathlib import Path
from PIL import Image,ImageOps,ImageChops,ImageDraw
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent;R=P.parent
m=json.loads((P/'motions.json').read_text());report={'atlases':0,'poses':0,'mirroredPoses':0,'browser':[]}
for kind,monster in m['monsters'].items():
 for d,v in monster['directions'].items():
  im=Image.open(P/v['atlas']);assert im.mode=='RGBA' and im.size==(512,512)
  for i in range(4):
   x=i%2*256;y=i//2*256;frame=im.crop((x,y,x+256,y+256));b=frame.getchannel('A').point(lambda a:255 if a>=48 else 0).getbbox()
   assert b and b[0]>1 and b[1]>1 and b[2]<255 and b[3]<255,(kind,d,i,b)
   if v['mirror']:
    source=Image.open(P/monster['directions'][v['mirrorSource']]['atlas']).crop((x,y,x+256,y+256));expected=Image.new('RGBA',(256,256));expected.alpha_composite(ImageOps.mirror(source),(1,0))
    assert ImageChops.difference(expected,frame).getbbox() is None
    report['mirroredPoses']+=1
   report['poses']+=1
  report['atlases']+=1
for action,seq,durations in [('walk',[-1,0,-1,1],[80]*4),('attack',[-1,2,3,-1],[35,100,95,300])]:
 frames=[]
 for pose in seq:
  canvas=Image.new('RGB',(768,288),'#26313d');draw=ImageDraw.Draw(canvas)
  for col,kind in enumerate(['slime','goblin','bat']):
   if pose<0:im=Image.open(R/f'assets/{kind}/SE.png')
   else:
    a=Image.open(P/m['monsters'][kind]['directions']['SE']['atlas']);x=pose%2*256;y=pose//2*256;im=a.crop((x,y,x+256,y+256))
   canvas.paste(im,(col*256,0),im);draw.text((col*256+8,260),kind+' '+action,fill='white')
  frames.append(canvas)
 frames[0].save(P/f'SE-{action}.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1100,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000/fushigi-monsters-v1/preview.html');page.wait_for_function('MonsterReview.ready || MonsterReview.error');assert page.evaluate('MonsterReview.ready')
 pixel=page.evaluate('''()=>{
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),r=MonsterSprites;let same=0,changed=0;
 const data=()=>new Uint8ClampedArray(g.getImageData(0,0,256,256).data);
 for(const k of ['slime','goblin','bat'])for(const d of ['S','SW','W','NW','N','NE','E','SE']){
  g.clearRect(0,0,256,256);g.drawImage(r.base[k+':'+d],0,0);const base=data();
  for(const t of [0,260,300]){g.clearRect(0,0,256,256);r.draw(g,k,d,128,224,192,'attack',t);if(!data().every((v,i)=>v===base[i]))throw Error(k+d+' endpoint '+t);same++;}
  for(const a of ['walk','attack']){g.clearRect(0,0,256,256);r.draw(g,k,d,128,224,192,a,a==='walk'?0:150);if(data().every((v,i)=>v===base[i]))throw Error(k+d+' no changed pose');changed++;}
 }return {exactIdleEndpoints:same,changedActionSamples:changed};}''');report.update(pixel)
 for action in ['idle','walk','attack']:page.select_option('#action',action)
 assert not errors,errors
 page.close()
 for name,w,h in [('landscape',844,390),('portrait',390,844)]:
  page=browser.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8000/index.html');page.wait_for_function('MonsterSprites.ready && ApprovedHero.ready && CaveTerrain.ready',timeout=30000)
  result=page.evaluate('''()=>{
   enterDungeon();const room=rooms[0];player.x=player.vx=room.cx;player.y=player.vy=room.cy;player.hp=player.maxhp=999;enemies=[];traps=[];
   for(let yy=room.cy-3;yy<=room.cy+3;yy++)for(let xx=room.cx-3;xx<=room.cx+3;xx++)if(inb(xx,yy))map[yy][xx]=FLOOR;
   const kinds=['slime','goblin','bat'];const directions=[[0,1],[-1,0],[1,-1]];
   const assert=(x,m)=>{if(!x)throw Error(m);};
   kinds.forEach((kind,i)=>{const dx=directions[i][0],dy=directions[i][1],e={kind,x:room.cx+i-1,y:room.cy-2,vx:room.cx+i-1-dx,vy:room.cy-2-dy,hp:99,maxhp:99,st:{},fl:true};enemies.push(e);});
   stepVis(16);enemies.forEach((e,i)=>{assert(e.monsterWalkEnd>now(),'walk timer');assert(JSON.stringify(e.monsterFace)===JSON.stringify(directions[i]),'movement facing');});
   const original=MonsterSprites.draw,calls=[];MonsterSprites.draw=function(g,...args){calls.push({args,matrix:g.getTransform().a});return original.call(this,g,...args);};
   for(const e of enemies){enemyStrike(e,eT(e),[1,1],'攻撃');const locked=MonsterSprites.direction(e.monsterAttackFace);e.monsterFace=[1,1];drawEntity(e.kind,e,e.monsterAttackStart+150,0,0);const last=calls.at(-1);assert(last.args[1]===locked&&last.args[5]==='attack','attack direction changed');assert(last.matrix>0,'legacy flip mirrored new monster');}
   MonsterSprites.draw=original;
   enemies.forEach((e,i)=>{e.x=e.vx=room.cx+i-1;e.y=e.vy=room.cy-2;e.monsterFace=[0,1];e.monsterAttackStart=null;e.monsterWalkEnd=0;e.bump=null;e.flash=0;});
   fadeT=-1000;hurtT=0;shakeAmp=0;player.flash=0;fx.length=0;vfx.length=0;
   updateVis();draw();return {kinds:kinds.length,walkFacing:true,attackFacingLocked:true,noLegacyFlip:true};
  }''')
  page.screenshot(path=str(P/f'game-{name}.png'))
  assert not errors,errors
  report['browser'].append({'viewport':[w,h],**result,'errors':errors});page.close()
 browser.close()
(P/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('OK: 96 pose bounds, 24 reflected poses, 72 exact idle endpoints, 48 changed action samples, actual game facing/dispatch in two viewports.')
