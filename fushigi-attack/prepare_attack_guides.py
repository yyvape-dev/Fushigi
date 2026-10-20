from pathlib import Path
from PIL import Image,ImageDraw
import json
r=Path(__file__).parent;data=json.loads((r/'guide-motion.json').read_text())
for row in data['directions']:
 sheet=Image.new('RGB',(1024,1024),'#efefec');draw=ImageDraw.Draw(sheet)
 for k,p in enumerate(row['phases']):
  x=k%2*512;y=k//2*512;im=Image.open(r/'guides'/f"{row['id']}_{k}.png").convert('RGBA');sheet.paste(im,(x,y),im)
  draw.text((x+15,y+15),f"{k+1} {p['name']} / {row['id']}",fill='#3e4b4e')
  for name,color in [('right','#368da7'),('left','#be7a43')]:
   px,py=p[name];draw.ellipse((x+px-5,y+py-5,x+px+5,y+py+5),fill=color)
 sheet.save(r/'guides'/(row['id']+'-sheet.png'))
