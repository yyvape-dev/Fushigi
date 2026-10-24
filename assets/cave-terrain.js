// Five original location sets; projected floor + raised, topology-aware banks.
(function(root){
 const SIZE=128,PITCH=.82,images={},cache=new Map();
 const ids=['forest','limestone','ruins','ice','volcano'];
 const state={ready:false,error:null,version:'wall-relief-v1',images,cache,pitch:PITCH,ids};
 // Wall height presets [room-facing face, interior mass] in sheet pixels (128px = one cell wide).
 // 0 = original look. OFF is the headroom the sprite needs above its cell.
 const HEIGHTS=[[28,70],[44,100],[60,130]];
 state.heightPref=0;
 state.setHeight=function(n){n=HEIGHTS[n]?n:0;if(state.heightPref!==n){state.heightPref=n;cache.clear();}};
 const offOf=()=>HEIGHTS[state.heightPref][1];
 const keys=['floor0','floor1','floor2','floor3','wallT0','wallT1','wallF0','wallF1','stairs'];
 state.load=async function(redraw){try{await Promise.all(ids.flatMap(id=>keys.map(key=>new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{images[id+':'+key]=im;resolve();};im.onerror=()=>reject(Error(id+'/'+key));im.src='assets/dungeon/locations-v1/'+id+'/'+key+'.webp';}))));await Promise.all(ids.map(id=>new Promise(resolve=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{images[id+':floorW']=im;resolve();};im.onerror=()=>resolve();im.src='assets/dungeon/locations-v1/'+id+'/floorW.webp';})));state.ready=true;redraw();}catch(e){state.error=e.message;console.error('ロケーション画像読込失敗',e);redraw();}};
 state.topology=function(map,x,y){const f=(xx,yy)=>map[yy]?.[xx]!==undefined&&map[yy][xx]!==0;let edges=0,diagonals=0;[[0,-1],[1,0],[0,1],[-1,0]].forEach(([dx,dy],i)=>{if(f(x+dx,y+dy))edges|=1<<i;});[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([dx,dy],i)=>{if(f(x+dx,y+dy))diagonals|=1<<i;});return {edges,diagonals};};
 state.rise=(map,x,y,size)=>size*HEIGHTS[state.heightPref][(state.topology(map,x,y).edges&1)?0:1]/128;
 function canvas(w=SIZE,h=SIZE){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
 function art(id,key){return images[id+':'+key];}
 function patch(id,key){const k=id+':patch:'+key;if(cache.has(k))return cache.get(k);const c=canvas(),g=c.getContext('2d');g.drawImage(art(id,key),0,0,SIZE,SIZE);g.globalCompositeOperation='destination-in';const r=g.createRadialGradient(64,64,18,64,64,62);r.addColorStop(0,'#000');r.addColorStop(1,'#0000');g.fillStyle=r;g.fillRect(0,0,SIZE,SIZE);cache.set(k,c);return c;}
 function base(id){
  const k=id+':base';if(cache.has(k))return cache.get(k);const c=canvas(),g=c.getContext('2d');g.drawImage(art(id,'floor1'),0,0,128,128);const original=g.getImageData(0,0,128,128),out=g.createImageData(128,128),d=original.data;
  // Blend only an eight-pixel material border. Interior art is never mirrored.
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const wx=Math.max(0,(1-Math.min(x,127-x)/8))*.5,wy=Math.max(0,(1-Math.min(y,127-y)/8))*.5;for(let ch=0;ch<4;ch++){const sample=(xx,yy)=>d[(yy*128+xx)*4+ch];out.data[(y*128+x)*4+ch]=sample(x,y)*(1-wx)*(1-wy)+sample(127-x,y)*wx*(1-wy)+sample(x,127-y)*(1-wx)*wy+sample(127-x,127-y)*wx*wy;}}
  g.putImageData(out,0,0);cache.set(k,c);return c;
 }
 // Optional seamless sheet (floorW): each floor cell shows its own slice of one
 // continuous picture, so large slabs run across tiles with no per-tile repeat.
 // The sheet repeats every WORLD_N cells; the stairs keep their own patch.
 const WORLD_N=6;
 const WORLD_CAP=new Set(['limestone']),CAP_N=4;
 state.worldCap=WORLD_CAP;
 function ground(g,px,py,size,h,id,x=0,y=0,variant=0){
  const w=art(id,'floorW');
  if(w){const sw=w.naturalWidth/WORLD_N,sh=w.naturalHeight/WORLD_N,ix=((x%WORLD_N)+WORLD_N)%WORLD_N,iy=((y%WORLD_N)+WORLD_N)%WORLD_N;
   // 1px overlap hides hairline gaps between neighbouring cells.
   g.drawImage(w,ix*sw,iy*sh,sw,sh,px,py,size+1,h+1);return;}
  g.drawImage(base(id),px,py,size,h);if(variant!==1)g.drawImage(patch(id,'floor'+variant),px,py,size,h);}
 // Carve the footprint from neighbouring floor cells, in WORLD coordinates.
 // A floor cell owns its cutter: both wall neighbours therefore share endpoints.
 // Diagonal cutters make fan-shaped corners; cardinal cutters make deep recesses.
 state.footprint=function(map,x,y,seed=0,id='limestone'){
  const c=canvas(),g=c.getContext('2d');g.fillRect(0,0,128,128);
  g.globalCompositeOperation='destination-out';
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!(dx||dy)||map[y+dy]?.[x+dx]===undefined||map[y+dy][x+dx]===0)continue;
   const hash=(((x+dx)*73856093^(y+dy)*19349663^seed)>>>0);
   const radius=128*(.77+(hash%17)/100),cx=(dx+.5)*128,cy=(dy+.5)*128;
   g.beginPath();
   // Recess sizes vary between cells without opening seams between rock cells.
   const sides=id==='ruins'?5:12,angle=(hash%31)/31*Math.PI;
   for(let i=0;i<sides;i++){const a=angle+i*Math.PI*2/sides;
    const r=radius*(1+.035*Math.sin(i*2.7+hash%13));
    const xx=cx+Math.cos(a)*r,yy=cy+Math.sin(a)*r;
    if(i)g.lineTo(xx,yy);else g.moveTo(xx,yy);
   }g.closePath();g.fill();
  }
  return c;
 };
 function bank(id,map,x,y,seed,variant,phaseX,phaseY){
  const {edges,diagonals}=state.topology(map,x,y);
  // Neighbour-owned radii depend on world coordinates, not just topology.
  const k=[id,x,y,seed,edges,diagonals,variant,state.heightPref].join(':');if(cache.has(k))return cache.get(k);
  const OFF=offOf(),H=OFF+114,rise=HEIGHTS[state.heightPref][(edges&1)?0:1],p=105,c=canvas(128,H),g=c.getContext('2d');
  const footprint=state.footprint(map,x,y,seed,id),top=canvas(128,p),tg=top.getContext('2d');
  tg.drawImage(footprint,0,0,128,p);
  // Extrude the actual scalloped footprint. A rectangular facade would fill
  // the negative space back in and undo the partial-cell silhouette.
  const face=canvas(128,H),fg=face.getContext('2d');
  for(let z=rise;z>=0;z--)fg.drawImage(top,0,OFF-z);
  fg.globalCompositeOperation='destination-out';fg.drawImage(top,0,OFF-rise);
  fg.globalCompositeOperation='source-in';
  const wf=art(id,'wallF'+variant),kf=wf.naturalWidth/256;   // sheets may be 256 or higher resolution
  fg.drawImage(wf,phaseX*128*kf,0,128*kf,256*kf,0,0,128,H);
  // Darker vertical faces distinguish raised rock from the walkable floor.
  fg.globalCompositeOperation='source-atop';
  const shadow=fg.createLinearGradient(0,0,0,H);shadow.addColorStop(0,'rgba(0,0,0,.12)');shadow.addColorStop(1,'rgba(0,0,0,.55)');fg.fillStyle=shadow;fg.fillRect(0,0,128,H);
  g.drawImage(face,0,0);
  const cap=canvas(128,p),cg=cap.getContext('2d');
  const wt=art(id,'wallT'+variant);
  if(WORLD_CAP.has(id)){
   // Top-down rock: each cell shows its own slice of one seamless sheet. The
   // ceiling uses the same sheet and period, so cap and ceiling read as one mass.
   const cw=wt.naturalWidth/CAP_N,ch=wt.naturalHeight/CAP_N,ci=((x%CAP_N)+CAP_N)%CAP_N,cj=((y%CAP_N)+CAP_N)%CAP_N;
   cg.drawImage(wt,ci*cw,cj*ch,cw,ch,0,0,128,p);
  }else{const kt=wt.naturalWidth/256;cg.drawImage(wt,phaseX*128*kt,phaseY*64*kt,128*kt,128*kt,0,0,128,p);}
  cg.globalCompositeOperation='destination-in';cg.drawImage(top,0,0);
  g.drawImage(cap,0,OFF-rise);
  if(cache.size>512)cache.clear();cache.set(k,c);return c;
 }
  // Soft ambient shadow on floor cells beside walls (shadeK: 0 none, 1 standard, 1.6 strong).
 state.shadeK=1;
 function edgeShade(g,map,x,y,px,py,size,h){
  const k=state.shadeK;if(!k)return;
  const wall=(dx,dy)=>map[y+dy]?.[x+dx]===undefined||map[y+dy][x+dx]===0;
  const n=wall(0,-1),s=wall(0,1),w=wall(-1,0),e=wall(1,0);
  const band=(x0,y0,x1,y1,rx,ry,rw,rh,a)=>{const gr=g.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,'rgba(6,4,3,'+(a*k).toFixed(3)+')');gr.addColorStop(.45,'rgba(6,4,3,'+(a*k*.42).toFixed(3)+')');gr.addColorStop(1,'rgba(6,4,3,0)');g.fillStyle=gr;g.fillRect(rx,ry,rw,rh);};
  if(n){const d=h*.62;band(px,py,px,py+d,px,py,size,d,.46);}
  if(w){const d=size*.36;band(px,py,px+d,py,px,py,d,h,.30);}
  if(e){const d=size*.36;band(px+size,py,px+size-d,py,px+size-d,py,d,h,.30);}
  if(s){const d=h*.26;band(px,py+h,px,py+h-d,px,py+h-d,size,d,.22);}
  // Inner corners where only the diagonal neighbour is rock.
  const corner=(cx,cy,sx,sy)=>{const r=size*.40,gr=g.createRadialGradient(cx,cy,0,cx,cy,r);gr.addColorStop(0,'rgba(6,4,3,'+(.30*k).toFixed(3)+')');gr.addColorStop(1,'rgba(6,4,3,0)');g.save();g.beginPath();g.rect(px,py,size,h);g.clip();g.fillStyle=gr;g.fillRect(cx-r,cy-r,r*2,r*2);g.restore();};
  if(!n&&!w&&wall(-1,-1))corner(px,py);
  if(!n&&!e&&wall(1,-1))corner(px+size,py);
  if(!s&&!w&&wall(-1,1))corner(px,py+h);
  if(!s&&!e&&wall(1,1))corner(px+size,py+h);
 }
 state.draw=function(g,key,px,py,size,{map,x=0,y=0,theme,seed=0}){if(!state.ready)return false;const id=ids.includes(theme?.id)?theme.id:'limestone',h=size*PITCH;g.imageSmoothingEnabled=true;
  if(key.startsWith('floor')){const hash=(((x*73856093)^(y*19349663)^seed)>>>0),v=hash%31===0?3:hash%3;ground(g,px,py,size,h,id,x,y,v);edgeShade(g,map,x,y,px,py,size,h);return true;}
  if(key==='stairs'){ground(g,px,py,size,h,id,x,y,1);g.drawImage(patch(id,'stairs'),px,py,size,h);return true;}
  if(key!=='wallF'&&key!=='wallT')return false;const {edges,diagonals}=state.topology(map,x,y);ground(g,px,py,size,h,id,x,y,1);const v=(((x>>1)*37^(y>>1)*71^seed)>>>0)&1;const OFF=offOf();g.drawImage(bank(id,map,x,y,seed,v,x&1,y&1),px,py-size*OFF/128,size,size*(OFF+114)/128);return true;
 };
 root.CaveTerrain=state;
})(typeof window==='undefined'?globalThis:window);
