"""Register generated sheets to a shared 256px canvas with one scale per species."""
from PIL import Image,ImageDraw,ImageChops,ImageFilter,ImageOps
from pathlib import Path
import json,hashlib,statistics,numpy as np
P=Path(__file__).resolve().parent;D=['S','SW','W','NW','N','NE','E','SE']
def clean(im):
 a=im.getchannel('A');w,h=im.size;raw=a.tobytes();seen=set();components=[]
 for i,v in enumerate(raw):
  if v<48 or i in seen:continue
  q=[i];seen.add(i)
  for n in q:
   x=n%w;y=n//w
   for m in ([n-1] if x else [])+([n+1] if x<w-1 else [])+([n-w] if y else [])+([n+w] if y<h-1 else []):
    if m not in seen and raw[m]>=48:seen.add(m);q.append(m)
  components.append(q)
 if not components:raise ValueError('Empty cell')
 biggest=max(map(len,components));buf=bytearray(w*h)
 for q in components:
  if len(q)>=max(24,biggest*.004):
   for i in q:buf[i]=255
 mask=Image.frombytes('L',(w,h),bytes(buf)).filter(ImageFilter.MaxFilter(5));im.putalpha(ImageChops.multiply(a,mask));return im
def cuts(values,n):
 # Paint generators vary row spacing even when the requested grid is regular.
 # Cut at real transparent gutters near each expected divider, never through feet.
 result=[0];size=len(values)/n
 for i in range(1,n):
  expected=i*size;lo=max(result[-1]+1,round(expected-size*.30));hi=min(len(values)-1,round(expected+size*.30));runs=[];start=None
  for j in range(lo,hi+1):
   if values[j]==0 and start is None:start=j
   if (values[j]!=0 or j==hi) and start is not None:
    end=j if values[j]!=0 else j+1
    if end-start>=3:runs.append((start,end))
    start=None
  if runs:a,b=min(runs,key=lambda ab:abs((ab[0]+ab[1])/2-expected)-min(40,ab[1]-ab[0])*.1);cut=(a+b)//2
  else:cut=min(range(lo,hi+1),key=lambda j:values[j])
  result.append(cut)
 return result+[len(values)]
def cells(path,rows):
 sheet=Image.open(path).convert('RGBA');out=[];mask=np.array(sheet.getchannel('A'))>=100;ys=cuts(mask.sum(axis=1),rows)
 for i in range(4*rows):
  x=i%4;y=i//4;xs=cuts(mask[ys[y]:ys[y+1]].sum(axis=0),4);im=clean(sheet.crop((xs[x],ys[y],xs[x+1],ys[y+1])))
  box=im.getchannel('A').point(lambda v:255 if v>=48 else 0).getbbox();out.append(im.crop((max(0,box[0]-2),max(0,box[1]-2),min(im.width,box[2]+2),min(im.height,box[3]+2))))
 return out
def build():
 families=json.loads((P/'families.json').read_text());meta={'frameSize':256,'origin':[128,224],'directions':D,'monsters':{}}
 for k,cfg in families.items():
  src=P/'source-art'/f'{k}.png'
  if not src.exists():continue
  idle=cells(src,2);motionpath=P/'source-art'/f'{k}-motion.png';motion=cells(motionpath,4) if motionpath.exists() else []
  # User permits reflected monster views. Symmetric families use S/SW/W/NW/N
  # as canonical views; the bow/arrow archer keeps all eight painted hands.
  if k!='archer':
   for dest,source in [(5,3),(6,2),(7,1)]:
    idle[dest]=ImageOps.mirror(idle[source])
    if motion:
     for offset in [0,8]:motion[offset+dest]=ImageOps.mirror(motion[offset+source])
  # Generated sheets may have different pixel resolutions. Normalize the whole
  # motion sheet once using full-body walk heights, never per-direction warping.
  motion_unit=statistics.median(im.height for im in idle)/statistics.median(im.height for im in motion[:8]) if motion else 1
  motion=[im.resize((round(im.width*motion_unit),round(im.height*motion_unit)),Image.Resampling.LANCZOS) for im in motion]
  if k=='archer' and motion and (P/'source-art/archer-attack-S-N-fixed.png').exists():
   fix=Image.open(P/'source-art/archer-attack-S-N-fixed.png').convert('RGBA');ys=cuts((np.array(fix.getchannel('A'))>=100).sum(axis=1),2);fixed=[]
   for n in range(2):
    im=clean(fix.crop((0,ys[n],fix.width,ys[n+1])));im=im.crop(im.getchannel('A').point(lambda v:255 if v>=48 else 0).getbbox());fixed.append(im)
   unit=idle[0].height/fixed[0].height
   for n,index in enumerate([8,12]):
    im=fixed[n];motion[index]=im.resize((round(im.width*unit),round(im.height*unit)),Image.Resampling.LANCZOS)
  allcells=idle+motion;scale=min(cfg['height']/max(im.height for im in idle),224/max(im.width for im in allcells),216/max(im.height for im in allcells));anchor=cfg.get('anchor',224)
  dest=P/'assets'/k;dest.mkdir(exist_ok=True,parents=True);views={}
  for i,d in enumerate(D):
   frames=[]
   for im in [idle[i]]+([motion[i],motion[8+i]] if motion else []):
    im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS);frame=Image.new('RGBA',(256,256));frame.alpha_composite(im,(128-im.width//2,anchor-im.height));frames.append(frame)
   frames[0].save(dest/f'{d}.png');views[d]={'idle':f'assets/{k}/{d}.png','sha256':hashlib.sha256((dest/f'{d}.png').read_bytes()).hexdigest()}
   if motion:
    atlas=Image.new('RGBA',(512,256));atlas.alpha_composite(frames[1],(0,0));atlas.alpha_composite(frames[2],(256,0));atlas.save(dest/f'{d}-motion.png');views[d]['motion']=f'assets/{k}/{d}-motion.png'
  meta['monsters'][k]={'name':cfg['names'][0],'scale':scale,'motionSourceScale':motion_unit,'anchor':anchor,'height':cfg['height'],'source':f'source-art/{k}.png','motion':bool(motion),'views':views}
 (P/'monsters.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 print('Registered',len(meta['monsters']),'new families; same scale across each family and its motion poses')
if __name__=='__main__':build()
