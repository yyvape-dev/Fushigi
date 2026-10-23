// Cannon physics and kill attribution. A blast resolves as one world action:
// snapshot its power/targets, damage everyone, then remove casualties/evolve.
(function(root){
 const distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const isCannon=T=>T.family==='cannon';
 function evolve(e){
  if(!e||e.hp<=0||!enemies.includes(e)||ShopSecurity.isSecurity(e))return false;
  const r=MonsterRoster.resolve(e.kind);if(!r||r.tier>=4||!MonsterRoster.names[r.family])return false;
  const next=r.family+'_'+(r.tier+1),T=ENEMIES[next];if(!T)return false;
  const old=eT(e).name;e.kind=next;e.maxhp=T.hp(floorNo);e.hp=e.maxhp;
  EnemyVfx.emit('evolve',e,e,{duration:750});
  // A multi-kill logs every rank, but stacks only the final name over the actor.
  for(let i=fx.length-1;i>=0;i--)if(fx[i].evolution&&fx[i].x===e.x&&fx[i].y===e.y&&now()-fx[i].t0<100)fx.splice(i,1);
  fxText(e.x,e.y,T.name,'#ffcb78');fx[fx.length-1].evolution=true;say(`${old}は${T.name}に進化した！`);
  return true;
 }
 function trace(e,dx,dy,range){
  let x=e.x,y=e.y;
  for(let n=1;n<=range;n++){
   const nx=x+dx,ny=y+dy;if(!inb(nx,ny))return{x,y,dx,dy,distance:n-1};
   if(dx&&dy){for(const [wx,wy]of [[x+dx,y],[x,y+dy]])if(solid(map[wy][wx]))return{x:wx,y:wy,dx,dy,distance:n};}
   x=nx;y=ny;
   const actor=enemyAt(x,y)||AllySystem.at(x,y)||ShopSystem.at(x,y)||(player.x===x&&player.y===y?player:null);
   if(solid(map[y][x])||actor)return{x,y,dx,dy,distance:n};
  }
  return{x,y,dx,dy,distance:range};
 }
 function plan(e,target){
  const T=eT(e);if(!isCannon(T)||distance(e,target)<=1||distance(e,target)>(T.range||8)+1)return null;
  let best=null;for(const [dx,dy]of DIRS8){const hit=trace(e,dx,dy,T.range||8),d=distance(hit,target);if(d>1)continue;const score=d*100+hit.distance;if(!best||score<best.score)best={...hit,score};}return best;
 }
 function fire(e,target,impact=plan(e,target)){
  if(!impact||e.hp<=0||!enemies.includes(e))return{dead:false,hit:false,dmg:0};
  const T=eT(e),damage=(T.blastDamage||[20,30,40,50])[(T.tier||1)-1],center={x:impact.x,y:impact.y};
  e.monsterFace=[impact.dx,impact.dy];e.monsterAttackFace=e.monsterFace.slice();e.monsterAttackStart=now();e.fl=impact.dx<0;
  // Set reload before any evolution, and retain it when the kind changes.
  e.st=e.st||{};e.st.cool=T.cool||2;
  EnemyVfx.emit('cannon',e,center,{hit:true,radius:1,duration:750});vfxShake(5,250);
  const victims=enemies.filter(o=>o.hp>0&&distance(o,center)<=1),ally=AllySystem.state.actor,hitAlly=ally&&ally.hp>0&&distance(ally,center)<=1;
  const keepers=ShopSystem.keepers().filter(k=>k.hp>0&&distance(k,center)<=1),hitPlayer=distance(player,center)<=1;
  const walls=[];for(let y=center.y-1;y<=center.y+1;y++)for(let x=center.x-1;x<=center.x+1;x++)if(x>0&&y>0&&x<MW-1&&y<MH-1&&map[y][x]===WALL){map[y][x]=FLOOR;roomGrid[y][x]=-1;walls.push([x,y]);}
  if(walls.length){CaveTerrain.cache.clear();EnemyVfx.emit('rubble',center,center,{duration:700});}updateVis();
  // Do not allow a kill-triggered heal or stronger rank to alter this blast.
  for(const victim of victims){if(victim.mim)EnemyVfx.emit('reveal',victim);victim.mim=false;victim.aware=true;victim.hp-=damage;victim.flash=now()+130;fxText(victim.x,victim.y,'-'+damage,'#ffbc7c');}
  let allyKilled=false;if(hitAlly)allyKilled=AllySystem.hurt(damage);
  let keeperKills=0;for(const keeper of keepers){keeper.hp-=damage;keeper.flash=now()+130;fxText(keeper.x,keeper.y,'-'+damage,'#ffbc7c');if(keeper.hp<=0){keeperKills++;say('砲撃で店主が倒れた。');}}
  say(`${T.name}の砲撃が爆発した！ 周囲1マスに${damage}ダメージ。`);
  for(const victim of victims)if(victim.hp<=0)killEnemy(victim,false,e);
  if(allyKilled)evolve(e);for(let i=0;i<keeperKills;i++)evolve(e);
  // Fatal-player persistence happens only after the whole blast is committed.
  const actual=hitPlayer&&player.st.invinc<=0?damage:0;
  const dead=hitPlayer?hurtPlayer(damage,`砲撃で力尽きた…（${floorNo}階）`):false;
  return{dead,hit:hitPlayer,dmg:actual,impact:center,damage,walls};
 }
 root.MonsterCombat={isCannon,evolve,trace,plan,fire};
})(typeof window==='undefined'?globalThis:window);
