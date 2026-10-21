from pathlib import Path
import importlib.util,json,hashlib,statistics,sys
sys.dont_write_bytecode=True
from PIL import Image
P=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('register',P.parent/'fushigi-monsters-v2/build.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
idle=m.cells(P/'source-art/yuzunamiki-idle.png',2)
fixed=m.clean(Image.open(P/'source-art/yuzunamiki-SW-fixed.png').convert('RGBA'));fixed=fixed.crop(fixed.getchannel('A').point(lambda v:255 if v>=48 else 0).getbbox());unit=statistics.median(im.height for im in idle)/fixed.height
idle[1]=fixed.resize((round(fixed.width*unit),round(fixed.height*unit)),Image.Resampling.LANCZOS)
# Preserve the exact idle-only reference used for motion generation, before
# the wider attack pose can constrain the final shared registration scale.
refscale=min(192/max(im.height for im in idle),224/max(im.width for im in idle),216/max(im.height for im in idle))
reference=Image.new('RGBA',(2048,256))
for i,im in enumerate(idle):
 im=im.resize((max(1,round(im.width*refscale)),max(1,round(im.height*refscale))),Image.Resampling.LANCZOS);reference.alpha_composite(im,(i*256+128-im.width//2,224-im.height))
reference.save(P/'source-art/locked-idle-reference.png')
motionpath=P/'source-art/yuzunamiki-motion.png';motion=m.cells(motionpath,4) if motionpath.exists() else []
mu=statistics.median(im.height for im in idle)/statistics.median(im.height for im in motion[:8]) if motion else 1
motion=[im.resize((round(im.width*mu),round(im.height*mu)),Image.Resampling.LANCZOS) for im in motion]
allcells=idle+motion;scale=min(192/max(im.height for im in idle),224/max(im.width for im in allcells),216/max(im.height for im in allcells));views={}
for i,d in enumerate(m.D):
 frames=[]
 for im in [idle[i]]+([motion[i],motion[8+i]] if motion else []):
  im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS);c=Image.new('RGBA',(256,256));c.alpha_composite(im,(128-im.width//2,224-im.height));frames.append(c)
 frames[0].save(P/'assets'/f'{d}.png');views[d]={'idle':f'assets/{d}.png'}
 if motion:
  atlas=Image.new('RGBA',(512,256));atlas.alpha_composite(frames[1],(0,0));atlas.alpha_composite(frames[2],(256,0));atlas.save(P/'assets'/f'{d}-motion.png');views[d]['motion']=f'assets/{d}-motion.png'
# Ground contact is based on the boot band, not the tail/kunai silhouette.
# Store explicit translations for every painted pose; never warp the artwork.
for d in m.D:
 atlas=Image.open(P/'assets'/f'{d}-motion.png')
 poses={'idle':Image.open(P/'assets'/f'{d}.png'),'walk':atlas.crop((0,0,256,256)),'attack':atlas.crop((256,0,512,256))}
 anchors={};bands={}
 for action,frame in poses.items():
  alpha=frame.getchannel('A').point(lambda a:255 if a>=100 else 0);box=alpha.getbbox();top=box[3]-24;band=alpha.crop((0,top,256,box[3])).getbbox()
  anchors[action]=[(band[0]+band[2])/2,box[3]-8]
  bands[action]=[band[0],top+band[1],band[2],top+band[3]]
 views[d]['anchors']=anchors;views[d]['bootBands']=bands
meta={'name':'ユズナミキ','origin':[128,224],'scale':scale,'motionSourceScale':mu,'fixedSWSourceScale':unit,'mirroring':False,'views':views,'sha256':{str(f.relative_to(P)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (P/'assets').glob('*.png')}}
(P/'ally.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
sheet=Image.new('RGBA',(2048,256))
for i,d in enumerate(m.D):sheet.alpha_composite(Image.open(P/'assets'/f'{d}.png'),(i*256,0))
sheet.save(P/'source-art/locked-idle-directions.png')
print('Registered 8 individually painted views, motion:',bool(motion))
