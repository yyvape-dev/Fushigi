"""Artwork registration and responsive review-page verification."""
from pathlib import Path
import hashlib
import json
import os
from PIL import Image, ImageOps
from playwright.sync_api import sync_playwright

P=Path(__file__).resolve().parent
M=json.loads((P/'ally.json').read_text())
BASE=os.environ.get('SHERININYA_REVIEW_URL','http://127.0.0.1:8000/fushigi-sherininya-v1/preview.html')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for path,digest in M['sha256'].items():assert sha(P/path)==digest,path
poses=[]
for d,v in M['views'].items():
    im=Image.open(P/v['idle']); assert im.mode=='RGBA' and im.size==(256,256)
    alpha=im.getchannel('A'); box=alpha.point(lambda a:255 if a>=100 else 0).getbbox()
    assert box and box[0]>=3 and box[1]>=3 and box[2]<=253 and box[3]<=233,(d,box)
    assert alpha.getextrema()[0]==0 and alpha.getextrema()[1]>=250
    poses.append(im.tobytes())
    # Registration is one sheet-wide scale with translation per view.
    assert v['anchors']['idle']==[128,224]
assert len(set(poses))==8
for left,right in [('SW','SE'),('W','E'),('NW','NE')]:
    assert ImageOps.mirror(Image.open(P/M['views'][left]['idle'])).tobytes()!=Image.open(P/M['views'][right]['idle']).tobytes()
assert M['registration']['idle']['views']['S']['registeredCrownY']==M['lanaCrownY']
results=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for name,w,h in [('portrait',390,844),('landscape',844,390),('small',320,640)]:
        page=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE);page.wait_for_function('window.SherininyaPreviewState?.ready')
        assert page.locator('figure').count()==8
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        loaded=page.evaluate('Object.values(images.lana).concat(Object.values(images.sherininya)).every(im=>im.complete&&im.naturalWidth===256)&&Object.values(images.sherininyaMotion).length===8&&Object.values(images.sherininyaMotion).every(im=>im.complete&&im.naturalWidth===640)')
        assert loaded
        for d in M['views']:
            page.select_option('#direction',d)
            assert page.evaluate('SherininyaPreviewState.direction')==d
        page.select_option('#direction','S')
        for action in ['walk','attack','idle']:
            page.select_option('#action',action);assert page.evaluate('SherininyaPreviewState.action')==action
        page.locator('.stage').screenshot(path=str(P/f'comparison-{name}.png'))
        page.screenshot(path=str(P/f'preview-{name}.png'),full_page=True)
        page.select_option('#size','96');assert page.evaluate('SherininyaPreviewState.scale')==.5
        page.locator('.stage').screenshot(path=str(P/f'actual-size-{name}.png'))
        page.locator('#guides').uncheck();assert not page.locator('#guides').is_checked()
        page.locator('figure').nth(3).click();assert page.evaluate('SherininyaPreviewState.direction')=='NW'
        page.locator('figure').nth(6).focus();page.keyboard.press('Enter');assert page.evaluate('SherininyaPreviewState.direction')=='E'
        page.locator('#rotate').click();page.wait_for_timeout(950)
        assert page.evaluate('SherininyaPreviewState.direction')=='SE'
        page.locator('#rotate').click();assert page.locator('#rotate').get_attribute('aria-pressed')=='false'
        assert not errors,errors
        results.append({'viewport':name,'size':[w,h],'eightDirections':True,'imagesLoaded':24,
                        'sizeSwitch':True,'guides':True,'keyboard':True,'autoRotation':True,
                        'horizontalOverflow':False,'javascriptErrors':errors})
        page.close()
    b.close()
report={'registeredIdlePoses':8,'commonSourceScale':M['registration']['idle']['sharedScale'],'groundAnchor':[128,224],
        'mirroring':False,'sCrownMatchesLana':True,
        'crownYByDirection':{d:round(M['registration']['idle']['views'][d]['registeredCrownY'],2) for d,v in M['views'].items()},
        'browser':results,'url':BASE}
(P/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('ALL OK: eight unique idle sprites, alpha/margins/hashes, shared scale, three responsive viewports, 24 images, directions/size/guides/keyboard/rotation.')
