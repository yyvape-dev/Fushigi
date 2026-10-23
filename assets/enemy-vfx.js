// Image-backed deep-enemy telegraphs. Visual events only: no RNG, timers,
// gameplay callbacks, input locks, or entity references retained across saves.
(function(root){
 const colors={warp:'#71dcff',confuse:'#ec85ed',mute:'#aaa0ff',drain:'#bd67ed'};
 const point=e=>({x:e.x,y:e.y});
 function emit(type,from,to=from,options={}){
  const e=root.EventVfx.emit('enemy-'+type,from.x,from.y,{screenOnly:true,from:point(from),to:point(to),duration:650,...options});
  if(e&&typeof kick==='function')kick();return e;
 }
 function attack(e,T,target,hit,ranged){
  const f=T.family||e.kind,type=ranged?(f==='ninja'?'shuriken':f==='caster'?'magic':f==='cannon'?'cannon':T.boss&&T.ai==='breath'?'abyss':null):f==='mimic'?'bite':null;
  return type?emit(type,e,target,{hit,color:colors[T.fx]||'#b785f5',duration:type==='shuriken'?420:type==='abyss'?720:650}):null;
 }
 const tintCache=new Map();
 function texture(name,color){
  const im=root.EventVfx.state.images[name];if(!im||!color)return im;
  const key=name+color;if(tintCache.has(key))return tintCache.get(key);
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.drawImage(im,0,0,128,128);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,128,128);tintCache.set(key,c);return c;
 }
 function sprite(g,name,x,y,w,h,alpha=1,angle=0,color){
  const im=texture(name,color);if(!im||alpha<=0)return;g.save();g.globalAlpha=Math.max(0,Math.min(1,alpha));g.translate(x,y);g.rotate(angle);g.imageSmoothingEnabled=true;g.drawImage(im,-w/2,-h/2,w,h);g.restore();
 }
 function explosion(g,p,x,y,s){
  const im=root.EventVfx.state.images.explosion;if(!im||p<0||p>=1)return;const n=Math.min(15,Math.floor(p*16));g.save();g.globalAlpha=1-p*.35;g.drawImage(im,n%4*128,Math.floor(n/4)*128,128,128,x-s/2,y-s/2,s,s);g.restore();
 }
 function ring(g,x,y,s,alpha,color,ratio=.45){sprite(g,'ring',x,y,s,s*ratio,alpha,0,color);}
 function shuriken(g,x,y,s,angle,alpha){
  g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=alpha;g.fillStyle='#e9f1fb';g.strokeStyle='#52657a';g.lineWidth=1;
  g.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=s*(i%2?.2:.52);const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i)g.lineTo(x,y);else g.moveTo(x,y);}g.closePath();g.fill();g.stroke();g.fillStyle='#344356';g.beginPath();g.arc(0,0,s*.09,0,Math.PI*2);g.fill();g.restore();
 }
 function clip(g,e,cx,cy,size,pitch,visible){
  const x0=Math.floor(Math.min(e.from.x,e.to.x))-2,x1=Math.ceil(Math.max(e.from.x,e.to.x))+2,y0=Math.floor(Math.min(e.from.y,e.to.y))-3,y1=Math.ceil(Math.max(e.from.y,e.to.y))+2;
  g.beginPath();for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(visible(x,y))g.rect(cx+x*size,cy+y*pitch,size,pitch);g.clip();
 }
 function draw(g,t,cx,cy,size,pitch,visible=()=>true){
  const less=(typeof vfxPref!=='undefined'&&vfxPref===0)||(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  for(const e of root.EventVfx.state.events){
   if(!e.kind.startsWith('enemy-')||t<e.start||t>=e.start+e.duration||!visible(e.from.x,e.from.y)||!visible(e.to.x,e.to.y))continue;
   const kind=e.kind.slice(6),p=(t-e.start)/e.duration,fade=Math.sin(p*Math.PI),q=Math.min(1,p/.4);
   const actorScale=typeof CHAR_K!=='undefined'&&typeof charPref!=='undefined'?CHAR_K[charPref]:1.5,emitter=kind==='abyss'||kind==='magic'?.67:kind==='cannon'?.6:.4;
   const a={x:cx+(e.from.x+.5)*size,y:cy+(e.from.y+.88)*pitch-size*actorScale*emitter},b={x:cx+(e.to.x+.5)*size,y:cy+(e.to.y+.88)*pitch-size*actorScale*.4},x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q;
   g.save();clip(g,e,cx,cy,size,pitch,visible);g.lineCap='round';g.globalCompositeOperation='lighter';
   if(['shuriken','magic','cannon','abyss'].includes(kind)){
    const color=kind==='shuriken'?'#b7d8f9':kind==='cannon'?'#ffc36b':kind==='abyss'?'#ed586e':e.color;
    if(!less&&p<.44){for(let i=1;i<=4;i++){const r=Math.max(0,q-i*.09),tx=a.x+(b.x-a.x)*r,ty=a.y+(b.y-a.y)*r;sprite(g,kind==='cannon'||kind==='abyss'?'gas':'spark',tx,ty,size*.23,size*.23,(1-i/5)*.5,0,color);}}
    if(p<.42){
     if(kind==='shuriken'){g.globalCompositeOperation='source-over';shuriken(g,less?b.x:x,less?b.y:y,size*.25,less?0:p*28,less?fade:1);g.globalCompositeOperation='lighter';}
     else if(kind==='cannon'){sprite(g,'spark',a.x,a.y,size*.5,size*.5,Math.max(0,1-p*5),0,color);g.globalCompositeOperation='source-over';g.fillStyle='#343640';g.beginPath();g.arc(less?b.x:x,less?b.y:y,size*.075,0,Math.PI*2);g.fill();g.globalCompositeOperation='lighter';sprite(g,'spark',less?b.x:x,less?b.y:y,size*.15,size*.15,.8,0,color);}
     else if(kind==='magic'){sprite(g,'spark',less?b.x:x,less?b.y:y,size*.48,size*.48,less?fade:.95,0,color);sprite(g,'ring',less?b.x:x,less?b.y:y,size*.3,size*.3,.8,less?0:p*5,color);}
     else{
      if(!less){g.globalAlpha=.6;g.strokeStyle='#d94d66';g.lineWidth=size*.28;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(x,y);g.stroke();g.globalAlpha=.8;g.strokeStyle='#b879ed';g.lineWidth=size*.1;g.stroke();g.globalAlpha=1;}
      for(let i=0;i<(less?2:9);i++){const u=q*i/(less?1:8),s=size*(.6+Math.sin(i*1.7+p*9)*.1);sprite(g,'gas',a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,s,s*1.35,less?.3:.8,less?0:p*3,color);sprite(g,'spark',a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,size*.3,size*.3,less?.25:.6,0,i%2?'#ffad64':'#b277ed');}
     }
    }
    if(p>.35){const k=(p-.35)/.65;if(e.hit){if(kind==='cannon'&&!less){g.globalCompositeOperation='source-over';explosion(g,k,b.x,b.y,size*(e.radius?3:1.35));g.globalCompositeOperation='lighter';}else{sprite(g,'spark',b.x,b.y,size*(.4+k*.45),size*(.4+k*.45),Math.sin(k*Math.PI)*(less?.4:.9),0,color);ring(g,b.x,b.y+size*.5,size*(.5+k),Math.sin(k*Math.PI)*.6,color);}}else sprite(g,'dust',b.x,b.y+size*.25,size*.55,size*.4,Math.sin(k*Math.PI)*.5);
     if(kind==='cannon'&&e.radius){g.save();g.globalCompositeOperation='source-over';g.globalAlpha=Math.sin(k*Math.PI)*.22;g.fillStyle='#ffab59';for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)g.fillRect(cx+(e.to.x+dx)*size+1,cy+(e.to.y+dy)*pitch+1,size-2,pitch-2);g.restore();}
    }
   }else if(kind==='lightning'){
    const points=[],vx=b.x-a.x,vy=b.y-a.y,len=Math.hypot(vx,vy)||1;for(let i=0;i<=8;i++){const u=i/8,j=i===0||i===8?0:Math.sin(i*2.7+(less?0:p*12))*size*.16;points.push([a.x+vx*u-vy/len*j,a.y+vy*u+vx/len*j]);}
    for(const [w,c]of [[size*.09,'#bda6ff'],[size*.035,'#fff9b8']]){g.globalAlpha=fade*(less?.45:.9);g.strokeStyle=c;g.lineWidth=Math.max(1,w);g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
    sprite(g,'lightning',b.x,b.y,size*1.2,size*1.2,fade*(less?.25:.7));sprite(g,'spark',a.x,a.y,size*.65,size*.65,fade*.65);
   }else if(kind==='evolve'){
    ring(g,b.x,b.y+size*.5,size*(.65+p*.9),fade*.8,'#ffa65e');sprite(g,'spark',b.x,b.y,size*.9,size*1.7,fade*.6,0,'#ed9c78');
    const im=root.EventVfx.state.images.blessing;if(im){const n=Math.min(21,Math.floor(p*22));g.save();g.globalAlpha=fade*.7;g.drawImage(im,n*128,0,128,256,b.x-size*.7,b.y-size*.9,size*1.4,size*2);g.restore();}
   }else if(kind==='rubble'){
    for(let i=0;i<(less?2:8);i++){const a=i*2.4;sprite(g,'dust',b.x+Math.cos(a)*size*p*1.1,b.y+size*.5+Math.sin(a)*pitch*p,size*.7,size*.6,fade*.65,a);}
   }else if(kind==='bell'){
    for(let i=0;i<(less?1:3);i++){const u=(p+i/3)%1;ring(g,a.x,a.y+size*.35,size*(.5+u*2),Math.sin(u*Math.PI)*.65,'#ffdc72');}sprite(g,'spark',a.x+size*.25,a.y,size*.38,size*.38,fade*.7,0,'#ffeaa8');
   }else if(kind==='arrival'||kind==='reveal'||kind==='vanish'){
    const color=kind==='reveal'?'#d59bf4':kind==='vanish'?'#78dfff':'#b3a3ff';ring(g,b.x,b.y+size*.5,size*(.65+p*.7),fade*.75,color);
    if(kind==='arrival'&&!less){const im=root.EventVfx.state.images.transfer;if(im){const n=Math.min(21,Math.floor(p*22));g.save();g.globalAlpha=.7;g.drawImage(im,n*128,0,128,256,b.x-size*.6,b.y-size*.75,size*1.2,size*1.9);g.restore();}}
    for(let i=0;i<(less?2:5);i++){const a=i*2.4;sprite(g,'gas',b.x+Math.cos(a)*size*p*.45,b.y+size*.2-p*size*.4+Math.sin(a)*size*.12,size*.6,size*.7,fade*.65,0,color);}sprite(g,'spark',b.x,b.y,size*.8,size*1.2,fade*.55,0,color);
   }else if(kind==='curse'){
    const color=e.blocked?'#bfc5ca':colors[e.status]||'#bd75f5';ring(g,b.x,b.y-size*.35,size*(.65+p*.35),fade*.75,color,.8);sprite(g,'gas',b.x,b.y-size*.15,size*.8,size*.9,fade*.4,0,color);
    if(!e.blocked){g.globalCompositeOperation='source-over';g.globalAlpha=fade;g.fillStyle=color;g.strokeStyle='#271a31';g.lineWidth=3;g.textAlign='center';g.font='bold '+Math.round(size*.32)+'px sans-serif';const label=e.status==='drain'?'Lv↓':e.status==='mute'?'×':'?';g.strokeText(label,b.x,b.y-size*.5);g.fillText(label,b.x,b.y-size*.5);}
   }else if(kind==='bite'){
    sprite(g,'spark',b.x,b.y,size*.7,size*.7,fade*.6,0,'#ffd1a1');ring(g,b.x,b.y,size*(.55+p*.3),fade*.7,'#ef9bba',1);
   }
   g.restore();
  }
 }
 root.EnemyVfx={emit,attack,draw};
})(typeof window==='undefined'?globalThis:window);
