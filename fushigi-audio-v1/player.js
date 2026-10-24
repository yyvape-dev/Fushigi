(()=>{
 const sfx=globalThis.ActionSfx;
 for(const [key,[label]] of Object.entries(sfx.definitions)){const card=document.createElement('article'),title=document.createElement('h3'),button=document.createElement('button');title.textContent=label;button.textContent=label+'を聴く';button.className='effect';button.onclick=()=>{sfx.unlock();sfx.stop();sfx.unlock();sfx.configure(+by('seVolume').value/100,by('mute').checked);sfx.play(key);status.textContent='効果音：'+label;};card.append(title,button);document.getElementById('actionEffects').append(card);}
 const bgm=[...document.querySelectorAll('.tracks audio')],se=[...document.querySelectorAll('.effects audio')],all=[...bgm,...se];
 const by=id=>document.getElementById(id),status=by('status'),key='fushigi_audio_audition_v1';let request=0;
 try{const saved=JSON.parse(localStorage.getItem(key)||'{}');for(const name of ['bgmVolume','seVolume'])if(Number.isFinite(saved[name]))by(name).value=Math.max(0,Math.min(100,saved[name]));if(typeof saved.mute==='boolean')by('mute').checked=saved.mute;}catch{}
 function volumes(){const duck=(sfx.active.length||se.some(a=>!a.paused&&!a.ended))?.35:1;for(const a of bgm)a.volume=by('bgmVolume').value/100*duck;for(const a of se)a.volume=by('seVolume').value/100;for(const a of all)a.muted=by('mute').checked;for(const name of ['bgm','se'])by(name+'Value').value=by(name+'Volume').value+'%';}
 function save(){sfx.configure(+by('seVolume').value/100,by('mute').checked);volumes();try{localStorage.setItem(key,JSON.stringify({bgmVolume:+by('bgmVolume').value,seVolume:+by('seVolume').value,mute:by('mute').checked}));}catch{}}
 for(const id of ['bgmVolume','seVolume'])by(id).addEventListener('input',save);by('mute').addEventListener('change',save);
 function stop(){sfx.stop();request++;for(const a of all){a.pause();if(a.readyState)a.currentTime=0;}status.textContent='停止しました。';}
 by('stop').onclick=stop;
 by('loop').onchange=()=>{for(const a of bgm)a.loop=by('loop').checked;};
 for(const a of bgm){a.addEventListener('play',()=>{for(const other of bgm)if(other!==a)other.pause();a.closest('article').classList.add('playing');status.textContent='再生中：'+a.closest('article').querySelector('.name').textContent;volumes();});for(const ev of ['pause','ended'])a.addEventListener(ev,()=>a.closest('article').classList.remove('playing'));a.closest('article').querySelector('.seam').onclick=async()=>{const token=++request;try{await a.play();if(token===request&&Number.isFinite(a.duration))a.currentTime=Math.max(0,a.duration-5);}catch{status.textContent='再生できませんでした。再生ボタンでもう一度お試しください。';}};}
 for(const button of document.querySelectorAll('[data-se]'))button.onclick=async()=>{const a=by(button.dataset.se);for(const other of se){other.pause();if(other.readyState)other.currentTime=0;}try{await a.play();status.textContent='効果音：'+button.closest('article').querySelector('h3').textContent;}catch{status.textContent='効果音を再生できませんでした。';}};
 for(const a of se)for(const ev of ['play','pause','ended'])a.addEventListener(ev,volumes);
 for(const a of all)a.addEventListener('error',()=>{status.textContent='音源を読み込めませんでした。ページを再読み込みしてください。';});
 sfx.onChange=volumes;
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});sfx.configure(+by('seVolume').value/100,by('mute').checked);volumes();
})();

