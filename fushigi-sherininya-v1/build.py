"""Uniform sheet registration using explicit, measured boot contact bands."""
from pathlib import Path
import hashlib,importlib.util,json,sys
sys.dont_write_bytecode=True
from PIL import Image,ImageDraw
P=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('register',P.parent/'fushigi-monsters-v2/build.py');r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
D=['S','SW','W','NW','N','NE','E','SE']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 meta={'name':'シェリニーニャ','status':'integrated-companion','frameSize':[256,256],'motionFrameSize':[320,256],'origin':[128,224],'heightToGround':192,'renderScale':1,'mirroring':False,'lanaCrownY':33,'views':{},'registration':{},'sha256':{},'ability':{'name':'黒魔法','range':2,'enemyPiercing':True,'friendlyFire':False,'wallsBlock':True}}
 frames={d:[] for d in D}
 for action in ['idle','walk','attack']:
  path=P/'source-art'/f'{action}-eight.png';cells=r.cells(path,2);contacts=[];bands=[];crowns=[]
  for im in cells:
   alpha=im.getchannel('A').point(lambda a:255 if a>=100 else 0);box=alpha.getbbox();top=max(box[1],box[3]-round((box[3]-box[1])*.065));bb=alpha.crop((0,top,im.width,box[3])).getbbox();band=[bb[0],top+bb[1],bb[2],top+bb[3]];bands.append(band);contacts.append([(band[0]+band[2])/2,band[3]-max(3,round((box[3]-box[1])*.018))]);crowns.append(box[1])
  scale=191/(contacts[0][1]-crowns[0]);meta['registration'][action]={'source':str(path.relative_to(P)),'sharedScale':scale,'views':{}}
  for i,d in enumerate(D):
   width=256 if action=='idle' else 320;ax=width/2;cx,cy=contacts[i];im=cells[i]
   canvas=im.transform((width,256),Image.Transform.AFFINE,(1/scale,0,cx-ax/scale,0,1/scale,cy-224/scale),Image.Resampling.BICUBIC)
   frames[d].append(canvas);meta['views'].setdefault(d,{'idle':f'assets/{d}.png','motion':f'assets/{d}-motion.png','anchors':{}})['anchors'][action]=[ax,224]
   meta['registration'][action]['views'][d]={'croppedSourceSize':im.size,'bootBand':bands[i],'contact':contacts[i],'crownY':crowns[i],'registeredCrownY':224+(crowns[i]-cy)*scale}
  meta['sha256'][str(path.relative_to(P))]=sha(path)
 (P/'assets').mkdir(exist_ok=True)
 contact=Image.new('RGB',(1536,672),'#292538');g=ImageDraw.Draw(contact)
 for i,d in enumerate(D):
  frames[d][0].save(P/'assets'/f'{d}.png');atlas=Image.new('RGBA',(640,256));atlas.alpha_composite(frames[d][1]);atlas.alpha_composite(frames[d][2],(320,0));atlas.save(P/'assets'/f'{d}-motion.png')
  for row,im in enumerate(frames[d]):
   w=round(im.width*.65);im=im.resize((w,166),Image.Resampling.LANCZOS);contact.paste(im,(i*192+96-w//2,row*224+26),im);g.text((i*192+8,row*224+6),d+' '+['idle','walk','cast'][row],fill='#dfc4ed')
 contact.save(P/'all-poses.png')
 for p in sorted((P/'assets').glob('*.png')):meta['sha256'][str(p.relative_to(P))]=sha(p)
 (P/'ally.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 print('Registered 24 mage poses; one scale per source sheet, measured boot anchors, no mirrors.')
if __name__=='__main__':main()
