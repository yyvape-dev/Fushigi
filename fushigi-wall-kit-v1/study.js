(function(root){
 let walking=false;
 root.WallKitStudy={
 scene(){
  ShopSystem.reset();AllySystem.reset();ShopSecurity.reset?.();
  MW=19;MH=14;map=Array.from({length:MH},()=>Array(MW).fill(WALL));
  rooms=[{x:3,y:3,w:9,h:7,cx:7,cy:6,role:'ordinary',shape:'L'}];
  for(let y=3;y<10;y++)for(let x=3;x<12;x++)map[y][x]=FLOOR;
  // Connected wall peninsula, isolated pillar, bend and narrow corridor.
  for(let y=3;y<5;y++)for(let x=9;x<12;x++)map[y][x]=WALL;
  map[6][9]=WALL;
  for(let x=12;x<17;x++)map[7][x]=FLOOR;
  for(let y=7;y<12;y++)map[y][16]=FLOOR;
  for(let x=13;x<17;x++)map[11][x]=FLOOR;
  floorPlan={seed:55433,artSeed:8721,theme:OvergrownGarden.theme,map,rooms,style:'kit-study'};
  enemies=[];floorItems=[];traps=[];fx.length=0;vfx.length=0;floorLight=false;floorShop=null;
  buildRoomGrid();player.x=player.vx=7;player.y=player.vy=8;player.face=[0,1];player.swing=0;player.action=null;
  seen=map.map(row=>row.map(()=>true));fadeT=-1e9;updateVis();render();
 },
 breakWall(){for(let y=9;y<=11;y++)for(let x=6;x<=8;x++)if(x>0&&y<MH-1)map[y][x]=FLOOR;buildRoomGrid();visibilityRevision++;updateVis();render();},
 async walk(){
  if(walking)return;walking=true;player.x=player.vx=5;player.y=player.vy=8;
  try{for(const [x,y]of [[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[11,8],[11,7],[12,7],[13,7],[14,7],[15,7],[16,7],[16,8],[16,9],[16,10],[16,11]]){
   if(map[y]?.[x]!==FLOOR)continue;
   const dx=x-player.x,dy=y-player.y;if(dx||dy)playerMove(dx,dy);render();
   await new Promise(resolve=>setTimeout(resolve,180));
  }}finally{walking=false;}
 }
 };
})(window);
