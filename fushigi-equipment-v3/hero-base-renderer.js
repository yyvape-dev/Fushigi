/* Canonical static base renderer. No animation pose selection is implemented here. */
(function(global){
  class HeroBaseRenderer {
    constructor(meta,images,equipment){ this.meta=meta; this.images=images; this.equipment=equipment||{}; }
    draw(g,id,x,y,height,opts={}) {
      const row=this.meta.directions.find(d=>d.id===id);if(!row||!this.images[id])return false;
      const s=height/this.meta.heightToGround,[ax,ay]=this.meta.groundAnchor;
      g.save();g.translate(x,y);g.scale(s,s);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
      const body=()=>g.drawImage(this.images[id],-ax,-ay);
      const item=(which)=>{
        const socket=which==='weapon'?row.right:row.left,im=this.equipment[which==='shield'?'shield-'+(row.shieldView||'front'):which]||this.equipment[which];if(!im)return;
        const spec=this.meta.equipmentAssets[which],factor=spec.renderScale||(which==='weapon'?.55:.5),width=1;
        g.save();g.translate(socket.position[0]-ax,socket.position[1]-ay);g.rotate(socket.angle||0);g.scale(factor*width,factor);g.drawImage(im,-spec.grip[0],-spec.grip[1]);g.restore();
      };
      const enabled=which=>which==='weapon'?opts.weapon:opts.shield;
      for(const which of ['weapon','shield']){const socket=which==='weapon'?row.right:row.left;if(enabled(which)&&socket.layer==='back')item(which);}
      body();
      for(const which of ['weapon','shield']){const socket=which==='weapon'?row.right:row.left;if(which==='weapon'&&enabled(which)&&socket.layer==='front')item(which);}
      // The nearer glove covers the weapon's grip; mask is specific to this idle frame.
      if(opts.weapon&&row.right.layer==='front'){
        const mask=row.right.gripMask||{rx:7,ry:6};g.save();g.beginPath();g.ellipse(row.right.position[0]-ax,row.right.position[1]-ay,mask.rx,mask.ry,0,0,Math.PI*2);g.clip();body();g.restore();
      }
      if(opts.shield&&row.left.layer==='front')item('shield');
      if(opts.shield&&row.left.handOverShield){const m=row.left.gripMask;g.save();g.beginPath();g.ellipse(row.left.position[0]-ax,row.left.position[1]-ay,m.rx,m.ry,0,0,Math.PI*2);g.clip();body();g.restore();}
      if(opts.debug){
        for(const [key,color]of [['right','#37cddd'],['left','#f29452']]){const p=row[key].position;g.strokeStyle=color;g.lineWidth=1.2;g.beginPath();g.arc(p[0]-ax,p[1]-ay,5,0,Math.PI*2);g.stroke();}
        g.strokeStyle='#eed766';g.lineWidth=1;g.beginPath();g.moveTo(-9,0);g.lineTo(9,0);g.moveTo(0,-6);g.lineTo(0,6);g.stroke();
      }
      g.restore();return true;
    }
  }
  global.HeroBaseRenderer=HeroBaseRenderer;
})(typeof window==='undefined'?globalThis:window);
