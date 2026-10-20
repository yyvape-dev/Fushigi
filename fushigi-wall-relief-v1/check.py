from pathlib import Path
from playwright.sync_api import sync_playwright
import json,base64
P=Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1100,'height':720});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8001/fushigi-dungeon-v1/random-review.html')
 page.wait_for_function('document.getElementById("status").textContent.includes("seed ")')
 f=page.frames[1];f.wait_for_function('CaveTerrain.ready && HeroActions.ready')
 report=f.evaluate('''()=>{
 const c=document.createElement('canvas');c.width=1024;c.height=1024;const g=c.getContext('2d');let partial=0,full=0;const areas=[];
 for(let e=0;e<16;e++)for(let d=0;d<16;d++){
 const m=Array.from({length:3},()=>Array(3).fill(0));
 [[1,0],[2,1],[1,2],[0,1]].forEach(([x,y],i)=>m[y][x]=(e>>i)&1);
 [[0,0],[2,0],[2,2],[0,2]].forEach(([x,y],i)=>m[y][x]=(d>>i)&1);
 const before=JSON.stringify(m),mask=CaveTerrain.footprint(m,1,1,123),data=mask.getContext('2d').getImageData(0,0,128,128).data;
 let sum=0;for(let i=3;i<data.length;i+=4)sum+=data[i]/255;
 const area=sum/16384;areas.push(area);if(e===0&&d===0){if(area!==1)throw Error('interior not full');full++;}else if(area<.9)partial++;
 if(JSON.stringify(m)!==before)throw Error('collision mutated');
 const x=d*64,y=e*64;g.fillStyle='#a78256';g.fillRect(x,y,64,64);g.drawImage(mask,x,y,64,64);g.strokeStyle='#dff8ff';g.strokeRect(x,y,64,64);
 }
 if(partial<220)throw Error('not enough partial masks '+partial);
 // Cutters are owned by floor coordinates; edges match across adjacent wall cells.
 let shared=0;for(let seed=0;seed<20;seed++){
 const m=[[0,1,0,0],[0,0,0,0],[0,0,0,0]],a=CaveTerrain.footprint(m,1,1,seed).getContext('2d').getImageData(0,0,128,128).data,b=CaveTerrain.footprint(m,2,1,seed).getContext('2d').getImageData(0,0,128,128).data;
 let mismatch=0;for(let y=0;y<128;y++){if(Math.abs(a[(y*128+127)*4+3]-b[(y*128)*4+3])>70)mismatch++;shared++;}if(mismatch>4)throw Error('shared edge gap '+mismatch); /* edge pixel centres are 1px apart; allow contour antialias */}
 return {partial,full,shared,minimumArea:Math.min(...areas),image:c.toDataURL()};}''')
 (P/'masks.png').write_bytes(base64.b64decode(report.pop('image').split(',')[1]))
 f.evaluate('''()=>{const orig=Math.random;Math.random=DungeonGenerator.random(3121);try{newFloor();}finally{Math.random=orig;}map=Array.from({length:DH},()=>Array(DW).fill(WALL));for(let y=3;y<8;y++)for(let x=3;x<10;x++)map[y][x]=FLOOR;for(let x=10;x<=14;x++)map[5][x]=FLOOR;for(let y=5;y<=10;y++)map[y][14]=FLOOR;rooms=[{x:3,y:3,w:7,h:5,cx:6,cy:5}];buildRoomGrid();enemies=[];floorItems=[];traps=[];floorShop=null;player.x=player.vx=8;player.y=player.vy=5;seen=Array.from({length:DH},()=>Array(DW).fill(true));updateVis();fadeT=0;}''')
 for theme in ['forest','limestone','ruins','ice','volcano']:
  page.select_option('#location',theme);page.wait_for_timeout(120);page.screenshot(path=str(P/(theme+'.png')))
 page.click('#grid');assert f.evaluate('window.reviewGrid')
 page.screenshot(path=str(P/'grid.png'))
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(P/'portrait.png'))
 report['errors']=errors;assert not errors,errors
 (P/'validation.json').write_text(json.dumps(report,indent=2));print(report)
 b.close()
