// Dungeon-only companions. Stats reference current hero equipment, never copy it.
(function(root){
 const D=['S','SW','W','NW','N','NE','E','SE'];
 const src=typeof document!=='undefined'&&document.currentScript?.src;
 const base=src?new URL('../fushigi-allies-v1/',src).href:'fushigi-allies-v1/';
 const aveniusBase=src?new URL('../fushigi-avenius-v1/',src).href:'fushigi-avenius-v1/';
 const sheriBase=src?new URL('../fushigi-sherininya-v1/',src).href:'fushigi-sherininya-v1/';
 const artBases={yuzunamiki:base,avenius:aveniusBase,sherininya:sheriBase};
 const roster={
  yuzunamiki:{name:'ユズナミキ',hp:26,attack:2,growth:.8,defense:-1,equipment:'クナイ・着物',verb:'クナイ',color:'#cf9aff',meet:'んふっ…。目が合ったなぁ。<br>ウチをご指名してくれはるの？',join:'ほな、いこか。',talk:'どこに連れてってくれはるの？',retreat:'ここは引くよ。無茶しないでね！'},
  avenius:{name:'アベニウス',hp:28,attack:3,growth:.8,defense:0,equipment:'閃光の剣・胴鎧',verb:'剣',color:'#72e6f2',meet:'私の剣が必要？<br>よければ、一緒に行こう。',join:'行こう。道は私が切り開く。',talk:'前は任せて。あなたは周りを見ていて。',retreat:'ごめん、ここで退く。あなたは無事に戻って。'},
  sherininya:{name:'シェリニーニャ',hp:24,attack:2,growth:1,defense:-2,equipment:'黒魔法・フードの服',verb:'黒魔法',color:'#c09ae8',meet:'……ん。いっしょに行くの？<br>いいよ……眠くならないうちは、手伝う。',join:'……ふぁ。じゃ、ゆっくり行こ。',talk:'ちゃんと起きてる……たぶん。',retreat:'……もう、ねむい。先に戻ってるね。'}
 };
 const config=a=>roster[a?.kind]||roster.yuzunamiki;
 const state={actor:null,used:false,open:false,renderScale:1.20,registration:{},ready:false,error:null,images:{},art:{}};
 const merchantAt=(x,y)=>typeof ShopSystem!=='undefined'&&ShopSystem.at(x,y);
 const distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const at=(x,y)=>state.actor?.x===x&&state.actor?.y===y?state.actor:null;
 const stats=a=>({attack:Math.max(1,Math.round(playerAtk()+config(a).attack+(a.lv-1)*config(a).growth)-(a.poison||0)),defense:Math.max(0,defBonus()+config(a).defense+Math.floor((a.lv-1)/3)),maxhp:config(a).hp+4*(a.lv-1)});
 const live=()=>scene==='dungeon'&&state.actor?.following&&state.actor.hp>0;
 function hide(){state.open=false;document.body?.classList?.remove('ally-dialog-open');const el=document.getElementById('allyPrompt');if(el)el.hidden=true;if(state.returnFocus?.isConnected)state.returnFocus.focus({preventScroll:true});state.returnFocus=null;}
 function reset(){state.actor=null;state.used=false;hide();}
 function make(x,y,kind='yuzunamiki'){if(!roster[kind])kind='yuzunamiki';const lv=Math.max(1,player.lv),hp=roster[kind].hp+4*(lv-1);return {kind,name:roster[kind].name,isAlly:true,x,y,vx:x,vy:y,lv,exp:0,hp,maxhp:hp,following:false,face:[0,1],st:{},boost:0,cooldown:0,issenUsed:new WeakSet()};}
 function free(x,y){return inb(x,y)&&map[y][x]===FLOOR&&!enemyAt(x,y)&&!merchantAt(x,y)&&!itemAt(x,y)&&!trapAt(x,y)&&!(player.x===x&&player.y===y);}
 function newFloor(){
  hide();const a=state.actor;
  if(a?.following){
   const q=[[player.x,player.y]],visited=new Set([player.x+','+player.y]);let cell;
   for(let i=0;i<q.length&&!cell;i++){const [x,y]=q[i];for(const [dx,dy]of DIRS8){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(!geomOK(x,y,dx,dy)||visited.has(key))continue;visited.add(key);if(free(nx,ny)){cell=[nx,ny];break;}q.push([nx,ny]);}}
   if(cell){[a.x,a.y]=cell;a.vx=a.x;a.vy=a.y;a.walkEnd=0;a.attackStart=null;a.dash=null;a.magicBeam=null;}else{state.actor=null;say(config(a).name+'は別の道へ向かった。');}return;
  }
  state.actor=null;
  if(state.used||floorNo<2||Math.random()>=.25)return;
  const cells=[];for(const r of rooms.slice(1))if(!r.mh&&r.role!=='shop')for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(free(x,y))cells.push([x,y]);
  if(cells.length){const [x,y]=cells[rnd(0,cells.length-1)],kinds=Object.keys(roster);state.actor=make(x,y,kinds[Math.floor(Math.random()*kinds.length)]);}
 }
 function nearby(){const a=state.actor;return scene==='dungeon'&&a&&distance(a,player)<=1&&geomOK(player.x,player.y,a.x-player.x,a.y-player.y)?a:null;}
 function recruit(){const a=nearby();if(!a||a.following)return false;a.following=true;state.used=true;say(config(a).name+'「'+config(a).join+'」');hide();render();return true;}
 function infoHTML(){const a=state.actor;if(!a||!a.following)return '<p>同行している助っ人はいない。</p>';const s=stats(a),c=config(a),ability=a.kind==='sherininya'?'黒魔法：8方向の直線2マス。敵と味方を貫通し、敵だけに攻撃。壁では止まる。':a.kind==='avenius'?'剣：隣接1マス<br>一閃：見える4マス以内の敵へ瞬間移動・必中の先制攻撃後に帰還。同じ敵につき1回。':'クナイ：8方向の直線2マス・障害物越し<br>狐火の襲：本人のみ4ターン2回行動'+(a.boost?'（残り'+a.boost+'）':'');return '<h3>'+c.name+'　Lv'+a.lv+'</h3><p>HP '+a.hp+'/'+a.maxhp+'　EXP '+a.exp+'/'+expNeed(a.lv)+'</p><p>攻撃 '+s.attack+'　守備 '+s.defense+'<br>装備固定：'+c.equipment+'<br>'+ability+'</p>';}
 function talk(){
  const a=nearby();if(!a||uiBlocked())return;holdStop();state.returnFocus=document.activeElement;state.open=true;
  document.body?.classList?.add('ally-dialog-open');const el=document.getElementById('allyPrompt');if(!el)return;el.hidden=false;
  document.getElementById('allyName').textContent=config(a).name;document.getElementById('allyPortrait').innerHTML=portrait(a);
  document.getElementById('allyContent').innerHTML='<p>'+(a.following?config(a).talk:config(a).meet)+'</p>';
  document.getElementById('allyJoin').hidden=a.following;document.getElementById('allyStay').textContent=a.following?'戻る':'そのまま';
  (a.following?document.getElementById('allyStay'):document.getElementById('allyJoin')).focus?.();render();
 }
 function gainExp(n){if(!live())return;const a=state.actor;a.exp+=n;while(a.lv<MAX_LV&&a.exp>=expNeed(a.lv)){a.exp-=expNeed(a.lv);a.lv++;a.maxhp=stats(a).maxhp;a.hp=Math.min(a.maxhp,a.hp+4);fxText(a.x,a.y,'Lv'+a.lv,'#c9a7ff');if(typeof EventVfx!=='undefined')EventVfx.play('level',a.x,a.y,{entity:a,duration:850});say(config(a).name+'はレベル'+a.lv+'になった！');}}
 function strike(a,e,issen=false){a.face=[Math.sign(e.x-a.x),Math.sign(e.y-a.y)];a.attackFace=a.face.slice();a.attackStart=now();a.walkEnd=0;const c=config(a);
  if(!issen&&!(e.st?.sleep>0)&&Math.random()>=ACC.p){fxText(e.x,e.y,'MISS','#d7c3ff');say(c.name+'の'+c.verb+'は外れた。');return;}
  const damage=Math.max(1,Math.round((stats(a).attack-eT(e).def+1)*(.875+Math.random()*.25)));e.hp-=damage;e.aware=true;e.flash=now()+130;if(e.st)e.st.sleep=0;
  vfxHit(e.x,e.y,e.x-a.x,e.y-a.y,c.color,e.hp<=0);fxText(e.x,e.y,'-'+damage,c.color);say(c.name+'の'+(issen?'一閃':c.verb)+'！ '+eT(e).name+'に'+damage+'ダメージ。');
  if(e.hp<=0)killEnemy(e);else afterDamage(e);kick();
 }
 function issenLanding(a,e){
  return DIRS8.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy,dx,dy})).filter(c=>geomOK(e.x,e.y,c.dx,c.dy)&&((c.x===a.x&&c.y===a.y)||free(c.x,c.y))&&los(a.x,a.y,c.x,c.y)).sort((x,y)=>distance(x,a)-distance(y,a)||Math.hypot(x.x-a.x,x.y-a.y)-Math.hypot(y.x-a.x,y.y-a.y))[0];
 }
 function issen(a,e){const landing=issenLanding(a,e);if(!landing)return false;const origin={x:a.x,y:a.y};a.issenUsed.add(e);a.dash={from:origin,to:{x:landing.x,y:landing.y},start:now(),duration:360};
  try{a.x=landing.x;a.y=landing.y;strike(a,e,true);fxText(e.x,e.y,'一閃','#98f7ff');}finally{a.x=origin.x;a.y=origin.y;a.vx=a.x;a.vy=a.y;}return true;
 }
 function move(a,x,y){a.face=[Math.sign(x-a.x),Math.sign(y-a.y)];a.x=x;a.y=y;a.walkStart=now();a.walkEnd=now()+220;}
 function magicRay(a,face){let x=a.x,y=a.y;const targets=[],cells=[];for(let n=0;n<2;n++){if(!geomOK(x,y,face[0],face[1]))break;x+=face[0];y+=face[1];cells.push({x,y});const e=enemyAt(x,y);if(e&&!e.mh)targets.push(e);}return {face:face.slice(),targets,cells};}
 function castMagic(a){const ray=DIRS8.map(face=>magicRay(a,face)).filter(r=>r.targets.length).sort((x,y)=>y.targets.length-x.targets.length||distance(a,x.targets[0])-distance(a,y.targets[0]))[0];if(!ray)return false;
  // Snapshot enemy identities before damage can split/move enemies. A new
  // fragment is not struck again by the same cast, and allies are never targets.
  a.face=ray.face.slice();a.attackFace=ray.face.slice();a.attackStart=now();a.walkEnd=0;a.magicBeam={start:now(),from:{x:a.x,y:a.y},cells:ray.cells};
  for(const e of ray.targets)if(enemies.includes(e))strike(a,e);
  a.face=ray.face.slice();a.attackFace=ray.face.slice();kick();return true;
 }
 function tick(){if(scene!=='dungeon'||dead||!state.actor||state.actor.hp<=0)return;const a=state.actor;
  if(!a.following){
   // Unrecruited travelers wander without targeting or fighting monsters.
   // Pause beside Rana so approaching them still allows a conversation.
   if(nearby())return;
   const choices=DIRS8.map(([dx,dy])=>({x:a.x+dx,y:a.y+dy,dx,dy})).filter(c=>geomOK(a.x,a.y,c.dx,c.dy)&&free(c.x,c.y));
   if(choices.length){const forward=choices.find(c=>c.dx===a.face[0]&&c.dy===a.face[1]);const next=forward&&Math.random()<.7?forward:choices[rnd(0,choices.length-1)];move(a,next.x,next.y);}return;
  }
  if(a.cooldown>0)a.cooldown--;
  if(a.st.sleep>0){a.st.sleep--;if(a.boost>0)a.boost--;return;}const confused=a.st.confuse>0;if(confused)a.st.confuse--;
  const inBattle=enemies.some(e=>!e.mh&&distance(a,e)<=5&&los(a.x,a.y,e.x,e.y));
  if(a.kind==='yuzunamiki'&&!confused&&!a.boost&&!a.cooldown&&inBattle&&Math.random()<.12){a.boost=4;a.cooldown=12;a.castStart=now();fxText(a.x,a.y,'狐火の襲','#d9a0ff');say('ユズナミキは「狐火の襲」！ 本人だけ4ターン倍速。');}
  for(let step=0;step<(a.boost>0?2:1);step++){
   if(confused){const [dx,dy]=DIRS8[rnd(0,7)],x=a.x+dx,y=a.y+dy;if(geomOK(a.x,a.y,dx,dy)&&!enemyAt(x,y)&&!merchantAt(x,y)&&!(player.x===x&&player.y===y))move(a,x,y);continue;}
   if(a.kind==='avenius'){
    const targets=enemies.filter(e=>!e.mh&&!a.issenUsed.has(e)&&distance(a,e)<=4&&los(a.x,a.y,e.x,e.y)).sort((x,y)=>distance(a,x)-distance(a,y));
    if(targets.some(e=>issen(a,e)))continue;
   }
   if(a.kind==='sherininya'&&castMagic(a))continue;
   const target=a.kind==='sherininya'?null:enemies.filter(e=>!e.mh&&(a.kind==='avenius'?distance(a,e)===1&&geomOK(a.x,a.y,e.x-a.x,e.y-a.y):distance(a,e)<=2&&aligned(a.x,a.y,e.x,e.y))).sort((x,y)=>distance(a,x)-distance(a,y))[0];
   if(target){strike(a,target);continue;}
   const d=distMap(),current=d[a.y][a.x];if(current<=1)break;
   const choices=DIRS8.map(([dx,dy])=>({x:a.x+dx,y:a.y+dy,dx,dy})).filter(c=>geomOK(a.x,a.y,c.dx,c.dy)&&d[c.y][c.x]>=1&&d[c.y][c.x]<current&&!enemyAt(c.x,c.y)&&!merchantAt(c.x,c.y)).sort((x,y)=>d[x.y][x.x]-d[y.y][y.x]);
   if(choices.length)move(a,choices[0].x,choices[0].y);
  }
  if(a.boost>0)a.boost--;if(turn%10===0&&a.hp<a.maxhp)a.hp++;
 }
 function hurt(n,killer=null){const a=state.actor;if(!a||a.hp<=0)return false;a.hp-=n;a.flash=now()+130;fxText(a.x,a.y,'-'+n,'#ffb6e8');if(a.hp<=0){say(config(a).name+'「'+config(a).retreat+'」');state.actor=null;state.used=true;hide();if(killer&&root.MonsterCombat)root.MonsterCombat.evolve(killer);return true;}return false;}
 function clearRay(e,a){let x=e.x,y=e.y;const dx=Math.sign(a.x-x),dy=Math.sign(a.y-y);while(x!==a.x||y!==a.y){if(!geomOK(x,y,dx,dy))return false;x+=dx;y+=dy;if((x!==a.x||y!==a.y)&&(enemyAt(x,y)||(player.x===x&&player.y===y)))return false;}return true;}
 function enemyAction(e,T){if(!live()||e.loot)return false;const a=state.actor,dist=distance(e,a);if(dist>=distance(e,player)||dist>SIGHT)return false;
  if(root.MonsterCombat?.isCannon(T)&&dist>1){if(e.st?.cool>0||!e.aware&&!los(e.x,e.y,a.x,a.y))return false;const impact=root.MonsterCombat.plan(e,a);if(!impact)return false;e.aware=true;root.MonsterCombat.fire(e,a,impact);return true;}
  if(!los(e.x,e.y,a.x,a.y))return false;e.aware=true;
  const ranged=T.range&&dist>1&&dist<=T.range&&aligned(e.x,e.y,a.x,a.y)&&clearRay(e,a),adj=dist===1&&(T.ai==='ghost'||geomOK(e.x,e.y,a.x-e.x,a.y-e.y));
  if(ranged||adj){e.monsterFace=[Math.sign(a.x-e.x),Math.sign(a.y-e.y)];e.monsterAttackFace=e.monsterFace.slice();e.monsterAttackStart=now();
   if(T.ai==='bomb'){enemies.splice(enemies.indexOf(e),1);hurt(Math.max(1,Math.ceil((5+Math.floor(floorNo*.8))*(T.bombScale||1))-Math.floor(stats(a).defense/2)),e);say(T.name+'が'+config(a).name+'のそばで爆発した！');if(distance(e,player)<=1)hurtPlayer(Math.max(1,5+floorNo-defBonus()),'爆風で力尽きた…');return true;}
   if(Math.random()>=ACC.e){if(typeof EnemyVfx!=='undefined')EnemyVfx.attack(e,T,a,false,ranged);fxText(a.x,a.y,'MISS','#c7dfff');return true;}
   const range=ranged&&T.ai==='breath'?T.breath(floorNo):T.atk(floorNo),damage=Math.max(1,rnd(...range)-stats(a).defense);if(typeof EnemyVfx!=='undefined')EnemyVfx.attack(e,T,a,true,ranged);hurt(damage,e);say(T.name+'の攻撃！ '+config(a).name+'に'+damage+'ダメージ。');
   if(state.actor){if(T.ai==='sleepy')a.st.sleep=T.statusTurns||5;if(T.ai==='dazzle')a.st.confuse=T.statusTurns||8;if(T.ai==='venom')a.poison=Math.min(4,(a.poison||0)+1);}return true;
  }
  if(T.spd==='still'||T.spd==='slow'&&turn%2===1)return true;
  const choices=DIRS8.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy,dx,dy})).filter(c=>inb(c.x,c.y)&&(T.ai==='ghost'||geomOK(e.x,e.y,c.dx,c.dy))&&!enemyAt(c.x,c.y)&&!merchantAt(c.x,c.y)&&!at(c.x,c.y)&&!(player.x===c.x&&player.y===c.y)&&distance(c,a)<dist).sort((x,y)=>distance(x,a)-distance(y,a));
  if(choices.length){e.x=choices[0].x;e.y=choices[0].y;}return true;
 }
 async function load(redraw){try{await Promise.all(Object.entries(artBases).map(async([kind,pathBase])=>{const response=await fetch(pathBase+'ally.json?v=sherininya-v1');if(!response.ok)throw Error(kind+' ally.json '+response.status);const metadata=await response.json(),art={registration:metadata.views,motionFrameSize:metadata.motionFrameSize,images:{}};state.art[kind]=art;const paths=D.flatMap(d=>[d+'.png',d+'-motion.png']);await Promise.all(paths.map(path=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{art.images[path]=im;resolve();};im.onerror=()=>reject(Error(kind+' '+path));im.src=pathBase+'assets/'+path;})));if(kind==='yuzunamiki'){state.registration=art.registration;state.images=art.images;}}));state.ready=true;redraw();}catch(e){state.error=e.message;console.error('助っ人画像',e);redraw();}}
 function draw(g,a,t,camX,camY){const customArt=a.kind!=='yuzunamiki',art=customArt?state.art[a.kind]:{images:state.images,registration:state.registration};let vx=a.vx,vy=a.vy;
  const dash=a.dash,phase=dash?(t-dash.start)/dash.duration:1;
  if(dash&&phase>=0&&phase<1){const k=phase<.2?phase/.2:phase<.65?1:(1-phase)/.35;vx=dash.from.x+(dash.to.x-dash.from.x)*k;vy=dash.from.y+(dash.to.y-dash.from.y)*k;g.save();g.strokeStyle='#88f2ff88';g.lineWidth=TS*.08;g.beginPath();g.moveTo(camX+dash.from.x*TS+TS/2,camY+dash.from.y*tilePitchY()+tilePitchY()*.6);g.lineTo(camX+vx*TS+TS/2,camY+vy*tilePitchY()+tilePitchY()*.6);g.stroke();g.restore();}
  const px=camX+vx*TS,py=camY+vy*tilePitchY(),s=TS*CHAR_K[charPref]*(customArt?1:state.renderScale)/192,x=px+TS/2,y=py+tilePitchY()*.9;
  if(a.magicBeam&&t-a.magicBeam.start>=0&&t-a.magicBeam.start<300){const beam=a.magicBeam,end=beam.cells[beam.cells.length-1];if(end){g.save();g.globalAlpha=1-(t-beam.start)/300;g.lineCap='round';for(const [color,width]of [['#9e6ac7aa',TS*.18],['#1a1025ee',TS*.085]]){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(camX+beam.from.x*TS+TS/2,camY+beam.from.y*tilePitchY()+tilePitchY()*.55);g.lineTo(camX+end.x*TS+TS/2,camY+end.y*tilePitchY()+tilePitchY()*.55);g.stroke();}g.restore();}}
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,TS*.28,TS*.09,0,0,Math.PI*2);g.fill();
  const attacking=a.attackStart!=null&&t-a.attackStart<300,walking=t<a.walkEnd,face=attacking?a.attackFace:a.face,d=MonsterSprites.direction(face||[0,1]);let image=art?.images[d+'.png'],sx=0,pose='idle';
  if(attacking&&t-a.attackStart>=35&&t-a.attackStart<240){image=art?.images[d+'-motion.png'];sx=art?.motionFrameSize?.[0]||256;pose='attack';}else if(walking&&Math.floor((t-a.walkStart)/80)%2===0){image=art?.images[d+'-motion.png'];pose='walk';}
  if(a.boost>0||t-(a.castStart||-9999)<600){g.save();const r=TS*.6,glow=g.createRadialGradient(x,y-TS*.45,3,x,y-TS*.45,r);glow.addColorStop(0,'#b55bff55');glow.addColorStop(1,'#b55bff00');g.fillStyle=glow;g.fillRect(x-r,y-TS*.45-r,r*2,r*2);g.restore();}
  if(image){const anchor=art?.registration[d]?.anchors?.[pose]||[128,224];const width=pose!=='idle'?(art?.motionFrameSize?.[0]||256):256;g.drawImage(image,sx,0,width,256,x-anchor[0]*s,y-anchor[1]*s,width*s,256*s);}
  g.fillStyle='#16111f';g.fillRect(px,py+tilePitchY()-3,TS,3);g.fillStyle=a.following?'#a3d4ff':'#debfff';g.fillRect(px,py+tilePitchY()-3,TS*a.hp/a.maxhp,3);
  g.font=Math.max(9,Math.round(TS*.18))+'px sans-serif';g.textAlign='center';g.fillStyle=customArt?'#adf4fa':'#f5d7ff';g.fillText(config(a).name+(a.following?' Lv'+a.lv:'［話す］'),x,y-192*s-4);
  return [px,py];
 }
 function animate(dt){const a=state.actor;if(!a)return;const dx=a.x-a.vx,dy=a.y-a.vy,d=Math.hypot(dx,dy),s=dt/100;if(d>2.5||d<=s){a.vx=a.x;a.vy=a.y;}else{a.vx+=dx/d*s;a.vy+=dy/d*s;}}
 function animating(t){const a=state.actor;return !!a&&(Math.hypot(a.x-a.vx,a.y-a.vy)>.001||t<a.walkEnd||a.attackStart!=null&&t-a.attackStart<300||a.castStart!=null&&t-a.castStart<600||a.dash!=null&&t-a.dash.start<a.dash.duration);}
 function portrait(a){return '<span class="ally-face" aria-hidden="true"><img src="'+(artBases[a?.kind]||base)+'assets/S.png" alt=""></span>';}
 function updateParty(members){
  if(!document.body)return;let host=document.getElementById('partyHUD');
  if(!host){host=document.createElement('div');host.id='partyHUD';host.setAttribute('role','group');host.setAttribute('aria-label','仲間');document.body.append(host);}
  host.hidden=!members.length;const keys=new Set();
  members.forEach((a,i)=>{const key=String(a.id||a.kind||i);keys.add(key);let badge=[...host.children].find(el=>el.dataset.member===key);
   if(!badge){badge=document.createElement('button');badge.className='party-slot';badge.dataset.member=key;badge.id=i===0?'allyBadge':'';badge.innerHTML=portrait(a)+'<span class="party-info"><span class="party-name"></span><span class="party-numbers"></span><span class="party-track"><span class="party-fill"></span></span><span class="party-status"></span></span>';badge.onclick=()=>{if(uiBlocked()||dead)return;openGameMenu();showMenuInfo('status');};host.append(badge);}
   const name=a.name||config(a).name,ratio=Math.max(0,Math.min(1,a.hp/a.maxhp));badge.setAttribute('aria-label',name+' レベル'+a.lv+' HP '+a.hp+' / '+a.maxhp+' 状態を開く');badge.querySelector('.party-name').textContent=name;badge.querySelector('.party-numbers').textContent='Lv'+a.lv+'　'+a.hp+'/'+a.maxhp;badge.querySelector('.party-fill').style.width=(ratio*100)+'%';badge.classList.toggle('low',ratio<=.25);badge.querySelector('.party-status').textContent=a.kind==='sherininya'?'黒魔法':a.kind==='avenius'?'一閃':a.boost?'狐火 ×2':'';
  });
  for(const child of [...host.children])if(!keys.has(child.dataset.member))child.remove();
 }
 function ui(){updateParty(live()?[state.actor]:[]);}

 function init(){if(!document.body)return;const el=document.createElement('section');el.id='allyPrompt';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','allyName');el.innerHTML='<div class="ally-dialog"><div class="ally-portrait" id="allyPortrait">'+portrait()+'</div><div class="ally-speech"><h2 id="allyName">ユズナミキ</h2><div id="allyContent" aria-live="polite"></div></div><div class="ally-choices"><button id="allyJoin">一緒に行く</button><button id="allyStay">そのまま</button></div></div>';document.body.append(el);document.getElementById('allyJoin').onclick=()=>recruit();document.getElementById('allyStay').onclick=()=>{hide();render();};document.addEventListener('keydown',e=>{if(!state.open)return;if(e.key==='Tab'){e.preventDefault();const join=document.getElementById('allyJoin'),stay=document.getElementById('allyStay');(document.activeElement===join?stay:join.hidden?stay:join).focus();return;}e.preventDefault();e.stopImmediatePropagation();if(e.key==='Escape'){hide();render();}else if(['Enter','z','x',' '].includes(e.key)){document.activeElement?.click();}else if(e.key.startsWith('Arrow')){const join=document.getElementById('allyJoin'),stay=document.getElementById('allyStay');(document.activeElement===join?stay:join.hidden?stay:join).focus();}},true);}
 root.AllySystem={state,at,stats,reset,newFloor,nearby,recruit,talk,gainExp,tick,enemyAction,load,draw,animate,animating,ui,updateParty,init,infoHTML,hide,make,hurt};
})(typeof window==='undefined'?globalThis:window);
