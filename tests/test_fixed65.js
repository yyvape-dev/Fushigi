{
 const assert=(v,m)=>{if(!v)throw Error(m);};
 scene='dungeon';
 assert(Math.abs(tilePitchY()/TS-Math.sin(65*Math.PI/180))<1e-12,'dungeon projection is fixed at 65 degrees');
 assert(Math.abs(CaveTerrain.pitch-tilePitchY()/TS)<1e-12,'terrain tiles and actors share the same projection');
 scene='town';assert(tilePitchY()===TS,'town coordinates remain unchanged');
 renderCfg();assert(cfgListEl.innerHTML.includes('data-cfg="view3d"'),'3D mode toggle is offered');assert(view3dPref===1,'3D is on by default (shadows)');
 saveGame();const original=JSON.parse(localStorage.getItem(SAVE_KEY));
 original.r3d=2;localStorage.setItem(SAVE_KEY,JSON.stringify(original));view3dPref=0;
 assert(loadGame(),'save can be loaded');assert(view3dPref===2,'3D preference (no shadows) is restored from the save');
 delete original.r3d;original.view3dPref=0;localStorage.setItem(SAVE_KEY,JSON.stringify(original));view3dPref=0;
 assert(loadGame(),'old save can still be loaded');assert(view3dPref===1,'old saves (which stored 3D as off) start with the standard 3D setting');
 saveGame();const saved=JSON.parse(localStorage.getItem(SAVE_KEY));
 assert(saved.r3d===1,'3D preference is saved again');
 assert(JSON.stringify(saved.wh)===JSON.stringify(original.wh)&&saved.bank===original.bank,'legacy storage and bank preserved');
 console.log('ALL OK: fixed 65-degree terrain/entity projection, unchanged town, 3D toggle and its save migration, preserved storage');
}
