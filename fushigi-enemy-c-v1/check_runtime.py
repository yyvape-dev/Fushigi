"""Exercise the actual renderer and game integration in Chromium."""
from pathlib import Path
import os,json,base64
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
origin=os.environ.get('FUSHIGI_REVIEW_ORIGIN','http://127.0.0.1:8014')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1100,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(origin+'/fushigi-enemy-c-v1/runtime-preview.html')
 page.wait_for_function('MonsterSprites.ready||MonsterSprites.error',timeout=90000)
 assert page.evaluate('MonsterSprites.ready && !MonsterSprites.error')
 result=page.evaluate('''()=>{
 const S=MonsterSprites,D=['S','SW','W','NW','N','NE','E','SE'],F=['ninja','caster','mimic','summoner','charged','cannon','lord'];let frames=0,changed=0,tints=0;
 const pixels=c=>c.getContext('2d').getImageData(0,0,256,256).data;
 const equal=(a,b)=>a.every((v,i)=>v===b[i]);
 for(const f of F)for(const d of D){const base=S.frame(f,d),a=pixels(base);
  for(const act of ['idle','walk','attack']){
   const elapsed=act==='walk'?40:80,im=S.frame(f,d,act,elapsed),p=pixels(im);let count=0,edge=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(p[(y*256+x)*4+3]>40){count++;if(x<4||x>251||y<4||y>251)edge++;}
   if(count<1000||edge)throw Error(f+':'+d+':'+act+' clipped/empty '+count+'/'+edge);frames++;
   if(act!=='idle'){if(equal(a,p))throw Error('unchanged motion '+f+d+act);changed++;}
   if(f!=='lord')for(let t=2;t<=4;t++){const v=pixels(S.frame(f+'_'+t,d,act,elapsed));if(equal(p,v))throw Error('unchanged tint '+f+t);for(let i=3;i<p.length;i+=4)if(p[i]!==v[i])throw Error('alpha changed '+f+t);tints++;frames++;}
  }
  if(!equal(a,pixels(S.frame(f,d,'attack',0)))||!equal(a,pixels(S.frame(f,d,'attack',299))))throw Error('attack does not return to idle '+f+d);
 }
 return {frames,changed,tints,ready:S.ready,error:S.error};}''')
 page.locator('#action').select_option('attack');page.screenshot(path=str(P/'runtime-attack-desktop.webp'),full_page=True)
 # Shared-painter contact sheet: all 168 base poses plus the 7 canonical idle refs.
 for family in ['ninja','caster','mimic','summoner','charged','cannon','lord']:
  data=page.evaluate('''f=>{const c=document.createElement('canvas');c.width=2048;c.height=768;const g=c.getContext('2d');['idle','walk','attack'].forEach((a,y)=>['S','SW','W','NW','N','NE','E','SE'].forEach((d,x)=>g.drawImage(MonsterSprites.frame(f,d,a,a==='walk'?40:80),x*256,y*256)));return c.toDataURL('image/png').split(',')[1];}''',family)
  (P/(family+'-runtime-contact.png')).write_bytes(base64.b64decode(data))
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(P/'runtime-mobile.webp'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.goto(origin+'/fushigi-enemy-c-v1/game-review.html')
 page.wait_for_function('window.DeepEnemyReview&&MonsterSprites.ready',timeout=90000);page.wait_for_timeout(300)
 assert page.evaluate("SAVE_KEY==='fushigi_enemy_c_review_core' && RunSave.KEY==='fushigi_enemy_c_review_run'")
 for family in ['ninja','caster','mimic','summoner','charged','cannon','lord']:
  page.locator('#deepFamily').select_option(family)
  for tier in ['1','4']:
   page.locator('#deepRank').select_option(tier)
   info=page.evaluate('''()=>{DeepEnemyReview.setup();const e=enemies[0];const t=performance.now();draw();const before=e.hp;enemyStrike(e,eT(e),[1,1],'確認');const attack=Number.isFinite(e.monsterAttackStart)&&e.monsterAttackFace.length===2;draw();return{kind:e.kind,attack,hpBefore:before,hpAfter:e.hp,art:MonsterSprites.has(e.kind)};}''')
   assert info['attack'] and info['art'] and info['hpBefore']==info['hpAfter'], info
 page.locator('#deepFamily').select_option('summoner');page.screenshot(path=str(P/'game-portrait.webp'))
 page.set_viewport_size({'width':844,'height':390});page.locator('#deepFamily').select_option('lord');page.screenshot(path=str(P/'game-landscape.webp'))
 assert not errors,errors
 result.update({'browserErrors':errors,'saveIsolated':True,'gameFamilies':7,'gameRanks':[1,4]})
 (P/'runtime-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));b.close()
