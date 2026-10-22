// バランス計測：プレイヤーに近い動きのbotで、ふかい洞窟（12階）を何度も潜って数字を出す。
// 使い方：node tests/harness.js index.html tests/tools/balance_sim.js
//   環境変数 RUNS=回数（既定100） KIT=0|1（1=鉄の剣・木の盾・回復薬2つを持って出発。既定は両方） DUNGEON=second|first
// botの動き：部屋を近い順に回り（魔物部屋・店は避ける）、部屋の床の物を拾い、隣の敵は殴る。最後に階段へ。
//   食べる：満腹度10%以下で食料を食べる（カビ・腐ったものは最後）。回復：HP30%以下で回復薬→草（未識別でも飲む）。
//   装備：拾った武器・盾が今より強ければ付け替える。巻物・杖・腕輪は使わない（素の強さを測るため）。
{
 const RUNS=+(process.env.RUNS||100),KITS=process.env.KIT===undefined?[0,1]:[+process.env.KIT],DID=process.env.DUNGEON||'second';
 if(process.env.ATK)ENEMY_BAL.atk=+process.env.ATK;if(process.env.DEEP)ENEMY_BAL.deepAtk=+process.env.DEEP;
 const _render=render;render=()=>{};const _draw=draw;draw=()=>{};
 const D8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 const isFood=it=>ITEMS[it.type].cat==='食';
 const badFood=t=>/moldy|rotten|kusatta/.test(t);
 const power=it=>it?(ITEMS[it.type].atk||ITEMS[it.type].def||0)+(it.plus||0):-1;
 function bfs(goal,loose){                                    // 敵は通れる扱い（隣に来たら殴る）。店主は通らない（loose=true のときだけ通る）                                          // goal(x,y) を満たす最寄りマスへの最初の一歩
  const prev=new Map(),q=[[player.x,player.y]],key=(x,y)=>x+','+y;prev.set(key(player.x,player.y),null);
  for(let i=0;i<q.length;i++){const [x,y]=q[i];
   if(i>0&&goal(x,y)){let k=key(x,y),c=[x,y];while(prev.get(k)&&prev.get(k).join()!==[player.x,player.y].join()){c=prev.get(k);k=key(c[0],c[1]);}return [c[0]-player.x,c[1]-player.y];}
   for(const [dx,dy]of D8){if(!geomOK(x,y,dx,dy))continue;const nx=x+dx,ny=y+dy,k=key(nx,ny);if(prev.has(k))continue;const al=AllySystem.at(nx,ny);if(al&&!al.following)continue;if(!loose&&ShopSystem.at&&ShopSystem.at(nx,ny))continue;prev.set(k,[x,y]);q.push([nx,ny]);}}
  return null;
 }
 function think(st){
  if(stairsOpen){chooseStairs(true);return;}
  if(menuOpen)uiBack();
  if(AllySystem.state.open){AllySystem.hide();}            // 仲間の勧誘は断る（素の強さを測る）
  if(ShopSystem.state.open){ShopSystem.close();}
  // 回復
  if(player.hp<=player.maxhp*.3){const p=inv.find(it=>it.type==='potion')||inv.find(it=>ITEMS[it.type].cat==='草'&&!(isKnown(it.type)&&['poison','confuse','sleep','blind','weed'].some(b=>it.type.includes(b))));if(p){st.lastAct='heal';useType(ikey(p));st.heals++;return;}}
  // 食事
  if(belly<=10){const fs=inv.filter(isFood).sort((a,b)=>badFood(a.type)-badFood(b.type));if(fs.length){st.lastAct='eat';useType(ikey(fs[0]));st.eats++;return;}}
  // 装備
  for(const it of inv){const e=ITEMS[it.type].equip;if(e==='weapon'&&power(it)>power(eqWeapon)&&!ShopSystem.unpaid?.(it)){toggleEquip(it);return;}if(e==='shield'&&power(it)>power(eqShield)&&!ShopSystem.unpaid?.(it)){toggleEquip(it);return;}}
  // 持ち物がいっぱいなら弱い物を捨てる
  // 持ち物がいっぱい：足元が食料なら、要らない物と入れ替える（入れ替えた物は二度と拾わない）
  const here=itemAt(player.x,player.y);st.ignore=st.ignore||new Set();
  if(inv.length>=MAXBAG&&here&&isFood(here.item)&&!here.item.shopLot){const junk=inv.find(it=>it!==eqWeapon&&it!==eqShield&&!isFood(it)&&it.type!=='potion');if(junk){st.lastAct='swap';st.ignore.add(junk.id);dropType(ikey(junk));return;}}
  if(here)st.ignore.add(here.item.id);
  // 隣の敵を殴る
  const adj=D8.find(([dx,dy])=>geomOK(player.x,player.y,dx,dy)&&enemyAt(player.x+dx,player.y+dy));
  if(adj){st.lastAct='attack';player.face=adj;playerAttack();return;}
  // 目標：この部屋の床の物 → 未訪問の部屋 → 階段
  const ri=roomGrid[player.y][player.x];if(ri>=0)st.visited.add(ri);
  const shopRoom=floorShop?floorShop.room:-1;
  let step=null;
  const want=f=>!f.item.shopLot&&!st.ignore.has(f.item.id)&&(inv.length<MAXBAG||isFood(f.item)||f.item.type==='gold');
  if(ri>=0&&ri!==shopRoom)step=bfs((x,y)=>roomGrid[y][x]===ri&&floorItems.some(f=>f.x===x&&f.y===y&&want(f)));
  if(!step&&!st.rush){const todo=rooms.map((r,i)=>i).filter(i=>!st.visited.has(i)&&!rooms[i].mh&&i!==shopRoom);if(todo.length)step=bfs((x,y)=>{const g=roomGrid[y][x];return g>=0&&todo.includes(g);});if(!step&&todo.length)todo.forEach(i=>st.visited.add(i));}
  if(!step)step=bfs((x,y)=>map[y][x]===STAIRS)||bfs((x,y)=>map[y][x]===STAIRS,true);
  if(step&&enemyAt(player.x+step[0],player.y+step[1])){st.lastAct='attack';player.face=step;playerAttack();return;}
  if(step){const bx=player.x,by=player.y;st.lastAct=player.st.sleep>0?'asleep':player.st.confuse>0?'confused':'move';playerMove(step[0],step[1]);if(player.x===bx&&player.y===by&&!stairsOpen){st.lastAct='blocked-wait';playerMove(0,0);}}else{st.lastAct='no-path-wait';playerMove(0,0);}
 }
 const tbl={};
 for(const kit of KITS){
  const agg={runs:0,clear:0,deathHunger:0,deathCombat:0,stuck:0,floors:{}};
  for(let n=0;n<RUNS;n++){
   localStorage.removeItem(SAVE_KEY);RunSave.clear();
   clears=5;dClears={first:3,second:2};deaths=0;wh=[];gold=0;inv=kit?[mkItem('sword',0),mkItem('woodshield',0),mkItem('potion'),mkItem('potion')]:[];eqWeapon=eqShield=null;eqRings=[null,null];
   if(kit){eqWeapon=inv[0];eqShield=inv[1];}
   autoPick=true;dead=false;toTown(false);dungeonId=DID;enterDungeon();agg.runs++;
   let lastFloor=0,st=null,fl=null,guard=0;
   while(scene==='dungeon'&&guard++<30000){
    if(floorNo!==lastFloor&&st&&process.env.DIAG){const left=(st.foodLeft||[]);for(const r of left){agg.left=agg.left||{};agg.left[r]=(agg.left[r]||0)+1;}}
    if(stairsOpen&&process.env.DIAG){st.foodLeft=floorItems.filter(f=>isFood(f.item)&&!f.item.shopLot&&st.foodIds.has(f.item.id)).map(f=>{const g=roomGrid[f.y][f.x];return g<0?'corridor':rooms[g].mh?'monsterhouse':!st.visited.has(g)?'unvisited':inv.length>=MAXBAG?'bagfull':enemyAt(f.x,f.y)?'enemy':'visited-room';});}
    if(floorNo!==lastFloor){lastFloor=floorNo;st={visited:new Set(),eats:0,heals:0,rush:false,t0:turn,b0:belly,hp0:player.hp};
     fl=agg.floors[floorNo]||(agg.floors[floorNo]={n:0,turns:0,food:0,foodPick:0,belly:0,dmg:0,died:0,lv:0,eats:0,heals:0,enemies:0});fl.n++;
     fl.food+=floorItems.filter(f=>isFood(f.item)&&!f.item.shopLot).length;fl.enemies+=enemies.length;st.foodIds=new Set(floorItems.filter(f=>isFood(f.item)&&!f.item.shopLot).map(f=>f.item.id));}
    if(dead){fl.died++;if(process.env.DIAG){const m=logs.slice(-4,-1).join(' / ');const hit=(m.match(/([^\s/！。]+?)の(攻撃|矢|炎|ブレス)/)||[])[1]||m.slice(0,30);const k=hit;agg.killer=agg.killer||{};agg.killer[k]=(agg.killer[k]||0)+1;agg.deadLv=agg.deadLv||[];agg.deadLv.push(player.lv+'/'+player.maxhp+'@'+floorNo+(player.st.sleep>0?'z':'')+(player.st.confuse>0?'c':''));}const last=logs.slice(-3).join('');(/ひもじ/.test(last)?agg.deathHunger++:agg.deathCombat++);break;}
    const t=turn,hp=player.hp,b=belly;if((st.idle||0)>=4){if(process.env.DIAG){const k=(st.lastAct||'?')+'|bag'+inv.length+'|'+(inv.length>=MAXBAG?'full':'')+(itemAt(player.x,player.y)?'onItem':'')+(map[player.y][player.x]===STAIRS?'stairs':'');agg.idle=agg.idle||{};agg.idle[k]=(agg.idle[k]||0)+1;}st.idle=0;st.lastAct='idle-wait';if(menuOpen)uiBack();if(bagOpen)closeBag();if(AllySystem.state.open)AllySystem.hide();if(ShopSystem.state.open)ShopSystem.close();playerMove(0,0);}else think(st);st.idle=turn>t?0:(st.idle||0)+1;
    if(turn>t&&process.env.DIAG){const k=st.lastAct||'?';agg.act=agg.act||{};agg.act[k]=(agg.act[k]||0)+(turn-t);}
    if(turn>t){fl.turns+=turn-t;fl.belly+=Math.max(0,b-belly);if(player.hp<hp)fl.dmg+=hp-player.hp;}
    for(const it of inv)if(st.foodIds.has(it.id)){st.foodIds.delete(it.id);fl.foodPick++;}
    fl.lvSum=(fl.lvSum||0);if(turn===st.t0||!st.lvSeen){st.lvSeen=1;fl.lvSum+=player.lv;}if(turn-st.t0>1500)st.rush=true;if(turn-st.t0>3000){agg.stuck++;break;}
    fl.eats+=0;
   }
   for(const k of Object.keys(agg.floors)){}
   const why=dead?'dead':scene==='town'?(clears>5?'clear':'town'):guard>=30000?'guard':'stuck';agg.why=agg.why||{};agg.why[why]=(agg.why[why]||0)+1;if(why==='guard'&&process.env.DEBUG)console.log('guard',floorNo,turn,player.x,player.y,stairsOpen,menuOpen,bagOpen,logs.slice(-3));
   if(!dead&&scene==='town'&&clears>5)agg.clear++;
   if(dead){deadAt=-1e9;afterDeath();}
   if(scene==='dungeon'){toTown(true);}
  }
  tbl[kit]=agg;
  const pct=v=>(v*100).toFixed(0)+'%';
  console.log(`\n=== ${DUNGEONS[DID].name}／${kit?'鉄の剣・木の盾・回復薬2つで出発':'手ぶらで出発'}／${agg.runs}回 ===`);
  console.log('終わり方',JSON.stringify(agg.why));if(agg.left)console.log('拾い残し',JSON.stringify(agg.left));if(agg.act)console.log('ターンの内訳',JSON.stringify(agg.act));if(agg.killer)console.log('死因',JSON.stringify(Object.entries(agg.killer).sort((a,b)=>b[1]-a[1]).slice(0,14)));if(agg.idle)console.log('止まった直前',JSON.stringify(Object.entries(agg.idle).sort((a,b)=>b[1]-a[1]).slice(0,8)));console.log(`踏破 ${pct(agg.clear/agg.runs)}　死亡：空腹 ${agg.deathHunger}・戦闘 ${agg.deathCombat}　詰まり ${agg.stuck}`);
  console.log('階  到達  その階で死亡  ターン/階  満腹度の消費  食料(床)  食料(拾得)  被ダメージ  敵の数  到着Lv');
  let reach=agg.runs;
  for(const f of Object.keys(agg.floors).map(Number).sort((a,b)=>a-b)){const x=agg.floors[f];
   console.log(`${String(f).padStart(2)}  ${pct(x.n/agg.runs).padStart(4)}  ${pct(x.died/Math.max(1,x.n)).padStart(6)}  ${(x.turns/x.n).toFixed(0).padStart(8)}  ${(x.belly/x.n).toFixed(1).padStart(10)}  ${(x.food/x.n).toFixed(2).padStart(8)}  ${(x.foodPick/x.n).toFixed(2).padStart(9)}  ${(x.dmg/x.n).toFixed(0).padStart(9)}  ${(x.enemies/x.n).toFixed(1).padStart(6)}  ${((x.lvSum||0)/x.n).toFixed(1).padStart(6)}`);}
 }
 render=_render;draw=_draw;
 console.log('\nALL OK: balance simulation finished');
}
