"""Run with the checkout served at 127.0.0.1:8000; write current review captures."""
import json
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
    assert game.evaluate("DungeonGenerator.themes.length===5 && DungeonGenerator.locations.length===6")
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
    result = {'status': 'passed', 'motifs': reports, 'portrait': True,
              'appearanceTogglePreservesGameplay': True, 'saveRestore': True,
              'liveWallChangeRendered': True, 'realStorageUnchanged': True, 'jsErrors': errors}
    (OUT / 'validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(result, ensure_ascii=False))
    browser.close()
