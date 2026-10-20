// Five original location sets; projected floor + raised, topology-aware banks.
(function(root){
 const SIZE=128,PITCH=.82,images={},cache=new Map();
 const ids=['forest','limestone','ruins','ice','volcano'];
 const state={ready:false,error:null,version:'locations-v1',images,cache,pitch:PITCH,ids};
 const keys=['floor0','floor1','floor2','floor3','wallT0','wallT1','wallF0','wallF1','stairs'];
 state.load=async function(redraw){try{await Promise.all(ids.flatMap(id=>keys.map(key=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[id+':'+key]=im;resolve();};im.onerror=()=>reject(Error(id+'/'+key));im.src='assets/dungeon/locations-v1/'+id+'/'+key+'.webp';}))));state.ready=true;redraw();}catch(e){state.error=e.message;console.error('ロケーション画像読込失敗',e);redraw();}};
 state.topology=function(map,x,y){const f=(xx,yy)=>map[yy]?.[xx]!==undefined&&map[yy][xx]!==0;let edges=0,diagonals=0;[[0,-1],[1,0],[0,1],[-1,0]].forEach(([dx,dy],i)=>{if(f(x+dx,y+dy))edges|=1<<i;});[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([dx,dy],i)=>{if(f(x+dx,y+dy))diagonals|=1<<i;});return {edges,diagonals};};
 state.rise=(map,x,y,size)=>size*((state.topology(map,x,y).edges&1)?.10:.36);
 function canvas(w=SIZE,h=SIZE){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
 function art(id,key){return images[id+':'+key];}
 function patch(id,key){const k=id+':patch:'+key;if(cache.has(k))return cache.get(k);const c=canvas(),g=c.getContext('2d');g.drawImage(art(id,key),0,0,SIZE,SIZE);g.globalCompositeOperation='destination-in';const r=g.createRadialGradient(64,64,18,64,64,62);r.addColorStop(0,'#000');r.addColorStop(1,'#0000');g.fillStyle=r;g.fillRect(0,0,SIZE,SIZE);cache.set(k,c);return c;}
 function base(id){
  const k=id+':base';if(cache.has(k))return cache.get(k);const c=canvas(),g=c.getContext('2d');g.drawImage(art(id,'floor1'),0,0,128,128);const original=g.getImageData(0,0,128,128),out=g.createImageData(128,128),d=original.data;
  // Blend only an eight-pixel material border. Interior art is never mirrored.
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const wx=Math.max(0,(1-Math.min(x,127-x)/8))*.5,wy=Math.max(0,(1-Math.min(y,127-y)/8))*.5;for(let ch=0;ch<4;ch++){const sample=(xx,yy)=>d[(yy*128+xx)*4+ch];out.data[(y*128+x)*4+ch]=sample(x,y)*(1-wx)*(1-wy)+sample(127-x,y)*wx*(1-wy)+sample(x,127-y)*(1-wx)*wy+sample(127-x,127-y)*wx*wy;}}
  g.putImageData(out,0,0);cache.set(k,c);return c;
 }
 function ground(g,px,py,size,h,id,x=0,y=0,variant=0){g.drawImage(base(id),px,py,size,h);if(variant!==1)g.drawImage(patch(id,'floor'+variant),px,py,size,h);}
 function silhouette(g,edges){const n=edges&1,e=edges&2,s=edges&4,w=edges&8;const l=w?3:0,t=n?3:0,r=e?125:128,b=s?125:128,a=n&&w?17:0,c=n&&e?17:0,d=s&&e?17:0,f=s&&w?17:0;g.beginPath();g.moveTo(l+a,t);g.lineTo(r-c,t);g.quadraticCurveTo(r,t,r,t+c);g.lineTo(r,b-d);g.quadraticCurveTo(r,b,r-d,b);g.lineTo(l+f,b);g.quadraticCurveTo(l,b,l,b-f);g.lineTo(l,t+a);g.quadraticCurveTo(l,t,l+a,t);g.closePath();}
 function bank(id,edges,diag,variant,phaseX,phaseY){const k=[id,edges,diag,variant,phaseX,phaseY].join(':');if(cache.has(k))return cache.get(k);const rise=(edges&1)?13:46,p=105,c=canvas(128,160),g=c.getContext('2d');
  g.save();g.translate(0,46-rise);g.scale(1,PITCH);silhouette(g,edges);g.clip();const im=art(id,'wallT'+variant);g.drawImage(im,phaseX*128,phaseY*64,128,128,0,0,128,128);g.restore();
  if(edges&4){g.save();g.beginPath();g.roundRect((edges&8)?3:0,46+p-rise-2,(edges&8||edges&2)?125:128,rise+2,7);g.clip();g.drawImage(art(id,'wallF'+variant),phaseX*128,0,128,256,0,46+p-rise,128,rise);g.restore();}
  // Small side lips preserve legibility of width-one corridors.
  for(const [bit,x]of [[8,0],[2,122]])if(edges&bit){g.fillStyle='#10181d55';g.fillRect(x,46-rise+10,6,p-8);}
  if(cache.size>240)cache.clear();cache.set(k,c);return c;
 }
 state.draw=function(g,key,px,py,size,{map,x=0,y=0,theme,seed=0}){if(!state.ready)return false;const id=ids.includes(theme?.id)?theme.id:'limestone',h=size*PITCH;g.imageSmoothingEnabled=true;
  if(key.startsWith('floor')){const hash=(((x*73856093)^(y*19349663)^seed)>>>0),v=hash%31===0?3:hash%3;ground(g,px,py,size,h,id,x,y,v);return true;}
  if(key==='stairs'){ground(g,px,py,size,h,id,x,y,1);g.drawImage(patch(id,'stairs'),px,py,size,h);return true;}
  if(key!=='wallF'&&key!=='wallT')return false;const {edges,diagonals}=state.topology(map,x,y);ground(g,px,py,size,h,id,x,y,1);const v=(((x>>1)*37^(y>>1)*71^seed)>>>0)&1;g.drawImage(bank(id,edges,diagonals,v,x&1,y&1),px,py-size*46/128,size,size*160/128);return true;
 };
 root.CaveTerrain=state;
})(typeof window==='undefined'?globalThis:window);
