from pathlib import Path
import time,subprocess,tempfile,os,json,playwright
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(prefix='fushigi-wall-video-',dir='/tmp') as tmp:
 registry=json.loads((Path(playwright.__file__).parent/'driver/package/browsers.json').read_text())
 revision=next(b['revision'] for b in registry['browsers'] if b['name']=='ffmpeg')
 ffmpeg=Path(tmp)/('ffmpeg-'+revision);ffmpeg.mkdir();(ffmpeg/'ffmpeg-linux').symlink_to('/usr/bin/ffmpeg')
 os.environ['PLAYWRIGHT_BROWSERS_PATH']=tmp
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium')
  page=browser.new_page(viewport={'width':1100,'height':850},record_video_dir=tmp,record_video_size={'width':1100,'height':850})
  start=time.monotonic();page.goto('http://127.0.0.1:8000/fushigi-wall-boundary-v1/');page.wait_for_function("!document.getElementById('next').disabled",timeout=60000)
  box=page.locator('#game').bounding_box();delay=time.monotonic()-start
  page.click('#walk');page.wait_for_function("document.getElementById('game').contentWindow.eval('player.x===16&&player.y===11')",timeout=20000);page.wait_for_timeout(500)
  length=time.monotonic()-start-delay;video=page.video;page.close();source=video.path();browser.close()
 crop=f"crop={int(box['width'])//2*2}:{int(box['height'])//2*2}:{int(box['x'])}:{int(box['y'])}"
 subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(delay),'-i',str(source),'-t',str(length),'-vf',crop+',scale=880:-2','-c:v','libx264','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(OUT/'walk.mp4')],check=True)
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(OUT/'walk.mp4'),'-filter_complex','fps=7,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',str(OUT/'walk.gif')],check=True)
 print('WALK VIDEO',round(length,2),'seconds')
