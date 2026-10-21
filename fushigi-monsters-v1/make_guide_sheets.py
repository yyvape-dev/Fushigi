"""Lay out neutral 3D direction PNGs used as generation references."""
from PIL import Image,ImageDraw
from pathlib import Path
P=Path(__file__).resolve().parent/'guides'
for kind in ['slime','goblin','bat']:
    ds=['S','SW','W','NW','N','NE','E','SE'] if kind=='goblin' else ['S','SE','E','NE','N']
    cols,rows=(4,2) if kind=='goblin' else (5,1)
    sheet=Image.new('RGB',(384*cols,416*rows),'#d8dce1');draw=ImageDraw.Draw(sheet)
    for i,d in enumerate(ds):
        im=Image.open(P/f'{kind}-{d}.png');x=i%cols*384;y=i//cols*416
        sheet.paste(im,(x,y),im);draw.text((x+12,y+390),d,fill='black')
    sheet.save(P/f'{kind}-sheet.png')
