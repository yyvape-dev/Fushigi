"""Encode approved backgrounds without cropping, recoloring or changing layout."""
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parent
destination=root.parent/'assets'/'town-v2'
destination.mkdir(parents=True,exist_ok=True)
for name in ['town','inn']:
    image=Image.open(root/'source-art'/f'{name}.png').convert('RGB')
    image.save(destination/f'{name}.webp',quality=94,method=6)
    print(name,image.size)
source=Image.open(root/'source-art'/'rana-rest.png').convert('RGBA')
box=source.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox()
pose=source.crop(box)
pose.thumbnail((288,180),Image.Resampling.LANCZOS)
sprite=Image.new('RGBA',(320,200))
sprite.alpha_composite(pose,((320-pose.width)//2,(200-pose.height)//2))
sprite.save(destination/'rana-rest.png',optimize=True)
print('rest sprite',sprite.size,'bounds',box)
