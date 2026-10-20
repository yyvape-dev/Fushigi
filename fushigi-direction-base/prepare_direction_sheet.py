from PIL import Image,ImageDraw
from pathlib import Path
import json
r=Path(__file__).parent;meta=json.loads((r/'guide-sockets.json').read_text());sheet=Image.new('RGB',(2048,1024),'#eeeeea');d=ImageDraw.Draw(sheet)
for i,row in enumerate(meta['directions']):
 x=i%4*512;y=i//4*512;im=Image.open(r/'guides'/(row['id']+'.png')).convert('RGBA');sheet.paste(im,(x,y),im)
 d.text((x+20,y+20),f"{i+1:02} {row['id']} / same idle pose",fill='#414644')
 for key,color in [('ground','#b19c52'),('right_hand','#35859c'),('left_hand','#ba7045')]:
  a,b=row[key];d.ellipse((x+a-4,y+b-4,x+a+4,y+b+4),fill=color)
sheet.save(r/'direction-guide.png')
