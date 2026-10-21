"""Export review data from the same installed ENEMIES table used by the game."""
from pathlib import Path
import subprocess,json
P=Path(__file__).resolve().parent;root=P.parent
index=(root/'index.html').read_text();block=index[index.index('const ENEMIES ='):index.index('const eT =')]
js=(root/'assets/monster-roster.js').read_text()+'\n'+block+'''
const rows=Object.fromEntries(Object.entries(ENEMIES).map(([key,v])=>[key,{kind:key,name:v.name,family:v.family,tier:v.tier,color:v.col,from:v.from,to:v.to,ai:v.ai||'melee',speed:v.spd||'normal',hp:v.hp(v.from),attack:v.atk(v.from),hp12:v.hp(12),attack12:v.atk(12),defense:v.def,exp:v.exp,range:v.range||0,flying:!!v.flying}]));console.log(JSON.stringify(rows,null,2));
'''
r=subprocess.run(['node'],input=js,capture_output=True,text=True,check=True);data=json.loads(r.stdout);assert len(data)==60
(P/'catalog.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print('Exported 60 real game entries')
