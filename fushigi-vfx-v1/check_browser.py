"""Real-browser event/asset/portrait/landscape/save verification."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
kinds=['level','weapon','shield','pit','mine','gas','hungry','warp','summon']
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    for label,w,h in [('mobile',390,844),('landscape',844,390),('small',320,640)]:
        page=browser.new_page(viewport={'width':w,'height':h},has_touch=True)
        errors=[];bad=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('response',lambda r:bad.append(r.url) if r.status>=400 and '/assets/vfx/' in r.url else None)
        page.goto('http://127.0.0.1:8000/fushigi-vfx-v1/game-review.html')
        page.wait_for_function('ApprovedHero.ready&&HeroActions.ready&&DungeonExperience.ready&&MonsterSprites.ready&&Object.keys(EventVfx.state.images).length>=8')
        page.wait_for_load_state('networkidle')
        for kind in kinds:
            start=page.evaluate('''(kind)=>{reviewEvent(kind);const baseline=turn,blocked=EventVfx.busy();playerMove(1,0);playerAttack();openGameMenu();openBag();return {blocked,same:turn===baseline,menu:menuOpen||bagOpen,logs,events:EventVfx.state.events.map(e=>e.kind)};}''',kind)
            assert start['blocked'],(kind,'did not block input',start)
            assert start['same'],'input advanced during '+kind
            assert not start['menu'],'menu interrupted '+kind
            page.wait_for_function('!EventVfx.busy()',timeout=8000)
            result=page.evaluate('({turn,floorNo,bag:inv.length,hp:player.hp,before:reviewBefore})')
            if kind=='pit':assert result['floorNo']==result['before']['floorNo']+1
            elif kind=='gas':assert result['turn']==result['before']['turn']+4
            else:assert result['turn']==result['before']['turn']+1,(kind,result)
            # Freeze only this review capture at the middle frame, after testing
            # the actual rAF-driven completion above.
            if label!='small':
                page.evaluate('(kind)=>{reviewEvent(kind);cancelAnimationFrame(raf);raf=0;for(const e of EventVfx.state.events)e.start=performance.now()-e.duration*.5;draw();}',kind)
                page.screenshot(path=str(root/(kind+'-'+label+'.png')))
                page.evaluate('EventVfx.flush()')
        # Saving during the drop must resume below, without a replayed fall.
        page.evaluate('reviewEvent("pit");RunSave.save()')
        saved=page.evaluate('floorNo')
        page.reload();page.wait_for_function('ApprovedHero.ready')
        assert page.evaluate('floorNo')==saved
        assert not page.evaluate('EventVfx.busy()')
        assert not errors,errors
        assert not bad,bad
        print('ALL OK:',label,'9 actual effects, input block, exact turn counts, pit save/resume, assets and JS')
        page.close()
    page=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
    page.goto('http://127.0.0.1:8000/fushigi-vfx-v1/game-review.html');page.wait_for_function('ApprovedHero.ready')
    page.evaluate('reviewEvent("level")');page.wait_for_function('!EventVfx.busy()',timeout=8000)
    print('ALL OK: reduced motion finishes and releases input')
    browser.close()
