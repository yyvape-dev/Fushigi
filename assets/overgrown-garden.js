// Additional, opt-in location. Reuses original ruins/forest art; no gameplay RNG.
(function(root){
 'use strict';
 const theme={id:'overgrown-garden',name:'根絡みの古庭',filter:'none'};
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
 const overlays=new WeakMap();
 function composition(room,p,map,rooms,roomGrid,seed){
  const signature=seed+':'+room.role+':'+map.slice(Math.max(0,room.y-1),room.y+room.h+1).map(row=>row.slice(Math.max(0,room.x-1),room.x+room.w+1).join(',')).join(';');
  const prior=overlays.get(room);if(prior?.signature===signature)return prior.canvas;
  const canvas=document.createElement('canvas'),unit=40;canvas.width=room.w*unit;canvas.height=room.h*unit;
  const g=canvas.getContext('2d');g.scale(unit,unit);g.translate(-room.x,-room.y);
  const stain=g.createRadialGradient(p.ax,p.ay,0,p.ax,p.ay,p.radius);
  stain.addColorStop(0,p.kind==='rubble'?'#89755b75':'#41613c99');stain.addColorStop(1,'#45633c00');
  g.fillStyle=stain;g.fillRect(room.x,room.y,room.w,room.h);
  if(p.kind==='roots'){
   const inward=[Math.PI/2,Math.PI,-Math.PI/2,0][p.side];g.lineCap='round';
   for(let i=0;i<6;i++){
    const angle=inward+(i-2.5)*.30,len=p.radius*(.65+(hash(i,room.y,seed)%35)/100);
    const ex=p.ax+Math.cos(angle)*len,ey=p.ay+Math.sin(angle)*len;
    const path=()=>{g.beginPath();g.moveTo(p.ax,p.ay);g.bezierCurveTo(p.ax+Math.cos(angle+.45)*len*.4,p.ay+Math.sin(angle+.45)*len*.4,ex-Math.cos(angle-.35)*len*.3,ey-Math.sin(angle-.35)*len*.3,ex,ey);};
    path();g.strokeStyle='#211e1955';g.lineWidth=.14-i*.013;g.stroke();
    path();g.strokeStyle='#796448dc';g.lineWidth=.08-i*.009;g.stroke();
    path();g.strokeStyle='#c1a77580';g.lineWidth=.018;g.stroke();
   }
  }else{
   for(let y=room.y;y<room.y+room.h;y++)for(let x=room.x;x<room.x+room.w;x++)for(let i=0;i<7;i++){
    const a=hash(x+i,y-i,seed),dx=.08+(a%84)/100,dy=.08+((a>>>8)%84)/100;
    const strength=Math.max(0,1-Math.hypot(x+dx-p.ax,y+dy-p.ay)/p.radius);if(!strength)continue;
    g.globalAlpha=strength;
    if(p.kind==='rubble'){
     g.fillStyle='#302d2950';g.fillRect(x+dx,y+dy+.035,.13,.075);
     g.fillStyle=['#95866bc0','#b0a187c0','#7c8069c0'][i%3];g.beginPath();g.moveTo(x+dx,y+dy);g.lineTo(x+dx+.11,y+dy-.035);g.lineTo(x+dx+.15,y+dy+.045);g.lineTo(x+dx+.025,y+dy+.07);g.closePath();g.fill();
    }else{
     g.fillStyle='#65845170';g.beginPath();g.ellipse(x+dx,y+dy,.22,.12,(a%9)/10,0,Math.PI*2);g.fill();
    }
   }
  }
  g.globalAlpha=1;g.setTransform(1,0,0,1,0,0);
  // Fade into protected tiles rather than chopping room-scale art at tile edges.
  const blocked=[];for(let y=room.y;y<room.y+room.h;y++)for(let x=room.x;x<room.x+room.w;x++)if(!cell(map,rooms,roomGrid,x,y,seed))blocked.push([x,y]);
  const pixels=g.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
  for(let yy=0;yy<canvas.height;yy++)for(let xx=0;xx<canvas.width;xx++){
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
  const atlas=composition(p.room,p,map,rooms,roomGrid,seed),unit=40;
  g.drawImage(atlas,(x-p.room.x)*unit,(y-p.room.y)*unit,unit,unit,px,py,size,h);
 }
 function wall(g,px,py,size,h,{map,x,y,seed}){
  const f=(xx,yy)=>map[yy]?.[xx]!==undefined&&map[yy][xx]!==0;
  // Same height along each wall run. North-facing cutaways stay low.
  const rise=size*(f(x,y-1)?.12:.32),n=hash(x>>2,y>>2,seed),variant=n%2;
  g.save();
  g.fillStyle='#514f40';g.fillRect(px,py-rise,size,h+rise);
  g.drawImage(CaveTerrain.images['ruins:wallF'+variant],0,0,128,256,px,py-rise+h,size,rise);
  g.fillStyle='#111a1680';g.fillRect(px,py-rise+h,size,rise);
  g.drawImage(CaveTerrain.images['ruins:wallT'+variant],(x&1)*128,(y&1)*64,128,128,px,py-rise,size,h);
  // Quiet moss follows a broad world-space region, not a checkerboard.
  if((n>>>4)%3===0){g.fillStyle='#45634438';g.fillRect(px,py-rise,size,h);}
  // Restrict edge accents to actual exposed boundaries, never tile seams.
  g.lineWidth=Math.max(1,size*.018);g.strokeStyle='#c4b99890';g.beginPath();
  if(f(x,y-1)){g.moveTo(px,py-rise);g.lineTo(px+size,py-rise);}
  if(f(x-1,y)){g.moveTo(px,py-rise);g.lineTo(px,py-rise+h);}
  g.stroke();
  if(f(x,y+1)){g.fillStyle='#101a1855';g.fillRect(px,py+h-Math.max(1,size*.04),size,Math.max(1,size*.04));}
  g.restore();return true;
 }
 const original=CaveTerrain.draw;
 CaveTerrain.draw=function(g,key,px,py,size,options){
  if(options.theme?.id!==theme.id)return original(g,key,px,py,size,options);
  if(!CaveTerrain.ready)return false;
  const h=size*CaveTerrain.pitch;
  if(key==='wallF'||key==='wallT')return wall(g,px,py,size,h,options);
  // Reuse the quietest single ruins floor; decoration supplies room-scale variety.
  let ok;
  if(key.startsWith('floor')){
   // A three-cell material span removes the old one-cell wallpaper rhythm.
   // Crop in world coordinates so every shared tile edge remains continuous.
   g.save();g.beginPath();g.rect(px,py,size,h);g.clip();
   ok=original(g,key,px-(options.x%3)*size,py-(options.y%3)*h,size*3,{...options,x:0,y:0,seed:1,theme:{id:'ruins'}});
   g.restore();
  }else ok=original(g,key,px,py,size,{...options,theme:{id:'ruins'}});
  if(key.startsWith('floor'))decorate(g,px,py,size,h,options);
  return ok;
 };
 // Existing five-location rotation stays intact; review can explicitly select it.
 DungeonGenerator.locations=[...DungeonGenerator.themes,theme];
 root.OvergrownGarden={theme,plan,cell};
})(typeof window==='undefined'?globalThis:window);
