{
 let count=0;const check=(v,m)=>{if(!v)throw Error(m);count++;};
 const originalRender=render,originalRandom=Math.random;render=()=>{};
 function fixture(type='potion',plus){
  closeGameMenu();closeBag();holdStop();dashBlocked=false;ShopSystem.reset();AllySystem.reset();scene='dungeon';dead=false;bagOpen=whOpen=stairsOpen=menuOpen=cfgOpen=histOpen=false;
  DungeonNPC.reset();MW=20;MH=16;map=Array.from({length:MH},()=>Array(MW).fill(WALL));rooms=[{x:2,y:3,w:10,h:9,cx:7,cy:7,role:'shop'}];
  for(let y=3;y<12;y++)for(let x=2;x<12;x++)map[y][x]=FLOOR;for(let x=12;x<18;x++)map[7][x]=FLOOR;buildRoomGrid();
  floorNo=4;floorItems=[];enemies=[];traps=[];inv=[];eqWeapon=eqShield=null;eqRings=[null,null];gold=10000;turn=1;
  player.x=player.vx=4;player.y=player.vy=7;player.hp=10;player.maxhp=100;player.st=newStatus();player.face=[1,0];player.lv=1;belly=80;
  seen=map.map(r=>r.map(()=>true));vis=map.map(r=>r.map(()=>true));floorShop={room:0,stock:[]};ShopSystem.setup(0);
  const f=floorItems.find(f=>f.item.type===type)||floorItems[0];f.item.type=type;if(plus!==undefined)f.item.plus=plus;
  floorItems=[f];f.x=5;f.y=7;autoPick=true;return f;
 }
 try{
  Math.random=()=>.1;
  let f=fixture(),price=ShopSystem.lot(f.item).price,t=turn;playerMove(1,0);
  check(player.x===5&&turn===t+1,'entering stock spends exactly one movement turn');
  check(menuOpen&&groundMenuItem===f&&inv.length===0&&floorItems.includes(f),'stock stays on floor even with auto-pick enabled');
  check(ShopSystem.debt()===0&&gold===10000,'looking at stock does not claim it or charge money');
  check($('menuInfo').innerHTML.includes('価格 '+price+'G')&&$('menuInfo').innerHTML.includes('拾う')&&$('menuInfo').innerHTML.includes('飲む'),'ground panel shows locked price and item-specific commands');
  t=turn;playerMove(1,0);check(player.x===5&&turn===t,'ground choices pause movement and world turns');
  groundAction('cancel');check(!menuOpen&&turn===t&&ShopSystem.debt()===0,'leave stock alone for zero turns and no debt');
  doCtx();check(menuOpen&&groundMenuItem===f&&turn===t,'foot context reopens commands without picking up');
  uiBack();check(!menuOpen&&turn===t,'back from direct ground menu returns to field');
  openGroundMenu();groundAction('pickup');check(inv.includes(f.item)&&!floorItems.includes(f)&&turn===t+1&&ShopSystem.debt()===price,'explicit pickup claims once and spends one turn');
  check(gold===10000,'explicit pickup leaves payment for the shopkeeper');
  ShopSystem.pay();check(gold===10000-price&&ShopSystem.debt()===0,'keeper settles the explicit pickup normally');ShopSystem.close();
  f=fixture();playerMove(1,0);price=ShopSystem.lot(f.item).price;inv=Array.from({length:MAXBAG},()=>mkItem('herb'));const bag=inv.slice();t=turn;const hp=player.hp;
  groundAction('use');check(player.hp>hp&&!floorItems.includes(f)&&turn===t+1,'use directly from floor heals and consumes one turn');
  check(inv.length===MAXBAG&&inv.every((it,i)=>it===bag[i]),'floor use works with a full bag without removing another item');
  check(ShopSystem.debt()===price&&gold===10000,'floor use adds the locked price to unpaid bill');
  f=fixture();player.hp=player.maxhp;playerMove(1,0);t=turn;groundAction('use');
  check(menuOpen&&floorItems.includes(f)&&turn===t&&ShopSystem.debt()===0,'failed use keeps stock, zero debt, zero turn and choices');
  check(!ShopSystem.lot(f.item).used&&!ShopSystem.lot(f.item).claimed,'failed use rolls back both ledger flags');
  f=fixture();playerMove(1,0);inv=Array.from({length:MAXBAG},()=>mkItem('herb'));t=turn;groundAction('pickup');
  check(menuOpen&&floorItems.includes(f)&&ShopSystem.debt()===0&&turn===t,'full-bag pickup fails without debt or turn');
  f=fixture('firestaff',3);playerMove(1,0);t=turn;price=ShopSystem.lot(f.item).price;groundAction('use');
  check(floorItems.includes(f)&&f.item.plus===2&&inv.length===0&&turn===t+1,'floor staff spends a charge while remaining on floor');
  check(ShopSystem.debt()===price,'staff use is billed even while stock stays on floor');
  f=fixture('firestaff',0);playerMove(1,0);t=turn;groundAction('use');check(floorItems.includes(f)&&f.item.plus===0&&ShopSystem.debt()===0&&turn===t+1,'empty floor staff spends a turn without charging for a nonexistent effect');
  f=fixture('potion');playerMove(1,0);player.st.mute=5;f.item.type='herb';t=turn;groundAction('use');
  check(menuOpen&&floorItems.includes(f)&&ShopSystem.debt()===0&&turn===t,'muted floor herb is not consumed or charged');
  f=fixture('sword',0);playerMove(1,0);price=ShopSystem.lot(f.item).price;t=turn;groundAction('use');
  check(eqWeapon===f.item&&inv.includes(f.item)&&!floorItems.includes(f)&&turn===t+1&&ShopSystem.debt()===price,'floor equip picks up and equips in one turn');
  f=fixture('sword',0);playerMove(1,0);inv=Array.from({length:MAXBAG},()=>mkItem('herb'));t=turn;groundAction('use');
  check(!eqWeapon&&floorItems.includes(f)&&turn===t&&ShopSystem.debt()===0,'full-bag floor equip leaves stock and bill unchanged');
  f=fixture('arrow',5);playerMove(1,0);const originalBill=ShopSystem.lot(f.item).price;
  const enemy={kind:'skeleton',x:6,y:7,vx:6,vy:7,hp:1000,maxhp:1000,aware:true,st:newStatus()};enemies=[enemy];t=turn;groundAction('use');
  check(f.item.plus===4&&floorItems.includes(f)&&inv.length===0&&turn===t+1,'floor arrows throw one unit without entering the bag');
  check(ShopSystem.debt()>0&&ShopSystem.debt()<originalBill,'only consumed arrow price is billed');
  f=fixture();playerMove(1,0);player.face=[1,0];groundAction('throw');check(floorShop.hostile&&ShopSystem.state.wanted,'throwing stock directly from floor out of store triggers theft');
  f=fixture();playerMove(1,0);player.face=[-1,0];t=turn;groundAction('throw');check(!floorShop.hostile&&ShopSystem.debt()===0&&floorItems.some(it=>it.item===f.item)&&turn===t+1,'stock thrown to another shop floor tile remains returnable without debt');
  f=fixture();playerMove(1,0);floorItems=[];t=turn;groundAction('pickup');check(inv.length===0&&turn===t&&ShopSystem.debt()===0,'stale ground action cannot pick or charge a removed item');
  f=fixture();playerMove(1,0);groundMenuKey('ArrowDown');check(groundMenuIndex===1,'keyboard moves to use command');t=turn;groundMenuKey('Enter');check(!floorItems.includes(f)&&turn===t+1,'keyboard confirm executes the selected command');
  f=fixture();playerMove(1,0);closeGameMenu();openGameMenu();showMenuInfo('ground');uiBack();check(menuOpen&&$('menuInfo').hidden,'ground page opened from main menu returns to main menu');
  f=fixture();autoPick=false;playerMove(1,0);check(menuOpen&&floorItems.includes(f)&&ShopSystem.debt()===0,'auto-pick OFF also opens stock choices without taking it');
  f=fixture();t=turn;controlsMove(1,0,'dash');check(menuOpen&&!runActive&&floorItems.includes(f)&&turn===t+1&&ShopSystem.debt()===0,'dash stops on shop stock and opens the same choices without pickup');
  toTown(false);check(!menuOpen&&!groundMenuItem,'returning to town clears paused ground choices');
  f=fixture();ShopSystem.state.lots.delete(f.item.shopLot);delete f.item.shopLot;autoPick=false;playerMove(1,0);check(!menuOpen,'ordinary floor items do not automatically pause the field');doCtx();t=turn;groundAction('use');check(!floorItems.includes(f)&&ShopSystem.debt()===0&&turn===t+1,'owned floor item can be used from context without shop debt');
  console.log('ALL OK: '+count+' shop ground checks: entry, locked price, cancel, pickup, floor use, full bag, failures, staff, equip, arrows, stale actions and keyboard');
 }finally{closeGameMenu();ShopSystem.reset();AllySystem.reset();render=originalRender;Math.random=originalRandom;autoPick=false;}
}
