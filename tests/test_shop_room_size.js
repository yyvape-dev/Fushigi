// 店部屋の広さ：商品11個と店主が歩ける広さ（面積40以上の長方形）に置く。tests/harness.js 経由で実行
{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 scene='dungeon';dungeonId='second';
 let shops=0,wide=0,fill=0,tight=0;
 for(let n=0;n<800&&shops<120;n++){
  floorNo=2+n%11;newFloor();if(!floorShop)continue;
  const r=rooms[floorShop.room];shops++;
  let floor=0;for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(map[y][x]===FLOOR)floor++;
  const goods=floorItems.filter(f=>roomGrid[f.y][f.x]===floorShop.room);
  if(r.w*r.h>=40&&r.shape==='rect')wide++;
  fill+=goods.length/floor;if(goods.length/floor>=.5)tight++;
  // 商品どうしは、隣り合わない位置が取れる広さなら隣り合わない
  const adjacent=goods.some((a,i)=>goods.some((b,j)=>j>i&&Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<=1));
  if(r.w*r.h>=40)assert(!adjacent,'goods packed side by side in a wide shop');
 }
 assert(shops>=60,'too few shops generated: '+shops);
 assert(wide/shops>=.9,'shop rooms should be wide (>=40 cells, rectangular): '+wide+'/'+shops);
 assert(fill/shops<=.4,'goods fill too much of the shop floor: '+(fill/shops).toFixed(2));
 assert(tight/shops<=.05,'too many shops with half the floor covered by goods: '+tight+'/'+shops);
 console.log('ALL OK: shop room size, '+shops+' shops, wide '+wide+', avg goods fill '+(fill/shops*100).toFixed(0)+'%, tight '+tight);
}
