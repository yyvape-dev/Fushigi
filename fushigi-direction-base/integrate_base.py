from pathlib import Path
import json,difflib
r=Path(__file__).parent;s=(r/'game-original.html').read_text();original=s
meta=json.loads((r/'assets'/'hero-base'/'base.json').read_text())
loader='''
// Canonical idle-only directional base; future animation will retain these anchors.
const HERO_BASE_META = __META__, HERO_BASE_IMAGES = {}, HERO_BASE_EQUIPMENT = {};
let heroBaseRenderer = null;
const heroBasePreview = {weapon:false,shield:false,debug:false};
function heroBaseReady() {return !!heroBaseRenderer && rigPref===0;}
function heroBaseDirection(face) {const [dx,dy]=face||[0,1];return HERO_BASE_META.directions[(Math.round(Math.atan2(-dx,dy)/(Math.PI/4))+8)%8].id;}
function loadHeroBase() {
  if(typeof Image==='undefined'||typeof HeroBaseRenderer==='undefined')return;
  const check=()=>{if(HERO_BASE_META.directions.every(d=>HERO_BASE_IMAGES[d.id])){heroBaseRenderer=new HeroBaseRenderer(HERO_BASE_META,HERO_BASE_IMAGES,HERO_BASE_EQUIPMENT);render();}};
  for(const d of HERO_BASE_META.directions){const im=new Image();im.onload=()=>{HERO_BASE_IMAGES[d.id]=im;check();};im.src='assets/hero-base/'+d.id+'.png';}
  for(const name of ['weapon','shield']){const im=new Image();im.onload=()=>{HERO_BASE_EQUIPMENT[name]=im;render();};im.src='assets/hero-base/'+HERO_BASE_META.equipmentAssets[name].path;}
}
'''.replace('__META__',json.dumps(meta))
mark='// キャラを1体描く：';assert s.count(mark)==1;s=s.replace(mark,loader+'\n'+mark)
s=s.replace('function drawChar(key, x, y, g, k, e, t) {',"function drawChar(key, x, y, g, k, e, t) {\n  if(key==='player' && heroBaseReady()){heroBaseRenderer.draw(g,heroBaseDirection(e.face),x+TS/2,y+TS*.9,TS*k,{weapon:heroBasePreview.weapon,shield:heroBasePreview.shield,debug:heroBasePreview.debug});return;}")
s=s.replace('if (e.fl) { ctx.translate',"if (e.fl && !(key==='player' && heroBaseReady())) { ctx.translate")
s=s.replace('const hop = d > 0.001',"const hop = !(key==='player' && heroBaseReady()) && d > 0.001")
s=s.replace("<script>\n'use strict';","<script>\n'use strict';")
# Classic script is intentionally used, to work on simple static hosting.
start=s.index('<script>');s=s[:start]+'<script src="hero-base-renderer.js"></script>\n'+s[start:]
s=s.replace('loadRig();\nboot();','loadRig();\nboot();\nloadHeroBase();')
s=s.replace('パーツ＝歩き・攻撃・装備が動く／1枚絵＝assets/player.png をそのまま表示','方向別の基準絵（待機のみ）／1枚絵＝assets/player.png')
s=s.replace("${rigPref ? '1枚絵' : 'パーツ'}","${rigPref ? '1枚絵' : '基準絵'}")
(r/'game-base.html').write_text(s)
(r/'integration.patch').write_text(''.join(difflib.unified_diff(original.splitlines(True),s.splitlines(True),fromfile='a/index.html',tofile='b/index.html')))
print('Generated idle-only local integration. Diagnostic equipment is opt-in, not connected to inventory.')
