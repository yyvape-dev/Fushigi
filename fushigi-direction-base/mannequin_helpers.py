"""Neutral generation guides with analytic two-link legs and planted stance feet."""
import bpy,math,os,json
from mathutils import Vector
R=os.path.dirname(os.path.abspath(__file__));os.makedirs(R+'/guides',exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(n,c):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);return m
body=material('Neutral body',(.66,.68,.68));head=material('Head',(.79,.78,.73));hair=material('Hair mass only',(.49,.51,.51));joint=material('Joints',(.36,.39,.40));cape=material('Cape silhouette',(.40,.43,.45));footmat=material('Boot volumes',(.48,.50,.51))
objs={}
def ell(n,p,sc,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=p);o=bpy.context.object;o.name=n;o.scale=sc;o.data.materials.append(mat)
 for f in o.data.polygons:f.use_smooth=True
 objs[n]=o;return o
def link(n,a,b,r,dep,mat):
 a,b=Vector(a),Vector(b);o=objs.get(n)
 if o is None:o=ell(n,(0,0,0),(1,1,1),mat)
 o.location=(a+b)/2;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();o.scale=(r,dep,(a-b).length/2+r*.22)
 return o
ell('head',(0,-.025,1.86),(.55,.425,.535),head)
ell('hair_back',(0,.15,1.98),(.60,.40,.53),hair)
for side in [-1,1]:ell('hair_side'+str(side),(side*.50,.015,1.78),(.14,.30,.31),hair)
ell('nose_direction',(0,-.448,1.80),(.035,.025,.04),head)
ell('neck',(0,0,1.36),(.11,.10,.14),body)
ell('chest',(0,0,1.13),(.29,.18,.26),body)
ell('pelvis',(0,0,.77),(.265,.16,.15),body)
ell('waist',(0,0,.94),(.21,.15,.17),body)
ell('left_pauldron',(.32,0,1.28),(.15,.19,.12),body)
# Two broad cape halves, no armor decorations or facial detail.
for s in [-1,1]:
 verts=[(s*.04,.14,1.39),(s*.31,.14,1.32),(s*.35,.28,1.06),(s*.04,.28,1.02)]
 me=bpy.data.meshes.new('cape');me.from_pydata(verts,[],[(0,1,2,3)]);o=bpy.data.objects.new('cape'+str(s),me);bpy.context.collection.objects.link(o);o.data.materials.append(cape);objs[o.name]=o;so=o.modifiers.new('thickness','SOLIDIFY');so.thickness=.018

def knee_ik(hip,ankle,L=.34):
 # Equal two-bone leg, knee bends forward (-Y), lengths remain fixed.
 h,a=Vector(hip),Vector(ankle);v=a-h;dist=v.length
 assert dist<2*L,dist
 mid=(h+a)/2;perp=Vector((0,v.z,-v.y)).normalized()
 return mid+perp*math.sqrt(max(0,L*L-dist*dist/4))

