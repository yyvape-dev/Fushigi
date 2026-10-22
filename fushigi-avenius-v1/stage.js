(()=>{
 const tools=document.createElement('div');tools.id='allyReviewTools';tools.innerHTML='<button id="avMeet">出会い</button><button id="avFlash">一閃・4マス</button><button id="avAgain">同じ敵には1回</button><button id="avWall">壁で届かない</button><button id="avSize">ラナと比較</button><button id="avLevel">Lvを上げる</button><a href="fushigi-avenius-v1/preview.html" style="color:#9cecf1">8方向・動作</a>';document.body.append(tools);
 function setup(mode='meet'){
  AllySystem.reset();ExperienceReview.setup('room');floorItems=[];traps=[];player.x=player.vx=12;player.y=player.vy=10;player.face=[-1,0];player.hp=player.maxhp=999;player.exp=0;
  const a=AllySystem.make(11,10,'avenius');AllySystem.state.actor=a;
  if(mode==='size'){a.following=true;AllySystem.state.used=true;player.face=[1,1];a.face=[1,1];}
  else if(mode!=='meet'){a.following=true;AllySystem.state.used=true;enemies=[{kind:'skeleton_2',x:7,y:10,vx:7,vy:10,hp:999,maxhp:999,aware:true,lost:0,st:{},flash:0}];if(mode==='wall')map[10][9]=WALL;}
  updateVis();render();
 }
 document.getElementById('avMeet').onclick=()=>setup('meet');document.getElementById('avFlash').onclick=()=>setup('flash');document.getElementById('avAgain').onclick=()=>{setup('flash');const a=AllySystem.state.actor,e=enemies[0];AllySystem.tick();e.st.sleep=99;render();};document.getElementById('avWall').onclick=()=>setup('wall');document.getElementById('avSize').onclick=()=>setup('size');document.getElementById('avLevel').onclick=()=>{if(!AllySystem.state.actor?.following)setup('size');AllySystem.gainExp(expNeed(AllySystem.state.actor.lv));render();};
 window.AveniusReview={setup};
 const wait=setInterval(()=>{if(window.ExperienceReview&&ApprovedHero.ready&&CaveTerrain.ready&&DungeonExperience.ready&&MonsterSprites.ready&&AllySystem.state.ready){clearInterval(wait);setup(new URLSearchParams(location.search).has('size')?'size':new URLSearchParams(location.search).has('flash')?'flash':'meet');if(new URLSearchParams(location.search).has('dialog'))AllySystem.talk();}},100);
})();
