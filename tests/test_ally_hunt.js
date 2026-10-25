// ユズナミキ：隣接も攻撃（2マス目まで）／見える敵へ向かって動く／ラナから離れすぎたら戻る。シェリ：壁の角をはさむ斜めも通る
{
 const verify=(v,m)=>{if(!v)throw Error(m);};const originalRender=render;render=()=>{};
 function setup(){AllySystem.reset();scene='dungeon';dead=false;bagOpen=whOpen=cfgOpen=histOpen=stairsOpen=menuOpen=false;DungeonNPC.reset();MW=26;MH=20;floorNo=3;turn=1;hasteFlip=false;map=Array.from({length:MH},(_,y)=>Array.from({length:MW},(_,x)=>!x||!y||x===MW-1||y===MH-1?WALL:FLOOR));rooms=[{x:1,y:1,w:24,h:18,cx:12,cy:10},{x:2,y:2,w:4,h:4,cx:4,cy:4}];roomGrid=map.map(row=>row.map(()=>0));seen=map.map(row=>row.map(()=>true));vis=map.map(row=>row.map(()=>true));player.x=player.vx=10;player.y=player.vy=10;player.hp=player.maxhp=200;player.lv=1;player.exp=0;player.face=[-1,0];player.st=newStatus();enemies=[];floorItems=[];traps=[];inv=[];eqWeapon=eqShield=null;eqRings=[null,null];atkUp=0;belly=80;const a=AllySystem.make(9,10,'yuzunamiki');a.following=true;AllySystem.state.actor=a;AllySystem.state.used=true;Math.random=()=>.5;return a;}
 function enemy(x,y,hp=1000){const e={kind:'skeleton',x,y,vx:x,vy:y,hp,maxhp:hp,aware:true,lost:0,st:{}};enemies.push(e);return e;}
 // 隣接・2マスの8方向はその場で攻撃
 for(const [dx,dy] of DIRS8){let a=setup(),n=enemy(a.x+dx,a.y+dy);AllySystem.tick();verify(n.hp<1000&&a.x===9&&a.y===10,'adjacent attacked in place '+dx+','+dy);
  a=setup();enemies=[];n=enemy(a.x+2*dx,a.y+2*dy);AllySystem.tick();verify(n.hp<1000,'two cells attacked '+dx+','+dy);}
 // 軸から外れた敵（桂馬の位置）へは、動いて攻撃位置につく
 let a=setup(),e=enemy(11,11);AllySystem.tick();verify((a.x!==9||a.y!==10)&&e.hp===1000,'moves toward off-axis foe first');
 AllySystem.tick();verify(e.hp<1000||Math.max(Math.abs(e.x-a.x),Math.abs(e.y-a.y))<=2,'then attacks or is in position');
 // ラナのすぐ隣にいても、見える敵（5マス先）へ向かって動く
 a=setup();player.x=9;player.y=11;e=enemy(14,12);const d0=Math.max(Math.abs(e.x-a.x),Math.abs(e.y-a.y));AllySystem.tick();verify(Math.max(Math.abs(e.x-a.x),Math.abs(e.y-a.y))<d0,'approaches visible foe');
 // 何度か繰り返すと攻撃できる位置まで進む
 for(let i=0;i<6&&e.hp===1000;i++)AllySystem.tick();verify(e.hp<1000,'eventually attacks the far foe');
 // 離れすぎ（ラナから7歩以上）なら敵を追わずラナへ戻る
 a=setup();player.x=20;player.y=10;a.x=a.vx=9;e=enemy(4,10);const dp0=distMap()[a.y][a.x];AllySystem.tick();verify(distMap()[a.y][a.x]<dp0,'too far from hero: returns instead of chasing');
 // 魔物部屋の眠っている敵は狙わない
 a=setup();e=enemy(14,10);e.mh=true;const px=a.x;AllySystem.tick();verify(a.x<=px,'does not hunt sleeping monster-room foes');
 // 敵がいなければ今までどおりラナについていく
 a=setup();player.x=15;player.y=10;AllySystem.tick();verify(a.x>9,'follows hero when no foes');
 // シェリ：壁の角をはさむ斜めも撃てる／行き先が壁なら止まる
 a=setup();a.kind='sherininya';e=enemy(8,9);map[9][9]=WALL;map[10][8]=WALL;AllySystem.tick();verify(e.hp<1000,'sheri hits diagonal past closed corners');
 a=setup();a.kind='sherininya';e=enemy(8,9);map[9][8]=WALL;AllySystem.tick();verify(e.hp===1000,'sheri blocked when the target cell is wall');
 // シェリ：直線から外れた敵へは、魔法の通る位置へ動いてから撃つ
 a=setup();a.kind='sherininya';e=enemy(11,11);AllySystem.tick();verify((a.x!==9||a.y!==10)&&e.hp===1000,'sheri moves to a firing line');
 for(let i=0;i<4&&e.hp===1000;i++)AllySystem.tick();verify(e.hp<1000,'sheri then fires');
 a=setup();a.kind='sherininya';player.x=20;player.y=10;a.x=a.vx=9;e=enemy(4,10);const sp0=distMap()[a.y][a.x];AllySystem.tick();verify(distMap()[a.y][a.x]<sp0,'sheri too far: returns');
 // アヴェニウス：離れた敵（一閃の届かない5マス先）へ近づいて斬る
 a=setup();a.kind='avenius';a.issenUsed=new Set();player.x=9;player.y=11;e=enemy(14,12);const av0=Math.max(Math.abs(e.x-a.x),Math.abs(e.y-a.y));AllySystem.tick();verify(Math.max(Math.abs(e.x-a.x),Math.abs(e.y-a.y))<av0,'avenius approaches visible foe');
 for(let i=0;i<8&&e.hp===1000;i++)AllySystem.tick();verify(e.hp<1000,'avenius eventually cuts');
 render=originalRender;console.log('ALL OK');
}
