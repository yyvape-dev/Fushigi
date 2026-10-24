// Original, sample-free PCM synthesis. No gameplay RNG or external downloads.
(()=>{
 'use strict';
 const definitions={
  swing:['素振り・斬撃',.18],hit:['命中',.18],critical:['会心',.32],hurt:['被ダメージ',.25],
  pickup:['アイテム拾得',.22],coin:['ギタン拾得',.32],throw:['投擲',.24],potbreak:['壺の破壊',.48],
  trap:['罠の作動',.12],'trap-mine':['地雷',.65],'trap-gas':['睡眠ガス',.65],
  'trap-pit':['落とし穴',.65],'trap-warp':['転移',.65],'trap-hungry':['空腹の罠',.45],
  'trap-summon':['召喚',.7],forge:['鍛冶',1.05]
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
   data[i]=Math.tanh(x)*.65*Math.min(1,t/.002,(duration-t)/.012);
  }
  return data;
 }
 function init(){
  if(context)return true;
  const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return false;
  try{context=new C();master=context.createGain();master.connect(context.destination);configure(volume,muted);return true;}catch{return false;}
 }
 function stop(){enabled=false;for(const voice of [...voices]){voice.source.stop();voice.source.disconnect();voices.delete(voice);}last.clear();changed();}
 function configure(v,m){volume=v;muted=m;if(master)master.gain.setTargetAtTime(m?0:v,context.currentTime,.01);if(m)stop();}
 function unlock(){enabled=true;if(init()&&context.state==='suspended')context.resume().catch(()=>{});}
 function play(key){
  if(!definitions[key]||!enabled||muted||volume===0||document.hidden||!init()||context.state!=='running')return false;
  const time=context.currentTime;if(time-(last.get(key)??-100)<.055)return false;last.set(key,time);
  if(!cache.has(key)){const samples=pcm(key,context.sampleRate),b=context.createBuffer(1,samples.length,context.sampleRate);b.copyToChannel(samples,0);cache.set(key,b);}
  while(voices.size>=8){const old=voices.values().next().value;old.source.stop();old.source.disconnect();voices.delete(old);}
  const source=context.createBufferSource();source.buffer=cache.get(key);source.connect(master);
  const voice={source,key};voices.add(voice);source.onended=()=>{source.disconnect();voices.delete(voice);changed();};source.start();changed();return true;
 }
 globalThis.ActionSfx={play,stop,unlock,configure,pcm,definitions,
  get active(){return [...voices].map(v=>v.key);},set onChange(fn){changed=fn;}};
})();
