"""Register 2x2 painted motion sheets; one scale for all four poses of a direction."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageOps,ImageChops
import json,hashlib
P=Path(__file__).resolve().parent;ROOT=P.parent
D=['S','SW','W','NW','N','NE','E','SE']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def bbox(im):return im.getchannel('A').point(lambda a:255 if a>=48 else 0).getbbox()
def clean(im):
 from PIL.ImageFilter import MaxFilter
 a=im.getchannel('A');w,h=im.size;raw=a.tobytes();seen=set();largest=[]
 for i,v in enumerate(raw):
  if v<48 or i in seen:continue
  seen.add(i);q=[i]
  for n in q:
   x=n%w;y=n//w
   for m in ([n-1] if x else [])+([n+1] if x<w-1 else [])+([n-w] if y else [])+([n+w] if y<h-1 else []):
    if m not in seen and raw[m]>=48:seen.add(m);q.append(m)
  if len(q)>len(largest):largest=q
 mask=Image.new('L',im.size);buf=bytearray(w*h)
 for i in largest:buf[i]=255
 mask.frombytes(bytes(buf));im.putalpha(ImageChops.multiply(a,mask.filter(MaxFilter(5))));return im
meta={'version':1,'frameSize':256,'origin':[128,224],'poses':['walk-a','walk-b','windup','strike'],'walk':{'duration':320,'frames':[0,-1,1,-1]},'attack':{'duration':300,'frames':[-1,2,3,-1],'durations':[35,100,95,70]},'monsters':{}}
for kind in ['slime','goblin','bat']:
 out=P/'assets'/kind;out.mkdir(parents=True,exist_ok=True);views={}
 for d in (D if kind=='goblin' else ['S','SE','E','NE','N']):
  src=P/'source-art'/f'{kind}-{d}.png';sheet=Image.open(src).convert('RGBA');cells=[]
  for i in range(4):
   w,h=sheet.size;x=i%2;y=i//2
   top=565 if kind=='goblin' and d=='S' and i==2 else round(y*h/2)
   im=clean(sheet.crop((round(x*w/2),top,round((x+1)*w/2),round((y+1)*h/2))));cells.append((im,bbox(im)))
  base=Image.open(ROOT/'assets'/kind/f'{d}.png');bb=bbox(base)
  # Compare average WALK dimensions to idle; never scale each phase separately.
  if kind=='slime':scale=(bb[2]-bb[0])/sum(b[2]-b[0] for _,b in cells[:2])*2
  elif kind=='bat':scale=(bb[3]-bb[1])/sum(b[3]-b[1] for _,b in cells[:2])*2
  else:scale=(bb[3]-bb[1])/sum(b[3]-b[1] for _,b in cells[:2])*2
  # All poses retain their relative size. Reserve padding even for overhead clubs.
  scale=min(scale,232/max(b[2]-b[0] for _,b in cells),206/max(b[3]-b[1] for _,b in cells))
  # Single-frame corrections have different resolution: normalize their torso
  # height once to the source sheet's WALK height, then keep the shared scale.
  if kind=='goblin' and d in ['N','NW']:
   correction='goblin-N-strike-fixed.png' if d=='N' else 'goblin-NW-strike-right-hand.png'
   fixed=clean(Image.open(P/'source-art'/correction).convert('RGBA'));fb=bbox(fixed);fixed=fixed.crop(fb)
   reference_height=sum(b[3]-b[1] for _,b in cells[:2])/2*.91
   ratio=reference_height/fixed.height;fixed=fixed.resize((round(fixed.width*ratio),round(fixed.height*ratio)),Image.Resampling.LANCZOS)
   cell=Image.new('RGBA',(fixed.width+8,fixed.height+8));cell.alpha_composite(fixed,(4,4));cells[3]=(cell,bbox(cell))
  atlas=Image.new('RGBA',(512,512));registration=[]
  for i,(im,b) in enumerate(cells):
   crop=im.crop((max(0,b[0]-2),max(0,b[1]-2),min(im.width,b[2]+2),min(im.height,b[3]+2)))
   crop=crop.resize((max(1,round(crop.width*scale)),max(1,round(crop.height*scale))),Image.Resampling.LANCZOS)
   bottom=196 if kind=='bat' else 224
   if kind=='slime' and i==1:bottom-=12
   # Preserve grounded feet; flight uses the common hovering baseline.
   x=128-crop.width//2;y=bottom-crop.height
   frame=Image.new('RGBA',(256,256));frame.alpha_composite(crop,(x,y));atlas.alpha_composite(frame,(i%2*256,i//2*256))
   registration.append({'pose':i,'sourceBounds':list(b),'offset':[x,y],'visibleBounds':list(bbox(frame))})
  path=out/f'{d}.png';atlas.save(path);views[d]={'atlas':str(path.relative_to(P)),'mirror':False,'source':str(src.relative_to(P)),'sourceSha256':sha(src),'baseSha256':sha(ROOT/'assets'/kind/f'{d}.png'),'guideSha256':sha(P/'guides'/f'{kind}-{d}-sheet.png'),'sha256':sha(path),'scale':scale,'registration':registration}
  if kind=='goblin' and d in ['N','NW']:views[d]['strikeCorrection']={'source':'source-art/'+correction,'sourceSha256':sha(P/'source-art'/correction),'normalizedHeight':reference_height}
 if kind!='goblin':
  for d,s in [('SW','SE'),('W','E'),('NW','NE')]:
   original=Image.open(out/f'{s}.png');atlas=Image.new('RGBA',(512,512))
   for i in range(4):
    x=i%2*256;y=i//2*256;frame=ImageOps.mirror(original.crop((x,y,x+256,y+256)));atlas.alpha_composite(frame,(x+1,y))
   path=out/f'{d}.png';atlas.save(path);views[d]={'atlas':str(path.relative_to(P)),'mirror':True,'mirrorSource':s,'sha256':sha(path)}
 meta['monsters'][kind]={'directions':views}
 contact=Image.new('RGB',(256*4,280*8),'#26313d');draw=ImageDraw.Draw(contact)
 for row,d in enumerate(D):
  atlas=Image.open(out/f'{d}.png')
  for i in range(4):
   frame=atlas.crop((i%2*256,i//2*256,i%2*256+256,i//2*256+256));contact.paste(frame,(i*256,row*280),frame);draw.text((i*256+8,row*280+260),d+' '+meta['poses'][i],fill='white')
 contact.save(P/f'{kind}-all-poses.png')
(P/'motions.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print('Built 24 motion atlases / 96 painted or mirrored poses. Idle reused without modification.')
