// Licensed PeriTune loops and original SE; independent of gameplay saves.
(()=>{
 const root=globalThis;if(typeof Audio==='undefined')return;
 const path='fushigi-audio-v1/audio/',storeKey='fushigi_audio_settings_v1';
 const defaults={bgm:.45,se:.65,muted:false};let settings={...defaults};
 try{const s=JSON.parse(localStorage.getItem(storeKey)||'{}');for(const k of ['bgm','se'])if(Number.isFinite(s[k]))settings[k]=Math.max(0,Math.min(1,s[k]));if(typeof s.muted==='boolean')settings.muted=s.muted;}catch{}
 const tracks=new Map(),effects=new Map();let wanted='town',current=null,unlocked=false,pending=null,epoch=0;
 const trackFor=(scene,theme,dead)=>dead?null:scene==='town'?'town':theme==='forest'?'green':['ice','volcano'].includes(theme)?'spooky':'depth';
 function get(map,key,ext,loop=false){if(!map.has(key)){const a=new Audio(path+key+ext);a.preload='none';a.loop=loop;map.set(key,a);}return map.get(key);}
 function levels(){const duck=[...effects.values()].some(a=>!a.paused&&!a.ended)?.35:1;for(const a of tracks.values()){a.volume=settings.bgm*duck;a.muted=settings.muted;}for(const a of effects.values()){a.volume=settings.se;a.muted=settings.muted;}}
 function pause(){epoch++;pending=null;for(const a of [...tracks.values(),...effects.values()])a.pause();levels();}
 function reconcile(){
  if(!unlocked||document.hidden||settings.muted||settings.bgm===0||!wanted){for(const a of tracks.values())a.pause();return;}
  if(current!==wanted){for(const a of tracks.values())a.pause();current=wanted;epoch++;pending=null;}
  const a=get(tracks,current,'.mp3',true);levels();if(!a.paused||pending===a)return;
  const version=epoch;pending=a;
  a.play().catch(()=>{if(version===epoch&&wanted===current)unlocked=false;}).finally(()=>{if(pending===a)pending=null;});
 }
 function unlock(ev){if(ev&&ev.isTrusted===false)return;unlocked=true;reconcile();}
 function configure(patch){for(const k of ['bgm','se'])if(Number.isFinite(patch[k]))settings[k]=Math.max(0,Math.min(1,patch[k]));if(typeof patch.muted==='boolean')settings.muted=patch.muted;try{localStorage.setItem(storeKey,JSON.stringify(settings));}catch{}if(settings.muted){for(const a of effects.values())a.pause();}levels();reconcile();}
 function cycle(k){const steps=[0,.25,.5,.75,1],next=steps.find(v=>v>settings[k]+.001);configure({[k]:next===undefined?0:next});}
 function effect(key){
  if(!['enhance','levelup'].includes(key)||!unlocked||document.hidden||settings.muted||settings.se===0)return;
  for(const a of effects.values()){a.pause();if(a.readyState)a.currentTime=0;}
  const a=get(effects,key,'.wav');if(!a.dataset.bound){for(const e of ['play','pause','ended'])a.addEventListener(e,levels);a.addEventListener('error',()=>{a.pause();levels();});a.dataset.bound='1';}levels();a.play().catch(()=>{});
 }
 root.GameAudio={
  sync(scene,theme,dead){const next=trackFor(scene,theme,dead);if(wanted===next)return;wanted=next;if(!next){pause();}reconcile();},
  effect,configure,cycle,trackFor,
  get settings(){return {...settings};},
  snapshot(){return {wanted,current,unlocked,playing:[...tracks].filter(([,a])=>!a.paused).map(([k])=>k),effects:[...effects].filter(([,a])=>!a.paused).map(([k])=>k)};},
  rows(){return `<div class="set"><span class="lab">BGM音量<br><small>押すと段階調整</small></span><button class="sm" data-cfg="audio-bgm">${Math.round(settings.bgm*100)}%</button></div><div class="set"><span class="lab">効果音量<br><small>強化・レベルアップ</small></span><button class="sm" data-cfg="audio-se">${Math.round(settings.se*100)}%</button></div><div class="set"><span class="lab">音をミュート</span><button class="sm" data-cfg="audio-mute">${settings.muted?'ON':'OFF'}</button></div><div class="set"><span class="lab">音楽：PeriTune / むつき醒<br><small>Harvest5 / Breeze / Labyrinth / Spook · CC BY 4.0<br>公式ループ版・変更なし。効果音はオリジナル試作。</small><br><a href="fushigi-audio-v1/" target="_blank" rel="noopener">曲とクレジット・試聴</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">ライセンス</a></span></div>`;}
 };
 document.addEventListener('pointerdown',unlock,{capture:true,passive:true});document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){unlocked=false;pause();}});addEventListener('pagehide',()=>{unlocked=false;pause();});
})();
