// Decorative woodland only. Never edits terrain, entities, RNG or save data.
(function(root){
 'use strict';
 const hash=(x,y,seed)=>{let h=Math.imul(x+17,73856093)^Math.imul(y+31,19349663)^seed;h=Math.imul(h^(h>>>16),0x45d9f3b);return (h^(h>>>16))>>>0;};
 const signature=map=>{let h=2166136261;for(const row of map)for(const v of row)h=Math.imul(h^(v+1),16777619);return h>>>0;};
 function plan({map,W,H,wall=0,stairs=2}){
  const seed=signature(map),trees=[],lamps=[],garlands=[],decor=[];
  const inside=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
  const floor=(x,y)=>inside(x,y)&&map[y][x]!==wall;
  const solid=(x,y)=>inside(x,y)&&map[y][x]===wall;
  const stairCells=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(map[y][x]===stairs)stairCells.push([x,y]);
  const clearStairs=(x,y)=>stairCells.every(([sx,sy])=>Math.abs(sx-x)>2||Math.abs(sy-y)>2);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   if(!solid(x,y)||!clearStairs(x,y))continue;
   let edge=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&floor(x+dx,y+dy))edge=true;
   if(edge&&(x+y)%2===0){
    let narrow=false;
    for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]])if(floor(x+dx,y+dy)){
     const xx=x+dx,yy=y+dy;let exits=0;for(const [ax,ay] of [[0,-1],[1,0],[0,1],[-1,0]])if(floor(xx+ax,yy+ay))exits++;
     if(exits<=2)narrow=true;
    }
    const n=hash(x,y,seed);trees.push({x,y,size:narrow?1.25:1.65+(n%25)/100,kind:narrow||n%5===0?'sapling':'tree'});
   }
  }
  // Garlands follow long north banks of clearings, never cross a passage.
  const runs=[];
  for(let y=0;y<H-2;y++){
   let start=-1;
   for(let x=0;x<=W;x++){
    const ok=x<W&&solid(x,y)&&floor(x,y+1)&&floor(x,y+2)&&clearStairs(x,y);
    if(ok&&start<0)start=x;
    if(!ok&&start>=0){if(x-start>=5)runs.push({x0:start,x1:Math.min(x-1,start+5),y,rank:hash(start,y,seed)});start=-1;}
   }
  }
  runs.sort((a,b)=>a.rank-b.rank);
  for(const run of runs){
   if(garlands.length>=6)break;
   if(garlands.some(g=>Math.abs(g.y-run.y)<3&&Math.max(g.x0,run.x0)<=Math.min(g.x1,run.x1)+2))continue;
   garlands.push({x0:run.x0,x1:run.x1,y:run.y});
   for(const x of [run.x0,run.x1]){
    lamps.push({x,y:run.y});
    if(!trees.some(t=>t.x===x&&t.y===run.y))trees.push({x,y:run.y,size:1.85});
   }
  }
  // Compact clearings may be too short for a string, but still get a lantern.
  if(!lamps.length){
   for(let y=0;y<H-2&&lamps.length<4;y++)for(let x=1;x<W-1&&lamps.length<4;x++){
    if(solid(x,y)&&floor(x,y+1)&&floor(x-1,y+1)&&floor(x+1,y+1)&&floor(x,y+2)&&clearStairs(x,y)&&!lamps.some(l=>Math.abs(l.x-x)+Math.abs(l.y-y)<5))lamps.push({x,y});
   }
  }
  const occupied=new Set([...trees,...lamps].map(p=>p.x+','+p.y));
  const kinds=['stump','boulder','rocks','fern','mushrooms'];
  for(let y=0;y<H&&decor.length<64;y++)for(let x=0;x<W&&decor.length<64;x++){
   if(!solid(x,y)||!clearStairs(x,y)||occupied.has(x+','+y))continue;
   if(![[0,-1],[1,0],[0,1],[-1,0]].some(([dx,dy])=>floor(x+dx,y+dy)))continue;
   const n=hash(x,y,seed);if(n%3===0)decor.push({x,y,kind:kinds[(n>>>4)%kinds.length]});
  }
  return {seed,trees,lamps,garlands,decor};
 }
 const images={},feet={},keys=['tree','sapling','stump','boulder','rocks','fern','mushrooms','lantern','lanternpost','garland'],state={ready:false,error:null,images,feet,keys},R='assets/dungeon/forest-fixed65-v1/';
 let loading=false,cachedKey='',cachedPlan=null;
 function load(redraw){
  if(loading||typeof Image==='undefined')return;
  loading=true;
  Promise.all(keys.map(key=>new Promise((resolve,reject)=>{
   const im=new Image();im.onload=()=>{
    const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);
    const d=g.getImageData(0,0,c.width,c.height);for(let i=0;i<d.data.length;i+=4)if(d.data[i]>100&&d.data[i+2]>100&&d.data[i]>d.data[i+1]*1.3&&d.data[i+2]>d.data[i+1]*1.3)d.data[i+3]=0;
    let bottom=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d.data[(y*c.width+x)*4+3])bottom=Math.max(bottom,y+1);
    feet[key]=bottom/c.height;g.putImageData(d,0,0);images[key]=c;resolve();
   };im.onerror=()=>reject(Error(key));im.src=R+key+'.png';
  }))).then(()=>{state.ready=true;redraw?.();}).catch(e=>{state.error=e.message;console.warn('森の装飾画像を読めません',e);});
 }
 function draw2d(g,o,redraw){
  if(!state.ready){load(redraw);return;}
  const key=o.W+'x'+o.H+':'+signature(o.map);
  if(key!==cachedKey){cachedKey=key;cachedPlan=plan(o);}
  const p=cachedPlan,{camX,camY,size,pitch}=o;
  const visible=(x,y)=>x>-size*3&&x<g.canvas.width+size*3&&y>-size*3&&y<g.canvas.height+size*3;
  const nearby=(grid,x,y)=>{if(!grid)return true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(grid[y+dy]?.[x+dx])return true;return false;};
  const known=p=>nearby(o.seen,p.x,p.y),lit=p=>nearby(o.vis,p.x,p.y);
  g.save();g.imageSmoothingEnabled=true;
  const sprite=(key,x,y,w,h)=>{g.drawImage(images[key],x-w/2,y-h*feet[key],w,h);};
  // Lantern light is clipped to explored, walkable ground.
  for(const l of p.lamps){const x=camX+(l.x+.5)*size,y=camY+(l.y+1)*pitch;if(!known(l)||!visible(x,y))continue;
   g.save();g.beginPath();for(let yy=l.y-2;yy<=l.y+3;yy++)for(let xx=l.x-3;xx<=l.x+3;xx++)if(o.map[yy]?.[xx]!==undefined&&o.map[yy][xx]!==o.wall&&(!o.seen||o.seen[yy]?.[xx]))g.rect(camX+xx*size,camY+yy*pitch,size+1,pitch+1);g.clip();
   const r=size*2,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,lit(l)?'rgba(255,183,73,.3)':'rgba(255,183,73,.08)');gr.addColorStop(1,'rgba(255,183,73,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);g.restore();
  }
  const sizes={stump:.6,boulder:.85,rocks:.5,fern:.55,mushrooms:.42};
  const objects=[...p.trees.map(t=>({...t,key:t.kind||'tree',size:t.size})),...p.decor.map(d=>({...d,key:d.kind,size:sizes[d.kind]}))].sort((a,b)=>a.y-b.y);
  for(const item of objects){const x=camX+(item.x+.5)*size,y=camY+(item.y+.85)*pitch;if(!known(item)||!visible(x,y))continue;
   g.globalAlpha=lit(item)?1:.45;
   g.fillStyle='rgba(4,17,13,.22)';g.beginPath();g.ellipse(x,y,item.size*size*.17,item.size*size*.045,0,0,Math.PI*2);g.fill();
   sprite(item.key,x,y,item.size*size,item.size*size);
  }
  for(const s of p.garlands){if(!known({x:s.x0,y:s.y})&&!known({x:s.x1,y:s.y}))continue;
   const w=(s.x1-s.x0+.8)*size,x=camX+(s.x0+.1)*size,y=camY+(s.y+.8)*pitch-size*.35;
   g.globalAlpha=lit({x:s.x0,y:s.y})||lit({x:s.x1,y:s.y})?1:.45;
   if(visible(x,y)||visible(x+w,y))g.drawImage(images.garland,x,y-w*.5,w,w);
  }
  for(const l of p.lamps){const x=camX+(l.x+.65)*size,y=camY+(l.y+.95)*pitch;if(!known(l)||!visible(x,y))continue;
   g.globalAlpha=lit(l)?1:.45;const post=hash(l.x,l.y,p.seed)%2===0;
   sprite(post?'lanternpost':'lantern',x,y-(post?0:size*.25),size*(post?.85:.6),size*(post?.85:.6));
  }
  g.restore();
 }
 root.ForestFestival={plan,signature,draw2d,load,state};
})(typeof window==='undefined'?globalThis:window);
