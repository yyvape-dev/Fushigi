;(function(){
 const T=CastleTown,L=T.layout,assert=(v,m)=>{if(!v)throw Error(m);console.log('OK '+m);};
 T.leaveInn();T.state.npcs=[];
 // Every walkable cell must belong to the same physical street network.
 const queue=[[player.x,player.y]],visited=new Set([player.x+','+player.y]);
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])if(geomOK(x,y,dx,dy)){
  const key=(x+dx)+','+(y+dy);if(!visited.has(key)){visited.add(key);queue.push([x+dx,y+dy]);}
 }}
 let count=0;for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)if(!solid(map[y][x])){count++;assert(visited.has(x+','+y),'connected pavement '+x+','+y);}
 assert(count>1800,'large playable street network');
 for(const o of L.items){
  for(let y=Math.max(0,o.y-4);y<=o.y;y++)for(let x=Math.max(0,Math.floor(o.x-o.width));x<Math.min(MW,o.x+o.width);x++)if(L.contains(o,x,y))assert(solid(map[y][x]),'solid footprint '+o.id+' '+x+','+y);
 }
 for(const f of T.facilities)assert(visited.has(f.x+','+f.y),'reachable actual counter/entry '+f.id);
 for(const tree of L.items.filter(o=>o.trunk))assert(solid(map[tree.y][tree.x]),'tree trunk has actual blocked cell '+tree.id);
 for(const o of L.items.filter(o=>o.private)){
  player.x=o.x;player.y=o.y;snapVis();const prev=[player.x,player.y];playerMove(0,-1);
  assert(player.x===prev[0]&&player.y===prev[1],'closed house blocks front-wall entry '+o.id);
 }
 // Source door measurements normalize every usable building to a 1.65-tile doorway.
 for(const o of L.items.filter(o=>['inn','smith','deposit','lodge','house-red','house-blue'].includes(o.kind))){
  const a=L.art[o.kind],door=a.doorHeight*o.width/a.width;
  assert(Math.abs(door/CHAR_K[2]-1.1)<.001,'door scale matches Rana '+o.id);
 }
 const heights=[];
 for(const area of ['outside','inn']){T.travel(area,area==='inn'?10:20,area==='inn'?6:20);heights.push(TS*CHAR_K[charPref]*T.characterScale());}
 assert(Math.abs(heights[0]-heights[1])<.001,'same apparent character height indoors/outdoors');
 T.leaveInn();T.state.npcs=[];const house=L.items.find(o=>o.private),events=[],realProp=T.drawProp,realEntity=drawEntity;
 T.drawProp=(g,o)=>events.push(o.id);drawEntity=(key)=>{events.push(key);return[0,0];};
 player.x=house.x;player.y=house.y-3;snapVis();draw();assert(events.indexOf('player')<events.indexOf(house.id),'roof covers character walking behind house');
 events.length=0;player.y=house.y+1;snapVis();draw();assert(events.indexOf('player')>events.indexOf(house.id),'character in front is drawn over house');
 T.drawProp=realProp;drawEntity=realEntity;
 T.restore({area:'outside',x:1,y:1});toTown(false);
 assert(player.x===T.door.x&&player.y===T.door.y+1,'old painted-map save moves to safe new inn entrance');
 enterDungeon();const dungeonSize=TS;RunSave.save();scene='town';T.state.area='inn';map=null;resize();boot();
 assert(scene==='dungeon'&&TS===dungeonSize,'resuming a dungeon does not keep the indoor tile scale');
 console.log('ALL OK town spatial contract: '+count+' connected walkable cells, '+L.items.length+' registered props');
})();
