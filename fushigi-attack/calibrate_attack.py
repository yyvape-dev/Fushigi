from pathlib import Path
import json,copy
R=Path(__file__).parent
# All positions refer to generated art in the shared 256px canvas.
# Angles are selected against visible wrist orientation and to keep the blade outside the head.
TABLE={
'S': {'r':[[76,86],[92,160],[143,164],[101,153]],'l':[[162,143],[160,146],[159,144],[165,159]],'a':[-.35,3.14,2.50,-.75]},
'SW':{'r':[[71,84],[57,149],[132,174],[79,122]],'l':[[135,136],[136,145],[124,150],[149,158]],'a':[.30,-2.21,2.50,-.55]},
'W': {'r':[[168,64],[44,156],[70,177],[86,146]],'l':[[86,132],[117,151],[106,155],[107,162]],'a':[.30,-1.80,-2.20,-.70]},
'NW':{'r':[[169,65],[57,146],[70,146],[172,124]],'l':[[85,136],[108,148],[101,146],[85,145]],'a':[.30,-.90,-1.30,.55]},
'N': {'r':[[183,84],[183,148],[171,153],[175,154]],'l':[[85,151],[86,151],[87,151],[85,151]],'a':[.35,0,-.80,.70]},
'NE':{'r':[[183,70],[197,137],[188,155],[174,144]],'l':[[161,132],[161,135],[158,139],[158,132]],'a':[.35,1.00,1.60,.50]},
'E': {'r':[[104,89],[184,169],[180,170],[138,151]],'l':[[160,136],[155,135],[153,137],[164,148]],'a':[-.50,1.80,2.10,1.00]},
'SE':{'r':[[80,94],[136,167],[149,165],[107,151]],'l':[[164,145],[164,141],[166,143],[182,158]],'a':[-.40,2.20,2.65,-.65]}}
idle_angles={'S':-.35,'SW':-.45,'W':-.45,'NW':.55,'N':.45,'NE':.55,'E':.65,'SE':-.55}
base_path=R/'assets/hero-base/base.json';base=json.loads(base_path.read_text())
for d in base['directions']:d['right']['angle']=idle_angles[d['id']]
base_path.write_text(json.dumps(base,indent=2));directions=[]
for d in base['directions']:
 name=d['id'];p=R/'assets/hero-attack'/name/'motion.json';m=json.loads(p.read_text());t=TABLE[name]
 for i in range(4):
  f=m['frames'][i+1];f['right']['position']=t['r'][i];f['left']['position']=t['l'][i];f['right']['angle']=t['a'][i]
  f['right']['gripMask']={'rx':7,'ry':6};f['weaponLengthFactor']=1 if i in [0,3] else .88;f['weaponWidthFactor']=1
  if name in ['S','NE','E','SE'] or (name=='SW' and i>0):f['right']['layer']='front'
  if name in ['W','NW','N']:f['right']['layer']='back'
 m['frames'][0]['right']=copy.deepcopy(d['right']);m['frames'][5]['right']=copy.deepcopy(d['right'])
 m['frames'][0]['left']=copy.deepcopy(d['left']);m['frames'][5]['left']=copy.deepcopy(d['left'])
 m['socketStatus']='Manually calibrated visible fists; occluded far-hand locations are estimates. Single diagnostic sword grip/angle checked in renderer.'
 p.write_text(json.dumps(m,indent=2));directions.append(m)
meta={'version':1,'frameSize':[256,256],'groundAnchor':[128,224],'heightToGround':192,'directionOrder':[d['id'] for d in directions],'durationMs':300,'impactMs':105,'directions':directions,'equipmentStatus':'Independent diagnostic sword/shield; production item-specific art and full shield/forearm occlusion masks not yet authored.'}
(R/'assets/hero-attack/attack.json').write_text(json.dumps(meta,indent=2));(R/'art-space-calibration.json').write_text(json.dumps(TABLE,indent=2))
print('Calibrated all 8 directions; SW recovery angle corrected to avoid passing behind the head.')
