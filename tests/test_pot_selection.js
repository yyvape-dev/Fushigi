// Exercise the displayed action and the touch/keyboard confirm path after checking rows.
{
 let checks=0;const assert=(v,m)=>{checks++;if(!v)throw Error(m);};
 const reset=()=>{
  EventVfx.reset();closeBag();closeGameMenu();ShopSystem.reset();floorShop=null;
  scene='dungeon';dungeonId='first';floorNo=3;turn=0;dead=false;enemies=[];traps=[];floorItems=[];
  eqWeapon=eqShield=null;eqRings=[null,null];player.st=newStatus();player.hp=player.maxhp=100;belly=100;
 };
 const check=it=>bagClick({target:{closest:selector=>selector==='[data-act]'?{dataset:{act:'pottoggle',type:'item:'+it.id}}:null}});
 const confirm=()=>{bagKey('Enter');bagKey('Enter');};
 for(const method of ['confirm','click']){
  reset();const pot=mkItem('fusepot',4),spare=mkItem('bread'),base=mkItem('sword',2),material=mkItem('kamaitachi',1);
  inv=[pot,spare,base,material];potOpen(pot,'put');check(base);check(material);
  assert(potMode.selected.size===2&&turn===0,'checking rows spends no turns');
  const g=bagGroups().find(g=>g.key===bagSel),action=bagActions(g)[0];
  if(method==='confirm')confirm();else bagAction(action.act,action.type);
  assert(inv.includes(spare),'unchecked cursor item must stay in inventory ('+method+')');
  assert(pot.pot.length===1&&pot.pot[0]===base&&base.plus===3&&sealsOf(base).includes('tri'),'checked weapons fuse into first checked base ('+method+')');
  assert(!inv.includes(base)&&!inv.includes(material)&&PotSystem.free(pot)===2&&turn===1,'exactly checked items consume two slots and one turn');
 }
 // Selecting, deselecting and changing category must preserve the exact checked objects.
 reset();let pot=mkItem('savepot',4),spare=mkItem('bread'),a=mkItem('potion'),b=mkItem('potion');
 inv=[pot,spare,a,b];potOpen(pot,'put');check(a);check(b);check(a);bagTab=ITEMS[b.type].cat;renderBag();
 confirm();assert(inv.includes(a)&&inv.includes(spare)&&!inv.includes(b)&&pot.pot[0]===b,'identical items remain distinct after deselection/filtering');
 // Full capacity rejects the entire checked batch, without silently inserting the cursor item.
 reset();pot=mkItem('fusepot',1);a=mkItem('sword',1);b=mkItem('sword',2);spare=mkItem('bread');inv=[pot,spare,a,b];
 potOpen(pot,'put');check(a);check(b);confirm();
 assert(inv.includes(a)&&inv.includes(b)&&inv.includes(spare)&&!pot.pot.length&&turn===0,'capacity failure changes nothing');
 // Without checkmarks, the primary action still inserts the focused item.
 reset();pot=mkItem('savepot',3);a=mkItem('bread');inv=[pot,a];potOpen(pot,'put');confirm();
 assert(pot.pot[0]===a&&turn===1,'single-item confirm remains available without checkmarks');
 // Removal has the same checked-versus-focused semantics.
 reset();pot=mkItem('savepot',4);spare=mkItem('bread');a=mkItem('potion');b=mkItem('herb');pot.pot=[spare,a,b];inv=[pot];
 potOpen(pot,'take');bagAction('pottoggle','inside:'+a.id);bagAction('pottoggle','inside:'+b.id);confirm();
 assert(pot.pot.length===1&&pot.pot[0]===spare&&inv.includes(a)&&inv.includes(b)&&turn===1,'removal confirms checked items instead of cursor item');
 console.log('ALL OK: '+checks+' pot selection UI assertions');
}
