"""Extract isolated generated sprites. Preserve source pixels and alpha edges."""
from pathlib import Path
import json
import numpy as np
from scipy import ndimage
from PIL import Image

ROOT=Path(__file__).resolve().parent
DEST=ROOT.parent/'assets'/'town-v3'
DEST.mkdir(parents=True,exist_ok=True)
source=Image.open(ROOT/'source-art'/'modular-town.png').convert('RGBA')
pixels=np.array(source)
labels,n=ndimage.label(pixels[:,:,3]>32)
sizes=np.bincount(labels.ravel())
boxes=ndimage.find_objects(labels)
names=['inn','smith','deposit','lodge','castle','house-red','house-blue','cave','tree','fountain','stall','board']
components=[i for i in range(1,n+1) if sizes[i]>1000]
assert len(components)==12,components
doors={'inn':85,'smith':80,'deposit':80,'lodge':82,'house-red':70,'house-blue':70,'cave':130,'castle':130}
art={}
for name,i in zip(names,components):
    box=boxes[i-1]
    x0=max(0,box[1].start-3);y0=max(0,box[0].start-3)
    x1=min(source.width,box[1].stop+3);y1=min(source.height,box[0].stop+3)
    # Components isolate neighbors even where their bounding rectangles overlap.
    mask=ndimage.binary_dilation(labels[y0:y1,x0:x1]==i,iterations=3)
    crop=pixels[y0:y1,x0:x1].copy()
    crop[:,:,3]*=mask.astype(np.uint8)
    image=Image.fromarray(crop)
    image.save(DEST/f'{name}.png',optimize=True)
    art[name]={'width':image.width,'height':image.height,'anchor':[image.width/2,image.height-3],'doorHeight':doors.get(name),'sourceBox':[x0,y0,x1,y1]}
town=Image.open(ROOT.parent/'assets'/'town-v2'/'town.webp').convert('RGB')
town.crop((708,778,772,842)).resize((128,128),Image.Resampling.LANCZOS).save(DEST/'paving.png')
grass=Image.open(ROOT.parent/'assets'/'town.png').convert('RGB')
grass.crop((760,480,888,608)).save(DEST/'grass.png')
castle=Image.open(DEST/'castle.png')
castle.crop((34,235,98,283)).save(DEST/'wall.png')
(DEST/'art.js').write_text('globalThis.CastleTownArt='+json.dumps(art,separators=(',',':'))+';\n')
(ROOT/'art-registration.json').write_text(json.dumps(art,indent=2)+'\n')
print('Extracted',len(art),'sprites with independent alpha and door registration')
