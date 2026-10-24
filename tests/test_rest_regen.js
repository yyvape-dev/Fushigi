{
 // 自然回復＝最大HP比例／「休む」＝満タンまで足踏みを自動で繰り返す（敵が見えたら等で止まる）
 const assert=(v,m)=>{if(!v)throw Error(m);};
 function setup(maxhp,hp){
  EventVfx.reset();scene='dungeon';floorNo=1;dead=false;closeBag();closeStairs();closeGameMenu();newFloor();
  enemies=[];floorItems=[];traps=[];rooms.forEach(r=>{r.mh=false;r.mhDone=false;});
  for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++){map[y][x]=FLOOR;roomGrid[y][x]=0;}
  player.x=player.vx=10;player.y=player.vy=10;player.st=newStatus();player.maxhp=maxhp;player.hp=hp;player.lv=1;
  belly=100;turn=0;inv=[];eqWeapon=eqShield=null;eqRings=[null,null];regenAcc=0;restStop();
 }
 const waitN=n=>{for(let i=0;i<n;i++)playerMove(0,0);};
 // 1) 最大HP15：10ターンで1回復（従来と同じ）
 setup(15,5);waitN(10);assert(player.hp===6,'maxhp 15 heals 1 per 10 turns, got '+player.hp);
 // 2) 最大HP150：毎ターン1回復
 setup(150,10);waitN(20);assert(player.hp===30,'maxhp 150 heals 1 per turn, got '+player.hp);
 // 3) 最大HPが大きいほど速い／満タンを超えない
 setup(300,290);waitN(30);assert(player.hp===300,'regen caps at maxhp, got '+player.hp);
 // 4) 回復の腕輪で2倍（ring 1個＝1+1）
 setup(150,10);eqRings=[mkItem('ring_regen'),null];waitN(10);assert(player.hp>=29&&player.hp<=30,'regen ring doubles the rate, got '+player.hp);
 // 5) 満腹度0では自然回復しない
 setup(150,10);belly=0;waitN(5);assert(player.hp<=10,'no regen when starving');
 // 6) 休む：タイマーを差し替えて1刻みずつ進める
 const realSet=globalThis.setInterval,realClear=globalThis.clearInterval;let cb=null;
 globalThis.setInterval=f=>{cb=f;return 77;};globalThis.clearInterval=()=>{cb=null;};
 try{
  setup(150,140);restStart();assert(cb&&restI===77,'rest starts');
  let guard=0;while(cb&&guard++<50)cb();
  assert(player.hp===150&&!restI,'rest runs until full HP, got '+player.hp);
  setup(150,100);enemies=[];restStart();cb();
  const e=spawnEnemy(12,10,true,'goblin');e.mim=false;vis[10][12]=true;const hp0=player.hp;cb&&cb();
  assert(!restI&&player.hp===hp0,'rest stops when an enemy is visible (no extra turn)');
  setup(150,100);belly=5;restStart();cb&&cb();assert(!restI,'rest stops when hungry');
  setup(150,150);restStart();assert(!restI,'rest does nothing at full HP');
  setup(150,100);restStart();const t0=turn;cb();holdStop();assert(!restI&&turn===t0+1,'any input (holdStop) stops resting');
 }finally{globalThis.setInterval=realSet;globalThis.clearInterval=realClear;}
 console.log('ALL OK: regen by max HP, ring, starvation, rest loop and stop conditions');
}
