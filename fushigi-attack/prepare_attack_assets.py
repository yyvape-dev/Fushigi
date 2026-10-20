"""Slice generated art, register the head to this direction's immutable idle base.
No pose interpolation or limb warping. One common scale per directional sheet.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json,math,hashlib
from scipy.signal import correlate2d,fftconvolve
R=Path(__file__).parent
def gray(im):
 bg=Image.new('RGBA',im.size,(143,143,143,255));bg.alpha_composite(im);a=np.asarray(bg.convert('RGB')).astype(float);return .3*a[:,:,0]+.59*a[:,:,1]+.11*a[:,:,2]
def ncc(source,template):
 h,w=template.shape;H,W=source.shape;t=template-template.mean();num=fftconvolve(source,t[::-1,::-1],mode='valid')
 def window(a):
  i=np.pad(a,((1,0),(1,0))).cumsum(0).cumsum(1);return i[h:,w:]-i[:-h,w:]-i[h:,:-w]+i[:-h,:-w]
 sm=window(source);sq=window(source*source);den=np.sqrt(np.maximum(1e-8,sq-sm*sm/(w*h))*max(1e-8,(t*t).sum()));scores=num/den
 scores[min(124,scores.shape[0]):,:]=-2
 y,x=np.unravel_index(scores.argmax(),scores.shape);return float(scores[y,x]),int(x),int(y)
def foot_anchor(im):
 a=im.getchannel('A').point(lambda v:255 if v>64 else 0);b=a.getbbox();top=b[3]-max(16,round((b[3]-b[1])*.14));f=a.crop((0,top,256,256)).getbbox();return ((f[0]+f[2])/2,b[3])
def process(direction):
 source=R/'generated'/(direction+'.png');base=Image.open(R/'assets/hero-base'/(direction+'.png')).convert('RGBA');im=Image.open(source).convert('RGBA');cw,ch=im.width//2,im.height//2
 cells=[im.crop((k%2*cw,k//2*ch,(k%2+1)*cw,(k//2+1)*ch)).resize((256,256),Image.Resampling.LANCZOS) for k in range(4)]
 box=(48,24,208,132);template=base.crop(box);arrays=[gray(c) for c in cells];best=None
 for scale in np.linspace(.74,1.24,26):
  t=gray(template.resize((round(template.width*scale),round(template.height*scale)),Image.Resampling.LANCZOS));matches=[ncc(a,t) for a in arrays];score=sum(m[0] for m in matches)/4
  if best is None or score>best[0]:best=(score,float(scale),matches)
 score,scale,matches=best;out=R/'assets/hero-attack'/direction;out.mkdir(parents=True,exist_ok=True);frames=[base.copy()];reports=[];base_foot=foot_anchor(base)
 for k,(cell,match) in enumerate(zip(cells,matches)):
  quality,x,y=match;dx=box[0]-x/scale;dy=box[1]-y/scale
  # Keep a tiny attack lean instead of individually fitting whole-body bounding boxes.
  lean=[0,2,1,0][k];dy+=lean
  registered=cell.transform((256,256),Image.Transform.AFFINE,(scale,0,-dx*scale,0,scale,-dy*scale),resample=Image.Resampling.BICUBIC)
  foot=foot_anchor(registered);sx=round(base_foot[0]-foot[0]);sy=round(base_foot[1]-foot[1]);fixed=Image.new('RGBA',(256,256));fixed.paste(registered,(sx,sy));registered=fixed
  frames.append(registered);reports.append({'phase':k,'head_match_score':quality,'common_source_scale':scale,'source_head_position':[x,y],'translate':[dx,dy],'planted_foot_correction':[sx,sy],'head_registration_method':'normalized correlation against same-direction canonical head; common scale, whole-image translation only'})
 frames.append(base.copy());atlas=Image.new('RGBA',(256*6,256))
 for k,f in enumerate(frames):f.save(out/f'{k}.png');atlas.paste(f,(k*256,0))
 atlas.save(R/'assets/hero-attack'/(direction+'.png'))
 # Initial guide-based hand tracks; visible fists are calibrated in a later explicit table.
 base_meta=json.loads((R/'assets/hero-base/base.json').read_text());idle=next(d for d in base_meta['directions'] if d['id']==direction);guides=json.loads((R/'guide-motion.json').read_text());g=next(d for d in guides['directions'] if d['id']==direction);scale_guide=192/(g['ground'][1]-55)
 rows=[{'name':'idle-start','right':idle['right'].copy(),'left':idle['left'].copy(),'weaponLengthFactor':1,'weaponWidthFactor':1}]
 for p in g['phases']:
  row={'name':p['name'],'weaponLengthFactor':max(.40,p['weaponLengthFactor']),'weaponWidthFactor':max(.35,min(1,p['weaponLengthFactor']))}
  for hand,key,layer in [('right','right','rightLayer'),('left','left','leftLayer')]:
   row[hand]={'position':[round(128+(p[key][0]-g['ground'][0])*scale_guide,2),round(224+(p[key][1]-g['ground'][1])*scale_guide,2)],'layer':p[layer],'angle':p['weaponAngle'] if hand=='right' else 0,'gripMask':{'rx':7,'ry':6}}
  rows.append(row)
 rows.append({'name':'idle-end','right':idle['right'].copy(),'left':idle['left'].copy(),'weaponLengthFactor':1,'weaponWidthFactor':1})
 result={'id':direction,'frameMs':[35,70,40,55,60,40],'durationMs':300,'atlas':direction+'.png','frames':rows,'registration':reports,'canonical_sha256':hashlib.sha256((R/'assets/hero-base'/(direction+'.png')).read_bytes()).hexdigest(),'socketStatus':'guide-projected, art calibration pending'}
 (out/'motion.json').write_text(json.dumps(result,indent=2));print(direction,'head registration score',round(score,3),'scale',scale,flush=True)
 return result
if __name__=='__main__':
 import sys
 for d in sys.argv[1:]:process(d)
