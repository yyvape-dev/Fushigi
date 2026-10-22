(function(){
 const kinds={level:'レベルUP',weapon:'天の恵み',shield:'地の恵み',pit:'落とし穴',mine:'地雷',gas:'睡眠ガス',hungry:'空腹',warp:'ワープ',summon:'魔物の罠'};
 const tools=document.createElement('div');tools.id='eventReview';tools.style='position:fixed;top:95px;left:8px;right:8px;z-index:8;display:flex;flex-wrap:wrap;gap:4px';
 tools.innerHTML=Object.entries(kinds).map(([key,name])=>'<button data-event="'+key+'" style="background:#241d18e8;color:#ecd7b5;border:1px solid #8c7050;border-radius:5px;padding:7px;font-size:12px">'+name+'</button>').join('');document.body.append(tools);
 window.reviewEvent=function(kind){
  if(EventVfx.busy())return;
  closeBag();closeStairs();closeGameMenu();closeCfg();closeHist();EventVfx.reset();
  if(scene!=='dungeon')enterDungeon();floorNo=2;newFloor();enemies=[];traps=[];floorItems=[];rooms.forEach(r=>{r.mh=false;r.mhDone=false;});
  const r=rooms[0];player.x=player.vx=r.cx;player.y=player.vy=r.cy;player.hp=player.maxhp=999;player.st=newStatus();belly=100;fadeT=0;fx.length=0;logs=[];logTurn=-1;hurtT=0;
  inv=[mkItem('sword',0),mkItem('ironshield',0)];eqWeapon=inv[0];eqShield=inv[1];player.face=[0,1];
  window.reviewBefore={turn,floorNo,x:player.x,y:player.y,hp:player.hp};
  if(kind==='level'){player.lv=1;player.exp=0;gainExp(expNeed(1));endTurn();}
  else if(kind==='weapon'||kind==='shield'){const type=kind==='weapon'?'scroll':'shieldscroll';inv.push(mkItem(type));useType(type);}
  else{
   const [dx,dy]=DIRS8.find(([x,y])=>geomOK(player.x,player.y,x,y));
   traps=[{x:player.x+dx,y:player.y+dy,kind,seen:false}];playerMove(dx,dy);
  }
  updateVis();render();
 };
 tools.onclick=ev=>{const b=ev.target.closest('[data-event]');if(b)reviewEvent(b.dataset.event);};
})();
