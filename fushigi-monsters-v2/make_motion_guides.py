from pathlib import Path
P=Path(__file__).resolve().parent
exec((P/'make_guides.py').read_text().split('for kind,cfg in F.items():')[0])
for kind,cfg in F.items():
 if 'design' not in cfg:continue
 for pose in [1,2]:
  bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);make(kind,pose)
  if pose==2:
   for o in list(bpy.context.scene.objects):
    if o.type=='MESH':o.location.y-=.10;o.location.z*=.93
  if kind=='venom' and pose==1:
   for o in bpy.context.scene.objects:
    if o.name.startswith('wing'):o.location.z+=.18
  scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.show_cavity=True;scene.render.resolution_x=scene.render.resolution_y=256;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA'
  bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.2;scene.camera=cam
  for i,d in enumerate(D):
   a=i*math.pi/4;target=Vector((0,0,.8));cam.location=target+Vector((6*math.sin(a),-6*math.cos(a),2.93));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(P/'guides'/f'{kind}-pose{pose}-{d}.png');bpy.ops.render.render(write_still=True)
