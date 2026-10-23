(()=>{
 const cases={splash:'3×3爆風',wall:'壁を破壊',intercept:'敵に着弾',evolve:'同時撃破で三段階進化',ally:'仲間を倒して進化',self:'砲手自身も爆風に巻き込まれる'};
 const box=document.createElement('div');box.style.cssText='position:fixed;left:8px;z-index:40;display:flex;gap:6px;flex-wrap:wrap;max-width:95vw;padding:7px;background:#17232ced;border:1px solid #a68a58;color:#e9d9b5;font:12px system-ui';
 box.innerHTML='<select id="blastCase" aria-label="砲撃の確認">'+Object.entries(cases).map(([k,n])=>`<option value="${k}">${n}</option>`).join('')+'</select><button id="blastSetup">配置</button><button id="blastFire">発射</button><button id="blastSave">保存・再開</button><span>別セーブ／主人公HP999</span>';
 for(const el of box.querySelectorAll('select,button'))el.style.cssText='min-height:34px;background:#32424c;color:#eee0c7;border:1px solid #9e8659';document.body.append(box);
 const resize=()=>{box.style.top=innerWidth>innerHeight?'38px':'90px';};resize();addEventListener('resize',resize);
 let shooter=null,target=null;
 function setup(which=document.getElementById('blastCase').value){
  document.getElementById('blastCase').value=which;EventVfx.reset();holdStop();closeBag();closeStairs();closeWh();closeCfg();dead=false;scene='dungeon';dungeonId='third';floorNo=24;turn=0;MW=26;MH=20;
  map=Array.from({length:MH},()=>Array(MW).fill(WALL));roomGrid=Array.from({length:MH},()=>Array(MW).fill(-1));rooms=[{x:5,y:4,w:16,h:12,cx:13,cy:10}];for(let y=4;y<16;y++)for(let x=5;x<21;x++){map[y][x]=FLOOR;roomGrid[y][x]=0;}
  floorPlan={theme:DungeonGenerator.themes[1],artSeed:714,seed:714};player.x=player.vx=15;player.y=player.vy=10;player.face=[-1,0];player.st=newStatus();player.hp=player.maxhp=999;player.lv=8;player.swing=0;inv=[];eqWeapon=eqShield=null;eqRings=[null,null];AllySystem.state.actor=null;
  enemies=[];floorItems=[];traps=[];floorShop=null;shooter=spawnEnemy(11,10,true,'cannon');shooter.monsterFace=[1,0];target=player;
  if(which==='splash')for(const [x,y]of [[14,9],[15,9],[16,9],[14,10],[16,10],[14,11],[15,11],[16,11],[17,10]]){const e=spawnEnemy(x,y,true,'cannon');e.hp=e.maxhp=100;}
  if(which==='wall')for(const [x,y]of [[14,10],[14,9],[15,9],[14,11],[15,11]])map[y][x]=WALL;
  if(which==='intercept'){const e=spawnEnemy(13,10,true,'goblin');e.hp=e.maxhp=100;}
  if(which==='evolve')for(const [x,y]of [[15,9],[16,10],[15,11]])spawnEnemy(x,y,true,'slime').hp=1;
  if(which==='ally'){player.x=player.vx=18;const a=AllySystem.make(15,10);a.following=true;a.hp=1;AllySystem.state.actor=a;target=a;}
  if(which==='self'){shooter.x=shooter.vx=14;shooter.hp=1;spawnEnemy(15,9,true,'slime').hp=1;}
  seen=Array.from({length:MH},()=>Array(MW).fill(false));CaveTerrain.cache.clear();updateVis();fadeT=-1000;hurtT=0;shakeAmp=0;fx.length=0;vfx.length=0;logs=[];render();return shooter;
 }
 function fire(){if(!shooter||!enemies.includes(shooter))return;const ray=MonsterCombat.trace(shooter,1,0,8),result=MonsterCombat.fire(shooter,target,ray);updateVis();kick();return result;}
 function resume(){RunSave.save();RunSave.restore();shooter=enemies.find(e=>eT(e).family==='cannon');target=AllySystem.state.actor||player;updateVis();render();kick();}
 document.getElementById('blastSetup').onclick=()=>setup();document.getElementById('blastCase').onchange=()=>setup();document.getElementById('blastFire').onclick=()=>fire();document.getElementById('blastSave').onclick=resume;window.BlastReview={setup,fire,resume,cases};
 const timer=setInterval(()=>{if(MonsterSprites.ready&&ApprovedHero.ready&&CaveTerrain.ready&&DungeonExperience.ready&&EventVfx.state.images.blessing){clearInterval(timer);setup();}},100);
})();
