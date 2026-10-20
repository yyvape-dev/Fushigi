import bpy,math,os,json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
R=os.path.dirname(os.path.abspath(__file__));os.makedirs(R+'/guides',exist_ok=True)
source=open(R+'/mannequin_helpers.py').read().replace("R=os.path.dirname(os.path.abspath(__file__));os.makedirs(R+'/guides',exist_ok=True)","");exec(source)
phases=[{'name':'windup','r':[-.60,-.10,1.60],'l':[.32,-.18,1.11],'blade':[0,.42,.91],'lean':-.015}, {'name':'strike','r':[-.26,-.35,1.02],'l':[.32,-.24,1.13],'blade':[0,-.97,-.24],'lean':.055}, {'name':'follow','r':[-.12,-.30,1.00],'l':[.33,-.18,1.10],'blade':[.60,-.72,-.35],'lean':.035}, {'name':'recover','r':[-.36,-.16,1.01],'l':[.38,-.12,.95],'blade':[0,-.18,.98],'lean':.008}]
def elbow_ik(sh,wr,side):
 h,a=Vector(sh),Vector(wr);v=a-h;d=v.length;L1=.25;L2=.245
 assert d<L1+L2,(d,sh,wr)
 along=(L1*L1-L2*L2+d*d)/(2*d);axis=v.normalized();pref=Vector((side,0,0));perp=(pref-axis*pref.dot(axis)).normalized()
 return h+axis*along+perp*math.sqrt(max(0,L1*L1-along*along))
initial={n:(o.location.copy(),o.rotation_euler.copy()) for n,o in objs.items()}
poses=[]
for k,p in enumerate(phases):
 for n,(loc,rot) in initial.items():objs[n].location=loc;objs[n].rotation_euler=rot
 lean=p['lean']
 for n in ['head','hair_back','hair_side-1','hair_side1','nose_direction','neck']:
  objs[n].location.y-=lean;objs[n].location.z-=abs(lean)*.25
 for n in ['chest','waist']:objs[n].rotation_euler.x=lean
 for side,s in [('L',1),('R',-1)]:
  hip=(s*.17,-lean*.3,.745);ankle=(s*.18,0,.115);knee=knee_ik(hip,ankle)
  link('thigh'+side,hip,knee,.105,.10,body);link('shin'+side,knee,ankle,.09,.095,body)
  for name,pt in [('knee',knee),('ankle',ankle)]:
   if name+side not in objs:ell(name+side,pt,(.075,.075,.075),joint)
   objs[name+side].location=pt
  if 'foot'+side not in objs:ell('foot'+side,(s*.18,-.055,.095),(.115,.18,.095),footmat)
  sh=(s*.30,-lean,1.28);wr=p['l' if side=='L' else 'r'];el=elbow_ik(sh,wr,s)
  link('upperarm'+side,sh,el,.083,.083,body);link('forearm'+side,el,wr,.075,.075,body)
  if 'hand'+side not in objs:ell('hand'+side,wr,(.075,.07,.085),body)
  objs['hand'+side].location=wr
  if 'elbow'+side not in objs:ell('elbow'+side,el,(.07,.07,.07),joint)
  objs['elbow'+side].location=el
 for o in objs.values():
  for attr in ['location','rotation_euler','scale']:o.keyframe_insert(attr,frame=k+1)
 poses.append(p)
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.studio_light='paint.sl';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=False;scene.display.shading.show_cavity=True;scene.display.render_aa='8';scene.view_settings.view_transform='Standard';scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA'
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.05;scene.camera=cam
def project(pt):
 v=world_to_camera_view(scene,cam,Vector(pt));return [v.x*512,(1-v.y)*512]
data={'directions':[],'phases':[p['name'] for p in phases],'note':'Guide-projected sockets require art-space calibration after generation.'}
for i,name in enumerate(['S','SW','W','NW','N','NE','E','SE']):
 a=i*math.pi/4;target=Vector((0,0,1.18));cam.location=target+Vector((math.sqrt(45)*math.sin(a),-math.sqrt(45)*math.cos(a),3.25));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update();row={'id':name,'phases':[],'ground':project((0,0,0))}
 for k,p in enumerate(phases):
  scene.frame_set(k+1);bpy.context.view_layer.update();hr=project(p['r']);hl=project(p['l']);tip=project(Vector(p['r'])+Vector(p['blade']).normalized()*.8);v=Vector((tip[0]-hr[0],tip[1]-hr[1]));angle=math.atan2(v.x,-v.y)
  def layer(wr):return 'front' if wr[0]*math.sin(a)-wr[1]*math.cos(a)>.01 else 'back'
  row['phases'].append({'name':p['name'],'right':hr,'left':hl,'weaponAngle':angle,'weaponLengthFactor':v.length/(.8*512/3.05),'rightLayer':layer(p['r']),'leftLayer':layer(p['l']),'headCenter':project((0,-p['lean'],1.98))})
  scene.render.filepath=R+f'/guides/{name}_{k}.png';bpy.ops.render.render(write_still=True)
 data['directions'].append(row)
scene.frame_start=1;scene.frame_end=4;scene.render.fps=12;bpy.ops.wm.save_as_mainfile(filepath=R+'/attack-mannequin.blend');json.dump(data,open(R+'/guide-motion.json','w'),indent=2)
