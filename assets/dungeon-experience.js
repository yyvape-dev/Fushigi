// Item/trap/stair art and continuous, feathered dungeon illumination.
(function(root){
 const src=typeof document!=='undefined'&&document.currentScript?.src;
 const R=src?new URL('dungeon/experience-v1/',src).href:'assets/dungeon/experience-v1/';
 const state={ready:false,error:null,images:{},layers:{}};
 const ids=['forest','limestone','ruins','ice','volcano'];
 state.load=async function(redraw=()=>{}){try{
  await Promise.all(['shop','coin',...['pit','mine','gas','hungry','warp','summon'].map(k=>'trap-'+k),...ids.flatMap(k=>['stairs-'+k,'ceiling-'+k])].map(k=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{state.images[k]=im;resolve();};im.onerror=()=>reject(Error(k));im.src=R+k+((/^(stairs|ceiling)-/.test(k))?'.webp':'.png');})));
  state.ready=true;redraw();
 }catch(e){state.error=e.message;console.error('ダンジョン素材読込失敗',e);redraw();}};
 state.stairs=function(g,x,y,size,pitch,id){const im=state.images['stairs-'+id];if(!im)return false;g.imageSmoothingEnabled=true;g.drawImage(im,x,y,size,pitch);return true;};
 state.trap=function(g,kind,x,y,size,pitch){const im=state.images['trap-'+kind];if(!im)return false;g.imageSmoothingEnabled=true;g.drawImage(im,x+size*.03,y-pitch*.10,size*.94,pitch*1.04);return true;};
 state.shop=function(g,x,y,size,pitch){const im=state.images.shop;if(!im)return false;g.imageSmoothingEnabled=true;g.drawImage(im,x-size*.10,y-pitch*.65,size*1.2,size*1.2);return true;};
 function layer(name,w,h){let c=state.layers[name];if(!c)c=state.layers[name]=document.createElement('canvas');if(c.width!==w||c.height!==h){c.width=w;c.height=h;}const g=c.getContext('2d');g.clearRect(0,0,w,h);g.globalCompositeOperation='source-over';g.globalAlpha=1;g.filter='none';return [c,g];}
 // Terrain remains visible under ambient shadow outside the soft local light.
 state.fog=function(g,{width,height,size,pitch,camX,camY,player,rooms,roomIndex,roomGrid,map,seen,theme,terrain,revision=0,seed=0}){
  const cacheKey=[width,height,size,pitch,camX,camY,player.vx,player.vy,roomIndex,player.st?.blind>0,theme,state.ready,revision,seed].join(':');
  if(state.fogKey===cacheKey){g.drawImage(state.layers.ceiling,0,0);g.drawImage(state.layers.shade,0,0);return;}
  state.fogKey=cacheKey;
  const [ceiling,cg]=layer('ceiling',width,height),[light,lg]=layer('light',width,height),[reveal,rg]=layer('reveal',width,height),[shade,sg]=layer('shade',width,height);
  const id=ids.includes(theme)?theme:'limestone',im=state.images['ceiling-'+id];
  const x0=Math.floor(-camX/size)-1,x1=Math.ceil((width-camX)/size)+1,y0=Math.floor(-camY/pitch)-1,y1=Math.ceil((height-camY)/pitch)+1;
  cg.fillStyle={forest:'#494436',limestone:'#49453f',ruins:'#4e473a',ice:'#293c50',volcano:'#43302e'}[id];cg.fillRect(0,0,width,height);
  if(im){
   // Mirror large rock patches at their boundaries: continuous material without
   // the rectangular cliff islands of the wall sprites.
   const span=4,px=size*span,py=pitch*span;
   for(let y=Math.floor(y0/span);y<=Math.ceil(y1/span);y++)for(let x=Math.floor(x0/span);x<=Math.ceil(x1/span);x++){
    cg.save();cg.translate(camX+(x+(x%2?1:0))*px,camY+(y+(y%2?1:0))*py);cg.scale(x%2?-1:1,y%2?-1:1);cg.drawImage(im,0,0,px+1,py+1);cg.restore();
   }
  }
  cg.fillStyle='rgba(8,11,18,.18)';cg.fillRect(0,0,width,height);
  // Actual room/corridor geometry is already rendered, even when unvisited.
  // Ceiling material fills only the area beyond the map; never cover its floors.
  cg.globalCompositeOperation='destination-out';cg.fillStyle='#fff';
  cg.fillRect(camX,camY-size,map[0].length*size,map.length*pitch+size);
  cg.globalCompositeOperation='source-over';
  const blind=player.st?.blind>0;
  if(roomIndex>=0&&!blind){
   const r=rooms[roomIndex];lg.filter='blur('+Math.max(12,size*.58)+'px)';lg.fillStyle='#fff';
   // Follow the actual room footprint, rather than its enclosing rectangle.
   for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(map[y]?.[x]!==0&&roomGrid[y]?.[x]===roomIndex)lg.fillRect(camX+x*size-size*.1,camY+y*pitch-pitch*.1,size*1.2,pitch*1.2);
   lg.filter='none';
  }
  const px=camX+(player.vx+.5)*size,py=camY+(player.vy+.6)*pitch,radius=size*(blind?.70:2.05);
  const glow=lg.createRadialGradient(px,py,size*.30,px,py,radius);glow.addColorStop(0,'#fff');glow.addColorStop(.40,'rgba(255,255,255,.95)');glow.addColorStop(.72,'rgba(255,255,255,.5)');glow.addColorStop(1,'rgba(255,255,255,0)');lg.fillStyle=glow;lg.fillRect(0,0,width,height);
  g.drawImage(ceiling,0,0);
  sg.fillStyle='rgba(2,5,12,.52)';sg.fillRect(0,0,width,height);sg.globalCompositeOperation='destination-out';sg.drawImage(light,0,0);sg.globalCompositeOperation='source-over';g.drawImage(shade,0,0);
 };
 root.DungeonExperience=state;
})(typeof window==='undefined'?globalThis:window);
