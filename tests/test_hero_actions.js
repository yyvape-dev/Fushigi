{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 scene='dungeon';floorNo=2;newFloor();enemies=[];traps=[];
 const use=(type)=>{inv=[mkItem(type,3)];player.st=newStatus();player.hp=10;belly=50;useType(ikey(inv[0]));};
 use('bread');assert(player.action?.kind==='consume'&&player.action.prop==='food','food action');
 use('herb');assert(player.action?.kind==='consume'&&player.action.prop==='herb','herb action');
 use('hastescroll');assert(player.action?.kind==='scroll','scroll action');
 use('firestaff');assert(player.action?.kind==='staff','staff action');
 player.st.mute=5;inv=[mkItem('scroll')];player.action=null;useType('scroll');assert(!player.action&&inv.length===1,'blocked scroll animated');
 player.st=newStatus();const r=rooms[0];player.x=player.vx=r.cx;player.y=player.vy=r.cy;map[r.cy][r.cx+1]=FLOOR;enemies=[];traps=[];playerMove(1,0);assert(player.walkEnd>0&&player.walkStart>=0&&!player.action,'walk not started');
 playerAttack();assert(!player.walkEnd&&!player.action,'attack did not interrupt walk');
 newFloor();assert(!player.walkEnd&&!player.action,'floor transition kept action');
 console.log('ALL OK: food/herb/scroll/staff dispatch, failed use, walk start and interruption');
}
