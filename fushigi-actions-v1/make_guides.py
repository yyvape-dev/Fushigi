import bpy,math,json
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
P=Path(__file__).resolve().parent
source=(P.parent/'fushigi-attack/mannequin_helpers.py').read_text()
source=source.replace("R=os.path.dirname(os.path.abspath(__file__));os.makedirs(R+'/guides',exist_ok=True)","R=str(P)")
exec(source)
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=False;scene.display.shading.show_cavity=True;scene.render.resolution_x=scene.render.resolution_y=256;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard'
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.05;scene.camera=cam
initial={n:(o.location.copy(),o.rotation_euler.copy()) for n,o in objs.items()}
def arm(sh,wr,s):
 sh,wr=Vector(sh),Vector(wr);axis=(wr-sh).normalized();d=(wr-sh).length;L=.27
 pref=Vector((s,0,0));perp=(pref-axis*pref.dot(axis)).normalized();return (sh+wr)/2+perp*math.sqrt(max(0,L*L-d*d/4))
def project(pt):
 v=world_to_camera_view(scene,cam,Vector(pt));return [round(v.x*256,2),round((1-v.y)*256,2)]
metadata={}
for i,d in enumerate(['S','SW','W','NW','N','NE','E','SE']):
 angle=i*math.pi/4;target=Vector((0,0,1.18));cam.location=target+Vector((math.sqrt(45)*math.sin(angle),-math.sqrt(45)*math.cos(angle),3.25));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
 rows=[]
 for action in ['walk','consume','scroll','staff']:
  for k in range(4):
   for n,(loc,rot) in initial.items():objs[n].location=loc;objs[n].rotation_euler=rot
   phase=[-1,0,1,0][k];rh=(-.36,-.12,1.02);lh=(.36,-.10,1.04)
   if action=='consume':rh=[(-.33,-.18,1.0),(-.22,-.46,1.46),(-.18,-.47,1.5),(-.28,-.25,1.2)][k];lh=(.27,-.22,1.12)
   if action=='scroll':rh=[(-.30,-.25,1.0),(-.25,-.40,1.22),(-.25,-.40,1.28),(-.30,-.25,1.1)][k];lh=(-rh[0],rh[1],rh[2])
   if action=='staff':rh=[(-.34,-.14,1.0),(-.43,-.12,1.40),(-.27,-.48,1.2),(-.33,-.25,1.04)][k]
   for side,s in [('L',1),('R',-1)]:
    stride=phase*s*.21 if action=='walk' else 0;lift=.07 if action=='walk' and k in [1,3] and ((k==1)==(s==1)) else 0
    ankle=(s*.18,stride,.14+lift);hip=(s*.17,0,.745);knee=knee_ik(hip,ankle)
    link('thigh'+side,hip,knee,.105,.10,body);link('shin'+side,knee,ankle,.09,.095,body)
    foot=objs.get('foot'+side) or ell('foot'+side,(0,0,0),(.115,.18,.095),footmat);foot.location=(s*.18,stride-.055,.095+lift)
    wr=lh if side=='L' else rh
    if action=='walk':wr=(s*.36,-.12-stride*.55,1.02)
    sh=(s*.30,0,1.28);el=arm(sh,wr,s);link('upperarm'+side,sh,el,.083,.083,body);link('forearm'+side,el,wr,.075,.075,body)
    hand=objs.get('hand'+side) or ell('hand'+side,(0,0,0),(.075,.07,.085),body);hand.location=wr
   bpy.context.view_layer.update();rows.append({'action':action,'frame':k,'right':project(objs['handR'].location),'left':project(objs['handL'].location),'ground':project((0,0,0))})
   scene.render.filepath=str(P/'guides'/f'{d}-{action}-{k}.png');bpy.ops.render.render(write_still=True)
 metadata[d]=rows
(P/'guide-sockets.json').write_text(json.dumps(metadata,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(P/'action-mannequin.blend'))
