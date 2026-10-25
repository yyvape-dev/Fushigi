// 保存の壺：容量2〜6、名前の（容量）、入れる／出す、保存（倉庫・セーブ・途中保存）、売れない、装備中・壺は入れられない
{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 scene='dungeon';floorNo=3;newFloor();enemies=[];traps=[];floorItems.length=0;inv=[];eqWeapon=eqShield=null;eqRings=[null,null];
 // 1) 容量は2〜6のランダム、名前の後に（数字）
 const caps=new Set();for(let i=0;i<300;i++){const p=mkItem('savepot');assert(p.plus>=3&&p.plus<=5&&Array.isArray(p.pot)&&p.pot.length===0,'capacity 2-6');caps.add(p.plus);}
 assert(caps.size===3,'all capacities 3..5 occur (got '+[...caps].sort()+')');
 known.add('savepot');
 const pot=mkItem('savepot',3);assert(itemName(pot)==='保存の壺（3）','name shows capacity: '+itemName(pot));
 // 2) 持ち物欄から入れる（1ターン）
 inv=[pot,mkItem('potion'),mkItem('bread'),mkItem('sword',1),mkItem('woodshield',0)];eqWeapon=inv[3];
 const turn0=turn;
 openBag();bagAction('potput',ikey(pot));assert(potMode&&potMode.kind==='put','put mode opened');
 const cand=bagGroups().flatMap(g=>g.items);assert(!cand.includes(pot)&&cand.includes(eqWeapon)&&cand.length===4,'candidates exclude pots only, equipped included (got '+cand.length+')');
 potGo(ikey(inv[1]));assert(pot.pot.length===1&&pot.pot[0].type==='potion'&&!inv.some(i=>i.type==='potion'),'potion moved into pot');
 assert(!bagOpen&&!potMode,'bag closes after action');assert(turn>turn0,'put took a turn');
 // 3) 容量いっぱいで入らない
 openBag();bagAction('potput',ikey(pot));potGo(ikey(inv.find(i=>i.type==='bread')));
 openBag();bagAction('potput',ikey(pot));potGo(ikey(inv.find(i=>i.type==='woodshield')));
 assert(pot.pot.length===3,'filled to capacity 3');
 inv.push(mkItem('herb'));openBag();bagAction('potput',ikey(pot));const full=inv.length;potGo(ikey(inv.find(i=>i.type==='herb')));assert(pot.pot.length===3&&inv.length===full,'full pot rejects');closeBag();
 // 4) 保存：倉庫・セーブ文字列の往復で中身が残る
 const enc=encItem(pot);assert(/^savepot:3~/.test(enc),'encoded: '+enc);
 const back=decItem(enc);assert(back.pot.length===3&&back.plus===3&&back.pot.map(i=>i.type).join()===pot.pot.map(i=>i.type).join(),'decode restores contents');
 assert(decItem('savepot:4').pot.length===0,'empty pot decodes');assert(decItem('savepot:2~savepot:3,herb').pot.length===1,'nested pot dropped');
 inv.push(pot);// 5) 出す
 const n0=inv.length;openBag();bagAction('pottake',ikey(pot));assert(potMode&&potMode.kind==='take'&&bagGroups().length===3,'take mode lists contents');
 const first=pot.pot[0];potGo(ikey(first));assert(pot.pot.length===2&&inv.includes(first)&&inv.length===n0+1,'item came out');
 // 6) 持ち物がいっぱいだと出せない
 while(inv.length<MAXBAG)inv.push(mkItem('weed'));openBag();bagAction('pottake',ikey(pot));const left=pot.pot.length;potGo(ikey(pot.pot[0]));assert(pot.pot.length===left,'bag full blocks take');closeBag();
 // 7) 空の壺は出せない／同じ壺が2つあっても別々に扱う
 const e1=mkItem('savepot',2),e2=mkItem('savepot',2);assert(ikey(e1)!==ikey(e2),'pots are never grouped');
 // 8) 町の店では中身入りの壺は売れない
 scene='town';{const want=sellPrice(pot)+pot.pot.reduce((a,c)=>a+sellPrice(c),0);assert(sellFull(pot)===want&&want>sellPrice(pot),'sell price = pot + each content');
  inv=[pot];gold=0;renderWh();shopSell(ikey(pot));assert(!inv.includes(pot)&&gold===want,'pot with contents sold for pot + contents ('+gold+'/'+want+')');}
 const emptyP=mkItem('savepot',2);inv=[emptyP];gold=0;shopSell(ikey(emptyP));assert(!inv.includes(emptyP)&&gold===sellPrice(emptyP),'empty pot sells for the pot only');
 const pot2=mkItem('savepot',3);pot2.pot.push(mkItem('herb'),mkItem('bread'));
 // 9) 床でも中身ごと保たれる（置く→拾う）
 scene='dungeon';newFloor();enemies=[];traps=[];floorItems.length=0;inv=[pot2];const r=rooms[0];player.x=r.cx;player.y=r.cy;dropType(ikey(pot2));
 assert(floorItems.some(f=>f.item===pot2&&f.item.pot.length===2),'pot dropped with contents');
 // 10) 冒険の途中保存→再起動で、持ち物の壺の中身が残る（持ち物・床の両方）
 {localStorage.removeItem(SAVE_KEY);RunSave.clear();gift=true;boot();wh=[];dungeonId='first';enterDungeon();
  const pp=mkItem('savepot',4);pp.pot.push(mkItem('herb'),mkItem('sword',2));inv=[pp];
  const fp=mkItem('savepot',2);fp.pot.push(mkItem('potion'));floorItems.push({x:player.x,y:player.y,item:fp});
  assert(RunSave.save(),'run save written');
  scene='town';inv=[];enemies=[];floorItems=[];map=null;floorShop=null;AllySystem.reset();ShopSystem.reset();alias={};known=new Set();boot();
  const rp=inv.find(i=>i.pot),rf=floorItems.find(f=>f.item.pot);
  assert(rp&&rp.plus===4&&rp.pot.map(i=>i.type).join()==='herb,sword'&&rp.pot[1].plus===2,'bag pot contents survive run save');
  assert(rf&&rf.item.pot.length===1&&rf.item.pot[0].type==='potion','floor pot contents survive run save');
  localStorage.removeItem(SAVE_KEY);RunSave.clear();}
 // 11) 装備中の物を入れる：装備から外れる。足元の物も入れられる
 scene='dungeon';newFloor();enemies=[];traps=[];floorItems.length=0;{const r=rooms[0];player.x=r.cx;player.y=r.cy;}
 {const ringKey=Object.keys(ITEMS).find(k=>ITEMS[k].equip==='ring');
  const p=mkItem('savepot',5),sw=mkItem('sword',1),sh=mkItem('woodshield',0),rg=mkItem(ringKey);inv=[p,sw,sh,rg];eqWeapon=sw;eqShield=sh;eqRings=[rg,null];
  for(const it of [sw,sh,rg]){openBag();bagAction('potput',ikey(p));potGo(ikey(it));}
  assert(p.pot.length===3&&!eqWeapon&&!eqShield&&!eqRings.includes(rg)&&inv.length===1,'equipped items go in and become unequipped');
  const fl=mkItem('herb');floorItems.push({x:player.x,y:player.y,item:fl});openBag();bagAction('potput',ikey(p));
  const g=bagGroups().find(g=>g.floor);assert(g&&g.items[0]===fl,'floor item appears as a candidate');potGo(g.key);
  assert(p.pot.includes(fl)&&!floorItems.some(f=>f.item===fl),'floor item moved into pot');}
 // 12) 未精算の物：壺に入れても未精算のまま。出しても同じ。持ち出すと盗難。精算で全部消える
 {ShopSystem.reset();MW=16;MH=14;map=Array.from({length:MH},()=>Array(MW).fill(WALL));rooms=[{x:2,y:3,w:7,h:7,cx:5,cy:6,role:'shop'}];for(let y=3;y<10;y++)for(let x=2;x<9;x++)map[y][x]=FLOOR;for(let x=9;x<14;x++)map[6][x]=FLOOR;buildRoomGrid();
  floorItems=[];enemies=[];traps=[];inv=[];eqWeapon=eqShield=null;eqRings=[null,null];floorNo=5;gold=5000;floorShop={room:0,x:5,y:6,stock:[]};ShopSystem.setup(0);
  player.x=5;player.y=6;player.vx=5;player.vy=6;floorItems=floorItems.filter(f=>!(f.x===5&&f.y===6));   // 立つ場所に商品が乱数で置かれていた場合は除く
  const own=mkItem('savepot',4);inv=[own];const goods=floorItems.filter(f=>ShopSystem.lot(f.item)).slice(0,2);assert(goods.length===2,'shop has goods');
  const priced=goods.map(f=>ShopSystem.lot(f.item).price),total=priced[0]+priced[1];
  for(const f of goods){f.x=player.x;f.y=player.y;openBag();bagAction('potput',ikey(own));const g=bagGroups().find(g=>g.floor);assert(g,'shop item underfoot is a candidate');potGo(g.key);}
  assert(own.pot.length===2&&ShopSystem.debt()===total,'unpaid contents are billed ('+ShopSystem.debt()+'/'+total+')');
  assert(ShopSystem.owns(own)&&!ShopSystem.unpaid(own),'pot owns shop lots but is not itself a lot');
  openBag();bagAction('pottake',ikey(own));const out=own.pot[0];potGo(ikey(out));assert(ShopSystem.debt()===total&&inv.includes(out),'taking out keeps the bill');
  dropType(ikey(own));assert(ShopSystem.debt()===priced[0],'dropping the pot returns only what is inside it ('+ShopSystem.debt()+'/'+priced[0]+')');
  takeFloor(floorItems.find(f=>f.item===own));openBag();bagAction('potput',ikey(own));potGo(ikey(out));assert(own.pot.length===2&&ShopSystem.debt()===total,'put it back: still billed');
  dropType(ikey(own));assert(ShopSystem.debt()===0,'dropping the full pot inside the shop returns all goods');
  takeFloor(floorItems.find(f=>f.item===own));assert(ShopSystem.debt()===total,'picking the pot up claims contents again');
  assert(ShopSystem.pay()&&gold===5000-total&&ShopSystem.debt()===0,'payment settles pot contents');
  assert(own.pot.every(c=>!c.shopLot)&&!ShopSystem.owns(own),'lots cleared after payment');}
 {ShopSystem.reset();floorItems=[];enemies=[];traps=[];inv=[];floorShop={room:0,x:5,y:6,stock:[]};ShopSystem.setup(0);player.x=5;player.y=6;player.vx=5;player.vy=6;floorItems=floorItems.filter(f=>!(f.x===5&&f.y===6));
  const own=mkItem('savepot',3);inv=[own];const f=floorItems.find(f=>ShopSystem.lot(f.item));f.x=player.x;f.y=player.y;openBag();bagAction('potput',ikey(own));potGo(bagGroups().find(g=>g.floor).key);
  player.x=12;player.y=6;ShopSystem.boundary();assert(floorShop.hostile,'carrying unpaid pot contents out of the shop is theft');}
 // 13) 壺を投げると割れる：壺は消え、中身が近くに散らばる
 {ShopSystem.reset();floorShop=null;scene='dungeon';newFloor();enemies=[];traps=[];floorItems.length=0;{const r=rooms[0];player.x=player.vx=r.cx;player.y=player.vy=r.cy;for(let i=0;i<=6;i++)map[r.cy][r.cx+i]=FLOOR;}
  const tp=mkItem('savepot',3);tp.pot.push(mkItem('herb'),mkItem('potion'),mkItem('sword',1));inv=[tp];player.face=[1,0];openBag();assert(bagActions(bagGroups()[0]).some(a=>a.act==='throw'),'pot has a throw action');
  throwType(ikey(tp));assert(!inv.includes(tp)&&!floorItems.some(f=>f.item===tp),'thrown pot is gone (broken)');
  assert(floorItems.length===3&&['herb','potion','sword'].every(t=>floorItems.some(f=>f.item.type===t)),'contents scattered on the floor ('+floorItems.length+')');
  assert(new Set(floorItems.map(f=>f.x+','+f.y)).size===3,'scattered onto separate tiles');
  assert(tp.pot.length===0,'broken pot is empty');
  floorItems.length=0;const ep=mkItem('savepot',2);inv=[ep];throwType(ikey(ep));assert(!inv.includes(ep)&&floorItems.length===0,'empty pot just breaks');}
 // 14) 店で売る（ダンジョンの店）：壺＋中身それぞれの値段。中身も商品の札が付く
 {ShopSystem.reset();MW=16;MH=14;map=Array.from({length:MH},()=>Array(MW).fill(WALL));rooms=[{x:2,y:3,w:7,h:7,cx:5,cy:6,role:'shop'}];for(let y=3;y<10;y++)for(let x=2;x<9;x++)map[y][x]=FLOOR;buildRoomGrid();
  floorItems=[];enemies=[];traps=[];inv=[];floorNo=5;gold=0;floorShop={room:0,x:5,y:6,stock:[]};ShopSystem.setup(0);floorItems=[];
  const sp=mkItem('savepot',3);sp.pot.push(mkItem('herb'),mkItem('potion'));const want=sellPrice(sp)+sellPrice(sp.pot[0])+sellPrice(sp.pot[1]);
  floorItems.push({x:4,y:6,item:sp});player.x=5;player.y=6;assert(ShopSystem.sell(sp.id),'dungeon shop buys the pot');
  assert(gold===want,'paid pot + contents ('+gold+'/'+want+')');assert(sp.pot.every(c=>ShopSystem.lot(c)),'contents become shop goods');
  floorItems.length=0;}
 console.log('ALL OK: pot capacity/name, put/take, equipped+floor+unpaid contents, bill/return/theft, throw breaks and scatters, sell prices, run save, encode/decode');
}
