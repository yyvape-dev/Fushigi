// Reuse approved v3 renderers and catalog metadata without modifying source art.
(function(root){
 const R='fushigi-equipment-v3/';
 const state={ready:false,error:null,cache:new Map(),weapons:{},shields:{},baseImages:{},atlases:{},equipment:{},legacy:{}};
 const json=async p=>{const r=await fetch(p);if(!r.ok)throw Error(p+': '+r.status);return r.json();};
 const image=p=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error(p));im.src=p;});
 state.load=async function(redraw){
  try{
   const [base,motion,wc,sc]=await Promise.all([json(R+'assets/hero-base/base.json'),json(R+'assets/hero-attack/attack.json'),json('fushigi-weapons-v1/weapons.json'),json('fushigi-shields-v1/shields.json')]);
   state.base=base;state.motion=motion;state.weaponCatalog=wc.weapons;state.shieldCatalog=sc.shields;state.views=sc.viewMapping;
   await Promise.all([
    ...base.directions.map(async d=>state.baseImages[d.id]=await image(R+'assets/hero-base/'+d.id+'.png')),
    ...motion.directions.map(async d=>state.atlases[d.id]=await image(R+'assets/hero-attack/'+d.atlas)),
    ...Object.entries(base.equipmentAssets).map(async([k,s])=>state.equipment[k]=await image(R+'assets/hero-base/'+s.path)),
    ...['stick','axe','woodshield'].map(async k=>state.legacy[k]=await image('assets/'+k+'.png')),
    ...wc.weapons.map(async w=>state.weapons[w.key]=await image('fushigi-weapons-v1/'+w.path)),
    ...sc.shields.map(async s=>{state.shields[s.key]={};await Promise.all(Object.entries(s.views).map(async([v,a])=>state.shields[s.key][v]=await image('fushigi-shields-v1/'+a.path)));})
   ]);
   state.ready=true;redraw();
  }catch(e){state.error=e.message;console.error('承認済みキャラの読込失敗',e);redraw();}
 };
 state.renderer=function(weapon,shield){
  const key=(weapon||'none')+':'+(shield||'none');if(state.cache.has(key))return state.cache.get(key);
  const meta=structuredClone(state.base),equipment={...state.equipment};
  const w=state.weaponCatalog.find(w=>w.key===weapon);
  // Preserve original item identity for legacy gear outside the approved catalogs.
  if(w){meta.equipmentAssets.weapon={...w};equipment.weapon=state.weapons[weapon];}
  else if(state.legacy[weapon]){const im=state.legacy[weapon];meta.equipmentAssets.weapon={grip:[im.width*.5,im.height*.8],renderScale:.66};equipment.weapon=im;}
  const sh=state.shieldCatalog.find(s=>s.key===shield);
  if(sh){
   meta.equipmentAssets.shield={...meta.equipmentAssets.shield,grip:sh.views.front.grip,renderScale:sh.renderScale};
   for(const [v,im]of Object.entries(state.shields[shield]))equipment['shield-'+v]=im;
   for(const d of meta.directions)d.shieldView=state.views[d.id];
  }
  if(shield==='woodshield'){const canvas=document.createElement('canvas');canvas.width=160;canvas.height=192;const im=state.legacy.woodshield;canvas.getContext('2d').drawImage(im,0,0,160,192);meta.equipmentAssets.shield={grip:[80,96],renderScale:.59};equipment.shield=canvas;for(const v of ['front','quarter','side','back'])equipment['shield-'+v]=canvas;}
  const renderer=new HeroAttackRenderer(meta,state.baseImages,state.motion,state.atlases,equipment);
  state.cache.set(key,renderer);return renderer;
 };
 state.draw=function(g,face,x,y,height,elapsed,weapon,shield){
  if(!state.ready){g.fillStyle='#ffe0a0';g.font='12px sans-serif';g.textAlign='center';g.fillText(state.error?'画像読込失敗':'読込中',x,y);return;}
  const [dx,dy]=face||[0,1],id=state.base.directions[(Math.round(Math.atan2(-dx,dy)/(Math.PI/4))+8)%8].id;
  state.renderer(weapon,shield).draw(g,id,x,y,height,elapsed,{weapon:!!weapon,shield:!!shield});
 };
 root.ApprovedHero=state;
})(typeof window==='undefined'?globalThis:window);
