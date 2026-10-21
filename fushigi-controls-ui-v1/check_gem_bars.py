from pathlib import Path
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(844,390),(390,844),(320,568)]:
  page=b.new_page(viewport={'width':w,'height':h});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8000/fushigi-controls-ui-v1/review.html')
  page.wait_for_function('window.ExperienceReview && typeof chooseHandLayout==="function"')
  page.evaluate("ExperienceReview.setup('room')")
  page.evaluate('''async()=>{const i=new Image();i.src='assets/ui-art/gem-liquid-atlas.png';await i.decode();}''')
  for value in [100,50,10,0]:
   page.evaluate('(v)=>{player.maxhp=100;player.hp=v;belly=v;bellyBonus=0;refreshUI()}',value)
   page.wait_for_timeout(300)
   data=page.evaluate('''()=>['hpf','blf'].map(id=>{const el=document.getElementById(id),s=getComputedStyle(el);return {width:parseFloat(el.style.width),image:s.backgroundImage,filter:s.filter};})''')
   assert data[0]['width']==value,data
   assert all('gem-liquid-atlas.png' in d['image'] for d in data),data
   assert (data[0]['filter']!='none')==(value<=25),data
   assert (data[1]['filter']!='none')==(value<=10),data
   if value in [50,10]:page.screenshot(path=str(P/f'gem-bars-{w}-{value}.png'))
  page.emulate_media(reduced_motion='reduce')
  assert page.evaluate('getComputedStyle(document.getElementById("hpf"),"::after").animationName')=='none'
  assert not errors,errors
  page.close()
 b.close()
print('ALL OK: generated bars in 3 sizes, full/half/low/zero, warning tint, reduced motion')
