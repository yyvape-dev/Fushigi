// 神器：青／金、強化値の補正・印・天然印、床の出現率（5階〜）、保存、雷連撃・状態異常ガード・自己治癒
{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 scene='dungeon';floorNo=6;newFloor();enemies=[];traps=[];floorItems.length=0;inv=[];eqWeapon=eqShield=null;eqRings=[null,null];
 const nat={weapon:['fire','thunder'],shield:['ward','mend']};
 for(let i=0;i<200;i++){
  const b=makeRelic(mkItem('sword',0),'blue'),g=makeRelic(mkItem('sword',0),'gold');
  assert(b.grade==='blue'&&b.plus>=2&&b.plus<=4,'blue plus '+b.plus);
  assert((b.seals||[]).length>=1&&b.seals.length<=2&&b.seals.every(k=>!nat.weapon.includes(k)),'blue seals normal only '+b.seals);
  assert(g.plus>=5&&g.plus<=8&&g.seals.length>=3&&g.seals.length<=4&&g.seals.some(k=>nat.weapon.includes(k)),'gold seals incl. natural '+g.seals);
  assert(new Set(g.seals).size===g.seals.length&&!g.seals.includes(ITEMS.sword.seal),'no duplicate seals');
  const s=makeRelic(mkItem('woodshield',0),'gold');assert(s.seals.some(k=>nat.shield.includes(k))&&s.seals.every(k=>SEAL_NAMES[k]),'shield seals '+s.seals);
 }
 assert(makeRelic(mkItem('herb'),'gold').grade===undefined,'non-equip not relic');
 // 出現率：5階未満は出ない、5階〜は青約4%・金約1%
 floorNo=4;let n=0;for(let i=0;i<3000;i++)if(mkLoot('sword').grade)n++;assert(n===0,'no relic below 5F');
 floorNo=6;let bl=0,gd=0;for(let i=0;i<20000;i++){const t=mkLoot('sword');if(t.grade==='blue')bl++;if(t.grade==='gold')gd++;}
 assert(bl>500&&bl<1100&&gd>100&&gd<320,'rates blue '+bl+' gold '+gd);
 assert(mkLoot('herb').grade===undefined,'herb never');
 // 表示・価格・保存
 const r=makeRelic(mkItem('sword',0),'gold');assert(itemName(r).startsWith('◆'),'gold mark '+itemName(r));assert(itemName(makeRelic(mkItem('sword',0),'blue')).startsWith('◇'),'blue mark');
 assert(priceOf(r)>priceOf(mkItem('sword',r.plus)),'relic costs more');
 const e=encItem(r);const d=decItem(e);assert(d.grade==='gold'&&d.plus===r.plus&&sealsOf(d).join()===sealsOf(r).join(),'roundtrip '+e);
 assert(decItem('sword:2!b').grade==='blue'&&decItem('sword:2').grade===undefined,'decode grade');
 assert(decItem('sword:2!x').grade===undefined,'bad grade ignored');
 // 雷連撃：確率で対象と周囲に追加ダメージ
 const a=makeRelic(mkItem('sword',0),'blue');a.seals=['thunder'];eqWeapon=a;
 const rm=rooms[0];player.x=rm.cx;player.y=rm.cy;
 let thundered=0;
 // 敵をその場に作る
 const mk=(x,y)=>({kind:Object.keys(ENEMIES)[0],x,y,vx:x,vy:y,hp:999,maxhp:999,st:{sleep:0},aware:true,face:[1,0]});
 for(let i=0;i<150;i++){const t1=mk(player.x+1,player.y),t2=mk(player.x+2,player.y);enemies=[t1,t2];t1.hp=t2.hp=999;strikeOne(t1,false);if(t2.hp<999)thundered++;}
 assert(thundered>15&&thundered<90,'thunder chains to neighbor ~30% ('+thundered+'/150)');
 // 状態異常ガード・自己治癒
 const sh=mkItem('woodshield',0);sh.seals=['ward'];eqShield=sh;player.st.invinc=0;let blocked=0;for(let i=0;i<400;i++){player.st.confuse=0;if(!addStatus('confuse',5))blocked++;}
 assert(blocked>140&&blocked<260,'ward blocks ~50% ('+blocked+')');
 enemies=[];sh.seals=['mend'];player.maxhp=50;belly=maxBelly();player.hp=10;const t0=turn;for(let i=0;i<20;i++)endTurn();assert(player.hp>=10+4,'mend heals extra (hp '+player.hp+')');
 // 合成しても神器・印は残る
 const pot=mkItem('fusepot',3);const x1=makeRelic(mkItem('sword',0),'gold');pot.pot.push(x1,mkItem('minoaxe',1));inv=[pot];throwType(ikey(pot));
 assert(x1.grade==='gold'&&x1.plus>=6&&sealsOf(x1).includes('crit'),'fusion keeps grade and adds seals');
 console.log('ALL OK');
}
