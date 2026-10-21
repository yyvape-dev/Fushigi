from PIL import Image,ImageDraw
from pathlib import Path
P=Path(__file__).resolve().parent/'guides'
for kind in ['slime','goblin','bat']:
 for d in (['S','SW','W','NW','N','NE','E','SE'] if kind=='goblin' else ['S','SE','E','NE','N']):
  im=Image.new('RGB',(768,800),'#d8dce1');draw=ImageDraw.Draw(im)
  for i,name in enumerate(['walk A','walk B','attack windup','attack strike']):
   frame=Image.open(P/f'{kind}-{d}-{i}.png');x=i%2*384;y=i//2*400;im.paste(frame,(x,y),frame);draw.text((x+8,y+382),name,fill='black')
  im.save(P/f'{kind}-{d}-sheet.png')
