(()=>{
 const tools=document.createElement('div');tools.id='allyReviewTools';tools.innerHTML='<button id="allyMeet">出会い</button><button id="allyWall">壁越しクナイ</button><button id="allyHaste">狐火の襲</button><button id="allyLevel">Lvを上げる</button><a href="fushigi-allies-v1/preview.html" style="color:#edc8ff">8方向の絵</a>';document.body.append(tools);
 function setup(mode='meet'){
  AllySystem.reset();ExperienceReview.setup('room');floorItems=[];traps=[];player.x=player.vx=12;player.y=player.vy=10;player.face=[-1,0];player.hp=player.maxhp=999;
  const a=AllySystem.make(11,10);AllySystem.state.actor=a;a.lv=3;a.maxhp=a.hp=34;
  if(mode!=='meet'){a.following=true;AllySystem.state.used=true;const hp=999;enemies=[{kind:'skeleton_2',x:9,y:10,vx:9,vy:10,hp,maxhp:hp,aware:true,st:{},flash:0}];if(mode==='wall')map[10][10]=WALL;if(mode==='haste'){a.boost=4;a.cooldown=12;a.castStart=now();}}
  window.AllyReview={setup};updateVis();render();
 }
 document.getElementById('allyMeet').onclick=()=>setup('meet');document.getElementById('allyWall').onclick=()=>setup('wall');document.getElementById('allyHaste').onclick=()=>setup('haste');document.getElementById('allyLevel').onclick=()=>{if(!AllySystem.state.actor?.following)setup('haste');AllySystem.gainExp(expNeed(AllySystem.state.actor.lv));render();};
 const wait=setInterval(()=>{if(window.ExperienceReview&&ApprovedHero.ready&&CaveTerrain.ready&&DungeonExperience.ready&&MonsterSprites.ready&&AllySystem.state.ready){clearInterval(wait);setup();}},100);
})();
