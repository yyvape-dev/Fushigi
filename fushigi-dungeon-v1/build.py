import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent
random.seed(27)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=16; scene.cycles.use_denoising=False
scene.render.resolution_x=256; scene.render.resolution_y=256; scene.render.resolution_percentage=100
scene.world.color=(.22,.25,.30)
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='Standard'
def material(name,color):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 n=m.node_tree.nodes; p=n.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=.9
 noise=n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=13; noise.inputs['Detail'].default_value=3
 bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.28; bump.inputs['Distance'].default_value=.07
 m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']); m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
 return m
floor=material('warm limestone',(.25,.22,.16)); rock=material('blue slate',(.15,.19,.22))
def cube(name,loc,scale,mat,bevel=.03):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(mat)
 mod=o.modifiers.new('chipped edges','BEVEL'); mod.width=bevel; mod.segments=2; o.modifiers.new('normals','WEIGHTED_NORMAL'); return o
bpy.ops.object.light_add(type='AREA',location=(-3,-4,8)); bpy.context.object.data.energy=650; bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=5
bpy.ops.object.camera_add(location=(0,0,6)); camera=bpy.context.object; camera.data.type='ORTHO'; camera.data.ortho_scale=1; camera.rotation_euler=(0,0,0); scene.camera=camera
def aim(pos,target,scale):
 camera.location=pos; camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler(); camera.data.ortho_scale=scale
def render(name):
 scene.render.filepath=str(OUT/name); bpy.ops.render.render(write_still=True)
tiles=[]
for i in range(4):
 objs=[cube('floor base',(0,0,-.06),(1,1,.12),floor,.005)]
 for y in range(2):
  for x in range(2):
   o=cube('paving',(-.25+x*.5,-.25+y*.5,0),(.485,.485,random.uniform(.025,.05)),floor,.025); objs.append(o)
 aim((0,0,6),(0,0,0),1); render('floor%d.png'%i)
 for o in objs: bpy.data.objects.remove(o,do_unlink=True)
objs=[]
for z in range(3):
 for x in range(2):
  objs.append(cube('rock',(-.25+x*.5,0,.15+z*.28),(.5,.85,.30),rock,.07))
aim((0,0,6),(0,0,0),1); render('wallT.png')
aim((0,-5,5),(0,0,.38),1.28); render('wallF.png')
for o in objs: bpy.data.objects.remove(o,do_unlink=True)
walk={(x,y) for y in range(3,8) for x in range(3,10)}|{(x,5) for x in range(10,15)}|{(14,y) for y in range(6,10)}
for x,y in sorted(walk): cube('floor_%d_%d'%(x,y),(x,-y,-.08),(.985,.985,.16),floor,.025)
wall={(x+dx,y+dy) for x,y in walk for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]}-walk
for x,y in sorted(wall):
 for z in range(3):
  cube('wall_%d_%d_%d'%(x,y,z),(x,-y,.16+z*.29),(.98,.98,.32),rock,.065)
aim((8.5,-5.5,22),(8.5,-5.5,0),16)
scene.render.resolution_x=1024; scene.render.resolution_y=640; render('room-overhead.png')
aim((17,-22,19),(8,-5,0),18); render('model-overview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'room.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'room.glb'),export_format='GLB')
(OUT/'layout.json').write_text(json.dumps({'room':{'x':3,'y':3,'w':7,'h':5},'walk':sorted(walk),'tileUnit':1,'wallHeight':.9},indent=2))
