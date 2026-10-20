from PIL import Image
from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent
concepts=[('forest','苔むす樹林'),('limestone','鍾乳洞'),('ruins','風化遺跡'),('ice','氷晶洞'),('volcano','火山洞')]
assets=['floor0','floor1','floor2','floor3','wallT0','wallT1','wallF0','wallF1','stairs']
manifest={'version':2,'pitchY':.82,'locations':[]}
for key,name in concepts:
 source=P/'source-art'/f'{key}.png';im=Image.open(source).convert('RGB');out=P.parent/'assets/dungeon/locations-v1'/key;out.mkdir(parents=True,exist_ok=True)
 entry={'id':key,'name':name,'filter':'none','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'assets':{}}
 for i,asset in enumerate(assets):
  x,y=i%3,i//3;box=(round(x*im.width/3)+4,round(y*im.height/3)+4,round((x+1)*im.width/3)-4,round((y+1)*im.height/3)-4)
  path=out/(asset+'.webp');im.crop(box).resize((256,256),Image.Resampling.LANCZOS).save(path,quality=90,method=6)
  entry['assets'][asset]={'path':str(path.relative_to(P.parent)),'sourceBox':box,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 manifest['locations'].append(entry)
(P/'assets.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('Built 45 assets:',sum(a['bytes'] for l in manifest['locations'] for a in l['assets'].values()),'bytes')
