"""Shared source scaling and explicit paw/boot contacts; no reflected views."""
from pathlib import Path
import hashlib,importlib.util,json,sys
from PIL import Image,ImageDraw
import numpy as np
sys.dont_write_bytecode=True
P=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('register',P.parent/'fushigi-monsters-v2/build.py');r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
D=['S','SW','W','NW','N','NE','E','SE']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def ground(im):
 a=np.array(im.getchannel('A'))>=100;ys,xs=np.where(a);bottom=ys.max()+1;top=max(0,bottom-round((bottom-ys.min())*.075));band=a[top:bottom].copy();h,w=band.shape;parts=[]
 for y,x in zip(*np.where(band)):
  if not band[y,x]:continue
  q=[(int(x),int(y))];band[y,x]=False
  for px,py in q:
   for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
    if 0<=nx<w and 0<=ny<h and band[ny,nx]:band[ny,nx]=False;q.append((nx,ny))
  xx=[p[0] for p in q];yy=[p[1] for p in q];bb=[min(xx),top+min(yy),max(xx)+1,top+max(yy)+1]
  if bb[2]-bb[0]>=max(5,im.width*.065):parts.append(bb)
 if not parts:raise ValueError('No foot band')
 box=[min(b[0] for b in parts),min(b[1] for b in parts),max(b[2] for b in parts),max(b[3] for b in parts)]
 return [(box[0]+box[2])/2,box[3]-4],box

def largest_dog(im):
 from PIL import ImageChops,ImageFilter
 a=im.getchannel('A');data=np.array(a)>=48;h,w=data.shape;largest=[]
 for y,x in zip(*np.where(data)):
  if not data[y,x]:continue
  q=[(int(x),int(y))];data[y,x]=False
  for px,py in q:
   for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
    if 0<=nx<w and 0<=ny<h and data[ny,nx]:data[ny,nx]=False;q.append((nx,ny))
  if len(q)>len(largest):largest=q
 mask=Image.new('L',im.size);buf=np.zeros((h,w),dtype=np.uint8)
 for x,y in largest:buf[y,x]=255
 mask=Image.fromarray(buf).filter(ImageFilter.MaxFilter(3));im.putalpha(ImageChops.multiply(a,mask));return im

def cells_wide(path):
 sheet=Image.open(path).convert('RGBA');a=np.array(sheet.getchannel('A'))>=100;ys=r.cuts(a.sum(axis=1),4);out=[]
 for row in range(4):
  xs=r.cuts(a[ys[row]:ys[row+1]].sum(axis=0),2)
  for col in range(2):
   im=r.clean(sheet.crop((xs[col],ys[row],xs[col+1],ys[row+1])));bb=im.getchannel('A').point(lambda v:255 if v>=48 else 0).getbbox();out.append(im.crop(bb))
 return out

def main():
 meta={'actors':{},'mirroring':False,'sha256':{},'registration':{}}
 contact=Image.new('RGB',(2560,6*235),'#2b2632');g=ImageDraw.Draw(contact)
 for ki,kind in enumerate(['guard','dog']):
  sheets={a:(cells_wide(P/'source-art/guard-attack-wide.png') if kind=='guard' and a=='attack' else r.cells(P/'source-art'/f'{kind}-{a}.png',2)) for a in ['idle','walk','attack']}
  (cx,cy),bb=ground(sheets['idle'][0]);first=sheets['idle'][0];alpha=first.getchannel('A').point(lambda v:255 if v>=100 else 0)
  crown=alpha.crop((round(first.width*.38),0,round(first.width*.72),first.height)).getbbox()[1] if kind=='guard' else alpha.getbbox()[1]
  height=191 if kind=='guard' else 128;scale=height/(cy-crown);frameSize=[512,320] if kind=='guard' else [256,256];origin=[256,280] if kind=='guard' else [128,224]
  actor={'name':'番兵' if kind=='guard' else '番犬','frameSize':frameSize,'origin':origin,'bodyHeight':height,'sharedScale':scale,'views':{}};meta['actors']['shop_'+kind]=actor;meta['registration'][kind]={}
  for row,(action,cells) in enumerate(sheets.items()):
   start=cells[0];(_,footY),_=ground(start);a=start.getchannel('A').point(lambda v:255 if v>=100 else 0);crownA=a.crop((round(start.width*.38),0,round(start.width*.72),start.height)).getbbox()[1] if kind=='guard' else a.getbbox()[1];actionScale=height/(footY-crownA)
   for i,(d,im) in enumerate(zip(D,cells)):
    if kind=='dog':im=largest_dog(im)
    sourceScale=actionScale;source='source-art/guard-attack-wide.png' if kind=='guard' and action=='attack' else f'source-art/{kind}-{action}.png'
    fix=P/'source-art'/f'{kind}-{action}-{d}-fixed.png'
    if fix.exists():
     raw=r.clean(Image.open(fix).convert('RGBA'));im=raw.crop(raw.getchannel('A').point(lambda v:255 if v>=48 else 0).getbbox());(fx,fy),fb=ground(im);mask=im.getchannel('A').point(lambda v:255 if v>=100 else 0);head=mask.crop((round(im.width*.35),0,round(im.width*.72),im.height)).getbbox()[1];sourceScale=height/(fy-head);source=str(fix.relative_to(P))
    (cx,cy),band=ground(im);ax,ay=origin;frame=im.transform(tuple(frameSize),Image.Transform.AFFINE,(1/sourceScale,0,cx-ax/sourceScale,0,1/sourceScale,cy-ay/sourceScale),Image.Resampling.BICUBIC)
    dest=P/'assets'/kind;dest.mkdir(parents=True,exist_ok=True);path=dest/f'{d}-{action}.png';frame.save(path);actor['views'].setdefault(d,{})[action]=str(path.relative_to(P));meta['registration'][kind][d+'-'+action]={'source':source,'contact':[cx,cy],'bootOrPawBand':band,'sourceScale':sourceScale}
    preview=frame.resize((round(frame.width*.6),round(frame.height*.6)),Image.Resampling.LANCZOS);x=i*320+160-preview.width//2;y=(ki*3+row)*235+25;contact.paste(preview,(x,y),preview);g.text((i*320+6,(ki*3+row)*235+4),kind+' '+d+' '+action,fill='#e2c7aa')
  print(kind,'scale',scale,'bodyheight',height)
 for f in sorted((P/'source-art').glob('*.png')):meta['sha256'][str(f.relative_to(P))]=sha(f)
 for f in sorted((P/'assets').rglob('*.png')):meta['sha256'][str(f.relative_to(P))]=sha(f)
 contact.save(P/'all-poses.png');(P/'security.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2,default=lambda v:v.item())+'\n')
 print('Registered 48 hand-painted guard/dog poses; black dog, no mirroring')
if __name__=='__main__':main()
