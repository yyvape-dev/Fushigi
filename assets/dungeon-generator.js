// Layout modules produce logical cells. Art never changes collision.
(function(root){
 const THEMES=[
  {id:'slate',name:'苔むす洞窟',filter:'none',moss:'#617950'},
  {id:'sand',name:'乾いた岩窟',filter:'sepia(.25) saturate(.85) brightness(1.05)',moss:'#a28856'},
  {id:'deep',name:'青岩の洞窟',filter:'hue-rotate(20deg) saturate(.7) brightness(.9)',moss:'#657887'}
 ];
 function random(seed){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
 function generate(width,height,seed,depth=1){
  const rng=random(seed),int=(a,b)=>a+Math.floor(rng()*(b-a+1));
  // A bounded retry and a guaranteed connected fallback avoid unbounded generation.
  for(let attempt=0;attempt<32;attempt++){
   const map=Array.from({length:height},()=>Array(width).fill(0)),rooms=[],links=[];
   const target=int(5,9),style=int(0,2);
   for(let n=0;n<100&&rooms.length<target;n++){
    const w=int(4,9),h=int(3,6),x=int(1,width-w-2),y=int(1,height-h-2);
    if(rooms.some(o=>x<o.x+o.w+2&&x+w+2>o.x&&y<o.y+o.h+2&&y+h+2>o.y))continue;
    rooms.push({x,y,w,h,cx:x+(w>>1),cy:y+(h>>1),role:'ordinary'});
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)map[yy][xx]=1;
   }
   if(rooms.length<3)continue;
   function connect(a,b){
    let x=rooms[a].cx,y=rooms[a].cy;const end=rooms[b];
    const hz=()=>{while(x!==end.cx){x+=Math.sign(end.cx-x);map[y][x]=1;}};
    const vt=()=>{while(y!==end.cy){y+=Math.sign(end.cy-y);map[y][x]=1;}};
    if(rng()<.5){hz();vt();}else{vt();hz();}links.push([a,b]);
   }
   // Chain, branching tree, or a tree with loops, selected independently of art.
   for(let i=1;i<rooms.length;i++)connect(style===0?i-1:int(0,i-1),i);
   if(style===2)for(let n=0;n<2;n++){let a=int(0,rooms.length-1),b=int(0,rooms.length-1);if(a!==b)connect(a,b);}
   const theme=THEMES[int(0,THEMES.length-1)],artSeed=int(1,0x7fffffff);
   return {seed:seed>>>0,map,rooms,links,style:['chain','branch','loop'][style],theme,artSeed,depth};
  }
  const map=Array.from({length:height},()=>Array(width).fill(0)),rooms=[];
  for(let i=0;i<3;i++){const x=2+i*11,y=4;rooms.push({x,y,w:6,h:5,cx:x+3,cy:y+2,role:'ordinary'});for(let yy=y;yy<y+5;yy++)for(let xx=x;xx<x+6;xx++)map[yy][xx]=1;}
  for(let x=5;x<=27;x++)map[6][x]=1;
  return {seed,map,rooms,links:[[0,1],[1,2]],style:'fallback',theme:THEMES[0],artSeed:seed,depth};
 }
 root.DungeonGenerator={generate,random,themes:THEMES};
})(typeof window==='undefined'?globalThis:window);
