// Resolve the whole explosion before kill credit, evolution or fatal saves.
{
 let count=0;const ok=(v,m)=>{if(!v)throw Error(m);count++;},random=Math.random;
 function setup(kind='cannon'){
  EventVfx.reset();EventVfx.state.force=true;localStorage.removeItem(SAVE_KEY);RunSave.clear();boot();scene='dungeon';dungeonId='third';floorNo=24;newFloor();enemies=[];floorItems=[];traps=[];floorShop=null;AllySystem.reset();ShopSystem.reset();ShopSecurity.reset();
  for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++){map[y][x]=FLOOR;roomGrid[y][x]=0;}
  player.x=player.vx=10;player.y=player.vy=10;player.hp=player.maxhp=999;player.lv=1;player.exp=0;player.st=newStatus();inv=[];eqWeapon=eqShield=null;eqRings=[null,null];dead=false;turn=0;updateVis();return spawnEnemy(14,10,true,kind);
 }
 const impact=(x=10,y=10)=>({x,y,dx:-1,dy:0});
 try{
  Math.random=()=>.99;
  for(let tier=1;tier<=4;tier++){
   const e=setup(tier===1?'cannon':'cannon_'+tier),before=player.hp;
   const victims=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy){const v=spawnEnemy(10+dx,10+dy,true,'cannon');v.hp=v.maxhp=500;victims.push(v);}
   const outside=spawnEnemy(12,10,true,'slime');outside.hp=500;const r=MonsterCombat.fire(e,player,impact());
   ok(before-player.hp===tier*10+10,'fixed blast power tier '+tier);
   ok(victims.every(v=>v.hp===500-r.damage),'all eight neighboring cells damaged incl same species tier '+tier);
   ok(outside.hp===500,'no damage two cells away tier '+tier);ok(turn===0,'no extra turn from explosion');
  }
  {
   const e=setup();map[9][9]=map[10][11]=map[11][11]=WALL;map[9][11]=STAIRS;map[10][12]=WALL;CaveTerrain.cache.set('stale',{});const rev=visibilityRevision;
   const r=MonsterCombat.fire(e,player,impact());ok(r.walls.length===3,'three interior walls broken');ok(map[9][9]===FLOOR&&map[10][11]===FLOOR&&roomGrid[9][9]===-1,'destroyed walls become corridor floor');ok(map[9][11]===STAIRS&&map[10][12]===WALL,'stairs and out-of-blast walls preserved');ok(CaveTerrain.cache.size===0&&visibilityRevision>rev,'terrain cache and sight updated');ok(geomOK(10,10,1,0),'destroyed wall can be entered');
   MonsterCombat.fire(e,player,impact(1,1));ok(map[0].every(t=>t===WALL)&&map.every(row=>row[0]===WALL),'outer boundary stays closed');
  }
  {
   const e=setup();const v=spawnEnemy(12,10,true,'slime');v.hp=500;const ray=MonsterCombat.trace(e,-1,0,8);ok(ray.x===12,'first monster stops cannonball');ok(!MonsterCombat.plan(e,player),'no shot when first collision cannot splash target');const hp=player.hp;MonsterCombat.fire(e,player,ray);ok(player.hp===hp&&v.hp===480,'intercepting monster takes blast and shields distant player');
  }
  {
   const e=setup();map[10][11]=WALL;const ray=MonsterCombat.plan(e,player);ok(ray&&ray.x===11&&ray.y===10,'nearby wall is valid splash impact');MonsterCombat.fire(e,player,ray);ok(map[10][11]===FLOOR&&player.hp===979,'wall impact destroys wall and hits player');
   map[11][13]=WALL;ok(MonsterCombat.trace(e,-1,1,8).x===13,'diagonal corner collision hits blocking wall');
  }
  {
   const e=setup();player.y=11;map[10][10]=WALL;const ray=MonsterCombat.plan(e,player);ok(ray&&Math.max(Math.abs(ray.x-player.x),Math.abs(ray.y-player.y))===1,'off-axis target can be splashed from nearby wall');MonsterCombat.fire(e,player,ray);ok(player.hp===979,'off-axis splash damages player');
  }
  {
   const e=setup();enemyTurn();ok(player.hp===979&&e.st.cool===2,'game loop fires cannon');enemyTurn();ok(player.hp===979&&e.st.cool===1,'reload turn does not fire');enemyTurn();ok(player.hp===959&&e.st.cool===2,'next loaded turn fires exactly once');
  }
  {
   const e=setup(),victims=[spawnEnemy(10,9,true,'slime'),spawnEnemy(11,9,true,'cannon'),spawnEnemy(11,10,true,'goblin')];victims.forEach(v=>v.hp=1);e.hp=1;e.st.sleep=2;e.sum=true;e.gen=2;const exp=player.exp,r=MonsterCombat.fire(e,player,impact());
   ok(victims.every(v=>!enemies.includes(v)),'all dead monsters removed');ok(e.kind==='cannon_4'&&e.hp===eT(e).hp(24)&&e.maxhp===e.hp,'one evolution per casualty with full new-rank HP');ok(e.st.cool===2&&e.st.sleep===2&&e.sum&&e.gen===2,'reload/status/origin preserved through evolution');ok(player.hp===979&&r.damage===20,'all blast damage uses original rank');ok(player.exp===exp,'enemy kills do not award hero XP');ok(!MonsterCombat.evolve(e)&&e.kind==='cannon_4','highest rank capped');ok(EventVfx.state.events.filter(v=>v.kind==='enemy-evolve').length===3,'one visual for each real evolution');ok(fx.filter(f=>f.evolution&&f.x===e.x&&f.y===e.y).length===1,'multi-kill shows a single legible final-rank name');ok(!killEnemy(victims[0],false,e),'duplicate kill is ignored');
  }
  {
   const e=setup();e.x=e.vx=11;e.hp=1;const v=spawnEnemy(10,9,true,'slime');v.hp=1;MonsterCombat.fire(e,player,impact());ok(!enemies.includes(e)&&!enemies.includes(v),'self-blast removes shooter and victim');ok(e.kind==='cannon','a dead shooter cannot evolve or resurrect');
  }
  for(const family of Object.keys(MonsterRoster.names)){
   const e=setup(family);e.hp=1;const a=AllySystem.make(13,10);a.following=true;a.hp=1;AllySystem.state.actor=a;AllySystem.hurt(1,e);
   ok(e.kind===family+'_2'&&e.hp===eT(e).hp(24),'companion kill evolves family '+family);
  }
  {
   const e=setup('goblin');player.x=20;const a=AllySystem.make(13,10);a.following=true;a.hp=1;AllySystem.state.actor=a;Math.random=()=>.1;ok(AllySystem.enemyAction(e,eT(e)),'melee against companion occurs');ok(!AllySystem.state.actor&&e.kind==='goblin_2','actual companion melee death evolves attacker');Math.random=()=>.99;
  }
  {
   const e=setup();player.x=20;const a=AllySystem.make(10,10);a.following=true;a.hp=1;AllySystem.state.actor=a;ok(AllySystem.enemyAction(e,eT(e)),'cannon attacks closer companion');ok(!AllySystem.state.actor&&e.kind==='cannon_2','cannon companion kill evolves');ok(!AllySystem.enemyAction(e,eT(e)),'no repeated shot after companion death');
  }
  {
   const e=setup(),v=spawnEnemy(11,10,true,'thief');v.hp=1;v.loot=mkItem('bread');floorShop={keepers:[{x:10,y:9,hp:1,maxhp:500}],hostile:false};MonsterCombat.fire(e,player,impact());ok(!floorShop.hostile&&!ShopSystem.state.wanted,'monster damage to keeper does not blame hero');ok(floorShop.keepers[0].hp<=0&&e.kind==='cannon_3','keeper and monster each give one rank');ok(floorItems.some(f=>f.item.type==='bread'),'stolen goods dropped on collateral death');
  }
  {
   const e=setup(),v=spawnEnemy(11,10,true,'slime');const exp=player.exp;killEnemy(v,false);ok(player.exp>exp&&e.kind==='cannon','normal hero kill still grants XP and no monster evolution');
   const boss=spawnEnemy(15,10,true,'lord');ok(!MonsterCombat.evolve(boss)&&boss.kind==='lord','boss has no invented next rank');
  }
  {
   const e=setup(),v=spawnEnemy(11,10,true,'slime');v.hp=1;map[9][10]=WALL;MonsterCombat.fire(e,player,impact());ok(RunSave.save(),'save after explosion');enemies=[];map[9][10]=WALL;ok(RunSave.restore()===true,'restore explosion save');const restored=enemies.find(e=>e.kind==='cannon_2');ok(restored&&restored.hp===restored.maxhp&&restored.st.cool===2&&map[9][10]===FLOOR,'evolution, HP, reload and wall destruction persist');const state=JSON.stringify([map,enemies.map(e=>[e.kind,e.hp]),player.hp]);EventVfx.flush();ok(state===JSON.stringify([map,enemies.map(e=>[e.kind,e.hp]),player.hp]),'flushing visuals cannot replay damage or evolution');
  }
  {
   const e=setup();player.st.invinc=2;MonsterCombat.fire(e,player,impact());ok(player.hp===999,'invulnerability still protects hero');player.st.invinc=0;player.hp=1;const v=spawnEnemy(11,10,true,'slime');v.hp=1;map[9][10]=WALL;const r=MonsterCombat.fire(e,player,impact());ok(r.dead&&dead&&e.kind==='cannon_2'&&!enemies.includes(v)&&map[9][10]===FLOOR,'entire blast resolves before fatal-player handling');ok(JSON.parse(localStorage.getItem(RunSave.KEY)).dead,'fatal blast persists as death');
  }
 }finally{Math.random=random;EventVfx.reset();}
 console.log('ALL OK: '+count+' cannon/evolution checks: 3x3, fixed power, collisions, walls, all families, multi-kill, self-blast, allies, XP, drops, persistence and fatal save');
}
