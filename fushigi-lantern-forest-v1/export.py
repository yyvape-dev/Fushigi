"""Normalize the generated atlas and isolated props to ART_SPEC dimensions."""
from pathlib import Path
from PIL import Image, ImageOps
import hashlib
import json

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
SRC=HERE/'source-art'
DEST=ROOT/'assets/dungeon/locations-v1/forest'
PROPS=ROOT/'assets/dungeon/forest-festival-v1'
PROPS.mkdir(exist_ok=True)
atlas=Image.open(SRC/'materials.png').convert('RGB')
w,h=atlas.size
cells=[atlas.crop((x*w//2,y*h//2,(x+1)*w//2,(y+1)*h//2)).resize((256,256),Image.Resampling.LANCZOS)
       for y in range(2) for x in range(2)]

def periodic(im):
    small=im.resize((128,128),Image.Resampling.LANCZOS)
    out=Image.new('RGB',(256,256))
    for y in range(2):
        for x in range(2):
            piece=ImageOps.mirror(small) if x else small
            if y:piece=ImageOps.flip(piece)
            out.paste(piece,(x*128,y*128))
    return out

mask=Image.new('L',(256,256))
mask.putdata([round(255*max(0,min(1,(min(x,y,255-x,255-y)-24)/48))) for y in range(256) for x in range(256)])
def variant(common,candidate):return Image.composite(candidate,common,mask)
def save(im,name):im.save(DEST/(name+'.webp'),lossless=True,method=6)

floor=periodic(cells[0])
for i in range(4):save(variant(floor,cells[0].transpose([Image.Transpose.FLIP_LEFT_RIGHT,Image.Transpose.FLIP_TOP_BOTTOM,Image.Transpose.ROTATE_180,Image.Transpose.TRANSPOSE][i])),f'floor{i}')
save(floor,'floorW')
save(variant(floor,cells[3]),'stairs')
for prefix,cell in [('wallF',cells[1]),('wallT',cells[2])]:
    common=periodic(cell)
    save(common,prefix+'0')
    save(variant(common,cell),prefix+'1')
(ROOT/'assets/dungeon/experience-v1/ceiling-forest.webp').write_bytes((DEST/'wallT0.webp').read_bytes())
for name in ['tree','lantern','garland']:
    im=Image.open(SRC/(name+'.png')).convert('RGB').resize((512,512),Image.Resampling.LANCZOS)
    pixels=im.load()
    for y in range(512):
        for x in range(512):
            r,g,b=pixels[x,y]
            if r>190 and g<90 and b>190:pixels[x,y]=(255,0,255)
    im.save(PROPS/(name+'.png'))
files=sorted(DEST.glob('*.webp'))+sorted(PROPS.glob('*.png'))+[ROOT/'assets/dungeon/experience-v1/ceiling-forest.webp']
(HERE/'manifest.json').write_text(json.dumps([{'path':str(p.relative_to(ROOT)),'size':list(Image.open(p).size),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files],indent=2)+'\n')
print('FOREST EXPORT OK')
