// 冒険の途中保存：階に入るたび、そして画面を離れるとき（アプリの切り替え・タブを閉じる・再読み込み）に、
// ダンジョンの状態を丸ごと保存する。起動時に残っていれば、その階のその場面から再開する。
// 町に戻ると（踏破・力尽きた・脱出）消える。力尽きたまま閉じた場合は、次の起動で「力尽きた」として扱う。
(function(root){
 const KEY='fushigi_run_save_v1',V=1;
 // 時刻（performance.now）に依存する演出用の値は保存しない。再読み込みで時計が0に戻るため
 const SKIP=new Set(['flash','walkStart','walkEnd','attackStart','castStart','swing','monsterAttackStart','monsterWalkStart','monsterWalkEnd','bump','action']);

 // 同じ物を複数の場所から指す（装備中の武器＝持ち物の1個、店の帳簿の品＝床の品など）ので、参照ごと保存する
 function encode(value){
  const ids=new Map(),table=[];
  const enc=v=>{
   if(v===undefined||typeof v==='function'||typeof v==='symbol')return undefined;
   if(typeof v==='number')return Number.isFinite(v)?v:{$n:String(v)};
   if(v===null||typeof v!=='object')return v;
   if(ids.has(v))return {$r:ids.get(v)};
   const id=table.length;ids.set(v,id);table.push(null);
   const proto=Object.getPrototypeOf(v);let rec;
   if(Array.isArray(v))rec={t:'a',v:v.map(x=>{const e=enc(x);return e===undefined?null:e;})};
   else if(v instanceof Map)rec={t:'m',v:[...v].map(([k,x])=>{const e=enc(x);return [enc(k),e===undefined?null:e];})};
   else if(v instanceof Set)rec={t:'s',v:[...v].map(x=>{const e=enc(x);return e===undefined?null:e;})};
   else if(typeof WeakSet!=='undefined'&&v instanceof WeakSet)rec={t:'ws'};   // 中身は取り出せない。空で作り直す（仲間の一閃の使用済み記録など）
   else if(typeof WeakMap!=='undefined'&&v instanceof WeakMap)rec={t:'wm'};
   else if(proto===Object.prototype||proto===null){const o={};for(const k of Object.keys(v)){if(SKIP.has(k))continue;const e=enc(v[k]);if(e!==undefined)o[k]=e;}rec={t:'o',v:o};}
   else rec={t:'x'};                                             // 画像・キャンバスなどは保存しない（null になる）
   table[id]=rec;return {$r:id};
  };
  return {root:enc(value),table};
 }
 function decode(data){
  const objs=data.table.map(r=>r.t==='a'?[]:r.t==='m'?new Map():r.t==='s'?new Set():r.t==='o'?{}:r.t==='ws'?new WeakSet():r.t==='wm'?new WeakMap():null);
  const dec=v=>v&&typeof v==='object'?('$r' in v?objs[v.$r]:'$n' in v?Number(v.$n):v):v;
  data.table.forEach((r,i)=>{const o=objs[i];
   if(r.t==='a')for(const x of r.v)o.push(dec(x));
   else if(r.t==='m')for(const [k,x] of r.v)o.set(dec(k),dec(x));
   else if(r.t==='s')for(const x of r.v)o.add(dec(x));
   else if(r.t==='o')for(const k of Object.keys(r.v))o[k]=dec(r.v[k]);});
  return dec(data.root);
 }

 function snapshot(){
  return {dungeonId,floorNo,turn,MW,MH,map,rooms,roomGrid,floorPlan,floorShop,player,enemies,floorItems,traps,inv,eqWeapon,eqShield,eqRings,gold,
   belly,bellyWarn,bellyBonus,atkUp,floorLight,hasteFlip,alias,known,seen,logs,uid,zapDir,quick,
   ally:{actor:AllySystem.state.actor,used:AllySystem.state.used},
   shop:{wanted:ShopSystem.state.wanted,serial:ShopSystem.state.serial,lots:ShopSystem.state.lots},
   security:{active:ShopSecurity.state.active,nextWave:ShopSecurity.state.nextWave,spawnIndex:ShopSecurity.state.spawnIndex},
   history:msgHistory.slice(-80)};
 }
 function save(){
  if(scene!=='dungeon')return false;
  try{
   const body=dead?{v:V,dead:true,dungeonId,floorNo}:{v:V,at:Date.now(),state:encode(snapshot())};
   localStorage.setItem(KEY,JSON.stringify(body));return true;
  }catch(_){return false;}
 }
 function clear(){try{localStorage.removeItem(KEY);}catch(_){}}
 function has(){try{return !!localStorage.getItem(KEY);}catch(_){return false;}}

 // 戻り値：true=ダンジョンを再開した／'dead'=力尽きたまま閉じていた（持ち物を失った）／false=保存なし・壊れていた
 function restore(){
  let body=null;try{body=JSON.parse(localStorage.getItem(KEY)||'null');}catch(_){body=null;}
  if(!body)return false;
  if(body.v!==V){clear();return false;}
  if(body.dead){inv=[];eqWeapon=eqShield=null;eqRings=[null,null];gold=0;deaths++;clear();saveGame();return 'dead';}
  try{
   const s=decode(body.state);
   if(!s||!Array.isArray(s.map)||!Array.isArray(s.rooms)||!s.player)throw Error('broken run save');
   scene='dungeon';dungeonId=s.dungeonId;floorNo=s.floorNo;turn=s.turn;MW=s.MW;MH=s.MH;
   map=s.map;rooms=s.rooms;roomGrid=s.roomGrid;floorPlan=s.floorPlan;floorShop=s.floorShop;
   player=s.player;enemies=s.enemies||[];floorItems=s.floorItems||[];traps=s.traps||[];
   inv=s.inv||[];eqWeapon=s.eqWeapon||null;eqShield=s.eqShield||null;eqRings=Array.isArray(s.eqRings)?s.eqRings:[null,null];gold=s.gold|0;
   belly=s.belly;bellyWarn=s.bellyWarn;bellyBonus=s.bellyBonus;atkUp=s.atkUp;floorLight=!!s.floorLight;hasteFlip=!!s.hasteFlip;
   alias=s.alias||{};known=s.known instanceof Set?s.known:new Set();seen=s.seen;logs=s.logs||[];uid=Math.max(uid,s.uid|0);
   if(Array.isArray(s.zapDir))zapDir=s.zapDir;if(s.quick!==undefined)quick=s.quick;
   AllySystem.state.actor=s.ally?.actor||null;AllySystem.state.used=!!s.ally?.used;
   ShopSystem.state.wanted=!!s.shop?.wanted;ShopSystem.state.serial=s.shop?.serial|0;ShopSystem.state.lots.clear();
   if(s.shop?.lots instanceof Map)for(const [k,v] of s.shop.lots)ShopSystem.state.lots.set(k,v);
   Object.assign(ShopSecurity.state,{active:!!s.security?.active,nextWave:s.security?.nextWave|0,spawnIndex:s.security?.spawnIndex|0});
   if(Array.isArray(s.history)){msgHistory.length=0;msgHistory.push(...s.history);}
   // 演出の途中だった値は捨てる（保存していない）。歩き・攻撃の動きは止まった状態から再開
   const still=e=>{if(!e)return;e.flash=0;e.bump=null;e.action=null;e.walkEnd=0;e.walkStart=0;};
   [player,...enemies,...(floorShop?.keepers||[]),AllySystem.state.actor].forEach(still);
   dead=false;
   return true;
  }catch(e){
   clear();loadGame();                                           // 壊れていたら出発時の持ち物で町から
   return false;
  }
 }
 function init(){
  // 画面を離れるたびに保存（スマホのアプリ切り替え・タブを閉じる・再読み込み）
  try{root.addEventListener?.('pagehide',save);}catch(_){}
  try{document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='hidden')save();});}catch(_){}
 }
 root.RunSave={KEY,save,clear,has,restore,encode,decode,init};
 init();
})(typeof window==='undefined'?globalThis:window);
