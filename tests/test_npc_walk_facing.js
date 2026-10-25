// Walking follows world turns; conversations face the hero without shifting fixed workers.
{
 let count=0;const assert=(v,m)=>{count++;if(!v)throw Error(m);};
 const withRoll=(value,f)=>{const r=Math.random;Math.random=()=>value;try{return f();}finally{Math.random=r;}};
 function setup(kind='yursa'){
  EventVfx.reset();closeBag();closeStairs();closeGameMenu();closeHist();closeCfg();AllySystem.reset();ShopSystem.reset();DungeonNPC.reset();CastleTown.close(false);
  scene='dungeon';dungeonId='third';floorNo=3;dead=false;turn=0;MW=20;MH=16;floorShop=null;
  map=Array.from({length:MH},(_,y)=>Array.from({length:MW},(_,x)=>x&&y&&x<MW-1&&y<MH-1?FLOOR:WALL));rooms=[{x:1,y:1,w:18,h:14,cx:10,cy:8}];buildRoomGrid();
  enemies=[];floorItems=[];traps=[];inv=[];eqWeapon=eqShield=null;eqRings=[null,null];player.x=player.vx=3;player.y=player.vy=3;player.hp=player.maxhp=100;player.st=newStatus();belly=100;
  vis=Array.from({length:MH},()=>Array(MW).fill(true));seen=vis.map(r=>r.slice());
  const a=DungeonNPC.make(kind,10,8);a.face=[1,0];DungeonNPC.state.actors=[a];return a;
 }
 for(const kind of Object.keys(DungeonNPC.roster)){
  let a=setup(kind);const request=a.request,reward=a.reward;withRoll(0,()=>playerMove(0,0));
  assert(a.x===11&&a.y===8&&turn===1,kind+' takes one step on one world turn');
  assert(a.face.join()==='1,0'&&a.vx===10&&a.walkEnd>a.walkStart,kind+' records walk direction and animation');
  assert(a.request===request&&a.reward===reward&&!a.used,kind+' movement preserves encounter/offer');
  DungeonNPC.animate(40);assert(a.vx>10&&a.vx<11&&DungeonNPC.animating(now()),kind+' interpolates instead of teleporting');DungeonNPC.animate(200);assert(a.vx===11&&a.vy===8,kind+' arrives at tile');
  player.x=10;player.y=8;withRoll(0,()=>DungeonNPC.tick());assert(a.x===11&&a.y===8,kind+' pauses beside player');
  a.face=[1,0];a.walkEnd=now()+200;assert(DungeonNPC.talk(a)&&a.face.join()==='-1,0'&&!a.walkEnd,kind+' conversation stops walking and turns to hero');
  const x=a.x,y=a.y;withRoll(0,()=>DungeonNPC.tick());assert(a.x===x&&a.y===y,kind+' dialog pauses movement');DungeonNPC.hide();
  player.x=3;player.y=3;a.used=true;withRoll(0,()=>DungeonNPC.tick());assert(a.x!==x||a.y!==y,kind+' still wanders after service is used');
 }
 let a=setup();bagOpen=true;withRoll(0,()=>DungeonNPC.tick());assert(a.x===10,'inventory pauses NPC movement');bagOpen=false;cfgOpen=true;DungeonNPC.tick();assert(a.x===10,'settings pause movement');cfgOpen=false;dead=true;DungeonNPC.tick();assert(a.x===10,'death pauses movement');dead=false;
 a=setup();assert(DungeonNPC.walkFree(11,8),'open room can be walked');map[8][11]=STAIRS;assert(!DungeonNPC.walkFree(11,8),'avoids stairs');map[8][11]=FLOOR;
 traps=[{x:11,y:8,kind:'mine'}];assert(!DungeonNPC.walkFree(11,8),'avoids traps');traps=[];floorItems=[{x:11,y:8,item:mkItem('bread')}];assert(!DungeonNPC.walkFree(11,8),'avoids items');floorItems=[];
 enemies=[{x:11,y:8,hp:5}];assert(!DungeonNPC.walkFree(11,8),'avoids enemies');enemies=[];
 AllySystem.state.actor=AllySystem.make(11,8);assert(!DungeonNPC.walkFree(11,8),'avoids companions');AllySystem.reset();DungeonNPC.state.actors.push(DungeonNPC.make('kamil',11,8));assert(!DungeonNPC.walkFree(11,8),'avoids other travelers');DungeonNPC.state.actors.length=1;
 roomGrid[8][11]=-1;assert(!DungeonNPC.walkFree(11,8),'avoids corridors');roomGrid[8][11]=0;rooms[0].role='shop';assert(!DungeonNPC.walkFree(11,8),'avoids shops');rooms[0].role='normal';rooms[0].mh=true;assert(!DungeonNPC.walkFree(11,8),'avoids monster rooms');rooms[0].mh=false;
 map[7][11]=map[9][11]=WALL;assert(!DungeonNPC.walkFree(11,8),'avoids one-tile choke point');
 a=setup('ialmas');a.used=true;withRoll(0,()=>DungeonNPC.tick());const pos=[a.x,a.y],offer=[a.request,a.reward.id];assert(RunSave.save(),'save while walking');DungeonNPC.reset();assert(RunSave.restore()===true,'walking save restores');a=DungeonNPC.state.actors[0];assert(a.x===pos[0]&&a.y===pos[1]&&a.vx===a.x&&a.vy===a.y&&!a.walkEnd&&a.used&&a.request===offer[0]&&a.reward.id===offer[1],'restore keeps position/offer/service and clears transient motion');
 // Talking faces every companion in all eight directions and ends prior attack poses.
 for(const kind of ['yuzunamiki','avenius','sherininya'])for(const [dx,dy]of DIRS8){
  setup();DungeonNPC.reset();const ally=AllySystem.make(player.x-dx,player.y-dy,kind);ally.face=[-dx,-dy];ally.attackStart=now();ally.walkEnd=now()+200;AllySystem.state.actor=ally;
  AllySystem.talk();assert(ally.face.join()===[dx,dy].join()&&!ally.walkEnd&&ally.attackStart===null,kind+' faces '+dx+','+dy+' on talk');AllySystem.hide();
 }
 // Town service menus and contact conversations must turn their actual workers.
 toTown(false);CastleTown.leaveInn();CastleTown.state.waking=false;
 for(const id of ['smith','depositor','market']){
  CastleTown.close(false);closeWh();const n=CastleTown.state.npcs.find(n=>n.id===id),service=CastleTown.facilities.find(f=>f.id===({depositor:'deposit'}[id]||id));
  const visual=[n.vx,n.vy];player.x=service.x;player.y=service.y;n.face=[0,-1];doCtx();
  assert(n.face.join()===[Math.sign(player.x-n.x),Math.sign(player.y-n.y)].join(),'town '+id+' faces player on service interaction');
  assert(n.vx===visual[0]&&n.vy===visual[1],'town '+id+' keeps counter registration');
 }
 CastleTown.close(false);closeWh();const resident=CastleTown.state.npcs.find(n=>!n.fixed&&!n.mercenary);player.x=resident.x-1;player.y=resident.y;resident.face=[1,0];CastleTown.beforeMove(resident.x,resident.y);assert(resident.face.join()==='-1,0','resident faces player on contact');CastleTown.close(false);
 const merc=CastleTown.state.npcs.find(n=>n.mercenary);player.x=merc.x-1;player.y=merc.y;merc.face=[1,0];CastleTown.beforeMove(merc.x,merc.y);assert(merc.face.join()==='-1,0','town companion faces player');CastleTown.close(false);
 CastleTown.enterInn();const inn=CastleTown.state.npcs[0],offset=[inn.vx,inn.vy];player.x=9;player.y=16;inn.face=[0,-1];CastleTown.show('innkeeper');assert(inn.face.join()==='1,1'&&inn.vx===offset[0]&&inn.vy===offset[1],'innkeeper faces player without losing desk offset');CastleTown.close(false);
 // Floor shop conversation turns the nearest speaker, not every attendant.
 setup();DungeonNPC.reset();map=Array.from({length:MH},()=>Array(MW).fill(WALL));rooms=[{x:2,y:3,w:7,h:7,cx:5,cy:6,role:'shop'}];for(let y=3;y<10;y++)for(let x=2;x<9;x++)map[y][x]=FLOOR;for(let x=9;x<15;x++)map[6][x]=FLOOR;buildRoomGrid();floorShop={room:0,x:5,y:6,stock:[]};ShopSystem.setup(0);const keeper=ShopSystem.keepers()[0];if(!keeper)throw Error('Missing shopkeeper fixture');player.x=keeper.x-1;player.y=keeper.y;keeper.face=[1,0];ShopSystem.talk();assert(keeper.face.join()==='-1,0'&&!keeper.walkEnd,'dungeon shopkeeper faces player immediately');ShopSystem.close();
 RunSave.clear();console.log('ALL OK: '+count+' walking and conversation facing assertions');
}
