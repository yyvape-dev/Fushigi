"""Register generated item/trap art and full-bleed stair materials."""
from pathlib import Path
from PIL import Image,ImageChops
from PIL.ImageFilter import MaxFilter
import json,hashlib
P=Path(__file__).resolve().parent;A=P.parent/'assets';OUT=A/'dungeon/experience-v1';OUT.mkdir(parents=True,exist_ok=True)
records=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for source,cols,rows,keys in [('icons',2,2,['gold','arrow','shop','coin']),('traps',3,2,['pit','mine','gas','hungry','warp','summon'])]:
 sheet=Image.open(P/'source-art'/f'{source}.png').convert('RGBA')
 for i,key in enumerate(keys):
  x=i%cols*sheet.width//cols;y=i//cols*sheet.height//rows
  im=sheet.crop((x,y,x+sheet.width//cols,y+sheet.height//rows));alpha=im.getchannel('A');mask=alpha.point(lambda a:255 if a>=160 else 0).filter(MaxFilter(5));im.putalpha(ImageChops.multiply(alpha,mask))
  b=im.getchannel('A').getbbox();im=im.crop(b);scale=224/max(im.size);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
  frame=Image.new('RGBA',(256,256));frame.alpha_composite(im,((256-im.width)//2,(256-im.height)//2))
  path=A/f'{key}.png' if source=='icons' and key in ['gold','arrow'] else OUT/f'{"trap-" if source=="traps" else ""}{key}.png';frame.save(path)
  records.append({'key':key,'source':source,'cell':i,'path':str(path.relative_to(P.parent)),'sha256':sha(path)})
for material in ['stairs','ceiling']:
 sheet=Image.open(P/'source-art'/f'{material}.png').convert('RGB')
 for i,key in enumerate(['forest','limestone','ruins','ice','volcano']):
  x=i%3*512;y=i//3*512;im=sheet.crop((x,y,x+512,y+512));path=OUT/f'{material}-{key}.webp';im.save(path,quality=94)
  records.append({'key':material+'-'+key,'source':material,'cell':i,'path':str(path.relative_to(P.parent)),'sha256':sha(path)})
(P/'assets.json').write_text(json.dumps({'dateJST':'2026-10-21','assets':records},ensure_ascii=False,indent=2)+'\n')
print('Registered 4 item/shop icons, 6 traps, 5 full-tile stairs, 5 ceiling materials.')
