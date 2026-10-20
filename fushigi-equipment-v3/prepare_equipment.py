from PIL import Image
from scipy.ndimage import label,find_objects
import numpy as np,json
from pathlib import Path
R=Path(__file__).parent;out=R/'assets/hero-base/equipment';out.mkdir(exist_ok=True)
def parts(path):
 im=Image.open(path).convert('RGBA');a=np.array(im);lab,n=label(a[:,:,3]>100);boxes=[]
 for i,s in enumerate(find_objects(lab),1):
  if s and (lab[s]==i).sum()>5000:boxes.append((s[1].start,s[0].start,s[1].stop,s[0].stop))
 return im,sorted(boxes)
def save_fit(im,box,name,width,height,canvas,grip=None):
 obj=im.crop(box);obj.thumbnail((width,height),Image.Resampling.LANCZOS);c=Image.new('RGBA',canvas);c.alpha_composite(obj,((canvas[0]-obj.width)//2,(canvas[1]-obj.height)//2));c.save(out/(name+'.png'))
im,b=parts(R/'source-art/approved-sword-shield.png')
# Place actual leather-grip centre exactly at renderer socket (48,210).
obj=im.crop(b[0]);obj=obj.resize((round(obj.width*.275),round(obj.height*.275)),Image.Resampling.LANCZOS);c=Image.new('RGBA',(96,256));c.alpha_composite(obj,((96-obj.width)//2,210-round((680-b[0][1])*.275)));c.save(out/'weapon.png')
save_fit(im,b[1],'shield',144,152,(160,192))
im,b=parts(R/'source-art/shield-views.png')
for box,name,w in zip(b,['shield-back','shield-side','shield-quarter'],[144,48,112]):save_fit(im,box,name,w,152,(160,192))
p=R/'assets/hero-base/base.json';meta=json.loads(p.read_text());meta['equipmentAssets']['weapon']['path']='equipment/weapon.png';meta['equipmentAssets']['shield']['path']='equipment/shield.png'
for v in ['back','side','quarter']:meta['equipmentAssets']['shield-'+v]={'path':'equipment/shield-'+v+'.png','grip':[80,96],'size':[160,192]}
for d in meta['directions']:d['shieldView']={'S':'front','SW':'quarter','W':'side','NW':'back','N':'back','NE':'back','E':'side','SE':'quarter'}[d['id']]
meta['equipmentLimitations']='First approved-design equipment prototype. Shield has separate front, quarter, side, back art. Sword still uses one view. Hand occlusion is approximate.';p.write_text(json.dumps(meta,ensure_ascii=False,indent=2))
print('Prepared approved-design sword and four shield views')
