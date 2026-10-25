"""Mechanical keying, cell extraction and common foot registration; preserve source."""
from pathlib import Path
from PIL import Image
import hashlib, json

HERE = Path(__file__).resolve().parent
source = Image.open(HERE / 'source.png').convert('RGBA')
directions = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE']
# Actual blank gutters in the generated atlas; uniform 256px rows cut off hair.
row_edges = [round(y*source.height/1536) for y in [0, 250, 486, 748, 1006, 1250, 1536]]
manifest = {'source_sha256': hashlib.sha256((HERE/'source.png').read_bytes()).hexdigest(),
            'source_size': list(source.size), 'frame_size': [256, 256],
            'anchor': [128, 224], 'body_height': 192, 'actors': {}}
for actor_index, actor in enumerate(['yursa', 'kamil', 'ialmas']):
    entries = {}
    for i, direction in enumerate(directions):
        col, row = i % 4, actor_index * 2 + i // 4
        crop = source.crop((round(col*source.width/4), row_edges[row],
                            round((col+1)*source.width/4), row_edges[row+1]))
        pixels = []
        for r, g, b, a in crop.getdata():
            # The flat magenta and its antialiased fringe are not costume pixels.
            if r > 150 and b > 120 and g < 115 and min(r, b)-g > 70:
                pixels.append((0, 0, 0, 0))
            else:
                pixels.append((r, g, b, a))
        crop.putdata(pixels)
        box = crop.getbbox()
        if not box:
            raise ValueError(f'Empty sprite: {actor}/{direction}')
        body = crop.crop(box)
        scale = min(192/body.height, 224/body.width)
        body = body.resize((round(body.width*scale), round(body.height*scale)), Image.Resampling.LANCZOS)
        frame = Image.new('RGBA', (256, 256))
        frame.alpha_composite(body, (128-body.width//2, 224-body.height))
        target = HERE / 'assets' / actor / f'{direction}.png'
        target.parent.mkdir(parents=True, exist_ok=True)
        frame.save(target, optimize=True)
        entries[direction] = {'path': str(target.relative_to(HERE)), 'bbox': list(frame.getbbox()),
                              'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
    manifest['actors'][actor] = entries
(HERE/'sprites.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
preview = Image.new('RGBA', (8*128, 3*128), '#171a21')
for row, actor in enumerate(manifest['actors']):
    for col, d in enumerate(directions):
        im = Image.open(HERE/'assets'/actor/f'{d}.png').resize((128, 128), Image.Resampling.LANCZOS)
        preview.alpha_composite(im, (col*128, row*128))
preview.save(HERE/'contact-sheet.png')
print('24 sprites: 256x256, common anchor (128,224), head-to-foot height 192px')
