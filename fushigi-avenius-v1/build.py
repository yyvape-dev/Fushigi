"""Register approved-design idle art using one shared scale and explicit boot bands.

No mirroring, directional scaling, body warps, or modifications to approved Lana.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw

P = Path(__file__).resolve().parent
D = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE']

# Measured in the unmodified 1536x1024 generated sheet. Bands contain boots,
# excluding the sword/cape silhouette. Contact = horizontal boot-band midpoint,
# eight source pixels above its lowest opaque sole, matching Lana's foot inset.
CELLS = [(0,0,393,520),(393,0,773,520),(773,0,1157,520),(1157,0,1536,520),
         (0,520,433,1024),(433,520,813,1024),(813,520,1140,1024),(1140,520,1536,1024)]
BOOTS = [(125,440,315,496),(490,440,650,507),(875,440,1005,511),(1240,440,1435,506),
         (105,913,305,979),(510,913,710,976),(905,918,1030,983),(1280,920,1460,985)]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    source = P/'source-art/idle-eight.png'
    sheet = Image.open(source).convert('RGBA')
    assert sheet.size == (1536,1024)
    (P/'assets').mkdir(exist_ok=True)
    contacts, crowns, bands = [], [], []
    for cell, band in zip(CELLS, BOOTS):
        alpha = sheet.getchannel('A').point(lambda a:255 if a>=100 else 0)
        box = alpha.crop(band).getbbox()
        assert box
        measured = [band[0]+box[0],band[1]+box[1],band[0]+box[2],band[1]+box[3]]
        bands.append(measured)
        contacts.append([(measured[0]+measured[2])/2,measured[3]-8])
        crowns.append(cell[1]+alpha.crop(cell).getbbox()[1])
    lana = Image.open(P.parent/'fushigi-equipment-v3/assets/hero-base/S.png')
    lana_top = lana.getchannel('A').point(lambda a:255 if a>=100 else 0).getbbox()[1]
    scale = (224-lana_top)/(contacts[0][1]-crowns[0])
    meta = {'name':'アベニウス','status':'idle-review','frameSize':[256,256],
            'origin':[128,224],'heightToGround':192,'renderScale':1,
            'lanaCrownY':lana_top,'sourceScale':scale,'mirroring':False,
            'ability':{'name':'一閃','range':4,'returnsToOrigin':True,
                       'maxUsesPerEnemy':1,'status':'specified-not-implemented'},
            'views':{},'sha256':{}}
    contact = Image.new('RGB',(1024,584),'#26353e')
    g = ImageDraw.Draw(contact)
    for i,d in enumerate(D):
        cell = CELLS[i]; ax,ay = contacts[i]
        # Inverse affine mapping is uniform scale + translation only. Using
        # the original cell avoids per-direction crop-centering by cape/sword.
        sprite = sheet.crop(cell).transform((256,256),Image.Transform.AFFINE,
            (1/scale,0,ax-cell[0]-128/scale,0,1/scale,ay-cell[1]-224/scale),
            Image.Resampling.BICUBIC)
        sprite.save(P/'assets'/f'{d}.png')
        meta['views'][d] = {'idle':f'assets/{d}.png','sourceCell':cell,
            'sourceBootRegion':BOOTS[i],'sourceBootBand':bands[i],
            'sourceContact':contacts[i],'sourceCrownY':crowns[i],
            'anchor':[128,224],'registeredCrownY':224+(crowns[i]-ay)*scale}
        x=(i%4)*256; y=(i//4)*292
        g.text((x+10,y+8),d,fill='#cbeae5')
        contact.paste(sprite,(x,y+25),sprite)
        g.line((x+8,y+249,x+248,y+249),fill='#b6a571')
        g.line((x+128,y+242,x+128,y+256),fill='#e3c77f')
    contact.save(P/'idle-contact.png')
    for f in sorted((P/'assets').glob('*.png')):meta['sha256'][str(f.relative_to(P))]=sha(f)
    meta['sha256']['source-art/idle-eight.png']=sha(source)
    (P/'ally.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    print('Registered 8 idle views: shared scale',round(scale,6),'anchor (128,224).')

if __name__ == '__main__':
    main()
