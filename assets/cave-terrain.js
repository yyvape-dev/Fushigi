// Generated painterly cave art + topology-driven wall silhouettes.
// All drawing stays inside its logical cell. Collision never depends on artwork.
(function(root){
 const SIZE=128, images={},cache=new Map();
 const state={ready:false,error:null,version:'cave-v1',images,cache};
 state.load=async function(redraw){
  try{
   await Promise.all(['floor0','floor1','floor2','wallT','wallF','stairs'].map(key=>new Promise((resolve,reject)=>{
    const im=new Image();im.onload=()=>{images[key]=im;resolve();};im.onerror=()=>reject(Error(key));im.src='assets/dungeon/cave-v1/'+key+'.webp';
   })));
   state.ready=true;redraw();
  }catch(e){state.error=e.message;console.error('洞窟画像を読み込めません',e);redraw();}
 };
 state.topology=function(map,x,y){
  const floor=(xx,yy)=>map[yy]?.[xx]!==undefined&&map[yy][xx]!==0;
  let edges=0,diagonals=0;
  [[0,-1],[1,0],[0,1],[-1,0]].forEach(([dx,dy],i)=>{if(floor(x+dx,y+dy))edges|=1<<i;});
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([dx,dy],i)=>{if(floor(x+dx,y+dy))diagonals|=1<<i;});
  return {edges,diagonals};
 };
 function canvas(){const c=document.createElement('canvas');c.width=c.height=SIZE;return c;}
 function painted(key,theme){
  const id=theme.id+':'+key;if(cache.has(id))return cache.get(id);
  const c=canvas(),g=c.getContext('2d');g.filter=theme.filter||'none';g.drawImage(images[key],0,0,SIZE,SIZE);g.filter='none';
  cache.set(id,c);return c;
 }
 function overlay(key,theme){
  const id=theme.id+':overlay:'+key;if(cache.has(id))return cache.get(id);
  const c=canvas(),g=c.getContext('2d');g.drawImage(painted(key,theme),0,0);
  g.globalCompositeOperation='destination-in';
  if(key==='stairs'){
   // Retain every stair tread; blend just the outer 5% into the common floor.
   for(const vertical of [true,false]){const grad=g.createLinearGradient(0,0,vertical?0:SIZE,vertical?SIZE:0);grad.addColorStop(0,'#0000');grad.addColorStop(.05,'#000');grad.addColorStop(.95,'#000');grad.addColorStop(1,'#0000');g.fillStyle=grad;g.fillRect(0,0,SIZE,SIZE);}
  }else{
   const grad=g.createRadialGradient(SIZE/2,SIZE/2,SIZE*.15,SIZE/2,SIZE/2,SIZE*.49);grad.addColorStop(0,'#000');grad.addColorStop(1,'#0000');g.fillStyle=grad;g.fillRect(0,0,SIZE,SIZE);
  }
  cache.set(id,c);return c;
 }
 function floor(g,px,py,size,theme,x=0,y=0){
  // Mirrored repeat gives identical shared boundary samples. Interior variants
  // fade into this common ground, so any variant can neighbor any other.
  const flipX=(x&1)!==0,flipY=(y&1)!==0;
  g.save();g.translate(px+(flipX?size:0),py+(flipY?size:0));g.scale(flipX?-1:1,flipY?-1:1);g.drawImage(painted('floor0',theme),0,0,size,size);g.restore();
 }
 function wallPath(g,edges){
  const n=edges&1,e=edges&2,s=edges&4,w=edges&8;
  const x=w?SIZE*.035:0,y=n?SIZE*.035:0,r=e?SIZE*.965:SIZE,b=s?SIZE*.965:SIZE;
  const nw=n&&w?SIZE*.16:0,ne=n&&e?SIZE*.16:0,se=s&&e?SIZE*.14:0,sw=s&&w?SIZE*.14:0;
  g.beginPath();g.moveTo(x+nw,y);g.lineTo(r-ne,y);g.quadraticCurveTo(r,y,r,y+ne);
  g.lineTo(r,b-se);g.quadraticCurveTo(r,b,r-se,b);g.lineTo(x+sw,b);g.quadraticCurveTo(x,b,x,b-sw);
  g.lineTo(x,y+nw);g.quadraticCurveTo(x,y,x+nw,y);g.closePath();
 }
 function wall(key,edges,diagonals,theme,x,y){
  const id=theme.id+':'+key+':'+edges+':'+diagonals+':'+(x&1)+':'+(y&1);if(cache.has(id))return cache.get(id);
  const c=canvas(),g=c.getContext('2d');
  g.save();wallPath(g,edges);g.clip();
  // Sample one continuous two-cell-wide painting; do not mirror the rocks.
  const sx=(x&1)*SIZE/2,sy=key==='wallT'?(y&1)*SIZE/2:0,sh=key==='wallT'?SIZE/2:SIZE;
  g.drawImage(painted(key,theme),sx,sy,SIZE/2,sh,0,0,SIZE,SIZE);
  // Side faces remain narrow, keeping width-one corridors fully visible.
  for(const [bit,left]of [[8,true],[2,false]])if(edges&bit){const x=left?SIZE*.035:SIZE*.88,grad=g.createLinearGradient(x,0,x+SIZE*.09,0);grad.addColorStop(0,left?'#060b1055':'#060b1000');grad.addColorStop(1,left?'#060b1000':'#060b1077');g.fillStyle=grad;g.fillRect(x,0,SIZE*.09,SIZE);}
  g.restore();
  // Carve tiny concave joins only where an exposed diagonal floor meets two walls.
  g.globalCompositeOperation='destination-out';
  for(const [i,a,b,x,y]of [[0,1,8,0,0],[1,1,2,SIZE,0],[2,4,2,SIZE,SIZE],[3,4,8,0,SIZE]]){
   if((diagonals&(1<<i))&&!(edges&a)&&!(edges&b)){g.beginPath();g.arc(x,y,SIZE*.07,0,Math.PI*2);g.fill();}
  }
  g.globalCompositeOperation='source-over';
  if(cache.size>220)cache.clear();cache.set(id,c);return c;
 }
 state.draw=function(g,key,px,py,size,options){
  if(!state.ready)return false;
  const {map,x,y,theme}=options;
  if(key.startsWith('floor')){g.imageSmoothingEnabled=true;floor(g,px,py,size,theme,x,y);const variant=(+key.slice(5))%3;if(variant)g.drawImage(overlay('floor'+variant,theme),px,py,size,size);return true;}
  if(key==='stairs'){g.imageSmoothingEnabled=true;floor(g,px,py,size,theme,x,y);g.drawImage(overlay('stairs',theme),px,py,size,size);return true;}
  if(key!=='wallT'&&key!=='wallF')return false;
  if(!Number.isInteger(x)||!Number.isInteger(y))return false;
  const {edges,diagonals}=state.topology(map,x,y);
  g.imageSmoothingEnabled=true;
  floor(g,px,py,size,theme,x,y);
  g.drawImage(wall(key,edges,diagonals,theme,x,y),px,py,size,size);
  return true;
 };
 root.CaveTerrain=state;
})(typeof window==='undefined'?globalThis:window);
