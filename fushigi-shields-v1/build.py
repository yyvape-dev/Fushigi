"""Extract actual four-view shield artwork; never squash/mirror a front sprite."""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import label,find_objects

R=Path(__file__).parent;V=R.parent/'fushigi-equipment-v3'
KEYS=['bronzeshield','tekkoshield','onioookami','battlecounter','mikiri','konjo','zekkocho','haramochi','steakplate','minoshield']
NAMES=['青銅甲の盾','鉄甲の盾','おにおおかみ','バトルカウンター','見切りの盾','根性の盾','絶好調の盾','ハラモチの盾','ステーキプレート','ミノタウロスの盾']
VIEWS=['front','quarter','side','back']
# Original source-art leather grip centres, identified by visual inspection.
BACK_GRIPS=[(948,141),(950,390),(947,647),(949,917),(949,1182),(1075,121),(1073,351),(1075,598),(1071,814),(1075,1041)]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def components(path,count=20,cols=4):
 im=Image.open(path).convert('RGBA');a=np.array(im);lab,n=label(a[:,:,3]>100);boxes=[]
 for i,s in enumerate(find_objects(lab),1):
  if s and int((lab[s]==i).sum())>1000:boxes.append((s[1].start,s[0].start,s[1].stop,s[0].stop))
 assert len(boxes)==count,(path,len(boxes))
 # Group by vertical centre: generated spacing need not exactly follow uniform cells.
 boxes.sort(key=lambda b:(b[1]+b[3])/2)
 rows=[sorted(boxes[i:i+cols]) for i in range(0,count,cols)]
 return im,rows
def build():
 (R/'assets').mkdir(exist_ok=True);entries=[]
 for batch in range(2):
  source=R/'source-art'/('shields-a.png' if batch==0 else 'shields-b.png');im,rows=components(source)
  for row,boxes in enumerate(rows):
   i=batch*5+row;key=KEYS[i];folder=R/'assets'/key;folder.mkdir(exist_ok=True)
   # One apparent height for ALL views. Width caps match v3, with 64px for real raised side relief.
   height=min([152]+[cap*(b[3]-b[1])/(b[2]-b[0]) for cap,b in zip([144,112,64,144],boxes)])
   views={}
   for view,box in zip(VIEWS,boxes):
    obj=im.crop(box);arr=np.array(obj);arr[arr[:,:,3]<40]=0;obj=Image.fromarray(arr)
    scale=height/obj.height;size=(round(obj.width*scale),round(height))
    grip=(BACK_GRIPS[i][0]-box[0],BACK_GRIPS[i][1]-box[1]) if view=='back' else (obj.width/2,obj.height/2)
    xy=(round(80-grip[0]*scale),round(96-grip[1]*scale))
    assert xy[0]>=2 and xy[1]>=2 and xy[0]+size[0]<=158 and xy[1]+size[1]<=190,(key,view,size,xy)
    canvas=Image.new('RGBA',(160,192));canvas.alpha_composite(obj.resize(size,Image.Resampling.LANCZOS),xy);path=folder/f'{view}.png';canvas.save(path)
    views[view]=dict(path=path.relative_to(R).as_posix(),size=[160,192],grip=[80,96],sourceBox=list(box),sourceGrip=[box[0]+grip[0],box[1]+grip[1]],scale=scale,sha256=sha(path))
   entries.append(dict(key=key,name=NAMES[i],renderScale=.59,source=source.relative_to(R).as_posix(),sourceSha256=sha(source),registeredHeight=height,views=views,reviewStatus='candidate'))
 # SE needs the opposite yaw from SW. Use newly painted art, keeping all original four views unchanged.
 source=R/'source-art/shields-se.png';im,rows=components(source,count=10,cols=5)
 for entry,box in zip(entries,[box for row in rows for box in row]):
  obj=im.crop(box);arr=np.array(obj);arr[arr[:,:,3]<40]=0;obj=Image.fromarray(arr)
  prior=Image.open(R/entry['views']['quarter']['path']).getbbox()
  scale=min((prior[2]-prior[0])/obj.width,(prior[3]-prior[1])/obj.height)
  size=(round(obj.width*scale),round(obj.height*scale));xy=(round(80-size[0]/2),round(96-size[1]/2))
  out=Image.new('RGBA',(160,192));out.alpha_composite(obj.resize(size,Image.Resampling.LANCZOS),xy)
  path=R/'assets'/entry['key']/'quarter-se.png';out.save(path)
  entry['views']['quarter-se']=dict(path=path.relative_to(R).as_posix(),size=[160,192],grip=[80,96],source=source.relative_to(R).as_posix(),sourceSha256=sha(source),sourceBox=list(box),sourceGrip=[(box[0]+box[2])/2,(box[1]+box[3])/2],scale=scale,sha256=sha(path),facing='screen-right; visible left thickness; independent painted artwork')
 baseline=['assets/hero-base/base.json','assets/hero-attack/attack.json','hero-base-renderer.js','hero-attack-renderer.js']
 mapping={d['id']:d['shieldView'] for d in json.loads((V/'assets/hero-base/base.json').read_text())['directions']};mapping['SE']='quarter-se'
 meta=dict(version=2,status='Ten five-view shield candidates; SE yaw correction pending user review',approvedBaseline='../fushigi-equipment-v3/',shieldRenderScale=.59,weaponRenderScale=.66,viewMapping=mapping,shields=entries,baselineHashes={p:sha(V/p) for p in baseline})
 (R/'shields.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 contact=Image.new('RGB',(1000,10*228),'#e8e3d9');g=ImageDraw.Draw(contact)
 for row,e in enumerate(entries):
  for col,view in enumerate(['front','quarter','quarter-se','side','back']):
   obj=Image.open(R/e['views'][view]['path']);contact.paste(obj,(col*200+20,row*228+20),obj);g.text((col*200+8,row*228+210),e['key']+' / '+view,fill='#273536')
 contact.save(R/'shield-views-catalog.png')
 front=Image.new('RGB',(800,456),'#e8e3d9');g=ImageDraw.Draw(front)
 for i,e in enumerate(entries):
  obj=Image.open(R/e['views']['front']['path']);xy=((i%5)*160,(i//5)*228);front.paste(obj,xy,obj);g.text((xy[0]+6,xy[1]+200),e['key'],fill='#273536')
 front.save(R/'shields-catalog.png');print('Built 50 actual-view shield sprites; independent SE yaw, original 40 sprites retained')
if __name__=='__main__':build()
