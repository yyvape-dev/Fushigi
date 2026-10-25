const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const base=process.env.FUSHIGI_TEST_URL||'http://127.0.0.1:8766/',checks=[];
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'index.html?floor=3&dungeon=third');await page.waitForFunction(()=>Object.keys(DungeonNPC.state.images).length===48);
  const assert=(v,name)=>{if(!v)throw Error(name);checks.push(name);};
  for(const kind of ['yursa','kamil','ialmas']){
   const result=await page.evaluate(kind=>{
    EventVfx.reset();closeBag();closeStairs();closeGameMenu();closeHist();closeCfg();DungeonNPC.reset();AllySystem.reset();ShopSystem.reset();CastleTown.close(false);
    scene='dungeon';dungeonId='third';floorNo=3;dead=false;turn=0;MW=20;MH=16;
    map=Array.from({length:MH},(_,y)=>Array.from({length:MW},(_,x)=>x&&y&&x<MW-1&&y<MH-1?FLOOR:WALL));rooms=[{x:1,y:1,w:18,h:14,cx:10,cy:8}];buildRoomGrid();
    enemies=[];traps=[];floorItems=[];inv=[];eqWeapon=eqShield=null;eqRings=[null,null];floorShop=null;player.x=player.vx=3;player.y=player.vy=3;player.hp=player.maxhp=100;player.st=newStatus();belly=100;
    vis=map.map(r=>r.map(()=>true));seen=vis.map(r=>r.slice());floorLight=true;fadeT=-1e9;
    const a=DungeonNPC.make(kind,10,8);a.face=[1,0];DungeonNPC.state.actors=[a];const old=Math.random;Math.random=()=>0;try{playerMove(0,0);}finally{Math.random=old;}
    const c=document.createElement('canvas');c.width=400;c.height=400;const ctx=c.getContext('2d');const draw=t=>{ctx.clearRect(0,0,400,400);DungeonNPC.draw(ctx,a,t,180-a.x*TS,260-a.y*tilePitchY());return c.toDataURL();};
    return {moved:a.x===11&&a.y===8&&turn===1,interpolating:a.vx===10,different:draw(a.walkStart)!==draw(a.walkStart+80)};
   },kind);
   assert(result.moved&&result.interpolating,kind+' moves once per world turn with interpolation');assert(result.different,kind+' alternates visible walking and idle artwork');
   await page.waitForTimeout(260);
   assert(await page.evaluate(()=>{const a=DungeonNPC.state.actors[0];return a.vx===a.x&&a.vy===a.y;}),kind+' finishes visual motion');
   await page.evaluate(()=>{const a=DungeonNPC.state.actors[0];player.x=player.vx=a.x-1;player.y=player.vy=a.y;player.face=[1,0];a.face=[1,0];updateVis();render();});
   await page.locator('#pick').click();assert(await page.evaluate(()=>DungeonNPC.state.actors[0].face.join()==='-1,0'&&!DungeonNPC.state.actors[0].walkEnd),kind+' faces the hero on real conversation click');
   await page.keyboard.press('Escape');
  }
  assert(!errors.length,'no JavaScript exceptions');fs.writeFileSync('fushigi-npcs-walk-v1/browser-validation.json',JSON.stringify({passed:true,checks},null,2)+'\n');
  console.log('ALL OK: '+checks.length+' real browser wandering/facing checks');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
