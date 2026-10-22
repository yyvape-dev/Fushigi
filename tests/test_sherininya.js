{
 let count=0;const verify=(v,m)=>{if(!v)throw Error(m);count++;};const originalRender=render,originalRandom=Math.random;render=()=>{};
 function setup(){AllySystem.reset();scene='dungeon';dead=false;bagOpen=whOpen=cfgOpen=histOpen=stairsOpen=menuOpen=false;MW=26;MH=20;floorNo=3;turn=1;hasteFlip=false;map=Array.from({length:MH},(_,y)=>Array.from({length:MW},(_,x)=>!x||!y||x===MW-1||y===MH-1?WALL:FLOOR));rooms=[{x:1,y:1,w:24,h:18,cx:12,cy:10},{x:2,y:2,w:4,h:4,cx:4,cy:4}];roomGrid=map.map(row=>row.map(()=>0));seen=map.map(row=>row.map(()=>true));vis=map.map(row=>row.map(()=>true));player.x=player.vx=10;player.y=player.vy=10;player.hp=player.maxhp=200;player.lv=1;player.exp=0;player.face=[-1,0];player.st=newStatus();enemies=[];floorItems=[];traps=[];inv=[];eqWeapon=eqShield=null;eqRings=[null,null];atkUp=0;belly=80;const a=AllySystem.make(9,10,'sherininya');a.following=true;AllySystem.state.actor=a;AllySystem.state.used=true;Math.random=()=>.1;return a;}
 function enemy(x,y,hp=1000,kind='skeleton'){const e={kind,x,y,vx:x,vy:y,hp,maxhp:hp,aware:true,lost:0,st:{}};enemies.push(e);return e;}
 try{
  let a=setup(),near=enemy(8,10),far=enemy(7,10);AllySystem.tick();verify(near.hp<1000&&far.hp<1000,'one cast hits both enemies in two-tile ray');verify(a.x===9&&a.y===10&&!a.dash,'caster stays in place');verify(a.magicBeam.cells.length===2&&a.attackFace[0]===-1,'beam has two cells and locked direction');verify(a.boost===0&&a.cooldown===0,'mage never gains foxfire');
  a=setup();far=enemy(7,10);AllySystem.tick();verify(far.hp<1000,'two tiles through empty first cell');
  a=setup();far=enemy(6,10);AllySystem.tick();verify(far.hp===1000&&!a.magicBeam,'three tiles out of range');
  a=setup();far=enemy(7,9);AllySystem.tick();verify(far.hp===1000,'off-axis target not hit');
  for(const [dx,dy]of DIRS8){a=setup();near=enemy(a.x+dx,a.y+dy);far=enemy(a.x+dx*2,a.y+dy*2);AllySystem.tick();verify(near.hp<1000&&far.hp<1000,'all eight directional rays penetrate '+dx+','+dy);}
  a=setup();far=enemy(7,10);map[10][8]=WALL;AllySystem.tick();verify(far.hp===1000&&!a.magicBeam,'wall blocks spell');
  a=setup();near=enemy(8,10);far=enemy(7,10);map[10][7]=WALL;AllySystem.tick();verify(near.hp<1000&&far.hp===1000&&a.magicBeam.cells.length===1,'wall in second tile stops after first hit');
  a=setup();far=enemy(7,8);map[9][9]=WALL;map[10][8]=WALL;AllySystem.tick();verify(far.hp===1000,'closed diagonal corners block magic');
  a=setup();player.x=8;player.y=10;far=enemy(7,10);const hp=player.hp;AllySystem.tick();verify(far.hp<1000&&player.hp===hp,'passes through hero and never harms hero');verify(a.hp===24,'caster unharmed by own spell');
  a=setup();far=enemy(7,10);floorItems=[{x:8,y:10,item:mkItem('bread')}];traps=[{x:8,y:10,kind:'mine',seen:false}];AllySystem.tick();verify(far.hp<1000&&floorItems.length===1&&traps.length===1,'items and traps neither block nor activate');
  a=setup();near=enemy(8,10);far=enemy(7,10);Math.random=()=>.999;AllySystem.tick();verify(near.hp===1000&&far.hp===1000&&a.magicBeam,'normal accuracy applies to each enemy');
  a=setup();near=enemy(8,10);far=enemy(7,10);let randomCalls=0;Math.random=()=>++randomCalls===1?.999:.1;AllySystem.tick();verify(near.hp===1000&&far.hp<1000,'a miss does not block penetration');
  a=setup();near=enemy(8,10,1);far=enemy(7,10,1);Math.random=()=>.9;AllySystem.tick();verify(enemies.length===0,'front kill does not block second kill');verify(player.exp>0&&a.exp===player.exp,'experience granted to both once per kill');
  a=setup();near=enemy(8,10);far=enemy(7,10);const side=enemy(9,9);AllySystem.tick();verify(near.hp<1000&&far.hp<1000&&side.hp===1000,'prefers line hitting two targets');
  a=setup();near=enemy(8,10);near.st.sleep=4;AllySystem.tick();verify(near.st.sleep===0&&near.aware,'hit wakes enemy');
  a=setup();near=enemy(8,10);near.mh=true;AllySystem.tick();verify(near.hp===1000,'unawakened monster room is not targeted');
  a=setup();far=enemy(7,10);a.st.sleep=2;AllySystem.tick();verify(far.hp===1000&&a.st.sleep===1&&!a.magicBeam,'sleep skips casting');
  a=setup();far=enemy(7,10);a.st.confuse=2;AllySystem.tick();verify(far.hp===1000&&!a.magicBeam,'confusion skips intentional magic');
  a=setup();far=enemy(7,10);player.st.haste=2;hasteFlip=false;turnCore();verify(far.hp===1000&&turn===1,'hero free haste step does not cast');
  a=setup();far=enemy(7,10);a.following=false;AllySystem.tick();verify(far.hp===1000,'neutral mage does not fight');
  a=setup();far=enemy(7,10);scene='town';AllySystem.tick();verify(far.hp===1000,'no magic in town');
  a=setup();a.following=false;AllySystem.state.used=false;playerAttack();verify(AllySystem.state.open&&turn===1,'meeting is zero-turn dialogue');verify(AllySystem.recruit()&&a.following&&AllySystem.state.used,'mage recruits');verify(AllySystem.infoHTML().includes('シェリニーニャ')&&AllySystem.infoHTML().includes('敵だけ'),'correct status and immunity explanation');
  a=setup();const attack=AllySystem.stats(a).attack;eqWeapon=mkItem('sword',5);verify(AllySystem.stats(a).attack>attack,'power references hero equipment without copying appearance');AllySystem.gainExp(expNeed(a.lv));verify(a.lv===2&&a.hp===28&&a.maxhp===28,'own growth');
  a=setup();near=enemy(8,10,1000,'blob');AllySystem.tick();verify(enemies.length===2&&Math.abs(enemies[1].hp-near.hp)<=1,'new split fragment is not hit again during same cast');
  a=setup();far=enemy(7,10);AllySystem.tick();floorNo=4;newFloor();verify(AllySystem.state.actor===a&&!a.magicBeam&&a.kind==='sherininya','stairs retain identity and clear old beam');
  a=setup();player.x=12;a.hp=1;enemy(8,10);enemyTurn();verify(!AllySystem.state.actor&&!dead&&AllySystem.state.used,'own HP and independent retreat');
  setup();AllySystem.reset();floorNo=2;let calls=0;Math.random=()=>++calls<3?.1:.9;AllySystem.newFloor();verify(AllySystem.state.actor?.kind==='sherininya','third companion can spawn');
  a=setup();toTown(false);verify(!AllySystem.state.actor&&!AllySystem.state.used,'town resets run-only companionship');
  console.log('ALL OK: '+count+' Sherininya checks: piercing rays, walls/corners, friendly immunity, accuracy, split identity, XP, sleep/confusion, recruitment, growth, encounters, stairs and retreat.');
 }finally{render=originalRender;Math.random=originalRandom;AllySystem.reset();}
}
