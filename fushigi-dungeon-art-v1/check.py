from pathlib import Path
from playwright.sync_api import sync_playwright
import json
P=Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1000,'height':600});errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('response',lambda r:failed.append(r.url) if '/cave-v1/' in r.url and r.status!=200 else None)
 page.goto('http://127.0.0.1:8001/fushigi-dungeon-v1/random-review.html')
 page.wait_for_function('document.getElementById("status").textContent.includes("seed ")',timeout=30000)
 frame=page.frames[1];frame.wait_for_function('CaveTerrain.ready && ApprovedHero.ready')
 frame.evaluate('''()=>{const original=Math.random;Math.random=DungeonGenerator.random(3121);try{newFloor();}finally{Math.random=original;}floorPlan.theme=DungeonGenerator.themes[0];fadeT=0;render();}''')
 page.evaluate('update()');page.wait_for_timeout(400);page.screenshot(path=str(P/'game-landscape.png'))
 # Test all 16 edge masks x 16 diagonal masks using the real renderer.
 report=frame.evaluate('''()=>{
  const out=document.createElement('canvas');out.width=out.height=1024;const g=out.getContext('2d');let count=0;
  for(let edges=0;edges<16;edges++)for(let diag=0;diag<16;diag++){
   const m=Array.from({length:3},()=>Array(3).fill(0));
   [[1,0],[2,1],[1,2],[0,1]].forEach(([x,y],i)=>m[y][x]=(edges>>i)&1);
   [[0,0],[2,0],[2,2],[0,2]].forEach(([x,y],i)=>m[y][x]=(diag>>i)&1);
   const t=CaveTerrain.topology(m,1,1);if(t.edges!==edges||t.diagonals!==diag)throw Error('topology');
   if(!CaveTerrain.draw(g,edges&4?'wallF':'wallT',diag*64,edges*64,64,{map:m,x:1,y:1,theme:DungeonGenerator.themes[0]}))throw Error('missing wall');count++;
  }
  const joins=[];
  for(const theme of DungeonGenerator.themes){
   const c=document.createElement('canvas');c.width=256;c.height=128;const h=c.getContext('2d');
   CaveTerrain.draw(h,'floor1',0,0,128,{map:[[1,1]],x:0,y:0,theme});CaveTerrain.draw(h,'floor2',128,0,128,{map:[[1,1]],x:1,y:0,theme});
   const d=h.getImageData(127,0,2,128).data;let max=0;for(let y=0;y<128;y++)for(let k=0;k<3;k++)max=Math.max(max,Math.abs(d[y*8+k]-d[y*8+4+k]));if(max>1)throw Error('floor seam '+max);joins.push({theme:theme.id,maxBoundaryDelta:max});
  }
  return {count,joins,atlas:out.toDataURL('image/png')};
 }''')
 import base64
 (P/'wall-connections.png').write_bytes(base64.b64decode(report.pop('atlas').split(',')[1]))
 # Real generation should remain reachable and artwork must not mutate the map.
 report['randomFloors']=frame.evaluate('''()=>{for(let i=0;i<40;i++){newFloor();const before=JSON.stringify(map);render();if(JSON.stringify(map)!==before)throw Error('art mutated collision');const d=distMap();if(!rooms.every(r=>d[r.cy][r.cx]>=0))throw Error('unreachable room');}return 40;}''')
 # Fixed room + width-one turning corridor, with the production drawing path.
 frame.evaluate('''()=>{map=Array.from({length:DH},()=>Array(DW).fill(WALL));for(let y=3;y<8;y++)for(let x=3;x<10;x++)map[y][x]=FLOOR;for(let x=10;x<=14;x++)map[5][x]=FLOOR;for(let y=6;y<=9;y++)map[y][14]=FLOOR;map[9][14]=STAIRS;rooms=[{x:3,y:3,w:7,h:5,cx:6,cy:5}];buildRoomGrid();enemies=[];floorItems=[];traps=[];floorShop=null;floorPlan.theme=DungeonGenerator.themes[0];player.x=player.vx=11;player.y=player.vy=5;seen=Array.from({length:DH},()=>Array(DW).fill(true));updateVis();fadeT=0;render();}''')
 page.wait_for_timeout(300);page.screenshot(path=str(P/'corridor.png'))
 frame.evaluate('player.x=player.vx=14;player.y=player.vy=8;updateVis();render()');page.wait_for_timeout(200);page.screenshot(path=str(P/'stairs.png'))
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(250);page.screenshot(path=str(P/'game-portrait.png'))
 report['errors']=errors;report['failedArtRequests']=failed
 assert not errors and not failed,(errors,failed)
 (P/'validation.json').write_text(json.dumps(report,indent=2))
 b.close()
print('ALL OK: 256 wall joins, 3 theme floor seams, 40 generated floors, portrait/landscape, corridor and stairs')
