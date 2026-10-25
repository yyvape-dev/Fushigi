from pathlib import Path
import json
from playwright.sync_api import sync_playwright
R=Path(__file__).parent
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8002/');page.wait_for_function('ApprovedHero.ready && HeroActions.ready',timeout=90000)
 page.evaluate("""() => {enterDungeon();enemies=[];traps=[];floorItems=[];closeBag();closeGameMenu();eqWeapon=eqShield=null;eqRings=[null,null];player.st=newStatus();player.hp=10;const p=mkItem('savepot',4);inv=[p,mkItem('potion'),mkItem('potion'),mkItem('bread')];known.add('savepot');openBag();potOpen(p,'put');window.testPot=p;}""")
 assert page.locator('.pot-check').count()==3
 page.locator('.pot-check').nth(0).click();page.locator('.pot-check').nth(1).click();assert page.evaluate('potMode.selected.size')==2
 page.screenshot(path=str(R/'multiple-selection.png'))
 before=page.evaluate('turn');page.get_by_role('button',name='選択した2個を入れる',exact=True).click();assert page.evaluate('testPot.pot.length')==2;assert page.evaluate('turn')==before+1
 page.wait_for_function('!EventVfx.busy()');page.evaluate("potOpen(testPot,'view')")
 page.get_by_role('button',name='中から使う',exact=True).click();page.wait_for_function('!EventVfx.busy()');assert page.evaluate('testPot.pot.length')==1
 page.evaluate("""() => {closeBag();const p=mkItem('savepot',3);floorItems=[{x:player.x,y:player.y,item:p}];inv=[mkItem('herb'),mkItem('bread')];known.add('savepot');openGroundMenu();window.floorTestPot=p;}""")
 page.get_by_role('button',name='入れる',exact=True).click();assert page.evaluate('potMode.pot===floorTestPot')
 page.screenshot(path=str(R/'floor-pot.png'))
 page.get_by_role('button',name='入れる',exact=True).click();page.wait_for_function('!EventVfx.busy()');assert page.evaluate('floorTestPot.pot.length')==1
 page.evaluate("""() => {closeBag();closeGameMenu();player.st=newStatus();inv=Object.keys(PotSystem.definitions).map(k=>mkItem(k));for(const k of Object.keys(PotSystem.definitions))known.add(k);openBag();}""")
 for width,height in [(390,844),(844,390),(320,640)]:
  page.set_viewport_size({'width':width,'height':height});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'page horizontal overflow'
  assert page.evaluate("document.getElementById('bag').getBoundingClientRect().right<=innerWidth+1"),'bag outside viewport'
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(R/'catalog.png'))
 page.evaluate("localStorage.setItem('fushigi_core_save_v1','pot-main-sentinel')")
 page.goto('http://127.0.0.1:8002/fushigi-pots-v1/review.html');child=page.frame_locator('#game');child.locator('#bag').wait_for(state='visible',timeout=90000)
 page.select_option('#scenario','floor');child.locator('[data-ground=use]').wait_for(state='visible',timeout=90000);child.locator('[data-ground=use]').click();child.locator('.pot-check').first.wait_for(state='visible');assert page.evaluate("localStorage.getItem('fushigi_core_save_v1')==='pot-main-sentinel' && localStorage.getItem('pots_review:fushigi_core_save_v1')!==null")
 assert not errors,errors
 result={'sameTypeMultiSelection':True,'batchOneTurn':True,'directUseFromContents':True,'floorPotWithoutPickup':True,'mobileSizes':3,'potTypes':page.evaluate('Object.keys(PotSystem.definitions).length'),'isolatedReviewPage':True,'browserErrors':errors}
 (R/'browser-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result));browser.close()
