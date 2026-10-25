// Dungeon traveler services, atomic exchange, occupancy and save compatibility.
{
 let checks=0;const assert=(v,m)=>{checks++;if(!v)throw Error(m);};
 const roll=(value,fn)=>{const old=Math.random;Math.random=()=>value;try{return fn();}finally{Math.random=old;}};
 function reset(kind='yursa'){
  EventVfx.reset();closeBag();closeStairs();closeGameMenu();AllySystem.reset();ShopSystem.reset();DungeonNPC.reset();
  scene='dungeon';dungeonId='first';floorNo=3;dead=false;turn=0;MW=20;MH=16;floorShop=null;
  map=Array.from({length:MH},(_,y)=>Array.from({length:MW},(_,x)=>x>0&&y>0&&x<MW-1&&y<MH-1?FLOOR:WALL));
  rooms=[{x:1,y:1,w:5,h:5,cx:3,cy:3,role:'start'},{x:7,y:2,w:10,h:10,cx:12,cy:7}];buildRoomGrid();
  enemies=[];floorItems=[];traps=[];inv=[];eqWeapon=eqShield=null;eqRings=[null,null];atkUp=0;belly=100;
  player.x=player.vx=5;player.y=player.vy=6;player.face=[1,0];player.hp=12;player.maxhp=40;player.st=newStatus();
  vis=Array.from({length:MH},()=>Array(MW).fill(true));seen=vis.map(r=>r.slice());
  const a=DungeonNPC.make(kind,6,6);DungeonNPC.state.actors=[a];return a;
 }
 let a=reset();let weapon=mkItem('sword',1),shield=mkItem('ironshield',2),spare=mkItem('katana',0);inv=[weapon,shield,spare];eqWeapon=weapon;eqShield=shield;
 assert(DungeonNPC.nearby()===a&&friendlyAt(6,6)===a&&ctxInfo().label==='話す','NPC is adjacent, occupied and contextual');
 playerMove(1,0);assert(player.x===5&&DungeonNPC.state.open&&uiBlocked()&&turn===0,'bumping NPC opens conversation without moving/turn');
 DungeonNPC.key('Escape');assert(!a.used&&weapon.plus===1&&shield.plus===2,'declining preserves service/equipment');
 DungeonNPC.talk();roll(.3,()=>DungeonNPC.perform());assert(weapon.plus===2&&shield.plus===3&&spare.plus===0,'70% normal +1 affects equipped weapon AND shield only');
 assert(a.used&&turn===0,'successful conversation is one-off and takes no world turn');
 DungeonNPC.perform();assert(weapon.plus===2&&shield.plus===3,'double confirmation cannot repeat service');
 DungeonNPC.hide();DungeonNPC.talk();assert(a.used&&weapon.plus===2,'retalking does not strengthen again');
 a=reset();weapon=mkItem('sword',0);shield=mkItem('ironshield',0);inv=[weapon,shield];eqWeapon=weapon;eqShield=shield;
 DungeonNPC.talk();roll(.299999,()=>DungeonNPC.perform());assert(weapon.plus===3&&shield.plus===3,'30% great success gives +3 to both');
 a=reset();DungeonNPC.talk();assert(!DungeonNPC.perform()&&!a.used,'no equipped gear preserves chance');
 DungeonNPC.hide();weapon=mkItem('sword',98);inv=[weapon];eqWeapon=weapon;DungeonNPC.talk();roll(0,()=>DungeonNPC.perform());assert(weapon.plus===99,'equipment cap +99');
 a=reset();weapon=mkItem('sword',0);weapon.shopLot=1;ShopSystem.state.lots.set(1,{item:weapon,price:100,claimed:true,used:false});inv=[weapon];eqWeapon=weapon;DungeonNPC.talk();assert(!DungeonNPC.perform()&&!a.used&&weapon.plus===0,'unpaid equipment cannot be improved for free');
 a=reset('kamil');for(const k of ST_BAD)player.st[k]=10;player.st.haste=10;player.st.handbound=1;player.boundPot={};atkUp=-2;
 DungeonNPC.talk();assert(player.hp===40&&ST_BAD.every(k=>!player.st[k])&&atkUp===0&&!player.st.handbound&&!player.boundPot&&player.st.haste===10,'healer fully restores HP/adverse conditions, keeps beneficial status');
 assert(inv.length===1&&inv[0].type==='bread_big'&&a.used,'healer gives exactly one large bread');
 DungeonNPC.hide();player.hp=1;DungeonNPC.talk();assert(inv.length===1&&player.hp===1,'repeat healer conversation gives no healing or extra bread');
 a=reset('kamil');inv=Array.from({length:MAXBAG},()=>mkItem('weed'));DungeonNPC.talk();assert(inv.length===MAXBAG&&floorItems.some(f=>f.item.type==='bread_big')&&a.used&&player.hp===40,'full bag receives healer bread safely on floor');
 a=reset('kamil');inv=Array.from({length:MAXBAG},()=>mkItem('weed'));for(let y=3;y<=9;y++)for(let x=2;x<=8;x++)floorItems.push({x,y,item:mkItem('weed')});DungeonNPC.talk();assert(!a.used&&player.hp===12,'no gift destination defers the complete service');
 a=reset('ialmas');a.request='bread';a.reward=mkItem('fusepot',4);const offer=a.reward;
 DungeonNPC.talk();assert(document.getElementById('npcContent').textContent.includes('パン')&&document.getElementById('npcContent').textContent.includes('合成の壺'),'exchange reveals demand and rare reward before decision');
 assert(!DungeonNPC.perform()&&!a.used&&inv.length===0,'missing demand consumes nothing');
 DungeonNPC.hide();inv=[mkItem('bread')];DungeonNPC.talk();DungeonNPC.key('Escape');assert(inv[0].type==='bread'&&!a.used&&a.reward===offer,'decline preserves inventory and fixed offer');
 DungeonNPC.talk();assert(DungeonNPC.perform()&&a.used&&inv.length===1&&inv[0]===offer&&isKnown('fusepot'),'exchange atomically replaces demand with disclosed rare reward');
 DungeonNPC.perform();assert(inv.length===1,'double exchange confirmation never duplicates reward');
 a=reset('ialmas');a.request='bread';a.reward=mkItem('reviveherb');inv=[mkItem('bread'),...Array.from({length:MAXBAG-1},()=>mkItem('weed'))];DungeonNPC.talk();assert(DungeonNPC.perform()&&inv.length===MAXBAG&&inv.includes(a.reward)&&!inv.some(i=>i.type==='bread'),'full bag exchange uses the freed request slot');
 a=reset('ialmas');a.request='sword';weapon=mkItem('sword',1);weapon.cursed=true;inv=[weapon];eqWeapon=weapon;DungeonNPC.talk();assert(!DungeonNPC.perform()&&!a.used&&inv[0]===weapon&&eqWeapon===weapon,'cannot exchange cursed equipped item');
 a=reset('ialmas');a.request='sword';weapon=mkItem('sword',1);spare=mkItem('sword',0);inv=[weapon,spare];eqWeapon=weapon;DungeonNPC.talk();DungeonNPC.perform();assert(eqWeapon===weapon&&inv.includes(weapon)&&!inv.includes(spare),'exchange chooses unequipped matching item first');
 a=reset('ialmas');a.request='sword';weapon=mkItem('sword',1);inv=[weapon];eqWeapon=weapon;DungeonNPC.talk();assert(document.getElementById('npcContent').textContent.includes('装備中'),'equipped demand is disclosed');DungeonNPC.perform();assert(!eqWeapon&&!inv.includes(weapon),'accepted equipped demand safely unequips');
 a=reset('ialmas');a.request='bread';const pot=mkItem('savepot',3),food=mkItem('bread');pot.pot=[food];inv=[pot];DungeonNPC.talk();DungeonNPC.perform();assert(!pot.pot.length&&PotSystem.free(pot)===3&&inv.includes(a.reward),'exchange can take a demand from storage and restore capacity');
 a=reset('ialmas');a.request='bread';const unpaid=mkItem('bread');unpaid.shopLot=1;ShopSystem.state.lots.set(1,{item:unpaid,price:100,claimed:true,used:false});inv=[unpaid];DungeonNPC.talk();assert(!DungeonNPC.perform()&&!a.used&&inv[0]===unpaid,'unpaid request cannot be exchanged');
 a=reset('ialmas');const demand=a.request,rewardType=a.reward.type,rewardId=a.reward.id;DungeonNPC.talk();DungeonNPC.hide();assert(RunSave.save(),'encounter state saves');DungeonNPC.reset();assert(RunSave.restore()===true,'encounter save restores');a=DungeonNPC.state.actors[0];assert(a.request===demand&&a.reward.type===rewardType&&a.reward.id===rewardId&&!a.used&&!DungeonNPC.state.open,'reload preserves exact offer without rerolling or open dialog');
 inv=[mkItem(a.request)];DungeonNPC.talk();DungeonNPC.perform();DungeonNPC.hide();assert(RunSave.save(),'completed service saves');DungeonNPC.reset();inv=[];RunSave.restore();a=DungeonNPC.state.actors[0];assert(a.used&&inv.some(i=>i===a.reward),'reward identity and consumed encounter survive reload');
 const raw=JSON.parse(localStorage.getItem(RunSave.KEY)),decoded=RunSave.decode(raw.state);delete decoded.npcs;raw.state=RunSave.encode(decoded);localStorage.setItem(RunSave.KEY,JSON.stringify(raw));RunSave.restore();assert(DungeonNPC.state.actors.length===0,'old saves without NPC field restore cleanly');
 a=reset();player.x=2;player.y=2;assert(!DungeonNPC.talk(a)&&!DungeonNPC.state.open,'cannot talk to distant NPC');player.x=5;player.y=5;a.x=6;a.y=6;map[5][6]=WALL;assert(!DungeonNPC.nearby()&&!DungeonNPC.talk(a),'cannot talk through a diagonal wall corner');
 a=reset();assert(!runSafe(1,0),'dash does not run into NPC');assert(!freeNear(50).some(([x,y])=>x===a.x&&y===a.y),'summoning cells exclude NPC');
 assert(dropAt(a.x,a.y,mkItem('bread'))&&!floorItems.some(f=>f.x===a.x&&f.y===a.y),'dropped loot never becomes inaccessible under stationary NPC');
 const visitor=DungeonNPC.state.actors[0];for(let i=0;i<30;i++){warpPlayer();assert(player.x!==visitor.x||player.y!==visitor.y,'warp never lands on NPC');}
 a=reset();floorNo=1;roll(0,()=>DungeonNPC.newFloor());assert(!DungeonNPC.state.actors.length,'no encounter on first floor');floorNo=3;
 roll(.24,()=>DungeonNPC.newFloor());assert(!DungeonNPC.state.actors.length,'encounter chance boundary skips');
 roll(0,()=>DungeonNPC.newFloor());a=DungeonNPC.state.actors[0];assert(a&&a.kind==='yursa'&&map[a.y][a.x]===FLOOR&&!trapAt(a.x,a.y)&&!itemAt(a.x,a.y)&&!enemyAt(a.x,a.y),'random encounter uses safe room cell');
 assert([[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>map[a.y+dy][a.x+dx]===FLOOR),'encounter never occupies choke point');
 for(let i=0;i<30;i++){const npc=DungeonNPC.make('ialmas',6,6);assert(!!ITEMS[npc.request]&&DungeonNPC.rewards.includes(npc.reward.type)&&npc.request!==npc.reward.type,'exchange catalog always valid and reward rare');}
 DungeonNPC.talk(a);toTown(false);assert(!DungeonNPC.state.open&&!DungeonNPC.state.actors.length,'returning to town clears encounter and dialog');
 RunSave.clear();console.log('ALL OK: '+checks+' dungeon NPC assertions');
}
