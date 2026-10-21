"""Verify processed item sprites on the actual public preview, including redirects."""
import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':844,'height':390});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(sys.argv[1],timeout=60000)
 if page.get_by_text('Open the page',exact=False).count():page.get_by_text('Open the page',exact=False).first.click()
 page.wait_for_function('window.ExperienceReview && DungeonExperience.ready && CaveTerrain.ready && scene==="dungeon" && SPRITES.gold && SPRITES.arrow',timeout=60000)
 result=page.evaluate('''()=>{
  ExperienceReview.setup('traps');draw();
  const icons={};for(const k of ['gold','arrow']){const s=SPRITES[k],d=s.getContext('2d').getImageData(0,0,s.width,s.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;if(n<100)throw Error(k+' blank');icons[k]={width:s.width,paintedPixels:n};}
  ExperienceReview.setup('corridor');draw();const c=DungeonExperience.layers.ceiling;if(c.getContext('2d').getImageData(innerWidth/2,focusY(),1,1).data[3]!==0)throw Error('ceiling covers terrain');return icons;
 }''')
 assert not errors,errors
 print('PUBLIC OK: processed item sprites, uncovered terrain, no page errors',result)
 b.close()
