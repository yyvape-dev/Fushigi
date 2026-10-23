"""Reproducible study informed by the user's five Shiren 6 screenshots."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium')
    page = browser.new_page(viewport={'width': 1000, 'height': 780})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:8000/fushigi-overgrown-garden-v1/')
    page.wait_for_function("!document.getElementById('next').disabled", timeout=45000)
    frame = page.frames[1]
    frame.evaluate('''() => {
      ShopSystem.reset();AllySystem.reset();ShopSecurity.reset?.();
      MW=15;MH=11;map=Array.from({length:MH},()=>Array(MW).fill(WALL));
      rooms=[{x:4,y:3,w:7,h:5,cx:7,cy:5,role:'ordinary',shape:'rect'}];
      for(let y=3;y<8;y++)for(let x=4;x<11;x++)map[y][x]=FLOOR;
      for(let x=11;x<14;x++)map[5][x]=FLOOR;
      floorPlan={seed:55433,artSeed:8721,theme:OvergrownGarden.theme,map,rooms,style:'study'};
      floorShop=null;enemies=[];floorItems=[];traps=[];fx.length=0;vfx.length=0;floorLight=false;
      buildRoomGrid();player.x=player.vx=7;player.y=player.vy=5;player.face=[0,1];player.action=null;player.swing=0;
      seen=map.map(row=>row.map(()=>true));fadeT=-1e9;updateVis();render();
    }''')
    before = frame.evaluate('JSON.stringify({map,rooms,roomGrid,player,enemies,floorItems,traps})')
    page.wait_for_timeout(1000)
    captures = []
    for mode in ['low', 'tall', 'cutaway', 'ridge']:
        page.select_option('#height', mode)
        page.select_option('#angle', '0.94' if mode == 'ridge' else '0.82')
        page.wait_for_timeout(100)
        frame.locator('body').screenshot(path=str(OUT / f'study-{mode}.jpg'), type='jpeg', quality=90)
        captures.append({'mode': mode, 'pitch': .94 if mode == 'ridge' else .82, 'file': f'study-{mode}.jpg'})
    for pitch in [.72, .82, .9, .94]:
        page.select_option('#angle', str(pitch))
        page.wait_for_timeout(100)
        frame.locator('body').screenshot(path=str(OUT / f'study-angle-{round(pitch*100):03}.jpg'), type='jpeg', quality=90)
    # Exercise every combination of nearby floor/wall tiles in every study view.
    frame.evaluate('''() => {
      const c=document.createElement('canvas');c.width=210;c.height=210;const g=c.getContext('2d');
      const offsets=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]],size=32;
      for(const mode of ['low','tall','cutaway','ridge'])for(const pitch of [.72,.82,.9,.94]){
        OvergrownGarden.configureView({mode,pitch});
        for(let mask=0;mask<256;mask++){
          const m=Array.from({length:5},()=>Array(5).fill(0));offsets.forEach(([x,y],i)=>m[2+y][2+x]=(mask>>i)&1);
          g.clearRect(0,0,210,210);
          for(let y=0;y<5;y++)for(let x=0;x<5;x++)CaveTerrain.draw(g,m[y][x]?'floor0':'wallT',x*size,y*size*pitch,size,{map:m,x,y,seed:0,theme:OvergrownGarden.theme});
          const d=g.getImageData(size,Math.ceil(size*pitch),size*3,Math.floor(size*pitch*3)).data;
          for(let i=3;i<d.length;i+=4)if(d[i]!==255)throw Error(`gap ${mode}/${pitch}/${mask}`);
        }
      }
    }''')
    assert before == frame.evaluate('JSON.stringify({map,rooms,roomGrid,player,enemies,floorItems,traps})'), 'view changed gameplay'
    page.select_option('#height', 'ridge')
    page.select_option('#angle', '0.94')
    for name, x, y in [('back', 7, 3), ('front', 7, 7), ('door', 10, 5)]:
        frame.evaluate(f'player.x=player.vx={x};player.y=player.vy={y};updateVis();render()')
        frame.locator('body').screenshot(path=str(OUT / f'study-near-{name}.jpg'), type='jpeg', quality=90)
    frame.evaluate('player.x=player.vx=7;player.y=player.vy=7;updateVis();render()')
    overlap = frame.evaluate('''() => {
      const hero=ApprovedHero.draw;
      const image=()=>new Uint8ClampedArray(ctx.getImageData(0,0,innerWidth,innerHeight).data);
      const pair=mode=>{
        OvergrownGarden.configureView({occlusion:mode});draw();const yes=image();
        try{ApprovedHero.draw=()=>{};draw();return [yes,image()];}finally{ApprovedHero.draw=hero;}
      };
      const delta=(a,b,i)=>Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
      const [a,b]=pair('off'),[c,d]=pair('natural'),[e,f]=pair('fade');
      let baseline=0,natural=0,fade=0;
      for(let i=0;i<a.length;i+=4)if(delta(a,b,i)>25){baseline++;if(delta(c,d,i)>25)natural++;if(delta(e,f,i)>25)fade++;}
      if(!(baseline>100&&natural<baseline*.95&&natural>baseline*.1&&fade>natural))throw Error('foreground wall did not partially occlude hero correctly: '+[baseline,natural,fade]);
      OvergrownGarden.configureView({occlusion:'natural'});draw();
      return {baselinePixels:baseline,naturalVisiblePixels:natural,fadeVisiblePixels:fade};
    }''')
    for mode in ['off', 'natural', 'fade']:
        page.select_option('#overlap', mode)
        frame.locator('body').screenshot(path=str(OUT / f'study-overlap-{mode}.jpg'), type='jpeg', quality=90)
    page.select_option('#overlap', 'natural')
    page.set_viewport_size({'width': 390, 'height': 844})
    frame.locator('body').screenshot(path=str(OUT / 'study-ridge-portrait.jpg'), type='jpeg', quality=90)
    assert not errors, errors
    # A browser-rendered comparison sheet preserves the actual game captures.
    page.set_viewport_size({'width': 1500, 'height': 650})
    for name, files in [
        ('height-comparison', [('公開中の低い壁', 'study-low.jpg'), ('全体を高くする', 'study-tall.jpg'), ('奥を高く・手前を低く', 'study-cutaway.jpg')]),
        ('angle-comparison', [('少し横から', 'study-angle-072.jpg'), ('現在の見下ろし方', 'study-angle-082.jpg'), ('少し真上から', 'study-angle-090.jpg')]),
        ('ridge-comparison', [('公開版の高さ・角度', 'study-low.jpg'), ('高さだけ変えた案', 'study-tall.jpg'), ('真上寄り＋立ち上がる石積み', 'study-ridge.jpg')]),
        ('ridge-angle-comparison', [('従来の床の角度', 'study-angle-082.jpg'), ('少し真上寄り', 'study-angle-090.jpg'), ('新案の真上寄り', 'study-angle-094.jpg')]),
        ('occlusion-comparison', [('比較：キャラを常に前へ', 'study-overlap-off.jpg'), ('輪郭で自然に隠れる', 'study-overlap-natural.jpg'), ('隠れる部分を薄くする案', 'study-overlap-fade.jpg')]),
    ]:
        page.goto('http://127.0.0.1:8000/fushigi-overgrown-garden-v1/')
        page.set_content('<html lang="ja"><style>body{margin:0;background:#18201b;color:#eee;font:20px sans-serif}main{display:flex}figure{margin:10px;width:480px}img{width:480px;display:block}figcaption{padding:10px}</style><main>'+''.join(f'<figure><figcaption>{label}</figcaption><img src="http://127.0.0.1:8000/fushigi-overgrown-garden-v1/{file}"></figure>' for label,file in files)+'</main></html>')
        page.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)')
        page.locator('main').screenshot(path=str(OUT / f'{name}.jpg'), type='jpeg', quality=90)
    result = {'status': 'passed', 'views': 16, 'topologiesPerView': 256, 'gapChecks': 4096,
              'gameplayUnchanged': True, 'nearWallAndDoor': True, 'portrait': True, 'foregroundOcclusion': overlap,
              'referenceReview': 'user-supplied Shiren 6 screenshots including neutral gray cliff reference observed directly; exact camera angle and internal renderer are not established', 'captures': captures}
    (OUT / 'height-study-validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(result, ensure_ascii=False))
    browser.close()
