"""Run with the checkout served at 127.0.0.1:8000; write current review captures."""
import json
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium')
    page = browser.new_page(viewport={'width': 1000, 'height': 760})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8000/')
    # Snapshot real storage; do not write test sentinels into the user's save.
    saved = page.evaluate('Object.fromEntries(Object.entries(localStorage))')
    page.goto('http://127.0.0.1:8000/fushigi-overgrown-garden-v1/')
    page.wait_for_function("!document.getElementById('next').disabled", timeout=45000)
    game = page.frames[1]
    page.wait_for_timeout(1000)
    assert game.evaluate("floorPlan.theme.id==='overgrown-garden' && scene==='dungeon'")
    assert game.evaluate("DungeonGenerator.themes.length===6 && DungeonGenerator.locations.length===6")
    assert game.evaluate('OvergrownGarden.art.ready')
    # Verify the real game's floor rotation and reload, without the review's
    # forced theme/generator. Use an independent browser context for its save.
    normal = browser.new_page(viewport={'width': 844, 'height': 390})
    normal.on('pageerror', lambda error: errors.append(str(error)))
    normal.goto('http://127.0.0.1:8000/')
    normal.wait_for_function('ApprovedHero.ready && CaveTerrain.ready')
    normal.evaluate('enterDungeon();floorNo=6;newFloor();render()')
    normal.wait_for_function('OvergrownGarden.art.ready', timeout=45000)
    assert normal.evaluate("floorNo===6 && floorPlan.theme.id==='overgrown-garden'")
    normal.reload()
    normal.wait_for_function('OvergrownGarden.art.ready', timeout=45000)
    assert normal.evaluate("scene==='dungeon' && floorNo===6 && floorPlan.theme.id==='overgrown-garden'")
    normal.close()
    connections = game.evaluate('''() => {
      const size=40,pitch=size*CaveTerrain.pitch,neighbors=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
      const c=document.createElement('canvas');c.width=size*5;c.height=Math.ceil(pitch*5);const g=c.getContext('2d');
      const render=(m,ctx,ox=0,oy=0,s=size)=>{
        for(let y=0;y<m.length;y++)for(let x=0;x<m[0].length;x++){
          CaveTerrain.draw(ctx,m[y][x]?'floor0':'wallT',ox+x*s,oy+y*s*CaveTerrain.pitch,s,{map:m,x,y,seed:17,theme:OvergrownGarden.theme});
        }
      };
      for(let mask=0;mask<256;mask++){
        const m=Array.from({length:5},()=>Array(5).fill(0));
        neighbors.forEach(([dx,dy],i)=>{m[2+dy][2+dx]=(mask>>i)&1;});g.clearRect(0,0,c.width,c.height);render(m,g);
        const pixels=g.getImageData(size,Math.ceil(pitch),size*3,Math.floor(pitch*3)).data;
        for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==255)throw Error('transparent wall seam at topology '+mask);
      }
      for(const key of ['soil','top','face']){
        const t=OvergrownGarden.texture(key),d=t.getContext('2d').getImageData(0,0,256,256).data;
        for(let i=0;i<256;i++)for(let ch=0;ch<4;ch++){
          if(Math.abs(d[(i*256)*4+ch]-d[(i*256+255)*4+ch])>1||Math.abs(d[i*4+ch]-d[(255*256+i)*4+ch])>1)throw Error('material wrap seam '+key);
        }
      }
      const sheet=document.createElement('canvas');sheet.width=840;sheet.height=520;const sg=sheet.getContext('2d');sg.fillStyle='#171e19';sg.fillRect(0,0,sheet.width,sheet.height);
      const cases=[
        ['部屋と入口',['######','#....#','#....#','#.....','#....#','######']],
        ['L字の壁',['......','.###..','.###..','.#####','.#####','......']],
        ['T字の壁',['......','.####.','..##..','..##..','..##..','......']],
        ['1マス通路',['######','##.###','##.###','##...#','####.#','####.#']],
        ['壁の角',['......','..##..','..##..','......','.####.','......']],
        ['十字通路',['##.###','##.###','......','##.###','##.###','##.###']]
      ];
      cases.forEach(([name,rows],i)=>{const x=18+(i%3)*278,y=36+Math.floor(i/3)*252;sg.fillStyle='#e4deca';sg.font='16px sans-serif';sg.fillText(name,x,y-10);render(rows.map(row=>[...row].map(ch=>ch==='#'?0:1)),sg,x,y+8,40);});
      return {topologies:256,opaque:true,periodicMaterials:3,sheet:sheet.toDataURL('image/png').split(',')[1]};
    }''')
    (OUT / 'wall-connections.png').write_bytes(base64.b64decode(connections.pop('sheet')))
    reports = []
    for kind in ['roots', 'moss', 'rubble']:
        result = game.evaluate('''kind => {
          const i=rooms.findIndex(r=>r.role!=='shop'&&OvergrownGarden.plan(r,floorPlan.artSeed).kind===kind);
          if(i<0)throw Error('missing motif '+kind);
          window.gardenRoom=i;const r=rooms[i];player.x=player.vx=r.cx;player.y=player.vy=r.cy;updateVis();
          const before=JSON.stringify({map,rooms,roomGrid,enemies,floorItems,traps});
          const rng=Math.random;Math.random=()=>{throw Error('render consumed gameplay RNG')};
          try{draw()}finally{Math.random=rng}
          if(before!==JSON.stringify({map,rooms,roomGrid,enemies,floorItems,traps}))throw Error('render changed gameplay');
          let count=0;for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){
            const c=OvergrownGarden.cell(map,rooms,roomGrid,x,y,floorPlan.artSeed);if(c?.strength>0)count++;
          }
          if(!count)throw Error('no decoration visible');
          return {kind,room:i,decoratedCells:count};
        }''', kind)
        # Keep the caption in sync with the room chosen by this test.
        page.evaluate('status()')
        page.wait_for_timeout(200)
        page.screenshot(path=str(OUT / f'{kind}-landscape.jpg'), type='jpeg', quality=86)
        reports.append(result)
    # Toggle only appearance; fixed geometry and gameplay must remain identical.
    before = game.evaluate('JSON.stringify({map,rooms,roomGrid,player,enemies,floorItems,traps})')
    page.select_option('#look', 'ruins')
    assert game.evaluate("floorPlan.theme.id==='ruins'")
    page.screenshot(path=str(OUT / 'previous-ruins.jpg'), type='jpeg', quality=86)
    page.select_option('#look', 'overgrown-garden')
    assert game.evaluate('JSON.stringify({map,rooms,roomGrid,player,enemies,floorItems,traps})') == before
    # Use the real run-save serializer/restore path with isolated memory storage.
    assert game.evaluate('''() => {
      const expected=JSON.stringify(rooms.map(r=>OvergrownGarden.plan(r,floorPlan.artSeed)));
      if(!RunSave.save())return false;
      floorPlan.theme={id:'ruins'};
      return RunSave.restore()===true && floorPlan.theme.id==='overgrown-garden' &&
        expected===JSON.stringify(rooms.map(r=>OvergrownGarden.plan(r,floorPlan.artSeed)));
    }''')
    # Destroy actual walls through the existing cannon combat implementation.
    game.evaluate('''() => {
      for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++)if(map[y][x]===WALL){
        const e=spawnEnemy(player.x,player.y,true,'cannon');e.hp=e.maxhp=999;
        const result=MonsterCombat.fire(e,player,{x,y,dx:1,dy:0,distance:1});
        if(!result.walls.length||map[y][x]!==FLOOR||roomGrid[y][x]!==-1)throw Error('cannon wall destruction failed');
        visibilityRevision++;updateVis();render();return;
      }
      throw Error('no wall to destroy');
    }''')
    page.set_viewport_size({'width': 390, 'height': 844})
    # Return to a root room for the narrow-screen capture.
    game.evaluate("const narrowR=rooms.find(r=>OvergrownGarden.plan(r,floorPlan.artSeed).kind==='roots');player.x=player.vx=narrowR.cx;player.y=player.vy=narrowR.cy;updateVis();render()")
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / 'roots-portrait.jpg'), type='jpeg', quality=86)
    page.click('#room')
    page.click('#room')
    page.click('#grid')
    page.click('#grid')
    page.click('#next')
    assert game.evaluate("floorPlan.theme.id==='overgrown-garden'")
    assert page.evaluate('Object.fromEntries(Object.entries(localStorage))') == saved, 'real save changed'
    assert not errors, errors
    result = {'status': 'passed', 'normalFloorSixAndReload': True, 'wallConnections': connections, 'generatedArt': True, 'motifs': reports, 'portrait': True,
              'appearanceTogglePreservesGameplay': True, 'saveRestore': True,
              'liveWallChangeRendered': True, 'realStorageUnchanged': True, 'jsErrors': errors}
    (OUT / 'validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(result, ensure_ascii=False))
    browser.close()
