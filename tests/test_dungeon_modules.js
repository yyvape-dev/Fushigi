// Run through tests/harness.js to exercise the actual game composition.
{
 const assert=(value,message)=>{if(!value)throw Error(message);};
 let shops=0,houses=0;const layouts=new Set(),themes=new Set();
 scene='dungeon';dungeonId='second';
 for(let n=0;n<200;n++){
  floorNo=n%12+1;newFloor();layouts.add(floorPlan.style);themes.add(floorPlan.theme.id);
  const dist=distMap();
  for(const r of rooms)assert(dist[r.cy][r.cx]>=0,'unreachable room');
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)if(map[y][x]===STAIRS)assert(dist[y][x]>=0,'unreachable stairs');
  for(const o of [...enemies,...floorItems,...traps])assert(map[o.y]?.[o.x]===FLOOR,'content on solid/stairs');
  if(rooms.some(r=>r.mh))houses++;
  if(floorShop){
   shops++;const r=rooms[floorShop.room];assert(r.role==='shop'&&!r.mh&&floorShop.room!==0,'role conflict');
   assert(![...enemies,...traps,...floorItems].some(o=>roomGrid[o.y][o.x]===floorShop.room),'shop overlap');
   const townStock=shopStock,originalTown=shopStock.slice(),whBefore=wh.slice(),bankBefore=bank;
   player.x=r.cx;player.y=r.cy;openWh();assert(whOpen&&whSide==='shop','shop menu');
   gold=10000;inv=[];const it=floorShop.stock[0],cost=priceOf(it),count=floorShop.stock.length;
   shopBuy(ikey(it));assert(gold===10000-cost&&floorShop.stock.length===count-1&&inv.length===1,'purchase');
   const afterBuy=gold;shopSell(ikey(inv[0]));assert(gold>afterBuy&&!inv.length,'sale');
   whTransfer('anything',true);bankMove(true);
   assert(bank===bankBefore&&JSON.stringify(wh)===JSON.stringify(whBefore),'dungeon accessed bank or warehouse');
   assert(shopStock===townStock&&shopStock.every((v,i)=>v===originalTown[i]),'town stock leaked');
   closeWh();openWh();assert(floorShop.stock.length===count-1,'stock reset on reopen');closeWh();
  }
 }
 assert(shops>0&&houses>0&&layouts.size===3&&themes.size===5,'missing modules');
 toTown(false);assert(!floorShop,'shop persisted into town');
 console.log('ALL OK: 200 floors, shops='+shops+', monster rooms='+houses+', connected rooms/stairs, placement, transactions, warehouse/bank isolation');
}
