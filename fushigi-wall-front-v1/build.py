"""Directional lower-screen boundary study; reuse the previous material/camera."""
import bpy,math,json,hashlib
from pathlib import Path
OUT=Path(__file__).resolve().parent
ROOT=OUT.parent
# Reuse material graph, light, camera and height field exactly; no AI generation.
base=ROOT/'fushigi-wall-kit-v1/build.py'
ns={'__file__':str(base)}
exec(compile(base.read_text().split('records=[]')[0],str(base),'exec'),ns)
s=ns['s'];height=ns['height'];materials=ns['materials'];N=8
bpy.context.preferences.filepaths.save_version=0
# Each class ends at the same connection positions. Left/right shoulders pull
# inward before merging into the long boundary, instead of cropping a cuboid.
profiles={
 'middle':[0,.015,-.035,-.02,.06,.18,.29,.33,.29,.20,.10,.025,0],
 'middle-high':[0,.03,.05,-.025,-.035,.02,.08,.14,.18,.15,.08,.02,0],
 'middle-low':[0,.02,.08,.18,.30,.37,.39,.35,.27,.16,.07,.02,0],
 'left':[0,.08,.19,.30,.34,.30,.20,.09,.015,-.02,.02,.025,0],
 'right':[0,.025,.02,-.02,.015,.09,.20,.30,.34,.30,.19,.08,0],
 'both':[0,.06,.15,.24,.30,.34,.35,.34,.30,.24,.15,.06,0],
}
def mesh(kind,phase):
 ox=phase%2;oy=phase//2;profile=profiles[kind];verts=[];faces=[]
 def boundary(u):
  # Shift interior rock rhythm by phase; corner shoulder remains recognizable.
  if kind=='middle' and phase&1:u=1-u
  length=len(profile)-1;k=min(length-1,int(u*length));t=u*length-k
  return profile[k]*(1-t)+profile[k+1]*t
 def crown(u):
  end0=height(ox,oy);end1=height(ox+1,oy)
  crest=end0*(1-u)+end1*u+([.16,-.09,.06,.10][phase]+({'middle-high':.20,'middle-low':-.15}.get(kind,0)))*math.sin(math.pi*u)
  return crest-height(u+ox,oy)
 def point(u,v):
  fade=(1-v)**3;offset=boundary(u)*fade
  return (u-.5,.5-v-offset,height(u+ox,v+oy)+crown(u)*fade)
 def face(points):
  i=len(verts);verts.extend(points);faces.append(tuple(range(i,i+len(points))))
 for j in range(N):
  for i in range(N):
   u=i/N;v=j/N;uu=(i+1)/N;vv=(j+1)/N
   p=[point(u,v),point(uu,v),point(uu,vv),point(u,vv)]
   for ids in [(0,2,1),(0,3,2)]:face([p[k] for k in ids])
 # Faceted shoulder and tapered toe, connected to the SAME upper boundary.
 for i in range(N):
  u=i/N;uu=(i+1)/N
  def side(t,level):
   x,y,z=point(t,0)
   # The crest is recessed while the foot follows the original collision line.
   shift=(.5-y)*[0,.30,.84,1][level]
   return (x,.5-shift,z*[0,.28,.73,1][level])
  for level in range(3):face([side(u,level+1),side(uu,level+1),side(uu,level),side(u,level)])
 me=bpy.data.meshes.new('front-'+kind);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new('front-'+kind,me);s.collection.objects.link(ob)
 world=me.attributes.new('wall_world','FLOAT_VECTOR','POINT')
 for vertex,value in zip(me.vertices,world.data):value.vector=(vertex.co.x+.5+ox,.5-vertex.co.y+oy,vertex.co.z)
 return ob
records=[]
for kind in profiles:
 for phase in range(4):
  ob=mesh(kind,phase)
  for name,material in materials.items():
   ob.data.materials.clear();ob.data.materials.append(material)
   path=OUT/'tiles'/f'{name}-{kind}-{phase}.png';s.render.filepath=str(path);bpy.ops.render.render(write_still=True)
   records.append(dict(file=str(path.relative_to(OUT)),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
  bpy.data.objects.remove(ob,do_unlink=True)
ob=mesh('left',0);ob.data.materials.append(materials['slate']);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'front-parts.blend'))
(OUT/'manifest.json').write_text(json.dumps(dict(baseBuildSha256=hashlib.sha256(base.read_bytes()).hexdigest(),camera='unchanged from wall-kit-v1',material='unchanged triplanar from wall-kit-v1',scope='Only north-exposed wall with mask1; screen-lower room boundary. Other boundaries use the existing generic kit.',parts=list(profiles),profiles=profiles,pitch=.94,imagePixels=384,tilePixels=128,anchor=[192,192],files=records),indent=2)+'\n')
print('FRONT PARTS COMPLETE',len(records))
