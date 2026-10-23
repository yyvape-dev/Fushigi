// キーボードの移動：1歩目の速さ、押しっぱなしの連続移動（OSのリピートに依存しない）、離したら止まる、軽く叩くと1歩だけ
(async()=>{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const ev=(key,o={})=>({key,repeat:false,ctrlKey:false,altKey:false,shiftKey:false,preventDefault(){},...o});
 scene='dungeon';floorNo=2;newFloor();enemies=[];traps=[];belly=maxBelly();
 const setup=()=>{stopRun();player.st=newStatus();player.hp=player.maxhp;enemies=[];traps=[];floorItems.length=0;
  const r=rooms[0];player.x=player.vx=r.cx-Math.min(2,r.cx-r.x);player.y=player.vy=r.cy;
  for(let i=-6;i<=14;i++){const x=player.x+i;if(x>0&&x<MW-1)map[player.y][x]=FLOOR;}
  player.face=[1,0];return player.x;};
 // 1) 矢印キー：1歩目は30msより前に動く
 let x0=setup();controlsKey(ev('ArrowRight'));
 await wait(40);assert(player.x===x0+1,'first step within 40ms (x '+x0+'→'+player.x+')');
 // 2) 押しっぱなし：OSのリピート（33msごとの repeat イベント）を送っても歩数は増えない。150ms後から約110ms間隔で歩く
 for(let t=60;t<500;t+=33){await wait(33);controlsKey(ev('ArrowRight',{repeat:true}));}
 const steps=player.x-x0;
 assert(steps>=4&&steps<=6,'hold steps at ~500ms should be 4-6 (got '+steps+')');
 // 3) 離すと止まる
 controlsKeyUp(ev('ArrowRight'));const xr=player.x;await wait(350);
 assert(player.x===xr,'stops after key release');
 // 4) 軽く叩くと1歩だけ
 x0=setup();controlsKey(ev('ArrowRight'));controlsKeyUp(ev('ArrowRight'));await wait(400);
 assert(player.x===x0+1,'tap moves exactly one step (got '+(player.x-x0)+')');
 // 5) 文字キー（d）：すぐに1歩、OSのリピートは無視、離すと止まる
 x0=setup();controlsKey(ev('d'));assert(player.x===x0+1,'d moves immediately');
 for(let t=0;t<300;t+=33){await wait(33);controlsKey(ev('d',{repeat:true}));}
 const sd=player.x-x0;assert(sd>=3&&sd<=4,'d hold steps at ~300ms should be 3-4 (got '+sd+')');
 controlsKeyUp(ev('d'));const xd=player.x;await wait(300);assert(player.x===xd,'d stops after release');
 // 6) 向きだけ（Ctrl）は歩かない
 x0=setup();controlsKey(ev('ArrowRight',{ctrlKey:true}));await wait(300);assert(player.x===x0,'turn mode does not walk');controlsKeyUp(ev('ArrowRight'));
 // 7) 片方を離しても残りの方向で進む（斜め→縦）は壁の都合で省略。押している間に別キー（z）で止まる
 x0=setup();controlsKey(ev('ArrowRight'));await wait(200);controlsKey(ev('z'));const xz=player.x;await wait(300);assert(player.x===xz,'other key stops hold');
 console.log('ALL OK: key first step <40ms, hold repeat independent of OS repeat, release stops, tap=1 step, letter keys, turn mode, other key stops');
 setTimeout(()=>process.exit(0),50);
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
