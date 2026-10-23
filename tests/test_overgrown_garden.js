{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 const G=OvergrownGarden,types=new Set(),sides=new Set();
 assert(DungeonGenerator.themes.length===6,'six-location rotation enabled');
 assert(DungeonGenerator.generate(56,32,7919,6).theme.id===G.theme.id,'garden appears on floor 6');
 assert(DungeonGenerator.generate(56,32,7919,7).theme.id==='forest','rotation returns to forest');
 assert(DungeonGenerator.locations.at(-1).id===G.theme.id,'garden available in review catalog');
 for(let seed=1;seed<=100;seed++){
  const p=DungeonGenerator.generate(56,32,seed*7919),before=JSON.stringify(p),rng=Math.random;
  Math.random=()=>{throw Error('decoration consumed gameplay RNG');};
  try{
   const grid=p.map.map(row=>row.map(()=>-1));
   p.rooms.forEach((r,i)=>{for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)grid[y][x]=i;});
   for(const r of p.rooms){
    const a=G.plan(r,p.artSeed),b=G.plan(JSON.parse(JSON.stringify(r)),p.artSeed);
    assert(JSON.stringify(a)===JSON.stringify(b),'decoration survives save/restore');types.add(a.kind);sides.add(a.side);
    assert(G.cell(p.map,p.rooms,grid,r.cx,r.cy,p.artSeed)===null,'room centre kept clear');
    for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){
     const c=G.cell(p.map,p.rooms,grid,x,y,p.artSeed);
     if(c)assert(c.ax===a.ax&&c.ay===a.ay,'tiles share one room-scale composition');
     if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>p.map[y+dy]?.[x+dx]!==0&&grid[y+dy]?.[x+dx]!==grid[y][x]))assert(!c,'doorway kept clear');
    }
   }
  }finally{Math.random=rng;}
  assert(JSON.stringify(p)===before,'decoration leaves map, rooms and roles unchanged');
 }
 assert(types.size===3&&sides.size===4,'all motifs and wall directions represented');
 const r={x:2,y:2,w:8,h:6,cx:6,cy:5,role:'ordinary'},m=Array.from({length:12},()=>Array(14).fill(0)),grid=m.map(row=>row.map(()=>-1));
 for(let y=2;y<8;y++)for(let x=2;x<10;x++){m[y][x]=1;grid[y][x]=0;}
 r.role='shop';assert(G.cell(m,[r],grid,2,3,11)===null,'shop merchandise floor stays clear');r.role='ordinary';
 m[3][2]=2;assert(G.cell(m,[r],grid,2,3,11)===null,'stairs never decorated');
 m[3][2]=0;assert(G.cell(m,[r],grid,2,3,11)===null,'walls never get floor decoration');
 console.log('ALL OK: 100 seeded floors, room composition, restore, entrances, stairs, shops, no gameplay mutation/RNG');
}
