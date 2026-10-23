// 合成の壺：同種の装備のみ／取り出せない／投げて割ると1つに合成（強化値の合計・印の和）／保存・売値
{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 scene='dungeon';floorNo=4;newFloor();enemies=[];traps=[];floorItems.length=0;inv=[];eqWeapon=eqShield=null;eqRings=[null,null];
 const r=rooms[0];player.x=r.cx;player.y=r.cy;
 const caps=new Set();for(let i=0;i<300;i++){const p=mkItem('fusepot');assert(p.plus>=2&&p.plus<=6&&p.pot.length===0,'cap 2-6');caps.add(p.plus);}assert(caps.size===5,'all caps');
 const pot=mkItem('fusepot',4);assert(itemName(pot)==='合成の壺（4）','name '+itemName(pot));
 const w1=mkItem('minoaxe',2),w2=mkItem('renkentou',1),w3=mkItem('kamaitachi',0),s1=mkItem('woodshield',1),herb=mkItem('herb');
 inv=[pot,w1,w2,w3,s1,herb];eqWeapon=w1;
 // 候補：装備のみ。最初は武器も盾も可
 openBag();bagAction('potput',ikey(pot));let c=bagGroups().flatMap(g=>g.items);
 assert(c.includes(w1)&&c.includes(s1)&&!c.includes(herb)&&!c.includes(pot),'only weapons/shields offered '+[c.includes(w1),c.includes(s1),c.includes(herb),c.includes(pot),potMode&&potMode.kind]);
 potGo(ikey(w1));assert(pot.pot[0]===w1&&eqWeapon===null,'weapon in, unequipped');
 openBag();bagAction('potput',ikey(pot));c=bagGroups().flatMap(g=>g.items);
 assert(c.includes(w2)&&c.includes(w3)&&!c.includes(s1),'after a weapon only weapons offered');
 potGo(ikey(w2));openBag();bagAction('potput',ikey(pot));potGo(ikey(w3));assert(pot.pot.length===3,'3 weapons in');
 // 取り出せない
 assert(!bagActions({type:'fusepot',key:ikey(pot),items:[pot]}).some(a=>a.act==='pottake'),'no take action');
 openBag();const n=inv.length;bagAction('pottake',ikey(pot));assert(!potMode&&pot.pot.length===3&&inv.length===n,'cannot take out');closeBag();
 // 保存の往復（壺の中身）
 const back=decItem(encItem(pot));assert(back.pot.length===3&&back.type==='fusepot','pot roundtrip');
 // 投げて割る：1つに合成
 inv=[pot];const b=w1;dropType;const x0=player.x,y0=player.y;
 throwType(ikey(pot));
 const all=floorItems.map(f=>f.item).filter(i=>['minoaxe','renkentou','kamaitachi'].includes(i.type));
 assert(all.length===1&&all[0]===w1,'one fused item remains, base = first inserted ('+all.map(i=>i.type)+')');
 assert(w1.plus===3,'plus summed 2+1+0 = '+w1.plus);
 const sl=sealsOf(w1);assert(sl.length===3&&['crit','double','tri'].every(k=>sl.includes(k)),'all seals: '+sl);
 assert(itemName(w1).includes('✦2'),'name shows extra seals '+itemName(w1));
 assert(!floorItems.some(f=>f.item.type==='fusepot'),'pot gone');
 // 印が効く：装備すれば複数の印が同時に有効
 eqWeapon=w1;assert(wHas('crit')&&wHas('double')&&wHas('tri')&&!wHas('fire'),'multi seals active');
 // 保存形式
 const e=encItem(w1);assert(/\^double\+tri$/.test(e),'enc '+e);const d=decItem(e);assert(d.plus===3&&sealsOf(d).length===3&&d.type==='minoaxe','dec roundtrip');
 assert(decItem('herb^crit').seals===undefined,'non-equip ignores seals');
 // 同じ強化値でも印違いはまとめない
 const plain=mkItem('minoaxe',3);assert(ikey(plain)!==ikey(w1),'fused not grouped with plain');
 // 盾どうしも合成
 const sp=mkItem('fusepot',2),a=mkItem('mikiri',1),bb=mkItem('konjo',0);sp.pot.push(a,bb);
 scene='dungeon';inv=[sp];throwType(ikey(sp));
 const sh=floorItems.map(f=>f.item).filter(i=>['mikiri','konjo'].includes(i.type));assert(sh.length===1&&sh[0]===a&&a.plus===1&&sealsOf(a).length===2,'shields fused');
 // 1個だけなら割っても変化なし
 const op=mkItem('fusepot',2),one=mkItem('sword',2);op.pot.push(one);inv=[op];throwType(ikey(op));
 assert(floorItems.some(f=>f.item===one)&&one.plus===2&&!one.seals,'single stays as is');
 // 価格：印で上がる
 assert(priceOf(w1)>priceOf(plain),'seals raise price');
}
console.log('ALL OK');
