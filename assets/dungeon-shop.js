// Floor merchandise keeps its own lot and locked price until settlement or theft.
(function(root){
 const tiers=[{id:'brown',name:'茶の通常店',hp:90,atk:18,def:8,color:'#c79b65'},{id:'indigo',name:'藍の上級店',hp:180,atk:30,def:15,color:'#829ed9'},{id:'crimson',name:'深紅の希少店',hp:320,atk:45,def:25,color:'#e28086'}];
 const state={carpet:null,open:false,wanted:false,serial:0,lots:new Map(),images:{},focus:null};
 const src=typeof document!=='undefined'&&document.currentScript?.src;
 const base=src?new URL('../fushigi-shops-v1/',src).href:'fushigi-shops-v1/';
 const distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const inside=(x,y)=>scene==='dungeon'&&floorShop&&inb(x,y)&&roomGrid[y][x]===floorShop.room;
 const keepers=()=>scene==='dungeon'?(floorShop?.keepers||[]):[];
 const at=(x,y)=>keepers().find(k=>k.hp>0&&k.x===x&&k.y===y)||null;
 const nearby=()=>keepers().find(k=>k.hp>0&&distance(player,k)<=1&&geomOK(player.x,player.y,k.x-player.x,k.y-player.y))||null;
 const lot=it=>it&&state.lots.get(it.shopLot);
 const unpaid=it=>!!lot(it)&&!floorShop?.hostile;
 function tag(it,price=priceOf(it)){const id=++state.serial;it.shopLot=id;state.lots.set(id,{item:it,price,used:false,claimed:false});return it;}
 // 壺の中身も商品として数える（壺ごと持ち運んでも、未精算のまま・盗難の判定も同じ）
 const members=it=>it?[it,...(it.pot||[])]:[];
 function owns(it){return members(it).some(m=>!!lot(m));}
 function pickup(it){for(const m of members(it)){const l=lot(m);if(l)l.claimed=true;}}
 function debt(){if(!floorShop||floorShop.hostile)return 0;let n=0;for(const l of state.lots.values())if(l.claimed||l.used)n+=l.price;return n;}
 function consume(it,selfOnly){const tokens=[];for(const m of selfOnly?[it]:members(it)){const l=lot(m);if(!l)continue;tokens.push([l,{used:l.used,claimed:l.claimed}]);l.used=true;l.claimed=true;}return tokens.length?(tokens.length===1?tokens[0]:{multi:tokens}):null;}
 function rollback(token){if(!token)return;if(token.multi){for(const t of token.multi)rollback(t);return;}Object.assign(token[0],token[1]);}
 function split(it,one){const l=lot(it);if(!l)return;const q=it.plus+1,part=Math.floor(l.price/q);l.price-=part;tag(one,part);const c=lot(one);c.claimed=l.claimed;c.used=l.used;}
 function landed(it,x,y){for(const m of members(it)){const l=lot(m);if(!l)continue;if(inside(x,y)){if(!l.used)l.claimed=false;}else if(l.claimed||l.used){steal('商品が店の外へ持ち出された！');return;}}}
 function close(){state.open=false;const el=document.getElementById('shopPrompt');if(el)el.hidden=true;document.body?.classList?.remove('shop-dialog-open');state.focus?.focus?.({preventScroll:true});state.focus=null;}
 function clearTags(){for(const l of state.lots.values())delete l.item.shopLot;state.lots.clear();inv=mergeStacks(inv);}
 function leaveFloor(){if(debt())steal('代金を払わず、店のある階を離れた！');clearTags();close();state.wanted=false;ShopSecurity.reset();}
 function reset(){leaveFloor();state.wanted=false;ShopSecurity.reset();}
 function steal(reason){if(!floorShop||floorShop.hostile)return;floorShop.hostile=true;state.wanted=true;close();say(reason+' 店主が怒った！');clearTags();ShopSecurity.alert();}
 function stock(tier,count=11){const defaults=['potion','bread','arrow'].map(k=>mkItem(k));let ks=Object.keys(ITEMS).filter(k=>ITEMS[k].w>0&&(ITEMS[k].from||1)<=floorNo+tier*4&&!['gold','weed','potion','onigiri','arrow'].includes(k));if(tier===2){const rare=ks.filter(k=>ITEMS[k].w<=2);if(rare.length)ks=rare;}
  for(let n=0;n<count-3&&ks.length;n++){const weight=k=>Math.pow(ITEMS[k].w,tier===0?1:tier===1?0:-.5);let r=Math.random()*ks.reduce((s,k)=>s+weight(k),0),k=ks[0];for(const c of ks){r-=weight(c);if(r<0){k=c;break;}}const it=mkItem(k);if(ITEMS[k].equip&&ITEMS[k].equip!=='ring')it.plus=Math.max(it.plus,tier);defaults.push(it);}return defaults;}
 // Count corridor mouths, not every room tile touching a parallel corridor.
 function entrances(ri){const r=rooms[ri],ring=new Map(),dirs=[[1,0],[-1,0],[0,1],[0,-1]],doors=new Map();
  // Only join contacts along the immediate outside rim. A distant corridor
  // loop must not collapse two separate doorways into one.
  for(let y=r.y-1;y<=r.y+r.h;y++)for(let x=r.x-1;x<=r.x+r.w;x++)if((x===r.x-1||x===r.x+r.w||y===r.y-1||y===r.y+r.h)&&inb(x,y)&&map[y][x]===FLOOR&&roomGrid[y][x]<0)ring.set(x+','+y,{x,y});
  const seen=new Set();for(const [key,start]of ring){if(seen.has(key))continue;const q=[start],candidates=new Map();seen.add(key);
   for(let i=0;i<q.length;i++){const c=q[i];for(const [dx,dy]of dirs){const x=c.x+dx,y=c.y+dy,next=x+','+y;if(ring.has(next)&&!seen.has(next)){seen.add(next);q.push(ring.get(next));}if(inb(x,y)&&roomGrid[y][x]===ri&&map[y][x]===FLOOR)candidates.set(next,{x,y});}}
   const rank=c=>{const corner=(c.x===r.x||c.x===r.x+r.w-1)&&(c.y===r.y||c.y===r.y+r.h-1);const stem=dirs.some(([dx,dy])=>{const x=c.x+dx,y=c.y+dy,nx=x+dx,ny=y+dy;return ring.has(x+','+y)&&inb(nx,ny)&&map[ny][nx]===FLOOR&&roomGrid[ny][nx]<0;});return (corner?1000:0)+(stem?-10:0)+Math.abs(c.x-r.cx)+Math.abs(c.y-r.cy);};
   const door=[...candidates.values()].sort((a,b)=>rank(a)-rank(b))[0];if(door)doors.set(door.x+','+door.y,door);
  }return [...doors.values()];
 }
 function setup(forcedTier){if(!floorShop)return;const s=floorShop,r=rooms[s.room],v=Math.random(),tier=forcedTier??(v<.7?0:v<.94?1:2),cfg=tiers[tier];s.tier=tier;s.hostile=false;s.stock=[];s.doors=[];s.keepers=[];
  s.doors=entrances(s.room);const doorKeys=new Set(s.doors.map(c=>c.x+','+c.y));
  // Keep the outside corridor intact and close excess room-side contacts.
  const excess=[];for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(map[y][x]===FLOOR&&corridorAdj(x,y)&&!doorKeys.has(x+','+y))excess.push({x,y});
  for(const c of excess)map[c.y][c.x]=WALL;
  // Two sealed edges can leave an unused corner tile isolated inside the wall.
  for(const x of [r.x,r.x+r.w-1])for(const y of [r.y,r.y+r.h-1])if(map[y][x]===FLOOR&&!doorKeys.has(x+','+y)&&![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>inb(x+dx,y+dy)&&map[y+dy][x+dx]===FLOOR))map[y][x]=WALL;
  const cells=[];for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(map[y][x]===FLOOR&&!doorKeys.has(x+','+y))cells.push({x,y});
  // Each opening has its own attendant. Stand beside it while no bill is due.
  // Match standby cells so one attendant cannot take another's only free spot.
  const homes=[],occupied=new Map(),options=s.doors.map(door=>cells.filter(c=>distance(c,door)===1&&geomOK(door.x,door.y,c.x-door.x,c.y-door.y)).sort((a,b)=>Math.abs(a.x-door.x)+Math.abs(a.y-door.y)-Math.abs(b.x-door.x)-Math.abs(b.y-door.y)));
  const assign=(i,seen)=>{for(const c of options[i]){const key=c.x+','+c.y;if(seen.has(key))continue;seen.add(key);const owner=occupied.get(key);if(owner===undefined||assign(owner,seen)){occupied.set(key,i);homes[i]=c;return true;}}return false;};
  for(let i=0;i<s.doors.length;i++)assign(i,new Set());
  const used=new Set(homes.filter(Boolean).map(c=>c.x+','+c.y));for(let i=0;i<s.doors.length;i++){const door=s.doors[i],home=homes[i]||cells.filter(c=>!used.has(c.x+','+c.y)).sort((a,b)=>distance(a,door)-distance(b,door))[0]||door;used.add(home.x+','+home.y);s.keepers.push({x:home.x,y:home.y,vx:home.x,vy:home.y,hp:cfg.hp,maxhp:cfg.hp,face:[Math.sign(r.cx-home.x),Math.sign(r.cy-home.y)],home:{...home},door:{...door},isShopkeeper:true});}
  s.keeper=s.keepers[0]||null;
  // シレン6に合わせる：商品は7〜16個、部屋の床に無作為に置く（隣り合ってよい）。店番の立ち位置と出入口だけは空ける
  const placement=cells.filter(c=>!used.has(c.x+','+c.y));for(let i=placement.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[placement[i],placement[j]]=[placement[j],placement[i]];}
  const count=s.count??(7+Math.floor(Math.random()*10));
  for(const it of stock(tier,Math.min(count,placement.length))){const c=placement.shift();if(!c)break;tag(it);floorItems.push({...c,item:it});}
 }
 function pay(){const cost=Math.ceil(debt());if(!cost){talk('お勘定は済んでいる。');return false;}if(gold<cost){talk('お金が足りない。商品を床に戻すこともできる。');return false;}
  gold-=cost;for(const [id,l]of state.lots)if(l.claimed||l.used){delete l.item.shopLot;state.lots.delete(id);}inv=mergeStacks(inv);say(cost+'Gを支払った。');for(const k of keepers())if(k.hp>0)moveKeeper(k,k.home,false);saveGame();talk('確かに受け取った。また寄ってくれ。');return true;}
 function offers(){return floorItems.filter(f=>inside(f.x,f.y)&&!lot(f.item)&&f.item.type!=='gold');}
 function sell(id){if(!floorShop||floorShop.hostile||!inside(player.x,player.y))return false;const f=offers().find(f=>f.item.id===id);if(!f)return false;const price=sellFull(f.item);gold+=price;tag(f.item);for(const c of f.item.pot||[])if(!lot(c))tag(c);say(itemName(f.item)+'を'+price+'Gで売った。');saveGame();talk('買い取った。ほかにもあるか？');return true;}
 function talk(message){if(!floorShop||!keepers().some(k=>k.hp>0)||floorShop.hostile)return;if(!inside(player.x,player.y)&&!nearby())return;holdStop();closeBag();state.focus=document.activeElement;state.open=true;const el=document.getElementById('shopPrompt');if(!el)return;el.hidden=false;document.body?.classList?.add('shop-dialog-open');const cfg=tiers[floorShop.tier];
  document.getElementById('shopPortrait').src=base+'assets/'+cfg.id+'/S.png';document.getElementById('shopTitle').textContent=cfg.name+'の店主';
  document.getElementById('shopText').textContent=message||'商品は床から拾って選んでくれ。帰る前に精算だ。売りたい物は店の床へ置くといい。';
  document.getElementById('shopBill').textContent='所持金 '+gold+'G ／ 未精算 '+Math.ceil(debt())+'G';
  const actions=document.getElementById('shopActions');actions.innerHTML='<button data-shop="pay">精算する</button>'+offers().map(f=>'<button data-shop="sell" data-id="'+f.item.id+'">'+itemName(f.item)+'を売る '+sellFull(f.item)+'G</button>').join('')+(debt()?'<button data-shop="steal">払わず持ち出す</button>':'')+'<button data-shop="close">戻る</button>';actions.querySelector?.('button')?.focus?.();render();}
 function beforeMove(nx,ny){const k=at(nx,ny);if(!k)return true;if(floorShop.hostile){hit(undefined,k);endTurn();}else talk(debt()?'まだ代金を受け取っていない。精算か返品を頼む。':undefined);return false;}
 function boundary(){if(debt()&&!inside(player.x,player.y))steal('未精算の商品を持って店から離れた！');}
 function hit(damage,actor){const k=actor||nearby()||floorShop?.keeper;if(!k||k.hp<=0)return;steal('店主を攻撃した！');k.face=[Math.sign(player.x-k.x),Math.sign(player.y-k.y)];const dmg=damage??Math.max(1,playerAtk()-tiers[floorShop.tier].def);k.hp-=dmg;k.flash=now()+150;player.swing=now();player.attackFace=player.face.slice();fxText(k.x,k.y,'-'+dmg,'#ffe1af');if(k.hp<=0)say('店主を倒した。');}
 function moveKeeper(k,target,hostile){if(distance(k,target)===0)return;
  const q=[{x:k.x,y:k.y,first:null}],visited=new Set([k.x+','+k.y]);let best=null;
  for(let i=0;i<q.length&&i<MW*MH;i++){const c=q[i];if((c.x===target.x&&c.y===target.y)||(hostile&&distance(c,target)===1&&geomOK(c.x,c.y,target.x-c.x,target.y-c.y))){best=c.first;break;}for(const [dx,dy]of DIRS8){const x=c.x+dx,y=c.y+dy,key=x+','+y;if(!geomOK(c.x,c.y,dx,dy)||visited.has(key)||enemyAt(x,y)||AllySystem.at(x,y)||(at(x,y)&&at(x,y)!==k)||(player.x===x&&player.y===y)||(!hostile&&!inside(x,y)))continue;visited.add(key);q.push({x,y,first:c.first||{x,y}});}}
  if(best){k.face=[Math.sign(best.x-k.x),Math.sign(best.y-k.y)];k.x=best.x;k.y=best.y;k.walkStart=now();k.walkEnd=now()+220;}
 }
 function tick(){boundary();if(!floorShop)return;const s=floorShop,cfg=tiers[s.tier];for(const k of keepers()){
  if(k.hp<=0||dead)continue;
  if(!s.hostile){moveKeeper(k,debt()?k.door:k.home,false);k.face=[Math.sign(player.x-k.x),Math.sign(player.y-k.y)];continue;}
  if(distance(player,k)===1&&geomOK(k.x,k.y,player.x-k.x,player.y-k.y)){k.face=[Math.sign(player.x-k.x),Math.sign(player.y-k.y)];k.attackStart=now();const dmg=player.st.invinc>0?0:Math.max(1,cfg.atk-defBonus());hurtPlayer(dmg,'店主に倒された…');say('店主の攻撃！ '+dmg+'ダメージ。');}else moveKeeper(k,player,true);
 }}
 function direction(face){return {'0,1':'S','-1,1':'SW','-1,0':'W','-1,-1':'NW','0,-1':'N','1,-1':'NE','1,0':'E','1,1':'SE'}[face.join(',')]||'S';}
 function draw(ctx,k,t,camX,camY){const cfg=tiers[floorShop.tier],action=k.attackStart&&t-k.attackStart<240?'attack':k.walkEnd>t&&Math.floor((t-k.walkStart)/80)%2===0?'walk':'idle',d=direction(k.face),im=state.images[cfg.id+'/'+d+'/'+action];if(!im?.width)return;const size=TS*CHAR_K[charPref]*256/192,x=camX+(k.vx+.5)*TS,y=camY+(k.vy+.9)*tilePitchY();ctx.save();ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y,TS*.3,TS*.10,0,0,Math.PI*2);ctx.fill();ctx.drawImage(im,x-size*.5,y-size*224/256,size,size);if(floorShop.hostile){ctx.fillStyle='#f45';ctx.fillRect(x-TS*.4,y+2,TS*.8*k.hp/k.maxhp,3);}ctx.restore();}
 function floorArt(ctx,camX,camY){if(!floorShop)return;const r=rooms[floorShop.room];ctx.save();for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){if(!seen[y]?.[x]||map[y][x]!==FLOOR)continue;const px=camX+x*TS,py=camY+y*tilePitchY();ctx.fillStyle='#3b1720';ctx.fillRect(px,py,TS,tilePitchY());if(state.carpet?.width){ctx.globalAlpha=.68;ctx.drawImage(state.carpet,px,py,TS,tilePitchY());ctx.globalAlpha=1;}ctx.strokeStyle='#a8874c';ctx.lineWidth=Math.max(1,TS*.025);ctx.beginPath();if(x===r.x){ctx.moveTo(px+2,py);ctx.lineTo(px+2,py+tilePitchY());}if(x===r.x+r.w-1){ctx.moveTo(px+TS-2,py);ctx.lineTo(px+TS-2,py+tilePitchY());}if(y===r.y){ctx.moveTo(px,py+2);ctx.lineTo(px+TS,py+2);}if(y===r.y+r.h-1){ctx.moveTo(px,py+tilePitchY()-2);ctx.lineTo(px+TS,py+tilePitchY()-2);}ctx.stroke();}ctx.restore();}
 function prices(ctx,camX,camY){if(!floorShop)return;ctx.save();ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font='bold '+Math.max(9,Math.round(TS*.21))+'px sans-serif';for(const f of floorItems){const l=lot(f.item);if(!l||!seen[f.y][f.x])continue;const x=camX+(f.x+.5)*TS,y=camY+(f.y+1)*tilePitchY();ctx.lineWidth=3;ctx.strokeStyle='#17120d';ctx.strokeText(Math.ceil(l.price)+'G',x,y);ctx.fillStyle='#ffe09a';ctx.fillText(Math.ceil(l.price)+'G',x,y);}if(inside(player.x,player.y)||debt()||ShopSecurity.state.active){ctx.textAlign='left';ctx.fillStyle='rgba(20,16,13,.85)';const badgeY=innerWidth>innerHeight?40:84;ctx.fillRect(8,badgeY,185,29);ctx.fillStyle=tiers[floorShop.tier].color;ctx.fillText((floorShop.hostile?'盗難！ ':tiers[floorShop.tier].name+' ')+(debt()?'未精算 '+Math.ceil(debt())+'G':''),15,badgeY+22);}ctx.restore();}
 function init(){if(typeof Image!=='undefined'){state.carpet=new Image();state.carpet.onload=()=>render();state.carpet.src=base+'assets/carpet.png';}if(typeof Image!=='undefined')for(const cfg of tiers)for(const d of ['S','SW','W','NW','N','NE','E','SE'])for(const action of ['idle','walk','attack']){const im=new Image();im.onload=()=>render();im.src=base+'assets/'+cfg.id+'/'+d+(action==='idle'?'':'-'+action)+'.png';state.images[cfg.id+'/'+d+'/'+action]=im;}
  document.body?.insertAdjacentHTML?.('beforeend','<section id="shopPrompt" role="dialog" aria-modal="true" aria-labelledby="shopTitle" hidden><img id="shopPortrait" alt="店主"><div><h2 id="shopTitle"></h2><p id="shopText"></p><p id="shopBill"></p><div id="shopActions"></div></div></section>');
  document.getElementById('shopActions')?.addEventListener('click',ev=>{const b=ev.target.closest('[data-shop]');if(!b)return;const action=b.dataset.shop;if(action==='pay')pay();else if(action==='sell')sell(+b.dataset.id);else if(action==='steal'){steal('代金を払わず持ち出そうとした！');render();}else{close();render();}});
  document.addEventListener('keydown',ev=>{if(!state.open)return;ev.stopImmediatePropagation();if(ev.key==='Escape'){ev.preventDefault();close();render();return;}const buttons=[...document.getElementById('shopActions').querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(ev.key)){ev.preventDefault();const n=ev.key==='ArrowUp'||ev.key==='ArrowLeft'||ev.shiftKey?-1:1;buttons[(i+n+buttons.length)%buttons.length]?.focus();}else if(['Enter',' ','z','x'].includes(ev.key)){ev.preventDefault();document.activeElement?.click();}},true);
 }
 root.ShopSystem={state,tiers,inside,keepers,nearby,at,entrances,lot,owns,unpaid,pickup,debt,consume,rollback,split,landed,close,leaveFloor,reset,steal,setup,pay,offers,sell,talk,beforeMove,boundary,hit,tick,draw,floorArt,prices,init};
})(typeof window!=='undefined'?window:globalThis);
