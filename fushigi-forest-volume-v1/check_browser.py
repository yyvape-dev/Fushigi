"""Run from repo root while serving it on http://127.0.0.1:8878.

Requires Playwright and Chromium. Uses the exact production model builder.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
BASE='http://127.0.0.1:8878/'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1100,'height':850})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'fushigi-forest-volume-v1/preview.html',wait_until='networkidle')
    structural=page.evaluate('''async () => {
      const THREE=await import('../assets/vendor/three.module.min.js');
      const {buildForestModels}=await import('../assets/forest-models3d.js');
      const p=forestPreview;
      let count=0;
      p.group.traverse(o=>{
        if(o.isSprite)throw Error('sprite in solid model group');
        if(!o.isMesh)return;
        if(o.geometry.type==='PlaneGeometry')throw Error('flat decoration geometry');
        o.geometry.computeBoundingBox();
        const size=o.geometry.boundingBox.getSize(new THREE.Vector3());
        if(Math.min(size.x,size.y,size.z)<=.01)throw Error('zero-thickness model');
        if(!Array.from(o.instanceMatrix.array).every(Number.isFinite))throw Error('invalid model transform');
        if(['forest-3d-trunk','forest-3d-branch','forest-3d-crown'].includes(o.name)&&!o.castShadow)throw Error('solid tree missing shadows');
        count++;
      });
      const group=new THREE.Group(),plan=JSON.parse(JSON.stringify(p.plan));
      const before=JSON.stringify(plan),texture=new THREE.Texture();
      const repeat=buildForestModels(group,plan,()=>texture);
      if(JSON.stringify(plan)!==before)throw Error('builder changed placement plan');
      const snapshot=g=>g.children.map(o=>({name:o.name,m:Array.from(o.instanceMatrix.array),color:o.instanceColor?Array.from(o.instanceColor.array):null}));
      if(JSON.stringify(snapshot(group))!==JSON.stringify(snapshot(p.group)))throw Error('non-deterministic model transforms');
      const names=new Set(group.children.map(o=>o.name));
      for(const name of ['trunk','branch','root','crown','glass','roof','hook','cage','frame','rope','bulb','bulbCap'])if(!names.has('forest-3d-'+name))throw Error('missing solid part '+name);
      group.traverse(o=>{o.geometry?.dispose();});texture.dispose();
      return {checkedBatches:count,noSprites:true,noPlanes:true,nonzeroDepth:true,deterministicTransforms:true,stats:repeat.stats};
    }''')
    for angle,yaw,name in [(65,0,'models-65.png'),(45,.785398,'models-45-side.png'),(85,0,'models-85.png')]:
        page.evaluate('v=>forestPreview.setView(v[0],v[1])',[angle,yaw])
        page.screenshot(path=str(OUT/name))
    page.goto(BASE+'index.html?floor=1',wait_until='networkidle',timeout=60000)
    page.wait_for_function('window.Render3D && window.ForestFestival')
    page.evaluate('Render3D.init();view3dPref=1;draw()')
    page.wait_for_timeout(1200)
    random_maps=page.evaluate('''() => {
      const results=[];
      for(let seed=1;seed<=30;seed++){
        const p=DungeonGenerator.generate(56,32,seed,1),m=p.map.map(r=>r.map(v=>v?FLOOR:WALL));
        const s=p.rooms[p.rooms.length-1];m[s.cy][s.cx]=STAIRS;
        const before=JSON.stringify(m),r=p.rooms[0];
        const level={map:m,W:56,H:32,themeId:'forest',wall:WALL,stairs:STAIRS};
        const o={camX:550-(r.cx+.5)*96,camY:425-(r.cy+.5)*96*Render3D.pitchK(),TS:96,pitch:96*Render3D.pitchK(),W:1100,H:850,focusY:425,hx:r.cx+.5,hy:r.cy+.5,shadows:false};
        Render3D.sync(level);Render3D.frame(o);
        const a=Render3D.debug();
        if(!a.inited||!a.forest)throw Error('missing forest: '+JSON.stringify(a));
        Render3D.frame({...o,shadows:true});
        if(a.failed||a.forest.models.kind!=='solid-mesh-v1'||a.forest.models.billboardCount!==0||a.forest.models.batches>12||a.forest.models.triangles>300000||a.forest.lights>6||JSON.stringify(m)!==before)throw Error('native forest seed '+seed);
        results.push({seed,...a.forest,mapUnchanged:true});
      }
      for(const themeId of ['limestone','ruins','ice','volcano']){
        Render3D.sync({map,W:MW,H:MH,themeId,wall:WALL,stairs:STAIRS});
        if(Render3D.debug().forest!==null)throw Error('forest models leaked across themes');
      }
      draw();return results;
    }''')
    # Move within the existing map to a walkable clearing with actual lanterns.
    page.evaluate('''() => {
      const p=ForestFestival.plan({map,W:MW,H:MH,wall:WALL,stairs:STAIRS});
      const l=p.lamps[0];
      if(l){for(let d=3;d>=1;d--)if(map[l.y+d]?.[l.x]!==undefined&&map[l.y+d][l.x]!==WALL){player.x=player.vx=l.x;player.y=player.vy=l.y+d;break;}updateVis();}
      draw();
    }''')
    page.wait_for_timeout(200)
    page.screenshot(path=str(OUT/'game-3d.png'))
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate('draw()')
    page.screenshot(path=str(OUT/'game-3d-mobile.png'))
    page.evaluate('view3dPref=0;draw()')
    page.wait_for_timeout(500)
    page.evaluate('draw()')
    page.screenshot(path=str(OUT/'game-2d-mobile.png'))
    assert not errors,errors
    report={'modelStructure':structural,'maps':random_maps,'pageErrors':errors,'views':[[65,0],[45,45],[85,0]],'renderer':'Chromium/SwiftShader; not a phone performance benchmark','screenshotNote':'player moved onto existing walkable terrain near a lantern; map unchanged'}
    (OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print('FOREST SOLID MODEL CHECK OK:',len(random_maps),'random maps,',structural['checkedBatches'],'solid batches, no planes or sprites')
    browser.close()
