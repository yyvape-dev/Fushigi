// Extend the approved three species without replacing their source art or motion.
(function(root){
 const old=root.MonsterSprites,D=['S','SW','W','NW','N','NE','E','SE'];
 const script=typeof document!=='undefined'&&document.currentScript?.src,R=script?new URL('../fushigi-monsters-v2/',script).href:'fushigi-monsters-v2/';
 const state={ready:false,error:null,meta:null,images:{},tints:new Map(),direction:old.direction,pose:old.pose};
 const resolve=k=>root.MonsterRoster?.resolve(k)||{family:k,tier:1};
 state.has=k=>{const f=resolve(k).family;return f==='lord'||!!root.MonsterRoster?.names[f]&&!root.MonsterRoster?.noArt?.has(f);};
 state.load=async function(redraw=()=>{}){try{
  const catalogs=await Promise.all(['monsters.json','../fushigi-enemy-c-v1/runtime.json'].map(async p=>{const r=await fetch(R+p);if(!r.ok)throw Error(p+': '+r.status);return r.json();}));
  state.meta=catalogs[0];
  for(const [family,c]of Object.entries(catalogs[1].monsters))state.meta.monsters[family]={...c,views:Object.fromEntries(Object.entries(c.views).map(([d,v])=>[d,Object.fromEntries(Object.entries(v).map(([slot,p])=>[slot,'../fushigi-enemy-c-v1/'+p]))]))};
  const image=p=>new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>reject(Error(p));im.src=R+p;});
  await Promise.all([old.load(redraw),...Object.entries(state.meta.monsters).flatMap(([family,c])=>D.flatMap(d=>Object.entries(c.views[d]).filter(([k])=>k==='idle'||k==='motion').map(async([k,p])=>{state.images[family+':'+d+':'+k]=await image(p);}))) ]);
  if(old.error)throw Error(old.error);state.ready=true;redraw();
 }catch(e){state.error=e.message;console.error('モンスター拡張読込失敗',e);redraw();}};
 function source(family,d,action,elapsed){
  const pose=old.pose(action,elapsed);
  if(old.has(family))return pose<0?{im:old.base[family+':'+d],pose:-1,x:0,y:0}:{im:old.images[family+':'+d],pose,x:pose%2*256,y:Math.floor(pose/2)*256};
  const moving=pose>=0&&state.meta.monsters[family]?.motion,slot=action==='attack'?1:0;
  return {im:state.images[family+':'+d+':'+(moving?'motion':'idle')],pose:moving?slot:-1,x:moving?slot*256:0,y:0};
 }
 state.frame=function(kind,d,action='idle',elapsed=0){
  const {family,tier}=resolve(kind),src=source(family,d,action,elapsed);if(!src.im)return null;
  const key=family+':'+d+':'+src.pose+':'+tier;if(state.tints.has(key))return state.tints.get(key);
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.drawImage(src.im,src.x,src.y,256,256,0,0,256,256);
  if(tier>1){
   const hex=root.MonsterRoster.colors[family][tier-1],target=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),max=Math.max(...target),pixels=g.getImageData(0,0,256,256),a=pixels.data;
   for(let i=0;i<a.length;i+=4){if(!a[i+3])continue;const r=a[i],gr=a[i+1],b=a[i+2],l=.2126*r+.7152*gr+.0722*b,spread=Math.max(r,gr,b)-Math.min(r,gr,b);if(l<22)continue;let white=Math.max(0,Math.min(1,(l-205)/50))*(1-Math.min(1,spread/24));white=white*white*(3-2*white);for(let j=0;j<3;j++){const tint=a[i+j]*.12+l*(target[j]/max*.88+.12)*.88;a[i+j]=Math.min(255,Math.round(tint*(1-white)+a[i+j]*white));}}
   g.putImageData(pixels,0,0);
  }
  state.tints.set(key,c);if(state.tints.size>192)state.tints.delete(state.tints.keys().next().value);return c;
 };
 state.draw=function(g,kind,d,x,y,height,action='idle',elapsed=0){
  if(!state.ready||!state.has(kind))return false;const frame=state.frame(kind,d,action,elapsed);if(!frame)return false;
  const s=height/192;g.drawImage(frame,x-128*s,y-224*s,256*s,256*s);return true;
 };
 root.MonsterSprites=state;
})(typeof window==='undefined'?globalThis:window);
