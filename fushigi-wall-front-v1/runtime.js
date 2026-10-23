// Direction-specific boundary, on top of the generic material/geometry kit.
(function(root){
 const front={active:true,ready:false},images={};
 const floor=(map,x,y)=>map[y]?.[x]!==undefined&&map[y][x]!==0;
 front.kind=(map,x,y)=>{
  const left=!floor(map,x-1,y-1),right=!floor(map,x+1,y-1);
  if(left||right)return left&&right?'both':left?'left':'right';
  const n=(Math.imul(x+19,374761393)^Math.imul(y+7,668265263))>>>0;
  return ['middle','middle-high','middle-low'][n%3];
 };
 front.load=()=>front.promise??=(async()=>{
  const tasks=[];
  for(const material of ['slate','ruins'])for(const kind of ['middle','middle-high','middle-low','left','right','both'])for(let phase=0;phase<4;phase++)tasks.push(new Promise((resolve,reject)=>{
   const key=`${material}-${kind}-${phase}`,im=new Image();im.onload=()=>{images[key]=im;resolve();};im.onerror=()=>reject(Error('下辺の部品を読めません: '+key));im.src=`fushigi-wall-front-v1/tiles/${key}.png`;
  }));await Promise.all(tasks);front.ready=true;
 })();
 const generic=WallKit.draw;
 WallKit.draw=function(g,px,py,size,options){
  const {map,x,y,foreground}=options;
  if(!front.ready||!front.active||WallKit.mask(map,x,y)!==1)return generic(g,px,py,size,options);
  const phase=WallKit.phase(x,y),kind=front.kind(map,x,y);
  if(!foreground){const t=OvergrownGarden.texture(WallKit.material==='slate'?'ridgeInterior':'top');g.drawImage(t,(phase%2)*128,(phase>>1)*128,128,128,px,py,size,size*.94);}
  g.drawImage(images[`${WallKit.material}-${kind}-${phase}`],px-size,py+size*.94*.5-size*1.5,size*3,size*3);return true;
 };
 root.WallFront=front;
})(window);
