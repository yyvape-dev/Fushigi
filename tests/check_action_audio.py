"""Real Chromium Web Audio checks; no remote assets or gameplay save writes."""
import json, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser = p.chromium.launch(headless=True, executable_path=shutil.which('chromium'))
 page = browser.new_page()
 page.set_content('<button id="start">Start</button>')
 page.add_script_tag(path=str(root/'assets/action-sfx.js'))
 # Exercise actual output via an analyser on the master connection.
 page.evaluate('''() => {
  window.output = new AudioContext();
  window.analyser = output.createAnalyser(); analyser.connect(output.destination);
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(target, ...args) {
   if (target instanceof AudioDestinationNode && this.context !== output) {
    window.meter = this.context.createAnalyser();
    connect.call(this, meter); connect.call(meter, target);
    return target;
   }
   return connect.call(this, target, ...args);
  };
  document.querySelector('button').onclick=()=>ActionSfx.unlock();
 }''')
 assert page.evaluate('ActionSfx.active.length') == 0
 page.click('#start')
 page.wait_for_timeout(100)
 rows = page.evaluate('''async () => {
  const rows=[];
  for(const key of Object.keys(ActionSfx.definitions)) {
   const data=ActionSfx.pcm(key,44100);
   const peak=Math.max(...Array.from(data,Math.abs));
   const rms=Math.sqrt(data.reduce((s,x)=>s+x*x,0)/data.length);
   if(!Number.isFinite(rms)||rms<.005||peak>=1)throw Error(key+' PCM');
   ActionSfx.play(key);
   await new Promise(r=>setTimeout(r,45));
   const samples=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(samples);
   const audible=samples.some(x=>Math.abs(x)>.0001);
   if(!audible)throw Error(key+' silent output');
   rows.push({key,seconds:data.length/44100,peak,rms,audible});
   ActionSfx.stop();ActionSfx.unlock();
  }
  for(const key of Object.keys(ActionSfx.definitions))ActionSfx.play(key);
  if(ActionSfx.active.length>8)throw Error('voice cap');
  ActionSfx.configure(.65,true);
  if(ActionSfx.active.length||ActionSfx.play('hurt'))throw Error('mute');
  ActionSfx.configure(0,false);ActionSfx.unlock();
  if(ActionSfx.play('hit'))throw Error('zero volume');
  ActionSfx.configure(.65,false);ActionSfx.unlock();ActionSfx.play('forge');ActionSfx.stop();
  if(ActionSfx.active.length||ActionSfx.play('hit'))throw Error('stop');
  return rows;
 }''')
 browser.close()
(root/'fushigi-audio-v1/action-validation.json').write_text(json.dumps({'browser':'Chromium','checks':['PCM finite/non-silent/headroom','real Web Audio output for all 16 effects','8 voice cap','mute','zero volume','stop requires new input'],'effects':rows},ensure_ascii=False,indent=2)+'\n')
print('ALL OK: 16 effects, real Web Audio output, voice cap, mute, volume, stop')
