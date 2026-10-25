const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const results=[];const base=process.env.FUSHIGI_TEST_URL||'http://127.0.0.1:8766/';
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'index.html?floor=3&dungeon=third');await page.waitForFunction(()=>Object.keys(DungeonNPC.state.images).length===48);
  const setup=kind=>page.evaluate(kind=>{
   EventVfx.reset();closeBag();closeStairs();closeGameMenu();AllySystem.reset();ShopSystem.reset();DungeonNPC.reset();
   scene='dungeon';dungeonId='third';floorNo=3;dead=false;turn=0;MW=20;MH=16;floorShop=null;
   map=Array.from({length:MH},(_,y)=>Array.from({length:MW},(_,x)=>x>0&&y>0&&x<MW-1&&y<MH-1?FLOOR:WALL));rooms=[{x:1,y:1,w:18,h:14,cx:10,cy:8}];buildRoomGrid();
   enemies=[];floorItems=[];traps=[];inv=[];eqWeapon=eqShield=null;eqRings=[null,null];atkUp=0;belly=100;
   player.x=player.vx=8;player.y=player.vy=7;player.face=[1,0];player.hp=5;player.maxhp=40;player.st=newStatus();
   const a=DungeonNPC.make(kind,9,7);DungeonNPC.state.actors=[a];
   if(kind==='yursa'){inv=[mkItem('sword',0),mkItem('ironshield',0)];eqWeapon=inv[0];eqShield=inv[1];}
   if(kind==='kamil'){player.st.confuse=10;player.st.blind=10;}
   if(kind==='ialmas')inv=[mkItem(a.request)];fadeT=-1e9;floorLight=true;snapVis();updateVis();render();return a.kind;
  },kind);
  const assert=async(cond,name)=>{if(!cond)throw Error(name);results.push(name);};
  await setup('yursa');await page.locator('#pick').click();await page.locator('#npcNo').click();
  await assert(await page.evaluate(()=>!DungeonNPC.state.actors[0].used&&eqWeapon.plus===0&&turn===0),'decline leaves smith unused');
  await page.locator('#pick').click();await page.locator('#npcYes').click();
  await assert(await page.evaluate(()=>DungeonNPC.state.actors[0].used&&[1,3].includes(eqWeapon.plus)&&eqWeapon.plus===eqShield.plus),'smith strengthens both equipped pieces');
  await page.keyboard.press('Escape');await setup('kamil');await page.locator('#pick').click();
  await assert(await page.evaluate(()=>player.hp===40&&!player.st.confuse&&!player.st.blind&&inv.filter(i=>i.type==='bread_big').length===1),'healer cures and gives one large bread on conversation');
  await page.keyboard.press('Escape');await setup('ialmas');await page.locator('#pick').click();
  await assert(await page.locator('#npcContent').textContent().then(t=>t.includes('見返り')&&t.includes('交換するか')),'exchange reveals both sides');
  await page.locator('#npcYes').click();
  await assert(await page.evaluate(()=>DungeonNPC.state.actors[0].used&&inv.length===1&&inv[0]===DungeonNPC.state.actors[0].reward),'exchange delivers exact disclosed reward');
  await page.keyboard.press('Escape');
  for(const size of [{width:390,height:844},{width:844,height:390},{width:360,height:640}]){
   await page.setViewportSize(size);await setup('ialmas');await page.locator('#pick').click();
   const card=await page.locator('.npc-card').boundingBox();await assert(card.x>=0&&card.y>=0&&card.x+card.width<=size.width&&card.y+card.height<=size.height,'dialog fits '+size.width+'x'+size.height);
   await page.screenshot({path:'fushigi-npcs-v1/dialog-'+size.width+'x'+size.height+'.png'});await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
   await assert(await page.evaluate(()=>!DungeonNPC.state.open&&!DungeonNPC.state.actors[0].used&&turn===0),'keyboard decline pauses world '+size.width);
  }
  await page.setViewportSize({width:390,height:844});await page.goto(base+'fushigi-npcs-v1/review.html');
  for(const kind of ['yursa','kamil','ialmas']){await page.locator('[data-kind='+kind+']').click();await page.frameLocator('iframe').locator('#npcName').waitFor();}
  await assert(!errors.length,'no JavaScript exceptions: '+errors.join(', '));
  fs.writeFileSync('fushigi-npcs-v1/browser-validation.json',JSON.stringify({passed:true,checks:results},null,2)+'\n');console.log('ALL OK: '+results.length+' real Chromium NPC checks');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
