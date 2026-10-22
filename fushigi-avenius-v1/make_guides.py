"""Reuse the original hero mannequin geometry/camera for walk and sword poses."""
from pathlib import Path
import bpy
from PIL import Image
P=Path(__file__).resolve().parent
original=(P.parent/'fushigi-direction-base/make_direction_guides.py').read_text()
helper=str(P.parent/'fushigi-direction-base/mannequin_helpers.py')
for pose in ['walk','attack']:
    target=P/'guides'/pose;target.mkdir(parents=True,exist_ok=True)
    code=original.replace("R=os.path.dirname(os.path.abspath(__file__));os.makedirs(R+'/guides',exist_ok=True)",f"R={str(target)!r};os.makedirs(R+'/guides',exist_ok=True)",1)
    code=code.replace("open(R+'/mannequin_helpers.py')",f"open({helper!r})")
    if pose=='walk':
        code=code.replace("ankle=(s*.18,0,.115)","ankle=(s*.18,-s*.22,.16 if s==-1 else .115)")
        code=code.replace("(s*.18,-.055,.095)","(s*.18,-s*.22-.055,.14 if s==-1 else .095)")
        code=code.replace("el=(s*.39,-.025,1.055);wr=(s*.40,-.10,.89)","el=(s*.39,s*.08,1.055);wr=(s*.40,s*.16,.92)")
    else:
        code=code.replace("el=(s*.39,-.025,1.055);wr=(s*.40,-.10,.89)","el=(s*.32,-.20,1.14) if s==-1 else (s*.39,.04,1.055);wr=(-.16,-.58,1.15) if s==-1 else (s*.40,.10,.89)")
    exec(compile(code,str(P/'make_guides.py'),'exec'),{'__file__':str(P/'make_guides.py')})
sheet=Image.new('RGBA',(1024,1024))
for row,pose in enumerate(['walk','attack']):
    for i,d in enumerate(['S','SW','W','NW','N','NE','E','SE']):
        im=Image.open(P/'guides'/pose/'guides'/f'{d}.png').resize((256,256),Image.Resampling.LANCZOS)
        sheet.alpha_composite(im,((i%4)*256,(row*2+i//4)*256))
sheet.save(P/'guides/motion-sheet.png')
