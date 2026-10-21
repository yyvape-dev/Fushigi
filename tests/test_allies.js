{
 const verify=(v,m)=>{if(!v)throw Error(m);count++;};let count=0;const originalRender=render,originalRandom=Math.random;render=()=>{};
 function setup(){AllySystem.reset();scene='dungeon';dead=false;bagOpen=whOpen=cfgOpen=histOpen=stairsOpen=menuOpen=false;MW=26;MH=20;floorNo=3;turn=1;hasteFlip=false;map=Array.from({length:MH},(_,y)=>Array.from({length:MW},(_,x)=>!x||!y||x===MW-1||y===MH-1?WALL:FLOOR));rooms=[{x:1,y:1,w:24,h:18,cx:12,cy:10},{x:2,y:2,w:4,h:4,cx:4,cy:4}];roomGrid=map.map(row=>row.map(()=>0));seen=map.map(row=>row.map(()=>true));vis=map.map(row=>row.map(()=>true));player.x=player.vx=10;player.y=player.vy=10;player.hp=player.maxhp=200;player.lv=1;player.exp=0;player.face=[-1,0];player.st=newStatus();enemies=[];floorItems=[];traps=[];inv=[];eqWeapon=eqShield=null;eqRings=[null,null];atkUp=0;belly=80;const a=AllySystem.make(9,10);a.following=true;a.cooldown=999;AllySystem.state.actor=a;AllySystem.state.used=true;return a;}
 function enemy(x,y,hp=1000,kind='skeleton'){const e={kind,x,y,vx:x,vy:y,hp,maxhp:hp,aware:true,lost:0,st:{}};enemies.push(e);return e;}
 try{
  Math.random=()=>.1;
  let a=setup(),s=AllySystem.stats(a);eqWeapon=mkItem('sword',7);const higher=AllySystem.stats(a).attack;eqWeapon.plus=0;verify(higher-AllySystem.stats(a).attack===7,'current hero weapon strength is inherited');eqShield=mkItem('woodshield',6);const defense=AllySystem.stats(a).defense;eqShield.plus=1;verify(defense-AllySystem.stats(a).defense===5,'current hero shield strength is inherited');a.lv=4;verify(AllySystem.stats(a).attack>higher-7&&AllySystem.stats(a).defense>=1,'own level adds unique stat growth');verify(a.kind==='yuzunamiki'&&!a.eqWeapon&&!a.eqShield,'fixed equipment is not an inventory');
  a=setup();map[10][8]=WALL;let e=enemy(7,10),hp=e.hp;AllySystem.tick();verify(e.hp<hp&&a.x===9,'two-tile kunai crosses wall without moving');
  a=setup();e=enemy(8,10);hp=e.hp;AllySystem.tick();verify(e.hp<hp,'one-tile attack works');
  a=setup();e=enemy(6,10);hp=e.hp;AllySystem.tick();verify(e.hp===hp,'three tiles are out of kunai range');
  a=setup();e=enemy(7,9);hp=e.hp;AllySystem.tick();verify(e.hp===hp,'off-axis enemy is not hit');
  a=setup();map[9][8]=WALL;e=enemy(7,8);hp=e.hp;AllySystem.tick();verify(e.hp<hp,'diagonal two-tile attack crosses obstruction');
  a=setup();const farther=enemy(7,10),closer=enemy(8,10);AllySystem.tick();verify(farther.hp===1000&&closer.hp<1000,'nearest target is prioritized');
  a=setup();a.st.sleep=2;e=enemy(8,10);AllySystem.tick();verify(e.hp===1000&&a.st.sleep===1,'sleep skips ally actions');
  a=setup();a.st.sleep=2;a.boost=4;AllySystem.tick();verify(a.boost===3,'foxfire duration also counts sleeping turns');
  a=setup();a.poison=4;atkUp=-10;verify(AllySystem.stats(a).attack>=1,'weakened attack never becomes negative');
  a=setup();a.cooldown=0;e=enemy(7,10);Math.random=()=>0;AllySystem.tick();const damage=1000-e.hp;verify(a.boost===3&&a.cooldown===12&&damage>0,'foxfire activates in battle, counts first turn');verify(player.st.haste===0&&player.x===10,'foxfire does not haste or move hero');
  for(let n=0;n<3;n++)AllySystem.tick();verify(a.boost===0&&1000-e.hp===damage*4,'exactly four turns of double actions');hp=e.hp;AllySystem.tick();verify(hp-e.hp===damage/2,'normal single action resumes during cooldown');
  a=setup();a.cooldown=0;AllySystem.tick();verify(a.boost===0,'no random haste outside battle');
  a=setup();e=enemy(7,10);player.st.haste=2;hasteFlip=false;hp=e.hp;turnCore();verify(e.hp===hp&&turn===1,'hero haste free step does not grant ally a world turn');
  a=setup();AllySystem.gainExp(expNeed(a.lv));verify(a.lv===2&&a.maxhp===30&&a.hp===30,'own experience raises own level and HP');
  a=setup();e=enemy(8,10,1,'slime');AllySystem.tick();verify(!enemies.includes(e)&&player.exp>0&&a.exp>0,'ally kill awards hero and ally experience once');
  a=setup();player.x=player.vx=12;e=enemy(8,10);hp=a.hp;const heroHP=player.hp;enemyTurn();verify(a.hp<hp&&player.hp===heroHP,'nearby enemy targets ally and damages own HP');
  a=setup();player.x=player.vx=12;e=enemy(6,10,1000,'archer');hp=a.hp;enemyTurn();verify(a.hp<hp,'archer can shoot ally');
  a=setup();player.x=player.vx=12;e=enemy(6,10,1000,'archer');map[10][8]=WALL;hp=a.hp;enemyTurn();verify(a.hp===hp,'enemy ranged attack cannot shoot through wall');
  a=setup();player.x=player.vx=12;a.hp=1;enemy(8,10);enemyTurn();verify(!AllySystem.state.actor&&!dead&&AllySystem.state.used,'defeated ally retreats without killing hero or respawning');AllySystem.newFloor();verify(!AllySystem.state.actor,'retreated ally stays absent this run');
  a=setup();a.hp=17;a.lv=4;a.maxhp=38;floorNo=4;newFloor();verify(AllySystem.state.actor===a&&a.hp===17&&a.lv===4,'floor transition retains identity HP and level');verify(Math.max(Math.abs(a.x-player.x),Math.abs(a.y-player.y))===1&&!enemyAt(a.x,a.y)&&!trapAt(a.x,a.y),'descends to a safe neighboring tile');
  a=setup();playerMove(-1,0);verify(player.x===9&&a.x===10&&a.y===10,'hero and following ally swap places');
  a=setup();a.following=false;AllySystem.state.used=false;const turnBefore=turn;playerAttack();verify(AllySystem.state.open&&turn===turnBefore&&a.hp===26,'neutral NPC attack opens conversation without damage or turn');verify(AllySystem.recruit()&&a.following&&AllySystem.state.used&&!AllySystem.state.open,'recruitment explicitly starts following');
  setup();AllySystem.reset();floorNo=1;AllySystem.newFloor();verify(!AllySystem.state.actor,'no encounter on first floor');floorNo=2;AllySystem.newFloor();a=AllySystem.state.actor;verify(a&&!a.following&&!enemyAt(a.x,a.y)&&!trapAt(a.x,a.y),'random encounter on eligible floor uses a free tile');
  a=setup();a.following=false;player.x=14;e=enemy(8,10);enemyTurn();verify(e.x!==a.x||e.y!==a.y,'hostile movement cannot overlap neutral ally');
  a=setup();toTown(false);verify(!AllySystem.state.actor&&!AllySystem.state.used,'town resets run-only companionship');
  a=setup();a.boost=4;scene='town';e=enemy(8,10);AllySystem.tick();verify(e.hp===1000,'no ally combat in town');AllySystem.reset();
  console.log('ALL OK: '+count+' ally checks: stats, wall kunai, haste duration, XP, hostile targeting, retreat, floor following, recruitment and occupancy');
 }finally{render=originalRender;Math.random=originalRandom;AllySystem.reset();}
}
