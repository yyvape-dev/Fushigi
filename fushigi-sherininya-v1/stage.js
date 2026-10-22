(()=>{
 const tools=document.createElement('div');tools.id='allyReviewTools';tools.innerHTML='<button id="shMeet">出会い</button><button id="shPierce">2体を貫通</button><button id="shFriend">味方越し</button><button id="shWall">壁で止まる</button><button id="shCast">魔法を撃つ</button><button id="shSize">ラナと比較</button><button id="shLevel">Lvを上げる</button><a href="fushigi-sherininya-v1/preview.html" style="color:#dfb8ed">8方向・動作</a>';document.body.append(tools);
 function setup(mode='meet'){
  AllySystem.reset();ExperienceReview.setup('room');floorItems=[];traps=[];player.x=player.vx=12;player.y=player.vy=10;player.face=[-1,0];player.hp=player.maxhp=999;player.exp=0;
  const a=AllySystem.make(11,10,'sherininya');AllySystem.state.actor=a;
  if(mode==='size'){a.following=true;AllySystem.state.used=true;player.face=[1,1];a.face=[1,1];}
  else if(mode!=='meet'){a.following=true;AllySystem.state.used=true;enemies=[10,9].map(x=>({kind:'skeleton_2',x,y:10,vx:x,vy:10,hp:999,maxhp:999,aware:true,lost:0,st:{},flash:0}));if(mode==='friend'){enemies.shift();player.x=player.vx=10;}if(mode==='wall'){map[10][10]=WALL;enemies.shift();}}
  updateVis();render();
 }
 document.getElementById('shMeet').onclick=()=>setup('meet');document.getElementById('shPierce').onclick=()=>setup('pierce');document.getElementById('shFriend').onclick=()=>setup('friend');document.getElementById('shWall').onclick=()=>setup('wall');document.getElementById('shCast').onclick=()=>{if(!AllySystem.state.actor?.following)setup('pierce');AllySystem.tick();updateVis();render();};document.getElementById('shSize').onclick=()=>setup('size');document.getElementById('shLevel').onclick=()=>{if(!AllySystem.state.actor?.following)setup('size');AllySystem.gainExp(expNeed(AllySystem.state.actor.lv));render();};
 window.SherininyaReview={setup};
 const wait=setInterval(()=>{if(window.ExperienceReview&&ApprovedHero.ready&&CaveTerrain.ready&&DungeonExperience.ready&&MonsterSprites.ready&&AllySystem.state.ready){clearInterval(wait);setup(new URLSearchParams(location.search).has('size')?'size':new URLSearchParams(location.search).has('flash')?'pierce':'meet');if(new URLSearchParams(location.search).has('dialog'))AllySystem.talk();}},100);
})();
