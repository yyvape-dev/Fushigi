"""Neutral 3D direction and pose guides; reuse the approved 26 degree camera."""
import bpy, math
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parent
base=P.parent/'fushigi-monsters-v2/make_guides.py'
exec(base.read_text().split('for kind,cfg in F.items():')[0].replace("P=Path(__file__).resolve().parent;F=json.loads((P/'families.json').read_text());",''))
D=['S','SW','W','NW','N','NE','E','SE']
(P/'guides').mkdir(exist_ok=True)
for kind in ['ninja','caster','mimic','summoner','charged','cannon','lord']:
 for pose in [0,1,2]:
  bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
  if kind=='mimic':
   bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.4));bpy.context.object.scale=(.55,.4,.32)
   bpy.ops.mesh.primitive_cube_add(size=1,location=(0,.1,.85));bpy.context.object.scale=(.55,.4,.12);bpy.context.object.rotation_euler.x=.3+pose*.15
  else:make('dragon' if kind=='lord' else 'blob' if kind=='charged' else 'skeleton',pose)
  if kind=='caster':link('staff',(.4,-.2,.2),(.4,-.2,1.55),.05)
  if kind=='summoner':ell('bell',(.44,-.24,.6),(.17,.17,.2))
  if kind=='cannon':link('cannon',(.4,.45,1.1),(.4,-.6,1.1),.19)
  scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.show_cavity=True;scene.render.resolution_x=scene.render.resolution_y=256;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA'
  bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.2;scene.camera=cam
  for i,d in enumerate(D):
   a=i*math.pi/4;target=Vector((0,0,.8));cam.location=target+Vector((6*math.sin(a),-6*math.cos(a),2.93));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(P/'guides'/f'{kind}-{pose}-{d}.png');bpy.ops.render.render(write_still=True)
