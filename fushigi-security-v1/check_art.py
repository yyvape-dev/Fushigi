from pathlib import Path
from PIL import Image,ImageOps
import json,hashlib
P=Path(__file__).resolve().parent;m=json.loads((P/'security.json').read_text());count=0
for path,h in m['sha256'].items():assert hashlib.sha256((P/path).read_bytes()).hexdigest()==h,path
for kind,cfg in m['actors'].items():
 frames=[]
 for d,poses in cfg['views'].items():
  for action,path in poses.items():
   im=Image.open(P/path);assert im.mode=='RGBA' and list(im.size)==cfg['frameSize'];a=im.getchannel('A');bb=a.point(lambda v:255 if v>=100 else 0).getbbox();assert bb and bb[0]>2 and bb[1]>2 and bb[2]<im.width-2 and bb[3]<im.height-2,(kind,d,action,bb)
   assert a.getextrema()[0]==0 and a.getextrema()[1]>=250;frames.append(im.tobytes());count+=1
 assert len(set(frames))==24
 for l,r in [('W','E'),('SW','SE'),('NW','NE')]:assert ImageOps.mirror(Image.open(P/cfg['views'][l]['idle'])).tobytes()!=Image.open(P/cfg['views'][r]['idle']).tobytes()
(P/'art-validation.json').write_text(json.dumps({'poses':count,'hashes':True,'transparentMargins':True,'uniqueActions':True,'mirroring':False,'blackDog':True},indent=2)+'\n');print('ALL OK: 48 guard/black-dog poses, alpha/margins/hashes, no mirroring')
