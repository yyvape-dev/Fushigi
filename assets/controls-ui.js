// Shared exploration controls and an in-world menu. Shops retain their existing flow.
let controlMode='walk',runTimer=0,keyMoveTimer=0,runActive=false,dashBlocked=false,menuIndex=0,menuTrail=false,pressedDirections=new Set();
// キーボードの移動：1歩目は斜めの同時押しをまとめる分だけ待ち（KEY_FIRST_MS）、押しっぱなしはOSのキーリピート待ちを使わず、KEY_HOLD_DELAY後からKEY_HOLD_MS間隔で一定に歩く。
const KEY_FIRST_MS=10,KEY_HOLD_DELAY=150,KEY_HOLD_MS=110;
let keyHoldT=0,keyHoldI=0,heldKey='';
function stopKeyHold(){clearTimeout(keyHoldT);clearInterval(keyHoldI);keyHoldT=keyHoldI=0;heldKey='';}
function startKeyHold(id,dirOf,mode){
 clearTimeout(keyHoldT);clearInterval(keyHoldI);heldKey=id;
 const tick=()=>{
  if(dead||uiBlocked()){stopKeyHold();return;}
  if(typeof EventVfx!=='undefined'&&EventVfx.busy())return;
  const d=dirOf();if(!d){stopKeyHold();return;}
  if(d[0]||d[1])controlsMove(d[0],d[1],mode);
 };
 keyHoldT=setTimeout(()=>{tick();if(heldKey===id)keyHoldI=setInterval(tick,KEY_HOLD_MS);},KEY_HOLD_DELAY);
}
function controlsKeyUp(ev){
 pressedDirections.delete(ev.key);
 if(heldKey==='arrows'?!pressedDirections.size:heldKey===String(ev.key).toLowerCase())stopKeyHold();
 if(ev.key==='Shift'||ev.key in KEYS){clearTimeout(runTimer);runActive=false;dashBlocked=false;}
}
let groundMenuItem=null,groundMenuIndex=0,groundMenuDirect=false;
function stopRun(){if(runActive)dashBlocked=true;clearTimeout(runTimer);clearTimeout(keyMoveTimer);runTimer=keyMoveTimer=0;runActive=false;pressedDirections.clear();stopKeyHold();}
function setControlMode(mode){holdStop();controlMode=controlMode===mode?'walk':mode;document.querySelectorAll('[data-mode]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.mode===controlMode));});const center=document.querySelector?.('.dp.wait');if(center)center.textContent=controlMode==='turn'?'向く':'待';$('controlHint').textContent={walk:'移動',turn:'向きだけ変更',diagonal:'斜めだけ移動',dash:'ダッシュ・離すと停止'}[controlMode];}
function faceOnly(dx,dy){if(uiBlocked()||dead||(!dx&&!dy))return;player.face=[dx,dy];if(dx)player.fl=dx<0;render();}
function faceNearest(){if(uiBlocked()||dead)return;const target=enemies.filter(e=>vis[e.y]?.[e.x]).sort((a,b)=>Math.max(Math.abs(a.x-player.x),Math.abs(a.y-player.y))-Math.max(Math.abs(b.x-player.x),Math.abs(b.y-player.y)))[0];if(target)faceOnly(Math.sign(target.x-player.x),Math.sign(target.y-player.y));}
function runSafe(dx,dy){
 if(scene!=='dungeon'||uiBlocked()||dead||player.st.confuse>0||player.st.sleep>0||player.st.blind>0)return false;
 if(enemies.some(e=>vis[e.y]?.[e.x]))return false;
 const x=player.x+dx,y=player.y+dy;
 if(!geomOK(player.x,player.y,dx,dy)||enemyAt(x,y)||(typeof AllySystem!=='undefined'&&AllySystem.at(x,y)))return false;
 if(map[y][x]===STAIRS||traps.some(t=>t.seen&&Math.max(Math.abs(t.x-x),Math.abs(t.y-y))<=1))return false;
 return true;
}
function runStep(dx,dy){
 if(!runActive||!runSafe(dx,dy)){stopRun();return;}
 // Dash never picks up floor items (including money).
 const oldX=player.x,oldY=player.y,oldHP=player.hp;
 playerMove(dx,dy,{skipPickup:true});
 if(player.x!==oldX+dx||player.y!==oldY+dy||player.hp<oldHP){stopRun();return;}
 if(dead||uiBlocked()||scene!=='dungeon'||itemAt(player.x,player.y)||traps.some(t=>t.seen&&t.x===player.x&&t.y===player.y)||map[player.y][player.x]===STAIRS){stopRun();return;}
 // Stop at entrances and junctions; never choose a branch for the player.
 const openings=[[1,0],[-1,0],[0,1],[0,-1]].filter(([x,y])=>geomOK(player.x,player.y,x,y)).length;
 const ri=playerRoom();
 if((ri<0&&openings!==2)||(ri>=0&&roomGrid[player.y-dy]?.[player.x-dx]!==ri)){stopRun();return;}
 runTimer=setTimeout(()=>runStep(dx,dy),110);
}
function controlsMove(dx,dy,mode=controlMode){
 if(uiBlocked()||dead)return;
 if(mode==='turn'){if(dx||dy)faceOnly(dx,dy);else faceNearest();return;}
 if(mode==='diagonal'&&(!dx||!dy))return;
 if(mode==='dash'&&(dx||dy)&&scene==='dungeon'){if(runActive||dashBlocked)return;runActive=true;runStep(dx,dy);return;}
 playerMove(dx,dy);
}
function menuEntries(){return [['持ち物',()=>openBag()],['足元',()=>showMenuInfo('ground')],['状態',()=>showMenuInfo('status')],['地図',()=>{mapMode=(mapMode+1)%3;saveGame();renderMenu();render();}],['メッセージ履歴',()=>openHist()],['設定',()=>openCfg()],['操作ガイド',()=>showMenuInfo('help')]];}
function renderMenu(){const entries=menuEntries();$('menuList').innerHTML=entries.map(([name],i)=>'<button class="menu-row '+(i===menuIndex?'selected':'')+'" data-menu="'+i+'">'+name+(i===3?'　'+MAP_LABEL[mapMode]:'')+'</button>').join('');}
function closeGameMenu(){menuOpen=false;groundMenuItem=null;groundMenuDirect=false;$('gameMenu').hidden=true;document.body?.classList.remove('menu-visible');}
function openGameMenu(){if((typeof EventVfx!=='undefined'&&EventVfx.busy())||dead||stairsOpen||whOpen)return;holdStop();closeBag();closeHist();closeCfg();menuOpen=true;$('gameMenu').hidden=false;$('menuInfo').hidden=true;document.body?.classList.add('menu-visible');renderMenu();render();}
function selectMenu(i){menuIndex=i;const fn=menuEntries()[i][1];if(i===3){fn();return;}if([1,2,6].includes(i)){fn();return;}closeGameMenu();menuTrail=true;fn();}
function groundActions(f){const d=ITEMS[f.item.type];return [
 {act:'pickup',label:'拾う'},
 ...(f.item.type!=='gold'?[{act:'use',label:d.equip?'装備':d.staff?'振る':d.throwOnly?'投げる':d.cat==='巻物'?'読む':d.cat==='食'?'食べる':['草','種','薬'].includes(d.cat)?'飲む':'使う'}]:[]),
 ...(!d.throwOnly?[{act:'throw',label:'投げる'}]:[]),
 {act:'cancel',label:'そのまま'}
];}
function openGroundMenu(){if(uiBlocked()||dead||scene!=='dungeon'||!itemAt(player.x,player.y))return;openGameMenu();groundMenuDirect=true;showMenuInfo('ground');}
function groundAction(act){
 const f=groundMenuItem;
 if(!menuOpen||!f||scene!=='dungeon'||dead||itemAt(player.x,player.y)!==f||!groundActions(f).some(a=>a.act===act))return;
 const t=turn;closeGameMenu();menuTrail=false;
 if(act==='cancel'){render();return;}
 if(act==='pickup')playerPickUp();else if(act==='throw')throwType(ikey(f.item),f);else useType(ikey(f.item),f);
 // Failed actions leave stock, capacity and the ledger intact, and let
 // the player choose again without spending a world turn.
 if(turn===t&&!dead&&scene==='dungeon'&&itemAt(player.x,player.y)===f&&!uiBlocked())openGroundMenu();
}
function groundMenuKey(k){
 if(!menuOpen||!groundMenuItem||$('menuInfo').hidden)return false;
 const buttons=[...($('menuInfo').querySelectorAll?.('[data-ground]')||[])];
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)){
  const count=groundActions(groundMenuItem).length;groundMenuIndex=(groundMenuIndex+(['ArrowUp','ArrowLeft'].includes(k)?count-1:1))%count;
  buttons.forEach((b,i)=>b.classList.toggle('chosen',i===groundMenuIndex));buttons[groundMenuIndex]?.focus();return true;
 }
 if(['Enter','z','x'].includes(k)){groundAction(groundActions(groundMenuItem)[groundMenuIndex].act);return true;}
 return false;
}
function showMenuInfo(kind){
 const it=itemAt(player.x,player.y),onStairs=scene==='dungeon'&&map[player.y][player.x]===STAIRS;
 const panel=$('menuInfo');panel.hidden=false;
 groundMenuItem=kind==='ground'&&it?it:null;groundMenuIndex=0;
 if(kind==='ground'){
  const l=it&&ShopSystem.unpaid(it.item)?ShopSystem.lot(it.item):null;
  panel.innerHTML='<h2>足元</h2><p>'+(it?itemName(it.item):onStairs?'下り階段がある。':'ここには何もない。')+'</p>'+(l?'<p class="ground-price">価格 '+Math.ceil(l.price)+'G　／　所持金 '+gold+'G</p><p>拾う・使うと代金が未精算になります。</p>':'')+
   (it?'<div class="ground-actions">'+groundActions(it).map((a,i)=>'<button class="sm '+(i===0?'chosen':'')+'" data-ground="'+a.act+'"'+(i===0?' id="menuGroundAction"':'')+'>'+a.label+'</button>').join('')+'</div>':onStairs?'<button class="sm" id="menuGroundAction">階段を使う</button>':'');
  panel.querySelectorAll?.('[data-ground]').forEach(b=>b.onclick=()=>groundAction(b.dataset.ground));
 }
 if(kind==='status')panel.innerHTML='<h2>状態</h2><p>Lv '+player.lv+'　HP '+player.hp+' / '+player.maxhp+'</p><p>満腹度 '+belly+' / '+maxBelly()+'　所持金 '+gold+'ギタン</p><p>武器：'+(eqWeapon?itemName(eqWeapon):'なし')+'</p><p>盾：'+(eqShield?itemName(eqShield):'なし')+'</p><p>'+Object.entries(player.st).filter(([k,v])=>v>0).map(([k,v])=>(STATUS_LABEL[k]||k)+' '+v).join('　')+'</p>';
 if(kind==='help')panel.innerHTML='<h2>操作</h2><p>方向ボタン：8方向移動<br>向き：その場で向きを変える<br>斜め：斜め方向だけ移動<br>走る：押している間ダッシュ</p><p>キーボード：矢印／WASD／テンキー<br>Ctrl＋方向：向きだけ変更<br>Alt＋方向：斜め固定<br>Shift＋方向：ダッシュ<br>F：近い敵へ向く<br>Esc：メニュー／戻る<br>I：持ち物　M：地図<br>Z／Enter：攻撃・決定</p><p>メニュー選択や方向変更ではターンは進みません。ダッシュは敵・分岐・階段・発見済みの罠の手前で停止。道具の上では拾わず停止します。</p>';
 if(kind==='status'&&typeof AllySystem!=='undefined')panel.innerHTML+=AllySystem.infoHTML();
 const action=$('menuGroundAction');if(action&&!groundMenuItem)action.onclick=()=>{closeGameMenu();menuTrail=false;doCtx();};
}
const STATUS_LABEL={confuse:'混乱',sleep:'睡眠',blind:'目つぶし',mute:'くちなし',weak:'ちから低下',fast:'倍速',power:'パワーアップ',invincible:'無敵',sight:'よく見え'};
function uiBack(){
 if(menuOpen){if(!$('menuInfo').hidden&&!groundMenuDirect){$('menuInfo').hidden=true;groundMenuItem=null;return;}closeGameMenu();render();return;}
 const backToMenu=menuTrail;menuTrail=false;
 if(cfgOpen)closeCfg();else if(histOpen)closeHist();else if(bagOpen){if(bagActionMode){bagKey('Escape');return;}closeBag();}else return;
 if(backToMenu)openGameMenu();else render();
}
function controlsKey(ev){
 if(typeof EventVfx!=='undefined'&&EventVfx.busy()){ev.preventDefault();return true;}
 const k=ev.key;
 if(stairsOpen||whOpen)return false;
 if(menuOpen){ev.preventDefault();if(k==='Escape'){uiBack();return true;}if(groundMenuKey(k))return true;if(!$('menuInfo').hidden)return true;if(['ArrowUp','ArrowDown'].includes(k)){menuIndex=(menuIndex+(k==='ArrowDown'?1:6))%7;renderMenu();}else if(['Enter','z','x'].includes(k))selectMenu(menuIndex);return true;}
 if(k==='Escape'){if(cfgOpen||histOpen||bagOpen)uiBack();else openGameMenu();ev.preventDefault();return true;}
 if(cfgOpen&&['ArrowDown','ArrowUp'].includes(k)){const buttons=[...$('cfgList').querySelectorAll('button')],i=buttons.indexOf(document.activeElement);buttons[(i+(k==='ArrowDown'?1:buttons.length-1)+buttons.length)%buttons.length]?.focus();ev.preventDefault();return true;}
 if(bagOpen&&!bagActionMode&&['PageDown','PageUp'].includes(k)){const tabs=[...tabsEl.querySelectorAll('[data-tab]')],i=tabs.findIndex(b=>b.dataset.tab===bagTab);bagTab=tabs[(i+(k==='PageDown'?1:tabs.length-1))%tabs.length].dataset.tab;renderBag();ev.preventDefault();return true;}
 if(uiBlocked())return false;
 if(k==='f'){faceNearest();ev.preventDefault();return true;}
 const d=KEYS[k]||KEYS[k.toLowerCase()];if(!d){if(!['Shift','Control','Alt'].includes(k))holdStop();return false;}
 const mode=ev.ctrlKey?'turn':ev.altKey?'diagonal':ev.shiftKey?'dash':controlMode;
 ev.preventDefault();if(runActive)return true;
 const moves=!!(d[0]||d[1]),holdable=moves&&(mode==='walk'||mode==='diagonal'),isArrow=k.startsWith('Arrow');
 if(ev.repeat&&holdable&&heldKey===(isArrow?'arrows':k.toLowerCase()))return true;      // 押しっぱなしの繰り返しはゲーム側で行う（OSのリピートは無視）
 if(isArrow){
  pressedDirections.add(k);clearTimeout(keyMoveTimer);stopKeyHold();
  const dirOf=()=>pressedDirections.size?[Number(pressedDirections.has('ArrowRight'))-Number(pressedDirections.has('ArrowLeft')),Number(pressedDirections.has('ArrowDown'))-Number(pressedDirections.has('ArrowUp'))]:null;
  const [dx,dy]=dirOf();
  keyMoveTimer=setTimeout(()=>{controlsMove(dx,dy,mode==='dash'&&!pressedDirections.size?'walk':mode);if(holdable&&pressedDirections.size)startKeyHold('arrows',dirOf,mode);},KEY_FIRST_MS);
 }else{
  controlsMove(d[0],d[1],mode);
  if(holdable){stopKeyHold();startKeyHold(k.toLowerCase(),()=>d,mode);}
 }
 return true;
}
if(typeof document!=='undefined'&&document.body){
 $('menubtn').onclick=()=>menuOpen?uiBack():openGameMenu();$('menuClose').onclick=uiBack;
 $('menuList').onclick=ev=>{const b=ev.target.closest('[data-menu]');if(b)selectMenu(Number(b.dataset.menu));};
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setControlMode(b.dataset.mode));
 for(const id of ['bagClose','histClose','cfgClose'])$(id).addEventListener('click',()=>{if(menuTrail){menuTrail=false;openGameMenu();}});
 addEventListener('keyup',controlsKeyUp);
 addEventListener('blur',()=>{holdStop();pressedDirections.clear();});document.addEventListener('visibilitychange',()=>{if(document.hidden)holdStop();});
}
