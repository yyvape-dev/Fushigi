// 保存の壺：容量2〜6、名前の（容量）、入れる／出す、保存（倉庫・セーブ・途中保存）、売れない、装備中・壺は入れられない
{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 scene='dungeon';floorNo=3;newFloor();enemies=[];traps=[];floorItems.length=0;inv=[];eqWeapon=eqShield=null;eqRings=[null,null];
 // 1) 容量は2〜6のランダム、名前の後に（数字）
 const caps=new Set();for(let i=0;i<300;i++){const p=mkItem('savepot');assert(p.plus>=2&&p.plus<=6&&Array.isArray(p.pot)&&p.pot.length===0,'capacity 2-6');caps.add(p.plus);}
 assert(caps.size===5,'all capacities 2..6 occur (got '+[...caps].sort()+')');
 const pot=mkItem('savepot',3);assert(itemName(pot)==='保存の壺（3）','name shows capacity: '+itemName(pot));
 // 2) 持ち物欄から入れる（1ターン）
 inv=[pot,mkItem('potion'),mkItem('bread'),mkItem('sword',1),mkItem('woodshield',0)];eqWeapon=inv[3];
 const turn0=turn;
 openBag();bagAction('potput',ikey(pot));assert(potMode&&potMode.kind==='put','put mode opened');
 const cand=bagGroups().flatMap(g=>g.items);assert(!cand.includes(pot)&&!cand.includes(eqWeapon)&&cand.length===3,'candidates exclude pot and equipped (got '+cand.length+')');
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
 scene='town';inv=[pot];renderWh();shopSell(ikey(pot));assert(inv.includes(pot),'pot with contents not sold');
 const emptyP=mkItem('savepot',2);inv=[emptyP];gold=0;shopSell(ikey(emptyP));assert(!inv.includes(emptyP)&&gold>0,'empty pot can be sold');
 // 9) 床でも中身ごと保たれる（置く→拾う）
 scene='dungeon';newFloor();enemies=[];traps=[];floorItems.length=0;inv=[pot];const r=rooms[0];player.x=r.cx;player.y=r.cy;dropType(ikey(pot));
 assert(floorItems.some(f=>f.item===pot&&f.item.pot.length===2),'pot dropped with contents');
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
 console.log('ALL OK: pot capacity 2-6 and name, put/take with turn, full/empty/bag-full rules, encode/decode, no nesting, never grouped, shop sell guard, drop keeps contents');
}
