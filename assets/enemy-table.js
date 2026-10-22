// 敵の「階ごとの出現表」。シレン6と同じく、階ごとに「この階に出る敵」の一覧が決まっていて、その中から重みつきで抽選する。
// ここでは敵の種類ごとに「出る段階の範囲 [最初, 最後]」を書き、そこから段階ごとの一覧を作る（書き方が短いだけで、中身は表）。
// 「段階」はダンジョンの階を表の行へ対応させた値（DUNGEONS の stageK 倍。はじまり=1倍／ふかい=1.5倍／30階=1倍）。
// 4ランクの系統は、ランクが上がるたびに新しい範囲に入れ替わる（弱い敵は途中で消える）。T4 は長く残る。
(function(root){
 // 系統ごとに [登場する最初の段階, 最後の段階]。ランクは順に入れ替わる（T1→T2→T3→T4）。強いランクは早く出し過ぎない：
 // T2は4段階以降、T3は8段階以降、T4は12段階以降（それより前は1つ前のランクが続く）。T4 は最後の段階まで残る。
 // 同時に出るのは「系統ごとに1種」なので、その段階の種類数＝いま登場している系統の数（本家：序盤4〜5、中盤7〜9、深層9〜12）
 const F={
  slime:[1,11], goblin:[1,11], bat:[1,12], blob:[2,12],
  skeleton:[3,16], archer:[3,15], thief:[5,17], sleepy:[6,16], bomb:[7,14],
  ogre:[6,30], dazzle:[10,22], venom:[10,22], ghost:[12,30], minotaur:[13,30], dragon:[15,30],
  // 深層の系統（ここが本家の味噌：能力で苦しめる敵）
  ninja:[14,30], caster:[14,30], mimic:[15,30], summoner:[16,30], charged:[18,30], cannon:[20,30],
 };
 const W={};
 for(const [family,[a,b]] of Object.entries(F)){
  const r2=Math.max(a+3,4),r3=Math.max(r2+3,8),r4=Math.max(r3+3,12);
  W[family]=[[a,r2-1],[r2,r3-1],[r3,r4-1],[r4,Math.max(r4,b)]];
 }
 const STAGES=30,windows={},byStage=Array.from({length:STAGES+1},()=>[]);
 for(const [family,ranks] of Object.entries(W))ranks.forEach(([a,b],i)=>{const kind=i?family+'_'+(i+1):family;windows[kind]=[a,b];for(let s=a;s<=b;s++)byStage[s].push(kind);});
 const clamp=s=>Math.max(1,Math.min(STAGES,Math.round(s)));
 root.EnemyTable={STAGES,windows,families:Object.keys(W),
  kinds:stage=>byStage[clamp(stage)].slice(),                       // その段階に出る敵の一覧
  stageOf:(floor,k=1)=>clamp(floor*k),                              // 階 → 段階
  // 敵の定義に from/to（出る最初と最後の段階）を書き込む（表が正。他のコードや確認用）
  apply(enemies){for(const [kind,[a,b]] of Object.entries(windows))if(enemies[kind]){enemies[kind].from=a;enemies[kind].to=b;}}};
})(typeof window==='undefined'?globalThis:window);
