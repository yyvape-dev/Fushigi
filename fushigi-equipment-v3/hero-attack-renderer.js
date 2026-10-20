(function(global){
 class HeroAttackRenderer{
  constructor(baseMeta,baseImages,attackMeta,atlases,equipment){this.baseMeta=baseMeta;this.baseImages=baseImages;this.meta=attackMeta;this.atlases=atlases;this.equipment=equipment||{};this.base=new HeroBaseRenderer(baseMeta,baseImages,equipment);}
  frameAt(id,elapsed){const row=this.meta.directions.find(d=>d.id===id);if(!row||elapsed<0||elapsed>=row.durationMs)return 0;let sum=0;for(let i=0;i<row.frameMs.length;i++){sum+=row.frameMs[i];if(elapsed<sum)return i;}return 0;}
  draw(g,id,x,y,height,elapsed,opts={}){
   const row=this.meta.directions.find(d=>d.id===id),index=this.frameAt(id,elapsed);if(!row||!this.atlases[id]||index===0||index===5)return this.base.draw(g,id,x,y,height,opts);
   const f=row.frames[index],baseRow=this.baseMeta.directions.find(d=>d.id===id),[ax,ay]=this.baseMeta.groundAnchor,s=height/192;
   g.save();g.translate(x,y);g.scale(s,s);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
   const body=()=>g.drawImage(this.atlases[id],index*256,0,256,256,-ax,-ay,256,256);
   const enabled=name=>name==='weapon'?opts.weapon:opts.shield;
   const item=name=>{const socket=name==='weapon'?f.right:f.left,im=this.equipment[name==='shield'?'shield-'+(baseRow.shieldView||'front'):name]||this.equipment[name];if(!im)return;const spec=this.baseMeta.equipmentAssets[name],factor=spec.renderScale||(name==='weapon'?.55:.5),w=name==='shield'?1:(f.weaponWidthFactor||1),length=name==='weapon'?(f.weaponLengthFactor||1):1;g.save();g.translate(socket.position[0]-ax,socket.position[1]-ay);g.rotate(socket.angle||0);g.scale(factor*w,factor*length);g.drawImage(im,-spec.grip[0],-spec.grip[1]);g.restore();};
   for(const name of ['weapon','shield']){const socket=name==='weapon'?f.right:f.left;if(enabled(name)&&socket.layer==='back')item(name);}body();for(const name of ['weapon','shield']){const socket=name==='weapon'?f.right:f.left;if(name==='weapon'&&enabled(name)&&socket.layer==='front')item(name);}
   if(opts.weapon&&f.right.layer==='front'){const m=f.right.gripMask||{rx:7,ry:6};g.save();g.beginPath();g.ellipse(f.right.position[0]-ax,f.right.position[1]-ay,m.rx,m.ry,0,0,Math.PI*2);g.clip();body();g.restore();}
   if(opts.shield&&f.left.layer==='front')item('shield');
   if(opts.shield&&f.left.handOverShield){const m=f.left.gripMask;g.save();g.beginPath();g.ellipse(f.left.position[0]-ax,f.left.position[1]-ay,m.rx,m.ry,0,0,Math.PI*2);g.clip();body();g.restore();}
   if(opts.debug){for(const [hand,color]of [['right','#35d3df'],['left','#f39c55']]){const p=f[hand].position;g.strokeStyle=color;g.lineWidth=1.2;g.beginPath();g.arc(p[0]-ax,p[1]-ay,5,0,Math.PI*2);g.stroke();}g.strokeStyle='#e5ce67';g.beginPath();g.moveTo(-8,0);g.lineTo(8,0);g.moveTo(0,-5);g.lineTo(0,5);g.stroke();}
   g.restore();return true;
  }
 }
 global.HeroAttackRenderer=HeroAttackRenderer;
})(typeof window==='undefined'?globalThis:window);
