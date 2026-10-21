// Dungeon-only companions. Stats reference current hero equipment, never copy it.
(function(root){
 const D=['S','SW','W','NW','N','NE','E','SE'];
 const src=typeof document!=='undefined'&&document.currentScript?.src;
 const base=src?new URL('../fushigi-allies-v1/',src).href:'fushigi-allies-v1/';
 const state={actor:null,used:false,open:false,renderScale:1.20,registration:{},ready:false,error:null,images:{}};
 const distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const at=(x,y)=>state.actor?.x===x&&state.actor?.y===y?state.actor:null;
 const stats=a=>({attack:Math.max(1,Math.round(playerAtk()+2+(a.lv-1)*.8)-(a.poison||0)),defense:Math.max(0,defBonus()-1+Math.floor((a.lv-1)/3)),maxhp:26+4*(a.lv-1)});
 const live=()=>scene==='dungeon'&&state.actor?.following&&state.actor.hp>0;
 function hide(){state.open=false;const el=document.getElementById('allyPrompt');if(el)el.hidden=true;}
 function reset(){state.actor=null;state.used=false;hide();}
 function make(x,y){const lv=Math.max(1,player.lv);return {kind:'yuzunamiki',isAlly:true,x,y,vx:x,vy:y,lv,exp:0,hp:26+4*(lv-1),maxhp:26+4*(lv-1),following:false,face:[0,1],st:{},boost:0,cooldown:0};}
 function free(x,y){return inb(x,y)&&map[y][x]===FLOOR&&!enemyAt(x,y)&&!itemAt(x,y)&&!trapAt(x,y)&&!(player.x===x&&player.y===y);}
 function newFloor(){
  hide();const a=state.actor;
  if(a?.following){
   const q=[[player.x,player.y]],visited=new Set([player.x+','+player.y]);let cell;
   for(let i=0;i<q.length&&!cell;i++){const [x,y]=q[i];for(const [dx,dy]of DIRS8){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(!geomOK(x,y,dx,dy)||visited.has(key))continue;visited.add(key);if(free(nx,ny)){cell=[nx,ny];break;}q.push([nx,ny]);}}
   if(cell){[a.x,a.y]=cell;a.vx=a.x;a.vy=a.y;a.walkEnd=0;a.attackStart=null;}else{state.actor=null;say('ユズナミキは別の道へ向かった。');}return;
  }
  state.actor=null;
  if(state.used||floorNo<2||Math.random()>=.25)return;
  const cells=[];for(const r of rooms.slice(1))if(!r.mh&&r.role!=='shop')for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(free(x,y))cells.push([x,y]);
  if(cells.length){const [x,y]=cells[rnd(0,cells.length-1)];state.actor=make(x,y);}
 }
 function nearby(){const a=state.actor;return scene==='dungeon'&&a&&distance(a,player)<=1&&geomOK(player.x,player.y,a.x-player.x,a.y-player.y)?a:null;}
 function recruit(){const a=nearby();if(!a||a.following)return false;a.following=true;state.used=true;say('ユズナミキ「道連れも悪くないね。クナイは壁の向こうまで届くよ」');hide();render();return true;}
 function infoHTML(){const a=state.actor;if(!a||!a.following)return '<p>同行している助っ人はいない。</p>';const s=stats(a);return '<h3>ユズナミキ　Lv'+a.lv+'</h3><p>HP '+a.hp+'/'+a.maxhp+'　EXP '+a.exp+'/'+expNeed(a.lv)+'</p><p>攻撃 '+s.attack+'　守備 '+s.defense+'<br>装備固定：クナイ・着物<br>クナイ：8方向の直線2マス・障害物越し<br>狐火の襲：本人のみ4ターン2回行動'+(a.boost?'（残り'+a.boost+'）':'')+'</p>';}
 function talk(){const a=nearby();if(!a||uiBlocked())return;holdStop();state.open=true;const el=document.getElementById('allyPrompt');if(!el)return;el.hidden=false;document.getElementById('allyContent').innerHTML=a.following?infoHTML():'<h2>ユズナミキ</h2><p>「一緒に行こうか？ このクナイ、壁の向こうにも届くんだ」</p><p>狐耳の忍び。クナイと着物の装備は固定。あなたの攻撃・守備と自身のレベルで強くなる。</p>';document.getElementById('allyJoin').hidden=a.following;document.getElementById('allyStay').textContent=a.following?'戻る':'そのまま';(a.following?document.getElementById('allyStay'):document.getElementById('allyJoin')).focus?.();render();}
 function gainExp(n){if(!live())return;const a=state.actor;a.exp+=n;while(a.lv<MAX_LV&&a.exp>=expNeed(a.lv)){a.exp-=expNeed(a.lv);a.lv++;a.maxhp=stats(a).maxhp;a.hp=Math.min(a.maxhp,a.hp+4);fxText(a.x,a.y,'Lv'+a.lv,'#c9a7ff');say('ユズナミキはレベル'+a.lv+'になった！');}}
 function strike(a,e){a.face=[Math.sign(e.x-a.x),Math.sign(e.y-a.y)];a.attackFace=a.face.slice();a.attackStart=now();a.walkEnd=0;
  if(!(e.st?.sleep>0)&&Math.random()>=ACC.p){fxText(e.x,e.y,'MISS','#d7c3ff');say('ユズナミキのクナイは外れた。');return;}
  const damage=Math.max(1,Math.round((stats(a).attack-eT(e).def+1)*(.875+Math.random()*.25)));e.hp-=damage;e.aware=true;e.flash=now()+130;if(e.st)e.st.sleep=0;
  vfxHit(e.x,e.y,e.x-a.x,e.y-a.y,'#cf9aff',e.hp<=0);fxText(e.x,e.y,'-'+damage,'#e0bcff');say('ユズナミキのクナイ！ '+eT(e).name+'に'+damage+'ダメージ。');
  if(e.hp<=0)killEnemy(e);else afterDamage(e);kick();
 }
 function move(a,x,y){a.face=[Math.sign(x-a.x),Math.sign(y-a.y)];a.x=x;a.y=y;a.walkStart=now();a.walkEnd=now()+220;}
 function tick(){if(!live()||dead)return;const a=state.actor;if(a.cooldown>0)a.cooldown--;
  if(a.st.sleep>0){a.st.sleep--;if(a.boost>0)a.boost--;return;}const confused=a.st.confuse>0;if(confused)a.st.confuse--;
  const inBattle=enemies.some(e=>!e.mh&&distance(a,e)<=5&&los(a.x,a.y,e.x,e.y));
  if(!confused&&!a.boost&&!a.cooldown&&inBattle&&Math.random()<.12){a.boost=4;a.cooldown=12;a.castStart=now();fxText(a.x,a.y,'狐火の襲','#d9a0ff');say('ユズナミキは「狐火の襲」！ 本人だけ4ターン倍速。');}
  for(let step=0;step<(a.boost>0?2:1);step++){
   if(confused){const [dx,dy]=DIRS8[rnd(0,7)],x=a.x+dx,y=a.y+dy;if(geomOK(a.x,a.y,dx,dy)&&!enemyAt(x,y)&&!(player.x===x&&player.y===y))move(a,x,y);continue;}
   const target=enemies.filter(e=>!e.mh&&distance(a,e)<=2&&aligned(a.x,a.y,e.x,e.y)).sort((x,y)=>distance(a,x)-distance(a,y))[0];
   if(target){strike(a,target);continue;}
   const d=distMap(),current=d[a.y][a.x];if(current<=1)break;
   const choices=DIRS8.map(([dx,dy])=>({x:a.x+dx,y:a.y+dy,dx,dy})).filter(c=>geomOK(a.x,a.y,c.dx,c.dy)&&d[c.y][c.x]>=1&&d[c.y][c.x]<current&&!enemyAt(c.x,c.y)).sort((x,y)=>d[x.y][x.x]-d[y.y][y.x]);
   if(choices.length)move(a,choices[0].x,choices[0].y);
  }
  if(a.boost>0)a.boost--;if(turn%10===0&&a.hp<a.maxhp)a.hp++;
 }
 function hurt(n){const a=state.actor;if(!a)return;a.hp-=n;a.flash=now()+130;fxText(a.x,a.y,'-'+n,'#ffb6e8');if(a.hp<=0){say('ユズナミキ「ここは引くよ。無茶しないでね！」');state.actor=null;hide();}}
 function clearRay(e,a){let x=e.x,y=e.y;const dx=Math.sign(a.x-x),dy=Math.sign(a.y-y);while(x!==a.x||y!==a.y){if(!geomOK(x,y,dx,dy))return false;x+=dx;y+=dy;if((x!==a.x||y!==a.y)&&(enemyAt(x,y)||(player.x===x&&player.y===y)))return false;}return true;}
 function enemyAction(e,T){if(!live()||e.loot)return false;const a=state.actor,dist=distance(e,a);if(dist>=distance(e,player)||dist>SIGHT||!los(e.x,e.y,a.x,a.y))return false;e.aware=true;
  const ranged=T.range&&dist>1&&dist<=T.range&&aligned(e.x,e.y,a.x,a.y)&&clearRay(e,a),adj=dist===1&&(T.ai==='ghost'||geomOK(e.x,e.y,a.x-e.x,a.y-e.y));
  if(ranged||adj){e.monsterFace=[Math.sign(a.x-e.x),Math.sign(a.y-e.y)];e.monsterAttackFace=e.monsterFace.slice();e.monsterAttackStart=now();
   if(T.ai==='bomb'){enemies.splice(enemies.indexOf(e),1);hurt(Math.max(1,Math.ceil((5+Math.floor(floorNo*.8))*(T.bombScale||1))-Math.floor(stats(a).defense/2)));say(T.name+'がユズナミキのそばで爆発した！');if(distance(e,player)<=1)hurtPlayer(Math.max(1,5+floorNo-defBonus()),'爆風で力尽きた…');return true;}
   if(Math.random()>=ACC.e){fxText(a.x,a.y,'MISS','#c7dfff');return true;}
   const range=ranged&&T.ai==='breath'?T.breath(floorNo):T.atk(floorNo),damage=Math.max(1,rnd(...range)-stats(a).defense);hurt(damage);say(T.name+'の攻撃！ ユズナミキに'+damage+'ダメージ。');
   if(state.actor){if(T.ai==='sleepy')a.st.sleep=T.statusTurns||5;if(T.ai==='dazzle')a.st.confuse=T.statusTurns||8;if(T.ai==='venom')a.poison=Math.min(4,(a.poison||0)+1);}return true;
  }
  if(T.spd==='still'||T.spd==='slow'&&turn%2===1)return true;
  const choices=DIRS8.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy,dx,dy})).filter(c=>inb(c.x,c.y)&&(T.ai==='ghost'||geomOK(e.x,e.y,c.dx,c.dy))&&!enemyAt(c.x,c.y)&&!at(c.x,c.y)&&!(player.x===c.x&&player.y===c.y)&&distance(c,a)<dist).sort((x,y)=>distance(x,a)-distance(y,a));
  if(choices.length){e.x=choices[0].x;e.y=choices[0].y;}return true;
 }
 async function load(redraw){try{const response=await fetch(base+'ally.json?v=ground-v3');if(!response.ok)throw Error('ally.json '+response.status);const metadata=await response.json();state.registration=metadata.views;const paths=D.flatMap(d=>[d+'.png',d+'-motion.png']);await Promise.all(paths.map(path=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{state.images[path]=im;resolve();};im.onerror=()=>reject(Error(path));im.src=base+'assets/'+path;})));state.ready=true;redraw();}catch(e){state.error=e.message;console.error('助っ人画像',e);redraw();}}
 function draw(g,a,t,camX,camY){const px=camX+a.vx*TS,py=camY+a.vy*tilePitchY(),s=TS*CHAR_K[charPref]*state.renderScale/192,x=px+TS/2,y=py+tilePitchY()*.9;
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,TS*.28,TS*.09,0,0,Math.PI*2);g.fill();
  const attacking=a.attackStart!=null&&t-a.attackStart<300,walking=t<a.walkEnd,face=attacking?a.attackFace:a.face,d=MonsterSprites.direction(face||[0,1]);let image=state.images[d+'.png'],sx=0,pose='idle';
  if(attacking&&t-a.attackStart>=35&&t-a.attackStart<240){image=state.images[d+'-motion.png'];sx=256;pose='attack';}else if(walking&&Math.floor((t-a.walkStart)/80)%2===0){image=state.images[d+'-motion.png'];pose='walk';}
  if(a.boost>0||t-(a.castStart||-9999)<600){g.save();const r=TS*.6,glow=g.createRadialGradient(x,y-TS*.45,3,x,y-TS*.45,r);glow.addColorStop(0,'#b55bff55');glow.addColorStop(1,'#b55bff00');g.fillStyle=glow;g.fillRect(x-r,y-TS*.45-r,r*2,r*2);g.restore();}
  if(image){const anchor=state.registration[d]?.anchors?.[pose]||[128,224];g.drawImage(image,sx,0,256,256,x-anchor[0]*s,y-anchor[1]*s,256*s,256*s);}
  g.fillStyle='#16111f';g.fillRect(px,py+tilePitchY()-3,TS,3);g.fillStyle=a.following?'#a3d4ff':'#debfff';g.fillRect(px,py+tilePitchY()-3,TS*a.hp/a.maxhp,3);
  g.font=Math.max(9,Math.round(TS*.18))+'px sans-serif';g.textAlign='center';g.fillStyle='#f5d7ff';g.fillText(a.following?'ユズナミキ Lv'+a.lv:'ユズナミキ［話す］',x,y-192*s-4);
  return [px,py];
 }
 function animate(dt){const a=state.actor;if(!a)return;const dx=a.x-a.vx,dy=a.y-a.vy,d=Math.hypot(dx,dy),s=dt/100;if(d>2.5||d<=s){a.vx=a.x;a.vy=a.y;}else{a.vx+=dx/d*s;a.vy+=dy/d*s;}}
 function animating(t){const a=state.actor;return !!a&&(Math.hypot(a.x-a.vx,a.y-a.vy)>.001||t<a.walkEnd||a.attackStart!=null&&t-a.attackStart<300||a.castStart!=null&&t-a.castStart<600);}
 function ui(){if(!document.body)return;let badge=document.getElementById('allyBadge');if(!badge){badge=document.createElement('button');badge.id='allyBadge';badge.onclick=()=>{openGameMenu();showMenuInfo('status');};document.body.append(badge);}const a=state.actor;badge.hidden=!live();if(live())badge.textContent='ユズナミキ Lv'+a.lv+'　HP '+a.hp+'/'+a.maxhp+(a.boost?'　狐火 ×2':'');}
 function init(){if(!document.body)return;const el=document.createElement('section');el.id='allyPrompt';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','ユズナミキとの会話');el.innerHTML='<div class="ally-dialog"><div id="allyContent"></div><div class="ally-choices"><button id="allyJoin">一緒に行く</button><button id="allyStay">そのまま</button></div></div>';document.body.append(el);document.getElementById('allyJoin').onclick=()=>recruit();document.getElementById('allyStay').onclick=()=>{hide();render();};document.addEventListener('keydown',e=>{if(!state.open)return;if(e.key==='Tab'){e.preventDefault();const join=document.getElementById('allyJoin'),stay=document.getElementById('allyStay');(document.activeElement===join?stay:join.hidden?stay:join).focus();return;}e.preventDefault();e.stopImmediatePropagation();if(e.key==='Escape'){hide();render();}else if(['Enter','z','x'].includes(e.key)){document.activeElement?.click();}else if(e.key.startsWith('Arrow')){const join=document.getElementById('allyJoin'),stay=document.getElementById('allyStay');(document.activeElement===join?stay:join.hidden?stay:join).focus();}},true);}
 root.AllySystem={state,at,stats,reset,newFloor,nearby,recruit,talk,gainExp,tick,enemyAction,load,draw,animate,animating,ui,init,infoHTML,hide,make};
})(typeof window==='undefined'?globalThis:window);
