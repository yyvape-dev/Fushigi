'use strict';
const ROOT='../fushigi-equipment-v3/',MIDS=[17,70,120,170,230,280];
const controls=Object.fromEntries(['shieldSelect','weaponSelect','direction','speed','pause','replay','weapon','shield','debug','scrub'].map(id=>[id,document.getElementById(id)]));
let catalog,weaponCatalog,baseMeta,motion,images={},atlases={},approvedEquipment={},shields={},weapons={},renderer,playing=true,clock=0,last=0,forced=null;
async function json(path){const r=await fetch(path);if(!r.ok)throw Error(path+' '+r.status);return r.json()}
function load(path){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('画像を読み込めません: '+path));im.src=path})}
function selectEquipment(shieldKey,weaponKey){
 const entry=weaponCatalog.weapons.find(w=>w.key===weaponKey);
 const meta=structuredClone(baseMeta);if(entry)meta.equipmentAssets.weapon={path:entry.path,grip:entry.grip,size:entry.size,renderScale:entry.renderScale};
 const views=shields[shieldKey],equipment={...approvedEquipment};
 if(views){equipment.shield=views.front;for(const v of ['front','quarter','quarter-se','side','back'])equipment['shield-'+v]=views[v];meta.directions.find(d=>d.id==='SE').shieldView='quarter-se'}
 equipment.weapon=entry?weapons[weaponKey]:approvedEquipment.weapon;
 renderer=new HeroAttackRenderer(meta,images,motion,atlases,equipment);
 controls.shieldSelect.value=shieldKey;controls.weaponSelect.value=weaponKey;
 Object.assign(window.review,{renderer,equipment,shieldKey,weaponKey});
}
function bg(g,w,h){g.fillStyle='#e8e3d9';g.fillRect(0,0,w,h);g.strokeStyle='#d1cbbb';g.lineWidth=1;for(let x=0;x<w;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}for(let y=0;y<h;y+=64){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}}
function renderAt(ms){
 if(!renderer)return;const id=controls.direction.value,opts={weapon:controls.weapon.checked,shield:controls.shield.checked,debug:controls.debug.checked};
 for(const [name,idle]of [['reference',true],['attack',false]]){const g=document.getElementById(name).getContext('2d');bg(g,512,512);if(idle)renderer.base.draw(g,id,256,420,220,opts);else renderer.draw(g,id,256,420,220,ms,opts)}
 const g=document.getElementById('all').getContext('2d');bg(g,1024,560);for(const d of baseMeta.directions){const x=d.index%4*256+128,y=Math.floor(d.index/4)*280+216;renderer.draw(g,d.id,x,y,96,ms,opts);g.fillStyle='#273536';g.font='16px system-ui';g.textAlign='center';g.fillText(d.id,x,Math.floor(d.index/4)*280+260)}
 const views=document.getElementById('views').getContext('2d');bg(views,1000,228);for(const [i,v]of ['front','quarter','quarter-se','side','back'].entries()){const im=renderer.equipment['shield-'+v]||renderer.equipment['shield-quarter']||renderer.equipment.shield;views.drawImage(im,i*200+20,0);views.fillStyle='#273536';views.font='15px system-ui';views.fillText(['正面','斜め・SW','斜め・SE','側面','裏面'][i],i*200+55,216)}
 const frame=renderer.frameAt(id,ms);controls.scrub.value=frame;document.getElementById('status').textContent=controls.shieldSelect.selectedOptions[0].textContent+' / '+controls.weaponSelect.selectedOptions[0].textContent+' / '+id+' / '+['基準絵','振りかぶり','斬り下ろし','振り抜き','戻し','基準絵'][frame]+' / '+Math.round(ms)+'ms';
}
window.previewAt=ms=>{forced=ms;playing=false;controls.pause.textContent='再生';renderAt(ms)};
for(const id of ['shieldSelect','weaponSelect'])controls[id].onchange=()=>{selectEquipment(controls.shieldSelect.value,controls.weaponSelect.value);renderAt(forced??0)};
controls.direction.onchange=()=>renderAt(forced??0);
controls.pause.onclick=()=>{playing=!playing;forced=null;controls.pause.textContent=playing?'一時停止':'再生'};
controls.replay.onclick=()=>{clock=0;forced=null;playing=true;controls.pause.textContent='一時停止'};
controls.scrub.oninput=()=>window.previewAt(MIDS[+controls.scrub.value]);for(const id of ['weapon','shield','debug'])controls[id].onchange=()=>renderAt(forced??0);
async function init(){
 [catalog,weaponCatalog,baseMeta,motion]=await Promise.all([json('shields.json'),json('../fushigi-weapons-v1/weapons.json'),json(ROOT+'assets/hero-base/base.json'),json(ROOT+'assets/hero-attack/attack.json')]);
 controls.shieldSelect.add(new Option('鉄の丸盾（承認済みv3）','approved'));for(const s of catalog.shields)controls.shieldSelect.add(new Option(s.name,s.key));
 controls.weaponSelect.add(new Option('銀の剣（承認済みv3）','approved'));for(const w of weaponCatalog.weapons)controls.weaponSelect.add(new Option(w.name,w.key));
 for(const d of baseMeta.directions)controls.direction.add(new Option(d.id,d.id));controls.direction.value='SE';
 await Promise.all([...baseMeta.directions.map(async d=>images[d.id]=await load(ROOT+'assets/hero-base/'+d.id+'.png')),...motion.directions.map(async d=>atlases[d.id]=await load(ROOT+'assets/hero-attack/'+d.atlas)),...Object.entries(baseMeta.equipmentAssets).map(async([key,s])=>approvedEquipment[key]=await load(ROOT+'assets/hero-base/'+s.path)),...weaponCatalog.weapons.map(async w=>weapons[w.key]=await load('../fushigi-weapons-v1/'+w.path)),...catalog.shields.map(async s=>{shields[s.key]={};await Promise.all(Object.entries(s.views).map(async([v,a])=>shields[s.key][v]=await load(a.path)))})]);
 window.review={catalog,weaponCatalog,baseMeta,motion,images,atlases,approvedEquipment,shields,weapons,selectEquipment,MIDS};
 const query=new URLSearchParams(location.search);selectEquipment(shields[query.get('shield')]?query.get('shield'):'bronzeshield',weapons[query.get('weapon')]?query.get('weapon'):'approved');
 window.previewReady=true;requestAnimationFrame(function loop(t){if(last&&playing)clock+=(t-last)*+controls.speed.value;last=t;renderAt(forced??clock%1000);requestAnimationFrame(loop)});
}
init().catch(e=>{document.getElementById('error').textContent=e.message;window.previewError=e.message;console.error(e)});
