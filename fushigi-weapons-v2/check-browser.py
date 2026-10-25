"""Browser integration: real main, all weapon poses, small screens and glow."""
from pathlib import Path
import json,base64,io,os
from PIL import Image
from playwright.sync_api import sync_playwright
R=Path(__file__).parent
URL=os.environ.get('FUSHIGI_REVIEW_URL','http://127.0.0.1:8000/')
def check():
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1100,'height':1050});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(URL+'fushigi-weapons-v2/preview.html');page.wait_for_function('window.weaponReview?.ready',timeout=90000)
  page.evaluate("weaponReview.capture('kamaitachi','SW','idle',0,500)");page.screenshot(path=str(R/'preview.png'),full_page=True)
  result=page.evaluate('''() => {
   const c=document.createElement('canvas');c.width=256;c.height=288;const g=c.getContext('2d');let count=0;
   const ms=[17,70,120,170,230,280];
   function checkPose(key,id,action,t){
    g.clearRect(0,0,256,288);weaponReview.drawHero(g,key,id,128,224,96,action,t,500,true);
    const a=g.getImageData(0,0,256,288).data;let pixels=0;for(let i=3;i<a.length;i+=4)if(a[i]>30)pixels++;
    if(pixels<500)throw Error(key+': empty '+id+' '+action+' '+t);
    for(let x=0;x<256;x++)if(a[x*4+3]>3||a[(287*256+x)*4+3]>3)throw Error('vertical clipping');
    for(let y=0;y<288;y++)if(a[y*256*4+3]>3||a[(y*256+255)*4+3]>3)throw Error('horizontal clipping');
   }
   for(const w of ApprovedHero.weaponCatalog)for(const d of ApprovedHero.base.directions)for(const t of ms){checkPose(w.key,d.id,'attack',t);count++;}
   let walk=0;for(const key of ['kamaitachi','skyblade','firesword'])for(const d of ApprovedHero.base.directions)for(const t of [40,140,240,340]){checkPose(key,d.id,'walk',t);walk++;}
   return {attackDraws:count,walkDraws:walk,glows:Object.keys(ApprovedHero.glows)};
  }''')
  contact=page.evaluate('''() => {
   const c=document.createElement('canvas');c.width=1152;c.height=1440;const g=c.getContext('2d');g.fillStyle='#252b35';g.fillRect(0,0,c.width,c.height);
   let row=0;for(const key of ['kamaitachi','skyblade','firesword'])for(const id of ['NW','SE']){for(const [i,t] of [17,70,120,170,230,280].entries()){
    weaponReview.drawHero(g,key,id,i*192+96,row*240+208,120,'attack',t,500,true);g.fillStyle='#eee7d8';g.font='12px system-ui';g.textAlign='center';g.fillText(key+' '+id+' '+i,i*192+96,row*240+232);
   }row++;}return c.toDataURL('image/png').split(',')[1];
  }''')
  (R/'NW-SE-attack.png').write_bytes(base64.b64decode(contact))
  gif=[]
  for t in range(0,1200,80):
   data=page.evaluate('''t=>{const c=document.createElement('canvas');c.width=780;c.height=340;const g=c.getContext('2d');g.fillStyle='#252b35';g.fillRect(0,0,780,340);for(const [i,key] of ['kamaitachi','skyblade','firesword'].entries()){weaponReview.drawHero(g,key,'SW',i*260+130,296,170,'attack',t%1000,t,true);g.fillStyle='#eee7d8';g.font='14px system-ui';g.textAlign='center';g.fillText(key,i*260+130,326);}return c.toDataURL('image/png').split(',')[1];}''',t)
   gif.append(Image.open(io.BytesIO(base64.b64decode(data))).convert('RGB'))
  gif[0].save(R/'weapon-glow.gif',save_all=True,append_images=gif[1:],duration=80,loop=0)
  for width,height in [(390,844),(844,390),(320,640)]:
   page.set_viewport_size({'width':width,'height':height});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow {width}'
  # The preview and main use the same production loader and animated textures.
  page.set_viewport_size({'width':390,'height':844});page.goto(URL);page.wait_for_function('ApprovedHero.ready && HeroActions.ready',timeout=90000)
  main=page.evaluate('''() => {enterDungeon();enemies=[];eqWeapon={type:'kamaitachi',plus:0,seals:[]};eqShield=null;render();return {catalog:ApprovedHero.weaponCatalog.length,animated:ApprovedHero.animating(eqWeapon.type),key:ApprovedHero.renderer(eqWeapon.type).weaponGlow.key};}''')
  assert main['catalog']==12 and main['animated'] and main['key']=='kamaitachi',main
  page.screenshot(path=str(R/'game-mobile.png'))
  page.emulate_media(reduced_motion='reduce');assert not page.evaluate("ApprovedHero.animating('kamaitachi')")
  assert not errors,errors
  result.update(main=main,browserErrors=errors,mobileOverflow=False,reducedMotion=True)
  (R/'browser-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result));browser.close()
if __name__=='__main__':check()
