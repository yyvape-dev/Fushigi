// 冒険の途中保存（assets/run-save.js）：保存→再起動で同じ場面から再開／抜け道の封鎖／力尽きた後の扱い。tests/harness.js 経由で実行
{
 let passed=0;const ok=(v,m)=>{if(!v)throw Error('NG '+m);passed++;};
 const types=a=>a.map(it=>it.type+':'+(it.plus??'')).sort().join(',');
 const fresh=()=>{localStorage.removeItem(SAVE_KEY);RunSave.clear();gift=true;boot();};

 // --- 1. 出発して3階へ。持ち物・装備・識別・仲間・店の未精算を作ってから保存し、再起動で戻るか
 fresh();
 wh=[];inv=[mkItem('sword',2),mkItem('woodshield',1),mkItem('onigiri')];gold=300;saveGame();
 dungeonId='second';enterDungeon();
 ok(scene==='dungeon'&&floorNo===1,'entered the dungeon');
 ok(RunSave.has(),'a floor entry writes the run save');
 const departure=types(inv);
 toggleEquip(inv[0]);toggleEquip(inv[1]);
 let shopFloor=false;
 for(let n=0;n<300&&!shopFloor;n++){floorNo=3;newFloor();shopFloor=!!floorShop;}
 ok(shopFloor,'found a floor with a shop');
 const lotGood=floorItems.find(f=>f.item.shopLot);
 floorItems.splice(floorItems.indexOf(lotGood),1);inv.push(lotGood.item);ShopSystem.pickup(lotGood.item);
 const picked=mkItem('potion');inv.push(picked);                  // 道中で拾った物
 const unidK=Object.keys(ITEMS).find(k=>ITEMS[k].unid);identify(unidK);
 const a=AllySystem.make(rooms[0].x,rooms[0].y,'avenius');a.following=true;AllySystem.state.actor=a;AllySystem.state.used=true;
 player.hp=17;player.lv=4;player.exp=55;belly=63;turn=321;gold=777;
 if(enemies[0])enemies[0].hp=1;
 const before={floorNo,turn,hp:player.hp,lv:player.lv,belly,gold,px:player.x,py:player.y,map:JSON.stringify(map),enemies:enemies.map(e=>e.kind+'@'+e.x+','+e.y+':'+e.hp).join('|'),
  items:floorItems.map(f=>f.item.type+'@'+f.x+','+f.y).join('|'),inv:types(inv),debt:ShopSystem.debt(),alias:JSON.stringify(alias),known:[...known].sort().join(),shopRoom:floorShop.room,keepers:floorShop.keepers.length,ally:a.kind+'@'+a.x+','+a.y};
 ok(before.debt>0,'unpaid shop goods create a debt');
 saveGame();                                                       // 冒険中の普通の保存（装備の付け替えなどで呼ばれる）
 ok(RunSave.save(),'run save written');

 // 再起動（ページの再読み込みと同じ：boot から）
 scene='town';inv=[];enemies=[];floorItems=[];map=null;floorShop=null;AllySystem.reset();ShopSystem.reset();alias={};known=new Set();
 boot();
 ok(scene==='dungeon','reboot resumes inside the dungeon');
 ok(floorNo===before.floorNo&&turn===before.turn,'same floor and turn');
 ok(player.hp===before.hp&&player.lv===before.lv&&belly===before.belly&&gold===before.gold,'same hp, level, belly and gold');
 ok(player.x===before.px&&player.y===before.py,'same position');
 ok(JSON.stringify(map)===before.map,'same terrain');
 ok(enemies.map(e=>e.kind+'@'+e.x+','+e.y+':'+e.hp).join('|')===before.enemies,'same enemies');
 ok(floorItems.map(f=>f.item.type+'@'+f.x+','+f.y).join('|')===before.items,'same floor items');
 ok(types(inv)===before.inv,'same bag');
 ok(eqWeapon&&inv.includes(eqWeapon)&&eqWeapon.type==='sword'&&eqShield&&inv.includes(eqShield),'equipped items are the same objects as bag items');
 ok(ShopSystem.debt()===before.debt,'shop debt survives');
 ok(inv.some(it=>it.shopLot&&ShopSystem.unpaid(it)),'unpaid goods in the bag stay linked to the shop ledger');
 ok(floorShop&&floorShop.room===before.shopRoom&&floorShop.keepers.length===before.keepers,'shop and keepers survive');
 ok(JSON.stringify(alias)===before.alias&&[...known].sort().join()===before.known,'unidentified names and identified kinds survive');
 const ra=AllySystem.state.actor;ok(ra&&ra.kind+'@'+ra.x+','+ra.y===before.ally&&ra.following,'following ally survives');
 ok(ra.issenUsed instanceof WeakSet,'ally per-enemy record is rebuilt');
 ok(!player.walkEnd&&!player.action,'no half-finished animation after resume');
 let err=null;try{for(let i=0;i<5;i++)endTurn();render();}catch(e){err=e;}ok(!err,'game keeps running after resume: '+(err&&err.stack));
 ok(mkItem('onigiri').id>Math.max(...inv.map(it=>it.id)),'new item ids do not collide with restored ones');

 // --- 2. 抜け道：冒険保存が無くなっても、道中で拾った物は町へ持ち帰れない
 RunSave.clear();boot();
 ok(scene==='town','without a run save the game starts in town');
 ok(types(inv)===departure,'bag is the one from departure, not the one from mid-run: '+types(inv));

 // --- 3. 力尽きたまま閉じた：次の起動で持ち物と所持金を失う
 fresh();inv=[mkItem('sword',1)];gold=500;saveGame();const d0=deaths;
 enterDungeon();inv.push(mkItem('potion'));
 player.hp=0;dead=true;RunSave.save();
 boot();
 ok(scene==='town'&&inv.length===0&&gold===0&&deaths===d0+1,'closing while dead counts as a death');
 ok(!RunSave.has(),'run save removed after the death is applied');

 // --- 4. 町へ戻ると冒険保存は消える（踏破・脱出）
 fresh();enterDungeon();ok(RunSave.has(),'run save exists during the run');
 clearDungeon();ok(!RunSave.has()&&scene==='town','clearing the dungeon removes the run save');

 // --- 5. 壊れた保存は捨てて町から
 fresh();inv=[mkItem('onigiri')];saveGame();enterDungeon();
 localStorage.setItem(RunSave.KEY,'{"v":1,"state":{"root":{"$r":0},"table":[{"t":"o","v":{}}]}}');
 boot();ok(scene==='town'&&!RunSave.has()&&types(inv)==='onigiri:','a broken run save falls back to town with the departure bag');

 // --- 6. 保存の大きさ（localStorage の上限5MBに対して十分小さいこと）
 fresh();enterDungeon();for(let i=0;i<3;i++){floorNo++;newFloor();}
 const size=localStorage.getItem(RunSave.KEY).length;ok(size<400000,'run save is small: '+size);

 console.log('ALL OK: '+passed+' run-save checks: resume floor/bag/equip/shop debt/aliases/ally, departure bag without run save, death on reload, cleared on town, broken save fallback, size '+size+' chars');
}
