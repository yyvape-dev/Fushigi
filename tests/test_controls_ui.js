{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 const savedEnemy=enemyTurn;enemyTurn=()=>{};
 function corridor(){closeGameMenu();closeBag();closeStairs();closeHist();closeCfg();scene='dungeon';dead=false;DungeonNPC.reset();MW=20;MH=15;map=Array.from({length:MH},()=>Array(MW).fill(WALL));for(let x=2;x<18;x++)map[7][x]=FLOOR;rooms=[];roomGrid=Array.from({length:MH},()=>Array(MW).fill(-1));seen=map.map(r=>r.map(()=>false));vis=map.map(r=>r.map(()=>false));player.x=player.vx=4;player.y=player.vy=7;player.hp=player.maxhp=20;player.st=newStatus();enemies=[];traps=[];floorItems=[];inv=[];floorShop=null;turn=0;updateVis();controlMode='walk';holdStop();dashBlocked=false;}
 corridor();faceOnly(-1,0);assert(player.x===4&&turn===0&&player.face[0]===-1,'turn only must not move/spend turn');
 controlsMove(1,0,'diagonal');assert(player.x===4&&turn===0,'diagonal lock ignores cardinal input');
 floorItems=[{x:5,y:7,item:mkItem('gold',80)}];const money=gold;controlsMove(1,0,'dash');assert(player.x===5&&turn===1&&floorItems.length===1&&gold===money&&!runActive,'dash stops on money without picking it up');
 corridor();floorItems=[{x:5,y:7,item:mkItem('arrow',5)}];controlsMove(1,0,'dash');assert(inv.length===0&&floorItems.length===1&&!runActive,'dash must not collect arrows');
 corridor();map[7][5]=STAIRS;controlsMove(1,0,'dash');assert(player.x===4&&turn===0&&!runActive,'dash stops before stairs');
 corridor();traps=[{x:5,y:7,kind:'mine',seen:true}];controlsMove(1,0,'dash');assert(player.x===4&&turn===0,'dash stops before seen trap');
 corridor();enemies=[{x:7,y:7,hp:5,st:newStatus()}];vis[7][7]=true;controlsMove(1,0,'dash');assert(player.x===4&&turn===0,'dash stops for visible enemy');
 corridor();map[6][5]=FLOOR;controlsMove(1,0,'dash');assert(player.x===5&&turn===1&&!runActive,'dash stops at a junction');controlsMove(1,0,'dash');assert(player.x===5,'held dash must not restart after safety stop');
 corridor();controlsMove(1,0,'dash');assert(runActive&&player.x===5,'safe corridor can run');openGameMenu();assert(menuOpen&&!runActive&&uiBlocked(),'menu cancels run and pauses turns');selectMenu(0);assert(bagOpen&&!menuOpen,'menu opens inventory');uiBack();assert(menuOpen&&!bagOpen&&turn===1,'back returns to menu without a turn');uiBack();assert(!menuOpen&&!uiBlocked(),'back returns to world');
 enemyTurn=savedEnemy;holdStop();console.log('ALL OK: facing, diagonal lock, dash pickup/safety/junction, cancellation, menu and back flow');
}
