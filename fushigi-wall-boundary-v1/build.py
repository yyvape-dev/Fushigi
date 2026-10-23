"""Render 32 reusable quarter wall meshes with a single camera and material kit."""
import bpy,json,hashlib,sys
from pathlib import Path
OUT=Path(__file__).resolve().parent;ROOT=OUT.parent
sys.path.insert(0,str(OUT));from geometry import CORNERS,N,point
base=ROOT/'fushigi-wall-kit-v1/build.py';ns={'__file__':str(base)}
exec(compile(base.read_text().split('records=[]')[0],str(base),'exec'),ns)
s=ns['s'];materials=ns['materials'];bpy.context.preferences.filepaths.save_version=0

def mesh(corner,bits,phase):
 sx,sy=CORNERS[corner];ox=phase%2;oy=phase//2;vertices=[];faces=[]
 def p(a,b):
  u,v,z=point(corner,bits,phase,a,b);return(u-.5,.5-v,z)
 def face(points,up=False,normal=None):
  # Orient from geometry rather than assuming every rotated quadrant winds alike.
  from mathutils import Vector
  cross=(Vector(points[1])-Vector(points[0])).cross(Vector(points[2])-Vector(points[0]))
  if (up and cross.z<0) or (normal is not None and cross.dot(Vector(normal))<0):points=list(reversed(points))
  index=len(vertices);vertices.extend(points);faces.append(tuple(range(index,index+len(points))))
 for j in range(N):
  for i in range(N):
   a=i/N;b=j/N;aa=(i+1)/N;bb=(j+1)/N;pts=[p(a,b),p(aa,b),p(aa,bb),p(a,bb)]
   for ids in [(0,1,2),(0,2,3)]:face([pts[k] for k in ids],up=True)
 # Only exposed cardinal boundaries have walls. At the foot, the shape follows
 # the same inset direction as the crest (70%), avoiding a straight vertical cut.
 for axis in range(2):
  if not bits&(1<<axis):continue
  def side(t,level):
   a,b=(1,t) if axis==0 else (t,1)
   u,v,z=point(corner,bits,phase,a,b)
   bu=.5+sx*a*.5;bv=.5+sy*b*.5
   f=[.70,.83,1][level];zz=[0,.48,1][level]
   return (bu+(u-bu)*f-.5,.5-(bv+(v-bv)*f),z*zz)
  normal=(sx,0,0) if axis==0 else (0,-sy,0)
  for i in range(N):
   for level in range(2):face([side(i/N,level),side((i+1)/N,level),side((i+1)/N,level+1),side(i/N,level+1)],normal=normal)
 me=bpy.data.meshes.new('quarter');me.from_pydata(vertices,[],faces);me.update();ob=bpy.data.objects.new('quarter',me);s.collection.objects.link(ob)
 world=me.attributes.new('wall_world','FLOAT_VECTOR','POINT')
 for vert,item in zip(me.vertices,world.data):item.vector=(vert.co.x+.5+ox,.5-vert.co.y+oy,vert.co.z)
 return ob
records=[]
for corner in range(4):
 for bits in range(8):
  for phase in range(4):
   ob=mesh(corner,bits,phase)
   for name,material in materials.items():
    ob.data.materials.clear();ob.data.materials.append(material)
    path=OUT/'tiles'/f'{name}-{corner}-{bits}-{phase}.png';s.render.filepath=str(path);bpy.ops.render.render(write_still=True)
    records.append(dict(file=str(path.relative_to(OUT)),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
   bpy.data.objects.remove(ob,do_unlink=True)
ob=mesh(0,7,0);ob.data.materials.append(materials['slate']);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'corner-parts.blend'))
(OUT/'manifest.json').write_text(json.dumps(dict(baseBuildSha256=hashlib.sha256(base.read_bytes()).hexdigest(),geometry='four quarters; X/Y/diagonal floor bits; shared center, edge-midpoint and corner contracts',camera='unchanged .94 orthographic',material='unchanged world triplanar original sheets',partMeshes=32,bakedImages=len(records),newImageGenerationCalls=0,files=records),indent=2)+'\n')
print('BOUNDARY KIT COMPLETE',len(records))
