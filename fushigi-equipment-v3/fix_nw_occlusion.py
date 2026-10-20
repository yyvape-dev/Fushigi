from pathlib import Path
import json
R=Path(__file__).parent
for rel in ['assets/hero-base/base.json','assets/hero-attack/attack.json']:
 p=R/rel;m=json.loads(p.read_text())
 for row in m['directions']:
  if row['id']=='NW':
   for f in row.get('frames',[row]):
    f['left']['layer']='back';f['left']['handOverShield']=False
 p.write_text(json.dumps(m,ensure_ascii=False,indent=2))
print('NW shield is behind the entire character, including the complete arm; no small hand overlay.')
