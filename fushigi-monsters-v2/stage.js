(()=>{
 const tools=document.createElement('div');tools.id='monsterTools';tools.style.cssText='position:fixed;z-index:9;left:10px;top:125px;display:flex;flex-wrap:wrap;gap:5px;max-width:95vw;padding:7px;background:#1d251eea;border:1px solid #ad945e;font:12px sans-serif';
 tools.innerHTML='<select id="monsterFamily" aria-label="系統">'+Object.entries(MonsterRoster.names).map(([k,n])=>'<option value="'+k+'">'+n[0]+'</option>').join('')+'</select><select id="monsterTier" aria-label="段階">'+[1,2,3,4].map(n=>'<option value="'+n+'">ランク'+n+'</option>').join('')+'</select><button id="monsterSpawn">配置し直す</button><a href="fushigi-monsters-v2/preview.html" style="color:#ecd59b">図鑑</a><span>確認用・高HP</span>';
 for(const e of tools.querySelectorAll('select,button'))e.style.cssText='min-height:36px;background:#343d2c;color:#f1e5c4;border:1px solid #ad945e';
 document.body.append(tools);
 function spawn(){ExperienceReview.setup('room');const family=document.getElementById('monsterFamily').value,tier=+document.getElementById('monsterTier').value,kind=tier===1?family:family+'_'+tier;floorNo=ENEMIES[kind].from;player.hp=player.maxhp=999;enemies=[[11,8],[13,8],[15,10]].map(([x,y])=>{const hp=ENEMIES[kind].hp(floorNo);return {kind,x,y,vx:x,vy:y,hp,maxhp:hp,aware:false,lost:0,flash:0,fl:false,st:{},monsterFace:[0,1]};});floorItems=[];traps=[];updateVis();render();}
 document.getElementById('monsterSpawn').onclick=spawn;window.MonsterStage={spawn};
 const timer=setInterval(()=>{if(window.ExperienceReview&&MonsterSprites.ready&&ApprovedHero.ready&&DungeonExperience.ready&&CaveTerrain.ready){clearInterval(timer);spawn();}},100);
})();
