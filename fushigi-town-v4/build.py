"""Register matching painted road materials and decorations; reuse all buildings."""
from pathlib import Path
import json
import numpy as np
from scipy import ndimage
from PIL import Image
ROOT=Path(__file__).resolve().parent
DEST=ROOT.parent/'assets'/'town-v4'
DEST.mkdir(parents=True,exist_ok=True)
surface=Image.open(ROOT/'source-art'/'surfaces.webp').convert('RGB')
w,h=surface.size
for name,box in [('street-main',(0,0,w//2,h//2)),('street-side',(w//2,0,w,h//2)),('plaza',(0,h//2,w//2,h)),('lawn',(w//2,h//2,w,h))]:
    surface.crop(box).resize((512,512),Image.Resampling.LANCZOS).save(DEST/(name+'.webp'),quality=93,method=6)
source=Image.open(ROOT/'source-art'/'decor.webp').convert('RGBA')
pixels=np.array(source);labels,n=ndimage.label(pixels[:,:,3]>32);sizes=np.bincount(labels.ravel());boxes=ndimage.find_objects(labels)
names=['lamp','planter','bench','hedge','pot','sign']
art=json.loads((ROOT.parent/'fushigi-town-v3'/'art-registration.json').read_text())
for name,a in art.items():a['path']='../town-v3/'+name+'.png'
seen=set()
for i,box in enumerate(boxes,1):
    if sizes[i]<2000:continue
    cx=(box[1].start+box[1].stop)/2;cy=(box[0].start+box[0].stop)/2
    col=min(2,int(cx/source.width*3));row=0 if cy<source.height*.56 else 1
    name=names[row*3+col];assert name not in seen,name;seen.add(name)
    x0=max(0,box[1].start-3);y0=max(0,box[0].start-3);x1=min(source.width,box[1].stop+3);y1=min(source.height,box[0].stop+3)
    crop=pixels[y0:y1,x0:x1].copy();mask=ndimage.binary_dilation(labels[y0:y1,x0:x1]==i,iterations=3);crop[:,:,3]*=mask.astype(np.uint8)
    image=Image.fromarray(crop);image.save(DEST/(name+'.png'),optimize=True)
    art[name]={'width':image.width,'height':image.height,'anchor':[image.width/2,image.height-3],'doorHeight':None,'sourceBox':[x0,y0,x1,y1],'path':name+'.png'}
assert seen==set(names),seen
(DEST/'art.js').write_text('globalThis.CastleTownArt='+json.dumps(art,separators=(',',':'))+';\n')
(ROOT/'art-registration.json').write_text(json.dumps(art,indent=2)+'\n')
print('Built four matched surfaces and six decorations; all twelve building/prop sprites reused')
