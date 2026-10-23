// Image-backed event effects. Rules are committed once; animation uses wall time,
// never world turns. flush() settles a pending action before a run is saved.
(function(root){
 const state={images:{},events:[],tasks:[],waiters:new Set(),until:0,flushing:false,force:false,error:null};
 const clock=()=>state.clock?state.clock():performance.now();
 const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 const live=()=>!state.flushing&&(state.force||(typeof Image!=='undefined'&&typeof requestAnimationFrame==='function'&&!document.hidden));
 const pending=()=>state.tasks.length>0||clock()<state.until;
 const busy=()=>!state.flushing&&(pending()||state.waiters.size>0);
 const names=['blessing','transfer','explosion','spark','ring','gas','dust'];
 async function load(redraw){await Promise.all(names.map(name=>new Promise(resolve=>{
  const im=new Image();im.onload=()=>{state.images[name]=im;resolve();};im.onerror=()=>{state.error=name;console.error('VFX画像読込失敗',name);resolve();};im.src='assets/vfx/'+name+'.png';
 })));redraw();}
 function emit(kind,x,y,options={}){
  if(!live())return null;
  const e={kind,x,y,start:clock()+(options.delay||0),duration:options.duration||850,...options};
  state.events.push(e);if(state.events.length>40)state.events.shift();return e;
 }
 function play(kind,x,y,options={}){
  const e=emit(kind,x,y,options);if(!e)return false;
  if(options.lock!==false){state.until=Math.max(state.until,e.start+e.duration);holdStop();}
  if(options.apply)state.tasks.push({at:e.start+(options.resultAt??e.duration),run:options.apply});
  kick();return true;
 }
 function defer(fn){if(!busy())return false;state.waiters.add(fn);kick();return true;}
 function update(t=clock()){
  const due=state.tasks.filter(a=>a.at<=t);state.tasks=state.tasks.filter(a=>a.at>t);
  for(const a of due)a.run();
  if(!pending()){const waiting=[...state.waiters];state.waiters.clear();for(const fn of waiting)fn();}
  state.events=state.events.filter(e=>t<e.start+e.duration);
 }
 function flush(){
  if(state.flushing)return;
  state.flushing=true;
  try{
   // A trap's result can enqueue its one remaining turn. Drain both together.
   for(let i=0;i<20&&(state.tasks.length||state.waiters.size);i++){
    const tasks=state.tasks;state.tasks=[];for(const a of tasks)a.run();
    const waits=[...state.waiters];state.waiters.clear();for(const fn of waits)fn();
   }
  }finally{state.events=[];state.until=0;state.flushing=false;}
 }
 function reset(){state.events=[];state.tasks=[];state.waiters.clear();state.until=0;}
 const progress=(e,t)=>Math.max(0,Math.min(1,(t-e.start)/e.duration));
 function pose(entity,t){
  const e=state.events.find(e=>['pit','warp'].includes(e.kind)&&e.entity===entity&&t>=e.start&&t<e.start+e.duration);
  if(!e)return {scale:1,alpha:1,drop:0,angle:0};
  if(e.kind==='warp'){const p=progress(e,t);return {scale:1,alpha:p<.6?Math.max(0,1-p/.48):1,drop:0,angle:0};}
  const p=Math.max(0,(progress(e,t)-.28)/.65);
  return {scale:Math.max(.08,1-p*.88),alpha:Math.max(0,1-p*1.4),drop:p*.3,angle:reduced()?0:p*.28};
 }
 function image(g,name,x,y,w,h,alpha=1,rotation=0){
  const im=state.images[name];if(!im||alpha<=0)return;
  g.save();g.globalAlpha=Math.min(1,alpha);g.translate(x,y);g.rotate(rotation);g.imageSmoothingEnabled=true;g.drawImage(im,-w/2,-h/2,w,h);g.restore();
 }
 function sequence(g,name,p,x,y,w,h,alpha=1){
  const im=state.images[name];if(!im||p<0||p>=1)return;
  const frames=name==='explosion'?16:22,n=Math.min(frames-1,Math.floor(p*frames));
  const sw=name==='explosion'?128:128,sh=name==='explosion'?128:256;
  g.save();g.globalAlpha=alpha;g.imageSmoothingEnabled=true;
  g.drawImage(im,name==='explosion'?n%4*sw:n*sw,name==='explosion'?Math.floor(n/4)*sh:0,sw,sh,x-w/2,y-h/2,w,h);g.restore();
 }
 function particles(g,name,p,x,y,size,count,up=false){
  const less=reduced()||vfxPref===0,n=less?Math.min(3,count):count;
  for(let i=0;i<n;i++){
   const a=i*2.39996,phase=(i%5)/5,q=Math.max(0,Math.min(1,p*1.3-phase*.3));
   const spread=size*(.15+q*.58),px=x+Math.cos(a)*spread,py=y+(up?-q*size:Math.sin(a)*spread*.5);
   image(g,name,px,py,size*(name==='spark'?.14:.7)*(1+q*.3),size*(name==='spark'?.14:.7)*(1+q*.3),Math.sin(q*Math.PI)*.85,a+q*.4);
  }
 }
 function drawWorld(g,t,camX,camY,size,pitch,layer){
  for(const e of state.events){
   if(e.screenOnly||t<e.start||t>=e.start+e.duration)continue;
   const p=progress(e,t),ent=e.kind==='warp'?null:e.entity,x=camX+((ent?ent.vx:e.x)+.5)*size,y=camY+((ent?ent.vy:e.y)+.88)*pitch;
   const fade=Math.sin(Math.PI*p),strong=e.up===3?1.25:1;
   g.save();
   if(layer==='floor'){
    if(e.kind==='pit'){
     const open=Math.min(1,p*5);g.fillStyle='#0b080c';g.beginPath();g.ellipse(x,y,size*.48*open,pitch*.35*open,0,0,Math.PI*2);g.fill();
     const trap=typeof DungeonExperience!=='undefined'&&DungeonExperience.images['trap-pit'];
     if(trap){g.globalAlpha=.7;g.drawImage(trap,x-size*.57,y-pitch*.47,size*1.14,pitch*.85);}
    }else{
     image(g,'ring',x,y,size*(.7+p*.9)*strong,pitch*(.4+p*.45)*strong,fade*.85);
    }
   }else if(['level','weapon','shield'].includes(e.kind)){
    g.globalCompositeOperation='lighter';
    image(g,'spark',x,y-size*.8,size*.65*strong,size*2.1*strong,fade*.7);
    sequence(g,'blessing',p,x,y-size*.65,size*1.55*strong,size*2.5*strong,.85);
    particles(g,'spark',p,x,y-size*.15,size*1.2*strong,e.up===3?18:12,true);
    g.globalCompositeOperation='source-over';
    if(p>.15&&p<.85){g.globalAlpha=Math.min(1,(p-.15)*8,(.85-p)*8);g.fillStyle='#ffedb8';g.shadowColor='#513008';g.shadowBlur=4;g.font='bold '+Math.round(size*.3)+'px Georgia, serif';g.textAlign='center';g.fillText(e.kind==='level'?'LEVEL UP':e.kind==='weapon'?'武器 ＋'+e.up:'盾 ＋'+e.up,x,y-size*1.5);g.shadowBlur=0;g.globalAlpha=1;}
    // Glow the equipped side, then the gear icon resolves after reading ends.
    if(e.kind!=='level'){
     const side=e.kind==='weapon'?-1:1;
     let px=x+side*size*.29,py=y-size*.65;
     if(typeof ApprovedHero!=='undefined'&&ApprovedHero.base&&ent){
      const [dx,dy]=ent.face||[0,1],id=(Math.round(Math.atan2(-dx,dy)/(Math.PI/4))+8)%8;
      const socket=ApprovedHero.base.directions[id][e.kind==='weapon'?'right':'left'].position;
      const s=size*CHAR_K[charPref]/192;px=x+(socket[0]-128)*s;py=y+(socket[1]-224)*s-(e.kind==='weapon'?size*.3:0);
     }
     if(p>.44)image(g,'spark',px,py,size*.6,strong*size*.6,fade);
     const key=e.item,im=typeof SPRITES!=='undefined'&&SPRITES[key];
     if(im&&p>.48){g.globalAlpha=Math.sin((p-.48)/.52*Math.PI)*.85;g.drawImage(im,x-size*.25,y-size*(1.4+p*.15),size*.5,size*.5);}
    }
   }else if(e.kind==='mine'){
    if(p<.24)image(g,'spark',x,y,size*.5,size*.5,p*4);
    else sequence(g,'explosion',(p-.24)/.76,x,y-size*.4,size*2.7,size*2.7);
   }else if(e.kind==='gas'){
    particles(g,'gas',p,x,y-size*.35,size*1.05,7,true);
    if(p>.45){g.globalAlpha=fade;g.fillStyle='#d7d9ff';g.font='bold '+Math.round(size*.3)+'px Georgia';g.textAlign='center';g.fillText(e.blocked?'防いだ':'Z z z',x,y-size*1.25);}
   }else if(e.kind==='hungry'){
    particles(g,'dust',p,x,y-size*.45,size*.7,5,true);
    if(p>.2){g.globalAlpha=fade;g.fillStyle='#f3c57b';g.font='bold '+Math.round(size*.25)+'px sans-serif';g.textAlign='center';g.fillText('満腹度 −10',x,y-size*(.9+p*.3));}
   }else if(['warp','arrival','summon'].includes(e.kind)){
    sequence(g,'transfer',p,x,y-size*.7,size*1.9,size*2.7,.9);
    particles(g,e.kind==='summon'?'gas':'spark',p,x,y-size*.3,size,7,true);
   }else if(e.kind==='pit')particles(g,'dust',p,x,y,size,6);
   g.restore();
  }
 }
 root.EventVfx={state,load,live,busy,emit,play,defer,update,flush,reset,pose,drawWorld,animating:t=>busy()||state.events.some(e=>t<e.start+e.duration)};
})(typeof window==='undefined'?globalThis:window);
