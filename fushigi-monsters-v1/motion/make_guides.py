"""Four motion key-pose volume guides per direction; no decorative modelling."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
P=Path(__file__).resolve().parent
D=['S','SW','W','NW','N','NE','E','SE']
def ell(n,p,s):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=p);o=bpy.context.object;o.name=n;o.scale=s
 for f in o.data.polygons:f.use_smooth=True
 return o
def link(n,a,b,r):
 a,b=Vector(a),Vector(b);o=ell(n,(a+b)/2,(r,r,(b-a).length/2));o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
def model(k,pose):
 if k=='slime':
  scales=[(.68,.54,.30),(.52,.46,.49),(.70,.54,.25),(.52,.76,.35)][pose]
  z=[.30,.61,.25,.35][pose];y=-.18 if pose==3 else 0
  ell('jelly',(0,y,z),scales)
  for s in [-1,1]:ell('eye',(s*.17,y-scales[1]*.94,z),(.04,.03,.06))
 if k=='goblin':
  phase=[1,-1,0,0][pose];lean=-.08 if pose==3 else 0
  ell('bald head',(0,lean,1.15),(.40,.31,.35));ell('nose',(0,lean-.32,1.12),(.1,.10,.1));ell('torso',(0,lean,.63),(.25,.19,.32))
  for s in [-1,1]:
   ell('ear',(s*.42,lean,1.2),(.24,.09,.12))
   stride=s*phase*.19;lift=.08 if stride>0 else 0
   hip=(s*.14,0,.43);knee=(s*.16,stride*.4-.08,.25+lift*.5);foot=(s*.18,stride,.07+lift)
   link('thigh',hip,knee,.095);link('shin',knee,foot,.085);ell('foot',foot,(.12,.18,.07))
  rh=[(-.36,-.14,.56),(-.36,-.07,.56),(-.42,.04,1.35),(-.27,-.48,.66)][pose]
  tip=[(-.47,-.16,1.12),(-.47,-.09,1.12),(-.52,.05,1.91),(-.24,-1,.37)][pose]
  lh=(.35,-.05,.54)
  for s,wr in [(-1,rh),(1,lh)]:
   sh=Vector((s*.24,lean,.82));wr=Vector(wr);el=(sh+wr)/2+Vector((s*.1,.04,0));link('upper arm',sh,el,.08);link('forearm',el,wr,.075);ell('hand',wr,(.09,.08,.09))
  link('right club',rh,tip,.055);ell('club head',tip,(.12,.11,.19))
 if k=='bat':
  body_y=-.25 if pose==3 else 0;z=.87
  ell('body',(0,body_y,z),(.18,.15,.28));ell('head',(0,body_y-.02,z+.24),(.24,.19,.22))
  for s in [-1,1]:
   ell('ear',(s*.16,body_y,z+.48),(.08,.06,.18))
   wingZ=[.55,-.45,.65,-.3][pose];stretch=.68 if pose==2 else .90
   verts=[(s*.16,body_y,z+.13),(s*.48,body_y,z+.31+wingZ*.4),(s*stretch,body_y,z+.21+wingZ),(s*.70,body_y,z-.17+wingZ*.7),(s*.45,body_y,z-.10+wingZ*.3),(s*.20,body_y,z-.24)]
   mesh=bpy.data.meshes.new('wing');mesh.from_pydata(verts,[],[tuple(range(6))]);o=bpy.data.objects.new('wing',mesh);bpy.context.collection.objects.link(o)
metadata={}
for kind in ['slime','goblin','bat']:
 for d in (D if kind=='goblin' else ['S','SE','E','NE','N']):
  rows=[]
  for pose in range(4):
   bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);model(kind,pose)
   scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.show_shadows=False;scene.display.shading.show_cavity=True;scene.render.resolution_x=scene.render.resolution_y=384;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA'
   bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.7;scene.camera=cam
   a=D.index(d)*math.pi/4;target=Vector((0,0,.88));cam.location=target+Vector((math.sqrt(45)*math.sin(a),-math.sqrt(45)*math.cos(a),3.25));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update()
   q=world_to_camera_view(scene,cam,Vector((0,0,0)));rows.append({'pose':pose,'ground':[q.x*384,(1-q.y)*384]})
   scene.render.filepath=str(P/'guides'/f'{kind}-{d}-{pose}.png');bpy.ops.render.render(write_still=True)
  metadata[kind+'-'+d]=rows
(P/'guides'/'anchors.json').write_text(json.dumps(metadata,indent=2))
