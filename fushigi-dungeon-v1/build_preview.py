from pathlib import Path
import base64,json,hashlib
P=Path(__file__).resolve().parent
source=(P.parent/'index.html').read_text()
layout=json.loads((P/'layout.json').read_text())
tiles={name:'data:image/png;base64,'+base64.b64encode((P/(name+'.png')).read_bytes()).decode() for name in ['floor0','floor1','floor2','floor3','wallF','wallT']}
script='''
// Preview uses the main game's camera, input, collision and visibility routines.
const DUNGEON_ART = ART_DATA;
const previewImages={};
const originalBlit=blit;
blit=function(key,px,py,g=ctx,k=1){
 if(previewImages[key]?.complete && previewImages[key].naturalWidth){g.imageSmoothingEnabled=true;g.drawImage(previewImages[key],px,py,TS,TS);return;}
 originalBlit(key,px,py,g,k);
};
for(const [key,url] of Object.entries(DUNGEON_ART)){const im=new Image();previewImages[key]=im;im.onload=()=>render();im.src=url;}
scene='dungeon';MW=DW;MH=DH;floorNo=1;turn=0;floorLight=false;
map=Array.from({length:DH},()=>Array(DW).fill(WALL));
for(const [x,y] of WALK_DATA)map[y][x]=FLOOR;
rooms=[{x:3,y:3,w:7,h:5,cx:6,cy:5}];buildRoomGrid();
enemies=[];floorItems=[];traps=[];logs=[];fx.length=0;vfx.length=0;
player.x=player.vx=6;player.y=player.vy=5;
seen=Array.from({length:DH},()=>Array(DW).fill(false));
zoomPref=0;charPref=2;shadePref=1;mapMode=1;fadeT=0;
updateVis();resize();render();
const originalDraw=draw;let gridOn=false;
draw=function(){originalDraw();if(!gridOn)return;const cx=Math.round(innerWidth/2-(player.vx+.5)*TS),cy=Math.round(focusY()-(player.vy+.5)*TS);ctx.strokeStyle='#ffe7a575';ctx.lineWidth=1;for(const [x,y] of WALK_DATA)ctx.strokeRect(cx+x*TS,cy+y*TS,TS,TS);};
document.getElementById('gridToggle').onclick=()=>{gridOn=!gridOn;render();};
document.getElementById('artToggle').onclick=()=>{blit=blit===originalBlit?previewBlit:originalBlit;render();};
const previewBlit=blit;
document.getElementById('resetPreview').onclick=()=>location.reload();
'''.replace('ART_DATA',json.dumps(tiles)).replace('WALK_DATA',json.dumps(layout['walk']))
source=source.replace('<title>Fushigi Core</title>','<title>Fushigi | 部屋＋通路 v1</title><base href="https://yyvape-dev.github.io/Fushigi/">')
source=source.replace("'fushigi_core_save_v1'","'fushigi_dungeon_preview_v1'")
source=source.replace('function saveGame() {','function saveGame() { return; // isolated visual preview\n')
source=source.replace('</body>','<div style="position:fixed;top:64px;right:8px;z-index:5;display:flex;gap:4px"><button class="sm" id="gridToggle">マス線</button><button class="sm" id="artToggle">元絵と比較</button><button class="sm" id="resetPreview">開始位置</button></div><script>'+script+'</script></body>')
(P/'preview.html').write_text(source)
(P/'source-record.json').write_text(json.dumps({'mainCommit':'8371630377ba8210159bc471ab5503b29e16635a','indexSha256':hashlib.sha256((P.parent/'index.html').read_bytes()).hexdigest(),'room':[7,5],'corridorWidth':1,'projection':'square grid, orthographic overhead floor; wall face separately baked','art':'Blender procedural stone model and Cycles renders; no AI image editing'},indent=2))
