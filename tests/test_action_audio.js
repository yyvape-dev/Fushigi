// Verify sounds follow successful game actions, not messages or failed commands.
{
 const sounds=[];globalThis.GameAudio={effect:k=>sounds.push(k),sync(){}};
 const assert=(v,m)=>{if(!v)throw Error(m);};
 scene='dungeon';floorNo=1;newFloor();enemies=[];traps=[];inv=[];floorItems=[];
 sounds.length=0;const f={x:player.x,y:player.y,item:mkItem('potion')};floorItems.push(f);
 assert(takeFloor(f)&&sounds.join()==='pickup','successful pickup');
 inv=Array.from({length:MAXBAG},()=>mkItem('weed'));sounds.length=0;
 assert(!takeFloor({item:mkItem('potion')})&&!sounds.length,'full bag silent');
 player.st.invinc=3;hurtPlayer(2,'test');assert(!sounds.length,'invincible damage silent');
 player.st.invinc=0;player.hp=100;hurtPlayer(2,'test');assert(sounds.join()==='hurt','actual damage');
 sounds.length=0;const pot=mkItem('savepot',3);breakPot(pot,player.x,player.y);
 assert(sounds.join()==='potbreak','pot breaks once');
 for(const kind of ['gas','hungry','warp','summon','mine']){
  sounds.length=0;player.hp=100;triggerTrap({kind,x:player.x,y:player.y});
  assert(sounds[0]==='trap-'+kind,'trap result '+kind);
 }
 toTown(false);CastleTown.leaveInn();const smith=CastleTown.facilities.find(f=>f.id==='smith');
 player.x=smith.x;player.y=smith.y;const sword=mkItem('sword',0);inv=[sword];gold=1000;CastleTown.show('smith');
 sounds.length=0;assert(CastleTown.strengthen(sword.id)&&sounds.join()==='forge','forge success');
 sounds.length=0;gold=0;assert(!CastleTown.strengthen(sword.id)&&!sounds.length,'failed forge silent');
 console.log('ALL OK: action audio follows pickup, damage, pot, traps and forge results');
}
