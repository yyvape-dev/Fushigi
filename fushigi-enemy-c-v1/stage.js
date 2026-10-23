(()=>{
 const keys=['ninja','caster','mimic','summoner','charged','cannon','lord'],names=['ニンジャ','まじゅつ師','ミミック','すず坊主','いかずち岩','おおづつ兵','アビスロード'];
 const tools=document.createElement('div');tools.style.cssText='position:fixed;left:8px;top:90px;z-index:40;max-width:95vw;display:flex;flex-wrap:wrap;gap:5px;background:#19232bef;padding:7px;border:1px solid #9e8959;font:12px system-ui';
 tools.innerHTML='<select id="deepFamily" aria-label="深層の敵">'+keys.map((k,i)=>`<option value="${k}">${names[i]}</option>`).join('')+'</select><select id="deepRank" aria-label="ランク">'+[1,2,3,4].map(i=>`<option value="${i}">ランク${i}</option>`).join('')+'</select><button id="deepPlace">配置</button><button id="deepAttack">攻撃確認</button><button id="deepWalk">歩行確認</button><a href="fushigi-enemy-c-v1/runtime-preview.html" style="color:#ffe0a2">動作図鑑</a>';
 for(const e of tools.querySelectorAll('select,button'))e.style.cssText='min-height:34px;background:#303f47;color:#f0e3c8;border:1px solid #937e56';document.body.append(tools);
 const placeTools=()=>{tools.style.top=innerWidth>innerHeight?'38px':'90px';};placeTools();window.addEventListener('resize',placeTools);
 function setup(){
  closeBag();closeStairs();closeWh();closeCfg();dead=false;holdStop();scene='dungeon';dungeonId='third';floorNo=24;turn=0;MW=26;MH=20;
  map=Array.from({length:MH},()=>Array(MW).fill(WALL));roomGrid=Array.from({length:MH},()=>Array(MW).fill(-1));rooms=[{x:5,y:4,w:16,h:12,cx:13,cy:10}];
  for(let y=4;y<16;y++)for(let x=5;x<21;x++){map[y][x]=FLOOR;roomGrid[y][x]=0;}
  floorPlan={theme:DungeonGenerator.themes[1],artSeed:714,seed:714};player.x=player.vx=13;player.y=player.vy=11;player.face=[0,-1];player.st=newStatus();player.hp=player.maxhp=999;player.lv=15;player.swing=0;
  const family=document.getElementById('deepFamily').value,tier=+document.getElementById('deepRank').value,kind=family==='lord'||tier===1?family:family+'_'+tier;
  enemies=[];for(const [x,y]of [[10,11],[13,12],[16,11]]){const e=spawnEnemy(x,y,true,kind);e.vx=x;e.vy=y;e.monsterFace=[0,1];}floorItems=[];traps=[];floorShop=null;
  seen=Array.from({length:MH},()=>Array(MW).fill(false));updateVis();fadeT=-1000;hurtT=0;shakeAmp=0;fx.length=0;vfx.length=0;logs=[];render();
 }
 document.getElementById('deepPlace').onclick=setup;
 document.getElementById('deepFamily').onchange=setup;document.getElementById('deepRank').onchange=setup;
 document.getElementById('deepAttack').onclick=()=>{const t=performance.now();for(const e of enemies){e.monsterAttackStart=t;e.monsterAttackFace=e.monsterFace||[0,1];}kick();};
 document.getElementById('deepWalk').onclick=()=>{const t=performance.now();for(const e of enemies){e.monsterWalkStart=t;e.monsterWalkEnd=t+320;e.monsterWalkStep=0;}kick();};
 window.DeepEnemyReview={setup};const timer=setInterval(()=>{if(MonsterSprites.error){clearInterval(timer);throw Error(MonsterSprites.error);}if(MonsterSprites.ready&&ApprovedHero.ready&&CaveTerrain.ready&&DungeonExperience.ready){clearInterval(timer);setup();}},100);
})();
