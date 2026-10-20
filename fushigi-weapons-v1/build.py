"""Reproducible grid extraction and grip registration. Never alters approved v3."""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image,ImageDraw

R=Path(__file__).parent
V=R.parent/'fushigi-equipment-v3'
KEYS=['woodsword','bronzesword','katana','dotanuki','minoaxe','renkentou','kamaitachi','healsword','steakknife','harisen','skyblade','firesword']
NAMES=['木刀','青銅の太刀','カタナ','どうたぬき','ミノタウロスの斧','連撃刀','妖刀かまいたち','回復の剣','ステーキナイフ','巨大ハリセン','空の刃','火迅風魔刀']
# Manually identified leather-grip centres in the ORIGINAL source sheet, not inferred bbox centres.
GRIPS=[(195,310),(556,311),(903,311),(1280,310),(200,644),(544,644),(917,643),(1280,644),(210,995),None,(912,1000),(1278,1002)]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def build():
 (R/'assets').mkdir(exist_ok=True)
 sheet=Image.open(R/'source-art/weapons-12.png').convert('RGBA')
 entries=[]
 for i,(key,name,grip) in enumerate(zip(KEYS,NAMES,GRIPS)):
  source=R/'source-art/weapons-12.png'
  row_edges=[0,365,704,1086]
  box=(i%4*362,row_edges[i//4],(i%4+1)*362,row_edges[i//4+1])
  if key=='harisen':
   source=R/'source-art/harisen.png';im=Image.open(source).convert('RGBA');box=(0,0,*im.size);grip=(514,1240)
  else:im=sheet
  obj=im.crop(box);arr=np.array(obj)
  # Remove barely visible exterior generation fringe; preserve opaque original paint.
  arr[arr[:,:,3]<40]=0;obj=Image.fromarray(arr)
  alpha=np.array(obj)[:,:,3];ys,xs=np.where(alpha>100)
  bounds=(int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1))
  gx,gy=grip[0]-box[0],grip[1]-box[1]
  scale=175/(gy-bounds[1]) # approved v3 tip-to-grip distance, preserving aspect ratio
  crop=obj.crop(bounds);size=(round(crop.width*scale),round(crop.height*scale))
  pos=(round(96-(gx-bounds[0])*scale),35)
  assert pos[0]>=2 and pos[0]+size[0]<=190 and pos[1]+size[1]<=254,(key,pos,size)
  out=Image.new('RGBA',(192,256));out.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),pos);out.save(R/'assets'/f'{key}.png')
  entries.append(dict(key=key,name=name,path=f'assets/{key}.png',grip=[96,210],size=[192,256],renderScale=.66,source=source.relative_to(R).as_posix(),sourceSha256=sha(source),sourceCell=list(box),sourceGrip=list(grip),sourceToSpriteScale=scale,spriteSha256=sha(R/'assets'/f'{key}.png'),view='front',reviewStatus='candidate',limitations='One weapon view; existing v3 rotation and foreshortening retained. One-handed axe and harisen need visual review.'))
 meta=dict(version=1,status='12 weapon candidates; approval pending',approvedBaseline='../fushigi-equipment-v3/',shieldRenderScale=.59,weapons=entries,baselineHashes={p:sha(V/p) for p in ['assets/hero-base/base.json','assets/hero-attack/attack.json','hero-base-renderer.js','hero-attack-renderer.js']})
 (R/'weapons.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 contact=Image.new('RGB',(768,864),'#e8e3d9');d=ImageDraw.Draw(contact)
 for i,e in enumerate(entries):
  x=i%4*192;y=i//4*288;im=Image.open(R/e['path']);contact.paste(im,(x,y),im);d.text((x+8,y+264),f'{i+1:02} {e["key"]}',fill='#26383a')
 contact.save(R/'weapons-catalog.png')
 print('Built 12 registered weapons; approved v3 unchanged')
if __name__=='__main__':build()
