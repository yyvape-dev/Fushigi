// Blade-only animated textures. Existing renderers apply sockets, foreshortening,
// hand masks and back/front ordering to this canvas just as to the original PNG.
(function(root){
 'use strict';
 const palettes={kamaitachi:{color:'#f32645',period:2100},skyblade:{color:'#2f9dff',period:2600},firesword:{color:'#bd182d',period:1800,darkCore:true}};
 function create(image,mask,key){
  const style=palettes[key];if(!style||!image||!mask)return null;
  const make=()=>{const c=document.createElement('canvas');c.width=image.width;c.height=image.height;return c;};
  const canvas=make(),g=canvas.getContext('2d'),tint=make(),tg=tint.getContext('2d');
  tg.drawImage(mask,0,0);tg.globalCompositeOperation='source-in';tg.fillStyle=style.color;tg.fillRect(0,0,tint.width,tint.height);
  const dark=style.darkCore?make():null;
  if(dark){const d=dark.getContext('2d');d.drawImage(mask,0,0);d.globalCompositeOperation='source-in';d.fillStyle='#130913';d.fillRect(0,0,dark.width,dark.height);}
  const reduced=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
  let last=-1;
  function update(now=0){
   const time=Number.isFinite(now)?Math.max(0,now):0,quiet=!!reduced?.matches,bucket=quiet?0:Math.floor(time/33);
   if(bucket===last)return false;last=bucket;
   const phase=quiet?0:bucket*33/style.period*Math.PI*2;
   const pulse=quiet?.5:.5+.5*Math.sin(phase),strength=.48+.24*pulse;
   g.clearRect(0,0,canvas.width,canvas.height);g.save();
   if(dark){g.shadowColor='#100713';g.shadowBlur=18;g.globalAlpha=.86;g.drawImage(dark,0,0);}
   g.globalAlpha=strength;g.shadowColor=style.color;g.shadowBlur=style.darkCore?10:14;g.drawImage(tint,0,0);
   g.shadowBlur=style.darkCore?4:5;g.globalAlpha=.4+.2*pulse;g.drawImage(tint,0,0);g.restore();
   g.drawImage(image,0,0);
   // Preserve the painted blade and gold lettering beneath a restrained emission.
   g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.10+.09*pulse;g.drawImage(tint,0,0);g.restore();
   return true;
  }
  update(0);return {canvas,update,key};
 }
 const reduced=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
 root.WeaponGlow={create,palettes,animating:key=>!!palettes[key]&&!reduced?.matches};
})(typeof window==='undefined'?globalThis:window);
