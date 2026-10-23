"""Compare actual Blender mesh border vertices across all masks and phases."""
from pathlib import Path
import json
# Load the same mesh constructor, stopping before rendering.
p=Path(__file__).with_name('build.py')
exec(compile(p.read_text().split('records=[]')[0],str(p),'exec'))
cache={}
for phase in range(4):
 for mask in range(16):
  ob=mesh(mask,phase)
  def edge(axis,position):
   return sorted(set((round(v.co[1-axis],6),round(v.co.z,6)) for v in ob.data.vertices if abs(v.co[axis]-position)<1e-6 and v.co.z>.5))
  cache[phase,mask]=dict(w=edge(0,-.5),e=edge(0,.5),n=edge(1,.5),s=edge(1,-.5))
  bpy.data.objects.remove(ob,do_unlink=True)
comparisons=0;error=0
for phase in range(4):
 for mask in range(16):
  for neighbor in range(16):
   for a,b,other in [('e','w',phase^1),('s','n',phase^2)]:
    aa=cache[phase,mask][a];bb=cache[other,neighbor][b]
    assert len(aa)==len(bb)==N+1,(phase,mask,neighbor,a)
    error=max(error,max(abs(x-y) for av,bv in zip(aa,bb) for x,y in zip(av,bv)));comparisons+=1
assert error<.00001,error
result=dict(actualMeshBorderComparisons=comparisons,maxCoordinateError=error,topAndSidesShareEndpoints=True)
(OUT/'geometry-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
