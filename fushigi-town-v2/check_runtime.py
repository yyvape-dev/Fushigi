"""Exercise the real town/inn transitions and service dialogs in Chromium."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
URL=os.environ.get('FUSHIGI_TEST_URL','http://127.0.0.1:8765/')
WALK='''([tx,ty])=>{
 const q=[{x:player.x,y:player.y,path:[]}],seen=new Set([player.x+','+player.y]);
 for(let i=0;i<q.length;i++){
  const c=q[i];if(c.x===tx&&c.y===ty){for(const [dx,dy]of c.path)playerMove(dx,dy);snapVis();render();return {x:player.x,y:player.y,area:CastleTown.state.area};}
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=c.x+dx,y=c.y+dy,k=x+','+y;
   if(seen.has(k)||!geomOK(c.x,c.y,dx,dy)||CastleTown.state.npcs.some(n=>n.x===x&&n.y===y))continue;
   seen.add(k);q.push({x,y,path:[...c.path,[dx,dy]]});
  }
 }throw Error('No path to '+tx+','+ty);
}'''

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':844,'height':390},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL,wait_until='load',timeout=120000)
 page.wait_for_function("CastleTown.state.images.inn&&CastleTown.state.images.town&&CastleTown.state.images['rana-rest']&&ApprovedHero.ready&&AllySystem.state.ready&&ShopSystem.state.images['brown/S/idle']?.complete",timeout=90000)
 page.wait_for_timeout(600)
 page.screenshot(path=str(ROOT/'bed.png'))
 assert page.evaluate("CastleTown.state.waking&&CastleTown.state.area==='inn'")
 page.keyboard.press('ArrowRight');page.wait_for_timeout(100)
 assert not page.evaluate('CastleTown.state.waking')
 assert page.evaluate(WALK,[10,21])['area']=='outside'
 page.wait_for_timeout(450)
 page.evaluate("player.x=31;player.y=30;snapVis();render()")
 page.screenshot(path=str(ROOT/'square.png'))
 old=page.evaluate('CastleTown.state.npcs.map(n=>[n.x,n.y])')
 page.wait_for_timeout(2500)
 moved=page.evaluate('(prev)=>CastleTown.state.npcs.some((n,i)=>n.x!==prev[i][0]||n.y!==prev[i][1])',old)
 assert moved,'NPCs should move while standing still'
 page.evaluate(WALK,[15,28])
 page.evaluate("inv=[mkItem('sword',0)];eqWeapon=inv[0];gold=1000;doCtx()")
 assert page.locator('#townTitle').inner_text()=='鍛冶屋'
 page.screenshot(path=str(ROOT/'smith.png'))
 page.locator('[data-town="forge"]').click()
 assert page.evaluate('inv[0].plus===1&&gold===700')
 page.keyboard.press('Escape')
 page.evaluate(WALK,[48,26]);page.evaluate('doCtx()')
 assert page.evaluate('whOpen')
 assert page.locator('#whSeg [data-side="shop"]').is_hidden()
 assert page.locator('#whSeg [data-side="sell"]').is_hidden()
 page.locator('#bankIn').click()
 assert page.evaluate('bank===700&&gold===0')
 page.screenshot(path=str(ROOT/'deposit.png'))
 page.evaluate('closeWh();CastleTown.show("map")')
 page.screenshot(path=str(ROOT/'town-map.png'))
 assert '雇' not in page.locator('#townDialog').inner_text()
 page.keyboard.press('Escape')
 page.evaluate('CastleTown.show("mercenary")')
 assert page.locator('[data-town="hire"]').count()==0
 page.keyboard.press('Escape')
 page.evaluate('saveGame()');loc=page.evaluate('[CastleTown.state.area,player.x,player.y]')
 page.reload(wait_until='load');page.wait_for_function('CastleTown.state.images.town&&ApprovedHero.ready')
 assert page.evaluate('[CastleTown.state.area,player.x,player.y]')==loc
 page.evaluate("CastleTown.enterInn();CastleTown.rest();fadeT=-1e9;render()")
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200)
 page.screenshot(path=str(ROOT/'bed-portrait.png'))
 page.evaluate('CastleTown.wake()');page.evaluate(WALK,[10,20]);page.wait_for_timeout(200)
 page.screenshot(path=str(ROOT/'inn-portrait.png'))
 page.evaluate('CastleTown.leaveInn();player.x=31;player.y=30;snapVis();render()')
 page.screenshot(path=str(ROOT/'square-portrait.png'))
 page.locator('#townMapButton').click();page.screenshot(path=str(ROOT/'map-portrait.png'))
 assert page.evaluate("document.getElementById('townDialog').scrollHeight<=innerHeight+2")
 page.keyboard.press('Escape')
 page.evaluate("inv=[mkItem('potion')];gold=200;enterDungeon();enemies=[];clearDungeon();fadeT=-1e9;render()")
 assert page.evaluate("CastleTown.state.waking&&CastleTown.state.area==='inn'&&inv.length===1&&gold===200")
 page.evaluate("enterDungeon();enemies=[];dead=true;afterDeath();fadeT=-1e9;render()")
 assert page.evaluate("CastleTown.state.waking&&inv.length===0&&gold===0&&bank===700")
 assert not errors,errors
 result={'browserErrors':errors,'npcMotion':moved,'services':['inn transition','rest','smith upgrade','deposit money','town map','mercenary conversation without hiring'],'portraitAndLandscape':True,'reloadTownPosition':True,'clearAndDeathReturnToBed':True}
 (ROOT/'runtime-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(result,ensure_ascii=False),flush=True)
 browser.close()
