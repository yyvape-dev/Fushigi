"""Deterministic chroma removal and grip registration; no image repainting."""
from pathlib import Path
import json, hashlib, shutil
import numpy as np
from PIL import Image, ImageDraw

R=Path(__file__).parent
KEYS=['woodsword','bronzesword','katana','dotanuki','minoaxe','renkentou','kamaitachi','healsword','steakknife','harisen','skyblade','firesword']
NAMES=['木刀','青銅の太刀','カタナ','どうたぬき','ミノタウロスの斧','連撃刀','妖刀かまいたち','回復の剣','ステーキナイフ','巨大ハリセン','空の刃','火迅風魔刀']
ART={'catalog':'exec-a9a1d0c7-fa42-4659-a3e2-9b5446f3b19f.png','kamaitachi':'exec-658018d5-a912-4098-901c-0ce75e5abad9.png','skyblade':'exec-bce2de08-186e-42f2-b4a4-b65d3a6aed8e.png','firesword':'exec-8f9d2a70-d03d-4acb-b61d-8f6c14c0ffdf.png'}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def key_out(im):
 a=np.asarray(im.convert('RGB')).astype(float)
 # Matte by distance from magenta, then remove the magenta spill in mixed edge pixels.
 distance=np.max(np.abs(a-[255,0,255]),axis=2)
 alpha=np.clip((distance-12)/100,0,1)
 # Pink generation fringes have both red and blue much brighter than green.
 pink=(a[:,:,0]>170)&(a[:,:,2]>170)&(a[:,:,1]<100)
 alpha[pink]=0
 safe=np.maximum(alpha,.001)
 rgb=np.clip((a-(1-alpha[:,:,None])*[255,0,255])/safe[:,:,None],0,255)
 out=np.dstack([rgb,alpha*255]).astype('uint8');out[alpha==0]=0
 return Image.fromarray(out)
def build():
 for d in ['source-art','items','assets','emission']:(R/d).mkdir(parents=True,exist_ok=True)
 sheet=Image.open(R/'source-art/catalog.png');entries=[]
 for i,key in enumerate(KEYS):
  if key in ('kamaitachi','skyblade','firesword'):
   src=f'source-art/{key}.png';im=Image.open(R/src);box=[0,0,*im.size];grip=[627,1025]
  else:
   src='source-art/catalog.png';im=sheet
   box=[round(i%4*sheet.width/4),[0,420,840][i//4],round((i%4+1)*sheet.width/4),[420,840,1330][i//4]]
   grip=[[155,450,736,1034][i%4],[345,775,1215][i//4]]
  obj=key_out(im.crop(box));bounds=obj.getbbox();gx,gy=grip[0]-box[0],grip[1]-box[1]
  scale=384/(gy-bounds[1]);crop=obj.crop(bounds);size=[round(crop.width*scale),round(crop.height*scale)]
  pos=[round(256-(gx-bounds[0])*scale),26]
  assert min(pos)>=0 and pos[0]+size[0]<=512 and pos[1]+size[1]<=512,(key,pos,size)
  item=Image.new('RGBA',(512,512));item.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),pos)
  bg=Image.new('RGB',(512,512),'#ff00ff');bg.paste(item,mask=item.getchannel('A'));bg.save(R/'items'/f'{key}.png')
  # Same approved v3 tip-to-grip distance and pivot as the old catalog.
  k=175/384;registered=Image.new('RGBA',(192,256));registered.alpha_composite(item.resize((round(512*k),round(512*k)),Image.Resampling.LANCZOS),(round(96-256*k),round(210-410*k)))
  blade_end=178;grip_y=210
  if key in ('kamaitachi','skyblade','firesword'):
   # Extend only the blade by 35%; keep hilt width, length and hand socket intact.
   padding=64;blade_scale=1.35
   longer=Image.new('RGBA',(192,320));length=round(blade_end*blade_scale)
   longer.alpha_composite(registered.crop((0,0,192,blade_end)).resize((192,length),Image.Resampling.LANCZOS),(0,padding+blade_end-length))
   longer.alpha_composite(registered.crop((0,blade_end,192,256)),(0,padding+blade_end))
   registered=longer;blade_end+=padding;grip_y+=padding
  registered.save(R/'assets'/f'{key}.png')
  e=dict(key=key,name=NAMES[i],path=f'assets/{key}.png',grip=[96,grip_y],size=list(registered.size),renderScale=.66,source=src,sourceCell=box,sourceGrip=grip,sourceSha256=sha(R/src),spriteSha256=sha(R/'assets'/f'{key}.png'),view='front')
  if key in ('kamaitachi','skyblade','firesword'):
   # Illuminate blade only. Keep the ornate guard, hand and leather unlit.
   e['bladeLengthScale']=1.35
   mask=registered.copy();a=np.array(mask);a[blade_end:]=0;mask=Image.fromarray(a);mask.save(R/'emission'/f'{key}.png')
   e['glow']={'path':f'emission/{key}.png','color':{'kamaitachi':'#f32645','skyblade':'#2f9dff','firesword':'#b31527'}[key],'darkCore':key=='firesword'}
  entries.append(e)
 (R/'weapons.json').write_text(json.dumps(dict(version=2,status='Production redesign; adopted individual designs and heavier catalog',approvedBaseline='../fushigi-equipment-v3/',weapons=entries),ensure_ascii=False,indent=2)+'\n')
 contact=Image.new('RGB',(768,864),'#24252b');d=ImageDraw.Draw(contact)
 for i,e in enumerate(entries):
  x=i%4*192;y=i//4*288;im=Image.open(R/e['path']);im.thumbnail((192,256));contact.paste(im,(x+(192-im.width)//2,y),im);d.text((x+8,y+264),e['key'],fill='#eeeeee')
 contact.save(R/'catalog.png')
 print(json.dumps({e['key']:Image.open(R/e['path']).getbbox() for e in entries}))
if __name__=='__main__':build()
