"""Real browser: asset visibility, continuous lighting and in-world menu input."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
report={'viewports':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for label,w,h in [('landscape',844,390),('portrait',390,844),('desktop',1280,720)]:
  page=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1);errors=[];missing=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('response',lambda r:missing.append(r.url) if r.status>=400 and ('experience-v1/' in r.url or r.url.endswith(('/gold.png','/arrow.png')) or 'dungeon-experience.' in r.url) else None)
  page.goto('http://127.0.0.1:8000/fushigi-experience-v1/review.html');page.wait_for_function('window.ExperienceReview && DungeonExperience.ready && scene==="dungeon"');page.wait_for_function('SPRITES.gold && SPRITES.arrow')
  for mode in ['room','corridor','traps','stairs','bag']:
   page.evaluate('(mode)=>ExperienceReview.setup(mode)',mode)
   page.screenshot(path=str(P/f'{label}-{mode}.png'))
  lighting=page.evaluate('''()=>{
   ExperienceReview.setup('corridor');draw();
   const c=DungeonExperience.layers.light,g=c.getContext('2d'),x=innerWidth/2,y=focusY()+tilePitchY()*.1,r=TS*2.05;
   const alpha=(xx,yy)=>g.getImageData(Math.round(xx),Math.round(yy),1,1).data[3];
   const center=alpha(x,y),axis=alpha(x+r*.85,y),corner=alpha(x+r*.85,y+r*.85);
   if(!(center>240&&axis>0&&axis<200&&corner===0))throw Error('circular feather failed '+[center,axis,corner]);
   const cg=DungeonExperience.layers.ceiling.getContext('2d'),data=cg.getImageData(2,2,Math.min(40,innerWidth-2),40).data;let sum=0,min=255,max=0;
   for(let i=0;i<data.length;i+=4){const v=(data[i]+data[i+1]+data[i+2])/3;sum+=v;min=Math.min(min,v);max=Math.max(max,v);}
   if(!(sum/(data.length/4)>6&&max-min>5))throw Error('ceiling must be textured not black');
   return {centerAlpha:center,edgeAlpha:axis,diagonalAlpha:corner,ceilingMean:sum/(data.length/4),ceilingRange:max-min};
  }''')
  # A hidden floor must be concealed by opaque ceiling, not reveal its route.
  hidden=page.evaluate('''()=>{const tx=player.x+Math.floor(innerWidth/2/TS)-1,ty=player.y;const px=innerWidth/2+(tx-player.x)*TS,py=focusY();const read=()=>Array.from(ctx.getImageData(Math.round(px),Math.round(py),3,3).data);draw();const a=read();map[ty][tx]=map[ty][tx]===WALL?FLOOR:WALL;draw();const z=read();return a.every((v,i)=>v===z[i]);}''')
  assert hidden,'unknown floor leaked through ceiling'
  stairs=page.evaluate('''()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');let tiles=0;for(const id of ['forest','limestone','ruins','ice','volcano']){g.clearRect(0,0,64,64);if(!DungeonExperience.stairs(g,0,0,64,64,id))throw Error(id);const d=g.getImageData(0,0,64,64).data;for(const i of [3,63*4+3,63*64*4+3,64*64*4-1])if(d[i]!==255)throw Error('stair corner not full tile');tiles++;}return tiles;}''')
  assert stairs==5
  page.evaluate("ExperienceReview.setup('stairs');player.x=player.vx=13;player.y=player.vy=11;playerMove(1,0)")
  assert page.locator('#stairsPrompt').is_visible();assert page.evaluate('floorNo')==2
  turn=page.evaluate('turn');page.locator('#stairsStay').click();assert page.evaluate('floorNo===2 && !stairsOpen')
  assert page.evaluate('turn')==turn
  page.evaluate('doCtx()');page.locator('#stairsDown').click();assert page.evaluate('floorNo===3 && !stairsOpen')
  page.evaluate("ExperienceReview.setup('bag')");before=page.evaluate('turn');first=page.evaluate('bagSel');page.keyboard.press('ArrowDown');assert page.evaluate('bagSel')!=first
  page.keyboard.press('Enter');assert page.evaluate('bagActionMode');page.keyboard.press('Escape');assert page.evaluate('bagOpen && !bagActionMode');page.keyboard.press('Escape');assert not page.evaluate('bagOpen')
  assert page.evaluate('turn')==before
  # Touch/click selection and a quick binding must keep the world and list open.
  page.evaluate('openBag()');page.locator('#bagList [data-sel]').first.click();assert page.locator('#bagDetail h2').inner_text()
  q=page.locator('#bagDetail [data-act="quick"]');q.click();assert page.evaluate('bagOpen && quick!==null')
  assert page.evaluate('turn')==before
  page.locator('#bagClose').click();assert not page.evaluate('bagOpen')
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  assert not errors and not missing,(errors,missing)
  report['viewports'].append({'label':label,'size':[w,h],'lighting':lighting,'hiddenRouteConcealed':hidden,'fullTileStairs':stairs,'stairsStayAndDescend':True,'keyboardAndTouchMenu':True,'errors':errors,'missing':missing});page.close()
 b.close()
(P/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('OK: 3 viewports, 5 scenes, 5 full-tile stair themes, soft circular light and textured hidden ceiling, hidden-route concealment, stair choices, keyboard/touch inventory, no missing assets.')
