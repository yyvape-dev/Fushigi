// The approved castle town. Residents reuse the existing shop/companion sprites.
(function(root){
 'use strict';
 const OUT={width:60,height:48}, IN={width:20,height:24};
 const state={area:'inn',open:false,panel:null,saved:null,waking:true,npcs:[],images:{},seed:7319,lastTick:0,focus:null};
 const names={yuzunamiki:'ユズナミキ',avenius:'アベニウス',sherininya:'シェリニーニャ'};
 const layout=CastleTownLayout;
 const innPort=layout.services.find(p=>p.id==='inn'),cavePort=layout.services.find(p=>p.id==='dungeon');
 const bed={x:6,y:4}, door={x:innPort.x,y:innPort.y-1}, gate={x:cavePort.x,y:cavePort.y-1};
 const facilities=[
  {id:'inn',name:'宿屋・赤いマント亭',x:17,y:15,mark:'宿',hint:'宿の扉から屋内へ。冒険のあとはベッドで目を覚ます。'},
  {id:'smith',name:'鍛冶屋',x:15,y:28,mark:'鍛',hint:'通りのカウンターで武器と盾を強化できる。'},
  {id:'deposit',name:'預け屋',x:48,y:26,mark:'預',hint:'道具とお金を預ける。冒険で倒れても預けた物は残る。'},
  {id:'market',name:'道具の露店',x:39,y:21,mark:'店',hint:'冒険の食料や道具を買う。持ち帰った物も売れる。'},
  {id:'mercenary',name:'傭兵広場',x:47,y:37,mark:'傭',hint:'冒険者や傭兵が集まる広場。話を聞いてみよう。'},
  {id:'dungeon',name:'洞窟への道',x:55,y:8,mark:'洞',hint:'行き先を選んで冒険へ。'}
 ];
 for(const f of facilities)Object.assign(f,layout.services.find(port=>port.id===f.id));
 const source=typeof document!=='undefined'&&document.currentScript?.src;
 const base=source?new URL('town-v2/',source).href:'assets/town-v2/';
 const artBase=source?new URL('town-v3/',source).href:'assets/town-v3/';
 const characterScale=()=>state.area==='inn'?2:1;
 const tileScale=()=>state.area==='inn'?.5:1;
 const ready=()=>typeof Image==='undefined'||(state.area==='inn'?!!state.images.inn:Object.keys(CastleTownArt).every(k=>state.images['prop-'+k])&&!!state.images.paving);
 const dist=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const rand=()=>{state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return state.seed/4294967296;};
 const el=id=>document.getElementById(id);
 function mapFor(area){
  const dims=area==='inn'?IN:OUT;
  const grid=Array.from({length:dims.height},()=>Array(dims.width).fill(WALL));
  for(let y=1;y<dims.height-1;y++)for(let x=1;x<dims.width-1;x++){
   if(area==='inn'){
    // Empty wood floor; bed, reception, tables and room divider are solid.
    const floor=x>=2&&x<=17&&y>=2&&y<=21;
    const furniture=(x>=5&&x<=8&&y>=3&&y<=4)||(x>=3&&x<=4&&y>=2&&y<=4)||(x>=2&&x<=9&&y>=14&&y<=15)||(x>=13&&x<=17&&y>=16&&y<=19)||(x>=7&&x<=9&&y>=10&&y<=13)||(x>=14&&x<=15&&y<=4);
    const divider=(y===8||y===9)&&(x<11||x>14);
    if(floor&&!furniture&&!divider)grid[y][x]=FLOOR;
   }else if(x>=2&&x<dims.width-2&&y>=3&&y<dims.height-2&&!layout.items.some(o=>layout.contains(o,x,y)))grid[y][x]=FLOOR;
  }
  if(area==='inn'){
   // One deliberate starting square on the mattress and a way off its right edge.
   for(let x=bed.x;x<=11;x++)grid[bed.y][x]=FLOOR;
   grid[21][10]=DOOR;grid[22][10]=DOOR;
  }else{
   grid[door.y][door.x]=DOOR;grid[door.y+1][door.x]=FLOOR;
   grid[gate.y][gate.x]=GATE;grid[gate.y+1][gate.x]=FLOOR;
  }
  return grid;
 }
 function place(x,y){player.x=x;player.y=y;player.vx=x;player.vy=y;player.face=[0,1];player.walkEnd=0;player.action=null;player.swing=0;}
 function actor(id,x,y,skin='brown',extra={}){return {id,isTown:true,x,y,vx:x,vy:y,skin,face:[0,1],walkEnd:0,next:0,...extra};}
 function populate(){
  if(state.area==='inn'){state.npcs=[actor('innkeeper',5,13,'brown',{fixed:true,name:'宿の主人',vy:14.2})];return;}
  state.npcs=[];
  for(const o of layout.items)if(o.worker)state.npcs.push(actor(o.worker,o.x,o.y-1,o.id==='deposit'?'indigo':o.id==='market'?'crimson':'brown',{fixed:true,name:'街の店主',vx:o.x-(o.id==='deposit'?o.width*.13:0),vy:o.y-.1}));
  const points=[[26,25],[33,25],[28,29],[32,29],[30,20],[25,20],[35,22],[23,29],[20,16],[14,19],[10,30],[45,30],[50,29],[29,38],[35,35],[40,32],[49,15],[28,12],[22,40],[10,16]];
  const skins=['brown','indigo','crimson'];
  for(const [i,p]of points.entries()){
   const [x,y]=p;if(map[y]?.[x]!==FLOOR||state.npcs.some(n=>n.x===x&&n.y===y))continue;
   state.npcs.push(actor('resident'+i,x,y,skins[i%3],{name:['街の住民','旅の商人','見習い職人','冒険帰りの旅人'][i%4],scale:.94,home:{x,y},next:i*137}));
  }
  for(const [i,kind]of Object.keys(names).entries()){
   const x=36+i*2,y=41;
   state.npcs.push(actor(kind,x,y,'brown',{kind,name:names[kind],home:{x,y},mercenary:true}));
  }
 }
 function build(){
  const dims=state.area==='inn'?IN:OUT;MW=dims.width;MH=dims.height;
  map=mapFor(state.area);rooms=[];roomGrid=Array.from({length:MH},()=>Array(MW).fill(-1));floorPlan=null;floorShop=null;
  populate();state.lastTick=0;
 }
 function restore(value){
  state.saved=null;
  if(!value||typeof value!=='object')return;
  if(['inn','outside'].includes(value.area)&&Number.isInteger(value.x)&&Number.isInteger(value.y))state.saved={area:value.area,x:value.x,y:value.y,waking:!!value.waking,layout:value.layout};
 }
 function snapshot(){
  if(scene==='town')state.saved={area:state.area,x:player.x,y:player.y,waking:state.waking,layout:3};
  return {...(state.saved||{area:'inn',...bed,waking:true})};
 }
 function arrive(fromAdventure=false){
  close(false);
  if(fromAdventure)state.saved=null;
  let saved=state.saved;
  if(saved?.area==='outside'&&saved.layout!==3)saved={area:'outside',x:door.x,y:door.y+1,waking:false,layout:3};
  state.area=saved?.area||'inn';state.waking=saved?saved.waking:true;build();
  if(saved&&map[saved.y]?.[saved.x]!==undefined&&!solid(map[saved.y][saved.x]))place(saved.x,saved.y);
  else{state.area='inn';state.waking=true;build();place(bed.x,bed.y);}
  snapshot();
 }
 function travel(area,x,y){
  holdStop();close(false);state.area=area;state.waking=false;build();place(x,y);
  seen=Array.from({length:MH},()=>Array(MW).fill(true));updateVis();snapshot();saveGame();resize();startFade();render();
 }
 function enterInn(){travel('inn',10,20);say('赤いマント亭へ。奥の部屋で休める。');}
 function leaveInn(){travel('outside',door.x,door.y+1);say('城下町へ。広場から鍛冶屋・預け屋・傭兵広場へ行ける。');}
 function step(){
  if(state.area==='inn'&&player.x===10&&player.y>=21){leaveInn();return true;}
  if(state.area==='outside'&&player.x===door.x&&player.y===door.y){enterInn();return true;}
  snapshot();saveGame();return false;
 }
 function beforeMove(nx,ny){
  if(!ready())return false;
  const npc=state.npcs.find(n=>n.x===nx&&n.y===ny);
  if(npc){talk(npc);return false;}return true;
 }
 function wake(){state.waking=false;place(10,6);snapshot();saveGame();say('ベッドから起きた。今日も冒険の準備をしよう。');render();}
 function service(id){return facilities.find(f=>f.id===id);}
 function nearService(id){const f=service(id);return state.area==='outside'&&dist(player,f)<=1;}
 function nearby(){return state.npcs.filter(n=>!n.fixed&&dist(n,player)<=1).sort((a,b)=>dist(a,player)-dist(b,player))[0];}
 function context(){
  if(scene!=='town')return null;
  if(state.area==='inn'){
   if(player.x===10&&player.y>=20)return {label:'街へ',fn:leaveInn};
   if(dist(player,bed)<=3)return {label:'休む',fn:()=>show('rest')};
   if(dist(player,{x:9,y:16})<=2)return {label:'主人',fn:()=>show('innkeeper')};
  }else{
   for(const f of facilities)if(dist(player,f)<=1)return {label:{inn:'宿屋へ',smith:'鍛冶屋',deposit:'預け屋',market:'道具屋',mercenary:'話す',dungeon:'潜る'}[f.id],fn:()=>activate(f.id)};
  }
  const n=nearby();return n?{label:'話す',fn:()=>talk(n)}:null;
 }
 function activate(id){
  if(scene!=='town')return;
  if(id==='inn')enterInn();else if(id==='deposit'){state.service='deposit';whSide='bag';openWh();}
  else if(id==='market'){state.service='market';whSide='shop';openWh();}
  else if(id==='dungeon')show('departure');else show(id);
 }
 function price(it){return 300+100*Math.max(0,it.plus||0);}
 function smithItems(){return inv.filter(it=>['weapon','shield'].includes(ITEMS[it.type]?.equip)&&!ShopSystem.unpaid(it));}
 function strengthen(id){
  if(scene!=='town'||!state.open||state.panel!=='smith'||!nearService('smith'))return false;
  const it=smithItems().find(i=>i.id===id);if(!it)return false;
  const cost=price(it);if((it.plus||0)>=9||gold<cost)return false;
  gold-=cost;it.plus=(it.plus||0)+1;saveGame();say(itemName(it)+'を鍛えてもらった。（'+cost+'G）');show('smith');return true;
 }
 function rest(){
  if(scene!=='town'||state.area!=='inn')return;
  close(false);state.waking=true;place(bed.x,bed.y);player.hp=player.maxhp;player.st=newStatus();snapshot();saveGame();say('ゆっくり休んだ。ベッドで目を覚ました。');startFade();render();
 }
 function talk(npc){if(npc.mercenary){state.talking=npc;show('mercTalk');}else if(npc.id==='smith')show('smith');else if(npc.id==='depositor')activate('deposit');else if(npc.id==='market')activate('market');else if(npc.id==='innkeeper')show('innkeeper');else{state.talking=npc;show('resident');}}
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function button(action,label,data='',disabled=false){return '<button data-town="'+action+'"'+data+(disabled?' disabled':'')+'>'+label+'</button>';}
 function show(panel){
  if(scene!=='town')return;
  holdStop();if(typeof closeGameMenu==='function'&&menuOpen)closeGameMenu();closeBag();closeWh();
  if(!state.open)state.focus=document.activeElement;
  state.open=true;state.panel=panel;let title='',text='',actions='';
  if(panel==='smith'){
   title='鍛冶屋';text='武器・盾を確実に＋1強化する。上限は＋9。印や神器の種類はそのまま。<br>所持金 '+gold+'G';
   actions=smithItems().map(it=>button('forge',esc(itemName(it))+' → ＋1　'+price(it)+'G',' data-id="'+it.id+'"',(it.plus||0)>=9||gold<price(it))).join('');
   if(!smithItems().length)text+='<br>鍛えられる武器・盾を持ってきてくれ。';
  }else if(panel==='mercenary'||panel==='mercTalk'){
   const kind=state.talking?.kind;
   title=panel==='mercTalk'?names[kind]:'傭兵広場';
   const lines={yuzunamiki:'「街で少し休んでるんよ。洞窟で会うたら、また声をかけてな。」',avenius:'「出発前は剣の手入れを。無理をせず、必ず戻ってきてね。」',sherininya:'「……この街、日なたがあったかい。冒険は……ひと眠りしてから。」'};
   text=panel==='mercTalk'?lines[kind]:'冒険者や傭兵が集う広場。次の旅の話で賑わっている。<br>ダンジョンでは、これまでどおり仲間と出会える。';
  }else if(panel==='rest'||panel==='innkeeper'){
   title='宿屋・赤いマント亭';text=panel==='rest'?'いつものベッドで休もう。':'「おかえり、ラナ。お部屋は奥よ。冒険から戻ったら、またここでお休み。」';
   text+='<br>休息は無料。クリア・死亡・脱出のあとは、この宿のベッドから再開する。';actions=button('rest','ベッドで休む');
  }else if(panel==='departure'){
   title='洞窟への道';text='行き先を選んで出発する。';
   actions=Object.entries(DUNGEONS).map(([id,d])=>button('depart',esc(d.name)+'　'+d.floors+'階'+(!unlocked(id)?'（未解放）':''),' data-kind="'+id+'"',!unlocked(id))).join('');
  }else if(panel==='map'){
   title=state.area==='inn'?'赤いマント亭の案内':'城下町の地図';
   text='<div class="town-map"><canvas id="townMapCanvas" aria-label="街と施設の位置"></canvas>';
   if(state.area==='outside')for(const f of facilities)text+='<span class="town-map-pin" style="left:'+((f.x+.5)/OUT.width*100)+'%;top:'+((f.y+.5)/OUT.height*100)+'%">'+esc(f.name.split('・')[0])+'</span>';
   text+='<span class="town-map-player" style="left:'+((player.x+.5)/MW*100)+'%;top:'+((player.y+.5)/MH*100)+'%">●ラナ</span></div><p>宿屋は左上、鍛冶屋は左、預け屋は右。傭兵は右下、洞窟への道は北東。</p>';
  }else{
   title=state.talking?.name||'街の住民';
   const lines=['「広場の左が鍛冶屋、右が預け屋だよ。出発前に寄っていくといい。」','「北東の石の入口が洞窟への道。お城の門とは別だよ。」','「宿屋の赤いマント亭は、広場の北西。宿のご飯はうまいんだ。」','「傭兵たちは南東の掲示板に集まっている。一緒に冒険する人が見つかるといいね。」'];
   const index=state.npcs.indexOf(state.talking);text=lines[Math.max(0,index)%lines.length];
  }
  const box=el('townDialog');if(!box)return;
  el('townTitle').textContent=title;el('townText').innerHTML=text;el('townActions').innerHTML=actions+button('close','戻る');
  box.hidden=false;renderMap();document.body?.classList?.add('town-dialog-open');el('townActions').querySelector?.('button:not(:disabled)')?.focus();render();
 }
 function close(redraw=true){
  state.open=false;state.panel=null;const box=typeof document!=='undefined'&&el('townDialog');if(box)box.hidden=true;
  document.body?.classList?.remove('town-dialog-open');if(state.focus?.isConnected)state.focus.focus({preventScroll:true});state.focus=null;
  if(redraw&&typeof render==='function'&&typeof player!=='undefined'&&player)render();
 }
 function init(){
  if(!document.body?.insertAdjacentHTML)return;
  document.body.insertAdjacentHTML('beforeend','<button id="townMapButton" hidden>街の地図</button><section id="townDialog" role="dialog" aria-modal="true" aria-labelledby="townTitle" hidden><div class="town-dialog"><h2 id="townTitle"></h2><div id="townText"></div><div id="townActions"></div></div></section>');
  el('townMapButton').onclick=()=>{if(!uiBlocked())show('map');};
  el('townActions').onclick=ev=>{
   const b=ev.target.closest('[data-town]');if(!b||b.disabled)return;const act=b.dataset.town;
   if(act==='forge')strengthen(+b.dataset.id);else if(act==='rest')rest();
   else if(act==='depart'&&nearService('dungeon')&&unlocked(b.dataset.kind)){dungeonId=b.dataset.kind;close(false);enterDungeon();}else close();
  };
  document.addEventListener('keydown',ev=>{
   if(!state.open){if(scene==='town'&&ev.key.toLowerCase()==='m'&&!uiBlocked()){ev.preventDefault();ev.stopImmediatePropagation();show('map');}return;}
   ev.preventDefault();ev.stopImmediatePropagation();
   const bs=[...el('townActions').querySelectorAll('button:not(:disabled)')],i=bs.indexOf(document.activeElement);
   if(ev.key==='Escape')close();else if(['ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Tab'].includes(ev.key)){const back=ev.shiftKey||['ArrowUp','ArrowLeft'].includes(ev.key);bs[(i+(back?bs.length-1:1)+bs.length)%bs.length]?.focus();}else if(['Enter','z','x',' '].includes(ev.key))document.activeElement?.click();
  },true);
  addEventListener('pagehide',()=>{if(scene==='town'){snapshot();saveGame();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&scene==='town'){snapshot();saveGame();}});
 }
 function load(redraw){
  if(typeof Image==='undefined')return;
  for(const key of ['inn','rana-rest']){const im=new Image();im.onload=()=>{state.images[key]=im;redraw();};im.onerror=()=>console.error('街の画像読込失敗:',key);im.src=base+key+(key==='rana-rest'?'.png':'.webp');}
  for(const key of [...Object.keys(CastleTownArt),'paving','grass','wall']){const im=new Image();im.onload=()=>{state.images[Object.hasOwn(CastleTownArt,key)?'prop-'+key:key]=im;state.ground=null;redraw();};im.onerror=()=>console.error('街の部品読込失敗:',key);im.src=artBase+key+'.png';}
 }
 function animate(dt,t){
  if(scene!=='town'||document.hidden)return;
  const paused=uiBlocked();
  for(const n of state.npcs){
   if(n.fixed)continue;
   if(!paused&&!n.fixed&&t>n.next&&dist(n,player)>1){
    const dirs=[[0,1],[1,0],[0,-1],[-1,0]],poss=dirs.map(([dx,dy])=>({x:n.x+dx,y:n.y+dy,dx,dy})).filter(c=>geomOK(n.x,n.y,c.dx,c.dy)&&map[c.y][c.x]===FLOOR&&!(player.x===c.x&&player.y===c.y)&&!state.npcs.some(o=>o!==n&&o.x===c.x&&o.y===c.y)&&dist(c,n.home)<(n.mercenary?4:7)&&!facilities.some(f=>dist(c,f)<1));
    if(poss.length&&rand()>.24){const c=poss[Math.floor(rand()*poss.length)];n.x=c.x;n.y=c.y;n.face=[c.dx,c.dy];n.walkStart=t;n.walkEnd=t+340;}
    n.next=t+650+rand()*1200;
   }
   const d=Math.hypot(n.x-n.vx,n.y-n.vy),step=dt/340;
   if(d<=step||d>2){n.vx=n.x;n.vy=n.y;}else{n.vx+=(n.x-n.vx)/d*step;n.vy+=(n.y-n.vy)/d*step;}
  }
 }
 function direction(face){return {'0,1':'S','1,1':'SE','1,0':'E','1,-1':'NE','0,-1':'N','-1,-1':'NW','-1,0':'W','-1,1':'SW'}[face.join(',')]||'S';}
 function drawNPC(g,n,t,camX,camY){
  const px=camX+(n.vx+.5)*TS,py=camY+(n.vy+.9)*TS;
  if(px<-TS*2||py<-TS*2||px>innerWidth+TS*2||py>innerHeight+TS*2)return;
  const d=direction(n.face),walking=n.walkEnd>t&&Math.floor((t-n.walkStart)/85)%2===0;
  let im,sx=0,w=256,anchor=[128,224],scale=TS*CHAR_K[charPref]*characterScale()*(n.scale||1)/192;
  if(n.mercenary){
   const art=n.kind==='yuzunamiki'?{images:AllySystem.state.images,registration:AllySystem.state.registration}:AllySystem.state.art[n.kind];
   const pose=walking?'walk':'idle';im=art?.images[d+(walking?'-motion':'')+'.png'];w=walking?(art?.motionFrameSize?.[0]||256):256;anchor=art?.registration[d]?.anchors?.[pose]||anchor;if(n.kind==='yuzunamiki')scale*=AllySystem.state.renderScale;
  }else im=ShopSystem.state.images[n.skin+'/'+d+'/'+(walking?'walk':'idle')];
  if(!im?.width)return;
  g.save();g.imageSmoothingEnabled=true;g.fillStyle='rgba(32,22,12,.25)';g.beginPath();g.ellipse(px,py,TS*.25,TS*.08,0,0,Math.PI*2);g.fill();
  g.drawImage(im,sx,0,w,256,px-anchor[0]*scale,py-anchor[1]*scale,w*scale,256*scale);g.restore();
 }
 function ground(){
  if(state.ground)return state.ground;
  if(!state.images.paving||!state.images.grass)return null;
  const unit=32,canvas=document.createElement('canvas');canvas.width=OUT.width*unit;canvas.height=OUT.height*unit;
  const g=canvas.getContext('2d'),grid=mapFor('outside');
  for(let y=0;y<OUT.height;y++)for(let x=0;x<OUT.width;x++){
   const edge=x<2||x>=OUT.width-2||y<3||y>=OUT.height-2;
   const lawn=layout.lawns.some(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);
   const im=edge||lawn?state.images.grass:state.images.paving;
   g.drawImage(im,(x%2)*64,(y%2)*64,64,64,x*unit,y*unit,unit,unit);
   if(state.images.wall&&(x===1||x===OUT.width-2||y===2||y===OUT.height-2))g.drawImage(state.images.wall,x*unit,y*unit,unit,unit);
  }
  state.ground=canvas;return canvas;
 }
 function draw(g,camX,camY){
  if(state.area==='inn'){const im=state.images.inn;if(!im)return false;g.imageSmoothingEnabled=true;g.drawImage(im,camX,camY,MW*TS,MH*TS);return true;}
  const im=ground();g.imageSmoothingEnabled=true;
  if(im)g.drawImage(im,camX,camY,OUT.width*TS,OUT.height*TS);
  else{g.fillStyle='#4f5d35';g.fillRect(camX,camY,OUT.width*TS,OUT.height*TS);}
  return true;
 }
 function drawProp(g,o,t,camX,camY,force=false){
  const im=state.images['prop-'+o.kind];if(!im)return;
  const a=CastleTownArt[o.kind],width=o.width*TS,scale=width/im.width,height=im.height*scale,x=camX+(o.x+.5)*TS-a.anchor[0]*scale,y=camY+(o.y+.9)*TS-a.anchor[1]*scale;
  if(!force&&(x+width<0||x>innerWidth||y+height<0||y>innerHeight))return;
  g.save();g.imageSmoothingEnabled=true;g.drawImage(im,x,y,width,height);
  if(o.worker){
   const n=state.npcs.find(n=>n.id===o.worker);
   g.save();g.beginPath();g.rect(x,y,width,height-TS*.42);g.clip();if(n)drawNPC(g,n,t,camX,camY);g.restore();
   // The service window stays open; only its actual front counter covers legs.
   g.beginPath();g.rect(x+width*.18,y+height-TS*.85,width*.64,TS*.85);g.clip();g.drawImage(im,x,y,width,height);
  }
  g.restore();
 }
 function entities(){return state.area==='inn'?state.npcs:[...layout.items,...state.npcs.filter(n=>!n.fixed)];}
 function camera(x,y){
  const width=MW*TS,height=MH*TS;
  return [width<innerWidth?(innerWidth-width)/2:Math.max(innerWidth-width,Math.min(0,x)),height<innerHeight?(innerHeight-height)/2:Math.max(innerHeight-height,Math.min(0,y))].map(Math.round);
 }
 function renderMap(){
  const canvas=el('townMapCanvas');if(!canvas?.getContext)return;
  canvas.width=720;canvas.height=Math.round(720*MH/MW);const g=canvas.getContext('2d');g.scale(720/(MW*TS),720/(MW*TS));
  draw(g,0,0);if(state.area==='outside')for(const o of [...layout.items].sort((a,b)=>a.y-b.y))drawProp(g,o,now(),0,0,true);
 }
 function foreground(g,camX,camY){
  if(state.area!=='inn')return;
  const im=state.images.inn;if(!im)return;
  const rects=[[2.5,13.9,7.2,1.8]];
  for(const [x,y,w,h]of rects)g.drawImage(im,x/MW*im.width,y/MH*im.height,w/MW*im.width,h/MH*im.height,camX+x*TS,camY+y*TS,w*TS,h*TS);
 }
 function drawWake(g,camX,camY){
  if(!state.waking||state.area!=='inn')return false;
  const im=state.images['rana-rest'];if(!im?.width)return false;
  const width=TS*CHAR_K[charPref]*characterScale()*.95,height=width*im.height/im.width;
  // The complete resting pose sits ON the cover. No clipping or blanket mask.
  g.drawImage(im,camX+6.6*TS-width/2,camY+3.7*TS-height/2,width,height);return true;
 }
 function ui(){const b=typeof document!=='undefined'&&el('townMapButton');if(b)b.hidden=scene!=='town'||uiBlocked();}
 function label(){return state.area==='inn'?'赤いマント亭':'城下町';}
 root.CastleTown={state,OUT,IN,bed,door,gate,facilities,mapFor,build,arrive,restore,snapshot,travel,enterInn,leaveInn,step,beforeMove,wake,context,strengthen,rest,show,close,init,load,animate,draw,drawNPC,drawProp,entities,camera,characterScale,tileScale,ready,layout,foreground,drawWake,ui,label,price};
})(typeof window==='undefined'?globalThis:window);
