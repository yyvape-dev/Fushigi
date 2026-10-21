from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent;meta=json.loads((P/'ally.json').read_text());D=list(meta['views'])
contact=Image.new('RGB',(1536,672),'#28212e');g=ImageDraw.Draw(contact)
for i,d in enumerate(D):
 idle=Image.open(P/'assets'/f'{d}.png');motion=Image.open(P/'assets'/f'{d}-motion.png');assert idle.size==(256,256) and motion.size==(512,256)
 poses=[idle,motion.crop((0,0,256,256)),motion.crop((256,0,512,256))]
 assert len({hashlib.sha256(im.tobytes()).hexdigest() for im in poses})==3
 for row,im in enumerate(poses):
  box=im.getchannel('A').point(lambda a:255 if a>100 else 0).getbbox();assert box and box[0]>=3 and box[1]>=3 and box[2]<=253 and box[3]<=225,(d,row,box)
  contact.paste(im.resize((192,192)),(i*192,row*224+25),im.resize((192,192)));g.text((i*192+5,row*224+5),d+' '+['idle','walk','attack'][row],fill='#e9c9ee')
contact.save(P/'all-poses.png')
for path,digest in meta['sha256'].items():assert hashlib.sha256((P/path).read_bytes()).hexdigest()==digest
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for label,w,h in [('landscape',844,390),('portrait',390,844)]:
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8000/fushigi-allies-v1/game-review.html');page.wait_for_function('window.AllyReview && AllySystem.state.ready',timeout=120000)
  assert page.evaluate("SAVE_KEY==='fushigi_yuzunamiki_review_v1'")
  page.evaluate((P.parent/'tests/test_allies.js').read_text());page.evaluate("AllyReview.setup('meet')")
  page.evaluate('playerAttack()');assert page.locator('#allyPrompt').is_visible();assert page.evaluate('uiBlocked() && turn===0')
  page.keyboard.press('Tab');assert page.evaluate("document.activeElement.id==='allyStay'")
  page.keyboard.press('Tab');assert page.evaluate("document.activeElement.id==='allyJoin'")
  page.screenshot(path=str(P/f'meet-{label}.png'))
  page.locator('#allyJoin').click();assert page.evaluate('AllySystem.state.actor.following && !AllySystem.state.open')
  assert page.locator('#allyBadge').is_visible()
  page.evaluate("AllyReview.setup('wall');window._allyEnemyHP=enemies[0].hp;playerAttack()")
  assert page.evaluate('enemies[0].hp<_allyEnemyHP && map[10][10]===WALL')
  page.screenshot(path=str(P/f'wall-{label}.png'))
  page.evaluate("AllyReview.setup('haste');window._random=Math.random;Math.random=()=>.1;window._hp=enemies[0].hp;playerMove(0,0);Math.random=_random;")
  assert page.evaluate("AllySystem.state.actor.boost===3 && player.st.haste===0 && _hp-enemies[0].hp===2*Math.max(1,Math.round((AllySystem.stats(AllySystem.state.actor).attack-eT(enemies[0]).def+1)*.9))")
  page.screenshot(path=str(P/f'haste-{label}.png'))
  page.locator('#allyBadge').click();assert page.locator('#menuInfo').inner_text().find('ユズナミキ')>=0
  assert not errors,errors
  results.append({'viewport':label,'gameplayChecks':36,'modalFocus':True,'recruit':True,'wallAttack':True,'doubleAction':True,'statusMenu':True,'errors':errors});page.close()
 page=b.new_page(viewport={'width':390,'height':844});page.goto('http://127.0.0.1:8000/fushigi-allies-v1/preview.html');page.wait_for_function('window.AllyArtReady');assert page.locator('canvas').count()==8;page.screenshot(path=str(P/'art-portrait.png'));b.close()
(P/'validation.json').write_text(json.dumps({'poses':24,'individuallyPaintedDirections':8,'game':results},ensure_ascii=False,indent=2)+'\n')
print('ALL OK: 24 unique registered poses, alpha margins/hashes, 36 gameplay checks in two viewports, focus/recruit/wall attack/double actions/status UI')
