"""Original Lana humanoid camera/geometry for guards; simple quadruped volumes for dogs."""
from pathlib import Path
import math,json,bpy
from PIL import Image
from mathutils import Vector
P=Path(__file__).resolve().parent;D=['S','SW','W','NW','N','NE','E','SE']
original=(P.parent/'fushigi-direction-base/make_direction_guides.py').read_text();helper=str(P.parent/'fushigi-direction-base/mannequin_helpers.py')
for pose in ['idle','walk','attack']:
 target=P/'guides'/'guard'/pose;target.mkdir(parents=True,exist_ok=True)
 code=original.replace("R=os.path.dirname(os.path.abspath(__file__));os.makedirs(R+'/guides',exist_ok=True)",f"R={str(target)!r};os.makedirs(R+'/guides',exist_ok=True)",1).replace("open(R+'/mannequin_helpers.py')",f"open({helper!r})")
 arms="el=(s*.41,-.07,1.17);wr=(s*.40,-.25,1.28)"
 if pose=='walk':code=code.replace("ankle=(s*.18,0,.115)","ankle=(s*.18,-s*.22,.16 if s==-1 else .115)").replace("(s*.18,-.055,.095)","(s*.18,-s*.22-.055,.14 if s==-1 else .095)")
 if pose=='attack':arms="el=(s*.39,-.20,1.17);wr=(-.30,-.65,1.22) if s==-1 else (.40,-.25,1.28)"
 code=code.replace("el=(s*.39,-.025,1.055);wr=(s*.40,-.10,.89)",arms).replace("right=(-.40,-.10,.89);left=(.40,-.10,.89)","right=objs['handR'].location;left=objs['handL'].location")
 exec(compile(code,str(P/'make_guides.py'),'exec'),{'__file__':str(P/'make_guides.py')})
 sheet=Image.new('RGBA',(1024,512))
 for i,d in enumerate(D):sheet.alpha_composite(Image.open(target/'guides'/f'{d}.png').resize((256,256)),(i%4*256,i//4*256))
 sheet.save(P/'guides'/f'guard-{pose}.png')
def ell(n,p,s):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=p);o=bpy.context.object;o.name=n;o.scale=s;return o
for pose in ['idle','walk','attack']:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 target=P/'guides'/'dog'/pose;target.mkdir(parents=True,exist_ok=True)
 ell('body',(0,.12,.43),(.38,.48,.30));ell('head',(0,-.34,.70),(.40,.32,.33));ell('snout',(0,-.58,.57),(.26,.18,.17))
 for s in [-1,1]:
  ell('ear',(s*.25,-.25,1),(.09,.10,.18))
  for front,y in [(True,-.23),(False,.42)]:
   off=(s*.13*(1 if front else -1)) if pose=='walk' else 0
   if pose=='attack' and front:off=-.20
   ell('leg',(s*.29,y+off,.20),(.13,.15,.20));ell('paw',(s*.29,y+off-.04,.08),(.16,.20,.09))
 ell('tail',(0,.61,.52),(.10,.16,.10))
 scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.show_cavity=True;scene.render.resolution_x=scene.render.resolution_y=256;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA'
 bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=1.9;scene.camera=cam
 for i,d in enumerate(D):
  a=i*math.pi/4;pt=Vector((0,0,.54));cam.location=pt+Vector((6*math.sin(a),-6*math.cos(a),2.93));cam.rotation_euler=(pt-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(target/f'{d}.png');bpy.ops.render.render(write_still=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(target/'dog.blend'))
 sheet=Image.new('RGBA',(1024,512))
 for i,d in enumerate(D):sheet.alpha_composite(Image.open(target/f'{d}.png'),(i%4*256,i//4*256))
 sheet.save(P/'guides'/f'dog-{pose}.png')
