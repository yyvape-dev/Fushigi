from pathlib import Path
from PIL import Image
P=Path(__file__).resolve().parent
for d in ['S','SW','W','NW','N','NE','E','SE']:
 sheet=Image.new('RGBA',(1024,1024))
 for row,action in enumerate(['walk','consume','scroll','staff']):
  for col in range(4):sheet.paste(Image.open(P/'guides'/f'{d}-{action}-{col}.png'),(col*256,row*256))
 sheet.save(P/'guides'/f'{d}-sheet.png')
