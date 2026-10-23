// Generated crimson skull/title + eight generated, cross-faded mist frames.
(function(root){
 const script=typeof document!=='undefined'&&document.currentScript?.src;
 const base=script?new URL('art/',script).href:'fushigi-monster-house-v2/art/';
 const state={images:{},error:null};
 async function load(redraw=()=>{}){
  await Promise.all(['title','mist'].map(key=>new Promise(resolve=>{
   const im=new Image();im.onload=()=>{state.images[key]=im;resolve();};im.onerror=()=>{state.error=key;resolve();};im.src=base+key+'.png';
  })));redraw();
 }
 const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 const DURATION=2200;
 function drawAt(g,elapsed,width,height,centerY=height*.45){
  if(elapsed<0||elapsed>=DURATION||!state.images.title)return;
  const enter=Math.min(1,elapsed/260),leave=Math.min(1,(DURATION-elapsed)/380),alpha=enter*leave;
  const w=Math.min(width*.96,840,height*1.05),h=w*2/3;
  const x=width/2,y=Math.max(h/2+45,Math.min(height-h/2-20,centerY));
  const smooth=1-Math.pow(1-enter,3),scale=reduced()?1:1.035-.035*smooth;
  g.save();g.translate(x,y);g.scale(scale,scale);g.imageSmoothingEnabled=true;
  g.globalAlpha=alpha*.94;g.drawImage(state.images.title,-w/2,-h/2,w,h);
  const fog=state.images.mist;
  if(fog){
   const phase=reduced()?2:elapsed/155,n=Math.floor(phase)%8,blend=phase%1;
   const drift=reduced()?0:Math.sin(elapsed/650)*w*.012,rise=reduced()?0:Math.sin(elapsed/400)*h*.018;
   // Interpolate neighbouring generated frames instead of stepping abruptly.
   const frame=(index,opacity,px,py,fw,fh)=>{g.globalAlpha=alpha*opacity;g.drawImage(fog,index*512,0,512,320,px-fw/2,py-fh/2,fw,fh);};
   frame(n,.22*(1-blend),drift,h*.24+rise,w*1.02,h*.4);
   frame((n+1)%8,.22*blend,drift,h*.24+rise,w*1.02,h*.4);
   frame((n+4)%8,.15*(1-blend),-drift,-h*.13-rise,w*.65,h*.5);
   frame((n+5)%8,.15*blend,-drift,-h*.13-rise,w*.65,h*.5);
  }
  g.restore();
 }
 function play(x,y){return EventVfx.play('house',x,y,{screenOnly:true,duration:DURATION});}
 function draw(g,t,width,height,centerY){
  const e=EventVfx.state.events.find(e=>e.kind==='house'&&t>=e.start&&t<e.start+e.duration);
  if(e)drawAt(g,t-e.start,width,height,centerY);
 }
 root.MonsterHouseVfx={state,load,play,draw,drawAt,DURATION};
})(typeof window==='undefined'?globalThis:window);
