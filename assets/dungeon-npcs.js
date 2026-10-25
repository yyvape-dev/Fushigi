// Wandering travelers. Service state and exchange offers survive reloads.
(function(root){
 'use strict';
 const roster={yursa:{name:'ユルサ',job:'鍛冶屋',color:'#efbc75'},kamil:{name:'カミール',job:'治癒士',color:'#98d9c8'},ialmas:{name:'イアルマス',job:'侍',color:'#b7c3e2'}};
 const rewards=['reviveherb','invincherb','annihilatescroll','firesword','healsword','mikiri','fusepot','strengthenpot'];
 const state={actors:[],open:false,active:null,choice:0,images:{},error:null};
 const script=typeof document!=='undefined'&&document.currentScript?.src;
 const base=script?new URL('../fushigi-npcs-v1/assets/',script).href:'fushigi-npcs-v1/assets/';
 const distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const at=(x,y)=>scene==='dungeon'?state.actors.find(a=>a.x===x&&a.y===y)||null:null;
 const nearby=()=>scene==='dungeon'?state.actors.filter(a=>distance(a,player)===1&&geomOK(player.x,player.y,a.x-player.x,a.y-player.y)).sort((a,b)=>Number(b.x===player.x+player.face[0]&&b.y===player.y+player.face[1])-Number(a.x===player.x+player.face[0]&&a.y===player.y+player.face[1]))[0]||null:null;
 function make(kind,x,y){
  if(!roster[kind])throw Error('Unknown dungeon NPC: '+kind);
  const a={kind,isDungeonNPC:true,x,y,vx:x,vy:y,face:[0,1],walkStart:0,walkEnd:0,used:false};
  if(kind==='ialmas'){
   const requests=Object.keys(ITEMS).filter(k=>ITEMS[k].w>=2&&!ITEMS[k].pot&&!ITEMS[k].stack&&ITEMS[k].equip!=='ring'&&k!=='gold'&&!rewards.includes(k)&&(ITEMS[k].from||1)<=floorNo);
   a.request=requests[rnd(0,requests.length-1)]||'bread';a.reward=mkItem(rewards[rnd(0,rewards.length-1)]);
  }else if(kind==='kamil')a.reward=mkItem('bread_big');
  return a;
 }
 function hide(){
  state.open=false;state.active=null;const el=document.getElementById('npcPrompt');if(el)el.hidden=true;
  document.body?.classList?.remove('npc-dialog-open');
  if(state.returnFocus?.isConnected)state.returnFocus.focus?.({preventScroll:true});state.returnFocus=null;
 }
 function reset(){hide();state.actors=[];}
 function newFloor(){
  reset();if(scene!=='dungeon'||floorNo<2||Math.random()>=.24)return;
  const cells=[],pd=pathDist(player.x,player.y);
  for(const r of rooms.slice(1))if(!r.mh&&!['shop','stairs'].includes(r.role))for(let y=r.y+1;y<r.y+r.h-1;y++)for(let x=r.x+1;x<r.x+r.w-1;x++){
   if(!inb(x,y)||map[y][x]!==FLOOR||pd[y][x]<0||enemyAt(x,y)||AllySystem.at(x,y)||ShopSystem.at(x,y)||itemAt(x,y)||trapAt(x,y)||(player.x===x&&player.y===y))continue;
   // Never occupy a doorway or a narrow passage, including L/cross room notches.
   if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!inb(x+dx,y+dy)||map[y+dy][x+dx]!==FLOOR))continue;
   cells.push([x,y]);
  }
  if(cells.length){const [x,y]=cells[rnd(0,cells.length-1)],kinds=Object.keys(roster);state.actors=[make(kinds[rnd(0,kinds.length-1)],x,y)];}
 }
 function equipped(){return [eqWeapon,eqShield].filter(it=>it&&inv.includes(it)&&!ShopSystem.unpaid(it)&&(it.plus||0)<99);}
 function walkFree(x,y){
  const ri=roomGrid[y]?.[x],room=ri>=0?rooms[ri]:null;
  if(!inb(x,y)||map[y][x]!==FLOOR||!room||room.mh||room.role==='shop'||enemyAt(x,y)||friendlyAt(x,y)||ShopSystem.at(x,y)||itemAt(x,y)||trapAt(x,y)||(x===player.x&&y===player.y))return false;
  // Keep a stationary conversational neighbor out of doorways and one-tile passages.
  return !corridorAdj(x,y)&&[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>map[y+dy]?.[x+dx]===FLOOR).length>=3;
 }
 function tick(){
  if(scene!=='dungeon'||dead||state.open||bagOpen||whOpen||cfgOpen||histOpen||stairsOpen||menuOpen||AllySystem.state.open||ShopSystem.state.open||CastleTown.state.open)return;
  for(const a of state.actors){
   if(distance(a,player)<=1&&geomOK(player.x,player.y,a.x-player.x,a.y-player.y))continue;
   const choices=DIRS8.map(([dx,dy])=>({x:a.x+dx,y:a.y+dy,dx,dy})).filter(c=>geomOK(a.x,a.y,c.dx,c.dy)&&walkFree(c.x,c.y));
   if(!choices.length)continue;
   const forward=choices.find(c=>c.dx===a.face?.[0]&&c.dy===a.face?.[1]),next=forward&&Math.random()<.7?forward:choices[rnd(0,choices.length-1)];
   a.face=[next.dx,next.dy];a.x=next.x;a.y=next.y;a.vx??=a.x-next.dx;a.vy??=a.y-next.dy;a.walkStart=now();a.walkEnd=a.walkStart+220;
  }
 }
 function animate(dt){
  for(const a of state.actors){a.vx??=a.x;a.vy??=a.y;const dx=a.x-a.vx,dy=a.y-a.vy,d=Math.hypot(dx,dy),step=dt/100;
   if(d>2.5||d<=step){a.vx=a.x;a.vy=a.y;}else if(d){a.vx+=dx/d*step;a.vy+=dy/d*step;}}
 }
 function animating(t){return scene==='dungeon'&&state.actors.some(a=>Math.hypot(a.x-(a.vx??a.x),a.y-(a.vy??a.y))>.001||(a.walkEnd||0)>t);}
 function candidates(a){
  const list=[];
  for(const it of inv){
   if(it.type===a.request&&!ShopSystem.unpaid(it)&&!PotSystem.locked(it))list.push({item:it,list:inv});
   if(it.pot&&ITEMS[it.type].effect==='store'&&!it.cursed)for(const child of it.pot)if(child.type===a.request&&!ShopSystem.unpaid(child))list.push({item:child,list:it.pot,container:it});
  }
  return list.sort((a,b)=>Number(isEq(a.item))-Number(isEq(b.item)));
 }
 function delivery(extraSlot=false){
  if(inv.length<MAXBAG||extraSlot)return {list:inv};
  const pd=pathDist(player.x,player.y),cells=[];
  for(let y=Math.max(1,player.y-3);y<Math.min(MH-1,player.y+4);y++)for(let x=Math.max(1,player.x-3);x<Math.min(MW-1,player.x+4);x++){
   if(map[y][x]!==FLOOR||pd[y][x]<0||pd[y][x]>3||itemAt(x,y)||trapAt(x,y)||enemyAt(x,y)||friendlyAt(x,y)||ShopSystem.at(x,y)||floorShop&&roomGrid[y][x]===floorShop.room)continue;
   cells.push({x,y,d:pd[y][x]});
  }
  cells.sort((a,b)=>a.d-b.d);return cells[0]||null;
 }
 function give(item,dest){if(dest.list)inv.push(item);else floorItems.push({x:dest.x,y:dest.y,item});return dest.list?'持ち物に受け取った。':'持ち物がいっぱいなので、近くの床に置いてもらった。';}
 function heal(a){
  if(a.used)return false;const dest=delivery();
  if(!dest){a.message='パンを置く場所がないみたい。道具を整理して、もう一度話しかけてね。';return false;}
  player.hp=player.maxhp;cureBad();atkUp=Math.max(0,atkUp);
  // Hand-bound is an adverse condition outside the normal status list.
  player.st.handbound=0;delete player.boundPot;
  a.used=true;a.message='HPが全回復し、悪い状態も治った。大きなパンを1個、'+give(a.reward,dest);
  playSE('heal');fxText(player.x,player.y,'全回復','#98e6bc');say('カミール：'+a.message);updateVis();RunSave.save();return true;
 }
 function perform(){
  const a=state.active;if(!state.open||!a||a.used||!state.actors.includes(a)||dead||scene!=='dungeon'||distance(a,player)!==1||!geomOK(player.x,player.y,a.x-player.x,a.y-player.y))return false;
  if(a.kind==='yursa'){
   const items=equipped();if(!items.length){a.message='強化できる武器か盾を装備してから、また声をかけて。';show();return false;}
   // One roll per encounter: a great success strengthens both equipped pieces by +3.
   const up=Math.random()<.3?3:1;
   for(const it of items)it.plus=Math.min(99,(it.plus||0)+up);
   a.used=true;a.message=(up===3?'大成功！ ':'')+items.map(it=>ITEMS[it.type].name).join('と')+'を＋'+up+'強化した。';
   playSE('forge');fxText(player.x,player.y,'強化＋'+up,'#ffe099');
  }else if(a.kind==='ialmas'){
   const s=candidates(a)[0];if(!s){a.message='交換できる'+ITEMS[a.request].name+'を持ってきてくれ。未精算の品と、外せない装備は受け取れない。';show();return false;}
   // Reserve a destination before removing anything. A single held item frees a bag slot.
   const dest=delivery(s.list===inv);if(!dest){a.message='見返り品を置く場所がない。道具を整理してから交換しよう。';show();return false;}
   const index=s.list.indexOf(s.item);if(index<0)return false;
   s.list.splice(index,1);if(s.container)s.container.potUsed=Math.max(0,(s.container.potUsed??s.list.length+1)-1);
   if(eqWeapon===s.item)eqWeapon=null;if(eqShield===s.item)eqShield=null;eqRings=eqRings.map(it=>it===s.item?null:it);belly=Math.min(belly,maxBelly());
   identify(a.reward.type);a.used=true;a.message=ITEMS[a.request].name+'を渡し、'+itemName(a.reward)+'を'+give(a.reward,dest);playSE('pickup');
  }else return false;
  say(roster[a.kind].name+'：'+a.message);RunSave.save();show();render();return true;
 }
 function offerName(it){const d=ITEMS[it.type];return d.name+(it.plus===undefined?'':d.pot?'（'+it.plus+'）':d.charges?'［'+it.plus+'］':(it.plus>=0?'＋':'')+it.plus);}
 function show(){
  const a=state.active;if(!a)return;const c=roster[a.kind],el=document.getElementById('npcPrompt');if(!el)return;
  document.getElementById('npcName').textContent=c.name+' ─ '+c.job;
  document.getElementById('npcPortrait').src=base+a.kind+'/S.png';
  const content=document.getElementById('npcContent'),yes=document.getElementById('npcYes'),no=document.getElementById('npcNo');
  let text=a.message||'';
  if(!a.used&&a.kind==='yursa')text+=(text?'\n\n':'')+'「装備中の武器と盾を鍛えてあげる。通常は＋1、30%で＋3。どうする？」\n料金はかからない。この出会いで一度だけ。';
  if(!a.used&&a.kind==='ialmas'){
   text+=(text?'\n\n':'')+'「'+ITEMS[a.request].name+'を1個、探している。見返りは'+offerName(a.reward)+'だ。交換するか？」\n'+ITEMS[a.reward.type].desc;
   if(!isKnown(a.request))text+='\n要求品の今の呼び名：'+dispName(a.request);
   const s=candidates(a)[0];if(s&&isEq(s.item))text+='\n装備中の品を渡すため、装備は外れる。';
   if(s?.container)text+='\n保存の壺の中から渡す。';
  }
  if(a.used&&!text)text='「また、別の旅で会おう。」';
  content.textContent=text;yes.hidden=a.used||a.kind==='kamil';yes.disabled=!a.used&&(a.kind==='yursa'?!equipped().length:a.kind==='ialmas'?!candidates(a).length:false);
  yes.textContent=a.kind==='yursa'?'強化する':'交換する';no.textContent=a.used||a.kind==='kamil'?'戻る':a.kind==='yursa'?'強化しない':'交換しない';
  state.choice=yes.hidden||yes.disabled?1:0;focusChoice();
 }
 function focusChoice(){const b=document.getElementById(state.choice?'npcNo':'npcYes');b?.focus?.();}
 function talk(actor=nearby()){
  if(!actor||!state.actors.includes(actor)||uiBlocked()||dead||distance(actor,player)!==1||!geomOK(player.x,player.y,actor.x-player.x,actor.y-player.y))return false;
  holdStop();facePlayer(actor);state.returnFocus=document.activeElement;state.active=actor;state.open=true;
  if(actor.kind==='kamil'&&!actor.used)heal(actor);
  playSE('ui-open');const el=document.getElementById('npcPrompt');if(el)el.hidden=false;
  document.body?.classList?.add('npc-dialog-open');show();render();return true;
 }
 function key(k){
  if(!state.open)return false;
  if(k==='Escape'){hide();render();}
  else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(k)){const yes=document.getElementById('npcYes');state.choice=yes?.hidden||yes?.disabled?1:1-state.choice;focusChoice();}
  else if(['Enter','z','x',' '].includes(k)){if(state.choice){hide();render();}else perform();}
  return true;
 }
 async function load(redraw){
  const dirs=['S','SW','W','NW','N','NE','E','SE'];
  const jobs=Object.keys(roster).flatMap(kind=>dirs.flatMap(d=>['','-walk'].map(pose=>new Promise(resolve=>{const im=new Image();im.onload=()=>{state.images[kind+'/'+d+pose]=im;redraw();resolve();};im.onerror=()=>{state.error='NPC image: '+kind+'/'+d+pose;resolve();};im.src=base+kind+'/'+d+pose+'.png';}))));
  await Promise.all(jobs);
 }
 function draw(g,a,t,camX,camY){
  const x=camX+(a.vx??a.x)*TS+TS/2,y=camY+(a.vy??a.y)*tilePitchY()+tilePitchY()*.9,s=TS*CHAR_K[charPref]/192;
  const direction=MonsterSprites.direction(a.face),step=(a.walkEnd||0)>t&&Math.floor((t-(a.walkStart||0))/80)%2===0;
  const im=(step&&state.images[a.kind+'/'+direction+'-walk'])||state.images[a.kind+'/'+direction]||state.images[a.kind+'/S'];
  g.save();g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,TS*.28,TS*.09,0,0,Math.PI*2);g.fill();
  if(im){g.imageSmoothingEnabled=true;g.drawImage(im,x-128*s,y-224*s,256*s,256*s);}
  g.textAlign='center';g.font=Math.max(10,Math.round(TS*.18))+'px sans-serif';g.strokeStyle='#101016';g.lineWidth=3;
  const label=roster[a.kind].name+(a.used?'':' ［話す］');g.strokeText(label,x,y-192*s-5);g.fillStyle=roster[a.kind].color;g.fillText(label,x,y-192*s-5);g.restore();
 }
 function init(){
  if(!document.body)return;const el=document.createElement('section');el.id='npcPrompt';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','npcName');
  el.innerHTML='<div class="npc-card"><img id="npcPortrait" alt=""><div class="npc-speech"><h2 id="npcName"></h2><p id="npcContent" aria-live="polite"></p></div><div class="npc-choices"><button id="npcYes"></button><button id="npcNo">戻る</button></div></div>';document.body.append(el);
  document.getElementById('npcYes').onclick=()=>perform();document.getElementById('npcNo').onclick=()=>{hide();render();};
  document.addEventListener('keydown',ev=>{if(!state.open)return;ev.preventDefault();ev.stopImmediatePropagation();key(ev.key);},true);
 }
 root.DungeonNPC={state,roster,rewards,make,at,nearby,newFloor,reset,talk,perform,hide,key,load,draw,init,candidates,delivery,tick,animate,animating,walkFree};
})(typeof window==='undefined'?globalThis:window);
