// Opt-in generated garden art on connected geometry; no gameplay RNG.
(function(root){
 'use strict';
 const theme=DungeonGenerator.themes.find(t=>t.id==='overgrown-garden');
 const art={ready:false,error:null,images:{},textures:{},promise:null};
 function load(){
  if(art.promise)return art.promise;
  art.promise=Promise.all(['materials','decals'].map(key=>new Promise((resolve,reject)=>{
   const image=new Image();image.onload=()=>{art.images[key]=image;resolve();};image.onerror=()=>reject(Error('古庭の画像を取得できません: '+key));
   image.src='fushigi-overgrown-garden-v1/source-art/garden-'+key+'.png';
  }))).then(()=>{art.ready=true;}).catch(error=>{art.error=error.message;throw error;});
  return art.promise;
 }
 // Blend only opposing texture edges, retaining the generated painted interior.
 function texture(key){
  if(art.textures[key])return art.textures[key];
  const tile={soil:[0,0],top:[1,0],face:[0,1],mossSoil:[1,1]}[key],image=art.images.materials,half=image.width/2;
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  g.drawImage(image,tile[0]*half,tile[1]*half,half,half,0,0,256,256);
  const src=g.getImageData(0,0,256,256),out=g.createImageData(256,256),data=src.data;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
   const wx=Math.max(0,1-Math.min(x,255-x)/16)*.5,wy=Math.max(0,1-Math.min(y,255-y)/16)*.5;
   for(let ch=0;ch<4;ch++){
    const sample=(xx,yy)=>data[(yy*256+xx)*4+ch];
    out.data[(y*256+x)*4+ch]=sample(x,y)*(1-wx)*(1-wy)+sample(255-x,y)*wx*(1-wy)+sample(x,255-y)*(1-wx)*wy+sample(255-x,255-y)*wx*wy;
   }
  }
  g.putImageData(out,0,0);art.textures[key]=c;return c;
 }
 function surface(g,key,x,y,px,py,w,h,span=3){
  const t=texture(key),part=t.width/span,sx=((x%span)+span)%span*part,sy=((y%span)+span)%span*part;
  g.drawImage(t,sx,sy,part,part,px,py,w,h);
 }
 function decal(g,index,x,y,w,h,angle=0){
  const image=art.images.decals,half=image.width/2;
  g.save();g.translate(x,y);g.rotate(angle);
  g.drawImage(image,(index%2)*half,Math.floor(index/2)*half,half,half,-w/2,0,w,h);g.restore();
 }
 const hash=(x,y,seed)=>{let n=Math.imul(x+31,374761393)^Math.imul(y+17,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;};
 const plans=new WeakMap();
 function plan(room,seed){
  const cached=plans.get(room);if(cached?.seed===seed)return cached;
  const n=hash(room.x,room.y,seed),side=n%4;
  // One dominant edge per room, rather than an independent tile lottery.
  const ax=side===1?room.x+room.w:side===3?room.x:room.x+room.w*(.2+((n>>>4)%60)/100);
  const ay=side===0?room.y:side===2?room.y+room.h:room.y+room.h*(.2+((n>>>10)%60)/100);
  const result={seed,side,ax,ay,kind:['moss','roots','rubble'][(n>>>16)%3],radius:Math.min(room.w,room.h)*.55,phase:(n%628)/100};
  plans.set(room,result);return result;
 }
 function cell(map,rooms,grid,x,y,seed){
  const ri=grid?.[y]?.[x],room=rooms?.[ri];
  if(map[y]?.[x]!==1||!room||room.role==='shop')return null;
  // Keep thresholds, corridors, room centres and stairs clear. Check live map
  // so cannon destruction does not leave painted wall shadows behind.
  if(x===room.cx&&y===room.cy)return null;
  const steps=[[1,0],[-1,0],[0,1],[0,-1]];
  if(steps.some(([dx,dy])=>map[y+dy]?.[x+dx]!==0&&grid?.[y+dy]?.[x+dx]!==ri))return null;
  const p=plan(room,seed),distance=Math.hypot((x+.5-p.ax),(y+.5-p.ay));
  return {...p,room,strength:Math.max(0,1-distance/p.radius)};
 }
 const overlays=new WeakMap(),DECAL_UNIT=96;
 function composition(room,p,map,rooms,roomGrid,seed){
  const signature=seed+':'+room.role+':'+art.ready+':'+map.slice(Math.max(0,room.y-1),room.y+room.h+1).map(row=>row.slice(Math.max(0,room.x-1),room.x+room.w+1).join(',')).join(';');
  const prior=overlays.get(room);if(prior?.signature===signature)return prior.canvas;
  const canvas=document.createElement('canvas'),unit=DECAL_UNIT;canvas.width=room.w*unit;canvas.height=room.h*unit;
  const g=canvas.getContext('2d');g.scale(unit,unit);g.translate(-room.x,-room.y);
  if(p.kind==='roots'){
   // Generated root base faces the chosen wall; rotating the decal points its
   // painted branches into the room, with no procedural replacement strokes.
   decal(g,hash(room.x,room.y,seed)%2,p.ax,p.ay,p.radius*1.5,p.radius,[0,Math.PI/2,Math.PI,-Math.PI/2][p.side]);
  }else{
   for(let i=0;i<5;i++){
    const a=hash(room.x+i,room.y-i,seed),angle=(a%628)/100,radius=p.radius*(.15+((a>>>8)%50)/100);
    const x=p.ax+Math.cos(angle)*radius,y=p.ay+Math.sin(angle)*radius;
    const width=p.kind==='moss'?1.6:1.05;
    g.globalAlpha=p.kind==='moss'?.85:1;
    decal(g,p.kind==='moss'?2:3,x,y,width,width,(a%4)*Math.PI/2);
   }
  }
  g.globalAlpha=1;g.setTransform(1,0,0,1,0,0);
  // Fade into protected tiles rather than chopping room-scale art at tile edges.
  const blocked=[];for(let y=room.y;y<room.y+room.h;y++)for(let x=room.x;x<room.x+room.w;x++)if(!cell(map,rooms,roomGrid,x,y,seed))blocked.push([x,y]);
  const pixels=g.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
  for(let yy=0;yy<canvas.height;yy++)for(let xx=0;xx<canvas.width;xx++){
   if(d[(yy*canvas.width+xx)*4+3]===0)continue;
   const wx=room.x+(xx+.5)/unit,wy=room.y+(yy+.5)/unit;
   let alpha=Math.min(1,Math.max(0,(p.radius-Math.hypot(wx-p.ax,wy-p.ay))/.45));
   for(const [bx,by]of blocked){const distance=Math.hypot(Math.max(bx-wx,0,wx-bx-1),Math.max(by-wy,0,wy-by-1));alpha=Math.min(alpha,distance/.35);}
   d[(yy*canvas.width+xx)*4+3]*=alpha;
  }
  g.putImageData(pixels,0,0);overlays.set(room,{signature,canvas});return canvas;
 }
 function decorate(g,px,py,size,h,options){
  const {map,rooms,roomGrid,x,y,seed}=options,p=cell(map,rooms,roomGrid,x,y,seed);
  if(!p)return;
  const atlas=composition(p.room,p,map,rooms,roomGrid,seed),unit=DECAL_UNIT;
  g.drawImage(atlas,(x-p.room.x)*unit,(y-p.room.y)*unit,unit,unit,px,py,size,h);
 }
 function wall(g,px,py,size,h,{map,x,y}){
  const f=(xx,yy)=>map[yy]?.[xx]!==undefined&&map[yy][xx]!==0;
  // One elevation for the entire connected surface. Internal tile joins have
  // neither a facade nor a border; facades exist only above exposed floor.
  const rise=size*.24;
  g.save();
  g.imageSmoothingEnabled=true;
  // Fill the short vertical band under the cap too: it must stay opaque when
  // adjoining a room corner or a freshly blasted opening.
  surface(g,'top',x,y,px,py,size,h,4);
  if(f(x,y+1)){
   const face=texture('face'),part=face.width/4;
   g.drawImage(face,(x%4)*part,32,part,64,px,py+h-rise,size,rise);
   const shade=g.createLinearGradient(0,py+h-rise,0,py+h);shade.addColorStop(0,'#18221835');shade.addColorStop(1,'#10180e95');
   g.fillStyle=shade;g.fillRect(px,py+h-rise,size,rise);
  }
  surface(g,'top',x,y,px,py-rise,size,h,4);
  // Restrict edge accents to actual exposed boundaries, never tile seams.
  g.lineWidth=Math.max(1,size*.018);g.strokeStyle='#c4b99890';g.beginPath();
  if(f(x,y-1)){g.moveTo(px,py-rise);g.lineTo(px+size,py-rise);}
  if(f(x-1,y)){g.moveTo(px,py-rise);g.lineTo(px,py-rise+h);}
  g.stroke();
  if(f(x,y+1)){g.fillStyle='#c4b99855';g.fillRect(px,py+h-rise,size,Math.max(1,size*.016));}
  g.restore();return true;
 }
 const original=CaveTerrain.draw;
 CaveTerrain.draw=function(g,key,px,py,size,options){
  if(options.theme?.id!==theme.id)return original(g,key,px,py,size,options);
  options={...options,x:options.x??0,y:options.y??0};
  if(!CaveTerrain.ready)return false;
  if(!art.ready){if(!art.promise)load().then(()=>root.render?.()).catch(()=>{});return false;}
  const h=size*CaveTerrain.pitch;
  if(key==='wallF'||key==='wallT')return wall(g,px,py,size,h,options);
  let ok=true;
  if(key.startsWith('floor')){
   g.save();g.imageSmoothingEnabled=true;
   surface(g,'soil',options.x,options.y,px,py,size,h);
   // Ground contact is derived from live collision geometry, never baked into
   // a sprite outline; explosions immediately reveal clean floor.
   if(options.map[options.y-1]?.[options.x]===0){const shade=g.createLinearGradient(0,py,0,py+h*.22);shade.addColorStop(0,'#1c241d60');shade.addColorStop(1,'#1c241d00');g.fillStyle=shade;g.fillRect(px,py,size,h*.22);}
   g.restore();
  }else ok=original(g,key,px,py,size,{...options,theme:{id:'ruins'}});
  if(key.startsWith('floor'))decorate(g,px,py,size,h,options);
  return ok;
 };
 // Both the normal floor rotation and review catalog include the garden.
 DungeonGenerator.locations=DungeonGenerator.themes;
 root.OvergrownGarden={theme,plan,cell,art,load,texture};
})(typeof window==='undefined'?globalThis:window);
