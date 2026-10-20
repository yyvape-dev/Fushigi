import bpy,math,os,json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
R=os.path.dirname(os.path.abspath(__file__));os.makedirs(R+'/guides',exist_ok=True)
# Reuse the approved guide's geometric helpers, not its walking poses.
source=open(R+'/mannequin_helpers.py').read().split('poses=[]')[0]
source=source.replace("R=os.path.dirname(os.path.abspath(__file__));os.makedirs(R+'/guides',exist_ok=True)","")
exec(source)
for s,side in [(1,'L'),(-1,'R')]:
 hip=(s*.17,0,.745);ankle=(s*.18,0,.115);knee=knee_ik(hip,ankle)
 link('thigh'+side,hip,knee,.105,.10,body);link('shin'+side,knee,ankle,.09,.095,body)
 for name,pt in [('hip',hip),('knee',knee),('ankle',ankle)]:ell(name+side,pt,(.075,.075,.075),joint)
 ell('foot'+side,(s*.18,-.055,.095),(.115,.18,.095),footmat)
 sh=(s*.30,0,1.28);el=(s*.39,-.025,1.055);wr=(s*.40,-.10,.89)
 link('upperarm'+side,sh,el,.083,.083,body);link('forearm'+side,el,wr,.075,.075,body);ell('elbow'+side,el,(.07,.07,.07),joint);ell('hand'+side,wr,(.075,.07,.085),body)
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.studio_light='paint.sl';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=False;scene.display.shading.show_cavity=True;scene.display.render_aa='8';scene.view_settings.view_transform='Standard'
scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA'
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=3.05
def project(pt):
 p=world_to_camera_view(scene,cam,Vector(pt));return [round(p.x*512,2),round((1-p.y)*512,2)]
meta={'directions':[],'frame_size':512,'projection':'orthographic','ortho_scale':3.05,'camera_elevation_degrees':math.degrees(math.atan2(3.25,math.sqrt(45)))}
for i,name in enumerate(['S','SW','W','NW','N','NE','E','SE']):
 a=i*math.pi/4;target=Vector((0,0,1.18));cam.location=target+Vector((math.sqrt(45)*math.sin(a),-math.sqrt(45)*math.cos(a),3.25));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update()
 right=(-.40,-.10,.89);left=(.40,-.10,.89)
 def layer(pt):return 'front' if pt[0]*math.sin(a)-pt[1]*math.cos(a)>.01 else 'back'
 meta['directions'].append({'id':name,'index':i,'ground':project((0,0,0)),'right_hand':project(right),'left_hand':project(left),'right_layer':layer(right),'left_layer':layer(left),'shield_width':round(max(.20,abs(math.cos(a))),3),'head_top':project((0,0,2.51)),'head_center':project((0,0,1.98))})
 scene.render.filepath=R+'/guides/'+name+'.png';bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=R+'/direction-mannequin.blend');json.dump(meta,open(R+'/guide-sockets.json','w'),indent=2)
