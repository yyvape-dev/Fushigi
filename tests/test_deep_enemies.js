// 深層の敵・階ごとの出現表・30階のダンジョンと主。tests/harness.js 経由で実行
{
 let passed=0;const ok=(v,m)=>{if(!v)throw Error('NG '+m);passed++;};
 const fam=k=>ENEMIES[k].family||k;
 const setup=(floor,dungeon='third',keep=false)=>{localStorage.removeItem(SAVE_KEY);RunSave.clear();boot();inv=[];dungeonId=dungeon;scene='dungeon';floorNo=floor;newFloor();if(!keep){enemies=[];floorItems=[];traps=[];}const r=rooms[0];player.x=r.cx;player.y=r.cy;player.hp=player.maxhp=200;player.lv=10;player.st=newStatus();dead=false;snapVis();return r;};
 const put=(kind,x,y,aware=true)=>{const e=spawnEnemy(x,y,aware,kind);e.vx=x;e.vy=y;return e;};

 // --- 1. 出現表：1階は3種、序盤は4〜7種、深層は9〜13種。強いランクは早く出ない
 const T=EnemyTable;
 ok(T.kinds(1).length===3,'stage 1 has 3 kinds');
 ok(T.kinds(5).length>=4&&T.kinds(5).length<=8,'early stages have 4-8 kinds');
 for(let s=10;s<=30;s++)ok(T.kinds(s).length>=9&&T.kinds(s).length<=14,'deep stage '+s+' has 9-14 kinds, got '+T.kinds(s).length);
 ok(T.kinds(5).every(k=>ENEMIES[k].tier<=2),'no rank 3-4 before stage 8');
 ok(!T.kinds(10).some(k=>['caster','ninja','mimic','summoner','charged','cannon'].includes(fam(k))),'deep families wait for the deep stages');
 ok(['ninja','caster'].every(f=>T.kinds(14).some(k=>fam(k)===f))&&T.kinds(16).some(k=>fam(k)==='summoner')&&T.kinds(18).some(k=>fam(k)==='charged')&&T.kinds(20).some(k=>fam(k)==='cannon'),'each deep family debuts on its stage');
 ok(T.kinds(30).every(k=>ENEMIES[k].tier>=3),'the deepest stage holds only rank 3-4 kinds');
 ok(T.kinds(30).length<=10&&T.kinds(30).filter(k=>ENEMIES[k].tier===4).length>=8,'deepest stage is mostly rank-4');

 // --- 2. ダンジョンごとの段階：はじまり=1倍／ふかい=1.25倍／そこなし=1倍
 dungeonId='first';ok(floorKinds(5).join()===T.kinds(5).join(),'first dungeon maps floor to stage 1:1');
 dungeonId='second';ok(floorKinds(12).join()===T.kinds(15).join(),'second dungeon floor 12 -> stage 15');
 dungeonId='third';ok(floorKinds(30).join()===T.kinds(30).join(),'third dungeon floor 30 -> stage 30');
 ok(DUNGEONS.third.floors===30&&DUNGEONS.third.boss&&DUNGEONS.third.req==='second','third dungeon definition');

 // --- 3. 解放：ふかい洞窟を踏破すると行ける
 dClears={};clears=1;ok(unlocked('second')&&!unlocked('third'),'third dungeon is locked until second is cleared');
 dClears={second:1};ok(unlocked('third'),'cleared second -> third unlocked');
 { setup(1,'second');dClears={};clears=0;dungeonId='second';scene='dungeon';floorNo=12;const was=dungeonId;clearDungeon();ok(dClears.second===1&&scene==='town'&&was==='second','clearDungeon counts per dungeon'); }
 { localStorage.removeItem(SAVE_KEY);boot();dClears={first:2,second:1};clears=3;saveGame();dClears={};clears=0;ok(loadGame()&&dClears.second===1&&dClears.first===2&&clears===3,'dClears survive save/load');
   localStorage.setItem(SAVE_KEY,JSON.stringify({v:1,wh:[],bag:[],clears:2,deaths:0,gold:0,bank:0,shop:[],dungeonId:'first'}));dClears={};ok(loadGame()&&dClears.first===2,'old save without dClears keeps its clear count'); }

 // --- 4. ニンジャ：素早く、離れた直線から手裏剣
 { const r=setup(20);const e=put('ninja_3',player.x+3,player.y);for(const [x,y] of [[1,0],[2,0],[3,0]])map[player.y][player.x+x]=FLOOR;
   const hp=player.hp;enemyTurn();ok(player.hp<hp,'ninja throws shuriken from 3 tiles');void r;void e;
   ok(ENEMIES.ninja.spd==='fast'&&ENEMIES.ninja_4.range>ENEMIES.ninja.range,'ninja is fast, upper ranks reach farther'); }

 // --- 5. まじゅつ師：魔弾の効果がランクで変わる
 { setup(22);for(let i=0;i<8;i++)map[player.y][player.x+i]=FLOOR;
   const fx={};for(const k of ['caster','caster_2','caster_3','caster_4'])fx[k]=ENEMIES[k].fx;
   ok(fx.caster==='warp'&&fx.caster_2==='confuse'&&fx.caster_3==='mute'&&fx.caster_4==='drain','caster effect by rank');
   const mr=Math.random;Math.random=()=>0;       // 必ず当たる
   try{
    let e=put('caster_2',player.x+4,player.y);enemyTurn();ok(player.st.confuse>0,'rank 2 caster confuses');enemies=[];player.st=newStatus();
    e=put('caster_3',player.x+4,player.y);enemyTurn();ok(player.st.mute>0,'rank 3 caster seals herbs/scrolls');enemies=[];player.st=newStatus();
    player.lv=7;player.maxhp=60;player.hp=60;e=put('caster_4',player.x+4,player.y);enemyTurn();ok(player.lv===6&&player.maxhp===56,'rank 4 caster drains one level and 4 max HP');enemies=[];
    Math.random=()=>0.999;const px=player.x,py=player.y;castFx(ENEMIES.caster);ok(player.x!==px||player.y!==py,'rank 1 caster warps the player elsewhere');
   }finally{Math.random=mr;} }

 // --- 6. ミミック：アイテムに化けて、隣に来ると正体を現す。殴られても現す
 { setup(24);const e=put('mimic_3',player.x+4,player.y,false);ok(e.mim&&e.disg&&ITEMS[e.disg],'mimic starts disguised as an item');
   enemyTurn();ok(e.mim,'a far disguised mimic does not move');
   map[player.y][player.x+1]=FLOOR;e.x=e.vx=player.x+1;e.y=e.vy=player.y;enemyTurn();ok(!e.mim&&e.aware,'mimic reveals itself when you stand next to it');
   const m2=put('mimic',player.x+4,player.y,false);m2.x=m2.vx=player.x;m2.y=m2.vy=player.y+1;map[player.y+1][player.x]=FLOOR;player.face=[0,1];const Mr=Math.random;Math.random=()=>0;try{strikeOne(m2,false);}finally{Math.random=Mr;}ok(!m2.mim,'hitting a disguised mimic reveals it');
   ok(!spawnEnemy(player.x,player.y+3,true,'mimic').mim,'a summoned or trap-spawned mimic is not disguised');
   const draw1=()=>{let t=null;try{enemies=[put('mimic_2',player.x+1,player.y,false)];draw();}catch(x){t=x;}return !t;};ok(draw1(),'a disguised mimic draws as an item without error'); }

 // --- 7. すず坊主：鈴で仲間を呼ぶ（ランクで数が増える・呼ばれた敵は経験値半分・呼ぶ敵は呼ばれない）
 { setup(26);for(let i=0;i<8;i++)map[player.y][player.x+i]=FLOOR;
   ok([1,2,3,4].every((n,i)=>ENEMIES[['summoner','summoner_2','summoner_3','summoner_4'][i]].summon===[1,2,2,3][i]),'bell summons 1/2/2/3 by rank');
   const s=put('summoner_4',player.x+4,player.y);enemyTurn();ok(enemies.length>=3&&enemies.some(e=>e.sum),'a bell call brings allies: '+enemies.length);
   ok(Number.isFinite(s.monsterAttackStart)&&s.monsterAttackFace[0]===-1&&s.monsterAttackFace[1]===0,'the summoning bell plays its directional attack animation');
   ok(enemies.filter(e=>e.sum).every(e=>!ENEMIES[e.kind].summon&&!ENEMIES[e.kind].disguise),'called monsters are never bell-ringers or mimics');
   const n=enemies.length;enemyTurn();ok(enemies.length===n,'bell has a cooldown');
   for(let i=0;i<300;i++)ok(!ENEMIES[rollEnemy(28,true)].summon,'rollEnemy(summoned) excludes summoners');
   const c=enemies.find(e=>e.sum);void s;c.hp=1;player.exp=0;player.lv=20;const Mr=Math.random;Math.random=()=>0;try{strikeOne(c,false);}finally{Math.random=Mr;}ok(player.exp===Math.max(1,Math.floor(ENEMIES[c.kind].exp/2)),'called monsters give half exp'); }

 // --- 8. いかずち岩：殴ると同じ部屋に雷。違う部屋なら来ない
 { setup(28);const e=put('charged_3',player.x+1,player.y);map[player.y][player.x+1]=FLOOR;e.hp=e.maxhp=500;
   const same=roomGrid[e.y][e.x]===roomGrid[player.y][player.x];const hp=player.hp;
   const Mr=Math.random;Math.random=()=>0;try{strikeOne(e,false);}finally{Math.random=Mr;}
   ok(same?player.hp<hp:player.hp===hp,'charged rock zaps the player in the same room when struck');
   if(same)ok(Number.isFinite(e.monsterAttackStart)&&e.monsterAttackFace.length===2,'the rock retaliation plays its directional attack animation');
   ok(ENEMIES.charged.def>=6&&ENEMIES.charged.zap(20)[1]>0,'charged rock is tough and has a zap'); }

 // --- 9. おおづつ兵：動かず遠くから、2ターンに1発
 { setup(25);for(let i=0;i<10;i++)map[player.y][player.x+i]=FLOOR;
   const e=put('cannon_2',player.x+7,player.y);const Mr=Math.random;Math.random=()=>0;
   try{ const hp0=player.hp;enemyTurn();const h1=player.hp;ok(h1<hp0,'cannon fires from 7 tiles');enemyTurn();ok(player.hp===h1,'cannon reloads for a turn');enemyTurn();ok(player.hp<h1,'cannon fires again');ok(e.x===player.x+7,'cannon never moves'); }finally{Math.random=Mr;} }

 // --- 10. 主：30階にだけ1体。倒すまで階段が使えない。倒すと良い品を落とす
 { setup(29,'third',true);ok(!enemies.some(e=>ENEMIES[e.kind].boss),'no boss on floor 29');
   setup(30,'third',true);const boss=enemies.find(e=>ENEMIES[e.kind].boss);ok(boss&&boss.kind==='lord'&&boss.hp===320,'boss on floor 30');
   ok(enemies.filter(e=>roomGrid[e.y][e.x]===roomGrid[boss.y][boss.x]).length>=2,'the boss comes with escorts in its room');
   const stairs=(()=>{for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)if(map[y][x]===STAIRS)return [x,y];})();
   ok(roomGrid[boss.y][boss.x]===roomGrid[stairs[1]][stairs[0]],'the boss guards the stairs room');
   player.x=stairs[0];player.y=stairs[1];stairsOpen=true;const s0=scene;chooseStairs(true);ok(scene===s0&&scene==='dungeon'&&dungeonId==='third','stairs are sealed while the boss lives');
   const gold0=floorItems.length;killEnemy(boss);ok(!bossAlive()&&floorItems.length>=gold0+4,'killing the boss drops loot');
   stairsOpen=true;player.x=stairs[0];player.y=stairs[1];dClears={second:1};chooseStairs(true);ok(scene==='town'&&dClears.third===1,'stairs clear the dungeon after the boss falls');
   ok(MonsterSprites.has('lord')&&MonsterRoster.resolve('lord').family==='lord'&&MonsterRoster.resolve('lord').tier===1,'the boss uses its dedicated untinted art');
   setup(5,'first',true);ok(!enemies.some(e=>ENEMIES[e.kind].boss),'no boss in other dungeons'); }

 // --- 11. 専用絵の新敵も描ける。ほかの階・冒険の保存に影響しない
 { setup(26);enemies=['ninja_4','caster_4','mimic_4','summoner_4','charged_4','cannon_4','lord'].map((k,i)=>put(k,player.x+1+(i%3),player.y+1+Math.floor(i/3)));
   let err=null;try{for(let i=0;i<3;i++)endTurn();draw();RunSave.save();}catch(e){err=e;}ok(!err,'new enemies draw, act and save without errors: '+(err&&err.stack)); }

 console.log('ALL OK: '+passed+' deep-enemy checks: appearance table sizes/debuts, per-dungeon stage mapping, unlocks and save, ninja/caster/mimic/summoner/charged rock/cannon behaviors, 30F boss and sealed stairs');
}
