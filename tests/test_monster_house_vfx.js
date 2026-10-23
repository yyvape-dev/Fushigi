{
 const assert=(v,m)=>{if(!v)throw Error(m);};let time=performance.now();
 EventVfx.state.force=true;EventVfx.state.clock=()=>time;
 scene='dungeon';floorNo=2;dead=false;newFloor();enemies=[];traps=[];floorItems=[];closeBag();closeGameMenu();
 player.x=player.vx=rooms[0].cx;player.y=player.vy=rooms[0].cy;player.st=newStatus();rooms[0].mh=true;rooms[0].mhDone=false;
 let ticks=0;const old=enemyTurn;enemyTurn=()=>ticks++;const before=turn;
 checkHouse();endTurn();assert(EventVfx.busy()&&turn===before&&ticks===0,'house must hold enemy turn');
 checkHouse();assert(EventVfx.state.events.filter(e=>e.kind==='house').length===1,'house announces once');
 assert(EventVfx.state.events[0].screenOnly,'house must not draw a floor ring');
 time+=2000;EventVfx.update(time);assert(turn===before&&ticks===0,'hold while art is visible');
 time+=250;EventVfx.update(time);assert(!EventVfx.busy()&&turn===before+1&&ticks===1,'release exactly one enemy turn');
 rooms[0].mhDone=false;checkHouse();endTurn();RunSave.save();assert(!EventVfx.busy()&&turn===before+2,'save settles pending response without replay');
 EventVfx.state.force=false;delete EventVfx.state.clock;EventVfx.reset();enemyTurn=old;
 console.log('ALL OK: generated house timing, one announcement, screen-only art and save completion');
}
