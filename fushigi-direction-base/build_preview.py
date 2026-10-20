from pathlib import Path
import base64,json
r=Path(__file__).parent
def data(p):return 'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()
meta=json.loads((r/'assets/hero-base/base.json').read_text())
images={d['id']:data(r/'assets/hero-base'/(d['id']+'.png')) for d in meta['directions']}
eq={k:data(r/'assets/hero-base'/meta['equipmentAssets'][k]['path']) for k in ['weapon','shield']}
html='''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fushigi 主人公・8方向の基準</title><style>*{box-sizing:border-box}body{margin:0;background:#192226;color:#f0ebdf;font:16px system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:25px 20px}.eyebrow{font-size:12px;color:#e7bd74;letter-spacing:2px}h1{font-size:28px;margin:10px 0}h2{font-size:19px;margin:24px 0 10px}p{color:#bac7c9;line-height:1.8}.controls{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:20px 0}select,button{padding:9px 12px;background:#2b3a40;color:#fff;border:1px solid #64787c;border-radius:7px;font:inherit}label{display:inline-flex;align-items:center;gap:6px}canvas{display:block;width:100%;height:auto;background:#e8e3d9;border-radius:12px}.two{display:grid;grid-template-columns:1fr 1fr;gap:18px}.note{background:#26353a;padding:12px 18px;border-radius:10px}a{color:#eac67d}@media(max-width:700px){.two{grid-template-columns:1fr}}</style>
<main><div class="eyebrow">FUSHIGI / CANONICAL IDLE BASE v1</div><h1>8方向のスタート絵</h1><p>足元と身長を固定し、武器・盾を別画像で持たせるための基準です。歩行・攻撃はまだ作りません。</p>
<div class="controls"><select id="dir" aria-label="方向"></select><select id="tile" aria-label="1マスのサイズ"><option value="48">1マス 48px</option><option value="64" selected>1マス 64px</option><option value="96">1マス 96px</option></select><select id="height" aria-label="キャラの高さ"><option value="1.3">身長 1.3マス</option><option value="1.5" selected>身長 1.5マス</option><option value="1.8">身長 1.8マス</option></select><label><input id="weapon" type="checkbox">仮の武器</label><label><input id="shield" type="checkbox">仮の盾</label><label><input id="debug" type="checkbox">接続位置</label></div>
<div class="two"><section><h2>町でのサイズ確認</h2><canvas id="town" width="520" height="390"></canvas></section><section><h2>基準絵・装備の取り付け</h2><canvas id="detail" width="520" height="390"></canvas></section></div>
<h2>同じ足元・身長で8方向を比較</h2><canvas id="all" width="1024" height="560"></canvas><p id="info"></p>
<div class="note"><p>青＝本人の右手（武器）、橙＝本人の左手（盾）、黄＝足元。装備の画像は重ね順と握り位置を見るための仮絵です。盾の向き別の完成アートは別途必要です。</p><p><a href="game-base.html">実ゲームの確認版を開く</a> · <a href="BASE_CONTRACT.md">画像と装備の基準</a> · <a href="README.md">使い方と検証結果</a></p></div></main>
<script>__RENDERER__</script><script>
const META=__META__,SOURCES=__IMAGES__,EQUIPS=__EQUIPS__,TOWN_SOURCE=__TOWN__;
const controls=Object.fromEntries(['dir','tile','height','weapon','shield','debug'].map(id=>[id,document.getElementById(id)]));for(const d of META.directions){const opt=document.createElement('option');opt.value=d.id;opt.textContent=d.id;controls.dir.append(opt);}
const images={},equipment={};let renderer,loaded=0;const expected=11;function ready(){if(++loaded===expected){renderer=new HeroBaseRenderer(META,images,equipment);draw();}}
for(const [id,src]of Object.entries(SOURCES)){const im=new Image();im.onload=ready;im.src=src;images[id]=im;}for(const [id,src]of Object.entries(EQUIPS)){const im=new Image();im.onload=ready;im.src=src;equipment[id]=im;}const townImage=new Image();townImage.onload=ready;townImage.src=TOWN_SOURCE;
function grid(g,w,h,size){g.fillStyle='#e8e3d9';g.fillRect(0,0,w,h);g.strokeStyle='#ccc6b7';g.lineWidth=1;for(let x=0;x<w;x+=size){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}for(let y=0;y<h;y+=size){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}}
function shadow(g,x,y,size){g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(x,y,size*.32,size*.10,0,0,Math.PI*2);g.fill();}
function draw(){if(!renderer)return;const ts=+controls.tile.value,k=+controls.height.value,id=controls.dir.value,opts={weapon:controls.weapon.checked,shield:controls.shield.checked,debug:controls.debug.checked};
 const g=document.getElementById('town').getContext('2d');g.clearRect(0,0,520,390);const cx=260-(11.5)*ts,cy=195-(8.5)*ts;g.drawImage(townImage,cx,cy,22*ts,15*ts);g.strokeStyle='rgba(255,235,120,.8)';g.strokeRect(260-ts/2,195-ts/2,ts,ts);shadow(g,260,195+ts*.4,ts);renderer.draw(g,id,260,195+ts*.4,ts*k,opts);
 const d=document.getElementById('detail').getContext('2d');grid(d,520,390,64);renderer.draw(d,id,260,330,260,opts);d.fillStyle='#596564';d.font='14px system-ui';d.fillText('拡大表示：位置合わせ用',15,25);
 const a=document.getElementById('all').getContext('2d');grid(a,1024,560,64);for(const row of META.directions){const x=(row.index%4)*256+128,y=Math.floor(row.index/4)*280+216;shadow(a,x,y,ts);renderer.draw(a,row.id,x,y,ts*k,opts);a.fillStyle='#414c4c';a.textAlign='center';a.font='15px system-ui';a.fillText(row.id,x,Math.floor(row.index/4)*280+259);}
 const row=META.directions.find(d=>d.id===id);document.getElementById('info').textContent=`${id} / 身長 ${ts*k}px / 武器 ${row.right.layer==='front'?'手前':'奥'}・盾 ${row.left.layer==='front'?'手前':'奥'} / 足元 (128,224)`;
}for(const c of Object.values(controls))c.addEventListener('change',draw);
</script></html>'''
for key,value in {'__RENDERER__':(r/'hero-base-renderer.js').read_text(),'__META__':json.dumps(meta),'__IMAGES__':json.dumps(images),'__EQUIPS__':json.dumps(eq),'__TOWN__':json.dumps(data(r/'assets'/'town.png'))}.items():html=html.replace(key,value)
(r/'preview.html').write_text(html);print('Built self-contained direction/size/equipment preview.')
