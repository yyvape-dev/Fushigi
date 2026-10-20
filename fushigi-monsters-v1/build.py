"""Reproducible sheet extraction: alpha island cleanup, common scale, foot anchors."""
from PIL import Image, ImageOps, ImageDraw
from pathlib import Path
import json, hashlib
P=Path(__file__).resolve().parent
D=['S','SW','W','NW','N','NE','E','SE']
CONFIG={
 'slime':dict(name='スライム',cols=5,rows=1,dirs=['S','SE','E','NE','N'],height=92,anchor=224),
 'goblin':dict(name='ゴブリン',cols=4,rows=2,dirs=D,height=154,anchor=224,source='faces-v2/goblin.png'),
 'bat':dict(name='コウモリ',cols=5,rows=1,dirs=['S','SE','E','NE','N'],height=112,anchor=196,cuts=[0,501,940,1235,1677,2172],source='faces-v2/bat.png'),
}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def clean(im):
    # Keep the largest connected visible island plus soft alpha immediately around it.
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
    mask.frombytes(bytes(buf))
    from PIL.ImageFilter import MaxFilter
    from PIL import ImageChops
    a=ImageChops.multiply(a,mask.filter(MaxFilter(5)));im.putalpha(a)
    return im
meta={'version':2,'status':'simplified-monster-face-review; not approved; not integrated','frameSize':256,'origin':[128,224],'heroHeight':192,'directions':D,'monsters':{}}
for kind,cfg in CONFIG.items():
    src=P/'source-art'/cfg.get('source',f'{kind}.png');sheet=Image.open(src).convert('RGBA');cells={}
    for i,d in enumerate(cfg['dirs']):
        x=i%cfg['cols'];y=i//cfg['cols'];w,h=sheet.size
        cuts=cfg.get('cuts');cell=sheet.crop((cuts[x] if cuts else round(x*w/cfg['cols']),round(y*h/cfg['rows']),cuts[x+1] if cuts else round((x+1)*w/cfg['cols']),round((y+1)*h/cfg['rows'])))
        cell=clean(cell);bbox=cell.getchannel('A').point(lambda a:255 if a>=48 else 0).getbbox()
        if kind=='goblin' and d=='SE' and not cfg.get('source'):
            # Regenerated SE right-hand fix at higher resolution. Normalize once to
            # the original sheet's physical height before the shared species scale.
            fixed=clean(Image.open(P/'source-art'/'goblin-SE-fixed.png').convert('RGBA'))
            fb=fixed.getchannel('A').point(lambda a:255 if a>=48 else 0).getbbox()
            fixed=fixed.crop(fb);ratio=(bbox[3]-bbox[1])/fixed.height
            fixed=fixed.resize((round(fixed.width*ratio),bbox[3]-bbox[1]),Image.Resampling.LANCZOS)
            cell=Image.new('RGBA',(fixed.width+8,fixed.height+8));cell.alpha_composite(fixed,(4,4));bbox=(4,4,fixed.width+4,fixed.height+4)
        cells[d]=(cell,bbox)
    # One common scale per creature, never separate per-direction rescaling.
    scale=min(cfg['height']/max(b[3]-b[1] for _,b in cells.values()),224/max(b[2]-b[0] for _,b in cells.values()))
    out=P/'assets'/kind;out.mkdir(parents=True,exist_ok=True);records={}
    for d,(cell,b) in cells.items():
        crop=cell.crop((max(0,b[0]-3),max(0,b[1]-3),min(cell.width,b[2]+3),min(cell.height,b[3]+3)))
        crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
        frame=Image.new('RGBA',(256,256));frame.alpha_composite(crop,(128-crop.width//2,cfg['anchor']-crop.height));frame.save(out/f'{d}.png')
        records[d]={'source':d,'mirror':False,'path':f'assets/{kind}/{d}.png','sha256':sha(out/f'{d}.png')}
        if kind=='goblin' and d=='SE' and not cfg.get('source'):records[d]['override']={'source':'source-art/goblin-SE-fixed.png','sha256':sha(P/'source-art'/'goblin-SE-fixed.png'),'reason':'Correct club from left to anatomical right hand'}
    if kind!='goblin':
        for d,s in [('SW','SE'),('W','E'),('NW','NE')]:
            # Reflect about x=128, keeping the same exact foot anchor (not x=127.5).
            im=Image.open(out/f'{s}.png');flipped=ImageOps.mirror(im);frame=Image.new('RGBA',(256,256));frame.alpha_composite(flipped,(1,0));frame.save(out/f'{d}.png')
            records[d]={'source':s,'mirror':True,'path':f'assets/{kind}/{d}.png','sha256':sha(out/f'{d}.png')}
    meta['monsters'][kind]={'name':cfg['name'],'scale':scale,'bodyHeight':cfg['height'],'visualBottom':cfg['anchor'],'source':str(src.relative_to(P)),'sourceSha256':sha(src),'views':records}
    contact=Image.new('RGB',(256*4,288*2),'#26313d');dr=ImageDraw.Draw(contact)
    for i,d in enumerate(D):
        x=i%4*256;y=i//4*288;im=Image.open(out/f'{d}.png');contact.paste(im,(x,y),im);dr.line((x+90,y+224,x+166,y+224),fill='#d7ba73');dr.text((x+12,y+260),d+(' mirrored' if records[d]['mirror'] else ''),fill='white')
    contact.save(P/f'{kind}-contact.png')
(P/'monsters.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print('Built 24 idle sprites. Common scale per species; original sheets preserved.')
