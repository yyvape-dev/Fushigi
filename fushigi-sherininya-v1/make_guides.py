"""Reuse the original hero mannequin geometry/camera for idle, walk and open-palm casting poses."""
from pathlib import Path
import bpy
from PIL import Image
P=Path(__file__).resolve().parent
original=(P.parent/'fushigi-direction-base/make_direction_guides.py').read_text()
helper=str(P.parent/'fushigi-direction-base/mannequin_helpers.py')
for pose in ['idle','walk','attack']:
    target=P/'guides'/pose;target.mkdir(parents=True,exist_ok=True)
    code=original.replace("R=os.path.dirname(os.path.abspath(__file__));os.makedirs(R+'/guides',exist_ok=True)",f"R={str(target)!r};os.makedirs(R+'/guides',exist_ok=True)",1)
    code=code.replace("open(R+'/mannequin_helpers.py')",f"open({helper!r})")
    if pose=='idle':
        code=code.replace("el=(s*.39,-.025,1.055);wr=(s*.40,-.10,.89)","el=(s*.34,-.10,1.09);wr=(s*.30,-.30,1.08)")
    elif pose=='walk':
        code=code.replace("ankle=(s*.18,0,.115)","ankle=(s*.18,-s*.22,.16 if s==-1 else .115)")
        code=code.replace("(s*.18,-.055,.095)","(s*.18,-s*.22-.055,.14 if s==-1 else .095)")
        code=code.replace("el=(s*.39,-.025,1.055);wr=(s*.40,-.10,.89)","el=(s*.34,s*.05,1.09);wr=(s*.33,s*.10,1.03)")
    else:
        code=code.replace("el=(s*.39,-.025,1.055);wr=(s*.40,-.10,.89)","el=(s*.32,-.22,1.18) if s==1 else (s*.34,-.10,1.09);wr=(.25,-.58,1.17) if s==1 else (-.30,-.20,1.04)")
    code=code.replace("right=(-.40,-.10,.89);left=(.40,-.10,.89)","right=objs['handR'].location;left=objs['handL'].location")
    exec(compile(code,str(P/'make_guides.py'),'exec'),{'__file__':str(P/'make_guides.py')})
sheet=Image.new('RGBA',(1024,1024))
for row,pose in enumerate(['walk','attack']):
    for i,d in enumerate(['S','SW','W','NW','N','NE','E','SE']):
        im=Image.open(P/'guides'/pose/'guides'/f'{d}.png').resize((256,256),Image.Resampling.LANCZOS)
        sheet.alpha_composite(im,((i%4)*256,(row*2+i//4)*256))
sheet.save(P/'guides/motion-sheet.png')

for action in ["idle","walk","attack"]:
 sheet=Image.new("RGBA",(1024,512))
 for i,d in enumerate(["S","SW","W","NW","N","NE","E","SE"]):
  im=Image.open(P/"guides"/action/"guides"/(d+".png")).resize((256,256),Image.Resampling.LANCZOS);sheet.alpha_composite(im,(i%4*256,i//4*256))
 sheet.save(P/"guides"/(action+"-sheet.png"))
