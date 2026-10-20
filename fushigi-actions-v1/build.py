from pathlib import Path
from PIL import Image,ImageDraw
from scipy.ndimage import label,binary_dilation
import numpy as np,json,hashlib
P=Path(__file__).resolve().parent
base=json.load(open(P.parent/'fushigi-equipment-v3/assets/hero-base/base.json'))
guides=json.load(open(P/'guide-sockets.json'))
calibration=json.load(open(P/'calibration.json'))
meta={'version':1,'frameSize':256,'groundAnchor':base['groundAnchor'],'heightToGround':base['heightToGround'],'directions':{}}
def mask(im):return np.asarray(im)[:,:,3]>96
def foot(im):
 a=mask(im);ys,xs=np.where(a);bottom=int(ys.max()+1);band=a[max(0,bottom-32):bottom];xx=np.where(band)[1];return float(xx.mean()),bottom
for direction in ['S','SW','W','NW','N','NE','E','SE']:
 source=P/'source-art'/(direction+'.png');sheet=Image.open(source).convert('RGBA');canonical=Image.open(P.parent/'fushigi-equipment-v3/assets/hero-base'/(direction+'.png')).convert('RGBA');idle=next(d for d in base['directions'] if d['id']==direction);cells=[];boxes=[]
 for i in range(16):
  x,y=i%4,i//4;cell=sheet.crop((round(x*sheet.width/4),round(y*sheet.height/4),round((x+1)*sheet.width/4),round((y+1)*sheet.height/4)))
  a=np.array(cell);lab,n=label(a[:,:,3]>96);counts=np.bincount(lab.ravel());counts[0]=0;keep=binary_dilation(lab==counts.argmax(),iterations=2);a[:,:,3]=np.where(keep & (a[:,:,3]>=24),a[:,:,3],0);cell=Image.fromarray(a);cells.append(cell);boxes.append(cell.getbbox())
 target=canonical.getchannel('A').point(lambda x:255 if x>96 else 0).getbbox();scale=(target[3]-target[1])/float(np.median([b[3]-b[1] for b in boxes]));ground=foot(canonical);registered=[];transforms=[]
 for cell in cells:
  resized=cell.resize((round(cell.width*scale),round(cell.height*scale)),Image.Resampling.LANCZOS);fx,fy=foot(resized);offset=(round(ground[0]-fx),round(ground[1]-fy));out=Image.new('RGBA',(256,256));out.paste(resized,offset);registered.append(out);transforms.append({'scale':scale,'translate':offset})
 rows={}
 for j,action in enumerate(['walk','consume','scroll','staff']):
  frames=registered[j*4:j*4+4];tracks=[]
  for k in range(4):
   guide=guides[direction][j*4+k];neutral=guides[direction][1];row={}
   for hand in ['right','left']:
    a=guide[hand];b=neutral[hand];p=idle[hand]['position'];factor=1.25 if action=='consume' else 1
    row[hand]={**idle[hand],'position':[round(p[0]+(a[0]-b[0])*factor,2),round(p[1]+(a[1]-b[1])*factor,2)]}
   rx,ry,lx,ly=calibration[direction][action][k]
   row['right']['position']=[rx,ry];row['left']['position']=[lx,ly]
   tracks.append(row)
  if action=='walk':timings=[55]*4
  else:
   frames=[canonical.copy()]+frames+[canonical.copy()];tracks=[{'right':idle['right'],'left':idle['left']}]+tracks+[{'right':idle['right'],'left':idle['left']}];timings={'consume':[45,85,100,160,85,45],'scroll':[45,95,120,160,95,45],'staff':[35,65,75,100,70,35]}[action]
  outdir=P.parent/'assets/hero-actions-v1';outdir.mkdir(exist_ok=True);atlas=Image.new('RGBA',(256*len(frames),256))
  for k,frame in enumerate(frames):atlas.paste(frame,(k*256,0))
  filename=direction+'-'+action+'.webp';atlas.save(outdir/filename,quality=94,method=6,exact=True)
  rows[action]={'path':'assets/hero-actions-v1/'+filename,'frames':tracks,'frameMs':timings,'durationMs':sum(timings)}
 # Inspection sheet in registered art-space, red right-hand / blue left-hand sockets.
 review=Image.new('RGBA',(1024,1024),(225,223,216,255))
 for j,action in enumerate(['walk','consume','scroll','staff']):
  for k in range(4):
   review.alpha_composite(registered[j*4+k],(k*256,j*256));draw=ImageDraw.Draw(review)
   track=rows[action]['frames'][k if action=='walk' else k+1]
   for hand,color in [('right','#ff3040'),('left','#2080ff')]:
    x,y=track[hand]['position'];x+=k*256;y+=j*256;draw.ellipse((x-3,y-3,x+3,y+3),fill=color)
 review.save(P/(direction+'-registration.png'))
 meta['directions'][direction]={'actions':rows,'commonScale':scale,'transforms':transforms,'baseSha256':hashlib.sha256((P.parent/'fushigi-equipment-v3/assets/hero-base'/(direction+'.png')).read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest()}
(P/'actions.json').write_text(json.dumps(meta,indent=2))
print('Built 8 directions x 4 motion atlases')
