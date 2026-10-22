"""Register painted motion without changing any locked idle image."""
from pathlib import Path
import hashlib,json,statistics
from PIL import Image,ImageDraw
P=Path(__file__).resolve().parent
D=['S','SW','W','NW','N','NE','E','SE']
SPECS={
 'walk':{'path':'walk-eight.png','cells':[(0,0,317,306),(317,0,642,306),(642,0,956,306),(956,0,1278,306),(0,306,336,610),(336,306,652,610),(652,306,993,610),(993,306,1278,610)],
         'boots':[(120,244,230,306),(465,245,555,306),(700,235,850,305),(1070,240,1180,306),(110,540,215,608),(440,540,540,605),(720,535,900,607),(1090,535,1230,610)],'crowns':[5,7,6,6,310,308,310,311]},
 'attack':{'path':'attack-eight.png','cells':[(0,0,388,436),(388,0,854,436),(854,0,1315,436),(1315,0,1774,436),(0,436,416,887),(416,436,901,887),(901,436,1351,887),(1351,436,1774,887)],
           'boots':[(115,355,260,425),(590,355,705,425),(1015,350,1240,425),(1455,350,1675,435),(125,765,260,845),(550,750,745,835),(980,760,1220,845),(1410,760,1645,845)],'crowns':[47,75,78,66,520,489,495,510]}
}
def hashfile(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def measure(im,band,inset):
 box=im.crop(band).getchannel('A').point(lambda a:255 if a>=100 else 0).getbbox();assert box
 box=[band[0]+box[0],band[1]+box[1],band[0]+box[2],band[1]+box[3]]
 return [(box[0]+box[2])/2,box[3]-inset],box
def main():
 meta=json.loads((P/'ally.json').read_text());frames={d:[] for d in D};motion={}
 for action,spec in SPECS.items():
  sheet=Image.open(P/'source-art'/spec['path']).convert('RGBA');contacts=[];bands=[]
  for band in spec['boots']:
   contact,box=measure(sheet,band,5 if action=='walk' else 6);contacts.append(contact);bands.append(box)
  height=(contacts[0][1]-spec['crowns'][0]) if action=='attack' else statistics.median(contacts[i][1]-spec['crowns'][i] for i in range(8))
  scale=191/height;motion[action]={'source':spec['path'],'sharedScale':scale,'views':{}}
  for i,d in enumerate(D):
   source=sheet;cell=spec['cells'][i];ax,ay=contacts[i];local_scale=scale;source_crown=spec['crowns'][i]
   if action=='walk' and d=='NE':
    source=Image.open(P/'source-art/NE-walk-fixed.png').convert('RGBA');cell=(0,0,*source.size)
    contact,box=measure(source,(430,1050,760,1240),18)
    # The repair has a different source resolution; normalize its entire image
    # by the canonical source head-to-contact height, never distort body parts.
    source_crown=95;local_scale=scale*(contacts[i][1]-spec['crowns'][i])/(contact[1]-source_crown);ax,ay=contact;bands[i]=box
   frame=source.crop(cell).transform((320,256),Image.Transform.AFFINE,(1/local_scale,0,ax-cell[0]-160/local_scale,0,1/local_scale,ay-cell[1]-224/local_scale),Image.Resampling.BICUBIC)
   # Keep the painted canvas; no per-pose warping or idle substitutions.
   frames[d].append(frame)
   motion[action]['views'][d]={'sourceCell':cell,'sourceBootBand':bands[i],'sourceContact':[ax,ay],'sourceCrownY':source_crown,'scale':local_scale}
   meta['views'][d].setdefault('anchors',{})[action]=[160,224]
 for d in D:
  atlas=Image.new('RGBA',(640,256));atlas.alpha_composite(frames[d][0]);atlas.alpha_composite(frames[d][1],(320,0));atlas.save(P/'assets'/f'{d}-motion.png')
  meta['views'][d]['motion']=f'assets/{d}-motion.png';meta['views'][d]['anchors']['idle']=[128,224]
 meta['motionFrameSize']=[320,256];meta['status']='integrated-companion';meta['motionRegistration']=motion
 meta['ability'].update(status='implemented',lineOfSight=True,guaranteedHit=True,durationMs=360)
 for f in (P/'assets').glob('*.png'):meta['sha256'][str(f.relative_to(P))]=hashfile(f)
 (P/'ally.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 contact=Image.new('RGB',(1536,672),'#26353e');g=ImageDraw.Draw(contact)
 for i,d in enumerate(D):
  for row,im in enumerate([Image.open(P/'assets'/f'{d}.png'),*frames[d]]):
   w=round(im.width*.65);im=im.resize((w,166),Image.Resampling.LANCZOS);contact.paste(im,(i*192+96-w//2,row*224+26),im);g.text((i*192+8,row*224+6),d+' '+['idle','walk','attack'][row],fill='#bde7ec')
 contact.save(P/'all-poses.png')
 print('Registered 16 motion poses, idle files unchanged; scales:',{k:v['sharedScale'] for k,v in motion.items()})
if __name__=='__main__':main()
