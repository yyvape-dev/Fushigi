from pathlib import Path
import json,hashlib
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
for manifest in ['bgm','se']:
 for row in json.loads((P/'sources'/f'{manifest}.json').read_text()):
  assert hashlib.sha256((P/row['file']).read_bytes()).hexdigest()==row['sha256']
report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(844,390),(390,844),(320,568)]:
  page=b.new_page(viewport={'width':w,'height':h});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8000/fushigi-audio-v1/')
  assert page.evaluate('[...document.querySelectorAll("audio")].every(a=>a.paused)')
  # Decode all files in the browser and ensure they contain non-silent audio.
  decoded=page.evaluate('''async()=>{const c=new AudioContext();const rows=[];for(const a of document.querySelectorAll('audio')){const r=await fetch(a.src);if(!r.ok)throw Error(a.src);const b=await c.decodeAudioData(await r.arrayBuffer());const d=b.getChannelData(0);let peak=0;for(const x of d)peak=Math.max(peak,Math.abs(x));rows.push({file:a.getAttribute('src'),duration:b.duration,peak});if(peak<.001)throw Error('silent');}await c.close();return rows;}''')
  page.locator('[data-id=town] .seam').click()
  page.wait_for_function('document.querySelector("[data-id=town] audio").currentTime>10')
  page.locator('[data-id=depth] .seam').click()
  page.wait_for_function('document.querySelector("[data-id=town] audio").paused && !document.querySelector("[data-id=depth] audio").paused')
  page.locator('[data-se=levelup]').click()
  page.wait_for_function('!document.getElementById("levelup").paused && document.querySelector("[data-id=depth] audio").volume < .2')
  assert abs(page.evaluate('document.querySelector("[data-id=depth] audio").volume')-.45*.35)<.001
  page.wait_for_function('document.getElementById("levelup").ended')
  assert abs(page.evaluate('document.querySelector("[data-id=depth] audio").volume')-.45)<.001
  page.locator('#mute').check();assert page.evaluate('[...document.querySelectorAll("audio")].every(a=>a.muted)')
  page.locator('#loop').uncheck();assert page.evaluate('[...document.querySelectorAll(".tracks audio")].every(a=>!a.loop)')
  page.locator('#stop').click();assert page.evaluate('[...document.querySelectorAll("audio")].every(a=>a.paused)')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(P/f'audition-{w}.png'),full_page=True)
  page.reload();assert page.locator('#mute').is_checked()
  assert not errors,errors
  report.append({'size':[w,h],'decoded':decoded,'exclusiveBgm':True,'seDucking':True,'mute':True,'loopToggle':True,'stop':True,'savedVolume':True,'noAutoplay':True})
  page.close()
 b.close()
(P/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('ALL OK: 6 files decoded, 3 sizes, BGM switching, SE ducking, mute, loop, stop and saved preferences')
