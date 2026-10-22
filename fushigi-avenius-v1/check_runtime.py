from pathlib import Path
from datetime import datetime,timedelta,timezone
import base64,hashlib,json,os
from PIL import Image
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
base=os.environ.get('AVENIUS_GAME_URL','http://127.0.0.1:8000/fushigi-avenius-v1/game-review.html')
M=json.loads((P/'ally.json').read_text())
for d in M['views']:
 idle=Image.open(P/'assets'/f'{d}.png');atlas=Image.open(P/'assets'/f'{d}-motion.png')
 assert idle.size==(256,256) and atlas.size==(640,256)
 poses=[idle,atlas.crop((0,0,320,256)),atlas.crop((320,0,640,256))]
 assert len({hashlib.sha256(im.tobytes()).hexdigest() for im in poses})==3
 for i,im in enumerate(poses):
  box=im.getchannel('A').point(lambda a:255 if a>=100 else 0).getbbox()
  assert box and box[0]>=3 and box[1]>=3 and box[2]<=im.width-3 and box[3]<=233,(d,i,box)
for path,digest in M['sha256'].items():assert hashlib.sha256((P/path).read_bytes()).hexdigest()==digest
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for name,w,h in [('portrait',390,844),('landscape',844,390),('small',320,640)]:
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(e.stack))
  page.clock.install();page.goto(base);page.wait_for_function("window.AveniusReview&&AllySystem.state.ready&&AllySystem.state.actor?.kind==='avenius'",timeout=120000)
  assert page.evaluate("SAVE_KEY==='fushigi_avenius_review_v1'")
  assert page.evaluate("Object.keys(AllySystem.state.art.avenius.images).length===16")
  page.evaluate((P.parent/'tests/test_avenius.js').read_text())
  page.evaluate("AveniusReview.setup('meet');playerAttack()")
  assert page.locator('#allyPrompt').is_visible() and page.locator('#allyName').inner_text()=='アベニウス'
  assert 'fushigi-avenius-v1' in page.locator('#allyPortrait img').get_attribute('src')
  assert page.evaluate('turn===0&&uiBlocked()')
  page.screenshot(path=str(P/f'game-meet-{name}.png'))
  page.keyboard.press('Tab');assert page.evaluate("document.activeElement.id==='allyStay'")
  page.keyboard.press('Tab');assert page.evaluate("document.activeElement.id==='allyJoin'")
  page.locator('#allyJoin').click();assert page.locator('#allyBadge').is_visible()
  assert page.locator('#allyBadge .party-name').inner_text()=='アベニウス'
  assert 'fushigi-avenius-v1' in page.locator('#allyBadge img').get_attribute('src')
  page.locator('#allyBadge').click();assert '一閃' in page.locator('#menuInfo').inner_text()
  page.evaluate("closeGameMenu();AveniusReview.setup('flash');window._avOrigin=[AllySystem.state.actor.x,AllySystem.state.actor.y];window._avTarget=enemies[0];window._avHP=_avTarget.hp;playerMove(0,0)")
  assert page.evaluate('_avTarget.hp<_avHP&&AllySystem.state.actor.issenUsed.has(_avTarget)&&AllySystem.state.actor.x===_avOrigin[0]&&AllySystem.state.actor.y===_avOrigin[1]')
  # Freeze the browser clock after readiness; captures exact dash phases and
  # real renderer poses rather than hoping screenshot timing hits a frame.
  page.clock.pause_at(datetime.now(timezone.utc)+timedelta(seconds=1))
  page.evaluate("AveniusReview.setup('flash');AllySystem.tick();AllySystem.state.actor.dash.start=now()-120;AllySystem.state.actor.attackStart=now()-120;render()")
  page.screenshot(path=str(P/f'game-flash-{name}.png'))
  page.evaluate("window._avHP=enemies[0].hp;AllySystem.tick()")
  assert page.evaluate('enemies[0].hp===_avHP')
  page.evaluate("AveniusReview.setup('wall');window._avHP=enemies[0].hp;AllySystem.tick();render()")
  assert page.evaluate('enemies[0].hp===_avHP&&!AllySystem.state.actor.issenUsed.has(enemies[0])')
  page.evaluate("AveniusReview.setup('size')");page.screenshot(path=str(P/f'game-size-{name}.png'))
  # All directions and actual walk/attack pose selection in the production renderer.
  page.evaluate("window._avFrames=[];const draw=AllySystem.draw;AllySystem.draw=function(g,a,t,x,y){_avFrames.push([a.kind,a.face.slice(),a.attackStart!=null&&t-a.attackStart<300,t<a.walkEnd]);return draw(g,a,t,x,y);};void 0")
  for i,d in enumerate(M['views']):
   for action in ['walk','attack']:
    page.evaluate("""([i,action])=>{const a=AllySystem.state.actor;const angle=i*Math.PI/4;a.face=[-Math.round(Math.sin(angle)),Math.round(Math.cos(angle))];a.attackFace=a.face.slice();a.dash=null;a.attackStart=action==='attack'?now()-100:null;a.walkStart=now();a.walkEnd=action==='walk'?now()+220:0;render();}""",[i,action])
    if name=='landscape':
     png=page.evaluate("document.getElementById('c').toDataURL('image/png').split(',')[1]")
     (P/f'render-{d}-{action}.png').write_bytes(base64.b64decode(png))
  assert page.evaluate('_avFrames.some(f=>f[2])&&_avFrames.some(f=>f[3])')
  assert not errors,errors
  results.append({'viewport':name,'size':[w,h],'gameplayChecks':42,'saveIsolated':True,'portraitAndRecruitment':True,'hudAndStatus':True,'flashReturnAndOneUse':True,'blockedFlash':True,'renderedDirections':8,'renderedMotionPoses':16,'javascriptErrors':errors});page.close()
 # Actual production entry point also loads both companions, not just review.
 page=b.new_page(viewport={'width':390,'height':844});page.goto(base.replace('fushigi-avenius-v1/game-review.html','index.html'));page.wait_for_function('AllySystem.state.ready',timeout=120000)
 assert page.evaluate("SAVE_KEY==='fushigi_core_save_v1'&&Object.keys(AllySystem.state.art).length===2")
 b.close()
(P/'runtime-validation.json').write_text(json.dumps({'poses':24,'game':results,'productionEntryLoaded':True},ensure_ascii=False,indent=2)+'\n')
print('ALL OK: 24 poses; 42 gameplay checks and real renderer in three sizes; dialog/HUD/status/save isolation; production loads both allies.')
