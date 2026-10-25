"""Build an isolated review game from the production entry point."""
from pathlib import Path
R=Path(__file__).parent
html=(R.parent/'index.html').read_text()
prelude='''<base href="../"><script>
const potReviewNativeStorage=window.localStorage;
Object.defineProperty(window,'localStorage',{value:{getItem:k=>potReviewNativeStorage.getItem('pots_review:'+k),setItem:(k,v)=>potReviewNativeStorage.setItem('pots_review:'+k,v),removeItem:k=>potReviewNativeStorage.removeItem('pots_review:'+k)}});
</script>'''
html=html.replace('<head>','<head>'+prelude,1)
script='''<script>
const potReviewTimer=setInterval(()=>{
 if(!ApprovedHero.ready||!HeroActions.ready)return;clearInterval(potReviewTimer);
 RunSave.clear();closeBag();closeGameMenu();dungeonId='first';enterDungeon();enemies=[];traps=[];floorItems=[];eqWeapon=eqShield=null;eqRings=[null,null];player.st=newStatus();player.hp=10;gold=5000;
 const args=new URLSearchParams(location.search),mode=args.get('scenario')||'bag',key=PotSystem.definitions[args.get('pot')]?args.get('pot'):'savepot';
 for(const k of Object.keys(PotSystem.definitions))known.add(k);
 const p=mkItem(mode==='contents'?'savepot':key,4);
 if(mode==='catalog'){inv=Object.keys(PotSystem.definitions).map(k=>mkItem(k));bagTab='全部';openBag();}
 else {
  inv=[p,mkItem('potion'),mkItem('potion'),mkItem('bread'),mkItem('herb'),mkItem('sword',1),mkItem('firestaff',3),mkItem('arrow',8),mkItem('extractscroll'),mkItem('uncursescroll')];
  if(mode==='floor'){inv.shift();floorItems=[{x:player.x,y:player.y,item:p}];openGroundMenu();}
  else if(mode==='contents'){p.pot=[mkItem('potion'),mkItem('bread'),mkItem('firestaff',3),mkItem('arrow',8)];potOpen(p,'view');}
  else {bagSel=ikey(p);bagTab='壺';openBag();}
 }
 window.potReviewReady=true;render();
},50);
</script>'''
html=html.replace('</body>',script+'</body>')
(R/'game-review.html').write_text(html)
print('Review built from current index.html with isolated storage')
