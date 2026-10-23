// Finite baked 3D kit; geometry selection depends solely on the live map.
(function(root){
 const images={},kit={ready:false,material:'slate',pitch:.94};
 const mod=n=>((n%2)+2)%2;
 kit.mask=(map,x,y)=>[[0,-1],[1,0],[0,1],[-1,0]].reduce((m,[dx,dy],i)=>m|((map[y+dy]?.[x+dx]!==undefined&&map[y+dy][x+dx]!==0)?1<<i:0),0);
 kit.phase=(x,y)=>mod(x)+2*mod(y);
 kit.load=()=>kit.promise??=(async()=>{
  const tasks=[];
  for(const material of ['slate','ruins'])for(let phase=0;phase<4;phase++)for(let mask=0;mask<16;mask++)tasks.push(new Promise((resolve,reject)=>{
   const key=`${material}-${phase}-${mask}`,im=new Image();im.onload=()=>{images[key]=im;resolve();};im.onerror=()=>reject(Error('壁部品を読めません: '+key));im.src=`fushigi-wall-kit-v1/tiles/${key}.png`;
  }));
  await Promise.all(tasks);kit.ready=true;
 })();
 kit.draw=(g,px,py,size,{map,x,y,foreground})=>{
  if(!kit.ready)return false;
  const mask=kit.mask(map,x,y),phase=kit.phase(x,y),im=images[`${kit.material}-${phase}-${mask}`];
  // Opaque foundation fills subpixel alpha seams between separately baked
  // surfaces. It is not redrawn in the actor/foreground compositing pass.
  if(!foreground){
   const t=OvergrownGarden.texture(kit.material==='slate'?'ridgeInterior':'top');
   g.drawImage(t,(phase%2)*128,(phase>>1)*128,128,128,px,py,size,size*kit.pitch);
  }
  // 3 world units in each image; floor-center origin is image center.
  g.drawImage(im,px-size,py+size*kit.pitch*.5-size*1.5,size*3,size*3);return true;
 };
 root.WallKit=kit;
})(window);
