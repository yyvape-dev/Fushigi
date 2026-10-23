"""Render a finite connected wall kit. No generated source PNG is modified."""
import bpy, math, json, hashlib, sys
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent
ROOT=OUT.parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=8;s.cycles.use_denoising=False
s.render.resolution_x=s.render.resolution_y=384;s.render.resolution_percentage=100
s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
s.view_settings.view_transform='Standard';s.view_settings.look='None'
s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.52,.55,.60,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='AREA',location=(-3,-4,8));bpy.context.object.data.energy=380;bpy.context.object.data.size=5
pitch=.94;angle=math.asin(pitch)
bpy.ops.object.camera_add(location=(0,-10*math.cos(angle),10*math.sin(angle)));camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=3;s.camera=camera
# A periodic WORLD-space field; all adjoining samples are identical, including
# across phase2->phase0. No independent random vertex movement at tile edges.
N=8
def height(x,y):
 return 1.45+.18*math.sin(math.pi*x*3+.4)*math.cos(math.pi*y*2+.8)+.13*math.cos(math.pi*(x+y)*4)+.09*math.sin(math.pi*(x-y)*5+.3)

def mat(name,path):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=.95
 tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(path),check_existing=True);tex.interpolation='Linear'
 m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color']);return m
sources={'slate':ROOT/'fushigi-overgrown-garden-v1/source-art/garden-ridge.png','ruins':ROOT/'fushigi-overgrown-garden-v1/source-art/garden-materials.png'}
materials={k:mat(k,p) for k,p in sources.items()}

def mesh(mask,phase):
 ox=phase%2;oy=phase//2;verts=[];faces=[];uvfaces=[]
 def face(points,uv):
  i=len(verts);verts.extend(points);faces.append(tuple(range(i,i+len(points))));uvfaces.append(uv)
 def tuv(x,y):return (.52+((x+ox)/2)*.46,.52+((y+oy)/2)*.46)
 for j in range(N):
  for i in range(N):
   coords=[(i/N,j/N),((i+1)/N,j/N),((i+1)/N,(j+1)/N),(i/N,(j+1)/N)]
   points=[(x-.5,.5-y,height(x+ox,y+oy)) for x,y in coords]
   # alternating diagonals within a globally shared grid
   for ids in ([(0,1,2),(0,2,3)] if (i+j+ox*N+oy*N)%2 else [(0,1,3),(1,2,3)]):face([points[k] for k in reversed(ids)],[tuv(*coords[k]) for k in reversed(ids)])
 # Exposed faces: N E S W; every cap endpoint equals the top mesh endpoint.
 for d in range(4):
  if not mask&(1<<d):continue
  for i in range(N):
   a=i/N;b=(i+1)/N
   coords=[(a,0),(b,0)] if d==0 else [(1,a),(1,b)] if d==1 else [(b,1),(a,1)] if d==2 else [(0,b),(0,a)]
   (x,y),(xx,yy)=coords;za=height(x+ox,y+oy);zb=height(xx+ox,yy+oy)
   points=[(x-.5,.5-y,0),(xx-.5,.5-yy,0),(xx-.5,.5-yy,zb),(x-.5,.5-y,za)]
   # Bottom-left atlas cell is upright face on both source sheets.
   uv=[(.02+a*.46,.02),(.02+b*.46,.02),(.02+b*.46,.48),(.02+a*.46,.48)]
   # Correct exterior normals; top faces already point upward.
   face(points[::-1],uv[::-1])
 me=bpy.data.meshes.new('connected-wall');me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new('wall',me);s.collection.objects.link(ob)
 uv=me.uv_layers.new()
 for poly,coords in zip(me.polygons,uvfaces):
  for li,co in zip(poly.loop_indices,coords):uv.data[li].uv=co
 return ob
records=[]
for phase in range(4):
 for mask in range(16):
  ob=mesh(mask,phase)
  for name,material in materials.items():
   ob.data.materials.clear();ob.data.materials.append(material)
   path=OUT/'tiles'/f'{name}-{phase}-{mask}.png';s.render.filepath=str(path);bpy.ops.render.render(write_still=True)
   records.append(dict(file=str(path.relative_to(OUT)),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
  bpy.data.objects.remove(ob,do_unlink=True)
# Save a useful inspectable corner model as well as the reproducible script.
ob=mesh(6,0);ob.data.materials.append(materials['slate'])
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'wall-kit.blend'))
manifest=dict(pitch=pitch,tilePixels=128,imagePixels=384,anchor=[192,192],heightRange=[1.05,1.85],masks='exposed floor N=1 E=2 S=4 W=8',phases='2x2 world-periodic',sources={k:dict(path=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for k,p in sources.items()},files=records)
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('WALL KIT COMPLETE',len(records))
