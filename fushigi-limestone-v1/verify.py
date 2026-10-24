"""Check decoded output, including every possible pair of random floor tiles."""
from pathlib import Path
from PIL import Image
import hashlib

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / 'assets/dungeon/locations-v1/limestone'


def read(name):
    im = Image.open(DIR / (name + '.webp'))
    assert im.size == (256, 256), (name, im.size)
    assert im.mode == 'RGB', (name, im.mode)
    assert (DIR / (name + '.webp')).stat().st_size < 6 * 1024 * 1024
    return im


def edge(im, side):
    n = im.width
    boxes = [(0, 0, 1, n), (n-1, 0, n, n), (0, 0, n, 1), (0, n-1, n, n)]
    return im.crop(boxes[side]).tobytes()


for names in [[f'floor{i}' for i in range(4)], ['wallF0', 'wallF1'], ['wallT0', 'wallT1']]:
    images = [read(n) for n in names]
    assert len({hashlib.sha256(im.tobytes()).hexdigest() for im in images}) == len(images)
    for a in images:
        for b in images:
            assert edge(a, 0) == edge(b, 1), names
            assert edge(a, 2) == edge(b, 3), names
    print('EDGE OK:', ', '.join(names), 'all pairings')
for name in ['floorW', 'stairs']:
    im = read(name)
    for side in range(4):
        assert edge(im, side) == edge(read('floor0'), side)
assert (ROOT / 'assets/dungeon/experience-v1/ceiling-limestone.webp').read_bytes() == (DIR / 'wallT0.webp').read_bytes()
for p in (ROOT / 'fushigi-limestone-v1/props').glob('*.png'):
    im = Image.open(p)
    assert im.size == (512, 512) and im.mode == 'RGB'
    for xy in [(0, 0), (511, 0), (0, 511), (511, 511)]:
        assert im.getpixel(xy) == (255, 0, 255), p
print('LIMESTONE ASSET CHECK OK')
