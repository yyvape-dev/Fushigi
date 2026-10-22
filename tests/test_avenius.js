{
 let count=0;const verify=(v,m)=>{if(!v)throw Error(m);count++;};
 const originalRender=render,originalRandom=Math.random;render=()=>{};
 function setup(){AllySystem.reset();scene='dungeon';dead=false;bagOpen=whOpen=cfgOpen=histOpen=stairsOpen=menuOpen=false;MW=26;MH=20;floorNo=3;turn=1;hasteFlip=false;map=Array.from({length:MH},(_,y)=>Array.from({length:MW},(_,x)=>!x||!y||x===MW-1||y===MH-1?WALL:FLOOR));rooms=[{x:1,y:1,w:24,h:18,cx:12,cy:10},{x:2,y:2,w:4,h:4,cx:4,cy:4}];roomGrid=map.map(row=>row.map(()=>0));seen=map.map(row=>row.map(()=>true));vis=map.map(row=>row.map(()=>true));player.x=player.vx=10;player.y=player.vy=10;player.hp=player.maxhp=200;player.lv=1;player.exp=0;player.face=[-1,0];player.st=newStatus();enemies=[];floorItems=[];traps=[];inv=[];eqWeapon=eqShield=null;eqRings=[null,null];atkUp=0;belly=80;const a=AllySystem.make(9,10,'avenius');a.following=true;AllySystem.state.actor=a;AllySystem.state.used=true;Math.random=()=>.1;return a;}
 function enemy(x,y,hp=1000,kind='skeleton'){const e={kind,x,y,vx:x,vy:y,hp,maxhp:hp,aware:true,lost:0,st:{}};enemies.push(e);return e;}
 try{
  let a=setup(),e=enemy(5,10);const origin=[a.x,a.y];AllySystem.tick();verify(e.hp<1000,'four-tile enemy is hit');verify(a.x===origin[0]&&a.y===origin[1]&&a.vx===a.x&&a.vy===a.y,'returns to exact logical and visual origin');verify(a.issenUsed.has(e)&&a.dash.duration===360,'enemy identity and dash animation recorded');verify(a.dash.to.x===6&&a.dash.to.y===10,'lands on nearest legal adjacent tile');verify(!AllySystem.at(6,10)&&AllySystem.at(9,10)===a,'no stale teleport occupancy');
  let hp=e.hp;for(let n=0;n<5;n++)AllySystem.tick();verify(e.hp===hp,'one special attack per enemy across turns');e.x=6;AllySystem.tick();verify(e.hp===hp,'moving the same enemy does not reset its use');
  enemies=[];e=enemy(5,10);AllySystem.tick();verify(e.hp<1000,'new enemy at same coordinates is eligible');
  a=setup();e=enemy(5,8);AllySystem.tick();verify(e.hp<1000,'off-axis target within four tiles can be flashed');
  a=setup();e=enemy(5,6);AllySystem.tick();verify(e.hp<1000,'four diagonal tiles are in range');
  a=setup();e=enemy(4,10);AllySystem.tick();verify(e.hp===1000&&!a.issenUsed.has(e),'five tiles are out of range');
  a=setup();e=enemy(5,10);map[10][7]=WALL;AllySystem.tick();verify(e.hp===1000&&!a.issenUsed.has(e),'wall blocks flash target');
  a=setup();e=enemy(5,10);e.mh=true;AllySystem.tick();verify(e.hp===1000&&!a.issenUsed.has(e),'unawakened monster room is not attacked');
  a=setup();e=enemy(5,10);for(const [dx,dy]of DIRS8)map[e.y+dy][e.x+dx]=WALL;AllySystem.tick();verify(e.hp===1000&&!a.issenUsed.has(e),'no landing tile means no use consumed');
  a=setup();e=enemy(5,10);player.x=6;player.y=10;AllySystem.tick();verify(e.hp<1000&&!(a.dash.to.x===player.x&&a.dash.to.y===player.y),'landing never overlaps hero');
  a=setup();e=enemy(5,10);floorItems=[{x:6,y:10,item:mkItem('onigiri')}];AllySystem.tick();verify(e.hp<1000&&!(a.dash.to.x===6&&a.dash.to.y===10),'landing avoids floor items');
  a=setup();e=enemy(5,10);traps=[{x:6,y:10,kind:'mine',seen:false}];AllySystem.tick();verify(e.hp<1000&&!(a.dash.to.x===6&&a.dash.to.y===10),'landing avoids hidden traps');
  a=setup();e=enemy(5,10);Math.random=()=>.999;AllySystem.tick();verify(e.hp<1000&&a.issenUsed.has(e),'flash guaranteed hit even when normal accuracy fails');
  a=setup();e=enemy(5,10);e.st.sleep=3;AllySystem.tick();verify(e.st.sleep===0&&e.aware,'flash wakes surviving enemy');
  a=setup();e=enemy(5,10);a.st.sleep=2;AllySystem.tick();verify(e.hp===1000&&!a.issenUsed.has(e)&&a.st.sleep===1,'sleep prevents flash without consuming use');
  a=setup();e=enemy(5,10);a.st.confuse=2;AllySystem.tick();verify(e.hp===1000&&!a.issenUsed.has(e),'confusion prevents intentional flash');
  a=setup();e=enemy(5,10);Math.random=()=>0;AllySystem.tick();verify(a.boost===0&&a.cooldown===0,'Avenius never gains foxfire');
  a=setup();e=enemy(8,10);a.issenUsed.add(e);AllySystem.tick();verify(e.hp<1000&&!a.dash,'used adjacent enemy receives ordinary sword attack');
  a=setup();e=enemy(7,10);a.issenUsed.add(e);AllySystem.tick();verify(e.hp===1000,'ordinary sword does not inherit kunai range');
  a=setup();e=enemy(8,9);a.issenUsed.add(e);map[9][9]=WALL;map[10][8]=WALL;AllySystem.tick();verify(e.hp===1000,'ordinary diagonal sword respects blocked corners');
  a=setup();e=enemy(5,10,1,'slime');AllySystem.tick();verify(!enemies.includes(e)&&player.exp>0&&a.exp>0,'flash kill grants hero and ally experience');verify(a.x===9&&a.y===10,'kill still returns to origin');const xp=player.exp;AllySystem.tick();verify(player.exp===xp,'kill experience is not duplicated');
  a=setup();e=enemy(5,10);player.st.haste=2;hasteFlip=false;turnCore();verify(e.hp===1000&&!a.issenUsed.has(e)&&turn===1,'hero haste free action does not tick flash');
  a=setup();e=enemy(5,10);AllySystem.tick();const health=a.hp;enemyTurn();verify(a.hp===health&&a.x===9,'enemy acts after return, not at temporary landing');
  a=setup();verify(a.hp===28&&a.maxhp===28,'Avenius base HP');const attack=AllySystem.stats(a).attack;eqWeapon=mkItem('sword',5);verify(AllySystem.stats(a).attack>attack,'current hero weapon affects own fixed-sword power');AllySystem.gainExp(expNeed(a.lv));verify(a.lv===2&&a.maxhp===32&&a.hp===32,'own level and HP growth');verify(AllySystem.infoHTML().includes('アベニウス')&&AllySystem.infoHTML().includes('一閃'),'status describes correct companion');
  a=setup();a.following=false;AllySystem.state.used=false;playerAttack();verify(AllySystem.state.open&&turn===1,'neutral Avenius opens zero-turn conversation');verify(AllySystem.recruit()&&a.following&&AllySystem.state.used,'Avenius recruits');
  a=setup();e=enemy(5,10);AllySystem.tick();floorNo=4;newFloor();verify(AllySystem.state.actor===a&&a.kind==='avenius'&&!a.dash,'stairs retain companion and cancel old dash');verify(a.issenUsed.has(e),'same object use state survives floors');
  a=setup();a.hp=1;player.x=12;enemy(8,10);enemyTurn();verify(!AllySystem.state.actor&&!dead&&AllySystem.state.used,'Avenius retreats independently');
  setup();AllySystem.reset();floorNo=2;let calls=0;Math.random=()=>++calls<3?.1:.5;AllySystem.newFloor();verify(AllySystem.state.actor?.kind==='avenius','random encounter can select second roster member');
  a=setup();toTown(false);verify(!AllySystem.state.actor&&!AllySystem.state.used,'town resets Avenius run');
  a=setup();scene='town';e=enemy(5,10);AllySystem.tick();verify(e.hp===1000,'no Avenius dungeon combat in town');
  console.log('ALL OK: '+count+' Avenius checks: range, LOS, landing, identity, return, accuracy, status, XP, recruitment, encounters, stairs, retreat and hero haste.');
 }finally{render=originalRender;Math.random=originalRandom;AllySystem.reset();}
}
