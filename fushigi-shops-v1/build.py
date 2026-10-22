"""Register merchant art with one shared source scale; blue cloth palette only."""
from pathlib import Path
import colorsys,hashlib,importlib.util,json,sys
from PIL import Image,ImageDraw
import numpy as np
sys.dont_write_bytecode=True
P=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('register',P.parent/'fushigi-monsters-v2/build.py');r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
D=['S','SW','W','NW','N','NE','E','SE']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def contact(im):
 a=im.getchannel('A').point(lambda v:255 if v>=100 else 0);b=a.getbbox();top=max(b[1],b[3]-round((b[3]-b[1])*.06));bb=a.crop((0,top,im.width,b[3])).getbbox();return [(bb[0]+bb[2])/2,top+bb[3]-4],[bb[0],top+bb[1],bb[2],top+bb[3]],b[1]
def palette(im,tier):
 a=np.array(im);rgb=a[:,:,:3]/255.;mx=rgb.max(2);mn=rgb.min(2);delta=mx-mn
 # Only blue cloth. Warm hair/leather and neutral shirt/trousers retain pixels.
 for y,x in zip(*np.where((a[:,:,3]>0)&(delta>.006))):
  h,s,v=colorsys.rgb_to_hsv(*rgb[y,x])
  if .50<h<.90 and s>.035:
   h2,s2,v2={'brown':(.085,max(.48,min(.7,s*1.4)),min(1,v*1.14)),'indigo':(.62,max(.40,min(.65,s*1.2)),min(1,v*1.08)),'crimson':(.985,max(.65,min(.85,s*1.8)),min(1,v*1.18))}[tier]
   a[y,x,:3]=[round(c*255) for c in colorsys.hsv_to_rgb(h2,s2,v2)]
 return Image.fromarray(a)
def main():
 allcells={action:r.cells(P/'source-art'/f'{action}-eight.png',2) for action in ['idle','walk','attack']}
 c,b,top=contact(allcells['idle'][0]);scale=191/(c[1]-top)
 meta={'name':'店主','frameSize':[256,256],'origin':[128,224],'renderScale':1,'sharedSourceScale':scale,'mirroring':False,'views':{},'sha256':{},'registration':{}}
 sheet=Image.new('RGB',(1536,3*224),'#292535');g=ImageDraw.Draw(sheet)
 colors=Image.new('RGB',(1024,256),'#292535')
 for row,(action,cells) in enumerate(allcells.items()):
  meta['registration'][action]={}
  for i,(d,im) in enumerate(zip(D,cells)):
   (cx,cy),band,crown=contact(im);frame=im.transform((256,256),Image.Transform.AFFINE,(1/scale,0,cx-128/scale,0,1/scale,cy-224/scale),Image.Resampling.BICUBIC)
   meta['registration'][action][d]={'sourceSize':im.size,'bootBand':band,'contact':[cx,cy],'crownY':224+(crown-cy)*scale}
   meta['views'].setdefault(d,{})[action]=f'{d}'+('' if action=='idle' else '-'+action)+'.png'
   for tier in ['brown','indigo','crimson']:
    dest=P/'assets'/tier;dest.mkdir(parents=True,exist_ok=True);paint=palette(frame,tier);paint.save(dest/meta['views'][d][action])
    if action=='idle' and d=='S':colors.paste(paint,({'brown':1,'indigo':2,'crimson':3}[tier]*256,0),paint)
   sample=palette(frame,'brown').resize((166,166));sheet.paste(sample,(i*192+13,row*224+30),sample);g.text((i*192+8,row*224+7),d+' '+action,fill='#e2c89c');g.line((i*192,row*224+175,i*192+192,row*224+175),fill='#514d49')
 lana=Image.open(P.parent/'fushigi-equipment-v3/assets/hero-base/S.png');colors.paste(lana,(0,0),lana)
 sheet.save(P/'all-poses.png');colors.save(P/'three-colors.png')
 if (P/'source-art/carpet.png').exists():Image.open(P/'source-art/carpet.png').resize((256,256),Image.Resampling.LANCZOS).save(P/'assets/carpet.png')
 for path in sorted((P/'source-art').glob('*.png')):meta['sha256'][str(path.relative_to(P))]=sha(path)
 for path in sorted((P/'assets').rglob('*.png')):meta['sha256'][str(path.relative_to(P))]=sha(path)
 (P/'merchant.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n');print('Registered 72 poses, shared scale',scale)
if __name__=='__main__':main()
