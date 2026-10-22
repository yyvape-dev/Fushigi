// Layout modules produce logical cells. Art never changes collision.
// 地形生成：マップを cols×rows の区画に分け、区画ごとに「部屋」か「通路の曲がり角（ノード）」を置き、
// 隣り合う区画を、部屋の壁に開けた出入口どうしで結ぶ。部屋が全体に散らばり、通路が他の部屋を貫かない。
// 戻り値の形（map / rooms[{x,y,w,h,cx,cy,role}] / links / style / theme / artSeed / depth）は従来のまま。
(function(root){
 const THEMES=[{"id": "forest", "name": "苔むす樹林", "filter": "none"}, {"id": "limestone", "name": "鍾乳洞", "filter": "none"}, {"id": "ruins", "name": "風化遺跡", "filter": "none"}, {"id": "ice", "name": "氷晶洞", "filter": "none"}, {"id": "volcano", "name": "火山洞", "filter": "none"}];
 const D4=[[1,0],[-1,0],[0,1],[0,-1]];
 const STYLES=['chain','branch','loop'];
 function random(seed){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}

 // 全床マスが1つの塊か（連結性の検証）
 function isConnected(map,width,height){
  let total=0,sx=-1,sy=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(map[y][x]){total++;if(sx<0){sx=x;sy=y;}}
  if(!total)return false;
  const seen=Array.from({length:height},()=>Array(width).fill(false)),q=[[sx,sy]];seen[sy][sx]=true;let n=0;
  while(q.length){const [x,y]=q.pop();n++;for(const [dx,dy] of D4){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<width&&ny<height&&map[ny][nx]&&!seen[ny][nx]){seen[ny][nx]=true;q.push([nx,ny]);}}}
  return n===total;
 }

 function gridPlan(width,height,seed,depth,rng){
  const int=(a,b)=>a+Math.floor(rng()*(b-a+1)),chance=p=>rng()<p;
  const cols=Math.max(2,Math.round(width/14)),rows=Math.max(2,Math.round(height/10));
  const secs=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
   const x0=Math.floor(c*width/cols),x1=Math.floor((c+1)*width/cols),y0=Math.floor(r*height/rows),y1=Math.floor((r+1)*height/rows);
   secs.push({id:r*cols+c,c,r,x:x0,y:y0,w:x1-x0,h:y1-y0,kind:'',room:null,nx:0,ny:0,doors:{}});
  }
  const at=(c,r)=>c>=0&&r>=0&&c<cols&&r<rows?secs[r*cols+c]:null;
  const nbr=s=>D4.map(([dx,dy])=>at(s.c+dx,s.r+dy)).filter(Boolean);
  const adj=new Map(secs.map(s=>[s.id,new Set()])),alive=new Set();
  const link=(a,b)=>{adj.get(a.id).add(b.id);adj.get(b.id).add(a.id);};
  const unlink=(a,b)=>{adj.get(a.id).delete(b.id);adj.get(b.id).delete(a.id);};
  const styleIndex=int(0,2),style=STYLES[styleIndex];

  if(style==='chain'){
   // 蛇行で全区画を1本の道にし、末尾を数区画切り落とす（空白の区画ができる）
   const colsFirst=chance(.5),outer=colsFirst?cols:rows,inner=colsFirst?rows:cols,flipO=chance(.5),flipI=chance(.5),order=[];
   for(let o=0;o<outer;o++){
    const oo=flipO?outer-1-o:o;
    for(let i=0;i<inner;i++){
     const ii=((o%2===0)!==flipI)?i:inner-1-i;
     order.push(colsFirst?at(oo,ii):at(ii,oo));
    }
   }
   if(chance(.5))order.reverse();
   const keep=Math.max(5,order.length-int(0,Math.floor(order.length*.4)));
   order.length=Math.min(order.length,keep);
   order.forEach(s=>alive.add(s.id));
   for(let i=1;i<order.length;i++)link(order[i-1],order[i]);
  }else{
   // 枝分かれ：ランダムな全域木。端の区画を一部切り落として空白を作る
   const start=secs[int(0,secs.length-1)],inTree=new Set([start.id]),frontier=[];
   const pushF=s=>{for(const n of nbr(s))if(!inTree.has(n.id))frontier.push([s,n]);};
   pushF(start);
   while(frontier.length){
    const [a,b]=frontier.splice(int(0,frontier.length-1),1)[0];
    if(inTree.has(b.id))continue;
    inTree.add(b.id);link(a,b);pushF(b);
   }
   secs.forEach(s=>alive.add(s.id));
   const floorCount=Math.ceil(secs.length*.7);
   for(const s of secs.slice().sort(()=>rng()-.5)){
    if(alive.size<=floorCount)break;
    if(adj.get(s.id).size===1&&chance(.25)){
     const [nid]=[...adj.get(s.id)];unlink(s,secs[nid]);alive.delete(s.id);
    }
   }
   if(style==='loop'){
    // 環状：木に、隣り合う区画どうしの近道を2〜3本足す
    const cand=[];
    for(const a of secs)if(alive.has(a.id))for(const b of nbr(a))if(a.id<b.id&&alive.has(b.id)&&!adj.get(a.id).has(b.id))cand.push([a,b]);
    cand.sort(()=>rng()-.5);
    for(let k=0;k<Math.min(cand.length,int(2,3));k++)link(cand[k][0],cand[k][1]);
   }
  }

  // 区画の種類：端（次数1）は必ず部屋。それ以外は一定確率で「曲がり角」にする
  const act=secs.filter(s=>alive.has(s.id)),minRooms=Math.max(5,Math.ceil(act.length*.6));
  let roomCount=act.length;
  for(const s of act)s.kind='room';
  for(const s of act.slice().sort(()=>rng()-.5)){
   if(adj.get(s.id).size>=2&&roomCount-1>=minRooms&&chance(.25)){s.kind='node';roomCount--;}
  }
  const map=Array.from({length:height},()=>Array(width).fill(0)),put=(x,y)=>{map[y][x]=1;};
  // 部屋の形：長方形の外枠(x,y,w,h)の隅を削って L字・十字にする。外枠(rooms の x,y,w,h)は変えない
  const clear=(x0,y0,x1,y1)=>{for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++)map[yy][xx]=0;};
  const refill=R=>{for(let yy=R.y;yy<R.y+R.h;yy++)for(let xx=R.x;xx<R.x+R.w;xx++)put(xx,yy);};
  const carveShape=R=>{
   const {x,y,w,h}=R;
   if(w>=7&&h>=5&&chance(.2)){                    // 十字：四隅を削る。腕の太さは3マス以上
    const cw=int(1,Math.floor((w-3)/2)),ch=int(1,Math.floor((h-3)/2));
    clear(x,y,x+cw-1,y+ch-1);clear(x+w-cw,y,x+w-1,y+ch-1);clear(x,y+h-ch,x+cw-1,y+h-1);clear(x+w-cw,y+h-ch,x+w-1,y+h-1);
    R.shape='cross';
   }else if(w>=6&&h>=4&&chance(.25)){             // L字：1つの隅を削る。腕の太さは2マス以上
    const cw=int(2,w-2),ch=int(1,h-2),left=chance(.5),top=chance(.5);
    clear(left?x:x+w-cw,top?y:y+h-ch,left?x+cw-1:x+w-1,top?y+ch-1:y+h-1);
    R.shape='L';
   }
   if(!map[R.cy][R.cx]){refill(R);R.shape='rect';}   // 中心（階段・店の位置）が床でなければ長方形に戻す
  };
  for(const s of act){
   const iw=s.w-4,ih=s.h-4;                      // 区画の縁から2マスは空ける（隣の部屋と通路の余白）
   if(s.kind==='room'){
    const w=int(4,Math.min(10,iw)),h=int(3,Math.min(6,ih)),x=s.x+2+int(0,iw-w),y=s.y+2+int(0,ih-h);
    s.room={x,y,w,h,cx:x+(w>>1),cy:y+(h>>1),role:'ordinary',shape:'rect'};
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy);
    carveShape(s.room);
   }else{s.nx=s.x+2+int(0,iw-1);s.ny=s.y+2+int(0,ih-1);}
  }
  // 出入口：部屋の壁の外側1マス。区画の各辺に最大1本
  const door=(s,dir)=>{
   if(s.kind==='node')return {x:s.nx,y:s.ny};
   if(s.doors[dir])return s.doors[dir];
   const R=s.room,pick=a=>a[int(0,a.length-1)];
   const col=x=>{const a=[];for(let yy=R.y;yy<R.y+R.h;yy++)if(map[yy][x])a.push(yy);return a;};   // 辺に沿った床のある行・列だけを出入口の候補にする
   const row=y=>{const a=[];for(let xx=R.x;xx<R.x+R.w;xx++)if(map[y][xx])a.push(xx);return a;};
   let p;
   if(dir==='E')p={x:R.x+R.w,y:pick(col(R.x+R.w-1))};
   else if(dir==='W')p={x:R.x-1,y:pick(col(R.x))};
   else if(dir==='S')p={x:pick(row(R.y+R.h-1)),y:R.y+R.h};
   else p={x:pick(row(R.y)),y:R.y-1};
   return s.doors[dir]=p;
  };
  const hline=(y,x0,x1)=>{for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)put(x,y);};
  const vline=(x,y0,y1)=>{for(let y=Math.min(y0,y1);y<=Math.max(y0,y1);y++)put(x,y);};
  const carve=(a,b)=>{                            // a が西／北、b が東／南
   const horizontal=a.r===b.r,pa=door(a,horizontal?'E':'S'),pb=door(b,horizontal?'W':'N');
   if(horizontal){
    const lo=pa.x+1,hi=pb.x-1,xm=lo<=hi?int(lo,hi):(pa.x+pb.x)>>1;   // 両端から1マスは離す（曲がり角の腕が重ならない・壁に沿わない）
    hline(pa.y,pa.x,xm);vline(xm,pa.y,pb.y);hline(pb.y,xm,pb.x);
   }else{
    const lo=pa.y+1,hi=pb.y-1,ym=lo<=hi?int(lo,hi):(pa.y+pb.y)>>1;
    vline(pa.x,pa.y,ym);hline(ym,pa.x,pb.x);vline(pb.x,ym,pb.y);
   }
  };
  const edges=[];
  for(const a of act)for(const bid of adj.get(a.id)){const b=secs[bid];if(a.id<bid){edges.push(b.c<a.c||b.r<a.r?[b,a]:[a,b]);}}
  for(const [a,b] of edges)carve(a,b);

  // 部屋の並び順をシャッフル（開始部屋が毎回左上になるのを防ぐ）
  const roomSecs=act.filter(s=>s.kind==='room');
  for(let i=roomSecs.length-1;i>0;i--){const j=int(0,i);[roomSecs[i],roomSecs[j]]=[roomSecs[j],roomSecs[i]];}
  const rooms=roomSecs.map(s=>s.room),index=new Map(roomSecs.map((s,i)=>[s.id,i])),links=[];
  for(const [a,b] of edges)if(a.kind==='room'&&b.kind==='room')links.push([index.get(a.id),index.get(b.id)]);
  const nodes=act.filter(s=>s.kind==='node').map(s=>({x:s.nx,y:s.ny}));
  const theme=THEMES[(depth-1)%THEMES.length],artSeed=int(1,0x7fffffff);
  return {seed:seed>>>0,map,rooms,links,nodes,grid:{cols,rows},style,theme,artSeed,depth};
 }

 // 旧方式（ランダムな長方形＋中心から中心のL字通路）。小さなマップ用と、グリッド方式が失敗したときの退避用
 function legacyPlan(width,height,seed,depth,rng){
  const int=(a,b)=>a+Math.floor(rng()*(b-a+1));
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
   const connect=(a,b)=>{
    let x=rooms[a].cx,y=rooms[a].cy;const end=rooms[b];
    const hz=()=>{while(x!==end.cx){x+=Math.sign(end.cx-x);map[y][x]=1;}};
    const vt=()=>{while(y!==end.cy){y+=Math.sign(end.cy-y);map[y][x]=1;}};
    if(rng()<.5){hz();vt();}else{vt();hz();}links.push([a,b]);
   };
   for(let i=1;i<rooms.length;i++)connect(style===0?i-1:int(0,i-1),i);
   if(style===2)for(let n=0;n<2;n++){let a=int(0,rooms.length-1),b=int(0,rooms.length-1);if(a!==b)connect(a,b);}
   const theme=THEMES[(depth-1)%THEMES.length],artSeed=int(1,0x7fffffff);
   return {seed:seed>>>0,map,rooms,links,nodes:[],grid:null,style:STYLES[style],theme,artSeed,depth};
  }
  const map=Array.from({length:height},()=>Array(width).fill(0)),rooms=[];
  for(let i=0;i<3;i++){const x=2+i*11,y=4;rooms.push({x,y,w:6,h:5,cx:x+3,cy:y+2,role:'ordinary'});for(let yy=y;yy<y+5;yy++)for(let xx=x;xx<x+6;xx++)map[yy][xx]=1;}
  for(let x=5;x<=27;x++)map[6][x]=1;
  return {seed,map,rooms,links:[[0,1],[1,2]],nodes:[],grid:null,style:'fallback',theme:THEMES[0],artSeed:seed,depth};
 }

 function generate(width,height,seed,depth=1){
  const rng=random(seed);
  // 区画の余白(縁2マス)を引いても部屋(4×3)が入る大きさのときだけグリッド方式を使う
  if(width>=32&&height>=20){
   // A bounded retry and a guaranteed fallback avoid unbounded generation.
   for(let attempt=0;attempt<16;attempt++){
    const plan=gridPlan(width,height,seed,depth,rng);
    if(plan.rooms.length>=5&&isConnected(plan.map,width,height))return plan;
   }
  }
  return legacyPlan(width,height,seed,depth,rng);
 }
 root.DungeonGenerator={generate,random,themes:THEMES,isConnected};
})(typeof window==='undefined'?globalThis:window);
