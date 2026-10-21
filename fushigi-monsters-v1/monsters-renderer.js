// Adopted three-monster art. Each changed pose is painted; idle is reused exactly.
(function(root){
 const script=typeof document!=='undefined'&&document.currentScript?.src;
 const R=script?new URL('.',script).href:'fushigi-monsters-v1/';
 const D=['S','SW','W','NW','N','NE','E','SE'];
 const state={ready:false,error:null,images:{},base:{},duration:300};
 state.has=kind=>['slime','goblin','bat'].includes(kind);
 state.direction=face=>{const [dx,dy]=face||[0,1];return D[(Math.round(Math.atan2(-dx,dy)/(Math.PI/4))+8)%8];};
 state.load=async function(redraw=()=>{}){try{
  const r=await fetch(R+'motion/motions.json');if(!r.ok)throw Error('motions.json: '+r.status);state.meta=await r.json();
  const image=path=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error(path));im.src=R+path;});
  await Promise.all(Object.keys(state.meta.monsters).flatMap(kind=>D.flatMap(d=>[
   image('assets/'+kind+'/'+d+'.png').then(im=>state.base[kind+':'+d]=im),
   image('motion/'+state.meta.monsters[kind].directions[d].atlas).then(im=>state.images[kind+':'+d]=im)
  ])));state.ready=true;redraw();
 }catch(e){state.error=e.message;console.error('モンスター画像読込失敗',e);redraw();}};
 state.pose=function(action,elapsed){
  if(action==='walk'){const t=((elapsed%320)+320)%320;return [0,-1,1,-1][Math.floor(t/80)];}
  if(action==='attack'&&elapsed>=0&&elapsed<300)return elapsed<35?-1:elapsed<135?2:elapsed<230?3:-1;
  return -1;
 };
 state.draw=function(g,kind,d,x,y,height,action='idle',elapsed=0){
  if(!state.ready||!state.has(kind))return false;
  const pose=state.pose(action,elapsed),s=height/192,dx=x-128*s,dy=y-224*s;
  if(pose<0)g.drawImage(state.base[kind+':'+d],dx,dy,256*s,256*s);
  else g.drawImage(state.images[kind+':'+d],pose%2*256,Math.floor(pose/2)*256,256,256,dx,dy,256*s,256*s);
  return true;
 };
 root.MonsterSprites=state;
})(typeof window==='undefined'?globalThis:window);
