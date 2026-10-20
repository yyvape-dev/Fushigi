from pathlib import Path
from PIL import Image,ImageDraw
import json,math,shutil
r=Path(__file__).parent;out=r/'assets'/'hero-base';out.mkdir(parents=True,exist_ok=True)
source=Image.open(r/'generated-directions.png').convert('RGBA');cw=source.width//4;ch=source.height//2
meta=json.loads((r/'guide-sockets.json').read_text());rows=[];sheet=Image.new('RGBA',(2048,256));contact=Image.new('RGB',(1024,640),'#e8e4da');d=ImageDraw.Draw(contact)
for i,g in enumerate(meta['directions']):
 raw=source.crop((i%4*cw,i//4*ch,(i%4+1)*cw,(i//4+1)*ch));
 if (r/'overrides'/(g['id']+'.png')).exists():raw=Image.open(r/'overrides'/(g['id']+'.png')).convert('RGBA')
 a=raw.getchannel('A').point(lambda x:255 if x>64 else 0);b=a.getbbox()
 guide=Image.open(r/'guides'/(g['id']+'.png')).convert('RGBA');ga=guide.getchannel('A').point(lambda x:255 if x>64 else 0);gb=ga.getbbox()
 ratio=(b[3]-b[1])/(gb[3]-gb[1]);ground=b[3]-(gb[3]-g['ground'][1])*ratio
 # Use boot-center horizontal location, corrected for projected forward toe offset.
 fbox=a.crop((0,round(b[1]+(b[3]-b[1])*.88),raw.width,raw.height)).getbbox();gf=ga.crop((0,round(gb[1]+(gb[3]-gb[1])*.88),512,512)).getbbox()
 rootx=(fbox[0]+fbox[2])/2-((gf[0]+gf[2])/2-g['ground'][0])*ratio
 s=192/(ground-b[1]);dx=128-rootx*s;dy=224-ground*s
 im=raw.transform((256,256),Image.Transform.AFFINE,(1/s,0,-dx/s,0,1/s,-dy/s),resample=Image.Resampling.BICUBIC)
 im.save(out/(g['id']+'.png'));sheet.paste(im,(i*256,0))
 k=192/(g['ground'][1]-g['head_top'][1])
 def socket(key,layer):return {'position':[round(128+(g[key][0]-g['ground'][0])*k,2),round(224+(g[key][1]-g['ground'][1])*k,2)],'layer':g[layer]}
 row={'id':g['id'],'index':i,'right':socket('right_hand','right_layer'),'left':socket('left_hand','left_layer'),'shieldWidth':g['shield_width'],'sourceTransform':{'scale':s,'translate':[dx,dy]},'sourceAlphaBox':b,'socketStatus':'guide projection, requires art calibration'};rows.append(row)
 x=i%4*256;y=i//4*320;contact.paste(im,(x,y),im)
 d.text((x+112,y+270),g['id'],fill='#404747')
 d.line((x+110,y+224,x+146,y+224),fill='#998448',width=1);d.line((x+128,y+216,x+128,y+232),fill='#998448',width=1)
sheet.save(out/'idle.png');contact.save(r/'base-contact.png')
contract={'version':1,'status':'directional idle base; animations not yet authored','frameSize':[256,256],'groundAnchor':[128,224],'headTopY':32,'heightToGround':192,'directions':rows,'animationPolicy':'Do not author animation until canonical directions have been reviewed in game context.','equipmentAssets':{'weapon':{'path':'equipment-test/weapon.png','grip':[48,210],'size':[96,256]},'shield':{'path':'equipment-test/shield.png','grip':[80,96],'size':[160,192]}}}
(out/'base.json').write_text(json.dumps(contract,indent=2));(r/'source-normalization.json').write_text(json.dumps(rows,indent=2))
print([(x['id'],x['right']['position'],x['left']['position']) for x in rows])
