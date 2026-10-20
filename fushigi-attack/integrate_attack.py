from pathlib import Path
import json,difflib
R=Path(__file__).parent;s=(R/'game-original.html').read_text();original=s
base=json.loads((R/'assets/hero-base/base.json').read_text());motion=json.loads((R/'assets/hero-attack/attack.json').read_text())
loader='''
const HERO_BASE_META=__BASE__, HERO_ATTACK_META=__MOTION__;
const HERO_BASE_IMAGES={},HERO_ATTACK_IMAGES={},HERO_EQUIPMENT={};let heroAttackRenderer=null;
const heroAttackPreview={weapon:typeof location!=='undefined'&&new URLSearchParams(location.search).get('testWeapon')==='1',shield:false,debug:false};
function heroAttackReady(){return !!heroAttackRenderer&&rigPref===0;}
function heroAttackDirection(face){const [dx,dy]=face||[0,1];return HERO_BASE_META.directions[(Math.round(Math.atan2(-dx,dy)/(Math.PI/4))+8)%8].id;}
function loadHeroAttack(){
 if(typeof Image==='undefined'||typeof HeroAttackRenderer==='undefined')return;
 function check(){if(HERO_BASE_META.directions.every(d=>HERO_BASE_IMAGES[d.id]&&HERO_ATTACK_IMAGES[d.id])){heroAttackRenderer=new HeroAttackRenderer(HERO_BASE_META,HERO_BASE_IMAGES,HERO_ATTACK_META,HERO_ATTACK_IMAGES,HERO_EQUIPMENT);render();}}
 for(const d of HERO_BASE_META.directions){for(const [folder,cache]of [['hero-base',HERO_BASE_IMAGES],['hero-attack',HERO_ATTACK_IMAGES]]){const im=new Image();im.onload=()=>{cache[d.id]=im;check()};im.src='assets/'+folder+'/'+d.id+'.png';}}
 for(const name of ['weapon','shield']){const im=new Image();im.onload=()=>{HERO_EQUIPMENT[name]=im;render()};im.src='assets/hero-base/'+HERO_BASE_META.equipmentAssets[name].path;}
}
'''.replace('__BASE__',json.dumps(base)).replace('__MOTION__',json.dumps(motion))
s=s.replace('// キャラを1体描く：',loader+'\n// キャラを1体描く：')
s=s.replace('function drawChar(key, x, y, g, k, e, t) {',"function drawChar(key, x, y, g, k, e, t) {\n  if(key==='player'&&heroAttackReady()){const active=e.swing&&t-e.swing<SWING_MS;const face=active?(e.attackFace||e.face):e.face;heroAttackRenderer.draw(g,heroAttackDirection(face),x+TS/2,y+TS*.9,TS*k,active?t-e.swing:-1,heroAttackPreview);return;}")
s=s.replace('player.swing = now();','player.swing = now(); player.attackFace = player.face.slice();')
s=s.replace('if (e.fl) { ctx.translate',"if (e.fl && !(key==='player'&&heroAttackReady())) { ctx.translate")
s=s.replace('const hop = d > 0.001',"const hop = !(key==='player'&&heroAttackReady()) && d > 0.001")
start=s.index('<script>');s=s[:start]+'<script src="hero-base-renderer.js"></script>\n<script src="hero-attack-renderer.js"></script>\n'+s[start:]
s=s.replace('loadRig();\nboot();','loadRig();\nboot();\nloadHeroAttack();')
s=s.replace('パーツ＝歩き・攻撃・装備が動く／1枚絵＝assets/player.png をそのまま表示','方向別の基準絵＋攻撃／1枚絵＝assets/player.png')
s=s.replace("${rigPref ? '1枚絵' : 'パーツ'}","${rigPref ? '1枚絵' : '攻撃アニメ'}")
(R/'game-attack.html').write_text(s);(R/'integration.patch').write_text(''.join(difflib.unified_diff(original.splitlines(True),s.splitlines(True),fromfile='a/index.html',tofile='b/index.html')))
print('Created local game integration. Inventory/combat rules unchanged; diagnostic equipment opt-in.')
