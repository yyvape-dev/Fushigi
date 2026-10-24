{
 // 攻撃は交互：こちらの攻撃（先）→ 隣の敵の反撃（後）。同時にしない。ターン数は変わらない。
 const assert=(v,m)=>{if(!v)throw Error(m);};let time=performance.now(),strikes=0,swung=0;
 const oldStrike=enemyStrike,oldStrikeOne=strikeOne;
 enemyStrike=(...a)=>{strikes++;return oldStrike(...a);};
 strikeOne=(...a)=>{swung++;return oldStrikeOne(...a);};
 EventVfx.state.force=true;EventVfx.state.clock=()=>time;
 const advance=ms=>{time+=ms;EventVfx.update(time);};
 function setup(){
  EventVfx.reset();scene='dungeon';floorNo=1;dead=false;closeBag();closeStairs();closeGameMenu();newFloor();
  enemies=[];floorItems=[];traps=[];rooms.forEach(r=>{r.mh=false;r.mhDone=false;});
  for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++){map[y][x]=FLOOR;roomGrid[y][x]=0;}
  player.x=player.vx=10;player.y=player.vy=10;player.face=[1,0];player.st=newStatus();player.hp=player.maxhp=200;player.lv=1;player.exp=0;
  belly=100;turn=0;strikes=0;swung=0;inv=[];eqWeapon=eqShield=null;eqRings=[null,null];
  const e=spawnEnemy(11,10,true,'goblin');e.hp=e.maxhp=999;e.st=e.st||{};e.st.sleep=0;e.mh=false;return e;
 }
 // 1) 攻撃ボタン：先にこちらが当て、反撃は待つ
 setup();playerAttack();
 assert(swung===1&&strikes===0&&turn===0&&EventVfx.busy(),'player must strike first; enemy waits for the swing');
 advance(SWING_MS-20);assert(strikes===0&&turn===0,'enemy must still wait during the swing');
 advance(40);assert(strikes===1&&turn===1&&!EventVfx.busy(),'enemy strikes once after the swing, and the turn advances exactly once');
 // 2) 待っている間の入力は無視
 setup();playerAttack();playerAttack();playerMove(0,1);
 assert(swung===1&&player.x===10&&player.y===10,'input during the wait must be ignored');
 advance(SWING_MS+40);assert(strikes===1&&turn===1,'one exchange per turn');
 // 3) 敵へ歩いて攻撃する場合も同じ
 setup();playerMove(1,0);
 assert(swung===1&&strikes===0&&turn===0,'walking into an enemy strikes first, enemy waits');
 advance(SWING_MS+40);assert(strikes===1&&turn===1,'enemy answers after the swing');
 // 4) 隣に起きている敵がいなければ待たない
 const e=setup();e.x=e.vx=14;playerAttack();
 assert(!EventVfx.busy()&&turn===1,'no adjacent enemy: no extra wait');
 // 5) 眠っている敵は殴られて起き、こちらの攻撃のあとに反撃する（従来のルールのまま）
 const s=setup();s.st.sleep=5;playerAttack();
 assert(strikes===0&&turn===0&&EventVfx.busy(),'woken enemy waits for the swing too');
 advance(SWING_MS+40);assert(strikes===1&&turn===1,'woken enemy answers after the swing');
 EventVfx.reset();EventVfx.state.force=false;EventVfx.state.clock=null;enemyStrike=oldStrike;strikeOne=oldStrikeOne;
 console.log('ALL OK: alternating attacks — player first, enemy answers after the swing, one turn');
}
{
 // 複数の敵の反撃は1体ずつ順番。結果（ターン数・ダメージ）は1ターン分のまま。
 const assert=(v,m)=>{if(!v)throw Error(m);};let time=performance.now();const order=[];
 const oldStrike=enemyStrike;enemyStrike=(e,...a)=>{order.push(e.id);return oldStrike(e,...a);};
 EventVfx.state.force=true;EventVfx.state.clock=()=>time;
 const advance=ms=>{time+=ms;EventVfx.update(time);};
 function setup(n){
  EventVfx.reset();scene='dungeon';floorNo=1;dead=false;closeBag();closeStairs();closeGameMenu();newFloor();
  enemies=[];floorItems=[];traps=[];rooms.forEach(r=>{r.mh=false;r.mhDone=false;});
  for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++){map[y][x]=FLOOR;roomGrid[y][x]=0;}
  player.x=player.vx=10;player.y=player.vy=10;player.face=[1,0];player.st=newStatus();player.hp=player.maxhp=500;player.lv=1;player.exp=0;
  belly=100;turn=0;order.length=0;inv=[];eqWeapon=eqShield=null;eqRings=[null,null];
  const list=[[11,10],[9,10],[10,11]].slice(0,n).map(([x,y],i)=>{const e=spawnEnemy(x,y,true,'goblin');e.id=i+1;e.hp=e.maxhp=9999;e.st=e.st||{};e.st.sleep=0;e.mh=false;return e;});
  return list;
 }
 // 3体が隣接：こちらの攻撃 → 待つ → 1体目 → 待つ → 2体目 → 待つ → 3体目、ターンは最後に1つ
 setup(3);playerAttack();
 assert(order.length===0&&turn===0,'enemies wait for the swing');
 assert(!EventVfx.state.events.some(e=>String(e.kind).startsWith('enemy-')&&!e.entity&&e.kind.endsWith('wait')),'wait events must not use the enemy- prefix: EnemyVfx.draw reads every enemy-* event');
 assert(EventVfx.state.events.some(e=>e.kind==='swing-wait'),'the swing wait is an event of its own kind');
 advance(SWING_MS+20);assert(order.length===1&&turn===0,'first enemy strikes alone; the turn is not finished yet');
 assert(EventVfx.state.events.every(e=>!String(e.kind).startsWith('enemy-')||e.kind!=='enemy-step'),'no stray enemy-step event');
 assert(EventVfx.state.events.some(e=>e.kind==='strike-wait'),'a strike-wait event separates the strikes');
 advance(ENEMY_STEP_MS-40);assert(order.length===1,'second enemy still waits');
 advance(80);assert(order.length===2&&turn===0,'second enemy strikes after the first');
 advance(ENEMY_STEP_MS+20);assert(order.length===3&&turn===1&&!EventVfx.busy(),'third strikes last; turn advances exactly once at the end');
 assert(new Set(order).size===3,'each enemy strikes exactly once');
 // 待っている間の入力は無視
 setup(2);playerAttack();advance(SWING_MS+20);playerMove(0,1);assert(player.y===10,'input is ignored between enemy strikes');advance(ENEMY_STEP_MS+40);assert(order.length===2&&turn===1,'finishes normally');
 // 倒された敵は順番を飛ばす
 {const l=setup(3);playerAttack();advance(SWING_MS+20);l[1].hp=0;enemies=enemies.filter(e=>e!==l[1]);advance(ENEMY_STEP_MS+40);advance(ENEMY_STEP_MS+40);assert(!order.includes(2)&&turn===1,'a defeated enemy is skipped');}
 // EventVfx が無効（テスト・非表示タブ）なら、従来どおり即時にまとめて処理
 EventVfx.state.force=false;
 {setup(3);const old=EventVfx.live;EventVfx.live=()=>false;playerAttack();EventVfx.live=old;assert(order.length===3&&turn===1,'without VFX everything is immediate');}
 EventVfx.reset();EventVfx.state.clock=null;enemyStrike=oldStrike;
 console.log('ALL OK: alternating attacks — one enemy at a time');
}
