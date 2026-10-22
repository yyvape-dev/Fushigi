{
 const assert=(v,m)=>{if(!v)throw Error(m);};let time=performance.now(),ticks=0;
 const oldEnemyTurn=enemyTurn;enemyTurn=()=>ticks++;
 EventVfx.state.force=true;EventVfx.state.clock=()=>time;
 const advance=ms=>{time+=ms;EventVfx.update(time);};
 function setup(kind){
  EventVfx.reset();scene='dungeon';floorNo=1;dead=false;closeBag();closeStairs();closeGameMenu();newFloor();
  enemies=[];floorItems=[];traps=[];rooms.forEach(r=>{r.mh=false;r.mhDone=false;});
  for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++){map[y][x]=FLOOR;roomGrid[y][x]=0;}
  player.x=player.vx=10;player.y=player.vy=10;player.st=newStatus();player.hp=player.maxhp=20;player.lv=1;player.exp=0;
  belly=100;turn=0;ticks=0;inv=[];eqWeapon=eqShield=null;eqRings=[null,null];
  if(kind)traps=[{x:11,y:10,kind,seen:false}];
 }
 setup('mine');playerMove(1,0);
 assert(traps[0].seen&&EventVfx.busy()&&turn===0&&player.hp===20,'trap must reveal and hold before damage/enemy turn');
 const x=player.x;playerMove(1,0);playerAttack();openBag();openCfg();openGameMenu();
 assert(player.x===x&&turn===0&&!bagOpen&&!cfgOpen&&!menuOpen,'all gameplay/menu input blocked during event');
 advance(430);assert(player.hp===13&&turn===0&&ticks===0,'mine result once, before enemy response');
 advance(600);assert(turn===1&&ticks===1&&!EventVfx.busy()&&traps.length===0,'mine resumes exactly one world turn');
 advance(2000);assert(player.hp===13&&turn===1,'finished event cannot replay');
 setup('gas');eqRings=[mkItem('ring_nosleep'),null];playerMove(1,0);EventVfx.flush();
 assert(player.st.sleep===0&&turn===1,'sleep protection stays effective');
 setup('gas');playerMove(1,0);EventVfx.flush();assert(turn===4&&ticks===4&&player.st.sleep===0,'gas retains existing sleep turn count');
 setup('hungry');playerMove(1,0);EventVfx.flush();assert(belly===90&&turn===1,'hunger trap applies once');
 setup('warp');playerMove(1,0);assert(player.x===11&&player.y===10,'warp must show departure before moving');
 advance(670);assert(player.x!==11||player.y!==10,'warp moves at its result frame');advance(500);assert(turn===1,'warp has one enemy turn');
 setup('summon');playerMove(1,0);EventVfx.flush();assert(enemies.length===3&&turn===1,'summon count/turn retained');
 setup('pit');playerMove(1,0);assert(floorNo===1&&turn===0,'pit must show old floor while falling');
 RunSave.save();assert(floorNo===2&&!EventVfx.busy(),'saving during pit must settle fall');
 assert(RunSave.restore()===true&&floorNo===2,'resume cannot undo a triggered pit');
 setup('mine');playerMove(1,0);RunSave.save();assert(player.hp===13&&turn===1,'save settles damage plus pending enemy turn');
 assert(RunSave.restore()===true&&player.hp===13&&turn===1,'save has committed trap result');
 setup();gainExp(expNeed(1));endTurn();assert(player.lv===2&&turn===0,'level up holds the enemy response');
 advance(900);assert(turn===1&&player.maxhp===24,'level up resumes without a bonus turn');
 setup();eqWeapon=mkItem('sword',0);inv=[eqWeapon,mkItem('scroll')];useType('scroll');const plus=eqWeapon.plus;
 assert(plus>0&&inv.length===1&&turn===0,'enhance consumes once and holds turn');useType('scroll');advance(1200);
 assert(eqWeapon.plus===plus&&turn===1,'enhance cannot repeat while locked');
 setup();rooms[0].mh=true;playerMove(1,0);assert(rooms[0].mhDone&&turn===1&&!EventVfx.busy(),'house retains its original behavior pending new art approval');
 EventVfx.state.force=false;delete EventVfx.state.clock;EventVfx.reset();enemyTurn=oldEnemyTurn;
 console.log('ALL OK: event timing/input, six traps, resistance, no replay, save during trap, level/enhance; house unchanged');
}
