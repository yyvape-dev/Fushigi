(()=>{
 const cases={ninja:'手裏剣',warp:'魔弾：転移',confuse:'魔弾：混乱',mute:'魔弾：くちなし',drain:'魔弾：レベル低下',mimic:'ミミックの正体',bell:'鈴と召喚',lightning:'岩の雷',cannon:'大砲',abyss:'主の炎',bite:'ミミックの噛みつき'};
 const box=document.createElement('div');box.style.cssText='position:fixed;left:8px;z-index:40;display:flex;gap:6px;flex-wrap:wrap;max-width:95vw;padding:7px;background:#17232ced;border:1px solid #a68a58;color:#e9d9b5;font:12px system-ui';
 box.innerHTML='<select id="enemyFxCase" aria-label="敵のエフェクト">'+Object.entries(cases).map(([k,n])=>`<option value="${k}">${n}</option>`).join('')+'</select><button id="enemyFxPlay">再生</button><label><input type="checkbox" id="enemyFxMiss">はずれ</label><label><input type="checkbox" id="enemyFxProtect">混乱よけ</label><span>別セーブ／高HP</span>';
 for(const el of box.querySelectorAll('select,button'))el.style.cssText='min-height:34px;background:#32424c;color:#eee0c7;border:1px solid #9e8659';document.body.append(box);
 const resize=()=>{box.style.top=innerWidth>innerHeight?'38px':'90px';};resize();addEventListener('resize',resize);
 function setup(kind='ninja'){
  EventVfx.reset();holdStop();closeBag();closeStairs();closeWh();closeCfg();dead=false;scene='dungeon';dungeonId='third';floorNo=24;turn=0;MW=26;MH=20;
  map=Array.from({length:MH},()=>Array(MW).fill(WALL));roomGrid=Array.from({length:MH},()=>Array(MW).fill(-1));rooms=[{x:5,y:4,w:16,h:12,cx:13,cy:10}];for(let y=4;y<16;y++)for(let x=5;x<21;x++){map[y][x]=FLOOR;roomGrid[y][x]=0;}
  floorPlan={theme:DungeonGenerator.themes[1],artSeed:714,seed:714};player.x=player.vx=15;player.y=player.vy=10;player.face=[-1,0];player.st=newStatus();player.hp=player.maxhp=999;player.lv=8;player.swing=0;inv=[];eqWeapon=eqShield=null;eqRings=[document.getElementById('enemyFxProtect').checked?mkItem('ring_noconf'):null,null];AllySystem.state.actor=null;
  enemies=[];const e=spawnEnemy(12,10,true,kind);e.vx=e.x;e.vy=e.y;e.monsterFace=[1,0];floorItems=[];traps=[];floorShop=null;seen=Array.from({length:MH},()=>Array(MW).fill(false));updateVis();fadeT=-1000;hurtT=0;shakeAmp=0;fx.length=0;vfx.length=0;logs=[];render();return e;
 }
 function play(which=document.getElementById('enemyFxCase').value){
  document.getElementById('enemyFxCase').value=which;
  const kinds={warp:'caster',confuse:'caster_2',mute:'caster_3',drain:'caster_4',bell:'summoner_4',lightning:'charged',abyss:'lord',bite:'mimic'},e=setup(kinds[which]||which),T=eT(e);
  if(which==='mimic'){e.x=e.vx=14;e.mim=true;e.disg='herb';enemyTurn();}
  else if(which==='bell'){enemyAttackPose(e);summonAround(e,T);}
  else if(which==='lightning')afterDamage(e);
  else if(document.getElementById('enemyFxMiss').checked){enemyAttackPose(e);EnemyVfx.attack(e,T,player,false,which!=='bite');}
  else{const hit=enemyStrike(e,T,T.boss?T.breath(floorNo):T.atk(floorNo),which==='bite'?'攻撃':T.boss?'炎':T.verb||'手裏剣');if(T.fx&&hit.hit&&hit.dmg>0)castFx(T);}
  updateVis();kick();
 }
 document.getElementById('enemyFxPlay').onclick=()=>play();document.getElementById('enemyFxCase').onchange=()=>play();window.EnemyFxReview={setup,play,cases};
 const timer=setInterval(()=>{if(MonsterSprites.ready&&ApprovedHero.ready&&CaveTerrain.ready&&DungeonExperience.ready&&EventVfx.state.images.lightning){clearInterval(timer);setup();}},100);
})();
