"""Art-space idle grip calibration; source guides remain available for future poses."""
from pathlib import Path
import json
r=Path(__file__).parent;p=r/'assets/hero-base/base.json';m=json.loads(p.read_text())
# R=character's anatomical right weapon hand; L=anatomical left shield hand.
grips={'S':([81,172],[175,172]),'SW':([88,169],[163,173]),'W':([108,172],[126,183]),'NW':([160,158],[85,171]),'N':([175,168],[81,168]),'NE':([174,171],[88,160]),'E':([132,183],[150,169]),'SE':([85,177],[173,167])}
for d in m['directions']:
 d['guideProjectedSockets']={'right':d['right']['position'],'left':d['left']['position']}
 d['right']['position'],d['left']['position']=grips[d['id']]
 d['right']['gripMask']={'rx':7,'ry':6};d['right']['angle']=0;d['left']['angle']=0
 d['socketStatus']='Idle calibrated against generated art; fully occluded far-hand positions remain estimates.'
m['status']='Canonical idle direction base v1; no animation authored'
m['equipmentLimitations']='Diagnostic single-image sword/shield demonstrate anchors and coarse layering. Final per-direction equipment art and per-frame hand masks are still required.'
p.write_text(json.dumps(m,indent=2));(r/'socket-calibration.json').write_text(json.dumps(grips,indent=2))
