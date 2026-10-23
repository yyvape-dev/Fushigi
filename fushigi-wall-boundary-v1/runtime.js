(function(root){
 const art={},kit={ready:false,active:true},corners=[[-1,-1],[1,-1],[-1,1],[1,1]];
 const floor=(m,x,y)=>m[y]?.[x]!==undefined&&m[y][x]!==0;
 kit.bits=(map,x,y,corner)=>{const [sx,sy]=corners[corner];return Number(floor(map,x+sx,y))|Number(floor(map,x,y+sy))<<1|Number(floor(map,x+sx,y+sy))<<2;};
 kit.load=()=>kit.promise??=(async()=>{
  const tasks=[];
  for(const material of ['slate','ruins'])for(let corner=0;corner<4;corner++)for(let bits=0;bits<8;bits++)for(let phase=0;phase<4;phase++)tasks.push(new Promise((resolve,reject)=>{
   const key=`${material}-${corner}-${bits}-${phase}`,im=new Image();im.onload=()=>{art[key]=im;resolve();};im.onerror=()=>reject(Error('壁の角部品を読めません: '+key));im.src=`fushigi-wall-boundary-v1/tiles/${key}.png`;
  }));await Promise.all(tasks);kit.ready=true;
 })();
 const generic=WallKit.draw;
 WallKit.draw=function(g,px,py,size,options){
  if(!kit.ready||!kit.active)return generic(g,px,py,size,options);
  const {map,x,y,foreground}=options,phase=WallKit.phase(x,y);
  if(!foreground){
   // Ground beneath the inset wall is continuous with existing room soil.
   const t=OvergrownGarden.texture('soil'),part=t.width/3,mod=n=>((n%3)+3)%3;g.drawImage(t,mod(x)*part,mod(y)*part,part,part,px,py,size,size*.94);
  }
  for(let corner=0;corner<4;corner++)g.drawImage(art[`${WallKit.material}-${corner}-${kit.bits(map,x,y,corner)}-${phase}`],px-size,py+size*.94*.5-size*1.5,size*3,size*3);
  return true;
 };
 root.WallBoundary=kit;
})(window);
