from pathlib import Path
from playwright.sync_api import sync_playwright
import json
P=Path(__file__).resolve().parent;report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for name,w,h in [('landscape',844,390),('portrait',390,844),('desktop',1280,720)]:
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8000/fushigi-controls-ui-v1/review.html');page.wait_for_function('window.ExperienceReview && scene==="dungeon" && CaveTerrain.ready && typeof controlsMove==="function"')
  page.evaluate((P.parent/'tests/test_controls_ui.js').read_text())
  page.evaluate("ExperienceReview.setup('corridor');controlMode='walk'")
  # A short Shift+direction tap must not leave a delayed dash running.
  page.keyboard.down('Shift');page.keyboard.press('ArrowRight');page.keyboard.up('Shift');page.wait_for_timeout(250)
  assert not page.evaluate('runActive')
  page.evaluate("ExperienceReview.setup('room')");before=page.evaluate('turn');pos=page.evaluate('[player.x,player.y]')
  page.keyboard.down('Control');page.keyboard.press('ArrowLeft');page.keyboard.up('Control');page.wait_for_timeout(80)
  assert page.evaluate('[player.x,player.y]')==pos and page.evaluate('turn')==before
  page.keyboard.press('Escape');assert page.locator('#gameMenu').is_visible()
  page.screenshot(path=str(P/f'{name}-menu.png'))
  page.locator('[data-menu="0"]').click();assert page.locator('#bag').is_visible()
  page.keyboard.press('Escape');assert page.locator('#gameMenu').is_visible()
  page.locator('[data-menu="6"]').click();assert page.locator('#menuInfo').is_visible();page.screenshot(path=str(P/f'{name}-help.png'))
  page.keyboard.press('Escape');page.keyboard.press('Escape');assert not page.locator('#gameMenu').is_visible()
  # One-finger mode selection + direction: turn without moving.
  page.locator('[data-mode="turn"]').click();pos=page.evaluate('[player.x,player.y]');page.locator('[data-d="1,0"]').dispatch_event('pointerdown',{'pointerId':21});page.locator('[data-d="1,0"]').dispatch_event('pointerup',{'pointerId':21});assert page.evaluate('[player.x,player.y]')==pos
  page.locator('[data-mode="turn"]').click();page.screenshot(path=str(P/f'{name}-explore.png'))
  page.evaluate('openGameMenu();selectMenu(2)');assert 'HP' in page.locator('#menuInfo').inner_text();page.keyboard.press('Escape');page.keyboard.press('Escape')
  page.evaluate('openGameMenu();selectMenu(5)');page.keyboard.press('ArrowDown');assert page.evaluate('document.activeElement.matches("#cfgList button")');page.keyboard.press('Escape');assert page.locator('#gameMenu').is_visible()
  assert page.evaluate('turn')==before
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  report.append({'viewport':name,'controlsAndDashSafety':True,'keyboardTouch':True,'menuBackFlow':True,'errors':errors});page.close()
 b.close()
(P/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('ALL OK: controls, safe dash, keyboard/touch, menu/back in 3 viewports')
