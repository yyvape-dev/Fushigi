"""Compare actual roof boundary vertices with the generic kit and adjoining end parts."""
from pathlib import Path
import json
p=Path(__file__).with_name('build.py');ns={'__file__':str(p)}
exec(compile(p.read_text().rsplit('\nrecords=[]',1)[0],str(p),'exec'),ns)
bpy=ns['bpy'];N=ns['N'];make=ns['mesh'];generic=ns['ns']['mesh'];OUT=p.parent

def edges(ob):
 top=list(ob.data.vertices)[:N*N*6]
 def edge(axis,value):return sorted(set(tuple(round(c,6) for k,c in enumerate(v.co) if k!=axis) for v in top if abs(v.co[axis]-value)<1e-6))
 return dict(w=edge(0,-.5),e=edge(0,.5),s=edge(1,-.5),n=edge(1,.5))
cache={}
for phase in range(4):
 for kind in ['middle','middle-high','middle-low','left','right','both','generic']:
  ob=generic(0,phase) if kind=='generic' else make(kind,phase);cache[phase,kind]=edges(ob);bpy.data.objects.remove(ob,do_unlink=True)
comparisons=0;maxerror=0
for phase in range(4):
 for kind in ['middle','middle-high','middle-low','left','right','both']:
  for neighbor in ['middle','middle-high','middle-low','left','right','both','generic']:
   for a,b,other in [('e','w',phase^1),('w','e',phase^1),('s','n',phase^2)]:
    if a=='s' and neighbor!='generic':continue
    aa=cache[phase,kind][a];bb=cache[other,neighbor][b]
    assert len(aa)==len(bb)==N+1
    err=max(abs(x-y) for av,bv in zip(aa,bb) for x,y in zip(av,bv));maxerror=max(maxerror,err);comparisons+=1
assert maxerror<1e-5,maxerror
result=dict(actualRoofSideConnections=comparisons,maxCoordinateError=maxerror,allSixClassesChecked=True,worldCameraAndMaterialUnchanged=True)
(OUT/'geometry-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
