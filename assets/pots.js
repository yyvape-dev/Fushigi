// Pot catalog, effects and source-aware transactions. Item art stays categorical.
(function(root){
 'use strict';
 const definitions={
  savepot:['保存の壺',[3,5],800,2,2,'store','自由に出し入れでき、中の道具を直接使える。'],
  identpot:['識別の壺',[3,5],800,.8,2,'identify','入れた道具の正体が分かる。取り出すには割る。'],
  changepot:['変化の壺',[3,5],800,.7,3,'change','入れた道具が別の道具に変わる。取り出すには割る。'],
  cashpot:['換金の壺',[3,5],1000,.6,3,'cash','入れた道具が売値に応じたギタンに変わる。'],
  fusepot:['合成の壺',[3,4],6000,.9,3,'fuse','同種の武器・盾、同じ種類の杖を入れると、その場で合成。取り出すには割る。'],
  uncursepot:['おはらいの壺',[2,4],1600,.6,3,'uncurse','入れた道具の呪いを解く。'],
  cursepot:['呪いの壺',[2,4],1600,.5,3,'curse','入れた道具が呪われる。'],
  strengthenpot:['強化の壺',[2,3],10000,.2,5,'strengthen','次の階へ進むと中の装備・杖・矢・ギタンを強化。効果発動時に割れることがある。'],
  weakenpot:['弱化の壺',[2,3],10000,.25,5,'weaken','次の階へ進むと中の装備・杖・矢・ギタンを弱化。効果発動時に割れることがある。'],
  bottomlesspot:['底抜けの壺',[2,4],1000,.4,3,'bottomless','入れた道具がなくなる。割ると周囲に落とし穴ができる。'],
  handpot:['手封じの壺',[3,5],1000,.4,3,'hand','入れると手が抜けず、武器と道具が使えない。攻撃して割るか次の階へ進むと解除。'],
  unbreakablepot:['割れない壺',[3,5],1000,.4,3,'unbreakable','投げても割れない。中身は吸い出しの巻物で回収できる。生物に当てると中身ごと消える。'],
  hidepot:['やりすごしの壺',[3,5],800,.6,2,'hide','自分が入ると20ターン敵に気づかれない。敵に当てると刺激を受けるまで閉じ込める。'],
  backpot:['背中の壺',[3,5],2000,.6,3,'back','押すとHP・低下したちから・悪い状態が回復する。'],
  todopot:['トドの壺',[3,5],2000,.5,3,'todo','押すと前方の道具を壺の中へ回収する。'],
  waterpot:['水鉄砲の壺',[3,5],2000,.6,3,'water','押すと正面3マスへ水を噴射。敵に5ダメージ、炎の敵や大砲には特別な効果。'],
  laughpot:['笑いの壺',[2,3],2000,.5,3,'laugh','押すと正面の敵を笑わせ、しばらく行動できなくする。'],
  monsterpot:['魔物の壺',[3,5],2000,.4,3,'monster','押すと残り回数ぶんの魔物が周囲に現れる。'],
  surprisepot:['ビックリの壺',[3,5],2000,.4,4,'surprise','割ると道具・混乱した魔物・爆発のいずれかが起こる。']
 };
 const pushEffects=new Set(['back','todo','water','laugh','monster']);
 function register(){
  for(const [key,[name,capacity,basePrice,w,from,effect,desc]]of Object.entries(definitions)){
   ITEMS[key]={name,capacity,basePrice,w,from,effect,cat:'壺',ch:'壺',fg:'#c8a070',pot:true,unid:true,fuse:effect==='fuse',pushPot:pushEffects.has(effect),use:()=>false,desc};
  }
  ITEMS.extractscroll={name:'吸い出しの巻物',cat:'巻物',ch:'≡',fg:'#ffe9a0',w:.7,from:3,unid:true,potTarget:true,desc:'持ち物か足元の壺を1つ選び、中身を足元の周囲へ取り出す。壺は残る。',use:()=>false};
  ITEMS.uncursescroll={name:'おはらいの巻物',cat:'巻物',ch:'≡',fg:'#ffe9a0',w:.8,from:2,unid:true,desc:'装備中の物と壺の中身を含め、持ち物の呪いをすべて解く。',use(){let n=0;for(const it of inv)for(const c of [it,...(it.pot||[])])if(c.cursed){c.cursed=false;n++;}say(n?`${n}個の道具の呪いが解けた！`:'呪われた道具はなかった。');return true;}};
 }
 const free=pot=>Math.max(0,pot.plus-(ITEMS[pot.type].pushPot?0:(pot.potUsed??pot.pot.length)));
 const currentFloor=()=>Math.max(1,floorNo||1);
 function init(pot){if(['strengthen','weaken'].includes(ITEMS[pot.type].effect))pot.potFloor=currentFloor();return pot;}
 function blocked(){if(player?.st?.handbound){say('手が壺から抜けず、道具を使えない！');return true;}if(player?.st?.hidden){say('壺の中でやりすごしている。足踏みで待とう。');return true;}return false;}
 function locked(it){return !!(it?.cursed&&isEq(it));}
 function canRemove(it){if(locked(it)){say('呪われていて外せない！');return false;}return true;}
 function compatible(a,b){const d=ITEMS[a.type],e=ITEMS[b.type];return (d.equip==='weapon'||d.equip==='shield')?d.equip===e.equip:d.staff&&a.type===b.type;}
 function allowed(pot,it){return !!(pot&&it&&pot!==it&&!it.pot&&!ITEMS[pot.type].pushPot&&ITEMS[pot.type].effect!=='hide');}
 function source(key,container=null){
  if(container){const it=container.pot.find(i=>ikey(i)===key||'inside:'+i.id===key);return it?{item:it,list:container.pot,container}:null;}
  if(key?.startsWith('floor:')){const f=scene==='dungeon'?itemAt(player.x,player.y):null;return f&&('floor:'+ikey(f.item)===key)?{item:f.item,floor:f}:null;}
  const it=inv.find(i=>ikey(i)===key||'item:'+i.id===key);return it?{item:it,list:inv}:null;
 }
 const reachable=pot=>inv.includes(pot)||(scene==='dungeon'&&itemAt(player.x,player.y)?.item===pot);
 function detach(s){
  if(s.floor){const i=floorItems.indexOf(s.floor);if(i<0)return false;floorItems.splice(i,1);ShopSystem.pickup(s.item);}
  else {const i=s.list.indexOf(s.item);if(i<0)return false;s.list.splice(i,1);if(s.container)s.container.potUsed=Math.max(0,(s.container.potUsed??s.list.length+1)-1);}
  if(eqWeapon===s.item)eqWeapon=null;if(eqShield===s.item)eqShield=null;eqRings=eqRings.map(r=>r===s.item?null:r);belly=Math.min(belly,maxBelly());return true;
 }
 function insert(pot,it){
  const effect=ITEMS[pot.type].effect;pot.potUsed=(pot.potUsed??pot.pot.length)+1;
  if(effect==='bottomless'){ShopSystem.consume(it);identify(pot.type);say(`${itemName(it)}が壺の底へ消えた。`);return;}
  if(effect==='identify'){if(identify(it.type))identify(pot.type);}
  if(effect==='change'){
   const choices=Object.keys(ITEMS).filter(k=>ITEMS[k].w>0&&!ITEMS[k].pot&&k!==it.type&&(ITEMS[k].from||1)<=currentFloor()+2);
   ShopSystem.consume(it);it=mkItem(choices[rnd(0,choices.length-1)]||'weed');identify(pot.type);say('壺の中で別の道具に変わった！');
  }else if(effect==='cash'){const value=sellPrice(it);ShopSystem.consume(it);it=mkItem('gold',value);identify(pot.type);say(`${value}ギタンに変わった！`);}
  else if(effect==='curse'||effect==='uncurse'){
   const curse=effect==='curse';if(!!it.cursed!==curse){it.cursed=curse;identify(pot.type);say(curse?'道具が呪われた！':'呪いが解けた！');}
  }
  if(effect==='fuse'){
   const base=pot.pot.find(a=>compatible(a,it)&&!ShopSystem.unpaid(a)&&!ShopSystem.unpaid(it));
   if(base){fuseItems([base,it]);identify(pot.type);playSE('fuse');say(`${itemName(base)}に合成された！`);return;}
  }
  pot.pot.push(it);
  if(effect==='store')identify(pot.type);
  if(effect==='hand'){
   identify(pot.type);player.st.handbound=1;player.boundPot=pot;eqWeapon=null;
   const f=scene==='dungeon'?floorItems.find(f=>f.item===pot):null;
   if(f){floorItems.splice(floorItems.indexOf(f),1);ShopSystem.pickup(pot);if(inv.length<MAXBAG)inv.push(pot);}
   say('壺から手が抜けなくなった！');
  }
 }
 function finish(){saveGame();closeBag();if(scene==='dungeon')endTurn();else render();}
 function put(pot,sources){
  if(blocked()||!reachable(pot)||pot.cursed){if(pot.cursed)say('壺が呪われていて使えない！');return false;}
  if(!sources.length||new Set(sources.map(s=>s?.item?.id)).size!==sources.length)return false;
  if(free(pot)<sources.length){say('壺の空きが足りない。選択を減らそう。');return false;}
  if(ITEMS[pot.type].effect==='hand'&&sources.length>1){say('手封じの壺には1個ずつ入れよう。');return false;}
  if(sources.some(s=>!s||!allowed(pot,s.item)||!canRemove(s.item)||!(s.floor?floorItems.includes(s.floor)&&s.floor.item===s.item&&s.floor.x===player.x&&s.floor.y===player.y:s.list===inv&&inv.includes(s.item))))return false;
  for(const s of sources){const name=itemName(s.item);detach(s);insert(pot,s.item);say(`${name}を壺に入れた。`);}
  if(!inv.includes(pot)&&!player.st.handbound)ShopSystem.landed(pot,player.x,player.y);
  playSE('container');return true;
 }
 function take(pot,items){
  if(blocked()||!reachable(pot)||ITEMS[pot.type].effect!=='store')return false;
  if(!items.length||new Set(items.map(i=>i.id)).size!==items.length||items.some(it=>!pot.pot.includes(it)))return false;
  // Preflight all bag slots without changing stacks or charging shop merchandise.
  let slots=inv.length;const stacks=new Set(inv.filter(i=>ITEMS[i.type].stack).map(i=>i.type+':'+(i.shopLot||'')+':'+!!i.cursed));
  for(const it of items){if(it.type==='gold')continue;const k=it.type+':'+(it.shopLot||'')+':'+!!it.cursed;if(ITEMS[it.type].stack&&stacks.has(k))continue;slots++;if(ITEMS[it.type].stack)stacks.add(k);}
  if(slots>MAXBAG){say('持ち物の空きが足りず取り出せない。');return false;}
  for(const it of items){pot.pot.splice(pot.pot.indexOf(it),1);pot.potUsed=Math.max(0,(pot.potUsed??pot.pot.length+1)-1);ShopSystem.pickup(it);if(it.type==='gold'){gold+=it.plus;ShopSystem.consume(it);}else inv.push(it);say(`${itemName(it)}を取り出した。`);}
  inv=mergeStacks(inv);playSE('container');return true;
 }
 function pots(){const list=[...inv];const f=scene==='dungeon'?itemAt(player.x,player.y):null;if(f?.item.pot)list.push(f.item);return [...new Set(list.filter(i=>i.pot))];}
 function destinations(it){return pots().filter(p=>allowed(p,it));}
 function selectedSources(){if(!potMode)return [];return [...potMode.selected].map(k=>source(k)).filter(Boolean);}
 function chooseDestination(s){if(blocked()||!s)return;potMode={kind:'destination',source:s,selected:new Set()};bagSel=null;bagActionMode=false;bagTab='全部';if(!bagOpen)openBag();else renderBag();}
 function open(pot,kind){
  if(!pot?.pot||!reachable(pot))return;
  const d=ITEMS[pot.type];
  if(kind==='put'&&d.pushPot){push(pot);return;}
  if(kind==='put'&&d.effect==='hide'){hide(pot);return;}
  if(kind==='take'&&d.effect!=='store'){say('この壺は割らないと取り出せない。');renderBag();return;}
  if((kind==='take'||kind==='view')&&!pot.pot.length){say('壺は空だ。');renderBag();return;}
  potMode={pot,kind,selected:new Set()};bagSel=null;bagActionMode=false;bagActionIndex=0;bagTab='全部';if(!bagOpen)openBag();else renderBag();
 }
 function groupsForMode(){
  if(!potMode)return groups(inv);
  if(potMode.kind==='destination'||potMode.kind==='extract')return (potMode.kind==='extract'?pots():destinations(potMode.source.item)).map(p=>({key:inv.includes(p)?ikey(p):'floor:'+ikey(p),type:p.type,items:[p],floor:!inv.includes(p)}));
  if(potMode.kind==='take'||potMode.kind==='view')return potMode.pot.pot.map(i=>({key:'inside:'+i.id,type:i.type,items:[i]}));
  const gs=inv.filter(i=>allowed(potMode.pot,i)).map(i=>({key:'item:'+i.id,type:i.type,items:[i]}));
  const f=scene==='dungeon'?itemAt(player.x,player.y):null;if(f&&allowed(potMode.pot,f.item))gs.push({key:'floor:'+ikey(f.item),type:f.item.type,items:[f.item],floor:true});return gs;
 }
 function go(key,batch=false){
  if(!potMode)return;const mode=potMode,keys=batch?[...mode.selected]:[key];let ok=false;
  if(mode.kind==='destination'){const p=source(key)?.item;if(p)ok=put(p,[mode.source]);}
  else if(mode.kind==='extract'){const p=source(key)?.item;if(p&&reachable(p)&&mode.source&&reachableSource(mode.source)){if(blocked()||mode.source.item.cursed)return;ShopSystem.consume(mode.source.item);detach(mode.source);extract(p);identify('extractscroll');ok=true;}}
  else if(mode.kind==='put'){const sources=keys.map(k=>source(k));if(sources.every(Boolean))ok=put(mode.pot,sources);}
  else if(mode.kind==='take'||(mode.kind==='view'&&ITEMS[mode.pot.type].effect==='store')){const items=keys.map(k=>source(k,mode.pot)?.item);if(items.every(Boolean))ok=take(mode.pot,items);}
  if(ok)finish();else if(bagOpen)renderBag();
 }
 const reachableSource=s=>s&&(s.floor?floorItems.includes(s.floor)&&s.floor.x===player.x&&s.floor.y===player.y:s.container?reachable(s.container)&&s.container.pot.includes(s.item):inv.includes(s.item));
 function toggle(key){if(!potMode?.selected)return;if(potMode.selected.has(key))potMode.selected.delete(key);else potMode.selected.add(key);renderBag();}
 function bindAttack(){if(!player.st.handbound)return;if(Math.random()<.25){const p=player.boundPot;player.st.handbound=0;delete player.boundPot;if(p){const i=inv.indexOf(p);if(i>=0)inv.splice(i,1);breakPot(p,player.x,player.y);}say('手にはまった壺が割れた！');}}
 function hide(pot){if(blocked()||!reachable(pot)||pot.cursed)return;identify(pot.type);ShopSystem.consume(pot);const s=inv.includes(pot)?{item:pot,list:inv}:{item:pot,floor:itemAt(player.x,player.y)};detach(s);player.st.hidden=21;say('壺の中に入った。20ターンやりすごす。');finish();}
 function ray(n){const [dx,dy]=player.face,out=[];let x=player.x,y=player.y;for(let i=0;i<n;i++){if(!geomOK(x,y,dx,dy))break;x+=dx;y+=dy;out.push({x,y,enemy:enemyAt(x,y),keeper:ShopSystem.at(x,y)});}return out;}
 function summon(x,y,n,confuse=false){let count=0;for(let r=1;r<=3&&count<n;r++)for(let dy=-r;dy<=r&&count<n;dy++)for(let dx=-r;dx<=r&&count<n;dx++){
  if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const xx=x+dx,yy=y+dy;
  if(!inb(xx,yy)||map[yy][xx]!==FLOOR||enemyAt(xx,yy)||AllySystem.at(xx,yy)||ShopSystem.at(xx,yy)||(xx===player.x&&yy===player.y))continue;
  const e=spawnEnemy(xx,yy,true);e.sum=true;e.spawnTurn=turn;if(confuse)e.st.confuse=15;count++;
 }return count;}
 function push(pot){
  if(blocked()||!reachable(pot)||!ITEMS[pot.type].pushPot)return false;
  if(pot.cursed){say('壺が呪われていて使えない！');return false;}if(pot.plus<=0){say('もう押しても何も起こらない。');return false;}
  const effect=ITEMS[pot.type].effect;ShopSystem.consume(pot,true);identify(pot.type);
  if(effect==='back'){pot.plus--;player.hp=player.maxhp;cureBad();atkUp=Math.max(0,atkUp);playSE('heal');say('HPとちから、悪い状態が回復した！');}
  else if(effect==='todo'){
   pot.plus--;const f=ray(8).map(c=>itemAt(c.x,c.y)).find(f=>f&&!f.item.pot);
   if(f){floorItems.splice(floorItems.indexOf(f),1);ShopSystem.pickup(f.item);pot.pot.push(f.item);playSE('pickup');say(`トドが${itemName(f.item)}を取ってきた！`);}else say('トドは道具を見つけられず消えた。');
  }else if(effect==='monster'){const n=pot.plus;pot.plus=0;say(`${summon(player.x,player.y,n)}体の魔物が現れた！`);}
  else {pot.plus--;const cells=ray(effect==='water'?3:1);let hit=false;
   for(const c of cells){if(c.keeper){ShopSystem.hit(effect==='water'?5:0,c.keeper);hit=true;break;}const e=c.enemy;if(!e)continue;hit=true;
    if(effect==='laugh'){if(!eT(e).boss){e.st.laugh=8;e.aware=true;say(`${eT(e).name}は笑いだした！`);}else say('主には効かなかった。');}
    else {const T=eT(e);if(MonsterCombat.isCannon(T)){e.st.cool=Math.max(e.st.cool||0,8);say('大砲がぬれて、しばらく撃てない！');}const dmg=T.ai==='breath'?10:5;zapHit(e,dmg,'水鉄砲');}break;
   }if(!hit)say(effect==='water'?'水が前方へ飛んだ。':'だれも笑わなかった。');
  }
  playSE('container');finish();return true;
 }
 function extract(pot){
  const used=pot.potUsed??pot.pot.length,items=pot.pot.splice(0);pot.potUsed=ITEMS[pot.type].effect==='store'?0:used;
  for(const it of items)if(!dropAt(player.x,player.y,it)){ShopSystem.consume(it);say(`${itemName(it)}は置き場がなく失われた。`);}
  if(ITEMS[pot.type].effect==='bottomless')pits(player.x,player.y);say(`${items.length}個の中身を吸い出した。`);
 }
 function openExtract(s){if(blocked()||!s)return;potMode={kind:'extract',source:s,selected:new Set()};bagSel=null;bagActionMode=false;bagTab='全部';if(!bagOpen)openBag();else renderBag();}
 function pits(x,y){if(floorNo>=DUNGEONS[dungeonId].floors){say('この階には落とし穴を作れない。');return;}for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(inb(xx,yy)&&map[yy][xx]===FLOOR&&!trapAt(xx,yy))traps.push({x:xx,y:yy,kind:'pit',seen:true});}}
 function broken(pot,x,y){
  const effect=ITEMS[pot.type].effect;
  if(effect==='bottomless'){identify(pot.type);pits(x,y);}
  if(effect==='surprise'){
   identify(pot.type);const r=rnd(0,2);
   if(r===0){for(let i=0;i<pot.plus;i++)dropAt(x,y,mkItem(rollType()));say('壺から道具が飛び出した！');}
   else if(r===1){summon(x,y,pot.plus,true);say('混乱した魔物が飛び出した！');}
   else {for(const e of [...enemies])if(Math.max(Math.abs(e.x-x),Math.abs(e.y-y))<=1&&!eT(e).boss)killEnemy(e,true);if(Math.max(Math.abs(player.x-x),Math.abs(player.y-y))<=1&&player.st.invinc<=0)player.hp=Math.max(1,Math.min(player.hp,1));vfxShake(6,350);playSE('cannon');say('壺が大爆発した！');}
  }
 }
 function throwImpact(pot,target,x,y){
  const effect=ITEMS[pot.type].effect;
  if(effect==='unbreakable'){
   identify(pot.type);if(target){ShopSystem.consume(pot);say('壺は中身ごと消えた。');}else if(!dropAt(x,y,pot))ShopSystem.consume(pot);else say('壺は割れずに転がった。');return true;
  }
  if(effect==='hide'&&target&&!target.shopkeeper&&!eT(target).boss&&Math.random()<ACC.t){identify(pot.type);target.st.sealed=1;target.aware=false;ShopSystem.consume(pot);say(`${eT(target).name}を壺に閉じ込めた！`);return true;}
  return false;
 }
 function floorChanged(){
  if(player.st.handbound){player.st.handbound=0;const p=player.boundPot;delete player.boundPot;if(p&&!inv.includes(p)){if(inv.length<MAXBAG)inv.push(p);else dropAt(player.x,player.y,p);}say('壺から手が抜けた。');}
  player.st.hidden=0;
  for(const pot of [...inv].filter(i=>i.pot)){
   const old=pot.potFloor;pot.potFloor=currentFloor();if(old===undefined||currentFloor()<=old)continue;
   const effect=ITEMS[pot.type].effect;if(!['strengthen','weaken'].includes(effect))continue;const up=effect==='strengthen';let changed=false,limit=false;
   pot.potUsed??=pot.pot.length;
   for(const it of [...pot.pot]){
    const d=ITEMS[it.type];if(d.equip==='weapon'||d.equip==='shield'||d.staff){const old=it.plus,low=d.staff?0:-(d.equip==='weapon'?d.atk:d.def);it.plus=up?Math.min(99,old+1):Math.min(old,Math.max(low,old-2));changed||=old!==it.plus;limit||=up?it.plus>=99:it.plus<=low;}
    else if(d.stack||it.type==='gold'){const old=it.plus,high=it.type==='gold'?9999:99;it.plus=up?Math.min(high,Math.ceil(old*1.15)):Math.max(1,Math.floor(old*.7));changed||=old!==it.plus;limit||=up?it.plus>=high:it.plus<=1;}
   }
   if(changed||limit){identify(pot.type);say(`壺の中の道具が${up?'強化':'弱化'}された。`);if(limit||Math.random()<.15){inv.splice(inv.indexOf(pot),1);breakPot(pot,player.x,player.y);}}
  }
 }
 function enemyHiddenStep(e){
  if(!player.st.hidden)return false;e.aware=false;
  const [dx,dy]=DIRS8[rnd(0,7)],x=e.x+dx,y=e.y+dy;
  if(geomOK(e.x,e.y,dx,dy)&&!enemyAt(x,y)&&!AllySystem.at(x,y)&&!ShopSystem.at(x,y)&&!(x===player.x&&y===player.y)){e.x=x;e.y=y;}return true;
 }
 function revivalSource(){for(const i of inv){if(i.type==='reviveherb'&&!i.cursed)return {item:i,list:inv};for(const c of i.pot||[])if(c.type==='reviveherb'&&!c.cursed)return {item:c,list:i.pot,container:i};}return null;}
 function metadata(it){const m={};for(const k of ['cursed','potUsed','potFloor'])if(it[k]!==undefined&&!(k==='cursed'&&!it.cursed)&&!(k==='potUsed'&&it.potUsed===it.pot.length))m[k]=it[k];return Object.keys(m).length?'@'+encodeURIComponent(JSON.stringify(m)):'';}
 function restoreMeta(it,text){try{const m=JSON.parse(decodeURIComponent(text));if(m.cursed===true)it.cursed=true;if(it.pot){if(Number.isFinite(m.potUsed))it.potUsed=Math.max(0,Math.min(it.plus,m.potUsed));if(Number.isFinite(m.potFloor))it.potFloor=m.potFloor;}}catch(_){}return it;}
 root.PotSystem={definitions,register,free,init,blocked,locked,canRemove,compatible,allowed,source,reachable,put,take,pots,destinations,chooseDestination,open,groupsForMode,go,toggle,finish,bindAttack,hide,push,extract,openExtract,broken,throwImpact,floorChanged,enemyHiddenStep,metadata,restoreMeta,revivalSource};
})(typeof window==='undefined'?globalThis:window);
