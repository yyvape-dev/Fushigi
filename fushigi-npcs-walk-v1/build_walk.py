"""Extract generated walk poses using each adopted idle view's unchanged scale."""
from pathlib import Path
from PIL import Image
import hashlib, json

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
idle=Image.open(ROOT/'fushigi-npcs-v1/source.png').convert('RGBA')
walk=Image.open(HERE/'walk-source.png').convert('RGBA')
assert walk.size==idle.size==(1024,1536)
DIRS=['S','SW','W','NW','N','NE','E','SE']
ACTORS=['yursa','kamil','ialmas']
def keyed(im):
    im=im.copy()
    im.putdata([(0,0,0,0) if r>150 and b>120 and g<115 and min(r,b)-g>70 else (r,g,b,a)
                for r,g,b,a in im.getdata()])
    return im
keywalk=keyed(walk)
edges=[]
for col in range(4):
    cuts=[0]
    for center in [253,488,751,1007,1249]:
        blank=[y for y in range(center-12,center+13)
               if keywalk.crop((col*256,y,(col+1)*256,y+1)).getbbox() is None]
        if not blank:raise ValueError(f'No clear gutter: column {col}, row {center}')
        cuts.append(blank[len(blank)//2])
    edges.append(cuts+[1536])
oldedges=[0,250,486,748,1006,1250,1536]
manifest={'reference':'../fushigi-npcs-v1/source.png',
          'reference_sha256':hashlib.sha256((ROOT/'fushigi-npcs-v1/source.png').read_bytes()).hexdigest(),
          'source_sha256':hashlib.sha256((HERE/'walk-source.png').read_bytes()).hexdigest(),
          'frame_size':[256,256],'anchor':[128,224],'row_edges_by_column':edges,'views':{}}
for ai,actor in enumerate(ACTORS):
    for i,d in enumerate(DIRS):
        col,row=i%4,ai*2+i//4
        ref=keyed(idle.crop((col*256,oldedges[row],(col+1)*256,oldedges[row+1])))
        pose=keywalk.crop((col*256,edges[col][row],(col+1)*256,edges[col][row+1]))
        rb,pb=ref.getbbox(),pose.getbbox()
        scale=min(192/(rb[3]-rb[1]),224/(rb[2]-rb[0]))
        # Horizontal registration follows the head, not a swinging hand or cape.
        def headcenter(im,box):
            hb=im.crop((0,box[1],im.width,box[1]+round((box[3]-box[1])*.4))).getbbox()
            return (hb[0]+hb[2])/2
        original_head_x=128-round((rb[2]-rb[0])*scale)//2+(headcenter(ref,rb)-rb[0])*scale
        pose_head_x=(headcenter(pose,pb)-pb[0])*scale
        body=pose.crop(pb).resize((round((pb[2]-pb[0])*scale),round((pb[3]-pb[1])*scale)),Image.Resampling.LANCZOS)
        frame=Image.new('RGBA',(256,256));x=round(original_head_x-pose_head_x);y=224-body.height
        assert x>=0 and y>=0 and x+body.width<=256,(actor,d,body.size,x,y)
        frame.alpha_composite(body,(x,y))
        target=ROOT/'fushigi-npcs-v1/assets'/actor/(d+'-walk.png');frame.save(target,optimize=True)
        manifest['views'][actor+'/'+d]={'path':str(target.relative_to(ROOT)),'scale_from_idle':scale,
                                       'bbox':list(frame.getbbox()),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
(HERE/'walk.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
frames=[]
for pose in ['', '-walk']:
    sheet=Image.new('RGBA',(1024,384),'#171a21')
    for row,actor in enumerate(ACTORS):
        for col,d in enumerate(DIRS):
            im=Image.open(ROOT/'fushigi-npcs-v1/assets'/actor/(d+pose+'.png')).resize((128,128),Image.Resampling.LANCZOS)
            sheet.alpha_composite(im,(col*128,row*128))
    frames.append(sheet)
frames[1].save(HERE/'walk-contact.png')
frames[0].save(HERE/'walk-preview.gif',save_all=True,append_images=[frames[1]],duration=160,loop=0,disposal=2)
print('24 walk frames; original idle scale, transparent 256x256, feet at (128,224)')
