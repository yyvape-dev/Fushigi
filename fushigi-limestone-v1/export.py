"""Deterministic size/background/edge normalization of approved generated art.

No new objects are painted here. Requires Pillow. Run from any directory.
"""
from pathlib import Path
from PIL import Image, ImageOps
import hashlib
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SRC = HERE / 'source-art'
DEST = ROOT / 'assets/dungeon/locations-v1/limestone'
DEST.mkdir(parents=True, exist_ok=True)
N = 256


def resized(name):
    return Image.open(SRC / name).convert('RGB').resize((N, N), Image.Resampling.LANCZOS)


def periodic(im):
    # Fold the canvas, preserving the original art and making both edge pairs equal.
    small = im.resize((N // 2, N // 2), Image.Resampling.LANCZOS)
    out = Image.new('RGB', (N, N))
    out.paste(small, (0, 0))
    out.paste(ImageOps.mirror(small), (N // 2, 0))
    out.paste(ImageOps.flip(small), (0, N // 2))
    out.paste(ImageOps.flip(ImageOps.mirror(small)), (N // 2, N // 2))
    return out


def variation(common, candidate):
    # All variants share a 24px perimeter. Only the inner pattern varies.
    # A soft inner join avoids a visible rectangular patch.
    mask = Image.new('L', (N, N))
    mask.putdata([round(255 * max(0, min(1, (min(x, y, N-1-x, N-1-y)-24)/48)))
                  for y in range(N) for x in range(N)])
    return Image.composite(candidate, common, mask)


def save(im, name):
    im.save(DEST / (name + '.webp'), lossless=True, method=6)


floor = periodic(resized('floor-source.png'))
original_floor = Image.open(SRC / 'floor-source.png').convert('RGB')
w, h = original_floor.size
for i in range(4):
    x, y = i % 2, i // 2
    crop = original_floor.crop((x*w//2, y*h//2, (x+1)*w//2, (y+1)*h//2))
    crop = crop.resize((N, N), Image.Resampling.LANCZOS)
    save(variation(floor, crop), f'floor{i}')
save(floor, 'floorW')
save(variation(floor, resized('stairs-source.png')), 'stairs')
for stem, source in [('wallF', 'wall-side-source.png'), ('wallT', 'wall-top-source.png')]:
    common = periodic(resized(source))
    save(common, stem+'0')
    save(variation(common, resized(source)), stem+'1')

# 2D caps and the ceiling must use the exact same image and period.
ceiling = ROOT / 'assets/dungeon/experience-v1/ceiling-limestone.webp'
ceiling.write_bytes((DEST / 'wallT0.webp').read_bytes())

# The source sheet remains intact. Export isolated props on exact magenta.
props_dir = HERE / 'props'
props_dir.mkdir(exist_ok=True)
sheet = Image.open(SRC / 'props-source.png').convert('RGB')
w, h = sheet.size
for i, name in enumerate(['stalagmites', 'rocks', 'moss', 'torch']):
    x, y = i % 2, i // 2
    cell = sheet.crop((x*w//2, y*h//2, (x+1)*w//2, (y+1)*h//2))
    # Source background is flat magenta; normalize compression/color variation.
    pix = cell.load()
    for yy in range(cell.height):
        for xx in range(cell.width):
            r, g, b = pix[xx, yy]
            if r > 190 and b > 190 and g < 65:
                pix[xx, yy] = (255, 0, 255)
    cell = cell.resize((512, 512), Image.Resampling.NEAREST)
    cell.save(props_dir / (name + '.png'))

outputs = sorted(DEST.glob('*.webp')) + [ceiling] + sorted(props_dir.glob('*.png'))
manifest = []
for p in outputs:
    im = Image.open(p)
    manifest.append(dict(path=str(p.relative_to(ROOT)), size=list(im.size),
                         bytes=p.stat().st_size,
                         sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
(HERE / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print('Exported', len(outputs), 'files (stairs included)')
