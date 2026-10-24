// Verify sounds follow successful game actions, not messages or failed commands.
{
 const sounds=[];globalThis.GameAudio={effect:k=>sounds.push(k),sync(){}};
 const assert=(v,m)=>{if(!v)throw Error(m);};
 scene='dungeon';floorNo=1;newFloor();enemies=[];traps=[];inv=[];floorItems=[];
 sounds.length=0;const f={x:player.x,y:player.y,item:mkItem('potion')};floorItems.push(f);
 assert(takeFloor(f)&&sounds.join()==='pickup','successful pickup');
 inv=Array.from({length:MAXBAG},()=>mkItem('weed'));sounds.length=0;
 assert(!takeFloor({item:mkItem('potion')})&&!sounds.length,'full bag silent');
 player.st.invinc=3;hurtPlayer(2,'test');assert(sounds.join()==='block','invincible damage blocks');sounds.length=0;
 player.st.invinc=0;player.hp=100;hurtPlayer(2,'test');assert(sounds.join()==='hurt','actual damage');
 sounds.length=0;const pot=mkItem('savepot',3);breakPot(pot,player.x,player.y);
 assert(sounds.join()==='potbreak','pot breaks once');
 for(const kind of ['gas','hungry','warp','summon','mine']){
  sounds.length=0;player.hp=100;triggerTrap({kind,x:player.x,y:player.y});
  assert(sounds[0]==='trap-'+kind,'trap result '+kind);
 }
 toTown(false);CastleTown.leaveInn();const smith=CastleTown.facilities.find(f=>f.id==='smith');
 player.x=smith.x;player.y=smith.y;const sword=mkItem('sword',0);inv=[sword];gold=1000;CastleTown.show('smith');
 sounds.length=0;assert(CastleTown.strengthen(sword.id)&&sounds.join()==='forge','forge success');
 sounds.length=0;gold=0;assert(!CastleTown.strengthen(sword.id)&&!sounds.length,'failed forge silent');
 console.log('ALL OK: action audio follows pickup, damage, pot, traps and forge results');
}

{
 const sounds=[];globalThis.GameAudio={effect:k=>sounds.push(k),sync(){}};
 const assert=(v,m)=>{if(!v)throw Error(m);};
 const oldRandom=Math.random,oldRender=render;render=()=>{};
 function setup(kind='yuzunamiki'){
  AllySystem.reset();scene='dungeon';dead=false;bagOpen=whOpen=cfgOpen=histOpen=stairsOpen=menuOpen=false;
  MW=26;MH=20;floorNo=3;turn=1;map=Array.from({length:MH},(_,y)=>Array.from({length:MW},(_,x)=>!x||!y||x===MW-1||y===MH-1?WALL:FLOOR));
  rooms=[{x:1,y:1,w:24,h:18,cx:12,cy:10}];roomGrid=map.map(r=>r.map(()=>0));seen=map.map(r=>r.map(()=>true));vis=map.map(r=>r.map(()=>true));
  player.x=player.vx=10;player.y=player.vy=10;player.hp=player.maxhp=200;player.lv=1;player.exp=0;player.st=newStatus();
  enemies=[];floorItems=[];traps=[];inv=[];eqWeapon=eqShield=null;eqRings=[null,null];atkUp=0;belly=80;
  const a=AllySystem.make(9,10,kind);a.following=true;a.cooldown=999;AllySystem.state.actor=a;Math.random=()=>.1;sounds.length=0;return a;
 }
 function enemy(){const e={kind:'skeleton',x:8,y:10,vx:8,vy:10,hp:1000,maxhp:1000,aware:true,st:{}};enemies.push(e);return e;}
 try{
  for(const [kind,key]of [['yuzunamiki','ally-kunai'],['avenius','ally-sword'],['sherininya','ally-magic']]){
   const a=setup(kind),e=enemy();a.issenUsed.add(e);AllySystem.tick();assert(sounds.includes(key)&&sounds.includes('hit'),'ally attack '+kind);
  }
  let a=setup('avenius');enemy();AllySystem.tick();assert(sounds.includes('ally-issen'),'issen distinct');
  a=setup();a.cooldown=0;enemy();AllySystem.tick();assert(sounds.includes('boost'),'fox fire boost');
  a=setup();a.following=false;assert(AllySystem.recruit()&&sounds.filter(k=>k==='join').length===1,'recruit once');
  assert(!AllySystem.recruit()&&sounds.filter(k=>k==='join').length===1,'recruit duplicate silent');
  sounds.length=0;AllySystem.gainExp(expNeed(a.lv));assert(sounds.includes('levelup'),'ally level sound');
  sounds.length=0;AllySystem.hurt(999);assert(sounds.includes('hurt')&&sounds.includes('retreat'),'ally defeat');
  setup();inv=[mkItem('reviveherb')];player.hp=0;checkDeath('test');assert(sounds.includes('revive')&&!dead,'revival');
  sounds.length=0;inv=[];player.hp=0;checkDeath('test');assert(sounds.includes('death')&&dead,'death');const n=sounds.length;checkDeath('test');assert(sounds.length===n,'death once');
  setup();EnemyVfx.emit('lightning',{x:8,y:10});assert(sounds.includes('lightning'),'enemy lightning');
  sounds.length=0;vis[10][8]=false;EnemyVfx.emit('bell',{x:8,y:10});assert(!sounds.length,'unseen enemy sound suppressed');
  setup();inv=[mkItem('bread')];useType(ikey(inv[0]));assert(sounds.includes('eat'),'food');
  setup();player.hp=100;inv=[mkItem('potion')];useType(ikey(inv[0]));assert(sounds.includes('drink')&&sounds.includes('heal'),'potion');
  setup();inv=[mkItem('sword')];toggleEquip(inv[0]);assert(sounds.includes('equip'),'equip');
  console.log('ALL OK: distinct ally attacks, issen, boost, join, ally XP/retreat, revival/death, visibility, food, healing and equipment audio');
 }finally{Math.random=oldRandom;render=oldRender;}
}
