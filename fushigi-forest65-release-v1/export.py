"""Mechanical sheet slicing, aspect-preserving scale and foot registration."""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parent.parent
HERE=Path(__file__).resolve().parent
DEST=ROOT/'assets/dungeon/forest-fixed65-v1'
DEST.mkdir(exist_ok=True)
source=Image.open(HERE/'source-art/props-3x3.png').convert('RGB')
names=['sapling','stump','boulder','rocks','fern','mushrooms','lantern','lanternpost','garland']
def background(r,g,b):return r>100 and b>100 and r>g*1.3 and b>g*1.3
records=[]
for i,name in enumerate(names):
    x,y=i%3,i//3
    cell=source.crop((x*source.width//3,y*source.height//3,(x+1)*source.width//3,(y+1)*source.height//3))
    pixels=cell.load();points=[]
    for yy in range(cell.height):
        for xx in range(cell.width):
            if not background(*pixels[xx,yy]):points.append((xx,yy))
    assert points,name
    # Follow sheets.js' object-isolation approach: ignore disconnected bleed
    # from a neighbouring cell, without repainting any part of the artwork.
    remaining=set(points);components=[]
    while remaining:
        start=remaining.pop();component=[start];queue=[start]
        for xx,yy in queue:
            for dx,dy in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,-1),(-1,1),(1,1)]:
                q=(xx+dx,yy+dy)
                if q in remaining:remaining.remove(q);component.append(q);queue.append(q)
        components.append(component)
    largest=max(components,key=len)
    left=min(x for x,y in largest);right=max(x for x,y in largest)
    top=min(y for x,y in largest);bottom=max(y for x,y in largest)
    points=[point for component in components if any(left-8<=x<=right+8 and top-8<=y<=bottom+8 for x,y in component) for point in component]
    box=(min(p[0] for p in points),min(p[1] for p in points),max(p[0] for p in points)+1,max(p[1] for p in points)+1)
    crop=cell.crop(box)
    factor=min(440/crop.width,(175 if name=='garland' else 420)/crop.height)
    scaled=crop.resize((round(crop.width*factor),round(crop.height*factor)),Image.Resampling.LANCZOS)
    out=Image.new('RGB',(512,512),(255,0,255))
    ox=(512-scaled.width)//2;oy=(512-scaled.height)//2 if name=='garland' else 461-scaled.height
    out.paste(scaled,(ox,oy))
    p=out.load()
    for yy in range(512):
        for xx in range(512):
            if background(*p[xx,yy]):p[xx,yy]=(255,0,255)
    if name!='garland':
        mask=Image.new('L',out.size);mask.putdata([255 if v!=(255,0,255) else 0 for v in out.get_flattened_data()])
        bottom=mask.getbbox()[3]
        if bottom!=461:
            registered=Image.new('RGB',(512,512),(255,0,255));registered.paste(out,(0,461-bottom));out=registered
    file=DEST/(name+'.png');out.save(file)
    if name=='garland':
        # Reuse the already refined fine string: small bulbs read better in play.
        file.write_bytes((ROOT/'assets/dungeon/forest-festival-v1/garland.png').read_bytes())
    records.append({'key':name,'path':str(file.relative_to(ROOT)),'size':[512,512],'cell':[x,y],'sourceBox':list(box),'reusedAsset':'assets/dungeon/forest-festival-v1/garland.png' if name=='garland' else None,'foot':[256,461] if name!='garland' else None,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
treeFile=DEST/'tree.png'
tree=Image.open(treeFile).convert('RGB');pixels=tree.load()
for y in range(tree.height):
    for x in range(tree.width):
        if background(*pixels[x,y]):pixels[x,y]=(255,0,255)
tree.save(treeFile)
records.append({'key':'tree','path':str(treeFile.relative_to(ROOT)),'size':[512,512],'adoptedFrom':'fushigi-tree65-v1/source-art/tree.png','bytes':treeFile.stat().st_size,'sha256':hashlib.sha256(treeFile.read_bytes()).hexdigest()})
(HERE/'manifest.json').write_text(json.dumps(records,indent=2)+'\n')
print('FOREST65 EXPORT OK:',len(records),'isolated registered sprites')
