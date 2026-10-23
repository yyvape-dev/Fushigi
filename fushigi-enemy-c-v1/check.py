import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1120, 'height':1000}, device_scale_factor=1)
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:8011/fushigi-enemy-c-v1/preview.html')
    page.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth)')
    page.screenshot(path=str(ROOT/'preview-desktop.png'), full_page=True)
    results={'images':page.locator('img').count(),'errors':errors,'sizes':{}}
    for key in ['ninja','caster','mimic','summoner','charged','cannon','lord']:
        results['sizes'][key]=page.evaluate('''async k=>{const im=new Image();im.src='art/'+k+'.png';await im.decode();const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.drawImage(im,0,0);const a=g.getImageData(0,0,256,256).data;let count=0,edge=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(a[(y*256+x)*4+3]>40){count++;if(x<4||x>251||y<4||y>251)edge++;}return{width:im.width,height:im.height,visiblePixels:count,edgePixels:edge};}''',key)
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(ROOT/'preview-mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.locator('#bg').check()
    page.screenshot(path=str(ROOT/'preview-light.png'),full_page=True)
    assert all(v['edgePixels']==0 and v['visiblePixels']>8000 for v in results['sizes'].values())
    assert not errors
    (ROOT/'validation.json').write_text(json.dumps(results,indent=2)+'\n')
    print('7 RGBA sprites; no edge clipping, overflow or browser errors.')
    browser.close()
