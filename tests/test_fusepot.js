// Shiren 6 parity: immediate synthesis, consumed slots, staffs, mixed items and ledger.
{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 scene='dungeon';floorNo=4;newFloor();enemies=[];traps=[];floorItems=[];inv=[];eqWeapon=eqShield=null;eqRings=[null,null];known.add('fusepot');
 const caps=new Set(Array.from({length:200},()=>mkItem('fusepot').plus));assert(caps.size===2&&caps.has(3)&&caps.has(4),'native capacity 3-4');
 const pot=mkItem('fusepot',4),w1=mkItem('minoaxe',2),w2=mkItem('renkentou',1),w3=mkItem('kamaitachi',0);inv=[pot,w1,w2,w3];eqWeapon=w1;
 for(const w of [w1,w2,w3]){potOpen(pot,'put');potGo(ikey(w));}
 assert(pot.pot.length===1&&pot.pot[0]===w1&&w1.plus===3,'fusion occurs at insertion, base is first');
 assert(eqWeapon===null&&PotSystem.free(pot)===1,'unequipped and three slots consumed despite one output');
 assert(sealsOf(w1).length===3&&['crit','double','tri'].every(s=>sealsOf(w1).includes(s)),'union of seals');
 const back=decItem(encItem(pot));assert(back.pot.length===1&&PotSystem.free(back)===1&&sealsOf(back.pot[0]).length===3,'save retains used slots and seals');
 potOpen(pot,'take');assert(!potMode&&!bagActions({type:pot.type,key:ikey(pot),items:[pot]}).some(a=>a.act==='pottake'),'no manual removal');
 inv=[pot];throwType(ikey(pot));assert(floorItems.some(f=>f.item===w1)&&w1.plus===3,'breaking releases already-fused output without double fusion');
 const staffPot=mkItem('fusepot',3),a=mkItem('firestaff',3),b=mkItem('firestaff',5),c=mkItem('blowstaff',2);inv=[staffPot,a,b,c];
 for(const it of [a,b,c]){potOpen(staffPot,'put');potGo(ikey(it));}
 assert(a.plus===8&&staffPot.pot.length===2&&staffPot.pot.includes(c)&&PotSystem.free(staffPot)===0,'same staff adds charges, different staff stays separate, slots consumed');
 const mixed=mkItem('fusepot',4),weapon=mkItem('sword',1),shield=mkItem('woodshield',2),food=mkItem('bread');inv=[mixed,weapon,shield,food];
 for(const it of [weapon,shield,food]){potOpen(mixed,'put');potGo(ikey(it));}assert(mixed.pot.length===3&&weapon.plus===1&&shield.plus===2,'mixed/unfusable items occupy their own slots');
 // Incompatible legacy contents must not get combined when the pot breaks.
 inv=[mixed];throwType(ikey(mixed));assert(floorItems.some(f=>f.item===weapon)&&floorItems.some(f=>f.item===shield)&&floorItems.some(f=>f.item===food),'mixed contents scatter individually');
 console.log('ALL OK: immediate synthesis, staffs, mixed contents, spent capacity and old/new save roundtrip');
}
