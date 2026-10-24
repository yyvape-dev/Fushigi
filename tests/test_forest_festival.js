{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 function check(m){
  const options={map:m,W:m[0].length,H:m.length,wall:0,stairs:2};
  const before=JSON.stringify(m),random=Math.random;
  let a,b;
  try{Math.random=()=>{throw Error('decoration used gameplay RNG');};a=ForestFestival.plan(options);b=ForestFestival.plan(options);}finally{Math.random=random;}
  assert(JSON.stringify(a)===JSON.stringify(b),'same terrain restores identical decorations');
  assert(JSON.stringify(m)===before,'decoration never changes terrain or connectivity');
  assert(a.lamps.length<=12&&a.garlands.length<=6,'bounded lantern budget');
  for(const p of [...a.trees,...a.lamps]){
   assert(m[p.y]?.[p.x]===0,'solid decoration is anchored to an existing wall');
   for(let y=Math.max(0,p.y-2);y<=Math.min(m.length-1,p.y+2);y++)for(let x=Math.max(0,p.x-2);x<=Math.min(m[0].length-1,p.x+2);x++)assert(m[y][x]!==2,'stairs stay visually clear');
  }
  for(const p of a.garlands)for(let x=p.x0;x<=p.x1;x++){
   assert(m[p.y][x]===0&&m[p.y+1][x]!==0&&m[p.y+2][x]!==0,'string follows a clearing bank rather than crossing a corridor');
  }
  return a;
 }
 const room=Array.from({length:16},()=>Array(24).fill(0));
 for(let y=3;y<13;y++)for(let x=3;x<21;x++)room[y][x]=1;
 room[11][19]=2;
 const p=check(room);assert(p.trees.length>0&&p.lamps.length>0&&p.garlands.length>0,'open clearing gets forest and festival lighting');
 const corridor=Array.from({length:15},()=>Array(20).fill(0));for(let x=2;x<18;x++)corridor[7][x]=1;
 assert(check(corridor).garlands.length===0,'one-cell passage never gets a festival string');
 assert(check(Array.from({length:9},()=>Array(9).fill(0))).trees.length===0,'empty rock map has no floating props');
 for(let seed=1;seed<=100;seed++){
  const p=DungeonGenerator.generate(56,32,seed,1),m=p.map.map(r=>r.map(v=>v?1:0));
  const s=p.rooms[p.rooms.length-1];m[s.cy][s.cx]=2;check(m);
 }
 console.log('ALL OK: forest decor deterministic on 100 seeds, wall anchors, clear stairs, corridor safety and RNG isolation');
}
