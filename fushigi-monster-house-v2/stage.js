(function(){
 const button=document.createElement('button');button.id='monsterHouseReview';button.textContent='モンスターハウス再生（確認用）';button.style='position:fixed;top:94px;left:12px;z-index:8;background:#38151d;color:#dfb2b9;border:1px solid #7e3540;border-radius:6px;padding:9px';document.body.append(button);
 window.reviewMonsterHouse=function(){
  if(EventVfx.busy())return;
  closeBag();closeStairs();closeGameMenu();closeCfg();closeHist();EventVfx.reset();AllySystem.reset();
  if(scene!=='dungeon')enterDungeon();floorNo=2;turn=0;newFloor();enemies=[];traps=[];floorItems=[];rooms.forEach(r=>{r.mh=false;r.mhDone=false;});
  const r=rooms.find(r=>r.role!=='shop'&&map[r.cy]?.[r.cx]===FLOOR)||rooms[0];
  player.x=player.vx=r.cx;player.y=player.vy=r.cy;player.hp=player.maxhp=999;player.lv=1;player.exp=0;player.st=newStatus();belly=100;fadeT=0;fx.length=0;logs=[];logTurn=-1;hurtT=0;player.face=[0,1];
  inv=[mkItem('sword',0),mkItem('ironshield',0)];eqWeapon=inv[0];eqShield=inv[1];r.mh=true;
  for(const [dx,dy] of [[2,0],[-2,0],[0,2],[1,-1],[-1,-1]])if(map[r.cy+dy]?.[r.cx+dx]===FLOOR){const e=spawnEnemy(r.cx+dx,r.cy+dy,false);e.mh=true;}
  checkHouse();endTurn();updateVis();render();
 };
 button.onclick=reviewMonsterHouse;
})();
