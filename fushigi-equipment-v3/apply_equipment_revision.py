from pathlib import Path
import json
R=Path(__file__).parent
p=R/'assets/hero-base/base.json';m=json.loads(p.read_text());m['equipmentAssets']['weapon']['renderScale']=.66;m['equipmentAssets']['shield']['renderScale']=.59
for d in m['directions']:
 if d['id'] in ['NW','SE']:
  d['left']['layer']='back' if d['id']=='NW' else 'front';d['left']['handOverShield']=False
  if d['id']=='NW':d['left']['gripMask']={'rx':9,'ry':8}
p.write_text(json.dumps(m,ensure_ascii=False,indent=2))
p=R/'assets/hero-attack/attack.json';a=json.loads(p.read_text())
for d in a['directions']:
 if d['id'] in ['NW','SE']:
  for i,f in enumerate(d['frames']):
   f['left']['layer']='back' if d['id']=='NW' else 'front';f['left']['handOverShield']=False
   if d['id']=='NW':
    f['left']['position']=[[85,171],[83,136],[88,146],[101,140],[89,142],[85,171]][i];f['left']['gripMask']={'rx':9,'ry':8}
p.write_text(json.dumps(a,ensure_ascii=False,indent=2))
for file in ['hero-base-renderer.js','hero-attack-renderer.js']:
 p=R/file;s=p.read_text();s=s.replace("factor=which==='weapon'?.55:.5","factor=spec.renderScale||(which==='weapon'?.55:.5)").replace("factor=name==='weapon'?.55:.5","factor=spec.renderScale||(name==='weapon'?.55:.5)")
 # Front shield is composited after the right glove, so sword-hand redraw cannot punch through it.
 if file=='hero-base-renderer.js':
  s=s.replace("if(enabled(which)&&socket.layer==='front')item(which);","if(which==='weapon'&&enabled(which)&&socket.layer==='front')item(which);")
  marker='      if(opts.debug){';extra="""      if(opts.shield&&row.left.layer==='front')item('shield');
      if(opts.shield&&row.left.handOverShield){const m=row.left.gripMask;g.save();g.beginPath();g.ellipse(row.left.position[0]-ax,row.left.position[1]-ay,m.rx,m.ry,0,0,Math.PI*2);g.clip();body();g.restore();}
"""
 else:
  s=s.replace("if(enabled(name)&&socket.layer==='front')item(name);","if(name==='weapon'&&enabled(name)&&socket.layer==='front')item(name);")
  marker='   if(opts.debug){';extra="""   if(opts.shield&&f.left.layer==='front')item('shield');
   if(opts.shield&&f.left.handOverShield){const m=f.left.gripMask;g.save();g.beginPath();g.ellipse(f.left.position[0]-ax,f.left.position[1]-ay,m.rx,m.ry,0,0,Math.PI*2);g.clip();body();g.restore();}
"""
 
 if extra not in s:s=s.replace(marker,extra+marker)
 p.write_text(s)
