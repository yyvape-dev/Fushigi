from pathlib import Path
import json,base64,hashlib
from PIL import Image
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
meta=json.loads((P/'monsters.json').read_text());assert len(meta['monsters'])==12
for k,m in meta['monsters'].items():
 assert m['motion'],k
 for d,v in m['views'].items():
  im=Image.open(P/v['idle']);assert im.size==(256,256) and im.mode=='RGBA'
  box=im.getchannel('A').getbbox();assert box and box[0]>=4 and box[1]>=2 and box[2]<=252 and box[3]<=226,(k,d,box)
  assert hashlib.sha256((P/v['idle']).read_bytes()).hexdigest()==v['sha256']
  assert Image.open(P/v['motion']).size==(512,256)
report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000/fushigi-monsters-v2/preview.html');page.wait_for_function('window.MonsterReview && MonsterSprites.ready',timeout=120000)
 assert page.locator('#catalog article').count()==60
 check=page.evaluate('''()=>{let n=0;const D=['S','SW','W','NW','N','NE','E','SE'];for(const family of Object.keys(MonsterRoster.names))for(const d of D)for(const action of ['idle','walk','attack']){let alpha=null;const seen=[];for(let tier=1;tier<=4;tier++){const k=tier===1?family:family+'_'+tier,c=MonsterSprites.frame(k,d,action,action==='walk'?40:120);if(!c)throw Error('missing '+k);const data=c.getContext('2d').getImageData(0,0,256,256).data;let count=0,hash=0;const a=[];for(let i=0;i<data.length;i+=4){if(data[i+3])count++;a.push(data[i+3]);hash=(hash+data[i]*3+data[i+1]*5+data[i+2]*7)>>>0;}if(count<100)throw Error('empty '+k);if(alpha&&a.some((v,i)=>v!==alpha[i]))throw Error('alpha changed '+k);alpha=a;seen.push(hash);n++;}if(new Set(seen).size!==4)throw Error('duplicate rank colors '+family);}return {views:n,cache:MonsterSprites.tints.size};}''')
 motion=list(meta['monsters'])
 for family in motion:
  assert page.evaluate("""family=>{for(const d of ['S','SW','W','NW','N','NE','E','SE']){const idle=MonsterSprites.frame(family,d,'idle',0).toDataURL();if(MonsterSprites.frame(family,d,'walk',40).toDataURL()===idle)throw Error('walk equals idle '+family+' '+d);if(MonsterSprites.frame(family,d,'attack',120).toDataURL()===idle)throw Error('attack equals idle '+family+' '+d);}return true;}""",family)
 assert check['views']==1440 and check['cache']<=192,check
 # Save real rendered contact sheets for visual pose and color review.
 for family in ['blob','skeleton','archer','thief','sleepy','bomb','ogre','dazzle','venom','ghost','minotaur','dragon','slime','goblin','bat']:
  uri=page.evaluate('''family=>{const c=document.createElement('canvas');c.width=1536;c.height=1344;const g=c.getContext('2d');g.fillStyle='#27342c';g.fillRect(0,0,c.width,c.height);g.font='14px sans-serif';const D=['S','SW','W','NW','N','NE','E','SE'];for(let row=0;row<6;row++){const tier=row<3?1:4,action=['idle','walk','attack'][row%3],kind=tier===1?family:family+'_'+tier;for(let i=0;i<8;i++){g.fillStyle='#f5e5bc';g.fillText(family+' R'+tier+' '+action+' '+D[i],i*192+5,row*224+20);MonsterSprites.draw(g,kind,D[i],i*192+96,row*224+210,144,action,action==='walk'?40:120);}}return c.toDataURL();}''',family)
  (P/f'{family}-motion-contact.png').write_bytes(base64.b64decode(uri.split(',')[1]))
 page.screenshot(path=str(P/'gallery-desktop.png'));page.close()
 for name,w,h in [('landscape',844,390),('portrait',390,844)]:
  page=b.new_page(viewport={'width':w,'height':h});page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8000/fushigi-monsters-v2/game-review.html');page.wait_for_function('window.MonsterStage && MonsterSprites.ready && enemies.length===3',timeout=120000)
  page.evaluate((P.parent/'tests/test_monster_families.js').read_text())
  page.locator('#monsterFamily').select_option('dragon');page.locator('#monsterTier').select_option('4');page.locator('#monsterSpawn').click()
  assert page.evaluate('enemies.every(e=>e.kind==="dragon_4")')
  page.screenshot(path=str(P/f'game-{name}.png'))
  page.evaluate('player.hp=player.maxhp=999;player.st=newStatus();enemies.forEach(e=>e.aware=true);enemyTurn();render()')
  assert page.evaluate('enemies.some(e=>e.monsterAttackStart!=null || e.x!==e.vx || e.y!==e.vy)')
  assert not errors,errors;report.append({'viewport':name,'roster':True,'realGameDraw':True,'aiAndMotionDispatch':True});page.close()
 b.close()
(P/'validation.json').write_text(json.dumps({'frames':check,'game':report},indent=2)+'\n')
print('ALL OK: 12 complete sprite families, 1440 color/direction/action views, unchanged alpha, bounded cache, 60 ranks and live game AI')
