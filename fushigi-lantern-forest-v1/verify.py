from pathlib import Path
from PIL import Image
import hashlib

ROOT=Path(__file__).resolve().parent.parent
D=ROOT/'assets/dungeon/locations-v1/forest'
def read(name):
    im=Image.open(D/(name+'.webp'))
    assert im.size==(256,256) and im.mode=='RGB',name
    return im
def edge(im,n):
    return im.crop([(0,0,1,256),(255,0,256,256),(0,0,256,1),(0,255,256,256)][n]).tobytes()
for names in [[f'floor{i}' for i in range(4)],['wallF0','wallF1'],['wallT0','wallT1']]:
    ims=[read(n) for n in names]
    assert len({hashlib.sha256(im.tobytes()).hexdigest() for im in ims})==len(ims)
    for a in ims:
        for b in ims:
            assert edge(a,0)==edge(b,1) and edge(a,2)==edge(b,3),names
for name in ['floorW','stairs']:
    im=read(name)
    for side in range(4):assert edge(im,side)==edge(read('floor0'),side)
assert (D/'wallT0.webp').read_bytes()==(ROOT/'assets/dungeon/experience-v1/ceiling-forest.webp').read_bytes()
for p in (ROOT/'assets/dungeon/forest-festival-v1').glob('*.png'):
    im=Image.open(p)
    assert im.size==(512,512) and im.mode=='RGB',p
    for xy in [(0,0),(511,0),(0,511),(511,511)]:assert im.getpixel(xy)==(255,0,255),p
print('FOREST ASSET CHECK OK: arbitrary tile adjacency, opacity, dimensions, ceiling and magenta props')
