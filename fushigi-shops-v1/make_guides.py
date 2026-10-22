"""Original Lana mannequin/camera; merchant idle, stride and right-hand punch."""
from pathlib import Path
from PIL import Image
P=Path(__file__).resolve().parent
original=(P.parent/'fushigi-direction-base/make_direction_guides.py').read_text()
helper=str(P.parent/'fushigi-direction-base/mannequin_helpers.py')
for pose in ['idle','walk','attack']:
 target=P/'guides'/pose;target.mkdir(parents=True,exist_ok=True)
 code=original.replace("R=os.path.dirname(os.path.abspath(__file__));os.makedirs(R+'/guides',exist_ok=True)",f"R={str(target)!r};os.makedirs(R+'/guides',exist_ok=True)",1).replace("open(R+'/mannequin_helpers.py')",f"open({helper!r})")
 arms="el=(s*.42,-.025,1.055) if s==-1 else (s*.53,0,1.12);wr=(s*.43,-.10,.89) if s==-1 else (s*.32,-.16,.99)"
 if pose=='walk':
  code=code.replace("ankle=(s*.18,0,.115)","ankle=(s*.18,-s*.22,.16 if s==-1 else .115)").replace("(s*.18,-.055,.095)","(s*.18,-s*.22-.055,.14 if s==-1 else .095)")
  arms="el=(s*.42,s*.06,1.055);wr=(s*.43,s*.16,.91)"
 if pose=='attack':arms="el=(s*.32,-.28,1.14) if s==-1 else (s*.42,-.12,1.14);wr=(-.22,-.65,1.20) if s==-1 else (.31,-.26,1.15)"
 code=code.replace("el=(s*.39,-.025,1.055);wr=(s*.40,-.10,.89)",arms).replace("right=(-.40,-.10,.89);left=(.40,-.10,.89)","right=objs['handR'].location;left=objs['handL'].location")
 exec(compile(code,str(P/'make_guides.py'),'exec'),{'__file__':str(P/'make_guides.py')})
 sheet=Image.new('RGBA',(1024,512))
 for i,d in enumerate(['S','SW','W','NW','N','NE','E','SE']):sheet.alpha_composite(Image.open(target/'guides'/f'{d}.png').resize((256,256)),(i%4*256,i//4*256))
 sheet.save(P/'guides'/f'{pose}-sheet.png')
