// Original, sample-free PCM synthesis. No gameplay RNG or external downloads.
(()=>{
 'use strict';
 const definitions={
  swing:['素振り・斬撃',.18],hit:['命中',.18],critical:['会心',.32],hurt:['被ダメージ',.25],
  pickup:['アイテム拾得',.22],coin:['ギタン拾得',.32],throw:['投擲',.24],potbreak:['壺の破壊',.48],
  trap:['罠の作動',.12],'trap-mine':['地雷',.65],'trap-gas':['睡眠ガス',.65],
  'trap-pit':['落とし穴',.65],'trap-warp':['転移',.65],'trap-hungry':['空腹の罠',.45],
  'trap-summon':['召喚',.7],forge:['鍛冶',1.05],
"ally-kunai":["味方・クナイ",0.22],
"ally-sword":["味方・剣",0.28],
"ally-magic":["味方・黒魔法",0.42],
"ally-issen":["味方・一閃",0.38],
"join":["味方の加入",0.8],
"retreat":["味方の離脱",0.65],
"boost":["狐火の襲・強化",0.55],
"miss":["回避・空振り",0.16],
"defeat":["敵の撃破",0.24],
"status":["状態異常",0.38],
"block":["無効・防御",0.18],
"heal":["回復",0.45],
"revive":["復活",1],
"death":["力尽きた",1],
"victory":["踏破",1.2],
"eat":["食べる",0.3],
"drink":["飲む",0.32],
"scroll":["巻物",0.4],
"staff":["杖",0.28],
"equip":["装備・取り外し",0.22],
"place":["物を置く",0.14],
"container":["壺・倉庫の出し入れ",0.2],
"trade":["売買・精算・預金",0.32],
"step":["足音",0.09],
"stairs":["階段・出発",0.45],
"door":["扉",0.28],
"ui-open":["メニュー・会話",0.1],
"ui-close":["メニューを閉じる",0.09],
"error":["操作できない",0.13],
"alarm":["魔物部屋・泥棒警報",0.75],
"cannon":["砲撃・爆発",0.6],
"fire":["炎",0.42],
"lightning":["雷",0.35],
"bell":["召喚の鈴",0.6],
"evolve":["敵の進化",0.65],
"steal":["盗まれた",0.34],
"identify":["識別",0.32],
"fuse":["合成",0.65]
 };
 let context=null,master=null,volume=.65,muted=false,enabled=false,changed=()=>{};
 const cache=new Map(),voices=new Set(),last=new Map();
 function pcm(key,sr){
  const duration=definitions[key][1],data=new Float32Array(Math.ceil(sr*duration));let seed=2166136261;
  for(const c of key)seed=Math.imul(seed^c.charCodeAt(0),16777619);
  const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
  const tone=(t,f,d)=>Math.sin(2*Math.PI*f*t)*Math.exp(-t*d);
  for(let i=0;i<data.length;i++){
   const t=i/sr,u=t/duration,n=noise();let x=0;
   switch(key){
    
    case 'ally-kunai':x=n*.28*Math.sin(Math.PI*u)+tone(t,1900,25)*.2;break;
    case 'ally-sword':case 'ally-issen':x=n*.25*Math.sin(Math.PI*u)+tone(t,key==='ally-issen'?1540:1170,13)*.3+tone(t,2317,18)*.13;break;
    case 'ally-magic':case 'boost':case 'staff':x=(Math.sin(2*Math.PI*(310*t+750*t*t))+Math.sin(2*Math.PI*(467*t+950*t*t)))*.2*Math.sin(Math.PI*u)+n*.07*Math.sin(Math.PI*u);break;
    case 'join':case 'heal':case 'revive':case 'victory':case 'identify':case 'fuse':case 'evolve':{
     const notes=key==='join'?[523,659,784,1047]:key==='victory'?[523,659,784,1047,1319]:key==='heal'?[659,880,1047]:key==='revive'?[392,523,659,784,1047]:key==='evolve'?[220,277,330,440]:key==='fuse'?[440,659,880]:[880,1175,1568];
     const gap=duration/(notes.length+1);
     for(let j=0;j<notes.length;j++){const a=t-j*gap;if(a>=0)x+=(tone(a,notes[j],9)+tone(a,notes[j]*2.01,17)*.18)*.3*Math.min(1,a/.006);}
     break;
    }
    case 'death':case 'retreat':case 'status':case 'steal':{
     const notes=key==='death'?[392,330,262,196]:key==='retreat'?[659,523,392]:key==='steal'?[880,698,440]:[370,349,277];
     for(let j=0;j<notes.length;j++){const a=t-j*duration/(notes.length+1);if(a>=0)x+=tone(a,notes[j],12)*.3*Math.min(1,a/.005);}break;
    }
    case 'miss':x=n*.18*Math.sin(Math.PI*u)+tone(t,420,30)*.1;break;
    case 'block':case 'equip':case 'container':case 'place':case 'door':case 'step':case 'defeat':{
     const f={block:1800,equip:1320,container:670,place:310,door:170,step:125,defeat:90}[key];
     x=(tone(t,f,32)+tone(t,f*1.63,43)*.3)*.35+n*.2*Math.exp(-t*50);break;
    }
    case 'eat':case 'scroll':x=n*.22*Math.exp(-t*8)*(Math.sin(t*85)**2+.2);break;
    case 'drink':x=Math.sin(2*Math.PI*(490*t+140*t*t)+Math.sin(t*76))*.28*Math.sin(Math.PI*u);break;
    case 'trade':case 'bell':x=(tone(t,key==='bell'?1047:1568,11)+tone(t,key==='bell'?1693:2349,15)*.5)*.35*Math.min(1,t/.002);break;
    case 'stairs':x=n*.15*Math.exp(-t*9);for(const start of [0,.12,.24]){const a=t-start;if(a>=0)x+=tone(a,220,35)*.3;}break;
    case 'ui-open':case 'ui-close':case 'error':x=tone(t,key==='error'?180:key==='ui-open'?880:660,45)*.22;break;
    case 'alarm':x=(Math.sin(2*Math.PI*440*t)+Math.sin(2*Math.PI*466*t))*.2*Math.sin(Math.PI*u)*(Math.sin(t*24)**2+.2);break;
    case 'cannon':x=n*.55*Math.exp(-t*10)+Math.sin(2*Math.PI*(60*t+3*(1-Math.exp(-t*30))))*.5*Math.exp(-t*12);break;
    case 'fire':x=n*.45*Math.sin(Math.PI*u)*Math.exp(-t*3);break;
    case 'lightning':x=n*.5*Math.exp(-t*18)*(Math.sin(t*180)**2+.1)+tone(t,84,18)*.3;break;

    case 'swing':case 'throw':x=n*Math.sin(Math.PI*u)**2*(key==='swing'?.48:.32)+tone(t,key==='swing'?180:290,22)*.1;break;
    case 'hit':case 'critical':case 'hurt':{
     const f=key==='hurt'?94:key==='critical'?148:190;
     x=.6*Math.sin(2*Math.PI*(f*t+3*(1-Math.exp(-30*t))))*Math.exp(-23*t)+n*.45*Math.exp(-45*t);
     if(key==='critical')x+=tone(t,1780,12)*.16;break;
    }
    case 'pickup':case 'coin':x=(tone(t,880,19)+tone(Math.max(0,t-.065),key==='coin'?1760:1320,22)*(t>.065?1:0))*.32;break;
    case 'potbreak':
     for(let j=0;j<7;j++){const a=t-j*.028;if(a>=0)x+=(tone(a,760+j*431,22+j*4)*.2+n*Math.exp(-a*65)*.18);}
     x+=tone(t,210,32)*.4;break;
    case 'trap':x=n*.5*Math.exp(-t*65)+tone(t,520,45)*.3;break;
    case 'trap-mine':x=n*.65*Math.exp(-t*9)+Math.sin(2*Math.PI*(55*t+2*(1-Math.exp(-t*30))))*Math.exp(-t*12)*.5;break;
    case 'trap-gas':x=n*.33*Math.sin(Math.PI*u)*Math.exp(-t*2);break;
    case 'trap-pit':x=Math.sin(2*Math.PI*(360*t-210*t*t))*.4*Math.sin(Math.PI*u)+n*.2*Math.exp(-((t-.5)**2)*700);break;
    case 'trap-warp':x=(Math.sin(2*Math.PI*(220*t+650*t*t))+Math.sin(2*Math.PI*(329*t+890*t*t)))*.2*Math.sin(Math.PI*u);break;
    case 'trap-hungry':x=Math.sin(2*Math.PI*(150*t-90*t*t)+2*Math.sin(2*Math.PI*13*t))*.4*Math.sin(Math.PI*u);break;
    case 'trap-summon':x=(tone(t,277,4)+tone(t,415,5)+tone(t,587,6))*.22*Math.min(1,t/.02);break;
    case 'forge':
     for(const [j,start] of [0,.27,.56].entries()){const a=t-start;if(a>=0)x+=(tone(a,880+j*110,14)+tone(a,1433+j*160,19)+tone(a,2317+j*180,25))*.23+n*.2*Math.exp(-a*100);}
     break;
   }
   // Short fades prevent discontinuities; headroom is shared across bounded voices.
   data[i]=Math.tanh(x)*.65*(key==='step'?.2:key.startsWith('ui-')?.45:1)*Math.min(1,t/.002,(duration-t)/.012);
  }
  return data;
 }
 function init(){
  if(context)return true;
  const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return false;
  try{context=new C();master=context.createGain();
   const limiter=context.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=12;limiter.ratio.value=6;limiter.attack.value=.003;limiter.release.value=.12;master.connect(limiter);limiter.connect(context.destination);configure(volume,muted);return true;}catch{return false;}
 }
 function stop(){enabled=false;for(const voice of [...voices]){voice.source.stop();voice.source.disconnect();voices.delete(voice);}last.clear();changed();}
 function configure(v,m){volume=v;muted=m;if(master)master.gain.setTargetAtTime(m?0:v,context.currentTime,.01);if(m)stop();}
 function unlock(){enabled=true;if(init()&&context.state==='suspended')context.resume().catch(()=>{});}
 function play(key){
  if(!definitions[key]||!enabled||muted||volume===0||document.hidden||!init()||context.state!=='running')return false;
  if(key==='step'&&voices.size)return false;
  const time=context.currentTime;if(time-(last.get(key)??-100)<.055)return false;last.set(key,time);
  if(!cache.has(key)){const samples=pcm(key,context.sampleRate),b=context.createBuffer(1,samples.length,context.sampleRate);b.copyToChannel(samples,0);cache.set(key,b);}
  while(voices.size>=8){const old=voices.values().next().value;old.source.stop();old.source.disconnect();voices.delete(old);}
  const source=context.createBufferSource();source.buffer=cache.get(key);source.connect(master);
  const voice={source,key};voices.add(voice);source.onended=()=>{source.disconnect();voices.delete(voice);changed();};source.start();changed();return true;
 }
 globalThis.ActionSfx={play,stop,unlock,configure,pcm,definitions,
  get active(){return [...voices].map(v=>v.key);},set onChange(fn){changed=fn;}};
})();
