"""Blender: neutral volume guides, same orthographic elevation as approved hero."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parent
def ell(name, loc, scale):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale
    for p in o.data.polygons:p.use_smooth=True
    return o
def link(name,a,b,r):
    a,b=Vector(a),Vector(b);o=ell(name,(a+b)/2,(r,r,(b-a).length/2+r*.2));o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
directions=['S','SW','W','NW','N','NE','E','SE']
for kind in ['slime','goblin','bat']:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    if kind=='slime':
        ell('blob',(0,0,.4),(.62,.51,.40))
        for s in [-1,1]:ell('eye',(s*.18,-.47,.43),(.05,.04,.07))
    if kind=='goblin':
        ell('head',(0,0,1.15),(.40,.31,.35));ell('nose',(0,-.32,1.12),(.1,.10,.1));ell('body',(0,0,.63),(.25,.19,.32))
        for s in [-1,1]:
            ell('ear',(s*.42,0,1.2),(.24,.09,.12));link('leg',(s*.14,0,.40),(s*.18,-.03,.10),.10);ell('foot',(s*.18,-.09,.07),(.12,.18,.07))
            link('arm',(s*.24,0,.79),(s*.36,-.1,.52),.08);ell('hand',(s*.36,-.1,.50),(.09,.08,.09))
        link('right-hand club',(-.36,-.1,.50),(-.47,-.12,1.10),.055);ell('club head',(-.47,-.12,1.1),(.12,.11,.23))
    if kind=='bat':
        ell('body',(0,0,.83),(.18,.15,.28));ell('head',(0,-.02,1.07),(.24,.19,.22))
        for s in [-1,1]:
            ell('ear',(s*.16,0,1.31),(.08,.06,.18))
            verts=[(s*.16,0,.96),(s*.48,0,1.18),(s*.90,0,1.08),(s*.70,0,.70),(s*.45,0,.77),(s*.20,0,.63)]
            mesh=bpy.data.meshes.new('wing');mesh.from_pydata(verts,[],[tuple(range(6))]);o=bpy.data.objects.new('wing',mesh);bpy.context.collection.objects.link(o)
    scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.show_shadows=False;scene.display.shading.show_cavity=True
    scene.render.resolution_x=scene.render.resolution_y=384;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA'
    bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.35;scene.camera=cam
    ds=directions if kind=='goblin' else ['S','SE','E','NE','N']
    for d in ds:
        a=directions.index(d)*math.pi/4;target=Vector((0,0,.73));cam.location=target+Vector((math.sqrt(45)*math.sin(a),-math.sqrt(45)*math.cos(a),3.25));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(P/'guides'/f'{kind}-{d}.png');bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(P/'guides'/f'{kind}.blend'))
