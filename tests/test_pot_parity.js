// Behavioral regression for the complete pot catalog and all item source directions.
{
 let checks=0;const assert=(v,m)=>{checks++;if(!v)throw Error(m);};
 const reset=()=>{
  EventVfx.reset();closeBag();closeGameMenu();ShopSystem.reset();floorShop=null;scene='dungeon';dungeonId='first';floorNo=3;turn=0;dead=false;inv=[];floorItems=[];enemies=[];traps=[];eqWeapon=eqShield=null;eqRings=[null,null];atkUp=0;belly=100;
  DungeonNPC.reset();MW=16;MH=14;map=Array.from({length:MH},(_,y)=>Array.from({length:MW},(_,x)=>x&&y&&x<MW-1&&y<MH-1?FLOOR:WALL));rooms=[{x:1,y:1,w:14,h:12,cx:8,cy:7}];buildRoomGrid();
  player.x=player.vx=5;player.y=player.vy=6;player.face=[1,0];player.hp=player.maxhp=100;player.st=newStatus();delete player.boundPot;player.swing=0;player.action=null;player.walkEnd=0;player.lv=1;player.exp=0;
  vis=Array.from({length:MH},()=>Array(MW).fill(true));seen=vis.map(r=>r.slice());
 };
 const put=(pot,...items)=>{inv=[pot,...items];potOpen(pot,'put');for(const g of bagGroups())PotSystem.toggle(g.key);const before=turn;bagAction('potbatch','');assert(turn===before+1,'batch takes one world turn');};
 reset();
 assert(Object.values(ITEMS).filter(d=>d.pot).length===19,'19 pots: 21 native types minus two requested exclusions');
 assert(!Object.values(ITEMS).some(d=>['ただの壺','倉庫の壺'].includes(d.name)),'excluded types absent');
 for(const [key,d]of Object.entries(ITEMS).filter(([,d])=>d.pot)){
  const a=mkItem(key);assert(a.plus>=d.capacity[0]&&a.plus<=d.capacity[1]&&Array.isArray(a.pot),key+' native capacity');
  const b=decItem(encItem(a));assert(b.type===a.type&&b.plus===a.plus,key+' save roundtrip');
 }
 known.delete('identpot');shuffleAliases();assert(!isKnown('identpot')&&!dispName('identpot').includes('識別'),'pots use shuffled unknown names');
 // Two identical objects must be selectable separately and moved in one turn.
 reset();let pot=mkItem('savepot',4),a=mkItem('potion'),b=mkItem('potion');put(pot,a,b);
 assert(pot.pot.length===2&&pot.pot[0]===a&&pot.pot[1]===b&&inv.length===1,'distinct same-type items selected independently');
 potOpen(pot,'take');for(const g of bagGroups())PotSystem.toggle(g.key);const t=turn;bagAction('potbatch','');assert(turn===t+1&&inv.includes(a)&&inv.includes(b)&&PotSystem.free(pot)===4,'batch removal restores storage capacity');
 reset();pot=mkItem('savepot',1);a=mkItem('herb');b=mkItem('bread');inv=[pot,a,b];potOpen(pot,'put');for(const g of bagGroups())PotSystem.toggle(g.key);bagAction('potbatch','');
 assert(inv.includes(a)&&inv.includes(b)&&!pot.pot.length&&turn===0,'over-capacity batch rejects atomically');
 assert(!PotSystem.put(pot,[{item:a,list:inv},{item:a,list:inv}])&&!pot.pot.length,'duplicate source cannot duplicate items');
 // Full bag: insert a carried item into a pot on the ground, without picking up the pot.
 reset();pot=mkItem('savepot',3);a=mkItem('bread');inv=[a,...Array.from({length:MAXBAG-1},()=>mkItem('weed'))];const fp={x:5,y:6,item:pot};floorItems=[fp];
 useType(ikey(pot),fp);assert(potMode?.pot===pot,'floor pot opens directly');potGo(ikey(a));assert(pot.pot.includes(a)&&floorItems[0]===fp&&inv.length===MAXBAG-1&&!inv.includes(pot),'ground pot accepts held item with full bag');
 // Floor source -> carried pot, including gold.
 reset();pot=mkItem('savepot',3);a=mkItem('gold',70);inv=[pot];floorItems=[{x:5,y:6,item:a}];potOpen(pot,'put');potGo(bagGroups().find(g=>g.floor).key);
 assert(pot.pot[0]===a&&!floorItems.length,'gold underfoot can be stored');gold=0;potOpen(pot,'take');potGo(ikey(a));assert(gold===70&&!pot.pot.length,'stored gold can be withdrawn');
 // Reverse entry point: item -> destination pot, no slot or turn spent selecting.
 reset();pot=mkItem('savepot',3);a=mkItem('herb');inv=[pot,a];bagAction('potstore',ikey(a));assert(potMode.kind==='destination'&&turn===0,'destination chooser is free');potGo(ikey(pot));assert(pot.pot[0]===a&&turn===1,'item can choose a target pot');
 // Direct use from a full inventory, also when the parent pot is on the floor.
 for(const floor of [false,true]){
  reset();pot=mkItem('savepot',4);a=mkItem('potion');pot.pot=[a];inv=Array.from({length:MAXBAG-(floor?0:1)},()=>mkItem('weed'));if(floor)floorItems=[{x:5,y:6,item:pot}];else inv.push(pot);player.hp=20;
  potOpen(pot,'view');bagAction('potuse','inside:'+a.id);assert(player.hp>20&&!pot.pot.length&&turn===1,'consume directly from '+(floor?'floor':'carried')+' storage with full bag');
 }
 reset();pot=mkItem('savepot',3);a=mkItem('potion');pot.pot=[a];inv=[pot];player.hp=10;quick='potion';useQuick();assert(player.hp>10&&!pot.pot.length,'quick use finds medicine inside carried storage');
 reset();pot=mkItem('savepot',3);a=mkItem('firestaff',3);pot.pot=[a];inv=[pot];useType(ikey(a),null,pot);assert(pot.pot[0]===a&&a.plus===2&&turn===1,'staff remains inside and loses one charge');
 reset();pot=mkItem('savepot',3);a=mkItem('arrow',3);pot.pot=[a];inv=[pot];throwType(ikey(a),null,pot);assert(a.plus===2&&pot.pot[0]===a&&turn===1,'throw one arrow directly from pot');
 reset();pot=mkItem('savepot',3);a=mkItem('reviveherb');pot.pot=[a];inv=[pot];player.hp=0;assert(!checkDeath('test')&&pot.pot[0].type==='weed'&&player.hp===player.maxhp,'revival works inside a pot without consuming a bag slot');
 // Failure must not remove or bill a contained item.
 reset();pot=mkItem('savepot',3);a=mkItem('kaguwashi');pot.pot=[a];inv=[pot];useType(ikey(a),null,pot);assert(pot.pot.includes(a)&&turn===0,'refused consumable stays inside without a turn');
 reset();pot=mkItem('identpot',3);a=mkItem('potion');pot.pot=[a];inv=[pot];player.hp=20;useType(ikey(a),null,pot);assert(pot.pot.includes(a)&&player.hp===20&&turn===0,'non-storage pot contents cannot be directly used');
 reset();pot=mkItem('identpot',3);a=mkItem('weed');inv=[pot,a];known.delete('identpot');potOpen(pot,'put');potGo(ikey(a));assert(!isKnown('identpot'),'already-known input does not reveal an identification pot');
 // Insertion effects and spent slots.
 reset();pot=mkItem('identpot',3);a=mkItem('firestaff',4);known.delete('firestaff');put(pot,a);assert(isKnown('firestaff')&&pot.pot.includes(a),'identify on insertion');
 reset();pot=mkItem('changepot',3);a=mkItem('weed');put(pot,a);assert(pot.pot.length===1&&pot.pot[0]!==a&&pot.pot[0].type!=='weed','transformation yields a different non-pot item');
 reset();pot=mkItem('cashpot',3);a=mkItem('sword',1);const price=sellPrice(a);put(pot,a);assert(pot.pot[0].type==='gold'&&pot.pot[0].plus===price,'conversion uses actual sale price');
 reset();pot=mkItem('bottomlesspot',2);a=mkItem('herb');put(pot,a);assert(!pot.pot.length&&PotSystem.free(pot)===1,'bottomless deletion consumes a slot');const bottom=decItem(encItem(pot));assert(PotSystem.free(bottom)===1,'deleted contents do not restore slots on reload');breakPot(pot,7,7);assert(traps.filter(t=>t.kind==='pit').length===9,'bottomless creates visible pit traps on break');
 reset();pot=mkItem('cursepot',3);a=mkItem('sword',1);put(pot,a);assert(a.cursed&&decItem(encItem(a)).cursed,'curse survives encoding');inv=[a];eqWeapon=a;assert(!toggleEquip(a)&&eqWeapon===a,'cursed equipment cannot be removed');dropType(ikey(a));assert(inv.includes(a)&&eqWeapon===a,'cursed equipped gear cannot be dropped');
 reset();pot=mkItem('uncursepot',3);a=mkItem('herb');a.cursed=true;put(pot,a);assert(!a.cursed,'purification removes curse');
 // Floor transition effects trigger once; no changes on redraw/same floor or reload.
 for(const [type,delta]of [['strengthenpot',1],['weakenpot',-2]]){
  reset();pot=mkItem(type,3);a=mkItem('sword',3);b=mkItem('firestaff',4);const arrows=mkItem('arrow',10);pot.pot=[a,b,arrows];inv=[pot];const old=Math.random;Math.random=()=>.9;
  try{PotSystem.floorChanged();assert(a.plus===3,'no same-floor effect');floorNo++;PotSystem.floorChanged();assert(a.plus===3+delta&&b.plus===4+delta&&arrows.plus===(delta>0?12:7),'equipment, staff, stack floor effect');PotSystem.floorChanged();assert(a.plus===3+delta,'no repeated floor effect');const restored=decItem(encItem(pot));assert(restored.potFloor===floorNo,'floor marker survives encoding');}finally{Math.random=old;}
 }
 reset();pot=mkItem('strengthenpot',3);a=mkItem('sword',0);pot.pot=[a];inv=[pot];floorNo++;{const old=Math.random;Math.random=()=>0;try{PotSystem.floorChanged();}finally{Math.random=old;}}assert(!inv.includes(pot)&&floorItems.some(f=>f.item===a)&&a.plus===1,'spontaneous break scatters enhanced contents');
 reset();pot=mkItem('strengthenpot',3);a=mkItem('arrow',98);pot.pot=[a];inv=[pot];floorNo++;PotSystem.floorChanged();assert(a.plus===99&&!inv.includes(pot)&&floorItems.some(f=>f.item===a),'native upper limit forces break without losing stack');
 reset();pot=mkItem('weakenpot',3);a=mkItem('gold',2);pot.pot=[a];inv=[pot];floorNo++;PotSystem.floorChanged();assert(a.plus===1&&!inv.includes(pot),'native lower limit forces break and preserves one gold');
 // Push pots and their charge counts.
 reset();pot=mkItem('backpot',3);inv=[pot];player.hp=2;atkUp=-3;player.st.confuse=8;PotSystem.push(pot);assert(player.hp===100&&atkUp===0&&player.st.confuse===0&&pot.plus===2&&turn===1,'back pot restores health, strength and status');
 reset();pot=mkItem('todopot',3);a=mkItem('herb');inv=[pot];floorItems=[{x:7,y:6,item:a}];PotSystem.push(pot);assert(pot.pot[0]===a&&!floorItems.length&&pot.plus===2,'todo retrieves forward item');
 reset();pot=mkItem('waterpot',2);inv=[pot];let e=spawnEnemy(8,6,true,'slime');e.hp=e.maxhp=50;e.st.sleep=20;PotSystem.push(pot);assert(e.hp===45&&pot.plus===1,'water reaches three cells and deals five');
 reset();pot=mkItem('waterpot',2);inv=[pot];e=spawnEnemy(9,6,true,'slime');e.hp=e.maxhp=50;e.st.sleep=20;PotSystem.push(pot);assert(e.hp===50,'water does not exceed three cells');
 reset();pot=mkItem('laughpot',2);inv=[pot];e=spawnEnemy(6,6,true,'slime');const hp=player.hp;PotSystem.push(pot);assert(e.st.laugh>0&&player.hp===hp&&pot.plus===1,'laugh prevents adjacent enemy action');
 reset();pot=mkItem('monsterpot',3);inv=[pot];PotSystem.push(pot);assert(enemies.length===3&&pot.plus===0&&enemies.every(e=>e.sum),'monster pot consumes all remaining charges once');
 reset();pot=mkItem('backpot',0);inv=[pot];assert(!PotSystem.push(pot)&&turn===0,'empty push pot is a free failure');
 // Hand sealing, floor release and surprise outcomes.
 reset();pot=mkItem('handpot',3);a=mkItem('herb');put(pot,a);assert(player.st.handbound===1&&player.boundPot===pot,'hand stays bound across the turn');const drink=mkItem('potion');inv.push(drink);useType(ikey(drink));assert(inv.includes(drink),'bound hand blocks use');floorNo++;PotSystem.floorChanged();assert(!player.st.handbound,'next floor releases hand');
 reset();pot=mkItem('hidepot',3);inv=[pot];e=spawnEnemy(6,6,true,'slime');const before=player.hp;PotSystem.hide(pot);assert(player.st.hidden===20&&player.hp===before&&!inv.includes(pot),'hide consumes pot and prevents targeting');const px=player.x;playerMove(1,0);assert(player.x===px&&player.st.hidden===19,'hidden movement waits without moving');floorItems=[{x:player.x,y:player.y,item:mkItem('herb')}];playerPickUp();assert(floorItems.length===1&&player.st.hidden===18,'hidden pickup waits without taking floor items');
 reset();pot=mkItem('hidepot',3);inv=[pot];e=spawnEnemy(6,6,true,'slime');{const old=Math.random;Math.random=()=>0;try{throwType(ikey(pot));}finally{Math.random=old;}}assert(e.st.sealed===1,'thrown hide pot seals enemy');zapHit(e,1,'test');assert(!e.st.sealed,'damage releases sealed enemy');
 reset();pot=mkItem('unbreakablepot',3);a=mkItem('herb');pot.pot=[a];inv=[pot];throwType(ikey(pot));assert(floorItems.some(f=>f.item===pot)&&pot.pot[0]===a,'unbreakable pot bounces with contents');
 reset();pot=mkItem('unbreakablepot',3);a=mkItem('herb');pot.pot=[a];inv=[pot];spawnEnemy(6,6,true,'slime');throwType(ikey(pot));assert(!floorItems.some(f=>f.item===pot||f.item===a),'unbreakable pot disappears on living target');
 for(const roll of [0,.4,.9]){reset();pot=mkItem('surprisepot',3);const old=Math.random;Math.random=()=>roll;try{breakPot(pot,5,6);}finally{Math.random=old;}assert(roll===0?floorItems.length===3:roll===.4?enemies.length===3:player.hp===1,'all surprise outcomes implemented');}
 // Escape hatch for unbreakable pots, including a scroll inside the target itself.
 reset();pot=mkItem('unbreakablepot',3);a=mkItem('sword',1);pot.pot=[a];const scroll=mkItem('extractscroll');inv=[pot,scroll];useType(ikey(scroll));assert(potMode.kind==='extract'&&turn===0,'extract scroll opens target chooser');potGo(ikey(pot));assert(inv.includes(pot)&&!inv.includes(scroll)&&!pot.pot.length&&floorItems.some(f=>f.item===a)&&turn===1,'extract keeps pot and releases contents');
 reset();pot=mkItem('savepot',3);const selfScroll=mkItem('extractscroll');a=mkItem('herb');pot.pot=[selfScroll,a];inv=[pot];useType(ikey(selfScroll),null,pot);potGo(ikey(pot));assert(!pot.pot.length&&floorItems.length===1&&floorItems[0].item===a,'contained extraction scroll cannot duplicate itself');
 reset();pot=mkItem('savepot',3);a=mkItem('bread');inv=[pot,a];potOpen(pot,'put');bagKey(' ');assert(potMode.selected.size===1,'keyboard space selects an item');bagKey('Escape');assert(!potMode&&inv.includes(a)&&turn===0,'cancel does not move or spend a turn');
 reset();a=mkItem('sword',2);a.cursed=true;eqWeapon=a;const purify=mkItem('uncursescroll');inv=[a,purify];useType(ikey(purify));assert(!a.cursed&&toggleEquip(a)&&!eqWeapon,'purification scroll releases cursed equipped gear');
 reset();pot=mkItem('identpot',3);pot.pot=[mkItem('herb')];pot=decItem(encItem(pot));PotSystem.extract(pot);assert(PotSystem.free(pot)===2,'extraction after reload does not restore spent non-storage slots');
 // An owned ground pot returns unpaid contents to the shop; direct use bills only the content.
 reset();floorShop={room:0,x:8,y:7,stock:[]};ShopSystem.setup(0);const goods=floorItems.find(f=>f.item.type==='potion').item,lotPrice=ShopSystem.lot(goods).price;
 floorItems=floorItems.filter(f=>f.item!==goods);ShopSystem.pickup(goods);pot=mkItem('savepot',3);floorItems.push({x:5,y:6,item:pot});inv=[goods];
 potOpen(pot,'put');potGo(ikey(goods));assert(ShopSystem.debt()===0&&pot.pot.includes(goods),'ground pot in shop returns unused merchandise');player.hp=10;useType(ikey(goods),null,pot);assert(ShopSystem.debt()===lotPrice&&!pot.pot.length,'direct use from ground pot bills consumed merchandise');
 reset();floorShop={room:0,x:8,y:7,stock:[]};ShopSystem.setup(0);const merchandise=floorItems.find(f=>f.item.type==='potion').item,owed=ShopSystem.lot(merchandise).price;floorItems=floorItems.filter(f=>f.item!==merchandise);ShopSystem.pickup(merchandise);pot=mkItem('changepot',3);inv=[pot,merchandise];potOpen(pot,'put');potGo(ikey(merchandise));assert(ShopSystem.debt()===owed&&ShopSystem.lot(merchandise).used,'transformation keeps original merchandise debt');
 reset();floorShop={room:0,x:8,y:7,stock:[]};ShopSystem.setup(0);const owned=mkItem('sword',1),unpaid=mkItem('sword',2);unpaid.shopLot=++ShopSystem.state.serial;ShopSystem.state.lots.set(unpaid.shopLot,{item:unpaid,price:700,used:false,claimed:true});pot=mkItem('fusepot',3);inv=[pot,owned,unpaid];potOpen(pot,'put');PotSystem.toggle('item:'+owned.id);PotSystem.toggle('item:'+unpaid.id);bagAction('potbatch','');assert(pot.pot.length===2&&owned.plus===1&&ShopSystem.debt()===700,'unpaid equipment cannot disappear into a fused output');
 reset();pot=mkItem('bottomlesspot',3);a=mkItem('herb');inv=[pot,a];potOpen(pot,'put');potGo(ikey(a));const saved=encItem(pot);assert(decItem(saved).potUsed===1&&PotSystem.free(decItem(saved))===2,'spent empty pot state survives warehouse encoding');
 assert(RunSave.save(),'snapshot saves new pot metadata');const id=pot.id;inv=[];assert(RunSave.restore()===true&&inv.some(i=>i.id===id&&i.potUsed===1),'run save restores consumed capacity and identity');RunSave.clear();
 reset();assert(WeaponGlow.palettes.kamaitachi.period>=6000&&WeaponGlow.palettes.skyblade.period>=6000&&WeaponGlow.palettes.firesword.period>=6000,'all three blade glow cycles are slow');
 console.log('ALL OK: '+checks+' pot parity assertions');
}
