"""Register the approved shared pot art as a compact, transparent game icon."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
source = Image.open(ROOT / 'source-art' / 'pot.png').convert('RGBA')
# Ignore almost invisible alpha=1 specks when measuring the generated artwork.
box = source.getchannel('A').point(lambda a: 255 if a > 1 else 0).getbbox()
assert box, 'Missing artwork'
art = source.crop(box)
art.thumbnail((224, 224), Image.Resampling.LANCZOS)
icon = Image.new('RGBA', (256, 256))
icon.alpha_composite(art, ((256 - art.width) // 2, 240 - art.height))
destination = ROOT.parent / 'assets' / 'icon_pot.png'
destination.parent.mkdir(parents=True, exist_ok=True)
icon.save(destination, optimize=True)
print(f'{destination}: {icon.size}, source bounds={box}')
