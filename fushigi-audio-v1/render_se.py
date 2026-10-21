"""Original synthesis sketches: no samples or melodies taken from existing games."""
from pathlib import Path
import numpy as np,wave,subprocess,hashlib,json
P=Path(__file__).resolve().parent;SR=44100;rng=np.random.default_rng(20261021)
def mix(buf,sig,start):
 i=round(start*SR);n=min(len(sig),len(buf)-i)
 if n>0:buf[i:i+n]+=sig[:n]
def room(x):
 y=x.copy()
 for delay,gain in [(.037,.14),(.073,.09),(.113,.055)]:
  n=int(SR*delay);y[n:]+=x[:-n]*gain
 return y
rows=[]
def write(name,x,desc):
 x=room(x);peak=np.max(np.abs(x));x=x*(.78/max(peak,1e-6));x[-500:]*=np.linspace(1,0,500)
 pcm=(np.column_stack([x,np.roll(x,37)*.98])*32767).astype('<i2')
 path=P/'audio'/f'{name}.wav'
 with wave.open(str(path),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes(pcm.tobytes())
 rows.append(dict(id=name,file='audio/'+path.name,creator='Fushigi project',kind='Original procedural sound sketch',description=desc,source='render_se.py',sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
x=np.zeros(int(SR*1.45));t=np.arange(len(x))/SR
for i,f in enumerate([1370,2113,3289,4877,6851]):
 x+=.16*np.sin(2*np.pi*(f*t+24*t*t))*np.exp(-t*(3.6+i*.65))*np.minimum(t/.004,1)
noise=rng.normal(0,1,len(x));high=noise-np.roll(noise,1);x+=high*.12*np.exp(-t*34)
for start,f in [(.12,1760),(.22,2349.32),(.34,3520)]:
 tt=np.arange(int(SR*.8))/SR;mix(x,.13*np.sin(2*np.pi*f*tt)*np.exp(-tt*6)*np.minimum(tt/.006,1),start)
write('enhance',x,'金属の鋭い立ち上がり＋上昇する倍音ときらめき。合成音の試作。')
x=np.zeros(int(SR*2.4))
for start,n,dur in [(0,74,.15),(.16,76,.15),(.32,81,.24),(.58,86,.26),(.86,88,.12),(1.02,86,.5),(1.62,86,.4)]:
 tt=np.arange(int(SR*dur))/SR;f=440*2**((n-69)/12)
 phase=2*np.pi*f*(tt+.001*np.sin(2*np.pi*5.2*tt)/(2*np.pi*5.2))
 env=np.minimum(tt/.014,1)*np.minimum((dur-tt)/.045,1)
 flute=(np.sin(phase)+.23*np.sin(2*phase)+.08*np.sin(3*phase))*.23
 flute+=rng.normal(0,.008,len(tt));mix(x,flute*env,start)
for start,strong in [(0,1),(.16,.4),(.32,.6),(.58,1),(.74,.4),(1.02,.8),(1.32,.45),(1.62,1)]:
 tt=np.arange(int(SR*.35))/SR;drum=np.sin(2*np.pi*(75*tt+3*(1-np.exp(-tt*20))))*np.exp(-tt*15)
 drum+=rng.normal(0,.18,len(tt))*np.exp(-tt*70);mix(x,drum*.37*strong*np.minimum(tt/.002,1),start)
write('levelup',x,'笛の上昇句＋太鼓の掛け合い。既存ゲームの旋律を使わない合成音の試作。')
(P/'sources'/'se.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('Rendered original enhance and levelup sketches')
