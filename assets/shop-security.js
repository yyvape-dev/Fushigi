// Theft pursuers use normal enemy combat and collision, but never natural rolls.
(function(root){
 const D=['S','SW','W','NW','N','NE','E','SE'];
 const src=typeof document!=='undefined'&&document.currentScript?.src;
 const base=src?new URL('../fushigi-security-v1/',src).href:'fushigi-security-v1/';
 const state={active:false,nextWave:0,spawnIndex:0,images:{},meta:null,ready:false,error:null};
 const kinds=['shop_guard','shop_dog'];
 const isSecurity=e=>!!e&&kinds.includes(e.kind);
 function install(enemies){Object.assign(enemies,{
  shop_guard:{name:'番兵',w:0,from:99,hp:()=>240,atk:()=>[48,60],def:22,exp:0,ai:'melee',col:'#91b6e4',art:'shop_guard',security:true},
  shop_dog:{name:'番犬',w:0,from:99,hp:()=>160,atk:()=>[32,42],def:14,exp:0,ai:'melee',spd:'fast',col:'#858795',art:'shop_dog',security:true}
 });}
 function reset(){state.active=false;state.nextWave=0;state.spawnIndex=0;}
 function spawn(n=6,mode='mixed'){if(scene!=='dungeon'||dead)return 0;const capacity=12-enemies.filter(isSecurity).length;if(capacity<=0)return 0;const dist=distMap(),cells=[],stairs=[];for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)if(map[y][x]===STAIRS)stairs.push({x,y});
  for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++){const range=Math.max(Math.abs(x-player.x),Math.abs(y-player.y));const stairNear=stairs.some(s=>Math.max(Math.abs(x-s.x),Math.abs(y-s.y))===1);if(map[y][x]!==FLOOR||dist[y][x]<1||(mode==='stairs'?!stairNear:range<3||range>18)||enemyAt(x,y)||AllySystem.at(x,y)||ShopSystem.at(x,y)||itemAt(x,y)||trapAt(x,y))continue;cells.push({x,y,score:Math.abs(range-8)+(vis[y]?.[x]?4:0)+Math.random()*2});}
  cells.sort((a,b)=>a.score-b.score);let count=0;
  for(const c of cells.slice(0,Math.min(n,capacity))){const kind=mode==='stairs'?'shop_guard':mode==='dogs'?'shop_dog':kinds[state.spawnIndex++%2],hp=ENEMIES[kind].hp(floorNo),e={kind,x:c.x,y:c.y,vx:c.x,vy:c.y,hp,maxhp:hp,aware:true,lost:0,flash:0,bump:null,fl:false,st:{},monsterFace:[Math.sign(player.x-c.x),Math.sign(player.y-c.y)],isPursuer:true,spawnTurn:turn};enemies.push(e);count++;}
  if(count)say('番兵と黒い番犬が駆けつけた！');return count;
 }
 function alert(){if(state.active)return;state.active=true;spawn(4,'stairs');spawn(2,'dogs');state.nextWave=turn+16;}
 function newFloor(){reset();}
 function tick(){if(!state.active||dead||scene!=='dungeon')return;if(turn>=state.nextWave){spawn(1);state.nextWave=turn+16;}}
 async function load(redraw){try{const r=await fetch(base+'security.json?v=security-v1');if(!r.ok)throw Error('security metadata '+r.status);state.meta=await r.json();await Promise.all(kinds.flatMap(kind=>D.flatMap(d=>['idle','walk','attack'].map(action=>new Promise((resolve,reject)=>{const path=state.meta.actors[kind].views[d][action],im=new Image();im.onload=()=>{state.images[kind+'/'+d+'/'+action]=im;resolve();};im.onerror=()=>reject(Error(path));im.src=base+path;})))));state.ready=true;redraw();}catch(e){state.error=e.message;console.error('追手画像読込失敗',e);redraw();}}
 function draw(g,e,t,camX,camY){const [ox,oy]=entityOffset(e,t),px=camX+(e.vx+ox)*TS,py=camY+(e.vy+oy)*tilePitchY(),s=TS*CHAR_K[charPref]/192,x=px+TS/2,y=py+tilePitchY()*.9;const attack=e.monsterAttackStart!=null&&t-e.monsterAttackStart<300,walk=e.monsterWalkEnd>t&&Math.floor((t-e.monsterWalkStart)/80)%2===0,action=attack?'attack':walk?'walk':'idle',d=MonsterSprites.direction((attack?e.monsterAttackFace:e.monsterFace)||[0,1]),im=state.images[e.kind+'/'+d+'/'+action],cfg=state.meta?.actors[e.kind];
  g.save();g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,TS*.31,TS*.09,0,0,Math.PI*2);g.fill();if(im&&cfg){const [w,h]=cfg.frameSize,[ax,ay]=cfg.origin;g.drawImage(im,x-ax*s,y-ay*s,w*s,h*s);}else{g.fillStyle='#abc3dd';g.font='bold 12px sans-serif';g.textAlign='center';g.fillText(e.kind==='shop_guard'?'番兵':'番犬',x,y-TS*.5);}g.restore();return [px,py];
 }
 root.ShopSecurity={state,isSecurity,install,reset,spawn,alert,newFloor,tick,load,draw};
})(typeof window!=='undefined'?window:globalThis);
