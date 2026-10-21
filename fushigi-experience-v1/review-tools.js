(function(){
 const tools=document.createElement('div');tools.id='reviewTools';tools.innerHTML='<select id="reviewMode" aria-label="確認シーン"><option value="room">部屋の照明</option><option value="corridor">通路の照明</option><option value="traps">罠・アイコン</option><option value="stairs">階段</option><option value="bag">持ち物UI</option><option value="play">通常プレイ</option></select><select id="reviewTheme" aria-label="ロケーション">'+DungeonGenerator.themes.map(t=>'<option value="'+t.id+'">'+t.name+'</option>').join('')+'</select><button id="reviewStairs">階段の選択肢</button>';
 document.body.append(tools);
 const mode=$('reviewMode'),theme=$('reviewTheme');
 function setup(which='room'){
  mode.value=which;
  closeBag();closeStairs();closeWh();closeCfg();dead=false;holdStop();
  if(which==='play'){toTown(false);render();return;}
  scene='dungeon';floorNo=2;turn=0;MW=26;MH=20;
  map=Array.from({length:MH},()=>Array(MW).fill(WALL));roomGrid=Array.from({length:MH},()=>Array(MW).fill(-1));
  rooms=[{x:8,y:5,w:9,h:9,cx:12,cy:9}];
  for(let y=5;y<14;y++)for(let x=8;x<17;x++)if(!((x===8||x===16)&&(y===5||y===13))){map[y][x]=FLOOR;roomGrid[y][x]=0;}
  for(let x=2;x<24;x++)map[10][x]=FLOOR;
  floorPlan={theme:DungeonGenerator.themes.find(t=>t.id===theme.value)||DungeonGenerator.themes[0],artSeed:714,seed:714};
  player.x=player.vx=which==='corridor'?5:12;player.y=player.vy=10;player.face=[1,0];player.st=newStatus();player.hp=44;player.maxhp=55;player.lv=3;player.walkEnd=0;player.action=null;player.swing=0;
  enemies=[];traps=[];floorItems=[];floorShop=null;gold=1240;belly=78;
  map[11][14]=STAIRS;
  inv=[mkItem('katana',1),mkItem('tekkoshield',1),mkItem('herb'),mkItem('scroll'),mkItem('onigiri'),mkItem('arrow',12),mkItem('firestaff',4),mkItem('ring_regen')];eqWeapon=inv[0];eqShield=inv[1];bagTab='全部';
  floorItems=which==='stairs'?[]:[{x:11,y:11,item:mkItem('gold',150)},{x:13,y:11,item:mkItem('arrow',6)}];
  if(which==='traps')Object.keys(TRAPS).forEach((kind,i)=>traps.push({kind,x:10+i%3*2,y:9+Math.floor(i/3)*2,seen:true}));
  if(which==='traps'){map[11][14]=FLOOR;floorItems.forEach((f,i)=>{f.x=10+i*2;f.y=12;});}
  if(which==='traps')floorShop={room:0,stock:[],x:15,y:12};
  if(which==='stairs'){player.x=player.vx=13;player.y=player.vy=11;}
  seen=Array.from({length:MH},()=>Array(MW).fill(false));updateVis();
  fadeT=-1000;hurtT=0;shakeAmp=0;fx.length=0;vfx.length=0;logs=[];player.flash=0;
  render();if(which==='bag')openBag();
 }
 mode.onchange=()=>setup(mode.value);theme.onchange=()=>setup(mode.value);$('reviewStairs').onclick=()=>{setup('stairs');player.x=player.vx=14;openStairs();};
 window.ExperienceReview={setup,get mode(){return mode.value;}};
 Promise.all([new Promise(resolve=>{const check=()=>{if(DungeonExperience.ready&&CaveTerrain.ready&&ApprovedHero.ready)resolve();else setTimeout(check,50);};check();})]).then(()=>setup(new URLSearchParams(location.search).get('mode')||'room'));
})();
