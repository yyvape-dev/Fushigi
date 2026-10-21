{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 const oldEnemyTurn=enemyTurn;let enemyTicks=0;enemyTurn=()=>enemyTicks++;
 function flat(){scene='dungeon';floorNo=1;dead=false;closeBag();closeStairs();newFloor();enemies=[];traps=[];floorItems=[];for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++)map[y][x]=FLOOR;player.x=player.vx=10;player.y=player.vy=10;player.face=[1,0];player.st=newStatus();player.hp=10;player.maxhp=20;inv=[];eqWeapon=eqShield=null;turn=0;}
 flat();let ticks=enemyTicks;playerAttack();assert(turn===1&&enemyTicks===ticks+1&&player.swing>0,'empty swing must advance enemies exactly once');
 flat();traps=[{x:11,y:10,kind:'gas',seen:false}];playerAttack();assert(traps[0].seen&&turn===1&&player.st.sleep===0,'swing must reveal without triggering trap');
 toTown(false);player.x=11;player.y=9;player.swing=0;let before=turn;playerAttack();assert(player.swing===0&&turn===before,'town must not attack or spend a turn');
 flat();map[10][11]=STAIRS;playerMove(1,0);assert(stairsOpen&&floorNo===1&&turn===1&&uiBlocked(),'stairs must prompt after one entry turn');
 playerMove(1,0);assert(player.x===11&&turn===1,'prompt must block movement');chooseStairs(false);assert(!stairsOpen&&floorNo===1&&turn===1,'stay must not descend or spend another turn');
 doCtx();assert(stairsOpen&&turn===1,'stairs can be reopened without moving');chooseStairs(true);assert(floorNo===2&&!stairsOpen&&scene==='dungeon'&&turn===1,'confirmation must descend exactly once without another turn');
 flat();floorNo=DUNGEONS[dungeonId].floors;map[10][11]=STAIRS;playerMove(1,0);const oldClears=clears;chooseStairs(true);assert(scene==='town'&&clears===oldClears+1&&!stairsOpen,'last-floor confirm must clear dungeon');
 flat();inv=[mkItem('potion'),mkItem('herb')];openBag();let first=bagSel;playerMove(1,0);assert(player.x===10&&turn===0,'bag selection must pause game turns');bagKey('ArrowDown');assert(bagSel!==first,'keyboard must select another row');bagKey('Enter');assert(bagActionMode&&turn===0,'first confirm chooses actions only');bagKey('Escape');assert(bagOpen&&!bagActionMode,'back from action must keep list open');bagKey('Escape');assert(!bagOpen,'back from list must close bag');
 openBag();bagKey('Enter');bagKey('Enter');assert(!bagOpen&&inv.length===1&&turn===1&&player.hp>10,'second confirm executes selected item and consumes one turn');
 enemyTurn=oldEnemyTurn;
 console.log('ALL OK: dungeon swings/enemy turn, trap search, town restriction, stairs stay/reopen/descend/clear, seamless bag keyboard/actions/turn blocking');
}
