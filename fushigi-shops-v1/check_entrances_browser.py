from pathlib import Path
import json
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
setup='''({plan,ri,width,height})=>{ShopSystem.reset();AllySystem.reset();scene='dungeon';floorNo=5;MW=width;MH=height;map=plan.map;floorPlan=plan;rooms=plan.rooms;buildRoomGrid();enemies=[];floorItems=[];traps=[];floorShop={room:ri,stock:[]};inv=[];eqWeapon=eqShield=null;eqRings=[null,null];gold=5000;player.hp=player.maxhp=999;player.st=newStatus();ShopSystem.setup(0);const r=rooms[ri],cell=floorItems.slice().sort((a,b)=>Math.abs(a.x-r.cx)+Math.abs(a.y-r.cy)-Math.abs(b.x-r.cx)-Math.abs(b.y-r.cy))[0];player.x=cell.x;player.y=cell.y;player.face=[0,1];seen=Array.from({length:MH},()=>Array(MW).fill(true));snapVis();updateVis();fadeT=0;render();return {doors:floorShop.doors.length,keepers:ShopSystem.keepers().length,goods:floorItems.length};}'''
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for name,w,h in [('portrait',390,844),('landscape',844,390),('small',320,640)]:
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8000/fushigi-shops-v1/game-review.html');page.wait_for_function('window.ShopReview?.ready');assert page.evaluate('map[player.y][player.x]===FLOOR&&!ShopSystem.at(player.x,player.y)')
  for case in json.loads((P.parent/'tests/fixtures/shop-entrances-legacy.json').read_text()):
   n=case['expected'];data=page.evaluate(setup,case);assert data['doors']==data['keepers']==n,data;assert data['goods']!=n,data;page.wait_for_timeout(300);page.screenshot(path=str(P/f'entrances-{n}-{name}.png'))
   assert page.evaluate('''()=>{playerPickUp();for(let t=0;t<3;t++)ShopSystem.tick();return ShopSystem.debt()>0&&ShopSystem.keepers().length===floorShop.doors.length&&ShopSystem.keepers().every(k=>k.x===k.door.x&&k.y===k.door.y);}''')
   page.locator('[data-talk]').click();page.locator('[data-shop="pay"]').click();page.keyboard.press('Escape');assert page.evaluate('ShopSystem.debt()===0&&ShopSystem.keepers().every(k=>k.x===k.home.x&&k.y===k.home.y)')
  assert not errors,errors;results.append({'viewport':name,'entranceCases':[2,3],'independentOfGoods':True,'unpaidBlocksExits':True,'paidClearsExits':True,'errors':errors});page.close()
 b.close()
(P/'entrance-browser-validation.json').write_text(json.dumps(results,indent=2)+'\n');print('ALL OK: 2/3 real entrances, independent of stock, blockade/payment, three viewports')
