// Hand preference is independent of screen orientation and saved separately.
let handPreference='auto';
try{const saved=localStorage.getItem('fushigi_hand_layout_v1');if(['auto','both','right','left'].includes(saved))handPreference=saved;}catch(_){}
function applyHandLayout(){
 holdStop();const mode=handPreference==='auto'?(innerWidth>innerHeight?'both':'right'):handPreference;
 document.body.dataset.hand=mode;document.body.dataset.handPreference=handPreference;
 const select=document.getElementById('handLayout');if(select)select.value=handPreference;
}
function chooseHandLayout(value){if(!['auto','both','right','left'].includes(value))return;handPreference=value;try{localStorage.setItem('fushigi_hand_layout_v1',value);}catch(_){}applyHandLayout();}
function touchMenuBack(){if(DungeonNPC.state.open){DungeonNPC.key('Escape');return;}if(stairsOpen){chooseStairs(false);return;}if(whOpen){closeWh();render();return;}uiBack();}
function touchMenuKey(key){
 if(DungeonNPC.key(key))return;
 if(stairsOpen){if(key==='Enter')chooseStairs(stairsChoice===0);else {stairsChoice=1-stairsChoice;updateStairsChoice();}return;}
 if(menuOpen&&!$('menuInfo').hidden){if(groundMenuKey(key))return;if(key==='Enter')$('menuGroundAction')?.click();else $('gameMenu').scrollBy({top:key==='ArrowUp'?-120:120,behavior:'smooth'});return;}
 if(bagOpen){bagKey(key);return;}
 if(cfgOpen){const buttons=[...$('cfgList').querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(key==='Enter'){if(i>=0)buttons[i].click();else buttons[0]?.focus();}else buttons[(i+(key==='ArrowDown'?1:buttons.length-1)+buttons.length)%buttons.length]?.focus();return;}
 if(histOpen){$('histList').scrollBy({top:key==='ArrowUp'?-150:150,behavior:'smooth'});return;}
 controlsKey({key,preventDefault(){}});
 const selected=$('menuList').querySelector('.selected');selected?.scrollIntoView({block:'nearest'});
}
if(typeof document!=='undefined'&&document.body){
 const header=$('gameMenu').querySelector('header');
 header.insertAdjacentHTML('afterend','<label class="layout-choice">操作配置<select id="handLayout" aria-label="操作配置"><option value="auto">自動：横は両手・縦は右手</option><option value="both">両手</option><option value="right">右片手</option><option value="left">左片手</option></select></label>');
 $('handLayout').onchange=ev=>chooseHandLayout(ev.target.value);
 const dock=document.createElement('nav');dock.id='menuDock';dock.setAttribute('aria-label','メニュー操作');dock.innerHTML='<button data-nav="ArrowUp" aria-label="前を選ぶ">↑</button><button data-nav="ArrowDown" aria-label="次を選ぶ">↓</button><button data-nav="Enter" class="confirm">決定</button><button id="touchBack">戻る</button>';
 document.body.append(dock);dock.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;if(b.id==='touchBack')touchMenuBack();else touchMenuKey(b.dataset.nav);};
 $('atk').setAttribute('aria-label','攻撃・決定');
 document.querySelectorAll('.dp').forEach(b=>{const [x,y]=b.dataset.d.split(',').map(Number);b.setAttribute('aria-label',x||y?({ '-1,-1':'左上','0,-1':'上','1,-1':'右上','-1,0':'左','1,0':'右','-1,1':'左下','0,1':'下','1,1':'右下'}[b.dataset.d]+'へ移動'):'足踏み・向き');});
 addEventListener('resize',applyHandLayout);applyHandLayout();
}
