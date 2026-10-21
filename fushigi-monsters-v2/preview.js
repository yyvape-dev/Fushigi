(async()=>{
 const status=document.getElementById('status');
 try{
  const response=await fetch('catalog.json');if(!response.ok)throw Error('catalog');const rows=await response.json();Object.assign(MonsterRoster.roster,rows);
  await MonsterSprites.load();if(!MonsterSprites.ready)throw Error(MonsterSprites.error||'images');
  const groups=Object.groupBy?Object.groupBy(Object.values(rows),r=>r.family):Object.values(rows).reduce((a,r)=>((a[r.family]??=[]).push(r),a),{}),cards=[];
  const ai={melee:'近接',split:'分裂',archer:'弓矢',thief:'盗む',sleepy:'睡眠',bomb:'自爆',dazzle:'混乱',venom:'毒',ghost:'壁抜け',breath:'ブレス'};
  for(const [family,monsters]of Object.entries(groups)){
   const section=document.createElement('section');section.innerHTML='<h2>'+MonsterRoster.names[family][0]+'系統</h2><div class="ranks"></div>';
   for(const r of monsters){const article=document.createElement('article');article.style.setProperty('--color',r.color);article.innerHTML=`<span class="rank">RANK ${r.tier} / ${r.tier===1?'基本種':'上位種'}</span><div class="figure"><canvas width="256" height="256" aria-label="${r.name}"></canvas></div><h3>${r.name}</h3><p>${r.from}〜${r.to===99?'':r.to}階 · ${ai[r.ai]}</p><p>HP ${r.hp} · 攻撃 ${r.attack.join('〜')}<br>防御 ${r.defense} · 経験値 ${r.exp}</p>`;section.querySelector('.ranks').append(article);cards.push({kind:r.kind,g:article.querySelector('canvas').getContext('2d')});}
   document.getElementById('catalog').append(section);
  }
  window.MonsterReview={rows,cards};status.textContent='全60種を読み込みました。動作と向きを切り替えて比較できます。';let last=0;
  function frame(t){requestAnimationFrame(frame);if(document.hidden||t-last<80)return;last=t;const action=document.getElementById('action').value,D=['S','SW','W','NW','N','NE','E','SE'];const dir=document.getElementById('rotate').checked?D[Math.floor(t/1700)%8]:document.getElementById('direction').value;for(const {kind,g}of cards){g.clearRect(0,0,256,256);MonsterSprites.draw(g,kind,dir,128,224,192,action,t%(action==='attack'?300:320));}}
  requestAnimationFrame(frame);
 }catch(e){status.textContent='読み込みに失敗しました。再読み込みしてください。 '+e.message;console.error(e);}
})();
