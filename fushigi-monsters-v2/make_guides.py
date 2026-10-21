"""Neutral Blender volume guides: orthographic 26-degree elevation, 8 views."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parent;F=json.loads((P/'families.json').read_text());D=['S','SW','W','NW','N','NE','E','SE']
def ell(n,p,s):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=p);o=bpy.context.object;o.name=n;o.scale=s;return o
def link(n,a,b,r):
 a,b=Vector(a),Vector(b);o=ell(n,(a+b)/2,(r,r,(b-a).length/2));o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def make(kind,pose):
 if kind in ['blob','sleepy','bomb','dazzle','dragon']:
  ell('body',(0,0,.45),(.55,.42,.4))
  if kind=='blob':ell('lobe',(.2,0,.8),(.34,.3,.3))
  if kind=='sleepy':ell('cap',(0,0,.9),(.67,.52,.23))
  if kind in ['dazzle','dragon']:ell('head',(0,-.3,.7),(.43,.35,.3))
  if kind=='dragon':
   link('tail',(0,.3,.4),(.5,.8,.25),.13)
   for s in [-1,1]:link('wing',(s*.3,.1,.6),(s*.7,.25,1),.14)
  if kind!='blob':
   for s in [-1,1]:
    for y in [-.25,.25]:ell('foot',(s*.42,y,.12),(.12,.2,.1))
 else:
  broad=kind in ['ogre','minotaur'];ell('body',(0,0,.65),(.39 if broad else .25,.22,.38));ell('head',(0,-.03,1.2),(.4,.31,.35))
  for s in [-1,1]:
   if kind=='ghost':ell('wisp',(s*.36,0,.7),(.16,.12,.18));continue
   if kind=='venom':
    ell('wing',(s*.46,.12,1),(.4,.07,.15));continue
   if kind in ['minotaur','ogre']:link('horn',(s*.29,0,1.4),(s*.45,0,1.66),.08)
   if kind=='thief':ell('ear',(s*.28,0,1.47),(.15,.1,.15))
   y=pose*.1*s
   link('leg',(s*.16,0,.4),(s*.18,y,.12),.11);ell('foot',(s*.18,y-.1,.08),(.13,.19,.08))
   hy=-.32 if pose==2 else -.12-y
   link('arm',(s*.28,0,.85),(s*.4,hy,.61),.1);ell('hand',(s*.4,hy,.61),(.11,.09,.11))
  if kind=='archer':
   for z in [.3,.45,.6,.75,.9]:ell('left-hand bow',(.46,-.21,z),(.04,.06,.1))
  if kind=='venom':link('stinger',(0,.2,.7),(0,.5,.4),.1)
  if kind=='ghost':ell('tail',(0,0,.25),(.2,.16,.3))
 # Identifiable front eyes, for camera direction guide only.
 for s in [-1,1]:ell('eye',(s*.14,-.33,1.23 if kind not in ['blob','sleepy','bomb','dazzle','dragon'] else .65),(.045,.04,.05))
for kind,cfg in F.items():
 if 'design' not in cfg:continue
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 make(kind,0)
 scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.show_cavity=True;scene.render.resolution_x=scene.render.resolution_y=256;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA'
 bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.2;scene.camera=cam
 for i,d in enumerate(D):
  a=i*math.pi/4;target=Vector((0,0,.8));cam.location=target+Vector((6*math.sin(a),-6*math.cos(a),2.93));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(P/'guides'/f'{kind}-{d}.png');bpy.ops.render.render(write_still=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(P/'guides'/f'{kind}.blend'))
