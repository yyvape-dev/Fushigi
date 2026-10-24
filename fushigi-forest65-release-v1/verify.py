from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parent.parent
HERE=Path(__file__).resolve().parent
records=json.loads((HERE/'manifest.json').read_text())
assert len(records)==10 and len({r['key'] for r in records})==10
for r in records:
    p=ROOT/r['path'];im=Image.open(p)
    assert im.size==(512,512) and im.mode=='RGB',p
    assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256'],p
    assert p.stat().st_size<6*1024*1024
    for xy in [(0,0),(511,0),(0,511),(511,511)]:assert im.getpixel(xy)==(255,0,255),p
    if r['key'] not in ['garland','tree']:
        points=[(x,y) for y in range(512) for x in range(512) if im.getpixel((x,y))!=(255,0,255)]
        assert max(y for x,y in points)==460,(p,'foot not registered')
        assert min(x for x,y in points)>0 and max(x for x,y in points)<511,(p,'clipped')
tree=Image.open(ROOT/'assets/dungeon/forest-fixed65-v1/tree.png');assert tree.size==(512,512)
assert (ROOT/'assets/dungeon/locations-v1/forest/stairs.webp').read_bytes()==(ROOT/'assets/dungeon/experience-v1/stairs-forest.webp').read_bytes()
print('FOREST65 ASSET CHECK OK: 10 sprites, 512px RGB, background, feet, safe bounds, stairs')
