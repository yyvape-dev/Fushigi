{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 assert(Object.keys(ENEMIES).filter(k=>!ENEMIES[k].security&&!ENEMIES[k].boss).length===84,'84 concrete enemy kinds');   // 店の番兵・番犬(security)は通常の敵に数えない
 const families=Object.keys(MonsterRoster.names);assert(families.length===21,'21 families');
 const seen=new Set();
 dungeonId='third';   // 30階のダンジョンは 階=段階
 for(let f=1;f<=30;f++)for(let n=0;n<2500;n++){const k=rollEnemy(f),t=ENEMIES[k];assert(t.from<=f&&t.to>=f,'spawn outside band '+k+' '+f);seen.add(k);}
 assert(seen.size===84,'some ranks never spawn: '+[...Object.keys(ENEMIES)].filter(k=>!ENEMIES[k].security&&!ENEMIES[k].boss&&!seen.has(k)));
 for(const family of families){let hp=0,atk=0,def=-1,exp=0;const colors=new Set();for(let tier=1;tier<=4;tier++){const kind=tier===1?family:family+'_'+tier,t=ENEMIES[kind];assert(t.family===family&&t.tier===tier,'family identity');assert(t.hp(12)>hp&&t.atk(12)[1]>atk&&t.def>def&&t.exp>exp,'non-increasing rank '+kind);hp=t.hp(12);atk=t.atk(12)[1];def=t.def;exp=t.exp;colors.add(t.col);assert(MonsterSprites.has(kind)===!MonsterRoster.noArt.has(family),'art lookup '+kind);if(tier===4)assert(t.from>=12,'top rank too early');}assert(colors.size===4,'duplicate color');}
 // Splitting must preserve the concrete upper-rank kind.
 dungeonId='first';scene='dungeon';floorNo=9;newFloor();enemies=[];traps=[];const r=rooms[0];player.x=r.cx;player.y=r.cy;
 const b={kind:'blob_3',x:r.x+1,y:r.y+1,vx:r.x+1,vy:r.y+1,hp:30,maxhp:30,gen:0,st:{}};enemies=[b];
 const random=Math.random;Math.random=()=>0;try{afterDamage(b);}finally{Math.random=random;}
 assert(enemies.length===2&&enemies[1].kind==='blob_3','split changed rank');
 // All aerial ranks retain floating weakness; ranged/status AI is inherited.
 assert(ENEMIES.bat_4.flying&&ENEMIES.venom_4.flying,'upper aerial flag');
 assert(ENEMIES.archer_4.ai==='archer'&&ENEMIES.archer_4.range>=6,'upper archer AI');
 assert(ENEMIES.dragon_4.ai==='breath'&&ENEMIES.dragon_4.breath(12)[0]>ENEMIES.dragon.breath(12)[0],'upper dragon breath');
 assert(ENEMIES.ghost_4.ai==='ghost'&&ENEMIES.thief_4.ai==='thief'&&ENEMIES.sleepy_4.spd==='still','special AI lost');
 console.log('ALL OK: 84 kinds, 21 four-rank families, floor gating, all spawnable, monotonic stats, split inheritance and special AI');
}
