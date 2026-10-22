// Floor merchandise keeps its own lot and locked price until settlement or theft.
(function(root){
 const tiers=[{id:'brown',name:'茶の通常店',hp:90,atk:18,def:8,color:'#c79b65'},{id:'indigo',name:'藍の上級店',hp:180,atk:30,def:15,color:'#829ed9'},{id:'crimson',name:'深紅の希少店',hp:320,atk:45,def:25,color:'#e28086'}];
 const state={open:false,wanted:false,serial:0,lots:new Map(),images:{},focus:null};
 const src=typeof document!=='undefined'&&document.currentScript?.src;
 const base=src?new URL('../fushigi-shops-v1/',src).href:'fushigi-shops-v1/';
 const distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
 const inside=(x,y)=>scene==='dungeon'&&floorShop&&inb(x,y)&&roomGrid[y][x]===floorShop.room;
 const at=(x,y)=>scene==='dungeon'&&floorShop?.keeper?.hp>0&&floorShop.keeper.x===x&&floorShop.keeper.y===y?floorShop.keeper:null;
 const lot=it=>it&&state.lots.get(it.shopLot);
 const unpaid=it=>!!lot(it)&&!floorShop?.hostile;
 function tag(it,price=priceOf(it)){const id=++state.serial;it.shopLot=id;state.lots.set(id,{item:it,price,used:false,claimed:false});return it;}
 function pickup(it){const l=lot(it);if(l)l.claimed=true;}
 function debt(){if(!floorShop||floorShop.hostile)return 0;let n=0;for(const l of state.lots.values())if(l.claimed||l.used)n+=l.price;return n;}
 function consume(it){const l=lot(it);if(!l)return null;const old={used:l.used,claimed:l.claimed};l.used=true;l.claimed=true;return [l,old];}
 function rollback(token){if(token)Object.assign(token[0],token[1]);}
 function split(it,one){const l=lot(it);if(!l)return;const q=it.plus+1,part=Math.floor(l.price/q);l.price-=part;tag(one,part);const c=lot(one);c.claimed=l.claimed;c.used=l.used;}
 function landed(it,x,y){const l=lot(it);if(!l)return;if(inside(x,y)){if(!l.used)l.claimed=false;}else if(l.claimed||l.used)steal('商品が店の外へ持ち出された！');}
 function close(){state.open=false;const el=document.getElementById('shopPrompt');if(el)el.hidden=true;document.body?.classList?.remove('shop-dialog-open');state.focus?.focus?.({preventScroll:true});state.focus=null;}
 function clearTags(){for(const l of state.lots.values())delete l.item.shopLot;state.lots.clear();inv=mergeStacks(inv);}
 function leaveFloor(){if(debt())steal('代金を払わず、店のある階を離れた！');clearTags();close();}
 function reset(){leaveFloor();state.wanted=false;}
 function steal(reason){if(!floorShop||floorShop.hostile)return;floorShop.hostile=true;state.wanted=true;close();say(reason+' 店主が怒った！');clearTags();}
 function stock(tier){const defaults=['potion','onigiri','arrow'].map(k=>mkItem(k));let ks=Object.keys(ITEMS).filter(k=>ITEMS[k].w>0&&(ITEMS[k].from||1)<=floorNo+tier*4&&!['gold','weed','potion','onigiri','arrow'].includes(k));if(tier===2){const rare=ks.filter(k=>ITEMS[k].w<=2);if(rare.length)ks=rare;}
  for(let n=0;n<8&&ks.length;n++){const weight=k=>Math.pow(ITEMS[k].w,tier===0?1:tier===1?0:-.5);let r=Math.random()*ks.reduce((s,k)=>s+weight(k),0),k=ks[0];for(const c of ks){r-=weight(c);if(r<0){k=c;break;}}const it=mkItem(k);if(ITEMS[k].equip&&ITEMS[k].equip!=='ring')it.plus=Math.max(it.plus,tier);defaults.push(it);}return defaults;}
 function setup(forcedTier){if(!floorShop)return;const s=floorShop,r=rooms[s.room],v=Math.random(),tier=forcedTier??(v<.7?0:v<.94?1:2),cfg=tiers[tier];s.tier=tier;s.hostile=state.wanted;s.keeper={x:r.cx,y:r.cy,vx:r.cx,vy:r.cy,hp:cfg.hp,maxhp:cfg.hp,face:[0,1],isShopkeeper:true};s.stock=[];
  s.doors=[];const cells=[];for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){if(map[y][x]!==FLOOR)continue;if(corridorAdj(x,y))s.doors.push({x,y});else if(x!==r.cx||y!==r.cy)cells.push({x,y});}
  cells.sort((a,b)=>Math.abs(a.y-r.cy)-Math.abs(b.y-r.cy)||a.x-b.x);
  for(const it of stock(tier)){const c=cells.shift();if(!c)break;if(!s.hostile)tag(it);floorItems.push({...c,item:it});}
 }
 function pay(){const cost=Math.ceil(debt());if(!cost){talk('お勘定は済んでいる。');return false;}if(gold<cost){talk('お金が足りない。商品を床に戻すこともできる。');return false;}
  gold-=cost;for(const [id,l]of state.lots)if(l.claimed||l.used){delete l.item.shopLot;state.lots.delete(id);}inv=mergeStacks(inv);say(cost+'Gを支払った。');saveGame();talk('確かに受け取った。また寄ってくれ。');return true;}
 function offers(){return floorItems.filter(f=>inside(f.x,f.y)&&!lot(f.item)&&f.item.type!=='gold');}
 function sell(id){if(!floorShop||floorShop.hostile||!inside(player.x,player.y))return false;const f=offers().find(f=>f.item.id===id);if(!f)return false;const price=sellPrice(f.item);gold+=price;tag(f.item);say(itemName(f.item)+'を'+price+'Gで売った。');saveGame();talk('買い取った。ほかにもあるか？');return true;}
 function talk(message){if(!floorShop||floorShop.keeper.hp<=0||floorShop.hostile)return;if(!inside(player.x,player.y)&&distance(player,floorShop.keeper)>1)return;holdStop();closeBag();state.focus=document.activeElement;state.open=true;const el=document.getElementById('shopPrompt');if(!el)return;el.hidden=false;document.body?.classList?.add('shop-dialog-open');const cfg=tiers[floorShop.tier];
  document.getElementById('shopPortrait').src=base+'assets/'+cfg.id+'/S.png';document.getElementById('shopTitle').textContent=cfg.name+'の店主';
  document.getElementById('shopText').textContent=message||'商品は床から拾って選んでくれ。帰る前に精算だ。売りたい物は店の床へ置くといい。';
  document.getElementById('shopBill').textContent='所持金 '+gold+'G ／ 未精算 '+Math.ceil(debt())+'G';
  const actions=document.getElementById('shopActions');actions.innerHTML='<button data-shop="pay">精算する</button>'+offers().map(f=>'<button data-shop="sell" data-id="'+f.item.id+'">'+itemName(f.item)+'を売る '+sellPrice(f.item)+'G</button>').join('')+(debt()?'<button data-shop="steal">払わず持ち出す</button>':'')+'<button data-shop="close">戻る</button>';actions.querySelector?.('button')?.focus?.();render();}
 function beforeMove(nx,ny){if(!floorShop)return true;const keeper=at(nx,ny);if(keeper){if(floorShop.hostile){hit();endTurn();}else talk();return false;}if(debt()&&inside(player.x,player.y)&&!inside(nx,ny)){talk('まだ代金を受け取っていない。精算か返品を頼む。');return false;}return true;}
 function boundary(){if(debt()&&!inside(player.x,player.y))steal('未精算の商品を持って店から離れた！');}
 function hit(damage){const k=floorShop?.keeper;if(!k||k.hp<=0)return;steal('店主を攻撃した！');k.face=[Math.sign(player.x-k.x),Math.sign(player.y-k.y)];k.hp-=damage??Math.max(1,playerAtk()-tiers[floorShop.tier].def);k.flash=now()+150;player.swing=now();player.attackFace=player.face.slice();fxText(k.x,k.y,'-'+(damage??Math.max(1,playerAtk()-tiers[floorShop.tier].def)),'#ffe1af');if(k.hp<=0)say('店主を倒した。');}
 function tick(){boundary();const s=floorShop,k=s?.keeper;if(!k||k.hp<=0)return;const cfg=tiers[s.tier];let target;
  if(s.hostile){if(distance(player,k)===1&&geomOK(k.x,k.y,player.x-k.x,player.y-k.y)){k.face=[Math.sign(player.x-k.x),Math.sign(player.y-k.y)];k.attackStart=now();const dmg=player.st.invinc>0?0:Math.max(1,cfg.atk-defBonus());hurtPlayer(dmg,'店主に倒された…');say('店主の攻撃！ '+dmg+'ダメージ。');return;}target=player;}
  else if(debt()&&s.doors.length){target=s.doors.slice().sort((a,b)=>distance(player,a)-distance(player,b))[0];}
  else target={x:rooms[s.room].cx,y:rooms[s.room].cy};
  if(distance(k,target)===0)return;
  // Breadth-first route, with the same blocked corners and actor collision as walking.
  const q=[{x:k.x,y:k.y,first:null}],visited=new Set([k.x+','+k.y]);let best=null;
  for(let i=0;i<q.length&&i<MW*MH;i++){const c=q[i];if((c.x===target.x&&c.y===target.y)||(s.hostile&&distance(c,target)===1&&geomOK(c.x,c.y,target.x-c.x,target.y-c.y))){best=c.first;break;}for(const [dx,dy]of DIRS8){const x=c.x+dx,y=c.y+dy,key=x+','+y;if(!geomOK(c.x,c.y,dx,dy)||visited.has(key)||enemyAt(x,y)||AllySystem.at(x,y)||(player.x===x&&player.y===y)||(!s.hostile&&!inside(x,y)))continue;visited.add(key);q.push({x,y,first:c.first||{x,y}});}}
  if(best){k.face=[Math.sign(best.x-k.x),Math.sign(best.y-k.y)];k.x=best.x;k.y=best.y;k.walkStart=now();k.walkEnd=now()+220;}
 }
 function direction(face){return {'0,1':'S','-1,1':'SW','-1,0':'W','-1,-1':'NW','0,-1':'N','1,-1':'NE','1,0':'E','1,1':'SE'}[face.join(',')]||'S';}
 function draw(ctx,k,t,camX,camY){const cfg=tiers[floorShop.tier],action=k.attackStart&&t-k.attackStart<240?'attack':k.walkEnd>t&&Math.floor((t-k.walkStart)/80)%2===0?'walk':'idle',d=direction(k.face),im=state.images[cfg.id+'/'+d+'/'+action];if(!im?.width)return;const size=TS*CHAR_K[charPref]*256/192,x=camX+(k.vx+.5)*TS,y=camY+(k.vy+.9)*tilePitchY();ctx.save();ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y,TS*.3,TS*.10,0,0,Math.PI*2);ctx.fill();ctx.drawImage(im,x-size*.5,y-size*224/256,size,size);if(floorShop.hostile){ctx.fillStyle='#f45';ctx.fillRect(x-TS*.4,y+2,TS*.8*k.hp/k.maxhp,3);}ctx.restore();}
 function prices(ctx,camX,camY){if(!floorShop)return;ctx.save();ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font='bold '+Math.max(9,Math.round(TS*.21))+'px sans-serif';for(const f of floorItems){const l=lot(f.item);if(!l||!seen[f.y][f.x])continue;const x=camX+(f.x+.5)*TS,y=camY+(f.y+1)*tilePitchY();ctx.lineWidth=3;ctx.strokeStyle='#17120d';ctx.strokeText(Math.ceil(l.price)+'G',x,y);ctx.fillStyle='#ffe09a';ctx.fillText(Math.ceil(l.price)+'G',x,y);}if(inside(player.x,player.y)||debt()){ctx.textAlign='left';ctx.fillStyle='rgba(20,16,13,.85)';ctx.fillRect(8,84,185,29);ctx.fillStyle=tiers[floorShop.tier].color;ctx.fillText((floorShop.hostile?'盗難！ ':tiers[floorShop.tier].name+' ')+(debt()?'未精算 '+Math.ceil(debt())+'G':''),15,106);}ctx.restore();}
 function init(){if(typeof Image!=='undefined')for(const cfg of tiers)for(const d of ['S','SW','W','NW','N','NE','E','SE'])for(const action of ['idle','walk','attack']){const im=new Image();im.onload=()=>render();im.src=base+'assets/'+cfg.id+'/'+d+(action==='idle'?'':'-'+action)+'.png';state.images[cfg.id+'/'+d+'/'+action]=im;}
  document.body?.insertAdjacentHTML?.('beforeend','<section id="shopPrompt" role="dialog" aria-modal="true" aria-labelledby="shopTitle" hidden><img id="shopPortrait" alt="店主"><div><h2 id="shopTitle"></h2><p id="shopText"></p><p id="shopBill"></p><div id="shopActions"></div></div></section>');
  document.getElementById('shopActions')?.addEventListener('click',ev=>{const b=ev.target.closest('[data-shop]');if(!b)return;const action=b.dataset.shop;if(action==='pay')pay();else if(action==='sell')sell(+b.dataset.id);else if(action==='steal'){steal('代金を払わず持ち出そうとした！');render();}else{close();render();}});
  document.addEventListener('keydown',ev=>{if(!state.open)return;ev.stopImmediatePropagation();if(ev.key==='Escape'){ev.preventDefault();close();render();return;}const buttons=[...document.getElementById('shopActions').querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(ev.key)){ev.preventDefault();const n=ev.key==='ArrowUp'||ev.key==='ArrowLeft'||ev.shiftKey?-1:1;buttons[(i+n+buttons.length)%buttons.length]?.focus();}else if(['Enter',' ','z','x'].includes(ev.key)){ev.preventDefault();document.activeElement?.click();}},true);
 }
 root.ShopSystem={state,tiers,inside,at,lot,unpaid,pickup,debt,consume,rollback,split,landed,close,leaveFloor,reset,steal,setup,pay,offers,sell,talk,beforeMove,boundary,hit,tick,draw,prices,init};
})(typeof window!=='undefined'?window:globalThis);
