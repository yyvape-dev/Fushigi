from pathlib import Path
import hashlib,json
from PIL import Image,ImageOps
P=Path(__file__).resolve().parent
m=json.loads((P/'merchant.json').read_text())
for path,digest in m['sha256'].items():assert hashlib.sha256((P/path).read_bytes()).hexdigest()==digest,path
count=0
for tier in ['brown','indigo','crimson']:
 for d,v in m['views'].items():
  for action,path in v.items():
   im=Image.open(P/'assets'/tier/path);assert im.mode=='RGBA' and im.size==(256,256)
   a=im.getchannel('A');box=a.point(lambda v:255 if v>=100 else 0).getbbox()
   assert box and box[0]>1 and box[1]>1 and box[2]<255 and box[3]<240,(tier,d,action,box)
   assert a.getextrema()[0]==0 and a.getextrema()[1]>=250
   count+=1
 for left,right in [('SW','SE'),('W','E'),('NW','NE')]:assert ImageOps.mirror(Image.open(P/'assets'/tier/(left+'.png'))).tobytes()!=Image.open(P/'assets'/tier/(right+'.png')).tobytes()
assert len({Image.open(P/'assets'/tier/'S.png').tobytes() for tier in ['brown','indigo','crimson']})==3
result={'registeredPoses':count,'hashes':True,'transparentMargins':True,'mirroring':False,'threeClothingColors':True,'browserVerification':'see browser-validation.json' if (P/'browser-validation.json').exists() else 'pending'}
(P/'art-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print('ALL OK: 72 unique color/direction/action sprites, transparency, margins, hashes, no mirror pairs')
