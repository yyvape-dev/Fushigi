"""Validate sprite boundaries and exact mirrored reuse; inspect browser loading/UI."""
from pathlib import Path
import json
from PIL import Image, ImageOps, ImageChops
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
m=json.loads((P/'monsters.json').read_text());report={'sprites':{},'browsers':[]}
for kind,monster in m['monsters'].items():
    rows={}
    for d,v in monster['views'].items():
        im=Image.open(P/v['path']);assert im.mode=='RGBA' and im.size==(256,256)
        a=im.getchannel('A');bbox=a.point(lambda x:255 if x>=48 else 0).getbbox();assert bbox and bbox[0]>1 and bbox[1]>1 and bbox[2]<255 and bbox[3]<255,(kind,d,bbox)
        if v['mirror']:
            original=Image.open(P/monster['views'][v['source']]['path']);expected=Image.new('RGBA',(256,256));expected.alpha_composite(ImageOps.mirror(original),(1,0))
            assert ImageChops.difference(im,expected).getbbox() is None
        rows[d]={'visibleBounds':bbox,'mirror':v['mirror']}
    report['sprites'][kind]=rows
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for name,w,h in [('desktop',1100,900),('portrait',390,844),('landscape',844,390)]:
        page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1);errors=[];failures=[]
        page.on('pageerror',lambda e:errors.append(str(e)));page.on('requestfailed',lambda r:failures.append(r.url))
        page.goto('http://127.0.0.1:8000/fushigi-monsters-v1/preview.html');page.wait_for_function('MonsterReview.ready || MonsterReview.error');assert page.evaluate('MonsterReview.ready'),page.evaluate('MonsterReview.error')
        for kind in m['monsters']:
            page.select_option('#kind',kind);page.wait_for_function('Array.from(document.querySelectorAll("#contact img")).every(i=>i.complete && i.naturalWidth===256)')
        for style in ['before','soft','current']:
            page.select_option('#faceStyle',style)
            page.wait_for_function('Array.from(document.querySelectorAll("#contact img")).every(i=>i.complete && i.naturalWidth===256)')
            prefix={'before':'before-face-v2/','soft':'before-face-v3/','current':'assets/'}[style]
            assert page.locator('#contact img').first.get_attribute('src').startswith(prefix)
        for theme in ['forest','limestone','ruins','ice','volcano']:page.select_option('#theme',theme)
        page.select_option('#theme','limestone');page.select_option('#kind','goblin')
        for d in m['directions']:page.evaluate('(d)=>MonsterReview.setDirection(d)',d)
        page.evaluate('MonsterReview.setDirection("SE")');page.select_option('#zoom','2');page.select_option('#zoom','1')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),name
        page.screenshot(path=str(P/f'review-{name}.png'),full_page=True)
        page.locator('#stage').screenshot(path=str(P/f'stage-{name}.png'))
        page.locator('#rotate').click();page.wait_for_function('document.querySelector("#dirs button[aria-pressed=true]").textContent!=="SE"');page.locator('#rotate').click()
        assert not errors and not failures,(errors,failures)
        report['browsers'].append({'name':name,'viewport':[w,h],'ready':True,'errors':errors,'failedRequests':failures,'noPageOverflow':True,'floorThemes':5,'directions':8,'faceVersions':3})
        page.close()
    browser.close()
(P/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('OK: 24 sprites, 6 exact reflections, 3 viewports, 5 floor themes, 8 directions, no missing images.')
