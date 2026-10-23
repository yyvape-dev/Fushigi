{
 let count=0;const ok=(v,m)=>{if(!v)throw Error(m);count++;};const force=EventVfx.state.force,random=Math.random;
 function setup(kind){EventVfx.reset();localStorage.removeItem(SAVE_KEY);RunSave.clear();boot();scene='dungeon';dungeonId='third';floorNo=24;newFloor();enemies=[];floorItems=[];traps=[];floorShop=null;AllySystem.state.actor=null;
  for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++){map[y][x]=FLOOR;roomGrid[y][x]=0;}
  player.x=player.vx=10;player.y=player.vy=10;player.hp=player.maxhp=999;player.lv=8;player.st=newStatus();inv=[];eqWeapon=eqShield=null;eqRings=[null,null];dead=false;turn=0;updateVis();return spawnEnemy(14,10,true,kind);
 }
 try{
  for(const [kind,type]of [['ninja','shuriken'],['caster','magic'],['cannon','cannon'],['lord','abyss']])for(const miss of [false,true]){
   const outcomes=[];
   for(const enabled of [false,true]){const e=setup(kind),T=eT(e);EventVfx.state.force=enabled;let calls=0;Math.random=()=>{calls++;return miss?.999:.25;};
    const result=enemyStrike(e,T,T.atk(24),T.boss?'炎':T.verb||'手裏剣');outcomes.push(JSON.stringify({result,hp:player.hp,turn,calls,enemyHP:e.hp,enemy:[e.x,e.y]}));
    if(enabled){const event=EventVfx.state.events.find(e=>e.kind==='enemy-'+type);ok(event&&event.hit===!miss,'projectile/hit flag '+kind);ok(event.from.x===14&&event.to.x===10,'fixed projectile endpoints '+kind);player.x=11;ok(event.to.x===10,'target movement cannot redirect an old projectile');ok(!EventVfx.busy(),'enemy visual adds no lock');}
   }ok(outcomes[0]===outcomes[1],'VFX changes no RNG, damage, enemy health or turns: '+kind+miss);
  }
  Math.random=()=>0;EventVfx.state.force=true;
  {const e=setup('mimic');e.mim=true;e.disg='herb';e.x=e.vx=11;enemyTurn();ok(!e.mim&&EventVfx.state.events.some(e=>e.kind==='enemy-reveal'),'mimic reveals with smoke');}
  {const e=setup('mimic');e.mim=true;e.disg='herb';zapHit(e,1,'確認');ok(EventVfx.state.events.filter(e=>e.kind==='enemy-reveal').length===1,'hitting disguise reveals once');zapHit(e,1,'確認');ok(EventVfx.state.events.filter(e=>e.kind==='enemy-reveal').length===1,'revealed mimic cannot repeat reveal smoke');}
  {const e=setup('summoner');summonAround(e,eT(e));ok(EventVfx.state.events.some(e=>e.kind==='enemy-bell'),'bell wave on actual summon');ok(EventVfx.state.events.filter(e=>e.kind==='enemy-arrival').length===enemies.filter(e=>e.sum).length,'arrival effect for each summoned monster');}
  {const e=setup('charged');afterDamage(e);ok(EventVfx.state.events.some(e=>e.kind==='enemy-lightning'),'actual retaliation emits lightning');}
  {setup('caster_2');eqRings=[mkItem('ring_noconf'),null];castFx(ENEMIES.caster_2);ok(!player.st.confuse&&EventVfx.state.events.some(e=>e.kind==='enemy-curse'&&e.blocked),'protected confusion gets no false applied-status cue');}
  {setup('caster_4');castFx(ENEMIES.caster_4);ok(player.lv===7&&EventVfx.state.events.some(e=>e.status==='drain'&&!e.blocked),'level drain cue only after actual level loss');}
  {setup('caster_4');player.lv=1;castFx(ENEMIES.caster_4);ok(!EventVfx.state.events.some(e=>e.status==='drain'),'no level drain cue at minimum level');}
  {setup('caster');castFx(ENEMIES.caster);ok(EventVfx.state.events.some(e=>e.kind==='enemy-vanish')&&EventVfx.state.events.some(e=>e.kind==='enemy-arrival'),'warp records departure and arrival');}
  {const e=setup('cannon');player.x=player.vx=20;const a=AllySystem.make(10,10);a.following=true;AllySystem.state.actor=a;const hp=a.hp;AllySystem.enemyAction(e,eT(e));const event=EventVfx.state.events.find(e=>e.kind==='enemy-cannon');ok(a.hp<hp&&event&&event.to.x===a.x&&event.to.x!==player.x,'enemy projectile targets the actual ally, not the hero');}
  {const e=setup('ninja');EnemyVfx.attack(e,eT(e),player,true,true);const before=[player.hp,player.x,player.y,turn].join();EventVfx.flush();ok(EventVfx.state.events.length===0&&!EventVfx.busy(),'save flush drops visuals');ok(before===[player.hp,player.x,player.y,turn].join(),'visual flush applies no game rules');}
 }finally{Math.random=random;EventVfx.reset();EventVfx.state.force=force;}
 console.log('ALL OK: '+count+' enemy VFX checks: hit/miss, fixed endpoints, RNG/turn parity, reveal, summon, retaliation, protection, drain, warp and save flush');
}
