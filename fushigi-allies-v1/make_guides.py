import bpy,math
from pathlib import Path
from mathutils import Vector
from PIL import Image
P=Path(__file__).resolve().parent;D=['S','SW','W','NW','N','NE','E','SE']
def ell(n,p,s):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=p);o=bpy.context.object;o.name=n;o.scale=s;return o
def link(n,a,b,r):
 a,b=Vector(a),Vector(b);o=ell(n,(a+b)/2,(r,r,(b-a).length/2));o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
for pose in range(3):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 ell('head',(0,0,1.38),(.38,.32,.37));ell('kimono',(0,0,.77),(.29,.23,.42));ell('hem',(0,0,.5),(.35,.26,.19));ell('obi',(0,0,.83),(.31,.25,.12))
 for s in [-1,1]:
  link('ear',(s*.23,0,1.59),(s*.32,0,1.95),.12)
  foot=(s*.17,-.16+(.15*s if pose==1 else 0),.12+(.06 if pose==1 and s==1 else 0))
  link('leg',(s*.16,0,.52),foot,.1);ell('tabi',foot,(.13,.2,.1))
  shoulder=(s*.24,0,1.03);hand=(s*.38,-.12,.66)
  if pose==1:hand=(s*.35,-.12+s*.13,.8)
  if pose==2 and s==-1:hand=(-.25,-.57,1.05)
  link('sleeve',shoulder,hand,.16);ell('hand',hand,(.09,.09,.09))
  if s==-1:link('RIGHT hand kunai',hand,(hand[0],hand[1]-.2,hand[2]+(.16 if pose==2 else -.22)),.04)
 ell('tail',(.14,.43,.66),(.27,.38,.43))
 scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.render.resolution_x=scene.render.resolution_y=256;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA'
 bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.6;scene.camera=cam
 for i,d in enumerate(D):
  a=i*math.pi/4;target=Vector((0,0,1));cam.location=target+Vector((6*math.sin(a),-6*math.cos(a),2.93));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(P/'guides'/f'{pose}-{d}.png');bpy.ops.render.render(write_still=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(P/'guides'/f'pose-{pose}.blend'))
for name,poses in [('idle',[0]),('motion',[1,2])]:
 sheet=Image.new('RGBA',(1024,512*len(poses)))
 for row,pose in enumerate(poses):
  for i,d in enumerate(D):sheet.alpha_composite(Image.open(P/'guides'/f'{pose}-{d}.png'),((i%4)*256,(row*2+i//4)*256))
 sheet.save(P/'guides'/f'{name}-sheet.png')
