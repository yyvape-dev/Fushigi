"""Extract generated atlas cells. No repainting, mirroring or color correction."""
from pathlib import Path
from PIL import Image
import hashlib,json
P=Path(__file__).resolve().parent
source=P/'source-art/cave-atlas.png'
im=Image.open(source).convert('RGB')
assert im.width*2==im.height*3,im.size
w,h=im.width//3,im.height//2
assert w==h
out=P.parent/'assets/dungeon/cave-v1';out.mkdir(parents=True,exist_ok=True)
cells={'floor0':(0,0),'floor1':(1,0),'floor2':(2,0),'wallT':(0,1),'wallF':(1,1),'stairs':(2,1)}
record={'version':1,'source':'fushigi-dungeon-art-v1/source-art/cave-atlas.png','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceSize':im.size,'tileSize':256,'assets':{}}
for name,(x,y) in cells.items():
 box=(x*w+4,y*h+4,(x+1)*w-4,(y+1)*h-4)
 target=out/(name+'.webp')
 im.crop(box).resize((256,256),Image.Resampling.LANCZOS).save(target,quality=92,method=6)
 record['assets'][name]={'path':str(target.relative_to(P.parent)),'sourceBox':box,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size}
(P/'asset-record.json').write_text(json.dumps(record,indent=2))
print('Extracted',len(cells),'tiles, total',sum(a['bytes'] for a in record['assets'].values()),'bytes')
