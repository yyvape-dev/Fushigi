// Direction-specific generated pose art. Idle/attack remain the approved v3 art.
(function(root){
 const state={ready:false,error:null,meta:null,images:{},props:{}};
 const loadImage=path=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error(path));im.src=path;});
 state.load=async function(redraw){try{const r=await fetch('fushigi-actions-v1/actions.json');if(!r.ok)throw Error('actions.json '+r.status);state.meta=await r.json();await Promise.all([
  ...Object.entries(state.meta.directions).flatMap(([d,row])=>Object.entries(row.actions).map(async([action,spec])=>state.images[d+':'+action]=await loadImage(spec.path))),
  ...Object.entries({food:'onigiri',herb:'icon_herb',potion:'potion',scroll:'icon_scroll',staff:'icon_staff'}).map(async([key,name])=>state.props[key]=await loadImage('assets/'+name+'.png'))
 ]);state.ready=true;redraw();}catch(e){state.error=e.message;console.error('動作画像読込失敗',e);}};
 state.frameAt=function(row,elapsed,loop=false){let t=loop?elapsed%row.durationMs:Math.min(elapsed,row.durationMs-1),sum=0;for(let i=0;i<row.frameMs.length;i++){sum+=row.frameMs[i];if(t<sum)return i;}return row.frameMs.length-1;};
 state.draw=function(g,id,x,y,height,action,elapsed,options={}){
  if(!state.ready)return false;const row=state.meta.directions[id]?.actions[action],atlas=state.images[id+':'+action];if(!row||!atlas)return false;
  const index=state.frameAt(row,elapsed,action==='walk'),f=row.frames[index],renderer=options.renderer;
  if(action!=='walk'&&(index===0||index===row.frames.length-1)){renderer.base.draw(g,id,x,y,height,{weapon:!!options.weapon,shield:!!options.shield});return true;}
  const baseRow=renderer.baseMeta.directions.find(d=>d.id===id),s=height/192,[ax,ay]=state.meta.groundAnchor;
  g.save();g.translate(x,y);g.scale(s,s);g.imageSmoothingEnabled=true;
  const body=()=>g.drawImage(atlas,index*256,0,256,256,-ax,-ay,256,256);
  const item=name=>{const socket=name==='weapon'?f.right:f.left,spec=renderer.baseMeta.equipmentAssets[name],im=renderer.equipment[name==='shield'?'shield-'+(baseRow.shieldView||'front'):name]||renderer.equipment[name];if(!im)return;g.save();g.translate(socket.position[0]-ax,socket.position[1]-ay);g.rotate(socket.angle||0);g.scale(spec.renderScale,spec.renderScale);g.drawImage(im,-spec.grip[0],-spec.grip[1]);g.restore();};
  const prop=()=>{
   const kind=options.prop||'food',im=state.props[action==='consume'?kind:action];if(!im)return;
   const p=f.right.position;let px=p[0],py=p[1],w=action==='staff'?36:action==='scroll'?52:26,h=action==='staff'?100:action==='scroll'?30:26;
   if(action==='scroll'){px=(f.right.position[0]+f.left.position[0])/2;py=(f.right.position[1]+f.left.position[1])/2;}
   g.save();g.translate(px-ax,py-ay);
   if(action==='staff'){const [dx,dy]=options.face||[0,1];h*=dx===0?.65:dy===0?1:.85;g.rotate(Math.atan2(dx,-dy)+(index===2?-.3:0));g.drawImage(im,-w*.5,-h*.8,w,h);if(index===3){g.fillStyle='#bde9ff';for(let k=0;k<4;k++){g.beginPath();g.arc(Math.cos(k*1.8)*8,-h*.8+Math.sin(k*1.8)*8,2.5,0,Math.PI*2);g.fill();}}}
   else g.drawImage(im,-w*.5,-h*.65,w,h);
   g.restore();
  };
  if(action==='walk'){
   for(const name of ['weapon','shield'])if(options[name]&&f[name==='weapon'?'right':'left'].layer==='back')item(name);
   body();if(options.weapon&&f.right.layer==='front'){item('weapon');g.save();g.beginPath();g.ellipse(f.right.position[0]-ax,f.right.position[1]-ay,7,6,0,0,Math.PI*2);g.clip();body();g.restore();}
   if(options.shield&&f.left.layer==='front')item('shield');
  }else{
   const show=index>0&&index<row.frames.length-1,back=['N','NW','NE'].includes(id);if(show&&back)prop();body();if(show&&!back){prop();for(const socket of action==='scroll'?[f.right,f.left]:[f.right]){g.save();g.beginPath();g.ellipse(socket.position[0]-ax,socket.position[1]-ay,6,5,0,0,Math.PI*2);g.clip();body();g.restore();}}
  }
  g.restore();return true;
 };
 root.HeroActions=state;
})(typeof window==='undefined'?globalThis:window);
