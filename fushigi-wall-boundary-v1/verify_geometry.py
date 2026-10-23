"""Validate the actual Blender roof vertices at all internal and neighboring joins."""
from pathlib import Path
import json,sys,math
p=Path(__file__).with_name('build.py');ns={'__file__':str(p)}
exec(compile(p.read_text().rsplit('\nrecords=[]',1)[0],str(p),'exec'),ns)
bpy=ns['bpy'];N=ns['N'];corners=ns['CORNERS'];point=ns['point'];cache={}
for c in range(4):
 for bits in range(8):
  for phase in range(4):
   ob=ns['mesh'](c,bits,phase)
   actual=[tuple(v.co) for v in list(ob.data.vertices)[:N*N*6]]
   for ai in range(N+1):
    for bi in range(N+1):
     u,v,z=point(c,bits,phase,ai/N,bi/N);expected=(u-.5,.5-v,z)
     found=min(actual,key=lambda a:sum((x-y)**2 for x,y in zip(a,expected)))
     assert max(abs(x-y) for x,y in zip(found,expected))<1e-6
     cache[c,bits,phase,ai,bi]=found
   bpy.data.objects.remove(ob,do_unlink=True)
minimum=1e9
for c in range(4):
 sx,sy=corners[c]
 for bits in range(8):
  for phase in range(4):
   for ai in range(16):
    for bi in range(16):
     a=(ai+.5)/16;b=(bi+.5)/16;eps=.00001
     p0=point(c,bits,phase,a,b);px=point(c,bits,phase,a+eps,b);py=point(c,bits,phase,a,b+eps)
     jac=((px[0]-p0[0])*(py[1]-p0[1])-(px[1]-p0[1])*(py[0]-p0[0]))/(eps*eps)*sx*sy
     minimum=min(minimum,jac)
assert minimum>0,minimum
checks=0;error=0
for phase in range(4):
 cx=2+phase%2;cy=2+phase//2
 for mask in range(256):
  offsets=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]
  floors={(cx+dx,cy+dy) for i,(dx,dy) in enumerate(offsets) if mask&(1<<i)}
  def get(x,y,c,a,b):
   sx,sy=corners[c];bits=int((x+sx,y) in floors)|int((x,y+sy) in floors)<<1|int((x+sx,y+sy) in floors)<<2
   xx,yy,z=cache[c,bits,(x%2)+2*(y%2),a,b]
   return (x+.5+xx,y+.5-yy,z)
  def same(a,b):
   global checks,error
   delta=max(abs(x-y) for x,y in zip(a,b));error=max(error,delta);checks+=1
   assert delta<1e-5,(phase,mask,a,b)
  for t in range(N+1):
   for a,b in [(0,1),(2,3)]:same(get(cx,cy,a,0,t),get(cx,cy,b,0,t))
   for a,b in [(0,2),(1,3)]:same(get(cx,cy,a,t,0),get(cx,cy,b,t,0))
   if (cx+1,cy) not in floors:
    for a,b in [(1,0),(3,2)]:same(get(cx,cy,a,N,t),get(cx+1,cy,b,N,t))
   if (cx,cy+1) not in floors:
    for a,b in [(2,0),(3,1)]:same(get(cx,cy,a,t,N),get(cx,cy+1,b,t,N))
result=dict(actualMeshSampleConnections=checks,maxCoordinateError=error,neighborTopologies=256,worldPhases=4,quarterMeshes=32,minimumPlanarJacobian=minimum)
(ns['OUT']/'geometry-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
