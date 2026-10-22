// 店の部屋と商品：シレン6に合わせた仕様の確認。tests/harness.js 経由で実行
// 仕様（出典は docs/DUNGEON_GENERATION.md）：部屋は最小5×5／店の部屋は広さで選ばない／商品は7〜16個・無作為配置（隣接可）
{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 scene='dungeon';dungeonId='second';
 let shops=0,minArea=1e9,small=0,big=0,adjacent=0,counts={},fill=0;
 for(let n=0;n<1200&&shops<150;n++){
  floorNo=2+n%11;newFloor();
  for(const r of rooms)assert(r.w>=5&&r.h>=5,'room smaller than 5x5: '+r.w+'x'+r.h);
  if(!floorShop)continue;
  const ri=floorShop.room,r=rooms[ri];shops++;
  let floor=0;for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(map[y][x]===FLOOR)floor++;
  const goods=floorItems.filter(f=>roomGrid[f.y][f.x]===ri&&f.item.shopLot);
  counts[goods.length]=(counts[goods.length]||0)+1;fill+=goods.length/floor;
  assert(goods.length<=16,'too many goods: '+goods.length);
  assert(goods.length>=7||goods.length===floor-floorShop.doors.length-floorShop.keepers.length,'too few goods without being full: '+goods.length);
  minArea=Math.min(minArea,r.w*r.h);if(r.w*r.h<40)small++;else big++;
  if(goods.some((a,i)=>goods.some((b,j)=>j>i&&Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1)))adjacent++;
 }
 assert(shops>=60,'too few shops generated: '+shops);
 assert(small>0&&big>0,'shop rooms should come in both small and large sizes: small '+small+' big '+big);
 assert(adjacent>0,'goods may sit side by side (Shiren 6): none adjacent in '+shops+' shops');
 const kinds=Object.keys(counts).length;assert(kinds>=6,'goods count should vary 7-16: '+JSON.stringify(counts));
 console.log('ALL OK: shop rooms '+shops+', min area '+minArea+', small(<40) '+small+', large '+big+', goods counts '+JSON.stringify(counts)+', avg fill '+(fill/shops*100).toFixed(0)+'%, shops with adjacent goods '+adjacent);
}
