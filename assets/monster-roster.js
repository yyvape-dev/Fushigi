// Four explicit power ranks per family; each encounter remains a concrete kind.
(function(root){
 const colors={slime:['#5aa8ff','#83d553','#ee6b62','#b675ed'],goblin:['#4bb25a','#dc7659','#639cde','#a66ad0'],bat:['#9a6ad8','#d86565','#d3ae53','#657cb0'],blob:['#d070e0','#57bdd1','#e9a24e','#6f79aa'],skeleton:['#d6d0b5','#c79650','#6ca998','#7888b1'],archer:['#b2a34e','#bc6451','#6398bf','#9067b0'],thief:['#aa8665','#c27254','#668fa8','#8b70b0'],sleepy:['#8ca8d9','#cf6b68','#6ca58d','#aa78c9'],bomb:['#d08442','#c95b56','#638fbf','#7975a5'],ogre:['#c0623a','#628fc0','#75a26c','#9572b8'],dazzle:['#cc7bb2','#649dbd','#ccaa51','#8a76c3'],venom:['#c6b64d','#c65e58','#679fb9','#9675bd'],ghost:['#a0c8d9','#78b28c','#cf858e','#9481c1'],minotaur:['#a68151','#618da5','#b86053','#8870ac'],dragon:['#d56b42','#6aa5c7','#83a56e','#9471b4'],
  ninja:['#4d5a73','#b0524f','#4c82a8','#7a5aa8'],caster:['#8d6ad0','#cf6a8a','#5aa6c6','#d6b54c'],mimic:['#b98b4a','#c9684f','#5a98b4','#b89a3c'],summoner:['#d8b24a','#cf7a4f','#5aa07e','#a070c0'],charged:['#8aa0c8','#d09a4a','#6ac0c0','#c070b0'],cannon:['#7a8068','#b0624a','#5a7ea8','#8a6aa0']};
 const names={slime:['スライム','ライムスライム','ルビースライム','アメジストスライム'],goblin:['ゴブリン','あかゴブリン','あおゴブリン','ゴブリンロード'],bat:['コウモリ','あかコウモリ','こんじきコウモリ','やみコウモリ'],blob:['ブヨブヨ','あおブヨブヨ','だいだいブヨブヨ','くろブヨブヨ'],skeleton:['スケルトン','こはくスケルトン','ひすいスケルトン','スケルトンロード'],archer:['ゆみこぞう','あかゆみこぞう','あおゆみこぞう','ゆみの達人'],thief:['どろぼうタヌキ','あかぬすみタヌキ','あおぬすみタヌキ','おおどろぼうタヌキ'],sleepy:['ねむりダケ','あかねむりダケ','あおねむりダケ','まどろみ大王ダケ'],bomb:['ばくだん虫','あかばくだん虫','あおばくだん虫','くろがねばくだん虫'],ogre:['オーガ','あおオーガ','みどりオーガ','オーガタイラント'],dazzle:['めまいガエル','あおめまいガエル','きいろめまいガエル','まぼろしガエル'],venom:['どくバチ','あかどくバチ','あおどくバチ','どくバチクイーン'],ghost:['ゴースト','ひすいゴースト','あかゴースト','ナイトメアゴースト'],minotaur:['ミノタウロス','あおミノタウロス','あかミノタウロス','ミノタウロスキング'],dragon:['ドラゴン','あおドラゴン','みどりドラゴン','アビスドラゴン'],
  ninja:['ニンジャ','あかニンジャ','あおニンジャ','ジョウニン'],caster:['まじゅつ師','あかまじゅつ師','あおまじゅつ師','だいまじゅつ師'],mimic:['ミミック','あかミミック','あおミミック','キングミミック'],summoner:['すず坊主','あかすず坊主','あおすず坊主','すず大僧正'],charged:['いかずち岩','あかいかずち岩','あおいかずち岩','らいてい岩'],cannon:['おおづつ兵','あかおおづつ兵','あおおおづつ兵','おおづつ将軍']};
 // All families now have dedicated directional sprites, including the deep six.
 const noArt=new Set();
 const starts={1:[1,4,7,10],2:[2,5,8,11],3:[3,6,9,12],4:[4,7,10,12],5:[5,8,10,12],6:[6,8,10,12],8:[8,9,11,12],9:[9,10,11,12]};
 const roster={};
 root.MonsterRoster={roster,colors,names,noArt,resolve(kind){return roster[kind]||null;},install(enemies){
  for(const family of Object.keys(names)){
   const base={...enemies[family]},floors=base.starts||starts[base.from]||[base.from,base.from+3,base.from+6,base.from+9],hp=[1,1.35,1.75,2.2],attack=[1,1.18,1.4,1.65];
   for(let i=0;i<4;i++){
    const kind=i?family+'_'+(i+1):family,to=i===3?99:Math.max(floors[i],floors[i+1]+1),tier=i+1;
    const row={...base,name:names[family][i],family,tier,from:floors[i],to,w:base.w*(i===3?.65:1),col:colors[family][i],art:family,hue:0,flying:['bat','venom'].includes(family),bombScale:attack[i],range:base.range?base.range+Math.floor(i/2):base.ai==='archer'?6+Math.floor(i/2):base.ai==='breath'?4+Math.floor(i/2):0,summon:base.summon?[1,2,2,3][i]:0,fx:base.casts?base.casts[i]:undefined,statusTurns:base.ai==='sleepy'?5+Math.floor(i/2):8+i,hp:f=>Math.ceil(base.hp(f)*hp[i]),atk:f=>base.atk(f).map(v=>Math.max(1,Math.ceil(v*attack[i])+i)),def:base.def+i,exp:Math.ceil(base.exp*[1,1.6,2.4,3.5][i])};
    if(base.breath)row.breath=f=>base.breath(f).map(v=>Math.ceil(v*attack[i])+i);
    if(base.zap)row.zap=f=>base.zap(f).map(v=>Math.ceil(v*attack[i])+i);
    enemies[kind]=row;roster[kind]={kind,family,tier,color:colors[family][i],from:row.from,to};
   }
  }
  // The boss keeps its own approved crown/wing design, without a dragon tint.
  if(enemies.lord){enemies.lord.family='lord';enemies.lord.tier=1;enemies.lord.col=colors.dragon[3];roster.lord={kind:'lord',family:'lord',tier:1,color:colors.dragon[3],from:99,to:99};}
 }};
})(typeof window==='undefined'?globalThis:window);
